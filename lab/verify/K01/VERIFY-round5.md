# K01 round-5 offline review: FIX-FIRST

Reviewer: CX-VK01. Reviewed builder head `d35fc4b4` (implementation `d4298c10`), imported into `verify/K01` at
`891aef6a33acd7e0d281ef1432c8a86d8f57ec99`. Reviewed implementation files match the builder byte-for-byte; no implementation
fix was made. [source-binding.json](evidence/review-round5/source-binding.json) binds both independent runs to those blobs.
The only merge conflict was the copied 13-case reviewer suite. The builder's explicit-volume-list/observation adapter is
used; the original reviewer input and exact adapter diff are preserved in `evidence/review-round5/merge-input/`.

**Verdict: FIX-FIRST. Not ready for the live window.** All **262 existing tests pass freshly**, including the earlier
21/14/36/13 reviewer controls. Benchmark TypeScript and six implementation syntax checks pass. The new structural suite
has **27 cases: 9 pass and 18 ordinary desired-behavior assertions fail**, grouped into four findings below. There are
no skips, TODOs or cancellations. The live workflow currently cannot consume even a successful clone-check subprocess.

North star: correct seed reuse and dependable evidence supporting P1-P5. Goals/targets remain `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`; R26/R30 and Q83e govern this freeze/clone review. An observation envelope helps,
but it does not establish completeness when the consumer bypasses it, the parser permits missing required content,
or the actual transport contradicts its parser contract.

## Findings

### R5-F1 — HIGH: actual clone-check subprocesses always lack the newly required captured stderr

**Location:** `lab/bin/engine.mjs:670-676`; required streams at `lab/bin/observation.ts:29-33`.

`cloneCheck` invokes `spawnSync` with `stdio: ['ignore', 'pipe', 'inherit']`. Node consequently returns `stderr:null`,
even for an exit-0 child that emits valid JSON. `processObservation` calls `processOutput`, whose `text(raw.stderr)`
rejects null. Every real `cloneCheck` response therefore fails as `missing text observation`, before its JSON is used.
This affects settle, reference start/freeze/diagnostic, clone verify and the single-cut probe. It fails closed, but blocks
the requested live workflow. The audit's “complete child process” claim did not check transport compatibility.

**Reproduction:** three `actual cloneCheck subprocess preserves valid observations` tests in
[observation-review.test.mjs](observation-review.test.mjs). These execute the actual extracted `cloneCheck` with actual
Node `spawnSync`, against a local JSON-producing fixture script at its expected path. No Docker executable or engine is
involved. Each child exits 0, has `signal:null`, and prints the exact expected JSON; each is rejected solely because the
configured inherited stream is null. The nonzero-child control refuses as required. Raw process fields and the attached
failed observations are in [observation-review-cases.json](evidence/review-round5/observation-review-cases.json).

The existing extraction adapters supply stdout/stderr strings and therefore do not reproduce this actual stdio shape.
This is an integration gap between two otherwise separately tested pieces.

**Proposed fix:** capture stderr and retain/relay its actual bytes while validating the child process. If inherited streams
are deliberately supported, model that distinct transport explicitly rather than replacing an unexpectedly missing stream
with empty text. Keep the strict missing-stream refusal for commands that promise captured bytes. Add a real subprocess
control at this caller boundary, including a valid child and a failed child.

### R5-F2 — MEDIUM: driver owner reads bypass the complete/failed reader and conflate failed/present data with absence

**Location:** `lab/bench/lib/bulk.ts:44-50`; separate validated reader at `lab/bin/lib.mjs:415-424`.

The driver admission helper still uses `existsSync ? JSON.parse(readFileSync(...)) : null`, rather than the validated
`readOwner` path. A present JSON `null` file becomes `seededBy:'unverified'`. Present `{}`, an empty holder, or an object
with no holder become `seededBy:'seed-writer'`. No observation failure is raised. More significantly, `existsSync` returns
false for an inaccessible parent directory, so an actual failed read also becomes “no slot owner record”.

**Reproduction:** five negative owner cases. Four write malformed present owner values and call the actual `seedPathOf`.
The fifth uses a real local permission fixture: a present valid owner is under a directory temporarily set to mode 000;
a direct `readFileSync` confirms EACCES, yet `seedPathOf` returns unverified provenance. The directory mode is restored in
`finally`. Explicit absent-file and valid-writer controls pass. Actual return values/read-error codes are retained in the
case JSON. This fixture runs under the recorded local user environment; no other directory's permissions were changed.

