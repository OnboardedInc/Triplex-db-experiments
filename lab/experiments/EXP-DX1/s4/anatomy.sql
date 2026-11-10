-- [DX-S4] Why: relation bytes and bytea payload bytes are separate measurements. Rejected: assigning TOAST overhead to a guessed covering index.
SELECT json_build_object(
 'database_bytes',pg_database_size(current_database()),
 'wal_sql_bytes',(SELECT sum(size) FROM pg_ls_waldir()),
 'relations',(SELECT json_agg(t) FROM (
 SELECT c.relname,pg_relation_size(c.oid) AS main_bytes,pg_indexes_size(c.oid) AS index_bytes,
 pg_relation_size(c.reltoastrelid) AS toast_main_bytes,pg_indexes_size(c.reltoastrelid) AS toast_index_bytes,
 pg_total_relation_size(c.reltoastrelid) AS toast_total_bytes,pg_total_relation_size(c.oid) AS total_bytes,
 s.n_live_tup,s.n_dead_tup,s.last_vacuum,s.last_autovacuum
 FROM pg_class c LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
 WHERE c.relname='datomic_kvs') t),
 'kvs',(SELECT json_build_object('rows',count(*),'value_bytes',sum(octet_length(val)),
 'stored_value_bytes',sum(pg_column_size(val)),'key_bytes',sum(octet_length(id)),
 'map_bytes',sum(octet_length(map)), 'null_values',count(*) FILTER(WHERE val IS NULL)) FROM datomic_kvs),
 'groups',(SELECT json_agg(g) FROM (SELECT CASE WHEN map='{}' THEN 'empty-map' WHEN map LIKE '{:prev %' THEN 'previous-log-link' WHEN map LIKE '{:d/r %' THEN 'database-root' WHEN map LIKE '{:key %' THEN 'key' ELSE 'other' END AS map_kind,count(*) AS rows,sum(octet_length(val)) AS value_bytes,
 sum(pg_column_size(val)) AS stored_bytes FROM datomic_kvs GROUP BY 1 ORDER BY sum(octet_length(val)) DESC NULLS LAST)g),
 'samples',(SELECT json_agg(g) FROM (SELECT left(id,120) AS key,map,octet_length(val) AS logical_bytes,
 pg_column_size(val) AS stored_bytes,encode(substring(val from 1 for 16),'hex') AS prefix FROM datomic_kvs WHERE val IS NOT NULL ORDER BY octet_length(val) DESC LIMIT 12)g),
 'toast_compression',(SELECT json_agg(g) FROM (SELECT coalesce(pg_column_compression(val),'uncompressed') AS codec,count(*) AS rows,sum(octet_length(val)) AS value_bytes,sum(pg_column_size(val)) AS stored_bytes FROM datomic_kvs GROUP BY 1)g),
 'compression_histogram',(SELECT json_agg(g) FROM (SELECT encode(substring(val from 1 for 4),'hex') AS prefix,
 count(*) AS rows,sum(octet_length(val)) AS value_bytes,sum(pg_column_size(val)) AS stored_bytes FROM datomic_kvs WHERE val IS NOT NULL
 GROUP BY 1 ORDER BY sum(octet_length(val)) DESC LIMIT 20)g));
