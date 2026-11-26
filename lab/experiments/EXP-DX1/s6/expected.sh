#!/usr/bin/env bash
# [DX-INT5, the form of the save line's fifth pass (DX-S6c 45e51d862 s6/expected.sh), with counts] A run passes only
# when exactly the listed checks fail, each as many times as listed. For each log of a clj-run directory, the failed or
# errored tests (with how many FAIL or ERROR lines each) are compared with the expected list for that mode and setting
# (below, each with the review's sentence); a log without its summary line differs too. Prints one DX-S6_EXPECTED line
# per log and exits 1 on any difference: one more, one fewer, a different test or a different count.
#   bash lab/experiments/EXP-DX1/s6/expected.sh DIR
set -uo pipefail
dir=${1:?clj-run output directory}
expected() { # mode setting -> "test-name count" lines
  local mode=$1 setting=$2
  case $mode in
    attack3)
      # REVIEW-4 (exp/DX-S5-save-line-review 84d470328), "R2-2's general writer (the third review's harness)": the third
      # review's r2-2-race-on-each-writer ran the removal on the saving thread, which cannot take the scope lock (503);
      # "it is a harness limit, not a finding"; run on its own thread from the save's submit, the removal waits for the
      # save and commits, in 5 settings, 15 of 15. Its general-writer arm fails 10 assertions in the 3 settings with the
      # one-owner writer off.
      case $setting in general|accounts-on-general|accounts-on-general-nopred) echo "r2-2-race-on-each-writer 10" ;; esac ;;
    attack4)
      # REVIEW-4 R4-2 (High, account separation): "a request naming account A can make a new entity account B's",
      # a-request-naming-one-account, the planted case (attack4_gate.clj 219), once with the setting on and once off;
      # "R4-2's check runs with the setting off too, but before this pass nothing was checked there, so it is a gap in
      # the fix, not a regression" (fixed on the save line's fifth pass, not merged here). 2 assertions in every setting.
      echo "a-request-naming-one-account 2" ;;
  esac
}
status=0
for log in "$dir"/*.log; do
  base=$(basename "$log" .log); mode=${base%%-*}; setting=${base#*-}
  got=$(grep -oE '^(FAIL|ERROR) in \([a-z0-9-]+\)' "$log" | sed -E 's/^(FAIL|ERROR) in \(([a-z0-9-]+)\)/\2/' | sort | uniq -c | awk '{print $2" "$1}' | paste -sd, -)
  want=$(expected "$mode" "$setting" | sort | paste -sd, -)
  summary=$(grep -cE '_RESULT ' "$log")
  differing=$(grep -hoE '"(differing|unjustifiedRefusals)":[0-9]+' "$log" | grep -vE ':0$' | paste -sd, -)
  if [[ $got == "$want" && $summary -ge 1 && -z $differing ]]; then verdict=pass; else verdict=differs; status=1; fi
  echo "DX-S6_EXPECTED $verdict mode=$mode setting=$setting failed=[${got}] expected=[${want}]${differing:+ $differing}$([[ $summary -ge 1 ]] || echo ' no-summary')"
done
exit $status
