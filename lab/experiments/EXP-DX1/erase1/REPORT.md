The merged code let a reader, an import and a Publish keep using erased data.
The new ledger made all three honor the erasure in the integration tests.
The replica, journal, feed and notice routes also honored the ledger in those tests.
The restored backup refused reads until it caught up, then showed the erased marker.
A detached-key test published one person's erasure in 78 milliseconds on the Mac.
It confirmed the key file was gone while the encrypted copy was still stored.
The small cleanup test slowed saves. The full timing blocks are queued.
The owner can still use old read pins and see which values were erased.

# DX-ERASE1 · What erasing a person costs

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Part 2. [Regression tests and red evidence](REGRESSIONS.md) · [Ledger implementation, latency and receipt audit](LEDGER.md). The guarded Mac run verified all thirteen checks, including the joined stage race, actual backup restore, and the erased-SSN task. Save request bodies stayed at 7,442 B. Save p99 rose 1.73× and pinned read p99 rose 5.28× in the matched Mac comparison. Forcing full read responses accounted for the increased wire bytes.

[Detached envelopes and native smoke](FAST.md). The prototype publishes before native cleanup. Mac timings describe this setup. Key-store rotation and physical scans remain open.

Part 1 measurements and handoff follow.

1. [How erasure works today](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
2. [Three Mac sizes](SCALE.md) give native clocks, index rewrites, paired latency blocks and measured PostgreSQL byte changes. [Method and receipt audit](METHOD.md) · [Evidence](SCALE-EVIDENCE.md)
3. [Batch, import and Publish](OVERLAP.md) covers 10 and 100 people, three import frames during the job, late replay, and a Publish held across the erasure barrier.
4. [Forecast and prepared server command](MODEL.md) gives 4–12 s to fresh absence at 16M indexed facts and 0.7–33 min after a year across ten accounts. The ten-account estimate is sensitive to a storage scan. Server validation remains open.
5. [Requirements for DX-W1 and DX-COMPACT1](HANDOFF.md) sets proposed publication budgets of 100 ms p99 for one person and 1 s p99 for 100, with zero Datomic index jobs on the request path.

The Mac results are diagnostic. The paired scale blocks each contain 500 saves, with 5–115 entirely within the index jobs. The local fixture-resume smoke checked the recorded seed and both excision arms. The original Part 1 experiment predates the verified SSN rule in Part 2.

The new JavaScript scripts passed the focused type check. The engine import graph reports existing diagnostics in the ACTV delta scripts. The base and this branch have the same 135 gaps in the repository-wide JavaScript coverage list.
