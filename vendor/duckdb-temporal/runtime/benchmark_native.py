"""Alternating native C++ measurements, checking every full answer in the harness."""
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
from statistics import median
import json
import subprocess

ROOT=Path(__file__).resolve().parent
BASELINE='0964c78230f1eeb17da8d95305df84a679960517'


def main():
    baseline=ROOT/'build/benchmark-baseline.cpp'
    source=subprocess.check_output(['git','show',BASELINE+':projects/temporal-datalog/runtime/native/src/temporal_core.cpp'],cwd=ROOT)
    baseline.write_bytes(source)
    paths={'before':baseline,'after':ROOT/'native/src/temporal_core.cpp'}
    for name,path in paths.items():
        subprocess.run(['c++','-std=c++17','-O3','-DNDEBUG','-fno-fast-math','-frounding-math','-ffp-contract=off',
                        '-Wall','-Wextra','-Werror','-I'+str(ROOT/'native/src'),str(path),
                        str(ROOT/'native/bench_engine.cpp'),'-o',str(ROOT/'build'/('bench-'+name))],check=True)
    results=[]
    for pair in range(4):
        for name in (('before','after') if pair%2==0 else ('after','before')):
            output=subprocess.check_output([ROOT/'build'/('bench-'+name)],text=True)
            rows=[json.loads(line) for line in output.splitlines()]
            if len(rows)!=36:raise RuntimeError('incomplete benchmark')
            results.extend({**row,'pair':pair,'variant':name} for row in rows)
    summaries=[]
    for workload in ('count','grouped_count','sum','join'):
        result={'workload':workload}
        for name in paths:
            rows=[row for row in results if row['workload']==workload and row['variant']==name]
            result[name]={key:median(row[key] for row in rows) for key in ('load_ms','evaluate_ms','total_ms')}
        result['total_speedup']=result['before']['total_ms']/result['after']['total_ms']
        summaries.append(result)
    report={'schema':'native-hillclimb/1','timestamp_utc':datetime.now(timezone.utc).isoformat(),
        'baseline_commit':BASELINE,'warmups_per_process':3,'measured_per_workload_per_process':9,'alternating_pairs':4,
        'scope':'direct C++ construction, ingest, evaluation, owned output; every complete answer checked; excludes DuckDB, persistence and host bindings',
        'source_sha256':{name:sha256(path.read_bytes()).hexdigest() for name,path in paths.items()},
        'harness_sha256':sha256((ROOT/'native/bench_engine.cpp').read_bytes()).hexdigest(),
        'header_sha256':{str(path.relative_to(ROOT)):sha256(path.read_bytes()).hexdigest() for path in sorted((ROOT/'native/src').glob('*.hpp'))},
        'summary':summaries,'samples':results}
    (ROOT/'evidence/native-hillclimb.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(summaries,indent=2))


if __name__=='__main__':main()
