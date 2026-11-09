#!/usr/bin/env python3
# [EXP-OBS01] Why: repeat identical native updates to isolate Q3 log cost with bracketed baselines.
# Rejected: treating this small trace as qualification of NS writer or SDK overhead.
import json
from pathlib import Path
import sys
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
port=int(sys.argv[1]);body=urlencode({'update':'INSERT DATA { <urn:obs01:overhead> <urn:n> 42 }'}).encode()
def update():
 with urlopen(Request('http://127.0.0.1:'+str(port),data=body),timeout=10) as response:return response.read()
for _ in range(30):update()
samples=[]
for _ in range(150):
 start=time.perf_counter_ns();update();samples.append((time.perf_counter_ns()-start)/1e6)
with urlopen('http://127.0.0.1:'+str(port)+'/?'+urlencode({'query':'SELECT (COUNT(*) AS ?n) WHERE { <urn:obs01:overhead> <urn:n> ?value }'}),timeout=10) as response:readback=response.read().decode()
values=sorted(samples);result={'trace':'same native single-triple update, 30 warmup, 150 measured','latenciesMs':samples,'p50':values[74],'p99':values[148],'readback':readback}
Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='latenciesMs'}))
