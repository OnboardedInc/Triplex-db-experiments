#!/usr/bin/env python3
"""Future td_query_v2 DuckDB 2.0.0 acceptance tests, not an implementation.

--check-spec and --list-tests are dependency-free and never load native code.
Integration runs require an explicitly selected, trusted extension. Missing v2
is UNAVAILABLE/exit 2, never a skipped suite or passing conformance result.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import re
import struct
import sys
import unittest
from typing import Any

ROOT = Path(__file__).resolve().parent
MIN_I64 = -(2**63)
MAX_I64 = 2**63 - 1
VALUE_TYPE = "STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)"
FACT_TYPE = (f"STRUCT(e VARCHAR,a VARCHAR,v {VALUE_TYPE},valid_from BIGINT,"
             "valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]")
LEGACY_TYPE = ("STRUCT(e VARCHAR,a VARCHAR,v VARCHAR,valid_from BIGINT,"
               "valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)[]")
QUERY = (f"SELECT td_query_v2(?::VARCHAR,?::{FACT_TYPE},?::BIGINT,?::BIGINT,"
         "?::BIGINT,?::BIGINT,?::BIGINT)")
BIND_ONLY = (f"SELECT ?::VARCHAR,?::{FACT_TYPE},?::BIGINT,?::BIGINT,"
             "?::BIGINT,?::BIGINT,?::BIGINT")
LEGACY_QUERY = (f"SELECT td_query(?::VARCHAR,?::{LEGACY_TYPE},?::BIGINT,?::BIGINT,"
                "?::BIGINT,?::BIGINT,?::BIGINT)")
PROGRAM = "answer(?v) :- triple('e','a',?v)."
DEFAULT_LIMITS = (100_000, 1_000, 5_000_000)
TAG_FIELDS = {1: "s", 2: "b", 3: "i", 4: "f"}
SOURCE_TAGS = {"str": 1, "bool": 2, "i64": 3, "f64": 4}
PAYLOAD_FIELDS = ("s", "b", "i", "f")
INTEGER_TEXT = re.compile(r"(?:0|-?[1-9][0-9]*)\Z", re.ASCII)


class SourceContractError(ValueError):
    """A test input is invalid before SQL binding, not a native rejection."""


def scalar_text(value: Any, name: str, maximum: int = 16_384) -> str:
    if type(value) is not str or "\0" in value:
        raise SourceContractError(f"{name}: expected a NUL-free string")
    try:
        encoded = value.encode("utf-8", errors="strict")
    except UnicodeEncodeError as error:
        raise SourceContractError(f"{name}: invalid Unicode scalar text") from error
    if len(encoded) > maximum:
        raise SourceContractError(f"{name}: UTF-8 byte limit exceeded")
    return value


def i64_text(value: Any, name: str) -> int:
    if type(value) is not str or len(value) > 21 or not INTEGER_TEXT.fullmatch(value):
        raise SourceContractError(f"{name}: expected canonical decimal-string int64")
    parsed = int(value, 10)
    if not MIN_I64 <= parsed <= MAX_I64:
        raise SourceContractError(f"{name}: outside signed int64")
    return parsed


def raw_value(tag: Any, *, s=None, b=None, i=None, f=None) -> dict:
    """Build a physical SQL carrier; deliberately permits malformed shapes."""
    return {"tag": tag, "s": s, "b": b, "i": i, "f": f}


def source_value(value: Any) -> dict:
    """Strict test-fixture decoder; not the application's production validator."""
    if type(value) is not dict or set(value) != {"t", "v"}:
        raise SourceContractError("value: expected exactly t and v")
    tag = value["t"]
    if type(tag) is not str or tag not in SOURCE_TAGS:
        raise SourceContractError("value: unsupported type tag")
    payload = value["v"]
    if tag == "str":
        return raw_value(1, s=scalar_text(payload, "value.str"))
    if tag == "bool":
        if type(payload) is not bool:
            raise SourceContractError("value.bool: expected boolean")
        return raw_value(2, b=payload)
    if tag == "i64":
        return raw_value(3, i=i64_text(payload, "value.i64"))
    if type(payload) not in (int, float):
        raise SourceContractError("value.f64: expected JSON number, not bool/string")
    try:
        floating = float(payload)
    except OverflowError as error:
        raise SourceContractError("value.f64: overflow") from error
    if not math.isfinite(floating):
        raise SourceContractError("value.f64: expected finite number")
    return raw_value(4, f=0.0 if floating == 0.0 else floating)


