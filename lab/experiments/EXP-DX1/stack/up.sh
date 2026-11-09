#!/usr/bin/env bash
# [DX-H1] Why: separate peers and durable SQL storage measure the intended topology. Rejected: dev storage (single process).
set -euo pipefail
prefix=${1:?usage: up.sh PREFIX [--cpus-tx LIST] [--cpus-pg LIST] [--cpus-gw-write LIST] [--cpus-gw-read LIST] [--gateway-src DIR] [--port-write N] [--port-read N]}
shift
[[ "$prefix" =~ ^tx2-dx[a-z0-9-]+$ ]] || { echo "DX stack accepts only tx2-dx* prefixes" >&2; exit 2; }
tx=6 pg=6 gw_w=6 gw_r=7 port_w=8491 port_r=8492 src=
while (($#)); do
  case "$1" in
    --cpus-tx) tx=$2;; --cpus-pg) pg=$2;;
    --cpus-gw-write) gw_w=$2;; --cpus-gw-read) gw_r=$2;;
    --gateway-src) src=$2;; --port-write) port_w=$2;; --port-read) port_r=$2;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
  shift 2
done
for cpus in "$tx" "$pg" "$gw_w" "$gw_r"; do
  [[ "$cpus" =~ ^[0-7](,[0-7])*$ || "$cpus" =~ ^[0-7]-[0-7]$ ]] || { echo "only VM CPUs 0 through 7 are allowed" >&2; exit 2; }
done
for port in "$port_w" "$port_r"; do
  [[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65535 && "$port" != 15442 && "$port" != 17019 ]] || exit 2
done
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
evidence=${DX_STACK_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1}
attempt="$evidence/$prefix"
mkdir -p "$attempt/sql" "$attempt/config"
[[ ! -e "$attempt/stack.json" ]] || { echo "use a fresh prefix; evidence already exists" >&2; exit 2; }
for role in pg tx gw-w gw-r extract; do
  if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo "container already exists: $prefix-$role" >&2; exit 2; fi
done
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine >/dev/null
if [[ -z "$src" ]]; then
  src="$evidence/stage/$prefix"
  mkdir -p "$src"
  cp -R "$repo/packages/datomic/gateway/." "$src/"
  cp "$repo/packages/datomic/src/codec-spec.json" "$src/codec-spec.json"
fi
src=$(cd "$src" && pwd)
[[ -d "$src/src" && -f "$src/codec-spec.json" ]] || { echo "gateway source needs src/ and codec-spec.json" >&2; exit 2; }
gateway_hash=$(python3 - "$src" "$attempt/gateway-files.json" <<'PY'
import pathlib,hashlib,json,sys
root=pathlib.Path(sys.argv[1])
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
data=json.dumps(files,sort_keys=True,separators=(',',':')).encode()
pathlib.Path(sys.argv[2]).write_bytes(data)
print(hashlib.sha256(data).hexdigest())
PY
)
# Copy only from the already-local image; never start its inherited entrypoint.
docker create --name "$prefix-extract" --pull never tx2-datomic:1.0.7745-da00 >/dev/null
trap 'docker rm -f "$prefix-extract" >/dev/null 2>&1 || true' EXIT
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  docker cp "$prefix-extract:/opt/datomic/bin/sql/$file" "$attempt/sql/$file"
done
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$attempt/config/template.properties"
docker rm "$prefix-extract" >/dev/null
trap - EXIT
python3 - "$attempt/config" "$prefix" <<'PY'
import pathlib,sys
root=pathlib.Path(sys.argv[1]); prefix=sys.argv[2]
settings={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx',
'sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic','sql-user':'datomic','sql-password':'datomic',
'memory-index-threshold':'128m','memory-index-max':'512m','object-cache-max':'128m'}
lines=[line for line in (root/'template.properties').read_text().splitlines() if line.partition('=')[0].strip() not in settings]
(root/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in settings.items())+'\n')
PY
docker network create "$prefix-net" >/dev/null
docker volume create "$prefix-pg-data" >/dev/null
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus "$pg" --memory 512m --memory-swap 512m \
  -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" postgres:17-alpine >/dev/null
