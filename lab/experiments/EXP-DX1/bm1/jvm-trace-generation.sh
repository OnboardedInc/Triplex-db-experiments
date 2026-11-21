#!/usr/bin/env bash
set -euo pipefail

dir=$1
role=$2
shift 2
[[ $role == gw-w || $role == gw-r ]]

# [DX-BM1] Why: a failed startup can leave a trace buffer and JFR error that
# predate the JVM serving timed saves. Preserve those bytes before the next JVM starts.
# Rejected: unlinking files on the host after the new JVM could have opened them.
shopt -s nullglob
prior=("$dir"/"$role".jsonl "$dir"/"$role".jfr* "$dir"/"$role"-jfr-error.txt
       "$dir"/"$role"-native-settings.json "$dir"/"$role"-jvm.log* "$dir"/"$role".log*)
generation=
for file in "${prior[@]}"; do
  [[ -f $file && ! -L $file ]] || continue
  if [[ -z $generation ]]; then
    mkdir -p "$dir/.bm1-pre-ready"
    generation=$(mktemp -d "$dir/.bm1-pre-ready/$role.XXXXXX")
  fi
  mv -- "$file" "$generation/"
done
exec "$@"
