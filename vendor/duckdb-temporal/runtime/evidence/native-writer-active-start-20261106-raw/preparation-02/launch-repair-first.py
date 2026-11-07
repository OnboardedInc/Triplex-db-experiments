from pathlib import Path
import datetime,json,os,subprocess,sys,time
log=Path(__file__).resolve().parent
command=[sys.executable,str(log/'repair.py')]
record={'command':command,'requestedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'launcherPid':os.getpid()}
start=time.monotonic()
with (log/'repair-driver-first.log').open('xb') as output:
 process=subprocess.Popen(command,cwd=Path.cwd(),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 record['pid']=process.pid
 (log/'repair-driver-first-terminal.json').write_text(json.dumps(record,indent=2)+'\n')
 for line in iter(process.stdout.readline,b''):
  output.write(line);output.flush();sys.stdout.buffer.write(line);sys.stdout.buffer.flush()
 record['exitCode']=process.wait()
record.update(endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-start)*1000)
(log/'repair-driver-first-terminal.json').write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(record['exitCode'])