def raw_fact(value: Any, *, entity="e", attribute="a", vf=0, vt=100,
             tf=0, tt=100) -> dict:
    return {"e": entity, "a": attribute, "v": value,
            "valid_from": vf, "valid_to": vt, "tx_from": tf, "tx_to": tt}


def source_fact(value: Any) -> dict:
    fields = {"e", "a", "v", "valid_from", "valid_to", "tx_from", "tx_to"}
    if type(value) is not dict or set(value) != fields:
        raise SourceContractError("fact: malformed source shape")
    times = {key: i64_text(value[key], key)
             for key in ("valid_from", "valid_to", "tx_from", "tx_to")}
    if times["valid_from"] >= times["valid_to"] or times["tx_from"] >= times["tx_to"]:
        raise SourceContractError("fact: intervals must be nonempty and half-open")
    return {"e": scalar_text(value["e"], "entity"),
            "a": scalar_text(value["a"], "attribute"),
            "v": source_value(value["v"]), **times}


def canonical_cell(value: Any) -> tuple:
    """Validate returned physical carrier without normalizing away output bugs."""
    assert type(value) is dict, f"result cell is not STRUCT: {value!r}"
    assert set(value) == {"tag", *PAYLOAD_FIELDS}, f"wrong cell fields: {value!r}"
    tag = value["tag"]
    assert type(tag) is int and tag in TAG_FIELDS, f"bad returned tag: {tag!r}"
    active = TAG_FIELDS[tag]
    assert value[active] is not None, f"selected payload is NULL: {value!r}"
    assert all(value[field] is None for field in PAYLOAD_FIELDS if field != active), \
        f"inactive output payload is not NULL: {value!r}"
    payload = value[active]
    if tag == 1:
        scalar_text(payload, "returned string")
        return (tag, payload)
    if tag == 2:
        assert type(payload) is bool, f"returned boolean has wrong type: {payload!r}"
        return (tag, payload)
    if tag == 3:
        assert type(payload) is int and MIN_I64 <= payload <= MAX_I64, \
            f"returned i64 has wrong type/range: {payload!r}"
        return (tag, payload)
    assert type(payload) is float and math.isfinite(payload), \
        f"returned f64 has wrong type/finiteness: {payload!r}"
    bits = struct.pack(">d", payload).hex()
    assert payload != 0.0 or bits == "0000000000000000", "returned -0 is not canonical +0"
    return (tag, bits)


def row_sort_key(row: tuple) -> tuple:
    def key(cell):
        tag, payload = cell
        if tag == 1:
            return (tag, payload.encode("utf-8"))
        if tag == 4:
            return (tag, struct.unpack(">d", bytes.fromhex(payload))[0])
        return (tag, payload)
    return tuple(key(cell) for cell in row)


def source_rows(rows: Any) -> list:
    if type(rows) is not list:
        raise SourceContractError("expected_rows must be a list")
    result = []
    for row in rows:
        if type(row) is not list or not 1 <= len(row) <= 8:
            raise SourceContractError("expected row has invalid arity")
        result.append(tuple(canonical_cell(source_value(cell)) for cell in row))
    if result != sorted(result, key=row_sort_key) or len(result) != len(set(result)):
        raise SourceContractError("explicit expected rows must be unique and semantically ordered")
    return result


def decode_result(value: Any, limits=DEFAULT_LIMITS) -> list:
    assert type(value) is dict and set(value) == {"rows", "rounds", "derived_facts", "work"}, \
        f"incorrect result STRUCT: {value!r}"
    assert type(value["rows"]) is list, "rows is NULL or not a list"
    rows = []
    for row in value["rows"]:
        assert type(row) is list and 1 <= len(row) <= 8, f"bad returned tuple: {row!r}"
        rows.append(tuple(canonical_cell(cell) for cell in row))
    for field in ("rounds", "derived_facts", "work"):
        assert type(value[field]) is int and value[field] >= 0, f"invalid statistic {field}"
    assert value["rounds"] <= limits[1]
    assert value["derived_facts"] <= limits[0]
    assert value["work"] <= limits[2]
    assert rows == sorted(rows, key=row_sort_key), "native output is not semantically ordered"
    assert len(rows) == len(set(rows)), "native output contains duplicate typed rows"
    return rows


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise SourceContractError(f"duplicate JSON object key {key!r}")
        result[key] = value
    return result


