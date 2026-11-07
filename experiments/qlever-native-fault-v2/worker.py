"""Versioned native worker/case coordinator; imports do not contact a service.

The archived pure journal's intent/lock/ACK semantics are reused and pinned.
Its old operational worker, unbounded Docker capture and implicit stop fallback
are replaced here. This remains a native component, not Triplex SDK writes.
"""
from __future__ import annotations
import base64
import dataclasses
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import threading
import time
import urllib.parse

from bounded_io import LIMITS, canonical, file_digest, write_new
from continuity import capture
from fixture import PreparedModify, prepare, normalize_bindings
from broker import ManagedWriter, NativeProof, proof_digest
from native_io import NativeFailure, NativeHTTP
from policy import IMAGE, MAIN_CID, require, safe_error
from storage import inventory


def proof(native, request):
    markers = native.select(request.native_marker)
    if not markers:
        footprint = native.select(request.native_footprint)
        return NativeProof('inconsistent' if footprint else 'absent', {'orphanFootprint':bool(footprint)})
    if len(markers) != 1:
        return NativeProof('inconsistent', {'markerRows':len(markers)})
    raw = native.select(request.native_proof)
    require(len(raw) <= 10000, 'Complete native payload exceeds10000rows')
    rows = normalize_bindings(raw)
    digest = proof_digest(rows)
    result = NativeProof('committed' if len(rows) == request.expected_count and digest == request.expected_digest else 'inconsistent', {'rows':len(rows),'sha256':digest,'fullRows':rows})
    return result


def cancel_frame(port: int, query_id: str, secret: bytes):
    require(port == 17129 and query_id.startswith('qf-cancel-'), 'Cancellation must target the exact fault endpoint/id')
    key = base64.b64encode(secrets.token_bytes(16)).decode()
    with socket.create_connection(('127.0.0.1', port), timeout=2) as stream:
        stream.settimeout(2)
        request = 'GET /watch/' + urllib.parse.quote(query_id, safe='') + ' HTTP/1.1\r\nHost: 127.0.0.1:17129\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ' + key + '\r\nSec-WebSocket-Version: 13\r\nAuthorization: Bearer ' + secret.decode() + '\r\n\r\n'
        stream.sendall(request.encode())
        header, deadline = bytearray(), time.monotonic() + 2
        while b'\r\n\r\n' not in header:
            require(time.monotonic() < deadline and len(header) <= 8192, 'Cancellation handshake exceeded its bound')
            part = stream.recv(min(1024, 8193-len(header)))
            require(part, 'Incomplete cancellation handshake'); header.extend(part)
        require(bytes(header).startswith(b'HTTP/1.1 101 '), 'Native websocket upgrade rejected')
        payload, mask = b'cancel', secrets.token_bytes(4)
        stream.sendall(bytes([0x81,0x80|len(payload)]) + mask + bytes(value ^ mask[index%4] for index,value in enumerate(payload)))


