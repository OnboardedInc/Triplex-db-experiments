#!/usr/bin/env python3
# [EXP-OBS01] Why: QLever source probes retain the actual operation log and a scanner positive control.
# Rejected: treating a plaintext grep miss in compressed vocabulary as erasure success.
import importlib.util
import json
from pathlib import Path
import socket
import subprocess
import sys
import time
root=Path(__file__).resolve().parents[2];run=sys.argv[1];directory=Path(sys.argv[2]);retained=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')/run
spec=importlib.util.spec_from_file_location('q',Path(__file__).with_name('probe_qlever.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q);q.PORT=7073
anchor=json.loads((retained/'output/bundle/bundle.json').read_bytes())['collector']['startedAtMono']
clock=socket.create_connection(('127.0.0.1',17073),timeout=2)
def vm_now():
 clock.sendall(b'probe-q2');data=b''
 while len(data)<16:
  chunk=clock.recv(16-len(data))
  if not chunk:raise ValueError('clock EOF')
  data+=chunk
 return int.from_bytes(data[8:],'big')/1e6

def wait_offset(ms):
 while True:
  delta=anchor+ms-vm_now()
  if delta<=0:return
  time.sleep(min(delta/1000,.1))

def save(name,value):(directory/(name+'.json')).write_text(json.dumps(value,indent=2)+'\n')
marker='obs01-q2-canary-vocabulary-control-d726ee8dd64e8a105e9d324f04ac'
seed=q.request('POST','/',f'INSERT DATA {{ <urn:obs01:canary> <urn:obs01:value> "{marker}" }}',{'Content-Type':'application/sparql-update','Query-Id':'canary-seed'})
save('canary-seed',seed)
# The existing P6 driver supplies a bounded Cartesian workload and actual masked WebSocket cancel.
triples=' '.join(f'<urn:obs01:s{i}> <urn:obs01:p> {i} .' for i in range(180))
q.request('POST','/',f'INSERT DATA {{ {triples} }}',{'Content-Type':'application/sparql-update','Query-Id':'seed'})
wait_offset(5200)
# An absolute IRI keeps QLever's parser independent of a BASE setting.
control=q.request('GET','/?query=SELECT%20%3Fn%20WHERE%20%7B%20%3Fs%20%3Curn:obs01:p%3E%20%3Fn%20%7D%20LIMIT%201',headers={'Query-Id':'read-control'})
save('read-control',control)
wait_offset(6100)
cancel_result=q.cancellation(directory);save('cancel-summary',cancel_result)
compare=subprocess.run(['node','lab/observer/compare_clocks.mjs','17073',str(directory/'clock-comparison.json')],cwd=root,capture_output=True,text=True,timeout=10)
(directory/'clock-comparison.log').write_text(compare.stdout+compare.stderr)
wait_offset(10200)
rebuild=q.request('GET','/?cmd=rebuild-index');save('rebuild',rebuild)
readback=q.request('GET','/?query=SELECT%20%3Fv%20WHERE%20%7B%20%3Curn:obs01:canary%3E%20%3Curn:obs01:value%3E%20%3Fv%20%7D');save('canary-readback',readback)
scan=subprocess.run(['node','lab/bin/engine.mjs','observer-command','--lane','qlever','--slot','s3','--holder','CX-OBS01-R2','--action','scan','--canary',marker],cwd=root,capture_output=True,text=True,timeout=30)
(directory/'scan.log').write_text(scan.stdout+scan.stderr)
if scan.returncode:raise ValueError('scan failed')
wait_offset(12500);clock.close()
print(json.dumps({'P1':'metrics captured','P6':'see actual query/log outcome','P7':'literal control; compressed vocabulary can remain blind','run':run}))
