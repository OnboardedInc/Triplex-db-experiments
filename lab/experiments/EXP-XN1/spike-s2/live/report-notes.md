## Observation-to-verdict audit

There are no acceptance/PASS producers in this spike. The following places produce diagnostic content booleans, completed markers, adopted numbers or bar comparisons. They were reviewed for content, freshness and binding; the limits remain explicit.

| Producer | Content checked | Freshness | Binding and limits |
| --- | --- | --- | --- |
| `write.mjs` correct | Full successful three-document bytes; exact P0004 marker; rejected attempt has no payloads, unchanged head and correct claim presence | Fresh unique scope and immediate readback in this invocation | Exact writer URL and frozen command source; this is not crash durability |
| `write.mjs` history, `history-check.mjs` | 20k head position, 20,001 claims, 60k documents; retained-fixture recheck also checks last three full payloads | New preparation or fresh queries after restart, with its original scope | Same named database/volume and scope; the first erroneous boolean remains retained as false |
| `write.mjs` closed | All ACKs; resulting head/counts and last complete payload bytes | New per-case scope, postflight after timing, exclusive-create output | Timed record binds container/source; earlier unobserved payloads are counted, not individually read back |
| `write.mjs` open | Offered=ACK count, unique sample indices, claims/documents/head sum, correct reader count and no errors; two-node cases also query zero mismatching full payloads for the entire scope | Fresh scope per case and postflight after the interval | Exact writer and reader URLs, cgroups, trace source, arm and attempt; the earlier Local controls have count checks plus separate byte probes, not full-scope byte scans |
| `write.mjs` lag probes | Exactly all three expected row IDs and full bytes at first visibility; one unique observation per acknowledged command | Timer starts at this command's ACK, with a 30s observation deadline | Exact command ID and read-node connection; includes polling/RPC/pool queueing |
| `read.mjs`, `reader-worker.mjs` | Complete expected document bytes and row cardinality for every warm/timed response; Q2 sample indices unique and complete | New pulls in the timed interval; explicit seed snapshot/clock for past cases | Prepared query, generated ID, exact read URL, immutable source and client count; historical fixture values are otherwise unchanged |
| `background-writer.mjs` | Offered=ACK count, no errors, fresh command/document counts and zero mismatching stored bytes | New worker scope during this read case, postflight after draining | Its fixed 55/s trace and writer URL; results embedded in the bound parent case |
| `proof.mjs`, `barrier.mjs`, `wait.mjs` | Unique marker/current/past values; complete scalar/seed bytes; reader unavailable while stopped; 500 current values and sampled prior-basis values in the wait case | Fresh writer commit/tokens, new marker IDs and per-attempt exclusive outputs | Both node URLs, exact await/snapshot/clock tokens and observed container sequence; no inference from token acceptance alone |
| `s3.mjs`, `metrics.mjs` | HTTP success and retained raw S3/metrics bytes; topology audit checks expected object key and leader values | Actual requests within the owned topology hold | Internal task endpoints and local credentials; metrics are observations, not a correctness verdict |
| `common.mjs` measured/save | Actual samples plus raw before/after counters; exclusive-create outputs | Brackets the invocation; no reuse of an existing same-named file | Exact binding copied into each timed record; emitting a record alone does not qualify it |
| `window.py` completed/cleanup | Completed means only that all scheduled subprocesses exited zero; cleanup observes no remaining task containers | Fresh attempt directory, commands and timestamps; bounded hold | Exact image/container IDs, named volumes and copied source/config preimages; no semantic PASS follows from completed |
| `collect.py` | Recomputes quantiles from all samples; checks counts/content postflights, no errors, unique indices/lag IDs | Binding ≤ before ≤ after ≤ release; source copied for this attempt | SHA256 of every source preimage, exact container ID/image/start time, CPU/caps/no ports unchanged through final inspect, raw cgroup monotonicity; incomplete cases remain absent |
| `audit-topology.py` | Exact changing current/past values, matching probe ID, stopped state, S3 key and leader metrics | Writer clocks and metrics timestamps inside the actual hold | Same source hashes, writer start unchanged, read ID unchanged but start advanced, 55 raw file hashes; no crash-failover claim |
| `report-tables.py` | Only a freshly rerun successful collector can supply rows; comparison uses all declared cells and unique records | Runs the collector anew before table generation | Explicit matrix/rate/client/arm match; missing cells remain unmeasured, no selected retries or silent cross-arm baselines |
| `cleanup.py` | No task container exists, each inspected volume has the exact task prefix, empty final task volume/network listings | Fresh Docker observations under its owned cleanup hold | Only `tx2-xns2-*`; original raw evidence is retained before removing volumes |

No acceptance file or pinned path was edited, so there are no moved acceptance-pin hashes. No package, shared engine or lab tool changed. The full application path, ordered/resumable feed, lost-ACK recovery, multi-broker durability, tenant isolation, year-one fixture scale and production failover remain unverified.

## Exact commands and evidence

From this worktree, each active stage runs through the heavy runner. The controller enforces the canonical measurement lock, the two-minute rest, CPU/memory settings, `--pull never`, source copying and removal of containers before release. Complete expanded Docker commands and environment are in each attempt's `commands.json` and container inspections.

```sh
node lab/bin/heavy.mjs --label XN-S2-topology2 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py topology 2
node lab/bin/heavy.mjs --label XN-S2-control-commits2 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-commits 2
node lab/bin/heavy.mjs --label XN-S2-control-commits3 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-commits 3
node lab/bin/heavy.mjs --label XN-S2-control-reads1 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-reads 1
node lab/bin/heavy.mjs --label XN-S2-control-reads-rest1 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py control-reads-rest 1
node lab/bin/heavy.mjs --label XN-S2-q1 -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py q1 1
node lab/bin/heavy.mjs --label XN-S2-lag -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py lag 1
node lab/bin/heavy.mjs --label XN-S2-reads -- python3 lab/experiments/EXP-XN1/spike-s2/live/window.py reads 1
python3 lab/experiments/EXP-XN1/spike-s2/live/audit-topology.py
python3 lab/experiments/EXP-XN1/spike-s2/live/report-tables.py
node lab/bin/heavy.mjs --label XN-S2-cleanup -- python3 lab/experiments/EXP-XN1/spike-s2/live/cleanup.py
```

The command list describes the prepared full run; only attempts with retained observations are executed evidence. Final executed/missing stages, hold times, volume maximum/removal receipt and the manifest count are recorded in the final findings below. No downloads or web requests occurred.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/`. Current evidence lives under `live/`; all jars, raw logs and samples stay outside Git. `EVIDENCE.md` and `SHA256SUMS-live` index the final retained bytes; prior manifests/history remain intact.
