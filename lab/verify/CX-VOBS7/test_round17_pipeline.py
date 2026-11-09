#!/usr/bin/env python3
"""End-counter aggregate and zero-byte collection CLI reproductions; no VM/container operations."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
import unittest
import test_round16_adversarial as old

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round17'
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_w4_judge as j
import test_w4 as b

class Pipeline(unittest.TestCase):
    def setUp(self):
        self.fixture=old.W4Adversarial();self.fixture.setUp();self.addCleanup(self.fixture.doCleanups)
    def record(self,name,value):(OUT/name).write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
    def test_R17_F1_final_counter_loss_cannot_complete_an_aggregate_PASS(self):
        f=self.fixture;lines=f.trace.splitlines();removed=lines.pop()
        trace='\n'.join(lines)+'\nSW1|Z|400\n@n[0]: 40\n'
        full=j.judge_trial('full',trace,f.stream,f.db,f.wal19,b.CG,b.collection_for(f.db,f.wal19))
        off_trace=b.trace_text(f.ends,f.dev,f.wino,f.mino,f.dino,0,partial=False)
        off=j.judge_trial('off',off_trace,f.stream,f.db,b'',b.CG,b.collection_for(f.db,b'',absent_wal=True))
        self.assertTrue(off['pass']);self.assertEqual(off['collection'],'verified')
        aggregate=j.aggregate([full,off]*5)
        self.record('end-counter-aggregate.json',{'full':full,'off':off,'aggregate':aggregate,'removed':removed,
            'claim':'constructed 10-trial boundary fixture; FULL trace has a received final count proving the last sync is missing'})
        self.assertFalse(aggregate['pass'],'the received end counter proves a missing sync, but ten such trial rows still produce W4 PASS')
    def test_R17_F2_CLI_accepts_a_present_exactly_receipted_zero_byte_WAL(self):
        f=self.fixture;d=Path(f.tmp.name)/'cli';d.mkdir()
        trace=b.trace_text(f.ends,f.dev,f.wino,f.mino,f.dino,0,partial=False)
        receipt=b.collection_for(f.db,b'')
        files={'broker.db':f.db,'broker.db-wal':b'','trace.txt':trace.encode(),'writer.txt':f.stream.encode(),'witness-stderr.txt':b'',
            'collection.json':json.dumps(receipt).encode()}
        for n,raw in files.items():(d/n).write_bytes(raw)
        argv=[sys.executable,'-B',str(ROOT/'lab/observer/vm_w4_judge.py'),str(d),'off',str(b.CG)]
        t=time.time_ns();c=subprocess.run(argv,capture_output=True,timeout=30);actual=json.loads(c.stdout)
        self.record('zero-byte-WAL-CLI.json',{'argv':argv,'startedNs':t,'exit':c.returncode,'stdout':actual,'stderr':c.stderr.decode(),
            'inputSha256':{n:hashlib.sha256(raw).hexdigest() for n,raw in files.items()},'receipt':receipt})
        self.assertEqual(c.returncode,0,'the CLI treats a collected zero-byte WAL as COPY-FAILED despite exact receipt size/hash')
        self.assertEqual(actual['unwitnessedLostCount'],20)

if __name__=='__main__':unittest.main(verbosity=2)
