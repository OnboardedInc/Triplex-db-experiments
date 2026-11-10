# [DX-B8] Why: bind the three integration expressions separately while their shared-file permission is pending.
# Rejected: modifying functions explicitly assigned to DX-B7 without authorization.
import pathlib,shutil,subprocess,hashlib,json,sys
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
gateway=out/'gateway';shutil.copytree(root/'packages/datomic/gateway',gateway)
shutil.copyfile(root/'packages/datomic/src/codec-spec.json',gateway/'codec-spec.json')
patch=root/'lab/experiments/EXP-DX1/b8/required-integration.patch'
subprocess.run(['git','apply','--check',str(patch)],check=True)
for name,edits in {
 'storage.clj': [('(:v (first (d/datoms db :eavt (:scope (reach/config name db)) :triplex.scope/position)))','(scope/head-position db (:scope (reach/config name db)))'),('(value db (:e (first (d/datoms db :aevt :triplex.scope/key))) :triplex.scope/max-recorded-at)','(scope/max-recorded-at db (:e (first (d/datoms db :aevt :triplex.scope/key))))')],
 'main.clj': [('(storage/value db entity :triplex.scope/position)','(storage/head-position name db)')]
}.items():
 p=gateway/'src/triplex/gateway'/name;s=p.read_text()
 for a,b in edits:
  assert s.count(a)==1;(s:=s.replace(a,b))
 p.write_text(s)
if '--fixture-patch' in sys.argv:
 subprocess.run(['patch','-p4','-d',str(gateway),'-i',str(root/'lab/experiments/EXP-DX1/b8/gateway-fixtures.patch')],check=True)
shutil.copytree(root/'lab/experiments/EXP-DX1/b8',out/'runner')
files={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.rglob('*')) if p.is_file()}
(out/'CAPTURE.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'kind':'proposed integration overlay; not unmodified working-tree gateway','fixturePatchApplied':'--fixture-patch' in sys.argv,'files':files},indent=2)+'\n')
