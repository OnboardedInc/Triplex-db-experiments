#!/usr/bin/env python3
"""Additional W4 prefix/collection boundary fixtures, all constructed offline."""
import copy
import json
from pathlib import Path
import sys
import unittest
HERE=Path(__file__).resolve().parent
OUT=HERE/'round17'
sys.path.insert(0,str(HERE.parents[1]/'observer'))
import vm_w4_judge as j
import test_w4 as base
import test_round16_adversarial as original

class Round17Review(original.W4Adversarial):
    # [CX-VOBS7-R17] Why: reuse real SQLite construction and preserve inherited R16 assertions unchanged. Rejected: constructing invalid SQLite bytes as crash-loss evidence.
    def record(self,name,result):(OUT/(name+'.json')).write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    def test_R17_F1_completed_end_counters_prove_a_missing_tail_event(self):
        lines=self.trace.splitlines();removed=lines.pop();self.assertTrue(removed.startswith('SW1|F|0|40|'))
        cut='\n'.join(lines)+'\nSW1|Z|400\n@n[0]: 40\n'
        receipt=base.collection_for(self.db,self.wal19)
        actual=j.judge_trial('full',cut,self.stream,self.db,self.wal19,base.CG,receipt)
        complete=j.judge_trial('full',self.trace,self.stream,self.db,self.wal19,base.CG,receipt)
        self.assertEqual(complete['witnessedLostCount'],1);self.assertFalse(complete['pass'])
        self.record('end-counter-loss',{'actual':actual,'completeTrace':complete,'removed':removed})
        self.assertEqual(actual.get('refusal'),'TRACE-INCOMPLETE','a received final counter proves a missing event; this is not an unknowable crash suffix')
        self.assertNotIn('witnessedLostCount',actual)
    def test_R17_F1_backwards_detach_timestamp_must_refuse(self):
        actual=self.judge(self.trace+'SW1|Z|1\n');self.record('backwards-detach',actual)
        self.assertEqual(actual.get('refusal'),'TRACE-INCOMPLETE');self.assertNotIn('acked',actual)
    def test_R17_F2_present_zero_byte_WAL_is_distinct_from_a_failed_copy(self):
        trace=base.trace_text(self.ends,self.dev,self.wino,self.mino,self.dino,0,partial=False)
        receipt=base.collection_for(self.db,b'')
        verification=j.verify_collection(receipt,{'broker.db':self.db,'broker.db-wal':b''})
        self.assertEqual(verification,(True,None,None,False))
        actual=j.judge_trial('off',trace,self.stream,self.db,b'',base.CG,receipt)
        self.record('zero-byte-WAL',{'receipt':receipt,'directVerification':verification,'judge':actual})
        self.assertTrue(actual['pass'],'the receipted zero-byte WAL was copied exactly; it is not missing')
        self.assertEqual(actual['collection'],'verified');self.assertFalse(actual['walAbsentConfirmed'])
        self.assertEqual(actual['unwitnessedLostCount'],20)
    def test_refusals_have_no_counts_and_never_contribute_even_with_stale_counts(self):
        db=self.db;wal=self.wal;receipt=base.collection_for(db,wal)
        for stderr in ['WARNING: Lost 1 events\n','ERROR: read failure\n','FATAL: stop\n']:
            actual=j.judge_trial('full',self.trace,self.stream,db,wal,base.CG,receipt,stderr)
            self.assertEqual(actual['refusal'],'TRACE-INCOMPLETE');self.assertNotIn('acked',actual);self.assertNotIn('witnessedLostCount',actual)
        control=j.judge_trial('full',self.trace,self.stream,db,wal,base.CG,receipt)
        refused={'mode':'off','pass':False,'refusal':'COPY-FAILED','collection':'unverified','unwitnessedLostCount':1000,'witnessedLostCount':1000}
        agg=j.aggregate([control,refused]*5);self.record('refused-aggregate',agg)
        self.assertFalse(agg['pass']);self.assertEqual((agg['counted'],agg['refused'],agg['witnessedLost'],agg['offUnwitnessedLost']),(5,5,0,0))
        unverified=copy.deepcopy(control);unverified.pop('collection')
        self.assertFalse(j.aggregate([control,unverified]*5)['pass'])

if __name__=='__main__':unittest.main(verbosity=2)
