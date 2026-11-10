# DX-S3 configuration spike

North star: P2 burst commit latency, with a diagnostic 32-reader arm. This is a spike under PROTOCOL 0b, not an acceptance run.
Package sources and acceptance contracts are unchanged.

Run from this worktree, with the already-local images and the offline-installed workspace dependencies:

```sh
node lab/bin/heavy.mjs --label DX-S3-matrix -- python3 lab/experiments/EXP-DX1/s3/run.py v0 v1 v2 v3
node lab/bin/heavy.mjs --label DX-S3-analysis -- python3 lab/experiments/EXP-DX1/s3/analyze.py
```

`run.py` creates a fresh `tx2-dxs3-<variant>-<epoch>` stack for each variant, uses only CPUs 0–4 and ports 8503/8504, captures
process arguments, GC startup settings, effective Postgres settings, native logs, GC files and final inventories, then removes its
containers, network and volume. It never pulls images. Evidence is under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/`.

`bench.mjs` is the DX-B3 public-application benchmark narrowed to seed, serial and burst work. Each of three cycles has 3,000 warm-up
commits, 1,000 timed serial commits and a 60-second Poisson burst at 55/s over 200 hot subjects, capped at 32 in flight. The seed
world has 2,000 subjects, as in DX-B3. There is a 120-second pause between cycles. Four worker threads with eight readers each supply
the final reader arm, using DX-B3's reader recipe. This is not the 256-reader P1 workload.

The current runner retains a bounded measurement lease across windows, releases before another window if the lease is already
twelve minutes old, and has a 14.5-minute hard expiry. It releases at variant completion. Earlier V0 attempts used one lease per
window; saved runner copies identify that difference. Every timed window captures whole-VM stats and waits up to five minutes for
foreign containers above 50% CPU, marking persistent interference. Cgroup probes run asynchronously once per second during bursts.

Per-command observations include native transaction `t`, the response's datom count and `transactMicros`, the
`x-tx2-gateway-micros` header, scheduled/start/end monotonic and wall times, fact count, receipt and client request sample.
`transactMicros` measures the gateway peer's wait for `d/transact`, including its own pauses; it is not the transactor's apply time.
The latter comes from the native `:tx/process` log joined by `t`.

V2 and V3 request an index after the warm-up/serial block and before the reader arm. One hundred concurrent-with-request serial
commits use a separate command stream and distant event sequence range. The main stream's sequence is restored, preserving burst
command-shape draws. Native index begin/end lines, not just the HTTP response, determine overlap.

`analyze.py` retains all slow commands and their overlapping native events. Categories are nonexclusive. It reports service-interval
counts separately, exposure among all commands, native transaction/datoms matching, CPU samples and a **datoms-since-adopted-index
proxy**. The retained native logs do not expose a continuous memory-index-byte gauge; the proxy is not such a gauge. A long
checkpoint's overlap alone does not establish causation.

`run.py v4` uses the V3 stack by default (`DXS3_V4_BASE=v2` selects V2) and overrides only the trace event's fact count to `5 + selected.seq % 6` before
`buildTraceCommand`. It does not change the physical encoding. Run it only after the full-mix variants justify the datom-volume
probe. The report identifies the chosen base and any deviations or incomplete attempts.

Stack options added in this spike preserve previous defaults. `--tx-java-opts` feeds `JAVA_OPTS` to `bin/transactor`;
`--gw-java-opts` feeds **`DATOMIC_JAVA_OPTS`** to `bin/run`. The latter ignores the existing `JAVA_OPTS` environment variable.

V2 onward also supplies `-Ddatomic.objectCacheMax=268435456` to both peers; `object-cache-max` in the transactor properties does not set the peers' cache. The local image's config classes identify this system-property name; native `:cache/create` lines provide the effective-byte check.

The first two V0 attempts predate direct native-t capture or the final lease policy. The initial complete attempt is retained unchanged. The second attempt was aborted between windows during a private Docker outage; `recover.py` is deliberately restricted to that one prefix and captures its native evidence before removal. `analysis-uncalibrated.json` and `analysis-first-parser.json` are superseded parser outputs, retained for the audit trail. The final analysis corrects host/VM clock offset separately for each window and reports certain/possible overlap bounds.

The completed measurements have only a setup clock probe. The final per-command overlap model derives alignment bounds from native/client containment, which is **not independently verified** against possible native logging/accounting delay. Its lower/upper counts are conditional, not verified causal fractions. The current runner adds VM `date` output to each one-second cgroup probe for future independent alignment; this addition was not exercised in the completed measurements, and the analyzer does not yet use it. `DXS3_ADMIT_BEFORE_MS` limits first-lease admission only; it does not truncate an admitted variant.
