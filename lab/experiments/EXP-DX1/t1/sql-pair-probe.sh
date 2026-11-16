#!/usr/bin/env bash
# [DX-T1-11] Why: an isolated pinned-jar safety probe still owns a measurement lease and a finite container lifetime.
# Rejected: launch an unaccounted JVM or change a database's synchronous-commit setting for the menu's trigger probe.
set -euo pipefail
tag=${1:?tx2-dxt1-tag}; [[ $tag =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
out=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}/$tag
mkdir "$out"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-T1","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$ DX_PAIR_LEASE_ID=DX-T1
cleanup() {
  rc=$?; trap - EXIT TERM INT
  bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --inventory > "$out/remaining.txt" || exit 1
  [[ ! -s $out/remaining.txt ]] || exit 1
  rm "$lock/owner.json";rmdir "$lock";exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
git rev-parse HEAD > "$out/head.txt"
python3 - "$out/request.json" "$tag" <<'REQUEST'
import hashlib,json,pathlib,subprocess,sys,time
files=['packages/datomic/gateway/src/triplex/gateway/sql_pair_probe.clj','lab/experiments/EXP-DX1/t1/sql-pair-probe.sh','lab/experiments/EXP-DX1/stack/up.sh']
json.dump({'tag':sys.argv[2],'source':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'createdAt':int(time.time()*1000),'files':{p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in files}},open(sys.argv[1],'w'),indent=2)
REQUEST
sh lab/bin/host-quiet.sh > "$out/host-before.jsonl"
bash lab/experiments/EXP-DX1/stack/up.sh "$tag" --sql-pair-probe > "$out/probe.jsonl" 2> "$out/probe.stderr.log"
sh lab/bin/host-quiet.sh > "$out/host-after.jsonl"
python3 - "$out" <<'QUALIFY'
import hashlib,json,pathlib,sys,time
root=pathlib.Path(sys.argv[1]);q=json.loads((root/'request.json').read_text())
rows=[json.loads(l) for l in (root/'probe.jsonl').read_text().splitlines() if l.startswith('{')]
assert len(rows)==1;r=rows[0]
assert r['schema']=='triplex.sql-pair-probe.v1' and r['run']==q['tag'] and r['source']==q['source']
assert q['createdAt']<=r['startedAt']<=r['endedAt']<=time.time()*1000+1000
assert all(hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h for p,h in q['files'].items())
e=r['connection']['events'];assert len(e)==6 and e[0][0]=='borrow' and e[2]==['close',1] and e[3][0]=='borrow' and e[5]==['close',2]
assert e[0][1]!=e[3][1] and e[0][2]==e[3][2]
assert e[1]==['prepare',1,'insert into datomic_kvs (id, map, val) values (?, ?, ?)']
assert e[4]==['prepare',2,'update datomic_kvs set rev=?, map=? where id=? and rev=?']
for k,present in [('original',True),('paired',False)]:
 a=r[k];assert a['returnedRevision']==1 and a['podPointsAtPresentChunk']==present and a['insertCalls']==1
 assert len(a['events'])==3 and a['events'][0][0]=='insert' and a['events'][1:]==[['update',1],['update',2]]
(root/'qualified.json').write_text(json.dumps({'result':'counterexample-only; no database safety or latency verdict','run':q['tag'],'source':q['source'],'requestSha256':hashlib.sha256((root/'request.json').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256((root/'probe.jsonl').read_bytes()).hexdigest()},indent=2)+'\n')
QUALIFY
