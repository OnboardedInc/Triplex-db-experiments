P2 still does not pass in final pair A: all-primary p99 is 71.013 ms against 50 ms.
At 256 readers the small/medium medians are 11.647/14.655 ms against 10 ms.
The medium burst median is 11.775 ms against 10; the small burst median passes at 9.663 ms.
P1 misses G256/G64 at .997503 against 1, and has no qualifying recovery window within 60 seconds.
P3 and the measured P4 bars pass; whole-machine weighted goodput is 19,073 pulls/s against 4,400; oracle PASS.
The 1,024-reader writer ratio passes at 1.306 against 2, with a higher zero-reader denominator; it is not a proved tail fix.
No new performance setting is made default: journal, smaller nursery, smaller old space and the shared Postgres core were rejected.
The opt-in slim layout preserves exactness but adds 1.090 ms at the median, saves only 1.67% of sampled value bytes and raises aggregate WAL traffic.
Peer wait remains the largest tail contributor; targeted native traces locate GC-free waits at the durable tail-descriptor future and Postgres socket.
A separate 137-ms stall is the benchmark's synchronous SQLite publication witness blocking the writer after an earlier ACK; it remains unfixed.

Timed source: `5e9e1ad3`; current layout, strict server clocks, exact local reads, split rule `pending`, delta broadcasts, cache 1280 MiB, history 192 MiB, original placement and quiet logging. No frozen phase/bar, durability setting or sealed seed changed. [Every bar beside C](VERDICT-8.md), [tail causes](TAIL-8.md), [settings](SETTINGS-8.md), [slim layout](SLIM-8.md), [evidence](EVIDENCE-8.md).

| context / tracing | primary p50 / p99 ms | swap GiB median | Mac non-VM CPU median / p99 % | same-session off p50 / p99 ms |
| --- | --- | --- | --- | --- |
| C off-before / off | 11.007 / 45.569 | 4.694 | 11.8 / 180.8 | 10.876 / 43.490 |
| C zero / summary | 11.077 / 54.825 | 4.679 | 11.3 / 90.6 | 10.876 / 43.490 |
| C loaded / summary | 11.189 / 55.647 | 4.679 | 10.9 / 93.5 | 10.876 / 43.490 |
| C off-after / off | 10.745 / 41.412 | 4.679 | 10.5 / 94.7 | 10.876 / 43.490 |
| A off-before / off | 10.593 / 47.676 | 4.140 | 9.7 / 148.5 | 10.660 / 46.380 |
| A zero / summary | 10.517 / 49.378 | 4.140 | 10.2 / 83.5 | 10.660 / 46.380 |
| A loaded / summary | 11.122 / 71.013 | 4.124 | 9.5 / 94.9 | 10.660 / 46.380 |
| A off-after / off | 10.726 / 45.084 | 4.124 | 9.5 / 354.7 | 10.660 / 46.380 |

Host statistics use primary-window raw samples, excluding seed/oracle. Full zero/loaded arms are 900 seconds; off arms are 200-second context, not a tracing-cost A/B. Both A off medians meet 12 ms; bookend drift .133-ms p50 / 2.592-ms p99. Cross-pair changes do not isolate a cause.

