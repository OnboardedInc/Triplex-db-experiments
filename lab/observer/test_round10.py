#!/usr/bin/env python3
"""OBS01 round 10 offline gates: F1 split publication, F2 early detach, F3 W1 compare, F4 W3 parity, F5 syncfs interval, R49 clock.
Synthetic traces model what the kernel records; they are never VM evidence."""
import json
from pathlib import Path
import re
import sqlite3
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
import vm_normalizer as n
import vm_planted_writer as planted
import vm_syncwitness as sw
import vm_clockcheck as clockcheck
from vm_fixture import seed,commit
import test_syncwitness as base
from test_syncwitness import Trace,WRITER,NEIGHBOR,US,FINAL_NS

HERE=Path(__file__).resolve().parent
def judged(trace,commits=None,wal_len=128):
    return n.judge_witness(n.parse_witness(trace.render()),{'wal':(1,101),'main':(1,102),'cgroup':111,'walLen':wal_len},
        commits or [{'end':wal_len,'U':500,'acks':[500],'visible':True}])

def one_sync(sync,ack=None,U=None):
    """A single 128-byte commit written at 100, then one file sync ('file', enter, exit), judged with an ACK and/or a publication U."""
    t=Trace(1);t.w(100,111,101,0,128);t.f(sync[1],sync[2],111,101)
    return judged(t,[{'end':128,'U':U,'acks':[ack] if ack is not None else [],'visible':U is not None}])['perCommit'][0]


