#!/usr/bin/env python3
"""Read retained observations; generate diagnostic tables without acceptance verdicts."""
import csv
import hashlib
import json
import math
import pathlib
import re
import statistics

OUT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1')
SRC = pathlib.Path(__file__).resolve().parent
records = {}
for path in sorted(OUT.glob('*.log')):
    for line in path.read_text(errors='replace').splitlines():
        if line.startswith('{'):
            try:
                item = json.loads(line)
                if 'label' in item:
                    records.setdefault(item['label'], {}).update(item)
                if 'equivalent_subjects' in item:
                    records['equivalence'] = item
            except ValueError:
                pass

def stats(xs):
    xs = sorted(xs)
    return dict(n=len(xs), mean=statistics.mean(xs), **{
        k: xs[min(len(xs)-1, max(0, math.ceil(len(xs)*p)-1))]
        for k, p in [('p50',.5),('p90',.9),('p99',.99),('max',1)]})

def f(x):
    return f'{x:,.3f}' if isinstance(x,(float,int)) else str(x)

def latency(s):
    return ' / '.join(f(s[k]) for k in ['p50','p90','p99','max']) + f" (n={s['n']:,})"

def table(headers, rows):
    return '\n'.join(['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---']*len(headers)) + ' |'] +
                     ['| ' + ' | '.join(map(str,row)) + ' |' for row in rows])

joined=[]
afile=OUT/'q5-feed-ack.csv'; sfile=OUT/'q5-feed-seen.csv'
if afile.exists() and sfile.exists():
    a={r['marker']:int(r['ack_epoch_ns']) for r in csv.DictReader(afile.open())}
    seen={r['marker']:(int(r['seen_epoch_ns']),int(r['t'])) for r in csv.DictReader(sfile.open())}
    joined=[(m, ack, *seen[m], (seen[m][0]-ack)/1e6) for m,ack in a.items() if m in seen]
    if joined:
        with (OUT/'q5-joined.csv').open('w') as stream:
            w=csv.writer(stream);w.writerow(['marker','ack_epoch_ns','seen_epoch_ns','t','lag_ms']);w.writerows(joined)
        records['q5-lag']={'latency_ms':stats([r[-1] for r in joined]),'acks':len(a),'seen':len(seen),
                           'unmatched_ack':len(set(a)-set(seen)), 'unmatched_seen':len(set(seen)-set(a)),
                           'negative':sum(r[-1]<0 for r in joined)}

(OUT/'summary.json').write_text(json.dumps(records,indent=2)+'\n')
parts=[]
parts.append('''# DX-S1: standalone Datomic / PostgreSQL engine floors

Diagnostic spike under PROTOCOL 0b. These are engine/harness measurements, not Triplex acceptance. No Triplex package was imported, called or modified. No downloads were performed. The scope is the 10k-subject fixture, not year-one scale.

## Summary
''')
summary=[]
for q,keys,pred,bar in [
 ('Q1',['q1-mix-40'],'40 datoms p50 3–6 ms, p99 <25 ms; 260 datoms p50 5–12 ms','P2 p50 ≤10 ms / p99 ≤50 ms with 256 readers'),
 ('Q2',['q2-b','q2-c'],'id cache 0.3–0.7 ms CPU; entity cache <0.15 ms CPU','P4 ≥1,100 pulls/core/s; p50 ≤5 / p99 ≤25 ms'),
 ('Q3',['q3-current-1','q3-current-10'],'current reads use indexes; no numeric history prediction','P4 depth-10 p99 and bytes ≤1.1× depth 1'),
 ('Q4',['q4-samedb-alone','q4-samedb-separate','q4-samedb-shared'],'separate-reader writer p99 ≤1.25× baseline','P1 writer p99 ≤1.25× at 256 readers'),
 ('Q5',['q5-lag'],'visibility p50 <5 ms / p99 <30 ms after ACK','P3 affected-subject durable feed lag p99 ≤250 ms'),
 ('Q6',['q6-tx','q6-pg'],'no section-5 durability prediction','P2 no lost acknowledged commits')]:
    headline=[]
    for key in keys:
        r=records.get(key)
        if not r: headline.append(key+': not measured');continue
        if key in ('q2-b','q2-c'): headline.append(f"{key}: {f(r['pulls_per_thread_cpu_s'])} pulls/thread-CPU-s")
        elif 'missing' in r: headline.append(f"{key}: {r['missing']} missing / {r['acknowledged']} ACKs")
        else: headline.append(key+': '+latency(r['latency_ms'])+' ms')
    summary.append([q,'; '.join(headline),pred,bar])
