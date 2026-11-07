-- Native catalog contract; embedded in the C++ extension at build time.
CREATE TEMP TABLE __td_catalog_bootstrap AS SELECT NOT EXISTS(
 SELECT 1 FROM information_schema.tables WHERE table_catalog=current_database()
 AND table_schema='main' AND table_name='store_meta') fresh;
CREATE SCHEMA IF NOT EXISTS td_catalog_v1;
CREATE TABLE IF NOT EXISTS td_catalog_v1.schemas(
 name VARCHAR NOT NULL,version INTEGER NOT NULL CHECK(version>0),
 dsl VARCHAR NOT NULL CHECK(octet_length(encode(dsl)) BETWEEN 1 AND 16384),
 ir VARCHAR NOT NULL CHECK(json_valid(ir)),content_hash VARCHAR NOT NULL CHECK(content_hash=sha256(ir)),
 CHECK((json_extract_string(ir,'$.format')='td.schema/1' AND json_extract_string(ir,'$.name')=name
  AND TRY_CAST(json_extract(ir,'$.version') AS INTEGER)=version) IS TRUE),
 PRIMARY KEY(name,version)
);
CREATE OR REPLACE VIEW td_catalog_v1.entities AS
 SELECT s.name schema_name,s.version,s.content_hash,json_extract_string(e.value,'$.name') entity_name
 FROM td_catalog_v1.schemas s,json_each(s.ir,'$.entities') e;
CREATE OR REPLACE VIEW td_catalog_v1.attributes AS
 SELECT s.name schema_name,s.version,json_extract_string(e.value,'$.name') entity_name,
 json_extract_string(a.value,'$.key') attribute_key,CAST(json_extract(a.value,'$.tag') AS UTINYINT) value_tag,
 CAST(json_extract(a.value,'$.required') AS BOOLEAN) required,CAST(json_extract(a.value,'$.many') AS BOOLEAN) many,
 json_extract_string(a.value,'$.reference') reference_type
 FROM td_catalog_v1.schemas s,json_each(s.ir,'$.entities') e,json_each(e.value,'$.attributes') a;
CREATE OR REPLACE VIEW td_catalog_v1.schema_references AS
 SELECT s.name schema_name,s.version,json_extract_string(r.value,'$.entity') entity_type,
 json_extract_string(r.value,'$.attribute') attribute,json_extract_string(r.value,'$.target') reference_type
 FROM td_catalog_v1.schemas s,json_each(system.main.td_schema_references_v2(s.dsl,s.ir)) r;
CREATE TABLE IF NOT EXISTS main.store_meta(version INTEGER PRIMARY KEY CHECK(version IN(5,6)));
INSERT INTO main.store_meta SELECT 5 FROM __td_catalog_bootstrap WHERE fresh;
CREATE TEMP TABLE __td_catalog_format AS SELECT CASE
 WHEN count(*)=1 AND min(version) IN(5,6,8,9,10,11) THEN TRUE
 ELSE error('TD_E_COMMAND_FORMAT: unsupported temporal catalog version') END ok FROM main.store_meta;