class SplitPublication(unittest.TestCase):
    """F1: a marker advance and its frame must be one transaction; the refusal is explicit, never a silent drop of a commit's U."""
    def setUp(self):self.h=base.NormalizerCase();self.h.setUp();self.addCleanup(self.h.doCleanups)
    def fresh(self):
        self.h=base.NormalizerCase();self.h.setUp();self.addCleanup(self.h.doCleanups)
    def build_split(self,frame_first=False,mode='offline-synthetic'):
        """Two real SQLite WAL commits carrying one logical publication, as in the reviewer's fixture; payload commit becomes durable late."""
        h=self.h;fx=h.f;frame=fx.db.execute('SELECT * FROM frames').fetchone();marker=fx.db.execute('SELECT * FROM marker').fetchone();fx.db.close()
        fx.sql=fx.root/'split.db';fx.db=seed(fx.sql);fx.main=fx.sql.read_bytes()
        steps=[lambda:fx.db.execute('UPDATE marker SET lsn=?,epoch=?,h=?,position=?,crc=?,size=? WHERE id=1',marker[1:]),lambda:fx.db.execute('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)',frame)]
        for step in (steps[::-1] if frame_first else steps):step();fx.db.commit()
        def tweak(c):
            ends=n.wal_commits(c['wal']['broker']);assert len(ends)==2
            for e in c['trace'].events:
                if e['cg']==WRITER and e['k']=='W' and e['off']>=ends[0]:e['ts']+=300_000
            c['trace'].f(10_700_000,11_000_000,WRITER,c['files']['broker']['-wal'][1]);c['ack']['atNs']=11_100_000
        return h.build(mode=mode,tweak=tweak)
    def test_marker_first_split_refuses_with_its_code_and_the_visibility_violation(self):
        for mode in ('offline-synthetic','vm'):
            with self.subTest(mode=mode):
                self.fresh();raw=self.build_split(mode=mode)
                with self.assertRaises(n.WitnessError) as caught:n.normalize(raw)
                self.assertEqual(caught.exception.code,'PUBLICATION-SPLIT');self.assertIn('VISIBLE-BEFORE-DURABLE',caught.exception.also)
                self.assertIn('marker advanced to lsn 1 without its frame',str(caught.exception));self.assertIn('frame lsn 1 committed without a marker advance',str(caught.exception))
    def test_frame_first_split_refuses_too(self):
        raw=self.build_split(frame_first=True)
        with self.assertRaises(n.WitnessError) as caught:n.normalize(raw)
        self.assertEqual(caught.exception.code,'PUBLICATION-SPLIT');self.assertIn('frame lsn 1 committed without a marker advance',str(caught.exception))
    def test_split_refuses_without_a_witness_in_the_offline_fixture_mode(self):
        h=self.h;fx=h.f;frame=fx.db.execute('SELECT * FROM frames').fetchone();marker=fx.db.execute('SELECT * FROM marker').fetchone();fx.db.close()
        fx.sql=fx.root/'split.db';fx.db=seed(fx.sql);fx.main=fx.sql.read_bytes()
        fx.db.execute('UPDATE marker SET lsn=?,epoch=?,h=?,position=?,crc=?,size=? WHERE id=1',marker[1:]);fx.db.commit()
        fx.db.execute('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)',frame);fx.db.commit()
        events=fx.events()
        with self.assertRaises(n.WitnessError) as caught:n.normalize(fx.frames(events))
        self.assertEqual(caught.exception.code,'PUBLICATION-SPLIT')
    def test_marker_ahead_of_an_empty_frames_table_is_not_a_valid_state(self):
        with tempfile.TemporaryDirectory() as temp:
            db=seed(Path(temp)/'a.db');db.execute('UPDATE marker SET lsn=1');db.commit();db.close()
            raw=(Path(temp)/'a.db').read_bytes()
            with self.assertRaises(n.WitnessError) as caught:n.snapshot(raw,b'','sql01')
            self.assertEqual(caught.exception.code,'PUBLICATION-SPLIT')
            findings=[];connection=n.readonly(Path(temp)/'a.db')
            try:n.read_state(connection,'sql01',findings)
            finally:connection.close()
            self.assertEqual(findings,['SQL01 marker ahead of an empty frames table'])
    def test_atomic_commits_horizon_updates_and_frame_rewrites_are_not_splits(self):
        fx=self.h.f
        fx.db.execute('UPDATE marker SET h=1');fx.db.commit()                       # horizon-only: the published fields do not change
        main,wal=fx.main,Path(str(fx.sql)+'-wal').read_bytes()
        transactions,_=n.history(main,wal,'sql01')                                    # strict: raises on any split
        self.assertEqual(len(transactions),3);self.assertEqual(n.publication_split(transactions),[])
        self.assertEqual([n.marker_advance(t) for t in transactions],[(0,1),None,None])
        self.assertEqual([len(n.new_frames(t)) for t in transactions],[1,0,0])
        n.normalize(fx.frames(fx.events()))                                           # a horizon-only commit is a commit without publication, not a refusal
    def transactions(self,*specs):
        """Hand-made SQL01 transactions: (walEnd, new frame lsns, marker lsn or None, rewritten frame lsns, members)."""
        out=[];last=None
        for end,frames,marker,rewritten,members in specs:
            rows=[{'lsn':l,'epoch':0,'decoded':{'stream':'s','members':[{'operationId':'o'+str(l),'attemptId':'a'+str(l),'positions':[l*1024]}] if members else []}} for l in frames]
            old=[{'lsn':l} for l in rewritten];new=rows+[{'lsn':l,'epoch':0,'decoded':{'stream':'s','members':[]}} for l in rewritten]
            added={'marker':[],'frames':new,'frontier':[]};deleted={'marker':[],'frames':old}
            if marker is not None:
                added['marker']=[{'lsn':marker,'epoch':0,'position':marker*1024,'crc':marker,'size':100+marker}]
                deleted['marker']=[{'lsn':last if last is not None else 0,'epoch':0,'position':(last or 0)*1024,'crc':last or 0,'size':100+(last or 0)}];last=marker
            out.append({'walEnd':end,'added':added,'deleted':deleted})
        return out
    def test_every_frame_bearing_transaction_is_bound_to_its_positions_real_u(self):
        polls=[{'startNs':0,'endNs':10,'visible':[0,0]},{'startNs':100,'endNs':150,'visible':[0,1]}]
        summary=n.brackets(polls);source={'profile':'sql01'}
        split=self.transactions((1000,[],1,[],False),(2000,[1],None,[],True))                 # marker first, frame in the next commit
        views=n.commit_views(source,split,summary,polls,[{'stream':'s','operationId':'o1','attemptId':'a1','atNs':500}])
        self.assertEqual([v['U'] for v in views],[150,150]);self.assertEqual([v['keys'] for v in views],[[(0,1)],[(0,1)]])
        self.assertTrue(all(v['visible'] for v in views));self.assertEqual([v['acks'] for v in views],[[500],[500]])
        self.assertTrue(n.publication_split(split))
        atomic=self.transactions((1000,[1],1,[],True),(2000,[],None,[1],False))                # the second commit rewrites frame 1 (committed_at): not a new publication
        views=n.commit_views(source,atomic,summary,polls,[{'stream':'s','operationId':'o1','attemptId':'a1','atNs':500}])
        self.assertEqual([v['acks'] for v in views],[[500],[]]);self.assertEqual([v['visible'] for v in views],[True,False]);self.assertIsNone(views[1]['U'])
        self.assertEqual(n.publication_split(atomic),[])
    def test_a_publishing_commit_without_a_bound_u_refuses_instead_of_being_skipped(self):
        t=Trace(1);t.w(100,111,101,0,128);t.f(110,120,111,101)
        v=judged(t,[{'end':128,'U':None,'acks':[],'visible':True}])
        self.assertIn('WITNESS-UNBOUND',[c for c,_ in v['problems']])
    def test_publication_d_is_the_latest_durable_instant_of_all_its_commits(self):
        # two commits of one publication: positions take the larger D, so the lag end cannot precede the payload's durability
        t=Trace(1);t.w(100,111,101,0,64);t.f(110,120,111,101);t.w(200,111,101,64,64);t.f(210,400,111,101)
        v=judged(t,[{'end':64,'U':500,'acks':[],'visible':True},{'end':128,'U':500,'acks':[],'visible':True}])
        self.assertEqual([r['D'] for r in v['perCommit']],[120,400]);self.assertEqual(v['problems'],[])


