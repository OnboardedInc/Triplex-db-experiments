# [CX-VRT01-R4] Why: retain all raw attempts outside Git and verify copied bytes before removing exact local duplicates. Rejected: dropping failures or committing bulky gate/package evidence.
import pathlib,hashlib,json,shutil
B=pathlib.Path(__file__).resolve().parent;D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round4')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not D.exists();D.mkdir(parents=True)
raw=[]
for p in B.iterdir():
 if p.is_dir():raw.extend(x for x in p.rglob('*')if x.is_file())
 elif p.suffix in ['.json','.stdout','.stderr','.txt'] or p.name in ['stdout','stderr']:raw.append(p)
checks=[]
for p in sorted(raw):
 assert not p.is_symlink();name=p.relative_to(B);h=sha(p);q=D/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(q)==h;checks.append({'path':str(name),'sha256':h,'bytes':p.stat().st_size})
assert len(checks)>100
for p in raw:assert sha(p)==sha(D/p.relative_to(B));p.unlink()
for p in sorted((x for x in B.rglob('*')if x.is_dir()),key=lambda p:len(p.parts),reverse=True):
 if not any(p.iterdir()):p.rmdir()
(B/'DURABLE-SHA256SUMS').write_text(''.join(c['sha256']+'  '+c['path']+'\n'for c in checks))
result=json.loads((D/'RESULT.json').read_text());assert result['verdict']=='ACCEPT-OFFLINE' and not result['packQualified'] and not result['liveG2G6Qualified']
index={'root':str(D),'files':len(checks),'bytes':sum(c['bytes']for c in checks),'verdict':result['verdict'],'product':'472c2c2439922b52e33206510b6cecb0812206ed','reviewedMerge':'8ba84f30b0b359174505270136150665f2b943af','adopted':list(result['records']),'packageException':'Initial Cloudflare native binding failure retained; separate final ten-test retest passes','packQualified':False,'packGate':'pack/','packPreparationFailure':'pack-attempt5/','manifestSha256':sha(B/'DURABLE-SHA256SUMS')}
(B/'INDEX.json').write_text(json.dumps(index,indent=2)+'\n')
(B/'DURABLE-INDEX.md').write_text('''# CX-VRT01 round 4 evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VRT01/round4/`.

Verify `DURABLE-SHA256SUMS` relative to that root. Every inventoried local raw output was copied and read back by SHA256 before its exact local duplicate was removed. No failed attempt was discarded. `SHA256SUMS` binds committed tools, reader audit, indexes and report.

- `RESULT.json`, `closure/execution.json`: scoped ACCEPT-OFFLINE; packQualified/liveG2G6Qualified false.
- `journal/`: five fresh service cases, complete observed records, continuations, emitted transport queries and explicit validAt controls. `journal-oracle/` and root `journal-comparisons.json`: independent expected pages/records and 55 validity cuts.
- `reproductions/`, `matrix/`, `pending/`, `pending-proof/`: final-build F1-F6 regressions. Root oracle/route/single/pending comparison files bind the independent expected outputs.
- `packages/`: initial 24-success/one-failure phase output and raw logs; initial failure is missing better-sqlite3 binary. `cloudflare-retest/`: final 10/10 passing mock tests. `addon/`, `addon2/`: retained local dependency setup/build logs.
- `data-audit/`: final 800-file stored-data search, input hashes, patterns and matches. `data-audit-attempt1/`: earlier narrower inventory. Committed DATA-AUDIT.md records manual classification and limitations.
- `pack-attempt1` through `pack-attempt4`: invocation/setup failures, including zero exits for nonexistent scripts that are not adopted as build success. `pack-attempt5`: actual DuckDB TS4023 declaration failure. `pack/`: remaining actual export builds and upstream gate failure on missing DuckDB dist/index.d.ts; no consumer install or pack PASS.
- `before-pack-builds/`: prior successful runtime outputs and build-binding refusal; superseded by fresh final-build reproductions, not relabeled against later artifacts.
- `integrity.json`, `integrity/`, `bindings.json`: builder manifest/pin checks and current source/build/oracle receipt bindings.

Tools retain their worktree output paths for new execution. For this completed attempt, resolve retained raw paths under the durable root; do not overwrite them. See ../VERIFY-round4.md for source references, nonblocking findings and the PASS audit.
''')
source=[p for p in B.iterdir()if p.is_file()and p.name!='SHA256SUMS']+[B.parent/'VERIFY-round4.md']
(B/'SHA256SUMS').write_text(''.join(sha(p)+'  '+(p.name if p.parent==B else '../VERIFY-round4.md')+'\n'for p in sorted(source)))
for c in checks:assert sha(D/c['path'])==c['sha256']
print(json.dumps(index,indent=2))
