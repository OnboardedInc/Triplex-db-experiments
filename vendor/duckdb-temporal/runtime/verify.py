"""Write bounded project-only validation evidence tied to exact source bytes."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import argparse
import io
import json
import os
import shutil
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parent


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--with-owner',action='store_true',help='Compatibility alias; verification requires the pinned C++ owner companion')
    parser.add_argument('--with-direct',action='store_true',help='Verify the opt-in C++ compatibility mutation companion')
    options=parser.parse_args()
    for name in ('TD_SDK_ADMISSION_SOURCE','TD_SDK_ADMISSION_RECIPE'):
        value=os.environ.get(name)
        if not value or not Path(value).is_file():
            parser.error(f'{name} must explicitly select the approved closed100k fixture/recipe for SDK admission verification')
    if not (ROOT/'build/owner_probe/artifact.json').is_file():
        parser.error('build the required pinned owner companion before verification')
    subprocess.run([ROOT/'node_modules/.bin/tsc','--pretty','false'],cwd=ROOT,check=True)
    for pattern in ('*.mjs','*.sql'):
        for path in (ROOT/'adapter').glob(pattern):shutil.copyfile(path,ROOT/'build/adapter'/path.name)
    tests=unittest.defaultTestLoader.loadTestsFromNames(['test_store','test_recovery','test_timeline','test_scale','test_shared','test_owner_pairing'])
    result=unittest.TextTestRunner(stream=io.StringIO(),verbosity=2).run(tests)
    python={'methods':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),
            'result':'PASS' if result.wasSuccessful() else 'FAIL'}
    if not result.wasSuccessful():
        for case,trace in result.failures+result.errors:print(case.id(),trace,file=sys.stderr)
        raise SystemExit('Python integration verification failed')
    env={**os.environ,'TRIPLESTORE_PYTHON':sys.executable}
    conformance=subprocess.run(['node','build/adapter/conformance.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    adapter=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-adapter.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    schema=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-schema.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    entity=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-entity.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    store_query=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-store-query.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    joins=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-join.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    references=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-reference.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    controls=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-control.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    cleanup=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-cleanup.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    counts=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-count.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    aggregates=subprocess.run(['node','--test','--test-reporter=tap','build/adapter/test-aggregate.js'],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
    additional_suites={}
    suites=[('readers',10),('sdk-admission',5),('sdk-admission-independent',5),
            ('native-writer',4),('native-writer-controls',5),('native-writer-delivery',1),('native-writer-values',3),
            ('native-patch-pruning',2),('capacity',4),('scale-fixture',8),('read-provenance',8),('scalable',7),('owner-startup',2),('fatal',4),
            ('interval-patch',8),('interval-crash',1),('interval-oracle',2),
            ('format-fence',3),('owned-store',11),('owner-probe',5),('owner-activation',8),('owned-query',6),
            ('current-unique',5),('identity-count',4),('native-compat',6),('all-cut-unique',8),
            ('all-cut-store',1),('streaming-source',6),('single-owner-native',6),('single-strategy',2),('native-scale-owner',6),('owner-usage',2),
            ('expanded-carriers',6),('scalable-comparison',7),('native-semantic-closure',5),('native-datetime-reference',5),
            ('json-blob-carriers',4),('native-json-blob',11),
            ('batch-owned',6),('batch-crash',3),('batch-limits',3),('batch-recovery',2),
            ('native-uniqueness',5),('native-presence',10),('computed-head',4),('triplex-dependency',2),('triplex-reservation',2),
            ('native-interval-query',4),('native-edb-union',3),('native-multi-cut',6),('native-temporal-lookup',5),('native-anti-join',3)]
    if options.with_direct:
        suites += [('native-direct',9)]
    for name,expected in suites:
        source_suites=('owner-probe','owner-activation','owned-query','current-unique','identity-count',
                       'read-provenance','all-cut-unique','all-cut-store','streaming-source','single-owner-native','owner-usage')
        extension='mjs' if name=='scale-fixture' or name in source_suites else 'js'
        directory='adapter' if name in source_suites else 'build/adapter'
        completed=subprocess.run(['node','--test','--test-reporter=tap',f'{directory}/test-{name}.{extension}'],
            cwd=ROOT,env=env,check=True,capture_output=True,text=True)
        if f'# pass {expected}\n' not in completed.stdout or '# fail 0\n' not in completed.stdout:
            raise RuntimeError(f'{name} test completion not observed')
        additional_suites[name]={'methods':expected,'result':'PASS'}
    contracts=subprocess.run([sys.executable,ROOT/'workloads/validate_workloads.py'],
        cwd=ROOT,check=True,capture_output=True,text=True)
    contract_tests=subprocess.run([sys.executable,'-m','unittest','discover','-s','workloads',
        '-p','test_event_oracles.py','-v'],cwd=ROOT,check=True,capture_output=True,text=True)
    contract_test_output=contract_tests.stdout+contract_tests.stderr
    if 'Ran 8 tests' not in contract_test_output or not contract_test_output.rstrip().endswith('OK'):
        raise RuntimeError('event oracle test completion not observed')
    workload_plans=subprocess.run(['node','--test','--test-reporter=tap','workloads/test_engine_cases.mjs'],
        cwd=ROOT,check=True,capture_output=True,text=True)
    if '# pass 13\n' not in workload_plans.stdout or '# fail 0\n' not in workload_plans.stdout:
        raise RuntimeError('workload engine-plan test completion not observed')
    if '# pass 11' not in adapter.stdout or '# fail 0' not in adapter.stdout:
        raise RuntimeError('adapter test completion not observed')
    if '# pass 7' not in schema.stdout or '# fail 0' not in schema.stdout:
        raise RuntimeError('native schema test completion not observed')
    if '# pass 10' not in entity.stdout or '# fail 0' not in entity.stdout:
        raise RuntimeError('native entity test completion not observed')
    if '# pass 10' not in store_query.stdout or '# fail 0' not in store_query.stdout:
        raise RuntimeError('native persisted query test completion not observed')
    if '# pass 6' not in joins.stdout or '# fail 0' not in joins.stdout:
        raise RuntimeError('native EAV join test completion not observed')
    if '# pass 5' not in references.stdout or '# fail 0' not in references.stdout:
        raise RuntimeError('native reference test completion not observed')
    if '# pass 7' not in controls.stdout or '# fail 0' not in controls.stdout:
        raise RuntimeError('native query control test completion not observed')
    if '# pass 6' not in cleanup.stdout or '# fail 0' not in cleanup.stdout:
        raise RuntimeError('native cleanup fault test completion not observed')
    if '# pass 4' not in counts.stdout or '# fail 0' not in counts.stdout:
        raise RuntimeError('native count test completion not observed')
    if '# pass 10' not in aggregates.stdout or '# fail 0' not in aggregates.stdout:
        raise RuntimeError('native aggregate test completion not observed')
    report={'timestamp_utc':datetime.now(timezone.utc).isoformat(),
        'verification_profile':{'owner':True,'direct_compatibility':options.with_direct,'sdk_query_contract_version':2},
        'python_public_path':python,'typescript_semantic_check':'PASS','scale_and_readers':additional_suites,
        'workload_contracts':json.loads(contracts.stdout),
        'workload_contract_tests':{'methods':8,'result':'PASS'},
        'workload_plan_tests':{'methods':13,'result':'PASS'},
        'triplex':json.loads(conformance.stdout),
        'native_schema':{'methods':7,'result':'PASS','scope':['native canonical DSL and immutable versions',
            'required/type/cardinality/set validation','exact scalar and Unicode boundary cases',
            'SQL registration rollback and literal quoting','same-binary new entity/reopen/prior-version meaning',
            'SQL/TypeScript parity and persisted descriptor mismatch rejection',
            'callback-local borrowed DSL/descriptor cells, changed-DSL invalidation and late descriptor/type/NULL faults across chunks']},
        'native_entity':{'methods':10,'result':'PASS','scope':['native schema-bound atomic full-record replacement and temporal reads',
            'exact scalar sets and canonical idempotent receipts',
            'same-binary schema evolution, new types, reopen and Python/native Datalog parity',
            'SQL literal quoting and caller-owned transactions','schema, interval and retained admission',
            '4096-value replacement/history and quote-expanded records under fixed 128MiB runtime',
            'schema/type ownership and legacy API rejection',
            'late assertion failure rolls back headers, retractions, usage, clock and temporary tables in run/stream',
            'persisted history descriptor/binding/carrier corruption rejection',
            'two-connection write conflict and receipt reconciliation before retry',
            'observed SIGKILL inside native assertion INSERT after headers/retractions, before commit and after commit; complete receipt/history/clock/usage recovery and healthy next command']},
        'native_store_query':{'methods':10,'result':'PASS','routes':['bounded_native_store','proved_single_atom'],'scope':[
            'C++-compiled persisted Datalog through thin SQL/TypeScript without a host fact list',
            'four exact tags, int64 endpoints, float bits, one coherent temporal cut and empty answers',
            'recursion, stratified negation and complete-tuple aggregates',
            'native work/deadline failure without partial results followed by healthy reuse',
            'startup audit rejects inactive retained carrier and original schema binding corruption',
            'relevant four-tag/512-byte profile rejection and close/reopen SQL parity',
            '45 SQL/native identities across typed constants, repeated variables, projection/set identity and ordering',
            'fresh data/cut-dependent budget proof; fallback without native budget widening',
            'invalidated ownership rejects even an empty cached SQL projection',
            'bounded prepared query reuse across updates, rollback, schema versions and eviction; late-row native schema-fact fault']},
        'native_edb_joins':{'methods':6,'result':'PASS','scope':[
            '22 SQL/native identities across two-to-four-atom joins, reorderings, typed constants, repeated variables and set projection',
            'full indexed-candidate work and native fact/round/work admission, with budget sweep and fallback',
            'saturated unproved Cartesian query gates SQL inputs and fails native work budget without an enormous SQL join',
            'prepared data/cut refresh, empty joins and original schema meaning through type evolution',
            'C++ retained-row cost preference threshold, fresh dispatch after committed writes and unchanged actual resource admission']},
        'native_references':{'methods':5,'result':'PASS','scope':[
            'C++ forward/self reference declarations, immutable descriptors, structural ID/type/cardinality validation',
            'atomic same-schema/type declared target admission, stable identity, set identity and replay',
            'same-binary reopen and reference target-type evolution with original historical meaning; native/SQL graph joins',
            'SQL transaction-local target creation/rollback and runtime catalog introspection',
            'inactive reference history rejects removed, wrong-type, missing first declaration and not-yet-created targets; missing source creators/owners/headers reject instead of silently dropping facts']},
        'native_query_control':{'methods':7,'result':'PASS','scope':[
            'Node-API bridge shares the loaded extension control registry, pins artifact identity, bounds live invocations and retires tokens',
            'controlled native/SQL route parity, fresh data, option validation and listener cleanup',
            'whole-query SQL timeout/cancellation awaits result cleanup, retires token and permits healthy reuse',
            'native cancellation and independent evaluator/whole-query deadlines without partial output',
            'aborting a queued request cannot interrupt the prior invocation',
            'C++ parameterized template reuse with fresh/retired tokens, updated data, rollback, schema evolution and quoted literals',
            'oversized generated SQL falls back to the original pragma without rejecting a valid program']},
        'native_cleanup_faults':{'methods':6,'result':'PASS','scope':[
            'real SDK result, pre/post binding-clear and destruction fault injection preserves independent failures and fences reuse',
            'primary fetch errors remain the cause when result cleanup also throws',
            'cancellation cannot hide cleanup uncertainty; control/listener release still runs',
            'all cached statements, connection and instance close attempts run despite failures, with close-only retry',
            'eviction destruction faults fence and release the newly prepared statement',
            'listener removal/control release failures are independent and retain explicit cleanup']},
        'native_sql_count':{'methods':4,'result':'PASS','scope':[
            'direct/projected complete-source count with exact typed grouping, set identity, constant projection and rule reordering',
            'empty global/grouped results, authoritative literal rejection and historical schema meaning',
            'source/output fact/work accounting, conservative round fallback and healthy reuse',
            'wide unproved projection is gated before construction and falls back to native without widening budgets']},
        'native_sql_aggregates':{'methods':10,'result':'PASS','scope':[
            'complete source set identity and exact global/grouped integer sums and extrema',
            'binary Unicode ordering, finite float endpoints and signed subnormal extrema',
            'empty global/grouped semantics, fresh corrections and original historical schema meaning',
            'authoritative type errors, final integer overflow and canonical tag-before-range priority',
            'native work/fact/round failure boundaries and empty-global internal group work',
            'direct/projected measure domains, conservative mixed-group and wide preconstruction fallback',
            'scalable two-to-four-atom producers with complete tuple identity, historical ledger/inventory answers, typed errors and preconstruction gates']},
        'adapter_additional':{'methods':11,'transport':'native Node binding; no Python worker','result':'PASS','scope':['persistent receipt/history/restart/scope rejection',
            'nested Effect failure poisons whole transaction','Effect interruption awaits acknowledged rollback',
            'shared layer opens once and closes on initialization failure','exact integer/f64 native result conversion',
            'streaming result limit and bounded trace','native SQL interruption and healthy reuse',
            'bounded prepared SELECT reuse with fresh parameters, data and schema',
            'second native append failure rolls back all batches despite caught error',
            'native append carrier roundtrip and payload-size chunking',
            'abrupt native exits before/after commit recover whole command, usage and receipt']},
        'native_build':json.loads((ROOT/'build/artifact.json').read_text()),
        'owner_companion_build':json.loads((ROOT/'build/owner_probe/artifact.json').read_text()),
        'source_sha256':{str(path.relative_to(ROOT)):sha256(path.read_bytes()).hexdigest()
            for path in sorted(ROOT.rglob('*')) if path.is_file() and not path.is_symlink()
            and path.suffix in ('.py','.cpp','.hpp','.h','.ts','.mts','.mjs','.sql','.json')
            and not any(x in ('build','node_modules','__pycache__','evidence') for x in path.relative_to(ROOT).parts)}}
    (ROOT/'evidence').mkdir(exist_ok=True)
    (ROOT/'evidence/verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='source_sha256'}))


if __name__=='__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        if error.stdout:
            print(error.stdout,file=sys.stderr)
        if error.stderr:
            print(error.stderr,file=sys.stderr)
        raise
