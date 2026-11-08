"""V-D01c delta check: compare old and new corpus results. python3 -I.  usage: compare_corpus.py <old.jsonl> <new.jsonl>"""
import collections
import json
import sys

old = [json.loads(x) for x in open(sys.argv[1])]
new = [json.loads(x) for x in open(sys.argv[2])]
assert [o['tag'] for o in old] == [n['tag'] for n in new]
same = 0
old_crash = collections.Counter()
old_syntax_new_value = collections.Counter()
differ = []
new_crash = []
for o, n in zip(old, new):
    if n['res'].startswith('CRASH') or 'CANON-CRASH' in n['res']:
        new_crash.append((o['tag'], n['brief']))
    if o['res'] == n['res']:
        same += 1
    elif o['res'].startswith('CRASH') or 'CANON-CRASH' in o['res']:
        kind = 'parse' if o['tag'].startswith('parse') else 'op'
        old_crash['%s %s -> %s' % (kind, o['brief'][:40], n['brief'][:28] if kind == 'op' else 'value')] += 1
    elif o['res'] == 'SYNTAX' and o['tag'].startswith('parse'):
        old_syntax_new_value['parse SYNTAX -> value'] += 1
    else:
        differ.append((o['tag'], o['brief'], n['brief']))
print('entries %d: identical %d; old crashed %d; old syntax error, new value %d; other differences %d; new crashes %d'
      % (len(old), same, sum(old_crash.values()), sum(old_syntax_new_value.values()), len(differ), len(new_crash)))
for k, v in sorted(old_crash.items()):
    print('  old crash  %4d  %s' % (v, k))
for k, v in old_syntax_new_value.items():
    print('  %4d  %s' % (v, k))
for d in differ[:40]:
    print('  DIFFER', d)
for c in new_crash[:20]:
    print('  NEW CRASH', c)
