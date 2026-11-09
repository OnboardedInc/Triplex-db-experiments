#!/usr/bin/env bash
# [DX-B2-N2] Why: mutation checks require an answer mismatch on a live staged gateway.
# Rejected: counting startup errors as sensitivity.
set -euo pipefail
root=$(git rev-parse --show-toplevel)
evidence=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2
stage=$evidence/stage/tx2-dxb2-a1
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
reload() {
  docker restart -t 1 tx2-dxb2-a1-gw-w >/dev/null
  for ((i=0;i<90;i++)); do
    if curl -fsS http://127.0.0.1:8493/health >/dev/null 2>&1; then return; fi
    sleep 1
  done
  return 1
}
restore() { cp -R "$root/packages/datomic/gateway/." "$stage/"; cp "$evidence/reach-client-unmutated.ts" "$root/packages/datomic/src/reach.ts"; reload; }
cp "$root/packages/datomic/src/reach.ts" "$evidence/reach-client-unmutated.ts"
trap restore EXIT
for mutant in valid retraction recorded rev client-valid; do
  cp -R "$root/packages/datomic/gateway/." "$stage/"
  cp "$evidence/reach-client-unmutated.ts" "$root/packages/datomic/src/reach.ts"
  python3 - "$root" "$stage" "$mutant" <<'PY'
import pathlib,sys
root,stage=map(pathlib.Path,sys.argv[1:3]);mode=sys.argv[3]
p=stage/'src/triplex/gateway'/('storage.clj' if mode in ['retraction','rev'] else 'reach.clj')
if mode=='valid':
 old='(when (and (<= from valid) (< valid to))';new='(when true'
elif mode=='retraction':
 old='(when text (.add out [:db/retract eid :triplex.entity/row text]))';new='(when false (.add out [:db/retract eid :triplex.entity/row text]))'
elif mode=='recorded': old='r (get basis "recordedAt")';new='r nil'
elif mode=='rev': old='(distinct (map :entity_id rows))';new='(distinct (map :entity_id (filter #(contains? new-ids (:id %)) rows)))'
else:
 p=root/'packages/datomic/src/reach.ts';old='''if (
          row.validFrom > basis.validAt ||
          (Option.isSome(row.validTo) && row.validTo.value <= basis.validAt)
        )
          continue;''';new='if (false) continue;'
s=p.read_text();assert s.count(old)==1,(mode,s.count(old));p.write_text(s.replace(old,new))
PY
  reload
  set +e
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8493 node "$root/node_modules/vitest/vitest.mjs" run packages/datomic/test/reach.test.ts > "$evidence/mutant-$mutant.log" 2>&1
  code=$?
  set -e
  [[ $code != 0 ]]
  rg -q 'AssertionError: expected' "$evidence/mutant-$mutant.log"
  echo "$mutant: rejected by answer comparison (exit $code)"
done
