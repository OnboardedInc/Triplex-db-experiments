These rate measurements predate the audit fix for affected membership. They measure sending and quiet-window recipe admission. The full-roster fallback can add work after ordinary saves.

The live database recorded the release recipe in one transaction. Quiet-window admission took 21–68 milliseconds.
Scheduled breaks accounted for 78.5 of the old dispatcher's 97.8 seconds to send 1,000 notices for 10,000 people.
Writing progress and acknowledgements to the live database was the next largest cost. Running the rules took about 1.5% of the traced run.
The recipient now saves delivery and progress together. A retry resumes the saved position and uses each person's existing sequence.
The new dispatcher sent 338 notices per second in two short tests. The slowest reads exceeded the agreed limit at that speed.
The longer Mac run with 64 readers sent 46 notices per second within both relative limits. Saves were already taking seconds in its controls.
For the broad release that owes 9,798 notices, the deep workload points to 35–55 notices per second, about 3–5 minutes to finish sending.
All timings so far are from the Mac. The server dispatcher has never run.

**1. Cost of one delivered notice** · [Targets](../../../TARGETS.md) · [Part 2 measurements and recovery audit](PART2.md)

The earlier 1k trials paused 32 times for 100 ms, accounting for 3.20 s of 6.07/4.82 s (53%/66%). The fresh Mac traces used four pinned readers, 1.6 saves/s, 64 subjects per batch, a cold worker, FULL SQLite and 20 ms between turns. The 1k/10k arms sent 100/1,000 R2 notices after establishing R1. All effects and sender and recipient states matched Python W0.

| Per notice                                | 1,000 subjects | 10,000 subjects |
| ----------------------------------------- | -------------: | --------------: |
| Source / recipient durable transactions   |    .320 / .160 |     .314 / .157 |
| Source / recipient pinned calls           |   1.780 / .320 |    1.729 / .314 |
| Source HTTP exchanges / W0 kernel calls   |     2.750 / 10 |      2.672 / 10 |
| Source HTTP request / response body bytes | 9,060 / 17,347 |  8,981 / 17,320 |
| Source / SQLite logical operation bytes   |      872 / 773 |       865 / 769 |
| Business payload / encoded delivery bytes |       39 / 308 |        39 / 308 |

At 10k the 19.64 ms/notice split into measured sleep 6.779, source checkpoint 3.770, source metadata reads 2.891, source ACK 1.736, cold start and residual 1.488, foreground grants/IPC .805, receiver commit .775, pinned world .430, sender sequence ledger .412, rule evaluation .298, receiver state/receipt reads .189 and publication/packing .066. These exclusive intervals sum to elapsed wall time. SQLite operation bytes are logical input. HTTP counts both body directions and excludes headers.
Sequence numbers come from the live sender ledger. The receiver checks its own stored sequence before applying a packet. The 314 source commits spent 2.87 ms total in the client send-order wait and 9.08 ms before the gateway predecessor was ready. The 2.40 s from native submission to peer completion includes service as well as queueing.

**2. Which constraint mattered**

- **(a) Shared writes.** The source used .314 transactions/notice. At 1,000 notices/s that would demand 314 transactions/s from the live writer. Native JFR joined all 314 commits by trace and parent, with at most .081 ms clock uncertainty. Before, inside and after the transaction function took .640, .438 and 1.322 ms/notice. Zero pre-function time overlapped an earlier live save. Foreground admission had yielded .805 ms/notice. In the reverse direction, 13.24 ms across 32 saves overlapped earlier dispatch commits before function entry, including 1.56 ms of their functions.
- **(b) Evaluation.** Ten whole-world W0 calls per notice covered 11 rule families each and consumed 1.52% of wall time. Pinned world reads, sender ledger reads and packing raised that to 6.14%. Source metadata reads added 14.72%.
- **(c) Receiver.** Its commit consumed 3.95% and receiver state reads .96%. Source checkpoint and ACK writes together consumed 28.04%. Both dominant costs were outside the receiver.
- **(d) CPU.** The no-dispatch control used .066 of three slot cores and the VM was 1.44% busy. With dispatch the slot used .492 cores, the VM was 7.19% busy and the quota throttled for zero seconds. Neither window exhausted the VM. With no live traffic or intentional pause the original dispatcher reached 85.27/s. An initial idle control that waited for disabled saves was discarded.
- **(e) Live latency.** At 50.92/s, read p99 broke first at 26.40 vs 6.72 ms (3.93×). Save p99 was 46.71 vs 34.61 ms (1.35×), with 32 matched saves. The p99 read spent 26.01 ms in HTTP, including .51 ms of reported gateway work. An earlier 1k shared-stack run broke the save limit first (3.29× vs 1.32× reads). A noisier Mac control let 58.34/s meet both ratios. In that socket repeat every pinned sample had zero basis waits. Matched slow reads spent a median 93%/98% waiting for first byte with dispatch/without, with transport and gateway scheduling unresolved within that interval.

