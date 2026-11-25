#!/usr/bin/env bash
# [DX-ERA3, second review] Stack scenarios against the fixed removal (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3-stack2 -- \
#     bash lab/experiments/EXP-DX1/era3/stack2.sh NEW_ABSOLUTE_DIR BODIES_DIR SCENARIO
# BODIES_DIR: written by `run.sh OUT subject bodies2` with ERA3_MAIN=2. Every stack runs per account with the subject
# setting (option 2 of era3/stack.sh) and the PostgreSQL removal authority shared by a write and a read gateway; every
# container must run the image the stack pinned by ID. SCENARIO:
#   orphan       the write gateway killed after the removal's declaration, before its intent (its intent's INSERT is
#                held by a SHARE lock on the authority's table, then the gateway and that INSERT are killed)
#   orphan-wait  the removal's own wait set to 1 ms (TX2_REMOVAL_WAIT_MS): its declaration answers 503 and lands
#                afterwards; the client does not resend
#   ack          a second read gateway with a cached Reach session reads the subject in a loop around each of 20
#                removals' acknowledgements (era3/stack2-ack.mjs)
#   upgrade      OLD_REF (6bc2484f0 or 272a1bd66) runs both gateways; a database is moved by it; the gateway source
#                is then replaced in place by this checkout's and the read gateway restarted (a mixed fleet); a second
#                database is moved by the new version; a removal is started on the OLD write gateway in each database
#                and stopped inside its publication; then everything continues on the new version
# Predictions (written 2026-11-24 before the first run of this script):
#   orphan, orphan-wait: no intent pending; the frontier unchanged (seq 0); every frame with no accounts refused 409
#   CasConflict at the commit point, for as long as no removal runs (including after the write gateway restarts and
#   60 s later); a frame naming the removal's account refused 409; a frame naming another account and plain saves 200;
#   after another removal runs (or the same one is resent), frames with no accounts 200. Shown wrong if any frame with
#   no accounts commits while the orphan stands, or if one is still refused after another removal.
#   ack: no read that started after a removal's acknowledgement answers its value, on the second gateway, by a plain
#   read or by the cached Reach session. Shown wrong by any such read.
#   upgrade: database moved by the new version, removal by the old version: frames 503 while it is pending (its intent
#   is visible); resumed on the new version 200; afterwards a frame with no accounts and a fresh ticket refused 409
#   until a removal by the new version runs. Database moved by the old version: frames with no accounts fail at the
#   commit point (no declared sequence); a removal by the new version fails before it records anything until the
#   database is moved back and forward. Shown wrong if the old database's removal by the new version succeeds.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; scenario=${3:?orphan, orphan-wait, ack or upgrade}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera3b-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA3_PORT_WRITE:-19011} port_r=${DX_ERA3_PORT_READ:-19015}
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
if [[ $scenario == upgrade ]]; then [[ -n $old_ref ]] || { echo "upgrade needs OLD_REF" >&2; exit 2; }; place_source "$old_ref"; else place_source ""; fi
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1)
[[ $scenario == orphan-wait ]] && gateway+=(DX_REMOVAL_WAIT_MS=1)
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
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era3-stack2",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/$(printf '%03d' $n)-create-$2.json")
  echo "$2 $db" >> "$out/dbs"
  post "$1/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' "protection-$2"
  post "$1/v2/db/$db/removal-per-account" '{}' "move-$2"
}
wait_up() { for i in $(seq 1 120); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 1; done; return 1; }
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }

