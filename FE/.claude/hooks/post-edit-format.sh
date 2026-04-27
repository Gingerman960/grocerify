#!/usr/bin/env bash
# Auto-format files Claude has just written or edited.
# Non-blocking: failures are surfaced but don't stop the session.

set -uo pipefail

FILE=$(node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||'')}catch{process.exit(0)}
});
")

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

case "$FILE" in
  *.ts|*.js|*.mjs)
    npx --no-install eslint --fix "$FILE" 2>&1 | tail -20 || true
    ;;
  *.html|*.scss|*.css|*.json)
    npx --no-install prettier --write "$FILE" 2>&1 | tail -5 || true
    ;;
esac

exit 0
