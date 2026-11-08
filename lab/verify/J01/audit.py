# [CX-VJ01] Why: independently parse retained input bytes and cumulative sizes. Rejected: copying REPORT.md totals (would not test attribution).
import json, hashlib, pathlib, re, math, collections
ROOT=pathlib.Path(__file__).resolve().parents[3]
OUT=ROOT/'lab/verify/J01'
EXP=ROOT/'lab/experiments/EXP-J01-bytes-per-commit'
sha=lambda b:hashlib.sha256(b).hexdigest()
result={'checkedHead':'5cc42fb','receipts':[], 'qlever':[], 'xtdb':[], 'service':[], 'g1':[]}
for p in sorted((EXP/'receipts').glob('*.json')):
 d=json.loads(p.read_bytes()); raw=d.get('rawPath')
 if raw:
  b=pathlib.Path(raw).read_bytes(); assert sha(b)==d['rawSha256'],p
  result['receipts'].append({'path':str(p.relative_to(ROOT)),'receiptSha256':sha(p.read_bytes()),'raw':raw,'rawBytes':len(b),'rawSha256':sha(b)})
  r=json.loads(b)
  if p.name.startswith('qlever-attribution'):
   commands=[]
   for i,s in enumerate(r['updates']):
    # Full-line regex works with quoted/escaped literals without splitting literal whitespace.
    block=s.split('VALUES (?s ?p ?new) {',1)[1].rsplit('} OPTIONAL {',1)[0]
    triples=[]
    for line in block.splitlines():
     if not line.strip():continue
     m=re.fullmatch(r'\s*\((<[^>]+>) (<[^>]+>) (.*)\)\s*',line);assert m,line
     triples.append(m.groups())
    attrs={s:json.loads(o) for s,p,o in triples if p=='<urn:triplex:field:attribute>'}
    counts=collections.Counter();sizes=collections.Counter()
    for subject,predicate,obj in triples:
     if subject.startswith('<urn:triplex:claim:'):kind='claim'
     elif subject.startswith('<urn:triplex:operation:'):kind='operation'
     elif subject=='<urn:triplex:meta>':kind='meta'
     else:
      a=attrs[subject];kind='journal-change' if a==':_tx/change' else 'journal-envelope '+a if a.startswith(':_tx/') else 'data'
     counts[kind]+=1;sizes[kind]+=len(obj.encode())
    expected=d['perCommand'][i]
    assert counts==expected['bySource']
    assert sizes==expected['objectBytesBySource']
    assert len(triples)==expected['qleverOperation']['inserted']
    assert len(s.encode())==expected['updateTextBytes']
    commands.append({'facts':expected['facts'],'inserted':len(triples),'deleted':expected['qleverOperation']['deleted'],'triplesBySource':dict(counts),'objectBytesBySource':dict(sizes),'objectBytes':sum(sizes.values()),'updateTextBytes':len(s.encode())})
   result['qlever'].append({'receipt':p.name,'commands':commands,'limitation':'Raw updates prove VALUES and literal sizes; server insertion/deletion counts are receipt observations, not independently replayed here.'})
  if p.name.startswith('xtdb-attribution'):
   prev=0;inc=[]
   for x in d['increments']:
    n=x['cumulativeBytes']-prev;assert n==x['bytes'];inc.append({'source':x['source'],'bytes':n});prev=x['cumulativeBytes']
   assert prev==d['tenFactRecordBytes']==d['exactReplay']==d['replayedTotal']
   rows=[]
   for stmt in r['tenFactStatements']:
    if stmt['sql'].startswith('INSERT INTO tx_assertions'):
     cols=stmt['sql'].split('(',1)[1].split(')',1)[0].split(', ')[1:];w=len(cols)
     assert len(stmt['params'])%w==0
     rows.extend(dict(zip(cols,stmt['params'][j:j+w])) for j in range(0,len(stmt['params']),w))
   kinds=collections.Counter('changes' if x['attribute']==':_tx/change' else 'envelope' if x['attribute'].startswith(':_tx/') else 'data' for x in rows)
   assert kinds=={'data':10,'envelope':4,'changes':10}
   changes=[{'jsonBytes':len(x['value_json'].encode()),'identityBytes':len(x['value_identity'].encode())} for x in rows if x['attribute']==':_tx/change']
   result['xtdb'].append({'receipt':p.name,'increments':inc,'sum':prev,'rows':dict(kinds),'changePayloadBytes':changes,'bands':[{'facts':x['facts'],'recordBytes':x['recordBytes']} for x in d['real']], 'limitation':'Retained raw contains only ten-fact statements; no per-replay message offsets/Arrow log bytes. Byte closure is recomputed receipt arithmetic, not independent validation of engine byte observations.'})
  if p.name.startswith('service'):
   stats={}
   for arm,samples in r.items():
    a=sorted(x['ms'] for x in samples);stats[arm]={'n':len(a),'p50':a[math.ceil(.5*len(a))-1],'p99':a[math.ceil(.99*len(a))-1]}
   result['service'].append({'receipt':p.name,'stats':stats})
 if p.name.startswith('p2x-reconstruction'):
  prev=0;incs=[]
  for x in d['increments']:
   assert x['recordBytes']-prev==x['bytes'];prev=x['recordBytes'];incs.append({'source':x['name'],'bytes':x['bytes']})
  result['p2x']={'increments':incs,'sum':prev,'rawAbsent':not raw}
for p in sorted((ROOT/'lab/runs/G1').glob('*.json')):
 d=json.loads(p.read_bytes())
 if d.get('experiment')!='EXP-J01':continue
 reports=[x for x in d['objects'] if x['path'].endswith('g1-report.json')]
 rr=[]
 for o in reports:
  # Raw gate files are retained under the durable artifact root, not this review worktree.
  candidates=[ROOT/o['path'],pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2')/o['path']]
  rawp=next((c for c in candidates if c.exists()),None)
  if rawp is None:
   candidates=list(pathlib.Path('/Users/sam/projects/triplex-db-2/.claude/worktrees').glob('*/runs/G1/'+d['runId']+'/g1-report.json'))
   rawp=candidates[0] if candidates else None
  if rawp:
   b=rawp.read_bytes();assert sha(b)==o['sha256'];r=json.loads(b)
   counts=collections.Counter(e['status'] for e in r['executions'])
   assert counts['PASS']==d['counts']['pass'] and counts['FAIL']==d['counts']['fail']
   failures=[e for e in r['executions'] if e['status']=='FAIL']
   rr.append({'path':str(rawp),'sha256':sha(b),'recomputedCounts':dict(counts),'failures':failures})
 result['g1'].append({'receipt':p.name,'note':d['note'],'counts':d['counts'],'verdict':d['verdict'],'rawReports':rr,'encodingBoundInEnvironment':False})
(OUT/'attribution-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'rawHashesChecked':len(result['receipts']),'qleverArms':len(result['qlever']),'xtdbArms':len(result['xtdb']),'g1':result['g1']},indent=2))
