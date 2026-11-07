#!/usr/bin/env python3
"""Modern staged native fault executor: SOURCE ONLY until explicit review/grant.

No native action occurs on import, --help, or without a separately supplied,
unexpired operational authorization AND a current canonical resource grant.
The archived operational harness is never imported/executed. Its pure broker is
used only by the separately versioned worker, with its original source pinned.
"""
from __future__ import annotations
import argparse
import dataclasses
import datetime
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sys
import time
import uuid

from ack_inventory import bounded_bytes
from bounded_io import LIMITS, canonical, file_digest, run_command, write_new
from continuity import capture, check_ack_catalog
from native_io import DAEMON_ID, NativeHTTP, PrivateDocker, native_config
from policy import CASE_VOLUME_BYTES, GIB, IMAGE, MAIN_CID, OWNER, fault_fence, main_stopped, reject_other_live_q, require, safe_error
from storage import copy_stopped, create_volume, inventory, verify_volume

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CLIENT_MEMORY = 896 * 1024 ** 2
MAIN_DATA = ROOT / '.runtime/engines/qlever-main/data'


def load(path: Path, maximum: int = LIMITS.metadata):
    return json.loads(bounded_bytes(path, maximum))


def token(path: Path) -> bytes:
    require(path.is_relative_to(ROOT / '.runtime') and not path.is_symlink(), 'Credential path escaped owned runtime')
    require(path.stat().st_mode & 0o777 == 0o600 and path.stat().st_uid == os.getuid(), 'Private token must be owned0600')
    value = bounded_bytes(path, 256).strip()
    require(32 <= len(value) <= 256, 'Invalid native token carrier')
    return value


