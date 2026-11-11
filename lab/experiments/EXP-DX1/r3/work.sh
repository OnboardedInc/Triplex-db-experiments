#!/usr/bin/env bash
# [DX-R3] Why: reproduce H4's four-engine/four-client CPU placement with local images only.
# Rejected: shared residents or host port forwarding (would couple experiments).
set -euo pipefail
prefix=${DX_R3_PREFIX:?}; config=${DX_R3_OPERATIONAL:?}; mode=${DX_R3_MODE:?}; repo=$PWD
[[ $prefix == tx2-dxr3-* ]] || exit 2
git rev-parse HEAD
# [DX-R3] Why: the VM shares the project tree; arbitrary host /tmp binds are not guaranteed shared.
# Rejected: assuming the guest can see a macOS temporary path.
config="$repo/lab/experiments/EXP-DX1/r3/.runtime-$prefix"
mkdir "$config"
trap 'rm -rf "$config"' EXIT
mkdir -p runs/DX-R3-vm
for role in pg tx gw-w gw-r driver extract health; do
  if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo "refuse existing $prefix-$role"; exit 2; fi
done
for name in "$prefix-pg-data" "$prefix-driver"; do
  if docker volume inspect "$name" >/dev/null 2>&1; then echo "refuse existing $name"; exit 2; fi
done
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine node:22.23.2-bookworm-slim >/dev/null
docker create --name "$prefix-extract" --pull never tx2-datomic:1.0.7745-da00 >/dev/null
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do docker cp "$prefix-extract:/opt/datomic/bin/sql/$file" "$config/$file"; done
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$config/template.properties"
docker rm "$prefix-extract"
python3 - "$config" "$prefix" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1]); prefix=sys.argv[2]
settings={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx','sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic','sql-user':'datomic','sql-password':'datomic','memory-index-threshold':'256m','memory-index-max':'1g','object-cache-max':'1g'}
lines=[l for l in (root/'template.properties').read_text().splitlines() if l.partition('=')[0].strip() not in settings]
(root/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in settings.items())+'\n')
PY
docker network create "$prefix-net"
docker volume create "$prefix-pg-data"
docker volume create "$prefix-driver"
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus 0 --memory 2g --memory-swap 2g -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" postgres:17-alpine postgres -c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB
ready=false
for ((i=0;i<90;i++)); do
  if docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ $ready == true ]] || exit 1
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  db=postgres; [[ $file != postgres-table.sql ]] || db=datomic
  docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d "$db" < "$config/$file"
done
docker run -d --pull never --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus 0,1 --memory 4g --memory-swap 4g -e 'JAVA_OPTS=-Xms256m -Xmx3g' -v "$config:/config:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /config/sql.properties
for role in w r; do
  cpu=1; [[ $role == w ]] || cpu=2,3
  docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 3g --memory-swap 3g \
    -e 'DATOMIC_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.codec.spec=/opt/replica-codec-spec.json' \
    -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" \
    -v "$repo/packages/datomic/gateway:/opt/gateway:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" \
    --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main
 done
docker run --rm --pull never --name "$prefix-health" --network "$prefix-net" node:22.23.2-bookworm-slim node -e '
for (const role of ["w","r"]) { let ok=false; for(let i=0;i<180;i++){try{const r=await fetch("http://"+process.argv[1]+"-gw-"+role+":8080/health"); if(r.ok){console.log(await r.text());ok=true;break;}}catch{} await new Promise(r=>setTimeout(r,1000));}if(!ok)process.exit(1);}' "$prefix"
# [DX-R3] Why: proof and measurement fit one bounded lease; clients and database scopes remain distinct.
# Rejected: a second admission wait that can exhaust the four-hour task budget.
run_driver() {
docker run --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 8g --memory-swap 8g \
  -v "$repo:$repo:ro" -v "$prefix-driver:$repo/runs/DX-R3-vm" -w "$repo" \
  -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_ENGINE_CPUS=4 \
  node:22.23.2-bookworm-slim "$@"
}
if [[ $mode == compare ]]; then
  # [DX-R3] Why: alternate a legacy control and the new path inside one measured hold on distinct fresh scopes.
  # Rejected: comparing a quiet new run against an old run from another noisy VM window.
  for arm in a b; do
    yield=loop; feed=legacy
    [[ $arm == a ]] || { yield=fair; feed=inline; }
    echo "DX-R3 comparison arm=$arm yield=$yield feed=$feed"
    run_driver node --experimental-strip-types lab/bench/driver.ts --lane datomic --rung 10k --composition reach --read-path replica --reader-ladder-only --reader-threads 3 --profile smoke --level-s 30 --max-readers 1024 --probe10-per-s 0 --rate-scale 1 --seed-batch-facts 2000 --replica-yield "$yield" --replica-feed "$feed" --output "runs/DX-R3-vm/report-$arm.json"
    docker cp "$prefix-driver:$repo/runs/DX-R3-vm/report-$arm.json" "$config/report-$arm.json"
    cat "$config/report-$arm.json"
    docker inspect --format '{{.Name}} {{.State.ExitCode}} {{.State.OOMKilled}} {{.HostConfig.CpusetCpus}} {{.HostConfig.Memory}}' "$prefix-driver"
    docker rm "$prefix-driver"
  done
  exit
fi
if [[ $mode == both ]]; then
  run_driver node --experimental-strip-types lab/experiments/EXP-DX1/r3/differential.ts
  docker inspect --format '{{.Name}} {{.State.ExitCode}} {{.State.OOMKilled}}' "$prefix-driver"
  docker rm "$prefix-driver"
  mode=benchmark
fi
if [[ $mode == differential ]]; then
  command=(node --experimental-strip-types lab/experiments/EXP-DX1/r3/differential.ts)
else
  command=(node --experimental-strip-types lab/bench/driver.ts --lane datomic --rung 10k --composition reach --read-path replica --reader-ladder-only --reader-threads 3 --profile smoke --level-s 30 --max-readers 256 --probe10-per-s 0 --rate-scale 1 --seed-batch-facts 2000 --output runs/DX-R3-vm/ns-report.json)
fi
rc=0
run_driver "${command[@]}" || rc=$?
# Read the report even though the driver process has exited; this is raw command output, not another evidence format.
if [[ $mode == benchmark ]]; then
  if docker cp "$prefix-driver:$repo/runs/DX-R3-vm/ns-report.json" "$config/report.json"; then cat "$config/report.json"; fi
fi
docker inspect --format '{{.Name}} {{.State.ExitCode}} {{.State.OOMKilled}} {{.HostConfig.CpusetCpus}} {{.HostConfig.Memory}}' "$prefix-driver"
exit "$rc"
