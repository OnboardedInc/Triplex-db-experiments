# [CX-A01-0314-R2] Why: show the negative type fixture rejects restoring optional admission. Rejected: checking only the interface's spelling.
import pathlib,subprocess,hashlib,json,time,difflib
R=pathlib.Path(__file__).resolve().parents[4]
D=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314/round2')
p=R/'packages/core/src/storage/StorageAdapter.ts';before=p.read_bytes()
anchor=b'readonly valueDomain: ';assert before.count(anchor)==1
mutant=before.replace(anchor,b'readonly valueDomain?: ',1)
started=time.time();sha=lambda b:hashlib.sha256(b).hexdigest()
(D/'optional-domain-mutant.patch').write_text(''.join(difflib.unified_diff(before.decode().splitlines(True),mutant.decode().splitlines(True),fromfile='StorageAdapter.ts',tofile='StorageAdapter.optional.ts')))
try:
    p.write_bytes(mutant)
    out=subprocess.run([str(R/'node_modules/.bin/tsc'),'--noEmit','-p','packages/core/test/runtime'],cwd=R,capture_output=True)
    log=out.stdout+out.stderr;(D/'optional-domain-mutant-compiler.log').write_bytes(log)
    assert out.returncode!=0 and b'TS2578' in log and b'runtime.types.ts' in log
finally:p.write_bytes(before)
assert p.read_bytes()==before
record={'startedAtEpoch':started,'endedAtEpoch':time.time(),'originalSha256':sha(before),'mutantSha256':sha(mutant),'restoredSha256':sha(p.read_bytes()),'exit':out.returncode,'logSha256':sha(log),'requiredDiagnostic':'TS2578 unused @ts-expect-error in runtime.types.ts','meaning':'Restoring the optional field makes the missing-domain type regression fail; not an engine VM qualification'}
(D/'optional-domain-mutant.json').write_text(json.dumps(record,indent=2)+'\n')
print('Optional-domain mutant rejected by the actual TypeScript fixture; original source bytes restored')
