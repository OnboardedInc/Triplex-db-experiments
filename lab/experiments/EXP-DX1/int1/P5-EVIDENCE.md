# DX-INT1 part 5 evidence

## One serving database

The native census keeps the same 200 deep people active while it imports up to 10,000, 30,000 and 50,000 in one database. It samples natural RSS three times at each cut, then records the live histogram, cache charge, and Native Memory Tracking before and after collection. It uses the same lean layout as part 4 for attribution. NMT measures JVM commitments and omits some native code and library allocations. It needs the resident samples for comparison. [HotSpot native memory tracking](https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html)

At 40,000 deep people the transactor's 1,020.79 MiB RSS includes at least 180.79 MiB outside the Java heap given the configured 840 MiB heap ceiling. The measured 181.194 MB object-cache cap was 99.6% filled. That bounds the cache charge and leaves open which pool added 39.38 MiB of RSS between 30,000 and 40,000. The old 2,000-person gateway histograms show that touching 40 deep people could fill about 28.6 MB of the read peer's object cache. They lack a second size at fixed activity. [Earlier observations](P4-EVIDENCE.md) · [Gateway histograms](GATEWAY-EVIDENCE.md)

Server peaks supplied in the brief were 2.55 GiB for one deep account and 4.67 GiB while loading ten. The size analysis puts the initial mixed storage footprint at 139–189 GB. For a first full-population experiment, budget 8–12 GiB Java heap for the single transactor, including 2.5–5 GiB object cache and at most 1 GiB of memory-index novelty initially. Reserve a 16 GiB process budget until native commitments, indexing peaks and GC telemetry are measured together. The heap cap covers cache and novelty along with temporary Java objects from transaction application. The process budget also covers native memory. The 16 GiB is a planning estimate for the mixed load. [Datomic transactor and peer memory](https://docs.datomic.com/operation/capacity.html#transactor-memory)

## Merge resolutions and qualification

| Input | Integration | Resolution |
| --- | --- | --- |
| Reconciled W1 `7ed8dfca2`, includes WFIX1 `4331d6fe8` | `b2880b5e2` | Reused serialized predecessor metadata in replay and retained validation of every offered live assertion. |
| ERASE1 `856c4c9ae` | `4367a1ac0` | Used the current protective frontier for protected logs, kept W1's application feed on unprotected inputs, and resolved the effective prior release inside the erasure guard. |
| RD1 `5f51de7d6` | `42a1c74fe` | No conflict. The fallback code was already merged. This adds the exact handoff and its evidence. |
| ACT2 `a52f7937c` | `08fb93d9a` | Passed owed Publish priority and observation arguments through the existing erasure sequence and preserved the staged sequence check. |
| TAIL1 `d6ebbc26e` | Explicit collector option | Carried the launcher and tested JVM settings. The reconciled writer keeps its existing receipt cache and row codec. |

The staged activation, prepared writer and reader selftests ran 27 tests with 54,079 successful native assertions each at `162da837e`, `99e97df19` and `fbc9a5c46`. Each tested merge is published. The reused staged activation image has the same source and build inputs. The campaign checkout `b91234c6a` built Core and the Datomic SDK and ran 426 Datomic tests with 52 opt-in cases skipped. Six plan and profile tests, 12 retention tests, 14 focused merge tests and the pooled TypeScript check also ran locally. The saved-output probe and the new merge gates are still in the lease queue. [Checksums](P5-SHA256SUMS)

Lean remains open for query and erasure qualification. K's native query option refuses unsupported shapes and protected scopes. ERASE1's detached-envelope prototype verifies revocation in its own gateway test. The accepted key authority, backup recovery and erasure-aware native query still need a combined gate. The ordinary legacy fixture and the product improvements behind its independent options remain available.

TAIL1's same-image, single-core Mac repeats each verified 5,110 saves and 48 oracle reads. Scheduled-to-ACK p99 was 20.85 s with Serial, 4.31 s with tuned G1 and 16.93 s with ZGC. The combined physical campaign selects tuned G1 explicitly on the writer and G1 on the reader. The launch readback checks the effective flags and exact containers. The Mac comparison describes the diagnostic dose and remains separate from the combined workload. [Comparison input hashes](P5-SHA256SUMS)

## Pooled campaign

Run `bash lab/experiments/EXP-DX1/int1/everything.sh BATCH UTC_CUTOFF --overnight` for ten 10,000-person accounts. Omit `--overnight` for both rungs. Each physical arm uses one SQL, transactor and gateway stack. Each rung seals one legacy image, then restores the exact cut into a fresh stack for the loaded and field arms. The current SCALE1 held seed uses an incompatible namespaced lean population. The runner requires a matching population hash, receipt identities and layout. A fresh compatible million-person seed is required. [SCALE1 profile](../scale1/PROFILE.md) · [Forecasts written first](P5-PREDICTIONS.md)

The frozen comparison retains the original account-001 tape, reader ladder and v3 sample floors while the other nine accounts are present. The field arms use open-loop tapes per account. Account-001 keeps eight seats, the same offer offsets and deterministic subject choices in each matched window. Nine neighbors at 23.5 and 39.4 saves/s yield 215.0 and 358.1 aggregate saves/s with the quiet lane. Publish and import have dedicated matched controls. The import adds an eleventh logical account to the same database. It verifies complete native frame ACKs and reports the matched foreground window and the elapsed time of the whole import. The wide P8 import remains separate.

The option list is emitted by `node --experimental-transform-types lab/experiments/EXP-DX1/int1/everything.ts --plan`. It records the compatibility requirements for compact rows and identity history ranges, prepared and group reuse, scheduling and coalescing, alternate journals, historical replica install, gzip, the joined priority wrapper, the Java collectors and erasure envelopes. No keep-warm configuration is selected.

## Evidence audit

- The memory verifier reads the actual compressed histograms, checks complete instance/byte totals and JVM native counters, and joins each sample to the same observed process, native image, attempt, original roster and native position. Attach snapshots are distinct from the prior natural RSS observations.
- The physical campaign checks the original dump's byte digest, source, original and new slot/nonce, population, and cut. The driver reopens every original seed claim and independently verifies the content before a restored arm is armed. A frozen and loaded pair shares the precise tape and seed receipt bytes.
- The saved-output gate checks all offered writer rows and their durable receipt identities, interval clocks, exact pinned rows, independent oracle, current feed and persisted resume. A new arm has fresh trace, scope and slot binding. The collector reopens the saved evidence and compares its output to the producer's. Field receipts separately verify native Publish coverage and import frame positions, commands and content. The physical launch reads JVM flags from the running process and joins the output to the captured container identity and pre-start clock. No short-run performance verdict is emitted.
