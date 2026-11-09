# [CX-A01-0314-R3] Why: retain exact round-3 execution and build bytes separately from historical round 1. Rejected: treating process exit zero or old PASS text as a new gate verdict.
import pathlib,json,hashlib,subprocess
E=pathlib.Path(__file__).resolve().parent;R=E.parents[3]
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314')
sha=lambda b:hashlib.sha256(b).hexdigest()
subprocess.run(['python3',str(E/'validate.py')],cwd=R,check=True)
s=json.loads((E/'validation-summary.json').read_text())
records=[]
for p in sorted(D.glob('r3*-*')):
    f=p/'receipt.json'
    if not f.is_file():continue
    x=json.loads(f.read_text());assert sha((p/'command.log').read_bytes())==x['logSha256']
    records.append({'label':x['label'],'head':x['head'],'receipt':str(f),'sha256':sha(f.read_bytes()),'result':x['result'],'sourceStillMatches':x['sourceStillMatches'],'start':x['start'],'end':x['end']})
(E/'RUNS.json').write_text(json.dumps(records,indent=2)+'\n')
files=[]
for p in sorted(D.rglob('*')):
    if not p.is_file():continue
    rel=p.relative_to(D)
    if not (rel.parts[0]=='round3' or rel.parts[0].startswith('r3-')):continue
    assert p.resolve().is_relative_to(D)
    files.append({'path':str(rel),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
manifests=[]
for n,i in enumerate(range(0,len(files),2000),1):
    f=E/f'DURABLE-SHA256SUMS-{n}'
    f.write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in files[i:i+2000]))
    assert f.stat().st_size<1000000;manifests.append(f.name)
(E/'INDEX.md').write_text(f'''# Contract 0.3.14 round 3 evidence

Tested source `{s['testedSource']}`; main `{s['mainIncluded']}` included. Independent review remains pending.

Final results: standalone byte-identical verify; {s['contractTests']} contract tests; {s['mutationsCaught']}/{s['mutationsCaught']} mutations ({s['mutationCatalog']} catalog, {s['retiredAnchors']} retired); evaluator 108/108; 19 Datomic public write/receipt/readback fixture tests; full integration typecheck; full offline G0 on XTDB, Datomic and QLever. The full integration domain file FAILS: 38/39 pass, with all four Datomic cases passing and the unchanged memory endpoint test timing out at 5 seconds on three retained attempts. This is not a full-file PASS. Native Datomic boundary/durability qualification was not run.

- `validation-summary.json`, `validate.py`: semantic content checks, fresh timestamps, exact source/head/main/input bindings and retained G0 raw/object/build bytes.
- `source-and-hashes.json`: frozen source inventory, including the integration corpus.
- `pin-audit.json`: 247 active paths; changed source old/new hashes; no product source pins moved; builder and pending-file input hashes regenerated (old/new hashes listed).
- `main-pending-authority.md`: initial main pending rows; validator also checks all pending rows against the final included main commit, including Q101a.
- `G0-*-receipt.json`, captures and manifests: exact builds captured before the next lane build.
- `RUNS.json`: final attempts and retained preliminary failed/corrected test attempts, with actual log bytes and before/after input observations. Preliminary runs do not grant final gate acceptance.
- {', '.join(manifests)}: {len(files)} files / {sum(f['bytes'] for f in files):,} bytes at `{D}`, freshly rehashed; historical rounds retain separate manifests.
- `SHA256SUMS`: small repository evidence. Bulky raw outputs and build preimages stay outside Git.
''')
small=[p for p in E.rglob('*') if p.is_file() and p.name!='SHA256SUMS']
assert max(p.stat().st_size for p in small)<1000000
assert sum(p.stat().st_size for p in small)<5000000
(E/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(E))+'\n' for p in sorted(small)))
print('Sealed',len(files),'round-3 durable files and',len(small),'small evidence files')
