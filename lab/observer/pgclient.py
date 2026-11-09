#!/usr/bin/env python3
"""R27 P2/P5 diagnostic driver; observer collection is provisioned separately by engine.mjs."""
import json
from pathlib import Path
import socket
import struct
import sys
import time

class Pg:
    def __init__(self, port=5471, wire_callback=None):
        self.wire_callback=wire_callback
        self.sent=bytearray();self.received=bytearray()
        self.sock = socket.create_connection(('127.0.0.1', port), timeout=10)
        params = b'user\x00xtdb\x00database\x00xtdb\x00\x00'
        self.send(struct.pack('!II', len(params)+8, 196608)+params)
        while True:
            typ, data = self.message()
            if typ == b'R' and struct.unpack('!I', data[:4])[0] != 0:
                raise ValueError('probe requires trusted pgwire startup')
            if typ == b'K': self.pid,self.secret=struct.unpack('!II',data)
            if typ == b'E': raise ValueError(data.decode(errors='replace'))
            if typ == b'Z': break
    def send(self,data):
        self.sent+=data
        if self.wire_callback:self.wire_callback('client',data)
        self.sock.sendall(data)
    def read(self, size):
        data = b''
        while len(data) < size:
            chunk = self.sock.recv(size-len(data))
            if not chunk: raise ValueError('pgwire closed')
            data += chunk; self.received+=chunk
            if self.wire_callback:self.wire_callback('engine',chunk)
        return data
    def message(self):
        typ = self.read(1); size = struct.unpack('!I', self.read(4))[0]
        return typ, self.read(size-4)
    def query(self, sql):
        payload = sql.encode()+b'\0'; self.send(b'Q'+struct.pack('!I', len(payload)+4)+payload)
        return self.result()
    def execute(self,sql,value,prepare=False):
        def msg(tag,payload):self.send(tag+struct.pack('!I',len(payload)+4)+payload)
        if prepare:msg(b'P',b'obsstmt\0'+sql.encode()+b'\0'+struct.pack('!HI',1,23))
        value=str(value).encode()
        msg(b'B',b'\0obsstmt\0'+struct.pack('!HHI',0,1,len(value))+value+struct.pack('!H',0))
        msg(b'D',b'P\0');msg(b'E',b'\0'+struct.pack('!I',0));msg(b'S',b'')
        return self.result()
    def result(self):
        names, rows, error = [], [], None
        while True:
            typ, data = self.message()
            if typ == b'T':
                count = struct.unpack('!H', data[:2])[0]; pos=2
                for _ in range(count):
                    end=data.index(b'\0',pos); names.append(data[pos:end].decode()); pos=end+19
            if typ == b'D':
                count = struct.unpack('!H', data[:2])[0]; pos=2; values=[]
                for _ in range(count):
                    size=struct.unpack('!i',data[pos:pos+4])[0]; pos+=4
                    if size == -1: values.append(None); continue
                    text=data[pos:pos+size].decode(); pos+=size
                    try: values.append(json.loads(text))
                    except ValueError: values.append(text)
                if len(rows)<10000:rows.append(dict(zip(names,values)))
            if typ == b'E': error=data.decode(errors='replace')
            if typ == b'Z':
                if error: raise ValueError(error)
                return rows
    def close(self):
        self.send(b'X\0\0\0\4'); self.sock.close()
