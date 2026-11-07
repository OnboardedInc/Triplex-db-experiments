"""Prepare a new metadata-only source contract. No native query/inspection."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'experiments/qlever-native-fault-preflight-v2'))
from read_bounds import canonical,read_file


def sha(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        while raw:=stream.read(65536):digest.update(raw)
    return digest.hexdigest()


def prepare():
    job='qlever-native-count-inventory-v1';destination=ROOT/'qualification/native-jobs'/job;destination.mkdir(exist_ok=False)
    prior=ROOT/'qualification/native-jobs/qlever-native-readonly-preflight-v2/contract.json'
    contract=json.loads(read_file(prior,1024*1024))
    contract.update({'format':'triplex-read-only-rdf-count-contract/1','mode':'READ_ONLY_NATIVE_COUNT_INVENTORY','jobId':job,'countWireMaximumBytes':256*1024,'countWindowSeconds':30,'payloadPagesAllowed':False,'existingContinuityBudgetUnchanged':200000,'priorFailedContractSha256':sha(prior),'priorFailedCountChannel':'UNKNOWN_NOT_RECONSTRUCTED_BY_NEW_MEASUREMENT'})
    contract.pop('ackCatalog',None)
    state=json.loads(read_file(ROOT/'.devloop/state.json',2*1024**2));contract['registeredStartedAt']=state['owners']['foundation-qlever']['observation']['startedAt'];contract['stateOwnerSha256']=sha(ROOT/'.devloop/owner.json')
    contract_path=destination/'contract.json';contract_path.write_bytes(canonical(contract)+b'\n')
    expected={'format':'triplex-native-count-inventory-checks/1','twoCountRepliesRetained':True,'integerLexicalParsingExact':True,'ownerAndSettingsUnchanged':True,'payloadPagesRequested':0,'readOnly':True}
    expected_path=destination/'expected.json';expected_path.write_bytes(canonical(expected)+b'\n')
    files=[path for path in sorted(HERE.iterdir()) if path.is_file() and path.suffix in {'.py','.mjs','.md'}]
    pairs=[(str(path.relative_to(ROOT)),'runner' if path.name=='runner.mjs' else 'source') for path in files]
    pairs += [('experiments/qlever-native-fault-preflight-v2/'+name,'source') for name in ['read_bounds.py','read_native.py','queries.py','preflight.py','continuity.py']]
    pairs += [('qualification/devloop/state.mjs','source'),('qualification/devloop/io.mjs','source'),('tools/bootstrap/with-env.sh','source'),('tools/bootstrap/check-storage.py','source'),('provenance/bounded-storage.json','fixture'),('.devloop/owner.json','fixture'),('qualification/evidence/qlever-native-readonly-preflight-v2-author-scope-correction.json','fixture'),(str(contract_path.relative_to(ROOT)),'recipe'),(str(expected_path.relative_to(ROOT)),'oracle'),('.local/tools/node-v24.13.0-darwin-arm64/bin/node','build')]
    inputs=[{'path':path,'role':role,'sha256':sha(ROOT/path)} for path,role in pairs]
    manifest={'format':'triplex-devloop-job/1','id':job,'kind':'verification','queryPath':'qlever-native','backend':'qlever','author':'qlever-agent','logicalTaskId':'read-only-named-default-rdf-population-inventory','problemId':'retain-count-channel-before-continuity-budget-refusal','hypothesis':'Two exact bounded RDF COUNT replies and safe owner/profile/activity observations can be retained incrementally without payload pages or increasing any continuity admission cap.','goals':[6,7],'dependsOn':[],'requiredOwners':['foundation-qlever'],'inspiration':[{'reference':'qlever-native-readonly-preflight-v2/0001 and its independent terminal scope correction','mechanism':'Opaque failure hashing did not identify the count population/value','adaptation':'Metadata-only named/default descriptor routes, exact safe raw reply before parsing, per-stage failure evidence; no new continuity/fault acceptance.'}],'command':{'argv':[str(ROOT/'.local/tools/node-v24.13.0-darwin-arm64/bin/node'),'--max-old-space-size=256','experiments/qlever-native-count-inventory-v1/runner.mjs',str(contract_path.relative_to(ROOT))],'cwd':'.','env':{'NODE_OPTIONS':'--max-old-space-size=256'}},'resources':{'heavy':True,'memoryBytes':896*1024**2,'cpuUnits':1,'diskBytes':64*1024**2,'timeoutMilliseconds':180000,'maximumLogBytes':8*1024**2},'inputs':inputs,'evidence':{'checks':[{'key':'readonly-rdf-count-inventory','expectedInput':str(expected_path.relative_to(ROOT)),'actual':'artifacts/checks.json'}],'requiredCheckKeys':['readonly-rdf-count-inventory']},'retention':{'scratch':'rebuildable-ephemeral-only','meaning':'Keep exact safe raw COUNT replies, parsed decimal strings, all incremental metadata/errors and source preimages; no payload/copy/mount/native recovery.'},'profile':{'name':'qlever-native-count-only100-v1','component':'RDF count-population metadata only','serverMemoryBytes':2*1024**3,'serverCpuUnits':1.5,'planner':100,'payloadPagesAllowed':False,'countWireMaximumBytes':256*1024,'countWindowSeconds':30,'performanceComparison':False}}
    manifest_path=destination/'manifest.json';manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    proposal={'format':'triplex-qlever-count-inventory-source-proposal/1','status':'PREPARED_NOT_ENQUEUED_NOT_EXECUTED','manifest':str(manifest_path.relative_to(ROOT)),'manifestSha256':sha(manifest_path),'contractSha256':sha(contract_path),'ownSources':[{'path':str(path.relative_to(ROOT)),'sha256':sha(path)} for path in files],'declaredInputs':inputs,'resources':manifest['resources'],'nativeActions':0}
    (destination/'proposal.json').write_text(json.dumps(proposal,indent=2)+'\n');print(json.dumps({key:proposal[key] for key in ['status','manifest','manifestSha256','contractSha256','resources','nativeActions']}))


if __name__=='__main__':prepare()
