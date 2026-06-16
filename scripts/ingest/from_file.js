#!/usr/bin/env node
// File-based ingest: normalize raw optcgapi JSON already saved to data/raw/<SET>.json
// (used when the live fetch is done via the host web_fetch tool, which writes the
// response to disk — the sandbox has no direct outbound network). Mirrors
// scripts/ingest/fetch.js but reads local files. De-dupes alt-art (same code → keep
// the first / base printing). Writes src/data/<set>.cards.js + reports/ingest-<set>.json.
//   node scripts/ingest/from_file.js OP-01 OP-02 ...
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCard, diffAgainstRegistry, emitModule } from "./normalize.js";
import { allCards } from "../../src/engine/cards.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const sets = process.argv.slice(2);
if (!sets.length) { console.error("usage: from_file.js <SET-ID>..."); process.exit(1); }
const registry = new Map(allCards().map(c => [c.code, c]));
fs.mkdirSync(path.join(root, "reports"), { recursive: true });

for (const set of sets) {
  const rawPath = path.join(root, "data", "raw", `${set}.json`);
  if (!fs.existsSync(rawPath)) { console.error(`  MISSING ${rawPath}`); continue; }
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  // de-dupe by code: first occurrence (base art) wins
  const setPrefix = set.replace("-", "");
  const seen = new Set();
  const batch = [];
  const foreign = [];
  for (const r of raw) {
    const norm = normalizeCard(r);
    const code = norm.card.code;
    if (!code || seen.has(code)) continue;
    // Set responses bundle promo/reprint cards (Wanted Poster, SP, Alternate Art) that
    // carry their ORIGINAL foreign codes (e.g. ST01-012 inside the OP-03 response). These
    // are alt-art of existing cards — keeping them would OVERWRITE the canonical earlier-set
    // entry in the registry. Drop any code that doesn't belong to the set being ingested;
    // each card is owned by its own set's module.
    if (!code.startsWith(setPrefix)) { foreign.push(code); continue; }
    seen.add(code);
    batch.push(norm);
  }
  if (foreign.length) console.log(`  (dropped ${foreign.length} foreign reprint code(s): ${[...new Set(foreign)].join(", ")})`);
  const report = diffAgainstRegistry(batch, registry);
  const valid = batch.filter(b => !b.errors.length).map(b => b.card)
    .sort((a, b) => a.code.localeCompare(b.code));
  const varName = set.replace("-", "") + "_CARDS";
  const file = path.join(root, "src", "data", `${set.replace("-", "").toLowerCase()}.cards.js`);
  fs.writeFileSync(file, emitModule(varName, valid));
  fs.writeFileSync(path.join(root, "reports", `ingest-${set}.json`), JSON.stringify(report, null, 2));
  console.log(`${set}: ${valid.length} cards → src/data/${path.basename(file)}`);
  console.log(`  added ${report.added.length}, errata ${report.errata.length}, updated ${report.updated.length}, ` +
              `alt-art ${report.altArt.length}, invalid ${report.invalid.length}`);
  if (report.invalid.length) console.log("  INVALID:", JSON.stringify(report.invalid.slice(0, 10)));

  // Completeness assert: web_fetch truncates ~86KB so large sets can lose tail cards.
  // Codes are <SET>-NNN contiguous; flag any gap so missing cards get backfilled.
  const nums = valid.map(c => +c.code.split("-")[1]).filter(n => !isNaN(n)).sort((a, b) => a - b);
  if (nums.length) {
    const max = nums[nums.length - 1];
    const present = new Set(nums);
    const gaps = [];
    for (let i = 1; i <= max; i++) if (!present.has(i)) gaps.push(`${set.replace("-", "")}-${String(i).padStart(3, "0")}`);
    if (gaps.length) console.log(`  ⚠ COMPLETENESS: ${gaps.length} gap(s) up to -${String(max).padStart(3, "0")}: ${gaps.join(" ")}`);
    else console.log(`  ✓ complete: ${set.replace("-", "")}-001..${String(max).padStart(3, "0")} contiguous`);
  }
}
