#!/usr/bin/env python3
"""Constructed W4 refusal fixtures. Failing assertions preserve acceptance bugs; no VM is used."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round16'
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_fixture as f
import vm_w4_judge as j
import test_w4 as base

class W4Adversarial(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        main=Path(self.tmp.name)/'broker.db';db=f.seed(main);self.addCleanup(db.close)
        self.ends=[];wal=main.with_name('broker.db-wal')
        for lsn in range(1,21):
            f.commit(db,lsn);self.ends.append(wal.stat().st_size)
            if lsn==19:self.wal19=wal.read_bytes()
        self.db=main.read_bytes();self.wal=wal.read_bytes()
        self.dev=wal.stat().st_dev;self.wino=wal.stat().st_ino;self.mino=main.stat().st_ino;self.dino=main.parent.stat().st_ino
        self.trace=base.trace_text(self.ends,self.dev,self.wino,self.mino,self.dino,20,partial=False)
        self.stream=base.stream_text(self.ends,self.dev,self.wino,self.mino,self.dino,partial=False)
    def judge(self,trace=None,wal=None,mode='full'):
        return j.judge_trial(mode,self.trace if trace is None else trace,self.stream,self.db,self.wal if wal is None else wal,base.CG)
    def record(self,name,result):
        (OUT/(name+'.json')).write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    def test_valid_prefix_control(self):
        r=self.judge();self.record('w4-control',r);self.assertTrue(r['pass']);self.assertEqual(r['witnessed'],20)
    def test_R16_F1_an_internal_sequence_gap_must_refuse(self):
        # [CX-VOBS7-R16] Why: a crash may remove the suffix, but cannot excuse a missing event within a received CPU sequence. Rejected: calling WitnessScan.feed without its prefix invariants.
        lines=self.trace.splitlines();removed=lines.pop(3);self.assertTrue(removed.startswith('SW1|W|0|3|'))
        r=self.judge('\n'.join(lines)+'\n');self.record('w4-sequence-gap',{'removed':removed,'actual':r})
        self.assertFalse(r['pass'],'W4 accepted an internal per-CPU sequence gap')
    def test_R16_F1_regressed_sequence_time_must_refuse(self):
        lines=self.trace.splitlines();parts=lines[3].split('|');self.assertEqual(parts[1],'W');parts[4]='99';lines[3]='|'.join(parts)
        r=self.judge('\n'.join(lines)+'\n');self.record('w4-time-regression',r)
        self.assertFalse(r['pass'],'W4 accepted regressed per-CPU event timestamps')
    def test_R16_F1_lost_sync_hides_a_witnessed_commit_that_did_not_survive(self):
        lines=self.trace.splitlines();lost=lines.pop();self.assertTrue(lost.startswith('SW1|F|0|40|'))
        later=lost.split('|');later[3]='41';later[4]='399';later[5]='400';later[8]=str(self.wino+100)
        lines.append('|'.join(later))
        incomplete='\n'.join(lines)+'\n'
        actual=j.judge_trial('full',incomplete,self.stream,self.db,self.wal19,base.CG)
        complete=j.judge_trial('full',self.trace,self.stream,self.db,self.wal19,base.CG)
        self.assertFalse(complete['pass']);self.assertEqual(complete['witnessedLostCount'],1)
        self.record('w4-hidden-witnessed-loss',{'completeTrace':complete,'withInternalLostSync':actual,'removed':lost})
        self.assertFalse(actual['pass'],'an internal lost sync concealed a witnessed commit lost in recovery')
    def test_R16_F2_failed_WAL_collection_cannot_be_counted_as_crash_loss(self):
        # [CX-VOBS7-R16] Why: reproduce the harness's ignored docker-cp error: a missing local WAL becomes b'', while the actual source WAL still holds every commit. Rejected: treating a collection failure as proof of absence.
        trace=base.trace_text(self.ends,self.dev,self.wino,self.mino,self.dino,0,partial=False)
        intact=self.judge(trace,mode='off');self.assertEqual(intact['ackedLostCount'],0)
        missing=self.judge(trace,wal=b'',mode='off')
        aggregate=j.aggregate([self.judge(),missing]*5)
        self.record('w4-missing-collected-wal',{'intactSource':intact,'failedCollectionAsUsedByHarness':missing,'falseAggregate':aggregate})
        self.assertFalse(missing['pass'],'missing collected WAL was treated as successful recovery evidence')

if __name__=='__main__':unittest.main()
