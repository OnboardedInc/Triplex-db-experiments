#!/usr/bin/env bash
# [COLD-1] Why: one session, controls on both sides: does the slow speed class depend on how many virtual CPUs spin?
# usage (under with-lock.sh): e2.sh OUT_DIR SECONDS
set -euo pipefail
out=${1:?}; seconds=${2:-15}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
step() { # label offline-list probe-cpus
  "$here/guest-cpus.sh" online > /dev/null
  if [[ -n $2 ]]; then "$here/guest-cpus.sh" offline "$2" >> "$out/cpus.jsonl"; else "$here/guest-cpus.sh" show >> "$out/cpus.jsonl"; fi
  sleep 3
  "$here/host-context.sh" "$1-before" >> "$out/host.jsonl"
  "$here/speed.sh" "$out" "$1" "$seconds" "$3"
  "$here/host-context.sh" "$1-after" >> "$out/host.jsonl"
}
step a8 "" 0,1,2,3
step b6 6,7 0,1,2,3
step c5 5,6,7 0,1,2,3
step d4 4,5,6,7 0,1,2,3
step e6 6,7 0,1,2,3
step f8 "" 0,1,2,3
"$here/guest-cpus.sh" online >> "$out/cpus.jsonl"
