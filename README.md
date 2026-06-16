# GRAND LINE — One Piece TCG Simulator (engine milestone M1)

Deterministic, server-authoritative-ready rules engine with data-driven card scripts.
No placeholders: all card data is real (ingested from the public OPTCG API and verified
against the deck list bundled in OPTCGSim 1.40a), and every interaction runs through the
rules engine.

## Run

```bash
cd grand-line
node --test                 # 20 tests: rules, scripts, replay determinism, 100-game sweep
node src/cli/play.js 42     # AI vs AI with full action log (any seed)
node src/cli/play.js --save replay.json 42
node src/cli/play.js --replay replay.json   # re-simulate & verify a replay

python3 -m http.server 8000 # then open http://localhost:8000/web/play.html
                            # → playable match vs AI with real card art
```

## Folder structure

```
grand-line/
├─ package.json
├─ src/
│  ├─ engine/
│  │  ├─ rng.js          seeded RNG + shuffle (state lives in game state)
│  │  ├─ cards.js        card registry, deck lists, OPTCGSim .deck import/export
│  │  ├─ power.js        effective power (DON bonus, auras, temp mods), ref resolution
│  │  ├─ effects.js      effect-DSL interpreter (ops, target queries, choice suspension)
│  │  └─ reducer.js      THE game: actions, phases, battle pipeline, legalActions()
│  ├─ data/
│  │  ├─ st01.cards.js   real ST-01 card data (EN; ja/zh slots via ingest pipeline)
│  │  └─ st01.scripts.js effect scripts as data — new cards need no engine changes
│  ├─ ai/agent.js        Phase-1 rule-valid greedy AI + playout/replay driver
│  └─ cli/play.js        CLI runner + replay verification
├─ test/engine.test.js   20 tests incl. exact-replay + 100-game invariant sweep
└─ web/
   ├─ play.html          playable browser match vs AI (real engine, real card art)
   └─ assets/cards/      card images (from your local StreamingAssets library)
```

## Architecture decisions (locked)

- `reduce(state, action) → state'` is pure; RNG state is part of game state →
  a `{seed, decks, actions[]}` triple IS a replay and re-simulates bit-exact.
- Hidden info stays server-side in the multiplayer phase: clients receive per-seat
  projections of this same state object.
- Card scripts are data (`st01.scripts.js`). The interpreter supports: onPlay,
  whenAttacking, activateMain (cost + once-per-turn), mainEvent, counterEvent,
  trigger, keywords (Blocker/Rush incl. conditional grants), auras (DON!!xN),
  battle flags (no-block variants), KO queries, DON gifting, power mods (turn/battle).
- `legalActions(state, seat)` is the single source of truth for AI and UI affordances —
  the UI can only ever offer legal moves; the AI can never cheat.

## Asset pipeline

`web/assets/cards/<SET>/<CODE>_small.jpg|<CODE>.png`, lazy-loaded by code, hover-zoom
uses the full-res PNG. Your `backup_sim/StreamingAssets/Cards` library (54 sets,
~2,690 cards, OP01→OP16/ST30/EB04/PRB02) is the local source; sets are copied in
on demand — no app rebuild to add a set.

## Status (M10 — 2026-06-16)

- Engine core + ST-01..05 fully scripted and tested: **done**
- **OP-01 (Romance Dawn) ingested**: 113/121 cards, 36 fully playable, OP01R deck live
- Corpus: **198 / ~2,690 cards** (6/54 sets); 120/198 (60.6%) fully playable; 57/57 tests green
- **Ingest unblocked**: save fetched JSON to `data/raw/<SET>.json` →
  `node scripts/ingest/from_file.js <SET>` → register in `cards.js` →
  `node scripts/generate.js --write` (auto-scripts A-class cards)
- Next blockers: (1) backfill 8 truncated OP-01 cards + ingest OP-02..16/EB/PRB,
  (2) DSL clauses for booster mechanics (top gap: `DON!! -N` cost-return),
  (3) deck builder UI (boosters have no fixed list), (4) WebSocket match server,
  (5) heuristic AI (phase 2).