parts.append(table(['Question','Headline','R51 §5 prediction','TARGETS bar it bears on'],summary))
parts.append('''
## Common conditions and reproduction

Local images: `tx2-datomic:1.0.7745-da00` (Pro 1.0.7745, JRE 21) and `postgres:17-alpine`; immutable image IDs and configuration are retained in `images.json`. Every Docker command used `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. All created container/network/volume names begin `tx2-dxs1-`. No host ports were published.

Postgres: CPU 0, memory cap 1 GiB, named volume `tx2-dxs1-pg-data`; transactor: CPU 1, cap 2 GiB, heap `-Xms1g -Xmx1g`; peers: cap 2 GiB, heap `-Xms1g -Xmx1g`, CPU 2 except where stated. Network `tx2-dxs1-net`. PostgreSQL defaults confirmed: `fsync=on`, `synchronous_commit=on`, `full_page_writes=on`, `wal_sync_method=fdatasync` (`setup.log`). The distribution's DDL required removal of obsolete `OIDS=FALSE` for PG17 and replacing unavailable Alpine `en_US.UTF-8` with UTF8/C; the table's four columns and primary key are unchanged. The role is the local throwaway `datomic` role, not a production permission test.

From this worktree:

```sh
bash lab/experiments/EXP-DX1/spike-s1/setup.sh
node lab/bin/heavy.mjs --label DX-S1-init -- bash lab/experiments/EXP-DX1/spike-s1/peer.sh init 2 init dxs1-write
node lab/bin/heavy.mjs --label DX-S1-seed -- bash lab/experiments/EXP-DX1/spike-s1/peer.sh seed 3 seed dxs1-world
node lab/bin/heavy.mjs --label DX-S1-Q1 -- bash lab/experiments/EXP-DX1/spike-s1/measure.sh q1-closed bash lab/experiments/EXP-DX1/spike-s1/peer.sh q1closed 2 q1-closed dxs1-write
bash lab/experiments/EXP-DX1/spike-s1/run-remaining.sh
# Actual recovery from the documented wrapper error continued with:
bash lab/experiments/EXP-DX1/spike-s1/resume-lock-first.sh
# Additional longer-warmup comparison and same-db isolation:
bash lab/experiments/EXP-DX1/spike-s1/measure.sh q1-pair node lab/bin/heavy.mjs --label DX-S1-pair -- bash lab/experiments/EXP-DX1/spike-s1/pair.sh
bash lab/experiments/EXP-DX1/spike-s1/q4-same-db.sh
```

`peer.sh NAME CPU COMMAND DB ARGS...` expands to:

```sh
docker run --rm --name tx2-dxs1-$NAME --network tx2-dxs1-net --cpuset-cpus "$CPU" -m 2g \\
  -v "$SRC:/spike:ro" -v "$OUT:/evidence" -e DATOMIC_EXT_CLASSPATH=/spike \\
  -e DATOMIC_JAVA_OPTS='-Xms1g -Xmx1g' -w /opt/datomic \\
  --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m spike.main "$@"
```

`SRC` is this script directory; `OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1`. Each `measure` call in the initial driver invoked `node lab/bin/heavy.mjs --label DX-S1-$label -- bash "$SRC/measure.sh" "$label" COMMAND...`; that script acquires the shared `locks/measure` directory, traps release and records `docker stats --no-stream` before/after. Later windows have an 870-second command guard. After a long shared-lock wait, `resume-lock-first.sh` reversed admission to `bash measure.sh LABEL node lab/bin/heavy.mjs --label DX-S1-LABEL -- COMMAND...`, so this spike does not hold a heavy token while waiting for the timing lock. The pair and same-db isolation use that order too. The final `run-remaining.sh` uses lock-first admission and same-database Q4 as the default; the earlier cross-database controls are retained diagnostics. The initial Q1 window used the same lock without the guard. Setup and seeding ran outside the lock, before our timed windows.

Percentiles are nearest rank. All latency tables list p50 / p90 / p99 / max in milliseconds, with sample count. Single-thread CPU uses `ThreadMXBean.getCurrentThreadCpuTime`; whole-container CPU is the cgroup `usage_usec` delta. Container CPU includes helper threads, GC and CSV output; per-operation thread CPU covers transaction construction or pull traversal plus buffer construction. CPU-normalized throughput is a diagnostic distinct from the TARGETS quota-based per-core metric.
''')
parts.append('\n## Q1. Commit floor\n')
rows=[]
for key,r in records.items():
    if key.startswith('q1-') and 'latency_ms' in r:
        rows.append([key,latency(r['latency_ms']),f(r.get('container_cpu_s','—')),str(r.get('observed_tx_datoms',{}).get('mean','—'))])