**3. Changes and alternating comparison**

Enrollment registers one recipient generation once. Publication still writes four changes. The sender ledger, effects, deduplication and cursor commit together at the recipient. A lost reply reopens that cursor. A racing save or rollback joins the existing debt in source order. Erasure preserves owed bytes or makes the attempt retry. Native LAZY `3d3c05d7` and DELTA `d8a92135` applied all 133 and 134 oracle effects in two and four packets, including pay sequences 1–4.
The active order was A, B, C, C, B, A with fresh accounts, matched offers, no-dispatch controls at both ends and the same 20 ms pause. A checkpoints 64 subjects at the source. B moves that checkpoint to the recipient. C checks 1,024 subjects there, in pairs of pinned reads.

A delivered 54.99/55.49 notices/s, B 102.75/106.26, and C 338.53/338.01. Per 1,000 notices, source/recipient transactions fell from 314/157 to 0/157 to 0/10. Scheduled breaks fell from 6.28 s to .20 s. A met both limits against both bookends. B met the later control only. C missed a limit against each control and had five saves per run. The longer paced 10k comparison stayed unadmitted in the shared lab.
In the profiled 1k pair, 100 deliveries generated 1,802 SQLite WAL frames in 16 commits versus 510 in one. WAL bytes per notice fell from 74,243 to 21,012. The total time committing at the receiver was 86 and 88 ms, now with ledger work included. Source pinned calls fell from 178 to 38. Datomic slot-wide block writes were 5,533,696 vs 0 bytes observed. Deferred flushes can land outside the capture.

**4. Prediction for a dedicated server**

Predict 350–550 checked subjects/s per worker with 64 readers on a separate gateway if it restores the four-reader deep service time. That probe checked 471/s and delivered 282 notices/s over three releases. Pinned reads took 49% of 6.38 s and returned 105 MB. Rules took 1.7%, receiver commits 18%. With 64 readers sharing the Mac writer gateway, the nine-release run sent 4,791 notices at 46.2/s and checked 86.8 subjects/s. It yielded to saves for 58.6 of 103.7 s. Against both controls, read p99 was 1.04–1.11× and save p99 was .96–1.06× (188 matched saves per comparison). Absolute p99s were 96 ms and 2.46 s.
For both tails within 1.5×, the predicted range is 35–55 notices/s at 9.798% density or 280–440/s at the local deep R2 density of 79.9%. The gateway isolation assumption needs the server comparison. The 14 ms cadence nominally caps a worker at 1,143 subjects/s. At 9.798% density, 1,000 notices/s would need about 10,200 evaluations/s or a selector that skips unaffected subjects. P5 needs 500 saves per side. This command measures one diagnostic pair.
Command on the dedicated server, after review. `DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/notify1/bench.ts launch notify-rate-001 recipient 16 14` uses an exact 1,000-person preflight before the 100,000-person traffic pair. The local plan was checked. [Runner](bench.ts)

**Evidence audit**

The prior budgets come from the hash-verified paired raw windows in the part 2 manifest. The detailed probe binds every run to its source, exclusive slot, nonce, input bytes and native release receipt. Each active arm checks complete ordered effects and every sender and recipient state against Python W0. The store observer checks pinned cuts, original transaction IDs and returned positions. Relay checks the registered recipient identity, original range, erasure barrier, prior item state and cursor before its atomic effect commit. Its lost-response test overlaps a save, rollback, erasure and concurrent recovery and checks the entire result against Python. The native join checks the JFR file digest, trace and span parents, source tree, guest boot clock and complete matched commit set. The control comparison checks all offers and fixed read schedules. The budget reducer checks raw file hashes, receipts, pinned code, packet counts and coverage of every observed HTTP request. [Rate evidence](RATE-SHA256SUMS)

