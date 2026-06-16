#!/usr/bin/env bash
# One-shot: create a PRIVATE GitHub repo for GRAND LINE and push.
# Run this in YOUR terminal (it's connected to GitHub; the sandbox's mount can't run git).
#   bash scripts/setup_github.sh [repo-name]
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${1:-grand-line}"

# The sandbox left a partial .git with undeletable lock files; on the host we can
# reset to a pristine repo. (Set KEEP_GIT=1 to keep existing history instead.)
if [ "${KEEP_GIT:-0}" = "1" ]; then
  rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
else
  rm -rf .git
  git init -b main
fi

git config user.name  "$(git config user.name  || echo "$USER")" >/dev/null 2>&1 || true
git add -A
git commit -m "GRAND LINE — OPTCG simulator (engine + OP-01, CI firewall, golden replays)" || \
  echo "→ nothing new to commit"

if command -v gh >/dev/null 2>&1; then
  echo "→ creating PRIVATE GitHub repo '$REPO' and pushing…"
  gh repo create "$REPO" --private --source=. --remote=origin --push
  echo "✅ done: $(gh repo view "$REPO" --json url -q .url 2>/dev/null || echo "see your GitHub")"
else
  echo "gh CLI not found. Either install it, or create the repo manually then:"
  echo "   git remote add origin git@github.com:<you>/$REPO.git"
  echo "   git branch -M main && git push -u origin main"
fi
