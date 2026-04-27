#!/usr/bin/env bash
# Run a project-wide type check when Claude finishes responding.
# Guards against the infinite-loop case using stop_hook_active.

set -uo pipefail

ACTIVE=$(node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try{const j=JSON.parse(s);process.stdout.write(j.stop_hook_active===true?'1':'')}catch{process.exit(0)}
});
")

if [ "$ACTIVE" = "1" ]; then
  exit 0
fi

if [ ! -f "tsconfig.json" ]; then
  exit 0
fi

npx --no-install tsc --noEmit 2>&1 | tail -20
echo '--- type check complete ---'
exit 0