CREATE TABLE IF NOT EXISTS main.clock(singleton BOOLEAN PRIMARY KEY CHECK(singleton),position BIGINT NOT NULL CHECK(position>=0));
INSERT INTO main.clock SELECT TRUE,0 WHERE NOT EXISTS(SELECT 1 FROM main.clock);
CREATE TABLE IF NOT EXISTS main.storage_usage(singleton BOOLEAN PRIMARY KEY CHECK(singleton),retained_count BIGINT NOT NULL CHECK(retained_count>=0),retained_bytes BIGINT NOT NULL CHECK(retained_bytes>=0));
INSERT INTO main.storage_usage SELECT TRUE,0,0 WHERE NOT EXISTS(SELECT 1 FROM main.storage_usage);
-- Canonical scalar/Triplex assertions. Created under staging names by migration.
CREATE TABLE IF NOT EXISTS main.commands(
 command_id VARCHAR PRIMARY KEY, request_hash VARCHAR, position BIGINT UNIQUE,
 receipt VARCHAR, transaction_id VARCHAR NOT NULL, recorded_at DOUBLE NOT NULL,
 origin VARCHAR NOT NULL CHECK(origin IN('python','triplex')),
 CHECK(isfinite(recorded_at) AND recorded_at>=0),
 CHECK(origin<>'python' OR (request_hash IS NOT NULL AND position>0 AND receipt IS NOT NULL))
);
-- Native command identity binds immutable schema meaning to historical facts.
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_owners(
 entity_id VARCHAR PRIMARY KEY,schema_name VARCHAR NOT NULL,entity_type VARCHAR NOT NULL
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.schema_unique_activations(
 schema_name VARCHAR NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version>0),
 command_id VARCHAR NOT NULL UNIQUE,PRIMARY KEY(schema_name,schema_version)
);
CREATE OR REPLACE VIEW td_catalog_v1.unique_domains AS
 SELECT s.name schema_name,json_extract_string(e.value,'$.name') entity_type,
 json_extract_string(a.value,'$.key') attribute,CAST(json_extract(a.value,'$.tag') AS UTINYINT) value_tag,
 min(c.position) enforced_from
 FROM main.store_meta m CROSS JOIN td_catalog_v1.schema_unique_activations u JOIN td_catalog_v1.schemas s
 ON s.name=u.schema_name AND s.version=u.schema_version JOIN main.commands c ON c.command_id=u.command_id,
 json_each(s.ir,'$.entities') e,json_each(e.value,'$.attributes') a
 WHERE m.version IN(10,11) AND json_extract_string(s.ir,'$.format') IN('td.schema/3','td.schema/4')
 AND CAST(json_extract(a.value,'$.unique') AS BOOLEAN) IS TRUE
 GROUP BY 1,2,3,4;
CREATE OR REPLACE VIEW td_catalog_v1.schema_type_declarations AS
 SELECT s.name schema_name,s.version,json_extract_string(e.value,'$.name') entity_type,
 coalesce(CAST(json_extract(e.value,'$.live') AS BOOLEAN),FALSE) is_live
 FROM td_catalog_v1.schemas s,json_each(s.ir,'$.entities') e;
CREATE TABLE IF NOT EXISTS td_catalog_v1.schema_type_modes(
 schema_name VARCHAR NOT NULL,entity_type VARCHAR NOT NULL,is_live BOOLEAN NOT NULL,
 PRIMARY KEY(schema_name,entity_type)
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.schema_presence_activations(
 schema_name VARCHAR NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version>0),
 command_id VARCHAR NOT NULL UNIQUE,PRIMARY KEY(schema_name,schema_version)
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_presence_edits(
 command_id VARCHAR PRIMARY KEY,entity_id VARCHAR NOT NULL,operation VARCHAR NOT NULL CHECK(operation IN('put','patch')),
 valid_from BIGINT NOT NULL,valid_to BIGINT NOT NULL,CHECK(valid_from<valid_to)
);
CREATE INDEX IF NOT EXISTS presence_entity_lookup ON td_catalog_v1.entity_presence_edits(entity_id);
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_commands(
 command_id VARCHAR PRIMARY KEY,schema_name VARCHAR NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version>0),
 entity_type VARCHAR NOT NULL,entity_id VARCHAR NOT NULL,position BIGINT NOT NULL UNIQUE CHECK(position>0),
 schema_hash VARCHAR NOT NULL
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.catalog_revision(
 singleton BOOLEAN PRIMARY KEY CHECK(singleton),revision INTEGER NOT NULL CHECK(revision=2)
);
DELETE FROM td_catalog_v1.catalog_revision WHERE CASE
 WHEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)=1 AND singleton IS TRUE AND revision IN(2,3) THEN FALSE
 ELSE error('TD_E_COMMAND_FORMAT: unsupported native catalog revision') END;
