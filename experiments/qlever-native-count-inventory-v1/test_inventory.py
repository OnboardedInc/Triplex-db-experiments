"""Fake HTTP/owned tiny-file controls; no network, engine or process action."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
import urllib.error

from inventory import ROOT,Record,CountQlever,parse_count
from read_bounds import ReadOnlyRefusal
from queries import ReadQuery

SECRET=b'x'*64
PREFIX='urn:triplex:fault-v2:00000000-0000-4000-8000-000000000001:'


def temporary():
    parent=ROOT/'.artifacts/qlever-count-inventory-components';parent.mkdir(parents=True,exist_ok=True)
    return Path(tempfile.mkdtemp(prefix='case-',dir=parent))


def reply(value,datatype='integer'):
    return json.dumps({'head':{'vars':['count']},'results':{'bindings':[{'count':{'type':'literal','datatype':'http://www.w3.org/2001/XMLSchema#'+datatype,'value':value}}]}}).encode()


class Response(io.BytesIO):
    headers={};status=200
    def __enter__(self):return self
    def __exit__(self,*args):self.close()


class Opener:
    def __init__(self,raw):self.raw=raw;self.calls=[]
    def open(self,request,timeout):self.calls.append(request);return Response(self.raw)


class InventoryComponents(unittest.TestCase):
    def test_full_integer_count_never_rounds_through_float(self):
        parsed=json.loads(reply('9007199254740993'))['results']['bindings']
        self.assertEqual(parse_count(parsed),'9007199254740993')
        self.assertEqual(parse_count(json.loads(reply('18446744073709551615'))['results']['bindings']),'18446744073709551615')

    def test_invalid_count_shape_type_and_range_refuse(self):
        for raw in [reply('-1'),reply('1.5'),reply('18446744073709551616'),reply('1','string')]:
            with self.assertRaises(ReadOnlyRefusal):parse_count(json.loads(raw)['results']['bindings'])

    def test_namespace_payload_and_raw_requests_refuse_before_opener(self):
        record=Record(temporary(),SECRET);native=CountQlever(SECRET,PREFIX,record)
        class MustNotOpen:
            def open(self,*args,**kwargs):raise AssertionError('Forbidden request reached opener')
        native.opener=MustNotOpen()
        for query in [ReadQuery('page','named',PREFIX),ReadQuery('namespace-absent','named',PREFIX),ReadQuery('count','named',PREFIX+'outside'),'SELECT ?s WHERE { VALUES ?s { <urn:outside> } } LIMIT 1']:
            with self.assertRaises(ReadOnlyRefusal):native.select(query)

    def test_exact_count_wire_precedes_numeric_acceptance(self):
        directory=temporary();record=Record(directory,SECRET);native=CountQlever(SECRET,PREFIX,record);raw=reply('234567');native.opener=Opener(raw)
        result=record.step('count-named',lambda:native.count('named',time.monotonic()+30))
        self.assertEqual(result['parsedCountDecimal'],'234567');self.assertEqual((directory/'raw-count-named.json').read_bytes(),raw)
        stages=sorted(directory.glob('[0-9]*.json'));self.assertIn('wire',stages[1].name);self.assertIn('-ok',stages[-1].name)

    def test_parse_failure_retains_raw_count_channel_and_previous_observation(self):
        directory=temporary();record=Record(directory,SECRET);record.write('profile-before',{'planner':'100'})
        native=CountQlever(SECRET,PREFIX,record);raw=reply('not-a-count');native.opener=Opener(raw)
        with self.assertRaises(ReadOnlyRefusal):record.step('count-default',lambda:native.count('default',time.monotonic()+30))
        self.assertEqual((directory/'raw-count-default.json').read_bytes(),raw)
        names=[path.name for path in directory.iterdir()];self.assertTrue(any('profile-before' in name for name in names));self.assertTrue(any('count-default-failed' in name for name in names))

    def test_second_count_failure_keeps_first_exact_raw_and_parsed_result(self):
        directory=temporary();record=Record(directory,SECRET);native=CountQlever(SECRET,PREFIX,record)
        native.opener=Opener(reply('234567'));record.step('count-named',lambda:native.count('named',time.monotonic()+30))
        native.opener=Opener(reply('bad'))
        with self.assertRaises(ReadOnlyRefusal):record.step('count-default',lambda:native.count('default',time.monotonic()+30))
        self.assertEqual((directory/'raw-count-named.json').read_bytes(),reply('234567'))
        events=[json.loads(path.read_bytes()) for path in directory.glob('[0-9]*.json')]
        self.assertTrue(any(event.get('value',{}).get('parsedCountDecimal')=='234567' for event in events))

    def test_http_failure_keeps_exact_safe_count_reply_status_and_phase(self):
        directory=temporary();record=Record(directory,SECRET);native=CountQlever(SECRET,PREFIX,record);raw=b'{"error":"bounded component"}'
        class Failed:
            def open(self,*args,**kwargs):raise urllib.error.HTTPError('http://127.0.0.1:17019',500,'error',{},io.BytesIO(raw))
        native.opener=Failed()
        with self.assertRaises(RuntimeError):record.step('count-default',lambda:native.count('default',time.monotonic()+30))
        self.assertEqual((directory/'raw-count-default.json').read_bytes(),raw)
        events=[json.loads(path.read_bytes()) for path in directory.glob('[0-9]*.json')]
        self.assertTrue(any(event.get('httpStatus')==500 and event.get('stage')=='count-default' for event in events))

    def test_credential_echo_raw_is_refused_without_leak(self):
        directory=temporary();record=Record(directory,SECRET);native=CountQlever(SECRET,PREFIX,record);native.opener=Opener(reply(SECRET.decode()))
        with self.assertRaises(ReadOnlyRefusal):record.step('count-named',lambda:native.count('named',time.monotonic()+30))
        self.assertFalse((directory/'raw-count-named.json').exists())
        for path in directory.iterdir():self.assertNotIn(SECRET,path.read_bytes())

    def test_oversized_reply_stops_during_acquisition_and_retains_safe_phase(self):
        directory=temporary();record=Record(directory,SECRET);native=CountQlever(SECRET,PREFIX,record);native.opener=Opener(b' '* (256*1024+1))
        with self.assertRaises(ReadOnlyRefusal):record.step('count-named',lambda:native.count('named',time.monotonic()+30))
        self.assertFalse((directory/'raw-count-named.json').exists());self.assertTrue(any('failed' in path.name for path in directory.iterdir()))


if __name__=='__main__':unittest.main()
