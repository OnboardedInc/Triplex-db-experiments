"""[EXP-OBS01-R16] Offline tests of the W4 judge (vm_w4_judge.py) on CONSTRUCTED traces and real SQLite stores. Nothing here is a guest-crash result.
Rejected: judging only the happy path; each failure of the R48 9.1 W4 rule has its own fixture (a witnessed commit lost, no OFF loss, a partial line, a missing start record, a trace for another directory)."""
import hashlib
import os
from pathlib import Path
import tempfile
import unittest
import sys
sys.path.insert(0,str(Path(__file__).parent))
import vm_normalizer as n
import vm_fixture
import vm_w4_judge as j

CG=4242
def build_store(commits):
    """A real WAL-mode store with `commits` committed transactions; returns (db bytes, wal bytes, walEnds, st_dev, wal ino, main ino, dir ino)."""
    directory=tempfile.mkdtemp();main=Path(directory)/'broker.db';db=vm_fixture.seed(main);ends=[]
    wal=Path(directory)/'broker.db-wal'
    for lsn in range(1,commits+1):vm_fixture.commit(db,lsn);ends.append(os.stat(wal).st_size)
    out=(main.read_bytes(),wal.read_bytes(),ends,os.stat(wal).st_dev,os.stat(wal).st_ino,os.stat(main).st_ino,os.stat(directory).st_ino);db.close();return out

def stream_text(ends,dev,wino,mino,dino,partial=True):
    lines=['R|1234|%d|%d|%d|%d'%(dev,wino,mino,dino)]+['A|%d|%d|%d'%(i+1,1000+i,e) for i,e in enumerate(ends)]
    return '\n'.join(lines)+'\n'+('A|%d|99'%(len(ends)+1) if partial else '')

def trace_text(ends,dev,wino,mino,dino,synced,partial=True,begin=True,other_dir=False):
    kdev=n.kernel_dev(dev);lines=[]
    if begin:lines.append('SW1|B|10|%d|%d|%d|%d'%(kdev,dino+(7 if other_dir else 0),kdev,dino+(7 if other_dir else 0)))
    prev=0;seq=0
    for c,end in enumerate(ends,1):
        seq+=1;ts=100+c*10
        lines.append('SW1|W|0|%d|%d|%d|%d|%d|%d|%d|%d'%(seq,ts,CG,kdev,wino,dino,prev,end-prev))
        if c<=synced:seq+=1;lines.append('SW1|F|0|%d|%d|%d|%d|%d|%d|%d|0|0'%(seq,ts+1,ts+5,CG,kdev,wino,dino))
        prev=end
    return '\n'.join(lines)+'\n'+('SW1|F|0|9999|1' if partial else '')

