# DX-R3 part 3 — NOT MET
North star: P1 pinned concurrency without blocking P2; lab/SCOPE.md, NORTH-STAR.md, TARGETS.md. Merged lane/d-native 8ecff788.
Measured 3289040b in one hold, 14:19–15:00 UTC: 10k subjects, four reader threads, engine PG/TX/W/R=0/1/2/3, client 4–7, 12 GiB/8 GiB heap.
The complete pending-rule pair finished but the loaded arm answered 0% locally. No successful local-read performance claim. Mixed pair was not run.
Final correction bca7bf81 is unit/typechecked only; all numbers below belong to the failed 3289040b candidate, not the corrected head.
| Bar | q7 before (3 threads, pending) | Failed full pair (4 threads, pending) | Mixed |
| --- | --- | --- | --- |
| Read p99 L256 <=100 ms | 5.215 | 2883.583 | not run |
| Correct/s L64 / L256 / L1024 | 43433 / 41782 / 49520 | 283.358 / 201.489 / 163.208 | not run |
| L256/L64 >=1; L1024/L256 >=.9 | .962 / 1.185 | .711 / .810 | not run |
| Recovery <=60 s | 35 | not recovered | not run |
| Commit p99 L256 / matched zero <=1.25 | 1.263 | 5.424 | not run |
| Commit p50 L256 5–10 / 11–25 <=10 ms | 12.095 / 11.583 | 27.647 / 34.559 | not run |
| All commit p99 5–10 / 11–25 / 26–50 <=50 ms | 103.935 / 97.279 / 84.991 | 30539.775 / 30670.847 / 30801.919 | not run |
| Burst p50 5–10 / 11–25 / 26–50, ms | 13.823 / 16.767 / 21.503 | 1146.879 / 1179.647 / 1171.455 | not run |
| Steady queue <=2.190 commands | 3 | 1 | not run |
| Sweep commit p99 / presweep <=1.5 | 174.211 | 3.717 | not run |
| Read violations/errors; oracle | 0/0; PASS | 0/0; PASS (24 reads, 1443 queries, 806 commands) | not run |
| Offered commands accounted/published | 7408/7408 | 760 unaccounted; 6673/7408 published | not run |
| Peak reader-process bytes | 4471099392 | 7917649920 (7.374 GiB) | not run |
Correctness: loaded 151,007/151,007 reads correct; zero arm 7,408/7,408. Accounting: 144,334 worker completions + 6,673 main reads = retained = judged.
Why/investigation: q7 had sweep beforeTransact p99 4944.624 ms while constructing/cloning the entire retained image on main; that startup now happens before trace.
The runtime follower already used R in q7; the W0 feedPeer:writer label described another path. The separate P3 verifier used W and now selects R for local reads.
The new worker opened an additional public runtime after seed. Its clock admission then declined every loaded read (unmapped-clock-or-closure plus timeouts).
Native-cut diagnostic at seed position 211: position page t=126906, record-time page t=127207/current head 7776. It does not prove when the initial mismatch arose.
Latest fix removes that post-seed runtime initialization: head and exact W fallback reuse the already-open parent handle; the follower remains explicitly bound to R.
Exact bootstrap proof now retries transient peer lag up to 2 s; unequal/absent native cuts still decline. The cause remains a hypothesis; retry is unit-tested and the native fix is unverified.
Design: one follower worker applies/packs/prepares every version; immutable SAB bodies and ordered deltas go directly to reader ports; RYOW executes against that worker index.
Lossless spill and phase histograms/counters run in their own worker; final expected-state checking runs only after traffic/all ACKs stop. No fact or read is sampled away.
Producer sequence/drain ACKs and attempted/completed/retained/judged totals guard finalization. Sweep worker is prestarted; gateway remains the default read path.
Window stays 20k positions / default 64 MiB; run explicitly 192 MiB. Unknown clocks/closures, old cuts or watermark expiry use the exact gateway fallback.
Failed run RYOW wait p50/p99=15.487/1892.351 ms; pull=362.495/7831.551 ms; all 6673 fallback. Worker RPC queue time is included in pull, not the inner watermark wait.
R acknowledgement-to-applied p50/p99=45.567/32636.927 ms; 7565/7565 positions observed, no missing positions. Controlled W-vs-R delay comparison was not run.
Writer thread per phase: utilization / longest event-loop timer delay ms (includes scheduling); RSS is loaded-arm GiB. Zero and loaded arms share the same source/flags.
| Phase | Zero ELU/max ms | Loaded ELU/max ms | Loaded RSS GiB |
| --- | --- | --- | --- |
| warmup | 0.045/87.8 | 0.060/59.1 | 1.664 |
| baseline | 0.026/22.7 | 0.035/143.0 | 1.623 |
| L1 | 0.028/29.8 | 0.030/25.5 | 1.866 |
| L4 | 0.355/66.5 | 0.640/328.7 | 3.452 |
| L16 | 0.467/280.5 | 0.970/751.3 | 4.453 |
| L64 | 0.032/11.5 | 0.191/72.2 | 4.868 |
| L256 | 0.032/14.8 | 0.171/94.8 | 5.014 |
| L1024 | 0.031/14.1 | 0.176/147.1 | 5.472 |
| recovery | 0.039/33.3 | 0.186/82.0 | 5.484 |
| p4mix | 0.035/28.9 | 0.095/62.0 | 5.477 |
| p4h1 | 0.035/34.4 | 0.088/59.6 | 4.356 |
| grow3 | 0.336/264.9 | 0.355/342.9 | 3.773 |
| p4h3 | 0.035/42.7 | 0.088/37.3 | 3.752 |
| grow10 | 0.446/376.4 | 0.463/331.9 | 4.327 |
| p4h10 | 0.033/23.2 | 0.088/55.1 | 4.141 |
| presweep | 0.038/114.9 | 0.230/373.6 | 4.797 |
| sweep | 0.038/49.3 | 0.700/1992.3 | 6.458 |
| tail | 0.447/1443.9 | 0.116/63.0 | not sampled |
The failed run still blocked main for 1992 ms in sweep and 751 ms in L16; moving follower work did not establish the requested few-ms bound.
P4 arithmetic unchanged: local-inclusive best P1 goodput divided by four engine cores is composition normalization; use client CPU/pull and separate replication/backend cost.
PASS audit: Replica/TimedSource/RecentReads check source bytes, original journal clocks, exact prefix/floor and VT/closure before local admission; private ports bind this run’s source/slot.
Prepared summaries and real lazy/RPC worlds bind every fact to immutable selected versions; typed structured-clone tests compare actual canonical bytes, not counts alone.
Spill checkpoints retain every tuple and ordered producer prefix in the fresh run directory; phase progress remains PENDING until unchanged judgeRead checks all ACKed R/V expectations.
ReaderLifecycle requires drained live/sweep reads and stopped ACKs; any worker error or attempted/retained/judged mismatch makes finalization ERROR; exit zero alone is not PASS.
Checks: 32 Node tests, focused driver typecheck, explicit worker-entry typecheck, focused lint and shell syntax pass. Acceptance unchanged; no edited pinned paths found.
Run: DX_STACK_EVIDENCE=<evidence> DX_READ_PATH=replica DX_DRIVER_MEMORY=12g DX_DRIVER_HEAP_MB=8192 DX_READER_THREADS=4 DX_CPUS_PG=0 DX_CPUS_TX=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=3
`node lab/bin/heavy.mjs --label DX-R3-p3-full-pending-a -- bash lab/experiments/EXP-DX1/h4/run.sh pair tx2-dxr3-p3pendinga --rung 10k --seed-batch-facts 2000 --replica-history-mib 192 --split-target pending`.
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/p3-full-pending-a.log.gz; p3-gates-o.log.gz; p3-clock-check-a.log.gz; raw zero/ladder driver outputs under tx2-dxr3-p3pendinga-*.
Lock wait consumed 11:32–14:19 UTC behind DX-S5; early diagnostic attempts were cancelled, one during seed. First outputs retained; no source captures/manifests added.
Open: native verification of bca7bf81, corrected full pending and mixed pairs, controlled feed/placement attribution and all missed bars. No independent review, root full check, push or promotion.
