"""V-D01c delta check: a seeded corpus of raw inputs for an old-vs-new O-DOMAIN differential. python3 -I.
usage: gen_corpus.py <repo> <out.jsonl>   (each line: {"kind": "op"|"parse", "op": ..., "b64": ..., "tag": ...})

op entries: every golden case input (C01-C87) and proposed case input (P01-P40) as raw bytes, plus seeded single-point
perturbations of them (a fact value, a tx, basis.tx, a seq or done, a key dropped or added, fact order, a deep value).
parse entries: random JSON texts (valid trees with every number form, escapes, duplicate keys, depth up to 120) and
corrupted copies of them (truncation, inserted or deleted characters).
"""
import base64
import json
import os
import random
import sys

repo, out_path = sys.argv[1], sys.argv[2]
rnd = random.Random(20261108)


class Raw(str):
    """A number token kept as written."""


def loads(text):
    return json.loads(text, object_pairs_hook=lambda pairs: ('OBJ', list(pairs)), parse_int=Raw, parse_float=Raw)


def dumps(x):
    out = []
    stack = [x]
    while stack:
        y = stack.pop()
        if isinstance(y, Raw):
            out.append(str(y))
        elif isinstance(y, tuple) and y and y[0] == 'LIT':
            out.append(y[1])
        elif isinstance(y, tuple) and y and y[0] == 'OBJ':
            pairs = y[1]
            stack.append(('LIT', '}'))
            for n in range(len(pairs) - 1, -1, -1):
                k, v = pairs[n]
                stack.append(v)
                stack.append(('LIT', ('{' if n == 0 else ',') + json.dumps(k) + ':'))
            if not pairs:
                stack.pop()
                out.append('{}')
        elif isinstance(y, list):
            if not y:
                out.append('[]')
                continue
            stack.append(('LIT', ']'))
            for n in range(len(y) - 1, -1, -1):
                stack.append(y[n])
                stack.append(('LIT', '[' if n == 0 else ','))
        elif y is True:
            out.append('true')
        elif y is False:
            out.append('false')
        elif y is None:
            out.append('null')
        elif isinstance(y, str):
            out.append(json.dumps(y, ensure_ascii=rnd.random() < 0.7))
        else:
            raise TypeError(type(y))
    return ''.join(out)


def extract_input(text):
    """The raw text of the case's "input" value (string-aware bracket matching)."""
    i = text.index('"input"')
    i = text.index(':', i) + 1
    while text[i] in ' \n\t\r':
        i += 1
    depth, j, ins = 0, i, False
    while True:
        c = text[j]
        if ins:
            if c == '\\':
                j += 1
            elif c == '"':
                ins = False
        elif c == '"':
            ins = True
        elif c in '{[':
            depth += 1
        elif c in '}]':
            depth -= 1
            if depth == 0:
                return text[i:j + 1]
        j += 1


def get(obj, key):
    for k, v in obj[1]:
        if k == key:
            return v
    return None


def setkey(obj, key, val):
    obj[1][:] = [(k, val if k == key else v) for k, v in obj[1]]


VALUES = [[], ('OBJ', []), ['2026-11-02'], ('OBJ', [('erasedAt', '2026-11-01T00:00:00.000000Z')]),
          ('OBJ', [('erasedAt', [])]), ('OBJ', [('erasedAt', ('OBJ', []))]), '2026-02-30', '2026-11-02', 'x' * 65, 'é',
          Raw('1650.0'), Raw('1.65e3'), Raw('-0'), Raw('0'), Raw('9' * 20), Raw('9' * 5000), Raw('-' + '9' * 5000),
          Raw('9007199254740992'), Raw('9007199254740991'), Raw('10080'), Raw('10081'), True, False, None,
          '123-45-6789', '123456789', 'pl:a/doc:1', 'loc:x', 'jur:j010', 'agent', 'approve', 'ead']
TXS = [Raw('-0'), Raw('0'), Raw('1'), Raw('3.0'), Raw('9' * 20), Raw('9' * 5000), Raw('-' + '9' * 5000),
       Raw('9007199254740991'), Raw('9007199254740992'), '3', None]


def deep(n, leaf):
    v = leaf
    for _ in range(n):
        v = [v]
    return v


def perturb(op, tree):
    t = json.loads(json.dumps(tree, default=str))  # cheap deep copy of plain structure would lose Raw; do manual copy
    return t


def copy_tree(x):
    if isinstance(x, Raw):
        return Raw(x)
    if isinstance(x, tuple) and x and x[0] == 'OBJ':
        return ('OBJ', [(k, copy_tree(v)) for k, v in x[1]])
    if isinstance(x, list):
        return [copy_tree(v) for v in x]
    return x


def worlds_of(op, inp):
    if op in ('evaluate', 'reconcile'):
        w = get(inp, 'world')
        return [w] if isinstance(w, tuple) else []
    if op == 'affected':
        ws = get(inp, 'worlds')
        return [w for w in ws if isinstance(w, tuple)] if isinstance(ws, list) else []
    return []


