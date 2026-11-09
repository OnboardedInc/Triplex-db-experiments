#!/usr/bin/env python3
"""Trusted planted writers for sync-witness probe W1 (R48 9.1). Not candidate code and not product code.

Each mode commits ten-row broker-shaped transactions (vm_fixture.commit) and records the writer's own ACK instant
(CLOCK_MONOTONIC) after the point where an honest broker would ACK. The kernel witness, not this file, judges durability.
"""
import argparse
import ctypes
import json
import mmap
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile
import time
from vm_fixture import seed,commit
from vm_normalizer import packed

MODES=('full','off','normal','full-then-off','ack-early','sync-before-write','sync-other-file','range-only','syncfs','mmap','neighbor-sync')
SWITCH=500

def expected(mode,index,count):
    """Primary refusal code of commit `index` (1-based of `count`) under judge_witness with driver ACKs and no publication polls,
    or None when the commit must be witnessed. mmap and the other global codes refuse the whole run.
    sync-before-write differs from R48 4.3's table on purpose: the next commit's pre-write sync is a real covering sync that
    entered after this commit's last write, so commits 1..count-1 are ACK-BEFORE-DURABLE and only the last is SYNC-MISSING."""
    if mode in ('full','syncfs'):return None
    if mode in ('off','sync-other-file','range-only','neighbor-sync'):return 'SYNC-MISSING'
    if mode=='full-then-off':return None if index<=SWITCH else 'SYNC-MISSING'
    if mode in ('normal','ack-early'):return 'ACK-BEFORE-DURABLE'
    if mode=='sync-before-write':return 'ACK-BEFORE-DURABLE' if index<count else 'SYNC-MISSING'
    if mode=='mmap':return 'UNWITNESSED-WRITE'
    raise ValueError('unknown mode')

def libc():
    lib=ctypes.CDLL(None,use_errno=True)
    lib.sync_file_range.argtypes=[ctypes.c_int,ctypes.c_longlong,ctypes.c_longlong,ctypes.c_uint];lib.sync_file_range.restype=ctypes.c_int
    lib.syncfs.argtypes=[ctypes.c_int];lib.syncfs.restype=ctypes.c_int
    return lib

def stat_pair(path):
    stat=os.stat(path);return [stat.st_dev,stat.st_ino]

def run(mode,directory,control,count=1000):
    if mode not in MODES:raise ValueError('unknown planted mode')
    directory=Path(directory);control=Path(control);acks=[];lib=libc()
    wal=directory/'broker.db-wal';main=directory/'broker.db'
    if mode=='mmap':return run_mmap(directory,control,count)
    db=seed(main)
    if mode in ('off','ack-early','sync-before-write','sync-other-file','range-only','syncfs','neighbor-sync'):db.execute('PRAGMA synchronous=OFF')
    if mode=='normal':db.execute('PRAGMA synchronous=NORMAL')
    walfd=os.open(wal,os.O_RDONLY);other=os.open(directory/'other.dat',os.O_RDWR|os.O_CREAT,0o600)
    (control/'ready').write_text('ready')
    while not (control/'go').exists():time.sleep(.002)
    for i in range(1,count+1):
        if mode=='full-then-off' and i==SWITCH+1:db.execute('PRAGMA synchronous=OFF')
        if mode=='sync-before-write':os.fdatasync(walfd)
        commit(db,i)
        if mode=='ack-early':acks.append({'lsn':i,'atNs':time.monotonic_ns()});time.sleep(.001);os.fdatasync(walfd);continue
        if mode=='sync-other-file':os.write(other,b'x');os.fdatasync(other)
        if mode=='range-only':lib.sync_file_range(walfd,0,0,7)
        if mode=='syncfs' and lib.syncfs(walfd)!=0:raise OSError(ctypes.get_errno(),'syncfs')
        acks.append({'lsn':i,'atNs':time.monotonic_ns()})
    if mode=='normal':db.execute('PRAGMA wal_checkpoint(PASSIVE)')
    return finish(mode,directory,control,acks,count)

def run_mmap(directory,control,count):
    """Frames reach the WAL through a shared writable mapping, never through write(); a valid WAL is built in scratch first."""
    scratch=Path(tempfile.mkdtemp(prefix='w1-scratch-',dir=control));ends=[0]
    db=seed(scratch/'broker.db');db.execute('PRAGMA synchronous=OFF')
    for i in range(1,count+1):commit(db,i);ends.append((scratch/'broker.db-wal').stat().st_size)
    wal_bytes=(scratch/'broker.db-wal').read_bytes();main_bytes=(scratch/'broker.db').read_bytes();db.close()
    (directory/'broker.db').write_bytes(main_bytes);fd=os.open(directory/'broker.db-wal',os.O_RDWR|os.O_CREAT,0o600)
    os.ftruncate(fd,len(wal_bytes));mapped=mmap.mmap(fd,len(wal_bytes))
    (control/'ready').write_text('ready')
    while not (control/'go').exists():time.sleep(.002)
    acks=[]
    for i in range(1,count+1):
        mapped[ends[i-1]:ends[i]]=wal_bytes[ends[i-1]:ends[i]];acks.append({'lsn':i,'atNs':time.monotonic_ns()})
    shutil.rmtree(scratch);return finish('mmap',directory,control,acks,count)

def finish(mode,directory,control,acks,count):
    wal=directory/'broker.db-wal';main=directory/'broker.db'
    document={'format':'w1-planted-writer/1','mode':mode,'count':count,'pid':os.getpid(),'acks':acks,'dir':stat_pair(directory),
        'main':stat_pair(main),'wal':stat_pair(wal),'cgroup':Path('/proc/self/cgroup').read_text().strip()}
    (control/'wal.bin').write_bytes(wal.read_bytes());(control/'main.bin').write_bytes(main.read_bytes())
    (control/'ops.json').write_bytes(packed(document))
    # [EXP-OBS01-R9] Why: keep the connection open so SQLite never checkpoints the evidence away; the harness kills the container.
    # Rejected: graceful close (checkpoint rewrites the WAL under test).
    while True:time.sleep(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--mode',required=True);parser.add_argument('--dir',required=True)
    parser.add_argument('--control',required=True);parser.add_argument('--count',type=int,default=1000)
    args=parser.parse_args();run(args.mode,args.dir,args.control,args.count)