**Part 5. Native comparison on matched compact traffic**

The account had 10,000 people and four readers. Nine consecutive release changes overlapped an open-loop save every 32 ms. Each active arm used a fresh scope, delivered the full Python-verified 6,336 release notices and was priced against matching offered prefixes from both controls. The test counted live completions inside the window and kept offered-to-ACK times for all matched saves.

| Arm in order | Notices/s | Live reads / saves | Read p99 / closing and opening ratios | Save p99 / closing and opening ratios |
| --- | ---: | ---: | ---: | ---: |
| Shared | 222.00 | 1,903 / 891 | 13.57 ms / 1.41× and 1.65× | 168.42 ms / 0.69× and 3.09× |
| Separate | 211.66 | 1,996 / 935 | 11.67 ms / 1.19× and 1.39× | 309.44 ms / 1.38× and 5.90× |
| Separate | 261.57 | 1,615 / 756 | 9.69 ms / 1.06× and 1.14× | 86.80 ms / 0.33× and 1.53× |
| Shared | 277.36 | 1,523 / 713 | 12.54 ms / 1.37× and 1.48× | 100.28 ms / 0.38× and 1.76× |

The control bookends disagree on whether either route reaches the 1.5× limit consistently. The separate peer moved read p99 down in both repeats. On these windows at most six of an arm's fifty slowest saves overlapped a writer gateway pause. The archival deep run with fifty GC-related tails came from a different workload. [Part 5 evidence](PART5-SHA256SUMS)

**Part 5. Shared-floor cost at 100,000 people**

The same fixture would owe 3,685 notices. At 1,024 people per group the census produces 98 recipient commits with 7,957 logical changes. The ordered set produces four with 7,394 changes. Both use six source edits at the save and zero source writes during dispatch. Scaling the measured 10,000-person drain gives about 16 seconds for the census and 39 seconds for cold ordered replay on a comparable stack. The 16-offer samples show neighbouring saves can stall behind cold replay. They are too small to forecast a save p99 at 100,000.

**Part 5. Time per delivered notice**

| Exclusive elapsed ms per notice | Earlier deep sample, 1,797 notices | New separate-gateway repeat, 6,336 notices |
| --- | ---: | ---: |
| Source selection and metadata | 0.317 | 0.499 |
| Pinned source data | 1.416 | 0.656 |
| W0 evaluation and initial payload | 0.061 | 0.296 |
| Test recipient state reads | 0.014 | 0.085 |
| Test recipient commit | 0.623 | 0.842 |
| Waiting for live-save opportunities | 0.357 | 0.819 |
| Pacing, startup, local packing and other elapsed time | 0.760 | 0.627 |

The deep sample issued 394 pinned source calls, returned 105.44 MB and evaluated 3,000 people. That is about 35.1 kB per person checked. At 16.5% notice density, a thousand notices per second through the same full scan needs about 6,060 checks per second and 213 MB per second of source replies. The separate compact repeat evaluated 90,000 people over nine changes. It spent roughly one fifth of elapsed time waiting for foreground saves. The recipient commit in both rows includes SQLite's simulated application effects and product ledger/cursor writes. External endpoint or queue latency was outside these runs. [Rate evidence](RATE-SHA256SUMS) · [Part 5 evidence](PART5-SHA256SUMS)

**Part 5. Cold copy with native deep inputs**

Both arms started a fresh sender on its own read peer, checked 1,000 people and delivered the same 799 oracle effects from one release. Both grouped those deliveries in one recipient transaction and used zero source writes. The reference sent 140.47 notices/s and elapsed 5.69 s. The copy sent 173.64/s and elapsed 4.60 s. First effect was at 5.66 and 4.57 s respectively. The four readers completed 3,902 and 3,715 reads. Only eight and six saves finished, so these two short runs price the work.

