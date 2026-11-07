"""Offline independent acceptance-scope controls; no native/socket operation."""
import io
import json
from pathlib import Path
import socket
import sys
import time
import unittest
from unittest.mock import patch
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'experiments/qlever-native-page-sample-v2'))
from test_sample import Components, PLAN, Response, fake_run_setup, reply, rows
from sample import run, validate_context
from read_bounds import ReadOnlyRefusal


class IndependentControls(unittest.TestCase):
    def test_false_codepoint_boundary_is_explicit_and_never_qualified(self):
        values = fake_run_setup()
        native = values[3]
        class Pages:
            def open(self, request, timeout):
                channel, offset = PLAN[native.calls - 1]
                # Both adjacent sets are unique, with the first ordered after
                # the second under Python's ordinal diagnostic. No host sort.
                start = 512 if offset == 0 else 0
                return Response(reply(channel, selected=rows(channel, start)))
        native.opener = Pages()
        result = run(*values)
        self.assertFalse(result['codepointOrderQualified'])
        self.assertEqual(result['orderingProfile'], 'OPAQUE_NATIVE_ORDER_PREFIX_ONLY')
        for population in result['populations'].values():
            self.assertFalse(population['strictCodepointBoundaryDiagnostic'])
            self.assertFalse(population['codepointOrderQualified'])
            self.assertEqual(population['duplicateIdentitiesAcrossAdjacentPages'], 0)
            self.assertTrue(population['repeatFirstCanonicalIdentical'])

    def test_case_only_repeat_change_refuses_without_casefold(self):
        values = fake_run_setup()
        native = values[3]
        class Pages:
            def open(self, request, timeout):
                channel, offset = PLAN[native.calls - 1]
                selected = rows(channel, offset)
                selected[0]['o']['value'] = 'CASE' if native.calls == 3 else 'case'
                return Response(reply(channel, selected=selected))
        native.opener = Pages()
        with self.assertRaises(ReadOnlyRefusal):
            run(*values)
        self.assertEqual(native.calls, 3)
        event = next(values[4].directory.glob('*named-paging-check.json'))
        self.assertFalse(json.loads(event.read_bytes())['repeatFirstCanonicalIdentical'])

    def test_http_failure_cannot_dispatch_a_later_page_or_retry(self):
        native, record = Components().native()
        class Failed:
            calls = 0
            def open(self, *_args, **_options):
                self.calls += 1
                raise urllib.error.HTTPError('http://127.0.0.1:17019', 500, 'synthetic', {}, io.BytesIO(b'{"error":"bounded"}'))
        opener = Failed()
        native.opener = opener
        with self.assertRaises(ReadOnlyRefusal):
            native.page('named', 0, time.monotonic() + 60)
        with self.assertRaises(ReadOnlyRefusal):
            native.page('named', 256, time.monotonic() + 60)
        self.assertEqual(opener.calls, 1)
        self.assertTrue(native.failed)
        self.assertTrue((record.directory / 'raw-page-01-named-0.json').is_file())


if __name__ == '__main__':
    attempts = []
    def forbidden(*_args, **_kwargs):
        attempts.append('forbidden-host-transport')
        raise AssertionError('Independent offline review attempted a host transport')
    suite = unittest.TestSuite([
        unittest.defaultTestLoader.loadTestsFromTestCase(Components),
        unittest.defaultTestLoader.loadTestsFromTestCase(IndependentControls),
    ])
    with patch('socket.socket.connect', forbidden), patch('urllib.request.OpenerDirector.open', forbidden):
        result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'cases': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'operationalCalls': len(attempts)}))
    if not result.wasSuccessful() or attempts:
        raise SystemExit(1)
