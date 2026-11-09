# CX-VDA01 round 2: joint DA00 / DA01 review

**Verdict: FIX-FIRST.** The original indirect-attribute F1 forms are closed. A different spelling of the same incorrect
historical live-index access remains possible because the gateway and Datomic interpret repeated query sections differently.
One new blocking finding, **R2-F1 (High)**, is established below. No implementation fix was made by the reviewer.

Candidate: `da76bad6` on `exp/DA01-datomic-adapter`, executable implementation `b76b9c96`.
Explicitly merged into `verify/DA01` as `aea78ce0ef6c821757d04312a3077e76188e5569`; no main merge or push.
Review tools/results are under `lab/verify/DA01/`. Candidate source remains identical to `da76bad`.

North star: P1 exact immutable query cuts, P2 receipt prerequisites and P4/P5 correct subject access.
Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/PROTOCOL.md`, Q85, Q88, Q89 and the round-4 report/summary.
Dev-storage durability, lost-ACK and P2 receipt qualification stay **DIAGNOSTIC under Q88a**; the finding is a read-semantic
error without any storage loss, so that exemption does not remove it.

## R2-F1 — High: first-section route proof differs from the query Datomic executes

**Location:** `packages/datomic/gateway/src/triplex/gateway/query.clj:28-30`, used at `:33`, `:56` and `:61-62`.

`query-section` finds the first occurrence of `:where` or `:in` in vector-form EDN. The route classifier and fixed-input check
inspect those first sections. `d/query` receives the original vector and, in the observed cases, executes the later repeated
sections. Thus the central eligibility check can prove history access for one clause set/input binding while the actual
query uses `:f/live` against the current database.

This validly executes on the current fixed resident:

```clojure
[:find ?id :in $ $rules
 :where [?f :f/id ?id]
 :where [?f :f/live _]
        [?f :f/id ?id]
        [(triplex.gateway.query/visible $ ?f 30.0 10.0 nil)]]
```

The first `:where` has only a literal history-safe attribute, so `query-route` returns `:f/subject`. The executed later
`:where` uses the live index and bypasses the historical-basis refusal.

The input-binding proof has the same defect:

```clojure
[:find ?id :in $ $rules
 :where [$rules ?f :f/live _]
        [$rules ?f :f/id ?id]
        [(triplex.gateway.query/visible $rules ?f 30.0 10.0 nil)]
 :in $rules $]
```

The first `:in` passes the fixed `$ $rules` check. The later one binds the actual database to `$rules`, which the route
classifier treats as an in-memory relation. Both forms contain the actual allowlisted Triplex visibility predicate.

**Fresh reproduction and expected/actual content:**

1. Create an owned scope; assert 40 rows at position 1 / record time 10.
2. Read the first query at `{ validAt: 30, recordedAt: 10 }`: HTTP 200, 40 IDs.
3. Retract 10 rows at position 2 / record time 20.
4. Repeat the identical earlier read: HTTP 200, **30 IDs**. The history route still returns **40**.
5. Both repeated-`:where` and repeated-`:in` forms also return 30 at
   `{ validAt: 30, recordedAt: 10, recordedPosition: 2 }`. The ordinary literal live query correctly returns
   HTTP 409 / `BasisNotAvailable` at both bases.

Evidence: [`round2/duplicate-repro.log`](round2/duplicate-repro.log) and
[`round2/CX-VDA01-native-ce257165-9e69-4ac7-bded-b77d21a503d8.json`](round2/CX-VDA01-native-ce257165-9e69-4ac7-bded-b77d21a503d8.json).
The JSON retains exact EDN, requested basis, HTTP status, raw response bytes, source/script hashes, resident identity and actual
successful deletion. Its legacy `ground`/`ident` observation labels name the two new forms through `queryVariant: "duplicate-sections"`;
the recorded request bodies are authoritative. Stamps increase from 10 to 20, so this is independent of the deferred Q89a/Q90 stamp redesign.

[`round2-grammar.test.ts`](round2-grammar.test.ts) independently fails with four answered forms: repeated `:where`, repeated
`:find` plus `:where`, repeated `:in`, and repeated `:in` with explicit `$rules` live access. The exact 40/30 reproduction proves
the content error for both mechanisms; the empty result in the simpler repeated-input case is not the sole basis for the finding.

**Proposed fix:** parse and validate native EDN once into the canonical query shape that will actually execute. Reject duplicate
top-level sections, including `:where` and `:in`, before route/input classification; use that same validated representation for
`check-query!`, `query-route`, binding checks and `d/query`. Add both repeated-section regressions at T/TP and their before/after
snapshot comparison. Recognizing additional individual live-attribute spellings does not repair the first-versus-later section mismatch.

Reproduction commands (no engine lifecycle changes):

```sh
DA01_DUPLICATE_QUERY=1 DA01_REVIEW_OUTPUT=lab/verify/DA01/round2 \
DA01_AUTHORITY_SUMMARY=lab/experiments/EXP-DA01/round4/SUMMARY.json \
node lab/bin/heavy.mjs --label CX-VDA01-R2-repro -- node lab/verify/DA01/native-repro.mjs

