# SDK query contract v2

The dedicated native writer uses one fixed scheduling strategy. Heavy-call
capacity equals the configured reader count. There is no scheduling selector,
writer fallback or second integrity mode. Current qualification and pending
integration gates are in [TAKEOVER-STATE.md](TAKEOVER-STATE.md); the rejected
static-three/static-four/fair-four experiments remain in the
[cohort record](CONCURRENT-INGESTION-COHORT.md).

## Ordering and admission

`query`, `queryScalable`, `queryIntervals`, `queryCuts` and `queryLookupAt` share
a FIFO. Each slot covers the original prior-write barrier, connection acquisition,
compilation, execution, fetch, typed decoding, controls and cleanup. Capture the
writer-tail promise at public invocation; later writes cannot extend that read's
barrier. The actual native statement supplies the coherent temporal snapshot.

All pooled reads count against `readers + maxQueuedReads`, including queued
calls and prior-write waits. For16 readers with maxQueuedReads0,16 pending calls
are admitted and the seventeenth rejects with `TD_E_QUERY_BUSY`. Light entity
point, presence, history and receipt reads retain the same pool. Writer operations
use their logical tail and dedicated C++ connection. Reader-count capacity is
scheduling policy, not a native or whole-process memory bound.

With readers0, reads use the original SDK connection in the logical writer
sequence, after preceding native writes have completed. Early cancellation cannot
advance that sequence past an earlier write or let a later write overtake it.

## Cancellation and deadlines

Contract2 starts `timeoutMs` at invocation, including admission, the captured
write barrier and lease acquisition. Intervals/cuts/lookup retain their5000ms
default; bounded/scalable queries have no implicit timeout. Explicit timeouts
remain1..60000ms. `deadlineMs` separately bounds the native evaluator.

A queued abort/deadline removes only that call, without a native token or an
interrupt of another call. Active cancellation belongs to the leased port's
control scope. Calls without signal/timeout keep their uncontrolled token-zero
transport. The public promise can settle before native cleanup; internal capacity,
lease ownership and draining continue until cleanup completes. Fatal or uncertain
instance state takes priority over a late deadline. Timers/listeners retire once.

## Maintenance and observations

`close` rejects new work, drains admitted reads/writes and native cleanup, then
retires the writer connection/thread before the SDK lifecycle owner. It does not
cancel accepted writes. `revalidate` blocks new admission, drains admitted work,
enrolls all existing contexts and performs the complete audit. Failed validation
keeps reads/writes unavailable; it does not select another transport.

`readerStats()` retains capacity/available/active/waiting. These describe physical
reader leases; waiting does not count the private heavy FIFO. Correctness tests
cover the original invocation barrier, post-ACK visibility, old cuts, deadlines,
cancellation isolation, admission reuse, close/revalidation and the complete
512-command trace. Performance acceptance uses actual SDK behavior with no outer
experimental FIFO. Exact receipts and integrated results remain separately scoped
from sampled throughput, tails and RSS.
