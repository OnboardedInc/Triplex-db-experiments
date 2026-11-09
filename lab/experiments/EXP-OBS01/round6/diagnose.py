#!/usr/bin/env python3
"""Read-only analysis of the one retained VM attempt; never promote an unsealed bundle."""
import base64
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_normalizer as n

def main():
    out=Path(sys.argv[1]);folder=out/'1/observer';bundle=folder/'output/bundle';key=(folder/'external.key').read_bytes();index=json.loads((bundle/'index.json').read_bytes());heads={};frames=[];events=[]
    for sid,entries in index.items():
        previous=None
        for seq,entry in enumerate(entries):
            hb=(bundle/entry['header']).read_bytes();header=json.loads(hb);raw=(bundle/entry['raw']).read_bytes()
            assert n.sha(hb)==entry['headerSha256'] and n.sha(raw)==header['sha256'] and len(raw)==header['byteLength']
            signature=header.pop('hmac');assert hmac.compare_digest(signature,hmac.new(key,n.packed(header),hashlib.sha256).hexdigest())
            assert header['seq']==seq and header['streamId']==sid and header['prevHeaderSha256']==previous;previous=n.sha(hb)
            for line in raw.splitlines():
                frame=json.loads(line);payload=base64.b64decode(frame['rawBase64'],validate=True);assert n.sha(payload)==frame['rawSha256'];frames.append(line+b'\n');event=json.loads(payload)
                if event['event']=='polls':events.extend(event['polls'])
                else:events.append(event)
        heads[sid]=previous
    parser=folder/'code/vm_normalizer.py';pins=json.loads((folder/'controller.json').read_bytes())['pins'];assert n.sha(parser.read_bytes())==pins['vm_normalizer.py']
    process=subprocess.run(['python3','-I','-B',str(parser)],input=b''.join(frames),capture_output=True,timeout=120)
    assert process.returncode==2 and b'F20' in process.stderr
    (out/'retained-normalizer.stderr').write_bytes(process.stderr)
    clocks=[event['domain'] for event in events if event['event']=='domain'];boot=n.same_domain(clocks)
    polls=[e for e in events if e['event']=='poll' and e['source']=='broker'];summary=n.brackets(polls);final=next(e for e in events if e['event']=='final' and e['source']=='broker');main=n.unblob(final['main']);wal=n.unblob(final['wal']);captured=b''
    for event in events:
        if event['event']=='wal':assert event['offset']==len(captured);captured+=n.unblob(event['bytes'])
    assert captured==wal
    state=n.snapshot(main,wal,'sql01');transactions,_=n.history(main,wal,'sql01')
    bridges=[e for e in events if e['event']=='clock-wall'];lo=min(e['realNs']-e['upperNs'] for e in bridges);hi=max(e['realNs']-e['lowerNs'] for e in bridges)
    violations=[];widths=[]
    for row in state['frames']:
        if row['lsn']<=polls[0]['visible'][1]:continue
        interval=n.bracket_for(summary,[row['epoch'],row['lsn']]);widths.append(interval['U']-interval['L'])
        low=row['committed_at']*1000000-hi;high=(row['committed_at']+1)*1000000-lo
        if high<interval['L']-1000000 or low>interval['U']+5000000:
            violations.append({'lsn':row['lsn'],'L':interval['L'],'U':interval['U'],'stampLowNs':low,'stampHighNs':high,'earlyByNs':max(0,interval['L']-high),'lateByNs':max(0,low-interval['U'])})
    assert violations
    result=json.loads((out/'RESULT.json').read_bytes());a,b=result['rounds'][:2]
    def quantile(values,q):return sorted(values)[max(0,__import__('math').ceil(len(values)*q)-1)]
    analysis={'status':'DIAGNOSTIC','sealed':(bundle/'seal.json').exists(),'claim':'verified HMAC chain of unsealed failure; no O-OBS admission or completed ABBA overhead qualification',
        'heads':heads,'normalizerSha256':n.sha(parser.read_bytes()),'normalizerExit':process.returncode,'refusal':process.stderr.decode().strip(),
        'clock':{'bootId':boot,'records':clocks,'realtimeOffsetSpanNs':hi-lo},'inotifyEvents':sum(len(e['events']) for e in events if e['event']=='inotify'),
        'polls':len(polls),'periodP50Ns':quantile(summary['periodsNs'],.5),'periodP99Ns':quantile(summary['periodsNs'],.99),'measuredMaxPeriodNs':summary['measuredMaxPeriodNs'],
        'bracketWidthP99Ns':quantile(widths,.99),'bracketWidthMaxNs':max(widths),'frames':len(state['frames']),'walTransactions':len(transactions),
        'violations':violations,'firstPair':{'baselineP99Ns':a['p99'],'observedP99Ns':b['p99'],'changePercent':100*(b['p99']/a['p99']-1),'aboveFivePercent':b['p99']/a['p99']>1.05}}
    (out/'analysis.json').write_bytes(n.packed(analysis)+b'\n');print(n.packed({k:v for k,v in analysis.items() if k not in ('heads','violations','clock')}).decode())
if __name__=='__main__':main()
