# [DX-B7] Why: count observed JFR frames and durations, retaining raw events. Rejected: inferring hotspots from source.
import json,collections,sys,datetime,re
from pathlib import Path
p=Path(sys.argv[1]);events=json.loads(p.read_text())['recording']['events']
def frame(f):
 m=f['method'];return m['type']['name']+'.'+m['name']
def duration(s):
 m=re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?([0-9.]+)S',s)
 if not m: raise ValueError(s)
 return (float(m[1] or 0)*3600+float(m[2] or 0)*60+float(m[3]))*1000

def analyze(events):
 leaf=collections.Counter();inclusive=collections.Counter();mon=collections.Counter();gc=[];threads=[]
 for e in events:
  v=e['values'];t=e['type']
  if t=='jdk.ExecutionSample':
   frames=(v.get('stackTrace') or {}).get('frames',[])
   if frames:
    leaf[frame(frames[0])]+=1;inclusive.update(set(map(frame,frames)))
  elif t=='jdk.JavaMonitorEnter':mon[v['monitorClass']['name']]+=duration(v['duration'])
  elif t=='jdk.GCPhasePause':gc.append(duration(v['duration']))
  elif t=='jdk.JavaThreadStatistics':threads.append(v)
 return {'samples':sum(leaf.values()),'leafTop25':leaf.most_common(25),'inclusiveTop25':inclusive.most_common(25),'gcPauseMs':sum(gc),'gcPauseCount':len(gc),'monitorEnterMs':mon.most_common(),'threadStatistics':threads}
result={'all':analyze(events)}
if len(sys.argv)>2:
 phases=json.loads(Path(sys.argv[2]).read_text())['phases']
 def stamp(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
 for name,phase in phases.items():
  if 'startedAt' in phase:
   lo,hi=stamp(phase['startedAt']),stamp(phase['finishedAt'])
   result[name]=analyze([e for e in events if lo<=stamp(e['values']['startTime'])<=hi])
print(json.dumps(result,indent=2))
