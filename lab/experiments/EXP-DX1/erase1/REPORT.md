# DX-ERASE1 · What erasing a person costs

Datomic took 0.56 to 3.39 seconds to remove selected values from new reads on the Mac.
Already-open snapshots still returned those values after the index job.
The largest run held nearly four million current facts and 415 real edits on its aged person.
At one million facts, one save took 1.38 seconds during the index job.
Garbage collection removed obsolete stored values. PostgreSQL freed disk space in a separate rewrite.
The save and Publish paths need a shared rule that hides erased values from every new read.

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

1. [How erasure works today](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
2. [Three Mac sizes](SCALE.md) give native clocks, index rewrites, paired latency blocks and measured PostgreSQL byte changes. [Method and receipt audit](METHOD.md) · [Evidence](SCALE-EVIDENCE.md)
