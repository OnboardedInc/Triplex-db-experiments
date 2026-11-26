#!/usr/bin/env bash
# [DX-ERA6] The save line's in-memory gates on a gateway source (this checkout's HEAD, or REF), one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA6-save-line -- \
#     bash lab/experiments/EXP-DX1/era6/save-line-gates.sh NEW_ABSOLUTE_DIR [REF]
# Phases (ERA6_PHASES, default "attack3 attack2 era outcome ids"), the settings of s5/clj-run3.sh and s6/clj-run.sh:
#   attack3  s5/attack3_gate.clj (the save line's third review) in its 7 settings; RULE=1 adds
#            TX2_REMOVAL_REPLAY_RULE=1 (the merged replay rule on)
#   attack2  s5/attack_gate.clj + s5/attack2_gate.clj (the second review's tests) in server, accounts-on, accounts-on-general
#   era      s5/attack3_era.clj (the removal branch's rule) with the replay rule on, database-wide and per account
#   outcome  s6/outcome_gate.clj in server, general, accounts-on
#   ids      s6/stored_ids_gate.clj (one stored form per ID) in accounts-on, accounts-on-serial, accounts-on-general,
#            group-accounts
# The source and the test files are archived from the commit (nothing mounted from the working tree); every container
# runs the runtime image by ID with the label tx2.holder=DX-ERA2.
set -uo pipefail
out=${1:?absolute new output directory}; ref=${2:-HEAD}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
mkdir -p "$out/tree"
commit=$(git -C "$repo" rev-parse "$ref^{commit}"); echo "$commit" > "$out/source"
git -C "$repo" archive "$commit" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/tree"
# the tests always come from this checkout's HEAD (a REF older than the tests runs the same tests)
mkdir -p "$out/tests"; git -C "$repo" archive HEAD lab/experiments/EXP-DX1 | tar -x -C "$out/tests"
git -C "$repo" rev-parse HEAD > "$out/tests-commit"
image=${ERA6_IMAGE_ID:-$(docker image inspect -f '{{.Id}}' tx2-datomic:dx-s4-runtime)}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "image?" >&2; exit 2; }
echo "$image" > "$out/image"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
setting() {
  case $1 in
    server) echo "$base" ;;
    serial) echo "$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1" ;;
    general) echo "TX2_SUBJECT_SAVE=0" ;;
    accounts-on) echo "$base TX2_ACCOUNT_CLAIMS=1" ;;
    accounts-on-serial) echo "$base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1" ;;
    accounts-on-general) echo "TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1" ;;
    accounts-on-nopred) echo "$base TX2_ACCOUNT_CLAIMS=1 TX2_PREDECESSOR_LOOKUP=0" ;;
    accounts-on-general-nopred) echo "TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1 TX2_PREDECESSOR_LOOKUP=0" ;;
    accounts-on-import) echo "$base TX2_ACCOUNT_CLAIMS=1 TX2_IMPORT_PIPELINE=1" ;;
    group-accounts) echo "$base TX2_ACCOUNT_CLAIMS=1 TX2_GROUP_COMMIT=1" ;;
    era-server) echo "TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_REMOVAL_REPLAY_RULE=1" ;;
    era-per-account) echo "TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_REMOVAL_PER_ACCOUNT=1" ;;
    *) return 1 ;;
  esac
}
status=0
run() { # MODE SETTING EXTRA-ENV FILES EXPR
  local mode=$1 s=$2 extra=$3 files=$4 expr=$5 envs=() group=0
  local line; line=$(setting "$s") || { echo "setting $s?" >&2; exit 2; }
  for kv in $line $extra; do envs+=(-e "$kv"); done
  docker run --rm --name "tx2-dxera2-sl-$$-$mode-$s" --label tx2.holder=DX-ERA2 --pull never --memory 3g --cpus 2 \
    -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-era6 "${envs[@]}" \
    -v "$out/tree/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/tree/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$out/tests/lab/experiments/EXP-DX1:/exp:ro" --entrypoint /bin/bash "$image" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj $files -e '$expr'" \
    > "$out/$mode-$s.log" 2>&1 || status=1
  echo "$mode $s: $(grep -E '^DX-S[56](R2|R3)?_RESULT ' "$out/$mode-$s.log" | tail -1 | cut -c1-300 || echo 'no summary')"
}
phases=${ERA6_PHASES:-attack3 attack2 era outcome ids}
s5="-i /exp/s5/fuzz.clj"
rule=; [[ ${RULE:-0} == 1 ]] && rule="TX2_REMOVAL_REPLAY_RULE=1"
for p in $phases; do
  case $p in
    attack3) for s in accounts-on accounts-on-nopred accounts-on-serial accounts-on-general accounts-on-general-nopred group-accounts accounts-on-import; do
               run attack3 "$s" "$rule" "$s5 -i /exp/s5/attack3_gate.clj" "(s5-attack3/main)"; done ;;
    attack2) for s in server accounts-on accounts-on-general; do run attack2 "$s" "$rule" "$s5 -i /exp/s5/attack_gate.clj -i /exp/s5/attack2_gate.clj" "(s5-attack2/main)"; done ;;
    era) for s in era-server era-per-account; do run era "$s" "" "-i /exp/s5/attack3_era.clj" "(s5-attack3-era/main)"; done ;;
    outcome) for s in server general accounts-on; do run outcome "$s" "$rule" "$s5 -i /exp/s6/outcome_gate.clj" "(s6-outcome/main)"; done ;;
    ids) for s in accounts-on accounts-on-serial accounts-on-general group-accounts; do run ids "$s" "$rule" "$s5 -i /exp/s6/stored_ids_gate.clj" "(s6-ids/main)"; done ;;
  esac
done
# [DX-ERA6 eighth pass] the gates pass only when exactly the tests listed in era6/expected-save-line.json fail, each
# with the review's words or marked as a finding (era6/expected_save_line.py); a docker or JVM failure still fails
python3 "$(cd "$(dirname "$0")" && pwd)/expected_save_line.py" "$out" "${RULE:-0}" | tee "$out/expected.txt"
expected_status=${PIPESTATUS[0]}
if grep -q "SAVE_LINE_EXPECTED OK" "$out/expected.txt" && [[ $expected_status == 0 ]]; then
  # every failing exit was a listed test failure: clojure.test exits 1 when any test fails
  status=0
else status=1; fi
rm -rf "$out/tree" "$out/tests"
echo "ERA6_SAVE_LINE_EXIT $status"
exit "$status"
