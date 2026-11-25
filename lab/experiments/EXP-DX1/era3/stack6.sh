#!/usr/bin/env bash
# [DX-ERA3, sixth review] Stack scenarios against DX-ERA2 at 03bb49cd3 (gateway code b047b22a0; Mac, toy, one ordinary
# heavy token):
#   DOCKER_HOST=unix://<lab VM socket> BOUNDARY=<log|commit> SEALED=<0|1> \
#     node lab/bin/heavy.mjs --label DX-ERA3-stack6 -- \
#     bash lab/experiments/EXP-DX1/era3/stack6.sh NEW_ABSOLUTE_DIR BODIES_DIR all6
# BODIES_DIR: written by `run.sh OUT subject bodies6` with ERA3_MAIN=6. Per account with the subject setting, the
# PostgreSQL removal authority shared by a write and a read gateway, every container on the image the stack pinned by
# ID, the gateway source this checkout's HEAD (or SOURCE_REF). BOUNDARY=commit gives both gateways the permission and
# moves each database through its route.
# SCENARIO all6, in one stack:
#   D1, D2: a1 and b1 hold :v and :q (:q not protected); the data is backed up; :q is added to the policy; a1 saves :q;
#     the data is restored from the backup (transactor and gateways stopped). D1: a removal of the whole subject a1
#     before the restore route; D2 (control): the restore route first, then the removal. Then the restore route, the
#     protection route with [:v :q] (a service's restart), reads of a1, a second removal of a1, reads again.
#   D6: as D1, with a removal of b1 after the backup and the addition, so the restored data is behind the log: a removal
#     of a1 sent before the restore route (refused), the restore route, the client's retry of the removal, reads; then
#     the protection route with [:v :q], reads.
#   D3, D3b: a1, b1, c1 hold :v; the data AND the removal authority's rows of the database are backed up; a1 is removed
#     (acknowledged) and its keys deleted by the key pass (grace 0); both are restored to the backup (D3: records and
#     keys; D3b: records only). Then reads of a1 on both gateways, a save, a removal of a1 again, reads.
#   D4: two gateways add different attributes at once, 6 rounds; then one call with both.
#   D5: a sealed database declared on the write gateway; both gateways restarted (empty key pools); the first sealed save
#     on each.
# Predictions: the evidence's predictions.md (2026-11-25 09:41 EST), items A2, A8, A9, A3.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; scenario=${3:?all6}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/values.json ]] || { echo "missing $bodies/values.json" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/tmp"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera3f-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA3_PORT_WRITE:-19051} port_r=${DX_ERA3_PORT_READ:-19055}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
sealed=$([[ ${SEALED:-0} == 1 ]] && echo true || echo false)
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  docker rm -f "$prefix-restore" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gw" "$out/gwtmp" "$out/backup"
}
trap cleanup EXIT
mkdir -p "$out/gw" "$out/gwtmp"
ref=${SOURCE_REF:-HEAD}
git archive "$ref" packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
git rev-parse "$ref" > "$out/sources-placed"
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
echo "boundary ${BOUNDARY:-log} sealed $sealed" > "$out/boundary"
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
post() { # URL BODY NAME
  local url=$1 body=$2 name=$3 data
  n=$((n + 1)); name="$(printf '%03d' $n)-$name"
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  local code; code=$(grep -o '"code":"[^"]*"' "$out/replies/$name.json" 2>/dev/null | head -1 || true)
  step "$name -> $(cat "$out/replies/$name.status") $code"
  last=$out/replies/$name.json
}
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
value() { node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1]))[process.argv[2]])' "$bodies/values.json" "$1"; }
headcopy() { psql_auth -c "select payload from triplex_removal.records where scope='$1' and record='head.json'" 2>/dev/null | head -c 300; }
answered() { local f=$1; shift; local c=0 v; for v in "$@"; do [[ -z $v ]] && continue; c=$((c + $(grep -c -- "$v" "$f" || true))); done; echo $c; }
wait_up() { for i in $(seq 1 120); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 1; done; return 1; }
new_db() { # URL NAME SEALED
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era3-stack6",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$last")
  echo "$2 $db" >> "$out/dbs"
  post "$1/v2/db/$db/protection" "{\"attributes\":[\":v\"],\"sealed\":$3}" "protection-$2"
  post "$1/v2/db/$db/removal-per-account" '{}' "move-$2"
  [[ ${BOUNDARY:-log} == commit ]] && post "$1/v2/db/$db/removal-commit-boundary" '{}' "commit-boundary-$2"
  return 0
}
uri_of() { docker exec "$prefix-gw-r" sh -c 'printf %s "$DATOMIC_URI_TEMPLATE"' | sed "s/{db}/$1/"; }
backup() { # DB TAG
  local u; u=$(uri_of "$1")
  docker exec "$prefix-gw-r" sh -ceu "cd /opt/datomic 2>/dev/null || true; rm -rf /tmp/era3-backup-$2; exec bin/datomic -Xms64m -Xmx256m backup-db '$u' file:/tmp/era3-backup-$2" > "$out/backup-$2.log" 2>&1
  mkdir -p "$out/backup"; docker cp "$prefix-gw-r:/tmp/era3-backup-$2" "$out/backup/$2" > /dev/null
  step "backed up $2 ($1)"
}
restore_all() { # TAG:DB ...
  step "stop the gateways and the transactor; restore the data from the backups"
  for role in gw-w gw-r tx; do docker stop --time 12 "$prefix-$role" > /dev/null; done
  net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$prefix-pg" | awk '{print $1}')
  local pair tag dbn u
  for pair in "$@"; do
    tag=${pair%%:*} dbn=${pair#*:}; u=$(uri_of_stopped "$dbn")
    docker create --name "$prefix-restore" --network "$net" --entrypoint /bin/sh "$pinned" -ceu \
      "cd /opt/datomic; exec bin/datomic -Xms96m -Xmx800m restore-db file:/tmp/era3-backup '$u'" > /dev/null
    docker cp "$out/backup/$tag" "$prefix-restore:/tmp/era3-backup" > /dev/null
    docker start -a "$prefix-restore" > "$out/restore-$tag.log" 2>&1; step "restore-db $tag exit $(docker inspect -f '{{.State.ExitCode}}' "$prefix-restore")"
    echo "restore $prefix-restore $(docker inspect --format '{{.Image}}' "$prefix-restore")" >> "$out/images-ran"
    docker rm -f "$prefix-restore" > /dev/null
  done
}
start_all() { docker start "$prefix-tx" > /dev/null; sleep 5; docker start "$prefix-gw-w" "$prefix-gw-r" > /dev/null; wait_up "$W"; wait_up "$R"; check_images "$1"; }
erase_subject() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\"}]}"; }
reads() { # URL DB TAG VALUES...
  local u=$1 d=$2 tag=$3; shift 3
  post "$u/v1/db/$d/read" '{"entityIds":["acct/a/one"]}' "read-a1-$tag"; local c1; c1=$(answered "$last" "$@")
  post "$u/v1/db/$d/read" '{"entityIds":["acct/a/one"],"history":true}' "read-a1-history-$tag"; local c2; c2=$(answered "$last" "$@")
  step "RESULT $tag a1 values answered: current $c1, history $c2"
}

