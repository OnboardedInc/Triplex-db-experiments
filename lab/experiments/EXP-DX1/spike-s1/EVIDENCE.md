# DX-S1 retained observations

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1`. Generated 2026-11-09T21:07:07.664198+00:00.

`SHA256SUMS` contains SHA-256 for every retained file, with paths relative to that root. Verify with `cd /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1` then `shasum -a 256 -c <absolute-path-to-this-spike>/SHA256SUMS`.

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
