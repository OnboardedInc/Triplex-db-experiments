# GS12F round 3 QA — CX-VGS12F

**Verdict: FIX-FIRST.** The four implementation findings from the previous review pass the fresh checks below. The remaining approval blocker is the requested acceptance-tree equality: the candidate is behind current main in four `lab/acceptance/` files. No new blocking value-admission defect was reproduced. One nonblocking source-reference defect is also listed.

Reviewed builder **`f8d1c3da0a871f4c9c724ebae09e380dbb9222a8`**, round 4 of `lab/experiments/EXP-GS12F/REPORT.md`. Imported into `verify/GS12F` by merge **`3e1109b7e155b9b7a9d5be83026d9c82ac6e3b42`**. No implementation, acceptance file or publication pin was edited by this review; no main merge or push was made.

North star: P2 correctness floor under [SCOPE 2.4](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). This verifies focused representability/admission behavior, not a complete GS.12 qualification.

## Findings

### R3-F1 — MEDIUM, approval blocker: acceptance tree does not equal main

**Locations:** `lab/acceptance/ACCEPTANCE.md:1`, `lab/acceptance/RULINGS-PENDING.md:1`, `lab/acceptance/cases/CS-GS.json:1`, `lab/acceptance/obligations.json:1`.

At the initial review capture, resolved main was **`e4850f801b8a7771a94e1b3394ecc5ddf24efb5f`**. The builder retains the older contract from `811a42a8`; current main has newer pending-ruling entries Q96a–c/Q97a–c and a generated GS case set that is absent from the candidate tree. All four files above differ. This is branch/main divergence, not evidence that round 4 secretly edited the contract. The builder report accurately says “unchanged relative to 811a42a8,” but that does not satisfy the task's stronger equality-to-main condition.

**Reproduction:** `git diff --name-only e4850f801b8a7771a94e1b3394ecc5ddf24efb5f f8d1c3da -- lab/acceptance/`. [Initial contract audit](round3/evidence/contract-audit.json), [final frozen comparison](round3/evidence/contract-final.json) and [complete diff](round3/evidence/contract-final.diff) retain the exact comparison. No semantic success result is substituted for this failed condition.

**Proposed fix:** have the authorized builder/orchestrator/contract owner reconcile the candidate with a resolved current-main contract, preserving main's newer rulings and case artifacts without manually regenerating or repinning GS12F. Repeat the full-tree equality and pin-drift inventory afterward. This reviewer leaves `lab/acceptance/` untouched under rule 9b. No additional functional change is requested on the strength of this finding.

### R3-F2 — LOW, nonblocking: SQLite evidence pointer names a nonexistent source file

**Location:** `packages/core/src/ValueDomain.ts:96`.

`ValueDomains.sqlite.sources` includes `packages/sqlite/src/schema.ts`, which does not exist on the reviewed branch or captured main. The actual shared DDL is `packages/sql/src/schema.ts`; the SQLite dialect/adapter lives under `packages/sqlite/src/`. The correct packer pointer on the same row does exist. This does not change admission behavior.

**Reproduction:** inspect `ValueDomains.sqlite.sources` and `git ls-tree -r --name-only e4850f8 packages/sqlite/src packages/sql/src/schema.ts`.

**Proposed fix:** replace the nonexistent pointer with the actual shared schema path. No source change was made by the reviewer.

## Rerun of the original 199 round trips and 759 rejections

All **199 original positive inputs** were retained in [legacy-matrix.test.ts](round3/legacy-matrix.test.ts). The copy changes only output location, the new table-shape assertions, explicit FoundationDB domain forwarding to the updated META API, and expectations for the documented narrower policies. The old committed matrix remains unchanged in `round2/`.

- **190** original inputs still round-trip exactly through their actual codec.
- **Nine** now correctly reject InvalidTripleError: three PostgreSQL fractional/subnormal datetimes and six FoundationDB values containing the old 1 MiB text/key/descriptor components. They are reported as policy rejections, never as successful round trips.
- All original **253 direct codec rejections** and **759 public-write rejections** pass, with the exact original value in the typed error and zero instrumented transaction/claim entries.

