# [CX-VRT01] Why: retain fresh execution and output hashes for the small public-route and same-command journal probes. Rejected: attributing unbound output files to a successful run.
from binding import require_binding,BASE,ROOT,sha
import subprocess,json,datetime,os
before=require_binding();rows=[]
for stem,outputs in [('public-routes',['public-routes.json']),('journal-single',['journal-single-observed.json','journal-single.case.json'])]:
 p=BASE/(stem+'.ts');runner=sha(p);start=datetime.datetime.now(datetime.UTC).isoformat();command=['node','--import','tsx',str(p)]
 r=subprocess.run(command,cwd=ROOT,env=dict(os.environ,TSX_DISABLE_CACHE='1'),capture_output=True)
 (BASE/(stem+'-bound.stdout')).write_bytes(r.stdout);(BASE/(stem+'-bound.stderr')).write_bytes(r.stderr)
 assert r.returncode==0,(stem,r.stderr.decode())
 assert runner==sha(p)
 rows.append(dict(start=start,end=datetime.datetime.now(datetime.UTC).isoformat(),command=command,runnerSha256=runner,exit=r.returncode,outputs={v:sha(BASE/v) for v in outputs}))
after=require_binding();assert before==after
(BASE/'extra-execution.json').write_text(json.dumps(dict(binding=before,commands=rows),indent=2)+'\n')