This directly contradicts the round-6 claim that present malformed owner files cannot mean unowned/unverified, and that
only actual ENOENT supplies optional absence. `seedPathOf` runs in `driver.ts:104`, before seed reuse. These cases do not
falsely return `seededBy:'clone'`; they remove the distinction on which the clone-specific certificate branch depends.
The separate manifest-position/build checks do not establish that owner acquisition completed.

**Proposed fix:** share the validated owner reader (or an equivalent pure parser plus explicit ENOENT acquisition), reject
present null/partial owners, and distinguish permission/I/O failure from absence. Bind the owner read to the selected
slot/path before classifying provenance. Preserve the intentional explicitly absent/unverified mode without using it as a
fallback for failed reads. Add these independent consumer-path controls to the audit.

### R5-F3 — MEDIUM: the “operator-specific absent statistics” fallback is wrong for required EXPLAIN fields

**Location:** `lab/bench/lib/clone.ts:25-32`, consumed by `lab/bench/clone-check.ts:248-249` (C8 plan normalization/hash).

The comment and audit justify nullable statistics as operator-specific schema absence. The pinned XTDB source makes
**the entire attributes struct nullable**, but `page_count` and `row_count` are non-null i64 fields for every operator;
`depth` and `op` are also required. When a scan attributes struct is present, its source/counter fields are populated
non-null fields. `planShape` instead maps missing required counters to null, leaves missing depth/op as undefined, and
maps absent fields inside a present scan struct to null. Its upstream `rows` parser only validates “array of objects”.
The C8 component then hashes that incomplete data inside an observation labeled complete.

Pinned source is clean at `c6c19623d90c658c15400fb46dc056f3735ed57b`. Exact hashes and numbered excerpts are in
[explain-source.json](evidence/review-round5/explain-source.json): `core/src/main/clojure/xtdb/query.clj:231-246` declares
the schema; `core/src/main/kotlin/xtdb/query/ExplainAnalyze.kt:7-36` declares non-null counters and constructs scan fields.
Nullable `time_to_first_page` and an absent whole attributes struct are distinct legitimate cases.

**Reproduction:** seven `C8 required plan field cannot become matching absence` controls remove one required field at a
time: page count, row count, depth, op, scan source, scan files used or scan rows read. They use the actual SQL-row parser,
observation primitives, plan normalizer, digest and C8 comparator. All seven produce a **complete** component and
`C8.pass:true` against an equally incomplete reference, rather than refusing unsupported producer output. A non-scan
operator with explicitly null attributes and present page/row counters is a passing control.

This is a common-mode incomplete-reference/current-observation gap. A missing field in only one arm may still change its
hash and refuse; no claim is made that a complete reference always matches an incomplete clone. No native query was
executed or shown naturally returning malformed rows. The defect is accepting an invalid source-schema observation as
complete and certifiable, contrary to the requested boundary contract.

**Proposed fix:** validate the required plan envelope and page/row counters before normalization/hashing. Allow the whole
attributes struct to be explicitly null where the source permits it; validate its required fields when present. Do not
extend that legitimate absence to unrelated required fields. Bind this validation to the pinned schema, and retain the
missing-field and valid non-scan controls.

### R5-F4 — MEDIUM: an omitted final CLI success path can overwrite semantic failure with exit zero

**Location:** `lab/bench/clone-check.ts:306`, after the `print` failure-status logic at `:43-46`.

`print` sets `process.exitCode=1` for ok:false, settled:false or verdict FAIL. The final unreferenced timer later calls
`process.exit(0)` unconditionally. If another handle keeps the event loop alive for at least 200 ms, that timer changes
the actual process outcome to success. Unref only permits earlier natural exit; it does not preserve the failure status
when the timer runs. The audit covers `print`/diagnostic semantic status, but omits this later exit-zero producer.

**Reproduction:** eight actual Node subprocess controls use the extracted current `print` and final exit timer. Three
failure payloads without remaining handles exit 1. The same three payloads with a bounded 350 ms remaining handle exit
**0**, despite printing their explicit failure JSON. Both successful-payload controls exit 0. The artificial handle
models remaining shutdown work; this review did not prove that a particular real XTDB/client run retains such a handle.
The raw programs, printed bytes and actual exits are in the case JSON.

This does not erase the printed semantic failure, and higher-level callers that inspect it can still refuse. It does
invalidate the claimed direct-CLI failure contract and allows a process-success receipt from a failed diagnostic.

