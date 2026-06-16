# Data Source Map (M7 discovery — evidence from 1.40a binaries)

## Where OPTCGSim actually gets card text (traced from Assembly-CSharp.dll strings, UTF-16)
| Channel | Endpoint | Purpose |
|---|---|---|
| **Card DB** | `https://dqaqduerpx7rd.cloudfront.net/1.40a_Card_<rev>` | card text/data patches ("mini-patching", 1.40a notes) |
| Set DB | `.../1.40a_Set_<rev>` | set metadata |
| Formats | `.../1.40a_Format_<rev>` | ban lists / rotation |
| Messages | `.../1.40a_Message_<rev>` | MOTD |
| Full patch | `.../PatcherData_<rev>` | hpatchz (HDiffPatch) binary patches, unpacked by StartPatcher.ps1 |
| Accounts/stats | `https://api.apibounty.online` (`/api/auth/*`, `/api/match/*`) | OPBounty login + match reporting |
| Matchmaking | `stats.tcgmatchmaking.com`, `log-sim-match-*.run.app`, `cardkaizoku.com/matchhistory` | telemetry/history |

**Local cache:** client writes **`CARDLIST.dat`** into Unity persistentDataPath (error string: "NO CARDLIST.dat!!!"). Suffix `<rev>` is client-resolved (incremental probe or embedded rev); CloudFront 403s blind requests without exact name.

## Update flow (reconstructed)
launch → check rev → GET `1.40a_Card_<rev>` from CloudFront → apply (hpatchz for binary, direct for data) → write `CARDLIST.dat` → load into CardDatabase. Fallback: bundled PatcherData.zip → full repatch.

## Acquisition strategy (ranked, provenance-tracked in master.js)
1. **PRIMARY: optcgapi.com** — open JSON REST, full EN text incl. errata, proven (ST01/ST02/OP01 verified against ground truth). Confidence 0.95.
2. **SECONDARY: apitcg.com** — keyed API, multi-language (EN/JP/CN slots). Confidence 0.9.
3. **FALLBACK: local `CARDLIST.dat`** — run OPTCGSim once on this machine; master.js auto-detects its format (JSON/CSV/line) and ingests; exact-parity with what the sim plays. Confidence 1.0 for sim-parity once present.

One-shot to capture #3: run 1.40a once → `master.js --batsu "~/Library/Application Support/<Batsu>/CARDLIST.dat"`.
