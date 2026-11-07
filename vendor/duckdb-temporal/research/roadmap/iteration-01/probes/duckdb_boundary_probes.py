"""Disposable DuckDB 2.0.0 probes for the typed-value research gate.

Uses only an in-memory database. It does not edit a source tree or user store.
Run with the pinned DuckDB wheel on PYTHONPATH; never installs dependencies.
"""
from __future__ import annotations

import json
import struct
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parent
VALUE_TYPE = "STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)"


def boundary_probe(connection):
    records = []
    values = [
        dict(tag=1, s="1", b=None, i=None, f=None),
        dict(tag=2, s=None, b=True, i=None, f=None),
        dict(tag=3, s=None, b=None, i=2**63 - 1, f=None),
        dict(tag=4, s=None, b=None, i=None, f=1.0),
        dict(tag=4, s=None, b=None, i=None, f=-0.0),
        dict(tag=4, s=None, b=None, i=None, f=5e-324),
    ]
    for value in values:
        returned = connection.execute(
            f"SELECT ?::{VALUE_TYPE}", [value]
        ).fetchone()[0]
        assert returned == value
        if value["f"] is not None:
            assert struct.pack(">d", returned["f"]) == struct.pack(">d", value["f"])
        records.append(returned)
    count = connection.execute(
        """SELECT count(DISTINCT v) FROM (VALUES
        ({'tag':1::UTINYINT,'s':'1'::VARCHAR,'b':NULL::BOOLEAN,'i':NULL::BIGINT,'f':NULL::DOUBLE}),
        ({'tag':2::UTINYINT,'s':NULL::VARCHAR,'b':true::BOOLEAN,'i':NULL::BIGINT,'f':NULL::DOUBLE}),
        ({'tag':3::UTINYINT,'s':NULL::VARCHAR,'b':NULL::BOOLEAN,'i':1::BIGINT,'f':NULL::DOUBLE}),
        ({'tag':4::UTINYINT,'s':NULL::VARCHAR,'b':NULL::BOOLEAN,'i':NULL::BIGINT,'f':1.0::DOUBLE})
        ) AS x(v)"""
    ).fetchone()[0]
    assert count == 4
    return {
        "duckdb": duckdb.__version__,
        "coercion": connection.execute("SELECT 1 = true, 1 = '1.1'").fetchone(),
        "explicit_struct_roundtrip": records,
        "distinct_tagged_rows": count,
    }


def migration_probe(connection):
    # Minimal original schema including constraints relevant to transactional DDL.
    connection.execute("""
        CREATE TABLE td_schema_version(singleton SMALLINT PRIMARY KEY CHECK(singleton=1),
            version INTEGER NOT NULL CHECK(version=1));
        INSERT INTO td_schema_version VALUES(1,1);
        CREATE TABLE td_commits(position BIGINT PRIMARY KEY, command_id VARCHAR UNIQUE);
        INSERT INTO td_commits VALUES(1,'probe');
        CREATE TABLE temporal_facts(fact_id VARCHAR PRIMARY KEY,e VARCHAR NOT NULL,
            a VARCHAR NOT NULL,v VARCHAR NOT NULL,valid_from BIGINT NOT NULL,
            valid_to BIGINT NOT NULL,tx_from BIGINT NOT NULL REFERENCES td_commits(position),
            tx_to BIGINT NOT NULL,inserted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retracted_at TIMESTAMPTZ,CHECK(valid_from<valid_to),CHECK(tx_from<tx_to));
        INSERT INTO temporal_facts(fact_id,e,a,v,valid_from,valid_to,tx_from,tx_to)
            VALUES('1:0','e','a','1',0,10,1,9223372036854775807);
    """)
    observed = {"duckdb": duckdb.__version__}
    for query in (
        "ALTER TABLE temporal_facts ADD COLUMN v_tag UTINYINT DEFAULT 1 NOT NULL",
        "ALTER TABLE temporal_facts ADD COLUMN v_bool BOOLEAN",
    ):
        connection.execute("BEGIN")
        try:
            connection.execute(query)
            observed[query] = "supported"
        except duckdb.Error as error:
            observed[query] = f"{type(error).__name__}: {error}"
        finally:
            connection.execute("ROLLBACK")

    def replace_schema():
        connection.execute("""
            CREATE TABLE temporal_facts_v2(fact_id VARCHAR PRIMARY KEY,e VARCHAR NOT NULL,
                a VARCHAR NOT NULL,v_tag UTINYINT NOT NULL,v_str VARCHAR,v_bool BOOLEAN,
                v_i64 BIGINT,v_f64 DOUBLE,valid_from BIGINT NOT NULL,valid_to BIGINT NOT NULL,
                tx_from BIGINT NOT NULL REFERENCES td_commits(position),tx_to BIGINT NOT NULL,
                inserted_at TIMESTAMPTZ NOT NULL,retracted_at TIMESTAMPTZ,
                CHECK(valid_from<valid_to),CHECK(tx_from<tx_to),
                CHECK(v_tag=1 AND v_str IS NOT NULL AND v_bool IS NULL
                    AND v_i64 IS NULL AND v_f64 IS NULL));
            INSERT INTO temporal_facts_v2 SELECT fact_id,e,a,1,v,NULL,NULL,NULL,
                valid_from,valid_to,tx_from,tx_to,inserted_at,retracted_at FROM temporal_facts;
            DROP TABLE temporal_facts;
            ALTER TABLE temporal_facts_v2 RENAME TO temporal_facts;
            DROP TABLE td_schema_version;
            CREATE TABLE td_schema_version(singleton SMALLINT PRIMARY KEY CHECK(singleton=1),
                version INTEGER NOT NULL CHECK(version IN (1,2)));
            INSERT INTO td_schema_version VALUES(1,2);
        """)

    connection.execute("BEGIN")
    replace_schema()
    connection.execute("ROLLBACK")
    observed["rebuild_rollback"] = {
        "version": connection.execute("SELECT version FROM td_schema_version").fetchone()[0],
        "legacy_row": connection.execute(
            "SELECT fact_id,e,a,v,valid_from,valid_to,tx_from,tx_to FROM temporal_facts"
        ).fetchall(),
    }
    assert observed["rebuild_rollback"]["version"] == 1
    connection.execute("BEGIN")
    replace_schema()
    connection.execute("COMMIT")
    observed["rebuild_commit"] = {
        "version": connection.execute("SELECT version FROM td_schema_version").fetchone()[0],
        "typed_row": connection.execute(
            "SELECT fact_id,e,a,v_tag,v_str,valid_from,valid_to,tx_from,tx_to FROM temporal_facts"
        ).fetchall(),
        "receipt": connection.execute("SELECT position,command_id FROM td_commits").fetchall(),
    }
    assert observed["rebuild_commit"]["version"] == 2
    assert observed["rebuild_commit"]["typed_row"] == [
        ("1:0", "e", "a", 1, "1", 0, 10, 1, 2**63 - 1)
    ]
    assert observed["rebuild_commit"]["receipt"] == [(1, "probe")]
    return observed


def main():
    assert duckdb.__version__ == "2.0.0", "Research evidence is pinned to DuckDB 2.0.0"
    with duckdb.connect(config={"threads": 1, "memory_limit": "96MB"}) as connection:
        boundary = boundary_probe(connection)
        migration = migration_probe(connection)
    for name, result in (("duckdb-tagged-struct.json", boundary),
                         ("duckdb-migration-ddl.json", migration)):
        (ROOT / name).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Typed boundary and disposable migration DDL probes passed")


if __name__ == "__main__":
    main()