class EarlyDetach(unittest.TestCase):
    """F2: the witness must cover the first observation through the last trusted final readback, in this attempt."""
    def setUp(self):self.h=base.NormalizerCase();self.h.setUp();self.addCleanup(self.h.doCleanups)
    def refuse(self,tweak,fragment):
        for mode in ('offline-synthetic','vm'):
            with self.subTest(mode=mode),self.assertRaises(n.WitnessError) as caught:n.normalize(self.h.build(mode=mode,tweak=tweak))
            self.assertEqual(caught.exception.code,'TRACE-INCOMPLETE');self.assertIn(fragment,str(caught.exception))
    def test_detach_before_the_last_final_readback_refuses(self):
        def early(c):
            c['text']=c['trace'].render(begin=500_000,end=110_400_000)
            for e in c['events']:
                if e['event']=='final':e['atNs']=500_000_000
        self.refuse(early,'precedes the last trusted final readback')
    def test_detach_before_only_one_of_two_finals_refuses(self):
        def one(c):
            finals=[e for e in c['events'] if e['event']=='final'];finals[1]['atNs']=598_000_000;c['text']=c['trace'].render(begin=500_000,end=597_000_000)
        self.refuse(one,'precedes the last trusted final readback')
    def test_detach_before_the_last_tailed_wal_chunk_refuses(self):
        def tail(c):
            for e in c['events']:
                if e['event']=='wal':e['atNs']=599_500_000
        self.refuse(tail,'precedes the last trusted final readback')
    def test_a_final_readback_without_a_trusted_timestamp_refuses(self):
        def untimed(c):
            for e in c['events']:
                if e['event']=='final':e.pop('atNs')
        self.refuse(untimed,'final readback lacks a trusted timestamp')
    def test_attach_after_the_first_observation_refuses(self):
        def late(c):
            # attached before the candidate started, but after the broker's first poll began (the poll is moved earlier; the trace's own events stay after attach)
            c['begin']=9_985_000;c['witness']['firstCandidateStartNs']=9_986_000
            first=next(e for e in c['events'] if e['event']=='poll' and e['source']=='broker');first['startNs']=9_980_000;first['endNs']=9_981_000
        self.refuse(late,'attach after the first observation')
    def test_detach_after_the_observer_end_refuses(self):
        def beyond(c):c['text']=c['trace'].render(begin=500_000,end=700_000_000)
        self.refuse(beyond,'detach after the observer end')
    def test_detach_exactly_at_the_last_readback_is_accepted(self):
        def exact(c):c['text']=c['trace'].render(begin=500_000,end=FINAL_NS)
        for mode in ('offline-synthetic','vm'):self.assertEqual(n.normalize(self.h.build(mode=mode,tweak=exact))['witness']['detachNs'],FINAL_NS)


