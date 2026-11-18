# 100,000 subjects in the bounded guest

All new native measurements are daytime busy-host diagnostics at summary tracing and early JVM compilation. The guest reported 16,732,606,464 bytes and eight CPUs. Arm CPU context is the existing non-VM process gauge in percent of one core. The normal v3 profile and the 10k resource defaults retain their original inputs.

## What changed

The fit diagnostic uses the full expected-state journal and reconstructs it after draining the readers and replica. The compact model builds canonical digests from command intent and receipt-bound assertion identities. It preserves each row's record visibility, valid interval, reference closure, stamp and complete original metadata in the comparison digest. The journal retains every seed, write and history command plus the original receipt, with length, sequence, compressed and decoded hashes bound to run, source and slot. The reader arm runs the same independent Python replay and sampled receipt check. This is full model checking plus the existing independent sample, whose size is shown below.

The first 16-GiB attempt reached a 5.25-GiB driver cgroup limit immediately after replica bootstrap and before the first measured offer. The exact container ID and guest boot ID match a kernel `CONSTRAINT_MEMCG` kill with 5,496,336,384 anonymous bytes. The lowest sampled whole-guest availability was 4.691 GiB. This was a different failure boundary from the guest-global OOM in part 14.

The retry shares the initial replica's fixed-width summary bytes in immutable slabs, builds its prepared index without a second full delta, and avoids temporary full-size image arrays. The initial dedicated reader still installed a second index and hit the 6.5-GiB driver limit during L4. The bounded reader now runs on the replica isolate with the same live index, a separate observation channel and the same read-gateway fallback. The ordinary reader still owns its own index. The fixture compares exact closure, values, metadata, valid-time boundaries and historical reads after an image crosses the worker wire and a live delta arrives. The 6.5-GiB driver cap comes from moving part of the Postgres, write gateway and transactor allowances inside the same 15-GiB aggregate grant. The 4-GiB writer heap ceiling and durable Postgres settings stay in force.

| 100k attempt | Reader shape | Terminal result | Driver peak/cap GiB | Lowest guest available GiB | Arm context |
| --- | --- | --- | ---: | ---: | --- |
| fit-zero-a | zero, first caps | cgroup OOM at follower bootstrap | 5.25/5.25 | 4.69 | swap 9.397 GiB / Mac CPU 58.0% |
| fit-zero-b | zero, compact journal and slabs | DONE, full model and feed | 6.50/6.50 | 3.28 | swap 8.755 GiB / Mac CPU 25.6% |
| fit-reader-b | separate reader isolate | cgroup OOM in L4 | 6.50/6.50 | 2.58 | swap 10.190 GiB / Mac CPU 263.1% |
| fit-reader-c | shared index, up to 64 | full model and feed, cgroup OOM on oracle return | 6.50/6.50 | 2.22 | swap 11.071 GiB / Mac CPU 256.5% |
| fit-reader-d | shared index, up to 64 | full model and feed, 15-minute oracle timeout | 6.50/6.50 | 2.46 | swap 13.651 GiB / Mac CPU 200.9% |
| fit-reader-e | shared index, up to 64 | missing feed witnesses and drained reader ACK | 6.50/6.50 | 2.95 | swap 15.948 GiB / Mac CPU 362.4% |
| fit-reader-f16 | shared index, up to 16 | DONE, full model, feed and independent oracle | 6.50/6.50 | 3.35 | swap 18.018 GiB / Mac CPU 309.2% |

The completed zero arm seeded 3,848,930 assertions in 998.0 s. Its 900-second offer window finished 8,532/8,532 with none expired. All 7,408/7,408 RYOW reads matched, and 10,421 feed entries replayed exactly. Existing zero-reader policy skips independent read samples. The journal retained 29,965 frames in 93,068,449 compressed bytes. The copied replica held 653,305,200 bytes. ACK-to-apply p99 was 831.487 ms, n=10,555, busy host (swap 8.755 GiB / Mac CPU 25.6%).

