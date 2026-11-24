#!/usr/bin/env bash
# [DX-IMP2] Mac correctness gates, one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-IMP2-gate -- bash lab/experiments/EXP-DX1/imp2/gate.sh OUT [BASE_COMMIT]
# OUT: a new absolute directory under /Users (the lab VM shares only that tree). BASE_COMMIT: the base for the
# option-off digest (default: the merge base with origin/exp/DX-INT1).
set -uo pipefail
out=${1:?absolute new output directory under /Users}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
repo=$(git rev-parse --show-toplevel)
base=${2:-$(git -C "$repo" merge-base HEAD origin/exp/DX-INT1)}
image=${DX_IMP2_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out/base"
git -C "$repo" rev-parse HEAD > "$out/source"; echo "$base" > "$out/base-commit"
git -C "$repo" archive "$base" packages/datomic/gateway/src | tar -x -C "$out/base"
name=tx2-dximp2-gate
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 4g -e "DX_IMP2_ARMS=${DX_IMP2_ARMS:-off-digest mem sql removal}" -e "DX_IMP2_LIMIT_US=${DX_IMP2_LIMIT_US:-}" -e "DX_IMP2_ONLY=${DX_IMP2_ONLY:-}" \
  -e "DX_IMP2_EXTRA_ENV=${DX_IMP2_EXTRA_ENV:-}" \
  --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/base/packages/datomic/gateway/src:/opt/gateway-base/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" "$image" /exp/imp2/gate-run.sh > "$out/gate.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/base"
# Gate (a): the base and this branch must print the same option-off record for each environment set.
python3 - "$out/gate.log" <<'PY' | tee "$out/off-digest.txt"
import json, sys
runs = {}
for line in open(sys.argv[1]):
    if line.startswith("DX-IMP2_OFF "):
        _, who, env, body = line.split(" ", 3)
        runs[(who, env)] = json.loads(body)
for env in sorted({e for _, e in runs}):
    b, n = runs.get(("base", env)), runs.get(("branch", env))
    same = b is not None and b == n
    print("DX-IMP2_OFF_COMPARE", env, "IDENTICAL" if same else "DIFFERENT",
          json.dumps({"frames": len((n or {}).get("sent", [])), "datoms": (n or {}).get("datoms"), "log": (n or {}).get("log"),
                      "writeOptions": (n or {}).get("writeOptions"), "requests": sorted({s["request"][:12] for s in (n or {}).get("sent", [])})[:3]}))
PY
grep -E '^DX-IMP2_(EXIT|[A-Z]+_GATE|SQL)|FAIL in|ERROR in' "$out/gate.log" | cut -c1-400
exit "$status"