The current-policy matrix separately passes **196 exact codec round trips**, **257 direct typed rejections**, and **771 public typed rejections**. It uses 4 KiB FoundationDB scalar endpoints, integer-only PostgreSQL datetime positives, and four explicit PostgreSQL precision negatives. These counts are distinct from the original denominator; they do not claim 199 original round trips still succeed. See [matrix totals](round3/evidence/matrix-totals.json) and per-profile observations under `round3/evidence/legacy/` and `round3/evidence/current/`.

## Four previous findings checked against actual sources

| Previous finding                | Source check and fresh result                                                                                                                                                                                                                                                                                                                                         | Status within this review                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Decorated sparse arrays         | `ValueDomain.ts` now rejects numeric names outside array length or the safe canonical index domain. Both original disguised-hole variants reject typed through all eight codecs and actual memory/SQLite and offline XTDB/QLever public controls, before callbacks/claims. Dense-array positives remain.                                                              | Resolved                                                                      |
| XTDB maximum-depth journal      | `XtdbStorageAdapter.ts` now passes `storedValueDomain` to actual insert packing. Public depth stays 128; internal allowance is 16. Fresh codec tests cover public 128/129 and stored 144/145. The original reviewer live test completes **all 16 vectors**, including depth-128 JSON, with exact get, receipt identity/value and historical readback.                 | Resolved                                                                      |
| PostgreSQL fractional datetimes | Shared DDL still uses `BIGINT`; the table and packer now require integral milliseconds. Original 0.5, -0.5, smallest positive subnormal and the next binary64 value above 1 reject typed before the stubbed transaction/claim boundary. `postgres-datetime-schema.json` records rejection rather than forwarding 0.5 into SQL.                                        | Resolved by early rejection; no live PostgreSQL claim                         |
| FoundationDB encoded limits     | Actual wrapper defaults now alias the table, inject configured caps/subspace, and route public KV through preview plus actual buffered-byte validation before flushing claims. Fresh tests cover original 1 MiB failures, 4 KiB scalar successes, META 100,000/100,001, key+subspace 10,000/10,001, smaller configured caps, and mutation budget 8,000,000/8,000,001. | Resolved for tested wrapper/encoding path; native cluster remains unqualified |

