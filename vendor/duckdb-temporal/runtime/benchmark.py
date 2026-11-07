"""Equal full public-path timings; complete answers checked on every attempt."""
from pathlib import Path
from datetime import datetime, timezone
from hashlib import sha256
from statistics import median
from time import perf_counter_ns
import json

from temporal_store import Assertion,Store,Value


def measure(store,program,native):
    start=perf_counter_ns()
    result=store.query(program,force_native=native)
    # Results are already owned/eager at the public boundary.
    rows=result.rows
    elapsed=(perf_counter_ns()-start)/1e6
    return elapsed,rows,result.result.plan.route


def main():
    workloads=[
        ('scan512',[Assertion(str(n),str(n),'age',Value('i64',str(n))) for n in range(512)],
         "answer(?e,?v) :- triple(?e,'age',?v)."),
        ('join192',[Assertion('a'+str(n),str(n),'age',Value('i64',str(n))) for n in range(96)]+
         [Assertion('b'+str(n),str(n),'name',Value('str','person-'+str(n))) for n in range(96)],
         "answer(?e,?v,?name) :- triple(?e,'age',?v),triple(?e,'name',?name)."),
        ('aggregate256',[Assertion(str(n),str(n),'age',Value('i64',str(n%5))) for n in range(256)],
         "source(?e,?v) :- triple(?e,'age',?v). answer(?v,count()) :- source(?e,?v)."),
        ('count20000',[Assertion(str(n),str(n),'age',Value('i64',str(n%10))) for n in range(20000)],
         "source(?e,?v) :- triple(?e,'age',?v). answer(count()) :- source(?e,?v)."),
    ]
    report={'schema':'public-full-path-benchmark/1','warmup_pairs':3,'measured_pairs':9,
            'timestamp_utc':datetime.now(timezone.utc).isoformat(),
            'native_build':json.loads(Path('build/artifact.json').read_text()),
            'source_sha256':{str(path):sha256(path.read_bytes()).hexdigest()
                for pattern in ('temporal_store/**/*.py','native/src/*','benchmark.py')
                for path in sorted(Path('.').glob(pattern)) if path.is_file()},
            'scope':'one serialized connection; transaction, history validation, planning, engine and complete owned output charged',
            'limitations':['retained storage profile one million rows; largest measured workload 20000 rows',
                'native active-set and query budgets remain bounded','shared runtime; no universal performance claim','no physical native-allocation attribution'],
            'workloads':[]}
    for name,assertions,program in workloads:
        with Store() as store:
            for offset in range(0,len(assertions),128):store.transact('seed'+str(offset),assertions[offset:offset+128])
            times={'selected':[],'native':[]}
            route=None
            for repeat in range(12):
                pair={}
                for native in ((False,True) if repeat%2==0 else (True,False)):
                    elapsed,rows,selected=measure(store,program,native)
                    pair[native]=rows
                    if not native:route=selected
                    if repeat>=3:times['native' if native else 'selected'].append(elapsed)
                if pair[False]!=pair[True]:raise AssertionError('complete answers differ')
            report['workloads'].append({'name':name,'input_assertions':len(assertions),'output_rows':len(rows),
                'route':route,'selected_ms':times['selected'],'native_ms':times['native'],
                'selected_median_ms':median(times['selected']),'native_median_ms':median(times['native'])})
    # Charge maintenance as well as reads. Two stores receive the exact same
    # command stream; one maintains the restricted projection, the other uses
    # a fresh planned query. This is a separate workload, not a scan median.
    times={key:[] for key in ('maintained_write','plain_write','maintained_read','fresh_read')}
    with Store() as maintained,Store() as plain:
        view=maintained.materialize('age')
        for n in range(24):
            assertions=[Assertion(str(n),'u','age',Value('i64',str(n%3)))]
            retract=[] if n==0 else [str(n-1)]
            for store,key in ((maintained,'maintained_write'),(plain,'plain_write')):
                start=perf_counter_ns();store.transact(str(n),assertions,retract)
                elapsed=(perf_counter_ns()-start)/1e6
                if n>=3:times[key].append(elapsed)
            start=perf_counter_ns();cached=view.read();elapsed=(perf_counter_ns()-start)/1e6
            if n>=3:times['maintained_read'].append(elapsed)
            start=perf_counter_ns();fresh=plain.query("answer(?e,?v) :- triple(?e,'age',?v).")
            elapsed=(perf_counter_ns()-start)/1e6
            if n>=3:times['fresh_read'].append(elapsed)
            if cached.rows!=fresh.rows or cached.position!=fresh.position:raise AssertionError('maintained answer differs')
    report['incremental_projection']={'scope':'one fixed valid-cut EAV projection; full command+read cost',
        'warmup_commands':3,'measured_commands':21,'times_ms':times,
        'medians_ms':{key:median(values) for key,values in times.items()}}
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