class Worker:
    def __init__(self, packet, record, expectations):
        self.packet, self.record, self.expectations = packet, record, expectations
        self.directory = packet.directory / 'volume/.evidence' / record['case']
        self.directory.mkdir(parents=True, exist_ok=True)
        self.intent_directory = self.directory / 'broker'
        self.cancel = False; self.permission = False; self.permission_failure = False
        self.cancel_evidence = None

    def coordination_path(self):
        return self.intent_directory / 'writer.lock'

    def native(self):
        from executor import token
        return NativeHTTP(17129, token(Path(self.record['tokenPath'])))

    def event(self, kind, value):
        return write_new(self.directory / (kind + '-' + str(time.time_ns()) + '.json'), {'processId':os.getpid(),'value':value})

    def assert_fenced(self):
        self.event('native-fence-enter',{})
        self.packet.original_unchanged()
        item, _, _ = self.packet.fence_case(self.record, running=True)
        state = self.packet.state(); owner = state['owners'][self.record['ownerId']]
        require(owner['status'] == 'active' and owner['observation']['startedAt'] == item['State']['StartedAt'], 'Native broker epoch lacks anchored readiness')
        return {'worker_id':self.record['containerId'], 'epoch':item['State']['StartedAt'], 'global_lock_path':str(self.coordination_path().resolve())}

    def apply(self, request):
        self.assert_fenced(); native = self.native()
        self.packet.authorize('native-case-update')
        if not self.cancel:
            try:
                native.request({'timeout':'4000ms'}, request.native_modify, update=True)
            except NativeFailure as error:
                if self.permission:
                    body = (error.redacted_body or b'').lower()
                    self.permission_failure = b'permission denied' in body and (b'update-triples' in body or b'persist' in body or b'snapshot' in body)
                self.event('native-error', {'status':error.status,'bodySha256':error.body_sha256,'bodyBytes':error.body_bytes,'redactedBody':None if error.redacted_body is None else error.redacted_body.decode(errors='replace'),'snapshotPermissionFailureObserved':self.permission_failure})
                raise
            return
        query_id = 'qf-cancel-' + secrets.token_hex(16)
        finished = threading.Event()
        observation = {'queryId':query_id,'registered':False,'requestSent':False,'httpReturned':False}
        def sender():
            try:
                deadline = time.monotonic() + 3
                while not finished.is_set() and time.monotonic() < deadline:
                    active = native.active()
                    require(isinstance(active, dict), 'Unsupported native active-query shape')
                    if query_id in active:
                        observation['registered'] = True; observation['registeredAtNs'] = time.time_ns()
                        self.packet.authorize('cancel-exact-native-query')
                        cancel_frame(17129, query_id, native.token)
                        observation['requestSent'] = True; observation['sentAtNs'] = time.time_ns(); return
                    time.sleep(0.005)
            except Exception as error:
                observation['senderError'] = safe_error(error)
        thread = threading.Thread(target=sender, daemon=False); thread.start()
        try:
            native.request({'timeout':'4000ms'}, request.native_modify, update=True, query_id=query_id)
            observation['httpReturned'] = True; observation['httpStatus'] = 200
        except NativeFailure as error:
            observation['httpReturned'] = True; observation['httpStatus'] = error.status; observation['error'] = safe_error(error)
            raise
        finally:
            finished.set(); thread.join(timeout=7)
            observation['senderFinished'] = not thread.is_alive()
            require(not thread.is_alive(), 'Cancellation observer did not settle')
            # A sent frame is not cancellation proof. The final active-state,
            # HTTP outcome and complete closed/reloaded payload are separate.
            observation['stillRegistered'] = query_id in native.active()
            self.cancel_evidence = observation
            self.event('cancellation', observation)

    def check(self, request):
        self.assert_fenced()
        result = proof(self.native(), request)
        self.event('full-proof', {'operationId':request.operation_id, 'proof':dataclasses.asdict(result)})
        return result

    def close_epoch(self):
        item = self.packet.docker.inspect(self.record['containerId'])
        epoch = item['State']['StartedAt']
        self.packet.stop_case(self.record)
        if self.permission:
            # The native process is now actually gone. Restore only this copied
            # case directory, never original main or an unknown live epoch.
            self.packet.authorize('case-permission-fault')
            os.chmod(self.record['data'], self.original_mode)
            self.permission = False
        stopped = self.packet.docker.inspect(self.record['containerId'])
        require(stopped['State']['Running'] is False and stopped['State']['Pid'] == 0, 'Fault epoch still has a guest process')
        result = {'worker_id':self.record['containerId'],'epoch':epoch,'closed':True,'disposition':'CONTROLLED_CASE_SIGKILL_NOT_POWER_LOSS_OR_GRACEFUL','exitCode':stopped['State']['ExitCode']}
        self.event('closed-epoch',result); return result

    def sync_snapshot(self):
        self.packet.authorize('fsync-case-snapshot')
        files = inventory(Path(self.record['data']), synchronize=True)
        result = {'files':files,'sha256':hashlib.sha256(canonical(files)).hexdigest(),'file_and_directory_fsynced':True}
        self.event('snapshot',result); return result

    def reload(self, closed, snapshot):
        self.packet.start_case(self.record, self.expectations)
        item = self.packet.docker.inspect(self.record['containerId'])
        require(item['State']['StartedAt'] != closed['epoch'] and inventory(Path(self.record['data'])) == snapshot['files'], 'Native reload epoch/snapshot bytes differ')
        return {'worker_id':self.record['containerId'],'epoch':item['State']['StartedAt'],'reloaded_epoch':True,'snapshotSha256':snapshot['sha256']}


def expectations(packet, case, operations, tag):
    path = packet.directory / 'volume/.evidence' / case / ('expectations-' + tag + '.json')
    write_new(path, {'format':'triplex-native-fault-readiness-expectations/1','case':case,'operations':operations})
    return path


