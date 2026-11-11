#!/usr/bin/env bash
# Orchestrator A/B 2: the zero-reader writer trace at the 10,000 rung with every engine container on its OWN CPU
# (Postgres 0, transactor 1, write gateway 2, read gateway 3), once as is and once with in-container idle loops.
# With exclusive CPUs an idle loop cannot take time from a neighbouring container (the reason wake-ab.sh failed).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"; E=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4; tag=${1:?tag}
export DX_CPUS_PG=0 DX_CPUS_TX=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=3
summ() { python3 - "$1" <<'PY'
import json,sys
rows=[json.loads(l) for l in open(sys.argv[1])]
rows=[r for r in rows if r.get('outcome')=='committed' and r.get('transactCalledAt')]
def pct(x,p): x=sorted(x); return round(x[min(len(x)-1,int(p*len(x)))],1) if x else None
st=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if not r.get('burst')]
bu=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if r.get('burst')]
print(json.dumps({"steady":{"n":len(st),"p50":pct(st,.5),"p90":pct(st,.9),"p99":pct(st,.99)},"burst":{"n":len(bu),"p50":pct(bu,.5),"p90":pct(bu,.9),"p99":pct(bu,.99),"max":round(max(bu),1) if bu else None,"over100ms":sum(1 for x in bu if x>100)}}))
PY
}
for arm in xplain xloops; do
  p=tx2-dxh4-$tag-$arm; w=""
  sh lab/bin/host-quiet.sh > "$E/$p-host-before.jsonl"
  if [[ $arm == xloops ]]; then bash lab/experiments/EXP-DX1/vm-wake/in-container.sh watch "$p" > "$E/$p-loops.log" 2>&1 & w=$!; fi
  bash lab/experiments/EXP-DX1/h4/run.sh real "$p" --rung 10k --zero-readers --match-duration-s 200 > "$E/$p-run.log" 2>&1; rc=$?
  [[ -n $w ]] && kill $w 2>/dev/null
  echo "$arm rc=$rc $(cut -c1-140 "$E/$p-host-before.jsonl")"; [[ -n $w ]] && cat "$E/$p-loops.log"
  [[ -s $E/$p/driver/ns-writes.jsonl ]] && summ "$E/$p/driver/ns-writes.jsonl"
done
