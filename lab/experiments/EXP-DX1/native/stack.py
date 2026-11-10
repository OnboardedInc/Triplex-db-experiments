#!/usr/bin/env python3
"""[DX-N1] Why: exact child identities and immutable run dirs contain failures. Rejected: shell launcher grandchildren."""
import hashlib,json,os,pathlib,shutil,signal,socket,subprocess,sys,time,urllib.request
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/native')
TOOLS=ROOT/'tools'; REPO=pathlib.Path(__file__).resolve().parents[4]
mode,prefix=sys.argv[1:3]
import re
assert re.fullmatch(r'tx2-dxn1-[a-z0-9-]+',prefix),'invalid prefix'
run=ROOT/'runs'/prefix

def identity(pid):
 p=subprocess.run(['ps','-p',str(pid),'-o','lstart=,command='],capture_output=True,text=True)
 return p.stdout.strip() if p.returncode==0 else None

def down(keep=False):
 if not run.exists():return
 rows=[]
 for role in ['gw-r','gw-w','tx','pg']:
  f=run/(role+'.pid.json')
  if not f.exists():continue
  r=json.loads(f.read_text()); current=identity(r['pid'])
  if current is not None and current!=r['identity']:
   raise RuntimeError('PID identity mismatch; refusing signal: '+str(r))
  if current is not None:
   os.kill(r['pid'],signal.SIGINT if role=='pg' else signal.SIGTERM)
   for _ in range(150):
    if identity(r['pid']) is None:break
    time.sleep(.2)
   else:raise RuntimeError('process did not stop: '+role)
  rows.append(dict(role=role,pid=r['pid'],gone=identity(r['pid']) is None))
 (run/'cleanup.json').write_text(json.dumps(rows,indent=2))
 if not keep:
  for name in ['pg-data','tx-data']:
   shutil.rmtree(run/name,ignore_errors=False) if (run/name).exists() else None
 (run/'ready.json').unlink(missing_ok=True)

if mode=='down':down('--keep' in sys.argv);sys.exit()
assert sys.platform=='darwin','native arm requires macOS'
run.mkdir(parents=True,exist_ok=False)
java=next(TOOLS.glob('jdk-21*/Contents/Home/bin/java'))
pg=TOOLS/'postgres/bin'; datomic=TOOLS/'datomic'
variant=os.environ.get('DX_NATIVE_WAL','default');assert variant in ['default','fsync_writethrough']
base=int(os.environ.get('DX_NATIVE_PORT_BASE','28400'));assert 28400<=base<=28494
for port in range(base,base+6):
 with socket.socket() as s:
  try:s.bind(('127.0.0.1',port))
  except OSError as e:raise RuntimeError(f'loopback port {port} is not free: {e}')
