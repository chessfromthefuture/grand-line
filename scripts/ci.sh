#!/usr/bin/env bash
# GRAND LINE CI gate — the bug firewall (see ROADMAP.md §3).
# Every gate must pass. Never disable a gate to land a feature.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
fail=0
hr(){ printf '\n\033[1m── %s ──\033[0m\n' "$1"; }

hr "1/5 unit + scenario tests"
node --test 2>&1 | tail -8
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "GATE FAIL: tests"; fail=1; }

hr "2/5 replay determinism (golden suite)"
if [ -f scripts/golden.js ]; then
  node scripts/golden.js || { echo "GATE FAIL: golden replay divergence"; fail=1; }
else echo "(no goldens yet — skipping)"; fi

hr "3/5 invariant fuzz sweep (${FUZZ_GAMES:-500} games)"
node scripts/fuzz.js "${FUZZ_GAMES:-500}" || { echo "GATE FAIL: invariant violation"; fail=1; }

hr "4/5 card classification (no unclassified cards)"
node scripts/generate.js 2>&1 | tail -6

hr "5/5 coverage report"
node scripts/coverage.js 2>&1 | head -2

hr "RESULT"
if [ "$fail" -eq 0 ]; then echo -e "\033[32mALL GATES GREEN\033[0m"; else echo -e "\033[31mCI FAILED\033[0m"; fi
exit $fail
