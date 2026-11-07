from pathlib import Path
import datetime,json,os,subprocess,time
role=__import__('sys').argv[1];assert role in ['sdk_control','cpp_candidate']
source=Path(os.environ['TD_WRITER_SOURCE']);measured=Path(os.environ['TD_MEASURED_SOURCE'])
q=Path(os.environ['TD_WRITER_RUN'])/role;q.mkdir();(q/'process').mkdir()
env=dict(os.environ);env.update(NODE_OPTIONS='--import='+(source/'adapter/native-writer-lab-preload.mjs').as_uri(),
 TD_NATIVE_WRITER_LAB_ROLE=role,TD_NATIVE_WRITER_LAB_RUNTIME=os.environ['TD_WRITER_STAGE'],
 TD_NATIVE_WRITER_LAB_BINDING=os.environ['TD_WRITER_BINDING'],TD_NATIVE_WRITER_LAB_EVIDENCE=str(q/'process'))
args=['node',str(measured/'adapter/benchmark-scale.mjs'),'--runtime',os.environ['TD_WRITER_STAGE'],
 '--sizes','10000000','--readers','1,4,16','--samples','5','--warmup','1','--writes','8',
 '--group-size','256','--fixture-mode','mixed','--threads','4','--memory-limit','2GB',
 '--max-temp-directory-size','4GB','--max-intermediate-bytes','4294967296',
 '--duration-seconds','60','--read-duration-seconds','0','--max-writes','12000',
 '--clone-database',os.environ['TD_WRITER_FIXTURE'],'--clone-evidence',os.environ['TD_WRITER_RECIPE'],
 '--output',str(q/'result.json')]
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
with (q/'stdout.log').open('xb') as out,(q/'stderr.log').open('xb') as err:
 p=subprocess.Popen(args,cwd=source,env=env,stdout=out,stderr=err)
 terminal={'role':role,'pid':p.pid,'argv':args,'startedAtUtc':start,'status':'running'}
 (q/'terminal.json').write_text(json.dumps(terminal,indent=2)+'\n');code=p.wait()
terminal.update(status='terminal',exitCode=code,exitedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-clock)*1000)
(q/'terminal.json').write_text(json.dumps(terminal,indent=2)+'\n');raise SystemExit(code)
