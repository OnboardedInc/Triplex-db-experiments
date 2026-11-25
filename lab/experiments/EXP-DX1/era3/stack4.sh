#!/usr/bin/env bash
# [DX-ERA3, fourth review] Stack scenarios against DX-ERA2 at bd4ec0d1a (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> BOUNDARY=<log|commit> node lab/bin/heavy.mjs --label DX-ERA3-stack4 -- \
#     bash lab/experiments/EXP-DX1/era3/stack4.sh NEW_ABSOLUTE_DIR BODIES_DIR SCENARIO
# BODIES_DIR: written by `run.sh OUT subject bodies2` with ERA3_MAIN=2. Per account with the subject setting, the
# PostgreSQL removal authority shared by a write and a read gateway, every container on the image the stack pinned by
# ID, the gateway source this checkout's HEAD. BOUNDARY=commit sets TX2_REMOVAL_COMMIT_BOUNDARY=1 on both gateways.
# SCENARIO:
#   restore-shift  the data backed up after the seeds; then one more save (which the backup lacks) and the removal of a1;
#                  the data restored from the backup (transactor and gateways stopped); the restore route replays the
#                  removal, now one position earlier than its first commit; then reads, writes, a removal and the
#                  rebuild route
#   restore-noshift the same without the extra save (the replay lands at the removal's own position): the control
#   ack4           era3/stack4-ack.mjs: era3/stack3-ack.mjs, and every cached Reach session reply checked for a hit on the
#                  removed subject (the gateway telling the client to keep its cached copy)
# Predictions (written 2026-11-25 02:19 EST, before the first run of this script; see the evidence's predictions.md):
#   restore-shift, commit boundary: after the restore route every write, every removal and the rebuild route answer
#   503 RemovalLogConflict, and stay so; reads are served with a1 masked. Log boundary: everything 200 after the
#   restore route. restore-noshift, commit boundary: normal after the restore route. Shown wrong by a write 200 on the
#   commit boundary after restore-shift.
#   ack4: 0 reads after an acknowledgement answer the value; 0 Reach session hits on the removed subject after it.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; scenario=${3:?restore-shift, restore-noshift or ack4}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera3d-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA3_PORT_WRITE:-19051} port_r=${DX_ERA3_PORT_READ:-19055}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
bg_pids=()
cleanup() {
  for p in ${bg_pids[@]+"${bg_pids[@]}"}; do kill "$p" 2>/dev/null || true; done
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  docker rm -f "$prefix-restore" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gw" "$out/gwtmp" "$out/backup"
}
trap cleanup EXIT
# The gateway source the stack mounts (read-only, /opt/gateway): this checkout's, or OLD_REF's for "upgrade".
mkdir -p "$out/gw" "$out/gwtmp"
place_source() { # REF ("" for this checkout)
  rm -rf "$out/gw"/* "$out/gwtmp"/*
  if [[ -n $1 ]]; then git archive "$1" packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
  else git archive HEAD packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"; fi
  cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
  cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
  echo "${1:-$(git rev-parse HEAD)}" >> "$out/sources-placed"
}
old_ref=${OLD_REF:-}
# SOURCE_REF: another commit's gateway source (e.g. the builder's newer head) instead of this checkout's HEAD
place_source "${SOURCE_REF:-}"
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1)
[[ ${BOUNDARY:-log} == commit ]] && gateway+=(DX_REMOVAL_COMMIT_BOUNDARY=1)
echo "boundary ${BOUNDARY:-log}" > "$out/boundary"
env "${envs[@]}" "${gateway[@]}" DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
  TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" \
  --gateway-src "$out/gw" "${args[@]}" > "$out/up.log" 2>&1 || { echo "stack did not start; see $out/up.log" >&2; exit 1; }
pinned=$(cut -d'|' -f1 "$out/evidence/$prefix/config/java-image.txt")
pg_pinned=$(docker image inspect --format '{{.Id}}' postgres:17-alpine)
check_images() {
  for role in tx gw-w gw-r pg; do
    ran=$(docker inspect --format '{{.Image}}' "$prefix-$role")
    echo "$1 $prefix-$role $ran" >> "$out/images-ran"
    want=$pinned; [[ $role == pg ]] && want=$pg_pinned
    [[ $ran == "$want" ]] || { echo "container $prefix-$role runs $ran, not the pinned $want" >&2; exit 1; }
  done
}
check_images start
echo "pinned $pinned pg $pg_pinned" >> "$out/images-ran"
W=http://127.0.0.1:$port_w R=http://127.0.0.1:$port_r
step() { echo "$(date +%H:%M:%S) $*" | tee -a "$out/steps.log"; }
n=0
# post URL BODY NAME [TICKET]: the body file (or JSON text), optionally with its ticket replaced
post() {
  local url=$1 body=$2 name=$3 ticket=${4:-} data
  n=$((n + 1)); name="$(printf '%03d' $n)-$name"
  if [[ -f $body ]]; then
    if [[ -n $ticket ]]; then
      node -e 'const f=require("fs");const b=JSON.parse(f.readFileSync(process.argv[1]));b.erasureSeq=Number(process.argv[2]);f.writeFileSync(process.argv[3],JSON.stringify(b))' "$body" "$ticket" "$out/tmp/body.json"
      data=@$out/tmp/body.json
    else data=@$body; fi
  else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  local code; code=$(grep -o '"code":"[^"]*"' "$out/replies/$name.json" 2>/dev/null | head -1 || true)
  step "$name -> $(cat "$out/replies/$name.status") $code"
  last_status=$(cat "$out/replies/$name.status")
}
get() { n=$((n + 1)); local name="$(printf '%03d' $n)-$2"; curl -sS -m 30 -o "$out/replies/$name.json" -w '%{http_code}' "$1" > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"; step "$name -> $(cat "$out/replies/$name.status") $(head -c 160 "$out/replies/$name.json")"; }
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
seq_of() { curl -sS -m 30 "$1/v2/db/$2/erasure-frontier" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).seq)}catch{console.log("x")}})'; }
value() { node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1]))[process.argv[2]])' "$bodies/values.json" "$1"; }
new_db() { # URL NAME: a protected database moved per account
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era3-stack4",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/$(printf '%03d' $n)-create-$2.json")
  echo "$2 $db" >> "$out/dbs"
  post "$1/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' "protection-$2"
  post "$1/v2/db/$db/removal-per-account" '{}' "move-$2"
}
wait_up() { for i in $(seq 1 120); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 1; done; return 1; }
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }

case $scenario in
restore-shift|restore-noshift)
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  va=$(value a1)
  uri=$(docker exec "$prefix-gw-r" sh -c 'printf %s "$DATOMIC_URI_TEMPLATE"' | sed "s/{db}/$D/")
  step "back up the data"
  docker exec "$prefix-gw-r" sh -ceu "cd /opt/datomic 2>/dev/null || true; exec bin/datomic -Xms64m -Xmx256m backup-db '$uri' file:/tmp/era3-backup" > "$out/backup.log" 2>&1
  docker cp "$prefix-gw-r:/tmp/era3-backup" "$out/backup" > /dev/null
  if [[ $scenario == restore-shift ]]; then post "$W/v1/db/$D/transact" "$bodies/save-b1-0.json" "a-save-the-backup-lacks"; fi
  post "$W/v2/db/$D/erase" "$(remove era3-rs-a acct/a/one)" removal-a1
  step "the removal's position in its answer: $(grep -o '"position":[0-9]*' "$out/replies/$(printf '%03d' $n)-removal-a1.json")"
  step "stop the gateways and the transactor; restore the data from the backup"
  for role in gw-w gw-r tx; do docker stop --time 12 "$prefix-$role" > /dev/null; done
  net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$prefix-pg" | awk '{print $1}')
  docker create --name "$prefix-restore" --network "$net" --entrypoint /bin/sh "$pinned" -ceu \
    "cd /opt/datomic; exec bin/datomic -Xms96m -Xmx800m restore-db file:/tmp/era3-backup '$uri'" > /dev/null
  docker cp "$out/backup" "$prefix-restore:/tmp/era3-backup" > /dev/null
  docker start -a "$prefix-restore" > "$out/restore.log" 2>&1; step "restore-db exit $(docker inspect -f '{{.State.ExitCode}}' "$prefix-restore")"
  echo "restore $prefix-restore $(docker inspect --format '{{.Image}}' "$prefix-restore")" >> "$out/images-ran"
  docker rm -f "$prefix-restore" > /dev/null
  docker start "$prefix-tx" > /dev/null; sleep 5; docker start "$prefix-gw-w" "$prefix-gw-r" > /dev/null
  wait_up "$W"; wait_up "$R"; check_images restored
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1-before-the-restore-route
  post "$W/v1/db/$D/transact" "$bodies/save-b1-1.json" save-before-the-restore-route
  post "$W/v2/db/$D/restore-erasure" '{}' restore-route
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1
  step "a1's value answered: $(grep -c "$va" "$out/replies/$(printf '%03d' $n)-read-a1.json" || true)"
  post "$W/v1/db/$D/transact" "$bodies/save-b1-2.json" save-of-another-account
  post "$W/v1/db/$D/transact" "$bodies/save-a2-0.json" save-of-another-subject
  t=$(seq_of "$R" "$D"); step "published sequence: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" frame-no-accounts "$t"
  post "$W/v2/db/$D/erase" "$(remove era3-rs-c acct/c/one)" removal-c1
  post "$W/v2/db/$D/removal-log-rebuild" '{}' rebuild-route
  step "wait 20 s"; sleep 20
  post "$W/v1/db/$D/transact" "$bodies/save-b1-3.json" save-of-another-account-later
  post "$R/v2/db/$D/transactions" '{"after":0,"limit":50}' journal
  step "positions in the journal: $(grep -o '"position":[0-9]*' "$out/replies/$(printf '%03d' $n)-journal.json" | tr '\n' ' ')"
  ;;
ack4)
  new_db "$W" d; D=$db
  for k in $(seq 0 19); do post "$W/v1/db/$D/transact" "$bodies/seed-r$k.json" "seed-r$k"; done
  post "$W/v1/db/$D/transact" "$bodies/seed-c1.json" "seed-c1"
  node "$here/stack4-ack.mjs" "$W" "$R" "$D" "$bodies" "$out" 20 | tee -a "$out/steps.log"
  ;;
*) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
step "done"