def load_fixtures(path: Path) -> dict:
    def bad_constant(text):
        raise SourceContractError(f"nonstandard JSON constant {text}")
    data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object,
                      parse_constant=bad_constant)
    if data.get("value_format_version") != 2 or not data.get("status", "").startswith("Unexecuted"):
        raise SourceContractError("fixture snapshot must explicitly declare unexecuted v2 expectations")
    seen = set()
    source_rejections = 0
    program_rejections = 0
    for case in data["cases"]:
        name = case["name"]
        if not re.fullmatch(r"[a-z0-9_]+", name) or name in seen:
            raise SourceContractError("duplicate/invalid fixture name")
        seen.add(name)
        if case["program_version"] != 2:
            raise SourceContractError("wrong fixture program version")
        scalar_text(case["program"], "program", 65_536)
        for fact in case["facts"]:
            source_fact(fact)
        i64_text(case["valid_at"], "valid_at")
        i64_text(case["known_at"], "known_at")
        source_rows(case["expected_rows"])
    for failure in data["rejections"]:
        name = failure["name"]
        if not re.fullmatch(r"[a-z0-9_]+", name) or name in seen:
            raise SourceContractError("duplicate/invalid rejection fixture name")
        seen.add(name)
        if "program" in failure:
            if set(failure) != {"name", "program"} or type(failure["program"]) is not str:
                raise SourceContractError("malformed native-program rejection fixture")
            program_rejections += 1  # Not parsed/evaluated by this harness's spec check.
            continue
        fields = set(failure) - {"name"}
        if len(fields) != 1 or not fields <= {"value", "valid_at", "known_at"}:
            raise SourceContractError("unrecognized rejection fixture")
        field = next(iter(fields))
        try:
            if field == "value":
                source_value(failure[field])
            else:
                i64_text(failure[field], field)
        except SourceContractError:
            source_rejections += 1
        else:
            raise SourceContractError(f"source rejection unexpectedly accepted: {failure['name']}")
    data["_source_rejections_checked"] = source_rejections
    data["_native_program_rejections"] = program_rejections
    return data


class NativeCase(unittest.TestCase):
    db = None
    duckdb = None

    def query(self, program=PROGRAM, facts=(), valid_at=1, known_at=1, limits=DEFAULT_LIMITS):
        args = [program, list(facts) if facts is not None else None, valid_at, known_at, *limits]
        return self.db.execute(QUERY, args).fetchone()[0]

    def assert_rows(self, expected, program=PROGRAM, facts=(), valid_at=1, known_at=1,
                    limits=DEFAULT_LIMITS):
        actual = decode_result(self.query(program, facts, valid_at, known_at, limits), limits)
        self.assertEqual(actual, source_rows(expected))

    def assert_native_error(self, program=PROGRAM, facts=(), valid_at=1, known_at=1,
                            limits=DEFAULT_LIMITS, message_regex=None):
        args = [program, list(facts) if facts is not None else None, valid_at, known_at, *limits]
        # This must succeed before a rejection can count as native callback evidence.
        self.db.execute(BIND_ONLY, args).fetchone()
        with self.assertRaises(self.duckdb.Error) as captured:
            self.db.execute(QUERY, args).fetchall()
        for kind in ("BinderException", "CatalogException", "ParserException", "ConversionException",
                     "OutOfMemoryException", "IOException", "PermissionException"):
            error_type = getattr(self.duckdb, kind, ())
            self.assertNotIsInstance(captured.exception, error_type,
                                     f"{kind} is not native validation evidence")
        if message_regex is not None:
            self.assertRegex(str(captured.exception), message_regex)
        # Each scalar invocation must leave its connection reusable.
        self.assert_rows([[{"t": "str", "v": "healthy"}]], "answer('healthy').", [])