DELETE FROM main.store_meta WHERE CASE
 WHEN version=5 AND NOT EXISTS(SELECT 1 FROM td_catalog_v1.catalog_revision WHERE revision<>2) THEN FALSE
 WHEN version IN(6,8) AND (SELECT count(*) FROM td_catalog_v1.catalog_revision WHERE revision=2)=1 THEN FALSE
 WHEN version IN(9,10,11) AND (SELECT count(*) FROM td_catalog_v1.catalog_revision)=1 THEN FALSE
 ELSE error('TD_E_COMMAND_FORMAT: native format/catalog revision mismatch') END;
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_patch_commands(
 command_id VARCHAR PRIMARY KEY,valid_from BIGINT NOT NULL,valid_to BIGINT NOT NULL,
 CHECK(valid_from<valid_to)
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_assertion_sources(
 assertion_id VARCHAR PRIMARY KEY,source_assertion_id VARCHAR NOT NULL,
 validation_command_id VARCHAR NOT NULL,side VARCHAR NOT NULL CHECK(side IN('left','right')),
 CHECK(assertion_id<>source_assertion_id)
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_batches(
 command_id VARCHAR PRIMARY KEY,schema_name VARCHAR NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version>0),
 schema_hash VARCHAR NOT NULL,member_count INTEGER NOT NULL CHECK(member_count BETWEEN 1 AND 32)
);
CREATE TABLE IF NOT EXISTS td_catalog_v1.entity_batch_members(
 command_id VARCHAR NOT NULL,entity_id VARCHAR NOT NULL,ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 0 AND 31),
 entity_type VARCHAR NOT NULL,operation VARCHAR NOT NULL CHECK(operation IN('put','patch')),
 valid_from BIGINT NOT NULL,valid_to BIGINT NOT NULL,CHECK(valid_from<valid_to),
 PRIMARY KEY(command_id,entity_id),UNIQUE(command_id,ordinal)
);
-- Batch headers already retain the exact authored interval for every member.
-- Presence uses that event with the same command position as the member facts.
CREATE OR REPLACE VIEW td_catalog_v1.entity_presence_events AS
 SELECT e.command_id,e.entity_id,n.position,e.operation,e.valid_from,e.valid_to
 FROM td_catalog_v1.entity_presence_edits e JOIN td_catalog_v1.entity_commands n USING(command_id,entity_id)
 UNION ALL SELECT m.command_id,m.entity_id,c.position,m.operation,m.valid_from,m.valid_to
 FROM td_catalog_v1.entity_batch_members m JOIN td_catalog_v1.entity_batches b USING(command_id)
 JOIN main.commands c USING(command_id)
 JOIN td_catalog_v1.schema_type_modes t ON t.schema_name=b.schema_name AND t.entity_type=m.entity_type
 WHERE t.is_live;
CREATE OR REPLACE VIEW td_catalog_v1.entity_creators AS
 SELECT command_id,schema_name,schema_version,entity_type,entity_id,position,schema_hash FROM td_catalog_v1.entity_commands
 UNION ALL SELECT b.command_id,b.schema_name,b.schema_version,m.entity_type,m.entity_id,c.position,b.schema_hash
 FROM td_catalog_v1.entity_batches b JOIN td_catalog_v1.entity_batch_members m USING(command_id)
 JOIN main.commands c USING(command_id);
CREATE OR REPLACE VIEW td_catalog_v1.entity_command_intervals AS
 SELECT p.command_id,n.entity_id,p.valid_from,p.valid_to,FALSE is_batch,TRUE allows_carry
 FROM td_catalog_v1.entity_patch_commands p JOIN td_catalog_v1.entity_commands n USING(command_id)
 UNION ALL SELECT command_id,entity_id,valid_from,valid_to,FALSE is_batch,FALSE allows_carry
 FROM td_catalog_v1.entity_presence_edits WHERE operation='put'
 UNION ALL SELECT command_id,entity_id,valid_from,valid_to,TRUE is_batch,operation='patch' allows_carry
 FROM td_catalog_v1.entity_batch_members;
