#!/usr/bin/env python3
"""Separately frozen native API preflight. NO operational fault imports/actions.

Only owned identity GET inspections, fixed planner/activity observations and
bounded authored SELECT/ACK/full-continuity reads are reachable. Failure records
safe evidence and exits; it never cancels, restores settings, reconciles owners,
restarts a server, copies data or mounts a volume.
"""
from __future__ import annotations
import argparse
import dataclasses
import hashlib
import hmac
import json
import os
from pathlib import Path
import sys
import time

from read_bounds import LIMITS,canonical,read_file,require,safe_error,write_json
from read_native import ReadDocker,ReadQlever
from continuity import capture,check_ack_catalog

ROOT=Path(__file__).resolve().parents[2]


def validate_context(contract,context):
    require(contract['mode']=='READ_ONLY_NATIVE_API_PREFLIGHT','Operational mode is not present in this program')
    require(contract['root']==str(ROOT) and context['root']==str(ROOT),'Different workspace refused')
    require(context['jobId']==contract['jobId'] and context['resourceBytes']==896*1024**2 and context['cpuUnits']==1,'Canonical read-only grant differs')
    require(context['rootDevice']==ROOT.stat().st_dev and context['stateOwnerSha256']==contract['stateOwnerSha256'],'Canonical owner/mount identity differs')
    owner=context['mainOwner']
    require(owner['status']=='active' and owner['containerId']==contract['containerId'] and owner['imageSha256']==contract['imageSha256'] and owner['resources']['memoryBytes']==2*1024**3 and owner['resources']['cpuUnits']==1.5,'Main resident identity/caps are not ACTIVE')
    require(owner['startedAt']==contract['registeredStartedAt'],'Registered main epoch changed before preflight')
    require(not context['otherActiveQJobs'],'Another Q client/unknown outcome is active')
    require(contract['limits']==dataclasses.asdict(LIMITS),'Read-only capture bounds changed')


def validate_inspection(contract,context,item,secret):
    require(item['Id']==contract['containerId'] and item['Image']==contract['imageSha256'] and item['State']['Running'] is True and item['State']['StartedAt']==context['mainOwner']['startedAt'],'Native CID/image/running/epoch differs')
    config,host=item['Config'],item['HostConfig']
    require(config.get('User')=='501:20' and config.get('WorkingDir')=='/data' and config.get('Entrypoint')==['qlever-server'],'Native executable/user/cwd differs')
    require(config.get('Labels',{}).get('triplex.owner')==contract['ownerLabel'] and config['Labels'].get('triplex.backend')=='qlever','Native ownership labels differ')
    require(config['Cmd'][:-1]==contract['fixedNativeArguments'] and hmac.compare_digest(config['Cmd'][-1].encode(),secret),'Native arguments/token differ')
    require(host.get('Memory')==host.get('MemorySwap')==2*1024**3 and host.get('NanoCpus')==1500000000 and host.get('PidsLimit')==256,'Native cgroup caps differ')
    require(host.get('PortBindings',{}).get('7019/tcp')==[{'HostIp':'127.0.0.1','HostPort':'17019'}],'Native loopback port differs')
    mounts=[mount for mount in item['Mounts'] if mount.get('RW')]
    require(len(mounts)==1 and mounts[0].get('Type')=='bind' and mounts[0]['Source']==contract['mainData'] and mounts[0]['Destination']=='/data','Native writable source differs')
    return {'containerId':item['Id'],'imageSha256':item['Image'],'startedAt':item['State']['StartedAt'],'running':True,'memoryBytes':host['Memory'],'cpuUnits':1.5,'data':contract['mainData'],'rawCommandEnvironmentAndGuestPid':'EXCLUDED'}


def run(contract,context,docker,native,secret,artifacts):
    validate_context(contract,context)
    before=validate_inspection(contract,context,docker.inspect(contract['containerId']),secret)
    for item in docker.owned(contract['ownerLabel']):
        require(item['State']['Running'] is False or item['Id']==contract['containerId'],'Another owned Q process is live')
    initial=native.ready()
    require(not native.active(),'A native query is active before read-only capture');time.sleep(.1)
    require(not native.active(),'A native query appeared before read-only capture')
    catalog_path=ROOT/contract['ackCatalog']['path'];catalog_raw=read_file(catalog_path,16*1024**2)
    require(hashlib.sha256(catalog_raw).hexdigest()==contract['ackCatalog']['sha256'],'ACK authority index changed')
    continuity=capture(native,artifacts/'full-rdf.jsonl.gz',packet_prefix=contract['namespace'])
    acknowledgements=check_ack_catalog(continuity,json.loads(catalog_raw))
    final=native.ready();require(final==initial,'Read-only settings/version observations differ')
    require(not native.active(),'A native query remains registered after capture')
    after=validate_inspection(contract,context,docker.inspect(contract['containerId']),secret)
    require(after==before,'Native owner/epoch changed during read-only capture')
    observation={'format':'triplex-read-only-qlever-api-preflight/1','mode':contract['mode'],'native':initial,'before':before,'after':after,'continuity':continuity,'acknowledgements':acknowledgements,'noMutatingApiRouteExists':True,'scope':'API_FEASIBILITY_AND_CURRENT_STATE_CAPTURE_NOT_STOP_COPY_FAULT_OR_OLDER_ACK_RECONSTRUCTION'}
    write_json(artifacts/'observation.json',observation)
    checks={'format':'triplex-read-only-qlever-api-checks/1','identity':True,'nativeProfile100':True,'availableAnchoredAckReferencesPresent':True,'completeBoundedRdfCaptured':True,'identityAndSettingsUnchanged':True,'readOnlyMode':True}
    write_json(artifacts/'checks.json',checks)
    return observation


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--contract',type=Path,required=True);args=parser.parse_args()
    artifacts=Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])
    require(artifacts.is_relative_to(ROOT/'.devloop/jobs'),'Output must be the admitted canonical artifact directory')
    try:
        contract_raw=read_file(args.contract,1024*1024);contract=json.loads(contract_raw)
        context_raw=sys.stdin.buffer.read(1024*1024+1);require(len(context_raw)<=1024*1024,'Canonical context exceeded1MiB')
        context=json.loads(context_raw);require(context['contractSha256']==hashlib.sha256(contract_raw).hexdigest(),'Frozen contract context differs')
        validate_context(contract,context)
        runtime=contract['pythonRuntime'];require(str(Path(sys.executable).resolve())==runtime['path'],'Selected Python executable differs')
        # This is an explicitly declared selected runtime-binary fingerprint,
        # not a claim that every stdlib/dynamic-library byte was captured.
        with Path(runtime['path']).open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
        require(digest==runtime['sha256'],'Selected host Python executable changed')
        credential=ROOT/'.runtime/engines/qlever-main/access-token';require(credential.stat().st_mode&0o777==0o600 and credential.stat().st_uid==os.getuid(),'Native token must be owned0600')
        secret=read_file(credential,256).strip();require(32<=len(secret)<=256,'Invalid token carrier')
        run(contract,context,ReadDocker(ROOT,contract['daemonId']),ReadQlever(secret),secret,artifacts)
    except Exception as error:
        write_json(artifacts/'failure.json',{'format':'triplex-read-only-native-preflight-failure/1','error':safe_error(error),'policy':'FAIL_AND_RETAIN; no retry, setting mutation, cancellation, owner reconciliation, server recovery, stop, copy or mount is available'})
        raise SystemExit(1) from None


if __name__=='__main__':main()