class TypedCarrierTests(NativeCase):
    def test_v2_registered_as_scalar(self):
        rows = self.db.execute("SELECT function_type FROM duckdb_functions() "
                               "WHERE function_name='td_query_v2'").fetchall()
        self.assertTrue(rows and all(row == ("scalar",) for row in rows))

    def test_empty_typed_list_is_valid(self):
        self.assert_rows([], facts=[])
        self.assert_rows([[{"t": "bool", "v": False}]], "answer(false).", [])

    def test_null_list_and_fact_are_rejected(self):
        for facts in (None, [None]):
            with self.subTest(facts=facts):
                self.assert_native_error(facts=facts)

    def test_required_fact_fields_are_not_null(self):
        for field in ("e", "a", "v", "valid_from", "valid_to", "tx_from", "tx_to"):
            fact = raw_fact(raw_value(3, i=1))
            fact[field] = None
            with self.subTest(field=field):
                self.assert_native_error(facts=[fact])

    def test_tag_is_required_and_unknown_tags_rejected(self):
        for tag in (None, 0, 5, 255):
            with self.subTest(tag=tag):
                self.assert_native_error(facts=[raw_fact(raw_value(tag))])

    def test_selected_payload_must_be_present(self):
        for tag in TAG_FIELDS:
            with self.subTest(tag=tag):
                self.assert_native_error(facts=[raw_fact(raw_value(tag))])

    def test_every_inactive_payload_must_be_null(self):
        valid = {1: raw_value(1, s="text"), 2: raw_value(2, b=False),
                 3: raw_value(3, i=0), 4: raw_value(4, f=1.0)}
        extras = {"s": "extra", "b": False, "i": 0, "f": 0.0}
        for tag, carrier in valid.items():
            for field, payload in extras.items():
                if field == TAG_FIELDS[tag]:
                    continue
                bad = {**carrier, field: payload}
                with self.subTest(tag=tag, field=field):
                    self.assert_native_error(facts=[raw_fact(bad)])

    def test_nonfinite_floats_rejected_after_successful_binding(self):
        for floating in (float("nan"), float("inf"), -float("inf")):
            with self.subTest(value=repr(floating)):
                self.assert_native_error(facts=[raw_fact(raw_value(4, f=floating))])
        self.assert_native_error(facts=[raw_fact(raw_value(1, s="text", f=float("nan")))])

    def test_carrier_zero_is_normalized_and_subnormal_bits_retained(self):
        facts = [raw_fact(raw_value(4, f=x)) for x in (-0.0, 0.0, -5e-324, 5e-324)]
        expected = [[{"t": "f64", "v": x}] for x in (-5e-324, 0.0, 5e-324)]
        self.assert_rows(expected, facts=facts)

    def test_typed_value_propagates_each_of_eight_derived_positions(self):
        values = [{"t": "str", "v": "1"}, {"t": "bool", "v": True},
                  {"t": "i64", "v": "1"}, {"t": "f64", "v": 1.0}]
        facts = [raw_fact(source_value(value)) for value in values]
        for position in range(8):
            terms = [f"'pad{index}'" for index in range(8)]
            terms[position] = "?v"
            program = "answer(" + ",".join(terms) + ") :- triple('e','a',?v)."
            expected = []
            for value in values:
                row = [{"t": "str", "v": f"pad{index}"} for index in range(8)]
                row[position] = value
                expected.append(row)
            with self.subTest(position=position):
                self.assert_rows(expected, program, facts)

    def test_float_literals_preserve_representable_subnormals_and_extremes(self):
        program = ("answer(5e-324). answer(4.9406564584124654e-324). "
                   "answer(-5e-324). answer(2.2250738585072014e-308). "
                   "answer(1.7976931348623157e308).")
        expected = [[{"t": "f64", "v": value}] for value in
                    (-5e-324, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308)]
        self.assert_rows(expected, program, [])

    def test_boolean_false_and_true_order(self):
        self.assert_rows([[{"t": "bool", "v": False}], [{"t": "bool", "v": True}]],
                         facts=[raw_fact(raw_value(2, b=x)) for x in (True, False, True)])

    def test_invalid_intervals_rejected_even_when_invisible(self):
        for fact in (raw_fact(raw_value(3, i=1), vf=5, vt=5),
                     raw_fact(raw_value(3, i=1), tf=5, tt=4),
                     raw_fact(raw_value(255), vf=200, vt=300)):
            with self.subTest(fact=fact):
                self.assert_native_error(facts=[fact])

    def test_nul_strings_rejected_in_v2(self):
        for field in ("e", "a"):
            fact = raw_fact(raw_value(1, s="ok"))
            fact[field] = "a\0b"
            with self.subTest(field=field):
                self.assert_native_error(facts=[fact])
        self.assert_native_error(facts=[raw_fact(raw_value(1, s="a\0b"))])
        self.assert_native_error("answer('ok').\0", [])

    def test_required_scalar_arguments_are_not_null(self):
        variants = [(None, 1, 1, DEFAULT_LIMITS), (PROGRAM, None, 1, DEFAULT_LIMITS),
                    (PROGRAM, 1, None, DEFAULT_LIMITS)]
        for index in range(3):
            limits = list(DEFAULT_LIMITS)
            limits[index] = None
            variants.append((PROGRAM, 1, 1, tuple(limits)))
        for program, valid, known, limits in variants:
            with self.subTest(program=program, valid=valid, known=known, limits=limits):
                self.assert_native_error(program, [], valid, known, limits)


