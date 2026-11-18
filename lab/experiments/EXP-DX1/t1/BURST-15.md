North star. Attribute the P2 ACK tail before changing the workload or engine.

The saved November 17 zero-reader v3 arm raised all-primary p99 to 109.129 ms [98.766,120.832], n=38,826. Its first 900 seconds reproduce H's 7,408 command identities, subjects, fact counts and scheduled offsets. That prefix scored 42.084 ms [37.941,46.877], compared with 50.281 ms in H zero and 48.242 ms in H loaded. Both H arms were smoke and summary traced at `f846bcd7`. H swap was 4.017 GiB, Mac non-VM CPU p50/p99 was 15.0/96.1% zero and 13.7/85.2% loaded. November 17 `e2f92c31` used summary, swap 4.417/4.581 GiB and CPU 13.0/100.6% at p50/p99. CPU is the saved process gauge. No qualified Mac–guest clock bridge identifies particular host jobs inside a burst. These are historical observations, with no same-session speed comparison across H and v3.

| Offers | Bursts × duration | Realized burst rate | Burst share of primaries | Over 50 ms burst + steady |
| --- | --- | --- | --- | --- |
| H prefix, zero / loaded | 2 × 60 s | 54.37, 54.73/s | 6,546/7,408 (88.36%) | 50+25 / 45+22 |
| November 17 zero | 10 × 60 s | 53.25–56.82/s | 33,073/38,826 (85.18%) | 860+38 |

Every burst contributes. The counts above 50 ms in order are 23, 28, 29, 26, 50, 131, 171, 86, 136, 180. Six burst p99s exceed 50 ms and the last five contain 704 of the 860 burst outliers. Steady p99 is 38.617 ms. The 109 ms is a late-run tail exposed by the longer v3 window. Its burst fraction is smaller than H's. There is a real absolute miss and no evidence of a regression on the identical 900-second prefix.

| Region | Slow / all | Total slow ACK wall s | Writer queue | Node work + GC | Socket/network | Gateway + peer calls | Peer wait |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Steady | 38/5,753 | 3.788 | 0.310 | 0.183 | 0.147 | 0.416 | 2.730 |
| First second of burst | 31/539 | 2.522 | 0.481 | 0.077 | 0.085 | 0.080 | 1.797 |
| Middle 58 seconds | 822/31,967 | 146.719 | 75.289 | 11.930 | 29.704 | 1.706 | 28.071 |
| Last second | 7/567 | 0.460 | 0.006 | 0.026 | 0.012 | 0.007 | 0.409 |
| All burst | 860/33,073 | 149.701 | 75.776 | 12.031 | 29.801 | 1.794 | 30.276 |

Clock is scheduled offer to delivered ACK, clipped before attribution. All 898 slow roots plus the 2,149 L256 band roots joined sealed writer rows and request descendants by source, slot, Linux boot, trace, span parent and original operation/command hashes. Layers are exclusive. Rounding and 0.025 s uncovered account for the residual. TS work includes the SDK. The socket column includes client callbacks. Summary cannot split transactor, storage and peer wait. Per-commit summed overlaps count the same stall once for each affected commit.

Burst queue is 50.991 s scheduler lateness, 24.710 s same-subject waits and 0.076 s dispatch. No slot wait occurred and the writer peaked at 23/32 in flight. Attributed queue + Node work is 58.7% of burst slow wall, with 19.9% network/callback and 21.4% observed product gateway + peer. Main-thread GC overlapped 20.537 s of scheduler late time. Empty broadcasts overlapped 3.777 s before offers plus 0.523 s before gateway receipt. There were 59,048 broadcasts, zero messages and a 277 ms maximum. Those broadcasts explain some late arrivals and do not account for all of them.

Worst `5905feee8da6a3b30000000000015668` took 740.960 ms. It spent 408.550 ms in socket queue/write and 210.419 ms staging, with the server seeing the request 408.582 ms after socket invocation and 0.032 ms after the Node finish callback. Main-thread counters across the offered request span showed 696.399 ms running and 7.808 ms runnable. The gateway's peer wait was 53.643 ms. Across 860 bursts, 6.039 s of the socket column belongs to exclusive queue/write spans. Socket trace timing cannot distinguish kernel/guest network wait from other work on the sending thread. For the steady and leading-edge peer tail, the first experiment is full native apply/WAL wait/JFR on an intact matched burst at fixed placement.

RYOW remained exact for 38,826/38,826. p50/p90/p99 12.415 ms/24.642 s/325.059 s. There were 6,109 watermark fallbacks and at peak 1,378 queued or active, with four active. Trace `5905feee8da6a3b30000000000010227` began after its owner's ACK and waited 449.711 s to enter the observer worker. Its next same-subject commit `5905feee8da6a3b3000000000001024c` sent and ACKed in 16.205 ms during that wait. 20,006 commands both started and received ACK while a sampled >1 s pull was outstanding. The scheduler executes the dispatch synchronously then releases the slot without awaiting the pull. Dispatch p99 in the 3,036 selected roots was 0.126 ms, with 2.409 ms from ACK to finish. The pull backlog does not gate the next send or ACK. The trace cannot exclude indirect allocation/callback/core contention.

L256 at zero readers, n=1,261/682, small/medium median 9.343/11.071 ms (bucketed verdict). Median facts 7/18. The three largest named differences were peer wait 5.324→5.945 (+0.621 ms), SDK validation/staging 0.537→0.815 (+0.278), transact encoding 0.297→0.510 (+0.213). Gateway prepare/validate also adds 0.134. Raw medians differ by 1.752 ms, about 0.159 ms per extra fact at these band centres. The direction matches the per-fact hypothesis and the point is below 1.9–2.6 ms. Independent medians need not sum.

| 10k busy host, summary, one unchanged burst | ACK p50/p99 ms | Slow / 3,262 | Offer lateness p99 ms | Empty ticks | Swap GiB / CPU p50% |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before | 8.902/46.714 | 27 | 3.909 | 2,007 | 9.627/26.1 |
| Remove unused broadcasts | 9.951/110.842 | 85 | 7.419 | 0 | 9.557/35.4 |
| After | 11.955/86.399 | 109 | 8.363 | 2,005 | 9.268/52.1 |

One session, source `1573469e`, `tx2-dxt1-p15-burst-a-session`. The first burst does not reproduce the late retained history, and the bookends' 39.685 ms tail drift prevents a speed claim. The candidate retained all 3,420 correct receipt-pinned reads and zero expirations, as did both controls. With no subscribers the default omits the scan and no read consumes it. The historical variant is available only as a diagnostic, with v3 rejecting the override.

Audit. The diagnostic reproduces the sealed source/config, frozen first-burst command identities, exact writer clock and full RYOW readback for all three fresh owned arms. It checks scoped resource cleanup and original evidence byte seals. The forensic table derives only from exact historical attempts and does not issue a verdict. Raw observations and the exact programs are in `$EVIDENCE_ROOT/DX-T1/p15/` and the arm folders, anchored by [these checksums](BURST-15.sha256).
