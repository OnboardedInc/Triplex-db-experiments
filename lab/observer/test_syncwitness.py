#!/usr/bin/env python3
"""OBS01 round 9 offline gates for the kernel sync witness. Synthetic traces model what the kernel records; they are never VM evidence."""
import base64
import copy
import json
from pathlib import Path
import random
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
import vm_normalizer as n
import vm_planted_writer as planted
import vm_syncwitness as sw
from vm_fixture import seed,commit
import test_vm
from test_vm import DOMAIN,BOOT

def uuid_hex():
    import uuid;return uuid.uuid4().hex
WRITER=111;NEIGHBOR=999;DIR_INO=7;US=1000

class Trace:
    """Collects kernel-shaped events and renders bpftrace text with per-CPU sequence numbers and the @n dump."""
    def __init__(self,dev,dirs=None):self.dev=dev;self.dirs=dirs or [(dev,DIR_INO)];self.events=[]
    def w(self,ts,cg,ino,off,ret,parent=DIR_INO):self.events.append({'k':'W','ts':ts,'cg':cg,'dev':self.dev,'ino':ino,'parent':parent,'off':off,'ret':ret})
    def f(self,enter,ts,cg,ino,ret=0,datasync=1,parent=DIR_INO):self.events.append({'k':'F','enter':enter,'ts':ts,'cg':cg,'dev':self.dev,'ino':ino,'parent':parent,'datasync':datasync,'ret':ret})
    def s(self,enter,ts,cg,wait=1,ret=0):self.events.append({'k':'S','enter':enter,'ts':ts,'cg':cg,'dev':self.dev,'wait':wait,'ret':ret})
    def m(self,ts,cg,ino,parent=DIR_INO):self.events.append({'k':'M','ts':ts,'cg':cg,'dev':self.dev,'ino':ino,'parent':parent})
    def t(self,ts,cg,ino,op,off=0,length=0):self.events.append({'k':'T','ts':ts,'cg':cg,'dev':self.dev,'ino':ino,'op':op,'off':off,'len':length})
    def render(self,begin=1,end=None,cpus=3,drop=(),extra=()):
        ordered=sorted(self.events,key=lambda e:e['ts']);end=end if end is not None else ordered[-1]['ts']+1 if ordered else begin+1
        d=self.dirs;lines=['SW1|B|%d|%d|%d|%d|%d'%(begin,d[0][0],d[0][1],d[-1][0],d[-1][1])];seq={}
        for index,event in enumerate(ordered):
            cpu=index%cpus;seq[cpu]=seq.get(cpu,0)+1;record={**event,'cpu':cpu,'seq':seq[cpu]}
            lines.append('|'.join(['SW1',event['k']]+[str(record[name]) for name in n.SW_LAYOUT[event['k']].split()]))
        lines.append('SW1|Z|%d'%end);lines.append('')
        lines.extend('@n[%d]: %d'%(cpu,count) for cpu,count in sorted(seq.items()))
        return '\n'.join(lines)+'\n'

def frame_writes(wal,start,end):
    """The two write() calls SQLite makes per frame, split from the real WAL byte range."""
    size=int.from_bytes(wal[8:12],'big');at=start;calls=[]
    while at<end:calls.append((at,24));calls.append((at+24,size));at+=24+size
    return calls

