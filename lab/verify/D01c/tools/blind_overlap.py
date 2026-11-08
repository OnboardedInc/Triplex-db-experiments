"""V-D01c blind code-overlap check (python3 -I). V-D01c must not read V-D01's scratch evaluator, so this script reads it
and prints only aggregate counts plus O-DOMAIN-side names; it never prints a line, name or path fragment from the other side.

usage: blind_overlap.py <O-DOMAIN dir> <other dir> [<other dir> ...]
1. Distinctive O-DOMAIN identifiers: every def/class name and assigned name in w0.py, jsontok.py, population.py that is
   not SPEC.md vocabulary and not a Python builtin; counted when it appears as a whole word in the other code.
2. Shared normalized 3-line shingles (comments and blank lines dropped, whitespace collapsed, lines under 12 characters
   dropped) between O-DOMAIN and the other code.
"""
import builtins
import hashlib
import keyword
import os
import re
import sys

odom, others = sys.argv[1], sys.argv[2:]
spec = open(os.path.join(odom, '..', '..', 'world', 'W0', 'SPEC.md')).read()
spec_words = set(re.findall(r'[A-Za-z_][A-Za-z0-9_]*', spec))
stop = set(dir(builtins)) | set(keyword.kwlist) | {'self', 'cls'}

SRC = ['w0.py', 'jsontok.py', 'population.py']
otext = {f: open(os.path.join(odom, f)).read() for f in SRC}
names = set()
for t in otext.values():
    names |= set(re.findall(r'^\s*def (\w+)', t, re.M))
    names |= set(re.findall(r'^\s*class (\w+)', t, re.M))
    names |= set(re.findall(r'^\s*([A-Za-z_]\w*)\s*=[^=]', t, re.M))
distinct = sorted(n for n in names if len(n) >= 4 and n not in spec_words and n not in stop)


def norm_lines(t, py=True):
    out = []
    for ln in t.splitlines():
        s = ln.split('#', 1)[0] if py else ln.split('//', 1)[0]
        s = re.sub(r'\s+', ' ', s).strip()
        if len(s) >= 12:
            out.append(s)
    return out


def shingles(lines):
    return {hashlib.sha256('\n'.join(lines[i:i + 3]).encode()).hexdigest() for i in range(len(lines) - 2)}


osh = set()
for t in otext.values():
    osh |= shingles(norm_lines(t))

files = []
for d in others:
    for root, _dirs, fs in os.walk(d):
        for f in fs:
            if f.endswith(('.py', '.mjs', '.js', '.ts')):
                files.append(os.path.join(root, f))
other_text = ''
other_sh = set()
nlines = 0
for p in files:
    try:
        t = open(p, encoding='utf-8', errors='replace').read()
    except OSError:
        continue
    other_text += '\n' + t
    ls = norm_lines(t, py=p.endswith('.py'))
    nlines += len(ls)
    other_sh |= shingles(ls)
def struct_lines(t, py=True):
    """Rename-proof form: identifiers -> I, strings -> S, numbers -> N."""
    out = []
    for s in norm_lines(t, py):
        s = re.sub(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"", 'S', s)
        s = re.sub(r'\b\d+\b', 'N', s)
        s = re.sub(r'\b(?!(?:if|elif|else|for|while|return|def|class|in|not|and|or|is|None|True|False|try|except|raise|import|from|with|as|lambda|yield|continue|break|pass)\b)[A-Za-z_]\w*', 'I', s)
        out.append(s)
    return out


def shingles5(lines):
    return {hashlib.sha256('\n'.join(lines[i:i + 5]).encode()).hexdigest() for i in range(len(lines) - 4)}


osh5 = set()
for t in otext.values():
    osh5 |= shingles5(struct_lines(t))
other_sh5 = set()
for p in files:
    try:
        t = open(p, encoding='utf-8', errors='replace').read()
    except OSError:
        continue
    other_sh5 |= shingles5(struct_lines(t, py=p.endswith('.py')))
shared_names = [n for n in distinct if re.search(r'\b' + re.escape(n) + r'\b', other_text)]
print('O-DOMAIN rename-proof 5-line structure shingles: %d; shared with the other code: %d' % (len(osh5), len(osh5 & other_sh5)))
print('other code files: %d, normalized lines: %d' % (len(files), nlines))
print('O-DOMAIN distinctive identifiers: %d; found in the other code: %d' % (len(distinct), len(shared_names)))
print('  shared (O-DOMAIN names): %s' % ', '.join(shared_names))
print('O-DOMAIN 3-line shingles: %d; shared with the other code: %d' % (len(osh), len(osh & other_sh)))