The completed 16-reader arm seeded 3,848,930 assertions in 1,647.6 s. It used 30-second levels at 1, 4 and 16 readers, then offered the rest of the 200-second window without readers. The burst began after the reader levels. It completed 3,705/3,705 offers with none expired, reconciled all 181,154 worker read attempts and 3,420 RYOW reads, and matched 184,574/184,574 reads. Every ladder level had a raw local oracle sample. The independent sample passed 27 reads and 2,425 entity queries, including receipt consistency. All three feed crashes fired and 3,529 entries replayed exactly. The journal retained 9,331 frames in 90,241,123 compressed bytes. The copied replica held 645,585,208 bytes. ACK-to-apply p99 was 13,828.095 ms, n=3,613, busy host (swap 18.018 GiB / Mac CPU 309.2%). No acknowledged position was left unapplied in either completed arm.

At the 16-reader run's kernel high-water samples, Postgres was 1.50/1.50 GiB, transactor 3.25/3.50 GiB, write gateway 1.21/1.75 GiB, read gateway 1.48/1.75 GiB, and driver 6.50/6.50 GiB. Limits sum to 15 GiB. The normal v3 settings keep their original resource policy. These observations establish a bounded smoke fit. A clean 64-reader return and scale performance limits remain open. Both completed stacks verified `fsync`, `synchronous_commit` and `full_page_writes` on.

## Missing feed witnesses under load

The 64-reader attempt E reached the final data position 5,712, and the feed checker stopped at 2,431. Positions 2,432–2,439 have committed writer receipts and are permanently absent from the drained publication sidecar. Each original transact returned HTTP 503 after the gateway's five-second peer wait. The client recovered by polling the original operation, and its transact-response observer had no source publication instant to capture. Trace `b6723f8a056288c10000000000000cd3` has 5,005.388 ms of peer wait, three receipt lookups and zero publication captures, busy host (swap 15.948 GiB / Mac CPU 362.4%). The report preserves the feed failure, missing drained reader acknowledgement and zero local oracle samples. Replacing the instant with the receipt lookup clock would change the lag measurement.

## Independent result transfer

The first shared 100k run completed all offers, full model comparison and feed replay. Its original driver remained ANALYSED after hitting the limit during oracle result return. The host had already produced the complete 1,457,478,842-byte result from the 298,163,661-byte case. The separately bound recovery compared 28 sampled reads across 1,396 entity queries, with zero differences and a passing receipt check. The failed attempt keeps its original status and bytes.

The next 64-reader attempt completed the model and feed checks without an OOM and hit the former 15-minute Python deadline before it produced a result. Cases over 128 MiB now receive 30 minutes of Python execution, with separate transport and caller deadlines. The bridge preserves subprocess errors.

The bridge transfers and hashes the whole result in bounded blocks, verifies the staged copy, then publishes it. For large results the driver scans the frozen output envelope and reads only the complete comparison fields. The original full output remains in durable evidence. The completed 16-reader run returned 1,463,389,889 verified bytes from a 298,339,324-byte case. Replay, transfer and comparison took 1,409.483 s, busy host (swap 18.018 GiB / Mac CPU 309.2%). Case digest, ordered unique envelope fields, query identities, query kind, row comparison, oracle exit and receipt-consistency verdict all remain checked. The frozen emitter's format, case digest and transferred result digest bind the comparison to this attempt.

## Follower reopen

The original scope-open route used four separate no-argument peer-sync call sites around independent metadata lookups. Part 14's trace `4ebdb8027cc0c87000000000000004aa` stopped in the third sync. Its three sync spans total 4,148.864 ms in a 4,233.414 ms HTTP 503 at full tracing, busy host, swap 15.725 GiB and Mac CPU 133.9% at arm median. Those are historical context from that arm.

