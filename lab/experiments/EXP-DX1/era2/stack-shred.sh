#!/usr/bin/env bash
# [DX-ERA2 fifth pass] The derived-copies review's era5/stack-shred.sh (at a8213bc33, B2), adapted to this branch: the
# derived-copy steps are dropped (TX2_DERIVED_SEAL is the derived-copies branch's code), the key-row checks kept.
# On a stack (transactor, PostgreSQL, a write and a read gateway, every container on the image the stack pins by ID; the
# PostgreSQL removal authority shared by both gateways, per account, subject check, a SEALED database, shred grace
# 15 s): does a removal left pending in one account stop the deletion of another account's published removal's key
# row? DX_REMOVAL_COMMIT_BOUNDARY=1 runs it on the commit boundary; ERA2_SHRED_WORKER_MS=N gives the read gateway
# TX2_REMOVAL_WORKER_COMPLETE_MS=N (it then completes c1's removal without a resend). One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-shred -- \
#     bash lab/experiments/EXP-DX1/era2/stack-shred.sh NEW_ABSOLUTE_DIR BODIES_DIR
# BODIES_DIR: written by `ERA3_MAIN=2 era3/run.sh OUT subject bodies2` (OUT/run.out/bodies).
# Database D1 (control): a1 (account a) removed on the read gateway; nothing else. Database D2: a1 removed on the read
# gateway, then c1 (account c) removed on the write gateway, which pauses after the intent and is killed there.
# Predictions of this adaptation (written 2026-11-25 02:55 EST, after the fix 2d05e00c0): D2: a1's key row is gone within
# the grace plus a few seconds although c1's removal is still pending; with the worker, c1's removal is completed by the
# read gateway about N ms after its intent and c1's key row is gone a grace later. The reviewer's predictions: D1: a1's key row is gone within the grace plus a few
# seconds. D2: while c1's removal stays pending, a1's key row is still in triplex_removal.keys 25 s after a1's
# publication (grace 15 s); a plain save of account b, a read of c1 and opening a1's derived copy on the read gateway do
# not complete c1's removal; a1's copy opens as removed through the route; c1's removal resent on the read gateway
# answers 200, and then a1's key row is gone within a few seconds. Shown wrong if a1's key row is gone in D2 while c1's
# removal is still pending.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp" "$out/gw" "$out/gwtmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera2h-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA2_PORT_WRITE:-19061} port_r=${DX_ERA2_PORT_READ:-19065}
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
git archive HEAD packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 DX_REMOVAL_SUBJECT_CHECK=1
  DX_ERASURE_SHRED_GRACE_MS=15000 DX_REMOVAL_TEST_PAUSE_AT=intent)
[[ -n ${ERA2_SHRED_WORKER_MS:-} ]] && gateway+=("DX_GATEWAY_ENV_READ=TX2_REMOVAL_WORKER_COMPLETE_MS=$ERA2_SHRED_WORKER_MS")
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
W=http://127.0.0.1:$port_w R=http://127.0.0.1:$port_r
step() { echo "$(date +%H:%M:%S) $*" | tee -a "$out/steps.log" >&2; }
n=0
post() { # URL BODY NAME
  local url=$1 body=$2 name=$3 data
  n=$((n + 1)); name="$(printf '%03d' $n)-$name"
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  local code; code=$(grep -o '"code":"[^"]*"' "$out/replies/$name.json" 2>/dev/null | head -1 || true)
  step "$name -> $(cat "$out/replies/$name.status") $code"
  last="$out/replies/$name.json"
}
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
pending_of() { psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$1' AND record='pending.json'"; }
handle_of() { # DB SEQ: the key handle of the first identity of that removal, from the published log
  psql_auth -c "SELECT payload FROM triplex_removal.records WHERE scope='$1' AND record='erase-$2.json'" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s);console.log(e.identities[0].keyHandle)})'
}
key_rows() { psql_auth -c "SELECT count(*) FROM triplex_removal.keys WHERE scope='$1' AND id='$2'"; }
value() { node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1]))[process.argv[2]])' "$bodies/values.json" "$1"; }
new_db() { # NAME
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era2-shred",require("crypto").randomUUID(),0])))')
  post "$W/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$1"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$last")
  echo "$1 $db" >> "$out/dbs"
  post "$W/v2/db/$db/protection" '{"attributes":[":v"],"sealed":true}' "protection-$1"
  post "$W/v2/db/$db/removal-per-account" '{}' "move-$1"
}
wait_log() { for i in $(seq 1 300); do docker logs "$1" 2>&1 | grep -q "$2" && return 0; sleep 0.2; done; return 1; }
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }
va=$(value a1)
wait_gone() { # DB HANDLE SECONDS: seconds until the key row is gone, or "kept"
  for i in $(seq 1 "$3"); do [[ $(key_rows "$1" "$2") == 0 ]] && { echo "$i"; return 0; }; sleep 1; done; echo kept
}

