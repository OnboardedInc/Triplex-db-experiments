A resent replacement returns the receipt from its first commit.
The change feed now uses the stored time, range and value of the row it retires.
A runtime with an account hint can update its consumer checkpoint and release reference.
A ready save can pass an unrelated wait, and the scheduler grants a ready bulk frame after at most eight live turns.
Two subjects with different stored owners get separate queue capacity.
A request rejected for its size leaves the next sequence available for the sender.
The measurement requires a live readback of the writer and compares the full changes in the feed.
The PostgreSQL checks are waiting for a Mac lab slot.

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

**Checks** The receipt and retraction fixture went from 10 failures to 64 successful assertions. Pinned O-REPLAY matched the decoded feed, resume and pinned rows in all three modes. Sixteen SDK and eight W1 tests passed, along with the Datomic and W1 typechecks.

**Mac SQL** The first managed image built. The current attempt is queued for admission. Process-stop recovery, native submission size and erasure qualification are open until the stack runs.

**Receipt and verdict audit**

- `commit.clj`, `group.clj`, `storage.clj` check both durable identities before CAS on the serialized basis. Group ACKs read the member by operation ID from the actual native report and match its position, clock and physical t. Duplicate paths do not publish.
- `DatomicClient.transactCommand` checks the claimed command, committed status and typed tuple on a fresh request to the attempted database. A CAS with no such receipt keeps its original error.
- `write-options.ts` checks the running gateway’s nonce, source, scope, installed function and active options against the arm before timing. The raw result and arm expectation are hashed.
- `field/journal.ts`, `group/verify.py`, `verify_replay.py` compare full changes and cursors against the offered tape. The oracle comparison binds its pinned files, raw feed, fresh attempt, slot and source preimages.
- `sql.mjs` and `sql_gate.clj` bind the pre-reply native witness to the managed attempt and fresh recovery, check exact tuple and row content, and require SQL durability settings to read back.

**Evidence** The durable folder is `evidence/DX-WFIX1/`. [SHA256SUMS](SHA256SUMS) indexes the baseline reproduction, regression logs, oracle comparisons and TypeScript tests.

No acceptance pins moved. The parallel DX-W1 branch advanced after dispatch and owns integration. No bench servers were used.