class MatrixCase(unittest.TestCase):
    """The eleven W1 planted modes and the 4.3 rows, judged through the same code path the VM receipts use."""
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();root=Path(cls.temp.name);db=seed(root/'broker.db');db.execute('PRAGMA synchronous=OFF')
        for i in range(1,1001):commit(db,i)
        cls.wal=(root/'broker.db-wal').read_bytes();cls.main=(root/'broker.db').read_bytes();db.close();cls.ends=n.wal_commits(cls.wal)
        cls.st=(254<<8)|1;cls.dev=n.kernel_dev(cls.st);cls.wal_ino=101;cls.main_ino=102;cls.other_ino=103
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def synth(self,mode,count=1000,mutate=None):
        trace=Trace(self.dev);ops={'format':'w1-planted-writer/1','mode':mode,'count':count,'dir':[self.st,DIR_INO],'main':[self.st,self.main_ino],'wal':[self.st,self.wal_ino],'acks':[]}
        previous=32
        if mode!='mmap':trace.w(1_000,WRITER,self.wal_ino,0,32)
        for index in range(1,count+1):
            t=10_000_000+index*1_000_000;end=self.ends[index-1];full=mode in ('full','syncfs') or (mode=='full-then-off' and index<=planted.SWITCH)
            if mode=='sync-before-write':trace.f(t,t+5*US,WRITER,self.wal_ino)
            if mode=='mmap':trace.m(t+10*US,WRITER,self.wal_ino);trace.f(t+200*US,t+300*US,WRITER,self.wal_ino)
            else:
                for k,(off,length) in enumerate(frame_writes(self.wal,previous,end)):trace.w(t+10*US+k*US,WRITER,self.wal_ino,off,length)
            previous=end;ack=t+400*US
            if full and mode!='syncfs':trace.f(t+200*US,t+300*US,WRITER,self.wal_ino)
            if mode=='syncfs':trace.s(t+200*US,t+300*US,WRITER)
            if mode=='ack-early':trace.f(t+1500*US,t+1600*US,WRITER,self.wal_ino)
            if mode=='sync-other-file':trace.f(t+200*US,t+300*US,WRITER,self.other_ino)
            if mode=='neighbor-sync':trace.s(t+200*US,t+300*US,NEIGHBOR)
            ops['acks'].append({'lsn':index,'atNs':ack})
        if mode=='normal':
            t=10_000_000+count*1_000_000+500*US;trace.f(t,t+100*US,WRITER,self.wal_ino);trace.w(t+110*US,WRITER,self.main_ino,0,4096);trace.f(t+200*US,t+300*US,WRITER,self.main_ino)
        if mutate:mutate(trace,ops)
        return trace,ops
    def run_mode(self,mode,count=1000,mutate=None):
        trace,ops=self.synth(mode,count,mutate);self.assertEqual(n.kernel_dev(self.st),self.dev)
        wal=self.wal[:self.ends[count-1]]
        return sw.judge_run(trace.render(),'',ops,wal,WRITER),ops,wal
    def test_eleven_planted_modes_match_their_codes(self):
        for mode in planted.MODES:
            with self.subTest(mode=mode):
                result,ops,wal=self.run_mode(mode)
                self.assertEqual(sw.compare(mode,result,1000),[],result['problems'][:3])
                if mode in ('full','syncfs'):self.assertEqual((result['primary'],result['codes']),(None,[]))
                if mode=='full':
                    self.assertTrue(all(r['D']<a['atNs'] and r['W']<r['D'] for r,a in zip(result['perCommit'],ops['acks'])))
                    self.assertEqual({r['via'] for r in result['perCommit']},{'file'})
                if mode=='syncfs':self.assertEqual({r['via'] for r in result['perCommit']},{'fs'})
                if mode=='full-then-off':
                    rows=result['perCommit'];self.assertTrue(all(r['D'] is not None for r in rows[:500]) and all(r['D'] is None for r in rows[500:]))
                if mode=='sync-before-write':self.assertEqual(result['perCommit'][-1]['codes'],['SYNC-MISSING'])
                if mode=='normal':self.assertEqual({r['D'] for r in result['perCommit']},{result['perCommit'][0]['D']})
                if mode not in ('full','syncfs'):self.assertEqual(result['primary'],{'full-then-off':'SYNC-MISSING','sync-before-write':'SYNC-MISSING','mmap':'UNWITNESSED-WRITE'}.get(mode,planted.expected(mode,1,1000)))
    def test_neighbor_sync_is_never_credited_even_beside_an_honest_writer(self):
        def mutate(trace,ops):
            for index in range(1,1001):t=10_000_000+index*1_000_000;trace.s(t+150*US,t+250*US,NEIGHBOR)  # exits before the writer's own sync
        result,ops,_=self.run_mode('full',mutate=mutate)
        self.assertIsNone(result['primary']);self.assertTrue(all(r['D']==10_000_000+(i+1)*1_000_000+300*US for i,r in enumerate(result['perCommit'])))
    def test_failed_and_wrong_syncs_are_not_credited(self):
        for name,change in (('failed-ret',lambda e:e.update(ret=-5)),('nowait',lambda e:e.update(wait=0))):
            def mutate(trace,ops,change=change,name=name):
                kind='F' if name=='failed-ret' else 'S'
                for e in trace.events:
                    if e['k']==kind:change(e)
            with self.subTest(name=name):
                result,*_=self.run_mode('full' if name=='failed-ret' else 'syncfs',mutate=mutate);self.assertEqual(result['primary'],'SYNC-MISSING')
        def sync_precedes_all_writes(trace,ops):
            for e in trace.events:
                if e['k']=='F':e['enter']=e['ts']=5_000
        result,*_=self.run_mode('full',mutate=sync_precedes_all_writes);self.assertEqual(result['primary'],'SYNC-MISSING')
    def test_unwitnessed_write_rows(self):
        def hole(trace,ops):trace.events=[e for e in trace.events if not (e['k']=='W' and 100000<=e['off']<200000)]
        def foreign(trace,ops):
            for e in trace.events[:6]:
                if e['k']=='W':e['cg']=NEIGHBOR
        def mkwrite(trace,ops):trace.m(10_500_000,WRITER,self.wal_ino)
        def punch(trace,ops):trace.t(10_600_000,WRITER,self.wal_ino,'p',4096,4096)
        def foreign_db(trace,ops):trace.w(10_700_000,NEIGHBOR,self.main_ino,0,4096)
        for name,mutate in (('uncovered-bytes',hole),('foreign-cgroup',foreign),('mkwrite',mkwrite),('hole-punch',punch),('foreign-database-write',foreign_db)):
            with self.subTest(name=name):
                result,*_=self.run_mode('full',mutate=mutate);self.assertEqual(result['primary'],'UNWITNESSED-WRITE',result['problems'])
    def test_checkpoint_unsynced_and_restart_generation(self):
        def checkpoint(synced):
            def mutate(trace,ops):
                t=2_000_000_000;trace.w(t,WRITER,self.main_ino,0,4096)
                if synced:trace.f(t+10*US,t+20*US,WRITER,self.main_ino)
                trace.t(t+30*US,WRITER,self.wal_ino,'t')
                # truncate then the same bytes rewritten and synced: a second generation covered entirely by later writes
                previous=0;trace.w(t+40*US,WRITER,self.wal_ino,0,32);previous=32
                for index in range(1,1001):
                    u=t+1_000_000+index*1_000_000
                    for k,(off,length) in enumerate(frame_writes(self.wal,previous,self.ends[index-1])):trace.w(u+k*US,WRITER,self.wal_ino,off,length)
                    previous=self.ends[index-1];trace.f(u+200*US,u+300*US,WRITER,self.wal_ino);ops['acks'][index-1]['atNs']=u+400*US
            return mutate
        result,*_=self.run_mode('full',mutate=checkpoint(False));self.assertEqual(result['primary'],'CHECKPOINT-UNSYNCED',result['problems'])
        result,*_=self.run_mode('full',mutate=checkpoint(True));self.assertIsNone(result['primary'],result['problems'])
        def restart_by_header(trace,ops):trace.w(1_900_000_000,WRITER,self.main_ino,0,4096);trace.w(2_000_000_000,WRITER,self.wal_ino,0,32)
        result,*_=self.run_mode('full',mutate=restart_by_header);self.assertIn('CHECKPOINT-UNSYNCED',result['codes'])
    def test_trace_incomplete_rows_from_the_parser(self):
        trace,ops=self.synth('full',20);text=trace.render()
        lines=text.split('\n');first_event=next(i for i,l in enumerate(lines) if l.startswith('SW1|W'))
        cases={'missing start':'\n'.join(l for l in lines if not l.startswith('SW1|B')),
               'missing detach':'\n'.join(l for l in lines if not l.startswith('SW1|Z')),
               'dropped event (sequence gap)':'\n'.join(l for i,l in enumerate(lines) if i!=first_event),
               'duplicate record':'\n'.join(lines[:first_event+1]+[lines[first_event]]+lines[first_event+1:]),
               'count mismatch (tail loss)':text.replace('@n[0]: ','@n[0]: 1'),
               'no per-CPU dump':'\n'.join(l for l in lines if not l.startswith('@n')),
               'garbage line':text+'oops\n','unknown record':text.replace('SW1|W','SW1|X',1),'field count':text.replace('SW1|Z|','SW1|Z|1|',1),
               'negative offset':text.replace('|0|32\n','|-1|32\n',1),'late event after detach':text+'SW1|M|0|99|5|1|1|1|1|1\n'}
        for name,broken in cases.items():
            with self.subTest(name=name),self.assertRaises(n.WitnessError) as caught:n.parse_witness(broken)
            self.assertEqual(caught.exception.code,'TRACE-INCOMPLETE')
        for stderr in ('Lost 3 events\n','lost 1 event','ERROR: attach failed'):
            with self.subTest(stderr=stderr),self.assertRaises(n.WitnessError):n.parse_witness(text,stderr)
        self.assertEqual(len(n.parse_witness(text,'Attaching 9 probes...\n')['events']),len(trace.events))
    def test_out_of_order_file_is_accepted_but_regressed_time_is_not(self):
        trace,_=self.synth('full',20);text=trace.render();lines=text.split('\n')
        body=[l for l in lines if l.startswith('SW1|') and l[4] in 'WFSMT'];random.Random(3).shuffle(body)
        shuffled='\n'.join([l for l in lines if l.startswith('SW1|B')]+body+[l for l in lines if not l.startswith('SW1|') or l[4]=='Z'])
        self.assertEqual(n.parse_witness(shuffled)['events'],n.parse_witness(text)['events'])
        record=next(l for l in lines if l.startswith('SW1|W|0|2|'));fields=record.split('|');fields[4]='5'   # cpu 0 seq 2 earlier than its seq 1
        with self.assertRaisesRegex(n.WitnessError,'regressed'):n.parse_witness(text.replace(record,'|'.join(fields)))
    def test_parser_fuzz_never_crashes_and_never_silently_changes_events(self):
        trace,_=self.synth('full',30);text=trace.render();clean=n.parse_witness(text)['events'];rng=random.Random(20261109);lines=text.split('\n');refused=0
        for round in range(3000):
            mutated=list(lines);kind=rng.randrange(8);at=rng.randrange(len(mutated))
            if kind==0:del mutated[at]
            elif kind==1:mutated.insert(at,mutated[rng.randrange(len(mutated))])
            elif kind==2:j=rng.randrange(len(mutated));mutated[at],mutated[j]=mutated[j],mutated[at]
            elif kind==3 and mutated[at]:
                s=mutated[at];p=rng.randrange(len(s));mutated[at]=s[:p]+rng.choice('0123456789|-@ x\x00é')+s[p+1:]
            elif kind==4:mutated[at]=mutated[at][:rng.randrange(len(mutated[at])+1)]
            elif kind==5:mutated.insert(at,rng.choice(['SW1|W|0|1','SW1|F|9|9|9','@n[0]: x','SW1|B|1|2|3|4|5','\x00','SW1|W|'+'9'*40]))
            elif kind==6:mutated[at]=mutated[at].replace('|','||',1)
            else:mutated=mutated[:at]
            try:parsed=n.parse_witness('\n'.join(mutated))['events']
            except n.WitnessError as error:refused+=1;self.assertIn(error.code,n.WITNESS_CODES)
            else:self.assertEqual(len(parsed),len(clean),'an accepted mutation changed the number of events')
        self.assertGreater(refused,1000)
        for broken in (b'\xff\xfe'.decode('latin-1')+'junk',None,5):
            with self.assertRaises(n.WitnessError):n.parse_witness(broken)

