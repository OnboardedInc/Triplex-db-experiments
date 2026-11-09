# P2Q round 10 — FIX-FIRST

Reviewer **CX-VP2Q-4**, branch `verify/P2Q`. Reviewed builder head **1096fb86** (final product `a5109ce8`), merged into this branch at **506032eb**. Product remains default-off. No product code was changed by this review.

The inherited/declaration-merged inventory finding is fixed. The existing public read paths pass their rerun correctness matrices. The stronger claim that every new public read is necessarily guarded is false: a typed symbol-keyed native read can borrow a generic constructor's marker, bypass both policies, and pass all unchanged inventory/construction guards. A separate symbol-in-table probe exposes a typed method that is silently omitted at runtime.

## Findings

### F1 — High: generic construction identity can certify an unguarded public native read

**Locations:** `packages/core/src/storage/ReadSurface.ts:13`, `:29`, `:46`; `lab/verify/P2Q/tests/round9-construction.test.ts:53`; `lab/verify/P2Q/tests/round8-policy.test.ts:95`.

`isConstructedRead` recognizes a global WeakSet marker shared by snapshot constructors and arbitrary dispatch continuations. It does not establish that a function uses the particular service's basis check, mask, or approved answering continuation. The native inventory separately lists only two string names; it does not resolve the inferred public native type or bind all runtime keys to that type/table.

**Reproduction:** `round10-launder-scratch.mjs` copies the actual source and original guard files, then changes only scratch `NativeQueries.ts`. It keeps the original native dispatch table and adds an exported unique symbol method assembled through `constructReadDispatch` with an ungated continuation. `exactReadService` gives the result a frozen null prototype and preserves its inferred public type. No guard or exemption is changed, no `any` cast erases the added public surface, and no product file is edited.

The real TypeScript checker reports no implementation diagnostics and resolves the symbol as a public callable. Against a fresh model broker after a real commit, the new method is requested at **6144**, while the broker head is **2048**. It succeeds with **`{ rows: [] }`**, with **zero** `awaitSnapshotBasis` and **zero** `snapshotRows` calls. Q89c requires a typed refusal at an unmet basis. All **seven selected original inventory/construction tests** still pass, including all four original resolved-type mutations; the eighth passing case is the independent counterexample assertion. The two existing native methods remain available.

Executed command:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-4-R10-launder -- node lab/verify/P2Q/scripts/round10-launder.mjs
```

Evidence: durable attempt `16ad793f-39c6-4d0e-a88a-9d555da30a56/native-launder/`, particularly `cases/round10-native-laundering.json`, `vitest.json`, `receipt.json`, and the exact archived scratch source under `scratch-round10/native-launder/`.

**Proposed fix:** bind construction provenance to the service's actual policy/approved continuation rather than accepting the generic global marker. Resolve and compare every public native member, including symbols, against the approved operation table and actual runtime surface. Retain this real future-position mutation as a negative gate: it must fail construction/type/coverage checks or produce the required typed basis error. Checking only frozen/null-prototype state and membership in the global WeakSet is insufficient.

This finding concerns the required extension-prevention guarantee. It does **not** claim that one of the current 24 enumerated reads bypasses its policy.

### F2 — Medium: symbol table entries survive the public type but disappear at runtime

**Locations:** `packages/core/src/storage/ReadSurface.ts:26`, `:52`, `:74`; `packages/qlever/src/native/NativeQueries.ts:296`.

The constructors iterate with `Object.keys`/`Object.entries` but return mapped types over **all** `keyof T`. TypeScript accepts a symbol operation in a literal containing the existing string operations. Construction silently drops that symbol.

**Reproduction:** `round10-symbol-scratch-retry.mjs` adds a symbol operation to the real native dispatch table, mapping to the original gated answering continuation. The unchanged two inventory tests and actual runtime construction test all pass. The fourth selected case shows that the inferred public method is `undefined`; calling it with future position 6144 throws **TypeError: ... is not a function**, rather than producing a typed read refusal. A separate compiler-host consumer check confirms that calling the method is accepted by the actual TypeScript checker, with zero consumer or implementation diagnostics.

Evidence: attempts `c6f6a436-bb63-4828-871c-7705aa88e33b/native-symbol/` (**4 passed / 7 filtered**) and `109234f7-cd12-4022-99d7-1ae514596e12/symbol-consumer/` (**1 passed**), plus archived `scratch-round10/native-symbol-retry/`.

**Proposed fix:** either support the full declared key set using appropriate own-key/descriptor enumeration and construction, or explicitly reject unsupported symbols/inherited/non-enumerable operation shapes in both types and runtime validation. Do not assert that a filtered subset of runtime keys implements the complete generic input type. Add a real native public-type/runtime-key equality test; `reads.length > 0` and a two-string inventory miss this case.

The first symbol attempt used an invalid non-serialized DatabaseScope and failed before the observation. That first receipt remains rejected and unchanged. The corrected attempt uses `DatabaseScope.test`; no product assertion or budget was weakened.

## Coverage and validation

All commands ran through `lab/bin/heavy.mjs`, with the 5 GiB admission floor checked before each gate. Live requests were restricted to `http://127.0.0.1:7070`; no engine lifecycle action or exclusive reservation was used. Timings remain **DIAGNOSTIC (Q91a)**.

