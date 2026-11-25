#!/usr/bin/env bash
# [DX-ERA4] T1 (era4/DERIVED-COPIES.md section 2): W0's real rules, recorder, settlement and receiver against this
# checkout's gateway on an in-memory Datomic (one container from a pinned runtime image, by ID; the file removal
# authority, sealed; shred grace 0), the client on the Mac. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA4-t1 -- \
#     bash lab/experiments/EXP-DX1/era4/run.sh NEW_ABSOLUTE_DIR ARM
# ARM: off (TX2_DERIVED_SEAL unset on both sides: the failing test) or on. ERA4_SEALED=0: the protected database is
# unsealed (with the option off the derived writers run only there). ERA4_EXTRA_ENV="K=V ..." adds options to
# both sides (every option on together). Diagnostic times only; the counts are the result.
set -uo pipefail
out=${1:?absolute new output directory}; arm=${2:?off or on}
[[ $out == /* && ! -e $out ]] || { echo "run.sh: give a new absolute output directory" >&2; exit 2; }
[[ $arm == off || $arm == on ]] || exit 2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/era4 lab/bench/lib > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"
(cd "$out/src" && find . -type f -name '*.clj' | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-64) > "$out/gateway-source-sha"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/era4/serve.clj" "$out/serve.clj"
image=${DX_ERA4_RUNTIME_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
port=${DX_ERA4_PORT:-18971}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "run.sh: DX_ERA4_RUNTIME_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "run.sh: image $image not present" >&2; exit 2; }
env=(-e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' -e TRIPLEX_ERASURE_DIRECTORY=/out/authority
     -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0)
client=(DATOMIC_URL="http://127.0.0.1:$port" TRIPLEX_DATOMIC_LAYOUT=lean TX2_SETTLE_FRAMES=bytes
        TX2_SETTLE_PRECONDITION=progress)
if [[ $arm == on ]]; then env+=(-e TX2_DERIVED_SEAL=1); client+=(TX2_DERIVED_SEAL=1); fi
for kv in ${ERA4_EXTRA_ENV:-}; do env+=(-e "$kv"); client+=("$kv"); done
name="tx2-dxera4-t1-$$-$arm"
cleanup() {
  touch "$out/run.out/stop"
  docker logs "$name" > "$out/gateway.log" 2>&1 || true
  docker rm -f "$name" > /dev/null 2>&1 || true
  # Throwaway test keys of an in-memory database: keep the listing, never the key bytes.
  if [[ -d $out/run.out/authority ]]; then
    (cd "$out/run.out/authority" && find . -type f | LC_ALL=C sort) > "$out/authority-files-at-end"
    rm -rf "$out/run.out/authority"
  fi
  rm -rf "$out/src"
}
trap cleanup EXIT
started=$(date +%s)
docker run -d --pull never --name "$name" --memory 3g --cpus 2 -p "127.0.0.1:$port:8080" -v "$out/run.out:/out" \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/serve.clj:/opt/serve.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && exec java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/serve.clj' > "$out/container" || exit 1
docker inspect --format '{{.Image}}' "$name" > "$out/image-ran"
[[ $(cat "$out/image-ran") == "$image" ]] || { echo "run.sh: the container ran $(cat "$out/image-ran"), not $image" >&2; exit 3; }
for i in $(seq 1 240); do
  [[ $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/health") == 200 ]] && break
  sleep 1
done
[[ $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/health") == 200 ]] || { echo "run.sh: gateway did not start" >&2; exit 4; }
cd "$repo"
# ERA4_SCRIPT=held.ts: the held reader across a removal paused after its commit (inventory row 19), instead of T1.
env "${client[@]}" ERA4_ARM="$arm" ERA4_SEALED="${ERA4_SEALED:-1}" ERA4_CONTAINER="$name" node --no-warnings \
  --experimental-transform-types lab/experiments/EXP-DX1/era4/"${ERA4_SCRIPT:-derived.ts}" "$out" "$out/run.out" > "$out/derived.log" 2>&1
status=$?
echo "$(( $(date +%s) - started ))" > "$out/seconds"
grep -E '^\{"kind":"(scan|verdict|stream|chain|cost|error|held)' "$out/derived.log" | cut -c1-1200 | tail -60
exit "$status"