parts.append(table(['Run','Latency ms','Peer container CPU s','Mean tx-report datoms'],rows))
parts.append('''
Closed-loop: 200 warmup then 1,000 samples per size (12, 40, 100, 260, 600), then row-only 40 and tx-function 40. About each ten submitted datoms: one 26-character unique ID, six scalar longs/40-byte strings, two refs to the existing anchor, one 300-byte row string, with fresh entities for cardinality-one scalars. Report datoms include Datomic's txInstant. Each timed operation includes constructing the transaction and `@(d/transact conn tx)`.

The row-only run adds 40 fresh 300-byte strings on an existing entity. The transaction function reads anchor `:f/n`, checks equality to 0 and returns the same mixed 40-datom payload. This compares complete client-visible execution, not transaction-function CPU alone. `pair.sh` starts a fresh JVM, performs 3,000 extra mixed 40-datom warmups, then measures plain/function/plain (200 further warmups and 1,000 samples each); those bracketed rows are the stronger function comparison. The earlier size sweep ran in ascending size order and is confounded by JVM warmup, accumulating data/indexing and changing shared-VM conditions. Unlike the mixed run, row-only has no entity allocations or uniqueness checks, so its difference cannot be attributed to uniqueness alone.

Open-loop exact invocations (each inside its own heavy + measurement wrapper):

```sh
peer.sh q1-open-40-15 2 open dxs1-write q1-open-40-15 40 15 60
peer.sh q1-open-40-55 2 open dxs1-write q1-open-40-55 40 55 60
peer.sh q1-open-260-15 2 open dxs1-write q1-open-260-15 260 15 60
peer.sh q1-open-260-55 2 open dxs1-write q1-open-260-55 260 55 60
```

The original 40/15 attempt completed its timing but its closing stats command failed after an in-place wrapper edit; its output is retained. An R2 queue-only duplicate was stopped; R3 repeats `peer.sh q1-open-40-15-r3 2 open dxs1-write q1-open-40-15-r3 40 15 60` with the complete wrapper. Both original and R3 numbers remain in the table. No timed output was discarded. Each has 200 sequential warmup commits, seed 5151 exponential arrivals, a 256-slot in-flight semaphore and 16 completion waiters. Scheduling continues independently of individual futures. Scheduled-arrival-to-ACK includes scheduler lateness and queueing. Every completed/error offer is retained in CSV; the summaries include errors and scheduler lateness.

Postgres short sample: `measure q1-pg-sample bash "$SRC/pg-sample.sh"`; it enables `log_min_duration_statement=0` only around a fresh peer's 200 warmups + 50 timed 40-datom commits, then restores the setting. This instrumented run is separate from the uninstrumented floors. `q1-pg-statements.log` retains every logged statement, not a claim that their summed duration decomposes peer latency. Transactor logs and extracted metrics are retained separately.
''')
metrics_path=OUT/'engine-metrics-summary.json'
if metrics_path.exists():
    metrics=json.loads(metrics_path.read_text())
    for title,key in [('Transactor 40-datom process timings during SQL sample (includes warmup)','transactor_pg_sample'),('Postgres logged statement duration sample','postgres_logged_statement_ms')]:
        rr=[]
        for name,value in metrics.get(key,{}).items():
            if isinstance(value,dict) and value.get('n',0):
                rr.append([name,latency(value),f(value['mean'])])
        parts.append('\n'+title+'\n\n'+table(['Exposed timing','p50 / p90 / p99 / max ms (n)','Mean ms'],rr))
    parts.append("\nThe engine also exposed all five requested interval families: TransactionMsec, TransactionDatoms, MemoryIndexMB, StoragePutMsec and LogWriteMsec. Their original lo/hi/sum/count intervals are in `transactor-metric-intervals.csv`; raw process-monitor lines are in the transactor logs. Those intervals cross individual subrun boundaries and contain no p50/p90/p99, so no quantiles were invented from them. Statement durations, transaction apply/process durations and log-write metrics overlap; they cannot be added to reconstruct end-to-end latency.")
