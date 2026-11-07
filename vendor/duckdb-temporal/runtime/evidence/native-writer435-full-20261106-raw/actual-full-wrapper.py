from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,time,traceback

C=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-regression-20261106/runtime')
HEAD='506698215b8bebdf604de2f41d281d3cdc611929'
PY='[LOCAL_PATH_0034]'
OLD=C/'evidence/native-writer435-focused-20261106-raw'
OUT=C/'build/qualification-writer435-full-20261106-01'
assert Path.cwd()==C
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=C).decode().strip()==HEAD
assert not OUT.exists(),'full capture must be fresh'
assert not os.environ.get('NODE_OPTIONS') and not [k for k,v in os.environ.items() if k.startswith('TD_NATIVE_WRITER_LAB_') and v]

# Reuse the exact approved first-gate snapshot functions, not its stage/main.
namespace={}
driver=(OLD/'actual-gate.py').read_text()
exec(compile(driver.split('\nos.chdir(C)\n',1)[0],str(OLD/'actual-gate.py'),'exec'),namespace)
expected=json.loads((OLD/'fatal-transport-first-after-pins.json').read_text())
digest=namespace['digest']
base_snapshot=namespace['snapshot']
assert base_snapshot()==expected,'exact current583 preflight differs from qualified postmap'

OUT.mkdir();shutil.copyfile(__file__,OUT/'actual-full-wrapper.py')
def save(name,value):
 with (OUT/name).open('x') as f:json.dump(value,f,indent=2);f.write('\n')
def emit(**value):print(json.dumps(value),flush=True)
def code_sources():
 result={}
 for folder,dirs,files in os.walk(C,followlinks=False):
  dirs[:]=[d for d in dirs if d not in ['build','node_modules','__pycache__','evidence'] and not (Path(folder)/d).is_symlink()]
  for name in files:
   path=Path(folder)/name
   if not path.is_symlink() and path.suffix in ['.py','.cpp','.hpp','.h','.ts','.mts','.mjs','.sql','.json']:
    result[str(path.relative_to(C))]=digest(path)
 return dict(sorted(result.items()))
def runtime_files():
 # Runtime modules/artifacts remain exact. Full tests own new data directories;
 # preserve and enumerate their names separately, never mistake them for code.
 result={}
 for dirname in ['build/adapter','build/owner_probe']:
  for path in (C/dirname).iterdir():
   if path.is_file() and not path.is_symlink():result[str(path.relative_to(C))]=digest(path)
 for path in (C/'build').iterdir():
  if path.is_file() and not path.is_symlink():
   if path.suffix in ['.duckdb','.wal']:continue
   result[str(path.relative_to(C))]=digest(path)
 for folder,dirs,files in os.walk(C/'node_modules',followlinks=False):
  dirs[:]=[d for d in dirs if not (Path(folder)/d).is_symlink()]
  for name in files:
   path=Path(folder)/name
   if not path.is_symlink():result[str(path.relative_to(C))]=digest(path)
 return dict(sorted(result.items()))
namespace['runtime_map']=runtime_files
def current_snapshot():return namespace['snapshot']()
def owned_data_paths():
 return {name:[str(p.relative_to(C)) for p in sorted((C/name).iterdir()) if p.is_dir() and p.name not in ['adapter','owner_probe','qualification-writer435-20261106-01',OUT.name]] for name in ['build','build/adapter']}

pre=current_snapshot();assert pre==expected
source_before=code_sources();save('before-full-first.json',pre);save('code-source-before-first.json',source_before)
old_report=C/'evidence/verification.json'
previous={'exists':old_report.exists()}
if old_report.exists():
 previous.update(sha256=digest(old_report),bytes=old_report.stat().st_size)
 shutil.copyfile(old_report,OUT/'previous-candidate-verification.json')
save('previous-candidate-report-identity.json',previous)
main_report=Path('__HANDOFF_ROOT__/duckdb-temporal/current/runtime/evidence/verification.json')
main_before=digest(main_report);save('main-verification-before.json',{'file':str(main_report),'sha256':main_before})

