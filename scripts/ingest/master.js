#!/usr/bin/env node
// Multi-source corpus acquisition → data/cards_master.json (provenance + confidence + versioning)
// then the full production chain: candidates → auto-apply A-class → coverage.
//
//   node scripts/ingest/master.js --all                 # every known set, optcgapi primary
//   node scripts/ingest/master.js ST-03 OP-02           # specific sets
//   node scripts/ingest/master.js --batsu <CARDLIST.dat># ingest the sim's own DB (fallback source)
//   APITCG_KEY=... node scripts/ingest/master.js --all  # enables secondary source
//   node scripts/ingest/master.js --offline             # rebuild master from already-ingested data
import fs from "node:fs";
import { normalizeCard, diffAgainstRegistry, emitModule } from "./normalize.js";
import { allCards, script } from "../../src/engine/cards.js";
import { generateFor } from "../generate.js";

const ALL_SETS = [
  ...Array.from({ length: 16 }, (_, i) => `OP-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 30 }, (_, i) => `ST-${String(i + 1).padStart(2, "0")}`),
  "EB-01", "EB-02", "EB-03", "EB-04", "PRB-01", "PRB-02",
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const master = fs.existsSync("data/cards_master.json")
  ? JSON.parse(fs.readFileSync("data/cards_master.json", "utf8")) : { version: 0, cards: {} };

function record(card, source, confidence) {
  const prev = master.cards[card.code];
  const textHash = JSON.stringify([card.text, card.triggerText, card.power, card.cost]).length
    + ":" + Buffer.from(JSON.stringify([card.text, card.triggerText])).toString("base64").slice(0, 16);
  const changed = prev && prev.textHash !== textHash;
  master.cards[card.code] = { ...card, textHash,
    source: { primary: prev?.source?.primary ?? source,
      fallbacks: [...new Set([...(prev?.source?.fallbacks || []), source])].filter(s => s !== (prev?.source?.primary ?? source)) },
    confidence: Math.max(prev?.confidence || 0, confidence),
    fetchedAt: new Date().toISOString(),
    ...(changed ? { errataSuspect: true, prevHash: prev.textHash } : {}) };
  return { added: !prev, changed };
}

async function fromOptcgapi(set) {
  const kind = set.startsWith("ST") ? "decks" : "sets";
  const res = await fetch(`https://optcgapi.com/api/${kind}/${set}/`);
  if (!res.ok) throw new Error(`optcgapi ${set}: ${res.status}`);
  return (await res.json()).map(normalizeCard);
}
async function fromApitcg(set) {
  if (!process.env.APITCG_KEY) return null;
  const res = await fetch(`https://www.apitcg.com/api/one-piece/cards?property=set&value=${set}`,
    { headers: { "x-api-key": process.env.APITCG_KEY } });
  if (!res.ok) return null;
  const j = await res.json();
  return (j.data || []).map(raw => normalizeCard({ // map apitcg field names → optcgapi shape
    card_set_id: raw.id, card_name: raw.name, card_type: raw.type, card_color: raw.color,
    card_cost: raw.cost, card_power: raw.power, counter_amount: raw.counter, life: raw.life,
    attribute: raw.attribute?.name, sub_types: raw.family, rarity: raw.rarity,
    set_id: set, card_text: raw.ability, card_image: raw.images?.large }));
}
function fromBatsu(path) { // sim's CARDLIST.dat — format auto-detect
  const buf = fs.readFileSync(path);
  const txt = buf.toString("utf8");
  try { const j = JSON.parse(txt); return { format: "json", rows: Array.isArray(j) ? j : Object.values(j) }; }
  catch {}
  const lines = txt.split(/\r?\n/).filter(l => l.includes("|") || l.includes("\t"));
  if (lines.length > 100) return { format: "delimited", rows: lines };
  throw new Error(`CARDLIST.dat format not recognized (${buf.length} bytes). First 200 chars:\n${txt.slice(0, 200)}\n→ send this header for a parser to be added.`);
}

// ---- main ----
const offline = args.includes("--offline");
const batsuIdx = args.indexOf("--batsu");
let stats = { fetched: 0, added: 0, changed: 0, invalid: 0 };

if (batsuIdx !== -1) {
  const det = fromBatsu(args[batsuIdx + 1]);
  console.log(`CARDLIST.dat detected format: ${det.format}, ${det.rows.length} rows`);
  if (det.format === "json")
    for (const raw of det.rows) {
      const { card, errors } = normalizeCard(raw);
      if (errors.length) { stats.invalid++; continue; }
      const r = record(card, "batsu:CARDLIST.dat", 1.0);
      stats.fetched++; if (r.added) stats.added++; if (r.changed) stats.changed++;
    }
  else console.log("Delimited format — paste header row into an issue to finalize column mapping.");
} else if (!offline) {
  const sets = args.includes("--all") ? ALL_SETS : args.filter(a => /^[A-Z]+-\d+$/.test(a));
  if (!sets.length) { console.error("No sets specified. Use --all, --offline, --batsu, or set ids."); process.exit(1); }
  for (const set of sets) {
    try {
      const batch = await fromOptcgapi(set);
      for (const { card, errors } of batch) {
        if (errors.length) { stats.invalid++; continue; }
        const r = record(card, "optcgapi", 0.95);
        stats.fetched++; if (r.added) stats.added++; if (r.changed) stats.changed++;
      }
      const sec = await fromApitcg(set.replace("-", ""));
      if (sec) for (const { card, errors } of sec) if (!errors.length) record(card, "apitcg", 0.9);
      console.log(`${set}: ok (${batch.length})`);
    } catch (e) { console.log(`${set}: ${e.message}`); }
    await sleep(2000);
  }
} else {
  for (const c of allCards().filter(c => c.set !== "TEST"))
    { const r = record(c, "ingested:src/data", 0.95); stats.fetched++; if (r.added) stats.added++; }
}

master.version++;
master.updatedAt = new Date().toISOString();
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/cards_master.json", JSON.stringify(master, null, 1));

// ---- classification + auto-apply over the whole master corpus ----
const scripted = new Set(allCards().filter(c => Object.keys(script(c.code)).length).map(c => c.code));
// merge-preserve previously generated scripts (never wipe on re-run)
let auto = {};
try {
  const prev = fs.readFileSync("src/data/auto.scripts.js", "utf8");
  auto = JSON.parse(prev.slice(prev.indexOf("{"), prev.lastIndexOf("}") + 1) || "{}");
} catch {}
const counts = { A: 0, B: 0, C: 0, D: 0, vanilla: 0, scripted: scripted.size };
for (const card of Object.values(master.cards)) {
  if (scripted.has(card.code)) continue;
  if (!card.text && !card.triggerText) { counts.vanilla++; continue; }
  const r = generateFor(card);
  counts[r.class]++;
  if (r.class === "A") auto[card.code] = { ...r.script, generated: true };
}
fs.writeFileSync("src/data/auto.scripts.js",
  "// AUTO-GENERATED A-class scripts (scripts/ingest/master.js). Review B/C/D in reports/effect_candidates.json.\n" +
  "export const AUTO_SCRIPTS = " + JSON.stringify(auto, null, 1) + ";\n");
const total = Object.keys(master.cards).length;
const supported = counts.scripted + counts.vanilla + counts.A;
console.log(`\nmaster v${master.version}: ${total} cards | fetched ${stats.fetched}, +${stats.added} new, ${stats.changed} errata-suspect, ${stats.invalid} invalid`);
console.log(`classification: scripted ${counts.scripted} · vanilla ${counts.vanilla} · A ${counts.A} (auto-applied) · B ${counts.B} · C ${counts.C} · D ${counts.D}`);
console.log(`projected support: ${supported}/${total} = ${(supported / total * 100).toFixed(1)}% (A-class applied; B queued)`);
console.log(`next: register AUTO_SCRIPTS in src/engine/cards.js for new sets' data modules, then: node --test && node scripts/dashboard.js`);
