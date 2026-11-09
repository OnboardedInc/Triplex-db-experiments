# CX-VDI01: EXP-DI01 round 3

**Verdict: ACCEPT-OFFLINE. R2-F1 is closed.** No blocking finding remains in the assigned scope. The final pinned-row validator now returns the same tagged refusal as the reader helpers, and the exact round-2 counterexample passes with unchanged durable state, reopen, and identical-page recovery.

Scope: **R2-F1 only**, a P3 correctness fix under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Reviewed `b256d60c`, fix `16216de6`, after the requested merge into `verify/DI01` in separate commit **`fa827a3c524098829f9c28f3e03207245e331a44`**. All fresh gates below ran on that committed merged tree. No code under review was fixed by the reviewer; no subagents were used.

## Fix verification

The shared DI01 `BasisNotAvailable` class is now defined at `packages/host/src/feed/DependencyIndex.ts:13`, publicly exported by the existing `feed/index.ts` star export. `lab/bench/lib/di01-refs.ts:12` re-exports that exact class. The independent probe checks strict class identity, and the thrown error is an instance of both imported references. The host imports no lab code.

At `DependencyIndex.ts:203-229`, every branch of the final row guard throws this class with `_tag: "BasisNotAvailable"`, `reason: "row-outside-basis"`, requested `{position, validAt}`, and the offending `observedRow` coordinates. The guard covers five condition groups: unrequested entity, invalid/out-of-cut recorded position, retraction at/before the cut, future valid-from, and a present valid-to. The optional coordinates are retained exactly when present. The unrequested-entity detail distinguishes that condition.

The fresh independent matrix exercises all five groups, with seven concrete rows: unrequested entity; future, zero and fractional recorded positions; retracted row; future valid-from; bounded valid-to. Each returned the shared tagged error, exact requested basis, and complete observed coordinates. Instrumentation of the real `DatabaseSync.exec` method observed **zero `BEGIN IMMEDIATE` calls during every refusal**; it delegates all calls to the original method and restores the method in `finally`. Full checkpoint/dependency/effects/affected snapshots remained equal before refusal and after reopen. Backend error identity was separately checked through `consume`, and the existing suite checks both shipped helpers.

The exact round-2 GAP fixture uses the shipped memory reader, reports requested position 1/V, and returns a location row at position 2. The observed result is now:

```json
{"name":"BasisNotAvailable","tag":"BasisNotAvailable","reason":"row-outside-basis","requested":{"position":1,"validAt":1793793600000},"observedRow":{"entity":"pl:a","attribute":"location","position":2,"validFrom":1793793600000}}
```

Checkpoint, all five dependency tables, effects and affected rows equal the pre-refusal snapshot, including after close/reopen. When that row is returned at position 1, the **same page object** succeeds: checkpoint 1 and reach answer `pl:a`. Raw observations are in `probes/exact-gap.json`; the row matrix is in `probes/row-matrix.json`.

The unchanged round-2 GAP test was also run alone as a negative control. It exits 1 with exactly one assertion failure at `round2/probes.test.ts:32`: it expects the old message `Pinned reference reader returned invalid basis`, but receives `BasisNotAvailable: row-outside-basis (requested position 1)`. There is no import/setup/database failure. The independent inverted test above checks the actual tag, class, fields and recovery, rather than interpreting that negative-control exit alone as acceptance.

Static search of DI01's consumer and reference helpers found no remaining **untyped unavailable-reference-basis or retention refusal** in the supported fixed-V profile. Remaining plain errors concern invalid configured input, unsupported fixed-valid-time reference shapes, unsafe input coordinates, invalid obligation input, and protocol/configuration assertions. These are unchanged from the previous review, separate from R2-F1's returned-row basis refusal. Reader exceptions are still awaited without catching/wrapping them; there is no retry or continuation at a newer position. The only consumer catch is the existing obligation transaction's rollback-and-rethrow.

## Source and merge binding

The merged `packages`, `lab/bench`, `lab/scenarios` and `lab/acceptance` bytes equal target `b256d60c`. Compared with round-2 merged code `b040f16b`, changes are confined to `DependencyIndex.ts`, `di01-refs.ts`, the refusal tests, and replacement of the old-message assertion in `di01.test.ts`. Inspection confirms only error-class ownership, error construction and tests changed; the index, affected-set and checkpoint algorithms did not change.

`ConsumerStore.ts` and `feed/index.ts` retain the exact prior conflict-resolution hashes from `aa34513a`:

- Consumer store: `22ef8081a975b3be504b694bf1b86ee2979c003c40436f48250d87483c7dc118`.
- Feed exports: `944a7073f9da7a0016a038bd4c49577dfd2ae34a82754b31555d02f8fe4e85fd`.

`source-proof.json` records actual Git-blob comparisons, current/old SHA256 for all four changed code paths and copied current preimages. `DependencyIndex.ts` changes from `0f5827443448f02558fa90c1c6ea2910882c7270c3fb3206d63ad5c1021a296a` to `983c4f0438d711c4a1badc498e5c3c5c746cc2d04f62b26e405c906054a6d0a0`; this path is not an acceptance pin. None of the four changed paths occurs in the acceptance pin inventory. **No pinned hash moved, no re-pin was made, and `lab/acceptance/` remains byte-identical to accepted main `e09c2ff4`.**