**Proposed fix:** remove the unconditional successful exit, or preserve the already selected nonzero exit status when a
bounded forced shutdown is necessary. Audit all explicit exit/status assignments through process termination, not just
the earlier JSON verdict. Retain both handle-lifetime controls.

## Structural audit and prior controls

I read the full round-6 report's updated PASS and fallback inventories and traced their named functions and direct
consumers, including the shared command/owner/disk helpers, observation primitives, lifecycle publication, SQL and C8
normalization, driver reuse and the live runner. [boundary-search.json](evidence/review-round5/boundary-search.json) retains
an independent search aid that includes process.exit as well as catch/default/optional/success sites. Search matches are
not an assertion that every possible behavior is covered.

| Boundary group independently checked | Disposition |
| --- | --- |
| Observation acquisition/unwrap, Docker facade, explicit inspect/volume absence, helper diagnostics | Existing failed acquisition/stream/CLI facade controls pass. Captured-command wrappers refuse failure. Actual clone-check inherited stderr is incompatible (R5-F1) |
| Host floor, VM/volume parsers, pool observations/sums | Earlier invalid readings and new boundary controls pass; missing/negative/nonfinite/unsafe observations refuse |
| Checked listing/stat/hash/sort producers, parser framing, C1 hash consistency | Earlier partial-tree/sort/missing-hash controls pass; no new producer-pipeline bypass found |
| Stop/start/down lifecycle, owner lock/publication, conditional release and current certificate | Earlier race, stale generation/start and failed-acquisition controls pass. Incomplete lifecycle remains non-admissible |
| Two-cut settle, independent T, F/M/T/index binding, byte classifier, stopped reference proof and resumes | Earlier malformed/application-tail controls pass; Q83e mechanism remains intact. No native codec/live proof was run |
| Golden creation/load, manifests/config/key/UUID, copy/re-verification | Existing changed-proof, creation-generation and inconsistent-C1 controls pass; ordinary failures remain failures |
| SQL row/scalar parsing, fingerprints and C3-C8 comparisons | Numeric fields now refuse missing data, and overall fingerprint failure blocks child PASS. Generic row acceptance does not validate required plan fields (R5-F3) |
| Driver manifest/build/position reuse and owner provenance | Build/manifest guards remain; direct owner read bypasses validated owner semantics (R5-F2) |
| Single-cut diagnostic and cleanup, golden cleanup, runner first failure/current invocation | Previous 13 reviewer controls pass under the explicit list protocol; cleanup failures are retained and cannot assert snapshotRemoved. The runner retains explicit negative/admission results rather than accepting them as semantic PASS |
| Diagnostics, log commands, CLI termination and status formatting | Log command paths now capture required streams. Presentation-only defaults remain separate from qualification. Final unconditional exit zero is omitted from the builder audit (R5-F4) |

The three round-4 findings' reported reproductions now pass. In particular the actual shell partial-tree cases refuse,
snapshot cleanup uses complete removal/absence observations, and invalid resource readings refuse. This does not close
all observation completeness: R5-F2 bypasses the reader, R5-F3 labels incomplete content complete, and R5-F1/R5-F4 show
that real process transport and termination must be audited alongside object-level observations.

## Gates and retained evidence

[run.json](evidence/review-round5/run.json) records the independent full rerun, exact arguments, actual process outcomes,
current source hashes, Node version and disk. The count is 41+21+23+14+35+36+39+13+40 = **262/262 PASS**. Every suite
exits 0 with no signal/spawn error, skips, TODOs or cancellations. Benchmark TypeScript and six implementation syntax
checks exit 0. [gate-summary.json](evidence/review-round5/gate-summary.json) extracts the actual TAP summaries; raw logs
remain adjacent. Authored whitespace checks pass; raw failure TAP retains whitespace-only assertion-diff lines
that a whole-evidence whitespace check flags. Exact results are retained in
[whitespace-checks.json](evidence/review-round5/whitespace-checks.json). The full run's source head is the merge, not a historical builder run.

[observation-review-run.json](evidence/review-round5/observation-review-run.json) records the final independent 27-case run:
**9 pass / 18 fail**, exit 1, no signal/spawn error, skips, TODOs or cancellations. Failures are ordinary required-behavior
assertions: 3 valid-child acceptance, 5 failed/malformed owner refusals, 7 incomplete-plan refusals, 3 failure-status
preservation. Raw [log](evidence/review-round5/observation-review.log) and
[cases](evidence/review-round5/observation-review-cases.json) preserve actual outcomes. No finding relies on a fabricated
successful process result. Parent/control mocks are identified separately from real local subprocesses/files.

