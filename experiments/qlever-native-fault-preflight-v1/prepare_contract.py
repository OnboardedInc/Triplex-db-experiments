"""Prepare immutable source/manifest bytes only. No native/daemon inspection."""
from __future__ import annotations
import dataclasses
import hashlib
import json
from pathlib import Path
import sys
import uuid

from read_bounds import LIMITS,canonical,read_file

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent


def sha(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        while chunk:=stream.read(65536):digest.update(chunk)
    return digest.hexdigest()


def prepare():
    job='qlever-native-readonly-preflight-v1'
    destination=ROOT/'qualification/native-jobs'/job
    destination.mkdir(exist_ok=False)
    state=json.loads(read_file(ROOT/'.devloop/state.json',2*1024**2))
    owner=state['owners']['foundation-qlever']
    catalog=ROOT/'qualification/evidence/qlever-native-fault-v2-ack-authority-index-v2.json'
    contract={'format':'triplex-read-only-qlever-api-contract/1','mode':'READ_ONLY_NATIVE_API_PREFLIGHT','jobId':job,'root':str(ROOT),'stateOwnerSha256':sha(ROOT/'.devloop/owner.json'),'containerId':'e225d359e2a8211de8c5b3551e1aff8952b92b41922c4f90505ca4c6afc30b3f','imageSha256':'sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec','daemonId':'83f54592-d273-4f4e-9f03-4b0b7c1dd105','ownerLabel':'triplex-db-portable-13e39903','mainData':str(ROOT/'.runtime/engines/qlever-main/data'),'registeredStartedAt':owner['observation']['startedAt'],'fixedNativeArguments':['-i','triplex','-p','7019','-j','4','-m','512M','-c','64M','-e','32M','--persist-updates','--no-patterns','--enable-metrics','--access-token'],'namespace':'urn:triplex:fault-v2:'+str(uuid.uuid4())+':','limits':dataclasses.asdict(LIMITS),'ackCatalog':{'path':str(catalog.relative_to(ROOT)),'sha256':sha(catalog)},'pythonRuntime':{'path':str(Path(sys.executable).resolve()),'invocation':str(Path(sys.executable).resolve()),'sha256':sha(Path(sys.executable).resolve()),'version':sys.version,'scope':'Selected pre-existing host executable fingerprint; no complete stdlib/dynamic-library closure claimed'},'failurePolicy':'FAIL_AND_RETAIN_NO_RETRY_OR_NATIVE_RECOVERY','operationalFaultActionsAllowed':False}
    contract_path=destination/'contract.json';contract_path.write_bytes(canonical(contract)+b'\n')
    expected={'format':'triplex-read-only-qlever-api-checks/1','identity':True,'nativeProfile100':True,'availableAnchoredAckReferencesPresent':True,'completeBoundedRdfCaptured':True,'identityAndSettingsUnchanged':True,'readOnlyMode':True}
    expected_path=destination/'expected.json';expected_path.write_bytes(canonical(expected)+b'\n')
    sources=[path for path in sorted(HERE.iterdir()) if path.is_file() and path.suffix in {'.py','.mjs','.md'}]
    pairs=[(str(path.relative_to(ROOT)),'runner' if path.name=='runner.mjs' else 'source') for path in sources]
    pairs.extend([('qualification/devloop/state.mjs','source'),('qualification/devloop/io.mjs','source'),('tools/bootstrap/with-env.sh','source'),('tools/bootstrap/check-storage.py','source'),('provenance/bounded-storage.json','fixture'),('.devloop/owner.json','fixture'),(str(catalog.relative_to(ROOT)),'fixture'),(str(contract_path.relative_to(ROOT)),'recipe'),(str(expected_path.relative_to(ROOT)),'oracle'),('.local/tools/node-v24.13.0-darwin-arm64/bin/node','build')])
    inputs=[{'path':path,'role':role,'sha256':sha(ROOT/path)} for path,role in pairs]
    manifest={'format':'triplex-devloop-job/1','id':job,'kind':'verification','backend':'qlever','queryPath':'qlever-native','author':'qlever-agent','logicalTaskId':'readonly-native-api-full-continuity-feasibility','problemId':'bound-modern-fault-preflight-before-operational-grant','hypothesis':'The pinned native API can expose bounded full RDF/available ACK continuity without any reachable mutation, cancellation, setting or recovery action.','goals':[6,7],'dependsOn':[],'requiredOwners':['foundation-qlever'],'inspiration':[{'reference':'experiments/qlever-native-fault-v2/CONTROLLED-STOP.md','mechanism':'Prove actual owner/API/current-state capture before reviewing any controlled stop or fault','adaptation':'Separate frozen read-only transport and source subset; this is not a later fault operational grant or a public-SDK benchmark.'}],'command':{'argv':[str(ROOT/'.local/tools/node-v24.13.0-darwin-arm64/bin/node'),'--max-old-space-size=256','experiments/qlever-native-fault-preflight-v1/runner.mjs',str(contract_path.relative_to(ROOT))],'cwd':'.','env':{'NODE_OPTIONS':'--max-old-space-size=256'}},'resources':{'heavy':True,'memoryBytes':896*1024**2,'cpuUnits':1,'diskBytes':64*1024**2,'timeoutMilliseconds':180000,'maximumLogBytes':8*1024**2},'inputs':inputs,'evidence':{'checks':[{'key':'readonly-native-api','expectedInput':str(expected_path.relative_to(ROOT)),'actual':'artifacts/checks.json'}],'requiredCheckKeys':['readonly-native-api']},'retention':{'scratch':'rebuildable-ephemeral-only','meaning':'Retain full/partial compressed RDF, safe errors, owner/API/settings observations and all source preimages; no native mutation or fault action.'},'profile':{'name':'qlever-readonly-native-api100-v1','role':'read-only-native-component-feasibility','serverMemoryBytes':2*1024**3,'serverCpuUnits':1.5,'planner':100,'limits':contract['limits'],'performanceComparison':False}}
    manifest_path=destination/'manifest.json';manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    index={'format':'triplex-readonly-preflight-proposal/1','status':'PREPARED_NOT_ENQUEUED_NOT_EXECUTED','manifest':str(manifest_path.relative_to(ROOT)),'manifestSha256':sha(manifest_path),'contract':str(contract_path.relative_to(ROOT)),'contractSha256':sha(contract_path),'sourceFiles':[{'path':str(path.relative_to(ROOT)),'sha256':sha(path)} for path in sources],'resources':manifest['resources'],'nativeActions':0}
    index_path=destination/'proposal.json';index_path.write_text(json.dumps(index,indent=2)+'\n')
    print(json.dumps({key:index[key] for key in ['status','manifest','manifestSha256','contractSha256','resources','nativeActions']}))


if __name__=='__main__':prepare()
