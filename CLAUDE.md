# CLAUDE.md — GRAND LINE

Context for Claude Code. Read `ROADMAP.md` (engineering plan) and
`reports/completion_dashboard.md` (latest measured state) first.

## What this is
GRAND LINE — a from-scratch **One Piece Card Game simulator**, intended as a full
OPTCGSim replacement with a better UI/UX. Zero-dependency Node (ESM), deterministic
rules engine, data-driven card scripts.

## Current state (M15, 2026-06-16)
- **1,459 / ~2,690 cards** across 19 sets (ST01–05, OP01–13). 313 fully playable.
- Engine is the mature part: pure `reduce(state, action) → state`, seeded RNG in state →
  bit-exact replays. 69 tests, 10 golden replays, fuzz-clean.
- Remaining: ingest OP-14/15/16, EB01–04, PRB01–02, ST06+; backfill truncated tails;
  more DSL clauses; then deck-builder UI, multiplayer, heuristic AI (see ROADMAP phases).

## Commands
```bash
npm test                 # full test suite (must stay green)
npm run ci               # 5-gate firewall: tests, golden determinism, fuzz, classify, coverage
npm run golden           # replay determinism vs test/golden/goldens.json
npm run golden:update    # re-record goldens — ONLY with justification; review the diff
npm run fuzz             # invariant sweep (node scripts/fuzz.js [games])
npm run play -- --decks OP01R,ST03 7   # watch an AI match
```
**Never commit red. Never disable a CI gate to land a feature.** A golden divergence is a
release blocker — root-cause it (see the git history for the registry-clobber bug, a good
worked example) before re-recording.

## Adding a card set (the core loop)
The sandbox that built this had no outbound network, so data came via a fetch-to-disk
trick. In Claude Code you have normal network — simplest path:
```bash
# fetch the set JSON to data/raw/<SET>.json (curl works here), e.g.:
curl -s https://optcgapi.com/api/sets/OP-14/ > data/raw/OP-14.json
node scripts/ingest/from_file.js OP-14      # normalize → src/data/op14.cards.js (+ completeness report)
# register it: add `import { OP14_CARDS }` + `registerSet(OP14_CARDS, {})` in src/engine/cards.js
node scripts/generate.js --write            # auto-script A-class cards into auto.scripts.js
npm run ci                                  # must be green
```
`scripts/ingest/recover.js <SET>` salvages cards from a truncated dump if you ever need it.
Starter-deck endpoint is `/api/decks/ST-06/`; per-card backfill is `/api/sets/card/<CODE>/`.

## Ingest gotchas already handled (keep them)
- **Foreign-reprint filter** (`from_file.js`): set responses bundle promo/alt-art reprints
  carrying FOREIGN codes (e.g. `ST01-012` inside the OP-03 response). They must be dropped
  or they overwrite canonical earlier-set cards. Guarded by `test/registry.test.js`.
- **Dual color** ("Green Red") and **dual attribute** ("Special Strike") parse in
  `normalize.js`. Source occasionally has `attribute:"?"` — those rows are dropped as invalid.
- web_fetch/scrape responses truncate ~86KB → big sets lose scattered cards; the
  completeness assert logs gaps. Backfill via per-card endpoint.

## Conventions
- Card data is generated (`src/data/*.cards.js`) — don't hand-edit stats; re-ingest instead.
- Hand-written scripts (`*.scripts.js`) always win over auto-scripts at registration.
- New DSL clause = parser test in `test/generate.test.js` + ≥1 scenario test + green fuzz.
- Card art is gitignored (large, community-sourced); copied from a local OPTCGSim
  StreamingAssets library on demand.

## Repo
`github.com/chessfromthefuture/grand-line` (private). Normal `git` works here — commit and
push directly (the Cowork sandbox couldn't, hence `scripts/sync.sh`, which you no longer need).