# One fixture per refusal code (R48 8.3) over the broker/consumer normalizer fixture; shared with the round 9 probe receipt.
def _drop_sync(c):c['trace'].events=[e for e in c['trace'].events if not (e['k']=='F' and e['cg']==WRITER)]
def _early_ack(c):c['ack']['atNs']=10_250_000
def _late_sync(c):                                           # sync exits after the first positive poll ended (U=10.55 ms); the ACK follows it
    for e in c['trace'].events:
        if e['k']=='F' and e['cg']==WRITER:e['enter']=10_800_000;e['ts']=10_900_000
    c['ack']['atNs']=11_000_000
def _mmap(c):c['trace'].m(10_150_000,WRITER,c['files']['broker']['-wal'][1])
def _foreign(c):
    for e in c['trace'].events:
        if e['k']=='W' and e['cg']==WRITER:e['cg']=NEIGHBOR;break
def _punch(c):c['trace'].t(10_600_000,WRITER,c['files']['broker']['-wal'][1],'p',4096,4096)
def _meta(field,value):
    def change(c):c['meta'][field]=value
    return change
def _lost(c):c['stderr']=b'Lost 7 events\n'
def _late_attach(c):c['begin']=2_000_000
def _cgroup(c):c['cgs']['broker']=424242
def _directory(c):c['witness']['stores']['broker']['dir']=[c['dirs'][0],c['dirs'][1]+1]
def _second_dir(c):c['trace'].dirs=[c['dirs'],(c['dirs'][0],c['dirs'][1]+5)]
def _device(c):
    for sid in ('broker','consumer'):c['witness']['stores'][sid]['dir']=[c['dirs'][0]+1,c['dirs'][1]]
    c['trace'].dirs=[(c['dirs'][0]+1,c['dirs'][1])]
