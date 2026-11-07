#!/usr/bin/env python3
"""Stdlib-only tests of the acceptance harness, never of a Datalog evaluator."""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import types
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("native_acceptance_under_test", ROOT / "native_acceptance.py")
HARNESS = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(HARNESS)


class HarnessSelfTests(unittest.TestCase):
    def test_i64_source_boundary_and_source_type_checks(self):
        for text, expected in ((str(-(2**63)), -(2**63)), (str(2**63-1), 2**63-1)):
            self.assertEqual(HARNESS.i64_text(text, "clock"), expected)
        for value in (True, 1, 1.0, "-0", "01", "+1", "1.0", str(2**63), str(-(2**63)-1)):
            with self.subTest(value=value), self.assertRaises(HARNESS.SourceContractError):
                HARNESS.i64_text(value, "clock")

    def test_source_values_reject_bad_types_before_sql(self):
        for value in ({"t":"i64","v":1}, {"t":"i64","v":True},
                      {"t":"bool","v":"true"}, {"t":"bool","v":1},
                      {"t":"f64","v":True}, {"t":"f64","v":float("inf")},
                      {"t":"date","v":"2026-10-30"}, {"t":"str","v":"x","extra":1},
                      {"t":"str","v":"x\0y"}, {"t":"str","v":"\ud800"}):
            with self.subTest(value=repr(value)), self.assertRaises(HARNESS.SourceContractError):
                HARNESS.source_value(value)

    def test_tags_do_not_collapse_python_numeric_equality(self):
        cells = [HARNESS.canonical_cell(HARNESS.source_value(value)) for value in
                 ({"t":"str","v":"1"}, {"t":"bool","v":True},
                  {"t":"i64","v":"1"}, {"t":"f64","v":1.0})]
        self.assertEqual(len(set(cells)), 4)

    def test_output_decoder_does_not_hide_zero_or_mask_bugs(self):
        for value in (HARNESS.raw_value(4, f=-0.0), HARNESS.raw_value(4, f=float("nan")),
                      HARNESS.raw_value(1, s="ok", i=1), HARNESS.raw_value(3),
                      HARNESS.raw_value(255), HARNESS.raw_value(3, i=True)):
            with self.subTest(value=repr(value)), self.assertRaises(AssertionError):
                HARNESS.canonical_cell(value)
        self.assertEqual(HARNESS.canonical_cell(HARNESS.raw_value(4, f=0.0)),
                         (4, "0000000000000000"))

    def test_explicit_expected_order_is_not_silently_sorted(self):
        wrong = [[{"t":"i64","v":"10"}], [{"t":"i64","v":"2"}]]
        with self.assertRaises(HARNESS.SourceContractError):
            HARNESS.source_rows(wrong)
        unicode_rows = [[{"t":"str","v":value}] for value in ("e\u0301","é","\ue000","😀")]
        self.assertEqual(len(HARNESS.source_rows(unicode_rows)), 4)

    def test_fixture_snapshot_validates_without_native_execution(self):
        data = HARNESS.load_fixtures(ROOT / "contract-fixtures.json")
        self.assertEqual(len(data["cases"]), 20)
        self.assertEqual(data["_native_program_rejections"], 8)
        self.assertEqual(data["_source_rejections_checked"], 7)
        self.assertEqual(HARNESS.fixture_suite(data, False).countTestCases(), 56)
        self.assertEqual(HARNESS.fixture_suite(data, True).countTestCases(), 57)

    def test_missing_extension_is_nonpassing_unavailable(self):
        environment = dict(os.environ)
        environment.pop("TD_TEST_EXTENSION", None)
        output = io.StringIO()
        with mock.patch.dict(os.environ, environment, clear=True), contextlib.redirect_stdout(output):
            status = HARNESS.main([])
        report = json.loads(output.getvalue())
        self.assertEqual(status, 2)
        self.assertEqual(report["status"], "UNAVAILABLE")
        self.assertEqual(report["native_tests_run"], 0)

    def test_absent_v2_is_nonpassing_unavailable_with_no_test_run(self):
        # This is an availability-control-flow mock only: no SQL evaluator,
        # native function implementation, real database or native LOAD exists.
        class FakeError(Exception):
            pass
        class Cursor:
            def __init__(self, rows=()):
                self.rows = list(rows)
            def fetchone(self):
                return self.rows[0] if self.rows else None
            def fetchall(self):
                return self.rows
        class MissingV2Connection:
            closed = False
            def load_extension(self, _path):
                pass
            def execute(self, query):
                if query == "PRAGMA platform":
                    return Cursor([("mock_availability_only",)])
                if "duckdb_functions()" in query:
                    return Cursor([])
                if query == "SET enable_external_access = false":
                    return Cursor()
                raise AssertionError("The unavailable path must not execute test SQL")
            def close(self):
                self.closed = True
        connection = MissingV2Connection()
        module = types.ModuleType("duckdb")
        module.__version__ = "2.0.0"
        module.Error = FakeError
        module.connect = lambda *_args, **_kwargs: connection
        output = io.StringIO()
        with mock.patch.dict(sys.modules, {"duckdb":module}), contextlib.redirect_stdout(output):
            status = HARNESS.main(["--extension", str(ROOT / "native_acceptance.py")])
        report = json.loads(output.getvalue())
        self.assertEqual(status, 2)
        self.assertEqual(report["status"], "UNAVAILABLE")
        self.assertEqual(report["native_tests_run"], 0)
        self.assertTrue(connection.closed)


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Run without -O/PYTHONOPTIMIZE")
    unittest.main(verbosity=2)
