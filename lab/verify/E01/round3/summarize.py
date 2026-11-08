# [CX-VE01-4] Why: preserve every literal regression result beside its raw TAP. Rejected: counting an obsolete GAP assertion's failure as a new evaluator defect.
import json
from pathlib import Path
import re

out = Path(__file__).resolve().parent
summary = {}
for tap in sorted(out.glob('*.tap')):
    text = tap.read_text()
    rows = []
    for m in re.finditer(r'^(ok|not ok) (\d+) - (.*)$', text, re.M):
        rows.append({'number': int(m[2]), 'result': 'PASS' if m[1] == 'ok' else 'FAIL', 'name': m[3]})
    totals = {k: int(v) for k, v in re.findall(r'^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$', text, re.M)}
    summary[tap.stem] = {'totals': totals, 'tests': rows}
(out/'test-summary.json').write_text(json.dumps(summary, indent=2)+'\n')
lines = ['# Literal fresh regression results', '', 'Target: `388209d`. Tests named GAP may deliberately assert superseded behavior; this file lists literal results only.', '']
for name, value in summary.items():
    if name == 'all':
        continue
    lines += [f'## {name}', '', '| # | Result | Exact test name |', '| --- | --- | --- |']
    lines += [f"| {r['number']} | {r['result']} | {r['name'].replace('|', '&#124;')} |" for r in value['tests']]
    lines += ['', '`'+json.dumps(value['totals'])+'`', '']
(out/'literal-results.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k:v['totals'] for k,v in summary.items()}, indent=2))
