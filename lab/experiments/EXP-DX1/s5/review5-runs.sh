#!/usr/bin/env bash
# [DX-S5 fifth review] Every counted run of the fifth review, on the reviewer's image of the commit checked out
# (s5/image3.sh), by image ID, each through lab/bin/heavy.mjs; at most two at a time (two lanes). Output under OUT.
#   DOCKER_HOST=<lab VM socket> DX_S5_IMAGE=<tag> bash lab/experiments/EXP-DX1/s5/review5-runs.sh OUT LANE [SETTING]
# LANE a: attack5, attack4 and attack3 on the head, the native logs and identities of the head, the base, the one
#         branch and the trial merge, the window stacks and the restart-read stack. LANE b: the fuzzer, one setting.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?output directory}; lane=${2:?lane a or b}
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
mkdir -p "$out"
heavy() { local label=$1; shift; node lab/bin/heavy.mjs --label "DX-S5R5-$label" --poll-ms 250 -- "$@"; }
clj() { heavy "$1" bash lab/experiments/EXP-DX1/s5/clj-run3.sh "$out/$1" "$2" "$3"; }
step() { echo "DX-S5R5_STEP $1 $(date -u +%T)"; }
case $lane in
  a)
    step attack5; clj attack5 attack5 "accounts-on accounts-on-nopred accounts-on-general accounts-on-serial group-accounts"
    step attack4; clj attack4 attack4 "accounts-on accounts-on-nopred accounts-on-general accounts-on-general-nopred group-accounts"
    step attack3; clj attack3 attack3 "accounts-on accounts-on-nopred accounts-on-serial accounts-on-general accounts-on-general-nopred group-accounts accounts-on-import"
    step log
    for b in head base int1 merged5; do S5_BUILD=$b clj log-$b logdigest "idents-base idents-server"; done
    step idents
    for b in head base int1 merged5; do
      S5_BUILD=$b clj idents-$b idents "idents-base idents-server idents-server-wide idents-serial-retire idents-owner-head idents-load-profile"
    done
    step stacks
    heavy stack-window5 bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-window5" stack6-run.sh
    S5_STACK_EXTRA="TX2_PREDECESSOR_LOOKUP=0 TX2_ACCOUNT_IDS_NOPRED_FOR_TESTS=1" heavy stack-window5-nopred bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-window5-nopred" stack6-run.sh
    S5_ROUNDS=6 heavy stack-restart-read bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-restart-read" stack7-run.sh ;;
  b)
    # One fuzz setting per call, the fourth review's seeds: faults, a second account, the transition at one third of
    # the steps, stale planners, an older build reopening (S5_OLD_REOPEN, with the builder's adaptation of old-open!),
    # removals alone and racing a save with the SDK's replay, protected values unsealed.
    setting=${3:?fuzz setting}
    step fuzz-$setting
    S5_SEEDS=${FUZZ_SEEDS:-731,732,733,734,735,736,737,738,739,740,741} S5_STEPS=3000 S5_FAULTS=1 S5_ACCOUNTS=1 S5_TRANSITION=1 \
      S5_OLD_REOPEN=1 S5_PROTECTED=unsealed S5_REMOVALS=1 clj fuzz-$setting fuzz "$setting" ;;
esac
echo "DX-S5R5_LANE_DONE $lane $(date -u +%T)"
