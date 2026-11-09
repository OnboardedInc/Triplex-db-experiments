# [EXP-OBS01] Why: observation runs outside the client and preserves both wire directions.
# Rejected: adapter counters and client-side proxies (CR under Q82a).
import base64
import json
import socket
import socketserver
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class ClockServer(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True

class LegacyClock(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path!='/clock':self.send_error(404);return
        data=json.dumps({'observerMono':time.monotonic_ns()/1e6}).encode()
        self.send_response(200);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def log_message(self,*args):pass

class ClockPeer(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(2)
        try:
            if self.request.recv(3,socket.MSG_PEEK|socket.MSG_WAITALL)==b'GET':
                LegacyClock(self.request,self.client_address,self.server);return
        except OSError:return
        while True:
            nonce=b''
            try:
                while len(nonce)<8:
                    data=self.request.recv(8-len(nonce))
                    if not data: return
                    nonce+=data
                now=time.monotonic_ns()
                self.request.sendall(nonce+now.to_bytes(8,'big'))
            except (OSError,TimeoutError): return

class CaptureServer(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True

class WirePeer(socketserver.BaseRequestHandler):
    def handle(self):
        server=self.server;cid=uuid.uuid4().hex;up=None;threads=[]
        def emit(event,**fields):
            t=time.monotonic_ns()/1e6
            server.record({'event':event,'connectionId':cid,'tMono':t,**fields})
        try:
            up=socket.create_connection(('127.0.0.1',server.upstream),timeout=3);up.settimeout(None)
            emit('open',client=list(self.client_address),upstreamPort=up.getsockname()[1],enginePort=server.upstream)
            def pump(src,dst,direction):
                try:
                    while True:
                        data=src.recv(64*1024)
                        if not data: break
                        emit('data',direction=direction,data=base64.b64encode(data).decode())
                        dst.sendall(data)
                except OSError: pass
                finally:
                    try: dst.shutdown(socket.SHUT_WR)
                    except OSError: pass
            thread=threading.Thread(target=pump,args=(self.request,up,'client'),daemon=True);thread.start();threads.append(thread)
            pump(up,self.request,'engine');thread.join(3)
        except OSError as error: emit('error',error=str(error))
        finally:
            if up: up.close()
            emit('close')

def start_proxy(port,upstream,record):
    server=CaptureServer(('0.0.0.0',port),WirePeer);server.upstream=upstream;server.record=record
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server

def start_otlp(port,record):
    class Receiver(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path!='/v1/traces' or self.headers.get('Content-Type')!='application/x-protobuf' or self.headers.get('Content-Encoding'):
                self.send_error(415);return
            length=int(self.headers.get('Content-Length','-1'))
            if not 0<=length<=8*1024*1024: self.send_error(413);return
            body=self.rfile.read(length)
            if len(body)!=length: self.send_error(400);return
            record({'event':'otlp','receivedMono':time.monotonic_ns()/1e6,'receivedReal':time.time_ns()/1e6,'body':base64.b64encode(body).decode()})
            self.send_response(200);self.send_header('Content-Length','0');self.end_headers()
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',port),Receiver);server.daemon_threads=True
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server