children=[]
def stop(sig,frame):raise SystemExit(128+sig)
for sig in [signal.SIGTERM,signal.SIGINT]:signal.signal(sig,stop)
def launch(role,args,env=None,cwd=None):
 log=open(run/(role+'.log'),'wb')
 # [DX-N1] Why: remove inherited background policy explicitly; no QoS clamp or core pin. Rejected: taskpolicy -b.
 p=subprocess.Popen(['/usr/sbin/taskpolicy','-d','default','-t','0','-l','0',*map(str,args)],env=env,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
 children.append(p)
 time.sleep(.2)
 subprocess.run(['/usr/sbin/taskpolicy','-B','-p',str(p.pid)],check=True,stdout=log,stderr=log)
 ident=identity(p.pid);assert ident is not None,role+' died at launch'
 r=dict(pid=p.pid,identity=ident,role=role)
 (run/(role+'.pid.json')).write_text(json.dumps(r))
 (run/(role+'.pid')).write_text(str(p.pid)+'\n')
 return p

def command(args):
 return subprocess.run(list(map(str,args)),check=True,capture_output=True,text=True).stdout

def waitfor(fn,seconds=180):
 for _ in range(seconds):
  for c in children:
   if c.poll() is not None:raise RuntimeError('engine exited: '+str(c.args))
  try:
   value=fn()
   if value:return value
  except (OSError,ValueError,subprocess.CalledProcessError):pass
  time.sleep(1)
 raise RuntimeError('startup timed out')

try:
 src=run/'gateway';shutil.copytree(REPO/'packages/datomic/gateway',src)
 shutil.copy(REPO/'packages/datomic/src/codec-spec.json',src/'codec-spec.json')
 hashes=lambda:{str(p.relative_to(src)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(src.rglob('*')) if p.is_file()}
 original=hashes(); main=src/'src/triplex/gateway/main.clj'; text=main.read_text()
 old='{:port 8080 :host "0.0.0.0"';assert text.count(old)==1
 main.write_text(text.replace(old,'{:port (Integer/parseInt (System/getenv "DX_NATIVE_GATEWAY_PORT")) :host "127.0.0.1"'))
 adapted=hashes(); gh=hashlib.sha256(json.dumps(adapted,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 (run/'gateway-files.json').write_text(json.dumps(dict(original=original,native=adapted,nativeHash=gh),indent=2))
 (run/'tx-data').mkdir(); (run/'socket').mkdir()
 command([pg/'initdb','-D',run/'pg-data','-U','postgres','--auth=trust','--no-locale','--encoding=UTF8'])
 pgargs=[pg/'postgres','-D',run/'pg-data','-h','127.0.0.1','-p',str(base),'-k',run/'socket','-c','shared_buffers=512MB','-c','max_wal_size=8GB','-c','checkpoint_timeout=30min','-c','wal_buffers=64MB','-c','fsync=on','-c','synchronous_commit=on','-c','full_page_writes=on']
 if variant!='default':pgargs+=['-c','wal_sync_method='+variant]
 launch('pg',pgargs)
 waitfor(lambda:subprocess.run([str(pg/'pg_isready'),'-h','127.0.0.1','-p',str(base)],capture_output=True).returncode==0)
 sql=[pg/'psql','-h','127.0.0.1','-p',str(base),'-U','postgres','-v','ON_ERROR_STOP=1']
 for name in ['postgres-db.sql','postgres-table.sql','postgres-user.sql']:
  out=command(sql+['-d','datomic' if name=='postgres-table.sql' else 'postgres','-f',datomic/'bin/sql'/name]);(run/(name+'.log')).write_text(out)
 settings=dict(protocol='sql',host='127.0.0.1',**{'alt-host':'127.0.0.1','port':str(base+1),'sql-url':f'jdbc:postgresql://127.0.0.1:{base}/datomic','sql-user':'datomic','sql-password':'datomic','memory-index-threshold':'256m','memory-index-max':'1g','object-cache-max':'1g','data-dir':str(run/'tx-data'),'log-dir':str(run),'pid-file':str(run/'transactor-vendor.pid')})
 template=(datomic/'config/samples/sql-transactor-template.properties').read_text()
 props='\n'.join(l for l in template.splitlines() if l.partition('=')[0].strip() not in settings)+'\n'+'\n'.join(k+'='+v for k,v in settings.items())+'\n'
 (run/'sql.properties').write_text(props)
 cp=f'{datomic}/resources:{datomic}/*:{datomic}/lib/*:{datomic}/samples/clj:{datomic}/bin:{src}/src'
 launch('tx',[java,'-server','-Xms256m','-Xmx3g','-cp',cp,'clojure.main','--main','datomic.launcher',run/'sql.properties'],cwd=run)
 uri=f'datomic:sql://{{db}}?jdbc:postgresql://127.0.0.1:{base}/datomic?user=datomic&password=datomic'
 for role,port in [('gw-w',base+3),('gw-r',base+4)]:
  env={**os.environ,'DATOMIC_URI_TEMPLATE':uri,'GATEWAY_SOURCE_SHA256':gh,'DX_NATIVE_GATEWAY_PORT':str(port)}
  launch(role,[java,'-server','-Xms1g','-Xmx2g','-XX:+UseG1GC','-XX:MaxGCPauseMillis=25','-Ddatomic.objectCacheMax=1g','-cp',cp,'clojure.main','-i',datomic/'bin/bridge.clj','-m','triplex.gateway.main'],env=env,cwd=run)
  def health():
   with urllib.request.urlopen(f'http://127.0.0.1:{port}/health',timeout=3) as r:return json.load(r)
  h=waitfor(health);assert h['gatewaySourceHash']==gh
  (run/(role+'-health.json')).write_text(json.dumps(h))
 durability=json.loads(command(sql+['-d','datomic','-Atc',"SELECT json_build_object('fsync',current_setting('fsync'),'synchronous_commit',current_setting('synchronous_commit'),'wal_sync_method',current_setting('wal_sync_method'),'full_page_writes',current_setting('full_page_writes'))"]))
 assert all(durability[k]=='on' for k in ['fsync','synchronous_commit','full_page_writes'])
 (run/'durability.json').write_text(json.dumps(durability,indent=2))
 (run/'policy.txt').write_text(command(['ps','-o','pid,ppid,stat,ni,flags,command','-p',','.join(str(c.pid) for c in children)]))
 ready=dict(prefix=prefix,variant=variant,keepAwake=False,writeUrl=f'http://127.0.0.1:{base+3}',readUrl=f'http://127.0.0.1:{base+4}',gatewaySourceHash=gh,durability=durability,cpuDenominator='used process CPU cores; no quota',pids={r:json.loads((run/(r+'.pid.json')).read_text()) for r in ['pg','tx','gw-w','gw-r']})
 (run/'ready.json').write_text(json.dumps(ready,indent=2));print(json.dumps(ready),flush=True)
 while True:
  for c in children:
   if c.poll() is not None:raise RuntimeError('engine exited')
  time.sleep(1)
finally:
 # Reap direct children before down's identity checks, avoiding zombies in standalone supervision.
 for c in reversed(children):
  if c.poll() is None:c.send_signal(signal.SIGINT if c==children[0] else signal.SIGTERM)
 for c in children:
  try:c.wait(timeout=40)
  except subprocess.TimeoutExpired:raise RuntimeError('cleanup refused: engine still alive')
 down(os.environ.get('DX_NATIVE_KEEP')=='1')
