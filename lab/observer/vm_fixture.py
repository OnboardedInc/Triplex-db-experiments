#!/usr/bin/env python3
"""Trusted broker-shaped measurement fixture, not candidate/product code."""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import struct
import time
from vm_normalizer import crc32c,packed


def seed(path):
    connection=sqlite3.connect(path)
    connection.executescript('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=0; '
        'CREATE TABLE marker(id INTEGER PRIMARY KEY,lsn INT,epoch INT,h INT,position INT,crc INT,size INT);'
        'CREATE TABLE frames(lsn INTEGER PRIMARY KEY,epoch INT,kind INT,offset INT,end INT,prev_crc INT,crc INT,payload BLOB,committed_at INT);'
        'CREATE TABLE scratch(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO marker VALUES(1,0,0,0,0,0,32);')
    connection.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    return connection


def commit(connection,lsn):
    marker=connection.execute('SELECT crc,size FROM marker').fetchone();previous,offset=marker
    payload=packed({'v':1,'s':'fixture-stream','l':lsn,'e':0,'m':[{'o':'op-'+str(lsn),'a':'attempt-'+str(lsn),'p':[lsn*1024],'c':[],'r':[],'b':[],'s':['fixture-subject']}]})
    crc=crc32c(payload,crc32c(struct.pack('<IIQIIHH',0x464c5854,len(payload),lsn,0,previous,1,0),previous))
    start=time.monotonic_ns();connection.execute('BEGIN IMMEDIATE')
    for i in range(10):connection.execute('INSERT OR REPLACE INTO scratch VALUES(?,?)',(i,'x'*128+str(lsn)))
    end=offset+len(payload)+36
    connection.execute('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)',(lsn,0,1,offset,end,previous,crc,payload,time.time_ns()//1000000))
    connection.execute('UPDATE marker SET lsn=?,position=?,crc=?,size=? WHERE id=1',(lsn,lsn*1024,crc,end))
    connection.commit()
    return time.monotonic_ns()-start

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--path',required=True);parser.add_argument('--control',required=True);parser.add_argument('--samples',type=int,default=500)
    args=parser.parse_args();control=Path(args.control);db=seed(args.path)
    (control/'ready').write_text('ready')
    while not (control/'go').exists():time.sleep(.002)
    samples=[commit(db,i+1) for i in range(args.samples)]
    (control/'samples.json').write_bytes(packed({'samplesNs':samples,'pid':os.getpid(),'count':args.samples,'rowsPerCommit':10}))
    # [EXP-OBS01-R6] Why: SIGKILL preserves the final WAL for independent readback.
    # Rejected: graceful SQLite close/checkpoint, which removes the evidence under collection.
    while True:time.sleep(1)
