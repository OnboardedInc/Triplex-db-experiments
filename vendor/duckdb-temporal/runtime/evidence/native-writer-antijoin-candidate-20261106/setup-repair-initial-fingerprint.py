from pathlib import Path
import datetime,hashlib,json,os,stat
r=Path("<writer-source-runtime>/build/native-writer-lab-antijoin-20261106/candidate-01")
db=Path("<accepted-project-runtime>/build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb");recipe=Path("<accepted-project-runtime>/build/combined-028-20261105/mixed-10m-pilot.json")
accepted=Path("<writer-source-runtime>/build/native-writer-lab-broad-20261106/reverse-01/source-after.json")
def fingerprint(path,expected):
 assert not Path(str(path)+'.wal').exists()
 a=path.lstat();assert stat.S_ISREG(a.st_mode)
 h=hashlib.sha256()
 with path.open('rb')as f:
  for part in iter(lambda:f.read(8*1024*1024),b''):h.update(part)
 b=path.lstat();assert (a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_size,b.st_mtime_ns,b.st_ctime_ns)
 assert h.hexdigest()==expected,(str(path),h.hexdigest())
 assert not Path(str(path)+'.wal').exists()
 return dict(path=str(path),bytes=b.st_size,mtimeNs=str(b.st_mtime_ns),ctimeNs=str(b.st_ctime_ns),sha256=h.hexdigest(),closedWithoutWal=True)
# Same actual initial fingerprint body used for reverse/source-before. The anti
# directory has no launcher/calculator: their unchanged references stay in reverse.
doc=Path("<writer-source-runtime>")/'NATIVE-WRITER-BROAD-FORWARD-PLAN.md'
assert hashlib.sha256(doc.read_bytes()).hexdigest()=='1fb10d550d82bf343011e7d60a502bb842e6d6132d5a6a9d1f17599fe415d0a8'
v=dict(atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),database=fingerprint(db,'3712516b8de8e371f71ae89aaab04f1d456da7a0fc6caa178ec0042926b0e6b3'),recipe=fingerprint(recipe,'5321690cd6e5cf26ca28332af19b6c59716ddaa785f4c8460657d1a6f95873e7'),planSha256=hashlib.sha256(doc.read_bytes()).hexdigest(),acceptedReverseCheckpointSha256=hashlib.sha256(accepted.read_bytes()).hexdigest())
prior=json.loads(accepted.read_text())
assert v['database']==prior['database']
assert v['recipe']==prior['recipe']
assert not (r/'source-before.json').exists()
with (r/'source-before.json').open('x')as f:json.dump(v,f,indent=2);f.write('\n')
print(json.dumps(v))
