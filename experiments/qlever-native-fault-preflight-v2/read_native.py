"""Read-only native transports. No start/stop/update/recovery operation exists.

Docker uses only three allowlisted GET route shapes. QLever uses fixed GET
observations or trusted authored SELECT bodies with SPARQL-query content type.
An HTTP/API failure is hashed and returned as failure; no recovery action runs.
"""
from __future__ import annotations
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request

from read_bounds import LIMITS,require,read_response
from queries import ReadQuery,render


class UnixReadConnection(http.client.HTTPConnection):
    def __init__(self,path):super().__init__('localhost',timeout=LIMITS.request_seconds);self.path=path
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(LIMITS.request_seconds);self.sock.connect(str(self.path))


def refuse(*_args,**_kwargs):raise RuntimeError('READ_ONLY_MODE_REFUSES_NATIVE_STORAGE_OR_RECOVERY_ACTION')


class ReadDocker:
    start=stop=kill=create=update=copy=mount=permission=recover=refuse
    def __init__(self,root,daemon):
        expected=root/'.runtime/colima/triplex/docker.sock'
        require(os.environ.get('DOCKER_HOST')=='unix://'+str(expected),'Different Docker endpoint refused')
        self.path=expected.resolve(strict=True);self.daemon=daemon
        require(self.path.is_relative_to(root) and self.path.stat().st_dev==root.stat().st_dev,'Private socket escaped quota filesystem')
    def request(self,method,path,body=None):
        allowed=path=='/info' or re.fullmatch(r'/containers/[a-f0-9]{64}/json',path) is not None or path.startswith('/containers/json?all=1&filters=')
        require(method=='GET' and body is None and allowed,'Read-only Docker allowlist refuses this method/route/body')
        connection=UnixReadConnection(self.path)
        try:
            connection.request('GET','/v1.47'+path)
            response=connection.getresponse();declared=response.getheader('Content-Length')
            require(declared is None or declared.isdigit() and int(declared)<=LIMITS.response,'Oversized declared Docker response')
            raw=read_response(response,LIMITS.response,time.monotonic()+LIMITS.request_seconds)
            require(response.status==200,'Read-only Docker status='+str(response.status)+',bodySha256='+hashlib.sha256(raw).hexdigest())
            return json.loads(raw)
        finally:connection.close()
    def identity(self):
        value=self.request('GET','/info');require(value.get('ID')==self.daemon,'Private daemon id differs')
        return {'daemonId':value['ID'],'memoryBytes':value.get('MemTotal'),'cpus':value.get('NCPU')}
    def inspect(self,cid):
        require(re.fullmatch(r'[a-f0-9]{64}',cid),'Exact CID required');self.identity()
        return self.request('GET','/containers/'+cid+'/json')
    def owned(self,owner):
        self.identity();filters=urllib.parse.urlencode({'all':'1','filters':json.dumps({'label':['triplex.owner='+owner,'triplex.backend=qlever']})})
        values=self.request('GET','/containers/json?'+filters);require(isinstance(values,list) and len(values)<=32,'Owned inventory exceeds32')
        return [self.inspect(value['Id']) for value in values]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*_args,**_kwargs):refuse()


class ReadQlever:
    start=stop=kill=update=copy=mount=permission=recover=cancel=change_settings=refuse
    def __init__(self,secret):self.secret=secret;self.url='http://127.0.0.1:17019';self.opener=urllib.request.build_opener(NoRedirect())
    def request(self,parameters,query=None,*,update=False,query_id=None,deadline=None):
        require(update is False and query_id is None,'Read-only native mode rejects update/cancellation request')
        control=query is None and set(parameters)=={'cmd'} and parameters['cmd'] in {'stats','get-settings','dump-active-queries'}
        selected=type(query) is ReadQuery and set(parameters)=={'timeout'} and isinstance(parameters['timeout'],str) and re.fullmatch(r'[1-9][0-9]{0,3}ms',parameters['timeout']) is not None and int(parameters['timeout'][:-2])<=5000
        require(control or selected,'Only fixed observations and validated structured ReadQuery values are admitted; raw SELECT text is refused')
        text=render(query) if selected else None
        maximum=LIMITS.control_response if control else LIMITS.response
        data=None if control else text.encode();require(data is None or len(data)<=65536,'Authored SELECT exceeds64KiB')
        headers={'Accept':'application/json','Authorization':'Bearer '+self.secret.decode()}
        if selected:headers['Content-Type']='application/sparql-query'
        request=urllib.request.Request(self.url+'/?'+urllib.parse.urlencode(parameters),data=data,headers=headers,method='GET' if control else 'POST')
        deadline=min(deadline,time.monotonic()+LIMITS.request_seconds) if deadline is not None else time.monotonic()+LIMITS.request_seconds
        remaining=deadline-time.monotonic();require(remaining>0,'Global capture deadline expired before connection')
        try:
            with self.opener.open(request,timeout=remaining) as response:
                declared=response.headers.get('Content-Length');require(declared is None or declared.isdigit() and int(declared)<=maximum,'Oversized native response')
                return json.loads(read_response(response,maximum,deadline))
        except urllib.error.HTTPError as error:
            raw=read_response(error,min(maximum,65536),deadline)
            raise RuntimeError('Read-only native status='+str(error.code)+',bodySha256='+hashlib.sha256(raw).hexdigest()) from None
    def select(self,query,*,deadline=None):
        require(type(query) is ReadQuery,'Raw native SELECT strings are not an accepted transport input')
        remaining=5000 if deadline is None else min(5000,int((deadline-time.monotonic())*1000))
        require(remaining>=1,'Global capture deadline expired before SELECT')
        value=self.request({'timeout':str(remaining)+'ms'},query,deadline=deadline);rows=value.get('results',{}).get('bindings');require(isinstance(rows,list),'Malformed SELECT binding shape');return rows
    def active(self):
        value=self.request({'cmd':'dump-active-queries'});require(isinstance(value,(dict,list)),'Malformed active-query shape');return value
    def ready(self):
        stats=self.request({'cmd':'stats'});require(stats.get('version-server')=='v0.6.0' and stats.get('git-hash-server')=='6c5861a','Pinned runtime differs')
        settings=self.request({'cmd':'get-settings'});require(settings.get('query-planning-budget')=='100' and settings.get('cache-max-size')=='64 MB' and settings.get('cache-max-size-single-entry')=='32 MB','Planner/cache readback differs; read-only mode never changes/restores settings')
        return {'version':stats['version-server'],'gitHash':stats['git-hash-server'],'settings':{key:settings[key] for key in ['query-planning-budget','cache-max-size','cache-max-size-single-entry']}}
