# [CX-VRT01-R3] Why: retain all owned raw attempts outside Git and verify destination bytes before removing a local duplicate. Rejected: dropping failures or committing a growing raw-output directory.
import pathlib,hashlib,json,shutil
B=pathlib.Path(__file__).resolve().parent
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round3')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not D.exists(),'Use a fresh evidence location; never overwrite an earlier attempt'
D.mkdir(parents=True)
raw=[]
for p in B.iterdir():
 if p.is_dir():raw.extend(x for x in p.rglob('*')if x.is_file())
 elif p.suffix in ['.json','.stdout','.stderr','.txt'] or p.name in ['stdout','stderr']:raw.append(p)
checks=[]
for p in sorted(raw):
 assert not p.is_symlink(),p
 name=p.relative_to(B);h=sha(p);dest=D/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);assert sha(dest)==h
 checks.append({'path':str(name),'sha256':h,'bytes':p.stat().st_size})
assert len(checks)==len(raw) and len(checks)>100
# [CX-VRT01-R3] Why: only remove these exact inventoried local duplicates after every read-back succeeded. Rejected: recursive deletion or deleting unknown/active files.
for p in raw:assert sha(p)==sha(D/p.relative_to(B));p.unlink()
for p in sorted((p for p in B.rglob('*')if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
 if not any(p.iterdir()):p.rmdir()
(B/'DURABLE-SHA256SUMS').write_text(''.join(v['sha256']+'  '+v['path']+'\n'for v in checks))
result=json.loads((D/'RESULT.json').read_text())
index={'root':str(D),'files':len(checks),'bytes':sum(v['bytes']for v in checks),'verdict':result['verdict'],'product':'4b305bc8886d4bcdd73f36be65b53fda3e1846cd','head':'c801942f4394f2a2a854ef4ae1eb5bdac7b1576b','adopted':list(result['records']),'closure':'closure/execution.json','manifestSha256':sha(B/'DURABLE-SHA256SUMS'),'rawRetention':'Every prior reviewer attempt retained, including failed transports, failed model driver and incomplete comparison wrapper'}
(B/'INDEX.json').write_text(json.dumps(index,indent=2)+'\n')
(B/'DURABLE-INDEX.md').write_text('''# CX-VRT01 round 3 durable evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round3/`.

`DURABLE-SHA256SUMS` paths are relative to that root. Every source output was copied and read back by SHA256 before its exact local duplicate was removed. Failed attempts are retained.

Adopted: `packages/`, `reproductions/`, `comparisons/attempt2/`, `actual-property/attempt4/`, `model-property/attempt2/`, `journal-clock/attempt3/`, `property-oracle/`. Closure: `RESULT.json` and `closure/execution.json`.

- F7: `journal-clock/attempt3/{a0,compact}-observed.json` and `*-sql.json`, plus `property-comparisons.json` and the raw expected pages in `property-oracle/`.
- 1,074 package tests: `packages/*-tests.txt`, `phases.json`, `execution.json`.
- Original reproductions: `reproductions/`, `matrix/`, `pending/`, `pending-proof/`; independent comparisons in the root `*-comparisons.json` files.
- New schedules: `actual-property/attempt4/*-observed.json`, `*.case.json`, `summary.json`; `model-property/attempt2/results.json`.
- Accepted oracle: `oracle/` contains self-check, 403 tests, 14 fixtures and pinned-tree command inventory; per-case responses remain alongside their input families.
- First failures: actual-property attempts 1–3, initial model-property results and runner, comparison-attempt1, preliminary journal-clock outputs. Reasons and coverage limits are in `../VERIFY-round3.md`.
- Integrity: `integrity.json`, `bindings.json`, `RESULT.json`; builder durable evidence is separately verified by closure and remains in the builder's CX-RT01 directory.

Reviewer tools keep their original worktree output paths for fresh reproduction. To inspect this attempt, resolve retained raw paths under the durable root above; do not overwrite these attempts. The manifest binds all retained bytes, including source preimages stored with failed attempts. `SHA256SUMS` binds committed reviewer tools, index and report.
''')
source=[p for p in B.iterdir()if p.is_file()and p.name!='SHA256SUMS']+[B.parent/'VERIFY-round3.md']
(B/'SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(B)if p.parent==B else pathlib.Path('../VERIFY-round3.md'))+'\n'for p in sorted(source)))
for c in checks:assert sha(D/c['path'])==c['sha256']
print(json.dumps(index,indent=2))
