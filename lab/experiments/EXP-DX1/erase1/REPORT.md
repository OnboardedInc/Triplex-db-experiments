The merged code let a reader, an import and a Publish keep using erased data.
The new ledger closed all three paths in the integration tests, including a reader on an old pin.
The replica, journal, feed and notice routes also honored the ledger in those tests.
The restored backup refused reads until it caught up, then showed the erased marker.
Across three Mac sizes, one fresh value took 38 to 80 milliseconds p99 to erase. A batch of 100 took 114 to 211.
One person with 416 protected versions took 257 milliseconds at the largest size.
Cleanup still slowed saves. A protected save added about two to three milliseconds at the median.
The prepared 100,000-person server check should take 3 to 12 minutes after loading the data.

# DX-ERASE1 · What erasing a person costs

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Part 2. [Regression tests and red evidence](REGRESSIONS.md) · [Ledger implementation, latency and receipt audit](LEDGER.md). The guarded Mac run verified all thirteen checks, including the joined stage race, actual backup restore, and the erased-SSN task. Save request bodies stayed at 7,442 B. Save p99 rose 1.73× and pinned read p99 rose 5.28× in the matched Mac comparison. Forcing full read responses accounted for the increased wire bytes.

[Detached envelopes and Mac measurements](FAST.md). The prototype publishes before native cleanup. The largest cleanup block exceeded the 1.25× save budget against both controls. Key-store rotation and physical scans remain open.

The two layout branches reviewed the erasure work. W1 ported the regression and identified the clear copies in K. COMPACT1 implemented detached envelopes with a test vault. [Current copy inventory and requirements](HANDOFF-PART2.md)

The prepared 100,000-person check now measures detached publication and paced cleanup. The forecast uses all three sizes. [Server command and prediction](MODEL.md#prepared-detached-erasure-check)

Part 1 measurements and handoff follow.

1. [Original native erasure path](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
2. [Three Mac sizes](SCALE.md) give native clocks, index rewrites, paired latency blocks and measured PostgreSQL byte changes. [Method and receipt audit](METHOD.md) · [Evidence](SCALE-EVIDENCE.md)
3. [Batch, import and Publish](OVERLAP.md) covers 10 and 100 people, three import frames during the job, late replay, and a Publish held across the erasure barrier.
4. [Forecast and prepared server command](MODEL.md) gives 4–12 s to fresh absence at 16M indexed facts and 0.7–33 min after a year across ten accounts. The ten-account estimate is sensitive to a storage scan. Server validation remains open.
5. [Requirements for DX-W1 and DX-COMPACT1](HANDOFF.md) sets proposed publication budgets of 100 ms p99 for one person and 1 s p99 for 100, with zero Datomic index jobs on the request path.

The Mac results are diagnostic. The original Part 1 paired scale blocks each contain 500 saves, with 5–115 entirely within the index jobs. The local fixture-resume smoke checked the recorded seed and both excision arms. The original Part 1 experiment predates the verified SSN rule in Part 2.

The replica, notice and joined-Publish tests use the integration versions in their bound revisions. The later settlement and worker-copy paths in INT1, general protected query semantics and production key custody remain open.

The server launcher passed syntax, lint, focused typing and local argument preflights. The evidence hashes and removal of all three private stacks were verified. Acceptance files and hash-pinned paths are unchanged.
