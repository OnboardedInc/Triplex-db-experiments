# DX-B9 report

**A: REGRESSION by the requested non-overlapping-repeat rule, with a busy-host causal limitation.**
The original da77a50a gateway loses frozen 4/64-reader goodput and dense commit p50 versus 19f5422d.
The historical twofold loss/1.7s sparse tail is not consistently reproduced. The optimized report-map-on
prototype still loses at 64 readers; therefore TX2_RECENT_REVISIONS is **off by default**.
The selected default-off frozen repeats overlap the old gateway at every reader count. Absolute quiet-host
bars are not established. All rows have `keepAwake:false`; no keep-awake helper was used.

**B MISSED:** zero fresh 10k ordered-commit executions; zero W0 window16/32/64 throughput/fingerprint runs.
**C MISSED:** zero fresh 64-subject publication replays/profiles; no measured≤30ms result.
**D MISSED:** zero fresh recorded-page CPU replays; no compact form or≤3µs/row result.
Unexecuted B proposals are retained separately from package code. This run does not qualify P5.

## A: original paired comparison

A=19f5422d; B=base e0e6fa6e (gateway file contents equal da77a50a). Both arms use the same
built TypeScript driver, lean layout,2,000-subject graph and 50,000 fill commits, with no manual index
job request. Each 30s phase runs A1 B1 A2 B2 in one lock hold. This is not an hour-apart comparison.
Gateway source manifests can have different serialized hashes across holds; their path→digest contents
are retained and identify the actual bytes. Both repeats of each arm follow.

### frozen-2

| Arm | Phase | Pulls/s | Read p50 / p99 ms | Read gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |
|---|---|---:|---:|---:|---:|---:|---|
| A1 | random-4 | 4818.01 | 0.65 / 3.23 | 1.12 | 4284.91 | — / — | false |
| A1 | random-64 | 6342.14 | 8.38 / 25.89 | 1.60 | 3959.84 | — / — | false |
| A1 | random-256 | 5962.97 | 34.35 / 95.18 | 1.65 | 3622.72 | — / — | false |
| B1 | random-4 | 4754.20 | 0.68 / 3.27 | 1.15 | 4150.90 | — / — | false |
| B1 | random-64 | 5749.92 | 9.26 / 29.11 | 1.58 | 3638.75 | — / — | false |
| B1 | random-256 | 5558.51 | 36.59 / 98.77 | 1.61 | 3446.75 | — / — | false |
| A2 | random-4 | 4933.33 | 0.63 / 3.27 | 1.14 | 4346.43 | — / — | false |
| A2 | random-64 | 6542.13 | 8.15 / 26.58 | 1.61 | 4061.41 | — / — | false |
| A2 | random-256 | 5450.80 | 35.93 / 145.20 | 1.63 | 3345.51 | — / — | false |
| B2 | random-4 | 3331.61 | 0.88 / 5.76 | 1.18 | 2825.34 | — / — | false |
| B2 | random-64 | 4375.39 | 11.87 / 50.94 | 1.60 | 2739.64 | — / — | false |
| B2 | random-256 | 4120.34 | 48.74 / 204.53 | 1.61 | 2561.68 | — / — | false |

Hold: 773 seconds; exit 0; diagnostic, not acceptance.

Host observations (complete wait samples stay in evidence):
```json
// host-before.jsonl
{"at":"2026-11-10T17:50:57Z","load1":6.40,"swapUsedMB":15310.12,"otherCpuPercent":522,"callAppsCpuPercent":13,"quiet":false}
{"at":"2026-11-10T17:52:57Z","load1":3.21,"swapUsedMB":14910.12,"otherCpuPercent":137,"callAppsCpuPercent":11,"quiet":true}
// host-lock-acquired.jsonl
{"at":"2026-11-10T17:52:57Z","load1":3.21,"swapUsedMB":14910.12,"otherCpuPercent":125,"callAppsCpuPercent":9,"quiet":true}
// host-after.jsonl
{"at":"2026-11-10T18:05:51Z","load1":11.29,"swapUsedMB":12923.38,"otherCpuPercent":296,"callAppsCpuPercent":52,"quiet":false}
```

