#!/usr/bin/env python3
"""Constructed END reconciliation and present-empty WAL controls; no VM operations."""
import itertools
import json
from pathlib import Path
import sys
import unittest
import test_round16_adversarial as old
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round18'
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_w4_judge as j
import vm_normalizer as n
import test_w4 as base
COUNTS={'acked','lastAcked','witnessed','survived','witnessedLostCount','unwitnessedLostCount','ackedLostCount','traceEvents','syncsCredited'}

class Round18(unittest.TestCase):
    def setUp(self):
        self.f=old.W4Adversarial();self.f.setUp();self.addCleanup(self.f.doCleanups)
        self.receipt=base.collection_for(self.f.db,self.f.wal)
        lines=self.f.trace.splitlines();self.lines=[lines[0]]
        for line in lines[1:]:
            p=line.split('|');seq=int(p[3]);p[2]=str(seq%2);p[3]=str((seq+1)//2);self.lines.append('|'.join(p))
    def judge(self,lines):return j.judge_trial('full','\n'.join(lines)+'\n',self.f.stream,self.f.db,self.f.wal,base.CG,self.receipt)
    def refusal(self,result):
        self.assertFalse(result['pass']);self.assertEqual(result.get('refusal'),'TRACE-INCOMPLETE');self.assertFalse(COUNTS.intersection(result))
    def test_two_CPU_count_and_detach_matrix(self):
        # [CX-VOBS7-R18] Why: balanced total counts can still conceal a per-CPU mismatch; check exact counts per CPU and the independent detach bound. Rejected: checking only the sum of counts or one CPU.
        rows=[]
        for a,b,extra,z in itertools.product([None,0,19,20,21,40],[None,0,19,20,21,40],[None,0,1],[9,10,304,305,400]):
            tail=['SW1|Z|'+str(z)]
            for cpu,count in [(0,a),(1,b),(5,extra)]:
                if count is not None:tail.append('@n[%d]: %d'%(cpu,count))
            r=self.judge(self.lines+tail);expected=a==b==20 and extra in (None,0) and z>=305
            if expected:self.assertTrue(r['pass'],r);self.assertTrue(r['traceDetached'])
            else:self.refusal(r)
            rows.append({'counts':[a,b,extra],'detach':z,'expectedAccepted':expected,'pass':r['pass'],'refusal':r.get('refusal')})
        (OUT/'end-matrix.json').write_text(json.dumps(rows,indent=2)+'\n')
        self.assertEqual(len(rows),540)
    def test_END_grammar_and_partial_count_refuse(self):
        variants=[self.lines+['SW1|Z|400','@n[0]: 20','@n[0]: 20','@n[1]: 20'],
            self.lines+['@n[0]: 20','SW1|Z|400','@n[1]: 20'],self.lines+['SW1|Z|400','SW1|Z|401'],
            self.lines+['SW1|Z|400','@n[0]: -1','@n[1]: 20'],self.lines+['SW1|Z|400','@n[0]: 20.0','@n[1]: 20'],
            self.lines+['SW1|Z|400','@n[0]: 20','@n[1]: 20',self.lines[1]]]
        for lines in variants:
            with self.subTest(tail=lines[-3:]):self.refusal(self.judge(lines))
        half='\n'.join(self.lines+['SW1|Z|400','@n[0]: 20'])+'\n@n[1]: 20'
        self.refusal(j.judge_trial('full',half,self.f.stream,self.f.db,self.f.wal,base.CG,self.receipt))
    def test_no_END_each_received_prefix_remains_judged(self):
        for count in range(41):
            text='\n'.join(self.lines[:count+1])+'\nSW1|F|0|'
            r=j.judge_trial('full',text,self.f.stream,self.f.db,self.f.wal,base.CG,self.receipt)
            self.assertNotIn('refusal',r);self.assertEqual(r['acked'],20);self.assertFalse(r['traceDetached']);self.assertEqual(r['traceEvents'],count)
    def test_empty_trace_END_bounds_and_zero_count(self):
        begin=self.lines[:1]
        for tail in [['SW1|Z|9'],['SW1|Z|10','@n[5]: 1']]:self.refusal(self.judge(begin+tail))
        for tail in [['SW1|Z|10'],['SW1|Z|10','@n[5]: 0']]:
            r=self.judge(begin+tail);self.assertNotIn('refusal',r);self.assertEqual(r['traceEvents'],0)
    def test_present_empty_missing_and_absent_WAL_are_distinct(self):
        f=self.f;trace=base.trace_text(f.ends,f.dev,f.wino,f.mino,f.dino,0,partial=False)
        present=base.collection_for(f.db,b'');absent=base.collection_for(f.db,b'',absent_wal=True)
        for wal,receipt,expected,flag in [(b'',present,None,False),(None,present,'COPY-FAILED',None),(b'x',present,'COPY-INCOMPLETE',None),
                (None,absent,None,True),(b'',None,'WAL-ABSENCE-UNPROVEN',None)]:
            r=j.judge_trial('off',trace,f.stream,f.db,wal,base.CG,receipt)
            if expected:self.assertEqual(r['refusal'],expected);self.assertFalse(COUNTS.intersection(r))
            else:self.assertTrue(r['pass'],r);self.assertEqual(r['walAbsentConfirmed'],flag);self.assertEqual(r['unwitnessedLostCount'],20)

if __name__=='__main__':unittest.main(verbosity=2)
