-- temporal-store/public-triplex/2
CREATE SCHEMA IF NOT EXISTS td_triplex_public_v2;
CREATE TABLE IF NOT EXISTS td_triplex_public_v2.scope_identity(
 singleton BIGINT PRIMARY KEY CHECK(singleton=1),scope_id VARCHAR NOT NULL,profile VARCHAR NOT NULL
);
CREATE VIEW IF NOT EXISTS td_triplex_public_v2.triplex_commit_position AS
 SELECT 1::BIGINT singleton,position FROM main.clock;
CREATE VIEW IF NOT EXISTS td_triplex_public_v2.triplex_command_receipts AS
 SELECT command_id,transaction_id,recorded_at FROM main.commands;
CREATE OR REPLACE VIEW td_triplex_public_v2.triples AS
 SELECT assertion_id id,e entity_id,a attribute,
 CASE tag WHEN 'str' THEN 'string' WHEN 'bool' THEN 'boolean' WHEN 'i64' THEN 'integer'
  WHEN 'f64' THEN 'number' ELSE tag END value_type,
 CASE WHEN tag IN('str','ref','blob') THEN decode(v_s) WHEN tag='i64' THEN v_i::VARCHAR END value_string,
 CASE WHEN tag='f64' THEN v_f END value_number,
 CASE WHEN tag='bool' THEN v_b::SMALLINT END value_boolean,
 CASE WHEN tag='datetime' THEN v_f END value_datetime,
 CASE WHEN tag='json' THEN decode(v_s) WHEN tag='blob' THEN extra_json END value_json,
 recorded_at,tx_from recorded_position,external_valid_from valid_from,external_valid_to valid_to,
 created_by,retracted_at,CASE WHEN tx_to<9223372036854775807 THEN tx_to END retracted_position,
 retract_transaction_id retract_tx_id,entity_type,1::BIGINT schema_version,transaction_id tx_id
 FROM main.assertions;
