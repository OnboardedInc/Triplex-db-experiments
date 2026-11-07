CREATE TABLE store_meta(version INTEGER PRIMARY KEY CHECK(version=1));
INSERT INTO store_meta VALUES (1);
CREATE TABLE clock(singleton BOOLEAN PRIMARY KEY CHECK(singleton), position BIGINT NOT NULL CHECK(position>=0));
INSERT INTO clock VALUES (true,0);
CREATE TABLE commands(
  command_id VARCHAR PRIMARY KEY,
  request_hash VARCHAR NOT NULL,
  position BIGINT UNIQUE NOT NULL CHECK(position>0),
  receipt VARCHAR NOT NULL
);
CREATE TABLE assertions(
  assertion_id VARCHAR PRIMARY KEY,
  e VARCHAR NOT NULL,
  a VARCHAR NOT NULL,
  tag VARCHAR NOT NULL CHECK(tag IN ('str','bool','i64','f64')),
  payload VARCHAR NOT NULL,
  valid_from BIGINT NOT NULL,
  valid_to BIGINT NOT NULL,
  tx_from BIGINT NOT NULL CHECK(tx_from>0),
  tx_to BIGINT NOT NULL,
  command_id VARCHAR NOT NULL REFERENCES commands(command_id),
  corrected_by VARCHAR REFERENCES commands(command_id),
  CHECK(valid_from<valid_to), CHECK(tx_from<tx_to)
);
CREATE INDEX snapshot_cut ON assertions(tx_from,tx_to,valid_from,valid_to);
CREATE INDEX eav_lookup ON assertions(e,a);
