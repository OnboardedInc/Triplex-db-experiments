from pathlib import Path
import datetime,json,os,subprocess,time
r=Path("<writer-source-runtime>/build/native-writer-lab-antijoin-20261106/candidate-01")
args=["node","<writer-source-runtime>/adapter/native-writer-lab-antijoin.mjs","--binding","<writer-source-runtime>/build/native-writer-lab-20261106-01/binding-first.json","--budget","<writer-source-runtime>/evidence/antijoin-cost-10m-budget-20261105.json","--baseline-root","<task-workspace>/temporal-thread-budget-20261105/projects/temporal-datalog/runtime","--fixture","<accepted-project-runtime>/build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb","--evidence","<accepted-project-runtime>/build/combined-028-20261105/mixed-10m-pilot.json","--small-control-proof","<writer-source-runtime>/build/native-writer-lab-small-20261106-01/sdk_control/result.json","--small-candidate-proof","<writer-source-runtime>/build/native-writer-lab-small-20261106-01/cpp_candidate/result.json","--role","cpp_candidate","--output","<writer-source-runtime>/build/native-writer-lab-antijoin-20261106/candidate-01/cpp_candidate.json"]
assert not (r/'cpp_candidate.json').exists()
assert (r/'source-before.json').exists()
env=dict(os.environ);env['UV_THREADPOOL_SIZE']='4';env.pop('NODE_OPTIONS',None)
env['PATH']='<pinned-node-installation>/bin:'+env.get('PATH','')
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
with(r/'outer.stdout.log').open('xb')as out,(r/'outer.stderr.log').open('xb')as err:
 p=subprocess.Popen(args,cwd="<writer-source-runtime>",env=env,stdout=out,stderr=err)
 terminal=dict(role='cpp_candidate',pid=p.pid,wrapperPid=os.getpid(),argv=args,startedAtUtc=start,status='running')
 with(r/'outer-terminal.json').open('x')as f:json.dump(terminal,f,indent=2);f.write('\n')
 code=p.wait()
terminal.update(status='terminal',exitCode=code,exitedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-clock)*1000)
(r/'outer-terminal.json').write_text(json.dumps(terminal,indent=2)+'\n')
print(json.dumps(terminal));raise SystemExit(code)
