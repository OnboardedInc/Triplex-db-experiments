#!/usr/bin/env python3
"""Reviewer-owned bounded text/hash/AST inspection. Never imports study code."""
import sys
if sys.flags.optimize != 0 or not __debug__:
    raise RuntimeError('Ordinary Python required for reviewer inspection')
import ast
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path('/tmp/temporal-roadmap-research/iteration-02/residual-performance-reader/verified-preparation-v2')
OUT = Path('/tmp/temporal-roadmap-research/iteration-02/residual-reader-method-review')

def load(rel):
    return json.loads((ROOT / rel).read_text(encoding='utf-8'))

def fingerprint(path):
    data = path.read_bytes()
    data.decode('utf-8', errors='strict')
    if b'\x00' in data:
        raise RuntimeError('Text contains NUL: ' + str(path))
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def check_same(actual, wanted, label):
    if type(actual) is not type(wanted) or actual != wanted:
        raise RuntimeError(label + ': mismatch')

manifest_pins = {
    'PREPARATION-MANIFEST.json': '79a386fd0a9f84722024189081eaa00fea5968284580dbe5f08c463acbdd5b52',
    'curated-preparation/MANIFEST.json': '4276ef94b176f2f23954b413ef62197389e88e99c91f4e0600eb9eef19a2a9e6',
    'terminal-handoff/MANIFEST.json': '9776514ff1c790273c8620e10f10711b912ee1a47a52a4487a121f9df85fcedf',
}
for rel, digest in manifest_pins.items():
    check_same(fingerprint(ROOT / rel)['sha256'], digest, rel)
prep = load('PREPARATION-MANIFEST.json')
curated = load('curated-preparation/MANIFEST.json')
terminal = load('terminal-handoff/MANIFEST.json')
prep_rows = {r['path']: r for r in prep['files']}
curated_rows = {r['path']: r for r in curated['files']}
check_same(len(prep_rows), 190, 'Declared unique source membership')
check_same(len(curated_rows), 188, 'Declared unique public membership')
receipt = load('tests/NO-ENGINE-RESULTS-final.json')
rows = []
for kind, mapping in [('active_python', receipt['active_source_sha256']), ('method_input', receipt['method_input_sha256'])]:
    for rel, digest in mapping.items():
        p = ROOT / rel
        fp = fingerprint(p)
        check_same(fp['sha256'], digest, rel + ' receipt')
        check_same(fp['sha256'], prep_rows[rel]['sha256'], rel + ' preparation')
        check_same(fp['bytes'], prep_rows[rel]['bytes'], rel + ' size')
        copy_fp = fingerprint(ROOT / 'curated-preparation' / rel)
        check_same(copy_fp, fp, rel + ' curated copy')
        check_same(fp['sha256'], curated_rows[rel]['sha256'], rel + ' curated membership')
        row = {'path': rel, 'scope': kind, **fp, 'receipt_preparation_curated_join': 'PASS'}
        if kind == 'active_python':
            tree = ast.parse(p.read_text(encoding='utf-8'), filename=rel)
            row['ast_syntax'] = 'PARSED_ONLY_NOT_COMPILED_OR_EXECUTED'
            row['assert_nodes'] = sum(isinstance(n, ast.Assert) for n in ast.walk(tree))
        rows.append(row)
extra = ['PROTOCOL.md', 'GATE-SCHEMAS.md', 'README.md', 'REVISION-HISTORY.md',
         'PRIMARY-SOURCES.json', 'PREPARATION-STATUS.json', 'STDLIB-CONTROL-SUMMARY.json',
         'tests/NO-ENGINE-RESULTS-final.json', 'PREPARATION-HANDOFF.json', 'POST-FREEZE-READBACK.json',
         'references/FREEZE-SELF-CAPTURE-DEFECT.json', 'inputs/method-references/root-measurement-REPORT.md']
