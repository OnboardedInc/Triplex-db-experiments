# Importing beside live traffic
The earlier 4.72× result used only 60 quiet saves. The repeat had 540 per group.
All ten of the slowest saves arrived while a bulk frame was still outstanding.
The two slowest took about 132 milliseconds each. They spent 22 and 5 milliseconds waiting in the gateway queue.
The longer run found slow saves behind both bulk frames and long garbage-collection pauses.
The earlier fast loader still handles quiet loads and retries a lost receipt.
The shared-database test will now reduce frame size when a commit consumes too much of the latency allowance.
The Mac results are diagnostic. Server predictions and commands will be recorded before any server run.

In the archived 128-fact arm the client saw 269 frames with a median of 36.28 ms and a p99 of 170.39 ms. For nine of the ten slow saves, the outstanding frame's durable position preceded its save. One save committed before the outstanding frame. The historical native log was truncated to the final control arm.

The new 108-second bookends preserve the 50 offered saves per second, plus five quiet saves and five quiet pinned reads per second. Every published command still reconciles its full receipt and feed, and the importer verifies physical rows at the resulting pin.
- Audit. The historical analysis checks existing manifest hashes, source, nonce, slot and matching immutable receipt positions. Each new trace is produced by the live attempt's identified containers, checks the recording hash and run/source/slot, and keeps clock uncertainty for any host-to-guest overlap. The existing oracle and stack checks still guard claims, pins, physical rows, counts, identity and cleanup. No published contract pin moved.
- [Earlier loader report](PART3.md) · [Earlier predictions and commands](BENCH.md) · [Earlier attempt index](EVIDENCE.md)

The 108-second import produced 3,082 facts/s. Its quiet read/save p99 was 95.6/154.6 ms. The first control was 22.4/96.8 ms, and the post-import control changed sharply. Report the two controls separately. That drift made the pooled denominator misleading.
Across 2,775 native frames, exclusive hold p50/p99 was 15.6/69.2 ms, native apply 4.4/39.8 ms, writer log-path parks ≥5 ms 0/13.8 ms, and native log completion to peer return about 3.3/13.3 ms.
- Extended-tail examples. One 255 ms save overlapped a 228 ms bulk hold and 150 ms of transactor GC. A 248 ms save had no bulk hold and overlapped 145 ms of GC. Another 152 ms save overlapped a 119 ms bulk hold with 6.4 ms native work. The collector overflowed after preserving the native recording, all three offer tapes and completed row proofs. Gateway GC, preparation and precise index adoption could not be attributed from this attempt. Collection now transfers bounded chunks.
- The time-budget arm keeps whole subjects and one bulk receipt in flight. It stores the exact chosen boundary before sending, keeps W1's 96 stored rows and 64 KiB as hard caps, and reduces the estimated width when a dispatch-to-peer interval exceeds budget. The budget cannot preempt work already accepted. It refuses more work if even the minimum often exceeds budget.
- [Tail evidence checksums](PART4-SHA256SUMS)
