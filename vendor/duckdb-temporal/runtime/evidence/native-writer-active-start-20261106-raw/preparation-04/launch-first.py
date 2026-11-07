from pathlib import Path
import datetime,json,os,subprocess,sys,time
log=Path(__file__).resolve().parent
command=[sys.executable,str(log/'compile-corrected.py')]
r={'command':command,'requestedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'launcherPid':os.getpid()};started=time.monotonic()
with (log/'driver-first.log').open('xb') as output:
 p=subprocess.Popen(command,cwd=Path.cwd(),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);r['pid']=p.pid
 (log/'driver-first-terminal.json').write_text(json.dumps(r,indent=2)+'\n')
 for line in iter(p.stdout.readline,b''):
  output.write(line);output.flush();sys.stdout.buffer.write(line);sys.stdout.buffer.flush()
 r['exitCode']=p.wait()
r.update(endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-started)*1000)
(log/'driver-first-terminal.json').write_text(json.dumps(r,indent=2)+'\n');raise SystemExit(r['exitCode'])
