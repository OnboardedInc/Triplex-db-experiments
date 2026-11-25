#!/usr/bin/env bash
# [DX-ERA3] The review's in-process attacks and schedule fuzzer (era3/attack.clj): one container from the pinned
# runtime image (by ID), an in-memory Datomic, a file removal authority; no stack. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3 -- \
#     bash lab/experiments/EXP-DX1/era3/run.sh NEW_ABSOLUTE_DIR MODE ["PHASES"]
# MODE: off (database-wide, today's rule), on (per account, head check), subject (per account, subject check).
# PHASES: any of d1 d2 d3 d4 d5 fuzz (default all). Passed through: ERA3_N, ERA3_BLOCK, ERA3_SEED, ERA3_RUN, ERA3_SEALED.
# ERA3_MAIN=2: the second review's cases instead (era3/attack2.clj): e1 e2 e3 e4 e5 e6 e7 e7b e8 e9 fuzz2 bodies2.
# ERA3_MAIN=3: the third review's cases (era3/attack3.clj): k2 k3 k4 k5 k6 k7 k8 k9 k10 k12 fuzz3.
# ERA3_MAIN=4: the fourth review's cases (era3/attack4.clj): q1 q2 q3 q4 q5 q7 q8 q9 q10 q11 r22 fuzz4.
# ERA3_MAIN=5: the fifth review's cases (era3/attack5.clj): w1 w2 w3 w4 p1 p2 c1 z s t fuzz5 (ERA3_BOUNDARY log, commit or move).
# ERA3_MAIN=6: the sixth review's cases (era3/attack6.clj): a1 a2 a3 b1 b2 c d g1 g2 f bodies6.
# ERA3_MAIN=7: [DX-ERA2 seventh pass] fuzz7, fuzz5 with a policy event after each schedule (era3/attack7.clj).
# ERA3_MAIN=r7: the seventh review's cases on the removal branch (era3/review7.clj): r1 r2 r3 r4 r5 (ERA3_PG=1 for
# the PostgreSQL authority). ERA3_MAIN=r7b: its cases on the reconciled branch (era3/review7b.clj, ERA3_TESTS_REF=the
# commit whose s5/ and w2/ helpers it loads). ERA3_MAIN=s5a3: the save line's s5/attack3_gate.clj (S5_ONLY selects).
# Every container carries the label tx2.holder=DX-ERA3 (ERA3_HOLDER names another holder).
# ERA3_SOURCE: a checkout whose gateway source runs (default this one), e.g. a local merge with another branch.
# ERA3_SOURCE_REF: a commit whose gateway source runs instead, archived from this checkout (no second checkout).
set -uo pipefail
out=${1:?absolute new output directory}; mode=${2:?off, on or subject}; phases=${3:-d1 d2 d3 d4 d5 fuzz}
[[ $out == /* && ! -e $out ]] || { echo "run.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
source_repo=${ERA3_SOURCE:-$repo}
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/tests"
if [[ -n ${ERA3_SOURCE_REF:-} ]]; then
  # ERA3_SOURCE_REF: run another commit's gateway source (e.g. the builder's newer head), archived from this checkout
  git -C "$repo" rev-parse "$ERA3_SOURCE_REF^{commit}" > "$out/source"
  : > "$out/dirty"
  mkdir -p "$out/refsrc"
  git -C "$repo" archive "$ERA3_SOURCE_REF" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/refsrc"
  cp -R "$out/refsrc/packages/datomic/gateway/src/." "$out/src/"
  cp "$out/refsrc/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
  rm -rf "$out/refsrc"
else
  git -C "$source_repo" rev-parse HEAD > "$out/source"
  git -C "$source_repo" status --porcelain -- packages/datomic/gateway > "$out/dirty"
  cp -R "$source_repo/packages/datomic/gateway/src/." "$out/src/"
  cp "$source_repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
fi
# ERA3_PATCH=1: apply the review's proposed fix (era3/fix-proposal.py) to this private copy only.
if [[ ${ERA3_PATCH:-0} == 1 ]]; then python3 "$x/era3/fix-proposal.py" "$out/src" > "$out/patch.log" || exit 2; fi
echo "patch=${ERA3_PATCH:-0}" > "$out/patched"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/era3/attack2.clj" "$x/era3/attack3.clj" "$x/era3/attack4.clj" "$x/era3/attack5.clj" "$x/era3/attack6.clj" "$x/era3/attack7.clj" "$x/era3/review7.clj" "$x/era3/review7b.clj" "$out/lab/"
# ERA3_TESTS_REF: the save line's test helpers (s5/, w2/) archived from that commit, for review7b.clj (Part B)
if [[ -n ${ERA3_TESTS_REF:-} ]]; then
  git -C "$repo" archive "$ERA3_TESTS_REF" lab/experiments/EXP-DX1/s5 lab/experiments/EXP-DX1/w2 | tar -x -C "$out/lab"
  cp "$out/lab/lab/experiments/EXP-DX1/s5/fuzz.clj" "$out/lab/lab/experiments/EXP-DX1/w2/wide_gate.clj" "$out/lab/lab/experiments/EXP-DX1/s5/attack3_gate.clj" "$out/lab/"
  echo "$ERA3_TESTS_REF" > "$out/tests-ref"
fi
image=${DX_ERA3_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "run.sh: DX_ERA3_IMAGE_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "run.sh: image $image not present" >&2; exit 2; }
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "ERA3_PHASES=$phases"
     -e "ERA3_SEALED=${ERA3_SEALED:-0}" -e "ERA3_N=${ERA3_N:-200}" -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3_SEED:-1}" -e "ERA3_RUN=${ERA3_RUN:-r0}" -e "ERA3_BOUNDARY=${ERA3_BOUNDARY:-log}" -e "ERA3_D_NS=${ERA3_D_NS:-0 300 1200}")
# ERA3_PG=1: the PostgreSQL removal authority (a postgres container by image ID on a network of its own, data on a
# tmpfs, fsync off; a random password and wrapping key, never written), else the file authority
net_args=()
if [[ ${ERA3_PG:-0} == 1 ]]; then
  pgimage=${DX_ERA3_PG_ID:-sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32}
  [[ $(docker image inspect --format '{{.Id}}' "$pgimage") == "$pgimage" ]] || { echo "run.sh: image $pgimage not present" >&2; exit 2; }
  pgtag=tx2-dxera3-pg-$$; password=$(openssl rand -hex 16)
  docker network create --label tx2.holder=DX-ERA3 "$pgtag-net" > /dev/null || exit 1
  docker run -d --pull never --label tx2.holder=DX-ERA3 --name "$pgtag" --network "$pgtag-net" -e "POSTGRES_PASSWORD=$password" --memory 1g \
    --tmpfs /var/lib/postgresql/data:rw,size=512m "$pgimage" -c fsync=off -c full_page_writes=off > /dev/null || exit 1
  trap 'docker rm -f "$pgtag" > /dev/null 2>&1; docker network rm "$pgtag-net" > /dev/null 2>&1' EXIT
  for i in $(seq 1 60); do docker exec "$pgtag" pg_isready -U postgres > /dev/null 2>&1 && break; sleep 1; done; sleep 2
  docker inspect --format '{{.Image}}' "$pgtag" > "$out/pg-image-ran"
  env+=(-e "TRIPLEX_ERASURE_JDBC=jdbc:postgresql://$pgtag:5432/postgres?user=postgres&password=$password"
        -e "TRIPLEX_ERASURE_WRAPPING_KEY=$(openssl rand -base64 32)")
  net_args=(--network "$pgtag-net")
else
  env+=(-e TRIPLEX_ERASURE_DIRECTORY=/tmp/era3-authority)
fi
[[ $mode == on || $mode == subject ]] && env+=(-e TX2_REMOVAL_PER_ACCOUNT=1)
[[ $mode == subject ]] && env+=(-e TX2_REMOVAL_SUBJECT_CHECK=1)
[[ -n ${ERA3_EXTRA_ENV:-} ]] && for kv in $ERA3_EXTRA_ENV; do env+=(-e "$kv"); done
# ERA3_MAIN=2: the second review's attacks (era3/attack2.clj), loaded after the first review's.
if [[ ${ERA3_MAIN:-1} == r7 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (load-file "/lab/attack6.clj") (load-file "/lab/review7.clj") (era3-review7/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == r7b ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/wide_gate.clj") (load-file "/lab/fuzz.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (load-file "/lab/review7b.clj") (era3-review7b/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == s5a3 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/wide_gate.clj") (load-file "/lab/fuzz.clj") (load-file "/lab/attack3_gate.clj") (s5-attack3/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 7 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (load-file "/lab/attack6.clj") (load-file "/lab/attack7.clj") (era3-attack7/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 6 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (load-file "/lab/attack6.clj") (era3-attack6/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 5 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (era3-attack5/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 4 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (era3-attack4/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 3 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (era3-attack3/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 2 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (era3-attack2/main)' > "$out/run.clj"
else
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (era3-attack/main)' > "$out/run.clj"
fi
name="tx2-dxera3-$$-$mode"
started=$(date +%s)
docker run -d --pull never --name "$name" --label "tx2.holder=${ERA3_HOLDER:-DX-ERA3}" ${net_args[@]+"${net_args[@]}"} --memory 3g --cpus 2 -v "$out/run.out:/out" \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' > "$out/container" || exit 1
# The image this container actually ran, read back from the container itself.
docker inspect --format '{{.Image}}' "$name" > "$out/image-ran"
status=$(docker wait "$name")
docker logs "$name" > "$out/run.log" 2>&1
docker rm "$name" > /dev/null
echo "$(( $(date +%s) - started ))" > "$out/seconds"
[[ $(cat "$out/image-ran") == "$image" ]] || { echo "run.sh: the container ran $(cat "$out/image-ran"), not $image" >&2; status=3; }
grep -E "^ERA3_(SUMMARY|TALLY|PROGRESS)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-1500 | tail -60
rm -rf "$out/src"
exit "$status"
