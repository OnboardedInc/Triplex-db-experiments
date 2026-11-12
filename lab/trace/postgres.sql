-- [DX-T1] Why: storage waits and WAL I/O share the run clock, without query text or parameter values.
-- Rejected: assigning a concurrent backend's cumulative statistics to a particular commit.
SELECT json_build_object('type','postgres-sample','at',extract(epoch from clock_timestamp())*1000,
 'activity',(SELECT coalesce(json_agg(json_build_object('pid',pid,'state',state,'waitType',wait_event_type,'wait',wait_event,'queryStart',extract(epoch from query_start)*1000)), '[]'::json) FROM pg_stat_activity WHERE datname='datomic' AND pid<>pg_backend_pid()),
 'wal',(SELECT row_to_json(w) FROM pg_stat_wal w),
 'io',(SELECT json_agg(row_to_json(i)) FROM pg_stat_io i),
 'database',(SELECT row_to_json(d) FROM pg_stat_database d WHERE datname='datomic'));
\watch 1
