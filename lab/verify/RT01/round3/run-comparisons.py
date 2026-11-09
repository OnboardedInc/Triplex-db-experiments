# [CX-VRT01-R2] Why: retain all independent comparison commands and failures. Rejected: suppressing nonzero harness attempts or semantic mismatch flags.
import subprocess,pathlib,os,json
b=pathlib.Path('lab/verify/RT01/round3');results=[]
for name in ['oracle-compare.py','compare-routes.py','compare-single.py','compare-pending.py']:
 r=subprocess.run(['python3',str(b/name)],env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True);(b/(name+'.stdout')).write_bytes(r.stdout);(b/(name+'.stderr')).write_bytes(r.stderr);results.append({'runner':name,'exit':r.returncode});print(name,r.returncode,flush=True)
(b/'comparison-commands.json').write_text(json.dumps(results,indent=2)+'\n');assert all(r['exit']==0 for r in results)
