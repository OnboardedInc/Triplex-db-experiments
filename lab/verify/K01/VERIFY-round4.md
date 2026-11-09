# K01 round-4 offline review: FIX-FIRST

Reviewer: CX-VK01. Reviewed builder head `1c10c826` (implementation `5e7b68f8`), merged into `verify/K01` at
`dcfefb0c017c310b3940f2381489fbead40da9ff`. The reviewed implementation remains byte-for-byte identical to the builder;
[source-binding.json](evidence/review-round4/source-binding.json) records the comparisons. No implementation fixes were
made. The only merge conflict was the copied Q83e regression file: the builder adapter supplies the new release API,
randomUUID and valid SHA-256 fixtures; the earlier reviewer file and exact adaptation are retained under
[evidence/review-round4/merge-input](evidence/review-round4/merge-input/).

**Verdict: FIX-FIRST.** All 209 existing tests pass freshly, including all 36 prior reviewer regressions and 39 builder
round-5 controls. Benchmark TypeScript and four implementation syntax checks pass. The independent PASS audit found
three remaining gaps below. The primary byte-equality gate can still certify a partial file set after acquisition fails.
The single-cut diagnostic's cleanup success path is absent from the builder's audit table, and pool admission does not
satisfy that table's claim of finite resource evidence.

Authority remains `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` and the lab's Q83 rulings. The purpose is reliable
seed reuse and current evidence supporting P1-P5. This is offline review, not live or scale acceptance.

## Findings

### R4-F1 — MEDIUM: shell acquisition failures produce matching partial C1 trees

**Location:** `lab/bin/engine.mjs:553-554`; consumers at `:789-790`, `:880-882`, `:959-963`; successful-helper stderr is
discarded by `lab/bin/lib.mjs:140-146`.

`listingScript` pipes both `find ... -exec stat ...` and `find ... -exec sha256sum ...` into `sort`. The helper's
`set -eu` does not propagate an earlier pipeline command's nonzero exit when `sort` succeeds. It emits `@@end` and exits
zero. If enumeration omits the same file from both sections, or stat and hashing both fail for that file, `parseListing`
accepts the internally consistent partial set. Its stricter field and hash validation cannot recover the missing entry.

**Reproduction:** `C1 acquisition refuses partial trees: both` and `: enumeration` in
[pass-audit-review.test.mjs](pass-audit-review.test.mjs). These execute the actual `listingScript` with `/bin/sh`, actual
scratch files and nonzero fault-injected GNU-interface stat/hash/find commands; no container or volume is used. Source
and destination have identical `visible` files but different `hidden` bytes. Both helpers exit 0, both parsed trees contain
only `visible`, and their tree hashes match. The retained observations include the actual different hidden-file hashes,
stdout, stderr and process exits. Unfaulted acquisition detects the difference; a stat-only or hash-only omission is
refused by the parser. The two correlated/whole-enumeration failure cases are false C1 successes.

This contradicts the audit's “whole regular-file set” and “successful helper acquisition” claims. The outer process's
success is insufficient: the local producer itself swallowed a failed observation. This does not require forging a JSON
receipt. C2-C8 need not detect a differing file outside their query/layout coverage, so they cannot establish C1's full
byte-equality claim in its place.

**Proposed fix:** check each enumeration/stat/hash command's exit before sorting or parsing. For example, write checked
command output to a temporary file, then sort it as a separate checked operation. Alternatively use a shell and pipeline
failure mode explicitly verified in the pinned image. Apply the same acquisition audit to other producer pipelines,
including the offline block enumeration. Preserve failed command diagnostics and never publish a tree proof after one
fails. Add both partial-enumeration and simultaneous stat/hash failure controls.

### R4-F2 — MEDIUM: the omitted single-cut cleanup path treats inspect failure as successful removal

**Location:** `lab/bin/engine.mjs:899-901`, `oneCutProbe`.

The builder replaced this pattern in `down` and `goldenRm`, but left it in the diagnostic snapshot cleanup:
`!docker(['volume', 'inspect', volume], { allowFail: true })`. The wrapper returns null for any process error, so a failed
remove followed by failed inspection writes `snapshotRemoved:true` while the snapshot still exists. This is a success
receipt for unknown state. The explicit `diagnosticOnly` flag prevents this record granting clone admission; it does not
make its cleanup claim correct.

