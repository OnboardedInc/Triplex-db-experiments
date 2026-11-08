"""Independent round-2 variations, evaluated against the immutable scratch copy."""
import copy
import json
import pathlib
import runpy
import subprocess
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE / 'scratch'
M = runpy.run_path(str(ROOT / 'lab/acceptance/build_contract.py'))
D = json.loads((ROOT / 'lab/acceptance/obligations.json').read_text())


def canon(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def wrap(v, inflight=False):
    q = {'id': 'q', 'kind': 'aggregate'}
    q.update({'inFlight': {'rule': 'prefix', 'acceptable': [{'erasuresSeen': [1], 'result': v}]}} if inflight else {'result': v})
    return {'commandOutcomes': [], 'state': {}, 'queries': [q]}


def compare(a, b, c='CMP-BAG-ROWS'):
    return M['reference_compare'](c, canon(a), canon(b))


class DeltaVariations(unittest.TestCase):
    # [CX-VA01-R2] Why: independently vary all row-bearing fields, metadata and prefix positions. Rejected: only rerunning exact builder fixtures.
    def test_actual_cli_inflight_aggregate_match_and_entity_triples(self):
        case = {'format': 'triplex-db-2/o-replay-case/1', 'caseId': 'review-r2-inflight', 'defaultScope': 's',
                'commands': [{'clock': 1, 'operations': [
                    {'op': 'assert', 'ref': 'a1', 'entityId': 'e1', 'attribute': ':v', 'value': {'type': 'string', 'value': '東京😀'}, 'validFrom': 0},
                    {'op': 'assert', 'ref': 'a2', 'entityId': 'e2', 'attribute': ':v', 'value': {'type': 'string', 'value': 'café'}, 'validFrom': 0}]},
                    {'clock': 2, 'operations': [{'op': 'erase', 'target': 'a1'}]}],
                'queries': [
                    {'id': 'agg', 'kind': 'aggregate', 'cut': {'validAt': 0}, 'readStart': {'afterCommand': 0},
                     'match': {'attributes': {'v': ':v'}}, 'groupBy': ['v'], 'aggregates': [{'op': 'count', 'var': 'v', 'as': 'n'}]},
                    {'id': 'm', 'kind': 'match', 'cut': {'validAt': 0}, 'readStart': {'afterCommand': 0}, 'pattern': {'attribute': ':v'}},
                    {'id': 'e', 'kind': 'entityTriples', 'cut': {'validAt': 0}, 'readStart': {'afterCommand': 0}, 'entityId': 'e1'}]}
        path = HERE / 'real-inflight-case.json'
        path.write_bytes(canon(case) + b'\n')
        proc = subprocess.run([sys.executable, '-I', '-B', str(ROOT / 'lab/oracles/replay/cli.py'), str(path)], capture_output=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        report = json.loads(proc.stdout)
        answer = {k: report[k] for k in D['answerMembers']['O-REPLAY']}
        (HERE / 'real-inflight-answer.json').write_bytes(canon(answer) + b'\n')
        self.assertEqual(sum('inFlight' in q for q in answer['queries']), 3)
        self.assertTrue(compare(answer, answer))
        changed = copy.deepcopy(answer)
        changed['queries'][0]['inFlight']['acceptable'][0]['result']['rows'].reverse()
        self.assertTrue(compare(answer, changed))
        self.assertFalse(compare(answer, changed, 'CMP-ORDERED-ROWS'))

    def test_rows_bag_reorders_with_duplicates(self):
        for inflight in (False, True):
            a = {'cut': {'scope': 's', 'position': 3}, 'rows': [['é'], ['東京'], ['é']]}
            b = dict(a, rows=list(reversed(a['rows'][1:] + a['rows'][:1])))
            self.assertTrue(compare(wrap(a, inflight), wrap(b, inflight)))

    def test_rows_bag_rejects_lost_duplicate(self):
        a = {'cut': {}, 'rows': [[1], [1]]}
        self.assertFalse(compare(wrap(a), wrap(dict(a, rows=[[1]]))))

    def test_rows_set_deduplicates(self):
        a = {'cut': {}, 'rows': [[1], [1]]}
        self.assertTrue(compare(wrap(a), wrap(dict(a, rows=[[1]])), 'CMP-SET-ROWS'))

    def test_ordered_and_pages_keep_order(self):
        a = {'cut': {}, 'rows': [[1], [2]]}
        b = dict(a, rows=[[2], [1]])
        for c in ('CMP-ORDERED-ROWS', 'CMP-PAGES'):
            self.assertFalse(compare(wrap(a), wrap(b), c))

    def test_match_both_row_fields_reorder_independently(self):
        a = {'cut': {'scope': 's'}, 'count': 2, 'contract': 'raw-lifetime', 'raw': [[1], [2]], 'snapshot': [[3], [4]]}
        for field in ('raw', 'snapshot'):
            for inflight in (False, True):
                b = dict(a, **{field: list(reversed(a[field]))})
                self.assertTrue(compare(wrap(a, inflight), wrap(b, inflight)))
                self.assertFalse(compare(wrap(a, inflight), wrap(b, inflight), 'CMP-ORDERED-ROWS'))

    def test_match_each_field_rejects_value_change(self):
        a = {'cut': {}, 'count': 1, 'contract': 'raw-lifetime', 'raw': [[1]], 'snapshot': [[1]]}
        for field in ('raw', 'snapshot'):
            b = dict(a, **{field: [[9]]})
            self.assertFalse(compare(wrap(a), wrap(b)))

    def test_wrapper_metadata_exact_for_all_placements(self):
        a = {'cut': {'scope': 's', 'position': 1}, 'count': 1, 'contract': 'raw', 'raw': [[1]], 'snapshot': [[1]]}
        for field in ('cut', 'count', 'contract'):
            for inflight in (False, True):
                b = dict(a, **{field: None})
                self.assertFalse(compare(wrap(a, inflight), wrap(b, inflight)))

    def test_extra_or_missing_wrapper_keys_fail(self):
        a = {'cut': {}, 'rows': [[1]]}
        self.assertFalse(compare(wrap(a), wrap(dict(a, surprise=True))))
        self.assertFalse(compare(wrap(a), wrap({'rows': [[1]]})))

    def test_unknown_and_partial_row_wrappers_refused(self):
        for a in ({'cut': {}, 'values': [[1]]}, {'raw': [[1]]}, {'snapshot': [[1]]}, {'rows': {}}, {'rows': None}):
            self.assertFalse(compare(wrap(a), wrap(a)))

    def test_empty_arrays_supported(self):
        for a in ({'cut': {}, 'rows': []}, {'cut': {}, 'count': 0, 'raw': [], 'snapshot': []}):
            self.assertTrue(compare(wrap(a), wrap(a)))

    def test_query_metadata_preserved(self):
        a = wrap({'cut': {}, 'rows': [[1]]})
        for field in ('id', 'kind'):
            b = copy.deepcopy(a)
            b['queries'][0][field] = 'changed'
            self.assertFalse(compare(a, b))

    def test_prefix_metadata_and_prefix_count_preserved(self):
        a = wrap({'cut': {}, 'rows': [[1]]}, True)
        b = copy.deepcopy(a)
        b['queries'][0]['inFlight']['acceptable'][0]['erasuresSeen'] = [2]
        self.assertFalse(compare(a, b))
        b = copy.deepcopy(a)
        b['queries'][0]['inFlight']['acceptable'].append(copy.deepcopy(b['queries'][0]['inFlight']['acceptable'][0]))
        self.assertFalse(compare(a, b))

    def test_later_query_wrapper_is_compared(self):
        a = wrap({'cut': {}, 'rows': [[1]]})
        a['queries'].append({'id': 'later', 'result': {'cut': {}, 'rows': [[2], [3]]}})
        b = copy.deepcopy(a)
        b['queries'][1]['result']['rows'].reverse()
        self.assertTrue(compare(a, b))
        b['queries'][1]['result']['cut'] = {'position': 2}
        self.assertFalse(compare(a, b))

    def test_state_and_commands_remain_exact_with_wrappers(self):
        a = wrap({'cut': {}, 'rows': [[1]]})
        for field in ('state', 'commandOutcomes'):
            b = copy.deepcopy(a)
            b[field] = ['changed']
            self.assertFalse(compare(a, b))

    def test_unicode_keys_and_values_at_recursive_boundaries(self):
        a = {'cut': {'tenant': '東京'}, 'rows': [{'😀': 'café', '東京': ['λ', 'e\u0301']}]}
        for c in ('CMP-SET-ROWS', 'CMP-BAG-ROWS', 'CMP-ORDERED-ROWS', 'CMP-PAGES'):
            for inflight in (False, True):
                self.assertTrue(compare(wrap(a, inflight), wrap(a, inflight), c))

    def test_codepoints_not_normalized(self):
        for c in ('CMP-SET-ROWS', 'CMP-BAG-ROWS', 'CMP-ORDERED-ROWS'):
            self.assertFalse(compare(wrap({'rows': [['é']]}), wrap({'rows': [['e\u0301']]}), c))

    def test_exact_comparator_does_not_reorder_wrapper_rows(self):
        a = {'cut': {}, 'rows': [[1], [2]]}
        self.assertFalse(compare(wrap(a), wrap(dict(a, rows=[[2], [1]])), 'CMP-EXACT-VALUE'))

    def test_datomic_engine_schema_and_receipt_complete(self):
        self.assertEqual(D['composition']['engineIds'], ['xtdb', 'qlever', 'datomic'])
        self.assertIn('Datomic', D['composition']['engines'])
        self.assertIn('xtdb | qlever | datomic', D['receiptSchema']['fields']['composition'])
        self.assertEqual(json.loads((ROOT / 'lab/acceptance/oracle-contract.json').read_text())['composition'], D['composition'])

    def test_all_datomic_and_mixed_compositions_bind_with_unpinned_images(self):
        for changed in (None, *M['COMPOSITION']['assignments']):
            c = {k: {'engine': 'xtdb', 'imageDigest': M['IMAGE_PINS']['xtdb']['imageId'], 'configSha256': 'a' * 64, 'slot': 's1'} for k in M['COMPOSITION']['assignments']}
            c['source']['variant'] = 'engine-source'
            for k in ([changed] if changed else M['COMPOSITION']['assignments']):
                c[k].update(engine='datomic', imageDigest='not-pinned')
            self.assertTrue(M['composition_ok'](c))
            result = json.loads(M['contract_oracle_answer'](canon({'composition': c}), M['contract_oracle_projection']()))
            self.assertTrue(result['bound'])
            self.assertFalse(result['imagesPinned'])

    def test_every_assignment_rejects_unknown_engine(self):
        for changed in M['COMPOSITION']['assignments']:
            c = {k: {'engine': 'datomic', 'imageDigest': 'not-pinned', 'configSha256': 'a' * 64, 'slot': 's1'} for k in M['COMPOSITION']['assignments']}
            c['source']['variant'] = 'engine-source'
            c[changed]['engine'] = 'unknown'
            self.assertFalse(M['composition_ok'](c))
            result = json.loads(M['contract_oracle_answer'](canon({'composition': c}), M['contract_oracle_projection']()))
            self.assertFalse(result['bound'])
            self.assertIn(changed, result['unboundAssignments'])

    def test_all_153_datomic_obligations_stay_image_blocked(self):
        obligations = [o for o in D['obligations'] if 'datomic-datalog' in o['lanes']]
        self.assertEqual(len(obligations), 153)
        self.assertEqual(D['imagePins']['datomic'], {'image': None, 'imageId': None})
        self.assertIsNone(D['a0Registry']['entries']['A0-DATOMIC'])
        for o in obligations:
            self.assertIn('image-unpinned:datomic', M['contract_blockers'](o, 'datomic-datalog'))

    def test_q76c_record_is_scoped_and_rendered(self):
        v = D['knownLimits']['KL-CORE-TAIL']
        self.assertIn('compileRecursiveCTE', v['engine'])
        self.assertIn('not declared users', v['behavior'])
        row = next(r for r in D['capabilityMatrix'] if r['n'] == 35)
        self.assertIn('KL-CORE-TAIL', row['note'])
        self.assertIn('KL-CORE-TAIL', (ROOT / 'lab/acceptance/capability-matrix.md').read_text())


if __name__ == '__main__':
    unittest.main(verbosity=2)
