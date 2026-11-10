# [DX-N1] Why: bind actual source, builds and tools for each attempt. Rejected: HEAD alone (untracked builds).
import hashlib,json,pathlib,sys,subprocess
repo=pathlib.Path(__file__).resolve().parents[4]
files=subprocess.check_output(['git','ls-files','lab/bench','lab/experiments/EXP-DX1/native','packages/datomic','packages/core','pnpm-lock.yaml'],cwd=repo,text=True).splitlines()
files += [str(p.relative_to(repo)) for p in (repo/'packages').glob('*/dist/**/*') if p.is_file()]
rows={f:hashlib.sha256((repo/f).read_bytes()).hexdigest() for f in sorted(set(files)) if (repo/f).is_file()}
pathlib.Path(sys.argv[1],'source-build-hashes.json').write_text(json.dumps(rows,indent=2))