class BoundsTests(NativeCase):
    def test_invalid_admission_limits(self):
        for limits in ((0, 10, 10), (100_001, 10, 10), (10, 0, 10),
                       (10, 2_001, 10), (10, 10, 0), (10, 10, 50_000_001)):
            with self.subTest(limits=limits):
                self.assert_native_error(facts=[], limits=limits)

    def test_fact_work_and_round_limits_fail_without_rows(self):
        facts = [raw_fact(raw_value(3, i=i)) for i in (1, 2)]
        self.assert_native_error(facts=facts, limits=(2, 100, 1000), message_regex=r"max_facts|fact limit")
        self.assert_native_error(facts=facts, limits=(100, 100, 1), message_regex=r"max_work|work limit")
        program = "r(?x) :- triple('e','a',?x). answer(?x) :- r(?x)."
        self.assert_native_error(program, facts, limits=(100, 1, 1000), message_regex=r"max_rounds|round limit")

    def test_numeric_token_128_byte_boundary_is_independent_of_overflow(self):
        allowed = "1." + "0" * 126
        rejected = "1." + "0" * 127
        self.assertEqual(len(allowed), 128)
        self.assertEqual(len(rejected), 129)
        self.assert_rows([[{"t": "f64", "v": 1.0}]], f"answer({allowed}).", [])
        self.assert_native_error(f"answer({rejected}).", [])

    def test_term_and_program_byte_bounds(self):
        for field in ("e", "a", "v"):
            fact = raw_fact(raw_value(1, s="ok"))
            if field == "v":
                fact[field] = raw_value(1, s="x" * 16_385)
            else:
                fact[field] = "x" * 16_385
            with self.subTest(field=field):
                self.assert_native_error(facts=[fact])
        self.assert_native_error("answer('" + "x" * 65_536 + "').", [])


