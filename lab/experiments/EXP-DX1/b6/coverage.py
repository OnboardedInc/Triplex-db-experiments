# [DX-B6] Why: count unique package cases and retain actual shard boundaries/exit statuses.
# Rejected: adding repeated shard executions or intentional skips to the pass denominator.
import pathlib,re,json
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6')
suite=(root/'suite-e.log').read_text();blocks=re.split(r'\n\s*RUN\s+v[^\n]+\n',suite)[1:]
assert len(blocks)==2
fast=[]
for block in blocks:
 assert not re.search(r'^\s*Tests\s+.*failed',block,re.M)
 passed=re.findall(r'^ ✓ (packages/\S+) > ',block,re.M)
 skipped=re.findall(r'^ ↓ (packages/\S+) > ',block,re.M)
 fast.append({'datomicPassed':sum(p.startswith('packages/datomic/') for p in passed),'corePassed':sum(p.startswith('packages/core/') for p in passed),'datomicSkipped':sum(p.startswith('packages/datomic/') for p in skipped)})
assert fast==[{'datomicPassed':178,'corePassed':6,'datomicSkipped':0},{'datomicPassed':176,'corePassed':6,'datomicSkipped':2}],fast
for layout in ['legacy','lean']:
 for name,n in [(f'concurrent-{layout}-b',5),(f'reach-{layout}-b',3)]:
  assert (root/(name+'.exit-code')).read_text().strip()=='0'
  text=(root/(name+'.log')).read_text()
  assert re.search(rf'^\s*Tests\s+{n} passed',text,re.M)
peer=(root/'peer-c.log').read_text()
assert len(re.findall(r'^\s*Tests\s+1 passed',peer,re.M))==4
peer_stats=[json.loads(line) for line in peer.splitlines() if line.startswith('{"recordTimePeer"')]
assert len(peer_stats)==4 and all(s['recordTimePeer']==5000 and s['readAnswers']==10000 for s in peer_stats)
shards=[]
for first in [0,100,200]:
 name=f'differential-{first}-c'
 assert (root/(name+'.exit-code')).read_text().strip()=='0'
 text=(root/(name+'.log')).read_text();assert re.search(r'^\s*Tests\s+2 passed',text,re.M)
 summaries=[]
 for line in text.splitlines():
  if line.startswith('{'):
   try:d=json.loads(line)
   except json.JSONDecodeError:continue
   if 'firstScenario' in d:summaries.append(d)
 assert len(summaries)==1
 shard=summaries[0]
 assert shard['firstScenario']==first and shard['scenarios']==100 and shard['drawsPerScenario']==121
 assert shard['randomDraws']==(first+100)*121
 assert shard['comparisons']>0 and shard['fast']>0 and shard['rowClosures']>0
 shards.append(shard)
for a,b in zip(shards,shards[1:]):assert a['finalRandomState']==b['inputRandomState']
u=0x19870219
assert shards[0]['inputRandomState']==u
for draw in range(1,36301):
 u=(u^(u<<13))&0xffffffff;u=(u^(u>>17))&0xffffffff;u=(u^(u<<5))&0xffffffff
 if draw in [12100,24200,36300]:assert (shards[draw//12100-1]['finalRandomState']&0xffffffff)==u
result={'kind':'developer test coverage; not acceptance','fastBatches':fast,'logicalDatomicCases':189,'legacy':{'passed':189,'skipped':0},'lean':{'passed':187,'skipped':2},'distinctCoreCases':6,'heavyCasesPerLayout':{'concurrencyAndClock':5,'reach':3,'peer':1,'pairedDifferential':2},'peerCommits':20000,'peerAnswers':40000,'differential':{'scenarios':300,'comparisons':sum(s['comparisons']for s in shards),'fast':sum(s['fast']for s in shards),'rowClosures':sum(s['rowClosures']for s in shards),'shards':shards}}
(root/'SUITE-COVERAGE.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
