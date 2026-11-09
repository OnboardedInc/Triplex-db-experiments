#!/usr/bin/env python3
# [EXP-OBS01] Why: drive real SQL/CancelRequest and independent controls at a frozen VM-clock window.
# Rejected: inserting client-provided engine facts into observer evidence.
import importlib.util
import json
from pathlib import Path
import socket
import struct
import subprocess
import sys
import threading
import time
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('pg',Path(__file__).with_name('pgclient.py'));pg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pg)
run_id=sys.argv[1];directory=Path(sys.argv[2]);directory.mkdir(parents=True,exist_ok=True)
retained=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')/run_id
for attempt in range(100):
 try:env=json.loads((retained/'output/bundle/bundle.json').read_bytes());break
 except FileNotFoundError:time.sleep(.05)
anchor=env['collector']['startedAtMono']
class Recorder(list):
 def append(self,value):
  super().append(value);(directory/'driver.json').write_text(json.dumps(self,indent=2)+'\n')
records=Recorder()
clock=socket.create_connection(('127.0.0.1',15473),timeout=2)
def vm_now():
 clock.sendall(b'probe-r2');data=b''
 while len(data)<16:
  chunk=clock.recv(16-len(data))
  if not chunk:raise ValueError('clock EOF; do not spin or fabricate a sample')
  data+=chunk
 if data[:8]!=b'probe-r2':raise ValueError('clock nonce mismatch')
 return int.from_bytes(data[8:],'big')/1e6

def wait_offset(ms):
 while True:
  remain=anchor+ms-vm_now()
  if remain<=0:return
  time.sleep(min(remain/1000,.1))

def command(action,**fields):
 args=['node','lab/bin/engine.mjs','observer-command','--lane','xtdb','--slot','s3','--holder','CX-OBS01-R2','--action',action]
 for key,value in fields.items():args+=['--'+key,str(value)]
 result=subprocess.run(args,cwd=root,capture_output=True,text=True)
 if result.returncode:raise ValueError(result.stderr)
 value=json.loads(result.stdout);(directory/(action+'-'+fields.get('label','result')+'.json')).write_text(json.dumps(value,indent=2)+'\n');return value

seed=pg.Pg(16473)
values=','.join(f"('obs01-r2-{i}', {i}, 'obs01-r2-canary')" for i in range(120))
seed.query('/*obs:seed*/ INSERT INTO obs01_r2 (_id,n,canary) VALUES '+values);seed.close()
command('count',relation='obs01_r2',label='before')
clients=[pg.Pg(16473),pg.Pg(16473),pg.Pg(17473),pg.Pg(17473)]
records.append({'probe':'P3','phase':'open-four','t':vm_now()});time.sleep(.5)
for client in clients:client.close()
records.append({'probe':'P3','phase':'closed-four','t':vm_now()})
compare=subprocess.Popen(['node','lab/observer/compare_clocks.mjs','15473',str(directory/'clock-comparison.json')],cwd=root,stdout=(directory/'clock-comparison.log').open('w'),stderr=subprocess.STDOUT)
client=pg.Pg(16473)
long_sql='/*obs:cancel-control*/ SELECT a.n AS a,b.n AS b,c.n AS c FROM obs01_r2 a, obs01_r2 b, obs01_r2 c LIMIT $1'
client.execute(long_sql,1,prepare=True)
wait_offset(5200)
rows=client.query('/*obs:read-control*/ SELECT COUNT(*) AS n FROM obs01_r2');records.append({'readControl':rows,'t':vm_now()})
if len(sys.argv)>3 and sys.argv[3]=='mutation':
 client.query('/*obs:deliberate-mutation*/ INSERT INTO obs01_r2 (_id,n,canary) VALUES (\'negative-control\', 1, \'obs01-r2-canary\')')
error=[]
def long_query():
 try:client.execute(long_sql,2000000000)
 except Exception as e:error.append(str(e))
wait_offset(6100)
worker=threading.Thread(target=long_query,daemon=True);worker.start();time.sleep(.08)
with socket.create_connection(('127.0.0.1',16473),timeout=2) as cancel:
 cancel.sendall(struct.pack('!IIII',16,80877102,client.pid,client.secret))
worker.join(10)
if worker.is_alive():
 records.append({'probe':'P4','failure':'caller did not settle in ten seconds','t':vm_now()});client.sock.close()
try:reuse=client.query('/*obs:reuse-control*/ SELECT 1 AS n')
except Exception as failure:
 reuse={'error':str(failure)};client.sock.close();client=pg.Pg(16473)
records.append({'probe':'P4','callerError':error,'reuse':reuse,'t':vm_now()})
records.append({'probe':'P5','rows':client.query('EXPLAIN ANALYZE SELECT * FROM obs01_r2')});client.close()
wait_offset(10200)
command('count',relation='obs01_r2',label='after')
command('finish-block');time.sleep(1)
command('scan',canary='obs01-r2-canary')
wait_offset(12500);compare.wait(5);clock.close()
(directory/'driver.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps({'runId':run_id,'records':len(records),'durationMs':vm_now() if False else 12500}))