# [DX-B2-N4] Why: initdb's temporary socket server stops before the final TCP server starts.
# Rejected: socket-only pg_isready (n4b raced that shutdown during vendor SQL setup).
ready=false
for ((i=0;i<90;i++)); do
  if docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ $ready == true ]] || { echo "Postgres TCP startup timed out" >&2; exit 1; }
# Vendor scripts use their own database/connect statements; keep their order and bytes.
for file in postgres-db.sql postgres-table.sql postgres-user.sql; do
  db=postgres
  [[ "$file" != postgres-table.sql ]] || db=datomic
  docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d "$db" < "$attempt/sql/$file" > "$attempt/sql/$file.log"
done
docker run -d --pull never --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus "$tx" --memory 3g --memory-swap 3g \
  -e "JAVA_OPTS=-Xms256m -Xmx2g" -v "$attempt/config:/dxh1:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /dxh1/sql.properties >/dev/null
template="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
# A ready transactor is checked by gateway health, which creates and syncs a real SQL database.
for role in w r; do
  if [[ $role == w ]]; then cpu=$gw_w port=$port_w; else cpu=$gw_r port=$port_r; fi
  docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 1500m --memory-swap 1500m \
    -p "127.0.0.1:$port:8080" -e "JAVA_OPTS=-Xms256m -Xmx1g" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "DATOMIC_URI_TEMPLATE=$template" -e "GATEWAY_SOURCE_SHA256=$gateway_hash" \
    -v "$src:/opt/gateway:ro" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main >/dev/null
  ok=false
  for ((i=0;i<180;i++)); do
    if curl -fsS "http://127.0.0.1:$port/health" > "$attempt/health-$role.json" 2>/dev/null; then ok=true; break; fi
    sleep 1
  done
  if [[ $ok != true ]]; then docker logs "$prefix-gw-$role" > "$attempt/gateway-$role.log" 2>&1; echo "gateway $role failed; see $attempt" >&2; exit 1; fi
done
docker inspect "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" > "$attempt/containers.json"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc "SHOW fsync; SHOW synchronous_commit; SHOW full_page_writes; SHOW wal_sync_method;" > "$attempt/durability.txt"
python3 - "$attempt" "$prefix" "$gateway_hash" "$port_w" "$port_r" <<'PY'
import json,pathlib,sys,datetime
root=pathlib.Path(sys.argv[1]); rows=json.loads((root/'containers.json').read_text())
durability=dict(zip(['fsync','synchronous_commit','full_page_writes','wal_sync_method'],(root/'durability.txt').read_text().splitlines()))
assert all(durability[k]=='on' for k in ['fsync','synchronous_commit','full_page_writes'])
for role in ['w','r']:
    assert json.loads((root/('health-'+role+'.json')).read_text())['gatewaySourceHash']==sys.argv[3]
out={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'prefix':sys.argv[2],'gatewaySourceSha256':sys.argv[3],
'containers':[{'name':r['Name'].lstrip('/'),'id':r['Id'],'imageId':r['Image'],'cpuset':r['HostConfig']['CpusetCpus'],'memory':r['HostConfig']['Memory']} for r in rows],
'durability':durability,'writeUrl':'http://127.0.0.1:'+sys.argv[4],'readUrl':'http://127.0.0.1:'+sys.argv[5]}
(root/'stack.json').write_text(json.dumps(out,indent=2)+'\n')
PY
printf 'DATOMIC_URL=http://127.0.0.1:%s\nDATOMIC_READ_URLS=http://127.0.0.1:%s\nEvidence: %s/stack.json\n' "$port_w" "$port_r" "$attempt"