class W1Compare(unittest.TestCase):
    """F3: W1 compares the complete refusal set, the primary code, the global codes and every commit's outcome."""
    @classmethod
    def setUpClass(cls):base.MatrixCase.setUpClass();cls.m=base.MatrixCase('test_eleven_planted_modes_match_their_codes')
    @classmethod
    def tearDownClass(cls):base.MatrixCase.tearDownClass()
    def test_a_global_refusal_is_a_w1_mismatch_for_every_mode_that_does_not_expect_it(self):
        extras={'UNWITNESSED-WRITE':lambda trace,ops:trace.m(10_500_000,WRITER,self.m.wal_ino),
                'WITNESS-UNBOUND':lambda trace,ops:ops.update(wal=[ops['wal'][0],999]),
                'CHECKPOINT-UNSYNCED':lambda trace,ops:(trace.w(2_000_000_000,WRITER,self.m.main_ino,0,4096),trace.t(2_000_000_100,WRITER,self.m.wal_ino,'t'))}
        for mode in ('full','syncfs','off','normal','ack-early'):
            for code,mutate in extras.items():
                with self.subTest(mode=mode,code=code):
                    result,*_=self.m.run_mode(mode,count=50,mutate=mutate)
                    self.assertIn(code,result['codes'])
                    self.assertTrue(sw.compare(mode,result,50),'W1 accepted '+mode+' despite global '+code)
    def test_positive_modes_must_have_no_problems_at_all(self):
        for mode in ('full','syncfs'):
            result,*_=self.m.run_mode(mode,count=50);self.assertEqual((result['primary'],result['codes'],result['globalCodes']),(None,[],[]));self.assertEqual(sw.compare(mode,result,50),[])
    def test_negative_modes_must_raise_exactly_their_own_codes(self):
        for mode in planted.MODES:
            count=600 if mode=='full-then-off' else 50           # the planted switch to OFF happens after commit 500
            result,*_=self.m.run_mode(mode,count=count)
            self.assertEqual(sw.compare(mode,result,count),[],(mode,result['codes'],result['globalCodes']))
            self.assertEqual(set(result['codes']),planted.expected_codes(mode));self.assertEqual(result['primary'],planted.expected_primary(mode))
            self.assertEqual(set(result['globalCodes']),planted.expected_global(mode))
    def test_mismatches_on_the_set_the_primary_and_per_commit_rows_are_each_reported(self):
        result,*_=self.m.run_mode('off',count=50)
        self.assertEqual(sw.compare('off',result,50),[])
        self.assertTrue(sw.compare('full',result,50));self.assertTrue(sw.compare('normal',result,50))
        wrong={**result,'primary':'ACK-BEFORE-DURABLE'};self.assertTrue(any('primary' in m for m in sw.compare('off',wrong,50)))
        fewer={**result,'perCommit':result['perCommit'][:-1]};self.assertTrue(any('count' in m for m in sw.compare('off',fewer,50)))
        extra={**result,'codes':sorted({*result['codes'],'CHECKPOINT-UNSYNCED'},key=n.WITNESS_CODES.index)}
        self.assertTrue(any('refusal set' in m for m in sw.compare('off',extra,50)))
        self.assertTrue(any('global' in m for m in sw.compare('off',extra,50)))
    def test_the_reviewer_shape_without_global_codes_in_the_result_is_judged_from_the_codes(self):
        t=Trace(1);t.w(100,111,101,0,128);t.f(110,120,111,101);t.m(130,111,101);v=judged(t)
        codes=sorted({c for c,_ in v['problems']},key=n.WITNESS_CODES.index)
        self.assertTrue(sw.compare('full',{'primary':codes[0],'codes':codes,'problems':v['problems'],'perCommit':v['perCommit']},1))


