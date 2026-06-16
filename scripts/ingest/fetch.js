#!/usr/bin/env node
// Fetch + ingest one or more sets from optcgapi.com (community API, no auth).
//   node scripts/ingest/fetch.js ST-03 ST-04 OP-01
// Rate-limited (1 req / 2s) per the API owner's request. Writes:
//   src/data/<set>.cards.js   (normalized real data)
//   reports/ingest-<set>.json (validation + diff report)
// Card *scripts* are NOT generated — effect text → DSL is a reviewed step
// (scripts/coverage.js shows exactly which cards still need scripts).
import fs from "node:fs";
import path from "node:path";
import { normalizeCard, diffAgainstRegistry, emitModule } from "./normalize.js";
import { allCards } from "../../src/engine/cards.js";

const sets = process.argv.slice(2);
if (!sets.length) { console.error("usage: fetch.js <SET-ID>..."); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const registry = new Map(allCards().map(c => [c.code, c]));
fs.mkdirSync("reports", { recursive: true });

for (const set of sets) {
  const kind = set.startsWith("ST") ? "decks" : "sets";
  const url = `https://optcgapi.com/api/${kind}/${set}/`;
  console.log(`→ ${url}`);
  const res = await fetch(url);
  if (!res.ok) { console.error(`  FAILED ${res.status}`); continue; }
  const raw = await res.json();
  const batch = raw.map(normalizeCard);
  const report = diffAgainstRegistry(batch, registry);
  const valid = batch.filter(b => !b.errors.length).map(b => b.card)
    .sort((a, b) => a.code.localeCompare(b.code));
  const varName = set.replace("-", "") + "_CARDS";
  const file = `src/data/${set.replace("-", "").toLowerCase()}.cards.js`;
  fs.writeFileSync(file, emitModule(varName, valid));
  fs.writeFileSync(path.join("reports", `ingest-${set}.json`), JSON.stringify(report, null, 2));
  console.log(`  ${valid.length} cards → ${file}`);
  console.log(`  added ${report.added.length}, errata ${report.errata.length}, ` +
              `updated ${report.updated.length}, alt-art ${report.altArt.length}, invalid ${report.invalid.length}`);
  if (report.invalid.length) console.log("  INVALID:", JSON.stringify(report.invalid));
  await sleep(2000);
}
console.log("Done. Next: add effect scripts (src/data/*.scripts.js), register in cards.js, run scripts/coverage.js");