parts.append('\n## Q2. Subject pull floor\n')
rows=[]
for key in ['q2-a','q2-b','q2-c']:
    if key in records:
        r=records[key]
        rows.append([key,latency(r['latency_ms']),latency(r['cpu_us']),f(r['cpu_us']['mean']),f(r['pulls_per_thread_cpu_s']),f(r['rows']['mean']),f(r['entities']['mean']),f(r['bytes']['mean']),f(r['container_cpu_s'])])
parts.append(table(['Variant','Wall ms','Thread CPU µs (same percentile order)','Mean CPU µs','Pulls/thread-CPU-s','Rows mean','Entities mean','Bytes mean','Container CPU s'],rows))
rows=[]
for key in ['q2-parallel-b','q2-parallel-c']:
    if key in records:
        r=records[key];rows.append([key,r['pulls'],f(r['wall_s']),f(r['container_cpu_s']),f(r['pulls_per_s']),f(r['pulls_per_container_cpu_s'])])
parts.append('\n'+table(['4 threads, CPUs 2,3','Pulls','Wall s','Container CPU s','Pulls/wall-s','Pulls/container-CPU-s'],rows))
if 'q2-cold' in records:
    r=records['q2-cold'];parts.append(f"\nCold JVM first full pass: {f(r['wall_s'])} s wall, {f(r['thread_cpu_s'])} s thread CPU, {f(r['container_cpu_s'])} s container CPU; per-pull {latency(r['latency_ms'])} ms.")
