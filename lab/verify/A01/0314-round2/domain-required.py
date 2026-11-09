"""[CX-VA01-0314-R2] Why: actual omitted-field assignments must fail compilation. Rejected: editing the reviewed SPI or trusting an expected-error directive."""
import hashlib,json,os,pathlib,subprocess,time
R=pathlib.Path(__file__).resolve().parents[4]
D=pathlib.Path(os.environ['V_P2Q_OUT']);D.mkdir(parents=True,exist_ok=True)
source=R/'packages/core/src/storage/StorageAdapter.ts'
sha=lambda b:hashlib.sha256(b).hexdigest()
before=source.read_bytes()
base='import type { StorageAdapterService } from "../../../../packages/core/src/storage/StorageAdapter.js";\ndeclare const complete: StorageAdapterService;\n'
good=base+'export const assigned: StorageAdapterService = complete;\n'
bad=base+'const { valueDomain, ...withoutDomain } = complete;\nvoid valueDomain;\nexport const assigned: StorageAdapterService = withoutDomain;\n'
cases={}
for label,code in [('baseline',good),('omission',bad)]:
    fixture=pathlib.Path(__file__).parent/'_domain-fixture.ts'
    fixture.write_text(code)
    args=[str(R/'node_modules/.bin/tsc'),'--noEmit','--target','ESNext','--module','ESNext','--moduleResolution','bundler','--strict','--skipLibCheck',str(fixture)]
    start=time.time();p=subprocess.run(args,cwd=R,capture_output=True)
    output=p.stdout+p.stderr
    (D/(label+'.ts')).write_text(code);(D/(label+'.log')).write_bytes(output)
    cases[label]={'start':start,'end':time.time(),'exit':p.returncode,'fixtureSha256':sha(code.encode()),'outputSha256':sha(output),'command':args}
    if label=='baseline':assert p.returncode==0,output.decode()
    else:assert p.returncode!=0 and b'TS2741' in output and b'valueDomain' in output and b'missing' in output,output.decode()
    fixture.unlink()
assert source.read_bytes()==before
record={'sourceSha256':sha(before),'sourceUnchanged':True,'cases':cases,'meaning':'The real required SPI rejects an actual domain omission; no product source mutated.'}
(D/'domain-required.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
