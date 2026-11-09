# CX-VDA01: joint DA00 / DA01 review

**Verdict: FIX-FIRST.** One reproducible historical-read correctness defect remains in the native gateway's live-index guard.
Do not merge this revision as the qualified lane D adapter until F1 is fixed and independently rerun. The ordinary TypeScript
adapter and compiled Datalog controls passed. Any eventual adapter merge remains default-off for acceptance until DA04 under Q88a/b.

Reviewer: CX-VDA01, adversarial review; branch `verify/DA01`. Reviewed candidate
`9df8c63be4c7de786103e974f1b1f0a54bc5bfa4` (DA01, carrying DA00 `702643f`), including executable implementation `6f70eb46`.
Only this review directory was changed. No candidate implementation was fixed.

North star: P1 exact immutable read cuts, P2 atomic/idempotent commit prerequisites, and P4/P5 subject-index correctness.
Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`.
Reviewed the three-round report and summary, R29, the DA00 review, Q85a-d, Q88a-c, Q89b-e/i, and R31 sections 2-3 and 5.2-5.5.
Q89a/Q90's separate record-time redesign remains a declared dependency, not implemented by this review.

## F1 — High: variable attribute selection bypasses the native live-index basis guard

**Location:** `packages/datomic/gateway/src/triplex/gateway/query.clj:36-38`.

The guard recognizes `:f/live` only when it is literally the second element of a vector. Valid, allowlisted native Datalog can
bind that attribute through `ground`, or find its ID through `:db/ident`, then use the variable in the attribute position.
Both forms miss the guard and execute against the position-retired live index at T and TP bases. Missing retired rows cannot be
recovered by the query's ordinary visibility predicate. This violates Q89b/c and produces Q89i repeat drift.

**Fresh reproduction:** `native-repro.mjs`, final full response evidence
[`CX-VDA01-native-7a3e1741-4fd4-4438-a8b5-91bb0b6926f9.json`](CX-VDA01-native-7a3e1741-4fd4-4438-a8b5-91bb0b6926f9.json),
with [`native-visible-confirm.log`](native-visible-confirm.log). This version includes the real Triplex visibility predicate;
the result is not a raw-lifetime-history comparison.

1. Create an owned scratch scope through the shared gateway. Commit 40 assertions, position 1, record time 10, valid-from 0.
2. Read at `{ validAt: 30, recordedAt: 10 }` using:

   ```clojure
   [:find ?id :in $ $rules :where
    [(ground :f/live) ?a]
    [?f ?a _]
    [?f :f/id ?id]
    [(triplex.gateway.query/visible $ ?f 30.0 10.0 nil)]]
   ```

3. The request returns HTTP 200 and 40 assertion IDs. Commit retractions of 10 assertions at position 2, record time 20.
4. Repeat the identical earlier read. It returns HTTP 200 and only 30 IDs. Its requested T is unchanged and the later retractions
   should be invisible. A source-row read still returns all 40.
5. The direct `[?f :f/live _]` form correctly returns HTTP 409 / `BasisNotAvailable` at this basis. Replacing the `ground` binding
   with `[?a :db/ident :f/live]` also bypasses the guard and returns 30. Both indirect forms also return 30 at
   `{ validAt: 30, recordedAt: 10, recordedPosition: 2 }`, while direct selection refuses and source rows return 40.

All writes use monotonically increasing record times. This is separate from the known pre-decision/tied-stamp issue in Q89a/R33.
It requires no process stop, storage loss, unsafe query function, or production credential. It occurs on the actual current
gateway, even with the visibility predicate, so Q88a's durability classification does not make it nonblocking.

**Proposed fix:** classify route eligibility beyond the literal-vector spelling. A bounded fix is to refuse variable attribute
clauses at T/TP or other unsupported cuts whenever they cannot be proven to exclude `:f/live`, using the typed availability
error. Alternatively, provide a closed native relation/route boundary whose live-index selection is enforced outside authored
EDN. Merely adding the two demonstrated strings to a pattern list leaves other binding forms open. Retain regressions for
`ground`, `:db/ident`, both T/TP, and before/after repeat equality. No full public AST rewriter is required.

**Re-run:**

```sh
node lab/bin/heavy.mjs --label CX-VDA01-native -- node lab/verify/DA01/native-repro.mjs
DATOMIC_INTEGRATION=1 node lab/bin/heavy.mjs --label CX-VDA01-native-test -- \
  node node_modules/vitest/vitest.mjs run lab/verify/DA01/review.test.ts \
  --config lab/verify/DA01/vitest.config.ts -t Q89b
