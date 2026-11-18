The bare-metal run still slows in the later bursts. Its all-commit p99 is 132.461 ms against the 50 ms bar.
Timing and Node work in the test tool account for 61% of the slow burst time, up from 42% on the Mac.
The sender heap grew from 478 to 1,494 MiB. Its garbage collection overlapped 14.6 s of delayed offers in slow bursts.
Hot subjects must still take turns. Their observed waits add 22.0 s, and the gateway and peer add 18.3 s.
Keeping those waits gives a projected p99 of 45.904 ms. Keeping all socket and callback time raises it to 55.744 ms.
The saved trace leaves room to reach the bar. The socket and callback time still needs a matched test.
North star P2 measures the time from a scheduled offer to the final receipt for each small atomic commit.
Scope, priority and bars follow [SCOPE](../../../SCOPE.md), [NORTH-STAR](../../../NORTH-STAR.md) and [TARGETS](../../../TARGETS.md).

| Server offers | Over 50 ms / all | Slow wall s | Late offers | Subject waits | Node/GC | Socket/callback | Gateway | Peer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Burst 1 | 7/3,262 | 0.418 | 0.002 | 0.044 | 0.009 | 0.004 | 0.005 | 0.354 |
| Burst 2 | 6/3,284 | 0.350 | 0.043 | 0.000 | 0.011 | 0.010 | 0.019 | 0.267 |
| Burst 3 | 18/3,195 | 1.145 | 0.392 | 0.019 | 0.041 | 0.045 | 0.018 | 0.630 |
| Burst 4 | 29/3,397 | 2.234 | 0.361 | 0.372 | 0.104 | 0.548 | 0.024 | 0.825 |
| Burst 5 | 64/3,409 | 10.091 | 4.936 | 1.088 | 1.083 | 1.103 | 0.103 | 1.772 |
| Burst 6 | 92/3,320 | 22.533 | 10.365 | 3.854 | 3.337 | 3.041 | 0.080 | 1.853 |
| Burst 7 | 115/3,401 | 31.527 | 15.445 | 3.277 | 6.248 | 4.146 | 0.093 | 2.308 |
| Burst 8 | 60/3,253 | 9.688 | 4.068 | 0.752 | 1.927 | 1.413 | 0.057 | 1.454 |
| Burst 9 | 64/3,313 | 14.709 | 5.022 | 1.764 | 3.202 | 2.960 | 0.100 | 1.654 |
| Burst 10 | 206/3,239 | 66.309 | 32.285 | 10.879 | 8.620 | 7.842 | 0.186 | 6.484 |
| Server bursts | 661/33,073 | 159.005 | 72.920 | 22.048 | 24.583 | 21.111 | 0.684 | 17.601 |
| Server steady | 32/5,753 | 2.627 | 0.181 | 0.000 | 0.317 | 0.203 | 0.091 | 1.833 |
| Mac bursts | 860/33,073 | 149.701 | 50.991 | 24.710 | 12.031 | 29.801 | 1.794 | 30.276 |

Server bursts 6–10 account for 537/661 outliers (81%), versus 704/860 (82%) on the Mac. Dispatch and uncovered time total 0.057 s in the server burst split. Slot waiting is zero.
(a) Main heap triples on both hosts. The server logged 23.7 s of main-isolate GC during offers. GC accounts for overlapping time in 14.6/72.9 s of late burst offers. Empty broadcasts overlapped another 3.3 s. Summary evidence does not identify the retained objects responsible.
(b) Burst main event-loop utilization averaged 24%, with 25/32 commits in flight at peak and zero slot wait. Sustained socket saturation is unlikely. 8.7/21.1 s of the socket/callback bucket lies in the queue/write span and per-request stalls remain plausible.
(c) The 22.0 s of subject waits include 129 commands whose waits alone exceeded 50 ms. Each wait includes the previous command's observed delays. Per-subject ordering remains part of P2.
(d) Peer wait takes 70% of server steady slow wall and 94% of the first-second burst slow wall. Gateway and peer alone exceed 50 ms on 188/38,826 commits, p99 33.955 ms. The summary does not isolate index adoption, Postgres or JVM GC.
Subtracting measured sender time leaves 470/38,826 above 50 ms. Removing the whole socket bucket too leaves 334/38,826. These are arithmetic projections on matched observed commands. They hold observed ordering waits fixed.
Server and Mac checked 38,826/38,826 receipt-pinned reads. Fallback peaks were 1,272 and 1,378 queued or active with four active, and the sampled longest waits were 268 and 450 s. The observer is asynchronous. Shared resource contention remains plausible.
All 38,826 rows on each arm join sealed source/slot/boot/clock, writer/native command and gateway-parent evidence. The frozen command cohorts match. Derived JSON and originating seals are indexed in [ATTRIBUTION.sha256](ATTRIBUTION.sha256).

