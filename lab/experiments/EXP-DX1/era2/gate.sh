#!/usr/bin/env bash
# [DX-ERA2] The in-process gates (in-memory Datomic, a file removal authority, the gateway's own route handler), one
# ordinary heavy token, no stack:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-gate -- \
#     bash lab/experiments/EXP-DX1/era2/gate.sh NEW_ABSOLUTE_DIR [BASE_COMMIT]
# 1. paired log: era2/paired.clj on the base gateway (BASE_COMMIT, default this branch's base), on this gateway with
#    TX2_REMOVAL_PER_ACCOUNT unset, and with it on but the database never moved: one SHA-256 of the native log each;
# 2. interleavings: era2/gate.clj with the option unset (database-wide) and on (database moved per account);
# 3. the gateway's Clojure suites with the option unset and on.
set -uo pipefail
out=${1:?absolute new output directory}; base=${2:-3e3e652b9cd486f9ae16b90f22fd1c045d5230b3}
[[ $out == /* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/this" "$out/base" "$out/lab"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/era2 > "$out/dirty"
# Private copies, so later edits in the worktree cannot reach a running gate.
cp -R "$repo/packages/datomic/gateway/src" "$out/this/src"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/this/codec-spec.json"
git -C "$repo" archive "$base" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/base"
mv "$out/base/packages/datomic/gateway/src" "$out/base/src"; cp "$out/base/packages/datomic/src/codec-spec.json" "$out/base/codec-spec.json"
rm -rf "$out/base/packages"; echo "$base" > "$out/base/commit"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era2/paired.clj" "$out/lab/"
image=${DX_ERA2_IMAGE:-tx2-datomic:1.0.7745-da00}
status=0
run() { # NAME SOURCE OPTION CLOJURE-FORM
  local name=$1 source=$2 option=$3 form=$4
  printf '%s\n' "$form" > "$out/$name.clj"
  env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1
       -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
       -e DF01_RECORDED_PAGE=/tmp/recorded-page.json)
  [[ $option == on ]] && env+=(-e TX2_REMOVAL_PER_ACCOUNT=1)
  mkdir -p "$out/$name.out"
  docker run --rm --pull never --name "tx2-dxera2-gate-$$-$name" --memory 3g --cpus 2 -v "$out/$name.out:/out" \
    -v "$out/$source/src:/opt/gateway/src:ro" -v "$out/$source/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/$name.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/$name.log" 2>&1 || status=1
  grep -E "ERA2_|SUITES|FAIL|ERROR in|Exception" "$out/$name.log" | cut -c1-2000 | head -40
}
phases=${ERA2_GATE_PHASES:-paired gate suites}
paired='(load-file "/lab/regression.clj") (load-file "/lab/paired.clj") (era2-paired/main)'
if [[ $phases == *paired* ]]; then
  run paired-base base off "$paired"; run paired-base2 base off "$paired"
  run paired-off this off "$paired"; run paired-on this on "$paired"
fi
gate='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (era2-gate/main)'
if [[ $phases == *gate* ]]; then run gate-off this off "$gate"; run gate-on this on "$gate"; fi
suites="triplex.gateway.selftest triplex.gateway.group-test triplex.gateway.ids-test triplex.gateway.feed-test triplex.gateway.pinned-test triplex.gateway.recent-test triplex.gateway.cache-key-test triplex.gateway.commit-order-test triplex.gateway.sweep-gates-test triplex.gateway.trace-test"
for arm in base:off this:off this:on; do
  [[ $phases == *suites* ]] || continue
  source=${arm%%:*} option=${arm##*:}
  run "suites-$source-$option" "$source" "$option" "(require 'clojure.test) (def nss (quote [$suites])) (apply require nss)
(let [r (apply clojure.test/run-tests nss)] (println \"ERA2_SUITES $option\" (pr-str (select-keys r [:test :pass :fail :error])))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))"
done
if [[ $phases == *paired* ]]; then
for arm in base base2 off on; do grep -h "^ERA2_PAIRED " "$out/paired-$arm.log" | sed "s/^/$arm /"; done > "$out/paired.txt"
python3 - "$out/paired.txt" <<'PY' || status=1
import sys, re
rows = [l.split(" ", 2) for l in open(sys.argv[1]).read().splitlines()]
by = {}
for arm, _, rest in rows: by.setdefault(arm, []).append(rest)
same = len(by.get("base", [])) == 2 and by.get("base") == by.get("base2") == by.get("off") == by.get("on")
print("ERA2_PAIRED_LOGS", "identical" if same else "DIFFERENT", {k: len(v) for k, v in by.items()})
for arm, v in by.items(): print(arm, *v, sep="\n  ")
sys.exit(0 if same else 1)
PY
for arm in base base2 off on; do grep -h "^ERA2_PAIRED_REPLIES" "$out/paired-$arm.log" | md5 | sed "s/^/replies $arm /"; done
fi
rm -rf "$out/this/src" "$out/base/src"
exit "$status"