for rel in extra:
    p = ROOT / rel
    if not p.is_file():
        raise RuntimeError('Required text receipt missing: ' + rel)
    fp = fingerprint(p)
    if rel in prep_rows:
        check_same(fp['sha256'], prep_rows[rel]['sha256'], rel + ' preparation')
        check_same(fp['bytes'], prep_rows[rel]['bytes'], rel + ' preparation size')
    rows.append({'path': rel, 'scope': 'protocol_or_frozen_receipt', **fp})
terminal_rows = []
for r in terminal['files']:
    fp = fingerprint(ROOT / 'terminal-handoff' / r['path'])
    check_same(fp['sha256'], r['sha256'], 'Terminal member ' + r['path'])
    check_same(fp['bytes'], r['bytes'], 'Terminal size ' + r['path'])
    terminal_rows.append({'path': r['path'], **fp})
results = receipt['results']
outcomes = dict(collections.Counter(r['outcome'] for r in results))
check_same(len(results), 397, 'Receipt result count')
check_same(outcomes, {'PASS_ACCEPTED_SYNTHETIC_ONLY': 11, 'PASS_REJECTED': 386}, 'Receipt outcome partition')
schedule = load('schedule.json')
controls_root = load('controls.json')
controls = controls_root['controls']
check_same(len(controls), 14, 'Declared controls')
check_same(len(schedule['blocks']), 84, 'Declared paired blocks')
schedule_summary = []
for spec in schedule['comparisons']:
    bs = [b for b in schedule['blocks'] if b['comparison'] == spec['name']]
    round_counts = collections.Counter(str(b['round']) for b in bs)
    orders = collections.Counter(b['variant_order'][0] for b in bs)
    check_same(len(bs), 42, 'Pairs per comparison')
    check_same(dict(round_counts), {'1': 21, '2': 21}, 'Round counts')
    check_same(dict(orders), {spec['proposed']: 21, spec['baseline']: 21}, 'Load order counts')
    for b in bs:
        check_same(sorted(b['control_order']), list(range(14)), 'Control permutation')
    schedule_summary.append({**spec, 'pairs': len(bs), 'round_counts': dict(round_counts), 'first_variant_counts': dict(orders)})
absent = ['ROOT-CANDIDATE-AUTHORIZATION.json', 'CANDIDATE-ADMISSION.json', 'study-registry.json',
          'ROOT-FREEZE-AUTHORIZATION.json', 'STUDY-MANIFEST.json', 'EXECUTION-GATE.json',
          'runs', 'variants/reader-only']
absence = {rel: not (ROOT / rel).exists() for rel in absent}
identity = {
    'status': 'PASS_BOUNDED_STATIC_TEXT_HASH_AST_AND_RECEIPT_INSPECTION_ONLY',
    'selected_root': str(ROOT), 'manifest_sha256_verified': manifest_pins,
    'preparation_declared_members': len(prep_rows), 'curated_declared_members': len(curated_rows),
    'curated_declared_tree_sha256': curated['content_tree_sha256'],
    'scope': 'Only listed text members and curated copies hashed; no full190/binary/runtime/template-byte verification by this reviewer. AST parsing is not study/candidate/test execution. Root independently owns full byte closure.',
    'text_members': rows, 'terminal_members_verified': terminal_rows,
    'recorded_synthetic_receipt': {'checks': len(results), 'outcomes': outcomes,
        'not_rerun': True, 'literal_fake_nanoseconds': receipt['synthetic_duration_literal_not_measured'],
        'no_engine_or_FP_execution_claim': receipt['no_DB_native_store_FP_reader_import_no_FP_control_writes_no_timings']},
    'schedule_static_summary': schedule_summary, 'controls': len(controls),
    'stage_absence_observed': absence,
    'runtime_or_DB_or_hardware_FP_or_benchmark_import_or_execution_by_reviewer': False,
}
(OUT / 'STATIC-INPUT-IDENTITY.json').write_text(json.dumps(identity, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'status': identity['status'], 'active_AST_files': len(receipt['active_source_sha256']), 'method_inputs': len(receipt['method_input_sha256']), 'terminal_members': len(terminal_rows), 'all_stage_absent': all(absence.values())}))
