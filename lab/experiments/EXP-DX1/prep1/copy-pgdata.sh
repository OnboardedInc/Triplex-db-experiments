#!/bin/sh
set -eu
export LC_ALL=C
source=$1 target=$2

stopped_control() {
  test "$(cat "$1/PG_VERSION")" = 17 || return 1
  for name in postmaster.pid standby.signal recovery.signal backup_label; do
    test ! -e "$1/$name" || return 1
  done
  control=$(pg_controldata "$1" 2>&1) || return 1
  printf '%s\n' "$control" | grep -Eq '^Database cluster state:[[:space:]]+shut down$' || return 1
  if printf '%s\n' "$control" | grep -Eiq 'warning:|error:'; then return 1; fi
  digest=$(sha256sum < "$1/global/pg_control") || return 1
  printf '%s\n' "${digest%% *}"
}

# [DX-PREP1] Why: open a private PostgreSQL 17 copy of a clean, self-contained source.
# Rejected: starting on the held directory or following tablespace and WAL links outside it.
nonregular=$(find "$source" ! -type f ! -type d -print -quit)
test -z "$nonregular"
test -z "$(ls -A "$target")"
before=$(stopped_control "$source")
cp -a "$source/." "$target/"
after=$(stopped_control "$target")
test "$before" = "$after"
test "$before" = "$(stopped_control "$source")"
sync -f "$target"
printf '%s\n' "$before"
