#!/usr/bin/env bash
# [DX-S5] Why: make the retained database's exact head the readiness observation inside the diagnostic hold.
# Rejected: a generic health endpoint or an unbounded unowned peer process.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
python3 - <<'PY'
import json,os
s=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert s['id']=='DX-S5' and s['kind']=='diagnose-80000';os.kill(s['pid'],0)
PY
prefix=tx2-dxs5-seed-100000
repo=$PWD
db=$(node --input-type=module -e 'import {DatabaseScope} from "./packages/core/dist/runtime/index.js";console.log("s2-"+Buffer.from(String(DatabaseScope.test("dxs5-w0-100000-v1"))).toString("base64url"))')
docker run --rm --pull never --name "$prefix-peer" --network "$prefix-net" --memory 3g --memory-swap 3g \
 -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx2g -Dtriplex.codec.spec=/opt/replica-codec-spec.json' -e DATOMIC_EXT_CLASSPATH=/s5:/opt/gateway/src \
 -v "$repo/lab/experiments/EXP-DX1/s5:/s5:ro" -v "$repo/packages/datomic/gateway:/opt/gateway:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" \
 --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m readiness \
 "datomic:sql://$db?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" "${1:-3471684}"