**Reproduction:** the three `single-cut cleanup refuses unproven absence` cases in the independent regression file use
actual extracted `oneCutProbe` logic with injected lifecycle calls. A snapshot is created in the fixture, the copy helper
fails, and cleanup is exercised in `finally`. Successful removal and successful inspection of a remaining snapshot are
controls. Failed removal plus failed inspect must retain unknown/failed cleanup rather than asserting removal. The original
copy error remains an error; the defect concerns its separately recorded cleanup outcome.

**Proposed fix:** use a successful explicit volume-list acquisition to prove absence, retain acquisition/removal failure
separately, and propagate cleanup failure without erasing the first error. Add `oneCutProbe`'s copy, before/after-write,
plan-change and cleanup outcomes explicitly to the audit inventory. Its `snapshotRemoved` path is currently missing.

### R4-F3 — LOW: shared pool admission accepts invalid disk observations

**Location:** `lab/bin/lib.mjs:322-339`, reached by K01 `up` at `lab/bin/engine.mjs:279-285`.

The builder's audit row combines `diskFloorVerdict` and pool admission and claims finite resource forecasts. Only the
former now checks finiteness and range. `admission` returns `ok:true` for `diskUsedBytes:NaN`, undefined, or -1 with an
otherwise admissible request: NaN comparisons add no refusal reason, and negative usage reduces the forecast. K01's
additional host-copy floor does not validate this separate VM/pool observation.

**Reproduction:** direct calls to the actual exported `admission` in the five pool-observation controls. The three cases
above admit; positive infinity refuses through the upper-bound comparison, and a valid small observation admits. The
underlying `vmDisk` parser converts command fields with `Number` without checking that the results are valid byte counts.
This is a shared pre-existing helper found by the requested audit, not a regression introduced by the round-5 patch.
No actual VM was queried, and I have not demonstrated native `df` naturally emitting these invalid values.

**Proposed fix:** reject nonfinite, negative or unsafe byte/cap observations before resource arithmetic, including the
current VM reading and request/reservation forecasts. Validate the parser output at acquisition. Update the audit row to
identify the shared helper and retain invalid-observation refusal controls.

## Independent audit and prior-finding disposition

I read the builder's `PASS-AUDIT-round5.md`, `REPORT-round5.md`, fresh run receipt and source-commit binding, then traced
producer-to-consumer paths in `engine.mjs`, `clone-check.ts`, `lib/clone.ts`, `lib/bulk.ts`, `xtdb-log.mjs`, the live runner,
owner-state locking and relevant `lib.mjs` dependencies. I searched success flags and enumerated the functions as well as
following the table; [success-boundary-search.json](evidence/review-round4/success-boundary-search.json) retains the search aid. The inventory below distinguishes admission, diagnostics and actual acquisition; it does not claim
that searching flag names proves exhaustiveness.

| Paths independently inspected | Result |
| --- | --- |
| Tool capability checks, HTTP readiness, fresh process acquisition, disk floor, shared resource admission | HTTP failure/signals and disk-floor invalid-number controls pass; shared admission misses invalid readings (R4-F3) |
| Stop proof, lifecycle revocation, conditional release, restart and down publication | Prior down/verify race and replacement-owner controls pass; stale lifecycle refuses admission. Diagnostic cleanup uses a different, still-invalid absence proof (R4-F2) |
| Two-cut provisional settle, independent T, F/M/T binding, stopped tails, checkpoint index, reference/clone resume | Existing controls pass; body validation follows the pinned accepted message schema; no new application-message bypass found |
| Tree producer, parser, source-to-golden equality, clone copy, C1 re-verification and driver certificate | Contradictory/missing C1 hashes now refuse; duplicate/malformed parser inputs refuse. Producer pipeline failures still establish false equality (R4-F1) |
| Golden publication/load, creation UUID, manifest/key/config binding and second stopped proof | Existing negative controls pass; persisted tail is re-decoded; changed volume generation refuses |
| Fingerprint queries, C3-C8 comparisons, C7 polls, beginning/end start checks, child verdict and parent locked publication | Current observations and complete boolean C1-C8 are required; existing current-attempt/supersession/error controls pass. Offline mocks do not establish native query semantics |
| Driver seed admission, current generator/build input hashes and manifest-position reuse | Lifecycle/certificate/current manifest checks remain in the admission path; `assertSeedInputsCurrent` and `seedFromManifest` are additional supporting checks beyond the builder table's named entries |
| Listing diff, standalone provisional output, status readiness, one-cut diagnostic and live-runner outcomes | Diagnostic flags do not grant clone admission. `oneCutProbe.snapshotRemoved` is a missed success producer; runner attempts retain current invocation receipts and semantic stop failures |