case $scenario in
all6)
  va=$(value a1) vq=$(value a1:q) vq0=$(value a1:q0) vq1=$(value a1:q1)
  new_db "$W" d1 "$sealed"; D1=$db
  new_db "$W" d2 "$sealed"; D2=$db
  new_db "$W" d6 "$sealed"; D6=$db
  new_db "$W" d3 "$sealed"; D3=$db
  new_db "$W" d3b "$sealed"; D3B=$db
  uri_of_stopped() { cat "$out/tmp/uri-$1"; }
  for d in $D1 $D2 $D6 $D3 $D3B; do uri_of "$d" > "$out/tmp/uri-$d"; done
  for d in $D1 $D2 $D6; do for s in a1 b1; do post "$W/v1/db/$d/transact" "$bodies/seed-$s.json" "seed-$s"; post "$W/v1/db/$d/transact" "$bodies/seedq-$s.json" "seedq-$s"; done; done
  for d in $D3 $D3B; do for s in a1 b1 c1; do post "$W/v1/db/$d/transact" "$bodies/seed-$s.json" "seed-$s"; done; done
  backup "$D1" d1; backup "$D2" d2; backup "$D6" d6; backup "$D3" d3; backup "$D3B" d3b
  for d in $D3 $D3B; do
    psql_auth -c "create table public.\"bk_r_$d\" as select * from triplex_removal.records where scope='$d'; create table public.\"bk_k_$d\" as select * from triplex_removal.keys where scope='$d';" > /dev/null
    step "authority rows of $d backed up: records $(psql_auth -c "select count(*) from public.\"bk_r_$d\"") keys $(psql_auth -c "select count(*) from public.\"bk_k_$d\"")"
  done
  for d in $D1 $D2 $D6; do
    post "$W/v2/db/$d/protection" "{\"attributes\":[\":v\",\":q\"],\"sealed\":$sealed}" "add-q"
    post "$W/v1/db/$d/transact" "$bodies/saveq-a1-0.json" "saveq-a1-after-the-addition"
    step "head copy $d after the addition: $(headcopy "$d")"
  done
  for d in $D3 $D3B; do
    post "$W/v2/db/$d/erase" "$(erase_subject "rm-a1-$d" acct/a/one)" "removal-a1"
    sleep 3
    reads "$R" "$d" "after-the-removal-$d" "$va"
    step "keys of $d: $(psql_auth -c "select count(*) from triplex_removal.keys where scope='$d'") (backed up $(psql_auth -c "select count(*) from public.\"bk_k_$d\""))"
  done
  # D6: a removal of b1 after the backup and the addition, so the restored data is behind the log
  post "$W/v2/db/$D6/erase" "$(erase_subject "rm-b1-$D6" acct/b/one)" "d6-removal-b1-after-the-backup"
  restore_all d1:$D1 d2:$D2 d6:$D6 d3:$D3 d3b:$D3B
  # the removal authority's rows of D3 (records and keys) and D3b (records only) put back to the backup
  psql_auth -c "delete from triplex_removal.records where scope='$D3'; insert into triplex_removal.records select * from public.\"bk_r_$D3\"; delete from triplex_removal.keys where scope='$D3'; insert into triplex_removal.keys select * from public.\"bk_k_$D3\";" > /dev/null
  psql_auth -c "delete from triplex_removal.records where scope='$D3B'; insert into triplex_removal.records select * from public.\"bk_r_$D3B\";" > /dev/null
  step "authority put back: D3 keys $(psql_auth -c "select count(*) from triplex_removal.keys where scope='$D3'"), D3b keys $(psql_auth -c "select count(*) from triplex_removal.keys where scope='$D3B'")"
  start_all restored
  grep -h "removal-start-check" "$out/evidence/"*.log 2>/dev/null | tail -5 >> "$out/steps.log" || true
  for g in gw-w gw-r; do docker logs "$prefix-$g" 2>&1 | grep "removal-start-check" | sed "s/^/$g /" >> "$out/start-check.log" || true; done
  step "start-check lines: $(grep -c . "$out/start-check.log" 2>/dev/null || echo 0)"
  # D1 and D2: the window after the data restore
  for d in $D1 $D2; do
    step "head copy $d after the data restore: $(headcopy "$d")"
    post "$W/v1/db/$d/transact" "$bodies/saveq-a1-1.json" "saveq-a1-in-the-window"
    if [[ $d == "$D1" ]]; then post "$R/v2/db/$d/erase" "$(erase_subject "rm-a1-$d" acct/a/one)" "d1-removal-a1-before-the-restore-route"
    else post "$W/v2/db/$d/restore-erasure" '{}' "d2-restore-route-first"; fi
    step "head copy $d after the window step: $(headcopy "$d")"
    post "$W/v2/db/$d/restore-erasure" '{}' "restore-route"
    post "$W/v2/db/$d/protection" "{\"attributes\":[\":v\",\":q\"],\"sealed\":$sealed}" "service-declares-v-q"
    step "protection answer: $(head -c 300 "$last")"
    [[ $d == "$D2" ]] && post "$R/v2/db/$d/erase" "$(erase_subject "rm-a1-$d" acct/a/one)" "d2-removal-a1"
    reads "$R" "$d" "after-the-removal-$d" "$va" "$vq" "$vq1"
    post "$R/v2/db/$d/erase" "$(erase_subject "rm-a1-again-$d" acct/a/one)" "second-removal-a1"
    reads "$R" "$d" "after-the-second-removal-$d" "$va" "$vq" "$vq1"
  done
  # D6: the data restored from before the addition and before a removal (behind the log): a removal of a1 sent in the
  # window, then the restore route, then the client's retry of the removal, reads; then the service's declaration
  step "head copy $D6 after the data restore: $(headcopy "$D6")"
  post "$R/v2/db/$D6/erase" "$(erase_subject "rm-a1-$D6" acct/a/one)" "d6-removal-a1-in-the-window"
  step "head copy $D6 after the refused removal: $(headcopy "$D6")"
  post "$W/v2/db/$D6/restore-erasure" '{}' "d6-restore-route"
  post "$R/v2/db/$D6/erase" "$(erase_subject "rm-a1-$D6" acct/a/one)" "d6-removal-a1-retried"
  reads "$R" "$D6" "d6-after-the-retried-removal" "$va" "$vq"
  post "$W/v2/db/$D6/protection" "{\"attributes\":[\":v\",\":q\"],\"sealed\":$sealed}" "d6-service-declares-v-q"
  step "protection answer: $(head -c 300 "$last")"
  reads "$R" "$D6" "d6-after-the-service" "$va" "$vq"
  # D3 and D3b: the data and the log restored to the same backup
  for d in $D3 $D3B; do
    reads "$R" "$d" "restored-read-gateway-$d" "$va"
    reads "$W" "$d" "restored-write-gateway-$d" "$va"
    curl -sS -m 30 "$R/v2/db/$d/erasure-frontier?stampOnly=1" > "$out/replies/frontier-$d.json"; step "frontier $d: $(head -c 200 "$out/replies/frontier-$d.json")"
    post "$W/v1/db/$d/transact" "$bodies/save-b1-0.json" "save-b1"
    post "$W/v2/db/$d/removal-log-rebuild" '{}' "rebuild-route"
    post "$R/v2/db/$d/erase" "$(erase_subject "rm-a1-$d" acct/a/one)" "removal-a1-sent-again"
    reads "$R" "$d" "after-the-removal-sent-again-$d" "$va"
  done
  # D4: two gateways adding different attributes at once
  new_db "$W" d4 false; D4=$db
  have='":v"'
  for k in 0 1 2 3 4 5; do
    ( curl -sS -m 60 -o "$out/replies/d4-$k-w.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$W/v2/db/$D4/protection" \
        --data-binary "{\"attributes\":[$have,\":qa$k\"],\"sealed\":false}" > "$out/replies/d4-$k-w.status" ) &
    pw=$!
    ( curl -sS -m 60 -o "$out/replies/d4-$k-r.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$R/v2/db/$D4/protection" \
        --data-binary "{\"attributes\":[$have,\":qb$k\"],\"sealed\":false}" > "$out/replies/d4-$k-r.status" ) &
    pr=$!
    wait $pw $pr || true
    step "D4 round $k: write gateway $(cat "$out/replies/d4-$k-w.status") $(grep -o '"code":"[^"]*"' "$out/replies/d4-$k-w.json" || true), read gateway $(cat "$out/replies/d4-$k-r.status") $(grep -o '"code":"[^"]*"' "$out/replies/d4-$k-r.json" || true)"
    post "$W/v2/db/$D4/protection" "{\"attributes\":[$have,\":qa$k\",\":qb$k\"],\"sealed\":false}" "d4-both-$k"
    have="$have,\":qa$k\",\":qb$k\""
  done
  step "D4 stored at the end: $(head -c 400 "$last")"
  step "D4 head copy: $(headcopy "$D4")"
  # D5: N1 after a real restart
  new_db "$W" d5 true; D5=$db
  post "$W/v1/db/$D5/transact" "$bodies/seed-a1.json" "d5-seed-before-the-restart"
  step "restart both gateways"
  docker restart --time 12 "$prefix-gw-w" "$prefix-gw-r" > /dev/null; wait_up "$W"; wait_up "$R"; check_images restarted
  post "$R/v1/db/$D5/transact" "$bodies/seed-b1.json" "d5-first-sealed-save-on-the-read-gateway"
  post "$W/v1/db/$D5/transact" "$bodies/seed-c1.json" "d5-first-sealed-save-on-the-write-gateway"
  post "$R/v1/db/$D5/read" '{"entityIds":["acct/b/one","acct/c/one"]}' "d5-read-back"
  step "RESULT D5 values read back: $(answered "$last" "$(value b1)" "$(value c1)") of 2"
  ;;
*) echo "unknown scenario $scenario" >&2; exit 2 ;;
esac
step "done"
