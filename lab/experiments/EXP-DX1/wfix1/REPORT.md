A resent replacement returns the receipt from its first commit.
The change feed now uses the stored time, range and value of the row it retires.
A runtime with an account hint can update its consumer checkpoint and release reference.
A ready save can pass an unrelated wait, and the scheduler grants a ready bulk frame after at most eight live turns.
Two subjects with different stored owners get separate queue capacity.
A request rejected for its size leaves the next sequence available for the sender.
The measurement requires a live readback of the writer and compares the full changes in the feed.
On Mac PostgreSQL, recovery and eight maximum-size saves passed. Full value erasure remains unsupported.

**North star** P2 durable saves, P3 exact feed and P6/P8 account progress. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The audited base was the remote head `7a6a7e9ef` at dispatch. The exact review fixtures reproduced nine native assertions and two SDK recovery failures. The base launcher omitted the predecessor flag, and its field projection accepted changed timestamps, valid ranges and values.

| Finding | Reproduces on base | Fix | Permanent regression |
| --- | --- | --- | --- |
| 1. Replacement resend | Yes | `a1e8ca12b` | `replacement-resends`, `exact-resend-queued-before-commit`, `command-recovery.test.ts` |
| 2. Retraction content | Yes | `edffda1a7` | `retraction-content-at-interior-cut-and-resume` |
| 3. Scope maintenance with hint | Yes | `db444ad25` | `hinted-runtime-publishes-scope-maintenance` |
| 4. Blocked ready writes | Yes | `d3572e794` | `ready-live-and-all-bulk-classes-progress` |
| 5. Shared queue for persisted accounts | Yes | `866a65043` | `persisted-membership-keeps-quiet-account-admissible` |
| 6. Ordered body-cap gap | Yes | `3d7569a19` | `ordered-body.test.ts`, exact UTF-8 limit and valid suffix |
| 7. Predecessor arm disabled | Yes | `9d605bcd9` | `option-readback-requires-the-variant-on-the-opened-scope`, `write-options.test.mjs` |
| 8. Changed journal accepted | Yes | `9a2d0938c` | `journal.test.mjs`, pinned O-REPLAY feed and resume comparisons |

**Checks** The receipt and retraction fixture went from 10 failures to 64 successful assertions. The combined native run passed 98 assertions across seven tests. Pinned O-REPLAY matched the raw feed, resumed page, pinned rows and durable tuples in all three modes. Sixteen SDK and eight W1 tests passed, along with the Datomic and W1 typechecks.

**Integration** DX-W1 was merged through `6c0d81454`. Its writer and regression files match the tested `0f92704d2` bytes. The merged run passed 98 native assertions, 641 packed and ledger parity assertions, 17 SDK tests and eight W1 tests. Both typechecks passed. Four separately configured integration cases skipped. Pinned O-REPLAY matched all three write modes. The one- and three-fact narrow wire frames decoded byte for byte to the ordinary payloads. [PORTS.md](PORTS.md)

**Related writes** The import loader, joined Publish and notice sender recovered the original receipt when the relevant state advanced. Layout replay used the offered predecessor metadata. Commit `09088a27f` fixed it and passed the native regression. [RELATED.md](RELATED.md)

**Mac SQL** Attempt `sql-01` started after 62m54s from image readiness. Its gateway bytes match `cd2151749`. Attempt `sql-merged-03` started after 82m14s in admission, including 79m07s after image readiness. Its 49 staged gateway and codec files match `09088a27f`. Both PostgreSQL 17 runs recovered the original receipts after a pre-reply gateway kill at t=1014 and kept head 3. Pinned O-REPLAY matched the merged run's full raw feed, resumed page and pinned reads. Both wire profiles stored all 1,800 rows in solo and in real eight-member groups. The largest profile sent 4,194,304 bytes per member.

Native excision reached its watermark and cleared native row text. Each of four separate merged scopes retained all four journal entries, accepted all three ID reuses and advanced from head 4 to 7. This held with and without the predecessor option and for both the same and a different owner. Lean value erasure remains unqualified.

**Receipt and verdict audit**

- `commit.clj`, `group.clj`, `storage.clj` check both durable identities before CAS on the serialized basis. Group ACKs read the member by operation ID from the actual native report and match its position, clock and physical t. Duplicate paths do not publish.
- `DatomicClient.transactCommand` checks the claimed command, committed status and typed tuple on a fresh request to the attempted database. A CAS with no such receipt keeps its original error.
- `write-options.ts` checks the running gateway’s nonce, source, scope, installed function and active options against the arm before timing. The raw result and arm expectation are hashed.
- `field/journal.ts`, `group/verify.py`, `verify_replay.py` compare full changes and cursors against the offered tape. The oracle comparison binds its pinned files, raw feed, fresh attempt, slot and source preimages. `group/native.py` binds the packed group parity to source digests, the local runtime and a new attempt.
- `sql.mjs` and `sql_gate.clj` bind the pre-reply native witness to the managed attempt and fresh recovery, check exact tuple and row content, and require SQL durability settings to read back.
- `sql-01/check-recovered.py` checks the witnessed stop, durable tuples, decoded changes and wide rows against the nonce, holder, image, actual gateway bytes and pinned oracle output. It retains the erasure failure and the scope of the owner test.
- `check-sql-merged.py` checks the same bindings with the raw oracle result and compares the full wide rows, receipts, reused IDs and retained journal values in the four independent erasure probes.
- `port-prepared.py` binds its three input files to the frozen merge tree. The serialized guard verifies command and operation identities, the selected function, basis, revisions and exact predecessor row bytes before using a prepared write.
- `layout_replay.clj` compares full logical deltas at the same captured basis. Shape C now calls the serialized writer's change encoder, and the regression compares fresh outputs on a single scoped database.
- `related-paths.test.mjs` compares the original tuples and import assertion digest after a forced state change against the frozen branch inputs.

**Evidence** The durable folder is `evidence/DX-WFIX1/`. [SHA256SUMS](SHA256SUMS) indexes the baseline reproduction, regression logs, oracle comparisons and TypeScript tests.

No acceptance pins moved. Only the assigned branch was pushed. No bench servers were used.
