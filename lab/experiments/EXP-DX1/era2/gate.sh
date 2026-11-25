#!/usr/bin/env bash
# [DX-ERA2] The in-process gates (in-memory Datomic, a file removal authority, the gateway's own route handler), one
# ordinary heavy token, no stack:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-gate -- \
#     bash lab/experiments/EXP-DX1/era2/gate.sh NEW_ABSOLUTE_DIR [BASE_COMMIT]
# 1. paired log: era2/paired.clj on the base gateway (BASE_COMMIT, default this branch's base), on this gateway with
#    TX2_REMOVAL_PER_ACCOUNT unset, and with it on but the database never moved: one SHA-256 of the native log each;
# 2. interleavings: era2/gate.clj with the option unset (database-wide), on (database moved per account), and on with
#    TX2_REMOVAL_SUBJECT_CHECK=1 (the removal checks its selection per subject and takes its position at commit);
# 3. the gateway's Clojure suites with the options unset and on.
# Every container runs the pinned runtime image by ID (DX_ERA2_IMAGE_ID); the ID is recorded in OUT/image.
set -uo pipefail
out=${1:?absolute new output directory}; base=${2:-272a1bd66}
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
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era2/paired.clj" "$x/era3/attack.clj" "$x/era3/attack2.clj" "$x/era3/attack3.clj" "$x/era3/attack4.clj" "$out/lab/"
image=${DX_ERA2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "gate.sh: DX_ERA2_IMAGE_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "gate.sh: image $image not present" >&2; exit 2; }
echo "$image" > "$out/image"
status=0
run() { # NAME SOURCE OPTION CLOJURE-FORM
  local name=$1 source=$2 option=$3 form=$4
  printf '%s\n' "$form" > "$out/$name.clj"
  env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1
       -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
       -e DF01_RECORDED_PAGE=/tmp/recorded-page.json)
  [[ $option == on || $option == subject || $option == commit ]] && env+=(-e TX2_REMOVAL_PER_ACCOUNT=1)
  [[ $option == subject || $option == commit ]] && env+=(-e TX2_REMOVAL_SUBJECT_CHECK=1 -e TX2_REMOVAL_TRIES_LOG=1 -e "ERA2_RACES=${ERA2_RACES:-1000}")
  # [DX-ERA2 fourth pass] the commit as the boundary (section 16 of the page)
  [[ $option == commit ]] && env+=(-e TX2_REMOVAL_COMMIT_BOUNDARY=1)
  # a diagnostic run of named gate scenarios only (never a gate result)
  [[ -n ${ERA2_ONLY:-} ]] && env+=(-e "ERA2_ONLY=$ERA2_ONLY")
  [[ $name == era3-* ]] && env+=(-e "ERA3_PHASES=${ERA3_PHASES:-d1 d1t d2 d3 d5 d6 fuzz}" -e "ERA3_N=${ERA3_N:-400}"
                                 -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3_SEED:-7}" -e "ERA3_RUN=gate")
  # [DX-ERA2 third pass] the second review's cases and fuzzer (era3/attack2.clj, era3/REVIEW-2.md)
  [[ $name == era3b-* ]] && env+=(-e "ERA3_PHASES=${ERA3B_PHASES:-e1 e2 e3 e4 e5 e6 e7 e7b e8 fuzz2}" -e "ERA3_N=${ERA3B_N:-400}"
                                  -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3B_SEED:-9}" -e "ERA3_RUN=gate2")
  [[ $name == era3e9-* ]] && env+=(-e "ERA3_PHASES=e9")
  # [DX-ERA2 fourth pass] the third review's cases and fuzzer with a second active gateway (era3/attack3.clj)
  [[ $name == era3c-* ]] && env+=(-e "ERA3_PHASES=${ERA3C_PHASES:-k2 k3 k4 k5 k6 k7 k8 k9 k10 fuzz3}" -e "ERA3_N=${ERA3C_N:-400}"
                                  -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3C_SEED:-11}" -e "ERA3_RUN=gate3")
  # [DX-ERA2 fifth pass] the fourth review's cases and fuzzer (era3/attack4.clj, era3/REVIEW-4.md); each case runs on
  # both boundaries inside one process (its own switch), so the arms are the modes; Q9 and Q10 need the sweep options
  [[ $name == era3d-* ]] && env+=(-e "ERA3_PHASES=${ERA3D_PHASES:-q1 q2 q3 q4 q5 q7 q8 q11 r22 fuzz4}" -e "ERA3_N=${ERA3D_N:-400}"
                                  -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3D_SEED:-13}" -e "ERA3_RUN=gate4")
  [[ $name == era3d-q910-* ]] && env+=(-e "ERA3_PHASES=q9 q10" -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0 -e TX2_ID_LISTS=1 -e TX2_SWEEP=1)
  # database-wide: the Q cases are per-account only and fuzz4 drives per-account completion (the reviewer ran it on the
  # per-account modes only), so this arm is R2-2
  [[ $name == era3d-off ]] && env+=(-e "ERA3_PHASES=r22")
  mkdir -p "$out/$name.out"
  docker run --rm --pull never --name "tx2-dxera2-gate-$$-$name" --memory 3g --cpus 2 -v "$out/$name.out:/out" \
    -v "$out/$source/src:/opt/gateway/src:ro" -v "$out/$source/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/$name.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/$name.log" 2>&1 || status=1
  echo "$name $image" >> "$out/images-ran"
  grep -E "ERA2_|ERA3_SUMMARY|ERA3_VIOLATION|SUITES|FAIL|ERROR in|Exception" "$out/$name.log" | cut -c1-2000 | head -40
  # the review's attacks report violations in their summary line and exit 0
  # E9 (copies recorded before a removal) is a known unmet requirement owned by another builder: reported, not counted
  if [[ $name == era3-* || $name == era3b-* || $name == era3c-* || $name == era3d-* ]] && ! grep -q 'ERA3_SUMMARY.*:violations 0,' "$out/$name.log"; then status=1; fi
}
phases=${ERA2_GATE_PHASES:-paired gate era3 suites b2}
paired='(load-file "/lab/regression.clj") (load-file "/lab/paired.clj") (era2-paired/main)'
if [[ $phases == *paired* ]]; then
  run paired-base base off "$paired"; run paired-base2 base off "$paired"
  run paired-off this off "$paired"; run paired-on this subject "$paired"; run paired-commit this commit "$paired"
