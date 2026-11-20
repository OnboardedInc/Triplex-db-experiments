# DX-INT1 part 5 evidence

## One serving database

The native census keeps the same 200 deep people active while it imports up to 10,000, 30,000 and 50,000 in one database. It samples natural RSS three times at each cut, then records the live histogram, cache charge, and Native Memory Tracking before and after collection. It uses the same lean layout as part 4 for attribution. That diagnostic supplies no erasure or layout qualification.

Server peaks supplied in the brief were 2.55 GiB for one deep account and 4.67 GiB while loading ten. The size analysis puts the initial mixed storage footprint at 139–189 GB. For a first full-population experiment, budget 8–12 GiB Java heap for the single transactor, including 2.5–5 GiB object cache and at most 1 GiB of memory-index novelty initially. Reserve a 16 GiB process budget until native commitments, indexing peaks and GC telemetry are measured together. Add the configured database page cache and the gateway and reader budgets separately. The 4.67 GiB peak is an observed floor for headroom on that run. The 16 GiB is a planning estimate for the mixed load.

## Merge resolutions and qualification

| Input | Integration | Resolution |
| --- | --- | --- |
| Reconciled W1 `7ed8dfca2`, includes WFIX1 `4331d6fe8` | `b2880b5e2` | Reused serialized predecessor metadata in replay and retained validation of every offered live assertion. |
| ERASE1 `856c4c9ae` | `4367a1ac0` | Used the current protective frontier for protected logs, kept W1's application feed on unprotected inputs, and resolved the effective prior release inside the erasure guard. |
| RD1 `5f51de7d6` | `42a1c74fe` | No conflict. The fallback code was already merged. This adds the exact handoff and its evidence. |
| ACT2 `a52f7937c` | `08fb93d9a` | Passed owed Publish priority and observation arguments through the existing erasure sequence and preserved the staged sequence check. |
| TAIL1 `4ebff4dbc` | Pending matched comparison | Archival and explicit Serial-control evidence is available. The matched collector comparison is still pending. |

Lean remains open for query and erasure qualification. K's native query option refuses unsupported shapes and protected scopes. ERASE1's detached-envelope prototype verifies revocation in its own gateway test. The accepted key authority, backup recovery and erasure-aware native query still need a combined gate. The ordinary legacy fixture and the product improvements behind its independent options remain available.

## Pooled campaign

Run `bash lab/experiments/EXP-DX1/int1/everything.sh BATCH UTC_CUTOFF --overnight` for ten 10,000-person accounts. Omit `--overnight` for both rungs. Each physical arm uses one SQL, transactor and gateway stack. Each rung seals one legacy image, then restores the exact cut into a fresh stack for the loaded and field arms. The current SCALE1 held seed uses an incompatible namespaced lean population. The runner requires a matching population hash, receipt identities and layout. A fresh compatible million-person seed is required. [SCALE1 profile](../scale1/PROFILE.md) · [Forecasts written first](P5-PREDICTIONS.md)

The frozen comparison retains the original account-001 tape, reader ladder and v3 sample floors while the other nine accounts are present. The field arms use open-loop tapes per account. Account-001 keeps eight seats, the same offer offsets and deterministic subject choices in each matched window. Nine neighbors at 23.5 and 39.4 saves/s yield 215.0 and 358.1 aggregate saves/s with the quiet lane. Publish and import have dedicated matched controls. The import adds an eleventh logical account to the same database. It verifies complete native frame ACKs and reports the matched foreground window and the elapsed time of the whole import. The wide P8 import remains separate.

The option list is emitted by `node --experimental-transform-types lab/experiments/EXP-DX1/int1/everything.ts --plan`. It records the compatibility requirements for compact rows and identity history ranges, prepared and group reuse, scheduling and coalescing, alternate journals, historical replica install, gzip, the joined priority wrapper, the Java collectors and erasure envelopes. No keep-warm configuration is selected.

## Evidence audit

- The memory verifier reads the actual compressed histograms, checks complete instance/byte totals and JVM native counters, and joins each sample to the same observed process, native image, attempt, original roster and native position. Attach snapshots are distinct from the prior natural RSS observations.
- The physical campaign checks the original dump's byte digest, source, original and new slot/nonce, population, and cut. The driver reopens every original seed claim and independently verifies the content before a restored arm is armed. A frozen and loaded pair shares the precise tape and seed receipt bytes.
- The saved-output gate checks all offered writer rows and their durable receipt identities, interval clocks, exact pinned rows, independent oracle, current feed and persisted resume. A new arm has fresh trace, scope and slot binding. The collector reopens the saved evidence and compares its output to the producer's. Field receipts separately verify native Publish coverage and import frame positions, commands and content. No short-run performance verdict is emitted.
