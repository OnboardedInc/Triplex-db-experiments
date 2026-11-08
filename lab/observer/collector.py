#!/usr/bin/env python3
"""EXP-OBS01: stdlib observer. Only engine.mjs provisions config/key/output mounts."""
import base64
import hashlib
import hmac
import http.client
import json
import os
import re
from pathlib import Path
import signal
import socket
import sys
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_READ = 8 * 1024 * 1024

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def mono():
    return time.monotonic_ns() / 1_000_000

def write_new(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as out:
        out.write(data)
        out.flush()
        os.fsync(out.fileno())

def atomic(path, data):
    tmp = path.with_suffix('.tmp')
    with tmp.open('wb') as out:
        out.write(data)
        out.flush()
        os.fsync(out.fileno())
    tmp.replace(path)

class Bundle:
    def __init__(self, root, config, key):
        if len(key) != 32:
            raise ValueError('external key must be exactly 32 bytes')
        self.root, self.config, self.key = Path(root), config, key
        self.root.mkdir(parents=True, exist_ok=False)
        self.written = 0
        self.heads, self.entries = {}, {s['streamId']: [] for s in config['streams']}
        self.lock = threading.Lock()
        self.envelope = {k: config[k] for k in ('runId', 'receiptId', 'keyId', 'collector', 'sut', 'streams')}
        self.envelope.update(format='obs-bundle/1', clock={'domain': 'vm-monotonic-ms', 'bridge': 'clock/bridge.jsonl', 'maxUncertaintyMs': config['maxUncertaintyMs']})
        self.envelope['collector'] = {**config['collector'], 'configSha256': sha(canonical(config) + b'\n'), 'startedAtMono': mono(), 'startedAtReal': time.time_ns() / 1_000_000}
        self.envelope['sut'] = {**config['sut']}
        write_new(self.root / 'bundle.json', canonical(self.envelope) + b'\n')
        write_new(self.root / 'clock/bridge.jsonl', b'')

    def signed(self, value):
        return {**value, 'hmac': hmac.new(self.key, canonical(value), hashlib.sha256).hexdigest()}

    def append(self, sid, payload, start, real):
        # [EXP-OBS01] Why: retain exact source bytes by hash as well as lossless sample framing.
        # Rejected: computed counters alone (cannot rerun a source parser).
        with self.lock:
            self.written += len(payload) * 4 + 16384
            if self.written > self.config.get('maxBundleBytes', 64 * 1024 * 1024):
                raise ValueError('bundle byte budget exhausted; retain unsealed evidence')
            seq = len(self.entries[sid])
            digest = sha(payload)
            obj = self.root / 'objects' / (digest + '.bin')
            if not obj.exists():
                write_new(obj, payload)
            end = mono()
            frame = canonical({'tStartMono': start, 'tEndMono': end, 'rawSha256': digest,
                               'rawBase64': base64.b64encode(payload).decode()}) + b'\n'
            raw_path = f'streams/{sid}/chunks/{seq:08d}-{sha(frame)}.bin'
            hdr_path = f'streams/{sid}/chunks/{seq:08d}.hdr.json'
            header = self.signed({'streamId': sid, 'seq': seq, 'tStartMono': start, 'tEndMono': end,
                                  'tStartReal': real, 'byteLength': len(frame), 'sha256': sha(frame),
                                  'prevHeaderSha256': self.heads.get(sid)})
            hb = canonical(header) + b'\n'
            write_new(self.root / raw_path, frame)
            write_new(self.root / hdr_path, hb)
            self.heads[sid] = sha(hb)
            self.entries[sid].append({'raw': raw_path, 'header': hdr_path, 'headerSha256': sha(hb)})
            atomic(self.root / 'index.json', canonical(self.entries) + b'\n')

    def seal(self):
        with self.lock:
            if any(not entries for entries in self.entries.values()):
                raise ValueError('cannot seal an empty stream')
            for sid, entries in self.entries.items():
                raw = b''.join((self.root / entry['raw']).read_bytes() for entry in entries)
                parser = Path(__file__).with_name('normalize.py')
                result = subprocess.run([sys.executable, '-I', '-B', str(parser)], input=raw, capture_output=True, timeout=30, check=True)
                write_new(self.root / 'normalized/sources' / (sid + '.json'), result.stdout)
            write_new(self.root / 'seal.json', canonical(self.signed({'runId': self.config['runId'], 'heads': self.heads})) + b'\n')

def processes():
    result = []
    for p in Path('/proc').glob('[0-9]*'):
        try:
            stat = (p / 'stat').read_text()
            result.append({'role': (p / 'comm').read_text().strip(), 'pid': int(p.name),
                           'starttime': int(stat[stat.rfind(')') + 2:].split()[19])})
        except (OSError, ValueError):
            continue
    return result

class RecordingFile:
    def __init__(self, fp):
        self.fp, self.parts = fp, []
    def read(self, n=-1):
        data = self.fp.read(n); self.parts.append(data); return data
    def readline(self, n=-1):
        data = self.fp.readline(n); self.parts.append(data); return data
    def flush(self):
        if not self.fp.closed:
            self.fp.flush()
    def close(self):
        self.fp.close()

class RecordingSocket:
    def __init__(self, sock):
        self.file = RecordingFile(sock.makefile('rb'))
    def makefile(self, *args, **kwargs):
        return self.file

def http_raw(endpoint):
    from urllib.parse import urlsplit
    u = urlsplit(endpoint)
    if u.scheme != 'http' or u.hostname not in ('127.0.0.1', 'localhost'):
        raise ValueError('observer HTTP sources must be engine loopback')
    with socket.create_connection((u.hostname, u.port), timeout=2) as sock:
        request = (u.path or '/') + ('?' + u.query if u.query else '')
        sock.sendall(f'GET {request} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'.encode('ascii'))
        rec = RecordingSocket(sock)
        response = http.client.HTTPResponse(rec)
        response.begin()
        body = response.read(MAX_READ + 1)
        if response.status != 200 or len(body) > MAX_READ:
            raise ValueError(f'HTTP source status={response.status}, bytes={len(body)}')
        response.close()
        return b''.join(rec.file.parts)

def read_source(source):
    kind = source['reader']
    if kind == 'http':
        return http_raw(source['endpoint'])
    if kind == 'file':
        with open(source['endpoint'], 'rb') as fp:
            data = fp.read(MAX_READ + 1)
        if len(data) > MAX_READ:
            raise ValueError('file exceeds bounded sample')
        return data
    if kind == 'threads':
        # [EXP-OBS01] Why: CPU comes from procfs, never a gateway counter; names are only labels.
        # Rejected: gateway-reported drain (gateway is the system under test).
        files = {}
        for pid in source['pids']:
            for task in Path(f'/proc/{pid}/task').glob('*'):
                for name in ('comm', 'stat'):
                    try:
                        files[str(task / name)] = base64.b64encode((task / name).read_bytes()).decode()
                    except FileNotFoundError:
                        pass  # threads may exit between directory enumeration and read
        if not files:
            raise ValueError('no gateway threads visible')
        return canonical(files)
    raise ValueError('unknown source reader')

class ClockHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/clock':
            self.send_error(404); return
        data = canonical({'observerMono': mono()})
        self.send_response(200); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
    def log_message(self, *args):
        pass

def run(config_path, key_path, output):
    config = json.loads(Path(config_path).read_bytes())
    original_config_sha = sha(Path(config_path).read_bytes())
    # [EXP-OBS01] Why: the engine has a private cgroup namespace, but this observer joins the host namespace.
    # Rejected: reading /proc/1/cgroup inside the engine (returns only / on Docker's private namespace).
    cg = next(line[3:] for line in Path('/proc/1/cgroup').read_text().splitlines() if line.startswith('0::'))
    if config['sut']['engineContainerId'] not in cg or '..' in cg:
        raise ValueError('engine cgroup identity cannot be bound')
    for stream in config['streams']:
        if stream['sourceId'] == 'H1':
            stream['endpoint'] = '/sys/fs/cgroup' + cg + '/' + stream['endpoint'].rsplit('/', 1)[1]
    bundle = Bundle(output, config, Path(key_path).read_bytes())
    bundle.envelope['collector']['configSha256'] = original_config_sha
    bundle.envelope['sut']['enginePids'] = [p for p in processes() if p['pid'] != os.getpid()]
    own_cg = next(line[3:] for line in Path('/proc/self/cgroup').read_text().splitlines() if line.startswith('0::'))
    own_id = re.search(r'[a-f0-9]{64}', own_cg)
    bundle.envelope['collector'].update(containerId=own_id.group() if own_id else os.environ.get('HOSTNAME', 'unknown'), cgroupPath='/sys/fs/cgroup' + own_cg)
    atomic(bundle.root / 'bundle.json', canonical(bundle.envelope) + b'\n')
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    # The clock endpoint only reads a clock; it cannot write records or accept caller timestamps.
    server = ThreadingHTTPServer(('0.0.0.0', config['clockPort']), ClockHandler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    due = {s['streamId']: 0 for s in config['streams']}
    tails = {}
    try:
        while not stop.is_set():
            for stream in config['streams']:
                sid = stream['streamId']
                if mono() < due[sid]:
                    continue
                start, real = mono(), time.time_ns() / 1_000_000
                if stream['method'] == 'tail':
                    p = Path(stream['endpoint'])
                    st = p.stat()
                    old_inode, offset = tails.get(sid, (st.st_ino, 0))
                    rotation = old_inode != st.st_ino or st.st_size < offset
                    if rotation:
                        offset = 0
                    with p.open('rb') as fp:
                        fp.seek(offset); data = fp.read(MAX_READ)
                    # Rotation is explicit; a semantic parser must reject incomplete coverage.
                    payload = canonical({'inode': st.st_ino, 'offset': offset, 'rotation': rotation,
                                         'bytes': base64.b64encode(data).decode()}) + b'\n'
                    tails[sid] = (st.st_ino, offset + len(data))
                else:
                    payload = read_source(stream)
                bundle.append(sid, payload, start, real)
                due[sid] = start + stream['cadenceMs']
            stop.wait(.01)
    except Exception as error:
        write_new(bundle.root / 'failure.json', canonical({'error': str(error), 'tMono': mono()}) + b'\n')
        raise
    else:
        bundle.seal()
    finally:
        server.shutdown()

if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'clock':
        print(http_raw(f'http://127.0.0.1:{int(sys.argv[2])}/clock').decode())
    else:
        run(*sys.argv[1:])