class W4Judge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db20=build_store(20);cls.db12=build_store(12)
    def full_trial(self,store,synced,**kw):
        db,wal,ends,dev,wino,mino,dino=store
        return j.judge_trial('full',trace_text(ends,dev,wino,mino,dino,synced,**kw),stream_text(ends,dev,wino,mino,dino),db,wal,CG)
    def test_every_witnessed_commit_survives(self):
        r=self.full_trial(self.db20,15);self.assertTrue(r['pass'],r);self.assertEqual((r['acked'],r['witnessed'],r['survived'],r['witnessedLostCount']),(20,15,20,0))
    def test_a_witnessed_commit_that_did_not_survive_fails_the_trial(self):
        db,wal,ends,dev,wino,mino,dino=self.db20;short=self.db12
        r=j.judge_trial('full',trace_text(ends,dev,wino,mino,dino,15),stream_text(ends,dev,wino,mino,dino),short[0],short[1],CG)
        self.assertFalse(r['pass']);self.assertEqual(r['witnessedLostCount'],3);self.assertEqual(r['witnessedLost'],[13,14,15]);self.assertEqual(r['ackedLostCount'],8)
    def test_off_writer_commits_are_unwitnessed_and_the_loss_is_counted(self):
        db,wal,ends,dev,wino,mino,dino=self.db20;short=self.db12
        r=j.judge_trial('off',trace_text(ends,dev,wino,mino,dino,0),stream_text(ends,dev,wino,mino,dino),short[0],short[1],CG)
        self.assertTrue(r['pass'],r);self.assertEqual((r['witnessed'],r['unwitnessedAcked'],r['unwitnessedLostCount'],r['survived']),(0,20,8,12))
    def test_an_off_writer_with_a_witnessed_commit_fails(self):
        db,wal,ends,dev,wino,mino,dino=self.db20
        r=j.judge_trial('off',trace_text(ends,dev,wino,mino,dino,3),stream_text(ends,dev,wino,mino,dino),db,wal,CG);self.assertFalse(r['pass']);self.assertEqual(r['witnessed'],3)
    def test_the_partial_last_line_is_ignored_and_a_missing_start_record_or_wrong_directory_fails(self):
        self.assertTrue(self.full_trial(self.db20,15,partial=True)['pass']);self.assertTrue(self.full_trial(self.db20,15,partial=False)['pass'])
        r=self.full_trial(self.db20,15,begin=False);self.assertFalse(r['pass']);self.assertIn('start record',' '.join(r['problems']))
        r=self.full_trial(self.db20,15,other_dir=True);self.assertFalse(r['pass']);self.assertIn('not bound to the writer directory',' '.join(r['problems']))
    def test_stream_problems_fail_closed(self):
        db,wal,ends,dev,wino,mino,dino=self.db20
        broken=stream_text(ends,dev,wino,mino,dino).replace('A|5|','A|6|',1)
        r=j.judge_trial('full',trace_text(ends,dev,wino,mino,dino,15),broken,db,wal,CG);self.assertFalse(r['pass'])
        r=j.judge_trial('full',trace_text(ends,dev,wino,mino,dino,15),'A|1|2|3\n',db,wal,CG);self.assertFalse(r['pass']);self.assertIn('no R line',' '.join(r['problems']))
    def test_a_foreign_cgroup_sync_is_not_credited(self):
        db,wal,ends,dev,wino,mino,dino=self.db20
        r=j.judge_trial('full',trace_text(ends,dev,wino,mino,dino,15),stream_text(ends,dev,wino,mino,dino),db,wal,CG+1)
        self.assertEqual(r['witnessed'],0);self.assertFalse(r['pass'])
    def test_aggregate_rule(self):
        ok_full={'mode':'full','pass':True,'collection':'verified','witnessedLostCount':0,'ackedLostCount':0,'unwitnessedLostCount':0}
        ok_off={'mode':'off','pass':True,'collection':'verified','witnessedLostCount':0,'ackedLostCount':9,'unwitnessedLostCount':9}
        good=[dict(ok_full) if i%2==0 else dict(ok_off) for i in range(10)];a=j.aggregate(good);self.assertTrue(a['pass'],a);self.assertTrue(a['premiseHolds'])
        a=j.aggregate(good[:9]);self.assertFalse(a['pass']);self.assertIn('only 9 of 10',' '.join(a['reasons']))
        unverified=[dict(t) for t in good];unverified[3]['collection']='unverified';a=j.aggregate(unverified);self.assertFalse(a['pass']);self.assertIn('without a verified store collection record: 4',' '.join(a['reasons']))
        refused=[dict(t) for t in good];refused[1]={'mode':'off','pass':False,'refusal':'COPY-FAILED','collection':'unverified'};a=j.aggregate(refused);self.assertFalse(a['pass']);self.assertEqual(a['refused'],1);self.assertIn('#2 COPY-FAILED',' '.join(a['reasons']));self.assertEqual(a['offUnwitnessedLost'],36)
        none_lost=[dict(t,unwitnessedLostCount=0) for t in good];a=j.aggregate(none_lost);self.assertFalse(a['pass']);self.assertFalse(a['premiseHolds']);self.assertIn('premise',' '.join(a['reasons']))
        bad=[dict(t) for t in good];bad[0]['witnessedLostCount']=1;a=j.aggregate(bad);self.assertFalse(a['pass']);self.assertIn('witnessed commit(s) did not survive',' '.join(a['reasons']))
        a=j.aggregate([dict(ok_full) for _ in range(10)]);self.assertFalse(a['pass']);self.assertIn('both a FULL and an OFF',' '.join(a['reasons']))

