#!/usr/bin/env bash
# [DX-ERA2 third pass] Stack runs for the second review's findings (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-steps -- \
#     bash lab/experiments/EXP-DX1/era2/stack-steps.sh NEW_ABSOLUTE_DIR BODIES_DIR SCENARIO
# BODIES_DIR: written by `ERA3_MAIN=2 era3/run.sh OUT subject bodies2`. Per account, PostgreSQL removal authority shared
# by a write and a read gateway, every container on the image the stack pinned by ID. SCENARIO:
#   step-intent, step-declared, step-committed, step-prepared, step-published
#                the write gateway's removal pauses at that step (TX2_REMOVAL_TEST_PAUSE_AT) and the gateway is killed
#                there; nobody resends; everything else goes to the read gateway
#   wait         the write gateway's removal waits 1 ms for each native step (503, the step lands later); no resend
#   lockloss-intent, lockloss-declared
#                the write gateway's removal pauses 20 s at that step and its PostgreSQL sessions are killed (its lock
#                is lost); meanwhile the read gateway runs another removal; then the paused removal goes on
#   restore      a backup of the data taken while a removal is declared (paused 12 s); the removal completes; the data
#                is restored from that backup (transactor and gateways stopped); then the restore route
#   mixed        OLD_REF on the read gateway, this version on the write gateway, one database: removals and derived
#                writes of each version in both orders, a removal of each version pending while the other writes
# Predictions (written 2026-11-24, 20:50 EST, before the first run):
#   step-*: after the kill the removal is pending (published only for step-published); a frame naming another account
#   and a plain save of another account 200; the first frame naming no account 503, after which the removal is
#   published (sequence 1) by the read gateway; the next frame naming no account and one naming the removed account
#   200; the resend 200 with sequence 1; a1 never answers its value; no derived copy. Shown wrong by any frame
#   naming no account refused after the completion, a 409 CasConflict for a fresh ticket, or the value readable.
#   wait: the same after the 503 (the read gateway's waits are 5 s).
#   lockloss-*: the read gateway's removal completes the paused one first (sequence 1) and then its own (sequence 2);
#   the paused removal, going on without its lock, writes nothing (its next authority write fails, or its declaration
#   or commit is refused at the serial point); its resend answers sequence 1; both values gone, frames 200.
#   restore: after the data restore every request answers 503 RemovalDataBehind (a1's value not answered); the restore
#   route 200; then a1 and b1 marked, frames 200, a removal 200 with the next sequence.
#   mixed: this version's frames 200 after an earlier version's removal (N3); an earlier version's pending removal is
#   completed by this version's first refused frame; earlier-version frames during this version's declared removal
#   are recorded (the upgrade order forbids that window: no check of theirs sees a declaration).
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; scenario=${3:?scenario}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp" "$out/gw" "$out/gwtmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera2s-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA2_PORT_WRITE:-19031} port_r=${DX_ERA2_PORT_READ:-19035}
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
place_source() { # REF ("" for this checkout's HEAD)
  rm -rf "$out/gw"/* "$out/gwtmp"/*
  git archive "${1:-HEAD}" packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
  cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
  cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
  echo "${1:-$(git rev-parse HEAD)}" >> "$out/sources-placed"
}
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
case $scenario in
  step-*) gateway+=(DX_REMOVAL_TEST_PAUSE_AT=${scenario#step-}) ;;
  wait) gateway+=(DX_REMOVAL_WAIT_MS_WRITE=1) ;;
  lockloss-*) gateway+=(DX_REMOVAL_TEST_PAUSE_AT=${scenario#lockloss-} DX_REMOVAL_TEST_PAUSE_MS=20000) ;;
  restore) gateway+=(DX_REMOVAL_TEST_PAUSE_AT=declared DX_REMOVAL_TEST_PAUSE_MS=12000) ;;
  mixed) [[ -n ${OLD_REF:-} ]] || { echo "mixed needs OLD_REF" >&2; exit 2; }; gateway+=(DX_REMOVAL_TEST_PAUSE_AT=declared DX_REMOVAL_TEST_PAUSE_MS=15000) ;;
  *) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
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
post() { # URL BODY NAME [TICKET]
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
  local seqf; seqf=$(grep -o '"seq":[0-9-]*' "$out/replies/$name.json" 2>/dev/null | head -1 || true)
  step "$name -> $(cat "$out/replies/$name.status") $code $seqf"
}
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
seq_of() { curl -sS -m 30 "$1/v2/db/$2/erasure-frontier" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).seq)}catch{console.log("x")}})'; }
pending_of() { psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$1' AND record='pending.json'"; }
value() { node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1]))[process.argv[2]])' "$bodies/values.json" "$1"; }
new_db() { # URL NAME
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era2-steps",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/$(printf '%03d' $n)-create-$2.json")
  echo "$2 $db" >> "$out/dbs"
  post "$1/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' "protection-$2"
  post "$1/v2/db/$db/removal-per-account" '{}' "move-$2"
}
wait_up() { for i in $(seq 1 120); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 1; done; return 1; }
wait_log() { # CONTAINER TEXT: until the container's log has TEXT (60 s)
  for i in $(seq 1 300); do docker logs "$1" 2>&1 | grep -q "$2" && return 0; sleep 0.2; done; return 1
}
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }
# a removed value must not be answered by its subject, nor by the document of a derived write whose ticket predates
# the removal (DOCS: a JSON list of such documents; later frames copy the value again under a fresh ticket, as new data)
leak_check() { # URL DB NAME DOCS VALUE...
  local url=$1 d=$2 name=$3 docs=$4; shift 4
  post "$url/v1/db/$d/read" "{\"entityIds\":[\"acct/a/one\",\"acct/b/one\"]}" "$name-subjects"
  local f1="$out/replies/$(printf '%03d' $n)-$name-subjects.json" f2=/dev/null
  if [[ $docs != '[]' ]]; then
    post "$url/v1/db/$d/read" "{\"entityIds\":$docs}" "$name-old-ticket-documents"
    f2="$out/replies/$(printf '%03d' $n)-$name-old-ticket-documents.json"
  fi
  local leaks=0
  for v in "$@"; do for f in "$f1" "$f2"; do if grep -q "$v" "$f"; then leaks=$((leaks + 1)); fi; done; done
  step "$name: removed values answered by their subjects or by documents of writes with older tickets: $leaks"
  echo "$name $leaks" >> "$out/leaks"
}
va=$(value a1) vb=$(value b1)

case $scenario in
step-*|wait)
  stop=${scenario#step-}
  new_db "$W" d; D=$db
  for s in a1 a2 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  if [[ $scenario == wait ]]; then
    post "$W/v2/db/$D/erase" "$(remove era2-steps acct/a/one)" removal-on-write-gateway
    step "the client does not resend"; sleep 3
  else
    ( post "$W/v2/db/$D/erase" "$(remove era2-steps acct/a/one)" removal-on-write-gateway ) & rm_pid=$!; bg_pids+=("$rm_pid")
    wait_log "$prefix-gw-w" "TRIPLEX_REMOVAL_PAUSED $stop" && step "the write gateway paused at $stop" || { echo "never paused at $stop" >&2; exit 1; }
    step "kill the write gateway at $stop"; docker kill "$prefix-gw-w" > /dev/null; wait "$rm_pid" || true
  fi
  step "intents pending: $(pending_of "$D")"
  t=$(seq_of "$R" "$D"); step "published sequence on the read gateway: $t"
  # [DX-ERA2 fourth pass, M1] on the log's boundary a read that finds the removal committed publishes it first, so the
  # ticket the first frame naming no account carries is then already after the removal: its copy of the value is a
  # new write after the removal, not a write with an older ticket
  old_docs='["notice:v1:st2-any-0"]'; [[ $t -ge 1 ]] && { old_docs='[]'; step "the first frames carry a ticket after the removal ($t)"; }
  post "$R/v1/db/$D/transact" "$bodies/frame-b-0.json" frame-naming-b "$t"
  post "$R/v1/db/$D/transact" "$bodies/save-b1-0.json" save-b1
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" first-frame-no-accounts "$t"
  step "intents pending after it: $(pending_of "$D")"
  t=$(seq_of "$R" "$D"); step "published sequence after it: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" next-frame-no-accounts "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-0.json" frame-naming-a "$t"
  post "$R/v2/db/$D/erase" "$(remove era2-steps acct/a/one)" removal-resent-on-read-gateway
  post "$R/v2/db/$D/erase" "$(remove era2-other acct/c/one)" another-removal
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-2.json" frame-no-accounts-after-another-removal "$t"
  leak_check "$R" "$D" after "$old_docs" "$va"
  if [[ $scenario == wait ]]; then docker restart "$prefix-gw-w" > /dev/null; else docker start "$prefix-gw-w" > /dev/null; fi
  wait_up "$W"; check_images restarted
  t=$(seq_of "$W" "$D")
  post "$W/v1/db/$D/transact" "$bodies/frame-any-3.json" write-gateway-restarted-frame-no-accounts "$t"
  step "start check lines on the restarted write gateway: $(docker logs "$prefix-gw-w" 2>&1 | grep -c removal-start-check || true)"
  ;;
lockloss-*)
  stop=${scenario#lockloss-}
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  ( post "$W/v2/db/$D/erase" "$(remove era2-lock-a acct/a/one)" paused-removal-a1 ) & rm_pid=$!; bg_pids+=("$rm_pid")
  wait_log "$prefix-gw-w" "TRIPLEX_REMOVAL_PAUSED $stop" && step "the write gateway paused at $stop" || { echo "never paused" >&2; exit 1; }
  step "advisory locks held: $(psql_auth -c "SELECT count(*) FROM pg_locks WHERE locktype='advisory'")"
  step "kill the write gateway's PostgreSQL sessions (its lock is lost): $(psql_auth -c "SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE datname='removal_authority' AND pid <> pg_backend_pid() AND client_addr = (SELECT client_addr FROM pg_stat_activity WHERE pid IN (SELECT pid FROM pg_locks WHERE locktype='advisory') LIMIT 1)")"
  step "advisory locks held after: $(psql_auth -c "SELECT count(*) FROM pg_locks WHERE locktype='advisory'")"
  post "$R/v2/db/$D/erase" "$(remove era2-lock-b acct/b/one)" removal-b1-on-read-gateway
  t=$(seq_of "$R" "$D"); step "published sequence: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" frame-no-accounts "$t"
  step "wait for the paused removal to go on without its lock"; wait "$rm_pid" || true
  sleep 2
  step "intents pending: $(pending_of "$D")"; t=$(seq_of "$R" "$D"); step "published sequence: $t"
  post "$R/v2/db/$D/erase" "$(remove era2-lock-a acct/a/one)" paused-removal-resent
  post "$R/v2/db/$D/erase" "$(remove era2-lock-b acct/b/one)" removal-b1-resent
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" frame-no-accounts-after "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-0.json" frame-naming-a-after "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-0.json" frame-naming-b-after "$t"
  leak_check "$R" "$D" after '[]' "$va" "$vb"
  ;;
restore)
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  uri=$(docker exec "$prefix-gw-r" sh -c 'printf %s "$DATOMIC_URI_TEMPLATE"' | sed "s/{db}/$D/")
  ( post "$W/v2/db/$D/erase" "$(remove era2-rs-b acct/b/one)" removal-b1 ) & rm_pid=$!; bg_pids+=("$rm_pid")
  wait_log "$prefix-gw-w" "TRIPLEX_REMOVAL_PAUSED declared" && step "removal of b1 declared (paused)" || { echo "never paused" >&2; exit 1; }
  step "back up the data while the removal is declared"
  docker exec "$prefix-gw-r" sh -ceu "cd /opt/datomic 2>/dev/null || true; exec bin/datomic -Xms64m -Xmx256m backup-db '$uri' file:/tmp/era2-backup" > "$out/backup.log" 2>&1
  docker cp "$prefix-gw-r:/tmp/era2-backup" "$out/backup" > /dev/null
  wait "$rm_pid" || true
  post "$W/v2/db/$D/erase" "$(remove era2-rs-a acct/a/one)" removal-a1
  t=$(seq_of "$W" "$D"); step "published sequence before the data restore: $t"
  step "stop the gateways and the transactor; restore the data from the backup"
  for role in gw-w gw-r tx; do docker stop --time 12 "$prefix-$role" > /dev/null; done
  net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$prefix-pg" | awk '{print $1}')
  docker create --name "$prefix-restore" --network "$net" --entrypoint /bin/sh "$pinned" -ceu \
    "cd /opt/datomic; exec bin/datomic -Xms96m -Xmx800m restore-db file:/tmp/era2-backup '$uri'" > /dev/null
  docker cp "$out/backup" "$prefix-restore:/tmp/era2-backup" > /dev/null
  docker start -a "$prefix-restore" > "$out/restore.log" 2>&1; step "restore-db exit $(docker inspect -f '{{.State.ExitCode}}' "$prefix-restore")"
  echo "restore $prefix-restore $(docker inspect --format '{{.Image}}' "$prefix-restore")" >> "$out/images-ran"
  docker rm -f "$prefix-restore" > /dev/null
  docker start "$prefix-tx" > /dev/null; sleep 5; docker start "$prefix-gw-w" "$prefix-gw-r" > /dev/null
  wait_up "$W"; wait_up "$R"; check_images restored
  step "start check on the write gateway: $(docker logs "$prefix-gw-w" 2>&1 | grep removal-start-check | tail -1)"
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one"]}' read-a1-data-behind
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" frame-no-accounts-data-behind "$t"
  post "$R/v2/db/$D/erase" "$(remove era2-rs-c acct/c/one)" removal-data-behind
  post "$W/v2/db/$D/restore-erasure" '{}' restore-route
  t=$(seq_of "$R" "$D"); step "published sequence after the restore route: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" frame-no-accounts-after "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-0.json" frame-naming-a-after "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-0.json" frame-naming-b-after "$t"
  post "$R/v2/db/$D/erase" "$(remove era2-rs-c acct/c/one)" removal-after
  leak_check "$R" "$D" after '["notice:v1:st2-any-0"]' "$va" "$vb"
  ;;
mixed)
  new_db "$W" d; D=$db
  for s in a1 a2 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  for k in $(seq 0 3); do post "$W/v1/db/$D/transact" "$bodies/seed-r$k.json" "seed-r$k"; done
  step "the read gateway runs $OLD_REF (a mixed fleet); the write gateway this version"
  place_source "$OLD_REF"; docker restart "$prefix-gw-r" > /dev/null; wait_up "$R"; check_images mixed
  step "--- 1. an earlier version's removal, then this version's derived writes"
  post "$R/v2/db/$D/erase" "$(remove era2-mx-old1 acct/r/s0)" old-removal
  t=$(seq_of "$W" "$D")
  post "$W/v1/db/$D/transact" "$bodies/frame-any-0.json" new-frame-no-accounts "$t"
  post "$W/v1/db/$D/transact" "$bodies/frame-a-0.json" new-frame-naming-a "$t"
  step "--- 2. this version's removal, then an earlier version's derived writes"
  post "$W/v2/db/$D/erase" "$(remove era2-mx-new1 acct/r/s1)" new-removal
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" old-frame-no-accounts "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-1.json" old-frame-naming-a "$t"
  step "--- 3. this version's removal declared (paused 15 s) while the earlier version takes derived writes"
  t=$(seq_of "$R" "$D")
  ( post "$W/v2/db/$D/erase" "$(remove era2-mx-new2 acct/a/one)" new-removal-a1 ) & rm_pid=$!; bg_pids+=("$rm_pid")
  wait_log "$prefix-gw-w" "TRIPLEX_REMOVAL_PAUSED declared" || true; step "this version's removal of a1 is declared"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-2.json" old-frame-no-accounts-during-declared "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-a-2.json" old-frame-naming-a-during-declared "$t"
  post "$R/v1/db/$D/transact" "$bodies/save-b1-0.json" old-save-b1-during-declared
  wait "$rm_pid" || true
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-3.json" old-frame-no-accounts-after "$t"
  step "--- 4. an earlier version's removal stopped inside its publication; this version writes"
  psql_auth -c "BEGIN; SELECT 1 FROM triplex_removal.records WHERE scope='$D' AND record='head.json' FOR UPDATE; SELECT pg_sleep(120); ROLLBACK;" >> "$out/lock.log" 2>&1 &
  bg_pids+=("$!"); sleep 2
  t=$(seq_of "$W" "$D")
  ( post "$R/v2/db/$D/erase" "$(remove era2-mx-old2 acct/b/one)" old-removal-b1 ) & p1=$!; bg_pids+=("$p1")
  sleep 5; step "kill the earlier version's gateway inside its publication"; docker kill "$prefix-gw-r" > /dev/null; wait "$p1" || true
  psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(120)%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
  sleep 2; step "intents pending: $(pending_of "$D")"
  post "$W/v1/db/$D/transact" "$bodies/frame-b-1.json" new-frame-naming-b-while-old-pending "$t"
  post "$W/v1/db/$D/transact" "$bodies/frame-any-4.json" new-frame-no-accounts-while-old-pending "$t"
  step "intents pending after it: $(pending_of "$D")"
  t=$(seq_of "$W" "$D"); step "published sequence: $t"
  post "$W/v1/db/$D/transact" "$bodies/frame-any-5.json" new-frame-no-accounts-after "$t"
  post "$W/v1/db/$D/transact" "$bodies/frame-b-2.json" new-frame-naming-b-after "$t"
  step "--- 5. the earlier version's gateway back: its resend, and its derived writes"
  docker start "$prefix-gw-r" > /dev/null; wait_up "$R"; check_images old-back
  post "$R/v2/db/$D/erase" "$(remove era2-mx-old2 acct/b/one)" old-removal-b1-resent
  t=$(seq_of "$R" "$D")
  post "$R/v1/db/$D/transact" "$bodies/frame-any-6.json" old-frame-no-accounts-end "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-3.json" old-frame-naming-b-end "$t"
  t=$(seq_of "$W" "$D")
  post "$W/v1/db/$D/transact" "$bodies/frame-any-7.json" new-frame-no-accounts-end "$t"
  leak_check "$W" "$D" end '["notice:v1:st2-any-4"]' "$va" "$vb"
  # the window the upgrade order forbids: an earlier version's derived writes while this version's removal is declared
  post "$W/v1/db/$D/read" '{"entityIds":["notice:v1:st2-any-2","notice:v1:st2-a-2"]}' mixed-window-documents
  step "copies of a1 from the earlier version's writes during the declared removal: $(grep -c "$va" "$out/replies/$(printf '%03d' $n)-mixed-window-documents.json" || true)"
  ;;
esac
step "done"
