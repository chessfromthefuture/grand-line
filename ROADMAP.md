# GRAND LINE — Internal Engineering Roadmap to 1.0

**Audience:** internal (engine + frontend + infra). **Goal:** ship a full OPTCGSim
replacement with zero known rules bugs at 1.0. **Bias of this document:** correctness
first. Every phase below is written as *scope → how we keep it bug-free → exit gate*.
Nothing advances until its gate is green.

> This is the *quality* roadmap. The *product* roadmap (features, vision) lives in
> `GRAND-LINE-TCG_Design-Spec.md` Part H. Where they disagree, this document wins on
> sequencing, because shipping features on a buggy base is how OPTCGSim accumulated its
> per-set regression debt.

---

## 0. Non-negotiable principles (the bug firewall)

These hold for the entire project. They are the reason we can move fast later without
breaking things.

1. **One reducer, both sides.** `reduce(state, action) → state'` is the single source of
   truth. Client prediction, server authority, AI, and replays all call the *same* code.
   No rules logic ever lives in the UI. (Already true — protect it.)
2. **Determinism is a tested invariant, not a hope.** RNG state lives in game state; a
   `{seed, decks, actions[]}` triple must re-simulate bit-exact. Every merge runs the
   replay-equality sweep. A non-deterministic diff is a release blocker, not a warning.
3. **`legalActions(state, seat)` is the only gate.** The UI may only offer what it
   returns; the AI may only pick from it. Illegal-move bugs become impossible by
   construction rather than by review.
4. **No card ships without a test.** A card is "done" only when (a) it has a script or is
   provably vanilla, and (b) at least one scenario test asserts its effect resolves
   correctly. Coverage % counts *tested* cards, not *written* cards.
5. **Card text is data; the engine is code.** New sets are `*.cards.js` + `*.scripts.js`
   + scenario tests. If a set needs an engine change, that change is a reviewed PR with
   its own tests — never an inline patch in a data file.
6. **Effects compose through one resolution stack.** Triggers, counters, replacement and
   "on" windows resolve through a single explicit priority/stack machine. This is the
   structural fix for the entire class of OPTCGSim trigger-ordering bugs (see §6).
7. **Green main, always.** `node --test` is green on every commit to main. Red main halts
   all other work until fixed.

---

## 1. Current measured state (baseline — 2026-06-16, M10)

| Area | State |
|---|---|
| Engine windows | 7/7 implemented; 31 DSL clauses |
| Corpus | 198 / ~2,690 cards (ST01–05 + OP-01) |
| Playable | 120 / 198 (60.6%); 1 partial |
| Tests | 57/57 passing; replay bit-exact verified cross-set |
| Ingest | unblocked (web_fetch → `data/raw/<SET>.json` → `from_file.js`) |
| Multiplayer | none (reducer is server-ready, not yet wrapped) |
| Deck builder | none (preset decks only) |
| AI | phase-1 greedy/rule-valid |

**Honest completion:** ~70% of a *local single-player* product; ~18–20% of a *full
online* replacement. The engine (the hard, bug-prone core) is the finished part.

---

## 2. Phase map (sequenced to minimize rework & bug surface)

```
P1 Engine hardening        ──► P2 Content scale        ──► P3 Deck builder
   (lock correctness)            (all sets, automated)       (cloud + validation)
        │                                                          │
        └────────────► P4 Online core (server-auth) ◄─────────────┘
                                   │
                       P5 Competitive layer (replays, spectate, ranked)
                                   │
                       P6 Polish & 1.0 (UI/UX, a11y, audio, store wrappers)
```

Rationale: **harden the engine before scaling content** (every bug found at 198 cards is
a bug not multiplied across 2,690). **Finish content + deck builder before online**, so
the server wraps a *stable* rules surface. **Online before competitive**, because
replays/spectating are projections of the netcode state. Polish last, over a correct base.

---

## P1 — Engine hardening & DSL completion

