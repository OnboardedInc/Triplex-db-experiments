#!/usr/bin/env bash
# [DX-ERA3, seventh review] The paired native log (era2/paired.clj and wfix1/regression.clj, both taken from TOOLS_REF)
# on the one branch's head and on the two heads under review, each arm in its own container, and the comparison:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3-paired -- \
#     bash lab/experiments/EXP-DX1/era3/paired7.sh NEW_ABSOLUTE_DIR ONE_REF A_REF B_REF TOOLS_REF
# Arms: one (twice) every option off; A and B every option off, per account (subject check), commit boundary; and the
# workload with a save that says nothing about its frame (PAIRED_SOURCELESS=1) on one, A and B with every option off.
# One ordinary heavy token; every container carries tx2.holder=DX-ERA3.
set -uo pipefail
out=${1:?absolute new output directory}; one=${2:?one}; a=${3:?A}; b=${4:?B}; tools=${5:?tools ref}
[[ $out == /* && ! -e $out ]] || { echo "paired7.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
image=${DX_ERA3_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "paired7.sh: image $image not present" >&2; exit 2; }
mkdir -p "$out/lab"
git -C "$repo" archive "$tools" lab/experiments/EXP-DX1/era2/paired.clj lab/experiments/EXP-DX1/wfix1/regression.clj | tar -x -C "$out/lab"
cp "$out/lab/lab/experiments/EXP-DX1/era2/paired.clj" "$out/lab/lab/experiments/EXP-DX1/wfix1/regression.clj" "$out/lab/"
for pair in one:$one a:$a b:$b; do
  k=${pair%%:*} c=${pair#*:}; mkdir -p "$out/$k"
  git -C "$repo" archive "$c" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/$k"
  git -C "$repo" rev-parse "$c" > "$out/$k/commit"
done
printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/paired.clj") (era2-paired/main)' > "$out/run.clj"
run() { # NAME TREE OPTION [ENV...]
  local name=$1 tree=$2 option=$3; shift 3
  local env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1
             -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
             -e DF01_RECORDED_PAGE=/tmp/recorded-page.json)
  [[ $option == subject || $option == commit ]] && env+=(-e TX2_REMOVAL_PER_ACCOUNT=1 -e TX2_REMOVAL_SUBJECT_CHECK=1)
  [[ $option == commit ]] && env+=(-e TX2_REMOVAL_COMMIT_BOUNDARY=1)
  for kv in "$@"; do env+=(-e "$kv"); done
  docker run --rm --pull never --label tx2.holder=DX-ERA3 --name "tx2-dxera3-paired-$$-$name" --memory 3g --cpus 2 \
    -v "$out/$tree/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/$tree/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/$name.log" 2>&1
  echo "PAIRED7_ARM $name $(grep -c '^ERA2_PAIRED ' "$out/$name.log") lines"
}
run one-1 one off; run one-2 one off
run a-off a off; run a-subject a subject; run a-commit a commit
run b-off b off; run b-subject b subject; run b-commit b commit
run sl-one one off PAIRED_SOURCELESS=1; run sl-a a off PAIRED_SOURCELESS=1; run sl-b b off PAIRED_SOURCELESS=1
echo "$image" > "$out/image"
python3 -I - "$out" <<'PY'
import re, sys, hashlib
out = sys.argv[1]
def f(l, k):
    m = re.search(r':' + k + r' ("[^"]*"|[0-9]+|true|false)', l)
    return m.group(1) if m else None
def arm(name):
    text = open(f"{out}/{name}.log").read().splitlines()
    logs = [l for l in text if l.startswith("ERA2_PAIRED ")]
    reps = [l for l in text if l.startswith("ERA2_PAIRED_REPLIES")]
    return logs, hashlib.md5("\n".join(reps).encode()).hexdigest()[:12], reps
arms = ["one-1", "one-2", "a-off", "a-subject", "a-commit", "b-off", "b-subject", "b-commit", "sl-one", "sl-a", "sl-b"]
data = {a: arm(a) for a in arms}
for a in arms:
    logs, md5, _ = data[a]
    print("PAIRED7", a, "replies-md5", md5)
    for l in logs:
        print("   ", " ".join(f"{k}={f(l, k)}" for k in ["sealed", "datoms", "sha256", "r22-datoms", "sha256-without-r22", "reads"]))
full = lambda a: [(f(l, "sealed"), f(l, "datoms"), f(l, "sha256")) for l in data[a][0]]
wo = lambda a: [(f(l, "sealed"), f(l, "sha256-without-r22"), f(l, "reads"), int(f(l, "datoms") or 0) - int(f(l, "r22-datoms") or 0)) for l in data[a][0]]
ref = full("one-1")
print("PAIRED7_ONE_STABLE", full("one-2") == ref and len(ref) == 2)
for a in ["a-off", "b-off"]:
    print("PAIRED7_EVERY_DATOM", a, "vs one:", "identical" if full(a) == ref else "DIFFERENT", "| replies", "identical" if data[a][1] == data["one-1"][1] else "DIFFERENT")
for a in ["a-subject", "a-commit", "b-subject", "b-commit"]:
    print("PAIRED7_WITHOUT_DECLINE", a, "vs one:", "identical" if wo(a) == wo("one-1") else "DIFFERENT", "| decline datoms", [f(l, "r22-datoms") for l in data[a][0]],
          "| replies", "identical" if data[a][1] == data["one-1"][1] else "DIFFERENT")
case = lambda reps: [re.search(r'\["sourceless-removed" ([0-9]+) ([^\]]*)\]', r).groups() if re.search(r'\["sourceless-removed" ([0-9]+) ([^\]]*)\]', r) else None for r in reps]
for a in ["sl-a", "sl-b"]:
    print("PAIRED7_SOURCELESS", a, "vs one: every datom", "identical" if full(a) == full("sl-one") else "DIFFERENT",
          "| replies", "identical" if data[a][1] == data["sl-one"][1] else "DIFFERENT", "| the case", case(data[a][2]), "one:", case(data["sl-one"][2]))
PY
rm -rf "$out/one/packages" "$out/a/packages" "$out/b/packages"
