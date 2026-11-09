#!/usr/bin/env python3
"""OBS01 round 11 offline gates: R10-F1 untimed/malformed/out-of-interval WAL tails refuse, R10-F2 every ACK classified independently.
(R10-F3, the clock proof, is tested in test_engine.mjs because the verdicts are JavaScript.) Synthetic traces are never VM evidence."""
import itertools
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
import vm_normalizer as n
import test_syncwitness as base
from test_syncwitness import Trace,TAIL_NS,FINAL_NS
from test_round10 import judged

class WalTailTiming(unittest.TestCase):
    """R10-F1: in a witnessed run every tailed WAL chunk needs a nonnegative integer atNs inside this attempt's clock interval."""
    def setUp(self):self.h=base.NormalizerCase();self.h.setUp();self.addCleanup(self.h.doCleanups)
    def refuse(self,tweak,fragment='WAL tail chunk'):
        for mode in ('offline-synthetic','vm'):
            with self.subTest(mode=mode),self.assertRaises(n.WitnessError) as caught:n.normalize(self.h.build(mode=mode,tweak=tweak))
            self.assertEqual(caught.exception.code,'TRACE-INCOMPLETE');self.assertIn(fragment,str(caught.exception))
    def wal(self,c):return [e for e in c['events'] if e['event']=='wal']
    def test_the_fixture_really_stamps_every_tail(self):
        c=[];self.h.build(tweak=lambda ctx:c.append(ctx))
        self.assertEqual([e['atNs'] for e in self.wal(c[0])],[TAIL_NS,TAIL_NS])
    def test_control_a_correctly_timed_run_is_accepted(self):
        for mode in ('offline-synthetic','vm'):self.assertEqual(n.normalize(self.h.build(mode=mode))['witness']['detachNs'],599_000_000)
    def test_a_missing_timestamp_refuses(self):
        def drop(c):
            for e in self.wal(c):e.pop('atNs')
        self.refuse(drop)
    def test_a_missing_timestamp_on_only_one_of_two_tails_refuses(self):
        self.refuse(lambda c:self.wal(c)[1].pop('atNs'))
        self.refuse(lambda c:self.wal(c)[0].pop('atNs'))
    def test_wrong_types_and_values_refuse(self):
        for name,value in (('string','580000000'),('bool-true',True),('bool-false',False),('negative',-1),('float',580_000_000.5),('null',None),('list',[580_000_000]),('huge-negative',-10**12)):
            with self.subTest(value=name):
                def bad(c,value=value):
                    for e in self.wal(c):e['atNs']=value
                self.fresh();self.refuse(bad)
    def fresh(self):self.h=base.NormalizerCase();self.h.setUp();self.addCleanup(self.h.doCleanups)
    def test_a_timestamp_after_the_observer_end_refuses_as_outside_the_interval(self):
        def late(c):
            for e in self.wal(c):e['atNs']=600_000_001
        self.refuse(late,'outside this attempt')
    def test_a_timestamp_before_the_attempt_started_refuses_as_outside_the_interval(self):
        def early(c):
            c['events'][0]['case']['startedNs']=5_000_000
            for e in self.wal(c):e['atNs']=4_999_999
        self.refuse(early,'outside this attempt')
    def test_interval_endpoints_are_inside(self):
        def ends(c):
            c['events'][0]['case']['startedNs']=5_000_000;w=self.wal(c);w[0]['atNs']=5_000_000;w[1]['atNs']=FINAL_NS
        for mode in ('offline-synthetic','vm'):self.assertIn('witness',n.normalize(self.h.build(mode=mode,tweak=ends)))
    def test_an_untimed_tail_cannot_hide_a_tail_later_than_detach(self):
        # the R10-F1 hazard: a late tail excluded from coverage. With one chunk late and typed the existing coverage rule refuses; untimed, the new rule does.
        def late(c):
            self.wal(c)[0]['atNs']=599_500_000
        self.refuse(late,'precedes the last trusted final readback')
        self.fresh()
        def untimed(c):
            self.wal(c)[0].pop('atNs')
        self.refuse(untimed)