def mutate(op, inp):
    inp = copy_tree(inp)
    ws = worlds_of(op, inp)
    facts = [f for w in ws for f in (get(w, 'facts') or []) if isinstance(f, tuple)]
    choice = rnd.random()
    if op in ('publish', 'receive'):
        # seq, done, tx and inputs integers; payload values; key order
        nums = []

        def walk(x):
            if isinstance(x, tuple) and x[0] == 'OBJ':
                for i, (k, v) in enumerate(x[1]):
                    if k in ('seq', 'done', 'tx') and isinstance(v, Raw):
                        nums.append((x, i))
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(inp)
        if nums and choice < 0.7:
            obj, i = rnd.choice(nums)
            k = obj[1][i][0]
            obj[1][i] = (k, rnd.choice([Raw('9' * 5000), Raw('9' * 20), Raw('0'), Raw('-0'), Raw('1.0'), Raw('2'),
                                        Raw('9007199254740992')]))
        else:
            payloads = []

            def walkp(x):
                if isinstance(x, tuple) and x[0] == 'OBJ':
                    for i, (k, v) in enumerate(x[1]):
                        if k == 'payload':
                            payloads.append((x, i))
                        walkp(v)
                elif isinstance(x, list):
                    for v in x:
                        walkp(v)
            walkp(inp)
            if payloads:
                obj, i = rnd.choice(payloads)
                obj[1][i] = ('payload', ('OBJ', [('n', rnd.choice(VALUES[:24])), ('d', deep(rnd.choice([3, 80]), Raw('-0')))]))
        return inp
    if facts and choice < 0.45:
        f = rnd.choice(facts)
        setkey(f, 'v', rnd.choice(VALUES) if rnd.random() < 0.9 else deep(rnd.choice([5, 100]), '2026-11-02'))
    elif facts and choice < 0.65:
        f = rnd.choice(facts)
        setkey(f, 'tx', rnd.choice(TXS))
    elif choice < 0.75 and get(inp, 'basis') is not None:
        b = get(inp, 'basis')
        if isinstance(b, tuple):
            setkey(b, 'tx', rnd.choice(TXS + [Raw('10'), Raw('20'), Raw('7')]))
    elif choice < 0.82 and op == 'reconcile':
        acts = get(inp, 'activations')
        if isinstance(acts, list) and acts and isinstance(acts[0], tuple):
            a = rnd.choice(acts)
            setkey(a, rnd.choice(['tx', 'from', 'release']), rnd.choice(TXS + VALUES[:10]))
    elif facts and choice < 0.9:
        for w in ws:
            fs = get(w, 'facts')
            if isinstance(fs, list):
                rnd.shuffle(fs)
                if fs and rnd.random() < 0.3:
                    fs.append(copy_tree(rnd.choice(fs)))
    else:
        if facts:
            f = rnd.choice(facts)
            if rnd.random() < 0.5 and f[1]:
                f[1].pop(rnd.randrange(len(f[1])))
            else:
                f[1].append(('extra', Raw('1')))
    return inp


def rand_tree(depth):
    r = rnd.random()
    if depth <= 0 or r < 0.4:
        return rnd.choice([Raw(rnd.choice(['0', '-0', '7', '-12', '1650', '1650.0', '1.65e3', '1E+2', '-0.0e-0',
                                           '9' * 30, '9007199254740993', '0.5'])),
                           'plain', 'q"uote', 'back\\slash', 'é', ' ', 'tab\t', '', True, False, None])
    if r < 0.7:
        return [rand_tree(depth - 1) for _ in range(rnd.randrange(0, 4))]
    pairs = [(rnd.choice(['a', 'b', 'c', 'é', '7', 'k']), rand_tree(depth - 1)) for _ in range(rnd.randrange(0, 4))]
    return ('OBJ', pairs)


def corrupt(s):
    if not s:
        return s
    r = rnd.random()
    i = rnd.randrange(len(s))
    if r < 0.3:
        return s[:i]
    if r < 0.6:
        return s[:i] + rnd.choice(list('{}[],:"\\ x0-.e')) + s[i:]
    if r < 0.8:
        return s[:i] + s[i + 1:]
    return s[:i] + rnd.choice(['}', ']']) + s[i + 1:]


entries = []
case_dirs = [os.path.join(repo, 'lab', 'world', 'W0', 'cases'), os.path.join(repo, 'lab', 'verify', 'D01c', 'proposed-cases')]
seeds = []
for d in case_dirs:
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json') or f == 'INDEX.json':
            continue
        text = open(os.path.join(d, f), encoding='utf-8').read()
        meta = json.loads(text, parse_float=str, parse_int=str) if '"inputBase64"' in text else None
        op = json.loads(text, parse_float=str, parse_int=str, object_pairs_hook=dict)['op']
        if meta is not None:
            entries.append({'kind': 'op', 'op': op, 'b64': meta['inputBase64'], 'tag': f})
            continue
        raw = extract_input(text)
        entries.append({'kind': 'op', 'op': op, 'b64': base64.b64encode(raw.encode('utf-8')).decode(), 'tag': f})
        try:
            seeds.append((op, f, loads(raw)))
        except ValueError:
            pass
for n in range(3000):
    op, f, tree = rnd.choice(seeds)
    m = mutate(op, tree)
    entries.append({'kind': 'op', 'op': op, 'b64': base64.b64encode(dumps(m).encode('utf-8')).decode(),
                    'tag': 'perturb-%d-%s' % (n, f)})
for n in range(4000):
    t = rand_tree(rnd.choice([2, 4, 6, 120 if rnd.random() < 0.05 else 3]))
    s = dumps(t)
    if rnd.random() < 0.4:
        s = corrupt(s)
    if rnd.random() < 0.05:
        s = '﻿' + s
    entries.append({'kind': 'parse', 'b64': base64.b64encode(s.encode('utf-8', 'surrogatepass')).decode(), 'tag': 'parse-%d' % n})
with open(out_path, 'w') as fh:
    for e in entries:
        fh.write(json.dumps(e) + '\n')
print(len(entries), 'entries;', sum(e['kind'] == 'op' for e in entries), 'op;', sum(e['kind'] == 'parse' for e in entries), 'parse')
