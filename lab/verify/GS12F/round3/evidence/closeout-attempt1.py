# [CX-VGS12F-R3] Why: freeze final main drift, published pin intersections and exact source stability.
# Rejected: asserting acceptance equality against the builder's old base after main has advanced.
import pathlib,subprocess,hashlib,json,datetime
r=pathlib.Path('lab/verify/GS12F/round3');out=r/'evidence'
def git(*a):return subprocess.check_output(['git',*a])
def sha(b):return hashlib.sha256(b).hexdigest()
s=json.loads((out/'execution-sources.json').read_text());changed=[p for p,h in s['files'].items() if sha(pathlib.Path(p).read_bytes())!=h];assert not changed,changed
main=git('rev-parse','main').decode().strip();target=s['target']
paths=git('diff','--name-only',main,target,'--','lab/acceptance/').decode().splitlines()
rows=[]
for p in paths:
 rows.append({'path':p,'mainSha256':sha(git('show',main+':'+p)),'candidateSha256':sha(git('show',target+':'+p))})
(out/'contract-final.diff').write_bytes(git('diff',main,target,'--','lab/acceptance/'))
(out/'contract-final.json').write_text(json.dumps({'main':main,'target':target,'acceptanceEqualsMain':not paths,'changedFiles':rows,'productionAndExecutedReviewerInputsUnchanged':True,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
summary={}
for name in ['legacy','current']:
 ms=[json.loads(p.read_text()) for p in (out/name).glob('matrix-*.json')]
 summary[name]={k:sum(x.get(k,0) for x in ms) for k in ['legacyVectors','policyRejected','accepted','rejected','publicRejected','callbacks','claims']}
(out/'matrix-totals.json').write_text(json.dumps(summary,indent=2)+'\n')
assert (out/'container-before.log').read_bytes()==(out/'container-after.log').read_bytes()
print(json.dumps({'matrixTotals':summary,'contractEqualsMain':not paths,'contractChangedFiles':paths},indent=2))