class StreamParity(unittest.TestCase):
    """F4: parse_witness and stream_check run one validation state machine; the same negatives refuse the same way."""
    def trace(self,commits=6):
        t=Trace(1);t.w(100,111,101,0,32)
        for i in range(commits):t.w(1000+i*100,111,101,32+i*64,64);t.f(1040+i*100,1060+i*100,111,101)
        t.s(5000,5400,111,fsenter=5100,fsexit=5300);return t
    def streamed(self,text,stderr=''):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'trace.txt'
            path.write_bytes(text if isinstance(text,bytes) else text.encode());return sw.stream_check(path,stderr)
    def outcome(self,function,*args):
        try:return ('ok',function(*args))
        except n.WitnessError as error:return ('refused',error.code,str(error))
    def negatives(self):
        t=self.trace();text=t.render(cpus=3);lines=text.split('\n')
        first=next(i for i,l in enumerate(lines) if l.startswith('SW1|W'));cpu1=[i for i,l in enumerate(lines) if l.startswith('SW1|') and l.split('|')[1] in 'WFS' and l.split('|')[2]=='1']
        whole_cpu='\n'.join(l for i,l in enumerate(lines) if i not in cpu1)
        regress=next(l for l in lines if l.startswith('SW1|W|0|2|'));fields=regress.split('|');fields[4]='5'
        enter_late=next(l for l in lines if l.startswith('SW1|F|'));f=enter_late.split('|');f[4],f[5]=f[5],f[4]
        out={'whole-cpu-loss: every record of CPU 1 dropped, dump kept':whole_cpu,
            'nonzero dump for a CPU with no records':text+'@n[7]: 2\n','sequence gap':'\n'.join(l for i,l in enumerate(lines) if i!=first),
            'duplicate record':'\n'.join(lines[:first+1]+[lines[first]]+lines[first+1:]),'count mismatch':text.replace('@n[0]: ','@n[0]: 1'),
            'no dump':'\n'.join(l for l in lines if not l.startswith('@n')),'duplicate start':text.replace('SW1|B|','SW1|B|1|1|1|1|1\nSW1|B|',1),
            'duplicate detach':text.replace('\nSW1|Z|','\nSW1|Z|9999999\nSW1|Z|',1),'missing start':'\n'.join(l for l in lines if not l.startswith('SW1|B')),
            'missing detach':'\n'.join(l for l in lines if not l.startswith('SW1|Z')),'late start':'\n'.join(lines[:first]+[lines[0]]+lines[first:]),
            'unsigned field with a sign':text.replace('|0|32\n','|-1|32\n',1),'non-numeric field':text.replace('SW1|W|0|1|','SW1|W|0|x|',1),
            'oversized number':text.replace('|0|32\n','|0|'+'9'*25+'\n',1),'field count':text.replace('SW1|Z|','SW1|Z|1|',1),'unknown record':text.replace('SW1|W','SW1|X',1),
            'garbage line':text+'oops\n','regressed time in sequence':text.replace(regress,'|'.join(fields)),'enter after exit':text.replace(enter_late,'|'.join(f)),
            'record after detach':text+'SW1|M|0|99|5|1|1|1|1|1\n','event before attach':self.trace().render(begin=1500),'event after detach':self.trace().render(end=4000),
            'syncfs interval outside the syscall':text.replace('|5100|5300\n','|5450|5460\n'),'cpu out of range':text.replace('SW1|W|0|1|','SW1|W|99999|1|',1),
            'seq zero':text.replace('SW1|W|0|1|','SW1|W|0|0|',1),'leading space':text.replace('SW1|Z|',' SW1|Z|',1),'control character':text.replace('SW1|Z|','SW1|Z|\x01',1)}
        return text,out
    def test_clean_traces_agree_on_events_cpus_and_bounds(self):
        text,_=self.negatives();whole=n.parse_witness(text);streamed=self.streamed(text)
        self.assertEqual((streamed['events'],streamed['cpus'],streamed['attachNs'],streamed['detachNs']),(len(whole['events']),whole['cpus'],whole['begin']['ts'],whole['end']['ts']))
        shuffled=text.split('\n');body=[i for i,l in enumerate(shuffled) if l.startswith('SW1|') and l[4] in 'WFSMT']
        order=body[::-1];rows=[shuffled[i] for i in order]
        for index,row in zip(body,rows):shuffled[index]=row
        again='\n'.join(shuffled);self.assertEqual(self.streamed(again)['events'],len(whole['events']));self.assertEqual(len(n.parse_witness(again)['events']),len(whole['events']))
    def test_every_loss_and_grammar_negative_refuses_identically_on_both_paths(self):
        _,negatives=self.negatives()
        for name,text in negatives.items():
            with self.subTest(name=name):
                whole=self.outcome(n.parse_witness,text);stream=self.outcome(self.streamed,text)
                self.assertEqual(whole[0],'refused',name);self.assertEqual(whole[1],'TRACE-INCOMPLETE');self.assertEqual(stream,whole)
    def test_stderr_loss_and_error_refuse_on_both_paths(self):
        text,_=self.negatives()
        for stderr in ('Lost 3 events\n','lost 1 event','ERROR: attach failed','FATAL: x'):
            with self.subTest(stderr=stderr):self.assertEqual(self.outcome(self.streamed,text,stderr),self.outcome(n.parse_witness,text,stderr));self.assertEqual(self.outcome(n.parse_witness,text,stderr)[0],'refused')
        for fine in ('Attaching 9 probes...\n','',):self.assertEqual(self.outcome(self.streamed,text,fine)[0],'ok')
    def test_the_reviewer_shape_whole_cpu_loss_is_refused_by_the_streaming_path(self):
        t=Trace(1);t.w(100,111,101,0,128);text=t.render(cpus=1)+'@n[1]: 2\n'
        for function in (n.parse_witness,self.streamed):
            with self.subTest(function=function.__name__),self.assertRaises(n.WitnessError) as caught:function(text)
            self.assertEqual(caught.exception.code,'TRACE-INCOMPLETE');self.assertIn('counted CPU has no records',str(caught.exception))
    def test_invalid_utf8_and_crlf_refuse_in_the_stream(self):
        text,_=self.negatives()
        with self.assertRaisesRegex(n.WitnessError,'not UTF-8'):self.streamed(text.encode()+b'\xff\n')
        with self.assertRaises(n.WitnessError):self.streamed(text.replace('\n','\r\n'))
        with self.assertRaises(n.WitnessError):n.parse_witness(text.replace('\n','\r\n'))
    def test_the_streaming_checker_does_not_hold_events_and_the_cli_reports_the_code(self):
        scan=n.WitnessScan(False);text,_=self.negatives()
        for number,line in enumerate(text.split('\n'),1):scan.feed(line,number)
        self.assertEqual(scan.finish()['events'],[]);self.assertGreater(scan.total,0)
        import subprocess
        with tempfile.TemporaryDirectory() as temp:
            bad=Path(temp)/'bad.txt';bad.write_text(self.trace().render(cpus=1)+'@n[1]: 2\n');stderr=Path(temp)/'e.txt';stderr.write_text('')
            done=subprocess.run([sys.executable,'-B',str(HERE/'vm_syncwitness.py'),'stream-check',str(bad),str(stderr)],capture_output=True,text=True)
            self.assertEqual(done.returncode,2);self.assertIn('TRACE-INCOMPLETE',done.stdout)