-- Identity persists independently of a record's current valid interval/values.
-- First declaration is derived from durable native commands, not mutable facts.
CREATE OR REPLACE VIEW td_catalog_v1.entity_identities AS
 SELECT o.entity_id,o.schema_name,o.entity_type,min(n.position) first_position
 FROM td_catalog_v1.entity_owners o JOIN td_catalog_v1.entity_creators n
 ON n.entity_id=o.entity_id AND n.schema_name=o.schema_name AND n.entity_type=o.entity_type
 JOIN main.commands c ON c.command_id=n.command_id AND c.position=n.position AND c.origin='triplex'
 JOIN td_catalog_v1.schemas s ON s.name=n.schema_name AND s.version=n.schema_version AND s.content_hash=n.schema_hash
 JOIN td_catalog_v1.entities e ON e.schema_name=n.schema_name AND e.version=n.schema_version AND e.entity_name=n.entity_type
 WHERE system.main.td_schema_check_v2(s.dsl,s.ir) GROUP BY o.entity_id,o.schema_name,o.entity_type;
CREATE TABLE IF NOT EXISTS main.assertions(
 assertion_id VARCHAR PRIMARY KEY,e VARCHAR NOT NULL,a VARCHAR NOT NULL,
 tag VARCHAR NOT NULL CHECK(tag IN('str','bool','i64','f64','ref','datetime','json','blob')),
 payload VARCHAR NOT NULL,valid_from BIGINT NOT NULL,valid_to BIGINT NOT NULL,
 tx_from BIGINT NOT NULL CHECK(tx_from>0),tx_to BIGINT NOT NULL,
 command_id VARCHAR,corrected_by VARCHAR,payload_hash VARCHAR NOT NULL,
 v_tag UTINYINT NOT NULL,v_s BLOB,v_b BOOLEAN,v_i BIGINT,v_f DOUBLE,
 recorded_at DOUBLE NOT NULL,retracted_at DOUBLE,
 external_valid_from DOUBLE,external_valid_to DOUBLE,
 created_by VARCHAR,entity_type VARCHAR,transaction_id VARCHAR,retract_transaction_id VARCHAR,
 extra_json VARCHAR,origin VARCHAR NOT NULL DEFAULT 'python' CHECK(origin IN('python','triplex')),
 interop BOOLEAN NOT NULL DEFAULT TRUE,
 CHECK((origin='triplex' AND tx_from<=tx_to) OR tx_from<tx_to),CHECK(origin='triplex' OR valid_from<valid_to),
 CHECK(isfinite(recorded_at) AND recorded_at>=0),
 CHECK(retracted_at IS NULL OR (isfinite(retracted_at) AND retracted_at>=0)),
 CHECK(external_valid_from IS NULL OR (isfinite(external_valid_from) AND external_valid_from>=0)),
 CHECK(external_valid_to IS NULL OR (isfinite(external_valid_to) AND external_valid_to>external_valid_from))
);