case $scenario in
orphan|orphan-wait)
  new_db "$W" d; D=$db
  for s in a1 a2 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  if [[ $scenario == orphan ]]; then
    step "hold the authority's table in SHARE mode: the removal's intent cannot be written"
    psql_auth -c "BEGIN; LOCK TABLE triplex_removal.records IN SHARE MODE; SELECT pg_sleep(120); ROLLBACK;" > "$out/lock.log" 2>&1 &
    lock_pid=$!; bg_pids+=("$lock_pid"); sleep 2
    ( post "$W/v2/db/$D/erase" "$(remove era3-orphan acct/a/one)" removal-1 ) & rm_pid=$!; bg_pids+=("$rm_pid")
    blocked=0
    for i in $(seq 1 100); do
      b=$(psql_auth -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%triplex_removal.records%' AND pid <> pg_backend_pid()")
      [[ $b -ge 1 ]] && { blocked=1; break; }; sleep 0.2
    done
    step "the removal's intent write is blocked: $blocked"
    [[ $blocked == 1 ]] || { echo "the removal never reached its intent" >&2; exit 1; }
    step "kill the write gateway, then the blocked intent write, then the lock"
    docker kill "$prefix-gw-w" > /dev/null; wait "$rm_pid" || true
    psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%triplex_removal.records%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
    psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(120)%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
    wait "$lock_pid" 2>/dev/null || true
  else
    post "$W/v2/db/$D/erase" "$(remove era3-orphan acct/a/one)" removal-1
    step "the client does not resend"; sleep 3
  fi
  step "intents pending: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$D' AND record='pending.json'")"
  get "$R/v2/db/$D/erasure-frontier" frontier
  t=$(seq_of "$R" "$D")
  for k in 0 1 2; do post "$R/v1/db/$D/transact" "$bodies/frame-any-$k.json" "frame-no-accounts-$k" "$t"; sleep 5; done
  post "$R/v1/db/$D/transact" "$bodies/frame-a-0.json" frame-naming-a "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-0.json" frame-naming-b "$t"
  post "$R/v1/db/$D/transact" "$bodies/save-b1-0.json" save-b1
  post "$R/v1/db/$D/transact" "$bodies/save-a2-0.json" save-a2
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1
  if [[ $scenario == orphan ]]; then step "start the write gateway again"; docker start "$prefix-gw-w" > /dev/null; wait_up "$W"; check_images restarted
  else step "restart the write gateway"; docker restart "$prefix-gw-w" > /dev/null; wait_up "$W"; check_images restarted; fi
  post "$W/v1/db/$D/transact" "$bodies/frame-any-3.json" frame-no-accounts-after-gateway-restart "$t"
  step "wait 60 s"; sleep 60
  post "$W/v1/db/$D/transact" "$bodies/frame-any-4.json" frame-no-accounts-60s-later "$t"
  post "$W/v2/db/$D/erase" "$(remove era3-other acct/c/one)" another-removal
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-5.json" frame-no-accounts-after-another-removal "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-1.json" frame-naming-a-after-another-removal "$t"
  ;;
ack)
  new_db "$W" d; D=$db
  for k in $(seq 0 19); do post "$W/v1/db/$D/transact" "$bodies/seed-r$k.json" "seed-r$k"; done
  node "$here/stack2-ack.mjs" "$W" "$R" "$D" "$bodies" "$out" 20 | tee -a "$out/steps.log"
  ;;
