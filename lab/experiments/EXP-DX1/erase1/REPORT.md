# DX-ERASE1 · What erasing a person costs

Datomic first records the erase request, then removes the selected values during an index job.
A reader already holding the old database can still have the old value after that job.
The test in this branch's base erases a single value in a scratch database.
The save and Publish paths still lack a shared rule that hides erased values from every read.
The feed keeps identities, while the journal and outbox need their own coverage.
Old storage pages and the write-ahead log have separate cleanup clocks.

**North star** P1–P3 and P5. Measure pinned reads, save tails, replay and Publish during excision. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

1. [How erasure works today](READ-PATH.md) traces requests, pins, feed, journal, outbox, SQL storage and the missing publication frontier.