node lab/bin/heavy.mjs --label CX-VDA01-R2-grammar -- \
  node node_modules/vitest/vitest.mjs run lab/verify/DA01/round2-grammar.test.ts \
  --config lab/verify/DA01/vitest.config.ts
```

The characterization script exits zero only when it reproduces the wrong answers; that is **not** an acceptance PASS.
The semantic grammar test requires refusal and fails on this candidate.

## Original F1 and full prior checks

- The original semantic regression now passes. `ground`, `:db/ident`, lookup-ref, omitted attribute, nested clauses and explicit
  `$` source forms refuse unsupported T/TP cuts. The fixed input-order check rejects an ordinary reordered `:in`.
- The original characterization script was rerun with only the current authority/output settings. It exits 1 at the old
  assertion `409 !== 200` because the formerly accepted pre-retirement historical live request now refuses. Its later T/TP
  requests also record typed refusals. This exit is expected closure of the old characterization, not a new defect.
  [`round2/original-repro.log`](round2/original-repro.log).
- All **124 prior tests pass, zero skips/failures** in [`round2/baseline-tests.json`](round2/baseline-tests.json).
  This includes the earlier independent scope/codec/snapshot/idempotence checks and all existing Datomic tests. The package route
  fixture now additionally executes the builder's 936-observation matrix; it was rerun, not adopted from its earlier receipt.
- Freshly rebuilt public exports pass the complete unchanged conformance suite plus **44 current + 44 second-opening cases**;
  **89/89 actual deletes** succeed. Second openings use new scopes and do not prove process-stop recovery.
  [`round2/conformance.log`](round2/conformance.log) and its UUID-named receipt.
- Two fresh contexts again match all **811 actual final inputs**, the round-4 build-input hash and each other. Dirty/reused,
  extra-file, symlink, empty-directory and changed-byte cases refuse. [`round2/context-results.json`](round2/context-results.json).
  No Docker image compilation was rerun; this proves staging integrity and reproducibility, with the historical image build
  kept distinct.

## Independent path/basis coverage

[`round2-matrix.test.ts`](round2-matrix.test.ts) adds **916 independently observed path/cut/phase outcomes** using a separate
fixture with eight subjects, differing valid-time starts, a recursive reference chain, two logical positions in one physical
commit, later subject/status/edge retirements and a new subject. Every answered route is compared with history results at the
same requested cut; expected recursive reachability is calculated from the history edge set. Optional values must match the
subject's status, and continuation cursors are traversed rather than checking only page one.

| Basis family | Exercised cuts | Coverage and result |
| --- | --- | --- |
| Latest record state / valid time | Latest at V=50; V=0,29,30,99,100,150 | All applicable paths match history before/after writes, including inclusive start and exclusive expiry. |
| Record time | T=0,5,9,10,15, including V+T | History/compiled/public paths match; native live and forced live pulls refuse. Settled named T answers repeat after later retirements. |
| Position | P=0,1,2 interior,3 physical; V+P | Answered paths match. Live selection refuses the interior logical cut. Old physical P is answered from `d/as-of` and matches history. |
| Combined record/position | V+T+P, TP-zero, TP-interior | History paths match; live routes refuse. |
| Future positions | P=1000 and TP=1000 | Every supported low-level path waits/refuses with `BasisNotAvailable`, including empty results, native held/staged values, rules, dependencies and pagination. |
| Future record time | A named T beyond the wall clock | Exercised against the current history behavior. History can answer and position-retired routes refuse all T; this is not qualification of the deferred Q89a/Q90 record-time watermark. |

Fifteen base paths cross all 24 cuts in two phases: repository pattern, batch and repeated single-subject reads; compiled Datalog;
recursive rules; optional projection pulls; executor pagination over all pages; dependency state; native history/live; forced
live pull; and held/speculative history/live native queries. Seven public paths cross the 14 cuts they can represent in both
phases: `entity`, `entities`, `match`, `queryAll`, `query`, `queryPage`, `entityPage`.

Public `TemporalBasis` has no position field (Q89g); arbitrary P/TP is tested through the SPI. Public pagination independently
captures a real position: query and entity first pages are taken, real retirements/insertion land, and every continuation still
returns the original exact subject set and basis with no duplicates. Basis-free `get`/`getById` is checked as latest-only, and
`history` as raw lifetime history including retirement metadata; they do not silently gain a named-basis contract.

**Routing conclusion:** repository reads and compiled/rule/page/optional paths use full-history attributes. Forced live pulls
and native classifications meet at `storage/assert-subject-route!`; the old four shape-dependent pull forms and native
held/staged variants also execute in the rerun builder matrix. However native vector parsing can supply the shared guard with
the wrong route or source binding (**R2-F1**). Thus route centralization is incomplete in effect, despite the shared guard call.
Physical P live reads are explicitly supported through `as-of` under Q89e; no blanket claim that every old physical P avoids
the live attribute is made. No additional mismatch was established in the ordinary route and pagination matrix.

## Final execution, failures and limits

Final full set: **127 passed, one failed, zero skipped, 128 total** in
[`round2/final-tests-2.json`](round2/final-tests-2.json). The one failure is R2-F1's grammar regression. Both the original F1
semantic regression and all three new matrix/pagination/basis-free tests pass. Raw source-bound requests, expected/observed
values, refusals, histories, cleanup and coverage events are under `round2/attempts/`.

First attempts remain intact. `matrix-tests.json` has reviewer setup errors from non-public transaction ID strings; the fixture
was corrected to the public ID format. `matrix-tests-2/3` then pass. `final-tests.json` retains an additional reviewer assertion
mistake comparing public `Option<number>` retirement metadata directly to a number; the assertion now reads the Option and the
complete set reruns. These are fixture errors, not candidate findings. `grammar-tests.json` and both final runs retain the real
repeated-section failure. No failure was removed or converted to historical PASS.

Fresh builds use pinned pnpm 10.11.0 and the owned store. Shared dev gateway remains Datomic 1.0.7745, source
`4174f6ab33800f45aacc3f39e30620c4d8faedda445f4fd4905f1769efb950ab`, owner EXP-DA01. Source and owner stability are checked
before/after each new fixture. Both retained DA00 proof databases are reread by the collector; only task-owned scratch
databases and fresh context copies are removed. Host free disk stayed above 5 GiB for admissions.

No candidate code fix, Docker access, engine/container lifecycle action, exclusive slot, main merge, push, publication,
process-stop/durability test, production provisioning, erasure/isolation certification, scale/performance benchmark, root-wide
check or fresh package-consumer qualification was performed. Q88a's default-off acceptance boundary, Q89a/Q90 record-time
stamps/watermark and Q89g public position API remain open. No unsealed future-T answer is described as a qualified immutable
record-time snapshot. The blocking finding needs only already-settled T=10, so it is not contingent on those deferred changes.

## PASS / verdict / receipt audit (rule 9a)

1. **Prior `review.test.ts` and existing package tests.** Content: original semantic assertions actually execute; the former F1
   query must refuse. Freshness: new UUID scopes, new expanded route/oracle outputs and new JSON test report. Binding: the
   merged candidate hashes, round-4 live source identity, requests/bases/handles, owner bytes and actual cleanup. Only authority
   and output-directory settings were adapted for this round; earlier result files stay historical.
2. **`round2-utils.ts` completion events.** Content: actual exact-db delete, unchanged candidate hashes, owner and health are
   asserted. Freshness: exclusively new UUID attempt directory/scope. Binding: head, source and reviewer script hashes and
   every request/result/error are retained. `finished` means cleanup/source checks completed, including for failed tests; it
   does not turn a failed test into PASS.
3. **`round2-matrix.test.ts` assertions and coverage.** Content: actual sets, recursive closure, optional values, dependency
   metadata, typed refusals, complete cursor traversal and repeat comparisons against the history route. Freshness: new seed,
   actual later writes and before/after observations in this invocation. Binding: each row names phase/path/cut/requested basis,
   expected and observed values; the enclosing fixture binds exact candidate/reviewer source, gateway and cleanup.
4. **`round2-grammar.test.ts`.** Content: every unsupported historical form must refuse, and accepted repeated-section forms
   cause the real test failure. Freshness: new database and actual writes. Binding: exact EDN, cut, response/error and same
   fixture identities. The collector additionally requires the separate 40/30 bytes, not just the failing test name.
5. **`native-repro.mjs` characterization.** Content: before 40, later 30, history 40, literal typed refusal, actual visibility
   predicate and successful deletion. Freshness: unique scope and sequential real writes. Binding: query-variant flag, script
   hash, merged head, source hashes, live identity, every HTTP body/status/raw response and source/owner checks. Exit zero means
   reproduced defect; the unchanged original characterization's expected failure and cleanup are retained separately.
6. **`conformance.mjs`.** Content: actual unchanged public-export testkit effects, exact 44+44 denominator/full suite, every
   successful delete. Freshness: new UUID scopes/run/times. Binding: fresh built-export hashes before/after, exact merged head,
   owner and live gateway identity. No second-opening result is relabeled crash recovery or production acceptance.
7. **`context.mjs`.** Content: exact final verified inputs and every dirty-context rejection. Freshness: two exclusively new
   contexts. Binding: actual distribution/config/gateway/spec manifests and final build hash. Explicit `imageRebuilt:false`
   prevents a staging result from becoming a fresh image-build claim.
8. **`round2-collect.mjs`, `round2/SUMMARY.json`, `round2/FILES.json`.** Content: validates exact wrong bytes and both controls,
   original F1 refusals, actual final failure identity/denominators, 916 observations, conformance, context results and actual
   preservation/cleanup. Freshness: selects current reviewer-source hashes and UUID attempts from this round; older partial
   runs remain diagnostic. Binding: source equality to `da76bad`, the review merge, source/built/script digests, current owner
   and live gateway identity; the file index hashes delivered evidence and current tools. The index itself and active collector
   stdout are excluded. FIX-FIRST is a reviewer verdict only.

Open action: builder makes query parsing/normalization and route/input classification agree, then an independent reviewer reruns
both repeated-section forms plus the passing full read/conformance controls. No other new blocking finding is established here.
