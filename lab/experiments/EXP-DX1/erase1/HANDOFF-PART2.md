# Protected values in the two save layouts

For the builders of `exp/DX-W1-commit-tail-reads` and `exp/DX-COMPACT1-compact-save`.

## DX-W1 commit-tail reads

Inspected `5fe362929828c2657cc61104c5730a4105bf9bff`. W1 explicitly credits DX-ERASE1 `91cffd2c3` and ported its synchronized-excision fixture to a fresh K scope in `7ee9bb2b6`. W1 also cites the detached-body and independent-key tests at `856c4c9ae` and inventoried its plaintext copies. The new query and lean feed refuse unsequenced native excision. The external ledger, typed marker and detached envelopes still need to be integrated. [W1 report at reviewed head](https://github.com/OnboardedInc/Triplex-db-experiments/blob/5fe362929828c2657cc61104c5730a4105bf9bff/lab/experiments/EXP-DX1/w1/REPORT.md#L41)

| Surface | Where the value goes |
| --- | --- |
| Row text | `DatomicClient.transactTraced` sends typed rows or ordered packed row texts. Gateway `storage.clj:130` `tx-data` decodes them and adds the full string to `:triplex.entity/row` at lines 208–218. Compact rows preserve the typed value in the encoded text. `lean.clj:17` decodes it for current and pinned data. |
| Journal | Core `transactionMetadata.ts` creates typed assertion and retraction changes. The K layout uses a distinct indexed row with `:_tx/change` JSON. P's `packed_journal.clj:53–96` encodes reversible change data with predecessor row references. `packed_journal.clj:105–112` resolves exact historical row bytes to reconstruct it. |
| Claim and reply | `save_ledger.clj:10,27–42` shares the claim, journal owner and durable receipt entity. The index keys are command ID and operation ID. They do not hold the protected scalar. Claim/journal recovery traverses the shared entity and reaches its value-bearing change rows. |
| Feed | `journal.clj:8,29,104` emits or reconstructs the value-bearing journal on pages and entity lookups. The opt-in native `lean_feed.clj:7–53` projects identity/intervals and refuses unsequenced native erasure. Its decoder still traverses value-bearing row strings in the native log and history. |
| Index key | `schema.clj:20` indexes the whole `:triplex.entity/row` string. `lean.clj:26–29` uses its identity prefix; its AVET value still includes the suffix with the body. `predecessor.clj` uses that same string for exact lookup and history. A protected body or reversible derivative there prevents targeted key destruction. |

Requirement for W1. Keep the assertion ID prefix and exact clock/position witnesses. Encode only opaque references for protected values in rows, packed and ordinary journals, and speculative predecessor frames. Bind receipts to the opaque identity. Guard both reconstruction and replay with the current erasure sequence. Test the wire, retained index, journal and feed with a raw synthetic search plus a live decode control. Keep the 100 ms and 1 s publication p99 budgets for one and 100, zero index requests on publication, and at most 2,000 matched datoms per cleanup job at 1.25× quiet p99 or less.

## DX-COMPACT1 compact save

Inspected `2dad099fb2e11659035b87c5d9bfb7fcadeed82d`. Its erasure experiment implements the requested design. Commit `e41f1608140b6d05f47c4ce7860269263a70be6a` implements the handoff's protected envelope, independent revocation check and identity-only journal. Its experiment report names the remaining restore and persistent key-store work. [COMPACT1 erasure at reviewed head](https://github.com/OnboardedInc/Triplex-db-experiments/blob/2dad099fb2e11659035b87c5d9bfb7fcadeed82d/lab/experiments/EXP-DX1/compact1/ERASURE.md)

| Surface | Where the value goes |
| --- | --- |
| Row text and body | `store.clj:280–291` seals the protected input to a per-owner key epoch. `encode-add` at 433–441 saves the opaque version and epoch in the text. `append-data` at 100–108 stores ciphertext only on `:compact.protected/envelope`; the ordinary event body and checkpoint keep references. `decode-value` at 620–637 resolves the envelope only after checking current revocation. |
| Journal | `store.clj:480–490` `journal-fact` emits a protected version ID. The optional stored journal is written by `journal/transaction` at 102–103. `prepare` at 549–566 writes exact erase identities as a separate journal event. |
| Claim and reply | `store.clj:193–206` recovers the receipt through account/command identity. `command-fingerprint` at 459–461 substitutes the opaque reference before hashing. `matches-envelopes?` at 469–470 compares the original ciphertext at its separate storage identity on a resend. |
| Feed | `store.clj:674–703` walks the account position index, projects protected version references or markers, and emits identity-only erasure changes. The value stays in the detached envelope. |
| Index key | `store.clj:35–54` indexes account, subject, command, position, opaque version and revocation keys. The ciphertext and ordinary event body have no value index. The retained test vault wraps a subject's SSN generation in memory. |

COMPACT1 measured 64 saves per arm. The envelope added two native datoms and 141 B of median stored value bytes. Durable ACK p50 moved from 4.28 ms for plain dates to 4.66 ms for protected SSNs. The separate authority and production key rotation still require their own cost measurement.

Requirement for COMPACT1. Bind the current independent ledger cut to receiver/import/Publish commits and preserve it outside data backup rollback. Add actual backup restore and durable key rotation with the approved 15-minute rotation window. Price retired-history identity enumeration and 100-person publication against the same p99, zero-index, 2,000-datom and 1.25× quiet limits. Preserve individually erasable assertions when moving beyond the single protected family in W0.

## What to prove together

Bind every cached closure to both the data position and the current erasure sequence. The first guarded gateway forced inline responses and moved pinned-read p99 from 8.99 to 47.50 ms on the matched Mac seed. Median reach replies grew from 1,428 to 39,592 B; direct row bodies stayed the same size. Preserve the reference path by stamping its cached contents and rejecting stale references before use. [DX-ERASE1 guarded-read comparison](LEDGER.md#cost-of-the-guarded-read-and-save)

Keep the owner and field membership needed to verify an individually erasable assertion. A compact cohort revocation can publish an identity-only owner, field and cut first, provided every lookup and replay can prove exact membership and preserve the assertion's first erasure timestamp. Publish a durable membership proof at the erase position. Derive identity rows and physical cleanup from that proof if the format preserves exact positions, stable IDs and resume semantics. Durable preissued assertion keys let saves reuse the normal DB append without blocking on a file sync for each protected value. [R38 design](../../../research/R38-erasure-design.md)

Three matched Mac rungs put publication p99 at 38–80 ms for one person and 114–211 ms for a batch of 100 with one new protected assertion each. At 3,988,500 seed facts one aged owner with 416 protected identities took 257 ms. The first 128-body cleanup wrote 467 leaves and took 5.68 s. A save wholly inside a native index build took 389 ms, and the cleanup save p99 was 1.28–1.50× its controls. A datom cap alone does not bound rewrite work. Keep encrypted-body maintenance off the live accounts' storage writer, or admit it on a measured leaf-work and quiet-latency budget. Recheck the 1.25× limit against both surrounding 500-save controls. [Measured publication and cleanup](FAST.md#matched-scale-measurements)
