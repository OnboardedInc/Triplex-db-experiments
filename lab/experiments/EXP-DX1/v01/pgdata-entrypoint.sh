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
exec docker-entrypoint.sh "$@"
