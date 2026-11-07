"""Independent offline count-inventory controls; no transport/native actions."""
import copy
import io
import json
from pathlib import Path
import sys
import time
import unittest
import urllib.parse

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'experiments/qlever-native-count-inventory-v1'))
from inventory import CountQlever, Record, run
from read_bounds import ReadOnlyRefusal
from test_inventory import InventoryComponents, Opener, Response, SECRET, temporary, reply

CONTRACT = json.loads((ROOT / 'qualification/native-jobs/qlever-native-count-inventory-v1/contract.json').read_bytes())


def context():
    return {'root': str(ROOT), 'jobId': CONTRACT['jobId'], 'resourceBytes': 896 * 1024**2,
            'cpuUnits': 1, 'rootDevice': ROOT.stat().st_dev,
            'stateOwnerSha256': CONTRACT['stateOwnerSha256'], 'otherActiveQJobs': [],
            'mainOwner': {'status': 'active', 'containerId': CONTRACT['containerId'],
                          'imageSha256': CONTRACT['imageSha256'], 'startedAt': CONTRACT['registeredStartedAt'],
                          'resources': {'memoryBytes': 2 * 1024**3, 'cpuUnits': 1.5}}}


class Docker:
    def inspect(self, cid):
        assert cid == CONTRACT['containerId']
        return {'Id': cid, 'Image': CONTRACT['imageSha256'],
                'State': {'Running': True, 'StartedAt': CONTRACT['registeredStartedAt']},
                'Config': {'User': '501:20', 'WorkingDir': '/data', 'Entrypoint': ['qlever-server'],
                           'Labels': {'triplex.owner': CONTRACT['ownerLabel'], 'triplex.backend': 'qlever'},
                           'Cmd': CONTRACT['fixedNativeArguments'] + [SECRET.decode()]},
                'HostConfig': {'Memory': 2 * 1024**3, 'MemorySwap': 2 * 1024**3,
                               'NanoCpus': 1500000000, 'PidsLimit': 256,
                               'PortBindings': {'7019/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '17019'}]}},
                'Mounts': [{'RW': True, 'Type': 'bind', 'Source': CONTRACT['mainData'], 'Destination': '/data'}]}

    def owned(self, label):
        assert label == CONTRACT['ownerLabel']
        return [self.inspect(CONTRACT['containerId'])]


class ClosedFakeOpener:
    def __init__(self, changed_final=False):
        self.requests = []
        self.settings_calls = 0
        self.changed_final = changed_final

    def open(self, request, timeout):
        assert 0 < timeout <= 6
        parameters = urllib.parse.parse_qs(urllib.parse.urlsplit(request.full_url).query)
        if 'cmd' in parameters:
            assert request.method == 'GET' and request.data is None
            cmd = parameters['cmd'][0]
            self.requests.append(cmd)
            if cmd == 'stats':
                value = {'version-server': 'v0.6.0', 'git-hash-server': '6c5861a'}
            elif cmd == 'get-settings':
                self.settings_calls += 1
                value = {'query-planning-budget': '1' if self.changed_final and self.settings_calls == 2 else '100',
                         'cache-max-size': '64 MB', 'cache-max-size-single-entry': '32 MB'}
            elif cmd == 'dump-active-queries':
                value = []
            else:
                raise AssertionError('Unexpected control')
            return Response(json.dumps(value).encode())
        assert request.method == 'POST' and set(parameters) == {'timeout'}
        text = request.data.decode()
        assert text.startswith('SELECT (COUNT(*) AS ?count) WHERE { ') and 'OFFSET' not in text and 'LIMIT' not in text
        channel = 'named' if 'GRAPH ?g' in text else 'default'
        self.requests.append(channel)
        return Response(reply('0' if channel == 'named' else '18446744073709551615'))


class IndependentInventoryComponents(unittest.TestCase):
    def test_full_fake_run_retains_exact_named_and_default_without_pages(self):
        directory = temporary()
        record = Record(directory, SECRET)
        native = CountQlever(SECRET, CONTRACT['namespace'], record)
        native.opener = ClosedFakeOpener()
        result = run(CONTRACT, context(), Docker(), native, record)
        self.assertEqual(result['counts']['named']['parsedCountDecimal'], '0')
        self.assertEqual(result['counts']['default']['parsedCountDecimal'], '18446744073709551615')
        self.assertEqual(native.opener.requests, ['stats', 'get-settings', 'dump-active-queries',
                         'dump-active-queries', 'named', 'default', 'stats', 'get-settings', 'dump-active-queries'])
        self.assertEqual(result['payloadPagesRequested'], 0)
        self.assertFalse(result['continuityAttempted'])
        self.assertFalse(result['sumOfSeparateRdfPopulationsWithinExistingBudget'])
        self.assertEqual((directory / 'raw-count-named.json').read_bytes(), reply('0'))
        self.assertEqual((directory / 'raw-count-default.json').read_bytes(), reply('18446744073709551615'))

    def test_post_count_settings_failure_preserves_both_channels(self):
        directory = temporary()
        record = Record(directory, SECRET)
        native = CountQlever(SECRET, CONTRACT['namespace'], record)
        native.opener = ClosedFakeOpener(changed_final=True)
        with self.assertRaises(ReadOnlyRefusal):
            run(CONTRACT, context(), Docker(), native, record)
        self.assertTrue((directory / 'raw-count-named.json').is_file())
        self.assertTrue((directory / 'raw-count-default.json').is_file())
        self.assertNotIn('dump-active-queries', native.opener.requests[-2:])
        events = [json.loads(path.read_bytes()) for path in directory.glob('[0-9]*.json')]
        self.assertTrue(any(isinstance(event.get('value'), dict) and
                            event['value'].get('query-planning-budget') == '1' for event in events))

    def test_escaped_credential_echo_never_reaches_raw_artifact(self):
        directory = temporary()
        record = Record(directory, SECRET)
        native = CountQlever(SECRET, CONTRACT['namespace'], record)
        escaped = (b'{"error":"' + b'\\u0078' * len(SECRET) + b'"}')
        native.opener = Opener(escaped)
        with self.assertRaises(ReadOnlyRefusal):
            record.step('count-named', lambda: native.count('named', time.monotonic() + 30))
        self.assertFalse((directory / 'raw-count-named.json').exists())
        for path in directory.iterdir():
            self.assertNotIn(SECRET, path.read_bytes())
            self.assertNotIn(escaped, path.read_bytes())

    def test_wrong_context_refuses_before_even_fake_transport(self):
        bad = copy.deepcopy(context())
        bad['otherActiveQJobs'] = [{'id': 'unexpected', 'status': 'running'}]
        class RefuseAll:
            def __getattr__(self, _):
                raise AssertionError('Context failure reached transport')
        with self.assertRaises(ReadOnlyRefusal):
            run(CONTRACT, bad, RefuseAll(), RefuseAll(), Record(temporary(), SECRET))


if __name__ == '__main__':
    unittest.main(verbosity=2)