parts.append('''
Commands: `peer.sh cold 2 cold dxs1-world`; `peer.sh verify 2 verify dxs1-world`; `peer.sh q2a 2 read dxs1-world a q2-a` (similarly b/c); `peer.sh q2pb 2,3 parallel dxs1-world b q2-parallel-b 4 60` (similarly c). All were wrapped separately as shown in `run-remaining.sh`.

World: requirement counts `[2,5,8,11,14,17,20,23,25,27,33,52,71,90,109,128,147,153,270,387]`, deliberately spread across the specified account ranges rather than reproducing world.ts's hash values. Account assignment `floor(i/20) mod 20` yields exactly 500 subjects/account and independent 40/35/25 own-row shares. Each subject has 12 reachable own entities and 28/40/50 own rows. Shared account/release/policy contribute 12 rows; each requirement contributes four own rows plus its incoming release reference (five total), following world.ts's counting. This is a standalone shaped fixture, not the exact frozen W0 generator: fixed 12 own entities and document graph instead of world.ts's 9/13/17 entities and mixed 3/4/6-hop graphs. It is not a year-one or full TARGETS benchmark.

Rows use the requested fixed-width header, valid-from 1700000000000, no valid-to, reference target text and exactly 250 ASCII JSON bytes. The instant is 1700000000001. Every row is active; range parsing/checking is exercised, but mixed expired/future rows are not. Output is comma-separated JSON in one owned byte buffer, plus its final right-sized copy. Warmup is one complete 10k-subject pass before every timed warm run; each single-thread variant then samples 20k subjects uniformly with seed 4242. The cold run is a fresh JVM before any cache construction/full-pass warmup: connection/schema setup precedes the timer; it is cold peer segments, not cold PostgreSQL/OS caches.

(a) lookup `d/entid` for each entity, then `d/datoms :eavt`; (b) prebuilt concurrent ID-to-eid map, then datoms; (c) prebuilt concurrent entity map holding joined JSON bytes, offsets/lengths, validity arrays and ref arrays. Variant (c) uses `System.arraycopy` without reparsing row text. Cache construction is outside timing; no writes occur during these runs. The 4-thread runs warm sequentially, then run 60 seconds on two allowed CPUs; summaries count whole-peer CPU. All variants use the same output allocation and seen-set traversal.
''')
parts.append('Equivalence observation: `'+json.dumps(records.get('equivalence',{}))+'`. Full output bytes, row/entity counts and expected byte lengths were compared for every subject at one current basis; this is not an independent Triplex domain oracle.')
parts.append('\n## Q3. History\n')
rows=[]
for key,r in records.items():
    if key.startswith('q3-') and 'latency_ms' in r:
        rows.append([key,latency(r['latency_ms']),f(r['cpu_us']['mean']),f(r['bytes']['mean']),f(r['rows']['mean'])])
parts.append(table(['Run','Wall ms','Mean CPU µs','Mean bytes','Mean rows'],rows))
if 'q3-current-10' in records and 'q3-current-1' in records:
    a,b=records['q3-current-1'],records['q3-current-10']
    parts.append(f"\nDepth 10 / depth 1: p99 wall {f(b['latency_ms']['p99']/a['latency_ms']['p99'])}×; mean thread CPU {f(b['cpu_us']['mean']/a['cpu_us']['mean'])}×; mean output bytes {f(b['bytes']['mean']/a['bytes']['mean'])}×. Output bytes are not physical index bytes read. The large wall-p99 improvement alongside nearly flat mean CPU is consistent with warmup/noise; it is not evidence that retaining history accelerates reads.")
for round_name in ['1','3','10','indexed']:
    current=records.get('q3-current-'+round_name); historical=records.get('q3-asof-'+round_name)
    if current and historical:
        parts.append(f"\nAs-of/current at {round_name}: mean thread CPU {f(historical['cpu_us']['mean']/current['cpu_us']['mean'])}×, p99 wall {f(historical['latency_ms']['p99']/current['latency_ms']['p99'])}×.")
parts.append('''
Command: `peer.sh history 2 history dxs1-world` inside one measurement window. Capture t0 before corrections; 10 rounds retract/re-add one row on placement and one on i9 for the same first 1,000 subjects (4 submitted datoms/subject/round), preserving ref targets. Rounds 1/3/10: warm all 1,000 subjects then 10k uniformly sampled pulls against current and as-of-t0, ID cache only. Cache contains IDs only, so it is reusable at t0. Request indexing and wait via `d/sync-index conn target`, then repeat current/as-of. Index wait and target are in the driver log. Same sample seed is used at each depth. This tests ten corrections of two rows, not broad retained-history scale, and does not measure storage bytes read.
''')
parts.append('\n## Q4. Reader/writer isolation\n')
rows=[]
for key in ['q4-alone','q4-separate','q4-shared','q4-samedb-alone','q4-samedb-separate','q4-samedb-shared']:
    if key not in records:continue
    r=records[key]
    path=OUT/(key+'-reader.log')
    rr={}
    if path.exists():
        for line in path.read_text().splitlines():
            if line.startswith('{'):rr=json.loads(line)
    cp=OUT/(key+'-transactor-cpu.txt'); vals=re.findall(r'usage_usec (\d+)',cp.read_text()) if cp.exists() else []
    txcp=(int(vals[-1])-int(vals[0]))/1e6 if len(vals)>1 else '—'
    rows.append([key,latency(r['latency_ms']),f(rr.get('reader_pulls_per_s','—')),f(rr.get('reader_container_cpu_s','—')),f(txcp)])