The exact prior malformed cut/nested-body, contradictory C1 hash and in-flight down regressions all pass after the merge.
The recursive maintenance schemas match the pinned `log.proto`; the cut's decoded field-2 index is now compared with the
intended checkpoint both on acquisition and golden load. Unknown/duplicate/unsupported encodings refuse conservatively.
The pinned upstream checkout remains clean at `c6c19623d90c658c15400fb46dc056f3735ed57b`. Its SourceMessage codec retains
TriesAdded as generated protobuf data, with no application transaction payload family embedded in it. Application Tx,
LegacyTx, AttachDatabase and DetachDatabase anywhere in `(F,M]` remain covered by the prior position variations. T is
still read independently from its own gauge; M is used for stopped-tail and resume binding. No Kotlin codec was executed.

## Evidence, reproduction and limits

The independent full rerun is [run.json](evidence/review-round4/run.json), with raw logs alongside it. Counts:
41 baseline + 21 original review + 23 round-3 + 14 freshness + 35 round-4 + 36 prior independent Q83e + 39 round-5 = **209**.
Every suite process exited 0, without signal/spawn error; there were no skips, TODOs or cancellations. TypeScript and four
implementation syntax checks exited 0. Source hashes bind the execution to the merge and builder blobs. Authored whitespace passes; full-commit whitespace
checking flags whitespace-only diff lines in the raw failure TAP. Those bytes remain unmodified; see
[whitespace-checks.json](evidence/review-round4/whitespace-checks.json). Admission disk
was 13,365,432,320 bytes, above 5 GiB.

**The new suite has 13 cases: 7 pass and 6 desired-refusal assertions fail** (two tree acquisition cases, one cleanup case,
three invalid pool readings). Its process exits 1, without signal/spawn error; no cases are skipped, TODO or cancelled.
Host free space at this run was 13,002,018,816 bytes (above 5 GiB). The new suite's receipt is [pass-audit-run.json](evidence/review-round4/pass-audit-run.json), its raw output is
[pass-audit-review.log](evidence/review-round4/pass-audit-review.log), and actual case observations are
[pass-audit-cases.json](evidence/review-round4/pass-audit-cases.json). Desired refusals remain ordinary assertions; no
failure is converted into an expected-failure or skipped test. The first development run is retained under
`evidence/review-round4/development-1`: three single-cut cases stopped on a missing injected VM dependency before reaching
their intended assertions. That harness was corrected explicitly; that development run is not adopted as cleanup evidence.

Reproduce, with host disk above 5 GiB and the required heavy semaphore:

```sh
node lab/bin/heavy.mjs --label CX-VK01-round4-all -- node lab/verify/K01/run-review-round4.mjs
node lab/bin/heavy.mjs --label CX-VK01-round4-adversarial -- node lab/verify/K01/run-pass-audit-review.mjs
```

The first runner passes; the second should currently exit 1 for the findings. Rerunning overwrites this round's output
paths, so preserve this committed evidence and use new paths for a subsequent implementation attempt. Older case files
are restored after suites run; the merge preserves prior failure evidence. Checksums are in
[SHA256SUMS](evidence/review-round4/SHA256SUMS).

No Docker execution, actual service request, engine lifecycle action, volume creation/removal, slot, resident change,
package installation, main-checkout source edit, implementation fix, full monorepo check, merge to main or push occurred.
The only merge was the requested builder import into the reviewer branch. The heavy semaphore was used for test admission.
Native Kotlin decoding, actual image shell/tool behavior, real stop/copy/restart/teardown, a fresh 500-subject golden/clone,
T1-T7, live C1-C8, C10/E1/PAIR-0, timing and scale remain unverified. No new watermark policy question is raised: Q83e's
three-frontier rule remains the reviewed policy. Fix the reported acquisition/receipt gaps before offline acceptance,
then retain the separately admitted live reference/clone window as a required next step.
