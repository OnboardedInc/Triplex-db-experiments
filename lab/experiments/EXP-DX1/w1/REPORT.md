The sender fix left 8.30 ms between the measured p99 and the 50 ms target for one account with 10,000 subjects and zero readers.
Of 38,826 saves, 629 took over 30 ms and 276 took over 50 ms. Three of the ten individual bursts exceeded the p99 target.
Waiting for Datomic was the largest part of 421 slow saves. Waiting for an earlier save on the same subject affected 72.
One long save delayed seven later saves on the same subject by a combined 836 ms.
The transactor reported 1,165 logical SQL reads on 281 slow saves. Their combined read time was 0.54 seconds.
Two changes worth testing are reducing sender allocation during bursts and checking new fact IDs together at the serial writer.
The first could shorten pauses that delay whole bursts. The second targets the growing cost of checking history as an account gets larger.
The range check passed local conflict tests. The 100,000-subject comparison on a bench remains outstanding.

**North star.** P2 and P7, with exact atomic identity conflicts and durable receipts. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Saved comparison.** Old/fixed/old p99 was 140.543 / 41.705 / 141.612 ms. The fixed arm's 90% i.i.d. interval was 39.707–43.711 ms, leaving 6.289 ms at its upper end. One fixed arm and correlated bursts limit repeatability. At this denominator, 112 additional saves could cross 50 ms before the overall p99 exceeded it. Bursts 3, 7 and 10 reached 52.56, 69.45 and 229.67 ms.

**Every save over 30 ms.** Exclusive wall seconds across 629 saves were peer wait 22.168, offer lateness 10.405, socket/callback 5.230, sender 4.401, same-subject wait 4.198, gateway 1.529, dispatch 0.028, uncovered 0.014 and capacity wait zero. Counts by largest interval were 421 / 74 / 34 / 20 / 43 / 37 / 0 / 0 / 0 respectively. The chain ledger retains 645 rows, including preceding probes or resends when applicable, and records scheduled offer, actual offer, start, ACK and release. Per-save time can count the same machine pause on concurrent requests.

**Inside those intervals.** Native tx-with reported 5.841 s on 629/629, including 0.542 s in SQL reads. Subtracting that reported SQL time alone would move six individual saves below 50 ms. Sender GC overlapped 3.665 s of late offers. One peer wait overlapped a process-wide adoption for 6.32 ms, and 11 were within two seconds after one. The arm captured 72 completed adoptions. Individual native apply, PostgreSQL statements/WAL waits and gateway JVM pauses were unobserved. These overlaps are diagnostic and non-additive.

**Evidence.** Reproduce with `node lab/experiments/EXP-DX1/w1/tail.ts DX-BM1 NEW_DIRECTORY`. The durable outputs are `DX-W1/tail-02/{chains.jsonl,summary.json}` under the evidence root. The latter lists each burst and the ten longest chains. [Input and output seals](SHA256SUMS)

**Audit.** The tail analyzer checks each consumed file against its arm manifest, the frozen command cohort against both bookends, the scheduler's recorded predecessor/release, and the wire, native command and ACK joins against the same source, slot and boot clock. It recomputes the historical percentile and its interval and requires the exclusive partition to add to each ACK within 0.01 ms. It emits a diagnostic ledger for this replay.

**Identity option.** Set `TRIPLEX_DATOMIC_FAST_PATHS=history-range` on a lean TypeScript client. It proposes the smallest and largest distinct 26-character uppercase alphanumeric IDs. The installed transaction rechecks every actual assertion and both endpoints, then seeks historical AVET from the first full prefix through the ASCII successor of the last. Anything in that interval, unsupported input or a duplicate preserves the ordinary checks and their order. Reader formats, schema and stored facts stay compatible.

**Local proof.** In the small engine selftest, fresh writes took one bounded seek, an occupied interval took one plus the original individual seeks, and two writers racing on stale views produced one commit and one typed identity conflict in both modes. Byte comparisons used posted row deltas on one basis. Fixtures covered live, imported, retired, born-retired, same-save reassertion, narrow client bounds, uppercase endpoints, compact duplicates, CAS and missing-live precedence. Native JFR readback checked both decisions.

**Gate audit.** The dedicated engine build bound the gateway tree to image sha256:66ea2b3417fa6f3a8580c576b806563a4f777400b69a9c3913f7273c1f067c23. `DX-W1/local-04` contains the input hashes and 26 native tests / 54,053 assertions with zero failures. The new tests checked Datomic results, prefix query arguments, actual JFR bytes, and exact typed errors on fresh scopes. TypeScript gates checked the transmitted payload in both modes and layouts (11/11 across three files). The first native run counted a Java iterable directly, and the first wire fixture had an invalid URL. Both first failures are indexed. No acceptance pin moved.