The current route checks scope identity, mutable schema hash and immutable strict-clock/layout metadata on one freshly synced immutable cut. Bootstrap or metadata writes continue with their exact transaction `db-after`. A concurrent bootstrap loser retains the existing revalidation path. An initialized, matching scope needs one sync with the original two-second deadline and zero writes. Database creation and connection setup are outside that sync deadline and remain subject to the client setup request deadline.

The normal 1k reader smoke returned 200 on 16/16 reopens. The completed 100k zero and 16-reader runs returned 200 on 14/14 and 16/16. Every request had exactly one sync and zero metadata writes. In the loaded 100k smoke, the slowest reopen `473cacd491eac66a0000000000000001` took 6,070.932 ms, including 4.323 ms in sync, busy host (swap 18.018 GiB / Mac CPU 309.2%). Connection and database initialization can still take seconds. The native gateway suite passed 25 tests and 53,997 assertions.

Private evidence and reproduction scripts are under `$EVIDENCE_ROOT/DX-T1/p15/`. The completed arms are [fit-zero-b](runs/tx2-dxt1-p15-fit-zero-b/INDEX.md) and [fit-reader-f16](runs/tx2-dxt1-p15-fit-reader-f16/INDEX.md), bound by [SHA-256 manifests](SCALE-15.sha256).

## Serial-point reads

The part 14 initial 49-commit windows rose from 1.408 to 3.265 SQL reads per commit and from 8.520 to 18.500 ms native apply p50 between 10k and 100k. Both were full tracing on the busy host. The 10k arm had 19.100 GiB swap and 245.8% CPU at the median, and the 100k arm 15.725 GiB and 133.9%. RE1 observed that cold reads cluster after adoption and that the transaction function still looks up row identity in historical AVET. The two proposed changes are priced in the report. Today's storage and query layout stayed in place. [Initial diagnostic](REPORT-14.md).

## Evidence audit

| Observation boundary | Content, freshness and binding |
| --- | --- |
| Stack admission and fit | Reject incompatible bounded-driver settings and require measured guest RAM and active-container budget. Inspect each actual cgroup limit and terminal state. Bind memory samples by holder, source, slot, driver container and guest boot. A max-limit sample alone cannot prove a kill or completed fit. |
| Packed bootstrap cut | Validate the existing replica closure and previous bytes. Preparation preserves buffer, slice and revision before a validated cut can become readable. Test exact values from a structured-cloned image before and after an update at crossed valid and record cuts. |
| Model and oracle | Restore the fresh sequence-bound journal and verify compressed and decompressed bytes. Compare full recorded-read denominators, exact feed replay and the existing sampled independent cases. Preserve zero-reader NOT-RUN. |
| Independent result return | Clear the previous output, use a fresh request nonce, validate request and response hashes, and atomically publish a matching staged copy. Readback ties the frozen oracle's verdict and receipt consistency to the exact case hash and complete query set. The recovery checks only its original source, slot, case and output and preserves the original terminal state. |
| Reopen proof | Count original matching HTTP 200 and sync spans bound to this run, source and slot. Long and fast scope opens use the same summary recorder. Inspect schema/clock behavior and no-write rule in native tests. |
| Future campaign | Before borrowing the lease, the child matches live owner PID, granted arm and role. Resize and restore read back the scoped guest and seed volume identities under the idle daemon. Physical resize, 256 readers, live activation and 24-GiB performance remain unverified. |

The 24-GiB controller's plan runs with Docker, Colima and Git stubs that fail if invoked. Shell syntax and exact-lease fixtures pass. The installed Colima version's start options supply the no-activation and no-save controls. [Colima v0.10.3 start command](https://github.com/abiosoft/colima/blob/v0.10.3/cmd/start.go).

The package build and 402 package tests passed. Bench-wide TypeScript errors remain in the untouched `audit-traffic.ts`, `hs01-seed.ts` and `round2.ts`.
