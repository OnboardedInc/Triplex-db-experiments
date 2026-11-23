#!/usr/bin/env bash
# [DX-CON1] Every console gate in one run against the toy (build step 7), each writing its JSON into DIR. Gates write
# only into account-003 (and read the other accounts); account-010 belongs to the console builder. Times are diagnostic.
#   bash demo/toy/gates.sh DIR
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
out=${1:?give an output directory}
mkdir -p "$out"
cd "$repo/examples/demo-mcp"
fail=0
for gate in g12 config entities query journal derive catalogue; do
  args=(--json "$out/gate-$gate.json")
  [[ $gate == g12 ]] && args=(--ref test)
  if node "src/gate-$gate.ts" ${args[@]+"${args[@]}"} > "$out/gate-$gate.log" 2>&1; then status=PASSED; else status=FAILED; fail=1; fi
  printf '%-10s %s  %s\n' "$gate" "$status" "$(tail -n 1 "$out/gate-$gate.log")"
done
node src/prove.ts --out "$out/prove" > "$out/prove.log" 2>&1 && status=PASSED || { status=FAILED; fail=1; }
printf '%-10s %s  %s\n' prove "$status" "$(tail -n 1 "$out/prove.log")"
exit $fail