class SyncfsInterval(unittest.TestCase):
    """F5 (orchestrator decision): syncfs D is an interval [D_lower, D_upper]; D_upper = syscall exit grants durability; file syncs stay exact."""
    def row(self,*,fs=(0,0),enter=110,exit=300,ack=None,U=None):
        t=Trace(1);t.w(100,111,101,0,128);t.s(enter,exit,111,fsenter=fs[0],fsexit=fs[1])
        return judged(t,[{'end':128,'U':U,'acks':[ack] if ack is not None else [],'visible':U is not None}])['perCommit'][0]
    def test_without_a_recorded_ext4_entry_lower_is_the_syscall_entry(self):
        r=self.row();self.assertEqual((r['Dlower'],r['D'],r['via'],r['codes']),(110,300,'fs',[]))
        self.assertEqual(self.row(ack=109)['codes'],['ACK-BEFORE-DURABLE']);self.assertEqual(self.row(U=109)['codes'],['VISIBLE-BEFORE-DURABLE'])
        for at in (110,250,299):
            self.assertEqual(self.row(ack=at)['codes'],['DURABILITY-UNPROVEN']);self.assertEqual(self.row(U=at)['codes'],['DURABILITY-UNPROVEN'])
        self.assertEqual(self.row(ack=300,U=300)['codes'],[])
    def test_with_the_ext4_entry_lower_moves_later_and_proven_violations_start_there(self):
        r=self.row(fs=(120,200));self.assertEqual((r['Dlower'],r['D']),(120,300))
        self.assertEqual(self.row(fs=(120,200),ack=115)['codes'],['ACK-BEFORE-DURABLE'])            # after the syscall entry, before the filesystem sync began
        self.assertEqual(self.row(fs=(120,200),U=119)['codes'],['VISIBLE-BEFORE-DURABLE'])
        for at in (120,250):self.assertEqual(self.row(fs=(120,200),ack=at,U=at)['codes'],['DURABILITY-UNPROVEN'])
        self.assertEqual(self.row(fs=(120,200),ack=300,U=300)['codes'],[])
    def test_both_a_proven_violation_and_an_unproven_point_report_the_violation_and_the_unproven_code_once(self):
        r=self.row(fs=(120,200),ack=115,U=250);self.assertEqual(sorted(r['codes']),sorted(['ACK-BEFORE-DURABLE','DURABILITY-UNPROVEN']))
    def test_file_syncs_keep_the_exact_first_exit_rule(self):
        for ack,codes in ((139,['ACK-BEFORE-DURABLE']),(140,[]),(141,[])):
            self.assertEqual(one_sync(('file',130,140),ack=ack)['codes'],codes)
        r=one_sync(('file',130,140));self.assertEqual((r['Dlower'],r['D'],r['via']),(140,140,'file'))
        self.assertEqual(one_sync(('file',130,140),U=139)['codes'],['VISIBLE-BEFORE-DURABLE'])
    def test_the_interval_of_a_commit_is_the_min_of_lowers_and_min_of_uppers_over_eligible_syncs(self):
        t=Trace(1);t.w(100,111,101,0,128);t.s(110,300,111);t.f(120,140,111,101)
        r=judged(t,[{'end':128,'U':125,'acks':[],'visible':True}])['perCommit'][0]
        self.assertEqual((r['Dlower'],r['D'],r['via']),(110,140,'file'));self.assertEqual(r['codes'],['DURABILITY-UNPROVEN'])
    def test_a_write_after_the_syscall_entry_is_not_credited_to_that_syncfs(self):
        t=Trace(1);t.w(150,111,101,0,128);t.s(110,300,111,fsenter=160,fsexit=250)
        self.assertEqual(judged(t)['perCommit'][0]['codes'],['SYNC-MISSING'])                       # conservative: eligibility is the syscall entry (documented)
    def test_neighbor_failed_and_nowait_syncfs_still_never_credit(self):
        for change in ({'cg':NEIGHBOR},{'ret':-5},{'wait':0}):
            t=Trace(1);t.w(100,111,101,0,128);t.s(110,300,111,fsenter=120,fsexit=200);t.events[-1].update(change)
            self.assertEqual(judged(t)['perCommit'][0]['codes'],['SYNC-MISSING'],change)
    def test_parser_checks_the_filesystem_interval(self):
        def parse(fsenter,fsexit,enter=110,exit=300):
            t=Trace(1);t.w(100,111,101,0,128);t.s(enter,exit,111,fsenter=fsenter,fsexit=fsexit);return n.parse_witness(t.render())
        parse(0,0);parse(120,200);parse(110,300)
        for bad in ((120,0),(0,200),(109,200),(120,301),(250,200)):
            with self.subTest(bad=bad),self.assertRaises(n.WitnessError):parse(*bad)
    def test_the_normalizer_refuses_durability_unproven_and_a_proven_violation_by_their_own_codes(self):
        for mode in ('offline-synthetic','vm'):
            def syncfs(fsenter,fsexit,ack,upper=10_900_000):
                def tweak(c):
                    c['trace'].events=[e for e in c['trace'].events if not (e['k']=='F' and e['cg']==WRITER)]
                    c['trace'].s(10_200_000,upper,WRITER,fsenter=fsenter,fsexit=fsexit);c['ack']['atNs']=ack
                return tweak
            h=base.NormalizerCase();h.setUp()
            try:
                with self.subTest(mode=mode,case='unproven'):
                    with self.assertRaises(n.WitnessError) as caught:n.normalize(h.build(mode=mode,tweak=syncfs(10_300_000,10_400_000,10_450_000)))
                    self.assertEqual(caught.exception.code,'DURABILITY-UNPROVEN')
                    self.assertNotIn('ACK-BEFORE-DURABLE',(caught.exception.code,*caught.exception.also))
                with self.subTest(mode=mode,case='proven'):
                    with self.assertRaises(n.WitnessError) as caught:n.normalize(h.build(mode=mode,tweak=syncfs(10_300_000,10_400_000,10_250_000)))
                    self.assertIn('ACK-BEFORE-DURABLE',(caught.exception.code,*caught.exception.also))
                with self.subTest(mode=mode,case='after-upper'):
                    result=n.normalize(h.build(mode=mode,tweak=lambda c:syncfs(10_300_000,10_350_000,10_450_000,upper=10_400_000)(c)))
                    broker=result['stores']['broker'];self.assertEqual(broker['durability']['commits'][0]['via'],'fs')
                    self.assertEqual((broker['positions'][0]['Dlower'],broker['positions'][0]['D']),(10_300_000,10_400_000))
            finally:h.f.tearDown()


