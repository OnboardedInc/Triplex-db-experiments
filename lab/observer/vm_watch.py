#!/usr/bin/env python3
"""Evaluator-owned Linux observer. Provision only with engine.mjs observer-vm-up."""
import argparse
import ctypes
import errno
import json
import os
from pathlib import Path
import queue
import select
import signal
import struct
import threading
import time
import vm_normalizer as n
from collector import Bundle


class Inotify:
    def __init__(self,paths):
        if not hasattr(os,'uname') or os.uname().sysname!='Linux':raise ValueError('inotify requires Linux')
        self.lib=ctypes.CDLL(None,use_errno=True)
        self.lib.inotify_init1.argtypes=[ctypes.c_int];self.lib.inotify_init1.restype=ctypes.c_int
        self.lib.inotify_add_watch.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_uint32];self.lib.inotify_add_watch.restype=ctypes.c_int
        self.fd=self.lib.inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
        if self.fd<0:raise OSError(ctypes.get_errno(),'inotify_init1')
        self.names={}
        try:
            for path in paths:
                descriptor=self.lib.inotify_add_watch(self.fd,os.fsencode(path),0x00000002|0x00000004|0x00000008|0x00000040|0x00000100|0x00000200|0x00000080|0x00000400|0x00000800)
                if descriptor<0:raise OSError(ctypes.get_errno(),'inotify_add_watch '+str(path))
                self.names[descriptor]=str(path)
        except BaseException:self.close();raise
    def read(self,timeout=.01):
        if not select.select([self.fd],[],[],timeout)[0]:return []
        try:data=os.read(self.fd,1024*1024)
        except BlockingIOError:return []
        result=[];offset=0
        while offset<len(data):
            descriptor,mask,cookie,length=struct.unpack_from('iIII',data,offset);offset+=16
            name=os.fsdecode(data[offset:offset+length].split(b'\0',1)[0]);offset+=length
            if mask&0x4000:raise ValueError('inotify overflow: NOT_ESTIMABLE')
            result.append({'watch':self.names.get(descriptor),'mask':mask,'cookie':cookie,'name':name,'atNs':time.monotonic_ns()})
        return result
    def close(self):
        if self.fd>=0:os.close(self.fd);self.fd=-1


def clock(pid='self'):
    return n.domain(Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
        Path('/proc/'+str(pid)+'/timens_offsets').read_text(),os.stat('/proc/'+str(pid)+'/ns/time').st_ino)


def stable(path,optional=False,limit=256*1024*1024,binding=None):
    file=Path(path)
    if file.is_symlink():raise ValueError('source symlink refused')
    try:
        with file.open('rb') as source:
            before=os.fstat(source.fileno())
            if binding:binding.check_open(source,file)
            if before.st_size>limit:raise ValueError('source byte budget exhausted')
            raw=source.read(limit+1);after=os.fstat(source.fileno())
        if (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns)!=(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns) or len(raw)!=after.st_size:raise BlockingIOError('source changing')
        return raw
    except FileNotFoundError:
        if optional:return b''
        raise


class FileBinding:
    """Keep opened objects alive so replacement cannot reuse their inode numbers."""
    def __init__(self,path):
        self.path=str(path);self.opened={};self.lock=threading.Lock()
        self.verify()
    def verify(self):
        with self.lock:
            result={}
            for suffix in ('','-wal','-shm'):
                path=Path(self.path+suffix)
                try:stat=path.lstat()
                except FileNotFoundError:stat=None
                if path.is_symlink():raise ValueError('F1 source symlink/replacement')
                if suffix in self.opened:
                    saved=os.fstat(self.opened[suffix].fileno())
                    if stat is None or saved.st_nlink==0 or (saved.st_dev,saved.st_ino)!=(stat.st_dev,stat.st_ino):raise ValueError('F1 bound database file replaced/unlinked: '+str(path))
                elif stat is not None:
                    file=path.open('rb');opened=os.fstat(file.fileno())
                    if (stat.st_dev,stat.st_ino)!=(opened.st_dev,opened.st_ino):
                        file.close();raise ValueError('F1 file changed during bind')
                    self.opened[suffix]=file
                elif not suffix:raise ValueError('F1 main database missing')
                result[suffix or 'main']=None if stat is None else [stat.st_dev,stat.st_ino]
            return result
    def check_open(self,file,path):
        self.verify()
        suffix=str(path)[len(self.path):]
        with self.lock:
            expected=os.fstat(self.opened[suffix].fileno());actual=os.fstat(file.fileno())
            if (actual.st_dev,actual.st_ino)!=(expected.st_dev,expected.st_ino):raise ValueError('F1 read handle differs from bound file')
    def close(self):
        for file in self.opened.values():file.close()


