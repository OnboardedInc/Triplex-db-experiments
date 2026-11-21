# The matched thin and deep tail

North star P2 scheduled offer to durable ACK. The sealed BM1 study used four 45-second arms in thin–deep–deep–thin order. Each offered 1,773 five-field replacements at 39.4/s to distinct subjects, with zero load readers and no history overlay. The same offer and intent hashes bind all four arms. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Where the slowest saves waited

| Pooled fifty, by ACK time | Peer wait outside own evaluation | Own SQL reads | Other evaluation | Writer outside peer wait | Sender or remaining client time |
| --- | ---: | ---: | ---: | ---: | ---: |
| Deep, after 2 s | 49 | 1 | 0 | 0 | 0 |
| Thin, after 2 s | 36 | 2 | 9 | 3 | 0 |
| Deep, entire window | 49 | 0 | 1 | 0 | 0 |
| Thin, entire window | 49 | 0 | 1 | 0 | 0 |

Each row goes to its largest measured interval. The durable `bm1-i9-1-v2/TOP50.tsv` holds all four rankings with arm, offer, trace ID, native T, interval lengths and measured lookup work. The first two seconds contribute 37 of the whole-window deep fifty and all 50 thin. Excluding those offers preserves 1,694 per repeat and reproduces the 178.74/170.24 ms deep and 18.54/19.15 ms thin p99s. [Evidence manifest](SHA256SUMS)

The deep post-start fifty spent a median 160.60 ms in the unassigned portion of the peer wait. In 49, activity in the same writer JVM bounds any single uninterrupted pause within that wait to 28.82 ms or less across the cohort. Forty-nine had an earlier native T still awaiting its reply when they entered their own wait, with a median of seven outstanding earlier replies versus zero for thin. This pattern supports a backlog beyond the sender. Outstanding replies alone cannot locate the queue inside Datomic or place an individual pause.

No top-fifty save had a same-subject predecessor because each arm used every touched subject only once. The read gateway recorded one startup health request per arm. The largest sender delay among the post-start deep fifty was 0.75 ms, and no sender-GC interval overlapped their scheduled offer-to-call interval. The corresponding thin values were 1.56 ms and zero overlaps. The recorded clock fit ties the sender ledger to gateway events on the same Linux boot. Three unfinished gateway file suffixes follow all required joins.

All 50 deep and 32 thin post-start tail saves recorded SQL segment reads. The deep median for own SQL elapsed time was 4.66 ms. One deep save spent 150.60 ms on its own SQL reads inside 173.77 ms of evaluation, and the three slowest deep saves entered their waits before that earlier write's reply. Their native ordering is consistent with the long storage read building a backlog in that episode. The other 49 deep cases have an unresolved dominant residual. A transactor rollup reported 21 GC pauses in each deep arm's overlapping minute with maxima of 125 and 139 ms. The bundle has no JVM pause timestamps, transaction-entry events or PostgreSQL statement and WAL waits. It confirms zero individual JVM pause overlaps and cannot count the underlying pauses by save. A single long writer pause within the observed waits cannot explain the gap. Transactor GC may contribute, and its individual share remains unresolved.

## What the next run must record

- Record per-event GC and safepoint start, end and cause for all three JVMs, with wall time, JVM uptime, a shared boot ID and monotonic-to-wall anchors at the start and end. Preserve effective collector, heap, processor count and cgroup CPU throttling. Keep the sender's offer, dispatch, socket and ACK clocks and its GC events.
- For each save, keep the gateway receive, peer submit and response clocks and the Datomic transactor enqueue, application start/end, durable log completion and reply timestamps. Join native records by database hash and native T and associate them with the original trace ID. Preserve exact statement wait, segment reads, deserialization, WAL sync and storage timing on the same clock. Record any missing joins and trace drops explicitly.

## Reproduction and checks

```sh
python3 -B lab/experiments/EXP-DX1/tail1/matched-tail.py "$DX_BM1_I9_BUNDLE" "$DX_TAIL1_OUTPUT"
```

The analyzer checks the published transfer digest, archive and summary member bytes, original attempt times, four distinct nonces, exact offer tape and receipts, and one gateway response per trace ID and native T. It binds each sender trace to its command and the same boot. It publishes observations and an explicit missing-clock inventory. Reproduction produced byte-identical outputs and a changed transfer was refused before any output. [BM1 handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/34badc007c4f1b2a3d6d7645278b48fba92f5724/lab/experiments/EXP-DX1/bm1/HANDOFF.md#evidence-checks)
