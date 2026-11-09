"""EXP-P5B-R2: audit the stopped attempt's original log and native store, without promoting it.
Why: preserve its incomplete bijection and detect an unlogged physical tail. Rejected: rewriting the RUNNING receipt or sealing a partial seed.
The witness projection below matches b0-10k-01/source/lab/bench/lib/host-store.ts, not the subsequently hardened builder.
"""
import sys,json,hashlib,sqlite3,os,datetime
from pathlib import Path
out=Path(sys.argv[1]);result={'format':'EXP-P5B-prefix-audit/1','classification':'DIAGNOSTIC','acceptance':False,'admission':False,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
canon=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
hash_text=lambda x:hashlib.sha256(x.encode()).hexdigest()
chain=hash_text('EXP-P5B-Q101a/1');entries=[];last_native=0;trailing=0;operations=0;asserts=0;retracts=0
try:
    source=json.loads((out/'receipt.json').read_text())['sources']
    result['originalSourcePreimagesMatch']=all(hashlib.sha256((out/'source'/p).read_bytes()).hexdigest()==h for p,h in source.items())
    if not result['originalSourcePreimagesMatch']:raise ValueError('original source preimage differs')
    with (out/'seed.ndjson').open('rb') as f:
        for raw in f:
            if not raw.endswith(b'\n'):trailing=len(raw);break
            c=json.loads(raw);r=c['receipt'];ref=c['reference'];native=r['nativePosition']
            if ref!=len(entries)+1 or r['position']!=ref or native<=last_native:raise ValueError('gap or non-increasing native receipt')
            witness=[];i=0
            for op in c['operations']:
                operations+=1
                if op['op']=='assert':
                    t=r['triples'][i];i+=1;asserts+=1
                    witness.append({'op':'assert','id':t['id'],'entityId':op['entityId'],'attribute':op['attribute'],'value':op['value'],'validFrom':op.get('validFrom',r['instant']),'validTo':op.get('validTo',None),'recordedAt':r['instant'],'position':native,'txId':r['txId']})
                elif op['op']=='retract':
                    retracts+=1;witness.append({'op':'retract','id':op['id'],'position':native,'instant':r['instant'],'txId':r['txId']})
                else:raise ValueError('unsupported operation')
            entry=[ref,native,hash_text(canon(witness))];chain=hash_text(chain+'\n'+canon(entry))
            if chain!=r['positionBinding']['mapHash'] or ref!=r['positionBinding']['references']:raise ValueError('receipt prefix map hash differs')
            entries.append(entry);last_native=native
    prefix=out/'position-map-prefix.json'
    prefix.write_text(canon({'format':'EXP-P5B-Q101a/1','entries':entries,'sha256':chain,'seedMapHash':None})+'\n')
    result.update(status='INCOMPLETE-LOG-PREFIX-AUDITED',references=len(entries),nativePosition=last_native,mapHash=chain,seedSealed=False,trailingBytes=trailing,submittedOperations=operations,submittedAssertions=asserts,submittedRetractions=retracts,mapFile=str(prefix),mapFileSha256=hashlib.sha256(prefix.read_bytes()).hexdigest(),readbackProvenance='Original seed verified submitted command fields before writing each log record. This audit checks the recorded order/content/hash chain, not a new SQL readback of every command. The final source adds full-row/actor/claim checks; this partial prefix retains the original projection.')
    db=sqlite3.connect('file:'+str(out/'store/broker.db')+'?mode=ro',uri=True)
    result['nativeMarker']=dict(zip(('lsn','epoch','h','position'),db.execute('SELECT lsn,epoch,h,position FROM marker').fetchone()))
    result['nativeCounts']={t:db.execute('SELECT count(*) FROM '+t).fetchone()[0] for t in ('frames','claims','recent_rows','live_rows','retired_rows')}
    result['retainedFramePayloadBytes']=db.execute('SELECT sum(length(payload)) FROM frames').fetchone()[0]
    db.close()
    result['unloggedPhysicalTail']=result['nativeMarker']['position']!=last_native
    result['ownedFiles']={str(p.relative_to(out)):{'bytes':p.stat().st_size,'allocatedBytes':p.stat().st_blocks*512} for p in (out/'store').iterdir() if p.is_file()}
except Exception as error:result['status']='AUDIT-REFUSED';result['error']=str(error)
result['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(out/'prefix-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if result['status']=='AUDIT-REFUSED':sys.exit(1)
