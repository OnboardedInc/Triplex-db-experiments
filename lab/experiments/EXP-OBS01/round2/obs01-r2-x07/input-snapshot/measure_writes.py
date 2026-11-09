#!/usr/bin/env python3
# [EXP-OBS01] Why: use the same warmed native commit trace for each observer arm.
# Rejected: claiming this diagnostic single-row trace qualifies the frozen application workload.
import importlib.util
import json
from pathlib import Path
import sys
import time
spec=importlib.util.spec_from_file_location('pg',Path(__file__).with_name('pgclient.py'));pg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pg)
client=pg.Pg(int(sys.argv[1]));sql="/*obs:overhead*/ INSERT INTO obs01_overhead (_id,n) VALUES ('fixed-trace',42)"
try:
 for _ in range(30):client.query(sql)
 samples=[]
 for _ in range(150):
  start=time.perf_counter_ns();client.query(sql);samples.append((time.perf_counter_ns()-start)/1e6)
 count=client.query('SELECT COUNT(*) AS n FROM obs01_overhead')
 values=sorted(samples);result={'trace':'same single-row native SQL commit repeated; 30 warmup, 150 measured','latenciesMs':samples,'p50':values[74],'p99':values[148],'countReadback':count}
 Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='latenciesMs'}))
finally:client.close()
