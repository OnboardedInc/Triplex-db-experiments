#!/bin/sh
# [CX-VGS12F-R3] Why: retain each gate outcome, including original vectors, under one admitted job. Rejected: a final exit masking first failures.
set -u
out=lab/verify/GS12F/round3/evidence
export GS12F_EVIDENCE_DIR="$PWD/$out/current/"
export XDG_CACHE_HOME="$PWD/.cache/verify-gs12f-r3"
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw Error("less than 5 GiB free")' || exit 1
run() { label=$1; shift; "$@" > "$out/$label.log" 2>&1; printf '%s %s\n' "$label" "$?" >> "$out/exits.txt"; }
: > "$out/exits.txt"
date -u > "$out/started.txt"
run capture python3 lab/verify/GS12F/round3/capture.py
run probes node_modules/.bin/vitest run --config lab/verify/GS12F/round3/vitest.config.ts
run core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run'
run qlever sh -c 'cd packages/qlever && ../../node_modules/.bin/vitest run test/value-limits-offline.test.ts'
run integrations sh -c 'cd test/integration && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run container-before docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.HostConfig.Memory}}' tx2-xtdb-dev
run live node_modules/.bin/vitest run --config lab/verify/GS12F/round3/live.config.ts
run container-after docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.HostConfig.Memory}}' tx2-xtdb-dev
python3 - <<'PY'
import pathlib,json,hashlib
r=pathlib.Path('lab/verify/GS12F/round3/evidence')
s=json.loads((r/'execution-sources.json').read_text());changed=[p for p,h in s['files'].items() if hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()!=h]
(r/'source-stability.json').write_text(json.dumps({'changedDuringAttempt':changed},indent=2)+'\n');assert not changed,changed
PY
printf 'source-stability %s\n' "$?" >> "$out/exits.txt"
date -u > "$out/finished.txt"
