"""[EXP-OBS01-R16] Offline tests of the W4 judge (vm_w4_judge.py) on CONSTRUCTED traces and real SQLite stores. Nothing here is a guest-crash result.
Rejected: judging only the happy path; each failure of the R48 9.1 W4 rule has its own fixture (a witnessed commit lost, no OFF loss, a partial line, a missing start record, a trace for another directory)."""
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
        ok_full={'mode':'full','pass':True,'witnessedLostCount':0,'ackedLostCount':0,'unwitnessedLostCount':0}
        ok_off={'mode':'off','pass':True,'witnessedLostCount':0,'ackedLostCount':9,'unwitnessedLostCount':9}
        good=[dict(ok_full) if i%2==0 else dict(ok_off) for i in range(10)];a=j.aggregate(good);self.assertTrue(a['pass'],a);self.assertTrue(a['premiseHolds'])
        a=j.aggregate(good[:9]);self.assertFalse(a['pass']);self.assertIn('only 9 of 10',' '.join(a['reasons']))
        none_lost=[dict(t,unwitnessedLostCount=0) for t in good];a=j.aggregate(none_lost);self.assertFalse(a['pass']);self.assertFalse(a['premiseHolds']);self.assertIn('premise',' '.join(a['reasons']))
        bad=[dict(t) for t in good];bad[0]['witnessedLostCount']=1;a=j.aggregate(bad);self.assertFalse(a['pass']);self.assertIn('witnessed commit(s) did not survive',' '.join(a['reasons']))
        a=j.aggregate([dict(ok_full) for _ in range(10)]);self.assertFalse(a['pass']);self.assertIn('both a FULL and an OFF',' '.join(a['reasons']))

if __name__=='__main__':unittest.main()
