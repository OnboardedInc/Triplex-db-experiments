"""Independent behavioral regressions. Red assertions are findings, not expected failures.

Run: python3 -I -B lab/verify/A01/regressions_review0311.py
"""
import copy
import json
import pathlib
import runpy
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).resolve().parent
M = runpy.run_path(str(ROOT / 'lab/acceptance/build_contract.py'))
D = json.loads((ROOT / 'lab/acceptance/obligations.json').read_text())


def canon(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def replay(rows, inflight=False):
    q = {'id': 'q', 'kind': 'query'}
    if inflight:
        q['inFlight'] = {'rule': 'prefix', 'acceptable': [{'prefix': 0, 'result': rows}, {'prefix': 1, 'result': []}]}
    else:
        q['result'] = rows
    return {'commandOutcomes': [], 'state': {}, 'queries': [q]}


class ReviewRegressions(unittest.TestCase):
    def compare(self, a, b, comp='CMP-BAG-ROWS'):
        return M['reference_compare'](comp, canon(a), canon(b))

    def test_q75g_bag_reorders_inside_second_query(self):
        a = replay([[0]])
        a['queries'].append({'id': 'second', 'result': [[2], [1], [1]]})
        b = copy.deepcopy(a)
        b['queries'][1]['result'] = [[1], [2], [1]]
        self.assertTrue(self.compare(a, b))

    def test_q75g_bag_preserves_duplicate_count(self):
        self.assertFalse(self.compare(replay([[1], [1]]), replay([[1]])))

    def test_q75g_set_ignores_duplicate_count(self):
        self.assertTrue(self.compare(replay([[1], [1]]), replay([[1]]), 'CMP-SET-ROWS'))

    def test_q75g_ordered_rejects_reordering(self):
        self.assertFalse(self.compare(replay([[1], [2]]), replay([[2], [1]]), 'CMP-ORDERED-ROWS'))

    def test_q75g_state_is_exact(self):
        a = replay([[1]])
        b = copy.deepcopy(a)
        b['state'] = {'facts': [{'id': 'extra'}]}
        self.assertFalse(self.compare(a, b))

    def test_q75g_command_outcomes_are_exact(self):
        a = replay([[1]])
        b = copy.deepcopy(a)
        b['commandOutcomes'] = [{'outcome': 'superseded'}]
        self.assertFalse(self.compare(a, b))

    def test_q75g_query_identity_is_exact(self):
        a = replay([[1]])
        b = copy.deepcopy(a)
        b['queries'][0]['id'] = 'other'
        self.assertFalse(self.compare(a, b))

    def test_q75g_inflight_bag_reorders(self):
        self.assertTrue(self.compare(replay([[1], [2]], True), replay([[2], [1]], True)))

    def test_q75g_inflight_prefix_identity_is_exact(self):
        a = replay([[1]], True)
        b = copy.deepcopy(a)
        b['queries'][0]['inFlight']['acceptable'][0]['prefix'] = 7
        self.assertFalse(self.compare(a, b))

    def test_q75g_unicode_equal_rows(self):
        a = replay([['café']])
        self.assertTrue(self.compare(a, a))

    def test_q75g_unicode_inflight_rows(self):
        a = replay([['東京']], True)
        self.assertTrue(self.compare(a, a))

    def test_q75g_unicode_object_values(self):
        a = replay([{'value': {'type': 'string', 'value': '😀'}}])
        self.assertTrue(self.compare(a, a, 'CMP-SET-ROWS'))

    def test_q75g_ascii_row_control(self):
        a = replay([['cafe']])
        self.assertTrue(self.compare(a, a))

    def test_q75g_actual_oracle_aggregate_answer(self):
        case = {'format': 'triplex-db-2/o-replay-case/1', 'caseId': 'review-aggregate-shape',
                'defaultScope': 's', 'commands': [{'clock': 1, 'operations': [
                    {'op': 'assert', 'ref': 'a', 'entityId': 'e', 'attribute': ':amount',
                     'value': {'type': 'integer', 'value': '2'}, 'validFrom': 0}]}],
                'queries': [{'id': 'sum', 'kind': 'aggregate', 'cut': {'validAt': 0},
                             'match': {'attributes': {'amt': ':amount'}},
                             'aggregates': [{'op': 'sum', 'var': 'amt', 'as': 'total'}]}]}
        path = HERE / 'replay-aggregate-input.json'
        path.write_text(json.dumps(case, indent=2) + '\n')
        proc = subprocess.run([sys.executable, '-I', '-B', str(ROOT / 'lab/oracles/replay/cli.py'), str(path)], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        report = json.loads(proc.stdout)
        answer = {k: report[k] for k in D['answerMembers']['O-REPLAY']}
        (HERE / 'replay-aggregate-answer.json').write_bytes(canon(answer) + b'\n')
        self.assertEqual(report['queries'][0]['result']['rows'][0]['total']['value'], '2')
        self.assertTrue(self.compare(answer, answer))

    def test_q75h_optional_cause(self):
        a = {'_tag': 'ReplicaUnavailable', 'reason': 'replica-unreachable'}
        self.assertTrue(self.compare(a, a, 'CMP-ERROR'))

    def test_q75h_structured_message_cause(self):
        a = {'_tag': 'ReplicaUnavailable', 'reason': 'replica-unreachable'}
        self.assertTrue(self.compare(a, dict(a, cause={'message': 'offline'}), 'CMP-ERROR'))

    def test_q75h_structured_tag_cause(self):
        a = {'_tag': 'ReplicaUnavailable', 'reason': 'replica-unreachable'}
        self.assertTrue(self.compare(a, dict(a, cause={'_tag': 'Transport'}), 'CMP-ERROR'))

    def test_q75h_no_string_or_empty_causes(self):
        a = {'_tag': 'ReplicaUnavailable', 'reason': 'replica-unreachable'}
        for cause in ('offline', {}, {'message': ''}, None, []):
            with self.subTest(cause=cause):
                self.assertFalse(self.compare(a, dict(a, cause=cause), 'CMP-ERROR'))

    def test_q75h_no_partial_rows(self):
        a = {'_tag': 'ReplicaUnavailable', 'reason': 'replica-unreachable'}
        self.assertFalse(self.compare(a, dict(a, rows=[[1]]), 'CMP-ERROR'))

    def test_q75c_compiled_runner_cannot_lose_projection_pin(self):
        runners = copy.deepcopy(M['ORACLE_RUNNERS'])
        del runners['O-CONTRACT']['sha256']['lab/acceptance/oracle-contract.json']
        self.assertFalse(M['runner_pinned']('O-CONTRACT', runners=runners))

    def test_q75c_replay_entrypoint_alone_is_not_pin(self):
        pins = copy.deepcopy(M['ORACLE_PINS'])
        pins['O-REPLAY']['sha256'] = {'lab/oracles/replay/cli.py': 'f' * 64}
        self.assertFalse(M['runner_pinned']('O-REPLAY', pins=pins))

    def test_q75c_runner_argv_file_must_be_pinned(self):
        runners = copy.deepcopy(M['ORACLE_RUNNERS'])
        runners['O-CONTRACT']['argv'].append('lab/acceptance/unpinned.py')
        self.assertFalse(M['runner_pinned']('O-CONTRACT', runners=runners))

    def test_q75c_malformed_hash_rejected(self):
        runners = copy.deepcopy(M['ORACLE_RUNNERS'])
        runners['O-CONTRACT']['sha256']['lab/acceptance/oracle-contract.json'] = 'not-a-hash'
        self.assertFalse(M['runner_pinned']('O-CONTRACT', runners=runners))

    def test_q75i_promotion_refused_before_executor_calls(self):
        touched = []
        verdict = M['admit_claim']({'kind': 'promotion', 'obligations': ['NS.P2']},
                    ev={'build': lambda *args: touched.append(args)},
                    overrides={'buildSpec': {'argv': ['build'], 'outputs': ['out'], 'run': ['run']}})
        self.assertEqual(verdict, 'DIAGNOSTIC')
        self.assertEqual(touched, [])

    def test_q78_every_generic_obligation_applies_to_d(self):
        xq = {'xtdb-xtql', 'xtdb-sql', 'qlever-sparql'}
        generic = [o for o in D['obligations'] if xq <= set(o['lanes'])]
        self.assertTrue(generic)
        self.assertTrue(all('datomic-datalog' in o['lanes'] for o in generic))

    def test_q78_all_d_obligations_have_null_image_blocker(self):
        for o in D['obligations']:
            if 'datomic-datalog' in o['lanes']:
                with self.subTest(obligation=o['id']):
                    self.assertIn('image-unpinned:datomic', M['contract_blockers'](o, 'datomic-datalog'))

    def test_q78_no_existing_raw_exception_transfers_to_d(self):
        for row in D['capabilityMatrix']:
            self.assertNotEqual(row['cells']['d_raw']['status'], 'EXEMPT')

    def test_q78_datomic_null_a0(self):
        self.assertEqual(D['a0Registry']['byEngine']['datomic'], 'A0-DATOMIC')
        self.assertIsNone(D['a0Registry']['entries']['A0-DATOMIC'])

    def test_q78_composition_schema_allows_datomic(self):
        self.assertIn('Datomic', D['composition']['engines'])
        self.assertIn('datomic', D['receiptSchema']['fields']['composition'])

    def test_q76c_matrix_records_ignored_tail_constraint_defect(self):
        text = json.dumps({'matrix': D['capabilityMatrix'], 'limits': D['knownLimits']})
        self.assertTrue('compileRecursiveCTE' in text or 'tail constraint' in text.lower())

    def test_q81a_final_input_requirement_survives_generation(self):
        rule = D['qualificationRun']['integrity']['Q81a']['rule']
        for fragment in ('every case input', 'present, same bytes', 'INPUT-TAMPERED'):
            self.assertIn(fragment, rule)


class ContinuationInputRegressions(unittest.TestCase):
    # [CX-VA01-0311] Why: exercise the pinned oracle's public CLI rather than only matching copied rule prose. Rejected: reusing the builder's literal mutation catalog.
    def run_bad(self, query):
        case = {'format': 'triplex-db-2/o-replay-case/1', 'caseId': 'review-typed-continuation',
                'defaultScope': 's', 'commands': [], 'queries': [query]}
        path = HERE / 'continuation-input.json'
        path.write_text(json.dumps(case))
        try:
            r = subprocess.run([sys.executable, '-I', '-B', str(ROOT / 'lab/oracles/replay/cli.py'), str(path)], capture_output=True, text=True)
        finally:
            path.unlink()
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn('malformed case', r.stderr)
        self.assertIn('JSON integer', r.stderr)
        parameter = ('page' if 'cursorFrom' in query else 'beforePosition' if 'beforePosition' in query else 'after')
        self.assertIn(parameter, r.stderr)
        self.assertNotIn('Traceback', r.stderr)
        self.assertEqual(r.stdout, '')

    def test_q70m_journal_after_boolean(self):
        self.run_bad({'id': 'q', 'kind': 'transactions', 'scope': 's', 'after': True})

    def test_q70m_journal_after_string(self):
        self.run_bad({'id': 'q', 'kind': 'transactions', 'scope': 's', 'after': '1'})

    def test_q70m_entity_before_float(self):
        self.run_bad({'id': 'q', 'kind': 'transactionsForEntity', 'entityId': 'e', 'scope': 's', 'beforePosition': 1.25})

    def test_q70o_cursor_page_boolean(self):
        self.run_bad({'id': 'q', 'kind': 'entityPage', 'entityType': 'T', 'cursorFrom': {'query': 'a', 'page': True}})


if __name__ == '__main__':
    unittest.main(verbosity=2)
