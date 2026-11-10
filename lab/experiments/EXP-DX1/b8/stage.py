# [DX-B8] Why: freeze the integrated gateway and its codec before resource admission.
# Rejected: testing a live mutable source tree or silently applying an integration overlay.
import pathlib,shutil,subprocess,hashlib,json,sys
assert len(sys.argv)==2, "usage: stage.py ABSOLUTE_FRESH_DIRECTORY"
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
gateway=out/'gateway';shutil.copytree(root/'packages/datomic/gateway',gateway)
shutil.copyfile(root/'packages/datomic/src/codec-spec.json',gateway/'codec-spec.json')
shutil.copytree(root/'lab/experiments/EXP-DX1/b8',out/'runner')
files={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.rglob('*')) if p.is_file()}
(out/'CAPTURE.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'kind':'immutable copy of integrated working-tree gateway','files':files},indent=2)+'\n')
