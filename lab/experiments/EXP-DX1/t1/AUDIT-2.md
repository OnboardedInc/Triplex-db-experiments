# DX-T1 part 2 observation audit

The semantic oracle and bars are unchanged. These sites convert observations to reported results:

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `trace/report.mjs` completeness and coverage | Existing interval/JFR SHA/count/footer checks; explicitly omitted Node/PG/JFR collectors are n/a, never an invented zero. Queue intervals must partition measured wait, preserve capacity and resolve subject predecessor IDs. | Each record must fall in this attempt; unique raw output names and drain footers retained. | Exact run/source/slot and sending-span links; each writer trace and predecessor belongs to the recorded attempt. |
| `trace/report.mjs` CPU columns | Counter deltas from synchronous boundaries, union nested intervals; disabled/missing kernel run-queue accounting is unknown. Phase counters are writer-thread samples, never process-wide CPU. | Timestamped boundary pairs from this request/phase. | Linux thread-self descriptor per Node isolate; root and span causal binding retained. |
| `trace/ablation.mjs` measured differences | Requires DONE, 10k seed, exact local/strict/zero/200-second config, all primary commands committed; inspects actual JVM/Node environment, PG settings, requested gateway spans, trace completeness and raw host/VM samples. | New tags, fresh raw sample timestamps; bookend controls from this session. | Same source/build byte hashes, frozen workload digest/denominator, tag/slot/session/component manifest; all reported latency rows carry swap and control tags. No overhead PASS is inferred. |
| `t1/session.sh` lease release | Empty scoped container/network/volume inventory after every child cleanup; failure retains lease. | Inventory is reread on this exit. | Own prefix and live parent lease PID; source unchanged across arms. |
| Existing finalizer/store/oracle gates | Part 1 audit remains applicable; no oracle or acceptance comparator modified. | Existing per-attempt checks retained. | Existing exact source/raw-byte manifests retained. |

Literal sealed-contract reference scan before the first implementation commit found zero changed pinned paths.
No acceptance file or pin was edited. Package build/typecheck and normal tests: 189 passed, 51 skipped.
The independent queue-partition and component-configuration tests pass. Bench typecheck still has pre-existing
errors in audit-traffic, hs01-seed and round2; no new diagnostic names a changed file.
No new dependency or image. Raw evidence remains outside Git. Full measurements and final status follow in REPORT-2.md.

The full 1k `p2-smoke-a` passed the oracle (53 reads / 3,278 entity queries), all 89 commits met scope coverage,
and gateway preflight passed 3 tests / 14 assertions. Scheduler probe found the guest counter disabled;
`scheduler-control.sh` now saves, enables and rereads it under the DX-T1 lease and restores it before release.
The saved state is exclusive-created and restoration failure retains the lease. All ablation arms share this setting.

The 10k ablation session `p2-abl-a` completed all nine arms with 3,420 primary commands each.
Source/build bytes, actual collector flags, host swap samples and bookend controls passed the observation checks.
Native logs/callback added 3.115 ms p50 (19.48%) against bookend mean 15.994 ms; full added 3.197 ms.
Summary now excludes that stream while retaining Node/gateway spans, JFR and PG context. Its cost is not yet proved.

`p2-cost-a` (off/summary/summary/off) measured +0.751 ms / 4.73% mean p50 overhead; the cost target was missed.
The next cheaper summary keeps Node/gateway spans and system sampling; JFR, PG tracing and native logs stay in full.
Gateway GC becomes n/a when JFR is excluded; scope coverage still describes wall intervals, not proven CPU execution.

`p2-cost-b`: mean p50 +0.296 ms / 1.81%, just inside both aims, with 1.406 ms off-control drift.
This is a borderline observation, not a robust overhead guarantee; all per-arm values and swap remain in COST-2-b.md.
The full-pair study wrapper keeps 900-second phases and bookends them with off references under one lease.
`trace/study.mjs` validates DONE/10k/strict/local/full duration, source/build bytes, session/tag/slot, trace completeness
and fresh Mac/VM samples, then copies existing gate values and flags without certifying semantic acceptance.
Scheduler restoration state now binds the exact source, prefix and live lease PID; the parent independently requires
the restored readback before releasing its lease. Changing reader/seed/bar/oracle logic remains outside this change.

Full study `p2-pair-a` passed its oracle (53 reads / 2,310 entities) and all 3,458,638 model reads were exact.
P2 and several P1 performance bars missed; P3 bars passed. Its CPU counters and queue partitions are valid observations.
Its gateway/TypeScript shares are not reliable: startup wall-clock anchors differ by about 100 ms and deferred ticket
sends could borrow a predecessor's trace. A real queued-HTTP test reproduces that context bug before the fix.
The next revision binds deferred send/transport callbacks and aligns clocks only through matching Linux boot IDs
and measured mono/epoch offsets. It checks every local span parent; missing/foreign clock bindings fail completeness.
Raw bytes remain unchanged. JFR now carries bracketed clock markers; SHA256-bound export requires at least two precise
markers, preserves native raw JFR, and maps event timestamps through the observed marker pairs. No duration is inferred
from a client's HTTP window. The JFR factory uses the official Java 17 EventFactory API:
https://docs.oracle.com/en/java/javase/17/docs/api/jdk.jfr/jdk/jfr/EventFactory.html

The corrected full 1k smoke `p2-smoke-d` passed the oracle and 94/94 coverage; clock binding and all local span parents
validated. JFR preflight passed 3 tests / 16 assertions including real marker export. Normal package suite: 191 passed.
A CPU-placement option now pins only the writer to guest CPU 3 and Node workers/runtime threads to CPUs 4-7; the read
gateway moves to CPU 2, leaving the same eight guest CPUs. It is opt-in pending measurement, and does not change load.
The placement study validates actual container masks and per-thread kernel readbacks, source/build hashes, full pair
durations and fresh controls before reporting existing gate values. Each candidate worker must prove its own affinity;
a missing readback is incomplete evidence, never a placement PASS. CPU-set parser and deferred-send tests are normal tests.
