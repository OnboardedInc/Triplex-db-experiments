#!/usr/bin/env bash
# [DX-T1-14] Why: observe all five cgroups from an existing driver on a reader core, without waking the engine threads.
# Rejected: starting a helper container, application keep-warm requests, or sampling an unrelated holder.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix}
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
out=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}/$prefix
python3 - "$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json" "$prefix" <<'PY_LEASE'
import json,os,sys
r=json.load(open(sys.argv[1]));assert r['id']=='DX-T1' and r.get('prefix')==sys.argv[2];os.kill(r['pid'],0)
PY_LEASE
id=$(docker inspect --format '{{.Id}}' "$prefix-driver")
dest=$out/scale-memory-$(date +%s).json
[[ ! -e $dest ]] || exit 2
docker exec "$prefix-driver" taskset -c 4 node lab/trace/memory-reading.mjs > "$dest"
[[ $(docker inspect --format '{{.Id}}' "$prefix-driver") == "$id" ]] || exit 2
python3 - "$dest" "$out/trace-run.json" "$id" <<'PY_BIND'
import json,sys,pathlib
p=pathlib.Path(sys.argv[1]);r=json.loads(p.read_text());m=json.load(open(sys.argv[2]))
assert r['run']==m['tag'] and r['source']==m['source'] and r['slot']==m['slot']
r['driverContainerId']=sys.argv[3];p.write_text(json.dumps(r,indent=2)+'\n')
PY_BIND