class AckClassification(unittest.TestCase):
    """R10-F2: every ACK is classified on its own; a proven-early ACK adds ACK-BEFORE-DURABLE and any ACK in [D_lower, D_upper) still adds DURABILITY-UNPROVEN, once."""
    def commit(self,acks,U=None,sync=(110,300,120,200)):
        t=Trace(1);t.w(100,111,101,0,128);t.s(sync[0],sync[1],111,fsenter=sync[2],fsexit=sync[3])
        return judged(t,[{'end':128,'visible':U is not None,'U':U,'acks':list(acks)}])
    def test_both_orders_of_a_proven_early_and_an_unproven_ack_keep_both_codes(self):
        for acks in itertools.permutations([115,250]):
            with self.subTest(acks=acks):
                result=self.commit(acks,U=400);row=result['perCommit'][0]
                self.assertEqual(sorted(row['codes']),['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN']);self.assertEqual(row['codes'].count('DURABILITY-UNPROVEN'),1)
                with self.assertRaises(n.WitnessError) as caught:n.raise_problems(result['problems'])
                self.assertEqual(caught.exception.code,'ACK-BEFORE-DURABLE');self.assertEqual(caught.exception.also,('DURABILITY-UNPROVEN',))
    def test_every_permutation_of_early_unproven_and_safe_acks(self):
        for acks in itertools.permutations([115,250,300,500]):
            with self.subTest(acks=acks):self.assertEqual(sorted(self.commit(acks,U=400)['perCommit'][0]['codes']),['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN'])
    def test_duplicates_and_many_acks_report_each_code_once(self):
        row=self.commit([115,115,250,250,119,299,120,300],U=400)['perCommit'][0]
        self.assertEqual(sorted(row['codes']),['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN'])
    def test_only_early_acks_give_only_the_violation(self):
        for acks in ([115],[115,119],[119,0]):
            with self.subTest(acks=acks):self.assertEqual(self.commit(acks,U=400)['perCommit'][0]['codes'],['ACK-BEFORE-DURABLE'])
    def test_only_unproven_acks_give_only_the_uncertainty(self):
        for acks in ([120],[299],[120,250,299]):
            with self.subTest(acks=acks):self.assertEqual(self.commit(acks,U=400)['perCommit'][0]['codes'],['DURABILITY-UNPROVEN'])
    def test_acks_at_or_after_the_upper_bound_pass(self):
        for acks in ([300],[300,301,10**9],[]):
            with self.subTest(acks=acks):self.assertEqual(self.commit(acks,U=400)['perCommit'][0]['codes'],[])
    def test_the_boundaries_of_each_ack(self):
        for at,want in ((119,['ACK-BEFORE-DURABLE']),(120,['DURABILITY-UNPROVEN']),(299,['DURABILITY-UNPROVEN']),(300,[])):
            with self.subTest(at=at):self.assertEqual(self.commit([at],U=400)['perCommit'][0]['codes'],want)
    def test_the_publication_bound_is_a_single_value_and_stays_independent_of_the_acks(self):
        # a commit has exactly one U (commit_views binds one logical position's real U). It is classified independently of the ACKs:
        for U,acks,want in ((50,[250],['VISIBLE-BEFORE-DURABLE','DURABILITY-UNPROVEN']),(250,[115],['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN']),(250,[250],['DURABILITY-UNPROVEN']),
                            (50,[115],['ACK-BEFORE-DURABLE','VISIBLE-BEFORE-DURABLE']),(400,[400],[])):
            with self.subTest(U=U,acks=acks):self.assertEqual(sorted(self.commit(acks,U=U)['perCommit'][0]['codes']),sorted(want))
    def test_the_file_sync_point_interval_has_no_uncertainty_for_acks(self):
        t=Trace(1);t.w(100,111,101,0,128);t.f(110,140,111,101)
        row=judged(t,[{'end':128,'visible':True,'U':400,'acks':[139,140,141]}])['perCommit'][0]
        self.assertEqual(row['codes'],['ACK-BEFORE-DURABLE'])
    def test_multi_member_publication_acks_all_land_on_the_publishing_commit(self):
        polls=[{'startNs':0,'endNs':10,'visible':[0,0]},{'startNs':350,'endNs':400,'visible':[0,1]}]
        summary=n.brackets(polls)
        members=[{'operationId':'o'+str(i),'attemptId':'a'+str(i),'positions':[1024+i]} for i in (1,2,3)]
        frame={'lsn':1,'epoch':0,'decoded':{'stream':'s','members':members}}
        marker={'lsn':1,'epoch':0,'position':1024,'crc':1,'size':101}
        transactions=[{'walEnd':128,'added':{'marker':[marker],'frames':[frame],'frontier':[]},'deleted':{'marker':[{'lsn':0,'epoch':0,'position':0,'crc':0,'size':100}],'frames':[]}}]
        orders=list(itertools.permutations([(1,115),(2,250),(3,500)]))
        for order in orders:
            with self.subTest(order=order):
                acks=[{'stream':'s','operationId':'o'+str(i),'attemptId':'a'+str(i),'atNs':at} for i,at in order]
                views=n.commit_views({'profile':'sql01'},transactions,summary,polls,acks)
                self.assertEqual(sorted(views[0]['acks']),[115,250,500]);self.assertEqual(views[0]['U'],400)
                t=Trace(1);t.w(100,111,101,0,128);t.s(110,300,111,fsenter=120,fsexit=200)
                row=n.judge_witness(n.parse_witness(t.render()),{'wal':(1,101),'main':(1,102),'cgroup':111,'walLen':128},views)['perCommit'][0]
                self.assertEqual(sorted(row['codes']),['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN'])
    def test_two_commits_are_classified_independently_and_each_code_counts_per_commit(self):
        t=Trace(1);t.w(100,111,101,0,64);t.w(105,111,101,64,64);t.s(110,300,111,fsenter=120,fsexit=200)
        v=n.judge_witness(n.parse_witness(t.render()),{'wal':(1,101),'main':(1,102),'cgroup':111,'walLen':128},
            [{'end':64,'visible':False,'U':None,'acks':[115,250]},{'end':128,'visible':False,'U':None,'acks':[250]}])
        self.assertEqual([sorted(r['codes']) for r in v['perCommit']],[['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN'],['DURABILITY-UNPROVEN']])
        detail=dict((c,d) for c,d in v['problems'] if c in ('ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN'))
        self.assertEqual(detail,{'ACK-BEFORE-DURABLE':'1 of 2 commits','DURABILITY-UNPROVEN':'2 of 2 commits'})

if __name__=='__main__':unittest.main(verbosity=2)
