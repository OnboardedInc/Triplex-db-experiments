#!/usr/bin/env python3
# [EXP-OBS01] Why: native position evidence must bind actual marker contents and pre/post-crash ordering.
# Rejected: accepting a business position alias, a changed marker, or a successful INSERT alone as durability proof.
import copy
import importlib.util
from pathlib import Path
import unittest
HERE=Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('r3',HERE/'test_round3.py');r3=importlib.util.module_from_spec(s);s.loader.exec_module(r3)

class Round5(unittest.TestCase):
 def test_native_boolean_requires_boolean_type_and_valid_text(self):
  import base64,struct
  ns,_=r3.namespace('WORK')
  def decode(oid,value):
   client=struct.pack('!II',9,196608)+b'\0'+r3.message(b'Q',b'SELECT committed\0')
   desc=struct.pack('!H',1)+b'committed\0'+struct.pack('!IhIhih',0,0,oid,-1,-1,0)
   server=r3.message(b'T',desc)+r3.message(b'D',struct.pack('!Hi',1,len(value))+value)+r3.message(b'C',b'SELECT 1\0')
   events=[{'event':'open','connectionId':'c','enginePort':5432,'tMono':1}]+[{'event':'data','connectionId':'c','direction':direction,'tMono':t,'data':base64.b64encode(raw).decode()} for direction,t,raw in [('client',2,client),('engine',3,server)]]+[{'event':'close','connectionId':'c','tMono':4}]
   return ns['pgwire_records'](events)['queries'][0]['rows'][0]['committed']
  self.assertIs(decode(16,b't'),True);self.assertIs(decode(16,b'f'),False);self.assertEqual(decode(25,b't'),'t')
  with self.assertRaises(ValueError):decode(16,b'true')
 def test_health_plaintext_is_not_prometheus(self):
  import base64
  spec=importlib.util.spec_from_file_location('normalizer',HERE/'normalize.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  raw=b'HTTP/1.1 200 OK\r\nContent-Length: 6\r\n\r\nAlive.'
  import json
  result=m.decode(json.dumps({'event':'health-http','response':base64.b64encode(raw).decode()}).encode())
  self.assertTrue(result['health']['alive']);self.assertNotIn('metrics',result)
 def fixture(self):
  spec={'nativePositionProfile':'xtdb-system-time-join/1','relation':'obs01r5_test','operationId':'op','faultExpectedPayload':1,'variant':'engine-source'}
  ns,case=r3.namespace('FAULT-TRANSITIONS','X4',**spec)
  join="SELECT m.operation_id, m.n, m._system_from AS marker_time, t._id AS position, t.system_time, t.committed FROM obs01r5_test m JOIN xt.txs t ON m._system_from = t.system_time WHERE m._id = 'fault'"
  row={'operation_id':'op','n':1,'position':7,'committed':True,'marker_time':'2026-11-09T00:00:00Z','system_time':'2026-11-09T00:00:00Z'}
  def session(phase,rows,sql,offset):
   value=r3.session(phase,rows,sql=sql,oid=phase)
   for e in value['event']['wire']:e['tMono']+=offset
   return value
  samples=[session('commit',[],"INSERT INTO obs01r5_test (_id,operation_id,n) VALUES ('fault','op',1)",0),session('fault-position-before',[row],join,30),{'event':{'event':'process-event','kind':'client-crash','tMono':80}},session('fault-readback',[row],join,100)]
  return ns,case,{'samples':samples},session,join,row
 def test_native_position_survives_client_crash(self):
  ns,case,data,*_=self.fixture();out,missing=ns['derive_extra'](data,case,'X4')
  self.assertEqual(out['durableEvidenceObject']['readbackPosition'],7);self.assertEqual(out['durableEvidenceObject']['record']['facts']['marker']['value'],1);self.assertFalse(missing)
 def test_wrong_marker_position_payload_and_timestamp_refuse(self):
  for field,value in [('operation_id','other'),('n',2),('position',8),('committed',False),('system_time','other')]:
   ns,case,data,session,sql,row=self.fixture();row={**row,field:value};data['samples'][-1]=session('fault-readback',[row],sql,100)
   with self.assertRaises(ValueError):ns['derive_extra'](data,case,'X4')
 def test_wrong_query_and_precrash_readback_refuse(self):
  for sql,offset in [('SELECT 7 AS position',100),(None,10)]:
   ns,case,data,session,join,row=self.fixture();data['samples'][-1]=session('fault-readback',[row],sql or join,offset)
   with self.assertRaises(ValueError):ns['derive_extra'](data,case,'X4')
 def test_unavailable_native_position_stays_partial(self):
  ns,case,data,session,sql,row=self.fixture();data['samples'][-1]=session('fault-readback',[],sql,100)
  out,missing=ns['derive_extra'](data,case,'X4');self.assertNotIn('transition',out);self.assertTrue(missing)
 def test_availability_does_not_invent_probes_from_metric_stream(self):
  ns,case=r3.namespace('AVAILABILITY','X1',resident=True)
  out,_=ns['derive_resident']({'samples':[{'metrics':[]}]},case,'X1');self.assertEqual(out,{})
 def test_availability_success_requires_expected_probe_contents(self):
  ns,case=r3.namespace('AVAILABILITY','HR',resident=True,round=5,relation='obs01r5_probe')
  for value,expected in [(1,'success'),(2,'failure'),(True,'failure')]:
   data={'samples':[r3.session('availability-read',[{'n':value}],sql="SELECT n FROM obs01r5_probe WHERE _id='availability'")]}
   out,_=ns['derive_resident'](data,case,'HR');self.assertEqual(out['probes'][0]['outcome'],expected)

if __name__=='__main__':unittest.main(verbosity=2)