### mixed-2

| Arm | Phase | Pulls/s | Read p50 / p99 ms | Read gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |
|---|---|---:|---:|---:|---:|---:|---|
| A1 | backToBack | — | — / — | 0.29 | — | 6.97 / 53.62 | false |
| A1 | quietPoisson | — | — / — | 0.06 | — | 13.32 / 106.18 | false |
| A1 | readPoisson | 1122.80 | 183.53 / 1022.82 | 1.62 | 693.12 | 29.62 / 433.07 | false |
| B1 | backToBack | — | — / — | 0.34 | — | 9.05 / 52.24 | false |
| B1 | quietPoisson | — | — / — | 0.06 | — | 12.16 / 77.30 | false |
| B1 | readPoisson | 1367.33 | 159.82 / 733.33 | 1.62 | 841.94 | 29.61 / 352.48 | false |
| A2 | backToBack | — | — / — | 0.32 | — | 7.89 / 33.28 | false |
| A2 | quietPoisson | — | — / — | 0.05 | — | 11.11 / 43.34 | false |
| A2 | readPoisson | 1370.97 | 160.74 / 713.54 | 1.50 | 911.80 | 31.93 / 160.06 | false |
| B2 | backToBack | — | — / — | 0.35 | — | 8.80 / 46.15 | false |
| B2 | quietPoisson | — | — / — | 0.04 | — | 11.36 / 44.22 | false |
| B2 | readPoisson | 1268.20 | 168.74 / 722.50 | 1.35 | 936.36 | 33.08 / 291.07 | false |

Hold: 1028 seconds; exit 0; diagnostic, not acceptance.

Host observations (complete wait samples stay in evidence):
```json
// host-before.jsonl
{"at":"2026-11-10T17:54:26Z","load1":5.14,"swapUsedMB":14686.06,"otherCpuPercent":149,"callAppsCpuPercent":6,"quiet":true}
// host-lock-acquired.jsonl
{"at":"2026-11-10T18:05:54Z","load1":10.95,"swapUsedMB":12923.38,"otherCpuPercent":394,"callAppsCpuPercent":90,"quiet":false}
// host-after.jsonl
{"at":"2026-11-10T18:23:02Z","load1":13.31,"swapUsedMB":12639.25,"otherCpuPercent":523,"callAppsCpuPercent":93,"quiet":false}
```

The original frozen4-reader A range is4818–4933 pulls/s versus B3332–4754;64-reader A6342–6542
versus B4375–5750. Dense commit p50 A6.97–7.89ms versus B8.80–9.05ms. Those ranges do not overlap.
256-reader and moving-read ranges overlap; do not label those rows regressions. Sparse Poisson p99
also overlaps. Busy-host variation within a hold limits causal attribution even with alternation.
The original moving hold had a quiet precheck before lock contention but an immediate busy sample;
it did not repeat the full20-minute wait at lock acquisition. That deviation is retained, not called quiet.
Sparse rows include the known8–10ms/hop VM wake penalty; back-to-back numbers are shown alongside.

## A: diagnosis and selected implementation

Frozen B1 at256 readers has1,440 execution samples,112 without a gateway caller:

| Leaf | Gateway caller | Samples |
|---|---|---:|
| PersistentArrayMap.indexOfObject | reach/read-entity |152|
| Util.equals | entity-cache/lookup |94|
| HashMap.putVal | reach/build-response |85|
| AbstractStringBuilder.append | reach/append-string! |51|

