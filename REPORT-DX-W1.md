# DX-W1 part 8

The full-size trace counts storage fetches but cannot tell which lookup caused each fetch.
The first candidate checks the same owner revision on Datomic's serial database value using the narrow revision index.
A separate option reuses decoded predecessor values when preparing the ordinary journal.
Both options start off. They preserve one database, the historical ID check, and durable receipts.

## What the saved evidence identifies

Headline at 394 offered has 42,344 SQL segment fetches across 35,460 acknowledged saves, including drain. The mean is 1.194 per save. 7,050 saves fetched zero, and the mean in-process segment-access count is 8.06. Default has 43,791 fetches over the same denominator and 1,139 zero-fetch saves. The index load counters below overlap and cannot assign physical reads to individual calls.

| Index and key | Point in the write | Full-size headline signal |
| --- | --- | --- |
| EAVT owner number, `:triplex.entity/id` and `:triplex.entity/rev` | Native public-ID witness and built-in revision CAS | 0.840 EAVT loads/save across all EAVT uses. Earlier lookup trace confirms CAS can fetch a segment. |
| EAVT owner, `:triplex.entity/retired` and `:triplex.entity/row` | Gateway proves and carries the exact predecessor text. Native redundancy checks its concrete retraction and the new rows. | 0.977 AEVT loads/save across all AEVT uses. Older measured row redundancy fetches were mostly AEVT. The archive cannot isolate row versus revision rechecks. |
| EAVT scope flags, function install `:db/fn`, and latest tx position/clock. AEVT `:db/excise` and position fallback. | Native basis and erasure checks, then assign the next position and clock | Authored checks run each time. A metadata-only native tx can trigger the reverse position seek. No per-key miss count. |
| AVET operation ID, command claim and journal entity ID. Historical AVET `:triplex.entity/row` range and exact ID fallback. | Duplicate and journal checks, then ordered or hashed historical identities | 19 AVET loads total across 35,460 saves. The ordered tail is hot on this tape. All ID and uniqueness checks remain. |

The full-size file `prep1-native.ndjson` has append `start/end` and member `t/read-at/started-at/applied-at/datom-count`. It lacks a lookup event with index, attribute, call and cache-tier counts, and spans covering native redundancy after transaction-function expansion. The opt-in `PREP1_LOOKUP_EVERY=64` adds that sampled line in a separate file, with unscoped SQL reported separately. Shared native prefetch cannot split one fetched segment among all keys it served.

## Why size matters and what to try

