# DX-ERASE1 · What erasing a person costs

The newest integration code repeated the three leaks found in the first study.
The local replica and its older snapshot also kept showing the value.
The journal kept the old value, and the lean feed could not report the erase.
The notice sender put the old payload in the recipient's effect and ledger.
The joined Publish and restore fixtures needed another run after setup errors.
These tests check the same original assertion before and after the erase.

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Part 2. [Permanent regression tests and red evidence](REGRESSIONS.md).

Part 1 measurements and handoff follow.

1. [How erasure works today](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
2. [Three Mac sizes](SCALE.md) give native clocks, index rewrites, paired latency blocks and measured PostgreSQL byte changes. [Method and receipt audit](METHOD.md) · [Evidence](SCALE-EVIDENCE.md)
3. [Batch, import and Publish](OVERLAP.md) covers 10 and 100 people, three import frames during the job, late replay, and a Publish held across the erasure barrier.
4. [Forecast and prepared server command](MODEL.md) gives 4–12 s to fresh absence at 16M indexed facts and 0.7–33 min after a year across ten accounts. The ten-account estimate is sensitive to a storage scan. Server validation remains open.
5. [Requirements for DX-W1 and DX-COMPACT1](HANDOFF.md) sets proposed publication budgets of 100 ms p99 for one person and 1 s p99 for 100, with zero Datomic index jobs on the request path.

The Mac results are diagnostic. The paired scale blocks each contain 500 saves, with 5–115 entirely within the index jobs. The local fixture-resume smoke checked the recorded seed and both excision arms. The SSN-specific Publish rule and independent production review remain open.

The new JavaScript scripts passed the focused type check. The engine import graph reports existing diagnostics in the ACTV delta scripts. The base and this branch have the same 135 gaps in the repository-wide JavaScript coverage list.