## Fresh gates

All runs use Node 22.23.2, the owned pnpm store through the accepted lab gate, `heavy.mjs` admission, and no engine slot. The serial pipeline asserts the 5 GiB host-free floor before every stage and checks HEAD and bound source hashes before/after each command.

| Gate on committed `fa827a3c` | Result |
| --- | --- |
| `python3 -I lab/acceptance/build_contract.py --verify`, separate process/log | Exit 0; byte-identical regeneration |
| DI01 suites | **18/18 passed**, 0 failed, 0 skipped |
| Lab PACK | **PASS**: 12 packages, 25 isolated entry-point imports, fresh builds/tarballs and offline clean consumer; attempt `pack/triplex-pack-vSbkWQ/` |
| Evaluator `claim.test.mjs` + `claim-round2.test.mjs` | **108/108 passed**, 0 failed, 0 skipped |
| Independent reviewer probes | **2/2 passed**: exact GAP inversion/class identity/recovery, and seven-row matrix/backend identity |
| Original round-2 GAP test, selected alone | Expected exit 1, solely from the fixed refusal replacing the old plain-error message |

The suite's original eleven-case oracle-control assertions are copied under the reviewer directory only to redirect its hard-coded evidence path. GS output is also reviewer-owned. PACK copies only registry cache bytes from `CX-VA01-040/npm-cache`, forces offline npm, rebuilds dist and installs a new consumer; no old installed consumer is reused. `steps.json` retains exact argv, timestamps, exit and SHA256 of each raw log; `binding.json`/`source/` bind executed code, reviewer tools and the original negative control. The stage controller's final exit is not used as an aggregate semantic verdict.

## Rule 9a audit

| Observation-to-verdict/receipt site | Content check | Freshness and binding |
| --- | --- | --- |
| Exact GAP inversion | Actual shared class identity, tag/reason, requested/observed coordinates, complete snapshots, retry checkpoint and reach answer | New owned database and shipped memory reader; identical page object; committed merged source/build; retained exact observations |
| Row matrix and pre-transaction instrumentation | Seven actual offending rows, all five condition groups; exact error payload and zero real BEGIN calls; full snapshots after reopen; backend object identity | New DB per row; actual original SQLite method delegated/restored; current host build and bound test source |
| Existing DI01 refusal suite | Actual error fields, full state equality across reopen and identical-page success | Fresh temp files, committed tests/helpers, raw TAP output; no inference from absence of an exception |
| Original GAP negative control | Exact failure location and old/actual message inspected; corroborated by the independent typed-error assertions | Original round-2 test unchanged, selected alone, unique process/log; expected failure explicitly excluded from conformance counts |
| Gate controller records | Actual argv/exit/log SHA256 and unchanged HEAD/source checked | Exclusive fresh log files, copied preimages, committed tree, no engine slot; exits remain individual observations |
| PACK PASS | Fresh actual builds/tarballs, offline install, strict declarations, isolated evaluated imports and CLI behavior | Gate's own input/build/tarball/command hashes and new attempt/consumer; no engine or native-backend qualification claimed |
| Source proof | Actual Git bytes equal target; exact path deltas; unchanged conflict files/acceptance | Commit IDs, current worktree equality, source preimages, script hash and timestamp |
| Inventory | SHA256 of every retained non-cache file; stable size/mtime per read and complete file/byte denominator | Runs after all writers exit, bounded round-3 root; script hash/time; self outputs excluded. Byte inventory only |
| This ACCEPT-OFFLINE verdict | R2-F1 counterexample now gives correct typed content, unchanged state and recovery; required gates inspected individually | Exact reviewed/fix/merged commits, fresh raw evidence, explicit scope and limits |

## Evidence and limits

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round3-review/`. `SHA256SUMS-round3` is relative to that root; dependency installations, npm caches and bin symlinks are excluded. Raw evidence stays outside Git; the short evidence index binds inventory metadata separately.

This closes **R2-F1 offline**. It does not claim live X/Q/D retention/reference integration, real retention compaction, host power-loss durability, production P3 performance or release readiness. No fresh full trace, 900-trial crash matrix, 100k lag probe, G0 or root pack run was made in this scoped round. Earlier evidence and limitations remain documented in the prior reports. No implementation fix, dependency/lockfile edit, engine lifecycle action, publish, push or merge into main was performed. No further change is requested for R2-F1.

Completed inventory: 150 non-cache files / 3139632 bytes. `SHA256SUMS-round3` SHA256: `8ed2227b4f0d77bbe014db6f93886fcfd9b1495eb61e856ca9bcfc6ecfe34422`. `INVENTORY.json` SHA256: `338b6fb61b81e61ccd960046321a759d7a8835083ab1658c1b0748cba44c1047`.
