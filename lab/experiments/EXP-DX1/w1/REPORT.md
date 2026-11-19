The sender fix left 8.30 ms between the measured p99 and the 50 ms target for one account with 10,000 subjects and zero readers.
Of 38,826 saves, 629 took over 30 ms and 276 took over 50 ms. Three of the ten individual bursts exceeded the p99 target.
Waiting for Datomic was the largest part of 421 slow saves. Waiting for an earlier save on the same subject affected 72.
One long save delayed seven later saves on the same subject by a combined 836 ms.
The transactor reported 1,165 logical SQL reads on 281 slow saves. Their combined read time was 0.54 seconds.
Two changes worth testing are reducing sender allocation during bursts and checking new fact IDs together at the serial writer.
The first could shorten pauses that delay whole bursts. The second targets the growing cost of checking history as an account gets larger.
The 100,000-subject comparison on a bench remains outstanding.

**North star.** P2 and P7, with exact atomic identity conflicts and durable receipts. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Saved comparison.** Old/fixed/old p99 was 140.543 / 41.705 / 141.612 ms. The fixed arm's 90% i.i.d. interval was 39.707–43.711 ms, leaving 6.289 ms at its upper end. One fixed arm and correlated bursts limit repeatability. At this denominator, 112 additional saves could cross 50 ms before the overall p99 exceeded it. Bursts 3, 7 and 10 reached 52.56, 69.45 and 229.67 ms.

**Every save over 30 ms.** Exclusive wall seconds across 629 saves were peer wait 22.168, offer lateness 10.405, socket/callback 5.230, sender 4.401, same-subject wait 4.198, gateway 1.529, dispatch 0.028, uncovered 0.014 and capacity wait zero. Counts by largest interval were 421 / 74 / 34 / 20 / 43 / 37 / 0 / 0 / 0 respectively. The chain ledger retains 645 rows, including preceding probes or resends when applicable, and records scheduled offer, actual offer, start, ACK and release. Per-save time can count the same machine pause on concurrent requests.

**Inside those intervals.** Native tx-with reported 5.841 s on 629/629, including 0.542 s in SQL reads. Subtracting that reported SQL time alone would move six individual saves below 50 ms. Sender GC overlapped 3.665 s of late offers. One peer wait overlapped a process-wide adoption for 6.32 ms, and 11 were within two seconds after one. The arm captured 72 completed adoptions. Individual native apply, PostgreSQL statements/WAL waits and gateway JVM pauses were unobserved. These overlaps are diagnostic and non-additive.

**Evidence.** Reproduce with `node lab/experiments/EXP-DX1/w1/tail.ts DX-BM1 NEW_DIRECTORY`. The durable outputs are `DX-W1/tail-02/{chains.jsonl,summary.json}` under the evidence root. The latter lists each burst and the ten longest chains. [Input and output seals](SHA256SUMS)

**Audit.** The tail analyzer checks each consumed file against its arm manifest, the frozen command cohort against both bookends, the scheduler's recorded predecessor/release, and the wire, native command and ACK joins against the same source, slot and boot clock. It recomputes the historical percentile and its interval and requires the exclusive partition to add to each ACK within 0.01 ms. It emits a diagnostic ledger for this replay.