class BatchTests(NativeCase):
    def test_nonzero_input_list_offsets_and_chunk_boundaries(self):
        val_i = ("struct_pack(tag:=3::UTINYINT,s:=NULL::VARCHAR,b:=NULL::BOOLEAN,"
                 "i:=n::BIGINT,f:=NULL::DOUBLE)")
        val_s = ("struct_pack(tag:=1::UTINYINT,s:='s-'||n::VARCHAR,b:=NULL::BOOLEAN,"
                 "i:=NULL::BIGINT,f:=NULL::DOUBLE)")
        val_b = ("struct_pack(tag:=2::UTINYINT,s:=NULL::VARCHAR,b:=(n%2=0),"
                 "i:=NULL::BIGINT,f:=NULL::DOUBLE)")
        def sql_fact(value):
            return ("struct_pack(e:='e'::VARCHAR,a:='a'::VARCHAR,v:=" + value +
                    ",valid_from:=0::BIGINT,valid_to:=100::BIGINT,"
                    "tx_from:=0::BIGINT,tx_to:=100::BIGINT)")
        query = f"""WITH inputs AS (
          SELECT n, CASE WHEN n%3=0 THEN []::{FACT_TYPE}
            WHEN n%3=1 THEN [{sql_fact(val_i)}]::{FACT_TYPE}
            ELSE [{sql_fact(val_b)},{sql_fact(val_s)}]::{FACT_TYPE} END AS facts
          FROM range(2051) AS r(n))
          SELECT n,td_query_v2(?::VARCHAR,facts,1::BIGINT,1::BIGINT,
              100::BIGINT,100::BIGINT,10000::BIGINT) FROM inputs ORDER BY n"""
        rows = self.db.execute(query, [PROGRAM]).fetchall()
        self.assertEqual(len(rows), 2051)
        for index, result in rows:
            if index % 3 == 0:
                expected = []
            elif index % 3 == 1:
                expected = [[{"t": "i64", "v": str(index)}]]
            else:
                expected = [[{"t": "str", "v": f"s-{index}"}],
                            [{"t": "bool", "v": index % 2 == 0}]]
            with self.subTest(index=index):
                self.assertEqual(decode_result(result, (100, 100, 10000)), source_rows(expected))

    def test_varying_output_tuple_lengths_and_payload_kinds(self):
        programs = ["answer('a',true,1,1.0).", "answer(false).", "answer(2.0). answer(3)."]
        query = f"""SELECT n,td_query_v2(CASE n%3 WHEN 0 THEN ?::VARCHAR
            WHEN 1 THEN ?::VARCHAR ELSE ?::VARCHAR END,[]::{FACT_TYPE},n::BIGINT,n::BIGINT,
            100::BIGINT,100::BIGINT,10000::BIGINT) FROM range(2051) AS r(n) ORDER BY n"""
        rows = self.db.execute(query, programs).fetchall()
        self.assertEqual(len(rows), 2051)
        expectations = [
            [[{"t": "str", "v": "a"}, {"t": "bool", "v": True},
              {"t": "i64", "v": "1"}, {"t": "f64", "v": 1.0}]],
            [[{"t": "bool", "v": False}]],
            [[{"t": "i64", "v": "3"}], [{"t": "f64", "v": 2.0}]],
        ]
        for index, result in rows:
            with self.subTest(index=index):
                self.assertEqual(decode_result(result, (100, 100, 10000)),
                                 source_rows(expectations[index % 3]))

    def test_long_string_ownership_during_output_growth(self):
        values = [f"{index:04d}-" + "λ" * 127 for index in range(257)]
        self.assert_rows([[{"t": "str", "v": value}] for value in values],
                         facts=[raw_fact(raw_value(1, s=value)) for value in reversed(values)])

    def test_mixed_valid_invalid_scalar_batch_leaves_connection_usable(self):
        prefix = f"""WITH inputs AS (SELECT n,
          [struct_pack(e:='e',a:='a',v:=struct_pack(tag:=n::UTINYINT,
            s:=NULL::VARCHAR,b:=NULL::BOOLEAN,
            i:=CASE WHEN n=3 THEN 1::BIGINT ELSE NULL::BIGINT END,f:=NULL::DOUBLE),
            valid_from:=0::BIGINT,valid_to:=100::BIGINT,tx_from:=0::BIGINT,tx_to:=100::BIGINT)]::{FACT_TYPE}
          AS facts FROM (VALUES (3),(255)) AS r(n)) """
        # First carrier is valid, second has an unknown tag. Binding both must succeed.
        bound = self.db.execute(prefix + "SELECT n,facts FROM inputs ORDER BY n").fetchall()
        self.assertEqual(bound[0][0], 3)
        self.assertEqual(bound[0][1][0]["v"]["i"], 1)
        self.assertEqual(bound[1][0], 255)
        query = prefix + """SELECT td_query_v2(?::VARCHAR,facts,1::BIGINT,1::BIGINT,
             100::BIGINT,100::BIGINT,1000::BIGINT) FROM inputs ORDER BY n"""
        with self.assertRaises(self.duckdb.Error) as captured:
            self.db.execute(query, [PROGRAM]).fetchall()
        for kind in ("BinderException", "CatalogException", "ParserException", "ConversionException",
                     "OutOfMemoryException", "IOException", "PermissionException"):
            self.assertNotIsInstance(captured.exception, getattr(self.duckdb, kind, ()))
        self.assert_rows([[{"t": "i64", "v": "1"}]], "answer(1).", [])