class Packet:
    def __init__(self, manifest_path: Path, authorization_path: Path, *, phase: str, bridge=None, docker=None, command=run_command):
        self.manifest_path = manifest_path.resolve(strict=True)
        require(self.manifest_path.is_relative_to(ROOT), 'Packet manifest is not owned')
        self.manifest = load(self.manifest_path)
        require(self.manifest.get('format') == 'triplex-qlever-native-fault-packet/2', 'Wrong modern packet version')
        self.packet = str(uuid.UUID(self.manifest['packetId']))
        self.directory = ROOT / '.runtime/qlever-native-fault-v2' / self.packet
        require(self.manifest['runtimeDirectory'] == str(self.directory.relative_to(ROOT)), 'Packet directory differs')
        require(self.manifest['limits'] == dataclasses.asdict(LIMITS), 'Fault I/O bounds changed')
        require(self.manifest['mainContainerId'] == MAIN_CID and self.manifest['imageSha256'] == IMAGE and self.manifest['daemonId'] == DAEMON_ID, 'Fixed foundation identity changed')
        self.phase, self.command = phase, command
        self.authorization = load(authorization_path)
        require(authorization_path.resolve().is_relative_to(self.directory) and authorization_path.stat().st_mode & 0o777 == 0o600, 'Operational authorization must be private and packet-owned')
        require(self.authorization.get('format') == 'triplex-reviewed-native-fault-operational-grant/1' and self.authorization.get('packetId') == self.packet, 'Explicit packet operational grant is missing')
        require(self.authorization.get('manifestSha256') == file_digest(self.manifest_path, maximum=LIMITS.metadata)[1], 'Operational grant does not name these exact packet bytes')
        expires = datetime.datetime.fromisoformat(self.authorization['expiresAt'].replace('Z', '+00:00'))
        require(expires.tzinfo is not None and datetime.datetime.now(datetime.timezone.utc) < expires, 'Operational authorization expired')
        require(self.authorization.get('exclusiveQCoordinationConfirmed') is True, 'Root must grant the finite Q-only maintenance window')
        self.verify_sources()
        admission_path = Path(os.environ.get('TRIPLEX_RESOURCE_ADMISSION', ''))
        require(admission_path.is_absolute() and admission_path.is_relative_to(ROOT / '.devloop/jobs'), 'Canonical resource admission is required')
        require(file_digest(admission_path, maximum=LIMITS.metadata)[1] == os.environ.get('TRIPLEX_RESOURCE_ADMISSION_SHA256'), 'Resource admission bytes changed')
        self.admission = load(admission_path)
        require(self.admission['state'] == 'ADMITTED' and self.admission['backend'] == 'qlever' and self.admission['jobId'] == os.environ.get('TRIPLEX_DEVLOOP_JOB_ID'), 'Wrong canonical job admission')
        resources = self.admission['resources']
        required_memory = 256 * 1024 ** 2 if phase == 'readiness' else CLIENT_MEMORY
        require(resources['memoryBytes'] == required_memory and resources['cpuUnits'] == 1 and resources['timeoutMilliseconds'] <= 1200000, 'Wrong finite client resource profile')
        require(resources['diskBytes'] >= (2 * GIB if phase == 'stop-copy' else 64 * 1024 ** 2), 'Insufficient declared stage disk')
        self.bridge = bridge or self._bridge
        self.docker = docker or PrivateDocker(ROOT, self.authorize)
        self.directory.mkdir(parents=True, exist_ok=True)

    def verify_sources(self):
        for pin in self.manifest['sourcePins']:
            path = ROOT / pin['path']
            require(path.is_relative_to(ROOT) and '..' not in Path(pin['path']).parts, 'Escaped packet source pin')
            require(file_digest(path, maximum=32 * 1024 ** 2)[1] == pin['sha256'], 'Fault packet source changed')
        runtime = self.manifest['pythonRuntime']
        require(str(Path(sys.executable).resolve()) == runtime['path'] and file_digest(Path(runtime['path']), maximum=128 * 1024 ** 2)[1] == runtime['sha256'], 'Host Python runtime changed')

    def authorize(self, action: str):
        require(action in self.authorization.get('actions', []), 'This native/storage/process action has no operational grant: ' + action)
        expires = datetime.datetime.fromisoformat(self.authorization['expiresAt'].replace('Z', '+00:00'))
        require(datetime.datetime.now(datetime.timezone.utc) < expires, 'Operational authorization expired before action')
        self.verify_sources()

    def _bridge(self, request):
        raw = self.command([str(ROOT / 'tools/bootstrap/with-env.sh'), 'node', '--max-old-space-size=256', str(HERE / 'controller_bridge.mjs')], stdin=canonical(request), timeout=330 if request.get('action') == 'readiness-job' else 30)
        return json.loads(raw)

    def state(self):
        state = self.bridge({'action': 'snapshot'})
        main = state['owners'].get('foundation-qlever')
        require(main and main['containerId'] == MAIN_CID and main['imageSha256'] == IMAGE and main['resources']['memoryBytes'] == 2 * GIB and main['resources']['cpuUnits'] == 1.5, 'Main canonical reservation identity/caps changed')
        require(main['status'] in {'active', 'unknown'}, 'Main reservation was released/replaced')
        own_job = self.admission['jobId']
        other = [job for job in state['jobs'] if job['backend'] == 'qlever' and job['status'] in {'running', 'granted', 'cleanup_unknown'} and job['id'] != own_job and not (job.get('faultPacketId') == self.packet and job['status'] != 'cleanup_unknown')]
        require(not other, 'Another Q client/unknown outcome blocks this finite maintenance phase')
        return state

    def storage_guard(self):
        result = json.loads(self.command([str(ROOT / 'tools/bootstrap/with-env.sh'), 'python3', str(ROOT / 'tools/bootstrap/check-storage.py')], timeout=10))
        require(result['result'] == 'PASS', 'Project-owned storage cap/headroom failed')
        return result

    def main_fence(self, *, running: bool, allow_unready: bool = False) -> tuple[dict, dict, bytes]:
        state = self.state(); owner = state['owners']['foundation-qlever']
        item = self.docker.inspect(MAIN_CID)
        secret = token(ROOT / '.runtime/engines/qlever-main/access-token')
        require(item['Id'] == MAIN_CID and item['Image'] == IMAGE and item['State']['Running'] is running, 'Main native identity/running state differs')
        host, config = item['HostConfig'], item['Config']
        require(config.get('User') == '501:20' and config.get('WorkingDir') == '/data' and config.get('Entrypoint') == ['qlever-server'], 'Main executable/user/cwd changed')
        expected_args = native_config({'packet':self.packet, 'case':'cancel', 'data':str(MAIN_DATA)}, secret)['Cmd']
        require(config.get('Cmd')[:-1] == expected_args[:-1] and hmac.compare_digest(config['Cmd'][-1].encode(), secret), 'Main native argv/token profile changed')
        require(host.get('Memory') == host.get('MemorySwap') == 2 * GIB and host.get('NanoCpus') == 1500000000 and host.get('PidsLimit') == 256, 'Main native caps changed')
        require(host.get('PortBindings', {}).get('7019/tcp') == [{'HostIp':'127.0.0.1','HostPort':'17019'}], 'Main loopback binding changed')
        require(config.get('Labels', {}).get('triplex.owner') == OWNER and config['Labels'].get('triplex.backend') == 'qlever', 'Main ownership changed')
        writable = [mount for mount in item['Mounts'] if mount.get('RW')]
        require(len(writable) == 1 and writable[0].get('Type') == 'bind' and writable[0]['Source'] == str(MAIN_DATA) and writable[0]['Destination'] == '/data', 'Main writable mount changed')
        if running:
            require(owner['status'] == 'unknown' if allow_unready else owner['status'] == 'active' and owner['observation']['startedAt'] == item['State']['StartedAt'], 'Main epoch lacks the expected retained/anchored readiness state')
        else:
            main_stopped(item, owner, ROOT)
        return item, owner, secret

    def idle(self, native):
        require(not native.active(), 'A native query is still registered')
        time.sleep(0.1)
        require(not native.active(), 'A native query appeared during the idle check')

    def preflight(self):
        self.authorize('read-main-preflight'); self.storage_guard()
        item, owner, secret = self.main_fence(running=True)
        reject_other_live_q(self.docker.owned(), MAIN_CID)
        native = NativeHTTP(17019, secret); ready = native.ready(); self.idle(native)
        directory = self.directory / 'preflight'; directory.mkdir(exist_ok=False)
        summary = capture(native, directory / 'full-rdf.jsonl.gz', packet_prefix=self.manifest['namespace'])
        catalog = load(ROOT / self.manifest['ackCatalog']['path'])
        require(file_digest(ROOT / self.manifest['ackCatalog']['path'], maximum=LIMITS.metadata)[1] == self.manifest['ackCatalog']['sha256'], 'ACK authority catalog changed')
        acknowledgements = check_ack_catalog(summary, catalog)
        self.idle(native); self.main_fence(running=True)
        observation = {'format':'triplex-qlever-native-fault-preflight/2', 'packetId':self.packet, 'native':ready, 'mainStartedAt':item['State']['StartedAt'], 'mainOwnerTokenSha256':hashlib.sha256(owner['token'].encode()).hexdigest(), 'continuity':summary, 'acknowledgements':acknowledgements, 'liveFilesNotClosedSnapshot':inventory(MAIN_DATA), 'limits':dataclasses.asdict(LIMITS)}
        write_new(directory / 'preflight.json', observation)
        return observation

    def require_preflight(self):
        checked = self.bridge({'action':'verify-reference', 'reference':self.manifest['preflightRun']})
        require(checked['terminal']['status'] == 'completed_verified_bytes' and checked['terminal']['cleanup']['groupGone'], 'Preflight is not canonically byte-verified/clean')
        require(checked['manifest'].get('faultPacketId') == self.packet and checked['manifest'].get('faultStage') == 'preflight', 'A different packet preflight is not authority')
        return load(self.directory / 'preflight/preflight.json')

    def stop_copy(self):
        self.authorize('controlled-stop-main'); baseline = self.require_preflight()
        self.storage_guard()
        # Establish and prove the empty hard boundary/guest sharing first, so a
        # known filesystem/sharing setup failure need not cause a main outage.
        # No native data is copied and no case process starts at this point.
        create_volume(ROOT, self.directory, self.authorize, self.command)
        item, owner, secret = self.main_fence(running=True)
        require(item['State']['StartedAt'] == baseline['mainStartedAt'] and hashlib.sha256(owner['token'].encode()).hexdigest() == baseline['mainOwnerTokenSha256'], 'Main owner/epoch changed after preflight')
        native = NativeHTTP(17019, secret); native.ready(); self.idle(native)
        recheck = capture(native, self.directory / 'preflight/immediate-recheck.jsonl.gz', packet_prefix=self.manifest['namespace'], expected=baseline['continuity'])
        self.idle(native); self.main_fence(running=True); reject_other_live_q(self.docker.owned(), MAIN_CID)
        self.docker.kill(MAIN_CID)
        self.bridge({'action':'reconcile'})
        stopped, held, _ = self.main_fence(running=False)
        require(stopped['State'].get('ExitCode') == 137 and stopped['State'].get('OOMKilled') is False, 'Controlled main stop has an unexpected disposition')
        files = inventory(MAIN_DATA, synchronize=True)
        record = {'format':'triplex-qlever-controlled-stop/2', 'disposition':'CONTROLLED_NATIVE_PROCESS_STOP_NOT_GRACEFUL', 'packetId':self.packet, 'containerId':MAIN_CID, 'imageSha256':IMAGE, 'beforeStartedAt':item['State']['StartedAt'], 'after':{'Running':False,'Pid':0,'ExitCode':137,'OOMKilled':False}, 'retainedMainReservation':held['resources'], 'retainedMainOwnerTokenSha256':hashlib.sha256(held['token'].encode()).hexdigest(), 'files':files, 'completeRdfRecheck':recheck['sha256']}
        write_new(self.directory / 'stopped-main.json', record)
        for case in self.manifest['cases']:
            proof = copy_stopped(MAIN_DATA, self.directory / 'volume' / case, files, self.authorize)
            write_new(self.directory / ('copy-' + case + '.json'), proof)
        return record

    def original_unchanged(self):
        record = load(self.directory / 'stopped-main.json')
        _, owner, _ = self.main_fence(running=False)
        require(hashlib.sha256(owner['token'].encode()).hexdigest() == record['retainedMainOwnerTokenSha256'], 'Original main reservation history was replaced')
        require(inventory(MAIN_DATA) == record['files'], 'Original stopped main files changed; no overwrite/repair is permitted')
        verify_volume(ROOT, self.directory, self.command)
        return record

    def case_record(self, case: str):
        require(case in self.manifest['cases'], 'Unknown native fault case')
        return {'packet':self.packet, 'case':case, 'data':str(self.directory / 'volume' / case), 'ownerId':'qfault-' + self.packet[:8] + '-' + case}

    def fence_case(self, case: dict, *, running: bool):
        item = self.docker.inspect(case['containerId'])
        secret = token(Path(case['tokenPath']))
        proof = fault_fence(item, cid=case['containerId'], case_directory=Path(case['data']), token=secret, packet_id=self.packet, case=case['case'], host_port=17129, must_run=running)
        reject_other_live_q(self.docker.owned(), case['containerId'] if running else None)
        return item, proof, secret

    def create_case(self, case: str):
        self.original_unchanged(); self.storage_guard()
        record = self.case_record(case)
        path = self.directory / ('case-' + case + '.json')
        require(not path.exists(), 'Do not reuse/reset a retained case instance')
        require(inventory(Path(record['data'])) == load(self.directory / 'stopped-main.json')['files'], 'Case no longer equals its full frozen copy')
        credentials = self.directory / 'credentials' / case; credentials.mkdir(parents=True, exist_ok=False)
        token_path = credentials / 'access-token'
        descriptor = os.open(token_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            secret = secrets.token_hex(32).encode(); os.write(descriptor, secret); os.fsync(descriptor)
        finally:
            os.close(descriptor)
        record['tokenPath'] = str(token_path)
        record['containerId'] = self.docker.create(native_config(record, secret), 'triplex-qfault-' + self.packet[:8] + '-' + case)
        write_new(path, record)
        item, _, _ = self.fence_case(record, running=False)
        spec = {'id':record['ownerId'], 'backend':'qlever', 'kind':'docker', 'registrationMode':'prepared-stopped', 'containerId':record['containerId'], 'imageSha256':IMAGE, 'requiredLabels':item['Config']['Labels'], 'directory':record['data'], 'resources':{'memoryBytes':2*GIB,'cpuUnits':1.5,'diskBytes':CASE_VOLUME_BYTES}, 'inputs':self.manifest['sourcePins']}
        prepared = self.bridge({'action':'prepare', 'spec':spec})
        require(prepared['status'] == 'unknown', 'Fault reservation did not remain UNKNOWN before startup')
        return record

    def start_case(self, record: dict, expectations: Path):
        self.original_unchanged(); self.fence_case(record, running=False)
        state = self.state(); owner = state['owners'].get(record['ownerId'])
        require(owner and owner['status'] == 'unknown' and owner['containerId'] == record['containerId'] and owner['imageSha256'] == IMAGE and owner['directory'] == record['data'] and owner['resources'] == {'memoryBytes':2*GIB,'cpuUnits':1.5,'diskBytes':CASE_VOLUME_BYTES}, 'No retained exact prepared reservation before startup')
        self.docker.start(record['containerId'])
        self.wait_ready(17129, token(Path(record['tokenPath'])))
        return self.readiness_job(record['ownerId'], record['containerId'], expectations)

    def wait_ready(self, port, secret):
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            try:
                return NativeHTTP(port, secret).ready()
            except Exception:
                time.sleep(0.1)
        raise RuntimeError('Native readiness did not pass in20s; reservation retained')

    def readiness_job(self, owner_id: str, cid: str, expectations: Path):
        from proposal import readiness_manifest
        item = self.docker.inspect(cid)
        manifest = readiness_manifest(self, owner_id, cid, item['State']['StartedAt'], expectations)
        result = self.bridge({'action':'readiness-job', 'manifest':manifest})
        require(result['status'] == 'completed_verified_bytes', 'Canonical full-continuity readiness did not pass')
        self.bridge({'action':'refresh', 'id':owner_id, 'reference':result['reference']})
        return result

    def stop_case(self, record: dict):
        item = self.docker.inspect(record['containerId'])
        if item['State']['Running']:
            self.fence_case(record, running=True)
            self.docker.kill(record['containerId'])
        self.fence_case(record, running=False)
        self.bridge({'action':'reconcile'})

    def run_case(self, case: str):
        from worker import execute_case
        record = self.create_case(case)
        return execute_case(self, record)

    def restore_main(self):
        self.authorize('start-main'); original = self.original_unchanged()
        reject_other_live_q(self.docker.owned(), None)
        state = self.state()
        held = [owner for owner in state['owners'].values() if owner.get('requiredLabels', {}).get('triplex.role') == 'qlever-native-fault-v2' and owner.get('requiredLabels', {}).get('triplex.packet') == self.packet and owner['status'] != 'released']
        require(not held, 'Fault owner cleanup/release is unknown; do not overlap main startup')
        self.docker.start(MAIN_CID)
        self.wait_ready(17019, token(ROOT / '.runtime/engines/qlever-main/access-token'))
        expectations = self.directory / 'main-final-expectations.json'
        write_new(expectations, {'format':'triplex-native-fault-readiness-expectations/1', 'main':True, 'operations':[]})
        result = self.readiness_job('foundation-qlever', MAIN_CID, expectations)
        after = self.docker.inspect(MAIN_CID)
        require(after['State']['StartedAt'] != original['beforeStartedAt'], 'Main did not enter a fresh epoch')
        return {'mainRestoredSameCid':MAIN_CID, 'readiness':result, 'faultOutcomesNotUpgraded':True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['preflight','stop-copy','case','restore-main','readiness','broker'])
    parser.add_argument('--packet', type=Path, required=True)
    parser.add_argument('--authorization', type=Path, required=True)
    parser.add_argument('--case', choices=['cancel','permission','ack-loss'])
    parser.add_argument('--expectations', type=Path)
    parser.add_argument('--broker-role', choices=['attempt','resolve-next'])
    args = parser.parse_args()
    packet = Packet(args.packet, args.authorization, phase=args.phase)
    try:
        if args.phase == 'preflight': result = packet.preflight()
        elif args.phase == 'stop-copy': result = packet.stop_copy()
        elif args.phase == 'case':
            require(args.case is not None, 'Case is required'); result = packet.run_case(args.case)
        elif args.phase == 'restore-main': result = packet.restore_main()
        elif args.phase == 'readiness':
            from worker import verify_readiness
            require(args.expectations is not None, 'Explicit readiness expectations required'); result = verify_readiness(packet, args.expectations)
        else:
            from worker import broker_child
            require(args.case == 'ack-loss' and args.broker_role is not None, 'Only exact owned ACK-loss broker roles are admitted')
            result = broker_child(packet, args.broker_role)
        artifacts = Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])
        write_new(artifacts / 'phase-result.json', result)
        if args.phase not in {'broker'}:
            write_new(artifacts / 'checks.json', {'format':'triplex-native-fault-phase-checks/1','phase':args.phase,'passed':True,'scope':'NATIVE_COMPONENT_NOT_SDK_TRANSACTION_OR_PERFORMANCE_ACCEPTANCE'})
    except Exception as error:
        artifacts = Path(os.environ['TRIPLEX_RUN_ARTIFACTS'])
        write_new(artifacts / ('failure-' + secrets.token_hex(4) + '.json'), {'phase':args.phase,'case':args.case,'error':safe_error(error),'cleanup':'No blind main restart, deletion or fault-result upgrade. Inspect retained UNKNOWN owners and run the separately authorized recovery phase.'})
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