```

The first script characterizes the current defect and asserts its observed content; its exit zero is **not** semantic acceptance.
The second is the retained failing semantic regression, requiring typed refusal. All scratch databases were actually deleted.

## Independent checks and scope of their results

| Obligation | Independent observation | Result |
| --- | --- | --- |
| Q85a concurrent create | Four 16-way first-open cohorts; first successful creator writes while remaining creators finish. Exactly one reports creation; all converge, position stays 1. Four further cohorts overlap 16 reopens and repeated four-way creates with publication through position 7. | No reset observed. The unique/value bootstrap marker and position-zero header are one transaction (`main.clj:17-26`, `schema.clj:10`). No timing hook inside the shared JVM was installed, so the builder's deterministic stale-initializer schedule was inspected, not independently re-instrumented. |
| Q85b public scopes | Actual public constructor with controls including NUL, quotes/slashes, astral Unicode, lone UTF-16 surrogates, trim-sensitive strings, generation -0/MAX_SAFE_INTEGER, and a 3,000-character name. Base64url inverse equals original scope bytes. Invalid generation/canonical encodings refuse. Existing public-scope live cases also execute. | Pass on the exercised constructor classes; no claim of exhaustive enumeration of every string. |
| Q85c context integrity | `context.mjs` rehashes the actual distribution and this worktree's config/gateway/spec against the final build receipt. Stages two new contexts; each matches all 811 inputs and the exact build-input hash. Reused directories, extra files, symlinks, empty directories and changed bytes refuse. | Fresh staging reproducible. Actual Docker image compilation was **not rerun**; this review uses only the shared gateway and makes no lifecycle changes. Historical image-build receipts remain historical. |
| Q85d codec | All 69 shared acceptance vectors run independently at the TS validator and live JVM `decode-row` boundary through speculative `d/with`; acceptance/refusal agrees, and the committed head stays zero. The 16 TS round-trip vectors also execute in the existing suite. | Fresh acceptance agreement, with actual JVM execution. The generic JVM encode/round-trip selftest was inspected and its historical 157-assertion result reviewed; no separate JVM/selftest container was launched. |
| Q89d multi-request cut | Independent optional-pull schedule commits after first `/q`; output stays at old status and one held query handle is released exactly once. Existing live rule-round replacement and release-on-error tests independently rerun. | Pass; no mixed cut observed on compiled queries. |
| Q89c/d future P | Populated/empty batch, entity, dependency and compiled query routes wait and return `DatomicBasisNotAvailable`; stale held DB refuses even after publication. Unheld read succeeds after catch-up. | Pass on exercised routes. |
| Q89d subject lookup / position seek | Inspection confirms batch subjects resolve unique identity then VAET `:f/subject` (`storage.clj:190-212`), not a scope `:f/id` enumeration. Position lookup uses first `d/index-range` entry (`:138-148`), not the removed map. Missing/duplicate/empty batches and sparse/interior cuts execute live. | Correct indexed paths in inspected source; no fresh JVM call instrumentation or scale-cost benchmark through the gateway. `dependencyState`'s full-scope history scan remains declared. |
| Q89b/e | Full-history route returns 40 at T/TP after 10 retractions; forced live pull and literal live native EDN refuse. | **Fails for indirect native selection: F1.** Default runtime still uses the full-history route; no P4 live-index promotion is implied. |
| Q89i immutable rows | Complete row bytes at P=0/1/2/3, TP, and a settled T compare identically after later retractions, including an interior ordinal. Seeded O-REPLAY fixture reruns across source, held, staged and guarded live routes. | Ordinary row routes pass these checks. **Native indirect live query drifts 40 to 30: F1.** |
| Idempotent receipt | Public duplicate yields established `CommandAlreadyCommittedError` with original tx ID; `transactionByCommand` returns byte-identical original receipt after intervening assertion/retraction; duplicate does not advance head or publish replacement. Injected lost ACK after real commit resolves the original outcome. | Functional pass; **durability/P2 acceptance DIAGNOSTIC under Q88a**. The public contract identifies the original receipt via typed error plus lookup, not a second successful `TransactionResult`. |

## Executed evidence

- [`final-tests.json`](final-tests.json): **123 passed, 1 failed, zero skips**, 124 total. The only failure is F1's semantic
  regression. All 116 existing Datomic tests pass: 94 codec/transport, 6 compiler/kernel, 11 adapter, 4 read-pin, 1 route-equivalence.
  Seven of eight new review tests pass. [`final-tests.log`](final-tests.log) retains command admission/output.
- [`CX-VDA01-conformance-b80d71a2-729c-442f-8de2-4d0640996fc3.json`](CX-VDA01-conformance-b80d71a2-729c-442f-8de2-4d0640996fc3.json):
  freshly built public core/testkit/Datomic exports; unchanged complete 44-case suite passes, plus **44 current + 44 second-opening
  cases pass**. All **89/89 actual database deletes** succeed. This is independent conformance execution, not a canonical G1
  promotion receipt. Second-opening cases use new scopes, not crash recovery. [`conformance.log`](conformance.log).
- [`context-results.json`](context-results.json), [`context-manifest.json`](context-manifest.json): exact fresh-context results.
  Scratch copies were task-owned and quiescent; only those copies were removed. Original ZIP, extracted distribution, builder
  contexts and receipts remain untouched.
- `attempts/`: per-attempt source manifests, candidate head, gateway identity, owner bytes, every request/result/error,
  codec case outcomes and actual cleanup. Final O-REPLAY outputs are under `route-gate-final/`.
- [`build-2.log`](build-2.log): local public package builds and declaration emission pass. Frozen offline pnpm 10.11.0 install
  uses the required owned store. No dependency or lockfile changed.
- [`SUMMARY.json`](SUMMARY.json) and [`FILES.json`](FILES.json): validated outcome summary and final file hash index.

**Gate-policy review:** the 16 new Datomic G0 skip names are exactly the 16 engine-dependent tests; all execute and pass in
this live review. Existing X/Q skip lists are unchanged by DA01. The added G1 route step requires one executed passing test,
zero pending/failing tests, six evidence files, stable built exports and stable resident identity. These are appropriate
extensions to the gates. However the bounded route fixture exercises source/held/staged/live pulls, not variable-attribute
native queries, so its PASS cannot establish F1's native guard. No existing 44-case test was weakened.

## First failures and limits

`live-1.log` retains two reviewer fixture errors: its handle trace included the injected writer's handle, and it incorrectly
called `transact` with a callback. `review-first.test.ts.txt` preserves that first test source. `live-2.log` retains a third
incorrect expectation that duplicate `transact` returns success; the established API instead gives the original receipt's ID in
a typed error. Those are review setup errors, not findings against DA01. Corrected `live-3.log` passes 124/124 before adding
the indirect native selection. `live-native-indirect.log` and final tests retain the real F1 failure. Earlier native characterization
attempts remain; the final `native-visible-confirm.log` adds explicit Triplex visibility and exact source binding.
`build-first.log` retains pnpm rejecting `--store-dir` for `run`; the corrected build uses the equivalent explicit
`--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store` option.

No image build, park/restart, Docker access, slot acquisition, process-stop durability test, deployment, merge, push or publication
was performed. Shared resident owner stayed EXP-DA01, gateway stayed Datomic 1.0.7745 / source
`92c14a52764a4933376e8efbf4b7164a4d8f0318fe7996d6ac3ac8242e62386f`. Both retained DA00 proof databases are checked again by
the collector. All engine-backed runs, builds and context fingerprints went through `lab/bin/heavy.mjs`, with host free disk
above 5 GiB. No unknown/backend forensic state or original evidence was deleted.

Q88a dev storage remains DIAGNOSTIC for durable readback, lost ACK, P2 receipts and final acceptance. There is no new durability
verdict here. Production SQL storage, authentication, tenant/storage isolation, erasure, cancellation/resource qualification,
full root checks/pack checks, scale and P1-P5 performance were not verified. The existing root pack-check failure on the CLI
is not adopted as a Datomic defect. Record-time decision stamps/watermark and the public position API remain Q89a/Q90/Q89g work.

## PASS / verdict / receipt audit (rule 9a)

Every place this review turns observations into an outcome is listed here. Test success never overrides F1 or grants production
acceptance.

1. **`review.test.ts` assertions and completion event.** Content: exact rows/counts/receipts and typed errors, including the
   required refusal. Freshness: new UUID attempt and scopes; callbacks force the query/write interleaving in this attempt.
   Binding: candidate/source hashes, per-request db/handle/basis, owner bytes and expected live gateway source before/after.
   Completion checks source/owner stability and the exact created/deleted scope lists; it is cleanup completion, not a verdict.
2. **`context.mjs` / `context-results.json`.** Content: exact path/length/hash comparisons, plus every refusal assertion.
   Freshness: exclusively new scratch contexts in this invocation. Binding: actual distribution and candidate source manifests
   must equal the final build receipt and input hash. Its result explicitly says `imageRebuilt:false`; no historical image PASS
   becomes a fresh one.
3. **`conformance.mjs` per-case PASS/FAIL and final completion.** Content: actual unchanged testkit Effects, expected denominator,
   no failed exits, successful exact-db deletes. Freshness: UUID run/scope per execution and actual start/end times.
   Binding: reviewed head, exact fresh built-export manifest checked before/after, owner bytes and live source identity.
4. **`native-repro.mjs` finding characterization.** Content: literal refusal/source 40/indirect 30 controls, earlier 40 versus
   later 30 response bytes, explicit visibility predicates. Freshness: new UUID owned scope and sequential real commits.
   Binding: candidate head/source hashes, script hash, gateway source and owner before/after, every body/raw response and actual
   delete. `findingReproduced:true` means a defect was reproduced, not acceptance.
5. **Existing package tests / O-REPLAY fixture rerun.** Content: existing assertions and independent oracle equality/refusal
   checks execute; final JSON lists all actual outcomes. Freshness: new test scopes/oracle UUID directories, final invocation
   timestamps and raw outputs. Binding: this worktree's source via the review config, source fingerprints and gateway identity
   retained alongside the run. The fixture's native-query coverage limitation is stated above.
6. **`collect.mjs` / `SUMMARY.json` FIX-FIRST.** Content: verifies the exact F1 failure, actual 40/30 bytes and literal/source
   controls; verifies conformance, context results, skip-name execution and cleanup separately. Freshness: selects the exact
   current repro script hash and checks attempt ordering/timestamps, never an older PASS. Binding: source equality to candidate,
   source/built artifact hashes, the same owner/source identity, actual preserved DA00 proof readbacks. `FILES.json` then hashes
   retained artifacts; its own file and active collector stdout are excluded. This is a review verdict only.

Open action: builder fixes F1 without weakening typed refusal, then an independent reviewer reruns the native forms and the
read/conformance controls. No other new blocking finding was established by this review.