def _stray_ack(c):c['ack']['operationId']='someone-else'
def _both(c):_drop_sync(c);_mmap(c)
CODE_FIXTURES={'sync-missing':('SYNC-MISSING',_drop_sync),'ack-before-durable':('ACK-BEFORE-DURABLE',_early_ack),'visible-before-durable':('VISIBLE-BEFORE-DURABLE',_late_sync),
    'mmap-write':('UNWITNESSED-WRITE',_mmap),'foreign-cgroup-write':('UNWITNESSED-WRITE',_foreign),'hole-punch':('UNWITNESSED-WRITE',_punch),
    'attach-after-candidate':('TRACE-INCOMPLETE',_late_attach),'lost-events':('TRACE-INCOMPLETE',_lost),'program-hash':('TRACE-INCOMPLETE',_meta('programSha256','q'*64)),
    'kernel-release':('TRACE-INCOMPLETE',_meta('kernelRelease','6.9.0')),'boot-id':('TRACE-INCOMPLETE',_meta('bootId','99999999-2222-3333-4444-555555555555')),
    'container-id':('WITNESS-UNBOUND',_meta('containerId','x'*64)),'cgroup-id':('WITNESS-UNBOUND',_cgroup),'directory-inode':('WITNESS-UNBOUND',_directory),
    'extra-directory':('WITNESS-UNBOUND',_second_dir),'device':('WITNESS-UNBOUND',_device),'unbound-ack':('WITNESS-UNBOUND',_stray_ack),'mmap-and-missing-sync':('UNWITNESSED-WRITE',_both)}