class LegacyCompatibilityTests(NativeCase):
    def legacy(self, program, facts, valid_at=1, known_at=1):
        return self.db.execute(LEGACY_QUERY, [program, facts, valid_at, known_at,
                                             *DEFAULT_LIMITS]).fetchone()[0]

    def test_v1_still_registered_as_scalar(self):
        rows = self.db.execute("SELECT function_type FROM duckdb_functions() "
                               "WHERE function_name='td_query'").fetchall()
        self.assertTrue(rows and all(row == ("scalar",) for row in rows))

    def test_v1_string_rows_and_quoted_literals_unchanged(self):
        values = ["true", "01", "1e0", "2026-10-30", "1", "null"]
        facts = [raw_fact(value) for value in values]
        expected = [[value] for value in sorted(values, key=lambda item: item.encode("utf-8"))]
        self.assertEqual(self.legacy(PROGRAM, facts)["rows"], expected)
        self.assertEqual(self.legacy("answer('1'). answer('true').", [])["rows"],
                         [["1"], ["true"]])

    def test_v1_null_fact_list_retains_legacy_empty_semantics(self):
        self.assertEqual(self.legacy(PROGRAM, None)["rows"], [])
        self.assertEqual(self.legacy("answer('yes').", None)["rows"], [["yes"]])

    def test_v1_numeric_and_boolean_literals_remain_unsupported(self):
        for program in ("answer(1).", "answer(true).", "answer(1.0)."):
            with self.subTest(program=program), self.assertRaises(self.duckdb.Error):
                self.legacy(program, [])

    def test_v1_string_embedding_agrees_at_temporal_cuts(self):
        facts = [raw_fact("old", vf=0, vt=10, tf=0, tt=5),
                 raw_fact("new", vf=0, vt=10, tf=5, tt=20)]
        typed = [{**fact, "v": raw_value(1, s=fact["v"])} for fact in facts]
        for valid, known, strings in ((0, 0, ["old"]), (9, 4, ["old"]),
                                      (9, 5, ["new"]), (10, 5, []), (9, 20, [])):
            expected = [[{"t": "str", "v": value}] for value in strings]
            with self.subTest(valid=valid, known=known):
                self.assertEqual(self.legacy(PROGRAM, facts, valid, known)["rows"],
                                 [[value] for value in strings])
                self.assert_rows(expected, facts=typed, valid_at=valid, known_at=known)


class LargeInputTests(NativeCase):
    def test_input_row_cap_includes_duplicate_rows(self):
        facts = [raw_fact(raw_value(3, i=1))] * 100_001
        self.assert_native_error(facts=facts, message_regex=r"100000|100001|row")


def fixture_suite(data: dict, include_large: bool) -> unittest.TestSuite:
    class ExplicitFixtureTests(NativeCase):
        pass
    for case in data["cases"]:
        def test(self, fixture=case):
            self.assert_rows(fixture["expected_rows"], fixture["program"],
                             [source_fact(value) for value in fixture["facts"]],
                             i64_text(fixture["valid_at"], "valid_at"),
                             i64_text(fixture["known_at"], "known_at"))
        setattr(ExplicitFixtureTests, "test_answer_" + case["name"], test)
    for failure in data["rejections"]:
        if "program" not in failure:
            continue
        def test_rejection(self, fixture=failure):
            self.assert_native_error(fixture["program"], [])
        setattr(ExplicitFixtureTests, "test_reject_" + failure["name"], test_rejection)
    loader = unittest.defaultTestLoader
    classes = [ExplicitFixtureTests, TypedCarrierTests, BoundsTests, BatchTests,
               LegacyCompatibilityTests]
    if include_large:
        classes.append(LargeInputTests)
    return unittest.TestSuite(loader.loadTestsFromTestCase(cls) for cls in classes)


