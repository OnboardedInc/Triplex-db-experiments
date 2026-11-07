from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,os,subprocess,sys,time
r=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-sdk-integration-20261105/runtime')
f=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-thread-budget-20261105/runtime/build/sdk-admission-frozen-032-20261105')
main=Path('__HANDOFF_ROOT__/duckdb-temporal/current/runtime')
expected_commit='9261c96d8ac0ffcc52c0735d396fcbcbf18e4ef0'
preflight=json.loads((r/'evidence/sdk-integration-preflight-20261105.json').read_text())
preflight['sourceSha256']=json.loads((r/'evidence/sdk-integration-fixture-fix-20261105.json').read_text())['sourceSha256']
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
before=snapshot();directory=r/'build/sdk-integration-functional-20-20261105';assert not directory.exists();directory.mkdir()
(directory/'before.json').write_text(json.dumps(before,indent=2)+'\n')
output=directory/'first.json';log=directory/'first.log'
command=['node','workloads/run_three_engines.mjs','--runtime',str(r),'--output',str(output),'--samples','1','--warmup','0','--python',sys.executable]
started=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
with log.open('x') as stream:
    child=subprocess.Popen(command,cwd=r,stdout=stream,stderr=subprocess.STDOUT)
    launch={'started_at':started,'pid':child.pid,'source_commit':expected_commit,'cwd':str(r),'command':command,'output':str(output),'log':str(log)}
    (directory/'launch.json').write_text(json.dumps(launch,indent=2)+'\n')
    print(json.dumps(launch),flush=True)
    code=child.wait()
terminal={'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'pid':child.pid,'exit_code':code,'elapsed_seconds':time.monotonic()-clock,'first_terminal':True}
try:
    after=snapshot();(directory/'after.json').write_text(json.dumps(after,indent=2)+'\n')
    terminal['unchanged_before_after']=all(before[key]==after[key] for key in before if key!='checked_at')
except Exception as error:terminal['postcheck_error']=str(error)
(directory/'terminal.json').write_text(json.dumps(terminal,indent=2)+'\n')
print(json.dumps(terminal),flush=True)
sys.exit(code if code else 0 if terminal.get('unchanged_before_after') else 1)