class NormalizerCase(unittest.TestCase):
    """Whole-normalizer joins: broker (sql01) and consumer (fd01) with a synthetic kernel trace, offline-synthetic and vm modes."""
    def setUp(self):self.f=test_vm.VmObserver();self.f.setUp();self.addCleanup(self.f.tearDown)
    def build(self,delay=100,mode='offline-synthetic',cutoff=None,**tweaks):
        f=self.f;events=f.events(delay);case=events[0]['case'];stat=f.root.stat();dev=n.kernel_dev(stat.st_dev);dirs=(dev,stat.st_ino)
        files={sid:next(e for e in events if e['event']=='final' and e['source']==sid)['files'] for sid in ('broker','consumer')}
        wal={sid:n.unblob(next(e for e in events if e['event']=='wal' and e['source']==sid)['bytes']) for sid in ('broker','consumer')}
        trace=Trace(dev,[dirs]);cgs={'broker':WRITER,'consumer':222};acks=[]
        for sid,base in (('broker',10_000_000),('consumer',10_000_000+delay*1_000_000)):
            ends=n.wal_commits(wal[sid]);ino=files[sid]['-wal'][1];previous=32
            trace.w(base-9_000,cgs[sid],ino,0,32)
            for k,(off,length) in enumerate(frame_writes(wal[sid],32,ends[-1])):trace.w(base+100*US+k*US,cgs[sid],ino,off,length)
            trace.f(base+200*US,base+300*US,cgs[sid],ino)
        stream=json.loads(f.db.execute('SELECT payload FROM frames WHERE lsn=1').fetchone()[0])
        ack={'event':'driver-ack','source':'broker','stream':stream['s'],'operationId':stream['m'][0]['o'],'attemptId':stream['m'][0]['a'],'atNs':10_400_000,'domain':DOMAIN}
        witness={'containerId':'w'*64,'programSha256':'p'*64,'kernelRelease':'6.8.0-test','firstCandidateStartNs':1_000_000,
                 'stores':{sid:{'dir':list(dirs),'cgroupId':cgs[sid]} for sid in cgs}}
        meta={'programSha256':'p'*64,'bootId':BOOT,'kernelRelease':'6.8.0-test','containerId':'w'*64,'bpftraceVersion':'test'}
        context={'trace':trace,'witness':witness,'meta':meta,'ack':ack,'events':events,'cgs':cgs,'files':files,'wal':wal,'dirs':dirs}
        for change in tweaks.values():change(context)
        text=context.get('text') or trace.render(begin=context.get('begin',500_000),end=599_000_000,drop=())
        events=context['events'];events[0]['case']['witness']=witness
        if mode=='vm':events[0]['case']['clockMode']='vm'
        runId=f.run
        extra=[{'event':'domain','role':'witness','domain':DOMAIN,'runId':runId},{'event':'witness-meta','meta':meta,'runId':runId},
               *[{'event':'witness-bind','source':sid,'cgroupId':cg,'runId':runId} for sid,cg in context['cgs'].items()],
               {'event':'witness-stderr','bytes':n.blob(context.get('stderr',b'')),'runId':runId}]
        raw=text.encode();half=len(raw)//2
        for offset,part in ((0,raw[:half]),(half,raw[half:])):extra.append({'event':'witness-trace','offset':offset,'bytes':n.blob(part),'runId':runId})
        if context.get('ack',ack) is not None:extra.append({**context['ack'],'runId':runId})
        events=events[:-2]+extra+events[-2:]
        if mode=='vm':return self.vm_frames(events)
        return f.frames(events)
    def vm_frames(self,events):
        case=events[0]['case'];result=[]
        for i,event in enumerate(events):
            payload=n.packed(event);result.append(n.packed({'runId':self.f.run,'sourceId':'H6','engineContainerId':'e'*64,'caseSha256':n.sha(n.packed(case)),'tStartMono':i*900/(len(events)-1),'tEndMono':i*900/(len(events)-1),
                'runStartedMono':0,'rawBase64':base64.b64encode(payload).decode(),'rawSha256':n.sha(payload)}))
        return b'\n'.join(result)+b'\n'
    def refused(self,code,**kwargs):
        with self.assertRaises(n.WitnessError) as caught:n.normalize(self.build(**kwargs))
        self.assertEqual(caught.exception.code,code,str(caught.exception));self.assertTrue(str(caught.exception).startswith('F2 '+code))
        return caught.exception
    def test_full_witness_accepts_offline_and_vm_and_keeps_the_four_delay_brackets(self):
        for delay in (100,249,251,400):
            for mode in ('offline-synthetic','vm'):
                with self.subTest(delay=delay,mode=mode):
                    result=n.normalize(self.build(delay,mode));broker=result['stores']['broker'];consumer=result['stores']['consumer']
                    a=broker['positions'][0];b=consumer['positions'][0];truth=delay*1_000_000
                    self.assertEqual(broker['durability']['basis'],'kernel-witness');self.assertIsNone(broker['writerState'])
                    self.assertLessEqual(a['D'],a['U']);self.assertLessEqual(b['D'],b['U']);self.assertEqual(b['durableEndNs'],b['U'])
                    self.assertLessEqual(b['L']-a['U'],truth);self.assertGreaterEqual(b['durableEndNs']-a['L'],truth)
                    self.assertLessEqual(b['durableEndNs']-a['L']-truth,broker['publication']['measuredMaxPeriodNs'])
                    self.assertEqual(broker['durability']['ackCount'],1);self.assertEqual(result['witness']['lostEvents'],0)
                    self.assertEqual(broker['durability']['commits'][0]['via'],'file')
    def test_vm_mode_without_a_witness_still_refuses_like_round_8(self):
        f=self.f;events=f.events();events[0]['case']['clockMode']='vm'
        with self.assertRaisesRegex(n.WitnessError,'F2 TRACE-INCOMPLETE'):n.normalize(self.vm_frames(events))
        with self.assertRaisesRegex(ValueError,'F2'):n.durability_state(f.events()[0]['case']['sources'][0],'vm')
    def test_round_8_f2_negatives_replayed_with_traces_still_refuse(self):
        def off_writer(c):c['trace'].events=[e for e in c['trace'].events if e['k']!='F']      # synchronous=OFF (also FULL-at-start then OFF after ready: the commit after ready has no sync)
        def normal(c):                                                                           # NORMAL: WAL synced only at a later checkpoint, after the ACK and the publication
            for e in c['trace'].events:
                if e['k']=='F':e['enter']+=3_000_000;e['ts']+=3_000_000
        events=self.f.events();self.assertTrue(all(s['writerState']['pragmas']['synchronous']==2 for s in events[0]['case']['sources']))
        for name,change,code in (('synchronous-off',off_writer,'SYNC-MISSING'),('normal',normal,'ACK-BEFORE-DURABLE')):
            for mode in ('offline-synthetic','vm'):
                with self.subTest(name=name,mode=mode):self.refused(code,mode=mode,tweak=change)   # the FULL declaration in the case is ignored
    def test_each_normalizer_code_has_its_exact_fixture(self):
        for name,(code,change) in CODE_FIXTURES.items():
            with self.subTest(fixture=name):self.refused(code,tweak=change)
        # a vm-mode run must carry the same refusals
        self.refused('SYNC-MISSING',mode='vm',tweak=CODE_FIXTURES['sync-missing'][1])
        # codes combine deterministically: the primary is the most fundamental one, the rest are listed
        error=self.refused('UNWITNESSED-WRITE',tweak=CODE_FIXTURES['mmap-and-missing-sync'][1]);self.assertEqual(error.also,('SYNC-MISSING',))
        # a driver ACK from another clock domain is not a witness refusal but still a refusal
        with self.assertRaises(ValueError):n.normalize(self.build(tweak=lambda c:c['ack'].update(domain={**DOMAIN,'bootId':'99999999-2222-3333-4444-555555555555'})))
    def decode(self,raw):return [json.loads(base64.b64decode(json.loads(line)['rawBase64'])) for line in raw.splitlines()]
    def test_trace_chunk_gap_utf8_and_missing_stream(self):
        first=lambda events:next(i for i,e in enumerate(events) if e['event']=='witness-trace')
        events=self.decode(self.build());events[first(events)]['offset']+=1
        with self.assertRaisesRegex(n.WitnessError,'TRACE-INCOMPLETE'):n.normalize(self.f.frames(events))
        events=self.decode(self.build());events[first(events)]['bytes']=n.blob(b'\xff\xfe')
        with self.assertRaisesRegex(n.WitnessError,'TRACE-INCOMPLETE'):n.normalize(self.f.frames(events))
        events=[e for e in self.decode(self.build()) if e['event']!='witness-trace']
        with self.assertRaisesRegex(n.WitnessError,'TRACE-INCOMPLETE'):n.normalize(self.f.frames(events))
    def test_consumer_lag_end_is_max_of_publication_and_durable(self):
        def late_consumer_sync(c):                                  # consumer record durable 20 ms after the poll saw it: lag end moves to D
            ino=c['files']['consumer']['-wal'][1]
            for e in c['trace'].events:
                if e['k']=='F' and e['cg']==222:e['enter']=120_000_000;e['ts']=121_000_000
        result=n.normalize(self.build(100,tweak=late_consumer_sync));b=result['stores']['consumer']['positions'][0]
        self.assertEqual(b['D'],121_000_000);self.assertGreater(b['D'],b['U']);self.assertEqual(b['durableEndNs'],121_000_000)
        self.assertEqual(result['stores']['broker']['positions'][0]['L'],10_000_000)             # lag start stays L
        def no_consumer_sync(c):c['trace'].events=[e for e in c['trace'].events if not (e['k']=='F' and e['cg']==222)]
        self.refused('SYNC-MISSING',tweak=no_consumer_sync)

