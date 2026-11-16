#!/usr/bin/env bash
# [DX-T1-11] Why: identity assumptions are checked against the exact sealed captures, outside all latency windows.
# Rejected: a regex over EDN or treating hypothetical C/D readers as an oracle PASS.
set -euo pipefail
tag=${1:?tx2-dxt1-tag}; session=${2:?tx2-dxt1-session};[[ $tag =~ ^tx2-dxt1-[a-z0-9-]+$ && $session =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
base=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1};out=$base/$tag
mkdir "$out"
node --input-type=module - "$base" "$session" "$out" "$tag" <<'INPUTS'
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {readRaw,sha256} from './lab/trace/layout-replay.mjs';import {verifiedRawManifest} from './lab/trace/pack-oracle.mjs';
const [base,session,out,tag]=process.argv.slice(2),inputs=[];
for(const arm of ['zero-before','loaded','zero-after']){
 const run=session+'-'+arm,dir=path.join(base,run);await verifiedRawManifest(dir);
 const m=JSON.parse(fs.readFileSync(path.join(dir,'trace-run.json'),'utf8')),text=readRaw(dir,'layout-captures.jsonl'),file=arm+'.jsonl';
 fs.writeFileSync(path.join(out,file),text,{flag:'wx'});inputs.push({file,run,source:m.source,sha256:sha256(text)});
}
const files=['packages/datomic/gateway/src/triplex/gateway/layout_input_audit.clj','lab/experiments/EXP-DX1/t1/input-audit.sh','lab/experiments/EXP-DX1/stack/up.sh'];
fs.writeFileSync(path.join(out,'request.json'),JSON.stringify({run:tag,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),createdAt:Date.now(),inputs,files:Object.fromEntries(files.map(f=>[f,sha256(fs.readFileSync(f))]))})+'\n',{flag:'wx'});
INPUTS
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null;do sleep 5;done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$
cleanup() {
 rc=$?;trap - EXIT TERM INT
 bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --inventory > "$out/remaining.txt" || exit 1
 [[ ! -s $out/remaining.txt ]] || exit 1
 rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --layout-input-audit "$out/request.json" > "$out/result.jsonl" 2> "$out/result.stderr.log"
python3 - "$out" <<'QUALIFY'
import hashlib,json,pathlib,sys,time
p=pathlib.Path(sys.argv[1]);q=json.loads((p/'request.json').read_text());rows=[json.loads(l) for l in (p/'result.jsonl').read_text().splitlines() if l.startswith('{')]
assert len(rows)==1;r=rows[0]
assert r['schema']=='triplex.layout-input-audit.v1' and r['run']==q['run'] and r['source']==q['source']
assert q['createdAt']<=r['startedAt']<=r['endedAt']<=time.time()*1000+1000
assert r['requestSha256']==hashlib.sha256((p/'request.json').read_bytes()).hexdigest()
assert all(hashlib.sha256(pathlib.Path(f).read_bytes()).hexdigest()==h for f,h in q['files'].items())
assert len(r['results'])==len(q['inputs'])==3
for a,b in zip(r['results'],q['inputs']):
 assert a['run']==b['run'] and a['source']==b['source'] and a['captureSha256']==b['sha256']
 assert a['captures']==a['singleClaimIdentityEqual']==300 and a['droppedRowIdentities']>0 and a['identityUtf8Bytes']>0
(p/'qualified.json').write_text(json.dumps({'kind':'input assumptions only; no full query/oracle acceptance','requestSha256':r['requestSha256'],'resultSha256':hashlib.sha256((p/'result.jsonl').read_bytes()).hexdigest(),'results':r['results']},indent=2)+'\n')
QUALIFY
