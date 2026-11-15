-- [DX-T1-9] Why: inspect heap/TOAST free space after timing; dead-tuple estimates alone do not measure bloat.
-- Rejected: VACUUM or a table scan during commits, or treating a missing extension as a zero-bloat observation.
\set ON_ERROR_STOP on
SELECT EXISTS(SELECT FROM pg_available_extensions WHERE name='pgstattuple') AS available \gset
\if :available
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT json_build_object('type','postgres-census','at',extract(epoch from clock_timestamp())*1000,
 'heap',(SELECT row_to_json(s) FROM pgstattuple_approx('public.datomic_kvs'::regclass) s),
 'table',(SELECT row_to_json(t) FROM pg_stat_user_tables t WHERE relname='datomic_kvs'),
 'io',(SELECT json_agg(row_to_json(i)) FROM pg_stat_io i),
 'wal',(SELECT row_to_json(w) FROM pg_stat_wal w),
 'checkpoint',(SELECT row_to_json(c) FROM pg_stat_checkpointer c),
 'backgroundWriter',(SELECT row_to_json(b) FROM pg_stat_bgwriter b),
 'settings',(SELECT json_agg(json_build_object('name',name,'setting',setting,'unit',unit)) FROM pg_settings WHERE name IN ('fsync','synchronous_commit','full_page_writes','wal_sync_method','shared_buffers','wal_init_zero','wal_recycle','checkpoint_timeout','checkpoint_completion_target','min_wal_size','max_wal_size','autovacuum')));
SELECT json_build_object('type','postgres-toast-census','at',extract(epoch from clock_timestamp())*1000, 'toast',(SELECT row_to_json(s) FROM pg_class c CROSS JOIN LATERAL pgstattuple_approx(c.reltoastrelid::regclass) s WHERE c.oid='public.datomic_kvs'::regclass AND c.reltoastrelid<>0));
\else
SELECT json_build_object('type','postgres-census','at',extract(epoch from clock_timestamp())*1000,'unavailable','pgstattuple extension not installed');
\endif
