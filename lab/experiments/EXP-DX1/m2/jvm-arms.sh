#!/usr/bin/env bash
# Orchestrator: DX-M2's transactor JVM arms (A as is, B Datomic defaults, C pause goal 20, D C plus bounded young generation)
# on the zero-reader writer trace at the 10,000 rung, order A B C D D C B A, GC and safepoint log to the container's stdout.
# usage: jvm-arms.sh <tag> [write-gateway pause goal 50|20]
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"; E=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4; tag=${1:?tag}; gw=${2:-50}
summ() { python3 - "$1" "$2" <<'PY'
import json,sys,re
rows=[json.loads(l) for l in open(sys.argv[1])]
rows=[r for r in rows if r.get('outcome')=='committed' and r.get('transactCalledAt')]
def pct(x,p): x=sorted(x); return round(x[min(len(x)-1,int(p*len(x)))],1) if x else None
st=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if not r.get('burst')]
bu=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if r.get('burst')]
out={"steady":{"n":len(st),"p50":pct(st,.5),"p99":pct(st,.99)},"burst":{"n":len(bu),"p50":pct(bu,.5),"p90":pct(bu,.9),"p99":pct(bu,.99),"max":round(max(bu),1) if bu else None,"over50ms":sum(1 for b in bu if b>50)}}
for name in ('tx','gw-w'):
    try: log=open(sys.argv[2]+'/'+name+'.log',errors='replace').read()
    except OSError: continue
    pauses=[float(m) for m in re.findall(r'\] GC\(\d+\) Pause [^\n]*? (\d+\.\d+)ms',log)]
    safe=[int(m)/1e6 for m in re.findall(r'Safepoint [^\n]*Total: +(\d+) ns',log)]
    out[name]={"pauses":len(pauses),"pauseMaxMs":round(max(pauses),1) if pauses else None,"pauseOver25":sum(1 for p in pauses if p>25),"pauseSumMs":round(sum(pauses)),"safepointMaxMs":round(max(safe),1) if safe else None}
print(json.dumps(out))
PY
}
i=0
for arm in A B C D D C B A; do
  i=$((i+1)); p=tx2-dxh4-$tag-$(echo $arm | tr A-Z a-z)$i
  ( source lab/experiments/EXP-DX1/m2/arms.sh $arm $gw
    export DX_TX_JAVA_OPTS="${DX_TX_JAVA_OPTS/file=\/tmp\/gc.log:time,uptime:filecount=2,filesize=10M/stdout:time,uptime}"
    export DX_GW_WRITE_JAVA_OPTS="${DX_GW_WRITE_JAVA_OPTS/file=\/tmp\/gc.log:time,uptime:filecount=2,filesize=10M/stdout:time,uptime}"
    sh lab/bin/host-quiet.sh > "$E/$p-host-before.jsonl"
    echo "$DX_TX_JAVA_OPTS" > "$E/$p-tx-java.txt"
    bash lab/experiments/EXP-DX1/h4/run.sh real "$p" --rung 10k --zero-readers --match-duration-s 200 > "$E/$p-run.log" 2>&1 )
  rc=$?
  echo "arm $arm run $i rc=$rc $(cut -c1-110 "$E/$p-host-before.jsonl")"
  [[ -s $E/$p/driver/ns-writes.jsonl ]] && summ "$E/$p/driver/ns-writes.jsonl" "$E/$p"
done