The candidate uses `--expected-state-retention worker-journal` and `--receipt-capture replica-worker`. The bookends use `heap` and `sender`. The first option moves full expected-state capture off the sender. The second moves receipt reads, fallback callbacks and batched spill retention off the sender.
The Mac 1k smoke checked 59/59 receipt-pinned worlds including 15 real gateway fallbacks, with 0 expirations and 104/104 exact feed replays. Journal queue peak was 2/256 frames. The 10k candidate offered all ten bursts, then hit the extra 30-second observer deadline. The candidate now drains within the arm cutoff and records drain time. The retry uses the six-burst prefix.
Audit. The journal worker sequences fresh frames, seals readback bytes and restores them against run/source/slot/population and the submitted frame count. Receipt capture requires a fresh per-attempt spill ACK for every tuple, then joins each tuple to one actual ACK at its exact subject and basis. The same full digest, stamp and count checker judges every row.
The full server runner uses the frozen profile, original ACK definition and contract pins. Three targeted tests and reporter TypeScript checks passed. Bench-wide TypeScript reports existing errors in three untouched scripts.

[Server queue](queue.sh) takes a batch ID and UTC cutoff. It builds the exact checkout, runs three fresh 10k v3 zero-reader arms in old/new/old order, and writes checksummed bundles, per-second offer lateness, and `COMPARISON.md`. The plan and local refusal path were checked. Full bare-metal execution is pending the next bench window.
Audit. The comparison requires fresh controller timing and cleanup, same-source and same-build hashes, sealed write and report bytes, exact frozen offers including resends, full read and feed checks, and decoded journal hashes for the candidate. It recomputes the unchanged ACK bar and leaves failed arms unavailable.

| Mac at 10k | Primaries | ACK p99 ms | Sender heap peak MiB | Sender GC s | Offer lateness s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Saved two-gateway Mac, first six bursts (3,300 s) | 23,097 | 55.703 | 1,017.5 | 15.552 | 14.204 |
| Busy standalone Mac, new, six bursts (3,300 s) | 23,097 | 8,857.805 | 495.2 | 12.884 | 45.507 |
| Busy standalone Mac, new, matched 900 s | 7,408 | 12,404.595 | 265.7 | 3.939 | 20.662 |
| Busy standalone Mac, old afterward, matched 900 s | 7,408 | 144.858 | 507.5 | 3.402 | 4.145 |
The new arm matched 23,097/23,097 receipt-pinned reads and replayed 26,258 feed entries exactly. Capture and gateway fallback queues peaked at 2,248 and 2,138. Final drain took 498 s. The journal peaked at 12/256 frames. The old control matched all 7,408 reads with 174 peak fallbacks. Both had zero expirations.
Standalone trials used fresh scopes in one H2-backed slot. Starting non-VM CPU was 251% new and 84% old, with about 25 GB swap in both. Same-subject waits accounted for 82% of the new arm's slow wall. Sender heap fell, while GC and offer-lateness improvement remain unproven. Slot and locks released at 18:25. [Evidence checksums relative to the evidence root](MAC.sha256).
