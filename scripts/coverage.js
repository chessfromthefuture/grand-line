#!/usr/bin/env node
// Coverage dashboard: classifies every registered card.
//   implemented — vanilla (no effect text) OR has a complete effect script
//   partial     — script flagged {partial:true} (known approximation, listed reason)
//   unsupported — effect text exists but no script
// Output: console summary + reports/coverage.json + reports/coverage.md
import fs from "node:fs";
import { allCards, script } from "../src/engine/cards.js";

const rows = allCards().map(c => {
  const s = script(c.code);
  const hasScript = Object.keys(s).length > 0;
  const vanilla = !c.text && !c.triggerText;
  let status, note = "";
  if (s.partial) { status = "partial"; note = s.partial; }
  else if (vanilla || hasScript) status = "implemented";
  else status = "unsupported";
  // trigger text without trigger script = partial coverage
  if (status === "implemented" && c.triggerText && !s.trigger && !vanilla) {
    status = "partial"; note = "trigger not scripted";
  }
  return { code: c.code, name: c.name, set: c.set, status, note };
});

const by = st => rows.filter(r => r.status === st);
const pct = (by("implemented").length / rows.length * 100).toFixed(1);
const sets = [...new Set(rows.map(r => r.set))];

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/coverage.json", JSON.stringify({ generated: new Date().toISOString(),
  total: rows.length, implemented: by("implemented").length, partial: by("partial").length,
  unsupported: by("unsupported").length, rows }, null, 2));

let md = `# Card Coverage Dashboard\n\nTotal: **${rows.length}** · Implemented: **${by("implemented").length}** (${pct}%) · Partial: **${by("partial").length}** · Unsupported: **${by("unsupported").length}**\n\n`;
for (const set of sets) {
  const sr = rows.filter(r => r.set === set);
  const si = sr.filter(r => r.status === "implemented").length;
  md += `## ${set} — ${si}/${sr.length}\n\n| Card | Name | Status | Note |\n|---|---|---|---|\n`;
  for (const r of sr) md += `| ${r.code} | ${r.name} | ${r.status === "implemented" ? "✅" : r.status === "partial" ? "🟡" : "❌"} ${r.status} | ${r.note} |\n`;
  md += "\n";
}
fs.writeFileSync("reports/coverage.md", md);

console.log(`Coverage: ${by("implemented").length}/${rows.length} implemented (${pct}%), ` +
            `${by("partial").length} partial, ${by("unsupported").length} unsupported`);
for (const r of by("unsupported")) console.log(`  ❌ ${r.code} ${r.name}`);
for (const r of by("partial")) console.log(`  🟡 ${r.code} ${r.name} — ${r.note}`);
console.log("Reports → reports/coverage.{json,md}");
