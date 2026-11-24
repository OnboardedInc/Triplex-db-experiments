#!/usr/bin/env bash
# [DX-ACT7] The Mac miniature of the 1 billion settlement run, under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-ACT7-miniature -- \
#     bash lab/experiments/EXP-DX1/actv-lazy/act7/miniature.sh NEW_OUT_DIR PHASE [PHASE ...]
# Each PHASE names OUT_DIR/../phases/PHASE.env (KEY=VALUE lines for the held runner). Steps, as DEMO1's toy build
# (demo/toy/build-toy.sh) with the held runner's toy settings: a fresh stack in the lab VM (laptop profile, the held
# toy's write-gateway switches), the SCALE1 toy fixture (8 subjects in each of ten accounts) through this branch's
# gateway; then AGE1's own code at its load pin (5cda4ab20: its transactor functions in a transactor of its own, its
# tape, adoption, probes, single saves and the bulk loader's grouped saves in its own peer JVM); then this branch's
# transactor and gateways again on the aged database; then each phase in order on that one copy (only the first phase
# may write). The stack and its volumes are removed at the end. Diagnostic only; no time here is a result.
set -euo pipefail
out=${1:?new output directory}; shift
(($# >= 1)) || { echo "name at least one phase" >&2; exit 2; }
[[ $out == /Users/* && ! -e $out ]] || { echo "give a new absolute output directory under /Users" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../../.." && pwd)
cd "$repo"
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
phases_dir=$(dirname "$out")/phases
for p in "$@"; do [[ -f $phases_dir/$p.env ]] || { echo "missing $phases_dir/$p.env" >&2; exit 2; }; done
mkdir -p "$out/aging" "$out/evidence"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxact7-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ACT7_PORT_WRITE:-18681} port_r=${DX_ACT7_PORT_READ:-18685}
cleanup() {
  docker rm -f "$prefix-agetx" >/dev/null 2>&1 || true
  for role in gw-r gw-w tx pg; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/age1src"
}
trap cleanup EXIT
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
# The held toy's write-gateway switches (ha1/stack.ts, load-fair): ordered per-subject writer, predecessor lookup,
# stage clock (the frames' apply time on each reply), fast reply, native journal query; no group commit.
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0)
env "${envs[@]}" "${gateway[@]}" ${DX_ACT7_GATEWAY_ENV:-} DX_STACK_EVIDENCE="$out/evidence" \
  DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" "${args[@]}" \
  > "$out/up.log" 2>&1 || { tail -30 "$out/up.log" >&2; exit 1; }
client_env=(TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1
  TX2_W0_RESTORE_INDEXED_JOURNAL=1 DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1)
env "${client_env[@]}" node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/actv-lazy/act7/miniature.ts \
  seed "$out" "http://127.0.0.1:$port_w" > "$out/seed.log" 2>&1 || { tail -30 "$out/seed.log" >&2; exit 1; }
db=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).db' "$out/seed.json")
seed_head=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).seedCut' "$out/seed.json")
people=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).people' "$out/seed.json")
image=$(DX_JAVA=21 node lab/config/datomic/runtime.mjs image)
if [[ ${DX_ACT7_SKIP_AGING:-0} == 1 ]]; then
  # Regression only: the fresh toy, never aged (run its phases with DX_ACT7_ADOPT=0).
  status=0
  for p in "$@"; do
    phase_env=()
    while IFS= read -r line; do [[ -z $line || $line == \#* ]] || phase_env+=("$line"); done < "$phases_dir/$p.env"
    echo "[act7] phase $p (fresh toy): ${phase_env[*]}"
    env "${client_env[@]}" "${phase_env[@]}" DX_ACT7_RUN_NAME="run-$p" node --no-warnings --experimental-transform-types \
      --max-old-space-size=4096 lab/experiments/EXP-DX1/actv-lazy/act7/miniature.ts fresh "$out" \
      "http://127.0.0.1:$port_w" "http://127.0.0.1:$port_r" > "$out/phase-$p.log" 2>&1 || status=1
    grep -E "^ACT7 RUN" "$out/phase-$p.log" || tail -20 "$out/phase-$p.log"
  done
  exit "$status"
fi
age=$out/age1src
mkdir -p "$age/gate"
git archive 5cda4ab20 packages/datomic/gateway packages/datomic/src/codec-spec.json lab/experiments/EXP-DX1/age1/src | tar -x -C "$age"
cp "$here/aged_toy.clj" "$age/gate/aged_toy.clj"
for role in gw-r gw-w; do docker stop -t 10 "$prefix-$role" >/dev/null; done
docker stop -t 60 "$prefix-tx" >/dev/null
config=$out/evidence/$prefix/config
uri="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
docker run -d --pull never --name "$prefix-agetx" --network "$prefix-net" --network-alias "$prefix-tx" --memory 1280m \
  --label tx2.managed-by=act7-miniature \
  -e "JAVA_OPTS=-Xms128m -Xmx640m -XX:+UseSerialGC" -e DATOMIC_EXT_CLASSPATH=/age/packages/datomic/gateway/src \
  -v "$config:/dxh1:ro" -v "$age:/age:ro" --entrypoint /opt/datomic/bin/transactor "$image" /dxh1/sql.properties >/dev/null
for ((i=0; i<150; i++)); do docker logs "$prefix-agetx" 2>&1 | grep -Fq 'System started' && break; sleep 1; done
docker logs "$prefix-agetx" > "$out/aging/agetx.log" 2>&1
grep -Fq 'System started' "$out/aging/agetx.log" || { tail -30 "$out/aging/agetx.log" >&2; exit 1; }
docker run --rm --pull never --network "$prefix-net" --entrypoint bash "$image" -c \
  'for i in $(seq 90); do (exec 3<>/dev/tcp/$0/4334) 2>/dev/null && exit 0; sleep 1; done; exit 1' "$prefix-tx"
sleep 12
docker run --rm --pull never --network "$prefix-net" --memory 1g -e "DATOMIC_URI_TEMPLATE=$uri" -v "$age:/age:ro" \
  -v "$out/aging:/out" --entrypoint java "$image" -Xmx512m -XX:+UseSerialGC \
  -Dtriplex.codec.spec=/age/packages/datomic/src/codec-spec.json \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/age/packages/datomic/gateway/src:/age/lab/experiments/EXP-DX1/age1/src:/age/gate" \
  clojure.main -m aged-toy "$db" "$seed_head" "$people" "${DX_ACT7_PER_ACCOUNT:-3}" "${DX_ACT7_SINGLES:-40}" \
  "${DX_ACT7_SAVES:-400}" "${DX_ACT7_GROUP:-8}" /out > "$out/aging/age1.log" 2>&1 || { tail -40 "$out/aging/age1.log" >&2; exit 1; }
docker rm -f "$prefix-agetx" >/dev/null
since=$(date +%s)
docker start "$prefix-tx" >/dev/null
for ((i=0; i<120; i++)); do docker logs --since "$since" "$prefix-tx" 2>&1 | grep -Fxq 'System started' && break; sleep 1; done
docker start "$prefix-gw-w" "$prefix-gw-r" >/dev/null
for port in "$port_w" "$port_r"; do for ((i=0; i<120; i++)); do curl -fsS --max-time 2 "http://127.0.0.1:$port/health" >/dev/null 2>&1 && break; sleep 1; done; done
status=0
for p in "$@"; do
  phase_env=()
  while IFS= read -r line; do [[ -z $line || $line == \#* ]] || phase_env+=("$line"); done < "$phases_dir/$p.env"
  echo "[act7] phase $p: ${phase_env[*]}"
  env "${client_env[@]}" "${phase_env[@]}" DX_ACT7_RUN_NAME="run-$p" node --no-warnings --experimental-transform-types \
    --max-old-space-size=4096 lab/experiments/EXP-DX1/actv-lazy/act7/miniature.ts run "$out" \
    "http://127.0.0.1:$port_w" "http://127.0.0.1:$port_r" > "$out/phase-$p.log" 2>&1 || status=1
  grep -E "^ACT7 (REPLAY|RUN)" "$out/phase-$p.log" || tail -20 "$out/phase-$p.log"
done
exit "$status"
