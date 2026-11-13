#!/usr/bin/env bash
# [DX-T1-2] Why: run-queue accounting must be enabled equally in controls and traced arms, then restored under the lease.
# Rejected: silently treating a disabled kernel counter as zero contention, or changing the guest outside an owned hold.
set -euo pipefail
mode=${1:?enable|restore}; prefix=${2:?owned-prefix}; out=${3:?evidence-dir}
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ && ( $mode == enable || $mode == restore ) ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
python3 - "$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))['id']=='DX-T1'
PY
[[ $mode != restore || -f $out/scheduler-state.json ]] || exit 0
docker run --rm --pull never --privileged --network none --name "$prefix-scheduler-control" -v "$out:/evidence" node:22.23.2-bookworm-slim node -e '
const fs=require("fs"),mode=process.argv[1],p="/proc/sys/kernel/sched_schedstats",state="/evidence/scheduler-state.json";
const before=fs.readFileSync(p,"utf8").trim();
if(mode==="enable") {
 fs.writeFileSync(state,JSON.stringify({at:Date.now(),before,target:"1"})+"\n",{flag:"wx"});
 if(before!=="1")fs.writeFileSync(p,"1\n");
} else {
 const old=JSON.parse(fs.readFileSync(state,"utf8"));if(before!==old.before)fs.writeFileSync(p,old.before+"\n");
}
console.log(JSON.stringify({at:Date.now(),mode,before,after:fs.readFileSync(p,"utf8").trim()}));' "$mode" >> "$out/scheduler-control.jsonl"
