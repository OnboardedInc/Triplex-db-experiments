"""Bounded fake transports only. No real socket/Docker/native operations."""
from __future__ import annotations
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import urllib.error

from sample import BOUNDS,DEFAULT_GRAPH,PLAN,ROOT,Record,SampleQlever,capture_rows,run,validate_context
from queries import ReadQuery
from read_bounds import ReadOnlyRefusal

SECRET=b'x'*64
PREFIX='urn:triplex:fault-v2:00000000-0000-4000-8000-000000000001:'


def temporary():
    parent=ROOT/'.artifacts/qlever-page-sample-components';parent.mkdir(parents=True,exist_ok=True)
    return Path(tempfile.mkdtemp(prefix='case-',dir=parent))


def rows(channel,offset=0):
    result=[]
    for index in range(offset,offset+256):
        row={'s':{'type':'uri','value':f'urn:s:{index:06d}'},'p':{'type':'uri','value':'urn:p'},'o':{'type':'literal','value':f'value-{index}','datatype':'http://www.w3.org/2001/XMLSchema#string'}}
        if channel=='named':row={'g':{'type':'uri','value':'urn:g'},**row}
        result.append(row)
    return result


def reply(channel,offset=0,selected=None):
    return json.dumps({'head':{'vars':['g','s','p','o'] if channel=='named' else ['s','p','o']},'results':{'bindings':rows(channel,offset) if selected is None else selected}}).encode()


class Response(io.BytesIO):
    headers={};status=200
    def __enter__(self):return self
    def __exit__(self,*_):self.close()


class Opener:
    def __init__(self,raw):self.raw=raw;self.calls=[]
    def open(self,request,timeout):self.calls.append((request,timeout));return Response(self.raw)


def fake_run_setup(*,bad=None):
    directory=temporary();record=Record(directory,SECRET)
    contract={'root':str(ROOT),'mode':'READ_ONLY_NATIVE_OPAQUE_PREFIX_SAMPLE','orderingProfile':'OPAQUE_NATIVE_ORDER_PREFIX_ONLY','codepointOrderQualified':False,'sampleBounds':BOUNDS,'pageSchedule':[list(value) for value in PLAN],'operationalFaultActionsAllowed':False,'jobId':'fake-page-sample','stateOwnerSha256':'f'*64,'containerId':'a'*64,'imageSha256':'sha256:'+'b'*64,'registeredStartedAt':'2026-11-07T00:00:00.000Z','ownerLabel':'fake-owned','fixedNativeArguments':['-i','triplex','--access-token'],'mainData':str(ROOT/'.runtime/fake-page-data')}
    context={'root':str(ROOT),'rootDevice':ROOT.stat().st_dev,'stateOwnerSha256':'f'*64,'jobId':contract['jobId'],'resourceBytes':896*1024**2,'cpuUnits':1,'otherActiveQJobs':[],'mainOwner':{'status':'active','containerId':contract['containerId'],'imageSha256':contract['imageSha256'],'resources':{'memoryBytes':2*1024**3,'cpuUnits':1.5},'startedAt':contract['registeredStartedAt']}}
    item={'Id':contract['containerId'],'Image':contract['imageSha256'],'State':{'Running':True,'StartedAt':contract['registeredStartedAt']},'Config':{'User':'501:20','WorkingDir':'/data','Entrypoint':['qlever-server'],'Labels':{'triplex.owner':'fake-owned','triplex.backend':'qlever'},'Cmd':contract['fixedNativeArguments']+[SECRET.decode()]},'HostConfig':{'Memory':2*1024**3,'MemorySwap':2*1024**3,'NanoCpus':1500000000,'PidsLimit':256,'PortBindings':{'7019/tcp':[{'HostIp':'127.0.0.1','HostPort':'17019'}]}},'Mounts':[{'RW':True,'Type':'bind','Source':contract['mainData'],'Destination':'/data'}]}
    class Docker:
        def inspect(self,_):return item
        def owned(self,_):return [item]
    class Native(SampleQlever):
        def request(self,parameters,query=None,**options):
            if query is not None:return super().request(parameters,query,**options)
            command=parameters['cmd']
            if command=='stats':return {'version-server':'v0.6.0','git-hash-server':'6c5861a'}
            if command=='get-settings':return {'query-planning-budget':'100','cache-max-size':'64 MB','cache-max-size-single-entry':'32 MB'}
            if command=='dump-active-queries':return []
            raise AssertionError('Unknown fake fixed control')
    native=Native(SECRET,PREFIX,record)
    class Pages:
        def open(self,request,timeout):
            channel,offset=PLAN[native.calls-1]
            if bad=='overlap' and native.calls==2:offset=0
            selected=rows(channel,offset)
            if bad=='repeat' and native.calls==3:selected[0]['o']['value']='changed-but-still-sorted'
            return Response(reply(channel,selected=selected))
    native.opener=Pages();return contract,context,Docker(),native,record