The cited [PostgreSQL numeric-type documentation](https://www.postgresql.org/docs/13/datatype-numeric.html) confirms that BIGINT stores whole numbers. The actual checked-in DDL supplies the local mapping. [FoundationDB's documented limits](https://apple.github.io/foundationdb/known-limitations.html) confirm 10,000-byte keys, 100,000-byte values and the larger affected-data transaction ceiling. These primary sources were opened during this review. The 4 KiB text cap is explicitly application policy, not a claimed physical text ceiling. The 8 MB mutation budget and 64-byte overhead estimate are local wrapper policy; they do not qualify native read-conflict ranges or complete native transaction overhead. The preview's backend reads are not counted as write-callback/claim entry.

The FoundationDB transport substitute retains local committed bytes only to exercise the real wrapper and public encoding/readback. It is not a cluster. Successful scalar pack/unpack does not by itself admit a combination whose full journal/index/META encoding exceeds a joint storage limit; those combinations are explicitly rejected by the physical controls.

## Adapter and world-kind completeness

[main-inventory.json](round3/evidence/main-inventory.json) freezes the main commit and actual adapter implementation paths. The eight profiles cover every first-party public value-codec composition found on that main:

| Profile      | Actual implementation / composition                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| memory       | `packages/core/src/kv/kv/InMemoryKvBackend.ts` through `KvTriplesLive` / META codec                              |
| foundationdb | `packages/foundationdb/src/FdbKvBackend.ts` through the same KV layer with injected physical domain              |
| sqlite       | `packages/sqlite/src/SqliteAdapter.ts`, shared SQL packing                                                       |
| postgres     | `packages/postgres/src/PostgresqlAdapter.ts`, shared SQL packing; ambient/schema-scoped clients use this adapter |
| cloudflare   | `packages/cloudflare/src/storage/CloudflareAdapter.ts`, DO SQLite packing                                        |
| xtdb         | `packages/xtdb/src/XtdbStorageAdapter.ts`                                                                        |
| qlever       | `packages/qlever/src/QleverStorageAdapter.ts`                                                                    |
| duckdb       | `packages/duckdb/src/effect-storage.ts` / public-backend codec behind its exported runtime                       |

The SQL package supplies shared machinery rather than another engine profile. Generated source snapshots, tests and vendor research adapters are not separately exported public compositions. No `packages/datomic` exists on captured main; `docs/datomic.md` explicitly calls it a proposed blueprint without an adapter, and the lab's Datomic loader throws if its public runtime is unavailable. Datomic must remain unqualified rather than receiving a fabricated table/PASS row. No existing public adapter was found omitted.

W0 declares nine domain kinds: **date, instant, cents, minutes, boolean, text, enum, ref and erased**. Date/instant/text/enum preserve their lexical strings; cents/minutes are validated safe-integer JSON numbers in the W0 schema and fit the accepted exact scalar or exact-integer channels; boolean/ref have explicit families; erased markers are ordinary JSON containing the lexical `erasedAt` instant. All have represented storage families. W0's year, ASCII/length, enum-membership and cents/minutes limits remain world validation, not additional engine ceilings invented by the catalog. Core additionally covers its approximate number, numeric datetime and blob descriptor families. Decimal precision/scale is explicitly unsupported in every profile, and W0 defines no decimal attribute. Unsupported integer families in SQLite/PostgreSQL/Cloudflare are explicit typed failures rather than silent coercions. No W0 kind was found omitted; this is a mapping/codec inventory, not a full W0 scenario or Datomic qualification.

## Fresh results and binding

| Check                                                                                                     | Fresh result                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Reviewer copies, legacy/current matrices, actual wrapper physical controls, persistent integration matrix | **63/63 passed**                                                             |
| Full core unit suite, including the four new admission/buffer regressions                                 | **854/854 passed**                                                           |
| QLever focused offline tests                                                                              | **3/3 passed**                                                               |
| Actual KV/SQLite value-limit controls                                                                     | **4/4 passed**                                                               |
| Original reviewer XTDB live endpoint control                                                              | **1/1 test passed; all 16 vectors exact**, 67.90 s                           |
| Source stability                                                                                          | No captured production or executed reviewer input changed during the attempt |
| Acceptance equality                                                                                       | **Failed** against resolved current main; four differing files               |

[run.sh](round3/run.sh), [exits.txt](round3/evidence/exits.txt) and raw logs preserve actual invocations. All execution checks exit zero, but the capture records `acceptanceEqualsMain:false`; a zero capture/controller exit means the audit executed, not that equality passed. Source bytes were checked against builder Git blobs before execution and again afterward in [execution-sources.json](round3/evidence/execution-sources.json) and [source-stability.json](round3/evidence/source-stability.json). No historical builder run was counted as fresh. Reviewer output uses separate round 3 directories.

Heavy work used `lab/bin/heavy.mjs`; host free space exceeded 5 GiB (about 13 GiB before the first admission). The existing pinned dependency installation was reused without package/lock changes. XTDB used the existing resident at port 5470; [container-before.log](round3/evidence/container-before.log) and [container-after.log](round3/evidence/container-after.log) match exact ID, image, start time and cap. No engine lifecycle action or exclusive reservation occurred. QLever live stays **DIAGNOSTIC under Q91a/R35**; no new QLever live command was run.

## Pin inventory

The builder's retained **implementation** pin list is complete: the only directly pinned implementation path changed from main is the testkit export. Against current main, the independent intersection also contains the stale administrative pending-ruling path caused by R3-F1:

| Path                                | Current-main SHA-256                                               | Candidate SHA-256                                                  |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/testkit/src/index.ts`     | `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988` | `432cec5c6aa33150c5c6f6c54091184edcaece3395ee3c809524c5502594a6d6` |
| `lab/acceptance/RULINGS-PENDING.md` | `acdee44559d41f966606ef1ab81dc30406c91afbccd1ec2acc82c3c04e685d5f` | `ced5c9496bcd596cce85973f91ec8f32426adc4f0d049e2ecac288a3a224ab37` |

The report's original-base administrative hash pair is accurate historical provenance, but is not the new current-main comparison above. Other changed source files are inventoried by the builder and are not invented direct pins. Contract equality and administrative inventory must be refreshed before this review can approve the combined request. The contract owner owns repinning; this review changes neither pinned implementation bytes nor the contract.

## PASS / verdict audit

1. **`legacy-matrix.test.ts`:** retains all original 199 inputs and 253 negative codec inputs. Content checks use strict original-value equality or explicitly classified typed policy rejection; all 759 public negatives require the original value/error class and zero transaction/claim counters. New runtime per profile and this invocation's summary counters supply freshness. The selected real codec/domain and literal values bind the observations; unsupported/narrowed inputs are never counted as round trips.
2. **Current matrix / independent probes:** exact codec outputs, original sparse-array objects, typed errors and callback/claim counters are freshly checked using the reviewed implementations. New clients/backends/runtimes and dedicated output directories prevent adoption of prior results. Runnable changes are described above; original reviewer preimages remain committed in round 2.
3. **Physical wrapper controls / substitute:** real wrapper defaults, configured domain and complete encoded bytes determine acceptance; exact get/receipt values and transaction IDs are checked. Each control constructs a new wrapper/map/runtime. The transport substitute supplies no native durability, retries or cluster claim. Failed preview/actual byte checks must flush no claims; the new core regressions execute freshly too.
4. **Live control:** records a vector only after get, matching command-receipt transaction/value and historical readback equal the original input at the returned basis. A new random scope and fresh real transactions bind the 16 successes to this source and the exact before/after resident identity. No full GS.12 or performance PASS is emitted.
5. **Existing suites:** their unchanged success predicates are executed in the reviewed worktree in this attempt; raw totals and optional/live boundaries remain explicit. QLever's offline codec success is not SPARQL/durability proof.
6. **Capture / closeout:** compute actual hashes from immutable builder blobs and current files, freeze main, intersect direct published path/hash pins, inventory actual source paths/world types, and retain the complete contract diff. Source drift and container-identity changes cause failure. Equality is an explicit boolean, and false remains false. The new closeout script was added after the test run and only audits files/results; it does not alter executed predicates. Its first attempt failed on the candidate's absent generated CS-GS file; that helper and raw error are retained, and the corrected capture records an explicit null candidate preimage rather than inventing a hash.
7. **This report and verdict:** distinguish original/current denominators, prior/native evidence from fresh observations, application policy from native limits, and functional success from the failed contract prerequisite. Overall FIX-FIRST follows R3-F1. No acceptance receipt, obligation closure, merge promotion or native-service completion is generated from a runner exit or hash alone.

## Not done / open boundaries

No implementation fixes, contract synchronization, version change, repin, main merge, push, publish or promotion. No native PostgreSQL/FoundationDB/DuckDB/Datomic run, new Cloudflare workerd run, root check/package consumer rebuild, full G1/GS.12, performance or native FoundationDB conflict-range/durability qualification. PostgreSQL rejection is source/documentation/codec/preflight evidence, not fresh server execution. QLever live/history/durability remain unqualified. The next required step is contract reconciliation and a fresh equality/pin audit; R3-F2 is a small nonblocking evidence-pointer correction.
