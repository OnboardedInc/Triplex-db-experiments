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
