#!/usr/bin/env python3
# [EXP-OBS01] Why: verify actual source decoders and incomplete-source refusals. Rejected: self-hashed record fixtures.
import base64
import importlib.util
import io
import json
from pathlib import Path
import struct
import unittest
root=Path(__file__).resolve().parent

def load(name):
 spec=importlib.util.spec_from_file_location(name,root/(name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
n=load('normalize');p=load('compile_protocol')

def varint(v):
 out=b''
 while v>127:out+=bytes([(v&127)|128]);v>>=7
 return out+bytes([v])
def field(n,value,wire=2):
 return varint(n*8+wire)+(varint(len(value))+value if wire==2 else value)
def frame(raw,t):
 import hashlib
 return n.json.dumps({'tStartMono':t,'tEndMono':t+.01,'runStartedMono':0,'sourceMono':t,'tStartReal':1000+t,'rawSha256':hashlib.sha256(raw).hexdigest(),'rawBase64':base64.b64encode(raw).decode()}).encode()+b'\n'

class Round2(unittest.TestCase):
 def test_otlp_fixed64_and_attributes(self):
  attr=field(1,b'scan_rows_read')+field(2,field(3,varint(9007199254740993),0))
  span=field(1,b'a'*16)+field(2,b'b'*8)+field(5,b'scan')+field(7,struct.pack('<Q',123),1)+field(8,struct.pack('<Q',456),1)+field(9,attr)
  request=field(1,field(2,field(2,span)))
  row=n.otlp_spans(request)[0]
  self.assertEqual(row['attributes']['scan_rows_read'],9007199254740993);self.assertEqual(row['endUnixNs'],456)
  with self.assertRaises(ValueError):n.otlp_spans(request[:-1])
 def test_sql_comments_in_literals_do_not_hide_writes(self):
  self.assertEqual(n.sql_kind("SELECT '/*'; INSERT INTO x VALUES ('*/')"),'write')
  self.assertEqual(n.sql_kind('/*obs:q1*/ SELECT 1'),'read')
  self.assertEqual(n.sql_kind('WITH x AS (DELETE FROM t) SELECT * FROM x'),'write')
  with self.assertRaises(ValueError):n.sql_kind("SELECT 'unterminated")
 def test_http_chunked_and_incomplete_frames(self):
  raw=b'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n\r\n'
  self.assertEqual(n.http_messages(raw)[0][0]['body'],b'abc')
  with self.assertRaises(ValueError):n.http_messages(raw[:-2])
 def test_no_mutation_real_counter_delta(self):
  spec={'protocol':'OBS-NO-MUTATION','window':{'offsetMs':1,'durationMs':2}}
  def response(v):return f'HTTP/1.1 200 OK\r\nContent-Length: {len(v)}\r\n\r\n'.encode()+v
  a=b'node_tx_latestCompletedTxId{db="xtdb"} 9007199254740993\n'
  b=b'node_tx_latestCompletedTxId{db="xtdb"} 9007199254740994\n'
  data=frame(response(a),0)+frame(response(b),4)
  namespace={'__name__':'compiled'};exec(p.compile_parser(spec,'X1.node.tx.latestCompletedTxId'),namespace)
  out=namespace['protocol_normalize'](data,spec,'X1.node.tx.latestCompletedTxId')
  self.assertEqual(out,{'engineMutationCounterBefore':0,'engineMutationCounterAfter':1})
  with self.assertRaises(ValueError):namespace['protocol_normalize'](data,{'protocol':'OBS-ACK-ORDER','window':spec['window']},'X1')
 def test_tail_gap_refuses(self):
  def tail(offset):return json.dumps({'inode':1,'offset':offset,'rotation':False,'bytes':base64.b64encode(b'1000|INFO|xtdb|hello\n').decode()}).encode()
  with self.assertRaises(ValueError):n.normalize(frame(tail(0),0)+frame(tail(999),1))
 def test_encrypted_pgwire_refuses(self):
  events=[{'event':'open','connectionId':'c','tMono':0,'enginePort':5432,'upstreamPort':100},
          {'event':'data','connectionId':'c','direction':'client','tMono':1,'data':base64.b64encode(struct.pack('!II',8,80877103)).decode()},
          {'event':'data','connectionId':'c','direction':'engine','tMono':2,'data':base64.b64encode(b'S').decode()},
          {'event':'close','connectionId':'c','tMono':3}]
  with self.assertRaises(ValueError):n.pgwire_records(events)

if __name__=='__main__':unittest.main(verbosity=2)
