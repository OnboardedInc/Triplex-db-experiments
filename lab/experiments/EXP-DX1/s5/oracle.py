"""DX-S5: transport batching only; all expected results still come from unchanged O-DOMAIN."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'oracles' / 'domain'))
import jsontok
import w0
releases = w0.Releases(str(Path(__file__).resolve().parents[3] / 'world' / 'W0'))

# [DX-S5] Why: parse a shared immutable world once, then run the original oracle for each requested release/cut.
# Rejected: reducing subject coverage or deriving expected results from the TypeScript kernel.
def invoke(op, inp):
    result = w0.run_op(op, inp, releases)
    if 'error' in result:
        raise RuntimeError(result)
    return result

def record(output):
    return {k: output[k] for k in ('basis', 'release', 'subject', 'workItems')}

def apply(previous, output):
    before = jsontok.canonical(previous['items'])
    # Preserve the original JSON request boundary for the small mutable publication state.
    copied = jsontok.parse_bytes(jsontok.canonical(previous).encode())
    result = invoke('publish', {'state': copied, 'evaluations': [record(output)]})
    changed = bool(result['deliveries']) or jsontok.canonical(result['state']['items']) != before
    return changed, result['state'] if changed else previous

for line in sys.stdin.buffer:
    try:
        request = jsontok.parse_bytes(line)
        op, inp = request['op'], request['input']
        if op == 'activation-check':
            r2 = invoke('evaluate', {'world': inp['world'], 'release': 'R2', 'basis': inp['basisR2']})
            r1 = invoke('evaluate', {'world': inp.get('r1World', inp['world']), 'release': 'R1', 'basis': inp['basisR1']})
            changed1, state1 = apply({'items': [], 'pending': [], 'subjects': []}, r1)
            changed2, state2 = apply(state1, r2)
            result = {'R2': jsontok.canonical(r2), 'state': state2, 'r1Changed': changed1, 'r2Changed': changed2}
        elif op == 'evaluate-many':
            result = [jsontok.canonical(invoke('evaluate', {'world': inp['world'], **r})) for r in inp['requests']]
        else:
            result = w0.run_op(op, inp, releases)
        print(jsontok.canonical(result), flush=True)
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        sys.exit(1)
