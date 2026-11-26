#!/usr/bin/env bash
# [DX-S6c fifth pass] A run passes only when exactly the listed checks fail. For each log of a clj-run directory, the
# tests that failed or errored are compared with the expected list for that mode and setting (below, each with the
# review's sentence). Prints one DX-S6_EXPECTED line per log and exits 1 on any difference.
#   bash lab/experiments/EXP-DX1/s6/expected.sh DIR
set -uo pipefail
dir=${1:?clj-run output directory}
expected() { # mode setting -> expected test names, one per line
  local mode=$1 setting=$2
  case $mode in
    attack4)
      # REVIEW-4 R4-1: "A build that does not know the setting writes a working body on its open ... its general writer
      # under :triplex/commit when the scope's recorded hash is not its own." From the fifth pass the database refuses
      # that transaction (the hash bar), so the test's old-open! throws at its first step.
      echo the-admitted-window-after-an-old-build-opens ;;
    attack3)
      # REVIEW-4 section 1: "In the two settings that send every save through the general writer, all 5 of its arms
      # fail (10 assertions each), on this head and on every other build; it is a harness limit, not a finding."
      case $setting in *general*) echo r2-2-race-on-each-writer ;; esac ;;
  esac
}
status=0
for log in "$dir"/*.log; do
  base=$(basename "$log" .log); mode=${base%%-*}; setting=${base#*-}
  got=$(grep -oE '^(FAIL|ERROR) in \([a-z0-9-]+\)' "$log" | sed -E 's/^(FAIL|ERROR) in \(([a-z0-9-]+)\)/\2/' | sort -u | paste -sd, -)
  want=$(expected "$mode" "$setting" | sort -u | paste -sd, -)
  summary=$(grep -cE '_RESULT ' "$log")
  # The fuzzer prints no test names: any differing run or unjustified refusal fails it.
  differing=$(grep -hoE '"(differing|unjustifiedRefusals)":[0-9]+' "$log" | grep -vE ':0$' | paste -sd, -)
  if [[ $got == "$want" && $summary -ge 1 && -z $differing ]]; then verdict=pass; else verdict=differs; status=1; fi
  echo "DX-S6_EXPECTED $verdict mode=$mode setting=$setting failed=[${got}] expected=[${want}]${differing:+ $differing}"
done
exit $status