The initial 26-case run (9 pass / 17 fail) is preserved under `evidence/review-round5/initial-26/`, including its exact
source. It reproduced the same findings before adding the real EACCES variation. The final source also makes exit-timer
extraction tolerate its later removal rather than requiring the faulty timer to remain. No assertion was weakened or
made expected-failure. Earlier round case files are restored after reruns. Both run admissions had host free space above
5 GiB; exact readings are in the receipts. No dependency install was needed.

Reproduction, with sufficient disk and the shared heavy semaphore:

```sh
node lab/bin/heavy.mjs --label CX-VK01-round5-all -- node lab/verify/K01/run-review-round5.mjs
node lab/bin/heavy.mjs --label CX-VK01-round5-structural -- node lab/verify/K01/run-observation-review.mjs
```

The first passes; the second currently exits 1. These overwrite this round's output paths; retain the committed receipts
and use a new output path for later implementation attempts. Checksums cover this report, new tools and retained artifacts
in [SHA256SUMS](evidence/review-round5/SHA256SUMS).

## Reviewer PASS/receipt audit (rule 9a, before commit)

The reviewer tools do not publish engine/owner admission or modify implementation. Their observation-to-result boundaries
are listed here explicitly.

| Reviewer boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Full-suite command outcome and report's PASS count | Require actual exit 0, no signal/spawn error; manually check TAP totals, failures, skips/TODOs/cancellations. Type/syntax use actual command exit | New child process and newly written log for every suite; do not adopt builder/historical PASS | Exact argv, current source SHA-256, merge head, Node version; log bytes hashed in current receipt |
| Regression assertions and case receipts | Assertions test actual outputs/errors. Missing/errors are not converted into an expected PASS; failing assertions keep process exit 1 | Newly acquired current Node processes/files/permission errors; current producer calls in each case | Explicit case input, extracted current source, fixture script/program, raw process fields and semantic results retained |
| C8 experimental completeness/C8 flag | Record actual observation state and C8 result without calling it acceptance; desired rejection assertion fails when incomplete content is certified | Constructed and evaluated anew with current parser/normalizer/comparator | Exact missing field/current fixture row; pinned schema/source hashes kept separately from inference |
| Owner permission fixture | Require direct EACCES precondition; assert reader must fail; restore permissions even on failure | Current local file/read, not a presumed permission failure | Exact test-owned owner/manifest path and payload; manifest bytes hashed by actual driver helper |
| Case-file copies from older suites | Diagnostic copies only; suite's current process/TAP outcome establishes execution; they never independently grant acceptance | Tests' current after-hooks write observations; originals restored after the run. Failed/partial suite output is not adopted as full PASS | Named suite, current source and raw log, distinct review-round5 destination |
| Source/pin binding receipt | Recompute each blob/file SHA-256, assert equality with both executed source maps and builder blobs; native pin requires actual HEAD/status read | Current filesystem/git reads; exceptions abort receipt generation | Exact full paths/commit IDs; excerpts carry file hashes and numbered lines |
| Summary/search/checksum artifacts | Summary copies actual TAP counts; search aid makes no exhaustiveness/PASS claim. Manifest hashes actual retained bytes; whitespace checks distinguish raw logs from authored files | Read this attempt's receipts/logs/files after commands finish | Relative artifact paths, exact command/source maps and digest preimages |
| Final reviewer verdict | Requires the complete evidence and findings above; overall result remains FIX-FIRST with current negative assertions failing | Written after independent runs, not inherited from builder report | Named builder/merge revision, evidence links and explicit offline limits |

## Limits and open work

Offline only. No real Docker executable/daemon call, engine service request, container lifecycle action, volume creation
or removal, engine slot, resident change, installation, main-checkout source edit, implementation fix, main merge or push
occurred. The only merge was the authorized builder import into `verify/K01`; the shared heavy semaphore was used for
all gates. Temporary test paths and permissions were confined to this worktree.

No native Kotlin decoder, native image shell/tools or live SQL behavior was executed. Actual engine stop/copy/restart,
real teardown, a fresh 500-subject golden/clone, T1-T7, live C1-C8, C10/E1/PAIR-0, timing and scale remain unverified.
The new schema controls establish refusal gaps, not evidence that the pinned engine naturally emits malformed rows.
No full monorepo check ran. No new watermark policy question is raised: Q83e remains the applicable three-frontier rule.
Fix these structural gaps and rerun independent offline review before the separately admitted live window.