CREATE INDEX IF NOT EXISTS snapshot_cut ON main.assertions(tx_from,tx_to,valid_from,valid_to);
CREATE INDEX IF NOT EXISTS eav_lookup ON main.assertions(e,a);
CREATE INDEX IF NOT EXISTS transaction_history ON main.assertions(transaction_id);
CREATE OR REPLACE VIEW td_catalog_v1.native_catalog_integrity AS
 WITH provenance_children AS MATERIALIZED (
  SELECT a.assertion_id FROM main.assertions a
  SEMI JOIN td_catalog_v1.entity_assertion_sources p USING(assertion_id)
 )
 SELECT CASE
 WHEN (SELECT count(*) FROM main.store_meta)<>1 OR (SELECT min(version) FROM main.store_meta) NOT IN(5,6,8,9,10,11)
 THEN error('TD_E_COMMAND_FORMAT: invalid native store format')
 WHEN (SELECT count(*) FROM td_catalog_v1.catalog_revision)>1 OR EXISTS(
   SELECT 1 FROM td_catalog_v1.catalog_revision WHERE singleton IS DISTINCT FROM TRUE OR revision IS NULL OR revision NOT IN(2,3))
 THEN error('TD_E_COMMAND_FORMAT: unsupported native catalog revision')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.entity_patch_commands) AND
   ((SELECT min(version) FROM main.store_meta) NOT IN(6,8,9,10,11) OR (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>1)
 THEN error('TD_E_COMMAND_FORMAT: interval history requires an interval-capable format')
 WHEN (SELECT min(version) FROM main.store_meta)=6 AND
   (NOT EXISTS(SELECT 1 FROM td_catalog_v1.entity_patch_commands) OR (SELECT count(*) FROM td_catalog_v1.catalog_revision)<>1)
 THEN error('TD_E_COMMAND_FORMAT: native format six lacks interval history')
 WHEN (SELECT min(version) FROM main.store_meta)=8 AND NOT
   EXISTS(SELECT 1 FROM td_catalog_v1.schemas WHERE json_extract_string(ir,'$.format')='td.schema/2')
 OR (SELECT min(version) FROM main.store_meta) IN(5,6) AND
   EXISTS(SELECT 1 FROM td_catalog_v1.schemas WHERE json_extract_string(ir,'$.format')='td.schema/2')
 THEN error('TD_E_COMMAND_FORMAT: expanded schema metadata differs from store format')
 WHEN (SELECT min(version) FROM main.store_meta)<10 AND (((SELECT min(version) FROM main.store_meta)=9) IS DISTINCT FROM
   (EXISTS(SELECT 1 FROM td_catalog_v1.schemas s,json_each(s.ir,'$.entities') e,json_each(e.value,'$.attributes') f
     WHERE TRY_CAST(json_extract(f.value,'$.tag') AS UTINYINT) IN(7,8))
    OR EXISTS(SELECT 1 FROM td_catalog_v1.catalog_revision WHERE revision=3)))
 THEN error('TD_E_COMMAND_FORMAT: format nine feature metadata differs from store format')
 WHEN (SELECT min(version) FROM main.store_meta)<11 AND
   (((SELECT min(version) FROM main.store_meta)=10) IS DISTINCT FROM
   EXISTS(SELECT 1 FROM td_catalog_v1.schemas WHERE json_extract_string(ir,'$.format')='td.schema/3'))
 THEN error('TD_E_COMMAND_FORMAT: format ten uniqueness metadata differs from store format')
 WHEN ((SELECT min(version) FROM main.store_meta)=11) IS DISTINCT FROM
   EXISTS(SELECT 1 FROM td_catalog_v1.schemas WHERE json_extract_string(ir,'$.format')='td.schema/4')
 THEN error('TD_E_COMMAND_FORMAT: format eleven presence metadata differs from store format')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.schemas s FULL OUTER JOIN td_catalog_v1.schema_unique_activations u
   ON s.name=u.schema_name AND s.version=u.schema_version WHERE (u.command_id IS NOT NULL) IS DISTINCT FROM
   (CASE json_extract_string(s.ir,'$.format') WHEN 'td.schema/3' THEN TRUE WHEN 'td.schema/4' THEN
    EXISTS(SELECT 1 FROM json_each(s.ir,'$.entities') e,json_each(e.value,'$.attributes') f
     WHERE CAST(json_extract(f.value,'$.unique') AS BOOLEAN) IS TRUE) ELSE FALSE END))
 THEN error('TD_E_SCHEMA_UNIQUE_AUDIT: uniqueness activation binding is missing')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.schemas s FULL OUTER JOIN td_catalog_v1.schema_presence_activations u
   ON s.name=u.schema_name AND s.version=u.schema_version WHERE (u.command_id IS NOT NULL) IS DISTINCT FROM
   coalesce(json_extract_string(s.ir,'$.format')='td.schema/4',FALSE))
 OR ((SELECT min(version) FROM main.store_meta)<11 AND (
   EXISTS(SELECT 1 FROM td_catalog_v1.entity_presence_edits) OR
   EXISTS(SELECT 1 FROM td_catalog_v1.schema_type_modes WHERE is_live)))
 THEN error('TD_E_OWNER_AUDIT_PRESENCE: unexpected or missing presence metadata')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.schemas WHERE system.main.td_schema_check_v2(dsl,ir) IS NOT TRUE)
 THEN error('TD_E_SCHEMA_CATALOG: invalid stored schema')
 WHEN (SELECT min(version) FROM main.store_meta) IN(5,6,8) AND
   EXISTS(SELECT 1 FROM td_catalog_v1.catalog_revision WHERE revision<>2)
 THEN error('TD_E_COMMAND_FORMAT: legacy format/catalog revision mismatch')
 WHEN ((SELECT count(*) FROM td_catalog_v1.catalog_revision WHERE revision=3)=1)
   IS DISTINCT FROM EXISTS(SELECT 1 FROM td_catalog_v1.entity_batches)
 THEN error('TD_E_COMMAND_FORMAT: batch history and catalog revision differ')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.entity_batch_members m
   LEFT JOIN td_catalog_v1.entity_batches b USING(command_id) WHERE b.command_id IS NULL)
 THEN error('TD_E_COMMAND_HISTORY: orphan batch member')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.entity_batches b LEFT JOIN main.commands c USING(command_id)
   LEFT JOIN td_catalog_v1.schemas s ON s.name=b.schema_name AND s.version=b.schema_version
   WHERE c.command_id IS NULL OR c.origin IS DISTINCT FROM 'triplex' OR c.position IS NULL OR c.position<=0
    OR c.position>(SELECT position FROM main.clock WHERE singleton)
    OR c.request_hash IS NULL OR c.receipt IS NULL OR s.name IS NULL OR s.content_hash IS DISTINCT FROM b.schema_hash
    OR EXISTS(SELECT 1 FROM td_catalog_v1.entity_commands n WHERE n.command_id=b.command_id)
    OR b.member_count<>(SELECT count(*) FROM td_catalog_v1.entity_batch_members m WHERE m.command_id=b.command_id)
    OR b.member_count-1<>(SELECT max(m.ordinal) FROM td_catalog_v1.entity_batch_members m WHERE m.command_id=b.command_id)
    OR 0<>(SELECT min(m.ordinal) FROM td_catalog_v1.entity_batch_members m WHERE m.command_id=b.command_id))
 THEN error('TD_E_COMMAND_HISTORY: batch command binding is missing')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.entity_batch_members m
   JOIN td_catalog_v1.entity_batches b USING(command_id)
   LEFT JOIN td_catalog_v1.entity_owners o USING(entity_id)
   LEFT JOIN td_catalog_v1.entities e ON e.schema_name=b.schema_name AND e.version=b.schema_version AND e.entity_name=m.entity_type
   WHERE o.schema_name IS DISTINCT FROM b.schema_name OR o.entity_type IS DISTINCT FROM m.entity_type OR e.entity_name IS NULL)
 THEN error('TD_E_COMMAND_HISTORY: batch member binding is missing')
 WHEN EXISTS(SELECT 1 FROM td_catalog_v1.entity_patch_commands p
   LEFT JOIN td_catalog_v1.entity_commands n USING(command_id) LEFT JOIN main.commands c USING(command_id)
   LEFT JOIN td_catalog_v1.schemas s ON s.name=n.schema_name AND s.version=n.schema_version
   LEFT JOIN td_catalog_v1.entity_owners o ON o.entity_id=n.entity_id
   WHERE n.command_id IS NULL OR c.position IS DISTINCT FROM n.position OR c.origin IS DISTINCT FROM 'triplex'
     OR s.content_hash IS DISTINCT FROM n.schema_hash OR o.schema_name IS DISTINCT FROM n.schema_name
     OR o.entity_type IS DISTINCT FROM n.entity_type OR system.main.td_schema_check_v2(s.dsl,s.ir) IS NOT TRUE)
 THEN error('TD_E_COMMAND_HISTORY: interval command binding is missing')
 WHEN (SELECT count(*) FROM td_catalog_v1.entity_assertion_sources)<>
   (SELECT count(*) FROM provenance_children)
 THEN error('TD_E_COMMAND_HISTORY: orphan interval provenance')
 ELSE TRUE END ok;
