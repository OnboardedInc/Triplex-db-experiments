#!/usr/bin/env python3
"""R27 P1/P6 diagnostic driver. No observer is started by this driver."""
import base64
import http.client
import json
import os
from pathlib import Path
import socket
import sys
import threading
import time
from urllib.parse import urlencode

PORT = 7071

def request(method, target, body=None, headers=None):
    conn = http.client.HTTPConnection('127.0.0.1', PORT, timeout=15)
    try:
        conn.request(method, target, body, headers or {})
        response = conn.getresponse()
        data = response.read(2 * 1024 * 1024)
        return {'status': response.status, 'body': data.decode('utf8')}
    finally: conn.close()

def cancellation(out):
    query = 'SELECT ?a ?c ?e WHERE { ?a <urn:obs01:p> ?b . ?c <urn:obs01:p> ?d . ?e <urn:obs01:p> ?f . FILTER(?b < 120 && ?d < 120 && ?f < 120) } ORDER BY ?e ?c ?a'
    result = {}
    def run():
        try: result.update(request('GET', '/?'+urlencode({'query':query}), headers={'Query-Id':'obs01-cancel-02', 'Accept':'application/sparql-results+json'}))
        except Exception as error: result['error']=str(error)
    worker = threading.Thread(target=run, daemon=True); worker.start()
    time.sleep(.005)
    active = request('GET', '/?cmd=dump-active-queries')
    (out/'p6-active-before.json').write_text(json.dumps(active,indent=2)+'\n')
    with socket.create_connection(('127.0.0.1',PORT),timeout=3) as ws:
        key = base64.b64encode(os.urandom(16)).decode()
        ws.sendall(f'GET /watch/obs01-cancel-02 HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
        handshake = b''
        while b'\r\n\r\n' not in handshake:
            data=ws.recv(4096)
            if not data: raise ValueError('websocket closed before upgrade')
            handshake+=data
        if not handshake.startswith(b'HTTP/1.1 101'): raise ValueError(handshake.decode(errors='replace'))
        payload=b'cancel'; mask=os.urandom(4)
        ws.sendall(bytes([0x81,0x80|len(payload)])+mask+bytes(b^mask[i%4] for i,b in enumerate(payload)))
        time.sleep(.2)
    worker.join(10)
    if worker.is_alive(): raise ValueError('query did not settle within 10s')
    (out/'p6-query-result.json').write_text(json.dumps(result,indent=2)+'\n')
    after=request('GET', '/?cmd=dump-active-queries')
    (out/'p6-active-after.json').write_text(json.dumps(after,indent=2)+'\n')
    return {'before':active,'query':result,'after':after}

def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    metrics = request('GET', '/metrics')
    (out/'p1-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    triples = ' '.join(f'<urn:obs01:s{i}> <urn:obs01:p> {i} .' for i in range(180))
    update = request('POST', '/', f'INSERT DATA {{ {triples} }}', {'Content-Type':'application/sparql-update', 'Query-Id':'obs01-seed'})
    (out/'seed.json').write_text(json.dumps(update,indent=2)+'\n')
    if update['status'] != 200: raise ValueError('seed update failed')
    cancellation_result=cancellation(out)
    print(json.dumps({'P1':metrics['status'],'P6':cancellation_result}))

if __name__ == '__main__': main()
