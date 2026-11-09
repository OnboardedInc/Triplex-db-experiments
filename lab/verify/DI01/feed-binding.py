"""[CX-VDI01] Why: independently reconstruct every identity-only feed digest.
Rejected: regenerating pages with DI01 Replay.add, then trusting its own log hash.
"""
import hashlib,json,pathlib,sqlite3,sys,datetime
canon=lambda o:json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
f=pathlib.Path(sys.argv[1]).open(); meta=json.loads(next(f)); raises=set(meta['raises'])
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/final-r12/trace')
r=json.loads((root/'result.json').read_text()); latest={}; count=0; log=hashlib.sha256(); digests=hashlib.sha256()
V=1793793600000; RAISE=1794787200000
assert datetime.datetime.fromtimestamp(V/1000,datetime.timezone.utc).isoformat()=='2026-11-04T12:00:00+00:00'
db=sqlite3.connect(f'file:{root/"trace.db"}?mode=ro',uri=True)
recorded=iter(db.execute('SELECT epoch,offset,digest FROM deliveries WHERE consumer=? ORDER BY CAST(offset AS INTEGER)',('c',)))
for line in f:
    c=json.loads(line); count+=1; assert c['position']==count; p=str(count); changes=[]
    def retire(old):
        if old.get('retired'): return
        old['retired']=True; changes.append(dict(op='retract',entity=old['entity'],attribute=old['attribute'],assertionId=old['assertionId'],position=p,validFrom=old['validFrom'],validTo=old['validTo']))
    for e,a in c['retract']:
        for old in latest.get((e,a),[]): retire(old)
    for e,a,v in c['rows']:
        if a not in ['documents','decisions','answers'] and not(c['seed'] and c['validFrom']>V):
            for old in latest.get((e,a),[]): retire(old)
        new=dict(op='assert',entity=e,attribute=a,assertionId=f'di:{p}:{len(changes)}',position=p,validFrom=c['validFrom'],validTo=RAISE if c['seed'] and a=='payRateCents' and c['validFrom']<=V and e in raises else None)
        changes.append(dict(new)); latest[(e,a)]=latest.get((e,a),[])+[new] if a in ['documents','decisions','answers'] else [new]
    entry=dict(kind='commit',stream='di01',epoch='0',offset=p,transactions=[dict(positions=[p],txIds=['tx:'+p],commandIds=['cmd:'+p],operationId='op:'+p,stamp=None,stampStatus='pending-RT01',changes=changes)])
    digest=sha(canon(entry).encode()); actual=next(recorded)
    assert actual==('0',p,digest),(p,actual,digest)
    digests.update((p+' '+digest+'\n').encode())
    del c['seed']; log.update((canon(c)+'\n').encode())
assert count==438140 and next(recorded,None) is None
assert log.hexdigest()==r['traceResult']['commandLogSha256'],(log.hexdigest(),r['traceResult']['commandLogSha256'])
out=dict(positions=count,commandLogSha256=log.hexdigest(),deliveryDigestSequenceSha256=digests.hexdigest(),feedAlgorithm='independent Python; no DI01 Replay or feedBytes imported',scriptSha256=sha(pathlib.Path(__file__).read_bytes()),source='pinned seed/mapper/trace generator source and hashed overlay',offline=True,slot=None)
pathlib.Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n'); print(json.dumps(out))