CREATE OR REPLACE VIEW td_catalog_v1.entity_history AS
 WITH source_ids AS MATERIALIZED (
  SELECT DISTINCT source_assertion_id FROM td_catalog_v1.entity_assertion_sources
 ), source_rows AS MATERIALIZED (
  SELECT source.assertion_id,source.command_id,source.e,source.a,source.tag,source.payload,source.extra_json,source.entity_type,
   source.tx_from,source.tx_to,source.corrected_by,source.valid_from,source.valid_to
  FROM main.assertions source SEMI JOIN source_ids ids ON source.assertion_id=ids.source_assertion_id
 )
 SELECT a.assertion_id,a.e entity_id,a.a attribute,a.tag,a.payload,a.valid_from,a.valid_to,a.tx_from,a.tx_to,
 a.command_id,a.corrected_by,v.schema_name,v.schema_version,v.entity_type,v.schema_hash
 FROM main.assertions a LEFT JOIN td_catalog_v1.entity_creators n ON n.command_id=a.command_id AND n.entity_id=a.e
 LEFT JOIN td_catalog_v1.entity_assertion_sources provenance ON provenance.assertion_id=a.assertion_id
 LEFT JOIN source_rows source ON source.assertion_id=provenance.source_assertion_id
 LEFT JOIN td_catalog_v1.entity_assertion_sources source_origin ON source_origin.assertion_id=source.assertion_id
 LEFT JOIN td_catalog_v1.entity_command_intervals member_interval ON member_interval.command_id=a.command_id AND member_interval.entity_id=a.e
 LEFT JOIN td_catalog_v1.entity_creators v ON v.command_id=coalesce(provenance.validation_command_id,a.command_id) AND v.entity_id=a.e
 LEFT JOIN td_catalog_v1.entity_owners owner ON owner.entity_id=a.e
 LEFT JOIN td_catalog_v1.schemas s ON s.name=v.schema_name AND s.version=v.schema_version
 LEFT JOIN main.commands c ON c.command_id=a.command_id
 LEFT JOIN td_catalog_v1.schema_references r ON r.schema_name=v.schema_name AND r.version=v.schema_version
  AND r.entity_type=v.entity_type AND r.attribute=a.a
 LEFT JOIN td_catalog_v1.entity_identities target ON r.reference_type=target.entity_type AND target.schema_name=v.schema_name
  AND target.entity_id=decode(a.v_s)
 WHERE CASE WHEN n.command_id IS NULL AND owner.entity_id IS NULL AND NOT coalesce(c.origin='triplex' AND c.request_hash IS NOT NULL,FALSE)
 THEN FALSE WHEN n.command_id IS NULL THEN error('TD_E_COMMAND_HISTORY: native creator binding is missing')
 WHEN v.command_id IS NULL THEN error('TD_E_COMMAND_HISTORY: native validation binding is missing')
 WHEN (s.content_hash=v.schema_hash AND c.position=n.position AND a.tx_from=n.position
  AND a.e=n.entity_id AND a.entity_type=n.entity_type AND a.payload_hash=sha256(a.payload)
  AND owner.schema_name=n.schema_name AND owner.entity_type=n.entity_type
  AND v.schema_name=n.schema_name AND v.entity_type=n.entity_type AND v.entity_id=a.e
  AND system.main.td_validate_schema_fact_v2(s.dsl,s.ir,v.entity_type,a.a,a.v_tag)
  AND (r.reference_type IS NULL OR target.first_position<=v.position)
  AND CASE WHEN provenance.assertion_id IS NULL THEN
    member_interval.command_id IS NULL OR (a.valid_from=member_interval.valid_from AND a.valid_to=member_interval.valid_to)
   ELSE member_interval.allows_carry AND source.assertion_id IS NOT NULL
    AND provenance.validation_command_id=coalesce(source_origin.validation_command_id,source.command_id)
    AND v.position<=source.tx_from AND source.tx_from<a.tx_from AND source.tx_to=a.tx_from
    AND source.corrected_by=a.command_id AND source.e=a.e AND source.a=a.a AND source.tag=a.tag
    AND source.payload=a.payload AND source.extra_json IS NOT DISTINCT FROM a.extra_json AND source.entity_type=a.entity_type
    AND source.valid_from<member_interval.valid_to AND source.valid_to>member_interval.valid_from
    AND CASE provenance.side WHEN 'left' THEN
      a.valid_from=source.valid_from AND a.valid_to=member_interval.valid_from AND source.valid_from<member_interval.valid_from
     WHEN 'right' THEN a.valid_from=member_interval.valid_to AND a.valid_to=source.valid_to AND member_interval.valid_to<source.valid_to
     ELSE FALSE END
    AND a.assertion_id=CASE WHEN member_interval.is_batch THEN
      sha256(to_json(struct_pack(kind:='td.entity.batch.fragment/1',command_id:=a.command_id,entity_id:=a.e,
       source_assertion_id:=source.assertion_id,side:=provenance.side)))
     ELSE sha256(to_json(struct_pack(kind:='td.entity.patch.fragment/1',command_id:=a.command_id,
      source_assertion_id:=source.assertion_id,side:=provenance.side))) END END
  AND CASE a.tag
   WHEN 'str' THEN a.v_tag=1 AND json_extract_string(a.payload,'$')=decode(a.v_s) AND json_type(a.payload)='VARCHAR'
   WHEN 'bool' THEN a.v_tag=2 AND a.payload=CAST(to_json(a.v_b) AS VARCHAR)
   WHEN 'i64' THEN a.v_tag=3 AND json_extract_string(a.payload,'$')=a.v_i::VARCHAR AND json_type(a.payload)='VARCHAR'
   WHEN 'f64' THEN a.v_tag=4 AND json_extract_string(a.payload,'$')=system.main.td_float_bits_v1(a.v_f) AND json_type(a.payload)='VARCHAR'
   WHEN 'ref' THEN a.v_tag=5 AND octet_length(a.v_s) BETWEEN 1 AND 128
    AND json_extract_string(a.payload,'$')=decode(a.v_s) AND json_type(a.payload)='VARCHAR'
   WHEN 'datetime' THEN a.v_tag=6 AND json_extract_string(a.payload,'$')=system.main.td_float_bits_v1(a.v_f)
    AND json_type(a.payload)='VARCHAR'
   WHEN 'json' THEN a.v_tag=7 AND json_type(a.payload)='VARCHAR' AND a.extra_json IS NULL
    AND a.v_s=encode(json_extract_string(a.payload,'$')) AND system.main.td_validate_json_source_v2(decode(a.v_s))
   WHEN 'blob' THEN a.v_tag=8 AND system.main.td_validate_blob_descriptor_v2(a.payload,decode(a.v_s),a.extra_json)
   ELSE FALSE END) IS TRUE THEN TRUE
  ELSE error('TD_E_COMMAND_HISTORY: native history binding or carrier is inconsistent') END;
