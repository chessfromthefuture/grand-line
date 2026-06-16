# Ingestion Flow

## OPTCGSim's own flow (traced)
```
[Launch] → [rev check] → [CloudFront GET 1.40a_Card_<rev>] → [hpatchz/direct apply]
   ↓ fail                                                          ↓
[bundled PatcherData.zip] ──────────────→ [CARDLIST.dat in persistentDataPath]
                                                   ↓
                                            [CardDatabase load]
```

## GRAND LINE acquisition flow (scripts/ingest/master.js)
```
[sources: optcgapi → apitcg → CARDLIST.dat] → normalize.js (validate/split/errata)
   → dedupe + provenance + confidence → data/cards_master.json (versioned)
   → generate.js (A/B/C/D candidates) → auto-apply A → src/data/auto.scripts.js
   → coverage.js + mechanics.js + dashboard.js  → per-set quality gate (node --test)
```
Every record carries `{source:{primary,fallbacks[]}, confidence, fetchedAt, textHash}`;
re-runs diff textHash → errata/update detection (normalize.diffAgainstRegistry).
