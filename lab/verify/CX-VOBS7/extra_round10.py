#!/usr/bin/env python3
"""Read-only output inspection and Dockerfile guard checks; host Python/bash only."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'round10-extra'
sys.path.insert(0, str(ROOT / 'lab/observer'))
import vm_normalizer as n
from test_round10 import SplitPublication


class Controls(unittest.TestCase):
    def test_position_d_is_latest_and_split_still_reports_visibility(self):
        harness = SplitPublication()
        harness.setUp()
        self.addCleanup(harness.doCleanups)
        raw = harness.build_split(mode='vm')
        observed = {}
        # [CX-VOBS7-R10] Why: inspect the computed annotations at the real refusal, without bypassing it. Rejected: suppressing raise_problems to manufacture an accepted result.
        def trace(frame, event, arg):
            if frame.f_code is n.normalize.__code__ and event == 'exception' and isinstance(arg[1], n.WitnessError):
                observed['resultBeforeRefusal'] = copy.deepcopy(frame.f_locals['result'])
            return trace
        prior = sys.gettrace()
        try:
            sys.settrace(trace)
            with self.assertRaises(n.WitnessError) as caught:
                n.normalize(raw)
        finally:
            sys.settrace(prior)
        self.assertEqual(caught.exception.code, 'PUBLICATION-SPLIT')
        self.assertIn('VISIBLE-BEFORE-DURABLE', caught.exception.also)
        p = observed['resultBeforeRefusal']['stores']['broker']['positions'][0]
        self.assertEqual(p['D'], 11_000_000)
        self.assertEqual(p['durableEndNs'], 11_000_000)
        observed.update(primary=caught.exception.code, also=caught.exception.also,
            normalizerSha256=hashlib.sha256((ROOT / 'lab/observer/vm_normalizer.py').read_bytes()).hexdigest())
        OUT.mkdir(exist_ok=True)
        (OUT / 'latest-position-d.json').write_bytes(n.packed(observed) + b'\n')

    def test_missing_build_version_guard_exits_before_any_install(self):
        recipe = (ROOT / 'lab/observer/bpftrace-image/Dockerfile').read_text()
        guard = recipe.split('\nRUN ', 1)[1].split('    sed -i', 1)[0].replace('\\\n', '').strip()
        result = subprocess.run(['/bin/bash', '-euo', 'pipefail', '-c', guard],
            env={'LIBBSD0_VERSION': ''}, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 1)
        self.assertIn('LIBBSD0_VERSION', result.stdout)
        self.assertNotIn('apt', guard)
        OUT.mkdir(exist_ok=True)
        (OUT / 'missing-build-version.json').write_bytes(n.packed({'guard': guard, 'exit': result.returncode,
            'stdout': result.stdout, 'stderr': result.stderr, 'recipeSha256': hashlib.sha256(recipe.encode()).hexdigest(),
            'claim': 'executed only the first shell guard; no Docker build, apt or network'}) + b'\n')


if __name__ == '__main__':
    unittest.main(verbosity=2)