Raw JFR and stack-depth128 compressed JSON, with phase boundaries and omitted/truncated-stack counts,
are in profiles-frozen-2 and profiles-mixed-2. Both read/write gateways and the transactor were
recorded in B1. Mixed write samples are sparse:127 dense,29 quiet,84 loaded. They do not prove
an added consumer wait on writes. storage/commit! does not wait for its own report consumer after
transact returns. Transactor samples have no captured gateway caller; do not invent one.
Dense B1 write-gateway phase:127 samples,49 without a gateway caller,zero truncated stacks.
Leading captured pairs are json/read_escaped_char→main/request_json (3),
PersistentVector$ChunkedSeq.next→lean/decode (3), and storage/tx_data$fn__856→itself (2).
This small count cannot identify a write-tail cause. Dense transactor phase:303 samples,all303
without gateway frames,zero truncated; top leaves compare_ex (15),Util.equiv (13),ConcurrentHashMap.get (12).
No publication workload was profiled, so these are A profiles, not C attribution.

Changes:

- Fixed-field ReadConfig replaces linear hot map lookup. ParsedKey uses a captured config-generation
  identity and primitive long entity/revision equality; historical cuts and recreated scopes remain distinct.
  It remains a ConcurrentHashMap with exact equality, not an unverified eid-only primitive map.
- The report-fed revision map is opt-in (`TX2_RECENT_REVISIONS=1`, or JVM
  `triplex.recentRevisions=true`). Default feed notification remains; no recent state is allocated.
  Default reads use the exact cut-memo path without report-witness volatile/closure/miss overhead.
- Mandatory gates exposed an H6 W0 fixture with no backend URL, then a real multi-root ordering
  mismatch. The fixture now observes the actual built client and fallback; all old row/order/basis,
  one-request and65-row assertions remain. sweepRows restores portable root-frontier BFS order and
  rejects unreachable nonempty bodies. This compatibility repair adds traversal cost; it is not D's
  compact-row optimization and must be accounted for in a future P5 end-to-end measurement.

The enabled prototype's final-frozen-1 had64-reader A6072–6535 versus B5031–6062 pulls/s;
p99 A26.66–29.17 versus B29.86–40.66ms. Therefore the requested every-row bar was not met.
That attempt remains a rejected optimization; its passing development gates are not substituted for
fresh selected-default gates.


### Rejected report-map-on prototype (final-frozen-1)

| Arm | Phase | Pulls/s | Read p50 / p99 ms | Read gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |
|---|---|---:|---:|---:|---:|---:|---|
| A1 | random-4 | 4614.60 | 0.69 / 3.49 | 1.17 | 3957.14 | — / — | false |
| A1 | random-64 | 6535.32 | 8.09 / 26.66 | 1.61 | 4049.53 | — / — | false |
| A1 | random-256 | 4524.13 | 46.30 / 166.60 | 1.68 | 2700.63 | — / — | false |
| B1 | random-4 | 4120.69 | 0.75 / 4.01 | 1.13 | 3647.95 | — / — | false |
| B1 | random-64 | 5031.40 | 10.34 / 40.66 | 1.66 | 3031.05 | — / — | false |
| B1 | random-256 | 5097.30 | 40.24 / 122.87 | 1.69 | 3015.95 | — / — | false |
| A2 | random-4 | 4302.90 | 0.75 / 3.80 | 1.12 | 3832.56 | — / — | false |
| A2 | random-64 | 6072.17 | 8.75 / 29.17 | 1.60 | 3784.57 | — / — | false |
| A2 | random-256 | 5705.13 | 35.95 / 117.85 | 1.64 | 3477.22 | — / — | false |
| B2 | random-4 | 4548.65 | 0.69 / 3.69 | 1.10 | 4147.31 | — / — | false |
| B2 | random-64 | 6062.21 | 8.83 / 29.86 | 1.62 | 3748.11 | — / — | false |
| B2 | random-256 | 6196.28 | 33.14 / 103.54 | 1.67 | 3719.82 | — / — | false |

Hold: 510 seconds; exit 0; diagnostic, not acceptance.