parts.append(table(['Condition','Writer ms','Reader pulls/wall-s','Reader CPU s','Transactor CPU s'],rows))
for prefix in ['q4-','q4-samedb-']:
    for condition in ['separate','shared']:
        if prefix+condition in records and prefix+'alone' in records:
            parts.append(f"\n{prefix}{condition} / corresponding alone writer p99: {f(records[prefix+condition]['latency_ms']['p99']/records[prefix+'alone']['latency_ms']['p99'])}×.")
parts.append('''
Primary same-database commands: `q4-same-db.sh`, which separately measures `isolation-same-db.sh q4-samedb-alone none`, `isolation-same-db.sh q4-samedb-separate 3`, and `isolation-same-db.sh q4-samedb-shared 2`. W and R both connect to `dxs1-world`; R ingests W's transactions but continues pulling its captured immutable db. Earlier cross-database controls use W=`dxs1-write`, R=`dxs1-world`; commands: `isolation.sh q4-alone none`, `isolation.sh q4-separate 3`, `isolation.sh q4-shared 2`, each separately measured. Writer is CPU 2; reader CPU is 3 or 2. Reader warms the full fixture and builds the ID cache before announcing readiness. Writer warms 200 commits then signals the reader and schedules a 60-second Poisson 55/s window, 40 datoms. Reader runs 8 threads against one pinned immutable db until the writer drains; its interval starts up to 100 ms before the scheduled writer interval. Reader file polling and eight-thread scheduling overhead are included. The transactor cgroup delta is sampled around the writer's go/done files (host polling up to 100 ms); it excludes most startup/warmup. The very large same-database baseline tail and lower tail with the separate reader make its ratio a poor causal isolation estimate; this single sequence does not establish the R51 isolation prediction. JVM/storage/maintenance causes were not isolated. This is eight reader threads, not P1's 256 readers, and writes add new unrelated entities rather than modifying the pulled subjects; this is process/CPU interference diagnostic only.
''')
parts.append('\n## Q5. Cross-peer visibility\n')
if 'q5-lag' in records:
    r=records['q5-lag']; parts.append(f"\nSeen-minus-ACK: {latency(r['latency_ms'])} ms; negative samples {r['negative']}; ACKs {r['acks']}, seen markers {r['seen']}, unmatched ACK/seen {r['unmatched_ack']}/{r['unmatched_seen']}.")
if 'q5-feed' in records:
    r=records['q5-feed'];parts.append(f"\nReader basis before/after without sync: {r['basis_before']} → {r['basis_after_without_sync']}. Already-seen `(deref (d/sync conn t) 1000 :timeout)`: {latency(r['sync_already_seen_ms'])} ms.")
parts.append('''
Command: `feed.sh` inside `measure q5`. Reader CPU 3 registers `d/tx-report-queue` and announces ready; writer CPU 2 warms 200 unrelated 40-datom commits, then commits 2,000 unique single-marker transactions on a fixed 20/s schedule. ACK/seen timestamps use `java.time.Instant/now` epoch seconds plus nanoseconds on the same VM clock; no timestamp precision is discarded during the Python join. Reader stamps each dequeued report before extracting its markers. Both files flush every line. The reader never calls sync before the feed has received all 2,000 markers and the advancing `(d/db conn)` basis has been captured. Only then it warms 200 already-seen-t syncs and measures 2,000. Raw marker files and `q5-joined.csv` retain the join. This measures peer notification, not a durable affected-subject feed checkpoint, resume semantics or the full P3 lag definition. Clock adjustment was not independently monitored.
''')
parts.append('\n## Q6. Durability sanity\n')
rows=[]
for key in ['q6-tx','q6-pg']:
    if key in records:
        r=records[key];rows.append([key,r['acknowledged'],r['missing'],r['basis']])
