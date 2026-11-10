# DX-H4 — work in progress (not a completed report)

North star: trustworthy P1–P4 north-star verdicts under TARGETS 1.1. Source revision: `6215c669`.

Steps 1–5 are implemented and committed: monotonic driver-bound maintenance windows; indexed history with at least 10,000 correct pulls per depth; fresh paired stacks and equal declared trace horizons; full per-command timing and P2 segment summaries; feed/RYOW and probe workers, preserving write-peer routing. Focused tests pass 10/10; native feed tests pass 5/5; cached package builds pass 10/10. The unrelated broad bench TypeScript errors remain.

Step 6 is pending shared measurement-lock admission. The fresh 2,000-subject pair is queued as `tx2-dxh4-s6` with a 600-second declared trace, 30-second levels, three reader workers, four client CPUs and the requested engine CPU/memory/JVM plan. No new performance or correctness verdict is claimed yet. The 10k pair follows after this validates the CPU plan.

First failure retained: `evidence/DX-H4/tx2-dxh4-s5-zero/driver/ns-report.json` reports 26 stale RYOW observations. Moving auxiliary work into a worker inadvertently selected the read gateway instead of the original main-thread write gateway. The failed baseline is not reused. The s5 ladder was stopped; all its owned resources were removed before releasing the lock. The routing fix explicitly pins auxiliary worker connections to the write peer and is covered by a regression. Its fresh live verification is pending.

Early s1–s4 attempts were cancelled while queued, before creating engine resources, to bind final source changes. No acceptance contract, packages, shared residents, default Docker context, forbidden ports, merge or push were touched.

See `AUDIT.md` for the observation-to-verdict audit. Final tables, evidence manifest, old/new source hashes, file/line blockers and cleanup inventories will replace this progress report after the runs complete.

Progress at 2026-11-10 07:40 UTC: corrected s6-zero completed DONE with 3,873/3,873 correct RYOW reads, zero violations/errors, 4,578/4,578 offered writes completed, no expiry/pending writes, exact replay (4,401 entries, zero mismatches), and maintenance counts [1,1,1,1,1,1]. All 3,873 original committed commands have every required timing boundary. Burst main ELU 0.145; median driver-owned time 1.999 ms. Optional SDK per-commit diagnostics absent. The paired ladder has been queued since 07:06:22 UTC behind successive DX-B6 measurement windows; its process is alive and resource preflight passed. No ladder/10k result is claimed. The 10k pair has not started.


Progress at 2026-11-10 08:00 UTC: the complete s6 pair is DONE. Ladder: 960,817 reads, all correct, zero errors/violations, O-REPLAY PASS, no saturated measured phase. All six maintenance counts are 1. Indexed P4 depth sample counts are 46,763 / 45,757 / 43,309; mean / p50 / p99 depth10-to-depth1 ratios are 1.0918 / 1.1207 / 0.9635. The p99 bar alone remains authoritative. Main burst ELU is 0.3143 (target below 0.5). L256 reader ELUs are 0.8573 / 0.8346 / 0.8407, read gateway CPU 183.0%; three reader workers therefore remain the selected plan. Median driver-owned burst time is 3.119 ms; transact span median 17.535 ms still includes SDK and store work.

Every saved 2,000-subject bar, miss amount, correctness counter, phase goodput/latency/feed lag, engine CPU and per-commit breakdown is in [tx2-dxh4-s6-TABLES.md](tx2-dxh4-s6-TABLES.md). The read p99 at L256 is 659.455 ms (559.455 over the 100 ms bar); matched writer p99 ratio is 2.6029 (1.3529 over 1.25); P3 L256 lag p99 is 520.191 ms (270.191 over 250). P2 bands and P4 quota throughput also miss; all original commit-accounting, RYOW, duplicate/lost-ACK and feed correctness checks pass. P5 remains fetch-only. These are diagnostic observations, not acceptance.

The 10k pair (`tx2-dxh4-r1`, three readers) is queued through heavy.mjs. At 08:00 UTC all four heavy slots were occupied by DX-H5 and DX-B6 jobs. Its baseline and ladder have not started. SHA manifests and the final combined report remain pending; this intermediate commit preserves the completed small result rather than claiming the task is finished.