| Exclusive elapsed ms per delivered notice | Separate peer | Cold copy on separate peer |
| --- | ---: | ---: |
| Selecting people and binding the cut | 0.174 | 0.070 |
| Pinned source data or copy capture | 4.917 | 3.608 |
| W0 evaluation or local worker visit and evaluation | 0.050 | 0.601 |
| Assemble payload and ledger changes | 0.030 | 0.022 |
| Read the test recipient ledger and check the receipt | 0.052 | 0.053 |
| Test recipient commit | 0.440 | 0.421 |
| Local effect acknowledgement | <0.001 | <0.001 |
| Yield to saves | 0.098 | 0.003 |
| Startup and other elapsed time | 1.356 | 0.981 |

The copy took 16 pinned bulk pages and seven other pinned source reads. It transferred 5.27 MB and packed 22.42 MB into the local source image. The reference took 54 pinned reads and transferred 35.13 MB. The copy evaluated 799 worlds. The rules used 75 ms summed across workers. Worker time includes walking the copied entity graph and starting four threads. The 799 notices carry 31,161 payload bytes and 246,093 bytes with the envelope in both arms. The recipient replayed the sequence against its live ledger before acknowledging. SQLite's local transaction includes test application state, deduplication, cursor and the stored range. The reported acknowledgement is local IPC. Customer transport and processing remain unknown.

The cold capture took 63% of sender wall time. Its measured ceiling alone was roughly 347 people checked per second, or 57 notices/s at 16.5% density, before evaluation and delivery. Reaching 600–900 notices/s with this full capture would need 3,636–5,455 people per second. The gap is 10–16× in source capture alone. Both runs shared a three-core slot, which averaged 1.40 and 1.23 busy cores with zero recorded throttling. A pinned copy removes per-person remote payload reads after capture. A first-seen deep release still pays for bulk source access. [Part 5 evidence](PART5-SHA256SUMS)

**Part 5. Reusing the copy across a compact release train**

The 1,000-person run reused one cold image across 43 consecutive release changes while four readers and 32 ms save offers stayed active. The full oracle matched the 100 people selected per release and their complement. Across the train it delivered 2,914 effects at 139.81/s. The worker scanned 5,200 compact worlds and evaluated 4,300. The live window completed 1,390 reads and 650 saves. Both control prefixes completed 1,390 reads and 651 saves on the same offers.

| 20.84 second window | Read p99 | Save p99 |
| --- | ---: | ---: |
| Copied sender | 31.26 ms | 199.81 ms |
| Opening control, matched prefix | 10.75 ms / 2.91× | 65.76 ms / 3.04× |
| Closing control, matched prefix | 5.66 ms / 5.52× | 31.45 ms / 6.35× |

The copy cost 70 ms once. Starting worker threads, walking the local data and evaluating cost 14.15 seconds altogether. The rules used 0.70 seconds summed across workers. Packing cost 0.15 seconds, the 43 test recipient commits 2.44, yielding to foreground saves 1.93 and acknowledgements 1.46 ms in total. No writer or sender gateway GC pause overlapped the 50 slowest reads or saves. The trace could not uniquely join the p99 read to an HTTP request. The foreground cost of the extra worker activity remains unresolved. [Part 5 evidence](PART5-SHA256SUMS)

**Part 5. Before the server run**

For one cold 100,000-person deep release, allow 200–333 seconds to capture the source at 300–500 people per second. This range assumes the dedicated server peer can reproduce the Mac's 347 people per second with 64 foreground readers. Allow roughly 30–50 more seconds for local processing and 7–12 for the grouped ledger and effect commits at 16.5% notice density. These assumptions put 16,500 notices at about 40–70/s, or 4–7 minutes. At a million people and the same pace, 165,000 notices take 39–69 minutes. The million-person estimate also assumes sufficient memory. The image alone projects to 2.24 GB at 100,000 and 22.4 GB at a million before transient copies and process overhead. The server's deep fixture is denser at 79.9%, so the same model with more recipient work predicts roughly 190–300 notices/s for that fixture. A real recipient may impose a lower rate.

The forecast is conditional on read and save p99 staying within 1.5× their matched control. The Mac checks leave that condition open. The compact release train tests reuse and live latency. It cannot substitute for a single cold deep release. The server command starts with fresh exactness checks and emits the rate and both tail ratios, with a minimum of 500 completed reads and saves per arm for the latency result. [Runner](bench.ts)
