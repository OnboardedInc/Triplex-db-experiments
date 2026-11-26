# DX-N1: the key pool after a restart (N1) and the reply texts (N3)

Branch `exp/DX-N1-key-pool`, on the one branch's head `8a362ac38`. Every option off. Mac only; toy sizes.
Review: `n1r/REVIEW.md` on `exp/DX-N1R-key-pool-review` (`71e6c453d`), "merge after one named fix, F1".

## What changed

1. **N1, the key pool** (`c78185f5b`, `key_pool.clj`, `envelope.clj`, `storage.clj`): a sealed save that finds its
   database's key pool empty (a gateway that restarted, or never served the protection declaration) fills the pool
   once before it is refused. A save that still finds no key is refused with a typed 503 `EnvelopeKeyPoolEmpty`,
   never 400 `TransactionRejected`.
2. **N3, the reply texts** (`9a6c90ca0`, `94c63ad6b`, `reply.clj`, `main.clj`, `storage.clj`, `canonical.clj`, the HA
   files, `uncached.clj`): a typed refusal (an `ExceptionInfo` with a string `:code`, thrown by the gateway) keeps its
   own message; any other exception (a driver's, Datomic's, a library's, the JVM's) answers the fixed text "The
   gateway could not complete the request", and its detail goes only to the scrubbed `failures/note!` line. Datomic's
   refusals in `storage/commit!` answer a fixed text per code.
3. **The last catch around the whole handler** (`main.clj` `handler`, [N1R F1]): it now wraps the trace wrapper
   (`trace/handler`) as well as the routes, so an exception the wrapper itself raises answers the same fixed JSON 500
   `GatewayError` instead of Jetty's HTML error page (which printed the exception's class and message). Before the
   fix it wrapped only `route-handler`, inside `trace/handler`.

## Every change of answer code or status

| Request | Before | Now |
| --- | --- | --- |
| The protection declaration whose key fill the PostgreSQL authority refuses | 400 `GatewayError`, the driver's statement in the message | 503 `EnvelopeKeyPoolEmpty`, a fixed text |
| A sealed save that finds the pool empty and cannot fill it | 400 `TransactionRejected` | 503 `EnvelopeKeyPoolEmpty` |
| **An `Error` thrown by a route** (`AssertionError`, `StackOverflowError`, `OutOfMemoryError`; the review's F6) | Jetty's HTML 500 page, with the error's class and message | JSON 500 `GatewayError`, the fixed text |
| An exception raised by the trace wrapper itself (the review's F1) | Jetty's HTML 500 page, with the exception's class and message | JSON 500 `GatewayError`, the fixed text |

Every other code and status is unchanged; only the message text of an untyped failure changed (to the fixed text).

## Gate

`b2-keys/gate.sh`, phases `lines` (with `n1-keys/replies.clj` and the review's `n1-keys/replies2.clj` on the file and
the PostgreSQL authority: E1 to E5, J1, J2), `n1` and `suites`. The run on the head that carries this page is named in
that commit's message.