step "D1 (control): a1 removed; nothing pending"
new_db d1; D1=$db
for s in a1 b1 c1; do post "$W/v1/db/$D1/transact" "$bodies/seed-$s.json" "d1-seed-$s"; done
post "$R/v2/db/$D1/erase" "$(remove era5-d1-a acct/a/one)" d1-removal-a1
h1=$(handle_of "$D1" 1); step "D1 a1 key row before the grace: $(key_rows "$D1" "$h1")"
step "D1 a1 key row gone after (s): $(wait_gone "$D1" "$h1" 40)"

step "D2: a1 removed, then c1's removal left pending on the write gateway (killed after its intent)"
new_db d2; D2=$db
for s in a1 b1 c1; do post "$W/v1/db/$D2/transact" "$bodies/seed-$s.json" "d2-seed-$s"; done
post "$R/v2/db/$D2/erase" "$(remove era5-d2-a acct/a/one)" d2-removal-a1
t0=$(date +%s)
h2=$(handle_of "$D2" 1)
( post "$W/v2/db/$D2/erase" "$(remove era5-d2-c acct/c/one)" d2-removal-c1-on-write-gateway ) & rm_pid=$!; bg_pids+=("$rm_pid")
wait_log "$prefix-gw-w" "TRIPLEX_REMOVAL_PAUSED intent" && step "the write gateway paused after c1's intent" || { echo "never paused" >&2; exit 1; }
docker kill "$prefix-gw-w" > /dev/null; wait "$rm_pid" || true
step "D2 intents pending: $(pending_of "$D2")"
post "$R/v1/db/$D2/transact" "$bodies/save-b1-0.json" d2-plain-save-b1
post "$R/v1/db/$D2/read" '{"entityIds":["acct/c/one"]}' d2-read-c1
while (( $(date +%s) - t0 < 25 )); do sleep 1; done
step "D2 25 s after a1's publication: intents pending $(pending_of "$D2"), a1 key row $(key_rows "$D2" "$h2")"
sleep 20
step "D2 45 s after a1's publication: intents pending $(pending_of "$D2"), a1 key row $(key_rows "$D2" "$h2")"
hc=""
if [[ -n ${ERA2_SHRED_WORKER_MS:-} ]]; then
  step "D2 with the worker's completion: c1's removal published by now: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$D2' AND record='erase-2.json'")"
  hc=$(handle_of "$D2" 2); step "D2 c1 key row gone after (s): $(wait_gone "$D2" "$hc" 40)"
fi
post "$R/v2/db/$D2/erase" "$(remove era5-d2-c acct/c/one)" d2-removal-c1-resent-on-read-gateway
step "D2 intents pending after the resend: $(pending_of "$D2")"
step "D2 a1 key row gone after (s): $(wait_gone "$D2" "$h2" 40)"
step "removal failures counted on the read gateway: $(curl -sS -m 10 "$R/v2/admin/scan-stats" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s).removalFailures??{}))}catch{console.log("?")}})')"
check_images end
step "done"
