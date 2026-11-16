#!/usr/bin/env bash
# [COLD-1] Why: one session, plain controls first and last: does added memory traffic on the Mac make the guest's cache
# state decay sooner? Four guest CPUs stay online so that no virtual CPU is on an efficiency core.
# usage (under with-lock.sh): e5.sh OUT_DIR REPS
set -euo pipefail
out=${1:?}; reps=${2:-30}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
"$here/guest-cpus.sh" online > /dev/null
"$here/guest-cpus.sh" offline 4,5,6,7 >> "$out/cpus.jsonl"
sleep 3
gaps=0,10,25,50,100,250,1000
arm() { # tag period-ms|none
  local hp=
  if [[ $2 != none ]]; then python3 -I "$here/host-polluter.py" 32 "$2" 70 >> "$out/polluter.jsonl" & hp=$!; sleep 1; fi
  "$here/cold.sh" "$out" "$1" 3 "$reps" sleep "$gaps"
  if [[ -n $hp ]]; then wait "$hp" || true; fi
}
arm 1-none none
arm 2-p250 250
arm 3-p50 50
arm 4-p10 10
arm 5-p0 0
arm 6-none none
"$here/guest-cpus.sh" online >> "$out/cpus.jsonl"
