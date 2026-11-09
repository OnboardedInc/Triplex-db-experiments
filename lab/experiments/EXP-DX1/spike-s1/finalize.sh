#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
# [DX-S1] Why: capture logs before removing only the spike's resources. Rejected: leaving databases running after the spike or deleting uncopied observations.
docker inspect tx2-dxs1-pg tx2-dxs1-tx > "$OUT/final-engine-inspect.json"
docker exec tx2-dxs1-pg psql -U postgres -c 'SHOW fsync' -c 'SHOW synchronous_commit' -c 'SHOW full_page_writes' -c 'SHOW wal_sync_method' > "$OUT/final-pg-settings.txt"
docker cp tx2-dxs1-tx:/opt/datomic/log "$OUT/transactor-log"
docker logs tx2-dxs1-tx > "$OUT/transactor-stdout.log" 2>&1
docker logs tx2-dxs1-pg > "$OUT/postgres-final.log" 2>&1
bash "$SRC/cleanup.sh" > "$OUT/cleanup.log" 2>&1
python3 "$SRC/metrics.py" > "$OUT/engine-metrics-analysis.txt"
python3 "$SRC/analyze.py" > "$OUT/analysis-final.txt"
python3 "$SRC/audit.py"
python3 - "$SRC" "$OUT" <<'PY'
import datetime
import hashlib
import pathlib
import shutil
import sys
src,out=map(pathlib.Path,sys.argv[1:])
for p in src.rglob('*'):
    if p.is_file() and p.suffix in {'.sh','.clj','.py'}:
        dest=out/'source-snapshot'/p.relative_to(src)
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(p,dest)
rows=[]
for path in sorted(out.rglob('*')):
    if not path.is_file():continue
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    rows.append(f'{h.hexdigest()}  {path.relative_to(out)}')
(src/'SHA256SUMS').write_text('\n'.join(rows)+'\n')
(src/'EVIDENCE.md').write_text(f'''# DX-S1 retained observations

Durable root: `{out}`. Generated {datetime.datetime.now(datetime.timezone.utc).isoformat()}.

`SHA256SUMS` contains SHA-256 for every retained file, with paths relative to that root. Verify with `cd {out}` then `shasum -a 256 -c <absolute-path-to-this-spike>/SHA256SUMS`.

- `q1-*.csv` and peer/driver logs: closed/open loops, original wrapper failure, R3 repeat, longer-warmup plain/function/plain bracket, instrumented SQL sample.
- `q2-*.csv`: cold and 20k-sample single-thread pulls; driver logs contain four-thread CPU/throughput figures and 10k-subject full-byte equivalence.
- `q3-*.csv`: matched history sample, current/as-of at depths 1/3/10 and after indexing.
- `q4-*-writer.log`, `q4-*-reader.log`, `q4-*-transactor-cpu.txt`: original cross-database controls and primary `q4-samedb-*` repeats.
- `q5-feed-ack.csv`, `q5-feed-seen.csv`, `q5-joined.csv`, `q5-feed-sync.csv`: exact epoch-nanosecond visibility join and already-seen sync.
- `q6-*-ack.csv`, stop/check/writer logs: acknowledged marker sets, process stops, reconnect/readback (one round/component).
- `*-window.txt`: before/after Docker stats and UTC window boundaries (original 40/15 closing snapshot missing as documented).
- `transactor-log/`, `transactor-metric-intervals.csv`, `q1-pg-statements.log`, `engine-metrics-summary.json`: raw engine observations and exposed timing summaries.
- `images.json`, `final-engine-inspect.json`, setup/settings logs: local images, cpusets, memory, SQL storage configuration.
- `number-crosscheck.txt`: recomputation of latency quantiles from raw CSVs plus complete unique visibility marker/accounting checks; no acceptance verdict.
- `cleanup.log`, final container/network/volume inventories: all tx2-dxs1 resources removed; existing resources left alone.
- `source-snapshot/`: standalone source/scripts used for the final measurements, retained without dependencies or caches.

Evidence stays outside Git, including files over 1 MB and raw engine logs. These are diagnostic observations, not acceptance receipts. See REPORT.md for conditions and gaps.
''')
print(f'Indexed {len(rows)} evidence files, {sum(p.stat().st_size for p in out.rglob("*") if p.is_file())} bytes')
PY
