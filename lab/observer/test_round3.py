#!/usr/bin/env python3
# [EXP-OBS01] Why: ensure source gaps and ambiguous native facts cannot become successful evidence.
# Rejected: checking only convenient complete field objects without exercising binary reply decoding.
import base64
import importlib.util
import json
from pathlib import Path
import struct
import unittest
p=Path(__file__).with_name('compile_protocol.py');s=importlib.util.spec_from_file_location('compiler',p);compiler=importlib.util.module_from_spec(s);s.loader.exec_module(compiler)
def namespace(protocol,root='X8',**spec):
 case={'protocol':'OBS-'+protocol,**spec};ns={'__name__':'test'};exec(compiler.compile_parser(case,root),ns);return ns,case

def message(tag,body):return tag+struct.pack('!I',len(body)+4)+body

def session(phase,rows,sql='SELECT 1',oid='observation'):
 startup=struct.pack('!II',9,196608)+b'\0';client=startup+message(b'Q',sql.encode()+b'\0')
 names=list(rows[0]) if rows else []
 columns=struct.pack('!H',len(names))+b''.join(n.encode()+b'\0'+struct.pack('!IhIhih',0,0,25,-1,-1,0) for n in names)
 engine=message(b'T',columns)
 for row in rows:
  values=[json.dumps(row[n]).encode() for n in names];engine+=message(b'D',struct.pack('!H',len(values))+b''.join(struct.pack('!i',len(v))+v for v in values))
 engine+=message(b'C',b'SELECT\0')
 events=[{'event':'open','connectionId':oid,'enginePort':5432,'tMono':1},
  {'event':'data','connectionId':oid,'direction':'client','data':base64.b64encode(client).decode(),'tMono':10},
  {'event':'data','connectionId':oid,'direction':'engine','data':base64.b64encode(engine).decode(),'tMono':20},
  {'event':'close','connectionId':oid,'tMono':21}]
 return {'event':{'event':'native-session','phase':phase,'observationId':oid,'wire':events}}