class Components(unittest.TestCase):
    def native(self,raw=None):
        record=Record(temporary(),SECRET);native=SampleQlever(SECRET,PREFIX,record);native.opener=Opener(raw or reply('named'));return native,record

    def test_structured_schedule_only_and_no_raw_prefix_escape(self):
        native,_=self.native()
        for value in ['SELECT ?s WHERE { VALUES ?s { <urn:outside> } } LIMIT 1',ReadQuery('count','named',PREFIX),ReadQuery('page','named',PREFIX)]:
            with self.assertRaises((ReadOnlyRefusal,RuntimeError)):native.select(value)
            with self.assertRaises(ReadOnlyRefusal):native.request({'timeout':'5000ms'},value)
        with self.assertRaises(ReadOnlyRefusal):native.page('named',256,time.monotonic()+60)
        with self.assertRaises(ReadOnlyRefusal):native.page('default',0,time.monotonic()+60)
        self.assertEqual(native.opener.calls,[])

    def test_all_operational_methods_and_controls_refuse(self):
        native,_=self.native()
        for name in ['start','stop','kill','update','copy','mount','permission','recover','cancel','change_settings']:
            with self.assertRaises(RuntimeError):getattr(native,name)()
        for parameters in [{'cmd':'clear-cache'},{'cmd':'get-settings','query-planning-budget':'1'},{'timeout':'5000ms'}]:
            with self.assertRaises(ReadOnlyRefusal):native.request(parameters)
        self.assertEqual(native.opener.calls,[])

    def test_safe_raw_canonical_term_channels_and_timings_retained(self):
        raw=reply('named');native,record=self.native(raw);result,ids,keys=native.page('named',0,time.monotonic()+60)
        self.assertEqual((record.directory/'raw-page-01-named-0.json').read_bytes(),raw)
        canonical=gzip.decompress((record.directory/result['rows']['gzipFile']).read_bytes())
        self.assertEqual(hashlib.sha256(canonical).hexdigest(),result['rows']['canonicalSha256']);self.assertEqual(len(canonical),result['rows']['canonicalBytes']);self.assertEqual(len(ids),256)
        self.assertEqual(json.loads(canonical.splitlines()[0])['o']['datatype'],'http://www.w3.org/2001/XMLSchema#string')
        self.assertTrue(all(left<right for left,right in zip(keys,keys[1:])))
        self.assertTrue(all(value>=0 for key,value in result['timing'].items() if key.endswith('Ms')))
        self.assertEqual(result['wire']['bytes'],len(raw));self.assertEqual(result['rawBytesPerRow'],len(raw)/256)

    def test_missing_binding_and_short_page_keep_safe_wire(self):
        for selected in [[{}]*256,rows('named')[:255]]:
            native,record=self.native(reply('named',selected=selected))
            with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()+60)
            self.assertTrue((record.directory/'raw-page-01-named-0.json').exists());self.assertTrue(list(record.directory.glob('*partial-timing.json')))

    def test_duplicates_refuse_but_reverse_order_is_retained_nonqualifying(self):
        duplicate=rows('named');duplicate[-1]=duplicate[-2]
        for selected in [duplicate]:
            native,record=self.native(reply('named',selected=selected))
            with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()+60)
            self.assertTrue(list(record.directory.glob('*measurement.json')))

        native,_=self.native(reply('named',selected=list(reversed(rows('named')))))
        result,_,_=native.page('named',0,time.monotonic()+60)
        self.assertFalse(result['rows']['strictCodepointOrderDiagnostic']);self.assertFalse(result['rows']['codepointOrderQualified'])

    def test_blank_node_identity_retained_but_ordinal_diagnostic_unavailable(self):
        selected=rows('named');selected[0]['s']={'type':'bnode','value':'unproved'};native,record=self.native(reply('named',selected=selected))
        result,_,_=native.page('named',0,time.monotonic()+60)
        self.assertIsNone(result['rows']['strictCodepointOrderDiagnostic']);self.assertFalse(result['rows']['codepointOrderQualified'])
        self.assertTrue((record.directory/'raw-page-01-named-0.json').exists())

    def test_language_and_datatype_channels_are_retained(self):
        selected=rows('default');selected[0]['o']={'type':'literal','value':'bonjour','xml:lang':'fr'};record=Record(temporary(),SECRET)
        summary,_,_=capture_rows(record,'language','default',selected)
        first=json.loads(gzip.decompress((record.directory/summary['gzipFile']).read_bytes()).splitlines()[0]);self.assertEqual(first['o']['xml:lang'],'fr');self.assertEqual(first['g']['value'],DEFAULT_GRAPH)

    def test_token_raw_and_escaped_echo_not_written(self):
        for raw in [reply('named',selected=[{**row,'o':{'type':'literal','value':SECRET.decode()}} for row in rows('named')]),reply('named').replace(b'value-0',b'\\u0078'*64)]:
            native,record=self.native(raw)
            with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()+60)
            self.assertFalse(list(record.directory.glob('raw-*')))
            for path in record.directory.iterdir():self.assertNotIn(SECRET,path.read_bytes())

    def test_oversize_and_malformed_replies_stop_without_retry(self):
        for raw in [b'x'*(2*1024**2+1),b'{malformed']:
            native,record=self.native(raw)
            with self.assertRaises((ReadOnlyRefusal,ValueError)):native.page('named',0,time.monotonic()+60)
            with self.assertRaises(ReadOnlyRefusal):native.page('named',256,time.monotonic()+60)
            self.assertEqual(len(native.opener.calls),1);self.assertFalse(list(record.directory.glob('raw-*')))

    def test_http_error_retains_safe_body_status_and_phase(self):
        native,record=self.native();raw=b'{"error":"bounded fake"}'
        class Failed:
            def open(self,*_,**__):raise urllib.error.HTTPError('http://127.0.0.1:17019',500,'safe',{},io.BytesIO(raw))
        native.opener=Failed()
        with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()+60)
        self.assertEqual((record.directory/'raw-page-01-named-0.json').read_bytes(),raw)
        wires=[json.loads(path.read_bytes()) for path in record.directory.glob('*wire.json')];self.assertTrue(any(value.get('httpStatus')==500 for value in wires))

    def test_expired_window_refuses_before_opener(self):
        native,_=self.native()
        with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()-1)
        self.assertEqual(native.opener.calls,[])

    def test_global_window_checked_after_capture(self):
        native,record=self.native();original=record.wire
        def wire(*args,**kwargs):
            result=original(*args,**kwargs);time.sleep(.025);return result
        record.wire=wire
        with self.assertRaises(ReadOnlyRefusal):native.page('named',0,time.monotonic()+.02)
        self.assertTrue(list(record.directory.glob('*measurement.json')))

    def test_canonical_gzip_and_metadata_caps_fail_closed(self):
        record=Record(temporary(),SECRET);record.canonical_bytes=BOUNDS['canonicalBytes']
        with self.assertRaises(ReadOnlyRefusal):capture_rows(record,'capped','named',rows('named'))
        record=Record(temporary(),SECRET);record.gzip_bytes=BOUNDS['gzipBytes']
        with self.assertRaises(ReadOnlyRefusal):capture_rows(record,'capped','named',rows('named'))
        record=Record(temporary(),SECRET);record.metadata_bytes=BOUNDS['metadataBytes']
        with self.assertRaises(ReadOnlyRefusal):record.write('cap',{'value':1})

    def test_full_fake_run_exact_six_pages_and_prefix_only_report(self):
        values=fake_run_setup();result=run(*values)
        self.assertEqual(result['pagesRequested'],6);self.assertEqual(result['returnedRowsIncludingRepeats'],1536)
        self.assertFalse(result['fullContinuityAttempted']);self.assertFalse(result['countsRequeried'])
        self.assertTrue(all(value['repeatFirstCanonicalIdentical'] and value['duplicateIdentitiesAcrossAdjacentPages']==0 for value in result['populations'].values()))

    def test_adjacent_overlap_and_changed_repeat_reject_with_safe_partial(self):
        for mode in ['overlap','repeat']:
            values=fake_run_setup(bad=mode)
            with self.assertRaises(ReadOnlyRefusal):run(*values)
            self.assertEqual(values[3].calls,3);self.assertTrue(list(values[4].directory.glob('*paging-check.json')))

    def test_active_context_and_changed_caps_refuse_before_transport(self):
        contract,context,*_=fake_run_setup();context['otherActiveQJobs']=[{'id':'other','status':'running'}]
        with self.assertRaises(ReadOnlyRefusal):validate_context(contract,context)
        context['otherActiveQJobs']=[];context['mainOwner']['resources']['memoryBytes']=3*1024**3
        with self.assertRaises(ReadOnlyRefusal):validate_context(contract,context)


    def test_retained_actual_inversion_and_authored_mixedcase_stay_diagnostics(self):
        actual=ROOT/'.devloop/jobs/qlever-native-page-sample-v1/attempts/0001/artifacts/raw-page-01-named-0.json'
        raw=actual.read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),'59378361ea8d640fef153c4449592f0cc7c728193d3cf4e3bec566e005cb366c')
        mixed=rows('named');mixed[0]['s']['value']='urn:independent:c';mixed[1]['s']['value']='urn:independent:E'
        for body in [raw,reply('named',selected=mixed)]:
            native,_=self.native(body);result,_,_=native.page('named',0,time.monotonic()+60)
            self.assertFalse(result['rows']['strictCodepointOrderDiagnostic']);self.assertFalse(result['rows']['codepointOrderQualified'])
            self.assertEqual(result['rows']['duplicateIdentitiesWithinPage'],0)

    def test_old_profile_refuses_before_transport(self):
        contract,context,*_=fake_run_setup();contract['mode']='READ_ONLY_NATIVE_PAGE_SAMPLE'
        with self.assertRaises(ReadOnlyRefusal):validate_context(contract,context)


def main():
    # A failing guard records an attempted operational call and fails the gate;
    # no host network transport can silently escape the fakes.
    attempts=[]
    def forbidden(*_args,**_kwargs):attempts.append('forbidden-network-attempt');raise AssertionError('Component tried a real transport')
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(Components)
    with patch('socket.socket.connect',forbidden),patch('urllib.request.OpenerDirector.open',forbidden):result=unittest.TextTestRunner(verbosity=2).run(suite)
    artifact=os.environ.get('TRIPLEX_RUN_ARTIFACTS')
    if artifact:
        path=Path(artifact)/'components.json';path.write_text(json.dumps({'format':'triplex-qlever-opaque-page-sample-components/2','cases':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'operationalCalls':len(attempts)})+'\n')
    if not result.wasSuccessful() or attempts:raise SystemExit(1)


if __name__=='__main__':main()