class ClockAndProgram(unittest.TestCase):
    """R49: every timestamp in the trace program is nsecs(monotonic); W0 compares it with the observer's CLOCK_MONOTONIC."""
    def code(self):
        text=(HERE/'vm_syncwitness.bt').read_text();return '\n'.join(l for l in text.split('\n') if not l.strip().startswith('//'))
    def test_no_bare_nsecs_remains_and_every_timestamp_is_monotonic(self):
        code=self.code();self.assertEqual(re.findall(r'\bnsecs\b(?!\(monotonic\))',code),[])
        self.assertEqual(len(re.findall(r'nsecs\(monotonic\)',code)),15)
        self.assertNotRegex(code,r'nsecs\((boot|tai|realtime)')
    def test_the_s_record_format_matches_the_parser_layout_and_the_new_hooks_exist(self):
        code=self.code();self.assertIn('fentry:vmlinux:ext4_sync_fs',code);self.assertIn('fexit:vmlinux:ext4_sync_fs',code)
        formats=[f for f in re.findall(r'printf\("(SW1\|S\|[^"]*?)\\n"',code)];self.assertEqual(len(formats),2)
        for fmt in formats:self.assertEqual(len(fmt.split('|'))-2,len(n.SW_LAYOUT['S'].split()))
        self.assertIn('clear(@sfe); clear(@sfx);',code)
    def test_the_clock_helper_stamps_each_line_on_receipt_and_reports_the_children_exit(self):
        import subprocess
        child=['python3','-c',"import time\nfor i in range(5):\n m=time.monotonic_ns();print('CK|%d|%d'%(m,m+7),flush=True);time.sleep(.01)"]
        done=subprocess.run([sys.executable,'-B',str(HERE/'vm_clockcheck.py'),'--',*child],capture_output=True,text=True,timeout=30);self.assertEqual(done.returncode,0,done.stderr)
        rows=[json.loads(l) for l in done.stdout.splitlines()];self.assertEqual(len(rows),5)
        for row in rows:self.assertGreaterEqual(row['receivedNs'],row['monotonicNs']);self.assertEqual(row['bootNs']-row['monotonicNs'],7);self.assertLess(row['receivedNs']-row['monotonicNs'],5_000_000_000)
        bad=subprocess.run([sys.executable,'-B',str(HERE/'vm_clockcheck.py'),'--','python3','-c','import sys;sys.exit(3)'],capture_output=True,text=True,timeout=30);self.assertNotEqual(bad.returncode,0)
        junk=subprocess.run([sys.executable,'-B',str(HERE/'vm_clockcheck.py'),'--','python3','-c','print("nonsense")'],capture_output=True,text=True,timeout=30);self.assertNotEqual(junk.returncode,0)
    def test_the_python_parse_of_a_clock_line_is_strict(self):
        self.assertEqual(clockcheck.parse_line('CK|5|9'),(5,9))
        for bad in ('CK|5','CK|-1|2','CK|a|b','XX|1|2','CK|1|2|3',' CK|1|2'):
            with self.subTest(bad=bad),self.assertRaises(ValueError):clockcheck.parse_line(bad)