| Matrix | Fresh result |
| --- | --- |
| Earlier offline rounds 4–7 | 802 passed, 14 live-only skipped; 816 total |
| Round-8 snapshot/basis/pagination/history plus builder construction tests | 17 passed, 6 live-only skipped; 23 total |
| Foundation/durability/locking/feed/outage/source-audit gates | 46 passed; 60 durability fuzz seeds and full outage-scale inputs |
| QLever package | 224 passed, 26 integration skips; 250 total |
| Focused core read-basis and KV store/query | 28 passed |
| Core standard noEmit | Passed, empty diagnostics |
| QLever/current-core source-alias noEmit | Passed, empty diagnostics |
| Earlier live-enabled matrices | 54 passed, including 22 live cases and 32 repeated offline controls |
| New live snapshot/basis/pagination/history | PENDING |
| Actual installed-undici catalog upgrade negative mutation | PENDING |
| New extension/type controls | 20 passed |
| Original inventory in scratch | Baseline 2 passed; direct/inherited/merged each 2 passed plus 1 expected inventory failure |
| Symbol-in-native-table mutation and compiler-checked consumer | 4 passed plus 1 passed; original three selected guards stay green |
| Real native identity-laundering mutation | 8 passed, including all seven original selected guard tests and the counterexample |

The source-bound receipts use fresh UUID output/state roots, exact source/dependency hashes before and after, actual heavy-owner bytes, exact commands/environment, JSON assertion identities/statuses, strict count denominators and exact expected mutation failures. An exit zero or a declared `accepted` flag is not itself adopted as semantic evidence.

The original direct, inherited and declaration-merged probes now fail the actual inventory as required. Independent scratch controls still show that their added raw methods are callable and bypass policies; the fixed guard detects those additions rather than merely testing unused text. The real implementation and independent type-level coverage checks reject all three variants. Runtime probes cover subclass instance fields and prototype methods, mixins, Object.assign, deep inheritance, own/inherited getters returning functions, own/inherited symbols, hidden symbols and non-enumerable methods: all **12** raw additions are rejected by the exact builder descriptor walk. Four later mutations of a frozen constructed service fail with TypeError. Supplemental helper probes document dropped inherited/symbol table keys and generic identity laundering; only the compiler-checked, real native mutations above support the findings.

PENDING independent final readback: full-byte comparisons, future-refusal fields, actual later retirement log records, unchanged product source, contract-pin search and durable manifests.

## PASS/verdict/receipt audit (rule 9a)

