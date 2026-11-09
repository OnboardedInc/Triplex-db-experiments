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
    if not (rel.parts[0]=='round3' or rel.parts[0].startswith(('r3-','r3-'))):continue
    assert p.resolve().is_relative_to(D)
    files.append({'path':str(rel),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
manifests=[]
for n,i in enumerate(range(0,len(files),2000),1):
    f=E/f'DURABLE-SHA256SUMS-{n}'
    f.write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in files[i:i+2000]))
    assert f.stat().st_size<1000000;manifests.append(f.name)
(E/'INDEX.md').write_text(f'''# Contract 0.3.14 round 3 evidence

Tested source `{s['testedSource']}`; main `{s['mainIncluded']}` included. Independent review remains pending.

Final results: standalone byte-identical verify; 23 contract tests; 519/519 executed mutations (607 catalog, 88 retired); evaluator 108/108; 19 broker integer/JSON/codec tests; runtime type fixtures; full offline G0 on XTDB, Datomic and QLever. No obligation closure, performance or live qualification.

- `validation-summary.json`, `validate.py`: exact result content, fresh timestamps, source/head/main/input bindings and retained G0 raw/object/build bytes.
- `source-and-hashes.json`: final frozen source inventory. `source-and-hashes-attempt1.json` retains the prior round-3 source.
- `pin-audit.json`: all 247 active paths, changed source old/new hashes and zero moved active pins. Acceptance remains byte-identical to bed67f1f. The earlier audit is retained separately.
- `G0-*-receipt.json`, capture metadata and per-lane manifests: final fresh G0s; exact builds captured before the next lane build.
- `attempt1-G0-*`: prior passing XTDB/Datomic and failing QLever build/typecheck attempt, never replaced by final results.
- `RUNS.json`: both attempt series, exact command/log receipts and before/after source observations. Only r2b final attempts qualify this builder gate result.
- `domain-type-mutation.py`: preliminary compile-time optional-field control, with original/mutant/restored hashes and actual TS2578 diagnostic retained in durable round3. It is not an engine VM qualification.
- {', '.join(manifests)}: {len(files)} files / {sum(f['bytes'] for f in files):,} bytes at `{D}`; every entry freshly rehashed. Earlier round-1 files are outside this manifest scope and retain their original manifests.
- `SHA256SUMS`: all small round-3 repository evidence. No dependency caches or bulky raw output copied to Git.
''')
small=[p for p in E.rglob('*') if p.is_file() and p.name!='SHA256SUMS']
assert max(p.stat().st_size for p in small)<1000000
assert sum(p.stat().st_size for p in small)<5000000
(E/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(E))+'\n' for p in sorted(small)))
print('Sealed',len(files),'round-3 durable files and',len(small),'small evidence files')
