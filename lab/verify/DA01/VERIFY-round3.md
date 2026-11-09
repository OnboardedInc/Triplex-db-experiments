# CX-VDA01 round 3: canonical native query review

**Verdict: ACCEPT — merge as lane D's adapter.** Both prior findings are closed; no new finding was established. All 131 combined
tests pass. This is an adapter-merge verdict; dev-storage durability remains DIAGNOSTIC and final acceptance stays default-off until DA04.

Candidate: `89c31355ec63d4dc01a337ec73ef4ef394b77293`, executable implementation
`1c3739edb1d0e88bf46bbdd022de17f80b3a8ba4`; parser implementation `9d9cd988`.
Merged into `verify/DA01` as `87124a17fca92f1aa0d432c0aba429cce6241007`, as requested. No main merge or push.
Only reviewer tools/evidence under `lab/verify/DA01/` were edited; candidate implementation remains identical to the reviewed head.

North star: P1 immutable named cuts, with P2 receipt prerequisites and P4/P5 correct read paths.
Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/PROTOCOL.md`, Q85/Q88/Q89, and the builder's round-5
report and summary. Durability and P2 receipt acceptance remain **DIAGNOSTIC under Q88a**.

## Finding disposition and source review

**No new findings. Original F1 and R2-F1 are closed on the exercised paths.**

- Original indirect `:f/live` selection through `ground`, `:db/ident`, explicit sources, numeric/omitted attributes and nested
  clauses still refuses T/TP and unsupported interior cuts. The prior semantic regressions pass unchanged.
- Repeated `:where` sections now merge before classification; a live selection in any section reaches the historical live
  guard. Repeated conflicting `:in` bindings now return HTTP 400 / `InvalidValue` before execution. The old repeated-section
  characterization records HTTP 409 for the previously answered historical live request and 400 for conflicting bindings,
  while history still holds 40 rows. Its old assertion expecting HTTP 200 fails as expected; this is evidence of closure,
  not a failed correctness gate. [`round3/original-repro.log`](round3/original-repro.log) and its UUID-named native receipt retain
  the exact request/status/raw response and actual successful deletion.
- `canonical.clj:38-65` converts vector/map surfaces into one map, merges `:where`, normalizes identical headers and `:with`,
  and refuses conflicting inputs/projections. `canonical.clj:66-73` reads exactly one EDN value. The old first-section extraction
  path is gone.
- At `query.clj:44-50`, the same `query` map is used for route classification, the shared
  `storage/assert-subject-route!` check and `d/query`. The original surface vector is not passed to the Peer. Actual route
  responses and complete result sets are tested below; acceptance does not rest solely on that source observation.
- Native rule invocations, `%` bindings, native pull projections, nested map terms and unknown sections are explicitly outside
  this closed gateway grammar (`canonical.clj:12-36`, `:60-63`). They produce typed refusal. Supported Triplex self-recursive
  binary rules and optional history pulls continue to execute. This review does not claim newly delivered native pull or
  cross-rule composition support.

## Independent generated surface checks

[`round3-surfaces.test.ts`](round3-surfaces.test.ts) constructs its own canonical controls and variants; it does not reuse the
builder's generator. Actual gateway route and complete sorted string results must equal the canonical control and history
at the driver-recorded basis. Wire result arity and string tags are checked too. Held and speculative calls alternate with
ordinary requests; every request/pin and response is retained by the fixture.

**814 generated observations passed:**

| Family | Generation and oracle | Observed outcome |
| --- | --- | --- |
| Equivalent native surfaces | 19 forms × 8 cuts × history/live × before/after later writes | **608:** 418 exact route/result answers and 190 required `BasisNotAvailable` refusals; zero unexpected `InvalidValue` refusals. |
| Unsupported binding/body/pull forms | 25 grammar classes × plain/comment+metadata/discard decoration × latest/T | **150:** exact HTTP 400 / `InvalidValue`; no accidental execution. |
| Supported recursive rules | Six aliased/reordered/duplicate-base definitions × four bases × before/after writes | **48:** complete results equal independently calculated reachability over history edges. |
| Cross-rule composition | One cross-rule program at four bases, before/after writes | **8:** typed core `DatalogValidationError`, matching the existing public contract. |

The 19 equivalent forms cover vector and map queries, list-valued map sections, reordered sections/data clauses, every-clause
split `:where`, repeated `:where`, identical `:in`/`:find`, deduplicated `:with`, repeated data clauses, variable renaming,
explicit `$` patterns, nested `or-join`/`and` and `not-join`, commas, line comments, whole-query/clause/variable metadata,
and leading/trailing EDN-discard forms. The canonical control must itself match the history oracle; merely refusing every
surface cannot pass. No equivalent form fell back to the permitted unsupported-form refusal in this run.

The native binding classes cover source/default/alias and order, scalar, tuple, collection, relation and `%` rules bindings,
extra/mixed/repeated bindings and absent inputs. Only the closed gateway's exact `$ $rules` order is supported; other legal
Datomic binding families are tested as typed refusals. Identical repetitions and vector/list-valued map representations
of the supported bindings are tested as equivalent answers. This is grammar-class coverage, not enumeration of infinitely
many variable names or arbitrary user programs.

Nested native rule tests include a rule body calling another rule, direct and nested positive/negative rule invocations,
and their decorated forms. Pull tests include a projection and function form with maps nested inside vectors inside maps,
and nested map values in ground/data positions. All refuse with `InvalidValue`. Real supported self-recursion is tested over
a reference chain that is later broken, rather than only self edges; reversing definition order, alpha renaming and duplicate
base definitions must preserve the history-derived closure.

Cuts are latest record state, valid start/expiry, old physical P, interior logical P, T, TP and future P. The two phases include
real retirement of subject/status/edge facts plus a new subject. The record stamps increase from 10 to 20 to 30. Named old cuts
therefore do not depend on the unresolved decision-stamp/watermark work.

## Full controls and evidence

- [`round3/baseline-tests.json`](round3/baseline-tests.json): **128/128 passed, zero skips/failures**, including all prior
  reviewer and existing Datomic tests. The prior 916-observation independent matrix and public cursor-straddling tests rerun.
- [`round3/surface-tests.json`](round3/surface-tests.json): **3/3 new tests pass** with the 814 generated outcomes above.
- [`round3/final-tests.json`](round3/final-tests.json): **131/131 passed, zero skips/failures**, combining the prior suite and
  all new generated checks in one fresh invocation against the merged candidate.
- The **916-observation matrix** crosses 24 cuts with 15 base paths and seven public paths where representable. It covers
  repository reads, compiled Datalog, recursive rules, optional pulls, dependency metadata, executor pagination, native
  history/live, forced live pulls, and held/speculative values. Every answer matches history and every ineligible path has a
  typed refusal. Public query/entity cursor continuations preserve their original cut across actual later writes, with the
  complete subject set and no duplicates. Basis-free get/history contracts also rerun.
- [`round3/conformance.log`](round3/conformance.log) and its UUID-named receipt: the unchanged complete suite and
  **44 current + 44 second-opening cases pass**, with **89/89 successful actual deletes**. Public core/testkit/Datomic export
  bytes are bound before/after; the package build completes successfully with the pinned owned pnpm store. Second openings
  use new scopes and are not crash recovery.
- [`round3/context-results.json`](round3/context-results.json): **two fresh contexts reproduce all 812 verified inputs**, the
  round-5 build-input hash and each other. Reused/dirty directories, extra files, symlinks, empty directories and changed bytes
  refuse. Task scratch copies are removed after checks; original inputs and builder contexts remain. No Docker image rebuild
  or JVM/selftest container was run here; the builder's 2,484-assertion selftest remains historical evidence.
- `round3/attempts/` contains candidate/reviewer source hashes, live owner/health, every requested EDN/basis/handle/staged
  input, actual response/error, expected/actual comparisons, coverage and real cleanup. O-REPLAY outputs and the rerun
  builder matrix/property fixture are retained under this round's route directories. No builder PASS is adopted as fresh.
- `round3/SUMMARY.json` and `round3/FILES.json` are produced only after the collector checks the final contents, source binding,
  denominators and cleanup. Earlier round receipts and failures remain intact.

The review uses only shared `tx2-datomic-dev` through its gateway, owner EXP-DA01, Datomic 1.0.7745, expected gateway source
`ebddb75ea2e100bb041459130017a2dd39f516bdee58ea37b9fd782f5fd11c92`. Each fixture checks source/owner/health stability.
Both retained DA00 proof database bodies are reread at collection. Heavy runs use `lab/bin/heavy.mjs`; full shared admission
caused waits recorded in the logs, and host free disk was checked above 5 GiB before new admissions. No unrelated job was stopped.

Fresh rerun (choose a new evidence directory each time):

```sh
DA01_AUTHORITY_SUMMARY=lab/experiments/EXP-DA01/round5/SUMMARY.json \
DA01_REVIEW_OUTPUT=lab/verify/DA01/round3-rerun \
DATOMIC_INTEGRATION=1 DATOMIC_ROUTE_EVIDENCE_DIR=lab/verify/DA01/round3-rerun/oracle \
node lab/bin/heavy.mjs --label CX-VDA01-R3-rerun -- \
  node node_modules/vitest/vitest.mjs run --config lab/verify/DA01/vitest.config.ts
