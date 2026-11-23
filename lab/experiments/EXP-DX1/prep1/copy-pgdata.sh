#!/bin/sh
set -eu
export LC_ALL=C
source=$1 target=$2
wal=${3:-}

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
if [ -n "$wal" ]; then
  # [DX-PREP1] Why: relocate only the stopped disposable copy's WAL, proving its bytes on the second drive.
  # Rejected: linking into the held template or using initdb WAL placement on an existing cluster.
  test -d "$target/pg_wal" && test -z "$(ls -A "$wal")"
  test "$(stat -c %d "$target")" != "$(stat -c %d "$wal")"
  manifest=$(mktemp -d)
  trap 'rm -rf "$manifest"' EXIT
  (cd "$target/pg_wal"; find . -type f -exec sha256sum {} +) > "$manifest/original"
  test -s "$manifest/original"
  mv "$target/pg_wal" "$wal/pg_wal"
  (cd "$wal/pg_wal"; find . -type f -exec sha256sum {} +) > "$manifest/moved"
  sort "$manifest/original" > "$manifest/original-sorted"
  sort "$manifest/moved" > "$manifest/moved-sorted"
  cmp "$manifest/original-sorted" "$manifest/moved-sorted"
  chown "$(stat -c %u:%g "$wal/pg_wal")" "$wal"
  chmod 0700 "$wal"
  ln -s "$wal/pg_wal" "$target/pg_wal"
  test "$(readlink -f "$target/pg_wal")" = "$wal/pg_wal"
  test "$before" = "$(stopped_control "$target")"
  sync -f "$wal"
  wal_sha=$(sha256sum < "$manifest/original-sorted")
fi
sync -f "$target"
printf '%s\n' "$before"
if [ -n "$wal" ]; then printf '%s\n' "${wal_sha%% *}"; fi
