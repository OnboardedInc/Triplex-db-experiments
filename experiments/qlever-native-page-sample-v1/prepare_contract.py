"""Freeze separate sampler/component proposals. No native/action invocation."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(ROOT/'experiments/qlever-native-fault-preflight-v2'))
from read_bounds import canonical,read_file
from sample import BOUNDS,PLAN


def sha(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def write(path,value):path.write_bytes(canonical(value)+b'\n')


def prepare():
    job='qlever-native-page-sample-v1';destination=ROOT/'qualification/native-jobs'/job;destination.mkdir(exist_ok=False)
    prior=ROOT/'qualification/native-jobs/qlever-native-count-inventory-v1/contract.json';contract=json.loads(read_file(prior,1024**2))
    for key in ['countWindowSeconds','countWireMaximumBytes','payloadPagesAllowed']:contract.pop(key,None)
    report_path=ROOT/'.devloop/jobs/qlever-native-count-inventory-v1/attempts/0001/artifacts/report.json';report=json.loads(read_file(report_path,1024**2))
    reference={'job':'qlever-native-count-inventory-v1/0001','report':str(report_path.relative_to(ROOT)),'reportSha256':sha(report_path),'counts':{key:value['parsedCountDecimal'] for key,value in report['counts'].items()},'meaning':'Historical separate RDF query populations, not present counts or unique entities/facts'}
    contract.update({'format':'triplex-read-only-rdf-page-sample-contract/1','mode':'READ_ONLY_NATIVE_PAGE_SAMPLE','jobId':job,'sampleBounds':BOUNDS,'pageSchedule':[list(value) for value in PLAN],'oldContinuityBudgetUnchanged':200000,'wholeContinuityAllowed':False,'countsAllowed':False,'priorCountObservation':reference,'priorCountContractSha256':sha(prior)})
    state=json.loads(read_file(ROOT/'.devloop/state.json',2*1024**2));contract['registeredStartedAt']=state['owners']['foundation-qlever']['observation']['startedAt'];contract['stateOwnerSha256']=sha(ROOT/'.devloop/owner.json')
    contract_path=destination/'contract.json';write(contract_path,contract)
    expected={'format':'triplex-read-only-page-checks/1','sixClosedPages':True,'termChannelsAndObservedPagingChecked':True,'exactSafeRawAndCanonicalSizesRetained':True,'ownerAndSettingsUnchanged':True,'wholeContinuityAttempted':False,'readOnly':True}
    expected_path=destination/'expected.json';write(expected_path,expected)
    files=[path for path in sorted(HERE.iterdir()) if path.is_file() and path.suffix in {'.py','.mjs','.md'}]
    pairs=[(str(path.relative_to(ROOT)),'runner' if path.name=='runner.mjs' else 'source') for path in files]
    pairs += [('experiments/qlever-native-fault-preflight-v2/'+name,'source') for name in ['read_bounds.py','read_native.py','queries.py','preflight.py','continuity.py']]
    pairs += [('qualification/devloop/state.mjs','source'),('qualification/devloop/io.mjs','source'),('tools/bootstrap/with-env.sh','source'),('tools/bootstrap/check-storage.py','source'),('provenance/bounded-storage.json','fixture'),('.devloop/owner.json','fixture'),('qualification/evidence/qlever-native-readonly-preflight-v2-author-scope-correction.json','fixture'),(str(report_path.relative_to(ROOT)),'fixture'),('qualification/reviews/qlever-native-count-inventory-v1-terminal-independent.json','fixture'),(str(contract_path.relative_to(ROOT)),'recipe'),(str(expected_path.relative_to(ROOT)),'oracle'),('.local/tools/node-v24.13.0-darwin-arm64/bin/node','build')]
    inputs=[{'path':path,'role':role,'sha256':sha(ROOT/path)} for path,role in pairs]
    manifest={'format':'triplex-devloop-job/1','id':job,'kind':'verification','queryPath':'qlever-native','backend':'qlever','author':'qlever-agent','logicalTaskId':'read-only-rdf-prefix-page-calibration','problemId':'measure-payload-and-paging-before-full-continuity-budget-selection','hypothesis':'The first two256-row pages and one repeated first page from each RDF population can measure bounded wire/canonical size and client wall stages while checking only their observed paging consistency.','goals':[6,7],'dependsOn':[],'requiredOwners':['foundation-qlever'],'inspiration':[{'reference':'qlever-native-readonly-preflight-v2/0001 and qlever-native-count-inventory-v1/0001','mechanism':'The old continuity refusal left payload/paging cost unmeasured; separate named/default counts are now known','adaptation':'Six explicit page measurements at unchanged256-row shape, no full capture, new continuity allowance or native recovery.'}],'command':{'argv':[str(ROOT/'.local/tools/node-v24.13.0-darwin-arm64/bin/node'),'--max-old-space-size=256','experiments/qlever-native-page-sample-v1/runner.mjs',str(contract_path.relative_to(ROOT))],'cwd':'.','env':{'NODE_OPTIONS':'--max-old-space-size=256','PYTHONDONTWRITEBYTECODE':'1'}},'resources':{'heavy':True,'memoryBytes':896*1024**2,'cpuUnits':1,'diskBytes':64*1024**2,'timeoutMilliseconds':180000,'maximumLogBytes':8*1024**2},'inputs':inputs,'evidence':{'checks':[{'key':'readonly-rdf-prefix-pages','expectedInput':str(expected_path.relative_to(ROOT)),'actual':'artifacts/checks.json'}],'requiredCheckKeys':['readonly-rdf-prefix-pages']},'retention':{'scratch':'rebuildable-ephemeral-only','meaning':'Keep bounded safe raw/canonical/gzip page observations, partial failures/timings and declared source preimages. No retry/cancel/settings mutation/continuity/fault action.'},'profile':{'name':'qlever-native-prefix-pages100-v1','serverMemoryBytes':2*1024**3,'serverCpuUnits':1.5,'planner':100,'sampleBounds':BOUNDS,'pageSchedule':[list(value) for value in PLAN],'timingScope':'CLIENT_WALL_NOT_ENGINE_CPU','performanceComparison':False}}
    manifest_path=destination/'manifest.json';manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    proposal={'format':'triplex-qlever-page-sample-source-proposal/1','status':'PREPARED_NOT_ENQUEUED_NOT_EXECUTED','manifest':str(manifest_path.relative_to(ROOT)),'manifestSha256':sha(manifest_path),'contractSha256':sha(contract_path),'ownSources':[{'path':str(path.relative_to(ROOT)),'sha256':sha(path)} for path in files],'declaredInputs':inputs,'resources':manifest['resources'],'sampleOnly':True,'nativeActions':0}
    proposal_path=destination/'proposal.json';proposal_path.write_text(json.dumps(proposal,indent=2)+'\n')
    component_job='qlever-native-page-sample-components-v1';component_directory=ROOT/'qualification/native-jobs'/component_job;component_directory.mkdir(exist_ok=False)
    component_expected=component_directory/'expected.json';write(component_expected,{'format':'triplex-qlever-page-sample-components/1','cases':16,'failures':0,'errors':0,'operationalCalls':0})
    component={**manifest,'id':component_job,'logicalTaskId':'fake-only-rdf-page-sampler-controls','problemId':'prove-closed-bounded-prefix-calibration-before-native-grant','hypothesis':'Fake adversarial transport/row/paging/error controls pass without any host network or native action.','requiredOwners':[],'command':{'argv':[contract['pythonRuntime']['invocation'],'experiments/qlever-native-page-sample-v1/test_sample.py'],'cwd':'.','env':{'PYTHONDONTWRITEBYTECODE':'1'}},'resources':{'heavy':True,'memoryBytes':512*1024**2,'cpuUnits':1,'diskBytes':16*1024**2,'timeoutMilliseconds':120000,'maximumLogBytes':4*1024**2},'inputs':inputs+[{'path':str(component_expected.relative_to(ROOT)),'role':'oracle','sha256':sha(component_expected)}],'evidence':{'checks':[{'key':'fake-sampler-components','expectedInput':str(component_expected.relative_to(ROOT)),'actual':'artifacts/components.json'}],'requiredCheckKeys':['fake-sampler-components']},'profile':{'name':'qlever-page-sampler-fake-only-v1','componentOnly':True,'operationalCallsAllowed':0}}
    component_path=component_directory/'manifest.json';component_path.write_text(json.dumps(component,indent=2)+'\n')
    print(json.dumps({'status':proposal['status'],'manifestSha256':sha(manifest_path),'contractSha256':sha(contract_path),'proposalSha256':sha(proposal_path),'ownSources':len(files),'declaredInputs':len(inputs),'componentManifestSha256':sha(component_path)}))


if __name__=='__main__':prepare()
