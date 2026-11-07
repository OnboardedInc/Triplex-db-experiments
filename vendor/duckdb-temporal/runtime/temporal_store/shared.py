"""One persisted assertion/clock/command authority for both public APIs."""
from pathlib import Path

MAX_I64=9223372036854775807
MAX_SAFE=9007199254740991
SCHEMA='td_triplex_public_v1'
PROFILE='triplex-public-duckdb/1'
ORIGINAL_COLUMNS=('assertion_id,e,a,tag,payload,valid_from,valid_to,tx_from,tx_to,command_id,corrected_by,'
                  'payload_hash,v_tag,v_s,v_b,v_i,v_f')

# Parameterized SELECT source used for Node writes and legacy Triplex migration.
# The native integer-time carrier is a projection of fractional Triplex times;
# empty integer projections are permitted for Triplex-origin assertions only.
PAYLOAD="""CASE WHEN value_type='boolean' THEN CAST(to_json(value_boolean=1) AS VARCHAR)
 ELSE CAST(to_json(CASE value_type WHEN 'number' THEN main.td_float_bits_v1(value_number)
 WHEN 'datetime' THEN main.td_float_bits_v1(value_datetime) WHEN 'json' THEN value_json ELSE value_string END) AS VARCHAR) END"""
TRIPLEX_IMPORT='''SELECT id,entity_id,attribute,
 CASE value_type WHEN 'string' THEN 'str' WHEN 'boolean' THEN 'bool' WHEN 'number' THEN 'f64' ELSE value_type END,
 '''+PAYLOAD+''',
 CASE WHEN valid_from>=9223372036854775808::DOUBLE THEN 9223372036854775807 ELSE ceil(valid_from)::BIGINT END,
 CASE WHEN valid_to IS NULL OR valid_to>=9223372036854775808::DOUBLE THEN 9223372036854775807 ELSE ceil(valid_to)::BIGINT END,
 recorded_position,coalesce(retracted_position,9223372036854775807::BIGINT),NULL,NULL,sha256('''+PAYLOAD+'''),
 CASE value_type WHEN 'string' THEN 1 WHEN 'boolean' THEN 2 WHEN 'number' THEN 4 WHEN 'ref' THEN 5
  WHEN 'datetime' THEN 6 WHEN 'json' THEN 7 WHEN 'blob' THEN 8 END::UTINYINT,
 CASE WHEN value_type IN('string','ref','blob') THEN encode(value_string) WHEN value_type='json' THEN encode(value_json) END,
 CASE WHEN value_type='boolean' THEN value_boolean=1 END,NULL::BIGINT,
 CASE WHEN value_type='number' THEN value_number WHEN value_type='datetime' THEN value_datetime END,
 recorded_at,retracted_at,valid_from,valid_to,created_by,entity_type,tx_id,retract_tx_id,
 CASE WHEN value_type='blob' THEN value_json END,'triplex',TRUE
 FROM incoming'''


def create_views(connection):
    connection.execute('CREATE SCHEMA IF NOT EXISTS '+SCHEMA)
    connection.execute('CREATE TABLE IF NOT EXISTS '+SCHEMA+'.scope_identity('
        'singleton BIGINT PRIMARY KEY CHECK(singleton=1),scope_id VARCHAR NOT NULL,profile VARCHAR NOT NULL)')
    connection.execute('CREATE VIEW '+SCHEMA+'.triplex_commit_position AS SELECT 1::BIGINT singleton,position FROM main.clock')
    connection.execute('CREATE VIEW '+SCHEMA+'.triplex_command_receipts AS SELECT command_id,transaction_id,recorded_at FROM main.commands')
    connection.execute('''CREATE VIEW '''+SCHEMA+'''.triples AS SELECT assertion_id id,e entity_id,a attribute,
 CASE tag WHEN 'str' THEN 'string' WHEN 'bool' THEN 'boolean' WHEN 'i64' THEN 'number' WHEN 'f64' THEN 'number' ELSE tag END value_type,
 CASE WHEN tag IN('str','ref','blob') THEN decode(v_s) END value_string,
 CASE WHEN tag='i64' THEN v_i::DOUBLE WHEN tag='f64' THEN v_f END value_number,
 CASE WHEN tag='bool' THEN v_b::SMALLINT END value_boolean,
 CASE WHEN tag='datetime' THEN v_f END value_datetime,
 CASE WHEN tag='json' THEN decode(v_s) WHEN tag='blob' THEN extra_json END value_json,
 recorded_at,tx_from recorded_position,external_valid_from valid_from,external_valid_to valid_to,
 created_by,retracted_at,CASE WHEN tx_to<9223372036854775807 THEN tx_to END retracted_position,
 retract_transaction_id retract_tx_id,entity_type,1::BIGINT schema_version,transaction_id tx_id
 FROM main.assertions''')