class WalTail:
    def __init__(self):self.raw=b''
    def update(self,raw):
        # [EXP-OBS01-R6] Why: final bytes cannot overwrite previously witnessed WAL history.
        # Rejected: trusting SQLite's final valid checksum after an earlier frame rewrite.
        if not raw.startswith(self.raw):raise ValueError('F11 TAMPER rewritten/reset WAL prefix')
        offset=len(self.raw);new=raw[offset:];self.raw=raw
        return offset,new


def noise():
    paths=['/proc/stat','/proc/loadavg','/proc/meminfo','/proc/diskstats','/proc/pressure/cpu','/proc/pressure/io','/proc/pressure/memory']
    return {path:Path(path).read_text() for path in paths}


def gone_probe(root,container_id,self_path,seen):
    root=Path(root);self_path=Path(self_path)
    if not n.re.fullmatch('[0-9a-f]{64}',container_id) or not self_path.is_dir() or not self_path.is_relative_to(root):raise ValueError('host cgroup visibility not proven')
    matches=[]
    for current,dirs,_ in os.walk(root,onerror=lambda error:(_ for _ in ()).throw(error)):
        for name in dirs:
            if name in (container_id,'docker-'+container_id+'.scope'):matches.append(Path(current)/name)
    if len(matches)>1:raise ValueError('ambiguous container cgroup')
    if matches:
        path=matches[0]
        return {'event':'cgroup-seen','containerId':container_id,'path':str(path),'atNs':time.monotonic_ns(),
            'selfVisible':True,'events':(path/'cgroup.events').read_text(),'procs':(path/'cgroup.procs').read_text()}
    if seen is None:raise ValueError('never observed bound container cgroup; absence is not gone proof')
    return {'event':'cgroup-gone','containerId':container_id,'path':seen['path'],'atNs':time.monotonic_ns(),'selfVisible':True}


def cgroup_id(root,container_id):
    """Inode of the container's cgroup directory: bpf_get_current_cgroup_id() for a cgroup v2 task in that cgroup."""
    matches=[]
    for current,dirs,_ in os.walk(root,onerror=lambda error:(_ for _ in ()).throw(error)):
        for name in dirs:
            if name in (container_id,'docker-'+container_id+'.scope'):matches.append(Path(current)/name)
    if len(matches)!=1:raise ValueError('witness writer cgroup missing/ambiguous')
    return matches[0].stat().st_ino,str(matches[0])


def witness_finish(witness,control,emit,drain,wait_seconds=120,chunk=1024*1024,limit=256*1024*1024):
    """After the final readbacks, wait for the controller to stop the witness (END probe, per-CPU dump), then ship its files.
    [EXP-OBS01-R9] Why: the detach record and loss counters exist only once bpftrace exits, so the stream is read whole afterwards.
    Rejected: tailing a live trace (a partial file cannot prove zero lost events)."""
    control=Path(control);(control/'finals-done').write_text('finals-done')
    until=time.monotonic()+wait_seconds
    while not (control/'witness-done').exists():
        if time.monotonic()>until:raise ValueError('TRACE-INCOMPLETE witness did not detach before the deadline')
        time.sleep(.05)
    meta=Path(witness['metaPath']);trace=Path(witness['tracePath']);errors=Path(witness['stderrPath'])
    for path in (meta,trace,errors):
        if path.is_symlink() or not path.is_file():raise ValueError('witness file missing/symlink: '+path.name)
    if trace.stat().st_size>limit:raise ValueError('witness byte budget exhausted')
    emit({'event':'witness-meta','meta':json.loads(meta.read_bytes())})
    emit({'event':'witness-stderr','bytes':n.blob(errors.read_bytes()[:16*1024*1024])})
    offset=0
    with trace.open('rb') as source:
        while True:
            data=source.read(chunk)
            if not data:break
            emit({'event':'witness-trace','offset':offset,'bytes':n.blob(data)});offset+=len(data);drain()
    if offset!=trace.stat().st_size:raise ValueError('witness trace changed while shipping')


