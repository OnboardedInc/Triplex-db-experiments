"""CX-VO06 round 3: final content, freshness, source and mutation binding audit."""
import ast
import datetime
import hashlib
import importlib
import inspect
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round3'
DEST=OUT/'seal.json'
if DEST.exists():raise SystemExit('Existing seal retained; use a new attempt')
sys.path.insert(0,str(ROOT))
from lab.oracles.replay.tests import test_contract_section4 as T

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def flatten(suite):
    for item in suite:
        if isinstance(item,unittest.TestSuite):yield from flatten(item)
        else:yield item.id()
def apply_ast(file):
    return ast.dump(next(n for n in ast.parse(file.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='apply'),include_attributes=False)

suite=unittest.defaultTestLoader.discover(str(ROOT/'lab/oracles/replay/tests'),top_level_dir=str(ROOT))
ids=set(flatten(suite))
mappings=[]
for name,targets in T.CONTRACT_TEST_MAPPINGS.items():
    verified=[]
    for target in targets:
        module,cls,method=target.rsplit('.',2)
        func=getattr(getattr(importlib.import_module(module),cls),method)
        verified.append({'target':target,'discovered':target in ids,'callable':callable(func),
            'file':str(Path(inspect.getsourcefile(func)).relative_to(ROOT)),
            'line':inspect.getsourcelines(func)[1]})
    mappings.append({'contractId':name,'nonempty':bool(verified),'targets':verified})
normal=json.loads((OUT/'evidence/audit.json').read_text())
coverage=json.loads((OUT/'coverage/summary.json').read_text())
commands=json.loads((OUT/'evidence/commands.json').read_text())
pins=json.loads((OUT/'evidence/inputs.json').read_text())
mutationPins=json.loads((OUT/'coverage/inputs.json').read_text())
unit=(OUT/'evidence/unit-final.log').read_text()
targets={'Q70E-unfiltered-prefixes':['test_Q70E_only_issuing_prefixes'],
 'Q70H-compare-page-bodies':['test_Q70H_equal_view_different_bodies'],
 'Q70I-choose-ambiguous-journal':['test_Q70I_journal_ambiguity_and_scope'],
 'Q70I-ignore-journal-scope':['test_Q70I_journal_ambiguity_and_scope'],
 'Q70K-default-nonjournal-scope':['test_Q70K_scope_on_every_scope_surface','test_Q70L_entity_and_scope_key'],
 'Q70L-ignore-entity-scope-key':['test_Q70L_entity_and_scope_key']}
mutations=[]
for row in coverage['mutations']:
    names=targets[row['mutation']]
    required=names[0]
    prefix='lab.oracles.replay.tests.test_q70_coverage.Q70Coverage.'
    failures=row['failures']
    mutations.append({'variant':row['mutation'],'testsRun':row['run'],'errors':row['errors'],
       'failureIdentities':failures,'requiredTargetCaught':any(f.startswith(prefix+required) for f in failures),
       'noUnrelatedFailures':bool(failures) and all(any(f.startswith(prefix+n) for n in names) for f in failures),
       'resultSha256':sha(OUT/'coverage'/(row['mutation']+'.result.json')),
       'logSha256':sha(OUT/'coverage'/(row['mutation']+'.tests.log'))})
manifest=[]
for line in (ROOT/'lab/experiments/EXP-O06/SHA256SUMS').read_text().splitlines():
    expected,name=line.split('  ',1)
    manifest.append({'path':name,'expected':expected,'actual':sha(ROOT/name)})
sourceFiles=[p for p in (ROOT/'lab/oracles/replay').rglob('*.py')]
sourceBound=all(p.read_bytes()==subprocess.check_output(['git','show','fed510ec:'+str(p.relative_to(ROOT))],cwd=ROOT) for p in sourceFiles)
checks={
 'unmodifiedSuiteGreen':bool(re.search(r'^Ran 403 tests',unit,re.M)) and bool(re.search(r'^OK$',unit,re.M)) and not normal['unitFailureHeaders'],
 'mutationBaselineGreen':coverage['baseline']['run']==403 and not coverage['baseline']['failures'] and not coverage['baseline']['errors'],
 'allSixWrongVariantsCaught':len(mutations)==6 and all(r['testsRun']==403 and not r['errors'] and r['requiredTargetCaught'] and r['noUnrelatedFailures'] for r in mutations),
 'fiveSemanticGapsMapped':all('CONTRACT-'+s in T.CONTRACT_TEST_MAPPINGS for s in ['Q70E','Q70H','Q70I','Q70K','Q70L']),
 'allMappingsDiscovered':len(mappings)==17 and all(r['nonempty'] and all(t['callable'] and t['discovered'] for t in r['targets']) for r in mappings),
 'legacyErrorCompatibilityExact':set(T.ERR.ERROR_TABLE)-{r['id'] for r in T.CONTRACT['errorTable']}=={'E-UNAVAILABLE-CUT'} and T.ERR.ERROR_TABLE['E-UNAVAILABLE-CUT']==('ReadError','unavailable-cut','preflight'),
 'probes22Exact':len(normal['probeBindings'])==22 and not normal['probeSpecMismatches'] and all(r['sameOriginalBytes'] and r['caseMatches'] and r['runtimeMatches'] for r in normal['probeBindings']),
 'legacy341PerLaneUnchanged':len(normal['comparisons'])==2 and all(r['legacyItems']==341 and r['legacyEqual'] and r['otherItems']==331 and r['otherEqual'] and len(r['replacement'])==10 and all(t['verdict']=='AGREE' for t in r['replacement']) for r in normal['comparisons']),
 'goldenOutputs522Bound':len(normal['boundOutputs'])==522 and all(r['caseMatches'] and r['runtimeMatches'] for r in normal['boundOutputs']),
 'commandLogsBound':all(sha(OUT/'evidence'/(r['label']+'.log'))==r['logSha256'] and r['exit']==0 for r in commands['commands']),
 'allSourceAndFixtureInputsStillUnchanged':normal['sourceInputsUnchanged'] and coverage['sourceUnchanged'] and all(sha(ROOT/p)==s for p,s in {**pins,**mutationPins}.items()),
 'oracleFilesMatchBuilderHead':sourceBound,
 'builderManifestMatches':all(r['expected']==r['actual'] for r in manifest),
 'wrongSubstitutionsSameAsRound2':apply_ast(HERE/'round2_coverage.py')==apply_ast(HERE/'round3_coverage.py')}
seal={'finished':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),
 'builderHead':'fed510ecf5137873d5dab1ad192f0e54f8ed0955',
 'scope':'independent offline O-REPLAY pin review only; no engine or product qualification',
 'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'mappingAudit':mappings,
 'mutationAudit':mutations,'manifestCheck':manifest,
 'normalAuditSha256':sha(OUT/'evidence/audit.json'),'coverageSummarySha256':sha(OUT/'coverage/summary.json'),
 'inputsSha256':sha(OUT/'evidence/inputs.json'),'mutationInputsSha256':sha(OUT/'coverage/inputs.json'),
 'reviewScripts':{p.name:sha(p) for p in [HERE/'round3_run.py',HERE/'round3_coverage.py',Path(__file__)]}}
DEST.write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'status':seal['status'],'checks':checks,'mutations':mutations},indent=2))
raise SystemExit(0 if seal['status']=='PASS' else 1)