def verify_readiness(packet, path):
    from executor import token, load
    spec = load(path)
    require(spec['format'] == 'triplex-native-fault-readiness-expectations/1', 'Wrong readiness oracle')
    if spec.get('main'):
        item, _, secret = packet.main_fence(running=True, allow_unready=True)
        native, cid = NativeHTTP(17019,secret), MAIN_CID
        require(inventory(Path(packet.manifest['mainData'])) == load(packet.directory/'stopped-main.json')['files'], 'Main startup changed original stopped source bytes')
    else:
        record = load(packet.directory / ('case-' + spec['case'] + '.json'))
        packet.original_unchanged(); item, _, secret = packet.fence_case(record,running=True)
        native, cid = NativeHTTP(17129,secret),record['containerId']
    native.ready(); packet.idle(native)
    artifacts = Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])
    baseline = load(packet.directory/'preflight/preflight.json')['continuity']
    continuity = capture(native, artifacts/'full-original-rdf.jsonl.gz', packet_prefix=packet.manifest['namespace'], expected=baseline)
    proofs = []
    for expected in spec['operations']:
        request = prepare(packet.packet,spec['case'],expected['operation'])
        actual = proof(native,request)
        require(actual.status in expected['allowed'], 'Closed/reloaded complete native payload differs from frozen allowed old/new outcomes')
        proofs.append({'operation':expected['operation'],'actual':dataclasses.asdict(actual),'allowed':expected['allowed']})
    write_new(artifacts/'full-case-proofs.json',proofs)
    write_new(artifacts/'recovery.json',{'containerId':cid,'imageSha256':IMAGE,'after':{'Running':True,'StartedAt':item['State']['StartedAt']}})
    return {'format':'triplex-native-full-payload-readiness/1','containerId':cid,'continuity':continuity,'caseProofs':proofs,'passed':True}


def execute_case(packet, record):
    case = record['case']
    initial = expectations(packet,case,[{'operation':name,'allowed':['absent']} for name in ['old','attempt','next']],'initial')
    worker = Worker(packet,record,initial)
    primary = None
    try:
        packet.start_case(record,initial)
        old, attempted, next_request = [prepare(packet.packet,case,name,delay=(case=='cancel' and name=='attempt')) for name in ['old','attempt','next']]
        broker = ManagedWriter(worker.intent_directory,worker,max_journal_bytes=LIMITS.journal)
        require(broker.commit(old).status == 'committed','Independent old control was not acknowledged')
        worker.expectations = expectations(packet,case,[{'operation':'old','allowed':['committed']},{'operation':'attempt','allowed':['committed','absent']},{'operation':'next','allowed':['absent']}],'attempt-outcome')
        if case == 'ack-loss':
            from broker_processes import run_ack_loss
            result = run_ack_loss(packet,record,worker.expectations)
        else:
            if case == 'permission':
                packet.authorize('case-permission-fault')
                worker.original_mode = Path(record['data']).stat().st_mode & 0o777
                os.chmod(record['data'],0o555); worker.permission=True
                # Actual nonroot native-side file-create denial is checked by
                # a bounded Docker exec, not inferred from host mode bits.
                from broker_processes import prove_permission_denial
                denial = prove_permission_denial(packet,record)
                worker.event('actual-permission-denial',denial)
            worker.cancel = case == 'cancel'
            outcome = broker.commit(attempted)
            require(outcome.status in {'committed','not_committed_closed'},'Native unknown outcome remains unresolved')
            if case == 'cancel':
                observed = worker.cancel_evidence or {}
                require(observed.get('registered') and observed.get('requestSent') and observed.get('senderFinished') and observed.get('httpReturned') and observed.get('httpStatus') != 200 and not observed.get('stillRegistered'), 'Cancellation was not proved; retain as inconclusive')
            else:
                require(worker.permission_failure,'Kernel denial alone did not prove a native snapshot-publication failure')
            worker.cancel=False; worker.permission=False
            require(broker.commit(next_request).status == 'committed','Next independent control failed after recovery')
            result = {'attemptOutcome':outcome.status,'faultObserved':True}
        # Every case ends with another actual close/reload and complete old,
        # attempted and next payload proofs, beyond a broker marker/resolution.
        final_attempt = ['committed'] if result['attemptOutcome'] == 'committed' else ['absent']
        worker.expectations = expectations(packet,case,[{'operation':'old','allowed':['committed']},{'operation':'attempt','allowed':final_attempt},{'operation':'next','allowed':['committed']}],'final')
        closed=worker.close_epoch(); snapshot=worker.sync_snapshot(); worker.reload(closed,snapshot)
        return {'case':case,'status':'NATIVE_COMPONENT_CASE_PASSED','result':result,'fullPayloadPostReload':True,'limits':'No SDK callback/CAS/power-loss/read-load acceptance'}
    except Exception as error:
        primary = safe_error(error)
        worker.event('case-first-failure',primary)
        raise
    finally:
        try:
            packet.stop_case(record)
            packet.bridge({'action':'release','id':record['ownerId']})
            packet.original_unchanged()
            worker.event('case-cleanup',{'stoppedAndReleased':True,'primaryFailureRetained':primary})
        except Exception as cleanup:
            worker.event('cleanup-unknown',{'error':safe_error(cleanup),'reservation':'RETAINED_IF_NOT_PROVEN_STOPPED','primaryFailure':primary})
            raise RuntimeError('Fault cleanup/recovery is unknown; do not start main') from None


def broker_child(packet, role):
    from broker_processes import child
    return child(packet,role)
