from pathlib import Path
import hashlib,json,os,subprocess
root=Path('/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation/engine')
research=Path('/tmp/temporal-roadmap-research/iteration-01')
files=['src/temporal_datalog.cpp','src/temporal_core.cpp','src/temporal_core.hpp','src/temporal_typed_core.hpp','src/temporal_value_domain.hpp','vendor/duckdb_v2.h','vendor/duckdb_extension_v2.h','build.sh','vendor/append_extension_metadata.py','vendor/materialize_duckdb_v2.py','vendor/duckdb_v2.parts.json']
frozen=Path('/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/frozen-baseline/engine/src/temporal_core.cpp')
def hashes():return {f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}
before=hashes(); records={}
for name,control,expected in [('typed',False,'5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d'),('api-only',True,'69916109931921a0499ddcdedcfb34e4a48635ad6953713b8b18d7bde52e0b4f')]:
 out=root/'build'/'checkpoints'/('source-pinned-'+name)
 env=dict(os.environ,TD_BUILD_DIR=str(out),PYTHONDONTWRITEBYTECODE='1')
 if control:env['TD_CONTROL_CORE']=str(frozen)
 result=subprocess.run(['bash',str(root/'build.sh')],env=env,text=True,capture_output=True)
 (research/('rebuild-source-pinned-'+name+'.log')).write_text(result.stdout+result.stderr)
 if result.returncode:raise RuntimeError(name+' rebuild failed')
 binary=out/'temporal_datalog.duckdb_extension';actual=hashlib.sha256(binary.read_bytes()).hexdigest()
 records[name]={'artifact':str(binary),'sha256':actual,'expected_initial_sha256':expected,'bit_identical_reproduction':actual==expected,'core_source':str(frozen if control else root/'src/temporal_core.cpp'),'core_sha256':hashlib.sha256((frozen if control else root/'src/temporal_core.cpp').read_bytes()).hexdigest(),'build_env':{'TD_BUILD_DIR':str(out),'TD_CONTROL_CORE':str(frozen) if control else None},'exit_code':result.returncode}
 if actual!=expected:raise RuntimeError(name+' did not reproduce initial artifact')
after=hashes()
if before!=after:raise RuntimeError('source changed during rebuild; no provenance correspondence claimed')
report={'format':'v2-source-pinned-reproduction-v1','status':'PASS','source_hashes_before':before,'source_hashes_after':after,'sources_unchanged':True,'compiler':subprocess.check_output(['g++','--version'],text=True).splitlines()[0],'artifacts':records,'runtime':'DuckDB2.0.0','original_and_frozen_unchanged':True}
(research/'native-v2-source-provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':'PASS','artifacts':records,'sources_unchanged':True}))
