#!/usr/bin/env bash
# Push the latest work to GitHub. Run in your terminal whenever you want to sync the
# changes the assistant made on disk (it can't push from its sandbox).
#   bash scripts/sync.sh "optional commit message"
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
git add -A
git commit -m "${1:-checkpoint: corpus + engine progress}" || { echo "nothing to commit"; exit 0; }
git push
echo "✅ pushed to $(git remote get-url origin)"
