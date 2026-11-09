"""Contract 0.3.12: literal authority, runner closure and deferred isolation controls."""
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
import unittest

REPO = Path(__file__).resolve().parents[4]
ACC = REPO / 'lab/acceptance'
D = runpy.run_path(str(ACC / 'build_contract.py'))
DOC = json.loads((ACC / 'obligations.json').read_bytes())
BASE = subprocess.check_output(['git', 'rev-parse', '3aaac6eb'], cwd=REPO, text=True).strip()


def original(path, ref=BASE):
    return subprocess.check_output(['git', 'show', f'{ref}:{path}'], cwd=REPO)


def rows(text):
    return {m[1]: m[0] for line in text.splitlines() if (m := re.match(r'^\| (Q\d+[a-z]?)\b.*$', line))}


class Contract0312(unittest.TestCase):
    def test_authorized_rows_moved_verbatim(self):
        before = rows(original('lab/acceptance/RULINGS-PENDING.md').decode())
        after = rows((ACC / 'RULINGS.md').read_text())
        self.assertEqual(len(D['RULES_0312']), 37)
        for rid in D['RULES_0312']:
            self.assertEqual(before[rid], after[rid], rid)

    def test_other_pending_rows_unchanged(self):
        before = rows(original('lab/acceptance/RULINGS-PENDING.md', '95db6153').decode())
        after = rows((ACC / 'RULINGS-PENDING.md').read_text())
        self.assertEqual(after, {k: v for k, v in before.items() if k not in D['RULES_0312']})
        self.assertEqual(DOC['pendingRulings']['authority'], 'none')
        self.assertTrue({'Q78e', 'Q86g'} <= set(after))

    def test_every_rule_has_generated_consumer(self):
        for rid, rule in D['RULES_0312'].items():
            dest = D['RULE_TARGETS_0312'][rid[:3]][0]
            self.assertEqual(DOC[dest][rid], rule, rid)
            compiled = next(r for r in DOC['rulings'] if r['id'] == rid)
            self.assertEqual(compiled['compiledInto'], [dest])

    def test_runner_file_closure_and_exact_revisions(self):
        pin = DOC['oraclePins']['O-OBS']
        runner = DOC['oracleRunners']['O-OBS']
        self.assertEqual(len(pin['sha256']), 30)
        self.assertEqual(set(runner['files']), set(pin['sha256']))
        for path, digest in pin['sha256'].items():
            ref = pin['commit'] if path.endswith('/observe.py') else pin['dependencies']['O-REPLAY']
            self.assertEqual(hashlib.sha256(original(path, ref)).hexdigest(), digest, path)
            self.assertEqual(hashlib.sha256((REPO / path).read_bytes()).hexdigest(), digest, path)

    def test_observation_safety_and_inventory(self):
        for protocol in ('OBS-NO-MUTATION', 'OBS-PREABORT', 'OBS-CANCEL', 'OBS-ACK-ORDER'):
            self.assertEqual(DOC['obsProtocols'][protocol]['independentSourceKinds'], 2)
        self.assertIn('freed blocks', DOC['protectedCopyInventory'])
        self.assertIn('old index generations', DOC['protectedCopyInventory'])
        self.assertIn('canary', DOC['obsProtocols']['OBS-ERASURE-SCAN']['positiveControl'])
        self.assertIn('cross-multiplication', DOC['obsProtocols']['OBS-WORK']['ratioArithmetic'])

    def test_screening_not_acceptance(self):
        self.assertTrue(D['runner_pinned']('O-OBS'))
        self.assertEqual(DOC['oraclePins']['O-OBS']['acceptanceLevel'], 'screening')
        for obligation in D['OBL']:
            if 'O-OBS' in obligation['oracles']:
                self.assertIn('oracle-screening-only:O-OBS', D['contract_blockers'](obligation))

    def test_three_frontiers_and_load_projection(self):
        freeze = DOC['freezeProtocol']
        self.assertEqual(set(freeze['frontiers']), {'F', 'M', 'T'})
        self.assertEqual(freeze['resumeBoundTo'], 'M')
        self.assertEqual(freeze['precedence'][-1], 'Q83e')
        self.assertEqual(DOC['seedRules']['Q74b']['supersededBy'], ['Q83b', 'Q83d', 'Q83e'])
        load = json.loads((ACC / 'load-contract.json').read_bytes())
        self.assertEqual(load['freezeProtocol'], freeze)
        self.assertEqual(load['seedRules'], DOC['seedRules'])

    def test_no_g03_pins_or_isolation_claim(self):
        self.assertFalse(DOC['isolationAdmission']['inForce'])
        self.assertIsNone(DOC['isolationAdmission']['pins'])
        self.assertIsNone(DOC['buildSpec']['argv'])
        self.assertEqual(DOC['isolationAdmission']['vmHardeningPending'], 'Q86g (Sam)')
        self.assertTrue({'R1', 'R4', 'D1', 'D2', 'D3', 'L1', 'N1', 'N2', 'N3', 'N4'} <= set(DOC['isolationAdmission']['unprotected']))

    def test_q87_preserves_every_assertion(self):
        for path in ('lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs'):
            current = (REPO / path).read_bytes()
            current = b'\n'.join(line for line in current.split(b'\n') if not line.startswith(b'// [EXP-A01-0312] Why:'))
            current = current.replace(b", maxBuffer: 8 << 20", b"")
            self.assertEqual(current, original(path))
        self.assertGreaterEqual(DOC['mergeGates']['minimumTests'], 108)
        self.assertFalse(DOC['mergeGates']['weakenAssertions'])

    def test_original_o05_instructions_recovered_verbatim(self):
        entry = DOC['verifierRegistry']['entries']['V-O05-round4']
        actual = (REPO / entry['brief']).read_bytes()
        self.assertEqual(actual, original('lab/verify/A01/v0312/O05-round4-launch-instructions.md', '4c9077e'))
        self.assertEqual(hashlib.sha256(actual).hexdigest(), '4207182cbbda61f04e9647e1dcde291bdc345dc30f49926abeed6e157e2c1baa')
        self.assertNotEqual(entry['brief'], entry['record'])
        self.assertEqual(entry['briefSha256'], hashlib.sha256(actual).hexdigest())
        provenance = entry['briefProvenance']
        self.assertEqual((REPO / provenance['record']).read_bytes(), original('lab/verify/A01/v0312/O05-brief-provenance.json', '4c9077e'))
        self.assertEqual(hashlib.sha256((REPO / provenance['record']).read_bytes()).hexdigest(), provenance['recordSha256'])
        self.assertEqual((REPO / provenance['lastMessage']).read_bytes(), original('lab/verify/A01/v0312/O05-round4-last.md', '4c9077e'))

    def test_every_verifier_entry_has_its_audited_instruction_preimage(self):
        entries = DOC['verifierRegistry']['entries']
        self.assertEqual(set(entries), set(DOC['verifierBriefSources']))
        self.assertEqual(set(D['verifier_brief_checks']()), set())
        for vid, entry in entries.items():
            expected = DOC['verifierBriefSources'][vid]
            self.assertEqual(entry['brief'], expected['path'], vid)
            self.assertEqual(entry['briefSha256'], expected['sha256'], vid)
            self.assertEqual(hashlib.sha256((REPO / entry['brief']).read_bytes()).hexdigest(), expected['sha256'], vid)
            self.assertNotEqual(entry['brief'], entry['record'], vid)

    def test_verifier_record_is_original(self):
        entry = DOC['verifierRegistry']['entries']['V-O05-round4']
        self.assertEqual((REPO / entry['record']).read_bytes(), original('lab/verify/O05/VERIFY-round4.md', '3e3df9c'))
        self.assertEqual(entry['subject']['commit'], DOC['oraclePins']['O-OBS']['commit'])
        self.assertIn('screening', entry['verdict'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
