from pathlib import Path
import hashlib,json,subprocess

root=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-regression-20261106/runtime')
out=root/'build/qualification-writer435-full-20261106-01'
commit='506698215b8bebdf604de2f41d281d3cdc611929'
def hash_bytes(data):return hashlib.sha256(data).hexdigest()
def save(name,value):
 with (out/name).open('x') as f:json.dump(value,f,indent=2);f.write('\n')
pre=json.loads((out/'before-full-first.json').read_text());post=json.loads((out/'after-full-first.json').read_text())
report_bytes=(out/'actual-verification-first.json').read_bytes();report=json.loads(report_bytes)
root_review=json.loads((out/'root-prepackage-review.json').read_text())
names=sorted(report['source_sha256'])
specs=''.join(commit+':projects/temporal-datalog/runtime/'+name+'\n' for name in names)
objects=subprocess.check_output(['git','cat-file','--batch'],input=specs.encode(),cwd=root)
offset=0;source_git={}
for name in names:
 end=objects.index(b'\n',offset);header=objects[offset:end].split();assert header[1]==b'blob',name
 size=int(header[2]);start=end+1;data=objects[start:start+size];assert objects[start+size:start+size+1]==b'\n'
 offset=start+size+1;expected=report['source_sha256'][name]
 assert hash_bytes(data)==expected and hash_bytes((root/name).read_bytes())==expected,name
 source_git[name]=expected
assert offset==len(objects) and len(source_git)==226
stdout=json.loads((out/'first.stdout').read_text());assert stdout=={k:v for k,v in report.items() if k!='source_sha256'}
allowed=root_review['postcheck']['onlyAdditions'];added={k:v for k,v in post['runtime'].items() if k not in pre['runtime']}
assert added=={k:v['sha256'] for k,v in allowed.items()}
remaining={k:v for k,v in post['runtime'].items() if k not in added};assert remaining==pre['runtime'] and len(remaining)==583
assert all(post[k]==pre[k] for k in pre if k!='runtime')
outputs={}
for name,pin in allowed.items():
 path=root/name;assert path.stat().st_size==pin['bytes']
 outputs[name]={**pin,'preservedAt':str(path)}
 if path.suffix=='.json':
  data=path.read_bytes();assert hash_bytes(data)==pin['sha256']
  with (out/('generated-'+path.name)).open('xb') as f:f.write(data)
 else:
  assert not Path(str(path)+'.wal').exists()
  check=subprocess.run(['/usr/sbin/lsof','-Fpn',str(path)],capture_output=True,text=True)
  assert check.returncode==1 and not check.stdout and not check.stderr,(check.returncode,check.stdout,check.stderr)
  outputs[name]['closedObservation']={'noWal':True,'lsofCommand':check.args,'lsofExitCode':check.returncode,'lsofStdout':check.stdout,'lsofStderr':check.stderr}
terminal=json.loads((out/'first.terminal.json').read_text());assert terminal['exitCode']==0
first_failure=(out/'first-summary.json').read_bytes();assert json.loads(first_failure)['status']=='failed_first_full_outcome'
assert root_review['verificationSha256']==hash_bytes(report_bytes)
result={'schema':'td.native-writer435-offline-acceptance/1','status':'passed_full435_after_exact_test_output_partition',
 'sourceCommit':commit,'engineRerun':False,'sourceOrTestChange':False,'verifierFirstExitCode':0,'wrapperFirstExitCode':1,
 'originalFailureSummarySha256':hash_bytes(first_failure),'originalWrapperFailurePreserved':True,
 'cause':'The post-check wrapper treated all direct owner_probe files as immutable runtime; the existing tests create exactly these three additional data/evidence files there.',
 'immutableRuntime':{'files':583,'exactBeforeAfterMapEqualAfterSubtractingOnlyDeclaredThree':True},
 'testOutputs':outputs,'allOtherSectionsExact':True,'actualCounts':{'python':31,'fixedNode':76,'additionalNode':263,'workloadOracle':8,'workloadPlans':13,'scopedMethods':391,'triplex':44,'total':435},
 'typescript':'PASS','sourcePins':{'count':226,'gitCommit':commit,'allGitObjectsAndCurrentBytesEqual':True},
 'stdoutEqualsReportMinusSources':True,'verificationSha256':hash_bytes(report_bytes),'independentRootReview':'root-prepackage-review.json',
 'mainVerificationUnchangedSha256':root_review['mainGlobalVerificationSha256'],
 'limits':['Correctness435 plus TSC only; no performance/promotion or active-job environment-teardown claim.','Generated six-MiB synthetic activation database stays preserved in its original owned path; binary DB is not copied into Git.']}
save('source-git-object-audit.json',{'commit':commit,'source_sha256':source_git})
save('derived-acceptance.json',result)
print(json.dumps({'status':result['status'],'count':435,'sourceGitPins':226,'runtime':583,'outputs':len(outputs),'engineRerun':False}))
