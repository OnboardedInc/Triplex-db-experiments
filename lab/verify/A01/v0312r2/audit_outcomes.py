"""Only promote current-attempt raw gate results after content and source checks."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
HERE=Path(__file__).resolve().parent
ROOT=HERE/'scratch'
s=json.loads((HERE/'source.json').read_bytes())
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==s['merge']
threshold=(HERE/'source.json').stat().st_mtime
for group in ('contract','evaluator','mutations','final'):
 records=json.loads((HERE/(group+'-results.json')).read_bytes())
 assert records and all(x['exit']==0 for x in records),group
 for record in records:
  p=HERE/(record['label']+'.log')
  assert threshold<=p.stat().st_mtime<=time.time(),p
log=(HERE/'evaluator.log').read_text()
counts={k:int(re.search(r'^# '+k+r' (\d+)$',log,re.M)[1]) for k in ('tests','pass','fail','cancelled','skipped','todo')}
assert counts=={'tests':108,'pass':108,'fail':0,'cancelled':0,'skipped':0,'todo':0}
assert len(re.findall(r'^ok \d+ - ',log,re.M))==108 and not re.search(r'^not ok ',log,re.M)
for label,count in [('contract-tests',14),('reviewer-35',35),('reviewer-5',5)]:
 log=(HERE/(label+'.log')).read_text()
 assert re.search(r'Ran '+str(count)+r' tests?\b',log) and re.search(r'^OK$',log,re.M),label
screen=(HERE/'screening-js.log').read_text()
assert '# pass 3' in screen and '# fail 0' in screen and '# skipped 0' in screen
mr=json.loads((HERE/'mutation-reason-audit.json').read_bytes())
assert mr['run']==mr['intendedGuardMatches']==451 and mr['crashKills']==0
for label in ('verify-before','verify-after'):
 log=(HERE/(label+'.log')).read_text()
 for filename in ('oracle-contract.json','obligations.json','load-contract.json','budgets.json','capability-matrix.md','ACCEPTANCE.md'):
  h=hashlib.sha256((ROOT/'lab/acceptance'/filename).read_bytes()).hexdigest()
  assert 'verify '+filename+': '+h in log
 assert 'second regeneration byte-identical' in log
q=(HERE/'q47d.log').read_text()
assert 'Q47d external test: PASS' in q and 'DETECTED regression' in q and "CAUGHT 'pending rows read as RULINGS.md rows'" in q
# [CX-VA01-0312R2] Why: every raw status must be bound to the immutable reviewed bytes; ignored build outputs are checked separately by audit_receipt.py. Rejected: treating exit zero or historical builder logs as this attempt's semantic receipt.
paths=['lab/acceptance/build_contract.py','lab/acceptance/RULINGS.md','lab/acceptance/RULINGS-PENDING.md','lab/acceptance/obligations.json','lab/acceptance/ACCEPTANCE.md','lab/bin/claim.mjs','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','packages/qualification/src/native/xtdb-workloads.ts','packages/qualification/src/native/qlever-workloads.ts','qualification/workloads/temporal-workloads.json','lab/config/g0-expected-skips.json','pnpm-lock.yaml']
hashes={}
for p in paths:
 data=(ROOT/p).read_bytes()
 assert data==subprocess.check_output(['git','show',s['candidate']+':'+p],cwd=ROOT),p
 hashes[p]=hashlib.sha256(data).hexdigest()
(HERE/'outcome-audit.json').write_text(json.dumps({'source':s,'sourceHashes':hashes,'evaluator':counts,'mutationCount':451,'g0Run':json.loads((HERE/'G0-object-audit.json').read_bytes())['runId'],'rawLogsCreatedAfterSnapshot':True,'allContentFreshnessBindingChecksPassed':True},indent=2)+'\n')
print('Content, freshness and immutable source binding verified for fresh evaluator, contract, screening, mutation, regeneration and pending-authority outcomes')
