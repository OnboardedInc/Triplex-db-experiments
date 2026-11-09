"""Trusted Linux-only probes. No candidate package is imported. Raw samples are retained."""
import ctypes
import json
import math
import os
from pathlib import Path
import select
import sqlite3
import struct
import subprocess
import sys
import time

ROOT = Path(os.environ.get('PROBE_ROOT', '/work'))
ATTEMPT = os.environ.get('PROBE_ATTEMPT', '')

def wait(name, timeout=40):
    end = time.monotonic() + timeout
    while not (ROOT / name).exists():
        if time.monotonic() > end:
            raise TimeoutError(name)
        time.sleep(.001)

def mark(name, value='ready'):
    (ROOT / name).write_text(value)

def domain():
    return dict(bootId=Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                timeNs=os.stat('/proc/self/ns/time').st_ino, primitive='CLOCK_MONOTONIC')

def summary(samples):
    if not samples or any(not math.isfinite(x) or x < 0 for x in samples):
        raise ValueError('empty/invalid samples')
    s = sorted(samples)
    return dict(n=len(s), p50=s[math.ceil(len(s)*.5)-1], p99=s[math.ceil(len(s)*.99)-1], unit='ns')

def db(name='broker.db'):
    c = sqlite3.connect(ROOT / name, timeout=10)
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA synchronous=FULL')
    c.execute('PRAGMA wal_autocheckpoint=0')
    c.execute('CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY, lsn INTEGER)')
    c.execute('INSERT OR IGNORE INTO marker VALUES(1,0)')
    c.execute('CREATE TABLE IF NOT EXISTS facts(id INTEGER PRIMARY KEY, value BLOB)')
    c.commit()
    return c

def commit(c, lsn):
    start = time.monotonic_ns()
    with c:
        c.executemany('INSERT OR REPLACE INTO facts VALUES(?,?)', [(i, b'x'*128) for i in range(10)])
        c.execute('UPDATE marker SET lsn=? WHERE id=1', (lsn,))
    return time.monotonic_ns()-start

def readonly(name='broker.db'):
    c = sqlite3.connect(f'file:{ROOT/name}?mode=ro', uri=True, isolation_level=None)
    c.execute('PRAGMA query_only=ON')
    return c

def read(c):
    c.execute('BEGIN')
    n = c.execute('SELECT lsn FROM marker WHERE id=1').fetchone()[0]
    c.execute('COMMIT')
    return n

def v1():
    fd = os.open(ROOT/'sync.data', os.O_RDWR|os.O_CREAT|os.O_EXCL, 0o600)
    raw = []
    for i in range(500):
        os.pwrite(fd, bytes([i % 256])*4096, 0)
        t = time.monotonic_ns(); os.fdatasync(fd); raw.append(time.monotonic_ns()-t)
    os.close(fd)
    c = db(); sql = [commit(c, i+1) for i in range(500)]; c.close()
    mounts = Path('/proc/self/mountinfo').read_text()
    device = f'{os.major(os.stat(ROOT).st_dev)}:{os.minor(os.stat(ROOT).st_dev)}'
    sysdev = Path('/sys/dev/block') / device
    resolved = sysdev.resolve()
    cache = next((p/'queue/write_cache' for p in [resolved, *resolved.parents] if (p/'queue/write_cache').exists()), None)
    caches = {device: cache.read_text().strip() if cache else 'UNKNOWN'}
    return dict(fdatasync=raw, sqliteCommit=sql, sqliteVersion=sqlite3.sqlite_version,
                synchronous=2, rowsPerCommit=10, mountinfo=mounts, device=device, writeCache=caches,
                durabilityClass='guest-flush-host-fsync; host-power-loss-UNQUALIFIED',
                durabilityBasis='Lima vz Fsync/Cached supplied premise; not inferred from latency')

def v2_writer():
    c = sqlite3.connect(ROOT/'broker.db')
    c.execute('PRAGMA synchronous=FULL'); c.execute('PRAGMA wal_autocheckpoint=0')
    commit(c, 1); c.close()
    return dict(committed=1)

