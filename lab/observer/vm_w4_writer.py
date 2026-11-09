#!/usr/bin/env python3
"""Trusted planted writer for sync-witness probe W4 (guest crash, R48 9.1). Not candidate code and not product code.

Commits ten-row broker-shaped transactions (vm_fixture.commit) one after another, forever, and prints one line per commit to standard output,
unbuffered, so the host (which survives a guest crash) receives it through the Docker attach stream:
  R|<pid>|<st_dev>|<wal inode>|<main inode>|<dir inode>        after the database is seeded (once)
  A|<lsn>|<monotonic ns>|<WAL size after the commit>            after commit() returned, i.e. where an honest broker would ACK
mode full: PRAGMA synchronous=FULL (the seed default, one WAL sync per commit). mode off: PRAGMA synchronous=OFF (no sync of any kind).
--pace-us sleeps that long after each commit (the OFF writer is otherwise 4x faster than the FULL one and writes a 100 MB WAL in a few seconds).
The kernel witness, not this file, says which commits were synced; the files left on disk after the crash say which survived.
"""
import argparse
import os
from pathlib import Path
import sys
import time
from vm_fixture import seed,commit

def run(mode,directory,pace_us=0):
    if mode not in ('full','off'):raise ValueError('unknown W4 mode')
    directory=Path(directory);wal=directory/'broker.db-wal';main=directory/'broker.db'
    db=seed(main)
    if mode=='off':db.execute('PRAGMA synchronous=OFF')
    st=os.stat(wal)
    sys.stdout.write('R|%d|%d|%d|%d|%d\n'%(os.getpid(),st.st_dev,st.st_ino,os.stat(main).st_ino,os.stat(directory).st_ino));sys.stdout.flush()
    lsn=0
    while True:
        lsn+=1;commit(db,lsn)
        if pace_us:time.sleep(pace_us/1e6)
        sys.stdout.write('A|%d|%d|%d\n'%(lsn,time.monotonic_ns(),os.stat(wal).st_size));sys.stdout.flush()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--mode',required=True);parser.add_argument('--dir',required=True);parser.add_argument('--pace-us',type=int,default=0)
    args=parser.parse_args();run(args.mode,args.dir,args.pace_us)
