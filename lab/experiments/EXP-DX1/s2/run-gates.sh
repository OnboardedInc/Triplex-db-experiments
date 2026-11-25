#!/usr/bin/env bash
# [DX-S2] The product-path gates on in-memory gateways (Mac, correctness; times diagnostic), one ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S2-gates -- \
#     bash lab/experiments/EXP-DX1/s2/run-gates.sh OUT [OLD_ROOT]
# OUT: a new directory. OLD_ROOT: a directory holding packages/core/dist and packages/datomic/dist built from the
# commit before this branch (with node_modules links), for the byte-identity gate; without it that gate is skipped.
# Gates: (b, c, d, size rule) s2/gate.ts with the wide writer on and off; (a) s2/bytes.ts on OLD_ROOT and this build.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
old=${2:-}
[[ ! -e $out ]] || { echo "run-gates.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
git rev-parse HEAD > "$out/source"
name=gates-$$ subject=18871 control=18872
trap 'bash "$here/mem-gateways.sh" down "$name"' EXIT
status=0
node_ts() { node --no-warnings --experimental-transform-types "$@"; }
for wide in 1 0; do
  bash "$here/mem-gateways.sh" up "$name" "$subject" "$control" "$wide" || exit 1
  node_ts "$here/gate.ts" "http://127.0.0.1:$subject" "http://127.0.0.1:$control" "$wide" "$out/gate-wide$wide.json" \
    > "$out/gate-wide$wide.log" 2>&1 || status=1
  tail -n 1 "$out/gate-wide$wide.log"
done
if [[ -n $old ]]; then
  for arm in old new; do
    root=$repo; [[ $arm == old ]] && root=$old
    bash "$here/mem-gateways.sh" up "$name" "$subject" "$control" 0 >/dev/null || exit 1
    node_ts "$here/bytes.ts" "http://127.0.0.1:$subject" "$root" "$out/bytes-$arm.jsonl" > "$out/bytes-$arm.log" 2>&1 || status=1
  done
  python3 -I "$here/compare-bytes.py" "$out/bytes-old.jsonl" "$out/bytes-new.jsonl" | tee "$out/bytes-compare.txt" || status=1
fi
echo "DX-S2_GATES_EXIT $status"
exit "$status"
