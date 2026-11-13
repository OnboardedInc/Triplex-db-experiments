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
