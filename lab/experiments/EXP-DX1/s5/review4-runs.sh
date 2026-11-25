#!/usr/bin/env bash
# [DX-S5 fourth review] Every counted run of the fourth review, on the reviewer's image of the commit checked out
# (s5/image3.sh), by image ID, each through lab/bin/heavy.mjs; at most two at a time (two lanes). Output under OUT.
#   DOCKER_HOST=<lab VM socket> DX_S5_IMAGE=<tag> bash lab/experiments/EXP-DX1/s5/review4-runs.sh OUT LANE [SETTING]
# LANE a: attack4, attack3 on the head, attack3 r22 on the removal branch and the trial merge, logs and identities,
#         the stacks. LANE b: the fuzzer.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?output directory}; lane=${2:?lane a or b}
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
mkdir -p "$out"
heavy() { local label=$1; shift; node lab/bin/heavy.mjs --label "DX-S5R4-$label" --poll-ms 250 -- "$@"; }
clj() { heavy "$1" bash lab/experiments/EXP-DX1/s5/clj-run3.sh "$out/$1" "$2" "$3"; }
step() { echo "DX-S5R4_STEP $1 $(date -u +%T)"; }
case $lane in
  a)
    step attack4; clj attack4 attack4 "accounts-on-general-nopred accounts-on-nopred accounts-on accounts-on-general group-accounts"
    step attack3; clj attack3 attack3 "accounts-on accounts-on-nopred accounts-on-serial accounts-on-general accounts-on-general-nopred group-accounts accounts-on-import"
    step era6; S5_ONLY=r22 S5_BUILD=era6 clj era6-r22 attack3 "era6-rule-off era6-rule-on era6-rule-off-general era6-rule-on-general"
    step merged; S5_ONLY=r22 S5_BUILD=merged clj merged-r22 attack3 "era6-rule-off era6-rule-on era6-rule-off-general era6-rule-on-general"
    step log
    clj log-head logdigest "idents-base idents-server"
    S5_BUILD=base clj log-base logdigest "idents-base idents-server"
    step idents
    for b in head base; do
      S5_BUILD=$b clj idents-$b idents "idents-base idents-server idents-server-wide idents-serial-retire idents-owner-head idents-load-profile"
    done
    step stacks
    heavy stack-window bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-window" stack5-run.sh
    S5_STACK_EXTRA="TX2_PREDECESSOR_LOOKUP=0" heavy stack-window-nopred bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-window-nopred" stack5-run.sh
    heavy stack-transition bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-transition" stack3-run.sh
    S5_STACK_EXTRA="TX2_PREDECESSOR_LOOKUP=0" heavy stack-transition-nopred bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-transition-nopred" stack3-run.sh ;;
  b)
    # One fuzz setting per call (the two calls ran one after another beside lane a, so never more than two at once):
    # faults, a second account, the transition at one third of the steps, stale planners, an old build reopening
    # (S5_OLD_REOPEN), removals alone and racing a save with the SDK's replay.
    setting=${3:?fuzz setting}
    step fuzz-$setting
    S5_SEEDS=${FUZZ_SEEDS:-731,732,733,734,735,736,737,738,739,740,741} S5_STEPS=3000 S5_FAULTS=1 S5_ACCOUNTS=1 S5_TRANSITION=1 \
      S5_OLD_REOPEN=1 S5_PROTECTED=unsealed S5_REMOVALS=1 clj fuzz-$setting fuzz "$setting" ;;
esac
echo "DX-S5R4_LANE_DONE $lane $(date -u +%T)"