CREATE SCHEMA IF NOT EXISTS td_triplex_public_v1;
CREATE TABLE IF NOT EXISTS td_triplex_public_v1.scope_identity(singleton BIGINT PRIMARY KEY CHECK(singleton=1),scope_id VARCHAR NOT NULL,profile VARCHAR NOT NULL);
CREATE VIEW IF NOT EXISTS td_triplex_public_v1.triplex_commit_position AS SELECT 1::BIGINT singleton,position FROM main.clock;
CREATE VIEW IF NOT EXISTS td_triplex_public_v1.triplex_command_receipts AS SELECT command_id,transaction_id,recorded_at FROM main.commands;
CREATE VIEW IF NOT EXISTS td_triplex_public_v1.triples AS SELECT assertion_id id,e entity_id,a attribute,
 CASE tag WHEN 'str' THEN 'string' WHEN 'bool' THEN 'boolean' WHEN 'i64' THEN 'number' WHEN 'f64' THEN 'number' ELSE tag END value_type,
 CASE WHEN tag IN('str','ref','blob') THEN decode(v_s) END value_string,
 CASE WHEN tag='i64' THEN v_i::DOUBLE WHEN tag='f64' THEN v_f END value_number,
 CASE WHEN tag='bool' THEN v_b::SMALLINT END value_boolean,
 CASE WHEN tag='datetime' THEN v_f END value_datetime,
 CASE WHEN tag='json' THEN decode(v_s) WHEN tag='blob' THEN extra_json END value_json,
 recorded_at,tx_from recorded_position,external_valid_from valid_from,external_valid_to valid_to,
 created_by,retracted_at,CASE WHEN tx_to<9223372036854775807 THEN tx_to END retracted_position,
 retract_transaction_id retract_tx_id,entity_type,1::BIGINT schema_version,transaction_id tx_id
 FROM main.assertions;
DROP TABLE __td_catalog_format;
DROP TABLE __td_catalog_bootstrap;
