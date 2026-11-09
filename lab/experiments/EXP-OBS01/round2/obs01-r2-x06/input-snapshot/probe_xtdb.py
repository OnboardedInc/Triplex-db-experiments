#!/usr/bin/env python3
"""R27 P2/P5 diagnostic driver; observer collection is provisioned separately by engine.mjs."""
import json
from pathlib import Path
import socket
import struct
import sys
import time

class Pg:
    def __init__(self, port=5471):
        self.sock = socket.create_connection(('127.0.0.1', port), timeout=10)
        params = b'user\x00xtdb\x00database\x00xtdb\x00\x00'
        self.sock.sendall(struct.pack('!II', len(params)+8, 196608)+params)
        while True:
            typ, data = self.message()
            if typ == b'R' and struct.unpack('!I', data[:4])[0] != 0:
                raise ValueError('probe requires trusted pgwire startup')
            if typ == b'E': raise ValueError(data.decode(errors='replace'))
            if typ == b'Z': break
    def read(self, size):
        data = b''
        while len(data) < size:
            chunk = self.sock.recv(size-len(data))
            if not chunk: raise ValueError('pgwire closed')
            data += chunk
        return data
    def message(self):
        typ = self.read(1); size = struct.unpack('!I', self.read(4))[0]
        return typ, self.read(size-4)
    def query(self, sql):
        payload = sql.encode()+b'\0'; self.sock.sendall(b'Q'+struct.pack('!I', len(payload)+4)+payload)
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
                rows.append(dict(zip(names,values)))
            if typ == b'E': error=data.decode(errors='replace')
            if typ == b'Z':
                if error: raise ValueError(error)
                return rows
    def close(self):
        self.sock.sendall(b'X\0\0\0\4'); self.sock.close()

def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    pg = Pg()
    try:
        events=[]
        for label, sql in [('before','SELECT 1 AS before'),('write',"INSERT INTO obs01_probe (_id, n) VALUES ('obs01-canary', 17)"),('read',"SELECT * FROM obs01_probe")]:
            start=time.monotonic_ns()/1e6; rows=pg.query(sql); end=time.monotonic_ns()/1e6
            events.append({'operation':label,'sql':sql,'hostStart':start,'hostEnd':end,'rows':rows})
            time.sleep(.5)
        (out/'p2-driver.json').write_text(json.dumps(events,indent=2)+'\n')
        rows=pg.query('EXPLAIN ANALYZE SELECT * FROM obs01_probe')
        (out/'p5-explain.json').write_text(json.dumps(rows,indent=2)+'\n')
        scan=[r for r in rows if isinstance(r.get('attributes'),dict) and 'scan_rows_read' in r['attributes']]
        print(json.dumps({'P2':'driver completed; compare observer gauge samples', 'P5':{'scanRows':scan,'decodedAttributes':bool(scan)}}))
    finally: pg.close()

if __name__ == '__main__': main()