**Why first:** the corpus is the largest bug surface. Closing DSL gaps and locking the
resolution stack now means content scale becomes mechanical, not risky.

**Scope**
- Implement the top measured-frequency booster clauses, in frequency order. Current top
  gaps (from `reports/effect_candidates.json`): `DON!! -N` cost-return (9×), "place at
  bottom of deck", DON!!-from-deck ramp, modal/conditional buffs.
- Promote the explicit **resolution stack / priority window** machine to a first-class,
  separately tested module (it exists implicitly in `reducer.js`; make it explicit).
- Define the **escape-hatch** for cards the DSL can't express: sandboxed per-card script
  with the *same* determinism + test requirements. No card is "unimplementable."

**How we keep it bug-free**
- **Clause TDD:** every new DSL clause lands with (a) a parser unit test, (b) ≥2 scenario
  tests using real cards that use it, (c) a fuzz pass (`scripts/fuzz.js`) showing no
  invariant break. Clause is not "done" until all three are green.
- **Golden replay suite:** maintain a growing set of recorded `{seed,decks,actions}`
  games with asserted outcomes. Any engine change must reproduce all goldens bit-exact;
  an intentional rules change updates goldens in the *same* PR with justification.
- **Invariant sweep on every build:** life ≥ 0, hand/zone counts conserved, DON!!
  conservation, no negative power resolved, turn/phase monotonicity, deck never negative.
  `scripts/fuzz.js` already seeds this — wire it into CI as a hard gate.
- **Rules-judge oracle:** for a sample of cards, assert the engine result against the
  official ruling text (hand-encoded expected states). Catches "plausible but wrong."

**Exit gate**
- OP-01 reaches ≥95% automated (only genuinely-novel cards on escape-hatch, each tested).
- Resolution-stack module has its own test file covering: simultaneous triggers (active
  player orders), trigger-during-Double-Attack, counter-step priority, replacement
  effects, on-KO during battle. **These are the exact OPTCGSim bug classes — they must be
  explicit tests.**
- 1,000-game fuzz sweep: 0 invariant violations, 0 replay divergences.

---

## P2 — Content scale (all 54 sets, automated & tested)

**Scope:** ingest OP-02→OP-16, EB01–04, ST06–ST30, PRB01–02, promos. Reach full
current-format card pool.

**How we keep it bug-free**
- **Ingest is idempotent & diffed.** `from_file.js` already diffs against the registry
  (added/updated/errata/alt-art/invalid). Treat any `invalid` as a build failure to be
  resolved, never silently dropped (the dual-color bug taught us this).
- **Backfill discipline:** web_fetch truncates ~86KB, so large sets lose tail cards. Each
  set ingest ends with a **completeness assert**: codes present == expected count for that
  set (`<SET>-001..NNN`); missing codes are fetched individually before the set is marked
  done. (OP-01 owes: 007/012/036/042/059/062/099/100.)
- **Classification gate per set:** after ingest, `generate.js` must classify 100% of the
  set into A/B/C/D. A-class auto-applied; B/C scripted or escape-hatched; **no set is
  "done" with unclassified cards.**
- **Per-set scenario tests:** mirror the existing `test/st02.test.js` / `st03.test.js`
  pattern — each set gets a test file asserting its signature/most-complex cards. Target:
  every card that is not provably vanilla has ≥1 assertion.
- **Errata tracking:** the normalizer flags errata; keep an errata log so a card's text
  change is auditable and re-testable, mirroring OPTCGSim's "mini-patching."

**Exit gate**
- 54/54 sets ingested, completeness-asserted, 100% classified.
- ≥98% of the legal pool fully automated; remainder on tested escape-hatch.
- Full fuzz sweep across a representative deck matrix: 0 invariant/replay failures.

---

## P3 — Deck builder (cloud-synced, validation-first)