class WatchCase(unittest.TestCase):
    """Observer side: witness domain, cgroup binding and whole-file shipping of the finished trace, with the same offline adapters as round 8."""
    def collect(self,root,witness_done=True,mutate=None):
        import vm_watch as w
        file=root/'broker.db';db=seed(file);db.close();control=root/'control';control.mkdir();cg=root/'cg';(cg/('docker-'+'a'*64+'.scope')).mkdir(parents=True)
        files={'meta':root/'meta.json','trace':root/'trace.txt','stderr':root/'stderr.txt'}
        files['meta'].write_text(json.dumps({'programSha256':'p'*64,'bootId':BOOT,'kernelRelease':'6.8.0','containerId':'w'*64}));files['trace'].write_bytes(b'SW1|B|1|2|3|2|3\n'*200000)
        files['stderr'].write_bytes(b'')
        witness={'pid':1,'cgroupRoot':str(cg),'metaPath':str(files['meta']),'tracePath':str(files['trace']),'stderrPath':str(files['stderr']),'waitSeconds':.3,
                 'containerId':'w'*64,'programSha256':'p'*64,'firstCandidateStartNs':1,'stores':{'broker':{'dir':[1,2],'cgroupId':0}}}
        config={'runId':'watch-'+uuid_hex(),'case':{'sources':[{'id':'broker','profile':'sql01','path':str(file),'engineContainerId':'a'*64}],'durationSeconds':5,'witness':witness},
                'sut':{},'collector':{},'streams':[{'streamId':'vm-publication'}]}
        records=[];original=(w.Bundle,w.clock,w.noise)
        class Recording:
            def __init__(self,root,config,key):Path(root,'clock').mkdir(parents=True)
            def append(self,sid,payload,start,real):records.append(json.loads(payload))
            def seal(self):pass
        w.Bundle=Recording;w.clock=lambda *args:DOMAIN;w.noise=lambda:{'scope':'offline host'}
        (control/'stop').write_text('stop')
        if witness_done:(control/'witness-done').write_text('done')
        if mutate:mutate(files,witness)
        try:
            error=None
            try:w.run(config,root/'out/bundle',b'x'*32,control,offline=True)
            except ValueError as caught:error=str(caught)
            return records,files,cg,error
        finally:w.Bundle,w.clock,w.noise=original
    def test_witness_files_domain_and_cgroup_binding_are_shipped(self):
        with tempfile.TemporaryDirectory() as temp:
            records,files,cg,error=self.collect(Path(temp));self.assertIsNone(error)
            chunks=[r for r in records if r['event']=='witness-trace'];self.assertGreater(len(chunks),1)
            self.assertEqual(b''.join(n.unblob(c['bytes']) for c in chunks),files['trace'].read_bytes());self.assertEqual([c['offset'] for c in chunks],sorted(c['offset'] for c in chunks))
            self.assertEqual([r['meta']['containerId'] for r in records if r['event']=='witness-meta'],['w'*64])
            bind=[r for r in records if r['event']=='witness-bind'][0];self.assertEqual(bind['cgroupId'],(cg/('docker-'+'a'*64+'.scope')).stat().st_ino)
            self.assertIn('witness',[r['role'] for r in records if r['event']=='domain']);self.assertTrue((Path(temp)/'control/finals-done').exists())
            self.assertEqual(records[-1]['event'],'end')
    def test_missing_detach_or_files_fail_the_run(self):
        with tempfile.TemporaryDirectory() as temp:
            records,_,_,error=self.collect(Path(temp),witness_done=False);self.assertIn('TRACE-INCOMPLETE',error);self.assertFalse([r for r in records if r['event']=='witness-trace'])
        with tempfile.TemporaryDirectory() as temp:
            _,_,_,error=self.collect(Path(temp),mutate=lambda files,witness:files['stderr'].unlink());self.assertIn('witness file missing',error)
        with tempfile.TemporaryDirectory() as temp:
            def ambiguous(files,witness):(Path(witness['cgroupRoot'])/'nested').mkdir();(Path(witness['cgroupRoot'])/'nested'/('docker-'+'a'*64+'.scope')).mkdir()
            _,_,_,error=self.collect(Path(temp),mutate=ambiguous);self.assertIn('ambiguous',error)