class R49Image(unittest.TestCase):
    """The R49 image recipe as a Dockerfile: pinned, not built here (a build downloads packages and waits for approval)."""
    def text(self):return (HERE/'bpftrace-image/Dockerfile').read_text()
    def test_pins(self):
        t=self.text()
        for needle in ('ubuntu:24.04@sha256:19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e','BPFTRACE_VERSION=0.20.2-1ubuntu4.3','"bpftrace=${BPFTRACE_VERSION}"','LLVM_VERSION=1:18.1.3-1ubuntu1','LIBBPFCC_VERSION=0.29.1+ds-1ubuntu7','"libbpfcc=${LIBBPFCC_VERSION}"',
                       '38525fa2d1d8764c7844d76bfaf807fef2d9242673f81532396b5d147115499a','9fdecc60d0528466bfbbc141aefd2788ab3bc5459a9ff9c9261fe067a3af3b5c',
                       'f04cf0e22e25fb4706b2175a7c262c20caae8259b442816207fc68a142e63627','11d80aca24ad71a7d659870941456b4884970d3326afe640c571299f8a7f4e8e',
                       '61ac559c20b968a1857b1544a64d2126052c0ac7432b2675cf535fa95de10aca','Pin-Priority: 1001','--no-install-recommends','--download-only','sha256sum -c','v0.20.2'):
            self.assertIn(needle,t)
        self.assertNotRegex(t,r'(?m)^FROM [^\n]*:latest');self.assertNotIn('curl',t);self.assertNotIn('wget',t);self.assertNotIn('add-apt-repository',t)
        self.assertRegex(t,r'(?m)^FROM --platform=linux/arm64 ubuntu:24\.04@sha256:[0-9a-f]{64}')
        self.assertEqual(len(re.findall(r'(?m)^FROM ',t)),1)


if __name__=='__main__':unittest.main(verbosity=2)
