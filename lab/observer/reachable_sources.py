# [EXP-OBS01] Why: collect reachable sources independently of whether a whole protocol can pass.
# Rejected: declaring all sources blocked because one trace is disabled, or promoting global snapshots to attributed work.
import base64
import hashlib
from pathlib import Path
import time
import importlib.util
from decimal import Decimal

def file_inventory(root='/engine'):
    result=[]
    for p in sorted(Path(root).rglob('*')):
        st=p.lstat()
        result.append({'path':str(p),'size':st.st_size,'blocks':st.st_blocks,'inode':st.st_ino,'device':st.st_dev,'mtimeNs':st.st_mtime_ns,'symlink':p.is_symlink()})
        if len(result)>30000:raise ValueError('inventory bound exceeded; coverage incomplete')
    return result

def collect(stage,case,append,session,http,cgroup):
    latest=None
    def save(name,value,roots=()):
        event={'event':'reachable-source','name':name,'stage':stage,'tMono':time.monotonic_ns()/1e6,'value':value}
        append('H8',event) if case['protocol']=='OBS-WATERMARK' else None
        append('R5',event)
        for root in roots:append(root,event)
    protocol=case['protocol'][4:]
    if stage=='before':
        save('engine-process',{'stat':base64.b64encode(Path('/proc/1/stat').read_bytes()).decode(),'cmdline':base64.b64encode(Path('/proc/1/cmdline').read_bytes()).decode(),'cgroup':Path('/proc/1/cgroup').read_text()})
        save('trace-log-availability',{'observerLogPresent':Path('/engine/observer-engine.log').exists(),'tcp':Path('/proc/net/tcp').read_text(),'tcp6':Path('/proc/net/tcp6').read_text()})
        for name in ('/etc/xtdb/config.yaml','/etc/xtdb/log4j2.xml'):
            p=Path('/proc/1/root'+name)
            try:
                with p.open('rb') as f:raw=f.read(1024*1024+1)
                if len(raw)>1024*1024:raise ValueError('config read bound exceeded')
                save('engine-config:'+name,{'bytes':base64.b64encode(raw).decode(),'sha256':hashlib.sha256(raw).hexdigest()})
            except OSError as e:save('engine-config:'+name,{'unavailable':str(e)})
    if protocol in ('NO-MUTATION','AVAILABILITY','MAINTENANCE','CANCEL','WORK'):
        for root,url in [('X1','http://127.0.0.1:8080/metrics'),('X2','http://127.0.0.1:8080/healthz/alive')]:
            try:
                raw=http(url);append(root,{'event':'health-http','response':base64.b64encode(raw).decode()} if root=='X2' else raw);save(root,{'status':'response-retained','sha256':hashlib.sha256(raw).hexdigest(),'response':base64.b64encode(raw).decode()})
                if root=='X1':
                    s=importlib.util.spec_from_file_location('source_decoder',Path(__file__).with_name('normalize.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
                    values=[Decimal(x['value']) for x in m.decode(raw)['metrics'] if x['name']=='node_tx_latestProcessedMsgId' and 'db="xtdb"' in x['labels']]
                    if len(values)==1 and values[0].is_finite() and values[0]>=0 and values[0]==values[0].to_integral_value():latest=int(values[0])
            except Exception as e:save(root,{'status':'unreachable','error':str(e)})
    if protocol in ('WORK','MAINTENANCE','ACK-ORDER','FAULT-TRANSITIONS'):
        # [EXP-OBS01] Why: R30 Q4 documents a live-GC race that can permanently hang reads of deleted block files.
        # Rejected: guessing block indices or querying even a listed file without a stable clone/engine fix.
        tables=('xt.txs','xt.live_tables','xt.trie_stats') if protocol in ('WORK','MAINTENANCE') else ('xt.txs',)
        for table in tables:
            columns={'xt.txs':'_id, committed, system_time','xt.source_log_msgs':'msg_id, log_timestamp, msg_type'}.get(table,'*')
            session('system-'+stage+'-'+table.replace('.','-'),'SELECT '+columns+' FROM '+table+' LIMIT 4')
        if protocol in ('WORK','MAINTENANCE'):
            if latest is not None:session('system-'+stage+'-xt-source_log_msgs','SELECT msg_id, log_timestamp, msg_type FROM xt.source_log_msgs WHERE msg_id = '+str(latest)+' LIMIT 4')
            save('block-file-read-gap',{'reason':'R30 Q4: live block GC can remove a file after listing; missing-block loader hangs','neededChange':'stable read-only clone/snapshot or corrected engine loader; not attempted'})
    if protocol=='WORK':
        save('cgroup-io',{'owner':case['engineContainerId'],'cgroup':cgroup,'ioStat':Path('/sys/fs/cgroup'+cgroup+'/io.stat').read_text(),'attribution':'whole shared engine, not measured-operation work'},('H1',))
    if protocol in ('WORK','ERASURE-SCAN'):
        try:save('engine-files',{'files':file_inventory(),'coverage':'engine volume only; not host copies or freed blocks','attribution':'shared engine snapshot'},('H3',) if protocol=='WORK' else ('H6',))
        except Exception as e:save('engine-files',{'coverage':'incomplete','error':str(e)})

def positive_hits(case,append):
    # [EXP-OBS01] Why: positive bytes are useful even without a complete erasure inventory/publication.
    # Rejected: reporting absence after a bounded prefix/tail read or calling Arrow/FSST/freed blocks decoded.
    marker=case['runId'].encode();remaining=16*1024*1024;scanned=0;hits=[]
    for item in sorted(file_inventory(),key=lambda x:(0 if '/log/' in x['path'] else 1,-x['mtimeNs'])):
        p=Path(item['path'])
        if item['symlink'] or not p.is_file() or remaining<=0:continue
        size=item['size'];count=min(size,262144,remaining);offset=max(0,size-count)
        try:
            with p.open('rb') as f:f.seek(offset);raw=f.read(count)
        except OSError:continue
        remaining-=len(raw);scanned+=len(raw)
        at=raw.find(marker)
        if at>=0:
            chunk=raw[max(0,at-32):at+len(marker)+32]
            hits.append({'location':str(p),'offset':offset+max(0,at-32),'bytes':base64.b64encode(chunk).decode(),'fileSize':size})
    append('H6',{'event':'positive-hit-scan','canary':case['runId'],'tMono':time.monotonic_ns()/1e6,'bytesExamined':scanned,'hits':hits,'coverage':'bounded tails; positive hits only; no absence/erasure assertion'})
