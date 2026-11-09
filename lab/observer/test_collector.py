#!/usr/bin/env python3
"""Source-bound collector/decoder gates, plus pinned O-OBS authentication interoperability."""
import base64
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = Path(__file__).resolve().parent

def module(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value

collector = module('collector', HERE / 'collector.py')
normalizer = module('normalizer', HERE / 'normalize.py')
ORACLE = HERE.parents[1] / 'runs/OBS01/oracle'
sys.path.insert(0, str(ORACLE))
oracle = module('observe', ORACLE / 'observe.py')

class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=HERE.parents[1] / 'runs/OBS01')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'bundle'
        self.key = bytes(range(32))
        self.keyfile = Path(self.tmp.name) / 'external.key'; self.keyfile.write_bytes(self.key)
        parser = {'id': 'obs01-source-samples', 'version': '1', 'sha256': collector.sha((HERE / 'normalize.py').read_bytes())}
        self.stream = {'streamId': 'memory', 'kind': 'HO/any/H1', 'sourceId': 'H1',
                       'endpoint': '/sys/fs/cgroup/engine/memory.current', 'method': 'scrape', 'cadenceMs': 100, 'normalizer': parser}
        config = {'runId': 'test', 'receiptId': 'test-receipt', 'keyId': 'test-key', 'streams': [self.stream],
                  'maxUncertaintyMs': 1, 'collector': {'imageDigest': 'sha256:test', 'sourceSha256': 'test', 'configSha256': 'test',
                  'containerId': 'test', 'cgroupPath': 'test', 'cpuset': '5'},
                  'sut': {'lane': 'xtdb', 'engineContainerId': 'engine', 'engineImageDigest': 'sha256:engine', 'engineConfigSha256': 'engine', 'enginePids': [{'role': 'fixture', 'pid': 1, 'starttime': 1}]}}
        self.bundle = collector.Bundle(self.root, config, self.key)
        for raw in (b'100\n', b'200\n'):
            self.bundle.append('memory', raw, collector.mono(), 1000.0)
        self.bundle.seal()
        (self.root / 'clock/bridge.jsonl').write_text('{"send":1,"receive":2,"observerMono":100}\n')
        entries = self.bundle.entries['memory']
        self.context = {'format': 'obs-context/1', 'runId': 'test', 'receiptId': 'test-receipt', 'keyId': 'test-key',
                        'protocol': 'OBS-RESOURCE', 'obligation': 'test', 'case': 'test', 'witnessKind': 'RESOURCE',
                        'thresholdIds': [], 'contractSha256': 'test', 'bundleSha256': collector.sha((self.root / 'bundle.json').read_bytes()),
                        'bridgeSha256': collector.sha((self.root / 'clock/bridge.jsonl').read_bytes()),
                        'engine': 'xtdb', 'bindings': {}, 'clockMaxUncertaintyMs': 1,
                        'streams': [{**self.stream, 'normalizerPath': str(HERE / 'normalize.py'), 'chunks': entries}],
                        'witnessHeads': [{'runId': 'test', 'streamId': 'memory', 'seq': len(entries)-1,
                                          'headSha256': entries[-1]['headerSha256'], 'tMono': 100}]}

    def authenticate(self):
        return oracle.authenticate(self.root, self.context, self.keyfile)

    def test_real_writer_verifies_in_pinned_oracle(self):
        authenticated, uncertainty = self.authenticate()
        self.assertEqual(uncertainty, 1)
        self.assertEqual([x['value'] for x in authenticated['memory'][1]['samples']], [100, 200])
        self.assertEqual((self.root / 'objects' / (collector.sha(b'100\n') + '.bin')).read_bytes(), b'100\n')
        self.assertNotIn(self.key.hex(), (self.root / 'bundle.json').read_text())

    def test_host_integrity_before_witness(self):
        verifier=module('verify_seal',HERE/'verify_seal.py')
        config=Path(self.tmp.name)/'config.json';config.write_bytes(collector.canonical(self.bundle.config))
        result=verifier.verify(self.root,self.keyfile,config,HERE)
        self.assertEqual(result['runId'],'test')
        normalized=self.root/'normalized/sources/memory.json';normalized.write_text('{}\n')
        with self.assertRaisesRegex(ValueError,'recomputation mismatch'):verifier.verify(self.root,self.keyfile,config,HERE)

    def test_host_integrity_refuses_wrong_engine_and_unsealed(self):
        verifier=module('verify_seal',HERE/'verify_seal.py')
        config=Path(self.tmp.name)/'config.json';wrong=copy.deepcopy(self.bundle.config);wrong['sut']['engineContainerId']='other';config.write_bytes(collector.canonical(wrong))
        with self.assertRaisesRegex(ValueError,'binding mismatch'):verifier.verify(self.root,self.keyfile,config,HERE)
        (self.root/'seal.json').unlink()
        with self.assertRaises(FileNotFoundError):verifier.verify(self.root,self.keyfile,config,HERE)

    def test_corrupted_raw_rejected(self):
        (self.root / self.bundle.entries['memory'][0]['raw']).write_bytes(b'changed')
        with self.assertRaises(Exception): self.authenticate()

    def test_wrong_key_rejected(self):
        self.keyfile.write_bytes(b'x' * 32)
        with self.assertRaises(Exception): self.authenticate()

    def test_missing_final_witness_rejected(self):
        self.context['witnessHeads'] = []
        with self.assertRaises(Exception): self.authenticate()

    def test_chunk_omission_rejected(self):
        self.context['streams'][0]['chunks'] = self.context['streams'][0]['chunks'][1:]
        with self.assertRaises(Exception): self.authenticate()

    def test_parser_replacement_rejected(self):
        self.context['streams'][0]['normalizer']['sha256'] = '0' * 64
        # Keep envelope pin coherent: the actual decoder bytes still differ.
        envelope = json.loads((self.root / 'bundle.json').read_bytes())
        envelope['streams'][0]['normalizer']['sha256'] = '0' * 64
        (self.root / 'bundle.json').write_bytes(collector.canonical(envelope))
        self.context['bundleSha256'] = collector.sha((self.root / 'bundle.json').read_bytes())
        with self.assertRaises(Exception): self.authenticate()

    def test_unsealed_refused(self):
        (self.root / 'seal.json').unlink()
        with self.assertRaises(Exception): self.authenticate()

    def test_high_uncertainty_rejected(self):
        (self.root / 'clock/bridge.jsonl').write_text('{"send":1,"receive":5,"observerMono":100}\n')
        self.context['bridgeSha256'] = collector.sha((self.root / 'clock/bridge.jsonl').read_bytes())
        with self.assertRaises(Exception): self.authenticate()

    def test_rerun_preserves_existing_bundle(self):
        with self.assertRaises(FileExistsError): collector.Bundle(self.root, self.bundle.config, self.key)

    def test_budget_exhaustion_not_silently_sealed(self):
        self.bundle.config['maxBundleBytes'] = 1
        with self.assertRaises(ValueError): self.bundle.append('memory', b'300\n', collector.mono(), 0)

    def test_vendor_metrics_preserve_tags_and_exact_values(self):
        parsed = normalizer.prometheus(b'# HELP x test\nnode_tx_latestCompletedTxId{db="xtdb"} 9007199254740993\nnode_tx_latestCompletedTxId{db="other"} -1\n')
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]['value'], '9007199254740993')
        with self.assertRaises(ValueError): normalizer.prometheus(b'garbage')

    def test_http_source_keeps_actual_wire_response(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                body = b'x 1\n'
                self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            def log_message(self, *args): pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True); worker.start()
        try:
            raw = collector.http_raw(f'http://127.0.0.1:{server.server_port}/metrics')
            self.assertTrue(raw.startswith(b'HTTP/1.0 200 OK\r\n'))
            self.assertEqual(normalizer.decode(raw)['metrics'][0]['value'], '1')
        finally:
            server.shutdown(); server.server_close(); worker.join()

    def test_http_chunked_bytes_decode(self):
        raw = b'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nx 1\n\r\n0\r\n\r\n'
        self.assertEqual(normalizer.decode(raw)['metrics'][0]['value'], '1')

    def test_log_rotation_does_not_claim_continuous_coverage(self):
        raw = collector.canonical({'inode': 1, 'offset': 0, 'rotation': True, 'bytes': base64.b64encode(b'x').decode()})
        with self.assertRaises(ValueError): normalizer.decode(raw)

if __name__ == '__main__': unittest.main(verbosity=2)
