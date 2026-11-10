#!/usr/bin/env python3
# [XN-S2-LIVE] Why: recompute diagnostic quantiles and reject incomplete/content-mismatched or differently bound samples. Rejected: turning emitted exit zero or a stored latency summary into acceptance.
import datetime,hashlib,json,math,pathlib,time,xml.etree.ElementTree as ET
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live')
def load(p):return json.loads(p.read_text())
def dt(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def quantiles(values):
 a=sorted(values);assert a and all(math.isfinite(x) and x>=0 for x in a)
 return {'n':len(a),'p50':a[math.ceil(len(a)*.5)-1],'p99':a[math.ceil(len(a)*.99)-1],'max':a[-1]}
images=load(ROOT/'images.json');image_ids={tag:i['Id'] for i in images for tag in i['RepoTags'] or []}
rows=[];invalid=[];windows=[]
for window in sorted(ROOT.iterdir()):
 if not window.is_dir() or not (window/'source.json').exists() or not (window/'driver').exists():continue
 source=load(window/'source.json')
 for name,expected in source['files'].items():assert hashlib.sha256((window/'sources'/name).read_bytes()).hexdigest()==expected,(window,name)
 released=dt((window/'released.txt').read_text().strip());binding=load(window/'binding.json')
 windows.append({'path':window.name,'completed':(window/'completed.json').exists(),'failure':load(window/'failure.json') if (window/'failure.json').exists() else None,'volumeBytes':load(window/'volume-total.json')['bytes'] if (window/'volume-total.json').exists() else None})
 for p in sorted((window/'driver').glob('*.json')):
  x=load(p)
  if not isinstance(x,dict) or 'before' not in x or 'latency' not in x or 'samples' not in x:continue
  if x.get('binding',{}).get('stage')!=binding['stage'] or x.get('binding',{}).get('attempt')!=binding['attempt']:continue
  try:
   assert x['binding']==binding,'case binding differs'
   assert dt(binding['at'])<=dt(x['before']['at'])<=dt(x['after']['at'])<=released,'freshness'
   containers={c['Name'].lstrip('/'):c for c in binding['containers']}
   cpus={'tx2-xns2-write':'0,1','tx2-xns2-read':'2,3','tx2-xns2-kafka':'0','tx2-xns2-s3':'0'}
   for name in x['before']['stats']:
    c=containers[name];assert c['HostConfig']['CpusetCpus']==cpus[name] and not c['HostConfig']['PortBindings']
    cap=3758096384 if name.endswith(('write','read')) else 1073741824
    assert c['HostConfig']['Memory']==cap and c['HostConfig']['MemorySwap']==cap,'memory cap'
    expected=image_ids['ghcr.io/xtdb/xtdb-aws:2.2.0'] if name.endswith(('write','read')) else image_ids['apache/kafka:4.1.1'] if name.endswith('kafka') else image_ids['cgr.dev/chainguard/minio:latest']
    assert c['Image']==expected,'image'
    final=load(window/(name+'-final.json'))[0];assert final['Id']==c['Id'] and not final['State']['OOMKilled'],'engine changed/OOM'
    assert x['after']['stats'][name]['cpuUsec']>=x['before']['stats'][name]['cpuUsec']
   keeper='\n'.join(f.read_text() for f in window.glob('keeper-*.txt'))
   assert ('running 8' in keeper and '"onePerCpu": true' in keeper) if x['keepAwake'] else 'running 0' in keeper
   if '-off-' in x['name']:assert not x['keepAwake'],'off label'
   if '-on-' in x['name'] or x['name'].startswith('read-') or x['name']=='wait-mechanism':assert x['keepAwake'],'on label'
   if x['name'].startswith('open-'):
    assert x['n']==x['offered']==len(x['samples']) and not x['errors']
    check=load(window/'driver'/(x['name']+'-content.json'))
    assert not check['errors'] and int(check['claims'][0]['n'])==x['n']+201 and int(check['docs'][0]['n'])==3*(x['n']+200) and int(check['heads'][0]['n'])==x['n']+200
    assert sum(r['clients'] for r in x['readerResults'])==x['readerCount'] and all(r['n']>0 for r in x['readerResults'])
    if x['lagSamples']:assert len(x['lagSamples'])==x['n']
   elif x['name'].startswith('read-'):
    assert x['n']==len(x['samples']) and len({s['i'] for s in x['samples']})==x['n']
    if x.get('writerResult'):
     w=x['writerResult'];assert w['offered']==w['acknowledged']>0 and not w['errors'] and int(w['claims'][0]['n'])==w['acknowledged']+1 and int(w['docs'][0]['n'])==w['acknowledged']*3
   elif x['name'].startswith('closed-'):
    assert x['n']==len(x['samples'])
    check=load(window/'driver'/(x['name']+'-content.json'));assert check['content'] and check['scope']==x['scope']
    assert int(check['head'][0]['pos'])==check['base']+x['n']+200 and int(check['docs'][0]['n'])==3*(x['n']+200)
   values=[s['awaitAndPullMs'] if x['name']=='wait-mechanism' else s['ms'] for s in x['samples']]
   q=quantiles(values)
   for key in ['p50','p99','max']:assert abs(q[key]-x['latency'][key])<1e-8,'quantiles'
   row={k:x.get(k) for k in ['name','keepAwake','n','elapsedMs','readWallMs','clients','kind','requestedKind','rate','readerCount','cpuSeconds','engineCpuSeconds']}
   row.update({'window':window.name,'path':str(p.relative_to(ROOT)),'latency':q,'pullsPerSecond':x['n']*1000/x.get('readWallMs',x['elapsedMs']) if x['name'].startswith('read-') else None,'lag':quantiles([s['ms'] for s in x['lagSamples']]) if x.get('lagSamples') else None,'writer':{k:x['writerResult'][k] for k in ['rate','offered','acknowledged','elapsedMs','latency']} if x.get('writerResult') else None,'memory':{k:{'current':v['memoryCurrent'],'peak':v['memoryPeak']} for k,v in x['after']['stats'].items()}})
   rows.append(row)
  except Exception as e:invalid.append({'path':str(p.relative_to(ROOT)),'error':repr(e)})
output={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'collectorSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'kind':'diagnostic recomputation, no acceptance verdict','windows':windows,'rows':rows,'invalid':invalid}
(ROOT/f'collection-{time.time_ns()}.json').write_text(json.dumps(output,indent=2)+'\n')
(ROOT/'collected.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({'windows':windows,'rows':len(rows),'invalid':invalid},indent=2))

if invalid:raise SystemExit(2)