def migrate(connection, checkpoint):
    """Caller owns the physical transaction. No external database is attached."""
    legacy=connection.execute("SELECT table_name,table_type FROM information_schema.tables WHERE table_schema=?",
                              [SCHEMA]).fetchall()
    if legacy and {name for name,kind in legacy}!={'triples','triplex_commit_position','triplex_command_receipts','scope_identity'}:
        raise ValueError('unsupported legacy Triplex schema')
    if legacy and any(kind!='BASE TABLE' for name,kind in legacy):
        raise ValueError('unexpected pre-migration shared-schema view')
    if legacy and (connection.execute('SELECT count(*) FROM main.commands').fetchone()[0] or connection.execute('SELECT position FROM main.clock').fetchone()[0]):
        raise ValueError('independent Python and Triplex histories require an explicit position mapping')
    connection.execute((Path(__file__).parent/'shared_schema.sql').read_text())
    connection.execute("INSERT INTO main.commands_v5 SELECT command_id,request_hash,position,receipt,command_id,position::DOUBLE,'python' FROM main.commands")
    connection.execute('INSERT INTO main.assertions_v5 SELECT '+ORIGINAL_COLUMNS+''',
 tx_from::DOUBLE,CASE WHEN tx_to<9223372036854775807 THEN tx_to::DOUBLE END,
 CASE WHEN valid_from BETWEEN 0 AND 9007199254740991 THEN valid_from::DOUBLE END,
 CASE WHEN valid_to=9223372036854775807 THEN NULL WHEN valid_to BETWEEN 0 AND 9007199254740991 THEN valid_to::DOUBLE END,
 NULL,NULL,command_id,corrected_by,NULL,'python',
 valid_from BETWEEN 0 AND 9007199254740991 AND (valid_to=9223372036854775807 OR valid_to BETWEEN 0 AND 9007199254740991)
 AND (tag<>'i64' OR v_i BETWEEN -9007199254740991 AND 9007199254740991)
 FROM main.assertions''')
    if legacy:
        position=connection.execute('SELECT position FROM '+SCHEMA+'.triplex_commit_position WHERE singleton=1').fetchone()[0]
        connection.execute('UPDATE main.clock SET position=?',[position])
        connection.execute('INSERT INTO main.commands_v5 SELECT command_id,NULL,NULL,NULL,transaction_id,recorded_at,\'triplex\' FROM '+SCHEMA+'.triplex_command_receipts')
        connection.execute('INSERT INTO main.assertions_v5 WITH incoming AS (SELECT * FROM '+SCHEMA+'.triples) '+TRIPLEX_IMPORT)
        connection.execute("UPDATE main.assertions_v5 SET payload=CAST(to_json(v_b) AS VARCHAR) WHERE tag='bool'")
        connection.execute('UPDATE main.assertions_v5 SET payload_hash=sha256(payload) WHERE origin=\'triplex\'')
        for name in ('triples','triplex_commit_position','triplex_command_receipts'):
            connection.execute('DROP TABLE '+SCHEMA+'.'+name)
    checkpoint('shared_assertion_backfill')
    connection.execute('DROP TABLE main.assertions')
    connection.execute('DROP TABLE main.commands')
    connection.execute('ALTER TABLE main.assertions_v5 RENAME TO assertions')
    connection.execute('ALTER TABLE main.commands_v5 RENAME TO commands')
    connection.execute('CREATE INDEX snapshot_cut ON main.assertions(tx_from,tx_to,valid_from,valid_to)')
    connection.execute('CREATE INDEX eav_lookup ON main.assertions(e,a)')
    connection.execute('CREATE INDEX transaction_history ON main.assertions(transaction_id)')
    connection.execute('UPDATE main.storage_usage SET retained_count=(SELECT count(*) FROM main.assertions),'
        'retained_bytes=(SELECT coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+'
        'coalesce(octet_length(encode(extra_json)),0)),0) FROM main.assertions)')
    create_views(connection)
    connection.execute('DROP TABLE main.store_meta')
    connection.execute('CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version=5))')
    connection.execute('INSERT INTO main.store_meta VALUES (5)')
