#!/usr/bin/env python3
"""OBS01-R6 offline gates; synthetic timing is never VM qualification."""
import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import uuid
sys.path.insert(0,str(Path(__file__).resolve().parent))
import vm_normalizer as n
from vm_watch import WalTail,gone_probe
from vm_fixture import seed,commit
from collector import Bundle
from verify_seal import verify

ROOT=Path(__file__).resolve().parent
BOOT='11111111-2222-3333-4444-555555555555'
DOMAIN=n.domain(BOOT,'monotonic 0 0\nboottime 0 0\n',42)

def load(name,file):
    spec=importlib.util.spec_from_file_location(name,file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def fdseed(file):
    db=sqlite3.connect(file);db.execute('PRAGMA journal_mode=WAL');db.execute('PRAGMA synchronous=FULL');db.execute('PRAGMA wal_autocheckpoint=0')
    db.executescript('CREATE TABLE checkpoints(consumer TEXT PRIMARY KEY,source TEXT,token TEXT); CREATE TABLE frontier(consumer TEXT PRIMARY KEY,stream TEXT,epoch TEXT,offset TEXT); CREATE TABLE deliveries(consumer TEXT,stream TEXT,epoch TEXT,offset TEXT,digest TEXT,PRIMARY KEY(consumer,stream,epoch,offset));CREATE TABLE effects(consumer TEXT,epoch TEXT,position TEXT,subject TEXT,PRIMARY KEY(consumer,epoch,position,subject));CREATE TABLE affected(consumer TEXT,epoch TEXT,position TEXT,subject TEXT,PRIMARY KEY(consumer,epoch,position,subject));')
    db.execute('PRAGMA wal_checkpoint(TRUNCATE)');return db

class VmObserver(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.run='offline-'+uuid.uuid4().hex
        self.sql=self.root/'broker.db';self.fd=self.root/'consumer.db';self.db=seed(self.sql);self.consumer=fdseed(self.fd)
        self.main=self.sql.read_bytes();self.fdmain=self.fd.read_bytes()
        commit(self.db,1);self.db.execute('UPDATE frames SET committed_at=10');self.db.commit()
        self.consumer.execute('BEGIN');self.consumer.execute("INSERT INTO checkpoints VALUES('c','fixture','token')");self.consumer.execute("INSERT INTO frontier VALUES('c','fixture-stream','0','1')");self.consumer.execute("INSERT INTO deliveries VALUES('c','fixture-stream','0','1','digest')")
        self.consumer.execute("INSERT INTO effects VALUES('c','0','1024','subject')");self.consumer.execute("INSERT INTO affected VALUES('c','0','1024','subject')");self.consumer.commit()
    def tearDown(self):self.db.close();self.consumer.close();self.temp.cleanup()
    def events(self,delay=100):
        sources=[{'id':'broker','profile':'sql01'},{'id':'consumer','profile':'fd01','consumer':'c'}]
        case={'clockMode':'offline-synthetic','startedNs':0,'sources':sources};events=[{'event':'begin','case':case},{'event':'domain','role':'observer','domain':DOMAIN}, {'event':'clock-wall','lowerNs':0,'upperNs':0,'realNs':0}]
        for sid,main,wal,visible,base in [('broker',self.main,Path(str(self.sql)+'-wal').read_bytes(),[0,1],10000000),('consumer',self.fdmain,Path(str(self.fd)+'-wal').read_bytes(),[0,2],10000000+delay*1000000)]:
            events.extend([{'event':'poll','source':sid,'startNs':base,'endNs':base+50000,'visible':[0,0]}, {'event':'poll','source':sid,'startNs':base+500000,'endNs':base+550000,'visible':visible}, {'event':'wal','source':sid,'offset':0,'bytes':n.blob(wal)}, {'event':'final','source':sid,'main':n.blob(main),'wal':n.blob(wal)}])
        events.extend([{'event':'clock-wall','lowerNs':500000000,'upperNs':500000000,'realNs':500000000},{'event':'end','atNs':600000000}])
        return [{'runId':self.run,**event} for event in events]
    def frames(self,events):
        case=events[0]['case'];result=[]
        for i,event in enumerate(events):
            payload=n.packed(event);result.append(n.packed({'runId':self.run,'sourceId':'H6','engineContainerId':'e'*64,'caseSha256':n.sha(n.packed(case)),'tStartMono':i,'tEndMono':i,'rawBase64':base64.b64encode(payload).decode(),'rawSha256':n.sha(payload)}))
        return b'\n'.join(result)+b'\n'
    def test_four_planted_delays_with_measured_period(self):
        for delay in (100,249,251,400):
            with self.subTest(delay=delay):
                result=n.normalize(self.frames(self.events(delay)));source=result['stores']['broker'];consumer=result['stores']['consumer'];a=source['positions'][0];b=consumer['positions'][0]
                truth=delay*1000000;self.assertLessEqual(b['L']-a['U'],truth);self.assertGreaterEqual(b['U']-a['L'],truth)
                self.assertLessEqual(b['U']-a['L']-truth,source['publication']['measuredMaxPeriodNs'])
                self.assertEqual(source['positions'][0]['position'],1024);self.assertEqual(consumer['positions'][0]['subject'],'subject')
    def test_real_sqlite_delays_and_actual_poll_periods(self):
        for trial,delay in enumerate((100,249,251,400)):
            target=trial+2;polls={'broker':[],'consumer':[]};ready={s:threading.Event() for s in polls};seen={s:threading.Event() for s in polls};stop=threading.Event();errors=[]
            def reader(role,file):
                connection=n.readonly(file)
                try:
                    while not stop.is_set():
                        start=time.monotonic_ns();connection.execute('BEGIN')
                        row=connection.execute('SELECT lsn,epoch FROM marker WHERE id=1' if role=='broker' else "SELECT offset,epoch FROM frontier WHERE consumer='c'").fetchone()
                        connection.commit();end=time.monotonic_ns();value=[int(row[1]),int(row[0])+(role=='consumer')]
                        polls[role].append({'startNs':start,'endNs':end,'visible':value});ready[role].set()
                        if value[1]>=target+(role=='consumer'):seen[role].set()
                        stop.wait(.00025)
                except BaseException as error:errors.append(str(error))
                finally:connection.close()
            workers=[threading.Thread(target=reader,args=(role,file)) for role,file in [('broker',self.sql),('consumer',self.fd)]]
            for worker in workers:worker.start()
            try:
                self.assertTrue(all(event.wait(5) for event in ready.values()))
                sourceStart=time.monotonic_ns();commit(self.db,target);sourceAck=time.monotonic_ns()
                time.sleep(delay/1000)
                consumerStart=time.monotonic_ns();self.consumer.execute('BEGIN');self.consumer.execute("UPDATE frontier SET offset=? WHERE consumer='c'",(str(target),));self.consumer.execute('INSERT INTO affected VALUES(?,?,?,?)',('c','0',str(target*1024),'subject'));self.consumer.commit();consumerAck=time.monotonic_ns()
                self.assertTrue(all(event.wait(5) for event in seen.values()))
            finally:
                stop.set()
                for worker in workers:worker.join(5)
            self.assertFalse(errors,errors)
            source=n.brackets(polls['broker']);consumer=n.brackets(polls['consumer']);a=n.bracket_for(source,[0,target]);b=n.bracket_for(consumer,[0,target+1])
            self.assertLessEqual(a['L'],sourceAck);self.assertGreaterEqual(a['U'],sourceStart)
            self.assertLessEqual(b['L'],consumerAck);self.assertGreaterEqual(b['U'],consumerStart)
            self.assertLessEqual(a['U']-a['L'],source['measuredMaxPeriodNs']);self.assertLessEqual(b['U']-b['L'],consumer['measuredMaxPeriodNs'])
            self.assertGreaterEqual(b['U']-a['L'],delay*1000000)
            if os.environ.get('VM_TEST_EVIDENCE_DIR'):
                evidence={'claim':'real host SQLite polls; host timing only, not VM qualification','delayMs':delay,'sourceCommit':[sourceStart,sourceAck],'consumerCommit':[consumerStart,consumerAck],'polls':polls,'sourceBracket':a,'consumerBracket':b,'sourcePeriodMaxNs':source['measuredMaxPeriodNs'],'consumerPeriodMaxNs':consumer['measuredMaxPeriodNs']}
                (Path(os.environ['VM_TEST_EVIDENCE_DIR'])/('host-delay-'+str(delay)+'.json')).write_bytes(n.packed(evidence))

    def test_early_and_late_stamps_f20(self):
        for stamp in (0,30000000):
            events=self.events();final=next(e for e in events if e['event']=='final' and e['source']=='broker');final['cr']=[{'position':[0,1],'atNs':stamp}]
            with self.assertRaisesRegex(ValueError,'F20'):n.normalize(self.frames(events))
        for wall in (-100,100):
            self.db.execute('UPDATE frames SET committed_at=?',(wall,));self.db.commit()
            with self.assertRaisesRegex(ValueError,'F20'):n.normalize(self.frames(self.events()))
    def test_rewritten_wal_f11_even_when_final_is_valid(self):
        tail=WalTail();raw=Path(str(self.sql)+'-wal').read_bytes();tail.update(raw)
        changed=raw[:-1]+bytes([raw[-1]^1])
        with self.assertRaisesRegex(ValueError,'F11'):tail.update(changed)
        with self.assertRaisesRegex(ValueError,'F11'):tail.update(b'')
        events=self.events();event=next(e for e in events if e['event']=='wal' and e['source']=='broker');event['bytes']=n.blob(changed)
        with self.assertRaisesRegex(ValueError,'F11'):n.normalize(self.frames(events))
    def test_clock_q100q_and_binding_negatives(self):
        other=n.domain(BOOT,'monotonic 0 0\nboottime 0 0\n',99);self.assertEqual(n.same_domain([DOMAIN,other]),BOOT)
        with self.assertRaises(ValueError):n.domain(BOOT,'monotonic 0 1\nboottime 0 0')
        with self.assertRaises(ValueError):n.same_domain([DOMAIN,{**DOMAIN,'bootId':'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}])
        events=self.events();events[1]['runId']='earlier-attempt'
        with self.assertRaisesRegex(ValueError,'binding|run'):n.normalize(self.frames(events))
        events=self.events();events[3]['startNs']=-1
        with self.assertRaisesRegex(ValueError,'stale|poll'):n.normalize(self.frames(events))
    def test_final_readback_must_cover_witnessed_frontier(self):
        events=self.events();next(e for e in events if e['event']=='poll' and e['source']=='broker' and e['visible']==[0,1])['visible']=[0,2]
        with self.assertRaisesRegex(ValueError,'behind witnessed'):n.normalize(self.frames(events))

    def test_readonly_and_schema_and_wal_checksums(self):
        db=n.readonly(self.sql)
        try:
            with self.assertRaises(sqlite3.OperationalError):db.execute('DELETE FROM marker')
        finally:db.close()
        raw=Path(str(self.fd)+'-wal').read_bytes();bad=raw[:-1]+bytes([raw[-1]^1])
        with self.assertRaisesRegex(ValueError,'checksum'):n.wal_commits(bad)
        self.consumer.execute('ALTER TABLE frontier ADD COLUMN counterfeit TEXT');self.consumer.commit()
        with self.assertRaisesRegex(ValueError,'schema'):n.snapshot(self.fdmain,Path(str(self.fd)+'-wal').read_bytes(),'fd01')
    def test_cgroup_gone_requires_positive_visibility(self):
        root=self.root/'cg';own=root/('docker-'+'a'*64+'.scope');target=root/('docker-'+'b'*64+'.scope');own.mkdir(parents=True);target.mkdir()
        (target/'cgroup.events').write_text('populated 1');(target/'cgroup.procs').write_text('123')
        first=gone_probe(root,'b'*64,own,None);self.assertEqual(first['event'],'cgroup-seen');shutil.rmtree(target)
        self.assertEqual(gone_probe(root,'b'*64,own,first)['event'],'cgroup-gone')
        with self.assertRaises(ValueError):gone_probe(root,'b'*64,own,None)
        shutil.rmtree(own)
        with self.assertRaises(ValueError):gone_probe(root,'b'*64,own,first)
    def test_oobs_authenticates_and_reruns_pinned_normalizer(self):
        code=self.root/'code';code.mkdir()
        for name in ('collector.py','capture.py','vm_normalizer.py'):shutil.copyfile(ROOT/name,code/name)
        collector=load('frozen_collector',code/'collector.py');parser=(code/'vm_normalizer.py').read_bytes();events=self.events()
        stream={'streamId':'vm-publication','sourceId':'H6','kind':'DR/any/H6','endpoint':'fixture-files','method':'scan','cadenceMs':.25,'normalizerFile':'vm_normalizer.py','normalizer':{'id':'obs01-vm-sql01-fd01','version':'1','sha256':n.sha(parser)}}
        config={'runId':self.run,'receiptId':self.run,'keyId':self.run,'case':events[0]['case'],'maxUncertaintyMs':1,'streams':[stream],
            'collector':{'containerId':'offline','sourceSha256':n.sha(parser),'imageDigest':'sha256:fixture','cgroupPath':'offline','cpuset':'offline'},
            'sut':{'lane':'qlever','slot':'offline','engineContainerId':'e'*64,'engineImageDigest':'sha256:fixture','engineConfigSha256':'fixture','enginePids':[{'role':'offline','pid':1,'starttime':1}]}}
        key=os.urandom(32);keyfile=self.root/'external.key';keyfile.write_bytes(key);root=self.root/'bundle';bundle=collector.Bundle(root,config,key)
        for event in events:bundle.append('vm-publication',n.packed(event),collector.mono(),0)
        bundle.seal();configfile=self.root/'config.json';configfile.write_bytes(n.packed(config));verify(root,keyfile,configfile,code)
        bridge=n.packed({'send':0,'receive':0,'observerMono':0})+b'\n';(root/'clock/bridge.jsonl').write_bytes(bridge)
        oracle=load('oobs',ROOT.parent/'acceptance/oracle/observe.py');entries=bundle.entries['vm-publication']
        context={'format':'obs-context/1','runId':self.run,'receiptId':self.run,'keyId':self.run,'protocol':'OBS-VM-PUBLICATION','obligation':'offline-fixture','case':'offline-fixture','witnessKind':'VM-PUBLICATION','thresholdIds':[],'contractSha256':'offline-not-semantic','bundleSha256':n.sha((root/'bundle.json').read_bytes()),'bridgeSha256':n.sha(bridge),'engine':'qlever','bindings':{},'clockMaxUncertaintyMs':1,'streams':[{**stream,'normalizerPath':str(code/'vm_normalizer.py'),'chunks':entries}],'witnessHeads':[{'runId':self.run,'streamId':'vm-publication','seq':len(entries)-1,'headSha256':entries[-1]['headerSha256'],'tMono':entries[-1].get('tEndMono',0)}]}
        authenticated,_=oracle.authenticate(root,context,keyfile)
        expected=json.loads((root/'normalized/sources/vm-publication.json').read_bytes());self.assertEqual(authenticated['vm-publication'][1],expected)
        if os.environ.get('VM_TEST_EVIDENCE_DIR'):
            destination=Path(os.environ['VM_TEST_EVIDENCE_DIR'])/'authenticated-fixture'
            shutil.copytree(self.root,destination)
            relocated=copy.deepcopy(context);relocated['streams'][0]['normalizerPath']=str(destination/'code/vm_normalizer.py')
            (destination/'oobs-context.json').write_bytes(n.packed(relocated))
        (code/'vm_normalizer.py').write_bytes(parser+b'\n# changed\n')
        with self.assertRaises(Exception):oracle.authenticate(root,context,keyfile)

if __name__=='__main__':unittest.main(verbosity=2)
