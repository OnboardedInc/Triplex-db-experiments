#!/usr/bin/env bash
# [DX-ERA2 sixth pass] One in-process Clojure file of era2/ against this checkout's gateway source with the PostgreSQL
# removal authority (a postgres container by image ID on a network of its own, data on a tmpfs, fsync off: correctness
# and relative cost only), one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-pg -- \
#     bash lab/experiments/EXP-DX1/era2/inproc-pg.sh NEW_ABSOLUTE_DIR FILE.clj 'FORM' [ENV=VALUE ...]
# Every container carries the label tx2.holder=DX-ERA2. The wrapping key and the password are random and never written.
set -uo pipefail
out=${1:?absolute new output directory}; file=${2:?clj file in era2/}; form=${3:?form}; shift 3
[[ $out == /* && ! -e $out ]] || { echo "inproc-pg.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/wfix1/regression.clj" "$x/era2/$file" "$out/lab/"
image=${DX_ERA2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
pgimage=${DX_ERA2_PG_ID:-sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32}
for i in "$image" "$pgimage"; do
  [[ $(docker image inspect --format '{{.Id}}' "$i") == "$i" ]] || { echo "inproc-pg.sh: image $i not present" >&2; exit 2; }
done
label=(--label tx2.holder=DX-ERA2)
tag=tx2-dxera2-pg-$$-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
net=$tag-net; pg=$tag-pg
cleanup() { docker rm -f "$pg" > /dev/null 2>&1; docker network rm "$net" > /dev/null 2>&1; rm -rf "$out/src"; }
trap cleanup EXIT
password=$(openssl rand -hex 16)
docker network create "${label[@]}" "$net" > /dev/null || exit 1
docker run -d --pull never "${label[@]}" --name "$pg" --network "$net" -e "POSTGRES_PASSWORD=$password" --memory 1g \
  --tmpfs /var/lib/postgresql/data:rw,size=512m "$pgimage" -c fsync=off -c full_page_writes=off > /dev/null || exit 1
docker inspect --format '{{.Image}}' "$pg" > "$out/pg-image-ran"
for i in $(seq 1 60); do docker exec "$pg" pg_isready -U postgres > /dev/null 2>&1 && break; sleep 1; done
sleep 2
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1
     -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json
     -e "TRIPLEX_ERASURE_JDBC=jdbc:postgresql://$pg:5432/postgres?user=postgres&password=$password"
     -e "TRIPLEX_ERASURE_WRAPPING_KEY=$(openssl rand -base64 32)")
for kv in "$@"; do env+=(-e "$kv"); done
printf '(load-file "/lab/regression.clj") (load-file "/lab/%s") %s\n' "$file" "$form" > "$out/run.clj"
date -u +%Y-%m-%dT%H:%M:%SZ > "$out/started"
docker run --rm --pull never "${label[@]}" --name "$tag-run" --network "$net" --memory 3g --cpus 2 \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
  > "$out/run.log" 2>&1
status=$?
date -u +%Y-%m-%dT%H:%M:%SZ > "$out/ended"
echo "$tag-run $image $(cat "$out/source")" >> "$out/images-ran"
grep -E "^ERA2_W4PG|^FAIL|Exception" "$out/run.log" | cut -c1-2000 | head -30
exit $status
