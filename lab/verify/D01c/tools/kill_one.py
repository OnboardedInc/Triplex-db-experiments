"""V-D01c: run every proposed case (SPEC 11.1 format, plus inputBase64) against one O-DOMAIN copy. python3 -I.
usage: kill_one.py <oracle dir> <cases dir>  -> one JSON line {case id: "pass" | "fail" | "crash:<Type>"}"""
import base64
import json
import os
import sys

import importlib.util

oracle, cases = sys.argv[1], sys.argv[2]
base_dir = sys.argv[3] if len(sys.argv) > 3 else None
sys.path.insert(0, oracle)
import w0  # noqa: E402
from jsontok import canonical, parse_bytes, to_plain  # noqa: E402

# Expected bytes come from the UNMUTATED writer (argv[3]), so a writer mutant cannot hide by changing both sides.
want_canon = canonical
if base_dir:
    spec = importlib.util.spec_from_file_location('base_jsontok', os.path.join(base_dir, 'jsontok.py'))
    base_jsontok = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(base_jsontok)
    want_canon = base_jsontok.canonical

rel = w0.Releases()
res = {}
for f in sorted(os.listdir(cases)):
    if not (f.startswith('P') and f.endswith('.json')):
        continue
    c = parse_bytes(open(os.path.join(cases, f), 'rb').read())
    try:
        if 'inputBase64' in c:
            out = w0.run_op_bytes(c['op'], base64.b64decode(c['inputBase64']), rel)
        else:
            out = w0.run_op(c['op'], c['input'], rel)
        bp = base_jsontok.parse_bytes(open(os.path.join(cases, f), 'rb').read()) if base_dir else c
        want = want_canon(base_jsontok.to_plain(bp['expected']) if base_dir else to_plain(c['expected']))
        res[c['id']] = 'pass' if canonical(out) == want else 'fail'
    except Exception as exc:
        res[c['id']] = 'crash:' + type(exc).__name__
print(json.dumps(res, sort_keys=True))
