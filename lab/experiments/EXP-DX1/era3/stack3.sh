#!/usr/bin/env bash
# [DX-ERA3, third review] Stack scenarios against the reordered removal (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3-stack3 -- \
#     bash lab/experiments/EXP-DX1/era3/stack3.sh NEW_ABSOLUTE_DIR BODIES_DIR SCENARIO
# BODIES_DIR: written by `run.sh OUT subject bodies2` with ERA3_MAIN=2. Per account with the subject setting, the
# PostgreSQL removal authority shared by a write and a read gateway; every container must run the image the stack
# pinned by ID. SCENARIO:
#   logpending  the write gateway's removal of a1 pauses after its declaration (TX2_REMOVAL_TEST_PAUSE_AT=declared);
#               this database's removal log (PostgreSQL rows) is copied, with that removal pending in it; the write
#               gateway is killed; a frame on the read gateway completes the removal (published, acknowledged to the
#               resend); then the copy is put back (the log one removal behind the data, the removal pending in it)
#               and the read gateway restarted; reads of a1 on the read gateway, a save of another account, then a frame
#   ack3        era3/stack3-ack.mjs: 20 removals on the write gateway; on the read gateway, in a loop around each
#               acknowledgement, a current read, a pinned read and a cached Reach session of the subject, a read of a
#               subject of another account and a plain save of another account, every reply's status and code tallied
# Predictions (written 2026-11-24 22:33 EST, before the first run of this script):
#   logpending: after the copy is put back no typed refusal (the log's pending removal accounts for the committed one);
#   a read of a1 answers its removed value (unsealed) until the first frame naming no account, which is refused 503
#   and completes the removal again; after that a1 is not answered. Shown wrong if a1's value is not answered after
#   the restore, or if any request is refused RemovalLogBehind.
#   ack3: 0 reads that started after an acknowledgement answer the value; every read and save of the other account
#   200 throughout (no RemovalLogBehind or RemovalDataBehind, no 503). Shown wrong by any such refusal or value.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; scenario=${3:?logpending or ack3}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera3c-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA3_PORT_WRITE:-19041} port_r=${DX_ERA3_PORT_READ:-19045}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
bg_pids=()
cleanup() {
  for p in ${bg_pids[@]+"${bg_pids[@]}"}; do kill "$p" 2>/dev/null || true; done
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gw" "$out/gwtmp"
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
place_source ""
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1)
[[ $scenario == logpending ]] && gateway+=(DX_REMOVAL_TEST_PAUSE_AT=declared)
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
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era3-stack3",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/$(printf '%03d' $n)-create-$2.json")
  echo "$2 $db" >> "$out/dbs"
  post "$1/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' "protection-$2"
  post "$1/v2/db/$db/removal-per-account" '{}' "move-$2"
}
wait_up() { for i in $(seq 1 120); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 1; done; return 1; }
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }

case $scenario in
logpending)
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  va=$(value a1)
  step "removal of a1 on the write gateway, paused after its declaration"
  curl -sS -m 600 -o "$out/replies/paused-removal.json" -H 'Content-Type: application/json' -X POST "$W/v2/db/$D/erase" \
    --data-binary '{"commandId":"era3-lp-a1","selectors":[{"entityId":"acct/a/one","attribute":":v"}]}' > /dev/null 2>&1 &
  bg_pids+=($!)
  for i in $(seq 1 300); do docker logs "$prefix-gw-w" 2>&1 | grep -q "TRIPLEX_REMOVAL_PAUSED declared" && break; sleep 0.2; done
  step "paused: $(docker logs "$prefix-gw-w" 2>&1 | grep -c 'TRIPLEX_REMOVAL_PAUSED declared'); pending rows: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$D' AND record='pending.json'")"
  psql_auth -c "CREATE TABLE era3_log_copy AS SELECT * FROM triplex_removal.records WHERE scope='$D'" > /dev/null
  step "copied the removal log with the removal pending in it; kill the write gateway"
  docker kill "$prefix-gw-w" > /dev/null
  t=$(seq_of "$R" "$D"); step "published sequence: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" frame-no-accounts-completes "$t"
  t=$(seq_of "$R" "$D"); step "published sequence after the completion: $t"
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1-after-completion
  step "a1's value answered after the completion: $(grep -c "$va" "$out/replies/$(printf '%03d' $n)-read-a1-after-completion.json" || true)"
  step "put the copy back (the removal pending in it, one behind the data); restart the read gateway"
  psql_auth -c "BEGIN; DELETE FROM triplex_removal.records WHERE scope='$D'; INSERT INTO triplex_removal.records SELECT * FROM era3_log_copy; COMMIT;" > /dev/null
  docker restart "$prefix-gw-r" > /dev/null; wait_up "$R"; check_images restarted-read
  step "start check on the read gateway: $(docker logs --since 2m "$prefix-gw-r" 2>&1 | grep -c removal-start-check || true) lines"
  t=$(seq_of "$R" "$D"); step "published sequence seen: $t; pending rows: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$D' AND record='pending.json'")"
  for k in 1 2 3; do
    post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' "read-a1-after-the-log-is-put-back-$k"
    step "a1's value answered: $(grep -c "$va" "$out/replies/$(printf '%03d' $n)-read-a1-after-the-log-is-put-back-$k.json" || true)"
    sleep 2
  done
  post "$R/v1/db/$D/transact" "$bodies/save-b1-0.json" save-of-another-account
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" frame-no-accounts "$t"
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1-after-the-frame
  step "a1's value answered after the frame: $(grep -c "$va" "$out/replies/$(printf '%03d' $n)-read-a1-after-the-frame.json" || true)"
  ;;
ack3)
  new_db "$W" d; D=$db
  for k in $(seq 0 19); do post "$W/v1/db/$D/transact" "$bodies/seed-r$k.json" "seed-r$k"; done
  post "$W/v1/db/$D/transact" "$bodies/seed-c1.json" "seed-c1"
  node "$here/stack3-ack.mjs" "$W" "$R" "$D" "$bodies" "$out" 20 | tee -a "$out/steps.log"
  ;;
*) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
step "done"
