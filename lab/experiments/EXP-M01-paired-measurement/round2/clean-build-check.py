import pathlib,subprocess,json,os,hashlib
root=pathlib.Path.cwd();clean=root/'runs/m01r2-clean'; out=root/'runs/m01r2-clean-check';out.mkdir(exist_ok=True)
text=(root/'lab/experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md').read_text()
command=next(l for l in text.splitlines() if l.startswith('node lab/bin/heavy.mjs --label M01-window-build'))
status=subprocess.check_output(['git','status','--porcelain'],cwd=clean).decode()
assert status=='',status
for package in ['core','testkit','xtdb','qualification','w0']:assert not (clean/'packages'/package/'dist').exists(),package
assert (clean/'node_modules').exists()
meta={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=clean).decode().strip(),'cleanStatusBeforeBuild':status,'noDistBeforeBuild':True,'command':command,'packageSourcesUnchangedFromParent':subprocess.check_output(['git','diff','HEAD','--','packages','pnpm-lock.yaml'],cwd=root).decode()==''}
env=dict(os.environ,TX2_LOCKS_DIR='/Users/sam/projects/triplex-db-2/lab/locks',NODE_OPTIONS='--experimental-strip-types')
with (out/'build.log').open('w') as log:r=subprocess.run(command,shell=True,cwd=clean,env=env,stdout=log,stderr=subprocess.STDOUT)
meta['exitCode']=r.returncode
meta['buildLogSha256']=hashlib.sha256((out/'build.log').read_bytes()).hexdigest()
(out/'result.json').write_text(json.dumps(meta,indent=2)+'\n')
raise SystemExit(r.returncode)