upgrade)
  new_db "$W" old; D1=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D1/transact" "$bodies/seed-$s.json" "seed-old-$s"; done
  post "$W/v2/db/$D1/erase" "$(remove era3-up-c1 acct/c/one)" "old-version-removal-c1"
  step "replace the mounted gateway source by this checkout's; restart the read gateway only (the write gateway keeps the old version loaded)"
  place_source ""
  docker restart "$prefix-gw-r" > /dev/null; wait_up "$R"; check_images upgraded-read
  new_db "$R" new; D2=$db
  for s in a1 b1; do post "$R/v1/db/$D2/transact" "$bodies/seed-$s.json" "seed-new-$s"; done
  step "hold both databases' authority heads; start a removal of a1 in each on the OLD write gateway"
  for D in "$D1" "$D2"; do
    psql_auth -c "BEGIN; SELECT 1 FROM triplex_removal.records WHERE scope='$D' AND record='head.json' FOR UPDATE; SELECT pg_sleep(120); ROLLBACK;" >> "$out/lock.log" 2>&1 &
    bg_pids+=("$!")
  done
  sleep 2
  ( post "$W/v2/db/$D1/erase" "$(remove era3-up-a1 acct/a/one)" old-removal-db-old ) & p1=$!; bg_pids+=("$p1")
  ( post "$W/v2/db/$D2/erase" "$(remove era3-up-a1 acct/a/one)" old-removal-db-new ) & p2=$!; bg_pids+=("$p2")
  sleep 4
  for D in "$D1" "$D2"; do step "pending in $D: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$D' AND record='pending.json'")"; done
  kill -0 "$p1" 2>/dev/null && kill -0 "$p2" 2>/dev/null && step "both removals blocked in their publication"
  docker kill "$prefix-gw-w" > /dev/null; wait "$p1" || true; wait "$p2" || true
  psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(120)%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
  sleep 2
  step "--- the database moved by the NEW version, removal by the OLD one, now on the new version"
  t=$(seq_of "$R" "$D2")
  post "$R/v1/db/$D2/transact" "$bodies/frame-any-0.json" new-db-frame-no-accounts-while-pending "$t"
  post "$R/v1/db/$D2/transact" "$bodies/frame-b-0.json" new-db-frame-naming-b-while-pending "$t"
  post "$R/v2/db/$D2/erase" "$(remove era3-up-a1 acct/a/one)" new-db-old-removal-resumed-on-new
  t=$(seq_of "$R" "$D2")
  post "$R/v1/db/$D2/transact" "$bodies/frame-any-1.json" new-db-frame-no-accounts-fresh-ticket "$t"
  post "$R/v1/db/$D2/transact" "$bodies/frame-any-2.json" new-db-frame-no-accounts-fresh-ticket-again "$t"
  post "$R/v2/db/$D2/erase" "$(remove era3-up-b1 acct/b/one)" new-db-removal-by-new-version
  t=$(seq_of "$R" "$D2")
  post "$R/v1/db/$D2/transact" "$bodies/frame-any-3.json" new-db-frame-no-accounts-after-new-removal "$t"
  post "$R/v1/db/$D2/read" '{"entityIds":["acct/a/one"]}' new-db-read-a1
  step "--- the database moved by the OLD version, now on the new version (write gateway started on the new source)"
  docker start "$prefix-gw-w" > /dev/null; wait_up "$W"; check_images upgraded-write
  t=$(seq_of "$W" "$D1")
  post "$W/v1/db/$D1/transact" "$bodies/frame-any-4.json" old-db-frame-no-accounts-while-pending "$t"
  post "$W/v1/db/$D1/transact" "$bodies/save-b1-0.json" old-db-save-b1
  post "$W/v1/db/$D1/read" '{"entityIds":["acct/a/one"]}' old-db-read-a1-while-pending
  post "$W/v2/db/$D1/erase" "$(remove era3-up-a1 acct/a/one)" old-db-old-removal-resumed-on-new
  t=$(seq_of "$W" "$D1")
  post "$W/v1/db/$D1/transact" "$bodies/frame-any-5.json" old-db-frame-no-accounts-fresh-ticket "$t"
  post "$W/v1/db/$D1/transact" "$bodies/frame-b-1.json" old-db-frame-naming-b "$t"
  post "$W/v2/db/$D1/erase" "$(remove era3-up-b1 acct/b/one)" old-db-removal-by-new-version
  post "$W/v2/db/$D1/erase" "$(remove era3-up-b1 acct/b/one)" old-db-removal-by-new-version-resent
  post "$W/v2/db/$D1/removal-per-account" '{"back":true}' old-db-move-back
  post "$W/v2/db/$D1/removal-per-account" '{}' old-db-move-forward
  post "$W/v2/db/$D1/erase" "$(remove era3-up-b1 acct/b/one)" old-db-removal-after-the-moves
  t=$(seq_of "$W" "$D1")
  post "$W/v1/db/$D1/transact" "$bodies/frame-any-6.json" old-db-frame-no-accounts-after-the-moves "$t"
  post "$W/v1/db/$D1/read" '{"entityIds":["acct/a/one","acct/b/one","acct/c/one"]}' old-db-read-after
  ;;
*) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
step "done"
