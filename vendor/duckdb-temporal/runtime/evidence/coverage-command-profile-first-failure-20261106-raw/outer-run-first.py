from pathlib import Path
import json,hashlib,subprocess,datetime,time,os
root=Path('[LOCAL_PATH_0113]');r=root/'projects/temporal-datalog/runtime';cap=r/'build/qualification-coverage-command-profile-20261106-01';out=r/'build/coverage-command-profile-20261106-01/baseline-zero';runtime=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-presence-intervals-20261106/runtime');cost=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-20261105/runtime');node=Path('[LOCAL_PATH_0043]');source='59db67660428984322f6d98872a4e53317c95358'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):
 with(cap/name).open('x')as f:json.dump(value,f,indent=2);f.write('\n')
costchild=cost/'build/reference-coverage-cost-20261106-01/zero-0-1-pair0-baseline/result.json';approved=json.loads(costchild.read_text());assert approved['status']=='passed' and approved['sourcePinsBefore']['commit']=='cf7f0d86645383944cac77c2f49e331428c75a33'
names=['build/adapter/native-duckdb-port.mjs','build/adapter/native-schema.js','build/adapter/owned-duckdb-port.mjs','build/adapter/native-entity.js','build/adapter/native-entity.d.ts']
def pins():
 code={}
 for name in ['adapter/profile-reference-coverage-command.mjs','REFERENCE-COVERAGE-COMMAND-PROFILE.md','adapter/patch-profile-sql.mjs']:
  want=hashlib.sha256(subprocess.check_output(['git','show',source+':projects/temporal-datalog/runtime/'+name],cwd=root)).hexdigest();got=sha(r/name);assert got==want;code[name]=got
 sdk={}
 for name in names:
  got=sha(runtime/name);assert got==approved['provenanceBefore']['hashes'][name];sdk[name]=got
 nodehash=sha(node);assert nodehash=='6f2e835e57feb7a29ffcd53a4d4eb60224ec264a1e002c3ba6d99999ea29807d' and nodehash==approved['provenanceBefore']['nodeExecutableSha256']
 return dict(sourceCommit=source,code=code,criticalSdk=sdk,node=dict(path=str(node),resolved=str(node.resolve()),sha256=nodehash),approvedCostChild=dict(path=str(costchild),sha256=sha(costchild),role='baseline',sourceCommit=approved['provenanceBefore']['sourceCommit']))
before=pins();save('before-first.json',before);env=os.environ.copy();env['UV_THREADPOOL_SIZE']='4';env.pop('NODE_OPTIONS',None)
for key in list(env):
 if key.startswith('TD_NATIVE_WRITER_LAB_'):env.pop(key)
def run(name,argv):
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.perf_counter()
 with(cap/(name+'.stdout')).open('xb')as stdout,(cap/(name+'.stderr')).open('xb')as stderr:
  child=subprocess.Popen(argv,cwd=r,env=env,stdout=stdout,stderr=stderr);record=dict(pid=child.pid,parentPid=os.getpid(),argv=argv,cwd=str(r),startedAtUtc=started,environment={'UV_THREADPOOL_SIZE':'4','NODE_OPTIONS':'absent','TD_NATIVE_WRITER_LAB_*':'absent'});save(name+'.started.json',record);print(json.dumps(record),flush=True);code=child.wait()
 record.update(exitCode=code,endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.perf_counter()-clock)*1000);save(name+'.terminal.json',record);print(json.dumps(record),flush=True);return code
code=run('syntax-first',[str(node),'--check',str(r/'adapter/profile-reference-coverage-command.mjs')])
if code==0:code=run('baseline-first',[str(node),str(r/'adapter/profile-reference-coverage-command.mjs'),'--role','baseline','--scenario','zero','--runtime',str(runtime),'--cost-root',str(cost),'--output',str(out)])
after=pins();save('after-first.json',dict(pins=after,allBeforeAfterEqual=before==after));assert before==after
raise SystemExit(code)