**Scope:** filters (color/cost/power/counter/type/attribute/set/rarity/keyword/trigger),
live stats panel, import/export (OPTCGSim `.deck` + text + URL), cloud sync, share links.

**How we keep it bug-free**
- **Validation is shared engine code**, not UI logic: legal-deck check (50 + leader, ≤4
  copies, color legality, leader-compat) lives next to `importOptcgsimDeck` and is unit
  tested with legal/illegal fixtures. The UI calls it; it never re-implements it.
- **Corrupt entries quarantine, never crash** (direct fix for OPTCGSim friction #3): a bad
  deck file is isolated with a visible error, the rest of the list loads. Test with
  deliberately malformed fixtures.
- **Round-trip property test:** `export(import(x)) === normalized(x)` for a corpus of real
  decklists. Import/export drift is a common silent bug — assert it away.

**Exit gate:** any legal deck buildable & playable vs AI; round-trip + validation tests
green; corrupt-file fixtures handled gracefully.

---

## P4 — Online core (server-authoritative, the determinism payoff)

**Scope:** auth + guest, server-authoritative matches over WSS, friend challenge,
reconnect, per-seat hidden-info projection.

**How we keep it bug-free**
- **Server runs the same reducer.** Clients send *actions*, not states. Server validates
  every action through `legalActions` before applying — a client can never desync or
  cheat because the server is the only writer.
- **Hidden info enforced by projection, not trust.** The server sends each seat a masked
  view; a test asserts no opponent-hidden data ever appears in a seat projection (fuzz the
  projector against full state).
- **Reconnect = replay.** Because state is `{seed,decks,actions}`, reconnect re-sends the
  action log; the client re-derives state deterministically. Test: kill+rejoin at every
  phase, assert identical resulting state.
- **Network is a transport, not a rules layer.** No game logic in the socket handler.
  Integration tests run two headless clients through full matches over a loopback socket.

**Exit gate:** two remote clients complete a full ranked-rules match reliably; reconnect
at any phase recovers exact state; projection leak test green; 0 server-authoritative
desyncs in a soak test.

---

## P5 — Competitive layer (replays, spectator, ranked, tournaments)

**Scope:** auto-saved replays, live spectating (delay + hidden-info masking), ranked
ladder/MMR, match history, tournament lobbies + judge console + chess clock.

**How we keep it bug-free**
- **Replays are free & already correct** — they are the core data model. The only new bug
  surface is the *viewer*; test it by asserting replay playback state == original match
  state at every action index.
- **Spectator = delayed seat projection** reusing P4's masking. Same leak test applies.
- **Judge console edits go through the reducer** as explicit, logged admin-actions — never
  raw state mutation — so judge edits remain replayable and auditable.
- **Clock is deterministic & server-owned**; never trust client time.

**Exit gate:** replay/spectate live and state-verified; ranked season runs; tournament +
judge tools complete a full event; judge edits replay cleanly.

---

## P6 — Polish, accessibility & 1.0

**Scope:** premium board FX, audio pass, onboarding/tutorial, puzzle mode, accessibility
(text scale 100–160%, colorblind-safe targets, reduced motion), PWA + store wrappers
(Tauri/Capacitor).

**How we keep it bug-free**
- Polish is **presentation over a frozen rules surface** — no engine changes here. If a
  visual feature seems to need a rules change, it goes back to P1 discipline (PR + tests).
- Accessibility and reduced-motion are tested as UI states, not afterthoughts.
- Store wrappers ship the *same* web build; no platform-specific rules forks.

**Exit gate (Part J success criteria):** new player → first game <60s, zero install;
100% current-format automation with 0 known trigger-stack bugs (golden suite green);
new set playable ≤72h after paper release with no client update; 60fps board on
2019-era mid phone.

---

## 3. The CI / regression harness (runs on every PR)

This is the machine that lets us finish *without* OPTCGSim's per-set regressions. Build it
early (during P1) and never bypass it.

| Gate | Tool | Blocks merge if |
|---|---|---|
| Unit + scenario tests | `node --test` | any failure |
| Replay determinism | golden `{seed,decks,actions}` sweep | any bit-exact divergence |
| Invariant fuzz | `scripts/fuzz.js` (N seeds × deck matrix) | any invariant violation |
| Card classification | `scripts/generate.js` | any unclassified card in a "done" set |
| Coverage report | `scripts/coverage.js` | tested-coverage % regresses |
| Deck round-trip | import/export property test | export(import(x)) ≠ x |
| Projection leak (P4+) | seat-projection fuzz | hidden info appears in a projection |

Rule: **a gate is added the moment its risk first appears, and is never disabled to land a
feature.** Disabling a gate to ship is the failure mode we are explicitly avoiding.

---

## 4. Cross-cutting bug-class register (TCG-specific traps)

These are the failure modes that sink card-game engines. Each has an owning mechanism
above; listed here so they're never forgotten.

1. **Simultaneous-trigger ordering** → explicit resolution stack, active player orders;
   dedicated tests (P1 gate).
2. **Trigger queued during Double Attack / multi-hit** → stack machine, not ad-hoc queue;
   explicit test (the canonical OPTCGSim bug).
3. **Replacement effects & "instead" timing** → modeled as replacement layer in the stack,
   not post-hoc patches.
4. **Counter-step priority & pass windows** → first-class window in the phase graph.
5. **Off-by-one in life / DON!! / zone counts** → conservation invariants in fuzz.
6. **Non-determinism leak** (Date.now, Math.random, Map/Set iteration order, JSON key
   order) → forbidden in engine; replay sweep catches it.
7. **Hidden-info leak** in projections → projection fuzz test (P4).
8. **Import/export drift** → round-trip property test (P3).
9. **Silent data drops on ingest** → `invalid` = build failure, completeness assert (P2).
10. **Floating power/cost from un-cleared turn modifiers** → end-of-turn cleanup asserted
    in invariants.

---

## 5. Definition of Done (applies at every level)

A unit of work — a clause, a card, a set, a feature — is **Done** only when:
1. It has tests that assert its *behavior*, not just that it runs.
2. All CI gates (§3) are green with it included.
3. It introduced no replay divergence and no invariant violation.
4. Its docs/reports are regenerated (`coverage.js`, `mechanics.js`, `dashboard.js`).
5. It changed data *or* code, not both in one undisciplined edit.

---

## 6. Immediate next actions (start of P1)

Status as of 2026-06-16 (✅ = done this cycle):
1. ✅ Backfilled the 8 truncated OP-01 cards; added completeness assert to `from_file.js`
   (OP-01 now 121/121 contiguous).
2. ✅ Implemented `DON!! -N` cost-return clause (+ `(N)` rest-DON) with parser TDD
   (`test/generate.test.js`); re-ran `generate.js --write`. Top gap is now DON-ramp.
3. ✅ Bug-class coverage verified: the five OPTCGSim trigger-stack bugs already have
   isolation tests (engine/m4); added `test/resolution_stack.test.js` — a structural
   well-formedness invariant over random play that guards the whole family.
4. ✅ CI harness stood up: `npm run ci` (`scripts/ci.sh`) runs all 5 gates; `fuzz.js`
   now exits non-zero on any violation; `test/decks.test.js` deck-legality gate added.
5. ✅ Recorded 10 golden replays (`test/golden/goldens.json`, `scripts/golden.js`).

**Next (continue P1 → P2):**
6. Ingest OP-02..OP-05 via the `from_file.js` path; classify + auto-script each set.
7. Implement the next ranked clauses: DON-ramp (`Add up to N DON!! … and rest/set active`),
   "place at bottom of deck", multi-clause KO. Each with parser + scenario TDD.
8. Extract the implicit priority/window machine in `reducer.js` into a named module so the
   resolution stack is unit-testable in isolation (currently guarded only behaviorally).
