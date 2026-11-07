"""Fake native/inspect objects and tiny owned files only; zero service calls."""
import base64
import copy
import dataclasses
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
import urllib.error
from unittest.mock import patch

from read_bounds import LIMITS,ReadOnlyRefusal,canonical,read_response
from read_native import ReadDocker,ReadQlever,NoRedirect
from preflight import ROOT,run,validate_context,validate_inspection
from queries import ReadQuery,render
from continuity import capture

SECRET=b'x'*64
SCOPE='["triplex-scope-v1","test","test","readonly-component",0]'
GRAPH='urn:triplex:scope:'+base64.urlsafe_b64encode(SCOPE.encode()).decode().rstrip('=')
PREFIX='urn:triplex:fault-v2:00000000-0000-4000-8000-000000000001:'


def setup():
    parent=ROOT/'.artifacts/qlever-readonly-preflight-components';parent.mkdir(parents=True,exist_ok=True)
    directory=Path(tempfile.mkdtemp(prefix='case-',dir=parent))
    catalog={'scopes':[{'scope':SCOPE,'explicitAckReferences':[{'authority':'ANCHORED_RAW_EVENT_RECORDS','run':'component/0001','position':2,'commandId':'component-command'}]}]}
    raw=canonical(catalog);path=directory/'catalog.json';path.write_bytes(raw)
    args=['-i','triplex','-p','7019','-j','4','-m','512M','-c','64M','-e','32M','--persist-updates','--no-patterns','--enable-metrics','--access-token']
    contract={'mode':'READ_ONLY_NATIVE_API_PREFLIGHT','root':str(ROOT),'jobId':'component-only','stateOwnerSha256':'component-owner-hash','containerId':'a'*64,'imageSha256':'sha256:'+'b'*64,'registeredStartedAt':'2026-01-01T00:00:00Z','ownerLabel':'component','mainData':'/owned/data','limits':dataclasses.asdict(LIMITS),'fixedNativeArguments':args,'namespace':PREFIX,'ackCatalog':{'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest()}}
    context={'root':str(ROOT),'jobId':'component-only','resourceBytes':896*1024**2,'cpuUnits':1,'rootDevice':ROOT.stat().st_dev,'stateOwnerSha256':'component-owner-hash','mainOwner':{'status':'active','containerId':contract['containerId'],'imageSha256':contract['imageSha256'],'resources':{'memoryBytes':2*1024**3,'cpuUnits':1.5},'startedAt':contract['registeredStartedAt']},'otherActiveQJobs':[]}
    item={'Id':contract['containerId'],'Image':contract['imageSha256'],'State':{'Running':True,'StartedAt':contract['registeredStartedAt']},'Config':{'User':'501:20','WorkingDir':'/data','Entrypoint':['qlever-server'],'Labels':{'triplex.owner':'component','triplex.backend':'qlever'},'Cmd':args+[SECRET.decode()]},'HostConfig':{'Memory':2*1024**3,'MemorySwap':2*1024**3,'NanoCpus':1500000000,'PidsLimit':256,'PortBindings':{'7019/tcp':[{'HostIp':'127.0.0.1','HostPort':'17019'}]}},'Mounts':[{'Type':'bind','Source':'/owned/data','Destination':'/data','RW':True}]}
    return directory,contract,context,item


class FakeDocker:
    def __init__(self,item):self.item=item;self.calls=[]
    def inspect(self,cid):self.calls.append(('GET-inspect',cid));return self.item
    def owned(self,owner):self.calls.append(('GET-owned',owner));return [self.item]


class FakeNative:
    def __init__(self):self.calls=[];self.running=False
    def ready(self):self.calls.append('read-profile');return {'version':'v0.6.0','settings':{'query-planning-budget':'100'}}
    def active(self):self.calls.append('read-active');return {'unexpected':{}} if self.running else {}
    def select(self,description,*,deadline=None):
        query=render(description)
        self.calls.append(query)
        if query.startswith('SELECT ?s WHERE'):return []
        named='GRAPH ?g' in query
        if 'COUNT(*)' in query:return [{'count':{'type':'literal','value':'3' if named else '0'}}]
        def row(subject,predicate,value):return {'g':{'type':'uri','value':GRAPH},'s':{'type':'uri','value':subject},'p':{'type':'uri','value':'urn:triplex:field:'+predicate},'o':{'type':'literal','datatype':'http://www.w3.org/2001/XMLSchema#string','value':value}}
        return [row('urn:triplex:meta','position','2'),row('urn:triplex:claim:component','command_id','component-command'),row('urn:triplex:assertion:component','value_string','i64:9223372036854775807/-0')]


class ReadOnlyComponents(unittest.TestCase):
    def test_all_mutation_and_recovery_methods_refuse_without_connection(self):
        for type_ in [ReadDocker,ReadQlever]:
            instance=type_.__new__(type_)
            for name in ['start','stop','kill','update','copy','mount','permission','recover']:
                with self.assertRaises(RuntimeError):getattr(instance,name)('not-permitted')

    def test_docker_non_get_or_unlisted_routes_refuse_before_socket(self):
        instance=ReadDocker.__new__(ReadDocker)
        for method,path,body in [('POST','/containers/'+'a'*64+'/start',None),('DELETE','/containers/'+'a'*64,None),('GET','/exec/'+'a'*64+'/json',None),('GET','/info',{'unexpected':'body'})]:
            with self.assertRaises(ReadOnlyRefusal):instance.request(method,path,body)

    def test_native_updates_settings_changes_and_smuggled_templates_refuse(self):
        native=ReadQlever(SECRET)
        for parameters,text,kwargs in [({'query-planning-budget':'1'},None,{}),({'cmd':'clear-cache'},None,{}),({'timeout':'5000ms'},'SELECT ?s WHERE { }; INSERT DATA {}',{}),({'timeout':'5000ms'},'SELECT ?s WHERE { SERVICE <http://outside> {} }',{}),({'timeout':'5000ms'},'SELECT ?s WHERE { }',{'update':True}),({'timeout':'5000ms'},'SELECT ?s WHERE { }',{'query_id':'cancel-other'})]:
            with self.assertRaises(ReadOnlyRefusal):native.request(parameters,text,**kwargs)

    def test_safe_prefix_arbitrary_tail_and_raw_generated_text_never_reach_opener(self):
        native=ReadQlever(SECRET)
        class MustNotOpen:
            def open(self,*args,**kwargs):raise AssertionError('Raw SELECT reached transport')
        native.opener=MustNotOpen()
        for raw in ['SELECT ?s WHERE { VALUES ?s { <urn:outside-the-closed-template> } } LIMIT 1',render(ReadQuery('count','named',PREFIX)),render(ReadQuery('page','named',PREFIX))+' LIMIT 1']:
            with self.assertRaises(ReadOnlyRefusal):native.select(raw)
            with self.assertRaises(ReadOnlyRefusal):native.request({'timeout':'5000ms'},raw)

    def test_structured_parameters_are_revalidated_without_text_grammar_escape(self):
        native=ReadQlever(SECRET)
        class MustNotOpen:
            def open(self,*args,**kwargs):raise AssertionError('Invalid structured query reached transport')
        native.opener=MustNotOpen()
        values=[ReadQuery('arbitrary-tail','named',PREFIX),ReadQuery('page','named } UNION {',PREFIX),ReadQuery('page','named',PREFIX+'"}'),ReadQuery('page','named',PREFIX,-1),ReadQuery('page','named',PREFIX,True),ReadQuery('page','named',PREFIX,200000),ReadQuery('page','named',PREFIX,'0 LIMIT 1'),ReadQuery('count','named',PREFIX,1)]
        forged=ReadQuery('page','named',PREFIX);object.__setattr__(forged,'prefix','urn:outside');values.append(forged)
        for query in values:
            with self.assertRaises(ReadOnlyRefusal):native.select(query)

    def test_only_rendered_structures_reach_opener_with_remaining_deadline(self):
        native=ReadQlever(SECRET);calls=[]
        class Response(io.BytesIO):
            headers={}
            def __enter__(self):return self
            def __exit__(self,*args):self.close()
        class Open:
            def open(self,request,timeout):
                calls.append((request,timeout));return Response(b'{"results":{"bindings":[]}}')
        native.opener=Open()
        for kind in ['namespace-absent','count','page']:
            for channel in ['named','default']:
                query=ReadQuery(kind,channel,PREFIX)
                self.assertEqual(native.select(query,deadline=time.monotonic()+.5),[])
                request,timeout=calls[-1]
                self.assertEqual(request.data.decode(),render(query));self.assertEqual(request.get_method(),'POST')
                self.assertLessEqual(timeout,.5);self.assertTrue(request.full_url.startswith('http://127.0.0.1:17019/?timeout='))
        with self.assertRaises(ReadOnlyRefusal):native.select(ReadQuery('count','named',PREFIX),deadline=time.monotonic()-1)

    def test_global_deadline_covers_empty_default_and_final_count_calls(self):
        for target in [('count','named',2),('namespace-absent','default',1),('count','default',1),('count','default',2)]:
            directory,_,_,_=setup();clock=[0.0];counts={}
            class EmptySlow:
                def select(self,query,*,deadline=None):
                    key=(query.kind,query.channel);counts[key]=counts.get(key,0)+1
                    if (*key,counts[key])==target:clock[0]+=121
                    return [{'count':{'type':'literal','value':'0'}}] if query.kind=='count' else []
            with patch('continuity.time.monotonic',lambda:clock[0]):
                with self.assertRaises(ReadOnlyRefusal):capture(EmptySlow(),directory/'capture.gz',packet_prefix=PREFIX)

    def test_redirects_refuse_without_following(self):
        with self.assertRaises(RuntimeError):NoRedirect().redirect_request(None,None,302,None,None,'http://outside')

    def test_native_http_error_never_returns_token_echo(self):
        native=ReadQlever(SECRET)
        class Failed:
            def open(self,*args,**kwargs):raise urllib.error.HTTPError('http://127.0.0.1:17019',500,'error',{},io.BytesIO(SECRET))
        native.opener=Failed()
        with self.assertRaises(RuntimeError) as caught:native.request({'cmd':'stats'})
        self.assertNotIn(SECRET.decode(),str(caught.exception));self.assertIn('bodySha256',str(caught.exception))

    def test_context_and_inspection_changes_refuse(self):
        _,contract,context,item=setup();validate_context(contract,context);validate_inspection(contract,context,item,SECRET)
        for mutate in [lambda value:value['State'].update({'Running':False}),lambda value:value['HostConfig'].update({'Memory':3*1024**3}),lambda value:value['Config'].update({'User':'0'})]:
            changed=copy.deepcopy(item);mutate(changed)
            with self.assertRaises(ReadOnlyRefusal):validate_inspection(contract,context,changed,SECRET)
        context['otherActiveQJobs']=[{'id':'other'}]
        with self.assertRaises(ReadOnlyRefusal):validate_context(contract,context)

    def test_bounded_response_and_frozen_limits(self):
        self.assertEqual(read_response(io.BytesIO(b'ab'),2,time.monotonic()+1),b'ab')
        with self.assertRaises(ReadOnlyRefusal):read_response(io.BytesIO(b'abc'),2,time.monotonic()+1)
        with self.assertRaises(dataclasses.FrozenInstanceError):LIMITS.rows=1

    def test_full_fake_flow_retains_payload_ack_and_no_secret(self):
        directory,contract,context,item=setup();docker=FakeDocker(item);native=FakeNative()
        observed=run(contract,context,docker,native,SECRET,directory)
        self.assertEqual(observed['continuity']['rows'],3);self.assertEqual(observed['acknowledgements']['checkedExplicitReferences'],1)
        self.assertTrue((directory/'full-rdf.jsonl.gz').is_file())
        self.assertNotIn(SECRET.decode(),(directory/'observation.json').read_text())
        self.assertTrue(all(call[0].startswith('GET-') for call in docker.calls))
        self.assertTrue(all(call.startswith('SELECT ') or call.startswith('read-') for call in native.calls))

    def test_active_query_fails_without_recovery_or_setting_change(self):
        directory,contract,context,item=setup();native=FakeNative();native.running=True;docker=FakeDocker(item)
        with self.assertRaises(ReadOnlyRefusal):run(contract,context,docker,native,SECRET,directory)
        self.assertEqual(native.calls,['read-profile','read-active'])


if __name__=='__main__':unittest.main()
