-- Canonical scalar/Triplex assertions. Created under staging names by migration.
CREATE TABLE main.commands_v5(
 command_id VARCHAR PRIMARY KEY, request_hash VARCHAR, position BIGINT UNIQUE,
 receipt VARCHAR, transaction_id VARCHAR NOT NULL, recorded_at DOUBLE NOT NULL,
 origin VARCHAR NOT NULL CHECK(origin IN('python','triplex')),
 CHECK(isfinite(recorded_at) AND recorded_at>=0),
 CHECK(origin<>'python' OR (request_hash IS NOT NULL AND position>0 AND receipt IS NOT NULL))
);
CREATE TABLE main.assertions_v5(
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
