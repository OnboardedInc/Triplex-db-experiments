#!/usr/bin/env bash
# Orchestrator A/B: zero-reader writer trace (200 s of trace time: steady rate, then the first 55/s burst) at the 10,000 rung,
# once as is and once with in-container idle loops. Prints commit call-to-return percentiles for the steady part and the burst.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"; E=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4; tag=${1:?tag}
summ() { python3 - "$1" <<'PY'
import json,sys
rows=[json.loads(l) for l in open(sys.argv[1])]
rows=[r for r in rows if r.get('outcome')=='committed' and r.get('transactCalledAt')]
t0=min(r['scheduledAt'] for r in rows)
def pct(x,p): x=sorted(x); return round(x[min(len(x)-1,int(p*len(x)))],1) if x else None
st=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if (r['scheduledAt']-t0)<110000]
bu=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if 120000<=(r['scheduledAt']-t0)<180000]
print(json.dumps({"steady":{"n":len(st),"p50":pct(st,.5),"p90":pct(st,.9),"p99":pct(st,.99)},"burst":{"n":len(bu),"p50":pct(bu,.5),"p90":pct(bu,.9),"p99":pct(bu,.99),"max":round(max(bu),1) if bu else None,"over400ms":sum(1 for x in bu if x>400)}}))
PY
}
for arm in plain loops; do
  p=tx2-dxh4-$tag-$arm; w=""
  sh lab/bin/host-quiet.sh > "$E/$p-host-before.jsonl"
  if [[ $arm == loops ]]; then bash lab/experiments/EXP-DX1/vm-wake/in-container.sh watch "$p" > "$E/$p-loops.log" 2>&1 & w=$!; fi
  bash lab/experiments/EXP-DX1/h4/run.sh real "$p" --rung 10k --zero-readers --match-duration-s 200 > "$E/$p-run.log" 2>&1; rc=$?
  [[ -n $w ]] && kill $w 2>/dev/null
  sh lab/bin/host-quiet.sh > "$E/$p-host-after.jsonl"
  echo "$arm rc=$rc $(cat "$E/$p-host-before.jsonl" | cut -c1-140)"; [[ -n $w ]] && cat "$E/$p-loops.log"
  [[ -s $E/$p/driver/ns-writes.jsonl ]] && summ "$E/$p/driver/ns-writes.jsonl"
done
