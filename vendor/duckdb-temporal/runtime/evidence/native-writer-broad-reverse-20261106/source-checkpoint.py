from pathlib import Path
import datetime,hashlib,json,stat,sys
r=Path(sys.argv[1]);point=sys.argv[2];before=json.loads((r/'source-before.json').read_text())
v={'atUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
for key in ['database','recipe']:
 old=before[key];p=Path(old['path']);assert not Path(str(p)+'.wal').exists();a=p.lstat();assert stat.S_ISREG(a.st_mode)
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(8*1024*1024),b''):h.update(b)
 b=p.lstat();now=dict(path=str(p),bytes=b.st_size,mtimeNs=str(b.st_mtime_ns),ctimeNs=str(b.st_ctime_ns),sha256=h.hexdigest(),closedWithoutWal=True)
 assert (a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_size,b.st_mtime_ns,b.st_ctime_ns)
 assert now==old;assert not Path(str(p)+'.wal').exists();v[key]=now
for key in ['planSha256','launcherSha256','calculatorSha256']:v[key]=before[key]
with(r/f'source-{point}.json').open('x')as f:json.dump(v,f,indent=2);f.write('\n')
print(json.dumps({'point':point,'sourceUnchanged':True,'recipeUnchanged':True}))
