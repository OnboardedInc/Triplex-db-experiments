"""Small owned files/fake native interfaces only. No Docker/HTTP/copy/signal."""
import base64
import dataclasses
import gzip
import hashlib
import io
import json
from pathlib import Path
import tempfile
import time
import unittest

from bounded_io import LIMITS, canonical, read_response, write_new
from continuity import FIELD, SCOPE, capture, check_ack_catalog
from executor import Packet, ROOT
from native_io import native_config, NativeFailure
from policy import FenceError, GIB


def temporary():
    parent = ROOT / '.artifacts/qlever-fault-executor-components'
    parent.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(prefix='case-',dir=parent))


class NativeFixture:
    scope = '["triplex-scope-v1","test","test","component",0]'
    graph = SCOPE + base64.urlsafe_b64encode(scope.encode()).decode().rstrip('=')
    def __init__(self, *, changed=False, too_many=False, namespace_exists=False):
        self.changed, self.too_many, self.namespace_exists = changed, too_many, namespace_exists
        self.queries=[]
    def select(self, query):
        self.queries.append(query)
        if query.startswith('SELECT ?s WHERE') and 'LIMIT 1' in query:
            return [{'s':{'type':'uri','value':'unexpected'}}] if self.namespace_exists else []
        named='GRAPH ?g' in query
        if 'COUNT(*)' in query:
            return [{'count':{'type':'literal','value':str(200001 if self.too_many else 3 if named else 0)}}]
        if not named: return []
        def row(s,p,o):
            return {'g':{'type':'uri','value':self.graph},'s':{'type':'uri','value':s},'p':{'type':'uri','value':FIELD+p},'o':{'type':'literal','value':o,'datatype':'http://www.w3.org/2001/XMLSchema#string'}}
        return [row('urn:triplex:meta','position','2'),row('urn:triplex:claim:component','command_id','component-command'),row('urn:triplex:assertion:component','value_string','different' if self.changed else '-0/int64:9223372036854775807')]


class ExecutorComponents(unittest.TestCase):
    def test_limits_are_frozen(self):
        with self.assertRaises(dataclasses.FrozenInstanceError): LIMITS.rows=1
        self.assertEqual(LIMITS.capture_raw,64*1024**2)

    def test_response_bounds_apply_during_read(self):
        self.assertEqual(read_response(io.BytesIO(b'abc'),maximum=3,deadline=time.monotonic()+1),b'abc')
        with self.assertRaises(FenceError): read_response(io.BytesIO(b'abcd'),maximum=3,deadline=time.monotonic()+1)
        with self.assertRaises(FenceError): read_response(io.BytesIO(b'a'),maximum=3,deadline=time.monotonic()-1)

    def test_exclusive_evidence_cannot_overwrite_or_grow_past_cap(self):
        target=temporary()/'proof.json'
        write_new(target,{'small':True})
        with self.assertRaises(FileExistsError): write_new(target,{'small':False})
        with self.assertRaises(FenceError): write_new(target.parent/'large.json',{'oversized':'x'*100},maximum=10)

    def test_unknown_action_and_expired_authorization_refuse_before_effects(self):
        packet=Packet.__new__(Packet)
        packet.authorization={'actions':[],'expiresAt':'2099-01-01T00:00:00Z'}
        packet.verify_sources=lambda: self.fail('Authorization must refuse before source/native work')
        with self.assertRaises(FenceError): packet.authorize('start-main')
        packet.authorization={'actions':['start-main'],'expiresAt':'2000-01-01T00:00:00Z'}
        with self.assertRaises(FenceError): packet.authorize('start-main')

    def test_native_create_body_has_fixed_caps_no_raw_logging_or_host_argv(self):
        config=native_config({'packet':'00000000-0000-4000-8000-000000000001','case':'cancel','data':'/owned/component'},b'x'*64)
        self.assertEqual(config['HostConfig']['Memory'],2*GIB)
        self.assertEqual(config['HostConfig']['LogConfig']['Type'],'none')
        self.assertTrue(config['HostConfig']['ReadonlyRootfs'])
        self.assertEqual(config['Cmd'][-1],'x'*64)
        error=NativeFailure(500,b'private-error-text')
        self.assertNotIn('private-error-text',str(error))

    def test_complete_capture_retains_term_channels_and_explicit_ack(self):
        target=temporary()/'capture.jsonl.gz'
        summary=capture(NativeFixture(),target,packet_prefix='urn:triplex:fault-v2:component:')
        self.assertEqual(summary['rows'],3)
        lines=[json.loads(line) for line in gzip.decompress(target.read_bytes()).splitlines()]
        self.assertTrue(all('datatype' in row['o'] for row in lines))
        self.assertEqual(lines[-1]['o']['value'],'-0/int64:9223372036854775807')
        catalog={'scopes':[{'scope':NativeFixture.scope,'explicitAckReferences':[{'authority':'ANCHORED_RAW_EVENT_RECORDS','run':'component/0001','position':2,'commandId':'component-command'}]}]}
        self.assertEqual(check_ack_catalog(summary,catalog)['checkedExplicitReferences'],1)
        catalog['scopes'][0]['explicitAckReferences'][0]['commandId']='missing'
        with self.assertRaises(FenceError):check_ack_catalog(summary,catalog)

    def test_identical_full_payload_matches_and_changed_payload_refuses(self):
        directory=temporary()
        expected=capture(NativeFixture(),directory/'baseline.gz',packet_prefix='urn:triplex:fault-v2:component:')
        matched=capture(NativeFixture(),directory/'same.gz',packet_prefix='urn:triplex:fault-v2:component:',expected=expected)
        self.assertEqual(expected['sha256'],matched['sha256'])
        with self.assertRaises(FenceError):capture(NativeFixture(changed=True),directory/'changed.gz',packet_prefix='urn:triplex:fault-v2:component:',expected=expected)

    def test_oversized_or_existing_namespace_refuses_before_payload_capture(self):
        for native in [NativeFixture(too_many=True),NativeFixture(namespace_exists=True)]:
            with self.assertRaises(FenceError):capture(native,temporary()/'capture.gz',packet_prefix='urn:triplex:fault-v2:component:')


if __name__=='__main__':unittest.main()