def v2():
    c = db(); r = readonly()
    env = dict(os.environ, LD_PRELOAD='/opt/probes/sync-hook.so', SYNC_BARRIER=str(ROOT))
    p = subprocess.Popen([sys.executable, __file__, 'V2-writer'], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    observations = []
    try:
        for stage in ['before-sync', 'after-sync']:
            wait(stage)
            values = [read(r) for _ in range(100)]
            observations.append(dict(stage=stage, values=values, t=time.monotonic_ns()))
            if values != [0]*100:
                raise ValueError('commit visible before WAL sync returned')
            mark(stage+'-release')
        out, err = p.communicate(timeout=40)
        if p.returncode: raise RuntimeError(err.decode())
        final = read(r)
        return dict(observations=observations, final=final, writer=json.loads(out), hook='fdatasync WAL only')
    finally:
        if p.poll() is None: p.kill(); p.wait()
        r.close(); c.close()

def v3_writer():
    c = db(); mark('db-ready'); wait('observer-ready')
    rounds = []
    # [EXP-G03] Why: ABBA reduces drift; rejected: one baseline then one observed period (time confound).
    lsn = 0
    for i, active in enumerate([False, True, True, False]*3):
        mark('mode', str(int(active))); wait('mode-ack-'+str(i))
        times = []
        for j in range(1000):
            lsn += 1; times.append(commit(c, lsn)); time.sleep(.001)
        t = time.monotonic_ns(); checkpoint = c.execute('PRAGMA wal_checkpoint(RESTART)').fetchone()
        rounds.append(dict(active=active, samples=times, checkpointNs=time.monotonic_ns()-t, checkpoint=checkpoint))
        mark('round-done-'+str(i))
    mark('done'); c.close()
    return dict(rounds=rounds, commits=lsn, rowsPerCommit=10)

def v3_observer():
    wait('db-ready'); c = readonly(); mark('observer-ready'); polls = []
    for i in range(12):
        wait('mode'); active = (i % 4) in [1, 2]
        # Writer writes its mode before waiting for this round's acknowledgment.
        while (ROOT/'mode').read_text() != str(int(active)): time.sleep(.001)
        mark('mode-ack-'+str(i))
        while not (ROOT/('round-done-'+str(i))).exists():
            t = time.monotonic_ns()
            if active: read(c); polls.append(time.monotonic_ns()-t)
            time.sleep(max(0, .00025-(time.monotonic_ns()-t)/1e9))
    c.close(); return dict(pollCost=polls, requestedPeriodNs=250000)

def v4(side):
    if side == 'server':
        for f in ['ping', 'pong']: os.mkfifo(ROOT/f, 0o600)
        mark('pipe-ready')
        with open(ROOT/'ping', 'rb', buffering=0) as inp, open(ROOT/'pong', 'wb', buffering=0) as out:
            for _ in range(2000):
                data = inp.read(8)
                if len(data) != 8: raise ValueError('short ping')
                out.write(data + struct.pack('Q', time.monotonic_ns()))
        return dict(domain=domain(), count=2000)
    wait('pipe-ready'); samples = []
    with open(ROOT/'ping', 'wb', buffering=0) as out, open(ROOT/'pong', 'rb', buffering=0) as inp:
        for i in range(2000):
            t = time.monotonic_ns(); out.write(struct.pack('Q', i)); data = inp.read(16); end = time.monotonic_ns()
            if len(data) != 16: raise ValueError('short pong')
            seq, peer = struct.unpack('QQ', data)
            if seq != i: raise ValueError('wrong pong')
            samples.append(dict(rtt=end-t, peer=peer, start=t, end=end))
    return dict(domain=domain(), samples=samples)

def v5(side):
    file = ROOT/'watched'
    if side == 'writer':
        wait('watch-ready'); file.write_text(ATTEMPT); return dict(bytes=ATTEMPT)
    file.touch(exist_ok=False)
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_NONBLOCK|os.O_CLOEXEC)
    if fd < 0: raise OSError(ctypes.get_errno())
    wd = libc.inotify_add_watch(fd, os.fsencode(file), 2|8)
    if wd < 0: raise OSError(ctypes.get_errno())
    mark('watch-ready'); events = []
    try:
        end = time.monotonic()+10
        while time.monotonic() < end:
            if select.select([fd], [], [], .1)[0]:
                raw = os.read(fd, 65536)
                at = 0
                while at < len(raw):
                    watch, mask, cookie, size = struct.unpack_from('iIII', raw, at); at += 16+size
                    events.append(dict(wd=watch, mask=mask, cookie=cookie, t=time.monotonic_ns()))
                if any(e['mask'] & 8 for e in events): break
        return dict(events=events, expectedWd=wd, bytes=file.read_text())
    finally: os.close(fd)

def memory(role):
    # [EXP-G03] Why: measure a declared synthetic lower bound without importing candidate code. Rejected: calling this an actual NS memory qualification.
    subjects = [{"id":i, "facts":[str(j)*128 for j in range(10)]} for i in range(1000)]
    readers = [bytearray(4096) for _ in range(256)] if role in ['reader', 'driver'] else []
    mark('ready-'+role); wait('memory-release', 90)
    return dict(role=role, subjects=len(subjects), readerBuffers=len(readers), synthetic=True,
                memoryPeak=Path('/sys/fs/cgroup/memory.peak').read_text().strip())

if __name__ == '__main__':
    if not ATTEMPT or sys.platform != 'linux': raise RuntimeError('Linux and fresh attempt nonce required')
    op = sys.argv[1]
    funcs = {'V1':v1, 'V2':v2, 'V2-writer':v2_writer, 'V3-writer':v3_writer, 'V3-observer':v3_observer}
    result = funcs[op]() if op in funcs else v4(sys.argv[2]) if op == 'V4' else v5(sys.argv[2]) if op == 'V5' else memory(sys.argv[2]) if op == 'V7' else None
    if result is None: raise ValueError(op)
    print(json.dumps(dict(attempt=ATTEMPT, op=op, monotonicNs=time.monotonic_ns(), data=result)))
