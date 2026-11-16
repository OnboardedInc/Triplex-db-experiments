#!/usr/bin/env bash
# [COLD-1] Why: one session with controls on both sides: does the cost of a gap in cache state depend on how many
# virtual CPUs spin, and does it need the guest to be idle at all (sleep against a busy wait)?
# usage (under with-lock.sh): e3.sh OUT_DIR REPS CPU
set -euo pipefail
out=${1:?}; reps=${2:-30}; cpu=${3:-3}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
arm() { # tag offline-list mode
  "$here/guest-cpus.sh" online > /dev/null
  if [[ -n $2 ]]; then "$here/guest-cpus.sh" offline "$2" >> "$out/cpus.jsonl"; else "$here/guest-cpus.sh" show >> "$out/cpus.jsonl"; fi
  sleep 3
  "$here/cold.sh" "$out" "$1" "$cpu" "$reps" "$3"
}
arm a8-sleep "" sleep
arm b8-spin "" spin
arm c6-sleep 6,7 sleep
arm d4-sleep 4,5,6,7 sleep
arm e4-spin 4,5,6,7 spin
arm f8-sleep "" sleep
"$here/guest-cpus.sh" online >> "$out/cpus.jsonl"
