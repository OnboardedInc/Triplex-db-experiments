from pathlib import Path
import datetime,hashlib,json,os,subprocess,time
root=Path('[LOCAL_PATH_0113]');r=root/'projects/temporal-datalog/runtime';c=r/'build/qualification-presence-profile-20261106-03';out=r/'build/presence-profile-20261106-03';runtime=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-presence-intervals-20261106/runtime');node='[LOCAL_PATH_0043]';driver=r/'adapter/profile-native-presence-intervals.mjs'
def save(name,value):
 with(c/name).open('x')as f:json.dump(value,f,indent=2);f.write('\n')
def pins():
 files={'driver':driver,'coreManifest':runtime/'build/artifact.json','ownerManifest':runtime/'build/owner_probe/artifact.json','core':runtime/'build/temporal_datalog.duckdb_extension','owner':runtime/'build/owner_probe/temporal_owner_probe.duckdb_extension','engine':runtime/'node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib'}
 return{k:hashlib.sha256(v.read_bytes()).hexdigest()for k,v in files.items()}
before=pins();save('before-first.json',dict(sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),runtime=str(runtime),output=str(out),pins=before))
env=os.environ.copy();env['UV_THREADPOOL_SIZE']='4';env.pop('NODE_OPTIONS',None)
for key in list(env):
 if key.startswith('TD_NATIVE_WRITER_LAB_'):env.pop(key)
def run(name,command):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.perf_counter()
 with(c/(name+'.stdout')).open('xb')as stdout,(c/(name+'.stderr')).open('xb')as stderr:
  proc=subprocess.Popen(command,cwd=r,env=env,stdout=stdout,stderr=stderr)
  record=dict(pid=proc.pid,command=command,cwd=str(r),startedAtUtc=start,environment={'UV_THREADPOOL_SIZE':'4','NODE_OPTIONS':'absent','TD_NATIVE_WRITER_LAB_*':'absent'})
  save(name+'.started.json',record)
  try:code=proc.wait(timeout=60);timeout=False
  except subprocess.TimeoutExpired:timeout=True;proc.terminate();code=proc.wait(timeout=10)
 record.update(exitCode=code,endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.perf_counter()-clock)*1000,outerWatchdogTerminated=timeout);save(name+'.terminal.json',record);print(json.dumps(record),flush=True);return code
code=run('syntax-first',[node,'--check',str(driver)])
if code==0:code=run('profile-first',[node,str(driver),'--runtime',str(runtime),'--output',str(out)])
after=pins();save('after-first.json',dict(pins=after,allBeforeAfterEqual=after==before));assert after==before
raise SystemExit(code)
