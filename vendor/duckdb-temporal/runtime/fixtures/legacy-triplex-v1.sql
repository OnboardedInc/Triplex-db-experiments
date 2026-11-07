-- Fresh owned pinned-public-row prototype. No legacy DB adoption or migration.
CREATE SCHEMA td_triplex_public_v1;
CREATE TABLE td_triplex_public_v1.scope_identity (
 singleton BIGINT PRIMARY KEY CHECK(singleton=1),
 scope_id VARCHAR NOT NULL,
 profile VARCHAR NOT NULL CHECK(profile='triplex-public-duckdb/1')
);
CREATE TABLE td_triplex_public_v1.triplex_commit_position (
 singleton BIGINT PRIMARY KEY CHECK(singleton=1),
 position BIGINT NOT NULL CHECK(position>=0 AND position<=9007199254740991)
);
CREATE TABLE td_triplex_public_v1.triplex_command_receipts (
 command_id VARCHAR PRIMARY KEY,
 transaction_id VARCHAR NOT NULL,
 recorded_at DOUBLE NOT NULL CHECK(isfinite(recorded_at) AND recorded_at>=0)
);
CREATE TABLE td_triplex_public_v1.triples (
 id VARCHAR PRIMARY KEY,
 entity_id VARCHAR NOT NULL,
 attribute VARCHAR NOT NULL,
 value_type VARCHAR NOT NULL CHECK(value_type IN('string','number','boolean','datetime','ref','json','blob')),
 value_string VARCHAR,
 value_number DOUBLE CHECK(value_number IS NULL OR isfinite(value_number)),
 value_boolean SMALLINT CHECK(value_boolean IS NULL OR value_boolean IN(0,1)),
 value_datetime DOUBLE CHECK(value_datetime IS NULL OR isfinite(value_datetime)),
 value_json VARCHAR,
 recorded_at DOUBLE NOT NULL CHECK(isfinite(recorded_at) AND recorded_at>=0),
 recorded_position BIGINT NOT NULL CHECK(recorded_position>=1 AND recorded_position<=9007199254740991),
 valid_from DOUBLE NOT NULL CHECK(isfinite(valid_from) AND valid_from>=0),
 valid_to DOUBLE CHECK(valid_to IS NULL OR (isfinite(valid_to) AND valid_to>valid_from)),
 created_by VARCHAR,
 retracted_at DOUBLE CHECK(retracted_at IS NULL OR (isfinite(retracted_at) AND retracted_at>=0)),
 retracted_position BIGINT CHECK(retracted_position IS NULL OR (retracted_position>=1 AND retracted_position<=9007199254740991)),
 retract_tx_id VARCHAR,
 entity_type VARCHAR,
 schema_version BIGINT NOT NULL CHECK(schema_version=1),
 tx_id VARCHAR,
 CHECK((retracted_at IS NULL AND retracted_position IS NULL AND retract_tx_id IS NULL) OR (retracted_at IS NOT NULL AND retracted_position IS NOT NULL AND retract_tx_id IS NOT NULL)),
 CHECK(retracted_position IS NULL OR retracted_position>=recorded_position),
 CHECK(CASE value_type
  WHEN 'string' THEN value_string IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL AND value_datetime IS NULL AND value_json IS NULL
  WHEN 'ref' THEN value_string IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL AND value_datetime IS NULL AND value_json IS NULL
  WHEN 'number' THEN value_string IS NULL AND value_number IS NOT NULL AND value_boolean IS NULL AND value_datetime IS NULL AND value_json IS NULL
  WHEN 'boolean' THEN value_string IS NULL AND value_number IS NULL AND value_boolean IS NOT NULL AND value_datetime IS NULL AND value_json IS NULL
  WHEN 'datetime' THEN value_string IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_datetime IS NOT NULL AND value_json IS NULL
  WHEN 'json' THEN value_string IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_datetime IS NULL AND value_json IS NOT NULL
  WHEN 'blob' THEN value_string IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL AND value_datetime IS NULL AND value_json IS NOT NULL
  ELSE FALSE END)
);
CREATE INDEX public_triples_entity ON td_triplex_public_v1.triples(entity_id);
CREATE INDEX public_triples_attribute ON td_triplex_public_v1.triples(attribute);
CREATE INDEX public_triples_recorded_position ON td_triplex_public_v1.triples(recorded_position);
CREATE INDEX public_triples_retracted_position ON td_triplex_public_v1.triples(retracted_position);
