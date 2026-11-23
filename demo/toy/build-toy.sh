#!/usr/bin/env bash
# [DX-DEMO1] Build the Mac toy "original" for demo/server-up.sh --toy: a fresh stack in the lab VM, the 1 billion
# database's layout at a few people per account (examples/demo-mcp/src/toy-load.ts), aged by AGE1's own loader code,
# a clean PostgreSQL shutdown,
# then a byte copy into the volume tx2-dxdemo1-toy-original and a toy handoff with the head, t and record count a
# fresh peer reads. Diagnostic only; nothing here is a timing result.
#   bash demo/toy/build-toy.sh [PEOPLE_PER_ACCOUNT=12]
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
cd "$repo"
[[ $(uname -s) == Darwin ]]
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
per=${1:-12}
root=${DEMO_ROOT:-$HOME/Claude/Projects/triplex-db-2/demo-toy}
original=tx2-dxdemo1-toy-original
mkdir -p "$root/original" "$root/evidence"
if docker volume inspect "$original" >/dev/null 2>&1; then echo "Remove $original first (docker volume rm)" >&2; exit 2; fi
prefix=tx2-dxdemo1-toyseed-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
trap 'docker rm -f "$prefix-agetx" >/dev/null 2>&1 || true; bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true' EXIT
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
node lab/bin/heavy.mjs --label DX-DEMO1-toy-seed -- env "${envs[@]}" DX_STACK_EVIDENCE="$root/evidence" \
  DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write 18481 --port-read 18485 "${args[@]}"