def run(config,root,key,control,offline=False):
    self_cgroup='/sys/fs/cgroup'+Path('/proc/self/cgroup').read_text().strip().split('::',1)[1] if not offline else ''
    case=config['case'];case['clockMode']='vm';case['startedNs']=time.monotonic_ns();sid=config['streams'][0]['streamId']
    identities=[]
    for role,pid in case.get('clockPids',{}).items():
        stat=Path('/proc/'+str(pid)+'/stat').read_text()
        source=next(source for source in case['sources'] if source['id']==role)
        if source['engineContainerId'] not in Path('/proc/'+str(pid)+'/cgroup').read_text():raise ValueError('source PID/container binding mismatch')
        identities.append({'role':role,'pid':pid,'starttime':int(stat[stat.rfind(')')+2:].split()[19])})
    config['sut']['enginePids']=identities
    config['collector']['containerId']=n.re.search(r'[0-9a-f]{64}',self_cgroup).group(0) if not offline else 'offline-fixture'
    config['collector']['cgroupPath']=self_cgroup
    Path(root).parent.mkdir(parents=True,exist_ok=True)
    Path(root).parent.joinpath('observed-config.json').write_bytes(n.packed(config))
    bundle=Bundle(root,config,key)
    send=time.monotonic_ns()/1e6;observed=time.monotonic_ns()/1e6;receive=time.monotonic_ns()/1e6
    (Path(root)/'clock/bridge.jsonl').write_bytes(n.packed({'send':send,'observerMono':observed,'receive':receive,'scope':'actual local VM clock read; no Mac bridge'})+b'\n')
    stop=threading.Event();first={s['id']:threading.Event() for s in case['sources']};active={s['id']:threading.Event() for s in case['sources']};messages=queue.Queue();errors=[]
    def emit(event):messages.put({'runId':config['runId'],**event})
    def fail(error,source=None):
        errors.append(str(error));emit({'event':'error','source':source,'reason':str(error)});stop.set()
    emit({'event':'begin','case':case})
    def wall_clock():
        lower=time.monotonic_ns();real=time.time_ns();upper=time.monotonic_ns()
        emit({'event':'clock-wall','lowerNs':lower,'realNs':real,'upperNs':upper})
    wall_clock()
    emit({'event':'domain','role':'observer','domain':clock()})
    for role,pid in case.get('clockPids',{}).items():emit({'event':'domain','role':role,'domain':clock(pid)})
    witness=case.get('witness')
    if witness is not None:
        emit({'event':'domain','role':'witness','domain':clock(witness['pid'])})
        for source in case['sources']:
            identifier,where=cgroup_id(witness.get('cgroupRoot','/sys/fs/cgroup'),source['engineContainerId'])
            emit({'event':'witness-bind','source':source['id'],'cgroupId':identifier,'path':where})
    def poller(source):
        connection=None
        try:
            bindings[source['id']].verify()
            connection=n.readonly(source['path']);n.schema(connection,source['profile']);bindings[source['id']].verify();batch=[];until=0
            while not stop.is_set():
                files=bindings[source['id']].verify()
                start=time.monotonic_ns()
                try:
                    connection.execute('BEGIN')
                    if source['profile']=='sql01':
                        row=connection.execute('SELECT lsn,epoch,position FROM marker WHERE id=1').fetchone()
                        if row is None:raise ValueError('marker missing')
                        visible=[row[1],row[0]];extra={'position':row[2]}
                    else:
                        row=connection.execute('SELECT stream,epoch,offset FROM frontier WHERE consumer=?',(source['consumer'],)).fetchone()
                        visible=[int(row[1]),int(row[2])+1] if row else [0,0];extra={'stream':row[0] if row else None}
                    connection.execute('COMMIT');end=time.monotonic_ns();files=bindings[source['id']].verify()
                    batch.append({'event':'poll','source':source['id'],'startNs':start,'endNs':end,'visible':visible,'files':files,**extra});first[source['id']].set()
                except sqlite_error() as error:
                    if connection.in_transaction:connection.rollback()
                    emit({'event':'poll-error','source':source['id'],'reason':str(error),'atNs':time.monotonic_ns()})
                if len(batch)>=100:emit({'event':'polls','source':source['id'],'polls':batch});batch=[]
                if active[source['id']].is_set():until=time.monotonic_ns()+20000000;active[source['id']].clear()
                wait=max(0,(start+250000-time.monotonic_ns())/1e9) if time.monotonic_ns()<until else .01
                if wait>=.01:active[source['id']].wait(wait)
                else:stop.wait(wait)
            if batch:emit({'event':'polls','source':source['id'],'polls':batch})
        except BaseException as error:fail(error,source['id'])
        finally:
            if connection:connection.close()
    workers=[];bindings={s['id']:FileBinding(s['path']) for s in case['sources']};tails={s['id']:WalTail() for s in case['sources']};initial={s['id']:stable(s['path'],binding=bindings[s['id']]) for s in case['sources']}
    watcher=Inotify(sorted({str(Path(s['path']).parent) for s in case['sources']})) if not offline else None
    def drain():
        while not messages.empty():
            event=messages.get();now=time.monotonic_ns()/1e6
            bundle.append(sid,n.packed(event),now,time.time_ns()/1e6)
    def tail(source):
        files=bindings[source['id']].verify()
        saved=tails[source['id']]
        try:
            with Path(source['path']+'-wal').open('rb') as file:
                bindings[source['id']].check_open(file,Path(source['path']+'-wal'))
                before=os.fstat(file.fileno())
                if before.st_size<len(saved.raw):raise ValueError('F11 WAL reset/truncation')
                if before.st_size>256*1024*1024:raise ValueError('WAL byte budget')
                file.seek(len(saved.raw));new=file.read();after=os.fstat(file.fileno())
                if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):return
                raw=saved.raw+new
        except FileNotFoundError:
            raw=b''
        files=bindings[source['id']].verify()
        offset,data=saved.update(raw)
        if data:emit({'event':'wal','source':source['id'],'offset':offset,'files':files,'bytes':n.blob(data),'atNs':time.monotonic_ns()})
    try:
        for source in case['sources']:
            tail(source);thread=threading.Thread(target=poller,args=(source,),daemon=True);thread.start();workers.append(thread)
        if not all(event.wait(5) for event in first.values()):raise ValueError('initial read-only poll missing; observer not ready')
        (Path(control)/'ready').write_text(config['runId'])
        began=time.monotonic();next_noise=began;seen={};proved=set()
        while not stop.is_set() and not (Path(control)/'stop').exists():
            if time.monotonic()-began>case.get('durationSeconds',60):break
            events=watcher.read() if watcher else (time.sleep(.01) or [])
            if events:
                for event in events:
                    for source in case['sources']:
                        if event['mask']&(0x40|0x80|0x200|0x400|0x800) and (event['mask']&(0x400|0x800) or event['name'] in [Path(source['path']).name+x for x in ('','-wal','-shm')]):raise ValueError('F1 bound database rename/delete event')
                emit({'event':'inotify','events':events})
                for source in case['sources']:active[source['id']].set()
            for source in case['sources']:tail(source)
            if time.monotonic()>=next_noise:
                emit({'event':'noise','atNs':time.monotonic_ns(),'raw':noise(),'hiccupNs':max(0,int((time.monotonic()-next_noise)*1e9))});next_noise=time.monotonic()+1
                for candidate in case.get('cgroups',[]):
                    if candidate in proved:continue
                    observed=gone_probe('/sys/fs/cgroup',candidate,self_cgroup,seen.get(candidate))
                    if observed['event']=='cgroup-seen':
                        if candidate not in seen:emit(observed)
                        seen[candidate]=observed
                    else:emit(observed);proved.add(candidate)
            drain()
    except BaseException as error:fail(error)
    finally:
        stop.set()
        for worker in workers:worker.join(5)
        if watcher:watcher.close()
    if any(worker.is_alive() for worker in workers):fail(ValueError('poll worker did not stop'))
    for source in case['sources']:
        try:
            tail(source);main=stable(source['path'],binding=bindings[source['id']]);wal=stable(source['path']+'-wal',optional=True,binding=bindings[source['id']])
            if main!=initial[source['id']]:raise ValueError('main DB checkpointed during window; NOT_ESTIMABLE')
            if main!=stable(source['path'],binding=bindings[source['id']]) or wal!=stable(source['path']+'-wal',optional=True,binding=bindings[source['id']]):raise ValueError('final readback not quiescent')
            files=bindings[source['id']].verify()
            emit({'event':'final','source':source['id'],'files':files,'main':n.blob(main),'wal':n.blob(wal),'atNs':time.monotonic_ns(),'cr':source.get('cr',[])})
        except BaseException as error:fail(error,source['id'])
    if witness is not None and not errors:
        try:witness_finish(witness,control,emit,drain,witness.get('waitSeconds',120))
        except BaseException as error:fail(error)
    wall_clock()
    emit({'event':'end','atNs':time.monotonic_ns()});drain()
    for binding in bindings.values():binding.close()
    if errors:raise ValueError('; '.join(errors))
    bundle.seal()
    return bundle

def sqlite_error():
    import sqlite3
    return sqlite3.Error

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);parser.add_argument('--output',required=True);parser.add_argument('--key',required=True);parser.add_argument('--control',required=True)
    args=parser.parse_args()
    run(json.loads(Path(args.config).read_bytes()),args.output,Path(args.key).read_bytes(),args.control)