def collection_for(db,wal,copied=None,absent_wal=False):
    """The harness's collection record for the given store bytes (what the collector would have printed from the recovered volume)."""
    files={'broker.db':{'size':len(db),'sha256':hashlib.sha256(db).hexdigest()}}
    listing=['broker.db']
    if not absent_wal:files['broker.db-wal']={'size':len(wal),'sha256':hashlib.sha256(wal).hexdigest()};listing.append('broker.db-wal')
    return {'format':'w4-collection/1','receipt':{'format':'w4-receipt/1','listing':listing,'files':files},'receiptError':None,'copy':copied or {'broker.db':True,'broker.db-wal':not absent_wal}}

class W4Refusals(unittest.TestCase):
    """[EXP-OBS01-R17] R16-F1 and R16-F2: an internal trace gap and an unverified store copy REFUSE; a refused trial reports no count and is evidence of nothing."""
    @classmethod
    def setUpClass(cls):
        cls.store=build_store(20);cls.short=build_store(12)
    def parts(self):
        db,wal,ends,dev,wino,mino,dino=self.store;return db,wal,ends,dev,wino,mino,dino
    def judge(self,trace,wal=None,collection=None,mode='full',stderr=''):
        db,w,ends,dev,wino,mino,dino=self.parts()
        return j.judge_trial(mode,trace,stream_text(ends,dev,wino,mino,dino,partial=False),db,w if wal is None else wal,CG,collection,stderr)
    def trace(self,synced=20):
        db,wal,ends,dev,wino,mino,dino=self.parts();return trace_text(ends,dev,wino,mino,dino,synced,partial=False)
    def test_internal_sequence_gap_refuses_and_reports_no_count(self):
        lines=self.trace().splitlines();lines.pop(3)
        r=self.judge('\n'.join(lines)+'\n');self.assertFalse(r['pass']);self.assertEqual(r['refusal'],'TRACE-INCOMPLETE');self.assertNotIn('witnessedLostCount',r);self.assertIn('sequence gap',' '.join(r['problems']))
    def test_a_lost_sync_cannot_hide_a_witnessed_loss(self):
        # the R16 reviewer's strongest case: commit 20's sync (CPU sequence 40) is missing, a later sync takes sequence 41, and the store holds only commits 1..19
        db,wal,ends,dev,wino,mino,dino=self.parts();lines=self.trace().splitlines();last=lines.pop();p=last.split('|');p[3]='41';p[4]='399';p[5]='400';p[8]=str(wino+100);lines.append('|'.join(p))
        stream=stream_text(ends,dev,wino,mino,dino,partial=False);short19=build_store(19)
        complete=j.judge_trial('full',self.trace(),stream,short19[0],short19[1],CG);self.assertFalse(complete['pass']);self.assertEqual(complete['witnessedLostCount'],1)
        hidden=j.judge_trial('full','\n'.join(lines)+'\n',stream,short19[0],short19[1],CG);self.assertFalse(hidden['pass']);self.assertEqual(hidden['refusal'],'TRACE-INCOMPLETE')
    def test_time_regression_before_attach_and_stderr_loss_refuse(self):
        lines=self.trace().splitlines();p=lines[3].split('|');p[4]='99';lines[3]='|'.join(p)
        self.assertEqual(self.judge('\n'.join(lines)+'\n')['refusal'],'TRACE-INCOMPLETE')
        early=self.trace().replace('SW1|B|10|','SW1|B|500000|',1);self.assertEqual(self.judge(early)['refusal'],'TRACE-INCOMPLETE')
        self.assertIn('lost',' '.join(self.judge(self.trace(),stderr='WARNING: Lost 4 events\n')['problems']).lower())
        self.assertEqual(self.judge(self.trace(),stderr='ERROR: Unable to attach\n')['refusal'],'TRACE-INCOMPLETE')
        self.assertTrue(self.judge(self.trace(),stderr='WARNING: BTF: failed to iterate modules BTF objects\n')['pass'])
    def test_a_trace_cut_after_a_complete_prefix_is_still_judged(self):
        # a crash removes a suffix: the last records may be missing and the last line cut; that is not a gap
        lines=self.trace().splitlines()[:-10];self.assertTrue(self.judge('\n'.join(lines)+'\nSW1|F|0|99')['pass'])
    def test_failed_wal_copy_refuses_instead_of_manufacturing_loss(self):
        db,wal,ends,dev,wino,mino,dino=self.parts();trace=trace_text(ends,dev,wino,mino,dino,0,partial=False)
        good=collection_for(db,wal);r=self.judge(trace,mode='off',collection=good);self.assertTrue(r['pass'],r);self.assertEqual((r['ackedLostCount'],r['collection']),(0,'verified'))
        failed=collection_for(db,wal,copied={'broker.db':True,'broker.db-wal':False})
        r=self.judge(trace,wal=b'',mode='off',collection=failed);self.assertFalse(r['pass']);self.assertEqual(r['refusal'],'COPY-FAILED');self.assertNotIn('unwitnessedLostCount',r)
        r=self.judge(trace,wal=b'',mode='off');self.assertEqual(r['refusal'],'WAL-ABSENCE-UNPROVEN')
    def test_truncated_or_altered_copies_refuse(self):
        db,wal,ends,dev,wino,mino,dino=self.parts();trace=trace_text(ends,dev,wino,mino,dino,0,partial=False);good=collection_for(db,wal)
        self.assertEqual(self.judge(trace,wal=wal[:len(wal)//2],mode='off',collection=good)['refusal'],'COPY-INCOMPLETE')
        self.assertEqual(self.judge(trace,wal=wal[:-1]+bytes([wal[-1]^1]),mode='off',collection=good)['refusal'],'COPY-INCOMPLETE')
        r=j.judge_trial('off',trace,stream_text(ends,dev,wino,mino,dino,partial=False),db[:-1],wal,CG,good);self.assertEqual(r['refusal'],'COPY-INCOMPLETE')
    def test_a_confirmed_absent_wal_is_accepted_only_with_the_volume_receipt_and_is_flagged(self):
        db,wal,ends,dev,wino,mino,dino=self.parts();trace=trace_text(ends,dev,wino,mino,dino,0,partial=False)
        absent=collection_for(db,wal,absent_wal=True);r=self.judge(trace,wal=b'',mode='off',collection=absent)
        self.assertTrue(r['pass'],r);self.assertTrue(r['walAbsentConfirmed']);self.assertEqual(r['unwitnessedLostCount'],20)
        # the receipt says absent but a WAL arrived anyway, or the receipt lists a WAL nobody copied: both refuse
        self.assertEqual(self.judge(trace,wal=wal,mode='off',collection=absent)['refusal'],'COPY-INCOMPLETE')
        self.assertEqual(self.judge(trace,wal=b'',mode='off',collection=collection_for(db,wal))['refusal'],'COPY-FAILED')
    def test_missing_main_database_and_malformed_records_refuse(self):
        db,wal,ends,dev,wino,mino,dino=self.parts();trace=trace_text(ends,dev,wino,mino,dino,0,partial=False);stream=stream_text(ends,dev,wino,mino,dino,partial=False)
        self.assertEqual(j.judge_trial('off',trace,stream,None,wal,CG,collection_for(db,wal))['refusal'],'COPY-FAILED')
        for bad in ({},{'format':'w4-collection/1'},{'format':'w4-collection/1','receipt':{'format':'w4-receipt/1','listing':['broker.db-wal'],'files':{}},'copy':{}}):
            self.assertIn(j.judge_trial('off',trace,stream,db,wal,CG,bad)['refusal'],('COPY-FAILED','COLLECTION-RECEIPT-INVALID'))
        row=collection_for(db,wal);row['receipt']['listing']=['broker.db'];self.assertEqual(j.judge_trial('off',trace,stream,db,wal,CG,row)['refusal'],'COLLECTION-RECEIPT-INVALID')


if __name__=='__main__':unittest.main()
