"""[DX-S3] Compare two request recordings of s3/bytes.ts (or s2/bytes.ts) byte for byte. Masked: the snapshot handles
the gateway issues (random by design) and the ordered block tokens the SDK takes from the process clock (read from
the journal IDs _tx/<token>00 and _tx/<token>W00), each by order of first use. Everything else must match exactly.
usage: python3 -I compare-bytes.py <a.jsonl> <b.jsonl>"""
import json, re, sys
def load(path):
    handles, tokens, out = {}, {}, []
    for line in open(path):
        r = json.loads(line)
        body = re.sub(r'"handle":"([0-9a-f-]{36})"', lambda m: '"handle":"h%d"' % handles.setdefault(m.group(1), len(handles) + 1), r["body"])
        for t in re.findall(r'_tx/([0-7][0-9A-HJKMNP-TV-Z]{23})00', body) + re.findall(r'_tx/([0-7][0-9A-HJKMNP-TV-Z]{22})W00', body):
            tokens.setdefault(t, "TOKEN%04d" % (len(tokens) + 1) + "x" * (len(t) - 9))
        for t, m in tokens.items():
            body = body.replace(t, m)
        out.append((r["method"], r["url"], body, r["body"] == body))
    return out, len(handles), len(tokens)
a, ha, ta = load(sys.argv[1]); b, hb, tb = load(sys.argv[2])
same = len(a) == len(b) and all(x == y for x, y in zip(a, b))
exact = sum(1 for x, y in zip(a, b) if x == y and x[3])
print(json.dumps({"requests": [len(a), len(b)], "identical": same, "identicalWithoutMask": exact,
                  "maskedHandles": [ha, hb], "maskedTokens": [ta, tb], "bytes": sum(len(x[2]) for x in a)}))
for i, (x, y) in enumerate(zip(a, b)):
    if x != y:
        j = next((k for k in range(min(len(x[2]), len(y[2]))) if x[2][k] != y[2][k]), min(len(x[2]), len(y[2])))
        print(i, x[1], "\n", x[2][max(0, j - 200):j + 200], "\n---\n", y[2][max(0, j - 200):j + 200]); break
sys.exit(0 if same else 1)