toy=$(cd examples/demo-mcp && node src/toy-load.ts http://127.0.0.1:18481 http://127.0.0.1:18485 "$per" | sed -n 's/^TOY //p')
[[ -n $toy ]]
database=$(node -e 'console.log(JSON.parse(process.argv[1]).database)' "$toy")
seed_head=$(node -e 'console.log(JSON.parse(process.argv[1]).clocks.seedHead)' "$toy")
image=$(DX_JAVA=21 node lab/config/datomic/runtime.mjs image)
# Age the seed with AGE1's own code at its load pin (5cda4ab20): its gateway's commit path and transactor functions,
# its tape and adoption, in its own peer JVM, exactly as the 1 billion database was aged (journal rows included).
age=$root/age1-5cda4ab20
rm -rf "$age"; mkdir -p "$age/gate" "$root/aging"
git archive 5cda4ab20 packages/datomic/gateway packages/datomic/src/codec-spec.json lab/experiments/EXP-DX1/age1/src | tar -x -C "$age"
cp demo/toy/aged_live.clj "$age/gate/aged_live.clj"
for role in gw-r gw-w; do docker stop -t 10 "$prefix-$role" >/dev/null; done
docker stop -t 60 "$prefix-tx" >/dev/null
config=$root/evidence/$prefix/config
uri="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
docker run -d --pull never --name "$prefix-agetx" --network "$prefix-net" --network-alias "$prefix-tx" --memory 1280m \
  -e "JAVA_OPTS=-Xms128m -Xmx640m -XX:+UseSerialGC" -e DATOMIC_EXT_CLASSPATH=/age/packages/datomic/gateway/src \
  -v "$config:/dxh1:ro" -v "$age:/age:ro" --entrypoint /opt/datomic/bin/transactor "$image" /dxh1/sql.properties >/dev/null
for ((i=0; i<150; i++)); do docker logs "$prefix-agetx" 2>&1 | grep -Fq 'System started' && break; sleep 1; done
docker logs "$prefix-agetx" > "$root/aging/agetx.log" 2>&1
grep -Fq 'System started' "$root/aging/agetx.log" || { tail -30 "$root/aging/agetx.log" >&2; exit 1; }
# "System started" precedes the transactor's listener and its storage location row by several seconds.
docker run --rm --pull never --network "$prefix-net" --entrypoint bash "$image" -c \
  'for i in $(seq 90); do (exec 3<>/dev/tcp/$0/4334) 2>/dev/null && exit 0; sleep 1; done; exit 1' "$prefix-tx"
sleep 12
docker run --rm --pull never --network "$prefix-net" --memory 1g -e "DATOMIC_URI_TEMPLATE=$uri" -v "$age:/age:ro" -v "$root/aging:/out" \
  --entrypoint java "$image" -Xmx512m -XX:+UseSerialGC -Dtriplex.codec.spec=/age/packages/datomic/src/codec-spec.json \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/age/packages/datomic/gateway/src:/age/lab/experiments/EXP-DX1/age1/src:/age/gate" \
  clojure.main -m aged-live "$database" "$seed_head" "$per" 3 "${AGE_SAVES:-150}" /out/aged.json \
  > "$root/aging/age1.log" 2>&1 || { tail -40 "$root/aging/age1.log" >&2; exit 1; }
docker rm -f "$prefix-agetx" >/dev/null
since=$(date +%s)
docker start "$prefix-tx" >/dev/null
for ((i=0; i<120; i++)); do docker logs --since "$since" "$prefix-tx" 2>&1 | grep -Fxq 'System started' && break; sleep 1; done
docker start "$prefix-gw-w" "$prefix-gw-r" >/dev/null
for port in 18481 18485; do for ((i=0; i<120; i++)); do curl -fsS --max-time 2 "http://127.0.0.1:$port/health" >/dev/null 2>&1 && break; sleep 1; done; done
aged=$(cat "$root/aging/aged.json")
identity=$(DEMO_PREFIX=$prefix DEMO_IMAGE=$image bash demo/server/java.sh -Xmx512m \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/opt/datomic/resources:$repo/packages/datomic/gateway/src:$repo/demo/server/clj" \
  "-Dtriplex.codec.spec=$repo/packages/datomic/src/codec-spec.json" "-Dlogback.configurationFile=$repo/lab/experiments/EXP-DX1/age1/server-logback.xml" \
  clojure.main -m demo.identity "datomic:sql://$database?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" "$database" |
  sed -n 's/^DEMO_IDENTITY //p')
[[ -n $identity ]]
for role in gw-r gw-w tx; do docker stop -t 60 "$prefix-$role" >/dev/null; done
docker stop -t 120 "$prefix-pg" >/dev/null
docker volume create "$original" >/dev/null
docker run --rm --pull never --network none -v "$prefix-pg-data:/from:ro" -v "$original:/to" --entrypoint /bin/sh \
  postgres:17-alpine -euc 'pg_controldata /from | grep -Eq "^Database cluster state:[[:space:]]+shut down$"; cp -a /from/. /to/'
node -e '
  const [toy, id, aged] = process.argv.slice(1, 4).map((x) => JSON.parse(x));
  const b = { version: "triplex-demo-toy/1", database: toy.database, scope: toy.scope, logicalHead: id.logicalHead,
    physicalT: id.physicalT, records: id.records, roster: toy.roster, loaderPositionRows: true,
    clocks: { ...toy.clocks, agedSaves: aged.saves, lastRecordedAt: aged.lastRecordedAt, lastTransaction: aged.lastTransaction },
    agedBy: "AGE1 tape and adoption at 5cda4ab20 (demo/toy/aged_live.clj)", seedFacts: toy.seedFacts, people: toy.people };
  if (b.logicalHead !== toy.clocks.seedHead + aged.saves) throw Error("peer head is not the seed head plus the aged saves");
  require("fs").writeFileSync(process.argv[4], JSON.stringify(b, null, 2) + "\n");' "$toy" "$identity" "$aged" "$root/original/handoff.json"
shasum -a 256 "$root/original/handoff.json" | cut -d' ' -f1 > "$root/original/handoff.json.sha256"
echo "TOY ORIGINAL READY $(cat "$root/original/handoff.json" | tr -d '\n' | cut -c1-400)"
