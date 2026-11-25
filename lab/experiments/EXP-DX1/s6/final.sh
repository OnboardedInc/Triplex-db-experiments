#!/usr/bin/env bash
# [DX-S6] The standing gate phase on the image built from the committed head (s6/image.sh), one call per step:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S6-clj -- bash lab/experiments/EXP-DX1/s6/final.sh OUT STEP
# STEP: review (the second review's tests, the stored-form gate), gates (outcome, race, bound, attack), older (s3 owners,
# s4 create), accounts (two accounts, shared IDs), fuzz (three writer settings, value types, protected and sealed values),
# fuzz-faults-1 to fuzz-faults-5 and fuzz-protected (faults and the second account).
set -uo pipefail
out=${1:?new output directory}; step=${2:?gates or fuzz}
here=$(cd "$(dirname "$0")" && pwd)
r="$here/clj-run.sh"
mkdir -p "$out"
status=0
case $step in
  review)
    # [DX-S6b] The second review's tests in every setting they distinguish, and the one-stored-form gate.
    bash "$r" "$out/attack2" attack2 "accounts-off accounts-on accounts-on-serial accounts-on-general bound general" || status=1
    bash "$r" "$out/ids" ids "accounts-on accounts-on-serial accounts-on-general group-accounts" || status=1 ;;
  gates)
    bash "$r" "$out/outcome" outcome "server general accounts-on group group-accounts" || status=1
    bash "$r" "$out/race" race server || status=1
    bash "$r" "$out/bound" bound bound || status=1
    bash "$r" "$out/attack" attack "server import" || status=1 ;;
  older)
    bash "$r" "$out/owners" owners "s3 s3-serial" || status=1
    bash "$r" "$out/create" create "server serial hints" || status=1 ;;
  accounts)
    S6_ACCOUNT_SCHEDULES=1000 bash "$r" "$out/accounts-off" accounts accounts-off || status=1
    S6_ACCOUNT_SCHEDULES=${S6_ACCOUNT_SCHEDULES:-10000} bash "$r" "$out/accounts-on" accounts accounts-on || status=1
    S6_ACCOUNT_SCHEDULES=2000 bash "$r" "$out/accounts-group" accounts group-accounts || status=1 ;;
  fuzz-faults-*)
    # [DX-S6b] The fuzzer with faults (S5_FAULTS) and the second account (S5_ACCOUNTS), ten seeds per step (about
    # 24,000 saves), one setting per step: accounts-on, accounts-on-serial, accounts-on-general, server (option off)
    # and group-accounts; plus sealed and unsealed protected values with faults.
    n=${step#fuzz-faults-}
    case $n in
      1) set -- accounts-on 101 ;; 2) set -- accounts-on-serial 111 ;; 3) set -- accounts-on-general 121 ;;
      4) set -- server 131 ;; 5) set -- group-accounts 141 ;;
      *) echo "fuzz-faults-$n?" >&2; exit 2 ;;
    esac
    seeds=$(seq -s, "$2" $(( $2 + 9 )))
    S5_SEEDS=$seeds S5_STEPS=1500 S5_FAULTS=1 S5_ACCOUNTS=1 S5_VALUE_TYPES=1 bash "$r" "$out/$1" fuzz "$1" || status=1 ;;
  fuzz-protected)
    S5_SEEDS=151,152,153 S5_STEPS=1500 S5_FAULTS=1 S5_VALUE_TYPES=1 S5_PROTECTED=sealed bash "$r" "$out/sealed" fuzz server || status=1
    S5_SEEDS=154,155,156 S5_STEPS=1500 S5_FAULTS=1 S5_ACCOUNTS=1 S5_VALUE_TYPES=1 S5_PROTECTED=unsealed bash "$r" "$out/unsealed" fuzz accounts-on || status=1 ;;
  fuzz)
    S5_SEEDS=${S5_SEEDS:-21,22} S5_STEPS=${S5_STEPS:-1500} S5_VALUE_TYPES=1 bash "$r" "$out/types" fuzz "server serial plainowner" || status=1
    S5_SEEDS=23 S5_STEPS=1500 S5_VALUE_TYPES=1 S5_PROTECTED=unsealed bash "$r" "$out/unsealed" fuzz "server" || status=1
    S5_SEEDS=24 S5_STEPS=1500 S5_VALUE_TYPES=1 S5_PROTECTED=sealed bash "$r" "$out/sealed" fuzz "server" || status=1 ;;
  *) echo "step $step?" >&2; exit 2 ;;
esac
echo "DX-S6_FINAL_EXIT $step $status"
exit $status
