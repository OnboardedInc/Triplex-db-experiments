# [EXP-OBS01] Why: only host tooling can place commands on the observer's private mount.
# Rejected: a SUT-accessible HTTP endpoint that can inject scan/readback records.
import base64
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import re
import time

spec=importlib.util.spec_from_file_location('pgclient',Path(__file__).with_name('pgclient.py'))
pgclient=importlib.util.module_from_spec(spec);spec.loader.exec_module(pgclient)

def execute(command,lane):
    action=command['action']
    if action=='finish-block' and lane=='xtdb':
        conn=http.client.HTTPConnection('127.0.0.1',8080,timeout=15)
        try:
            conn.request('POST','/system/finish-block');response=conn.getresponse();body=response.read()
            if response.status!=200:raise ValueError('finish-block failed')
            return 'X2-probes',{'event':'finish-block','status':response.status,'body':base64.b64encode(body).decode()}
        finally:conn.close()
    if action=='scan':
        marker=command['canary'].encode('utf8')
        if not 4<=len(marker)<=256:raise ValueError('canary must be 4..256 bytes')
        records=[]
        for p in sorted(Path('/engine').rglob('*')):
            if p.is_symlink() or not p.is_file():continue
            hits=0;total=0;digest=hashlib.sha256();carry=b''
            with p.open('rb') as file:
                while True:
                    chunk=file.read(1024*1024)
                    if not chunk:break
                    total+=len(chunk);digest.update(chunk);data=carry+chunk;hits+=data.count(marker);carry=data[-(len(marker)-1):]
                    if total>1024*1024*1024:raise ValueError('per-file scan limit reached')
            records.append({'location':str(p),'bytes':total,'sha256':digest.hexdigest(),'hits':hits})
        return 'H6-scans',{'event':'scan','scanMethod':'literal-byte-scan/1','canary':command['canary'],'tFound':time.monotonic_ns()/1e6,'files':records}
    if action=='count' and lane=='xtdb':
        relation=command['relation']
        if not re.fullmatch('[a-zA-Z_][a-zA-Z0-9_]*',relation):raise ValueError('unsafe relation')
        pg=pgclient.Pg(5432)
        try:
            pg.query('BEGIN READ ONLY');pg.query('SELECT COUNT(*) AS n FROM '+relation);pg.query('ROLLBACK');pg.close()
            return 'X4-queries',{'event':'query','relation':relation,'label':command['label'],'client':base64.b64encode(pg.sent).decode(),'engine':base64.b64encode(pg.received).decode()}
        finally:pg.sock.close()
    raise ValueError('unsupported observer command')
