#!/usr/bin/env python3
# [EXP-OBS01] Why: inspect unchanged residents from an engine-managed sidecar with isolated output/key.
# Rejected: obtaining observer records from adapter code or changing a resident to enable unavailable sources.
import base64
import importlib.util
import json
import os
import signal
from pathlib import Path
import subprocess
import socket
import struct
import threading
import sys
import time
import uuid

def load(name):
 spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
c=load('collector');pg=load('pgclient');reachable=load('reachable_sources')
signal.alarm(60)
config=json.loads(Path('/config.json').read_bytes());bundle=c.Bundle('/obs/bundle',config,Path('/run/key').read_bytes());protocol=config['case']['protocol'].removeprefix('OBS-');case=config['case'];streams={s['sourceId'].split('.')[0]:s['streamId'] for s in config['streams'] if s['streamId']!='R5-context'}
if any(s['streamId']=='R5-context' for s in config['streams']):streams['R5']='R5-context'
engine_cg=next(x[3:] for x in Path('/proc/1/cgroup').read_text().splitlines() if x.startswith('0::'))
if config['sut']['engineContainerId'] not in engine_cg:raise ValueError('resident cgroup identity mismatch')
observer_cg=next(x[3:] for x in Path('/proc/self/cgroup').read_text().splitlines() if x.startswith('0::'))
bundle.envelope['collector']['cgroupPath']='/sys/fs/cgroup'+observer_cg
bundle.envelope['collector']['containerId']=observer_cg.rsplit('/',1)[-1].removeprefix('docker-').removesuffix('.scope')
errors=[]
def append(root,value):
 if root in streams:bundle.append(streams[root],c.canonical(value) if not isinstance(value,bytes) else value,c.mono(),time.time_ns()/1e6)
def session(phase,sql):
 cid=uuid.uuid4().hex;start=c.mono();error=None
 wire=[{'event':'open','connectionId':cid,'enginePort':5432,'tMono':start}]
 def capture(direction,data):wire.append({'event':'data','connectionId':cid,'direction':direction,'data':base64.b64encode(data).decode(),'tMono':c.mono()})
 p=pg.Pg(5432,wire_callback=capture)
 rows=[]
 try:rows=p.query(sql)
 except Exception as e:error=str(e)
 try:p.close()
 except OSError:pass
 wire.append({'event':'close','connectionId':cid,'tMono':c.mono()})
 value={'event':'native-session','phase':phase,'observationId':cid,'wire':wire}
 for root in ('X4','X8','T1','HR'):append(root,value)
 if phase.startswith(('system-','publication-','fault-position-')):append('X3',value)
 append('R5',value)
 if error:errors.append({'phase':phase,'error':error})
 return rows
def sockets():
 append('H4',{'event':'sockets','files':{name:base64.b64encode(Path('/proc/net/'+name).read_bytes()).decode() for name in ('tcp','tcp6')}})
def lifecycle():
 if 'H8' not in streams:return
 text=Path('/proc/1/stat').read_text();starttime=int(text[text.rfind(')')+2:].split()[19])
 counters=dict(line.split() for line in Path('/sys/fs/cgroup'+engine_cg+'/memory.events').read_text().splitlines())
 append('H8',{'event':'lifecycle','tMono':c.mono(),'starttime':starttime,'oomKill':int(counters['oom_kill'])})
def metric():
 try:append('X1',c.http_raw('http://127.0.0.1:8080/metrics'))
 except Exception as e:append('X1',{'event':'source-unavailable','reason':str(e)})
for root in streams:append(root,{'event':'start','tMono':c.mono()})
# VM-local evaluator clock reference: a separate interpreter is bracketed in the same kernel domain.
# The real interval includes process startup; its measured uncertainty is declared, never zero-filled.
send=c.mono();answer=subprocess.check_output([sys.executable,'-I','-B','-c','import time;print(time.monotonic_ns()/1e6)']);receive=c.mono()
bridge={'send':send,'receive':receive,'observerMono':float(answer)}
c.atomic(bundle.root/'clock/bridge.jsonl',c.canonical(bridge)+b'\n')
uncertainty=(receive-send)/2
bundle.envelope['clock']['maxUncertaintyMs']=uncertainty;c.atomic(bundle.root/'bundle.json',c.canonical(bundle.envelope)+b'\n')
relation=case['relation']
lifecycle()
if 'H6' in streams:
 marker=Path('/engine/log/LOG')
 if marker.is_file():
  with marker.open('rb') as fp:prefix=fp.read(65536)
  append('H6',{'event':'file-bytes','location':str(marker),'phase':'baseline','tMono':c.mono(),'truncated':marker.stat().st_size>len(prefix),'bytes':base64.b64encode(prefix).decode()})