| Decision site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `scripts/round10-gate.mjs` receipt `accepted` | Recounts actual per-case JSON statuses, exact expected pass/fail/total denominators, aggregate agreement, correct exit and exact expected-failure pattern. Compiler acceptance requires empty successful diagnostics. | Exclusive fresh output, UUID, result start/mtime inside producer interval; refuses output reuse. | Source/dependency preimages rehashed after execution, exact command/env/inputs/head/target and unique actual heavy-owner bytes unchanged. |
| `round10-matrices.mjs`, `round10-probes.mjs`, symbol/consumer/launder controllers | Print completed process status and durable path; semantic adoption is delegated to the strict gate and final readback, not their own exit/status text. Scratch setup failure aborts its dependent probes. | New durable UUID per controller; fresh per-gate paths. | Explicit command/test sets, current target, parent heavy PID and label passed into each child gate. |
| `tests/round10-construction.test.ts` assertions/artifacts | Extracts the exact original builder `inspect` declaration, exercises 12 raw routes and four frozen mutations, and asserts the precise counterexample bytes/call counts. Runtime-only helper probes are not treated as compiler proof. | Newly built objects/counters and attempt-specific output paths. | Original guard SHA, source-alias imports, exact route definitions; gate binds all source/test bytes and actual slot. |
| `tests/round10-types.test.ts`, `round10-public-type.test.ts` | Real compiler programs check actual mutated implementation, resolved table coverage and a separate consumer; positive baselines require no diagnostics, raw additions require the missing-member diagnostic. | Fresh compiler host/program per variant; current source read in this invocation. | Exact interface/body mutation and actual production files/public inferred native return type. |
| Scratch generators and inherited/merged controls | Preserve original guard bytes; hash direct/inherited/merged inputs; controls require a real public type property, callable implementation, future cut and exact empty bytes/zero policy calls. Generated path/hash output alone is not a verdict. | New scratch directories and runtimes; original failed fixture retained separately. | Only owned copies changed; gate snapshots the complete scratch file set and referenced installed modules. |
| Native-symbol and native-launder scratch assertions | Check actual implementation diagnostics, inferred public symbol, exact missing-method error or `{rows:[]}` bytes, real required/observed broker positions and zero policy calls. Original guard tests execute unchanged alongside them. | Fresh source copy, unique state/output and actual commit; independent retry after initial invalid scope. | Actual native factory, exact symbol/continuation mutation, source aliases, full scratch preimages and per-attempt slot. |
| Existing rerun matrices | Retain their exact error class/reason/required/observed/replica checks, decode/HTTP controls, full payload/snapshot comparisons, outage publication and durability/oracle assertions. | New per-attempt state, graphs, commands and result files. | Actual current sources, selected clients/routes/cuts, dependency bytes, input sizes/seeds and source/slot-bound producer receipts. |
| `scripts/round10-seal.mjs` final summary | Reopens receipts, logs, results and source preimages; checks counterexample content and original guard statuses; independently compares full bytes and parses CRC-chained actual retirement frames. Keeps rejected/expected-negative attempts distinct. | Only current-attempt producer files with verified timestamps and distinct nonces; output refuses reuse. | Exact target/head, producer receipt/log/result/case/source hashes, actual owner records, requested cuts and matching transaction/log identities. Own source SHA/actual seal slot checked before/after. |
| `scripts/round10-finish.mjs`, external SHA256SUMS and repo index | Requires fresh content-checked summary, byte-checks every migrated state/scratch file before/after and through preserved original receipt paths; hashes actual retained files, never flips earlier failed flags. | Executes after gates, exclusive new summary/finish/manifest outputs, fresh operational observation. | Finalizer/seal source hashes, actual heavy owner, current head, summary SHA, exact owned source/destination paths and complete byte manifests. |
| This report/verdict | FIX-FIRST follows the real unmet-basis counterexample and missing typed method, with bounded claims about existing reads and conditional extension mutations. No counterexample/negative-control pass is labeled product acceptance. | Written after this review's reruns and sealed readback. | Builder 1096fb8, integration 506032eb, committed test/runner bytes and external evidence manifest. |

## Contract pins, evidence and limits

PENDING pin results and evidence manifest.

No main-checkout edits, `lab/acceptance/` edits, product fix, dependency install, push, main merge, package publication, deployment, root monorepo check, pack/consumer build qualification, other-engine checks or performance acceptance. QLever typechecking used current core source aliases because generated core declarations are not rebuilt in this verifier; this is not a packed-consumer claim. All fixture state, first failures and exact scratch mutations are retained. No process or engine was stopped to obtain a passing result.

Open questions: none requiring user input. Builder action is required for F1/F2 before this construction guarantee can be accepted behind its default-off option.
