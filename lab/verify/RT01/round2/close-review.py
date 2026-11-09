# [CX-VRT01-R2] Why: a review verdict must bind all adopted outcomes, the report, source and retained bytes. Rejected: a manifest or successful controller exit without semantic denominator checks.
import pathlib,subprocess,os,json,hashlib
base=pathlib.Path('lab/verify/RT01/round2');report=base.parent/'VERIFY-round2.md'
r=subprocess.run(['python3',str(base/'final-checks.py')],env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True)
(base/'closure-checks.stdout').write_bytes(r.stdout);(base/'closure-checks.stderr').write_bytes(r.stderr);assert r.returncode==0,r.stderr.decode()
result=json.loads((base/'RESULT.json').read_text());assert result['verdict']=='FIX-FIRST'
assert '**Verdict: FIX-FIRST.**' in report.read_text()
paths=sorted(p for p in base.rglob('*')if p.is_file()and '__pycache__' not in p.parts and p.name not in ['SHA256SUMS','INDEX.json'])
assert all(p.stat().st_size<1000000 for p in paths)
assert sum(p.stat().st_size for p in paths)<5000000
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
index={'verdict':'FIX-FIRST','product':result['binding']['product'],'report':{'path':'../VERIFY-round2.md','sha256':sha(report)},'evidenceBytes':sum(p.stat().st_size for p in paths),'files':[{'path':str(p.relative_to(base)),'bytes':p.stat().st_size,'sha256':sha(p)}for p in paths]}
(base/'INDEX.json').write_text(json.dumps(index,indent=2)+'\n')
paths.append(base/'INDEX.json')
manifest=''.join(sha(p)+'  '+str(p.relative_to(base))+'\n'for p in sorted(paths))+sha(report)+'  ../VERIFY-round2.md\n'
(base/'SHA256SUMS').write_text(manifest)
for line in manifest.splitlines():h,p=line.split('  ',1);assert sha(base/p)==h,p
print('FIX-FIRST; report and',len(paths),'artifact files checksum-verified')