try:
 if case.get('round')==5:reachable.collect('before',case,append,session,c.http_raw,engine_cg)
 if protocol=='NO-MUTATION':metric();time.sleep(.05);session('read-control','SELECT 1 AS n');time.sleep(.05);metric()
 elif protocol=='PREABORT':session('read-control','SELECT 1 AS n')
 elif protocol=='CONNECTIONS':
  # [EXP-OBS01] Why: adjacent observations need measured clock margin, even when a connection opens quickly.
  # Rejected: reducing uncertainty or sorting overlapping intervals to manufacture a definite order.
  gap=max(.1,(2*uncertainty+10)/1000)
  sockets();p=pg.Pg(5432);time.sleep(gap);sockets();p.close();append('H4',{'event':'pool-close','tMono':c.mono()});time.sleep(gap);sockets();time.sleep(gap);sockets()
 elif protocol=='RESOURCE':
  cg=next(x[3:] for x in Path('/proc/1/cgroup').read_text().splitlines() if x.startswith('0::'))
  source={'reader':'resource','endpoint':'/sys/fs/cgroup'+cg,'owner':config['sut']['engineContainerId']}
  for _ in range(3):append('H1',c.read_source(source));time.sleep(.05)
 elif protocol=='AVAILABILITY':
  session('availability-failure',"SELECT CAST('not-a-number' AS BIGINT) AS n")
  time.sleep(.1);session('availability-write',"INSERT INTO "+relation+" (_id,n) VALUES ('availability',1)");time.sleep(.1);session('availability-read',('SELECT n FROM '+relation+" WHERE _id='availability'") if case.get('round')==5 else 'SELECT COUNT(*) AS n FROM '+relation)
 elif protocol=='CANCEL':
  session('seed',"INSERT INTO "+relation+" (_id,n) VALUES "+','.join("('cancel-"+str(i)+"',"+str(i)+")" for i in range(32)))
  cid=uuid.uuid4().hex;wire=[{'event':'open','connectionId':cid,'enginePort':5432,'tMono':c.mono()}]
  def capture(direction,data):wire.append({'event':'data','connectionId':cid,'direction':direction,'data':base64.b64encode(data).decode(),'tMono':c.mono()})
  target=pg.Pg(5432,wire_callback=capture)
  def query():
   # [EXP-OBS01] Why: bounded aggregate work permits cancellation without retaining thousands of row-message events.
   # Rejected: large streamed result capture (sidecar memory amplification) or an unbounded cross product.
   sql='/*obs:'+case['requestId']+'*/ SELECT '+('SUM(a.n+b.n+c.n+d.n) AS total FROM '+','.join(relation+' '+a for a in 'abcd') if case.get('round')==5 else 'a.n AS a,b.n AS b,c.n AS c FROM '+relation+' a,'+relation+' b,'+relation+' c LIMIT 256')
   try:target.query(sql)
   except Exception as e:errors.append({'phase':'cancel-target','error':str(e)})
  thread=threading.Thread(target=query,daemon=True);thread.start();time.sleep(.1 if case.get('round')==5 else .05)
  cancel_id=uuid.uuid4().hex;packet=struct.pack('!IIII',16,80877102,target.pid,target.secret);t=c.mono()
  with socket.create_connection(('127.0.0.1',5432),timeout=3) as connection:connection.sendall(packet)
  cancel_wire=[{'event':'open','connectionId':cancel_id,'enginePort':5432,'tMono':t},{'event':'data','connectionId':cancel_id,'direction':'client','data':base64.b64encode(packet).decode(),'tMono':t},{'event':'close','connectionId':cancel_id,'tMono':c.mono()}]
  # Both connections must be decoded together for the native backend PID correlation.
  thread.join(12)
  if thread.is_alive():target.sock.close();thread.join(2)
  else:
   try:target.query('/*obs:'+case['reuseQueryId']+'*/ SELECT 1 AS n')
   except Exception as e:errors.append({'phase':'cancel-reuse','error':str(e)})
  try:target.close()
  except (OSError,ValueError):pass
  wire.append({'event':'close','connectionId':cid,'tMono':c.mono()})
  append('T1',{'event':'native-session','phase':'cancel','observationId':cid,'wire':wire+cancel_wire})
 elif protocol=='FAULT-TRANSITIONS':
  # Crash only a disposable observer client after a real commit; the shared engine is never signalled.
  child_code="import sys,json,time,base64;sys.path.insert(0,'/collector');from pgclient import Pg;w=[];p=Pg(5432,wire_callback=lambda d,b:w.append({'event':'data','connectionId':'fault-client','direction':d,'tMono':time.monotonic_ns()/1e6,'data':base64.b64encode(b).decode()}));p.query(sys.argv[1]);print(json.dumps(w),flush=True);time.sleep(60)"
  sql="INSERT INTO "+relation+" (_id,operation_id,n) VALUES ('fault','"+case['operationId']+"',1)"
  child=subprocess.Popen([sys.executable,'-I','-B','-c',child_code,sql],stdout=subprocess.PIPE,text=True)
  raw=child.stdout.readline()
  if not raw:raise ValueError('fault client failed before committing')
  wire=[{'event':'open','connectionId':'fault-client','enginePort':5432,'tMono':c.mono()}]+json.loads(raw)
  join_sql="SELECT m.operation_id, m.n, m._system_from AS marker_time, t._id AS position, t.system_time, t.committed FROM "+relation+" m JOIN xt.txs t ON m._system_from = t.system_time WHERE m._id = 'fault'"
  if case.get('round')==5:session('fault-position-before',join_sql);time.sleep(max(.1,(2*uncertainty+10)/1000))
  child.kill();child.wait(timeout=5);t=c.mono();wire.append({'event':'close','connectionId':'fault-client','tMono':t})
  append('X4',{'event':'native-session','phase':'commit','observationId':'fault-client','wire':wire});append('X4',{'event':'process-event','kind':'client-crash','tMono':t,'pid':child.pid,'returncode':child.returncode})
  time.sleep(max(.1,(2*uncertainty+10)/1000));session('fault-readback',join_sql if case.get('round')==5 else 'SELECT operation_id,n FROM '+relation+" WHERE _id='fault'")
 elif protocol=='ACK-ORDER' and case.get('round')==5:
  session('commit',"INSERT INTO "+relation+" (_id,operation_id,n) VALUES ('ack','"+case['operationId']+"',1)")
  session('publication-readback',"SELECT m.operation_id, m.n, m._system_from AS marker_time, t._id AS position, t.system_time, t.committed FROM "+relation+" m JOIN xt.txs t ON m._system_from = t.system_time WHERE m._id = 'ack'")
 elif protocol=='ERASURE-SCAN' and case.get('round')==5:
  session('canary-write',"INSERT INTO "+relation+" (_id,canary) VALUES ('control','"+case['runId']+"')")
  session('canary-readback','SELECT canary FROM '+relation+" WHERE _id='control'");reachable.positive_hits(case,append)
 elif protocol=='SCRATCH':
  session('seed',"INSERT INTO "+relation+" (_id,n) VALUES ('scratch',1)");session('count-before','SELECT COUNT(*) AS n FROM '+relation);time.sleep(.05);session('count-after','SELECT COUNT(*) AS n FROM '+relation)
 elif protocol=='SCALE-COUNT':
  # A tiny ledger retains active and retired domain/presence/type versions and real command/release markers.
  records=[];n=case['population']['n']
  for i in range(n):
   for kind in ('domain','presence','type'):records.append({'_id':kind+str(i),'subject':i,'kind':kind,'active':True})
  for kind in ('domain','type'):records.append({'_id':'old-'+kind,'subject':0,'kind':kind,'active':False})
  for j in range(2):records.append({'_id':'old-presence'+str(j),'subject':0,'kind':'presence','active':False})
  for i in range(4):records.append({'_id':'command'+str(i),'subject':i,'kind':'command','active':True})
  for i in range(2):records.append({'_id':'release'+str(i),'subject':i,'kind':'release','active':True})
  sql='INSERT INTO '+relation+' RECORDS '+','.join('{'+', '.join(k+': '+(str(v).lower() if type(v) in (int,bool) else "'"+v+"'") for k,v in r.items())+'}' for r in records)
  session('seed',sql)
  columns={'configuredEntitiesLatest':"COUNT(DISTINCT CASE WHEN active AND kind='presence' THEN subject END)",'distinctDomainSubjects':"COUNT(DISTINCT CASE WHEN active AND kind='domain' THEN subject END)",
   'activeDomainFacts':"SUM(CASE WHEN active AND kind='domain' THEN 1 ELSE 0 END)",'activePresenceFacts':"SUM(CASE WHEN active AND kind='presence' THEN 1 ELSE 0 END)",'activeTypeVersionFacts':"SUM(CASE WHEN active AND kind='type' THEN 1 ELSE 0 END)",
   'activeFixtureFacts':"SUM(CASE WHEN active AND kind IN ('domain','presence','type') THEN 1 ELSE 0 END)",'domainAssertionVersions':"SUM(CASE WHEN kind='domain' THEN 1 ELSE 0 END)",'presenceAssertionVersions':"SUM(CASE WHEN kind='presence' THEN 1 ELSE 0 END)",'typeVersionAssertionVersions':"SUM(CASE WHEN kind='type' THEN 1 ELSE 0 END)",
   'allFixtureAssertionVersions':"SUM(CASE WHEN kind IN ('domain','presence','type') THEN 1 ELSE 0 END)",'fixtureRetirements':"SUM(CASE WHEN NOT active THEN 1 ELSE 0 END)",'correctionEntities':"COUNT(DISTINCT CASE WHEN NOT active AND kind='domain' THEN subject END)",'presenceCycleEntities':"COUNT(DISTINCT CASE WHEN NOT active AND kind='presence' THEN subject END)",
   'configuredEntitiesDuringPresenceOff':"COUNT(DISTINCT CASE WHEN active AND kind='presence' THEN subject END)-COUNT(DISTINCT CASE WHEN NOT active AND kind='presence' THEN subject END)",'schemaReleaseCalls':"SUM(CASE WHEN kind='release' THEN 1 ELSE 0 END)",'configFacts':'NULL','receiptJournalClaimMetadata':'NULL','domainCommands':"SUM(CASE WHEN kind='command' THEN 1 ELSE 0 END)"}
  session('analytic-count','SELECT '+','.join(expr+' AS "'+name+'"' for name,expr in columns.items())+' FROM '+relation)
 elif protocol=='WORK':
  session('seed',"INSERT INTO "+relation+" (_id,n) VALUES ('work',1)")
  session('work-comparison','EXPLAIN ANALYZE SELECT * FROM '+relation);session('work-candidate','EXPLAIN ANALYZE SELECT n FROM '+relation)
 elif case.get('round')==5 and protocol=='MAINTENANCE':
  time.sleep(1)
 elif case.get('round')==5 and protocol=='WATERMARK':
  session('native-control','SELECT 1 AS n')
 else:
  # Read-only resident probes retain actual native facts without inventing composition or physical witnesses.
  session('native-control','SELECT 1 AS n')
  if 'X1' in streams:metric()
  for root in streams:append(root,{'event':'source-unavailable','reason':case['missingSource']})
 if case.get('round')==5:reachable.collect('after',case,append,session,c.http_raw,engine_cg)
except Exception as e:errors.append({'error':str(e)})
lifecycle()
for root in streams:append(root,{'event':'end','tMono':c.mono()})
engine_pids=[]
for p in c.processes():
 try:
  if config['sut']['engineContainerId'] in Path('/proc',str(p['pid']),'cgroup').read_text():engine_pids.append(p)
 except FileNotFoundError:pass
bundle.envelope['sut']['enginePids']=engine_pids;c.atomic(bundle.root/'bundle.json',c.canonical(bundle.envelope)+b'\n')
c.atomic(Path('/obs/probe-errors.json'),c.canonical(errors)+b'\n');bundle.seal()
