#!/bin/sh
# [CX-VGS12F-R2] Why: retain resource admission, resident identity and actual command result. Rejected: a new engine lifecycle action.
set -u
out=lab/verify/GS12F/round2/evidence
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw Error("less than 5 GiB free")' || exit 1
python3 - <<'PY'
import pathlib,hashlib,json
r=pathlib.Path('lab/verify/GS12F/round2')
(r/'evidence/live-sources.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [r/'live.test.ts',r/'live.config.ts',r/'run-live.sh']},indent=2)+'\n')
PY
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.HostConfig.Memory}}' tx2-xtdb-dev > "$out/xtdb-container-before.txt"
node lab/bin/engine.mjs status --lane xtdb --slot dev --holder CX-VGS12F > "$out/engines-before-live.log" 2>&1
node_modules/.bin/vitest run --config lab/verify/GS12F/round2/live.config.ts > "$out/live.log" 2>&1
result=$?
printf 'live %s\n' "$result" > "$out/live-exit.txt"
docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.HostConfig.Memory}}' tx2-xtdb-dev > "$out/xtdb-container-after.txt"
exit "$result"
