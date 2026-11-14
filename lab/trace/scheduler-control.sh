#!/usr/bin/env bash
# [DX-T1-2] Why: run-queue accounting must be enabled equally in controls and traced arms, then restored under the lease.
# Rejected: silently treating a disabled kernel counter as zero contention, or changing the guest outside an owned hold.
set -euo pipefail
mode=${1:?enable|restore|recover}; prefix=${2:?owned-prefix}; out=${3:?evidence-dir}
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ && ( $mode == enable || $mode == restore || $mode == recover ) ]] || exit 2
export DOCKER_HOST="unix://$HOME/.colima/triplex2/docker.sock"
lease="$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json"
# [DX-T1-6] Why: a dead startup owner cannot run its EXIT trap; recovery must retain the original state and prove empty ownership.
# Rejected: deleting the lease first, rewriting the old scheduler receipt, or restoring another attempt's setting.
if [[ $mode == recover ]]; then
  python3 - "$lease" "$out/scheduler-state.json" "$prefix" "$(git rev-parse HEAD)" "$$" <<'PY_RECOVER'
import json,sys,os,pathlib
p=pathlib.Path(sys.argv[1]);old=json.loads(p.read_text());state=json.load(open(sys.argv[2]))
assert old['id']=='DX-T1' and old['prefix']==sys.argv[3] and state['prefix']==sys.argv[3]
assert state['source']==sys.argv[4] and state['leasePid']==old['pid']
try:os.kill(old['pid'],0)
except ProcessLookupError:pass
else:raise Exception('Original owner is alive')
replacement={**old,'pid':int(sys.argv[5]),'kind':'scheduler-recovery','recoveryOf':old}
pathlib.Path(sys.argv[2]).with_name('scheduler-recovery-owner.json').write_text(json.dumps(replacement)+'\n')
p.write_text(json.dumps(replacement)+'\n')
PY_RECOVER
  bash "$0" restore "$prefix" "$out"
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$out/scheduler-recovery-remaining.txt"
  [[ ! -s $out/scheduler-recovery-remaining.txt ]] || exit 1
  python3 - "$lease" "$$" <<'PY_RELEASE'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]);old=json.loads(p.read_text());assert old['id']=='DX-T1' and old['pid']==int(sys.argv[2]) and old['kind']=='scheduler-recovery'
p.unlink();p.parent.rmdir()
PY_RELEASE
  exit 0
fi
lease_pid=$(python3 - "$lease" <<'PY'
import json,sys,os
v=json.load(open(sys.argv[1]));assert v['id']=='DX-T1';os.kill(v['pid'],0);print(v.get('recoveryOf',v)['pid'])
PY
)
source=$(git rev-parse HEAD)
[[ $mode != restore || -f $out/scheduler-state.json ]] || exit 0
docker run --rm --pull never --privileged --network none --name "$prefix-scheduler-control" -v "$out:/evidence" node:22.23.2-bookworm-slim node -e '
const fs=require("fs"),[mode,prefix,source,pid]=process.argv.slice(1),p="/proc/sys/kernel/sched_schedstats",state="/evidence/scheduler-state.json";
const before=fs.readFileSync(p,"utf8").trim();
if(!["0","1"].includes(before))throw Error("Unexpected scheduler setting");
if(mode==="enable") {
 fs.writeFileSync(state,JSON.stringify({at:Date.now(),before,target:"1",prefix,source,leasePid:Number(pid)})+"\n",{flag:"wx"});
 if(before!=="1")fs.writeFileSync(p,"1\n");
} else {
 const old=JSON.parse(fs.readFileSync(state,"utf8"));
 if(old.prefix!==prefix||old.source!==source||old.leasePid!==Number(pid)||!["0","1"].includes(old.before))throw Error("Foreign scheduler restore state");
 if(before!==old.before)fs.writeFileSync(p,old.before+"\n");
}
console.log(JSON.stringify({at:Date.now(),mode,before,after:fs.readFileSync(p,"utf8").trim()}));' "$mode" "$prefix" "$source" "$lease_pid" >> "$out/scheduler-control.jsonl"