parts.append(table(['Abruptly stopped component','ACKs checked','Missing','Readback basis'],rows))
parts.append('''
Command: `durability.sh` inside `measure q6`. One closed-loop writer asserts unique markers and flushes its ACK line after each completed future. After at least 500 ACK lines, issue `docker kill -s KILL tx2-dxs1-tx` (first round), then later `docker kill -s KILL tx2-dxs1-pg` (second). Stop the writer container to freeze the final ACK set, restart only the killed component, wait ten seconds (plus pg_isready for PostgreSQL), reconnect from a fresh peer and resolve every ACK marker by its unique lookup ref. The count checked is the actual retained file's count, including ACKs racing with the stop. First-error writer logs are retained. This is one process-stop round/component on a live VM, not VM/host power-loss, multi-round reliability evidence, exact fsync-path verification or a formal durability acceptance.
''')
parts.append('\n## Concurrent VM conditions\n\nBefore/after snapshots for each window follow. These are observations of other running work, not a claim of an otherwise idle VM. Other resources were left alone.\n')
for path in sorted(OUT.glob('*-window.txt')):
    parts.append('\n### '+path.stem+'\n\n```text\n'+path.read_text().strip()+'\n```\n')
parts.append('''
## Limits, checks and cleanup

No Triplex public path, TypeScript/HTTP overhead, idempotency, lost-ACK resolution, tenant isolation, erasure, 256-reader trace, W0 correctness, 100k sweep or year-one storage scale was measured. No target bar is closed by this spike. Q5 did not instrument peer CPU; Q6 reports marker counts rather than latency/CPU distributions. Read-cache construction/invalidation and evolving-basis correctness are outside these static cache measurements. Cold storage caches were not cleared. Output-byte flatness is not storage-read-byte flatness. The fixture differs from the exact lab graph as detailed in Q2. Percentiles are single windows, without repeated trials or confidence intervals. Shared VM work and shared storage can affect them.

Setup compilation failures are retained as `init.log`, `init-2.log`, `seed.log`, `seed-2.log`; none yielded a reported timing. Later successful attempts use distinct logs. Editing the running shell wrappers caused a closing parse error and the first remaining driver to stop after its four open-loop windows (`remaining.log`). The original completed measurements are retained; `resume-lock-first.sh` runs the missing windows and the labelled R3 repeat. A duplicate queued driver was stopped before it ran any peer. Final scripts are syntax-checked; no running script was subsequently edited. Only standalone files under this spike directory were changed; no acceptance contract or pinned existing source was edited. There are no PASS-producing acceptance paths or new receipts in this spike: reports are explicitly diagnostic, and the variant equality assertion checks content at a single captured basis from this seeded attempt. It is not independent verification.

All `tx2-dxs1-*` containers, network and volume are removed with `cleanup.sh` after copying engine logs/configs to evidence. Final Docker inventories are retained to verify absence. Existing containers were neither stopped nor removed by this work. Bulky raw evidence remains outside Git; `SHA256SUMS` and `EVIDENCE.md` index the durable directory.
''')
parts.append("""
## What was not done or could not be verified

- No Triplex package or public TypeScript/HTTP path was exercised; these measurements cannot close P1–P5 acceptance.
- No 256/1,024-reader matched hot-set trace, 100k-subject activation, year-one scale, W0 oracle or end-to-end projection work was measured.
- No cache invalidation/evolving-basis equivalence, mixed inactive valid-time rows, physical storage-read byte flatness, or exact frozen world.ts graph was checked.
- No repeated-trial confidence intervals or guaranteed quiet VM were available; other-container snapshots are reported for every window.
- Q5 measured peer notification, not durable affected-subject checkpoints/resume; it did not instrument CPU or independently track wall-clock adjustments.
- Q6 was one stop/recovery round per component, without VM/host power-loss or storage-controller fsync verification; it does not measure multi-round reliability.
- No tenant isolation, erasure, lost-ACK/idempotency contract, package check or independent acceptance review was run. No acceptance files were changed and no PASS was claimed.
""")
(SRC/'REPORT.md').write_text('\n'.join(parts).rstrip()+'\n')
print(table(['Question','Headline','R51 prediction','TARGETS bar'],summary))
