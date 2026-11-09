#!/usr/bin/env python3
# [EXP-OBS01] Why: guard the RSS correction and reject fresh signatures over stale or misbound resident events.
# Rejected: tests that merely repeat a convenient successful protocol object.
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
def load(name):
    s=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
compiler=load('compile_protocol');normalizer=load('normalize')
def b64(raw):return base64.b64encode(raw).decode()
def resource():
    value={'event':'resource','owner':'engine','cgroupPath':'/docker/engine','files':{'memory.peak':b64(b'4000000000'),'memory.current':b64(b'3000000000'),'memory.max':b64(b'3221225472')},'diskFiles':[{'blocks':2}],
      'pidsBefore':[1],'pidsAfter':[1],'processes':[{'pid':1,'cgroup':b64(b'0::/docker/engine\n'),'stat':b64(('1 (java) S '+'0 '*18+'42 0').encode()),'status':b64(b'Name:\tjava\nVmRSS:\t1024 kB\nVmHWM:\t2000000 kB\n')}]}
    for row in value['processes']:row.update(statAfter=row['stat'],cgroupAfter=row['cgroup'])
    return value

class Round4(unittest.TestCase):
    def test_q91_counts_are_exact_and_timing_stays_diagnostic(self):
        def http(body):return b'HTTP/1.1 200 OK\r\nContent-Length: '+str(len(body)).encode()+b'\r\n\r\n'+body
        raw={'event':'qlever-index-state','statsHttp':b64(http(b'{"num-triples-normal":1}')),'metricsHttp':b64(http(b'qlever_delta_triples 9007199254740993\n'))}
        observed=normalizer.decode(json.dumps(raw).encode())['qleverIndexState']
        self.assertEqual(observed['baseTripleCount'],1);self.assertEqual(observed['deltaTripleCount'],9007199254740993)
        self.assertEqual(observed['timingQualification'],'DIAGNOSTIC');self.assertIsNone(observed['touchedBlockDelta'])
        for bad in (b'qlever_delta_triples -1\n',b'qlever_delta_triples NaN\n',b'other 0\n'):
            with self.assertRaises(ValueError):normalizer.decode(json.dumps({**raw,'metricsHttp':b64(http(bad))}).encode())
    def test_rss_is_not_lifetime_cache_peak(self):
        observed=normalizer.decode(json.dumps(resource()).encode())['resource']
        self.assertEqual(observed['rss'],1048576);self.assertEqual(observed['memory']['memory.peak'],4000000000)
    def test_other_cgroup_cannot_count_as_engine(self):
        raw=resource();raw['processes'][0]['cgroup']=b64(b'0::/docker/observer\n')
        with self.assertRaisesRegex(ValueError,'outside engine'):normalizer.decode(json.dumps(raw).encode())
    def test_process_churn_and_missing_rss_refuse(self):
        for field in ('pidsAfter','processes'):
            raw=resource();raw[field]=[]
            with self.assertRaises(ValueError):normalizer.decode(json.dumps(raw).encode())
        raw=resource();raw['processes'][0]['status']=b64(b'Name:\tjava\n')
        with self.assertRaisesRegex(ValueError,'RSS missing'):normalizer.decode(json.dumps(raw).encode())
    def test_legacy_resource_never_relabels_peak(self):
        case={'resident':True,'protocol':'OBS-RESOURCE'};ns={'__name__':'test'};exec(compiler.compile_parser(case,'H1'),ns)
        with self.assertRaisesRegex(ValueError,'lifetime cgroup peak'):
            ns['derive_resident']({'samples':[{'resource':{'memory':{'memory.peak':1},'owner':'engine','disk':1}}]},case,'H1')
    def test_resident_frame_binding_and_embedded_freshness(self):
        case={'resident':True,'runId':'attempt','engineContainerId':'engine','sources':[['h8','HO/any/H8']],'protocol':'OBS-AVAILABILITY'}
        ns={'__name__':'test'};exec(compiler.compile_parser(case,'H8'),ns)
        raw=json.dumps({'event':'lifecycle','tMono':11,'starttime':1,'oomKill':0}).encode()
        frame={'runId':'attempt','engineContainerId':'engine','streamId':'h8','sourceId':'H8','caseSha256':hashlib.sha256(json.dumps(case,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'runStartedMono':10,'tStartMono':12,'tEndMono':13,'rawSha256':hashlib.sha256(raw).hexdigest(),'rawBase64':b64(raw)}
        parse=lambda f:ns['resident_normalize']((json.dumps(f)+'\n').encode(),case,'H8')
        self.assertEqual(parse(frame),{})
        for field in ('runId','engineContainerId','sourceId','streamId','caseSha256'):
            with self.assertRaisesRegex(ValueError,'binding mismatch'):parse({**frame,field:'other'})
        stale=json.dumps({'event':'lifecycle','tMono':1,'starttime':1,'oomKill':0}).encode()
        with self.assertRaisesRegex(ValueError,'predates attempt'):parse({**frame,'rawBase64':b64(stale),'rawSha256':hashlib.sha256(stale).hexdigest()})

if __name__=='__main__':unittest.main(verbosity=2)
