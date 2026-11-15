-- [DX-T1-9] Why: server-side wait samples cover the implicit commit/Sync boundary missing from Execute duration logs.
-- Rejected: calling a peer socket read a storage cause without the backend's observed wait and statement kind.
SELECT json_build_object('type','postgres-wait','at',extract(epoch from clock_timestamp())*1000,
 'activity',(SELECT coalesce(json_agg(json_build_object('pid',pid,'state',state,'waitType',wait_event_type,'wait',wait_event,
 'queryStart',extract(epoch from query_start)*1000,'xactStart',extract(epoch from xact_start)*1000,
 'backendXid',backend_xid::text,'blocking',pg_blocking_pids(pid),
 'statement',CASE WHEN query ~* '^UPDATE datomic_kvs' THEN 'UPDATE datomic_kvs' WHEN query ~* '^INSERT INTO datomic_kvs' THEN 'INSERT datomic_kvs'
 WHEN query ~* '^SELECT.*datomic_kvs' THEN 'SELECT datomic_kvs' ELSE 'other' END)), '[]'::json)
 FROM pg_stat_activity WHERE datname='datomic' AND usename='datomic' AND pid<>pg_backend_pid()));
\watch 0.02
