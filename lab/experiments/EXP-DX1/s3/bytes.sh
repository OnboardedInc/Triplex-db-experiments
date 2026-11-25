#!/usr/bin/env bash
# [DX-S3] Gate (a): the SDK's requests with the new option off are byte-identical to the product-path builder's build,
# with every option off (s2/bytes.ts) and with orderedSaves and saveSizeRule on (s3/bytes.ts, tokens masked). One token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S3-bytes -- bash lab/experiments/EXP-DX1/s3/bytes.sh OUT OLD_ROOT
# OLD_ROOT: a checkout of 4d619a516 with packages/core/dist and packages/datomic/dist built (and node_modules).
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
old=${2:?old root}
[[ ! -e $out ]] || { echo "bytes.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
git rev-parse HEAD > "$out/source"; git -C "$old" rev-parse HEAD > "$out/old-source"
name=bytes-$$ subject=18893 control=18894
trap 'bash "$here/mem-gateways.sh" down "$name"' EXIT
status=0
node_ts() { node --no-warnings --experimental-transform-types "$@"; }
for kind in off ordered; do
  for arm in old new; do
    root=$repo; [[ $arm == old ]] && root=$old
    bash "$here/mem-gateways.sh" up "$name" "$subject" "$control" 0 >/dev/null || exit 1
    if [[ $kind == off ]]; then
      node_ts "$repo/lab/experiments/EXP-DX1/s2/bytes.ts" "http://127.0.0.1:$subject" "$root" "$out/bytes-$kind-$arm.jsonl" > "$out/bytes-$kind-$arm.log" 2>&1 || status=1
    else
      DX_S3_BYTES_OPTIONS='{"orderedSaves":true,"saveSizeRule":true}' \
        node_ts "$here/bytes.ts" "http://127.0.0.1:$subject" "$root" "$out/bytes-$kind-$arm.jsonl" > "$out/bytes-$kind-$arm.log" 2>&1 || status=1
    fi
  done
  python3 -I "$here/compare-bytes.py" "$out/bytes-$kind-old.jsonl" "$out/bytes-$kind-new.jsonl" | tee "$out/bytes-$kind-compare.txt" | head -3 || status=1
  [[ ${PIPESTATUS[0]} == 0 ]] || status=1
done
echo "DX-S3_BYTES_EXIT $status"
exit "$status"
