Run the prepared server comparison from commit `4054f548469e57b6aa82b06e93711c39b6867f7c`.
Pinned reads now reuse cached replies while checking for erasure.
The warm reply was 1,428 bytes with or without the guard, even after another person was erased.
All thirteen native erasure checks passed, including restore from an old backup.
The Mac controls drifted, so the read and save timing targets still need bare metal.
The new comparison uses a sealed seed and an unguarded control, with 500 verified saves in each block.
Across three Mac sizes, one fresh value took 38 to 80 milliseconds p99 to erase. A batch of 100 took 114 to 211.
Cleanup still slowed saves. A protected save added about two to three milliseconds at the median.

# DX-ERASE1 · What erasing a person costs

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Part 3 started with one ordinary Mac token and paired diagnostic traces. Forced inline replies added about 38 KB and 5.21 ms of median SDK decoding. The save shift concentrated in first-byte and native commit waits. The median lock acquisition was 0.08 ms. Six local cache tests reproduced stale or mismatched reference use on the starting code. [Stage attribution, predictions and evidence audit](PREDICTIONS-PART3.md)

The candidate binds cache references to the pin and erasure sequence, and verifies the save frontier once under the existing lock. The six cache checks, thirteen native checks and exact Reach reply-byte comparisons passed. Timing ratios and surrounding controls are diagnostic. The one-database writer fit, shared authority, cleanup comparison and server update remain open. [Guard change and evidence](GUARD-PART3.md)

Part 2. [Regression tests and red evidence](REGRESSIONS.md) · [Ledger implementation, latency and receipt audit](LEDGER.md). The guarded Mac run verified all thirteen checks, including the joined stage race, actual backup restore, and the erased-SSN task. Save request bodies stayed at 7,442 B. Save p99 rose 1.73× and pinned read p99 rose 5.28× in the matched Mac comparison. Forcing full read responses accounted for the increased wire bytes.

[Detached envelopes and Mac measurements](FAST.md). The prototype publishes before native cleanup. The largest cleanup block exceeded the 1.25× save budget against both controls. Key-store rotation and physical scans remain open.

The two layout branches reviewed the erasure work. W1 ported the regression and identified the clear copies in K. COMPACT1 implemented detached envelopes with a test vault. [Current copy inventory and requirements](HANDOFF-PART2.md)

The prepared comparison adds both removal-check phases and their surrounding control blocks. The small Mac smoke verified 2,500 saves, the pinned reads and the sealed value's marker. The detached publication and cleanup study remains available as a separate check. [Server commands and predictions](MODEL.md)

Part 1 measurements and handoff follow.

1. [Original native erasure path](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
2. [Three Mac sizes](SCALE.md) give native clocks, index rewrites, paired latency blocks and measured PostgreSQL byte changes. [Method and receipt audit](METHOD.md) · [Evidence](SCALE-EVIDENCE.md)
3. [Batch, import and Publish](OVERLAP.md) covers 10 and 100 people, three import frames during the job, late replay, and a Publish held across the erasure barrier.
4. [Forecast and prepared server command](MODEL.md) gives 4–12 s to fresh absence at 16M indexed facts and 0.7–33 min after a year across ten accounts. The ten-account estimate is sensitive to a storage scan. Server validation remains open.
5. [Requirements for DX-W1 and DX-COMPACT1](HANDOFF.md) sets proposed publication budgets of 100 ms p99 for one person and 1 s p99 for 100, with zero Datomic index jobs on the request path.

The Mac results are diagnostic. The original Part 1 paired scale blocks each contain 500 saves, with 5–115 entirely within the index jobs. The local fixture-resume smoke checked the recorded seed and both excision arms. The original Part 1 experiment predates the verified SSN rule in Part 2.

The replica, notice and joined-Publish tests use the integration versions in their bound revisions. The later settlement and worker-copy paths in INT1, general protected query semantics and production key custody remain open.

The server launcher passed syntax, lint, focused typing and local argument preflights. The evidence hashes and removal of all three private stacks were verified. Acceptance files and hash-pinned paths are unchanged.