class Round3(unittest.TestCase):
 def test_protocol_objects_are_not_source_bytes(self):
  ns,case=namespace('WORK',operation='candidate',comparisonOperation='baseline',threshold='T-REUSE-AVOIDED')
  out,missing=ns['derive_extra']({'samples':[{'event':{'event':'engineWorkUnits','rowsScanned':0,'rowsWritten':0,'triplesTouched':0,'bytesWritten':0}}]},case,'X8')
  self.assertNotIn('engineWorkUnits',out);self.assertTrue(missing)
 def test_work_missing_units_not_zero_filled(self):
  ns,case=namespace('WORK',operation='candidate',comparisonOperation='baseline',threshold='T-REUSE-AVOIDED')
  data={'samples':[session('work-candidate',[{'attributes':{'scan_rows_read':'9007199254740993'}}]),session('work-comparison',[{'attributes':{'scan_rows_read':'9007199254740994'}}])]}
  out,missing=ns['derive_extra'](data,case,'X8');self.assertEqual(out['engineWorkUnits'],{'rowsScanned':9007199254740993});self.assertEqual(len(missing),6)
  data['samples'][0]=session('work-candidate',[{'attributes':{'scan_rows_read':'1.5'}}])
  with self.assertRaises(ValueError):ns['derive_extra'](data,case,'X8')
 def test_work_complete_native_units(self):
  ns,case=namespace('WORK',operation='candidate',comparisonOperation='baseline',threshold='T-REUSE-AVOIDED')
  data={'samples':[session(phase,[{'attributes':{'scan_rows_read':n,'rows_written':0,'triples_touched':0,'bytes_written':0}}]) for phase,n in [('work-candidate',1),('work-comparison',10)]]}
  out,missing=ns['derive_extra'](data,case,'X8');self.assertFalse(missing);self.assertEqual(out['comparison']['engineWorkUnits']['rowsScanned'],10)
 def test_erasure_does_not_copy_case_publication_or_zero_blind_scan(self):
  ns,case=namespace('ERASURE-SCAN','H6',tErasurePublished=123,scanInventory=[{'id':'file','location':'/engine/file','canary':'canary','scanMethod':'literal-byte-scan/1'}])
  out,missing=ns['derive_extra']({'samples':[]},case,'H6');self.assertNotIn('tErasurePublished',out);self.assertNotIn('scans',out);self.assertTrue(missing)
 def test_erasure_retains_surviving_literal_and_derived_hits(self):
  ns,case=namespace('ERASURE-SCAN','H6',scanInventory=[{'id':'file','location':'/engine/file','canary':'canary','scanMethod':'utf8-utf16le-utf32le/1'}])
  rows=[session('erasure-publication',[{'published_mono':30}])]
  for phase,t,raw in [('before',20,b'canary'),('after',40,b'canary'+ 'canary'.encode('utf-16le'))]:rows.append({'event':{'event':'file-bytes','location':'/engine/file','phase':phase,'tMono':t,'tWritten':10,'truncated':False,'readOffset':0,'fileSize':len(raw),'bytes':base64.b64encode(raw).decode()}})
  out,_=ns['derive_extra']({'samples':rows},case,'H6');self.assertEqual(out['plaintextHits'],1);self.assertEqual(out['derivedChannelHits'],1)
 def test_erasure_prefix_cannot_become_a_full_file_control(self):
  ns,case=namespace('ERASURE-SCAN','H6',scanInventory=[{'id':'file','location':'/engine/file','canary':'canary','scanMethod':'utf8-utf16le-utf32le/1'}])
  events=[{'event':{'event':'file-bytes','location':'/engine/file','phase':phase,'tMono':t,'tWritten':1,'truncated':True,'readOffset':0,'fileSize':100,'bytes':base64.b64encode(b'canary').decode()}} for phase,t in [('before',2),('after',4)]]
  out,missing=ns['derive_extra']({'samples':events},case,'H6');self.assertNotIn('scans',out);self.assertTrue(any('incomplete physical' in m for m in missing))
 def test_qlever_cache_clear_is_a_mutating_admin_request(self):
  ns,_=namespace('NO-MUTATION','T2')
  request=b'GET /?cmd=clear-cache HTTP/1.1\r\nHost: localhost\r\n\r\n'
  events=[{'event':'open','connectionId':'c','enginePort':7019,'tMono':1},{'event':'data','connectionId':'c','direction':'client','tMono':2,'data':base64.b64encode(request).decode()},{'event':'close','connectionId':'c','tMono':3}]
  self.assertEqual(ns['http_wire_records'](events)['queries'][0]['kind'],'write')
 def test_source_cell_mismatch_refuses(self):
  ns,case=namespace('ACK-ORDER','X1')
  with self.assertRaisesRegex(ValueError,'source not allowed'):ns['derive_extra']({'samples':[]},case,'X1')
 def test_matching_sql_does_not_prove_same_snapshot(self):
  ns,case=namespace('WATERMARK','T1',readId='r',servingIndex='i',scope='s',mappingGeneration=1,queriedAttributes=['n'])
  row={'basis':1,'watermark':1,'stream':'s','epoch':1,'scope':'s','generation':1,'valid_instant':1,'valid_from':0,'valid_to':2,'erasure_published':0,'erasure_applied':0,'incarnation':'i','attribute':'n','reconstruct_from':0,'reconstruct_to':2,'marker_state':'complete','published_positions':[1],'resolutions':[{'position':1,'outcome':'applied'}],'recorded_time_bound':None,'partial_or_conflicted':False,'snapshot_before_incarnation':'i','snapshot_before_marker':1,'snapshot_after_incarnation':'i','snapshot_after_marker':1}
  data={'samples':[session('route-metadata',[row],oid='one'),session('routed-read',[row],oid='two')]}
  with self.assertRaisesRegex(ValueError,'share one native request'):ns['derive_extra'](data,case,'T1')
 def test_unavailable_resident_lifecycle_does_not_invent_failure(self):
  ns,case=namespace('AVAILABILITY','H8',resident=True)
  data={'samples':[{'event':{'event':'lifecycle','starttime':1,'oomKill':0,'tMono':10}},{'event':{'event':'lifecycle','starttime':1,'oomKill':0,'tMono':20}}]}
  out,missing=ns['derive_resident'](data,case,'H8');self.assertNotIn('tFailure',out);self.assertNotIn('probes',out);self.assertTrue(missing)
if __name__=='__main__':unittest.main(verbosity=2)
