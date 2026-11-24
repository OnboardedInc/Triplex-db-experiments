#!/usr/bin/env bash
# [DX-RPT1] Mac toy run of the reporting copy's gates, one ordinary heavy token, times diagnostic:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-RPT1-gate -- \
#     bash lab/experiments/EXP-DX1/rpt1/gate.sh "$PWD" NEW_OUT_DIR
# Starts this checkout's gateway stack (ID lists, sweep, an erasure directory) on 18981/18982 and the reporting copy's
# own PostgreSQL (container <prefix>-rpg, 127.0.0.1:18983), runs rpt1/gate.ts, records the image every container ran,
# and removes every container, network and volume it made. Never touches another stack or image.
set -uo pipefail
repo=$1 out=$2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
prefix=tx2-dxrpt1-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack"
datomic_id=$(docker image inspect --format '{{.Id}}' "$(node "$repo/lab/config/datomic/runtime.mjs" tag)")
pg_id=$(docker image inspect --format '{{.Id}}' postgres:17-alpine)
node_id=$(docker image inspect --format '{{.Id}}' node:22.23.2-bookworm-slim)
printf '{"datomic":"%s","postgres":"%s","node":"%s"}\n' "$datomic_id" "$pg_id" "$node_id" > "$out/images-expected.json"
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/stack/$role.log" 2>&1 || true; done
  docker logs "$prefix-rpg" > "$out/stack/rpg.log" 2>&1 || true
  docker rm -f "$prefix-rpg" "$prefix-scan" >/dev/null 2>&1
  docker volume rm "$prefix-rpg-data" >/dev/null 2>&1
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
}
trap cleanup EXIT
for attempt in 1 2 3 4 5 6; do
  DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_ID_LISTS=1 DX_SWEEP=1 \
    DX_SWEEP_CURSOR_SECRET=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n') DX_XQ3_ERASURE_DIRECTORY=1 \
    TRIPLEX_TRACE_LEVEL=off DX_PG_MEMORY=384m DX_TX_MEMORY=1500m DX_TX_HEAP=1g DX_GW_READ_MEMORY=900m DX_GW_WRITE_MEMORY=900m \
    DX_GW_READ_HEAP=512m DX_GW_WRITE_HEAP=512m \
    bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18981 --port-read 18982 > "$out/stack-up-$attempt.log" 2>&1 && break
  echo "stack did not start (attempt $attempt); see $out/stack-up-$attempt.log" >&2
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
  [[ $attempt == 6 ]] && exit 1
  sleep 60
done
password=$(od -An -N18 -tx1 /dev/urandom | tr -d ' \n')
docker volume create "$prefix-rpg-data" >/dev/null
docker run -d --pull never --name "$prefix-rpg" --memory 384m --memory-swap 384m -p 127.0.0.1:18983:5432 \
  -e POSTGRES_PASSWORD="$password" -v "$prefix-rpg-data:/var/lib/postgresql/data" "$pg_id" \
  -c log_min_error_statement=panic -c shared_buffers=64MB > /dev/null
for i in $(seq 1 60); do docker exec "$prefix-rpg" pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
for role in pg tx gw-w gw-r; do
  ran=$(docker container inspect --format '{{.Image}}' "$prefix-$role")
  printf '{"container":"%s","ran":"%s"}\n' "$prefix-$role" "$ran" >> "$out/images-ran.jsonl"
done
printf '{"container":"%s","ran":"%s"}\n' "$prefix-rpg" "$(docker container inspect --format '{{.Image}}' "$prefix-rpg")" >> "$out/images-ran.jsonl"
(cd "$repo" && RPT_PG_PASSWORD=$password RPT_NODE_IMAGE=$node_id node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/rpt1/gate.ts "$out" http://127.0.0.1:18981 http://127.0.0.1:18982 "$prefix" 18983) > "$out/driver.log" 2>&1
status=$?
# Every container the run used must have run the image recorded at the start.
python3 - "$out/images-expected.json" "$out/images-ran.jsonl" <<'CHECK' || status=3
import json,sys
e=json.load(open(sys.argv[1]));bad=[]
for line in open(sys.argv[2]):
    r=json.loads(line);want=e['postgres'] if r['container'].endswith(('-pg','-rpg')) else e['datomic']
    if r['ran']!=want: bad.append(r)
print(json.dumps({'imagesChecked':sum(1 for _ in open(sys.argv[2])),'mismatches':bad}))
sys.exit(1 if bad else 0)
CHECK
exit "$status"
