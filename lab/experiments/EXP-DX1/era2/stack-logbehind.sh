#!/usr/bin/env bash
# [DX-ERA2 third pass] N5 on a stack: the PostgreSQL removal log put back to a copy taken before the last removal
# (one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-logbehind -- \
#     bash lab/experiments/EXP-DX1/era2/stack-logbehind.sh NEW_ABSOLUTE_DIR BODIES_DIR logbehind
# Predictions (written 2026-11-24, 21:25 EST, before the first run): with the log one removal behind, after both
# gateways restart, the write gateway's start check reports RemovalLogBehind; a removal, the restore route, a read and
# a derived write that read the removed value answer 503 RemovalLogBehind; nothing changes natively; once the current
# log is back (and the gateways restart), all of them 200 and the removed value is not answered. Shown wrong by any
# 200 while the log is behind, or by the value answered.
# (The helpers below are those of era2/stack-steps.sh; its scenario list does not apply here.)
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
  logbehind|logbehind2|logmissing) ;;
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
  local f1="$out/replies/$(printf '%03d' $n)-$name-subjects.json"
  post "$url/v1/db/$d/read" "{\"entityIds\":$docs}" "$name-old-ticket-documents"
  local f2="$out/replies/$(printf '%03d' $n)-$name-old-ticket-documents.json"
  local leaks=0
  for v in "$@"; do for f in "$f1" "$f2"; do if grep -q "$v" "$f"; then leaks=$((leaks + 1)); fi; done; done
  step "$name: removed values answered by their subjects or by documents of writes with older tickets: $leaks"
  echo "$name $leaks" >> "$out/leaks"
}
va=$(value a1) vb=$(value b1)

case $scenario in
logbehind)
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  step "copy the removal log of this database (PostgreSQL rows)"
  psql_auth -c "CREATE TABLE era2_log_copy AS SELECT * FROM triplex_removal.records WHERE scope='$D'" > /dev/null
  post "$W/v2/db/$D/erase" "$(remove era2-lb-b acct/b/one)" removal-b1
  t_old=0
  step "put the old copy back (the log is one removal behind the data); restart both gateways"
  psql_auth -c "BEGIN; CREATE TABLE era2_log_current AS SELECT * FROM triplex_removal.records WHERE scope='$D'; DELETE FROM triplex_removal.records WHERE scope='$D'; INSERT INTO triplex_removal.records SELECT * FROM era2_log_copy; COMMIT;" > /dev/null
  docker restart "$prefix-gw-w" "$prefix-gw-r" > /dev/null; wait_up "$W"; wait_up "$R"; check_images restarted-behind
  step "start check on the write gateway: $(docker logs "$prefix-gw-w" 2>&1 | grep removal-start-check | tail -1)"
  post "$W/v2/db/$D/erase" "$(remove era2-lb-a acct/a/one)" removal-while-behind
  post "$W/v2/db/$D/restore-erasure" '{}' restore-route-while-behind
  post "$R/v1/db/$D/read" '{"entityIds":["acct/b/one"]}' read-b1-while-behind
  post "$R/v1/db/$D/transact" "$bodies/frame-b-0.json" frame-naming-b-old-ticket "$t_old"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-0.json" frame-no-accounts-old-ticket "$t_old"
  step "put the current log back; restart both gateways"
  psql_auth -c "BEGIN; DELETE FROM triplex_removal.records WHERE scope='$D'; INSERT INTO triplex_removal.records SELECT * FROM era2_log_current; COMMIT;" > /dev/null
  docker restart "$prefix-gw-w" "$prefix-gw-r" > /dev/null; wait_up "$W"; wait_up "$R"; check_images restarted-current
  step "start check lines on the write gateway: $(docker logs --since 1m "$prefix-gw-w" 2>&1 | grep -c removal-start-check || true)"
  t=$(seq_of "$R" "$D"); step "published sequence: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-1.json" frame-naming-b "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" frame-no-accounts "$t"
  post "$W/v2/db/$D/erase" "$(remove era2-lb-a acct/a/one)" removal-a1
  post "$R/v1/db/$D/read" '{"entityIds":["acct/b/one","notice:v1:st2-b-0","notice:v1:st2-any-0"]}' read-after
  step "b1's value answered after: $(grep -c "$vb" "$out/replies/$(printf '%03d' $n)-read-after.json" || true)"
  ;;
logbehind2|logmissing)
  # [DX-ERA2 fourth pass] two removals behind (no pending), or the log deleted; then the rebuild route
  new_db "$W" d; D=$db
  for s in a1 b1 c1; do post "$W/v1/db/$D/transact" "$bodies/seed-$s.json" "seed-$s"; done
  psql_auth -c "CREATE TABLE era2_log_copy AS SELECT * FROM triplex_removal.records WHERE scope='$D'" > /dev/null
  post "$W/v2/db/$D/erase" "$(remove era2-lb-a acct/a/one)" removal-a1
  post "$W/v2/db/$D/erase" "$(remove era2-lb-b acct/b/one)" removal-b1
  if [[ $scenario == logmissing ]]; then
    step "delete this database's removal log (PostgreSQL rows); restart both gateways"
    psql_auth -c "DELETE FROM triplex_removal.records WHERE scope='$D'" > /dev/null
  else
    step "put the copy from before both removals back (two behind); restart both gateways"
    psql_auth -c "BEGIN; DELETE FROM triplex_removal.records WHERE scope='$D'; INSERT INTO triplex_removal.records SELECT * FROM era2_log_copy; COMMIT;" > /dev/null
  fi
  docker restart "$prefix-gw-w" "$prefix-gw-r" > /dev/null; wait_up "$W"; wait_up "$R"; check_images restarted
  step "start check on the write gateway: $(docker logs "$prefix-gw-w" 2>&1 | grep removal-start-check | tail -1 | cut -c1-200)"
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one","acct/b/one"]}' read-while
  step "a1 or b1 answered while: $(grep -c -e "$va" -e "$vb" "$out/replies/$(printf '%03d' $n)-read-while.json" || true)"
  post "$R/v1/db/$D/transact" "$bodies/save-a2-0.json" save-a2-while
  if [[ $scenario == logmissing ]]; then
    # [DX-ERA2 fifth pass, Z2] the policy is the database's: the route takes none (with one: 400)
    post "$W/v2/db/$D/removal-log-rebuild" '{"attributes":[":v"],"sealed":false}' rebuild-with-a-policy
    post "$W/v2/db/$D/removal-log-rebuild" '{}' rebuild
  else
    post "$W/v2/db/$D/removal-log-rebuild" '{}' rebuild
  fi
  t=$(seq_of "$R" "$D"); step "published sequence after the rebuild: $t"
  post "$R/v1/db/$D/transact" "$bodies/frame-b-1.json" frame-naming-b "$t"
  post "$R/v1/db/$D/transact" "$bodies/frame-any-1.json" frame-no-accounts "$t"
  post "$W/v2/db/$D/erase" "$(remove era2-lb-c acct/c/one)" removal-c1
  post "$R/v1/db/$D/read" '{"entityIds":["acct/a/one","acct/b/one"]}' read-after
  step "a1 or b1 answered after: $(grep -c -e "$va" -e "$vb" "$out/replies/$(printf '%03d' $n)-read-after.json" || true)"
  ;;
*) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
step "done"
