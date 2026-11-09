# NS P3 measurement driver

North star: P3 under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3; R41 E3.

`node lab/bench/p3-driver.mjs CONFIG.json` is the native-feed NS P3 entry point. The older
`driver.ts` remains the explicitly labelled A0 journal control. Do not use its ACK gap count
or L256 labels as native P3 evidence. This entry point never calls `transactions()`.

The config supplies `provider` (absolute module path), `dir` (durable evidence parent),
`lane`, immutable tenant/database/generation `source`, `stream`, native `startToken`,
`readerComposition`, optional `inputs` (all provider dependencies and frozen workload files),
`readers` (default 256), `timeoutMs` and `offline`. Live configurations also require `slot`
with `owner`, `configSha256`, `imageDigest` and the gate's additional slot identity fields.
The caller must already hold admission; this program acquires no engine slot. A live result
is labelled MEASURED, never a lane promotion. Offline PASS means harness validation only.

A provider supplies these hooks. Every hook receives the same attempt-bound config:

- `prepare(config)` opens the **source-owned** writer and returns `runWriter()`,
  `finalPrefix()` and `close()`. `runWriter` runs the fixed writer trace and returns ACKs
  `{commandId, epoch, position, txId}`. It must record publication independently of ACKs.
  `finalPrefix()` enumerates the source's final resolved prefix after writes stop, independently
  of the feed adapter: `{runId, source, stream, entries, publications, cursor}`. Do not derive
  it from ACKs or pages delivered to the consumer. Include aborts, epoch transitions and seals.
- `openFeed(config)` runs inside the dedicated consumer worker. For Q it returns `broker`
  with FD01's reader-worker RPC interface; for X it returns `xtdb` and source-backed
  `identities` using FD01's native interfaces. It also returns `affected(page)`,
  `isBurst(key)` (from the frozen trace) and `close()`. The driver selects the FD01 adapter.
  Datomic explicitly refuses until FD01's EXP-DF01 native adapter exists; no journal fallback.
- `openReader(config, id)` opens the named lane read composition and returns `pull()` and
  `close()`. `pull()` must perform one exact-basis composition read with the TARGETS P1
  subject and basis mixes; configure those from the frozen workload, not the feed cursor.
  The driver executes 256 independent closed loops across four reader workers, separately
  from the consumer. The offline provider reads immutable snapshots of its fake source file;
  this is a harness fixture, not a lane P1 workload or a performance result.

Use `openSourceRecorder(config)` from `lab/bench/lib/p3.mjs` **at** the publication event.
`published(key, txIdOrOperationId, event)` returns a source-publication inventory row:

- Q: `{kind:'watermarkAt', burst}` at the broker watermark event. The returned `watermarkAt`
  is the source host-monotonic observation. Existing timestamps cannot be copied into a
  new capture after polling. Owners with a different watermark clock must first implement
  and qualify an origin-preserving producer record; this driver refuses mismatches.
- X: `{kind:'commit-sync-return', systemTime, burst}` synchronously as COMMIT SYNC returns.
  `systemTime` is retained as a cross-check, never subtracted from a host instant.
- D: `{kind:'transact-result', burst}` when the TS client receives its transact result.

Keep the returned rows in the source's own publication inventory. The recorder persists
FD01's immutable per-position records in `config.publicationFile`. The source and stream
must match config; its source identity includes this attempt's UUID. No observer can fill
in a missing publication after the fact. Absence is a run failure before progress advances.
The source owner is trusted to invoke these hooks at the documented event; offline checks
cannot certify native event placement. No real lane provider is enabled by this experiment.

Receipts retain the independent prefix, all samples/read-loop observations and ACKs. The
consumer writes affected identities and checkpoint atomically through FD01's host SQLite
store. P3M accepts the provider's affected mapping; O-DOMAIN correctness remains DI01's gate.
Lag ends just after that durable write. The final audit reopens producer records and checks
all prefix positions, including those without ACKs. Whole-window nearest-rank p99 pools
all samples (bursts included), with separate steady and burst summaries. Empty measured
windows fail. Observed client loops must cover both window boundaries and complete reads;
a requested count alone is insufficient. This is client concurrency, not simultaneous
engine query execution; engine saturation and reader answer correctness remain lane gates.

Run offline gates through `heavy.mjs` with Node 24 and owned dependencies. `verify.mjs`
builds public packages and runs `p3.test.mjs`, preserving unique attempts. G0 includes those
tests. On macOS the FD01 clock requires read-only `kern.bootsessionuuid` access. The planted
100/249/251/400 ms gate uses synthetic durable-known instants bound to freshly captured
producer records, through the same audit and percentile path; it does not claim wall-time
scheduling precision. The worker fixture separately executes real clock captures, SQLite
commits, 256 loops, lost-ACK accounting and the missing-publication refusal.

Receipt publication waits for successful worker exit, including source-handle cleanup. A result
message followed by a late close failure is refused; store hashes are captured after closure.