```

## Limits and retained boundaries

This is an adapter merge review. Q88a's development storage makes durability, durable readback, lost ACK and P2 acceptance
DIAGNOSTIC; DA04 remains the acceptance-storage prerequisite and the adapter stays default-off for final acceptance.
The review makes no P1-P5 performance, scale, production, authentication, storage-tenancy, erasure, full cancellation/resource,
root-wide check or fresh package-consumer claim. It performs no candidate fixes, Docker access, engine lifecycle change,
exclusive slot acquisition, process-stop test, main merge, push or publication.

Public `TemporalBasis` still has no arbitrary position field; P/TP coverage uses the SPI and positions captured by public
pagination. Physical historical P may use `:f/live` on an immutable `as-of` database under Q89e; T/TP and unsupported interior
live routes must refuse. Unsealed future record times remain Q89a/Q90 work and are not qualified immutable snapshots here.
Native `%` rules, native nested-map pull projections, cross-rule composition and alternate native input bindings remain
unsupported with typed refusal. The generated corpus is finite, with source inspection supporting its interpretation; no
claim that every possible EDN program has been enumerated is made.

## PASS / verdict / receipt audit (rule 9a)

1. **Existing/prior tests and `round2-matrix.test.ts`.** Content: real assertions for snapshots, exact sets/metadata, typed errors,
   recursion, optional values and complete cursor continuation. Freshness: new UUID scopes, real later writes and new oracle
   output directories in this round. Binding: exact candidate hashes, requested cuts/handles, current round-5 gateway and owner,
   actual cleanup and current reviewer source identity. Prior round result files are not rewritten.
2. **`round2-utils.ts` completion event.** Content: exact-db delete and unchanged source/owner/health checks. Freshness: new UUID
   attempt directory/scope. Binding: head, candidate/reviewer hashes and all requests/results/errors. `finished` means cleanup
   and identity checks completed; it cannot turn a failed test into a semantic PASS. Only round authority/output inventory
   handling was generalized for reuse.
3. **`round3-surfaces.test.ts` native equivalence.** Content: canonical control matches history, then each surface's actual
   route, wire tag/arity and complete result set matches the control, or a precise typed refusal is checked. Freshness: this
   invocation's before/after writes, immutable pins and UUID scope. Binding: each observation records canonical/surface EDN,
   phase/cut/basis, history expectation, mode and actual control/result plus the enclosing source/slot manifest.
4. **Unsupported forms and recursive-rule outcomes in that file.** Content: exact `400/InvalidValue` for unsupported native
   bindings/bodies/pulls, exact history-derived recursive closure and typed cross-rule validation. Freshness: new scope and
   actual changed edge set. Binding: complete inputs/definitions/bases and observed values/errors, candidate/reviewer hashes,
   gateway/owner and deletion. Generic exceptions cannot satisfy the refusal assertions.
5. **Original `native-repro.mjs`.** Content: original repeated-section forms now record the actual guard/input refusals and
   history-40 controls; the old wrong-answer expectation exits 1. Freshness: new UUID and sequential real writes. Binding:
   script hash, query-variant flag, exact source/head/slot, request and raw-response bytes and actual cleanup. Its old
   `findingReproduced` output is not set and no successful characterization is relabeled acceptance.
6. **`conformance.mjs`.** Content: actual unchanged public-export testkit programs, the complete suite/44+44 denominator and
   exact-db successful deletes. Freshness: new UUID scopes and run/times. Binding: exact built manifests before/after, review
   merge, current live gateway and owner. Second openings and dev-storage results retain their stated limits.
7. **`context.mjs`.** Content: actual path/length/hash equality and each dirty-context refusal. Freshness: two exclusively new
   contexts. Binding: current verified distribution/config/gateway/spec and round-5 build-input receipt. It explicitly marks
   `imageRebuilt:false`; original inputs and builder contexts remain untouched and only quiescent task scratch copies are removed.
8. **`round3-collect.mjs` / final summary / file index.** Content: requires the final 131 actual passes with no skips/failures,
   prior reproduction refusals, all 916 comparisons, 608 surface observations, 150 native refusals, 48 rule answers/eight typed
   rejections, conformance, context results and real cleanup/preservation. Freshness: selects current reviewer-source attempts
   from this round and checks final-run timing, never an older PASS. Binding: exact candidate/review merge, source/built/script
   digests, owner/live source identity, actual retained DA00 bodies and delivered file hashes. The index and active collector
   stdout are excluded from their own hash list. Any failed check prevents the summary/ACCEPT publication.

Remaining work: DA04 and the separately listed production/semantic/performance obligations. There is no unresolved new
adapter-merge blocker from this review. No main merge was performed.