env={**namespace['ENV'],'PATH':'[LOCAL_PATH_0111]'+os.environ['PATH']}
command=[PY,'verify.py','--with-direct']
selected_env={name:env[name] for name in ['PATH','UV_THREADPOOL_SIZE','TD_TEST_PRE_BATCH_BUILD','TD_SDK_ADMISSION_SOURCE','TD_SDK_ADMISSION_RECIPE']}
summary={'schema':'td.native-writer435-full/1','sourceCommit':HEAD,'productionCodeCommit':'659ace02feaaa4fe1d779644b84c0f6e42fb2097',
 'status':'running','expected':{'python':31,'fixedNode':76,'additionalNode':263,'workloadOracle':8,'workloadPlans':13,'scopedMethods':391,'triplexCases':44,'total':435},
 'environment':selected_env,'candidateReport':str(old_report),'previousCandidateReport':previous,'nativeRebuild':False,'packageInstall':False,'restage':False}
started=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
with (OUT/'first.stdout').open('xb') as stdout,(OUT/'first.stderr').open('xb') as stderr:
 process=subprocess.Popen(command,cwd=C,env=env,stdout=stdout,stderr=stderr)
 terminal={'command':command,'cwd':str(C),'pid':process.pid,'startedAtUtc':started,'status':'running','environment':selected_env}
 (OUT/'first.terminal.json').write_text(json.dumps(terminal,indent=2)+'\n')
 emit(phase='full435',status='started',pid=process.pid,source=HEAD,capture=str(OUT))
 code=process.wait()
terminal.update(status='terminal',exitCode=code,endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-clock)*1000)
(OUT/'first.terminal.json').write_text(json.dumps(terminal,indent=2)+'\n');summary['terminal']=terminal
emit(phase='full435',status='terminal',exitCode=code,elapsedMs=terminal['elapsedMs'])
try:
 post=current_snapshot();save('after-full-first.json',post)
 assert post==pre,'runtime/source/native/header/Node/route/fixture drift'
 sources_after=code_sources();save('code-source-after-first.json',sources_after);assert sources_after==source_before,'full source drift'
 assert digest(main_report)==main_before,'main verification changed'
 save('main-verification-after.json',{'file':str(main_report),'sha256':digest(main_report)})
 save('owned-data-paths-after.json',owned_data_paths())
 summary['postPinsEqual']=True;summary['mainVerificationUnchanged']=True
 assert code==0,('first full verifier exit',code)
 report=json.loads(old_report.read_text());save('actual-verification-first.json',report)
 assert report['typescript_semantic_check']=='PASS'
 assert report['source_sha256']==source_before,'verification source pins differ from actual measured code'
 actual={'python':report['python_public_path']['methods'],
  'fixedNode':sum(report[name]['methods'] for name in ['adapter_additional','native_schema','native_entity','native_store_query','native_edb_joins','native_references','native_query_control','native_cleanup_faults','native_sql_count','native_sql_aggregates']),
  'additionalNode':sum(value['methods'] for value in report['scale_and_readers'].values()),
  'workloadOracle':report['workload_contract_tests']['methods'],'workloadPlans':report['workload_plan_tests']['methods'],'triplexCases':report['triplex']['cases']}
 actual['scopedMethods']=sum(actual[name] for name in ['python','fixedNode','additionalNode','workloadOracle','workloadPlans']);actual['total']=actual['scopedMethods']+actual['triplexCases']
 assert actual==summary['expected'],actual
 assert report['triplex']['result']=='PASS' and report['python_public_path']['result']=='PASS'
 assert report['verification_profile']=={'owner':True,'direct_compatibility':True,'sdk_query_contract_version':2}
 assert report['native_build']==json.loads((C/'build/artifact.json').read_text())
 assert report['owner_companion_build']==json.loads((C/'build/owner_probe/artifact.json').read_text())
 stamp=datetime.datetime.fromisoformat(report['timestamp_utc'].replace('Z','+00:00'))
 assert datetime.datetime.fromisoformat(started)<=stamp<=datetime.datetime.fromisoformat(terminal['endedAtUtc'])
 assert digest(old_report)!=previous.get('sha256'),'no fresh candidate report'
 summary.update(status='passed_full435',actualCounts=actual,sourceHashCount=len(source_before),typescript='PASS',verificationSha256=digest(old_report))
except BaseException as error:
 summary.update(status='failed_first_full_outcome',failure={'type':type(error).__name__,'message':str(error),'trace':traceback.format_exc()})
 if old_report.exists():summary['candidateReportAfter']={'sha256':digest(old_report),'sameAsPrevious':digest(old_report)==previous.get('sha256')}
 save('first-summary.json',summary);emit(phase='full435',status=summary['status'],error=str(error));raise
else:
 save('first-summary.json',summary);emit(phase='full435',status=summary['status'],actual=actual,sourceHashes=len(source_before))
