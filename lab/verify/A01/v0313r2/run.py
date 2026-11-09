"""Collect fresh command observations from the immutable candidate; no status-only verdict."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
HERE=Path(__file__).resolve().parent
SOURCE=json.loads((HERE/'source.json').read_bytes())
ROOT=HERE/'scratch'
RAW=Path(SOURCE['raw'])
mode=sys.argv[1]
T='lab/experiments/EXP-A01-acceptance-contract/regressions/'
commands={
'contract':[('verify-before',['python3','-I','-B','lab/acceptance/build_contract.py','--verify']),('contract',['python3','-I','-B',T+'test0313.py']),('js-policy',['node','--test',T+'screening0313.test.mjs',T+'merge0313-round2.test.mjs']),('payload',['python3','-I','-B','lab/verify/A01/regressions_round2.py'])],
'evaluator-linked':[('evaluator-linked',['node','--test','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs'])],
'evaluator':[('evaluator-candidate',['node','--test','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs'])],
'mutations':[('mutations',['python3','-I','-B',str(HERE/'capture_mutations.py')])],
'install':[('install',['/opt/homebrew/bin/pnpm','--store-dir','/Users/sam/projects/triplex-db-2/.pnpm-store','install','--offline','--frozen-lockfile'])],
'boundary-recheck':[('boundaries-recheck',['node','--test','lab/experiments/EXP-QG1-qlever-generations/engine-options.test.mjs',str(HERE/'boundary_variations.mjs')])],
'final':[('boundaries',['node','--test','lab/experiments/EXP-QG1-qlever-generations/engine-options.test.mjs',str(HERE/'boundary_variations.mjs')]),('q47d',['python3','-I','-B',T+'q47d_test0311.py']),('verify-final',['python3','-I','-B','lab/acceptance/build_contract.py','--verify'])]}
assert shutil.disk_usage(ROOT).free>=5*1024**3
assert not (RAW/(mode+'-results.json')).exists()
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert head==SOURCE['testHead']
results=[]
for label,argv in commands[mode]:
 start=time.time()
 with (RAW/(label+'.log')).open('xb') as out:r=subprocess.run(argv,cwd=ROOT,stdout=out,stderr=subprocess.STDOUT)
 results.append({'label':label,'argv':argv,'start':start,'end':time.time(),'exit':r.returncode,'head':head,'logSha256':hashlib.sha256((RAW/(label+'.log')).read_bytes()).hexdigest()})
 print(label,r.returncode,flush=True)
(RAW/(mode+'-results.json')).write_text(json.dumps(results,indent=2)+'\n')
# [CX-VA01-0313] Why: record real exits without relabelling failures; semantic result adoption is a separate content/freshness/source audit. Rejected: counting zero exit as an engine or contract acceptance receipt.
sys.exit(any(x['exit'] for x in results))