def test_names(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from test_names(item)
        else:
            yield item.id()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def emit_report(report: dict, name: str | None) -> None:
    print(json.dumps(report, indent=2, allow_nan=False))
    if name:
        if Path(name).name != name or not name.endswith(".json") or name == "contract-fixtures.json":
            raise ValueError("--report must be a safe .json basename, not an input file")
        (ROOT / name).write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", type=Path, default=ROOT / "contract-fixtures.json")
    parser.add_argument("--extension", type=Path,
                        default=Path(os.environ["TD_TEST_EXTENSION"]) if os.getenv("TD_TEST_EXTENSION") else None)
    parser.add_argument("--check-spec", action="store_true", help="stdlib-only fixture/codec self-check; no native tests")
    parser.add_argument("--list-tests", action="store_true", help="list selected integration tests without loading DuckDB")
    parser.add_argument("--large-cases", action="store_true", help="also run 100001-row input-cap test")
    parser.add_argument("--report", help="write report to a .json basename beside this harness")
    args = parser.parse_args(argv)
    if not __debug__:
        parser.error("Run without -O/PYTHONOPTIMIZE: assertions are part of the acceptance checks.")
    if args.report and (Path(args.report).name != args.report or not args.report.endswith(".json")
                        or args.report == "contract-fixtures.json"):
        parser.error("--report must be a safe .json basename, not an input file")
    data = load_fixtures(args.fixtures)
    suite = fixture_suite(data, args.large_cases)
    report = {"status": "UNEXECUTED", "native_tests_run": 0,
              "fixture_sha256": digest(args.fixtures), "answer_fixtures": len(data["cases"]),
              "native_program_rejection_fixtures": data["_native_program_rejections"],
              "harness_prebinding_source_rejections_checked": data["_source_rejections_checked"],
              "selected_integration_tests": suite.countTestCases(), "large_cases_included": args.large_cases,
              "python": platform.python_version()}
    if args.check_spec or args.list_tests:
        report["status"] = "SPEC_CHECK_ONLY"
        report["note"] = "Harness source-fixture checks only; no DuckDB import, extension LOAD, evaluator or conformance run."
        if args.list_tests:
            report["selected_test_names"] = list(test_names(suite))
        emit_report(report, args.report)
        return 0
    if args.extension is None:
        report.update(status="UNAVAILABLE", reason="Explicit --extension or TD_TEST_EXTENSION is required.")
        emit_report(report, args.report)
        return 2
    extension = args.extension.expanduser().resolve()
    if not extension.is_file():
        report.update(status="UNAVAILABLE", reason=f"Extension file does not exist: {extension}")
        emit_report(report, args.report)
        return 2
    try:
        import duckdb
    except ImportError as error:
        report.update(status="UNAVAILABLE", reason=f"Pinned duckdb module unavailable: {error}")
        emit_report(report, args.report)
        return 2
    report.update(duckdb=duckdb.__version__, extension=str(extension), extension_sha256=digest(extension))
    if duckdb.__version__ != "2.0.0":
        report.update(status="UNAVAILABLE", reason="This integration contract harness requires DuckDB 2.0.0 exactly.")
        emit_report(report, args.report)
        return 2
    db = None
    try:
        db = duckdb.connect(":memory:", config={"allow_unsigned_extensions": True,
                            "threads": 1, "memory_limit": "96MB",
                            "autoinstall_known_extensions": False, "autoload_known_extensions": False})
        db.load_extension(str(extension))
        db.execute("SET enable_external_access = false")
        report["platform"] = db.execute("PRAGMA platform").fetchone()[0]
        available = db.execute("SELECT function_type FROM duckdb_functions() "
                               "WHERE function_name='td_query_v2'").fetchall()
        if not available:
            report.update(status="UNAVAILABLE", reason="Loaded extension does not register td_query_v2; zero native tests ran.")
            emit_report(report, args.report)
            return 2
        NativeCase.db = db
        NativeCase.duckdb = duckdb
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        report.update(status="PASS" if result.wasSuccessful() else "FAIL", native_tests_run=result.testsRun,
                      failures=len(result.failures), errors=len(result.errors), skipped=len(result.skipped))
        # No native tests in this harness intentionally skip; a skip cannot count as full success.
        if result.skipped:
            report["status"] = "FAIL"
            report["reason"] = "Skipped native tests are not a passing acceptance result."
        emit_report(report, args.report)
        return 0 if report["status"] == "PASS" else 1
    except duckdb.Error as error:
        report.update(status="FAIL", phase="load-or-preflight", reason=f"{type(error).__name__}: {error}")
        emit_report(report, args.report)
        return 1
    finally:
        if db is not None:
            db.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (SourceContractError, OSError, ValueError, AssertionError) as error:
        print(f"INVALID TEST SPEC / INPUT: {type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(2)