- SQL reads are lower-tier fetches. None of the authored point checks inherently requires SQL on a hot segment. The archive cannot say which misses a larger cache would save versus compulsory reads or new index generations. At 10,000 people per account the same checks used 0.014–0.033 SQL reads/save. At 100,000, older scattered personal rows span many more leaves while ordered new IDs, the scope and latest transaction stay local. Both full-size arms configured 16 GiB. There is no segment census, decoded footprint, depth or eviction trace. At an illustrative 3,000 records per leaf, the business facts alone put about 108,000 leaves across EAVT and AEVT, compared with about 11,000 on small. A 16 GiB cache would have about 155 KiB per full-size leaf before other indexes, branch nodes and log entries. This estimates scale, not occupancy. [Datomic caching](https://docs.datomic.com/operation/caching.html) · [Datomic indexes](https://docs.datomic.com/indexes/index-model.html)
- First try `TX2_SUBJECT_NARROW_REVISION=1` with the already-selected numeric owner. It seeks by revision attribute then entity and expands to the same cardinality-one update only on equality in the serial db-before. The ordinary owner, scope, function, erasure and historical-ID witnesses remain. It is a standalone per-person transaction, and its actual durable report still owns the receipt. No seed rewrite is required. [Datomic transaction functions](https://docs.datomic.com/transactions/transaction-functions.html)
- If native AEVT redundancy dominates, try a hint for only the exact retiring row and the revision leaf. Initial test range is 0–0.4 moved reads/save with no additional reads as the success condition. Earlier history-plus-revision hints raised SQL fetches from 457 to 976 in a small-cache test, so leave those off. If first-touch EAVT instead dominates, compare 16 and 24–32 GiB against the same tape and report hot versus first-use rates. Both need bare metal. A compact owner witness would change all write paths and existing seeds. Price it only after the trace shows repeated owner misses.

## Gateway preparation

Headline p99 is 25.92 ms and the slowest 355 averaged 29.52 ms. With 1 ms of clock allowance on both sides, every one contains a gateway safepoint. At least 8,994 of their 10,480 preparation milliseconds were inside those pauses (85.8%). The default arm gives 85.6%. In the retained headline gateway log, `G1CollectForAllocation` accounts for about 96% of safepoint wall time. The slow saves were the same width as the others and their 1.31 native SQL reads/save occurred after preparation. The cheapest direct follow-up is a matched comparison with ZGC on the writer gateway and the same heap, peers and tape. If the long pauses disappear with no new CPU bottleneck, expect preparation p99 of 8–15 ms. The new validation cut and witness, predecessor and render spans expose the remaining work. `TX2_SUBJECT_REUSE_PREDECESSOR=1` reuses already-needed decoding, a smaller change worth under 0.2 ms/save mean in the forecast.

## Before the server run

| Offered saves/s | Writer | Apply mean | SQL reads/save | Stored saves/s in window |
| ---: | --- | ---: | ---: | ---: |
| 394 | Reference | 1.7–2.0 ms | 1.1–1.3 | 375–394 |
| 394 | Narrow revision and decode reuse | 1.5–1.85 ms | 0.9–1.2 | 385–394 |
| 620 | Reference | 1.8–2.25 ms | 1.2–1.55 | 430–510 |
| 620 | Narrow revision and decode reuse | 1.55–2.0 ms | 0.95–1.40 | 480–550 |

The estimates assume the revision probe can avoid roughly 0.15–0.30 SQL fetches per save. The measured 0.93 ms for 1.19 reads gives about 0.78 ms per removed fetch. A native row redundancy fetch can survive the change, so the prediction is falsified if it merely shifts EAVT reads into AEVT. The 394 arm's 1.86 ms implies about 537 saves/s for apply alone. At 620 offered the same arm averaged 2.09 ms of apply and 1.43 reads. Serving all 620 requires at most 1.61 ms of apply, about 0.48 ms or 0.61 comparable fetches less, before any other serial cost.

From the clean candidate checkout on the assigned server, with the existing source-bound build receipt exported as `DX_V01_BUILD_RECEIPT` and the exact SCALE1 seed, transfer and separate WAL device:

```sh
DX_W1_SERIAL_APPLY=1 bash lab/experiments/EXP-DX1/v01/adopted-server.sh \
  "$(git rev-parse HEAD)" "$OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" "$TRANSFER_PIN" \
  fresh subject j21-g1 "" "" "" "" j25-zgc "$WAL_DIR"
```

The launcher restores the sealed database separately for each arm. It offers 394 then 620/s for five minutes each, reporting two halves per rate with 64 pinned readers, feed verification and the same 12 in-flight cap per account in both arms. This is a serial saturation diagnostic after the rolling-credit comparison. It uses the headline JVM and separate WAL setup and does not rerun the scorecard or vary the admission policy between arms. The second window in each arm follows that arm's first window. Report expiration, read errors and actual durable storage separately from ACKs.

## Evidence audit

- The archive recount checks the original SHA-256 and custody manifest, observed bytes, archive source and per-arm attempt/slot before counting. It streams selected members and leaves the archive alone.
- Mac gate at `6c927aaf5`. The reference and candidate each passed six native tests and 696 assertions, covering exact feed bytes, pinned history, claims, same-person conflict, reused IDs and erasure witnesses. The SQL-backed candidate passed nine tests and 760 assertions, with synchronous standby flush. The interrupted reply recovered the original exact receipt, native t and claim after restart. Native gate identity checks bind each fresh attempt to the image source, selected function, observed scope, actual data and cleanup. These are correctness checks.
- The sampled native observer measures the actual calls and records attempt, native t, db-before t, index/attribute category, calls and I/O. Reads that cannot be assigned remain outside the named lookup. It issues no receipt or verdict.
- The server reducer binds immutable operation bytes to the arm, each offer to its tape, the receipt to the ordered journal and the native t to a complete zero-drop append trace. It counts durable appends on a bracketed shared monotonic clock and keeps recovered storage and observed ACKs separate. The pair requires matching tapes and initial cuts and distinct attempts and slots. This command is unrun.
- The application returns receipts through the existing durable report checks. The native replacement still compares the committed revision before writing and leaves the duplicate, identity-history, erasure and function checks intact.
- Core/Datomic built and three tape/ordered-ID tests passed. The standalone driver type check still reports inherited declaration and request-sample errors. Shell, TypeScript and Python syntax checked. The local sampled observer output and bare-metal speedups remain unverified. No acceptance files or pinned hashes changed. Owned slots, containers and images were removed or released. [Checksums](lab/experiments/EXP-DX1/w1/WRITE8-SHA256SUMS)
