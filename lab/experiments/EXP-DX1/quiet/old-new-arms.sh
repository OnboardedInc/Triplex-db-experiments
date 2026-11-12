#!/usr/bin/env bash
# Orchestrator: is the 2x slower commit median code or host? Same zero-reader writer trace, alternating old code
# (verdict checkout at 0e1c0144, the code of the JVM-arm runs: burst p50 9.1 to 9.3 ms) and DX-R3's head.
set -uo pipefail
E=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4; V=/Users/sam/projects/triplex-db-2/.claude/worktrees/verdict; N=/Users/sam/projects/triplex-db-2/.claude/worktrees/dx-r3
summ() { python3 - "$1" <<'PY'
import json,sys
rows=[json.loads(l) for l in open(sys.argv[1])]
rows=[r for r in rows if r.get('outcome')=='committed' and r.get('transactCalledAt')]
def pct(x,p): x=sorted(x); return round(x[min(len(x)-1,int(p*len(x)))],1) if x else None
st=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if not r.get('burst')]
bu=[r['transactReturnedAt']-r['transactCalledAt'] for r in rows if r.get('burst')]
print(json.dumps({"steady":{"n":len(st),"p50":pct(st,.5),"p99":pct(st,.99)},"burst":{"n":len(bu),"p50":pct(bu,.5),"p90":pct(bu,.9),"p99":pct(bu,.99),"max":round(max(bu),1) if bu else None}}))
PY
}
git -C $V checkout -q --detach 0e1c0144 && (cd $V && pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store >/dev/null 2>&1; pnpm exec turbo run build --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... > $E/on-build.log 2>&1; echo "old build=$? $(git rev-parse --short HEAD)")
i=0
for arm in old new new old; do
  i=$((i+1)); p=tx2-dxh4-on$i-$arm; dir=$V; [ $arm = new ] && dir=$N
  ( cd $dir && sh lab/bin/host-quiet.sh > "$E/$p-host-before.jsonl"; git rev-parse --short HEAD > "$E/$p-head.txt"
    DX_STACK_EVIDENCE=$E bash lab/experiments/EXP-DX1/h4/run.sh real "$p" --rung 10k --zero-readers --match-duration-s 200 > "$E/$p-run.log" 2>&1 ); rc=$?
  echo "arm $arm run $i rc=$rc head=$(cat $E/$p-head.txt) $(cut -c1-120 $E/$p-host-before.jsonl)"
  [[ -s $E/$p/driver/ns-writes.jsonl ]] && summ "$E/$p/driver/ns-writes.jsonl"
done
