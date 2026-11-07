from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,os,subprocess,sys,time
r=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-sdk-integration-20261105/runtime')
f=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-thread-budget-20261105/runtime/build/sdk-admission-frozen-032-20261105')
main=Path('__HANDOFF_ROOT__/duckdb-temporal/current/runtime')
expected_commit='beaab6eef7d8b08456a53e8ab6ee5b6f6e1835dc'
preflight=json.loads((r/'evidence/sdk-integration-preflight-20261105.json').read_text())
def digest(p):
    h=sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1048576),b''):h.update(chunk)
    return h.hexdigest()
def snapshot():
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
    assert commit==expected_commit
    sources={name:digest(r/name) for name in preflight['sourceSha256']}
    pins={name:digest(r/name) for name in preflight['pinsAfterTsc']}
    assert sources==preflight['sourceSha256'] and pins==preflight['pinsAfterTsc']
    dependencies={}
    for line in (f/'SHA256SUMS').read_text().splitlines():
        expected,name=line.split('  ',1)
        if name.startswith('runtime/node_modules/'):
            actual=digest(r/name.removeprefix('runtime/'));assert actual==expected,name
            dependencies[name.removeprefix('runtime/')]=actual
    node="const{createRequire}=require('node:module');const q=createRequire(process.argv[1]);const names=['effect','typescript','@triplex-build/triplex','@triplex-build/triplex/runtime','@triplex-build/triplex-testkit','@triplex-build/triplex-sql'];console.log(JSON.stringify(Object.fromEntries(names.map(name=>[name,q.resolve(name)]))));"
    entries=json.loads(subprocess.check_output(['node','-e',node,str(r/'build/adapter/index.js')],text=True))
    external={name:{'path':path,'sha256':digest(Path(path))} for name,path in entries.items()}
    python_native=Path('[LOCAL_PATH_0060]')
    return {'checked_at':datetime.now(timezone.utc).isoformat(),'commit':commit,'source_sha256':sources,'pins':pins,'frozen_sdk_dependency_files':dependencies,'additional_entries':external,'python_native':{'path':str(python_native),'sha256':digest(python_native)}}
before=snapshot();(r/'build/sdk-integration-full-before.json').write_text(json.dumps(before,indent=2)+'\n')
env={**os.environ,**preflight['fullVerification']['environment']}
started=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
log=r/'build/sdk-integration-full-first.log'
with log.open('x') as output:
    process=subprocess.Popen([sys.executable,'verify.py','--with-direct'],cwd=r,env=env,stdout=output,stderr=subprocess.STDOUT)
    launch={'started_at':started,'pid':process.pid,'source_commit':expected_commit,'cwd':str(r),'command':[sys.executable,'verify.py','--with-direct'],'environment':preflight['fullVerification']['environment'],'log':str(log)}
    (r/'build/sdk-integration-full-launch.json').write_text(json.dumps(launch,indent=2)+'\n')
    print(json.dumps({'started_at':started,'pid':process.pid,'log':str(log)}),flush=True)
    code=process.wait()
result={'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'exit_code':code,'elapsed_seconds':time.monotonic()-clock,'pid':process.pid,'first_terminal':True}
try:
    after=snapshot();(r/'build/sdk-integration-full-after.json').write_text(json.dumps(after,indent=2)+'\n')
    result['unchanged_before_after']=all(before[key]==after[key] for key in before if key!='checked_at')
except Exception as error:
    result['postcheck_error']=str(error)
(r/'build/sdk-integration-full-first-terminal.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result),flush=True)
sys.exit(code if code else 0 if result.get('unchanged_before_after') else 1)
