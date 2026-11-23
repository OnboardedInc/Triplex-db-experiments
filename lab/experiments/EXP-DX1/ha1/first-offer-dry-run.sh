#!/usr/bin/env bash
# [DX-INT1] Why: pass every queued launcher through all of its pre-offer checks against one named held copy, with one
# command, before a server window: the stack starts for real on the launcher's own copy, every check after startup runs
# (scope functions, native census, seed positions, ladder seals), and the launcher stops just before its first offer
# (ha1/first-offer.ts) and removes its own stack. Saturday's dry run stopped at the first stack container and missed all
# five stops of 2026-11-21.
# Rejected: re-implementing each launcher's checks here (they drift), or stand-in Docker replies after the stack.
# Usage: first-offer-dry-run.sh QUEUE_FILE HELD_PGDATA NEW_LOG_DIRECTORY
#   QUEUE_FILE: one launcher per line, `NAME COMMAND...`; the command is run by bash in the build checkout with
#   HELD (the held copy), LOGS (the log directory) and DX_DRY_RUN_FIRST_OFFER=1 exported; `#` lines are skipped.
#   Use the exact command and environment of the queued unit, with new output paths under "$LOGS".
# Prints per launcher: ADMITTED NAME (stopped before its first offer at FILE:LINE), or REFUSED NAME FILE:LINE MESSAGE.
# Exit 0 only when every launcher is ADMITTED. Run on an idle server: each launcher takes the day lock and its copy.
set -uo pipefail
[[ $# == 3 && -f $1 && -d $2 ]] || { echo 'usage: first-offer-dry-run.sh QUEUE_FILE HELD_PGDATA NEW_LOG_DIRECTORY' >&2; exit 2; }
queue=$1; export HELD; HELD=$(cd "$2" && pwd); export LOGS=$3
mkdir "$LOGS" || exit 2
export DX_DRY_RUN_FIRST_OFFER=1
verdict() {
  local name=$1 log=$2 reached where message
  reached=$(grep -m1 -oE '^DX-DRY-RUN first offer reached: .*' "$log")
  if [[ -n $reached ]]; then
    printf 'ADMITTED %s (stopped before its first offer at %s)\n' "$name" "${reached##* }"
    return 0
  fi
  where=$(grep -m1 -oE '^DX-STACK refused at [^ ]+' "$log" | sed 's/^DX-STACK refused at //')
  if [[ -z $where ]]; then
    where=$(grep -oE '(file://)?/[^ ():]*/lab/(experiments|bin)/[^ ():]+:[0-9]+' "$log" | grep -v '/ha1/first-offer\.ts:' | head -n 1 |
      sed -E 's#^(file://)?.*/(lab/)#\2#')
  fi
  if [[ -z $where ]] && grep -qE 'Command failed: (taskset -c [0-9,-]+ )?bash [^ ]*stack/up\.sh' "$log"; then
    where='lab/experiments/EXP-DX1/stack/up.sh (a guard that exits 2 without a message; rerun the command with bash -x)'
  fi
  message=$(grep -m1 -E '^(AssertionError|Error|[A-Za-z]*Error)( \[[A-Z_]+\])?:|^DX-STACK refused at' "$log" | cut -c1-200)
  printf 'REFUSED %s %s %s\n' "$name" "${where:-unknown}" "${message:-see $log}"
  return 1
}
failed=0 count=0
while IFS= read -r line || [[ -n $line ]]; do
  [[ -z ${line// } || $line == \#* ]] && continue
  name=${line%% *} command=${line#* }
  [[ $name =~ ^[A-Za-z0-9._-]+$ && $command != "$line" ]] || { echo "bad queue line: $line" >&2; exit 2; }
  count=$((count + 1))
  log="$LOGS/$name.log"
  bash -c "$command" > "$log" 2>&1
  printf '%s\n' "$?" > "$LOGS/$name.exit"
  verdict "$name" "$log" | tee -a "$LOGS/verdicts.txt" || failed=$((failed + 1))
done < "$queue"
printf '%s launchers, %s refused\n' "$count" "$failed" | tee -a "$LOGS/verdicts.txt"
(( count > 0 && failed == 0 ))