class FormatCase(unittest.TestCase):
    def test_kernel_dev_matches_glibc_and_mkdev(self):
        for major,minor in ((254,1),(8,17),(259,0),(4095,1048575 & 0xfffff)):
            st=(minor&0xff)|((major&0xfff)<<8)|((minor&~0xff)<<12)|((major&~0xfff)<<32);self.assertEqual(n.kernel_dev(st),(major<<20)|minor)
    def test_trace_program_matches_the_parser_layout_and_records_no_content(self):
        import re
        text=(Path(__file__).resolve().parent/'vm_syncwitness.bt').read_text();code='\n'.join(l for l in text.split('\n') if not l.strip().startswith('//'))
        for needle in ('fexit:vmlinux:ext4_file_write_iter','ext4_page_mkwrite','ext4_sync_file_enter','ext4_sync_file_exit','ext4_sync_fs','ext4_truncate_enter','ext4_punch_hole','ext4_zero_range','@n[cpu]++'):self.assertIn(needle,code)
        for forbidden in ('sync_file_range','buf(','str(','kstr','ustring','d_name','->name','args->from'):self.assertNotIn(forbidden,code)
        formats=re.findall(r'printf\("(SW1\|[A-Z]\|?[^"]*?)\\n"',code);self.assertGreaterEqual(len(formats),9)
        for fmt in formats:
            kind=fmt.split('|')[1];self.assertIn(kind,n.SW_LAYOUT)
            self.assertEqual(len(fmt.split('|'))-2,len(n.SW_LAYOUT[kind].split()),fmt)
if __name__=='__main__':unittest.main(verbosity=2)
