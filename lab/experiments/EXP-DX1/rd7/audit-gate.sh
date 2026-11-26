#!/usr/bin/env bash
# [DX-RD7] The writers' audit as a standing gate (the pinned-read review's condition 1, rd6/REVIEW-1.md): one command,
# one exit code, one summary line (DX-RD7_AUDIT_GATE pass|fail). Run on every merge onto the one branch:
#   DOCKER_HOST=<lab VM socket> DX_RD7_IMAGE=<the head's image ID> bash lab/experiments/EXP-DX1/rd7/audit-gate.sh OUT [PRODUCTION_OUT]
# It takes its own ordinary heavy tokens, one at a time (do not wrap it in another): the memory part takes one per
# writer setting; the production gate takes its own through prep1/manage.py.
#   memory: the save line's fuzzer (s5/fuzz.clj) in RD7_SETTINGS (default below) on the head's image, every in-memory
#           scope (control and candidate) audited over its whole log (rd7/clj-run.sh fuzz).
#   stack:  the production gate's PostgreSQL database, audited by the gate itself after its driver (prep1/stack.sh).
#           With PRODUCTION_OUT (a production gate's output directory or log from this head, for example the merge's own
#           production step), its DX-RD7_AUDIT line is read; otherwise the gate is run here (DX_CHK1_HOLDER, default
#           DX-THIN1).
# The rule and its two named exceptions are in rd7/audit.clj. RD7_PLANT=row|position plants the review's break into
# every audited database (proof that the gate fails; never in a gate run).
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new absolute output directory}; production=${2:-}
[[ $out == /* && ! -e $out ]] || { echo "audit-gate.sh: give a new absolute output directory" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo" || exit 2
settings=${RD7_SETTINGS:-server serial import group accounts-serial}
export S5_SEEDS=${S5_SEEDS:-31,32} S5_STEPS=${S5_STEPS:-600} S5_ROUNDS=${S5_ROUNDS:-2} S5_THREADS=${S5_THREADS:-4} \
  S5_PER_THREAD=${S5_PER_THREAD:-60} S5_PROTECTED=${S5_PROTECTED:-unsealed} S5_REMOVALS=${S5_REMOVALS:-1} S5_FAULTS=${S5_FAULTS:-1} \
  S5_VALUE_TYPES=${S5_VALUE_TYPES:-1}
git rev-parse HEAD > "$out/source"
echo "$(date '+%F %T %Z') start settings [$settings] plant [${RD7_PLANT:-}] production [${production:-run here}]" >> "$out/gate.log"
status=0
for s in $settings; do
  extra=(); [[ $s == accounts* ]] && extra=(S5_ACCOUNTS=1 S5_TRANSITION=1)
  env ${extra[@]+"${extra[@]}"} node lab/bin/heavy.mjs --label "DX-RD7-audit-$s" -- bash "$here/clj-run.sh" "$out/memory-$s" fuzz "$s" \
    > "$out/memory-$s.out" 2>&1 || status=1
done
if [[ -z $production ]]; then
  env ${RD7_PLANT:+DX_RD7_PLANT=$RD7_PLANT} DX_CHK1_HOLDER=${DX_CHK1_HOLDER:-DX-THIN1} python3 -B lab/experiments/EXP-DX1/prep1/manage.py "$out/production" production 10 1 1 0 1 \
    > "$out/production.out" 2>&1 || status=1
  production=$out/production
fi
python3 - "$out" "$production" "$status" "$settings" <<'EOF'
import glob, json, os, sys
out, production, status, settings = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4].split()
def audit_lines(paths):
    found = []
    for p in paths:
        with open(p, errors="replace") as f:
            for line in f:
                if line.startswith("DX-RD7_AUDIT "):
                    verdict, _, body = line[len("DX-RD7_AUDIT "):].partition(" ")
                    found.append((verdict, json.loads(body)))
    return found
keys = ["databases", "transactions", "violations", "indexOnlyRetractions", "groupPositionRetractions",
        "groupPositionDuplicates", "groupPositionAssertions", "removalTransactions", "removalSubjectRetractions", "failing"]
memory, ok = {}, True
for s in settings:
    found = audit_lines(glob.glob(os.path.join(out, f"memory-{s}", "fuzz-*.log")))
    fuzz = {}
    for p in glob.glob(os.path.join(out, f"memory-{s}", "fuzz-*.log")):
        for line in open(p, errors="replace"):
            if line.startswith("DX-RD7_FUZZ "):
                fuzz = json.loads(line.split(" ", 1)[1])
    if len(found) != 1:
        memory[s] = {"pass": False, "why": "no audit line"}; ok = False; continue
    verdict, body = found[0]
    passed = verdict == "pass" and fuzz.get("pass") is True
    memory[s] = dict({k: body.get(k) for k in keys}, pass_=passed, s5Differing=fuzz.get("s5Differing"),
                     saves=(fuzz.get("serial") or 0) + (fuzz.get("concurrent") or 0))
    ok = ok and passed
paths = glob.glob(os.path.join(production, "selftest-*.log")) if os.path.isdir(production) else [production]
found = audit_lines(paths)
if len(found) == 1:
    verdict, body = found[0]
    stack = dict({k: body.get(k) for k in keys}, pass_=verdict == "pass", where=body.get("where"))
    ok = ok and verdict == "pass"
else:
    stack = {"pass_": False, "why": f"{len(found)} audit lines in {production}"}; ok = False
ok = ok and status == 0
total = {k: sum((m.get(k) or 0) for m in list(memory.values()) + [stack]) for k in keys}
line = {"pass": ok, "total": total, "memory": memory, "stack": stack, "plant": os.environ.get("RD7_PLANT") or None,
        "source": open(os.path.join(out, "source")).read().strip()}
text = "DX-RD7_AUDIT_GATE " + ("pass " if ok else "fail ") + json.dumps(line, separators=(",", ":")).replace("pass_", "pass")
open(os.path.join(out, "summary.txt"), "w").write(text + "\n")
print(text)
sys.exit(0 if ok else 1)
EOF
code=$?
echo "$(date '+%F %T %Z') end exit $code" >> "$out/gate.log"
exit "$code"
