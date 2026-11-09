import pathlib, hashlib, json, shutil, subprocess

# [EXP-DF01-R3] Why: retain the exact F1 failure and fresh gate bytes without changing prior-round evidence.
# Rejected: replacing old attempts or treating a copied historical PASS as fresh execution.
repo = pathlib.Path.cwd()
assert shutil.disk_usage(repo).free >= 5 * 1024**3, 'Host free disk below 5 GiB'
local = repo / 'lab/experiments/EXP-DF01/round3'
durable = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/round3')
runs = ['G0-datomic-20261109T085657Z-6815e5', 'G0-datomic-20261109T090324Z-69ac4b']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def copy(src, dst, expected=None):
    assert src.is_file() and not src.is_symlink()
    digest = sha(src)
    assert expected is None or digest == expected
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        assert sha(dst) == digest
    else:
        shutil.copyfile(src, dst)
    assert sha(src) == sha(dst) == digest

for run in runs:
    raw = repo / 'runs/G0' / run
    for src in sorted(raw.rglob('*')):
        if src.is_file():
            copy(src, durable / 'gates' / run / 'raw' / src.relative_to(raw))
    receipt = repo / 'lab/runs/G0' / (run + '.json')
    copy(receipt, durable / 'gates' / run / 'receipt.json')
    for entry in json.loads(receipt.read_text())['objects']:
        if 'sha256' in entry:
            digest = entry['sha256']
            copy(repo / 'runs/objects' / digest, durable / 'objects' / digest, digest)

review = 'bedf748341be24299bbe03c690d91aa8889b5ba8'
probe = subprocess.check_output(['git', 'show', review + ':lab/verify/DF01/offline_verify.clj'])
assert probe == (local / 'offline_verify.clj').read_bytes()
deadline_probe = subprocess.check_output(['git', 'show', review + ':lab/verify/DF01/deadline_cut_verify.clj'])
assert deadline_probe == (local / 'deadline_cut_verify.clj').read_bytes()
(local / 'provenance.json').write_text(json.dumps({'reviewCommit': review, 'probeSha256': hashlib.sha256(probe).hexdigest(), 'deadlineProbeSha256': hashlib.sha256(deadline_probe).hexdigest(),
    'base': '0f6c28c08daf9d370d2370eca8d152931b0ac512', 'offlineOnly': True, 'slot': None}, indent=2)+'\n')
accept = [p.read_text(errors='replace') for p in (repo/'lab/acceptance').rglob('*') if p.is_file()]
rows = ['path\told_sha256_0f6c28c0\tnew_sha256\tacceptance_path_mentions']
for name in ['feed.clj', 'feed_test.clj']:
    p = 'packages/datomic/gateway/src/triplex/gateway/' + name
    old = subprocess.check_output(['git', 'show', '0f6c28c0:'+p])
    rows.append('\t'.join([p, hashlib.sha256(old).hexdigest(), sha(repo/p), str(sum(p in s for s in accept))]))
(local / 'SOURCE-SHA256.tsv').write_text('\n'.join(rows)+'\n')
files = sorted(p for p in durable.rglob('*') if p.is_file())
(local / 'DURABLE-SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(durable))+'\n' for p in files))
small = sorted(p for p in local.rglob('*') if p.is_file() and p.name not in ['SHA256SUMS', 'index.log'])
small.append(local.parent / 'REPORT.md')
assert all(p.stat().st_size <= 1000000 for p in small)
(local / 'SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(local) if p.is_relative_to(local) else '../REPORT.md')+'\n' for p in small))
print(json.dumps({'durableFiles': len(files), 'localFiles': len(small), 'runs': runs}))
