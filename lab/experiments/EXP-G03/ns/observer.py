# [EXP-G03-R5] Why: read publication and consumer frontiers independently on RO mounts. Rejected: candidate clocks or an inotify event as a publication timestamp.
import hashlib
import hmac
import json
import os
from pathlib import Path
import sqlite3
import time

cfg = json.loads(Path('/observer/config.json').read_text())
key = Path('/observer/key').read_bytes()
boot = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
offsets = Path('/proc/self/timens_offsets').read_text()
rows = [line.split() for line in offsets.splitlines()]
if len(rows) != 2 or {r[0] for r in rows} != {'monotonic', 'boottime'} or any(len(r) != 3 or int(r[1]) or int(r[2]) for r in rows):
    raise RuntimeError('observer clock offsets missing/nonzero')
domain = dict(bootId=boot, primitive='CLOCK_MONOTONIC', offsets=dict(monotonic=['0','0'],boottime=['0','0']))
end = time.monotonic()+60
connections = []
for store in ['/source/broker.db', '/consumer/consumer.db']:
    while True:
        try:
            c=sqlite3.connect('file:'+store+'?mode=ro',uri=True,isolation_level=None)
            c.execute('PRAGMA query_only=ON'); c.execute('SELECT lsn FROM marker').fetchone();connections.append(c);break
        except sqlite3.OperationalError:
            if time.monotonic()>end: raise
            time.sleep(.01)
Path('/out/ready.json').write_text(json.dumps(dict(runId=cfg['runId'],domain=domain)))
seq=0
head='0'*64
last=[None,None]
periods=[]
prior=None
with Path('/out/polls.ndjson').open('x') as output:
    while not Path('/control/stop').exists():
        t=time.monotonic_ns()
        if prior is not None: periods.append(t-prior)
        prior=t
        polls=[]
        for i,c in enumerate(connections) if cfg.get('active', True) else []:
            start=time.monotonic_ns();c.execute('BEGIN');lsn=c.execute('SELECT lsn FROM marker WHERE id=1').fetchone()[0];c.execute('COMMIT');finish=time.monotonic_ns()
            polls.append(dict(store=['source','consumer'][i],startNs=str(start),endNs=str(finish),lsn=lsn,previous=last[i]))
            last[i]=dict(startNs=str(start),endNs=str(finish),lsn=lsn)
        body=dict(schema='ns-observer/1',runId=cfg['runId'],sequence=seq,previous=head,domain=domain,polls=polls)
        raw=json.dumps(body,separators=(',',':'));head=hmac.new(key,raw.encode(),hashlib.sha256).hexdigest()
        output.write(json.dumps(dict(raw=raw,hmac=head))+'\n');seq+=1
        if seq%100==0: output.flush()
        time.sleep(max(0,(.00025 if cfg.get('active',True) else .05)-(time.monotonic_ns()-t)/1e9))
        if time.monotonic()>end: raise RuntimeError('observer stop timeout')
    output.flush();os.fdatasync(output.fileno())
final={}
for name,c in zip(['source','consumer'],connections):
    final[name]=dict(marker=c.execute('SELECT lsn FROM marker').fetchone()[0],subjects=c.execute('SELECT subject,value FROM subjects ORDER BY subject').fetchall(),entries=c.execute('SELECT position,subject,value FROM entries ORDER BY position').fetchall())
    c.close()
Path('/out/seal.json').write_text(json.dumps(dict(schema='ns-observer-seal/1',runId=cfg['runId'],chunks=seq,head=head,domain=domain,periodNs=periods,final=final)))
print(json.dumps(dict(runId=cfg['runId'],chunks=seq,head=head)))