Host observations (complete wait samples stay in evidence):
```json
// host-before.jsonl
{"at":"2026-11-10T19:43:17Z","load1":8.95,"swapUsedMB":14593.88,"otherCpuPercent":710,"callAppsCpuPercent":86,"quiet":false}
{"at":"2026-11-10T20:03:20Z","load1":6.35,"swapUsedMB":15184.56,"otherCpuPercent":106,"callAppsCpuPercent":20,"quiet":true}
// host-lock-acquired.jsonl
{"at":"2026-11-10T20:03:20Z","load1":6.35,"swapUsedMB":15184.56,"otherCpuPercent":86,"callAppsCpuPercent":15,"quiet":true}
// host-after.jsonl
{"at":"2026-11-10T20:11:50Z","load1":8.92,"swapUsedMB":15048.56,"otherCpuPercent":129,"callAppsCpuPercent":10,"quiet":true}
```

## A: selected-default paired comparison

A is19f5422d; B is stage-default1/B. Every arm clones one sealed 207MB B9 seed volume, checks
identical physical file-name sets and SHA256s before startup, and starts with logical head 52,039.
A gateway may install metadata transactions, so native t can advance (B's extra2 retained in driver
reports); this is not relabelled as business commits. Every worker hashes all 2,000 warm root JSON
answers and B1/A2/B2 must match fresh A1 counts, bytes and digest. This proves those returned JSON
answers, not arbitrary native metadata equality. Different metadata may affect head-read cost; this
is a limit on attributing tiny residual differences. No manual index request was issued; absence of
all automatic index work was not independently established.

### default-frozen-1

| Arm | Phase | Pulls/s | Read p50 / p99 ms | Read gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |
|---|---|---:|---:|---:|---:|---:|---|
| A1 | random-4 | 3072.09 | 0.93 / 6.67 | 1.19 | 2588.87 | — / — | false |
| A1 | random-64 | 3999.57 | 13.09 / 52.87 | 1.63 | 2459.57 | — / — | false |
| A1 | random-256 | 4141.61 | 50.48 / 185.65 | 1.67 | 2478.05 | — / — | false |
| B1 | random-4 | 2729.24 | 0.91 / 9.82 | 1.13 | 2418.09 | — / — | false |
| B1 | random-64 | 5858.50 | 9.02 / 32.92 | 1.64 | 3581.24 | — / — | false |
| B1 | random-256 | 5464.46 | 37.92 / 115.66 | 1.70 | 3218.38 | — / — | false |
| A2 | random-4 | 4178.40 | 0.74 / 4.23 | 1.12 | 3719.17 | — / — | false |
| A2 | random-64 | 5437.94 | 9.87 / 34.82 | 1.60 | 3397.60 | — / — | false |
| A2 | random-256 | 5673.25 | 37.33 / 111.71 | 1.65 | 3429.17 | — / — | false |
| B2 | random-4 | 4517.76 | 0.65 / 3.93 | 1.09 | 4130.54 | — / — | false |
| B2 | random-64 | 4707.73 | 11.10 / 47.42 | 1.62 | 2907.38 | — / — | false |
| B2 | random-256 | 4339.69 | 48.58 / 168.88 | 1.66 | 2614.01 | — / — | false |

Hold: 536 seconds; exit 0; diagnostic, not acceptance.

Host observations (complete wait samples stay in evidence):
```json
// host-before.jsonl
{"at":"2026-11-10T20:20:00Z","load1":6.80,"swapUsedMB":14808.56,"otherCpuPercent":675,"callAppsCpuPercent":22,"quiet":false}
{"at":"2026-11-10T20:40:03Z","load1":7.14,"swapUsedMB":15467.19,"otherCpuPercent":344,"callAppsCpuPercent":17,"quiet":false}
// host-lock-acquired.jsonl
{"at":"2026-11-10T20:40:03Z","load1":7.14,"swapUsedMB":15467.19,"otherCpuPercent":350,"callAppsCpuPercent":17,"quiet":false}
// host-after.jsonl
{"at":"2026-11-10T20:48:59Z","load1":10.67,"swapUsedMB":15989.62,"otherCpuPercent":339,"callAppsCpuPercent":16,"quiet":false}
```

### default-mixed-1

PENDING: default-mixed-1 has no verified summary.