fi
gate='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (era2-gate/main)'
if [[ $phases == *gate* ]]; then
  [[ $phases == *gate-subject-only* ]] || { run gate-off this off "$gate"; run gate-on this on "$gate"; }
  run gate-subject this subject "$gate"
  run gate-commit this commit "$gate"
fi
# [DX-ERA2 fix pass] the independent review's attacks and fuzzer (era3/attack.clj, era3/REVIEW.md) on both settings
attack='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (era3-attack/main)'
if [[ $phases == *era3* ]]; then run era3-on this on "$attack"; run era3-subject this subject "$attack"; fi
attack2='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (era3-attack2/main)'
if [[ $phases == *era3* ]]; then
  run era3b-on this on "$attack2"; run era3b-subject this subject "$attack2"; run era3e9-on this on "$attack2"
  run era3-commit this commit "$attack"; run era3b-commit this commit "$attack2"
  attack3='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (era3-attack3/main)'
  run era3c-on this on "$attack3"; run era3c-subject this subject "$attack3"; run era3c-commit this commit "$attack3"
  attack4='(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (era3-attack4/main)'
  run era3d-off this off "$attack4"; run era3d-on this on "$attack4"; run era3d-subject this subject "$attack4"
  run era3d-q910-on this on "$attack4"
fi
suites="triplex.gateway.selftest triplex.gateway.group-test triplex.gateway.ids-test triplex.gateway.feed-test triplex.gateway.pinned-test triplex.gateway.recent-test triplex.gateway.cache-key-test triplex.gateway.commit-order-test triplex.gateway.sweep-gates-test triplex.gateway.trace-test"
for arm in base:off this:off this:subject this:commit; do
  [[ $phases == *suites* ]] || continue
  source=${arm%%:*} option=${arm##*:}
  run "suites-$source-$option" "$source" "$option" "(require 'clojure.test) (def nss (quote [$suites])) (apply require nss)
(let [r (apply clojure.test/run-tests nss)] (println \"ERA2_SUITES $option\" (pr-str (select-keys r [:test :pass :fail :error])))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))"
done
if [[ $phases == *paired* ]]; then
for arm in base base2 off on commit; do grep -h "^ERA2_PAIRED " "$out/paired-$arm.log" | sed "s/^/$arm /"; done > "$out/paired.txt"
python3 - "$out/paired.txt" <<'PY' || status=1
import sys, re
rows = [l.split(" ", 2) for l in open(sys.argv[1]).read().splitlines()]
by = {}
for arm, _, rest in rows: by.setdefault(arm, []).append(rest)
same = len(by.get("base", [])) == 2 and by.get("base") == by.get("base2") == by.get("off") == by.get("on") == by.get("commit")
print("ERA2_PAIRED_LOGS_EVERY_DATOM", "identical" if same else "different (see the next line)", {k: len(v) for k, v in by.items()})
for arm, v in by.items(): print(arm, *v, sep="\n  ")
# [DX-ERA2 fifth pass] R2-2 is fixed on every mode (the coordinator's ask), so the import replay the workload sends
# with no frame source is declined AND its command recorded, on this gateway with the option off too: 11 datoms (two
# attributes, one record). The gate: every arm identical once exactly those datoms are left out, none on the base,
# and the same 11 on every arm of this gateway.
def key(r):
    d = dict(re.findall(r':([a-z0-9-]+) ("[^"]*"|[0-9]+|true|false)', r))
    return (d.get("sealed"), d.get("sha256-without-r22"), d.get("reads"), int(d.get("datoms", 0)) - int(d.get("r22-datoms", 0)))
def r22(r): return int(dict(re.findall(r':([a-z0-9-]+) ("[^"]*"|[0-9]+|true|false)', r)).get("r22-datoms", "-1"))
keys = {arm: [key(r) for r in v] for arm, v in by.items()}
same2 = len(keys.get("base", [])) == 2 and all(keys.get(a) == keys["base"] for a in ["base2", "off", "on", "commit"])
counts = {arm: [r22(r) for r in v] for arm, v in by.items()}
expect = all(counts.get(a) == [0, 0] for a in ["base", "base2"]) and all(counts.get(a) == [11, 11] for a in ["off", "on", "commit"])
print("ERA2_PAIRED_LOGS_WITHOUT_R22", "identical" if same2 else "DIFFERENT", "r22 datoms", counts, "as expected" if expect else "UNEXPECTED")
sys.exit(0 if (same2 and expect) else 1)
PY
for arm in base base2 off on commit; do grep -h "^ERA2_PAIRED_REPLIES" "$out/paired-$arm.log" | md5 | sed "s/^/replies $arm /"; done
fi
# [DX-ERA2 fifth pass] B2: a published removal's key must be deleted within its grace whatever else is pending
# (era2/b2.clj in every mode, and with the shred worker's completion), on this checkout's gateway source
if [[ $phases == *b2* ]]; then
  bash "$x/era2/b2.sh" "$out/b2" worktree "off on subject commit off-worker subject-worker" || status=1
  grep -h "ERA2_B2_SUMMARY" "$out/b2"/b2-*.log
fi
rm -rf "$out/this/src" "$out/base/src"
exit "$status"
