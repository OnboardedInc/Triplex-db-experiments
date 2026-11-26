#!/usr/bin/env bash
# [DX-S5 third review] Every counted run of the third review, in order, on the reviewer's image of the commit checked
# out (s5/image3.sh), by image ID; each step through lab/bin/heavy.mjs. Output under OUT (one directory per step).
#   DOCKER_HOST=<lab VM socket> bash lab/experiments/EXP-DX1/s5/review3-runs.sh OUT [STEP...]
# STEP: attack, era, log, idents, fuzz, transition, transition-nopred, reinstall2, u1, mixed (default: the first image's
# order below; the second image ran fuzz and reinstall2).
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?output directory}; shift
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
steps=("$@"); [[ ${#steps[@]} -gt 0 ]] || steps=(attack era log idents fuzz transition u1 mixed)
mkdir -p "$out"
heavy() { local label=$1; shift; node lab/bin/heavy.mjs --label "DX-S5R3-$label" --poll-ms 250 -- "$@"; }
clj() { heavy "$1" bash lab/experiments/EXP-DX1/s5/clj-run3.sh "$out/$1" "$2" "$3"; }
for step in "${steps[@]}"; do
  echo "DX-S5R3_STEP $step $(date -u +%T)"
  case $step in
    attack) clj attack attack3 "accounts-on accounts-on-nopred accounts-on-serial accounts-on-general accounts-on-general-nopred group-accounts accounts-on-import"
            clj attack2 attack2 "server accounts-on accounts-on-general" ;;
    era) clj era era "era-server era-per-account" ;;
    log)
      clj log-head1 logdigest "idents-base idents-server"
      clj log-head2 logdigest "idents-base idents-server"
      S5_BUILD=base clj log-base logdigest "idents-base idents-server"
      S5_BUILD=s6a clj log-s6a logdigest "idents-base idents-server" ;;
    idents)
      for b in head base; do
        S5_BUILD=$b clj idents-$b idents "idents-base idents-server idents-server-wide idents-serial-retire idents-owner-head idents-load-profile"
      done ;;
    fuzz)
      # Every dimension at once: faults, a second account, the transition at one third, stale planners after it,
      # removals alone and racing a save with the SDK's replay. Seeds differ per setting.
      for setting in accounts-on accounts-on-serial accounts-on-general-nopred; do
        S5_SEEDS=${FUZZ_SEEDS:-701,702,703,704,705,706,707,708} S5_STEPS=${FUZZ_STEPS:-3000} S5_FAULTS=1 S5_ACCOUNTS=1 S5_TRANSITION=1 \
          S5_PROTECTED=unsealed S5_REMOVALS=1 clj fuzz-$setting fuzz "$setting"
      done ;;
    transition) heavy stack-transition bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-transition" stack3-run.sh ;;
    # The same with predecessor lookup off (the gateway's default), where the general writer calls :triplex/commit.
    transition-nopred) S5_STACK_EXTRA="TX2_PREDECESSOR_LOOKUP=0" heavy stack-transition-nopred bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-transition-nopred" stack3-run.sh ;;
    reinstall2) S5_ONLY=reinstall2 clj reinstall2 attack3 "accounts-on-general-nopred accounts-on-nopred" ;;
    u1) U1_PAIRS=${U1_PAIRS:-3000} U1_ROWS=${U1_ROWS:-40} heavy stack-u1 bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-u1" u1-run.sh ;;
    mixed) S5_ROUNDS=${S5_ROUNDS:-6} heavy stack-mixed bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-mixed" stack2-run.sh ;;
    *) echo "unknown step $step" >&2 ;;
  esac
  echo "DX-S5R3_STEP_DONE $step $? $(date -u +%T)"
done
echo "DX-S5R3_RUNS_DONE $(date -u +%T)"
