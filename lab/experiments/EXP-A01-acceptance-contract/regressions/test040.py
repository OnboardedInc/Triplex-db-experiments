"""CX-A01-040: current contract, exact authority, integration and workload-pin checks."""
import hashlib
import json
import pathlib
import re
import runpy
import subprocess
import unittest

R = pathlib.Path(__file__).resolve().parents[4]
E = R / 'lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0'
C = runpy.run_path(str(R / 'lab/acceptance/build_contract.py'))
D = json.loads((R / 'lab/acceptance/obligations.json').read_text())
L = json.loads((R / 'lab/acceptance/load-contract.json').read_text())
A = json.loads((E / 'authority-review.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R)

class Contract040(unittest.TestCase):
    def test_version_and_all_generator_checks(self):
        self.assertEqual(D['version'], '0.4.0')
        for name in ['validate', 'checks_0311', 'checks_0312', 'checks_0312_round3', 'checks_0313', 'checks_0314', 'checks_040', 'checks_pin_QNODELAY', 'checks_pin_M01', 'checks_pin_CHECKJS']:
            self.assertEqual(C[name](), [], name)

    def test_exact_eleven_authority_rows(self):
        expected = {'Q98'+c for c in 'abcdefghi'} | {'Q101a','Q104a'}
        self.assertEqual(set(A['rules']), expected)
        original = git('show', A['baseCommit']+':lab/acceptance/RULINGS-PENDING.md').decode()
        self.assertEqual(original, (E / 'pending-authority.md').read_text())
        for rid, v in A['rules'].items():
            self.assertIn(v['rule'], original)
            self.assertEqual(next(x for x in D['rulings'] if x['id']==rid)['ruling'], v['rule'])
            dest = 'feedRules' if rid.startswith('Q98') else 'positionMappingRules' if rid=='Q101a' else 'noRegressionRules'
            self.assertEqual(D[dest][rid],v)
            self.assertEqual(L[dest][rid],v)

    def test_pending_rows_byte_preserved(self):
        after = (R / 'lab/acceptance/RULINGS-PENDING.md').read_text().splitlines()
        self.assertTrue(all(row in after for row in A['heldRows']))
        self.assertFalse(set(A['rules']) & set(D['pendingRulings']['ids']))
        for prefix in ['Q78e','Q86g','Q89','Q90','Q92','Q94a','Q95','Q98j','Q99','Q100','Q102','Q103','Q105']:
            self.assertTrue(any(x.startswith(prefix) for x in D['pendingRulings']['ids']), prefix)
        self.assertFalse(any(x['id'].startswith(('Q89','Q90','Q99','Q100','Q102','Q103','Q105')) for x in D['rulings']))

    def test_no_changed_bars_or_workload(self):
        old = json.loads(git('show', A['baseCommit']+':lab/acceptance/obligations.json'))
        for key in ['thresholds','writerTrace','worldW0','scalePopulation','imagePins']:
            if key=='imagePins':
                self.assertEqual(D[key]['xtdb'], old[key]['xtdb']);self.assertEqual(D[key]['qlever'],old[key]['qlever'])
            else:self.assertEqual(D[key],old[key],key)
        self.assertEqual([o['id'] for o in D['obligations']], [o['id'] for o in old['obligations']])

    def test_feed_contract_policy(self):
        p=D['feedPolicy']
        self.assertTrue(p['identityOnly']);self.assertEqual(p['forbiddenFields'],['value','envelope','keyId'])
        self.assertEqual(p['resolutions'],['commit','aborted','epoch','seal'])
        self.assertFalse(p['stampIsPublicationInstant']);self.assertEqual(p['readers'],256)
        self.assertEqual(p['affectedSetOracle'],'O-DOMAIN');self.assertEqual(p['directSubjectOnly'],'DIAGNOSTIC')
        self.assertEqual(p['historicalReceipts'],'DIAGNOSTIC');self.assertIn('byte-exact',p['resume'])
        self.assertIn('Identity-only feed',next(o for o in D['obligations'] if o['id']=='NS.P3')['statement'])

    def test_sparse_mapping_policy(self):
        self.assertEqual(D['seedRules']['Q101a'], A['rules']['Q101a'])
        p=D['positionMappingPolicy'];self.assertEqual(len(p['refuse']),3);self.assertEqual(len(p['consumers']),6)
        self.assertIn('map sha256',p['receiptBinding']);self.assertIn('bijection',p['seedManifest'])

    def test_no_regression_policy(self):
        p=D['noRegressionPolicy']
        self.assertEqual((p['minAaRounds'],p['p50MinSamplesPerArm'],p['p99MinSamplesPerArm']),(3,150,1000))
        self.assertIn('bootstrap 95%',p['p99Alternative']);self.assertIn('lower bound must exceed',p['p99Alternative'])
        self.assertIn('pending',p['windowGradeAuthority']);self.assertIn('retained FAILED',p['earlierFailedReceipts'])

    def test_load_projections(self):
        for k in ['feedRules','feedPolicy','positionMappingRules','positionMappingPolicy','noRegressionRules','noRegressionPolicy','seedRules']:
            self.assertEqual(L[k],D[k],k)

    def test_every_repin_and_hunk(self):
        for stage in ['QNODELAY','M01','CHECKJS','CHECKJS_FINAL']:
            pins=json.loads((E/(stage+'-repin-review.json')).read_text())
            self.assertEqual(pins,C['PIN_STAGE_'+stage])
            for p in pins:
                self.assertEqual(sha(git('show',p['baseCommit']+':'+p['path'])),p['previousSha256'])
                self.assertEqual(sha((R/p['path']).read_bytes()),p['sha256'])
                diff=(R/p['diff']).read_bytes();self.assertEqual(sha(diff),p['diffSha256'])
                self.assertEqual(git('diff',p['baseCommit'],'--',p['path']),diff)
                self.assertEqual([h['header'] for h in p['hunks']],re.findall(r'^@@.*$',diff.decode(),re.M))
                self.assertTrue(all(not h['changesMeasuredWorkload'] and h['reason'] for h in p['hunks']))
                if stage.startswith('CHECKJS'):
                    old=git('show',p['baseCommit']+':'+p['path'])
                    self.assertEqual((R/p['path']).read_bytes().splitlines(keepends=True)[1:],old.splitlines(keepends=True))

    def test_image_identity_chain(self):
        image=json.loads((E/'DF01-image-review.json').read_text())
        self.assertEqual(D['imagePins']['datomic']['imageId'],image['new'])
        self.assertEqual(C['PIN_CHANGES_0313']['datomic']['new']['imageId'],image['old'])
        slots=json.loads((R/'lab/config/slots.json').read_text())
        self.assertEqual(slots['lanes']['datomic']['imageId'],image['new'])

    def test_all_accepted_ancestry(self):
        for rev in ['709a18f1','bd0555df','9df9aaf9','c20526eb','dcc8322d','c98bbff8','9b1a9a59','1f59d223','99d9641d','3a354133','f72cd5ad','d4b0caa9']:
            self.assertEqual(subprocess.call(['git','merge-base','--is-ancestor',rev,'HEAD'],cwd=R),0,rev)

    def test_original_evaluator_assertions_preserved(self):
        for file in ['lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs']:
            before=git('show',A['baseCommit']+':'+file)
            self.assertEqual((R/file).read_bytes().splitlines(keepends=True)[1:],before.splitlines(keepends=True))

    def test_qualification_remains_blocked(self):
        self.assertIsNone(D['buildSpec']['argv'])
        self.assertTrue(D['qualificationRun']['blockers'])
        self.assertIn('blocked',D['feedPolicy']['qualification'])
        self.assertEqual(D['pendingRulings']['authority'],'none')

if __name__=='__main__':unittest.main(verbosity=2)
