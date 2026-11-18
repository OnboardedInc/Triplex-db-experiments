The bare-metal run still slows in the later bursts. Its all-commit p99 is 132.461 ms against the 50 ms bar.
Timing and Node work in the test tool account for 61% of the slow burst time, up from 42% on the Mac.
The sender heap grew from 478 to 1,494 MiB. Its garbage collection overlapped 14.6 s of delayed offers in slow bursts.
Hot subjects must still take turns. Their observed waits add 22.0 s, and the gateway and peer add 18.3 s.
Keeping those waits gives a projected p99 of 45.904 ms. Keeping all socket and callback time raises it to 55.744 ms.
The saved trace leaves room to reach the bar. It cannot tell how much of the socket and callback time the driver fix will recover.
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
