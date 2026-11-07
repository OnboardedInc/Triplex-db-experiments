#!/usr/bin/env python3
"""Loopback-only, read-only registry for captured public package tarballs. No proxy."""
import argparse, hashlib, http.server, json, tarfile, urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def load_registry(root):
    packages={}; routes={}
    manifest=json.loads((root/'offline/npm/manifest.json').read_text())
    if manifest.get('status')!='VERIFIED': raise ValueError('Dependency manifest is not VERIFIED')
    for row in manifest['artifacts']:
        if row['status']!='VERIFIED': raise ValueError('Unverified package')
        a=row['artifact'];p=root/'offline'/a['path']
        if p.is_symlink() or not p.is_file() or p.stat().st_size!=a['bytes']: raise ValueError('Missing/changed tarball')
        with p.open('rb') as stream:
            h=hashlib.sha256()
            for b in iter(lambda:stream.read(1024*1024),b''):h.update(b)
        if h.hexdigest()!=a['sha256']:raise ValueError('Tarball digest mismatch')
        with tarfile.open(p,'r:gz') as tar:
            candidates=[m for m in tar.getmembers() if m.isfile() and (m.name=='package.json' or (m.name.count('/')==1 and m.name.endswith('/package.json')))]
            if len(candidates)!=1:raise ValueError('Package needs exactly one top-level package manifest')
            member=candidates[0]
            if member.size>8*1024*1024:raise ValueError('Unsafe package manifest')
            meta=json.load(tar.extractfile(member))
        if meta.get('name')!=row['package'] or meta.get('version')!=row['version']:raise ValueError('Package identity mismatch')
        path=urllib.parse.unquote(urllib.parse.urlsplit(a['url']).path)
        routes[path]=p
        meta['dist']={'tarballPath':path,'integrity':a['sriVerified'][0]}
        packages.setdefault(row['package'],{})[row['version']]=meta
    return packages,routes

def handler_for(packages,routes,port):
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*args): pass
        def do_GET(self): self.respond(False)
        def do_HEAD(self): self.respond(True)
        def respond(self,head):
            path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
            if path in routes:
                p=routes[path];self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(p.stat().st_size));self.end_headers()
                if not head:
                    with p.open('rb') as inp:
                        for b in iter(lambda:inp.read(1024*1024),b''): self.wfile.write(b)
                return
            name=path.lstrip('/');version=None
            if name not in packages:
                name,_,version=name.rpartition('/')
            if name not in packages or (version and version not in packages[name]):self.send_error(404,'Not captured; no network fallback');return
            def meta(v):
                value=dict(packages[name][v]);dist=dict(value['dist']);dist['tarball']='http://127.0.0.1:'+str(port)+dist.pop('tarballPath');value['dist']=dist;return value
            if version: value=meta(version)
            else:
                versions={v:meta(v) for v in packages[name]}
                value={'name':name,'versions':versions,'dist-tags':{'latest':next(reversed(versions))}}
            data=json.dumps(value).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers()
            if not head:self.wfile.write(data)
    return Handler

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--port',type=int,default=48731);a=ap.parse_args()
    if not 1024<=a.port<=65535:ap.error('Use an unprivileged local port')
    packages,routes=load_registry(ROOT)
    with http.server.ThreadingHTTPServer(('127.0.0.1',a.port),handler_for(packages,routes,a.port)) as server:
        print(json.dumps({'registry':'http://127.0.0.1:'+str(a.port),'packages':len(packages),'versions':len(routes),'scope':'Only captured public bytes; no remote requests, installs or lifecycle execution.'}),flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
