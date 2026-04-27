#!/usr/bin/env bash
# Block writes to forbidden paths.
# Reads the tool input JSON from stdin, exits 2 (with stderr message) to deny.
# Uses `node` for JSON parsing (always available in an Angular project).

set -uo pipefail

FILE=$(node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||'')}catch{process.exit(0)}
});
")

if [ -z "$FILE" ]; then
  exit 0
fi

case "$FILE" in
  *.generated.ts|*.generated.js)
    echo "BLOCKED: generated files are not editable ($FILE)" >&2
    exit 2
    ;;
  */src/app/features/index.ts|*/src/app/features/*/index.ts)
    echo "BLOCKED: feature-level barrel files are forbidden — see CLAUDE.md hard rule #9 ($FILE)" >&2
    exit 2
    ;;
esac

exit 0
