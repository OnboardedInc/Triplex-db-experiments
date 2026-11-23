#!/usr/bin/env bash
# [DX-HA1] Why: pass each queued launcher through its own input checks and the stack guard in minutes before its window.
# Rejected: re-implementing each launcher's checks here (they drift) or starting a stack and tearing it down.
# Usage: launch-dry-run.sh LOG_DIRECTORY -- LAUNCHER [ARGUMENTS...]
# Run it exactly where the launcher would run (same build checkout, same environment, same queue lock rules).
# ADMITTED (exit 0): every check ran and the first stack-owned container create was reached and refused here.
# REFUSED (exit 1): the launcher exited before any stack container; the log shows which check.
# REVIEW (exit 3): the stand-in stopped some other Docker change first; nothing was started; read the log.
set -uo pipefail
# [DX-INT1] The guard check above stops at the first stack container. To run every queued launcher through all of its
# checks, including those after the stack starts, against one held copy:
#   launch-dry-run.sh --to-first-offer QUEUE_FILE HELD_PGDATA NEW_LOG_DIRECTORY   (see first-offer-dry-run.sh)
if [[ ${1:-} == --to-first-offer ]]; then exec bash "$(dirname "${BASH_SOURCE[0]}")/first-offer-dry-run.sh" "${@:2}"; fi
[[ $# -ge 3 && $2 == -- ]] || { echo 'usage: launch-dry-run.sh LOG_DIRECTORY -- LAUNCHER [ARGUMENTS...]' >&2; exit 2; }
out=$1; shift 2
mkdir "$out" || exit 2
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
real=$(command -v docker) || { echo 'no docker on PATH' >&2; exit 2; }
[[ $real != "$here/dry-run/docker" ]] || exit 2
export DX_DRY_RUN_DOCKER=$real DX_DRY_RUN_LOG=$out/docker-calls.log PATH="$here/dry-run:$PATH"
: > "$DX_DRY_RUN_LOG"
"$@" > "$out/launcher.log" 2>&1
code=$?
printf '%s\n' "$code" > "$out/exit-code"
stop=$(grep -m1 '^DX-DRY-RUN stop before:' "$DX_DRY_RUN_LOG" || true)
if [[ $stop =~ (create|run).*--name\ (tx2-dx[a-z0-9-]+)-(extract|pg|tx|gw-w|gw-r|seed-copy) || $stop =~ network\ create.*\ (tx2-dx[a-z0-9-]+)-net ]]; then
  verdict=ADMITTED rc=0
elif [[ -z $stop ]]; then
  verdict=REFUSED rc=1
else
  verdict=REVIEW rc=3
fi
printf '%s launcher-exit=%s\n%s\n' "$verdict" "$code" "${stop:-no Docker change was attempted}" | tee "$out/verdict.txt"
[[ $verdict != REFUSED ]] || tail -25 "$out/launcher.log"
exit "$rc"
