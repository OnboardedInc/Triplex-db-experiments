#!/usr/bin/env python3
"""Probe W3 load (R48 9.1): a broker-shaped writer at a fixed rate and many read-only pollers, in trusted probe containers.

Loss, not durability, is what W3 measures, so the WAL is allowed to checkpoint (no retained WAL, no judge).
"""
import argparse
import json
import os
from pathlib import Path
import random
import sqlite3
import threading
import time
from vm_fixture import seed,commit
from vm_normalizer import packed

def writer(args):
    control=Path(args.control);db=seed(Path(args.dir)/'broker.db');db.execute('PRAGMA wal_autocheckpoint=1000')
    (control/'ready').write_text('ready')
    while not (control/'go').exists():time.sleep(.002)
    start=time.monotonic();total=int(args.rate*args.seconds);acks=0;late=0
    for i in range(1,total+1):
        due=start+i/args.rate;now=time.monotonic()
        if now<due:time.sleep(due-now)
        else:late+=1
        commit(db,i);acks+=1
    (control/'writer-done.json').write_bytes(packed({'format':'w3-writer/1','commits':acks,'late':late,'rate':args.rate,'seconds':args.seconds,'pid':os.getpid()}))
    while True:time.sleep(1)

def reader(args):
    control=Path(args.control);path=Path(args.dir)/'broker.db';counts=[0]*args.threads;errors=[0]*args.threads
    (control/('reader-ready-'+args.tag)).write_text('ready')
    while not (control/'go').exists():time.sleep(.002)
    deadline=time.monotonic()+args.seconds+5
    def poll(index):
        rng=random.Random(index);connection=sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True,timeout=1)
        while time.monotonic()<deadline:
            try:
                connection.execute('BEGIN');connection.execute('SELECT lsn FROM marker WHERE id=1').fetchone();connection.execute('COMMIT');counts[index]+=1
            except sqlite3.Error:
                errors[index]+=1
                if connection.in_transaction:connection.rollback()
            time.sleep(rng.uniform(.002,.008))
    threads=[threading.Thread(target=poll,args=(i,)) for i in range(args.threads)]
    for thread in threads:thread.start()
    for thread in threads:thread.join()
    (control/('reader-done-'+args.tag+'.json')).write_bytes(packed({'format':'w3-reader/1','threads':args.threads,'polls':sum(counts),'errors':sum(errors)}))
    while True:time.sleep(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('role',choices=('writer','reader'));parser.add_argument('--dir',required=True);parser.add_argument('--control',required=True)
    parser.add_argument('--rate',type=float,default=100);parser.add_argument('--seconds',type=float,default=1200);parser.add_argument('--threads',type=int,default=32);parser.add_argument('--tag',default='0')
    args=parser.parse_args();(writer if args.role=='writer' else reader)(args)
