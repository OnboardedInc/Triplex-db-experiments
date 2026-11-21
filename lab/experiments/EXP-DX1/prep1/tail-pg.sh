#!/usr/bin/env bash
set -euo pipefail
action=${1:?}
slot=${2:?}
[[ $# == 2 && $(uname -s) == Linux && ${DX_BARE_METAL:-0} == 1 &&
   ${DOCKER_HOST:-} == unix:///var/run/docker.sock &&
   ($slot =~ ^tx2-dxprep1-[a-f0-9]{8}-1-tail-(control|wal|zgc|fair|combined)-s$ ||
    ($action == settings && $slot =~ ^tx2-dxprep1-[a-f0-9]{8}-1-(scale-(base|cache|wal-zgc)|barrier6|rolling(6|8|12|16)|rolling6-tx5|fresh(-zgc)?(6|12))-s$)) ]]
pg="$slot-pg"
sql=(docker exec -i "$pg" psql -XqAt -v ON_ERROR_STOP=1 -U postgres)
case "$action" in
  settings)
    layout=$(docker exec "$pg" sh -ceu '
      data=$(psql -XqAt -U postgres -c "SHOW data_directory")
      wal=$(readlink -f "$data/pg_wal")
      test -d "$wal"
      case "$1" in
        *-scale-wal-zgc-s|*-barrier6-s|*-rolling*-s|*-fresh*-s) test "$wal" = /wal/pg_wal; test "$(stat -c %d "$data")" != "$(stat -c %d "$wal")" ;;
        *-scale-*) test "$wal" = "$data/pg_wal" ;;
      esac
      printf "%s\n" "$data" "$wal"
      stat -c %d "$data" "$wal"
    ' sh "$slot")
    "${sql[@]}" -d datomic -v layout="$layout" <<'SQL'
SELECT jsonb_build_object('layout',regexp_split_to_array(:'layout',E'\n'),
  'version',current_setting('server_version_num'),
  'settings',(SELECT jsonb_object_agg(name,current_setting(name)) FROM pg_settings WHERE name IN
    ('fsync','synchronous_commit','full_page_writes','wal_sync_method','track_wal_io_timing',
    'track_io_timing','checkpoint_timeout','checkpoint_completion_target','checkpoint_flush_after',
    'min_wal_size','max_wal_size','log_checkpoints','log_timezone','shared_buffers')));
SQL
    ;;
  sentinel)
    # [DX-PREP1] Why: witness a real commit and WAL sync on a known backend before the tape.
    # Rejected: relying on bpftrace's startup banner or writing a probe row into the sealed Datomic database.
    "${sql[@]}" -d postgres <<'SQL'
SELECT pg_backend_pid();
CREATE TABLE public.dx_prep1_tail_probe (id integer);
INSERT INTO public.dx_prep1_tail_probe VALUES (1);
SELECT pg_sleep(1);
DROP TABLE public.dx_prep1_tail_probe;
SQL
    ;;
  stats)
    "${sql[@]}" -d datomic <<'SQL'
SELECT jsonb_build_object('at', (extract(epoch FROM clock_timestamp())*1000000000)::bigint,
  'wal',(SELECT to_jsonb(w) FROM pg_stat_wal AS w),
  'checkpointer',(SELECT to_jsonb(c) FROM pg_stat_checkpointer AS c),
  'synchronous_commit',current_setting('synchronous_commit'));
SQL
    ;;
  *) exit 2;;
esac
