# Local Corpus Audit (M6)
Sources inspected: 1.40a app bundle (resources.assets, sharedassets*, level0-3, globalgamemanagers, all 40+ Managed DLLs incl. UTF-16 sweep, plists, nibs) and backup_sim/StreamingAssets (5,381 files).

## Findings
- **Card text/metadata: NOT present locally.** 0 effect-text hits in UTF-8 AND UTF-16 across all serialized assets and Assembly-CSharp. The sim downloads its card database at runtime into Unity persistentDataPath (per its own troubleshooting docs: the "Batsu" folders). Checked `~/Library/Application Support/Batsu` and `com.BatsuApps.OPTCGSim` — absent (sim never run on this Mac).
- **Card IMAGES: complete.** 54 sets / ~2,690 cards / full-res PNG + thumb JPG (OP01–OP16, ST01–ST30, EB01–04, PRB01–02, P, Don, card backs). Asset pipeline fully unblocked, all languages' art shared.
- **Deck definitions: 7 embedded ST decks (ST01–ST07, 126 lines)** extracted from resources.assets → format ground truth + validation corpus.
- **Localization: TRANSLATION.txt** (UI strings, EN) — useful for client UX parity, not card data.
- Total cards discovered (text): 0 local · 155 via API (ST01, ST02 ingested; OP-01 measured)
- Languages available locally: none for card text; images language-neutral
- Missing: card text for all 54 sets locally — **action: either run OPTCGSim once on this Mac (then re-audit persistentDataPath) or run `node scripts/ingest/fetch.js` for all sets (preferred: clean, structured, EN)**
- Data quality score: images 10/10 · deck format 10/10 · card text 0/10 (locally) / 9/10 (API source, errata-annotated)
