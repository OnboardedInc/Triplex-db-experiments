#!/usr/bin/env bash
# [DX-H8] Why: jfr print defaults to five displayed frames, hiding the first gateway frame in most recorded stacks.
# Rejected: attributing those shallow exports as though the recording had no gateway work.
set -euo pipefail
input=${1:?recording directory}; prefix=${2:?current owned holder prefix}
[[ $prefix =~ ^tx2-dxh8-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
owns() {
 python3 - "$prefix" <<'PY'
import json,sys
r=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert r['id']=='DX-H8' and r['prefix']==sys.argv[1]
PY
}
for role in tx gw-w; do
 owns
 [[ -s $input/$role.jfr ]]
 helper=$prefix-jfr
 # Dedicated name avoids colliding with the active seed disk watcher.
 (sleep 180; docker rm -f "$helper" >/dev/null 2>&1 || true) & timer=$!
 set +e
 docker run --rm --pull never --name "$helper" --network none --cpuset-cpus 4,5,6,7 --memory 1g --memory-swap 1g \
  -v "$input:/recording:ro" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 \
  print --json --stack-depth 256 --events jdk.ExecutionSample,jdk.NativeMethodSample "/recording/$role.jfr" 2> "$input/$role-full2-jfr-error.txt" \
  | gzip -1 -n > "$input/$role-samples-full2.json.gz"
 status=$?
 set -e
 kill "$timer" 2>/dev/null || true
 wait "$timer" 2>/dev/null || true
 [[ $status == 0 ]] || exit "$status"
done
