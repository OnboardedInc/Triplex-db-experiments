"""V-D01c: compare a fingerprint receipt with the values V-D01 pinned in lab/verify/D01/VERIFY.md (W0-1.1.1 delta check),
independently of the EXPECTED_100K constants inside O-DOMAIN. python3 -I.  usage: fp_vs_verify.py <repo> <receipt.json>"""
import json
import os
import re
import sys

repo, receipt = sys.argv[1], sys.argv[2]
text = open(os.path.join(repo, 'lab', 'verify', 'D01', 'VERIFY.md')).read()
line = [ln for ln in text.splitlines() if 'Final fingerprint' in ln]
blk = text[text.index(line[0]):]
blk = blk[:blk.index('\n- Hash table')]
want = {
    'basisTx': int(re.search(r'basis\.tx ([0-9,]+);', blk).group(1).replace(',', '')),
    'facts': int(re.search(r'; ([0-9,]+) facts;', blk).group(1).replace(',', '')),
    'worlds': re.search(r'worlds\s+(sha256:[0-9a-f]{64})', blk).group(1),
    'R1': re.search(r'R1 (sha256:[0-9a-f]{64})', blk).group(1),
    'R2': re.search(r'R2 (sha256:[0-9a-f]{64})', blk).group(1),
    'R3': re.search(r'R3 (sha256:[0-9a-f]{64})', blk).group(1),
}
got = json.load(open(receipt))['fingerprint']
for k in ('basisTx', 'facts', 'worlds', 'R1', 'R2', 'R3'):
    print('%-8s %-6s %s' % (k, 'match' if got[k] == want[k] else 'DIFFER', got[k]))
print('all six match V-D01' if all(got[k] == want[k] for k in want) else 'MISMATCH')
