"""Attribute the sealed 100k trace. Arguments: evidence arm, JDK java, fresh output directory."""
import collections, gzip, hashlib, json, pathlib, shutil, subprocess, sys, tempfile
arm, java, out = map(pathlib.Path,sys.argv[1:])
out.mkdir()
def sha(p):
    with p.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
pins={l[66:].removeprefix('./'):l[:64] for l in (arm/'SHA256SUMS').read_text().splitlines()}
names=['head.txt','driver/ns-writes.jsonl','trace/raw/gw-w.jsonl.gz','trace/raw/tx.jfr.jsonl.gz','trace/raw/tx.jfr.gz','trace/raw/tx.jfr-complete.jsonl.gz']
for f in names: assert sha(arm/f)==pins[f],f
with (arm/names[1]).open() as f:
    writes=[json.loads(l) for l in f]
primaries={w['traceId']:w for w in writes if w['stream']=='background' and not w['resend'] and w['offsetMs']<900000}
assert len(primaries)==7408 and all(w['outcome']=='committed' and not w['expired'] for w in primaries.values())
base=min(w['scheduledAt']-w['offsetMs'] for w in primaries.values())
run=arm.name; source=(arm/'head.txt').read_text().strip()
complete=json.loads(gzip.open(arm/names[5],'rt').readline())
assert complete['run']==complete['slot']==run and complete['source']==source
boot=complete['clock']['bootId']; reads=collections.Counter(); seen=set()
with gzip.open(arm/names[2],'rt') as f:
    for l in f:
        if 'transactionIoStats' not in l:continue
        r=json.loads(l); i=r.get('traceId'); a=r.get('attributes',{})
        if i not in primaries or r['name']!='gateway /v1/db/{db}/transact':continue
        assert i not in seen and r['run']==r['slot']==run and r['source']==source and r['clock']['bootId']==boot and a['status']==200
        m=a['transactionIoStats']; assert m['api']=='tx-with'; v=m['reads']
        assert v.get('sql',0)==sum(v.get(k,0) for k in ['eavt-load','avet-load','aevt-load'])
        reads.update({k:v.get(k,0) for k in ['sql','eavt-load','avet-load','aevt-load']});seen.add(i)
assert seen==primaries.keys()
with tempfile.TemporaryDirectory(dir=out) as tmp:
    jfr=pathlib.Path(tmp)/'source.jfr'
    with gzip.open(arm/names[4],'rb') as s,jfr.open('wb') as t:shutil.copyfileobj(s,t)
    assert sha(jfr)==complete['fileSha256']
    lines=subprocess.check_output([java,'-Xmx384m',str(pathlib.Path(__file__).with_name('Parks.java')),jfr],text=True)
full=collections.defaultdict(list)
for l in lines.splitlines():
    thread,duration,kind=l.split('\t');full[(thread,int(duration))].append(kind)
events=[]
with gzip.open(arm/names[3],'rt') as f:
    for l in f:
        if 'DeserializingRepairingLookup' not in l or 'jdk.ThreadPark' not in l:continue
        r=json.loads(l)
        if not (base<=r['start']<base+900000 and (r['threadName'] or '').startswith('processor-') and r['jfrDurationMs']>=5):continue
        assert r['source']==source and r['slot']==r['run']==run and r['clock']['bootId']==boot
        kinds=full[(r['threadName'],round(r['jfrDurationMs']*1e6))];assert len(kinds)==1
        events.append({'kind':kinds[0],'ms':r['jfrDurationMs']})
assert events and len({(e['kind'],e['ms']) for e in events})==len(events)
result={'source':source,'slot':run,'boot':boot,'inputs':{n:pins[n] for n in names},'primary':len(seen),'reads':reads,'parks':events,
        'counts':collections.Counter(e['kind'] for e in events),'analysisSha256':sha(pathlib.Path(__file__)),'stackReaderSha256':sha(pathlib.Path(__file__).with_name('Parks.java'))}
(out/'observed.json').write_text(json.dumps(result,indent=2)+'\n')
print(result['reads'],result['counts'])