Host observations (complete wait samples stay in evidence):
```json
// host-before.jsonl
{"at":"2026-11-10T20:25:43Z","load1":7.78,"swapUsedMB":14552.12,"otherCpuPercent":388,"callAppsCpuPercent":7,"quiet":false}
{"at":"2026-11-10T20:44:46Z","load1":12.81,"swapUsedMB":16037.62,"otherCpuPercent":139,"callAppsCpuPercent":10,"quiet":true}
```

Selected frozen ranges overlap at 4/64/256; no measured default-off speedup or regression under
the supplied rule. Busy-host absolute256-reader goodput4339–5464 pulls/s and p99115.7–168.9ms
miss7,500/100ms. This is not a quiet-host capacity claim. Quiet Poisson≤50ms, moving p99≤100ms
and dense p50≤4ms are assessed only from the selected mixed table, not borrowed from historical runs.

CPU columns are the measured read-gateway cgroup CPU. Dense/sparse no-reader columns therefore
show mostly idle read-gateway work, not the write gateway's CPU cost. The inherited B7 mixed harness
did not retain per-phase write-gateway CPU; that requested metric is missing. Writer request diagnostics
and JFR remain available, but are not a substitute for that counter.

## Developer gates and exactness

PENDING selected-source gate union. No step-A promotion is authorized by this report yet.

PASS/verdict/receipt sites and their content/freshness/binding checks are listed in [PASS-AUDIT.md](PASS-AUDIT.md).
Cleanup receipts use semanticVerdict:null. A successful command is never treated as semantic acceptance.
Failed early runs and rerun reasons are in [FAILURES.md](FAILURES.md), with all raw failures retained.

## B, C, D and the remaining P5 wall

B's package code is unchanged. draft/ and apply-step-b.py are unexecuted proposals for per-client
bounded buffering, deadline suffix failure and explicit retry; strict-order.test.ts.draft proposes10k real
commits with64 in flight and random delayed arrivals. No observed positions or fresh W0 fingerprint
were produced. They require review and integration before running, including avoiding proxy-induced
gap deadlock when64 blocked requests compete for32 upstream sockets. Do not merge them as a fix.

C's per-entity checks, prefix lookups, journal copies, outbox/identity preconditions, payload and
Postgres costs were not attributed or changed. Historical165ms/64-subject publication still means
about2.58 transactor seconds per second at1,000 subjects/s, not fresh B9 evidence. No optimal batch
size or alternate exact route was established. D still lacks recorded-page replay, raised root bound
and compact projection; historical17µs/row and64-root cap remain unresolved. BFS order compatibility
adds work that the next P5 measurement must include. Ordering, publication and row encoding therefore
still stand between this lane and1,000 subjects/s. No answer/precondition/test was intentionally weakened.

The budget went to A's paired runs, failed-harness diagnosis, immutable clone proof, preexisting W0
integration failures, and repeated full source-bound gates. B–D are incomplete, not accepted by proxy
from A. No full north-star/acceptance run, quiet-host target qualification,10m/100m scale run or P5
publication fingerprint was performed. No merge, push, deployment or release was attempted.

## Reproduction, evidence, ownership

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9/`.
See [EVIDENCE.md](EVIDENCE.md) and SHA256SUMS for final size, immutable captures, commands,
failures, profiles, cleanup and manifests. Raw files stay outside git (including any file>1MB or raw
directory>5MB). No downloads; existing pinned image tx2-datomic:1.0.7745-da00 and local Postgres
image were used. Offline frozen install used the owned pnpm store. No global cache/config, colima,
shared resident, forbidden port, original H5 seed volume or unrelated directory was modified.

SOURCE-CHANGES.json records every changed package path with old/new SHA256 against base e0e6fa6e.
PIN-CHANGES.json and the literal pin-path search record no matching changed path under lab/acceptance;
no acceptance file or pin was edited. Stage-default1 holds actual working-tree/source/build bytes,
not a forged claim that a later commit existed at measurement time. Engine/container/image, mount,
resource, CPU and durability observations remain in stack metadata. keepAwake:false throughout.
