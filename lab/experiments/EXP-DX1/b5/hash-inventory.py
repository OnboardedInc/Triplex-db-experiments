# [DX-B5] Why: list actual old/new bytes and acceptance references without changing frozen pins.
# Rejected: re-pinning files or treating a documentation mention as a file pin.
import hashlib, json, pathlib, subprocess
base = subprocess.check_output(['git', 'rev-parse', '61095d10^'], text=True).strip()
paths = set(subprocess.check_output(['git', 'diff', '--name-only', base], text=True).splitlines())
paths.update(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], text=True).splitlines())
acceptance = [(str(p), p.read_text(errors='replace')) for p in pathlib.Path('lab/acceptance').rglob('*') if p.is_file()]
rows = []
for path in sorted(paths):
 p = pathlib.Path(path)
 if not p.is_file() or not (path.startswith('packages/') or path.startswith('lab/bench/')): continue
 old = subprocess.run(['git', 'show', base + ':' + path], capture_output=True)
 old_hash = hashlib.sha256(old.stdout).hexdigest() if old.returncode == 0 else None
 new_hash = hashlib.sha256(p.read_bytes()).hexdigest()
 rows.append({'path':path, 'oldSha256':old_hash, 'newSha256':new_hash,
              'acceptancePathMentions':[name for name,text in acceptance if path in text],
              'acceptanceOldHashMatches':[name for name,text in acceptance if old_hash and old_hash in text]})
pathlib.Path('lab/experiments/EXP-DX1/b5/HASH-CHANGES.json').write_text(json.dumps({'base':base,'files':rows},indent=2)+'\n')
print(len(rows), 'changed source paths;', sum(bool(r['acceptanceOldHashMatches']) for r in rows), 'old hashes mentioned in acceptance')
