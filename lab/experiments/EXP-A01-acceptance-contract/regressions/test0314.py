"""Contract 0.3.14 current-version checks; inherited policy assertions remain in force."""
import hashlib,json,pathlib,re,runpy,subprocess,sys,unittest
T=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(T))
import test0313 as old
R=old.R; C=old.C; D=old.D; A=json.loads((R/'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.14/authority-and-pin-review.json').read_text())
class Contract0314(old.Contract0313):
    def test_version(self):self.assertEqual(D['version'],'0.3.14')
    def test_testkit_pin_projections(self):
        p=A['pinChanges'][0];want=[{'path':p['path'],'sha256':p['sha256']}]
        for v in [D['oracleFilesPinned']['O-TESTKIT'],D['caseSets']['CS-U44']['pinnedSourceFiles'],D['caseSourcesPinned']['CS-U44']]:self.assertEqual(v,want)
        self.assertEqual(hashlib.sha256(old.git('show',A['baseCommit']+':'+p['path'])).hexdigest(),p['baseSha256'])
        self.assertEqual(hashlib.sha256((R/p['path']).read_bytes()).hexdigest(),p['sha256'])
        self.assertFalse(A['mainTestkitStale']);self.assertEqual(p['expectedOnMain'],[p['baseSha256']])
    def test_pending_exact_rows_preserved(self):
        before=(R/'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.14/pending-authority.md').read_text().splitlines();after=(R/'lab/acceptance/RULINGS-PENDING.md').read_text().splitlines()
        for l in before:
            m=re.match(r'^\| (Q\d+[a-z]?(?:-S)?)\b',l)
            if m and m[1] not in A['rules']:self.assertIn(l,after)
        self.assertFalse(set(A['rules']) & set(D['pendingRulings']['ids']))
    def test_0314_authority(self):
        self.assertEqual(set(A['rules']),{'Q96'+c for c in 'abcd'}|{'Q97'+c for c in 'abc'})
        for rid,v in A['rules'].items():
            self.assertIn(v['rule'],old.git('show',A['baseCommit']+':lab/acceptance/RULINGS-PENDING.md').decode())
            self.assertEqual(next(r for r in D['rulings'] if r['id']==rid)['ruling'],v['rule'])
            dest='laneXP2Rules' if rid.startswith('Q96') else 'laneQP4Rules'
            self.assertEqual(D[dest][rid],v);self.assertEqual(old.L[dest][rid],v)
        self.assertEqual(C['checks_0314'](),[])
    def test_pin_diff_review(self):
        self.assertEqual(len(A['pinScan']),243);self.assertEqual(len(A['pinChanges']),1)
        for p in A['pinChanges']:
            diff=old.git('diff',A['baseCommit'],'--',p['path'])
            self.assertEqual(diff,(R/'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.14'/ (p['path'].replace('/','__')+'.diff')).read_bytes())
        self.assertTrue(all(not h['changesMeasuredWorkload'] for h in A['hunkReview']))
        self.assertTrue(all(not p['wholeFileHashPinned'] for p in A['coreChangedFiles']))
    def test_native_review(self):
        r=D['rulingReview0314'];self.assertEqual(r,A['nativeReview']);self.assertEqual(r['commit'],'4155fda7')
        self.assertEqual(hashlib.sha256((R/r['record']).read_bytes()).hexdigest(),r['sha256'])
        self.assertIn('ACCEPT for D1',(R/r['record']).read_text())
    def test_no_q89_compilation(self):
        self.assertFalse(any(r['id'].startswith('Q89') for r in D['rulings']))
        self.assertIn('Q89b',D['pendingRulings']['ids'])
        self.assertIn('eligible fallback',next(o for o in D['obligations'] if o['id']=='G8.composition.watermark-routing')['statement'])
if __name__=='__main__':unittest.main(verbosity=2)
