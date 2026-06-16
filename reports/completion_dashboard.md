# Completion Dashboard — measured only (2026-06-16, M14)
| Metric | Measured |
|---|---|
| Engine completion | 7/7 windows, 34 DSL clauses (+DON-ramp); resolution stack guarded |
| Card corpus acquired | **1,266 / ~2,690 (47%)** — 17 sets: ST01–05 + OP01–11 |
| OP set completeness | OP-01/02 complete (121); OP-03..11 partial (single-fetch, gaps logged) |
| Cards fully playable | **288 / 1,266 (23%)** — hand-scripted + auto A-class + vanilla; 1 partial |
| Repo | github.com/chessfromthefuture/grand-line (private) |
| Playable decks | ST01–05 + OP01R (legal 50, fuzz-validated) |
| Test coverage | **69/69 passing** |
| Pipeline hardening | dual-color + dual-attribute parsing, foreign-reprint filter (all caught by ingest) |
| Golden replays | 10 games bit-exact (`test/golden/goldens.json`) |
| Fuzz | 400–500 game sweep, 0 violations; CI-gateable |
| CI firewall | `npm run ci` — 5 gates, ALL GREEN |
| Card art available | 5,518 images, all 54 sets (local build; gitignored) |

## What changed this cycle (M12)
- **Ingested OP-02 (complete 121), OP-03, OP-04, OP-05.** Corpus 206 → **651 cards**.
  Reusable recovery (`scripts/ingest/recover.js`) salvages complete cards from truncated
  web_fetch dumps; completeness assert logs gaps for backfill.
- **🐛 Caught + fixed a real data-corruption bug — the firewall working as designed.**
  optcgapi set responses bundle promo/alt-art reprints (Wanted Poster, SP, Alternate Art)
  carrying FOREIGN codes (e.g. `ST01-012` inside the OP-03 response). Registering them
  silently **overwrote canonical earlier-set cards** in the registry. The golden suite
  flagged the ST01-vs-ST01 divergence; root-caused to the clobber; fixed with a set-prefix
  filter in `from_file.js`; locked in with `test/registry.test.js`. Determinism + replays
  were intact throughout (only a card name changed) — but it would have corrupted any deck
  using a reprinted card. Exactly the class of silent bug OPTCGSim ships every set.
- **DON!! -N clause paid off at scale** — many OP-02..05 cards auto-scripted from it.

## Known gaps (logged, for backfill pass)
- OP-03: 10 cards (incl. leader OP03-001) · OP-04: 17 · OP-05: 10 — truncated mid-fetch.
  Backfill via `scripts/ingest/recover.js` gap list + per-card fetches (same as OP-01/02).

## Bottleneck now
Content scale (mechanical) + DSL coverage of booster mechanics + per-set backfill of
truncated tails. Engine + harness solid; the firewall is catching real bugs.

## How to run
```
npm test          # 68 tests
npm run ci        # full 5-gate firewall
npm run play -- --decks OP01R,ST03 7
```
