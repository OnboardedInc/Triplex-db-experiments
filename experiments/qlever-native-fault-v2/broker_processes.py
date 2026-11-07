"""Exact two-process native-completion/ACK-loss protocol, SOURCE ONLY.

Both writers use the archived pure fsynced journal/global flock through the new
fenced Worker. No child replays the attempted native MODIFY during resolution.
This module starts no process or service when imported.
"""
from __future__ import annotations
import dataclasses
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from bounded_io import LIMITS, write_new
from fixture import prepare
from broker import ManagedWriter
from policy import require, safe_error


def prove_permission_denial(packet,record):
    packet.authorize('case-permission-fault')
    packet.fence_case(record,running=True)
    # The private API's exec is created stopped, then a tiny attached command
    # runs as UID501. Output is discarded, not captured unbounded or persisted.
    script='if test "$(id -u)" != 501; then exit 81; fi; if (umask 077; : > /data/native-publication-permission-probe); then exit 82; else exit 73; fi'
    created=packet.docker._call('POST','/containers/'+record['containerId']+'/exec',{'AttachStdout':False,'AttachStderr':False,'User':'501:20','Cmd':['sh','-c',script]})
    exec_id=created['Id']
    require(isinstance(exec_id,str) and len(exec_id)==64 and all(value in '0123456789abcdef' for value in exec_id),'Unexpected exact permission-probe exec identity')
    packet.docker._call('POST','/exec/'+exec_id+'/start',{'Detach':True,'Tty':False})
    deadline=time.monotonic()+3
    while time.monotonic()<deadline:
        actual=packet.docker._call('GET','/exec/'+exec_id+'/json')
        if actual.get('Running') is False:
            require(actual.get('ExitCode')==73,'Real native-user file creation was not denied')
            return {'containerId':record['containerId'],'execId':exec_id,'uid':501,'exitCode':73,'newFileCreationDenied':True,'stdoutAndStderr':'NOT_RETAINED','meaning':'Kernel create denial; a separate actual native snapshot-publication failure must also be observed'}
        time.sleep(.02)
    raise RuntimeError('Permission probe did not settle within3s')


def _wait_file(path,children,seconds=30):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        if path.is_file(): return
        require(all(child.poll() is None for child in children),'Owned broker exited before its required protocol boundary')
        time.sleep(.02)
    raise RuntimeError('Owned broker boundary was not observed before deadline')


def _spawn(packet,role,artifacts):
    packet.authorize('spawn-owned-broker')
    artifacts.mkdir(parents=True,exist_ok=False)
    environment={**os.environ,'TRIPLEX_RUN_ARTIFACTS':str(artifacts)}
    return subprocess.Popen([sys.executable,str(Path(__file__).with_name('executor.py')),'broker','--packet',str(packet.manifest_path),'--authorization',str(packet.authorization_path),'--case','ack-loss','--broker-role',role],env=environment,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)


def run_ack_loss(packet,record,expected):
    from executor import load
    directory=packet.directory/'volume/.evidence/ack-loss'
    write_new(directory/'ack-protocol.json',{'expectations':str(expected),'operation':'attempt','requiredExit':73})
    first=_spawn(packet,'attempt',Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])/'broker-attempt')
    second=None
    try:
        boundary=directory/'native-complete-before-ack.json'
        _wait_file(boundary,[first])
        observed=load(boundary)
        require(observed['phase']=='after_fsync' and observed['processId']==first.pid and first.poll() is None,'Native completion boundary is not held by the exact live broker child')
        second=_spawn(packet,'resolve-next',Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])/'broker-resolver')
        _wait_file(directory/'resolver-about-to-lock.json',[first,second])
        require(first.poll() is None and second.poll() is None,'Independent writers did not overlap at the lock boundary')
        time.sleep(.05)
        before=[load(path) for path in directory.glob('native-fence-enter-*.json')]
        require(not any(event['processId']==second.pid for event in before),'Resolver performed native work before acquiring the shared writer lock')
        require(not (directory/'resolver-result.json').exists(),'Resolver bypassed the first live writer lock')
        write_new(directory/'release-first-broker.json',{'firstPid':first.pid,'secondPid':second.pid,'nativeBeforeLock':0})
        require(first.wait(timeout=15)==73,'The first exact broker did not terminate at the declared no-ACK boundary')
        require(second.wait(timeout=360)==0,'The independent resolver/next writer did not complete')
        result=load(directory/'resolver-result.json')
        require(result['resolved']['status']=='committed' and result['next']['status']=='committed','Native completion was not preserved or next writer failed')
        write_new(directory/'two-process-proof.json',{'firstPid':first.pid,'secondPid':second.pid,'overlappedAtSharedLock':True,'resolverNativeBeforeLock':0,'firstExit':73,'secondExit':0,'resolved':result,'replayedAttemptedModify':False})
        return {'attemptOutcome':'committed','faultObserved':True,'twoIndependentProcesses':True,'noAttemptReplay':True}
    finally:
        # These are exact Popen children created above, never a guessed host or
        # Linux guest PID. On timeout the native owner remains separately fenced
        # and the enclosing case must stop/reconcile it before main restoration.
        for child in [first,second]:
            if child is not None and child.poll() is None:
                child.terminate()
                try:child.wait(timeout=1)
                except subprocess.TimeoutExpired:child.kill();child.wait(timeout=1)


def child(packet,role):
    from executor import load
    from worker import Worker
    directory=packet.directory/'volume/.evidence/ack-loss'
    record=load(packet.directory/'case-ack-loss.json')
    protocol=load(directory/'ack-protocol.json')
    worker=Worker(packet,record,Path(protocol['expectations']))
    require(not (worker.intent_directory/'intents.jsonl').exists() or (worker.intent_directory/'intents.jsonl').stat().st_size<=LIMITS.journal,'Existing broker journal exceeds16MiB')
    def fault(phase,request):
        if phase=='after_fsync' and request.operation_id.endswith(':attempt'):
            write_new(directory/'native-complete-before-ack.json',{'phase':phase,'processId':os.getpid(),'operationId':request.operation_id,'requestSha256':request.digest,'nativeCompletedAndSnapshotFsynced':True,'brokerAckSent':False})
            deadline=time.monotonic()+10
            while not (directory/'release-first-broker.json').exists() and time.monotonic()<deadline:time.sleep(.01)
            require((directory/'release-first-broker.json').is_file(),'Parent did not release the exact lost-ACK boundary')
            os._exit(73)
    broker=ManagedWriter(worker.intent_directory,worker,fault=fault,max_journal_bytes=LIMITS.journal)
    if role=='attempt':
        broker.commit(prepare(packet.packet,'ack-loss','attempt'))
        raise RuntimeError('Lost-ACK boundary did not terminate the first broker')
    write_new(directory/'resolver-about-to-lock.json',{'processId':os.getpid(),'operationId':prepare(packet.packet,'ack-loss','attempt').operation_id})
    resolved=broker.resolve(prepare(packet.packet,'ack-loss','attempt').operation_id)
    require(resolved.status=='committed','Independently resolved attempted outcome differs')
    following=broker.commit(prepare(packet.packet,'ack-loss','next'))
    result={'resolved':dataclasses.asdict(resolved),'next':dataclasses.asdict(following),'processId':os.getpid(),'attemptedModifySubmittedByResolver':False}
    write_new(directory/'resolver-result.json',result)
    return result
