"""V-D01c delta check: run a corpus through one O-DOMAIN copy. python3 -I.
usage: run_corpus.py <oracle dir> <corpus.jsonl> <out.jsonl>
op entries -> canonical output, or CRASH:<Type>; parse entries -> a structural dump of the tree (number tokens as text,
duplicate-key flags) and its canonical form, or SYNTAX / CRASH:<Type>."""
import base64
import hashlib
import json
import sys

oracle, corpus, out_path = sys.argv[1:4]
sys.path.insert(0, oracle)
import jsontok  # noqa: E402
import w0  # noqa: E402

rel = w0.Releases()


def dump(x):
    out = []
    stack = [x]
    while stack:
        y = stack.pop()
        if isinstance(y, tuple) and y[0] == 'LIT':
            out.append(y[1])
        elif type(y) is jsontok.JNum:
            out.append('N(' + y.text + ')')
        elif isinstance(y, dict):
            stack.append(('LIT', '}'))
            for k, v in reversed(list(y.items())):
                stack.append(v)
                stack.append(('LIT', json.dumps(k) + ':'))
            stack.append(('LIT', '{dup=%d ' % bool(getattr(y, 'dup', False))))
        elif isinstance(y, list):
            stack.append(('LIT', ']'))
            for v in reversed(y):
                stack.append(v)
                stack.append(('LIT', ','))
            stack.append(('LIT', '['))
        else:
            out.append(json.dumps(y))
    return ''.join(out)


with open(corpus) as fh, open(out_path, 'w') as out:
    for line in fh:
        e = json.loads(line)
        data = base64.b64decode(e['b64'])
        if e['kind'] == 'op':
            try:
                res = jsontok.canonical(w0.run_op_bytes(e['op'], data, rel))
            except Exception as exc:
                res = 'CRASH:' + type(exc).__name__
        else:
            try:
                tree = jsontok.parse_bytes(data)
                try:
                    c = jsontok.canonical(tree)
                except Exception as exc:
                    c = 'CANON-CRASH:' + type(exc).__name__
                res = dump(tree) + ' || ' + c
            except ValueError:
                res = 'SYNTAX'
            except Exception as exc:
                res = 'CRASH:' + type(exc).__name__
        h = hashlib.sha256(res.encode('utf-8', 'surrogatepass')).hexdigest() if len(res) > 300 else None
        out.write(json.dumps({'tag': e['tag'], 'res': res if h is None else 'sha256:' + h,
                              'brief': res[:120]}) + '\n')
