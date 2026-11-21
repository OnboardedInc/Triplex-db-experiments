#!/bin/sh
# [DX-V01] Why: attach only the admitted, stopped PG17 copy before its first write.
# Rejected: letting the stock entrypoint initialise a missing mount or replay an unsealed cluster.
set -eu
test "$(cat "$PGDATA/PG_VERSION")" = 17
test ! -e "$PGDATA/postmaster.pid"
test "$(stat -c '%d:%i' "$PGDATA")" = "$DX_V01_PGDATA_FILE_ID"
digest=$(sha256sum "$PGDATA/global/pg_control")
test "${digest%% *}" = "$DX_V01_PGDATA_CONTROL_SHA"
control=$(LC_ALL=C pg_controldata "$PGDATA")
printf '%s\n' "$control" | grep -Eq '^Database cluster state:[[:space:]]+shut down$'
wal=${POSTGRES_INITDB_WALDIR:-}
if [ -n "$wal" ]; then
  # [DX-V01] Why: initdb's WAL setting is ignored on an already initialized PGDATA.
  # Rejected: starting from an empty WAL bind or moving any files from the held source.
  test -d "$PGDATA/pg_wal"
  test ! -L "$PGDATA/pg_wal"
  test -d "$wal"
  test -z "$(find "$wal" -mindepth 1 -maxdepth 1 -print -quit)"
  test "$(stat -c %d "$wal")" != "$(stat -c %d "$PGDATA")"
  cp -a "$PGDATA/pg_wal/." "$wal/"
  chown "$(stat -c '%u:%g' "$PGDATA/pg_wal")" "$wal"
  chmod "$(stat -c '%a' "$PGDATA/pg_wal")" "$wal"
  sync -f "$wal"
  mv "$PGDATA/pg_wal" "$PGDATA/pg_wal.scorecard-source"
  ln -s "$wal" "$PGDATA/pg_wal"
  sync -f "$PGDATA"
fi
exec docker-entrypoint.sh "$@"
