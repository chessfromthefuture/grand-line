#!/usr/bin/env node
// Recover a set's card JSON from a host web_fetch tool-results dump (the sandbox has no
// outbound network; the web_fetch tool writes oversized responses to disk, which the
// build can read). Salvages every COMPLETE card object (drops a final truncated one),
// de-dupes alt-art by code, writes data/raw/<SET>.json, prints completeness gaps.
//   node scripts/ingest/recover.js OP-03 [/path/to/tool-results.txt]
// If no path is given, uses the most recent web_fetch dump.
import fs from "node:fs";
import { execSync } from "node:child_process";

const set = process.argv[2];
if (!set) { console.error("usage: recover.js <SET-ID> [file]"); process.exit(1); }
let file = process.argv[3];
if (!file) {
  file = execSync(
    "ls -t /sessions/eager-pensive-pasteur/mnt/.claude/projects/*/*/tool-results/mcp-workspace-web_fetch-*.txt 2>/dev/null | head -1",
    { shell: "/bin/bash" }).toString().trim();
}
const raw = fs.readFileSync(file, "utf8");
const body = raw.slice(raw.indexOf("["));
const cards = [];
let idx = 1;
const re = /\s*,?\s*/y;
// incremental JSON object scan
let i = 1;
while (i < body.length) {
  while (i < body.length && " \n\r\t,".includes(body[i])) i++;
  if (i >= body.length || body[i] === "]") break;
  // find matching object via brace counting (handles strings/escapes)
  let depth = 0, inStr = false, esc = false, start = i;
  for (; i < body.length; i++) {
    const ch = body[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; }
    else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  if (depth !== 0) break; // truncated tail
  try { cards.push(JSON.parse(body.slice(start, i))); } catch { break; }
}
const seen = new Set(), uniq = [];
for (const c of cards) { const cd = c.card_set_id; if (cd && !seen.has(cd)) { seen.add(cd); uniq.push(c); } }
fs.mkdirSync("data/raw", { recursive: true });
fs.writeFileSync(`data/raw/${set}.json`, JSON.stringify(uniq));
const pre = set.replace("-", "");
const nums = [...seen].filter(c => c.startsWith(pre + "-")).map(c => +c.split("-")[1]).filter(n => !isNaN(n));
const mx = Math.max(0, ...nums), have = new Set(nums);
const gaps = [];
for (let n = 1; n <= mx; n++) if (!have.has(n)) gaps.push(`${pre}-${String(n).padStart(3, "0")}`);
console.log(`${set}: recovered ${uniq.length} cards, max ${mx}, ${gaps.length} gaps`);
if (gaps.length) console.log("GAPS:", gaps.join(" "));
