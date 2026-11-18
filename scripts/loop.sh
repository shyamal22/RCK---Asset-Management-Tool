#!/usr/bin/env bash
# Runs Claude Code headless, one milestone at a time, using prompts/02-loop.md.
# Usage: ./scripts/loop.sh 3     (runs up to 3 milestones, pausing between each)
# Review the output and commits after each run before continuing.
set -euo pipefail

RUNS="${1:-1}"
for ((i = 1; i <= RUNS; i++)); do
  echo "=== Run $i of $RUNS ==="
  claude -p "$(cat prompts/02-loop.md)" \
    --allowedTools "Read,Write,Edit,Bash(pnpm *),Bash(git add *),Bash(git commit *),Bash(npx *)"
  claude -p "$(cat prompts/03-review.md)" \
    --allowedTools "Read,Write,Edit,Bash(pnpm *),Bash(git add *),Bash(git commit *)"
  read -r -p "Milestone run $i finished. Continue? [y/N] " ans
  [[ "$ans" == "y" ]] || break
done
