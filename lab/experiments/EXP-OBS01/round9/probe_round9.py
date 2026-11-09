#!/usr/bin/env python3
"""OBS01 round 9 offline receipt: every R48 4.3 / 8.3 row refuses with its exact code, FULL accepts, round-8 negatives still refuse.

Synthetic kernel traces model what the VM would record; this is a regression gate, never VM evidence (W0..W3 are not run here).
"""
import json
from pathlib import Path
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_normalizer as n
import vm_planted_writer as planted
import test_syncwitness as t

ROUND8={'path-replacement':'REFUSED','synchronous-off':'REFUSED','full-control':'ACCEPTED','send-after-publication':'REFUSED','wal-rewrite':'REFUSED','wal-reset':'REFUSED','wal-checksum':'REFUSED','unknown-schema':'REFUSED','checkpoint-rollover':'REFUSED'}

def matrix():
    t.MatrixCase.setUpClass();case=t.MatrixCase('test_eleven_planted_modes_match_their_codes');rows=[]
    try:
        for mode in planted.MODES:
            result,ops,wal=case.run_mode(mode);histogram={}
            for row in result['perCommit']:
                key=min(row['codes'],key=n.WITNESS_CODES.index) if row['codes'] else 'WITNESSED'
                histogram[key]=histogram.get(key,0)+1
            mismatches=t.sw.compare(mode,result,1000)
            rows.append({'mode':mode,'runPrimary':result['primary'],'runCodes':result['codes'],'perCommit':histogram,'mismatches':mismatches,'ok':not mismatches})
    finally:t.MatrixCase.tearDownClass()
    return rows

def fixtures():
    rows=[]
    for name,(code,change) in t.CODE_FIXTURES.items():
        for mode in ('offline-synthetic','vm'):
            case=t.NormalizerCase('test_vm_mode_without_a_witness_still_refuses_like_round_8');case.setUp()
            try:
                try:n.normalize(case.build(mode=mode,tweak=change));outcome,got,message='ACCEPTED',None,None
                except n.WitnessError as error:outcome,got,message='REFUSED',error.code,str(error)
            finally:case.f.tearDown()
            rows.append({'fixture':name,'mode':mode,'expected':code,'got':got,'outcome':outcome,'message':message,'ok':got==code})
    accepted=[]
    for delay in (100,249,251,400):
        case=t.NormalizerCase('test_vm_mode_without_a_witness_still_refuses_like_round_8');case.setUp()
        try:
            result=n.normalize(case.build(delay,'vm'));a=result['stores']['broker']['positions'][0];b=result['stores']['consumer']['positions'][0]
            accepted.append({'delayMs':delay,'brokerD':a['D'],'brokerU':a['U'],'consumerD':b['D'],'consumerLagEnd':b['durableEndNs'],'consumerL':b['L'],'ok':a['D']<=a['U'] and b['durableEndNs']-a['L']>=delay*1000000})
        finally:case.f.tearDown()
    return rows,accepted

def main():
    out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
    files=['lab/observer/vm_normalizer.py','lab/observer/vm_syncwitness.py','lab/observer/vm_syncwitness.bt','lab/observer/vm_planted_writer.py','lab/observer/vm_watch.py','lab/observer/test_syncwitness.py','lab/experiments/EXP-OBS01/round9/probe_round9.py']
    pins={p:n.sha((ROOT/p).read_bytes()) for p in files};result={'format':'CX-OBS01-R9-offline-probe/1','sourceSha256':pins,'startedNs':time.monotonic_ns(),'claim':'offline synthetic kernel traces; no VM, no W0-W3 receipt'}
    result['matrix']=matrix();result['codeFixtures'],result['acceptedFull']=fixtures()
    process=subprocess.run([sys.executable,'-B',str(ROOT/'lab/experiments/EXP-OBS01/round8/probe_round8.py'),str(out/'round8-replay')],capture_output=True,timeout=600,cwd=ROOT)
    (out/'round8-replay.stdout').write_bytes(process.stdout);(out/'round8-replay.stderr').write_bytes(process.stderr)
    round8=json.loads((out/'round8-replay/RESULT.json').read_bytes()) if process.returncode==0 else None
    result['round8']={'status':process.returncode,'outcomes':{c['name']:c['outcome'] for c in round8['checks']} if round8 else None}
    result['round8']['ok']=result['round8']['outcomes']==ROUND8
    result['sourceUnchanged']=all(n.sha((ROOT/p).read_bytes())==d for p,d in pins.items())
    result['ok']=all(r['ok'] for r in result['matrix'])and all(r['ok'] for r in result['codeFixtures'])and all(r['ok'] for r in result['acceptedFull'])and result['round8']['ok']and result['sourceUnchanged']
    result['finishedNs']=time.monotonic_ns()
    (out/'RESULT.json').write_bytes(n.packed(result)+b'\n')
    (out/'SHA256SUMS').write_text(''.join(n.sha(p.read_bytes())+'  '+str(p.relative_to(out))+'\n' for p in sorted(out.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    print(json.dumps({'ok':result['ok'],'matrixOk':sum(r['ok'] for r in result['matrix']),'fixturesOk':sum(r['ok'] for r in result['codeFixtures']),'round8':result['round8']['ok']}))
    sys.exit(0 if result['ok'] else 1)

if __name__=='__main__':main()
