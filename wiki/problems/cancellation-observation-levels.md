# Cancellation observations have different boundaries

Tags: `problem:cancellation-evidence`, `mechanism:acknowledged-drain`,
`status:source-review-recipe`, `surface:shared-foundations`.

This 2026-11-07 note interprets existing evidence. It adds no guarantee, product
change or experiment. The [byte index](../../qualification/evidence/cancellation-observation-source-note-20261107.json)
(`397e6b41c31ec1cbba1f3a548c3287ed2aa7d80d211d5861a675056f25a46c0b`)
records exact source and review hashes; no module was imported or operation run.

| Observation | Evidence needed | What it does not establish |
| --- | --- | --- |
| Public Effect/Promise settled | Original caller's result/cause and timestamp. | Underlying transport or native work stopped. |
| Transport completed; cancellation requested or acknowledged | Join the original HTTP/driver request and any cancellation response to the exact query ID. Distinguish sending from server acknowledgement. | Physical statement drain merely because a socket, body reader or caller closed. |
| Owned physical work drained | Exact connection/request identity, original stream/fetch settlement and result release, queued-work disposition, transaction COMMIT/ROLLBACK acknowledgement and required owner audit; retain failures. | Other connections, background tasks or the whole engine are idle. |
| Engine idle | Define the engine, contexts, interval and complete observation coverage, then reconcile all relevant work. | A local counter, healthy ping, settings readback, or client process exit alone is sufficient. |

In DuckDB, [the Effect adapter](../../packages/duckdb/src/effect-storage.ts)
lines114–132 retains an acquired standalone-metadata branch where caller
interruption can precede the later read/COMMIT/audit. Its acknowledged read-helper
path, lines153–213, instead waits for either `not_started` withdrawal or original
acquisition and rollback completion. The [independent withdrawal review](../../qualification/reviews/duckdb-withdrawal-final-independent.json)
(`ff48fe062632f2d22e6d9c373b1ca2585101a10af571818a5d7e3d2a057c706c`)
joins a genuinely queued cancellation to zero later work/native dispatches.
The separate finite `duckdb-resource-withdrawal-v1/0001` gate covers active native
interruption, a1MiB spill profile and healthy reuse of that session. It does not
qualify active acquired cancellation on the isolated A public path.

The [port](../../packages/duckdb/src/native-duckdb-port.mjs) requests interrupt at
lines785–797, then awaits its tracked operation before releasing query control
at859–867. Statement cleanup precedes clearing `#pending` at568–581; a cleanup
error can leave the port fenced even when that counter is false. The
[transaction owner](../../packages/duckdb/src/transaction-owner.mjs) awaits its
statement tail before acknowledged rollback/commit at218–258; the public backend
then performs the original ownership audit. Retirement is another boundary:
the C++ writer destroys its owned Connection/anchor before the close callback,
and the Node addon joins/releases the worker before resolving the close Promise
([native writer](../../vendor/duckdb-temporal/runtime/native/owner_probe/native_writer.cpp),
218–220/301–305; [addon](../../vendor/duckdb-temporal/runtime/native/owner_probe/node_writer.cpp),
175–200). `writerRetired()` describes that writer, not all engine work.

QLever gives a concrete weaker observation. Its pinned emitted client
(`87446114a48a6ca0710c4df35ea68348f466f2f8520a4cdcb4be31bf98c94b61`)
resolves `cancel()` after calling WebSocket `send("cancel")`; it waits for no server
completion acknowledgement. The [owning source](../../packages/qlever/src/QleverClient.ts)
also launches cancellation without awaiting it, swallows that request's failure,
and has a no-op `close()`. The preserved [runtime-v1 blocker](../../qualification/reviews/qlever-wrapper-requalification-v1-source-offline-independent.json)
(`becbf7fd96bd34fe71cec90586cff45571f9291677ea81c2dc520743d249791f`)
shows why decrementing `pendingEffectScopes` on Effect rejection and observing
settings100 could not justify `cleanupKnown`. This is a source-proven gap in
that historical wrapper, not an observed native cancellation failure or a claim
about every later successor.

For each review, name the claimed boundary, join all evidence to the owned
query/connection, and distinguish original work from cancellation transport.
Keep uncertainty after timeout, lost acknowledgement or incomplete observation;
later caller success, pending0, closed clients and `groupGone` cannot erase it.
Preserve original causes and raw outcomes before assertions. Successful answers
and owner audits, including the [isolated A142 result](../../qualification/reviews/duckdb-owner-a-packet142-v3-independent.json),
remain their own scope; none establishes engine-wide idleness or performance.