| target | result, with the context above or in its linked same-session table |
| --- | --- |
| A1 tail | C 96/7408 commits >50 ms; A 144/7408: peer 113, subject wait 18, network/callback 8, scheduler 5. A GC 1696 pauses / 4750.8 ms / max 75.0 ms; three lateness episodes total 373.8 ms. Neither tail nor writer stalls are removed. [Counts, trace IDs and overlaps](TAIL-8.md). |
| A1 journal | Summary ABA: heap median 498→302 MiB, max GC 131.7/42.8/87.9 ms; p99 gain 5.635 ms is inside 10.477-ms drift; stress writer ratio 2.521 misses 2. Reject; [host/bookends](JOURNAL-8.md). |
| A1 V8 | Nursery 4 MiB adds .933-ms p50 beyond .151-ms drift; old-space 1024 MiB p99 gain 7.896 ms is inside 13.855-ms drift and L256 writer ratio worsens. Reject both; actual worker limits unchanged. [Full GC/heap/host tables](SETTINGS-8.md). |
| A1 engine | Four exact native-counter examples park 143–253 ms at `write_tail_descriptor`, concurrent with PG socket reads; no GC. SQL execution excludes implicit commit at Sync. WAL sync versus I/O wakeup/CPU/network remains unsplit; adoption/reset identities missing. No collector/threshold fix proved. [Native evidence](NATIVE-8.md). |
| A2 | TX 0,1 sharing PG 1: .328-ms median saving versus .241-ms drift, no p99 gain, 1.5% read-goodput loss; stress scaling also worsens. Reject. Zero observations 11.924→11.420 ms have no closing zero control, so no floor gain claimed. [Full-level zero/256/P1/context](SETTINGS-8.md). |
| A3 | Fresh 1k, full, current/slim/current: p50/p99 11.490/44.626, 12.679/47.315, 11.687/46.824 ms; swap 4.124 GiB throughout; Mac CPU median 9.8/9.9/10.5%, p99 72.5/93.6/107.9%. Candidate adds 1.090 ms beyond .197-ms drift; no 10k advance. |
| A3 size/exactness | 64 exact log transactions: 56.453 datoms/tx unchanged; value bytes 17,070→16,783, only 1.67% saved. WAL/primary-ACK proxy 13,078/33,064/12,972 bytes; storage autocommits proxy 3.605/3.749/3.604. These include background/probes; physical transaction-log bytes remain unmeasured. Slim real-Peer 20 tests/53,955 assertions; differential 95,028 and replica 200,000 comparisons; 1k loaded oracle PASS. [Band/attribute tables and limits](SLIM-8.md). |
| A4 P1/P2 | Both writer ratios now pass (.341/1.306), but zero p99 denominators are 116.852/71.830 ms. Read p99 6.303 ms; G1024/G256 1.210; recovery failed. All P2 misses are in the first three lines; steady queue 1≤2.19, burst drain .085/.275 s≤60, 7408/7408 published, all RYOW/duplicate/lost-ACK checks exact. |
| A4 P3/P4/oracle | Gaps/order/duplicate effects 0; replay exact, 3 crashes, lag p99 18.280 ms≤250. Weighted pull p50/p99 .028/.200 ms, largest .281 ms; depth1/3/10 p99 .131/.137/.137 ms (ratio 1.046≤1.1). Engine bytes/query unmeasured. Oracle 810 commands/53 reads/2296 queries, 0 mismatches or receipt violations. |

Remaining median example: over all 50 primary commits in the L256 phase (before the settled P1-window trim), traced own-scope wall is 2.831 ms, observed synchronous CPU .329 ms and run-queue wait 0 ms at their marginal medians; peer wait 6.032 ms. Own-scope wall is not CPU. The rest includes socket/callback, scope waits and queueing; marginal quantiles do not add. Summary cannot split native storage internals. The witness is benchmark apparatus; peer/storage waits are product-path costs. Moving witness persistence off the writer must preserve its original captured clock and exact durable readback. The other two lateness episodes retain unexplained time. Additional collector/index-threshold trials and a retained-history move were not completed; no claim is made that those options are exhausted.

Slim remains off: existing scopes/seeds stay layout 3. Adoption needs rebuilt seeds or a position/clock/claim/history-preserving migration, then full qualification; none is built. Per-row compression leaves datom count and sequential durable writes intact. No 100k saving is established; a layout removing repeated metadata is still a separate candidate.

Validation: 293 normal package tests pass, 51 external-service tests skip, zero failures; build/declarations/typecheck/lint/shell pass. The executed receipt's 313 product/bench source files still match. Root-JS fails on inherited unregistered `report-revision-race.mjs`; no full-root/pack-check PASS. [PASS audit](AUDIT-8.md): content, attempt freshness and source/slot/input binding at every qualifier; zero moved pinned-path references, acceptance unchanged.

Commands (fresh tags; the run wrapper supplies the heavy gate, lock, 15-GiB guard and cleanup):
```sh
bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-p8-final-new
bash lab/experiments/EXP-DX1/t1/session.sh model-256 tx2-dxt1-p8-model-new
bash lab/experiments/EXP-DX1/t1/session.sh young-256 tx2-dxt1-p8-young-new
bash lab/experiments/EXP-DX1/t1/session.sh oldheap-256 tx2-dxt1-p8-oldheap-new
bash lab/experiments/EXP-DX1/t1/session.sh shared-256 tx2-dxt1-p8-shared-new
bash lab/experiments/EXP-DX1/t1/slim-session.sh tx2-dxt1-slim-new 1000
```
Outputs: private `evidence/DX-T1/<tag>/` has reports, offline HTML/Chrome viewers, raw gzip and oracle archives; committed `t1/runs/<tag>/` has report/index/SHA256SUMS. `evidence/TRACE-INDEX.md` links all runs; default pair raw size 52,984,036 bytes. All own containers/volumes removed, lease released; free disk 15.304 GiB. No push, upload or sealed-seed rewrite.
