"""0.3.13 authority, pin, retirement and fail-closed contract regression checks."""
import copy, hashlib, json, pathlib, re, runpy, subprocess, unittest
R = pathlib.Path(__file__).resolve().parents[4]
E = R / 'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.13'
A = json.loads((E / 'authority-and-pin-review.json').read_text())
C = runpy.run_path(str(R / 'lab/acceptance/build_contract.py'))
D = json.loads((R / 'lab/acceptance/obligations.json').read_text())
L = json.loads((R / 'lab/acceptance/load-contract.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.check_output(['git', *a], cwd=R)

class Contract0313(unittest.TestCase):
    def test_version(self): self.assertEqual(D['version'], '0.3.13')
    def test_literal_rulings(self):
        base = git('show', A['baseCommit'] + ':lab/acceptance/RULINGS-PENDING.md').decode()
        for rid, v in A['rules'].items():
            self.assertIn(v['rule'], base, rid)
            self.assertEqual(C['RULES_0313'][rid], v)
            self.assertEqual(next(r for r in D['rulings'] if r['id']==rid)['ruling'], v['rule'])
    def test_every_consumer(self):
        for rid,v in A['rules'].items():
            dest = 'qleverEvidenceRules' if rid.startswith('Q91') else 'seedRules' if rid.startswith('Q93') else 'goldenScenarioRulings'
            self.assertEqual(D[dest][rid], v)
    def test_amendments_applied(self):
        for rid,v in A['amendments'].items(): self.assertEqual(D['seedRules'][rid],v)
        self.assertEqual(D['seedAmendments'], A['amendments'])
    def test_retirement(self):
        for rid in ('Q83d','Q83e'):
            self.assertNotIn(rid,D['seedRules']);self.assertNotIn(rid,{r['id'] for r in D['rulings']})
        self.assertEqual(set(D['retiredSeedRules']), {'Q83d','Q83e'})
    def test_freeze_load_projection(self):
        self.assertEqual(L['freezeProtocol'],D['freezeProtocol'])
        self.assertEqual(L['seedRules'],D['seedRules'])
        self.assertEqual(D['freezeProtocol']['precedence'],['Q93a','Q93b','Q93c'])
        self.assertNotIn('resumeBoundTo',D['freezeProtocol'])
    def test_two_digests(self):
        f=D['freezeProtocol'];self.assertIn('byte-level',f['cloneDigest']);self.assertIn('D-prime',f['freshSeedDigest']);self.assertIn('engine-source comment and a test',f['freshSeedDigest']);self.assertIn('D-prime',f['e1'])
    def test_g0_binding_and_freshness(self):
        f=D['freezeProtocol'];self.assertIn('measuring process',f['grant']);self.assertIn('measured endpoint',f['grant']);self.assertIn('every run',f['grant']);self.assertIn('before first finish-block',f['pinBefore']);self.assertIn('deadline',f['deadlines']);self.assertIn('two starts',f['goldenPublication'])
    def test_testkit_pin_projections(self):
        p=A['pins']['testkit'];want=[{'path':p['path'],'sha256':p['sha256']}]
        for v in [D['oracleFilesPinned']['O-TESTKIT'],D['caseSets']['CS-U44']['pinnedSourceFiles'],D['caseSourcesPinned']['CS-U44']]:self.assertEqual(v,want)
        self.assertEqual(sha(git('show',A['baseCommit']+':'+p['path'])),p['oldSha256']);self.assertEqual(sha(git('show',A['integrationCommit']+':'+p['path'])),p['sha256']);self.assertEqual(sha((R/p['path']).read_bytes()),p['sha256'])
    def test_diff_hunk_review(self):
        diff=git('diff',A['baseCommit'],A['integrationCommit'],'--',A['pins']['testkit']['path'])
        self.assertEqual(diff,(E/'testkit-index.diff').read_bytes());self.assertEqual(len(re.findall(rb'^@@',diff,re.M)),1)
        self.assertTrue(all(not h[k] for h in A['hunkReview'] for k in ('changesOperations','changesData','changesSchedule')))
    def test_image_slots_and_projection(self):
        slots=json.loads((R/'lab/config/slots.json').read_text());self.assertEqual(D['imagePins']['datomic'],A['pins']['datomic']['new'])
        self.assertEqual(D['imagePins']['datomic'],{k:slots['lanes']['datomic'][k] for k in ('image','imageId')})
        self.assertEqual(json.loads((R/'lab/acceptance/oracle-contract.json').read_text())['imagePins'],D['imagePins'])
    def test_pending_exact_rows_preserved(self):
        before=git('show',A['baseCommit']+':lab/acceptance/RULINGS-PENDING.md').decode().splitlines();after=(R/'lab/acceptance/RULINGS-PENDING.md').read_text().splitlines()
        removed=set(A['rules'])
        for l in before:
            m=re.match(r'^\| (Q\d+[a-z]?(?:-S)?)\b',l)
            if m and m[1] not in removed:self.assertIn(l,after)
        self.assertTrue({'Q78e','Q86g','Q94a','Q92a','Q95a'}<=set(D['pendingRulings']['ids']));self.assertFalse(removed&set(D['pendingRulings']['ids']))
    def test_q88_unchanged(self):
        old=json.loads(git('show',A['baseCommit']+':lab/acceptance/obligations.json'))
        for rid in ('Q88a','Q88b','Q88c'):self.assertEqual(D['datomicRules'][rid],old['datomicRules'][rid])
    def test_qlever_evidence_policy(self):
        p=D['qleverEvidencePolicy'];self.assertEqual(p['deltaOnly'],'DIAGNOSTIC');self.assertFalse(p['freshResetAsDeltaPolicy']);self.assertIn('exclusive',p['phase0']);self.assertIn('10M-triple',p['phase1']);self.assertIn('leases',p['phase2']);self.assertIn('touched blocks',str(p['required']))
    def test_gs_never_closes_or_compares(self):
        gs=[o for o in C['OBL'] if o['id'].startswith('GS.')];self.assertTrue(gs)
        for o in gs:self.assertIn('gs-diagnostic-before-0.4.0:Q94e',C['contract_blockers'](o))
        self.assertFalse(D['goldenScenarioPolicy']['closesObligation']);self.assertFalse(D['goldenScenarioPolicy']['entersComparison'])
    def test_self_checks(self):
        for n in ['validate','checks_0311','checks_0312','checks_0312_round3','checks_0313']:self.assertEqual(C[n](),[],n)
    def test_evaluator_assertions_unchanged(self):
        for n in ['claim.test.mjs','claim-round2.test.mjs']:
            p='lab/bin/test/'+n;self.assertEqual((R/p).read_bytes(),git('show',A['baseCommit']+':'+p))
    def test_oracle_objects_unchanged(self):
        old=json.loads(git('show',A['baseCommit']+':lab/acceptance/obligations.json'))
        for key in ['oraclePins','verifierRegistry','verifierBriefSources']:self.assertEqual(D[key],old[key])

if __name__=='__main__':unittest.main(verbosity=2)
