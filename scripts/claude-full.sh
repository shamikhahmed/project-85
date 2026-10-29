#!/usr/bin/env bash
# Launch Claude Code with no permission prompts for this repo.
set -euo pipefail
cd "$(dirname "$0")/.."
exec claude --dangerously-skip-permissions "$@"
