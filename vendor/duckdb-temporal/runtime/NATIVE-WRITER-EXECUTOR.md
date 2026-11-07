# Dedicated native writer

The implementation uses the pinned DuckDB2.0 C++ instance and a dedicated
`std::thread` for native schema/put/patch/batch/resource operations. The TypeScript
host remains the public API. Runtime qualification is macOS ARM64; Linux is
unverified. Current source/build acceptance is in
[TAKEOVER-STATE.md](TAKEOVER-STATE.md). Prepared integration is not a fresh full
verification or promotion.

## Execution and ownership

The existing SDK factory creates its lifecycle/writer port and every reader,
loads the paired companion and bootstraps one native writer before final audit.
A creator-context pending handoff strongly anchors the actual DatabaseInstance.
The companion returns a one-use ticket; its index and ProbeState retain only weak
handoff/executor identities. Claim transfers the anchor to the native executor.
No SDK pointer is extracted or cast and no connection is transferred across
threads. Only the dedicated writer thread creates, uses and destroys its USER
Connection. It enrolls before activation;16 readers therefore mean18 user
contexts:16 readers, the SDK lifecycle connection and the native writer.

The Node addon retains the SDK lifecycle owner opaquely until worker join. The
C ABI uses versioned opaque handles, fixed-width values, bounded UTF8/cell
buffers and explicit release functions; no STL/JS/Connection object crosses it.
The addon is paired to the actual companion/core/engine and selected Node/libuv
headers. It does not use `napi_async_work` or the shared libuv worker pool.

The logical TypeScript writer tail admits one complete operation at a time.
Schema compilation and definition, batch revision preflight, generated writes
and resource reads all use the native writer boundary. The core retains all
validation, canonical hashes, replay ordering, transaction and history semantics.
Compound operations preserve their existing autocommit boundaries; no hidden outer
transaction is added. Raw compatibility operations remain on their own connection.

C++ `Connection::Query` completes execution/commit before the transport checks
result chains, copies the bounded typed receipt and destroys results. ACK is
sent after those steps. Native callbacks link completion records and call
`uv_async_send`; only the event loop touches NAPI. Per-job async contexts and
bounded handle/callback scopes provide settlement and then retire. Environment
shutdown suppresses JS delivery while native payloads and async owners drain.

## Failure and retirement

Ordinary domain/SQL/resource errors roll back and permit reuse. Copy, delivery
or typed-receipt uncertainty after commit fences shared instance health, including
SDK readers. A missing ACK does not imply rollback. Reopen and reconcile the
canonical command receipt before retry; the SDK never automatically retries or
falls back to its old writer transport.

Factory failure before claim retires the pending handoff; failure after claim
stops/drains and joins the native writer before retiring SDK ownership. Normal
close rejects new calls, drains accepted reads/writes and cleanup, destroys the
native Connection on its thread, joins and releases the anchor/lifecycle owner.
Revalidation retains the same writer context, drains work and repeats enrollment
and audit. Connection destruction occurs outside the probe/ticket callback locks.

An environment-owned cleanup owner tracks claimed writers. Its async cleanup
hook drains accepted native work, joins, releases completion resources and closes
the uv handle before removing the hook and unloading the companion. Idle handles
do not keep the process alive. No thread waits for event-loop delivery while the
event loop joins it. Public writes expose no new cancellation/timeout option;
read cancellation cannot interrupt an accepted write.

The first active-start termination gate observes query_begin before requesting
Worker termination and proves complete-old-state reconciliation, whole-command
retry, exact replay/history and healthy reopen. It does not establish that a query
remained active at cleanup entry or separately qualify per-worker handle counts.

## Scheduling and diagnostics

Heavy query admission is reader-count-wide under
[query contract2](SDK-QUERY-ADMISSION.md), preserving invocation-time prior writes,
whole-call deadlines, cancellation and drain ownership. Zero-reader reads retain
the SDK connection inside that same logical tail. There is one application
strategy; matched SDK transport controls are frozen experiment artifacts.

Native spans expose enqueue-to-start, SQL execution, bounded result copy/cleanup
and completion dispatch. Full public latency includes writer-tail wait, SDK/JS
scheduling and typed decoding. These spans overlap engine work and must not be
subtracted to invent exclusive C++/DuckDB/host times. Bootstrap, audit, extra user
connection, close and sampled RSS are measured separately. Operator profiling is
a separate diagnostic, not a service-level latency or physical-memory bound.

Source owners are `native/owner_probe/native_writer.*`, `native_writer_abi.h`,
`node_writer.cpp`, `owner_probe.cpp`, `build_owner_probe.py` and the thin
`adapter/native-duckdb-port.mjs`, `native-entity.ts`, `native-schema.ts` boundaries.
The qualified patch-pruning change remains in `native/src/temporal_command.cpp`.
The [full435 candidate](evidence/native-writer435-full-20261106.json),
[unchanged512 trace](evidence/native-writer-full512-20261106.json),
[both-order transport comparison](evidence/native-writer-broad-reverse-20261106/receipt.json)
and [original anti gate](evidence/native-writer-antijoin-candidate-20261106/receipt.json)
retain their exact artifact identities. A different core/companion build requires
its own matching manifests and applicable integration checks.
