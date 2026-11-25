#!/usr/bin/env bash
# [DX-B2R] Run one in-process Clojure file of this folder against a gateway source, on the file or PostgreSQL removal
# authority, one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-B2R-run -- \
#     bash lab/experiments/EXP-DX1/b2r/run.sh NEW_ABSOLUTE_DIR REF file|pg FILE.clj 'FORM' [ENV=VALUE ...]
# REF: `worktree` (this checkout's gateway files) or a commit. FORM: what to evaluate after loading wfix1/regression.clj
# and FILE.clj, for example '(b2r-fuzz/main)'. Every container carries the label tx2.holder=DX-B2R and runs by image ID
# (DX_B2_IMAGE_ID, the runtime image b2-keys/b2.sh pins). The file authority lives on a tmpfs; the PostgreSQL authority
# is a postgres container (image by ID) on a network of its own, data on a tmpfs, fsync off (correctness only: the
# authority still asks for synchronous commit), a throwaway password and wrapping key never written to disk.
set -uo pipefail
out=${1:?absolute new output directory}; ref=${2:?worktree or a commit}; authority=${3:?file or pg}
file=${4:?clj file in b2r/}; form=${5:?form to evaluate}; shift 5
[[ $out == /* && ! -e $out ]] || { echo "run.sh: give a new absolute output directory" >&2; exit 2; }
[[ $authority == file || $authority == pg ]] || { echo "run.sh: authority is file or pg" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab"
if [[ $ref == worktree ]]; then
  git -C "$repo" rev-parse HEAD > "$out/source"
  git -C "$repo" status --porcelain -- packages/datomic/gateway > "$out/dirty"
  cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
else
  git -C "$repo" rev-parse "$ref" > "$out/source"
  mkdir -p "$out/tmp"; git -C "$repo" archive "$ref" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/tmp"
  cp -R "$out/tmp/packages/datomic/gateway/src/." "$out/src/"; cp "$out/tmp/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"; rm -rf "$out/tmp"
fi
cp "$x/wfix1/regression.clj" "$x/b2r/$file" "$out/lab/"
image=${DX_B2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
pgimage=${DX_B2_PG_ID:-sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "run.sh: image $image not present" >&2; exit 2; }
label=(--label tx2.holder=DX-B2R)
tag=tx2-dxb2r-$$-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
net=; pg=
cleanup() {
  [[ -n $pg ]] && docker rm -f "$pg" > /dev/null 2>&1
  [[ -n $net ]] && docker network rm "$net" > /dev/null 2>&1
  rm -rf "$out/src"
}
trap cleanup EXIT
env=(-e TRIPLEX_ERASURE_DIRECTORY=/tmp/b2r-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "B2R_SOURCE=$(cut -c1-9 "$out/source")")
for kv in "$@"; do env+=(-e "$kv"); done
netargs=()
if [[ $authority == pg ]]; then
  [[ $(docker image inspect --format '{{.Id}}' "$pgimage") == "$pgimage" ]] || { echo "run.sh: image $pgimage not present" >&2; exit 2; }
  net=$tag-net; pg=$tag-pg; password=$(openssl rand -hex 16)
  docker network create "${label[@]}" "$net" > /dev/null || exit 1
  docker run -d --pull never "${label[@]}" --name "$pg" --network "$net" -e "POSTGRES_PASSWORD=$password" --memory 1g \
    --tmpfs /var/lib/postgresql/data:rw,size=512m "$pgimage" -c fsync=off -c full_page_writes=off > /dev/null || exit 1
  docker inspect --format '{{.Image}}' "$pg" > "$out/pg-image-ran"
  for i in $(seq 1 60); do docker exec "$pg" pg_isready -U postgres > /dev/null 2>&1 && break; sleep 1; done
  sleep 2
  env+=(-e "TRIPLEX_ERASURE_JDBC=jdbc:postgresql://$pg:5432/postgres?user=postgres&password=$password"
        -e "TRIPLEX_ERASURE_WRAPPING_KEY=$(openssl rand -base64 32)")
  netargs=(--network "$net")
fi
printf '(load-file "/lab/regression.clj") (load-file "/lab/%s") %s\n' "$file" "$form" > "$out/run.clj"
date -u +%Y-%m-%dT%H:%M:%SZ > "$out/started"
docker run --rm --pull never "${label[@]}" --name "$tag-run" ${netargs[@]+"${netargs[@]}"} --memory 3g --cpus 2 \
  --tmpfs /tmp/b2r-authority:rw,size=256m \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
  > "$out/run.log" 2>&1
status=$?
date -u +%Y-%m-%dT%H:%M:%SZ > "$out/ended"
echo "$tag-run $image $authority $(cat "$out/source")" >> "$out/images-ran"
grep -E "^B2R_|^FAIL|Exception" "$out/run.log" | cut -c1-2500 | head -30
exit $status
