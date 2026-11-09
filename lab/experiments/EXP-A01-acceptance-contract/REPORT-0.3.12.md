# Contract 0.3.12 — CX-A01-0312

North star: correctness floor for P1–P5; goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**Builder result: all requested gates PASS. Independent delta acceptance remains required.** Final tested source is `aaac166feceb8adc2e447efae5928e35dd1edf0d` on `contract/0.3.12`, merged with main `95db6153c6c1d47172a2ed53e5cb6c0bfcaa7d73`. The final receipt commit adds only this report and evidence; it does not alter the tested source. No push or merge into main occurred.

## Compiled rulings and pending authority

Moved **37 rows, verbatim**, from pending authority into RULINGS.md and named generated consumers: Q72a-e/g, Q79e-f, Q80a-c, Q82a-e, Q83a-e, Q84a-e, Q85a-d, Q86a-f and Q87. Every row has a literal-preservation control and a consumer-removal mutation. Broker/query regressions are also selected in the existing case sets. Observation protocols name the evaluator-owned context, obs-bundle/1, two-kind safety corroboration, exact rational work comparisons and erasure canaries. The protected-copy inventory adds observer outputs, old generations and freed blocks.

Q83b/d/e supersede Q74b's old freeze interpretation. F (block cut), M (settled replay) and T (application transaction) remain distinct. A maintenance-only F < M interval requires stopped-tail evidence and unchanged T; stopped tails and reference/clone resume bind to M. This precedence is explicit in obligations.json and load-contract.json.

Q86a-f are requirements, **not an assertion that isolation is in force**. G03 build/execution pins remain null for 0.3.13. The unprotected R1/R4/D1-D3/L1/N1-N4 list remains explicit. No G03 fixture pin was imported.

The final main merge preserved Q88/Q89 additions and both main Q78e pending records without compiling them. There are **18 unique pending IDs, authority none**: Q51b, Q73a, Q73b, Q78e, Q81b, Q81c, Q86g, Q88a, Q88b, Q88c, Q89a, Q89b, Q89c, Q89d, Q89e, Q89f, Q89g, Q89h. Q78e and Q86g still wait for Sam. The pending-preservation test compares the immutable main parent's actual rows after subtracting only the 37 authorized promotions.

## O-OBS pin and source provenance

The oracle merge and pin move are together in **`4b7b3700`** (Q45a). O-OBS observe.py is byte-identical to `exp/O05-observation-oracle` **`23e2273fc6b15b92821b318acd387f5484155d8a`**. Its verifier is **V-O05 round 4**, `verify/O05` **`3e3df9c`**, accepted for **screening only**.

All **30 runner files** have individual SHA-256 entries in [O-OBS-23e2273-SHA256SUMS](../../acceptance/pins/O-OBS-23e2273-SHA256SUMS) and generated oraclePins/oracleRunners: observe.py plus its O-REPLAY subprocess dependency's 29 files. O-REPLAY retains the independently accepted 0.4.9 `f195f30` pin; it was not replaced with the older O05 branch's replay tree. The manifest explicitly records that dependency revision, and tests compare every file against its exact source commit. No observation-oracle code was edited. Runtime-selected normalizers are trusted evaluator objects pinned independently in each context.

Screening acceptance cannot qualify an acceptance claim: both the Python reference and JavaScript contract blockers enforce that scope. The positive synthetic admission fixtures explicitly use fixture-only full authority; this does not promote the real pin. No database obligation closes from pinning this parser.

The verifier record is retained **verbatim** as [O-OBS-V-O05-round4.md](../../acceptance/pins/O-OBS-V-O05-round4.md). The verifier commit has no separate BRIEF file. The registry transparently points its brief field at the existing review record containing the task/scope, notes that provenance limitation, and does not fabricate a retrospective brief. The independent contract reviewer should assess this registry representation.

## Final gates and evidence

All final gates use source `aaac166feceb8adc2e447efae5928e35dd1edf0d` and the final merged contract. Heavy suites ran through lab/bin/heavy.mjs. Host disk remained above 5 GiB; recorded source receipt free space was 14,038,183,936 bytes.

| Gate | Final result | Receipt |
| --- | --- | --- |
| build_contract.py --verify | PASS; all six outputs byte-identical | [verify-authority-final.txt](evidence-0.3.12/verify-authority-final.txt) |
| Contract mutation suite | **432/432 caught**, zero misses; catalog 513, 81 retired anchors; 88 new controls include all 37 new literal/consumer pairs | [negtest-authority-final.txt](evidence-0.3.12/negtest-authority-final.txt) |
| Required evaluator suite | **108/108 PASS**, zero failures/skips/cancellations/todo | [evaluator-authority-final.tap](evidence-0.3.12/evaluator-authority-final.tap) |
| Contract 0.3.12 controls | 10/10 PASS | [contract-tests.stdout.txt / stderr](evidence-0.3.12/contract-tests.stderr.txt) |
| JavaScript screening controls | 3/3 PASS | [screening-js.stdout.txt](evidence-0.3.12/screening-js.stdout.txt) |
| Prior independent reviewer regressions, builder rerun | 35/35 PASS | [reviewer-regressions.stdout.txt](evidence-0.3.12/reviewer-regressions.stdout.txt) |
| Real replay payload controls | 5/5 PASS | [real-payloads.stdout.txt](evidence-0.3.12/real-payloads.stdout.txt) |
| Pending-authority Q47d controls | PASS; both prohibited mutants detected, six outputs restored | [q47d-authority-final.txt](evidence-0.3.12/q47d-authority-final.txt) |
| O-OBS integration | 96/96 fixtures; test_cli: 8, test_round2: 29, test_round3: 13, test_round4: 4; selfcheck 14/14 mutants with positive controls and no crash kills | [ancillary-summary.json](evidence-0.3.12/ancillary-summary.json), [selfcheck.stdout.txt](evidence-0.3.12/selfcheck.stdout.txt) |

The ancillary source-before/after hashes match. Complete identities and machine-readable results: [source-and-hashes.json](evidence-0.3.12/source-and-hashes.json), [validation-summary.json](evidence-0.3.12/validation-summary.json). Evidence files have a SHA256SUMS manifest.

Contract hash: **`2858ea71c4d4cad1e14ef422269cf6d8bae14ad3b5eb8e5ccc3950c1fb462144`**. Generator SHA-256: `8ea37fba24579e9d0751c480e49eeefb0ee121dc5692c78d5ef48826493efe5d`.

Pin-level counts remain **157 total / 40 closable / 117 blocked**. Surface total/closable/blocked: XTQL 154/39/115; SQL 154/39/115; SPARQL 155/39/116; Datomic Datalog/pull 153/0/153. These are potential pin-level counts, not achieved closure. Lane D's image remains null.

## Preserved failures and corrections

- [observer-round4.txt](evidence-0.3.12/observer-round4.txt): the first integration attempt failed because the contract used a descriptive inventory category instead of the oracle's exact `observer outputs` category. Corrected the contract label, preserving the oracle and inventory assertion. Its retry and final integration pass.
- [evaluator-attempt1.tap](evidence-0.3.12/evaluator-attempt1.tap): the expanded contract crossed Node's default 1 MiB git-show output buffer in two test helpers. Both now allow 8 MiB. No assertion changed. The contract regression strips exactly those buffer options/comments and confirms both files otherwise match their original bytes. Subsequent evaluator attempts and the final source each passed 108/108.
- [negtest-attempt1.txt](evidence-0.3.12/negtest-attempt1.txt) and [negtest-merged-main.txt](evidence-0.3.12/negtest-merged-main.txt): each recorded 431/432. First, Q61a's mutation edited a historical field overridden by Q86e; it was retargeted to the operative field. The retargeted mutation then exposed the validator's coarse `main` substring check matching the word `remains`. The validator now requires the actual `never --authority-ref main` prohibition; the targeted control and all 432 final mutations are caught. No control was dropped or counted as an expected failure.
- [negtest-interrupted-main-merge.txt](evidence-0.3.12/negtest-interrupted-main-merge.txt): stopped this task's own rerun when main's merge produced temporary conflict markers. It is not counted as passing evidence. Generated conflicts were resolved by regeneration, and newer pending rows preserved. Earlier successful ancillary receipts remain under [ancillary-pre-main](evidence-0.3.12/ancillary-pre-main/).

## Limits and handoff

These are builder gates, not independent delta acceptance, production evidence collection or lane qualification. No engine/container lifecycle, package installation, benchmark, root pnpm check, G03 pin promotion, push, merge into main or Sam-pending VM/tenancy decision was performed. A separate reviewer still adjudicates the contract delta, including the transparently noted missing standalone O05 brief. G03 isolation pins remain work for 0.3.13; Q78e/Q86g remain pending for Sam.

## Round 2 — original instruction provenance (CX-VA01-0311 F1)

North star: correctness floor for P1–P5. Reviewer `4c9077e` returned FIX-FIRST for the report-as-brief substitution. This section supersedes the round-1 missing-brief handoff above; round-1 source, findings and receipts remain unchanged.

Recovered the exact original O05 round-4 launch dispatch from the reviewer’s immutable recovery artifacts and compared it with the still-present launcher original. It is saved as `lab/acceptance/pins/O-OBS-V-O05-round4-BRIEF.md`, SHA-256 `4207182cbbda61f04e9647e1dcde291bdc345dc30f49926abeed6e157e2c1baa`. The registry now hashes those original instructions; `record` still names the unchanged review report. The original recovery JSON, matched launch/exit ledger rows and matching reviewer last message are retained separately; no retrospective instruction summary was authored.

Audited all **five oracle registry entries**, plus both world entries. O-OBS was the sole report-for-instruction substitution. V-O04i's saved instruction bytes match its actual launcher prompt; V-O03 and V-O04c retain their explicitly documented pre-Q59c V-O02 instruction-brief exception; O-DOMAIN references its saved instruction document. All declared instruction hashes match their preimages. This checks the reported substitution class; it does not claim to recover new dispatches for the two documented legacy exceptions.

Added a separately frozen instruction-preimage map for all seven entries and validation against it. A report substituted with its own correct digest now rejects at Q59c, rather than passing the existing existence/hash checks. Seven new mutations cover that substitution once per registry entry, and two additional contract tests check the exact recovered source and every audited instruction preimage. The targeted F1 regression rejects at the intended Q59c guard. Main `a27b100b` was merged into this branch before the fix gates; its delta is notebook/state only. No new ruling, runner, pin scope or evaluator assertion changed.

Final tested source: **`72a1a164e1bbc7844b74c5157d4f1f67b374e3fc`**, with current-at-dispatch main **`a27b100b8d331c0ccc31ded7f507e7dd06cd1045`** as its merged parent. The receipt commit adds only this report and round-2 evidence. Independent delta acceptance is still required; F1's original instruction preimage is now present and pinned.

### Round-2 registry audit

| Oracle entry | Instruction preimage | Audit result |
| --- | --- | --- |
| V-O04i | `lab/verify/O02/V-O04i/BRIEF.md` | PASS — exact launcher original matched |
| V-O03 | `lab/verify/O02/BRIEF.md` | PASS — documented pre-Q59c original V-O02 brief exception |
| V-O04c | `lab/verify/O02/BRIEF.md` | PASS — documented pre-Q59c original V-O02 brief exception |
| V-D01c-O-DOMAIN | `lab/verify/D01c/BRIEF.md` | PASS — saved instruction document; byte-identical at the verifier commit |
| V-O05-round4 | `lab/acceptance/pins/O-OBS-V-O05-round4-BRIEF.md` | PASS — exact launcher original matched |

The two world entries also reference instruction documents rather than reviews and pass the same preimage/hash checks. Complete per-entry results, immutable recovery-copy comparisons, live original-prompt comparisons and matched launch/exit ledger evidence are in [brief-audit.json](evidence-0.3.12-round2/brief-audit.json). Other oracle registry entries are byte-for-byte unchanged. The recovery proof and last message remain separate from the instruction bytes, and the original review record remains byte-for-byte unchanged.

### Round-2 final gates

| Gate | Result | Receipt |
| --- | --- | --- |
| Generator --verify | All six outputs byte-identical | [verify.txt](evidence-0.3.12-round2/verify.txt) |
| Contract mutations | **439/439 caught**, zero misses; catalog 520, 81 retired anchors; all seven new controls reject at their own Q59c guard | [negtest.txt](evidence-0.3.12-round2/negtest.txt) |
| Required evaluator suite | **108/108 PASS**, no failures/skips/cancellations/todo | [evaluator.tap](evidence-0.3.12-round2/evaluator.tap) |
| Contract tests | **12/12 PASS**; adds exact original-dispatch and registry-wide preimage checks | [contract-tests.stderr.txt](evidence-0.3.12-round2/contract-tests.stderr.txt) |
| Screening and prior regressions | 3/3 screening, 35/35 prior reviewer, 5/5 real-payload PASS | [ancillary-summary.json](evidence-0.3.12-round2/ancillary-summary.json) |
| Pending authority | Q47d PASS; both forbidden mutants detected, outputs restored | [q47d.txt](evidence-0.3.12-round2/q47d.txt) |
| O-OBS suites | 96/96 fixtures, CLI and rounds 2–4 PASS, selfcheck 14/14 mutation controls PASS | [ancillary-summary.json](evidence-0.3.12-round2/ancillary-summary.json), [selfcheck.stdout.txt](evidence-0.3.12-round2/selfcheck.stdout.txt) |

All long suites used lab/bin/heavy.mjs. Ancillary source hashes match before/after, and every final source hash matches the dispatch snapshot. Source receipt free space: 13,182,750,720 bytes, above 5 GiB. The targeted exact F1 report-with-matching-digest reproduction is rejected at Q59c: [F1-targeted.txt](evidence-0.3.12-round2/F1-targeted.txt). The initial reviewer FIX-FIRST report is preserved at [reviewer-F1.md](evidence-0.3.12-round2/reviewer-F1.md); no round-1 failure or receipt was overwritten. All first round-2 gate attempts passed.

Current transitive contract hash: **`11986ad73d09946ce13271958d6b968deb240614a40d24100f430d015ae6c1a3`**. Generator SHA-256: `c7f9e62e716416722b26c14f786e94d0bd3beda62472f04a0874813777429eb3`. [source-and-hashes.json](evidence-0.3.12-round2/source-and-hashes.json) and [validation-summary.json](evidence-0.3.12-round2/validation-summary.json) bind the final source, merged main, registry, exact instruction/review objects and results. The separate round-2 evidence directory has a SHA256SUMS manifest.

Oracle pin objects, fixed O-OBS/O-REPLAY/O-DOMAIN runner objects, every compiled ruling and pending authority are unchanged from round 1. Counts stay **157 / 40 pin-level closable / 117 blocked**, with all 153 lane D obligations image-blocked. Both evaluator test files are byte-for-byte unchanged from the reviewed candidate; no assertion was weakened. Q78e/Q86g and the other pending rulings remain pending, G03 pins remain deferred, and O-OBS stays screening-only.

No engine/container lifecycle, production evidence collection or qualification, package install, benchmark, root pnpm check, push or merge into actual main was performed. This fixes the demonstrated Q59c instruction-preimage defect; the independent reviewer still decides delta acceptance. The round-1 missing-brief limitation above is resolved by the authenticated original dispatch, not waived.

## Round 3 — integrated X02/C8/J01, workload-pin review and Q88

North star: correctness floor for P1 exact-cut reads, P2 default-off commit encoding and P4 current reads; authority remains lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Requested integration is `int/X02-C8-J01` `b916d5dc809ffc07c57b53a38f1d1deb6bdeeb89`; pre-round contract source `f483fb644744da4cc7a7f9296214668e7d55bbf4`.

### Workload review performed before re-pinning

I read the actual source diffs, including every hunk below, independently of INT-XCJ's assessment. **None changes a declared workload operation, input data or offered schedule.** The native recipes implement the logical operations in the immutable packet; their physical query calls, intermediate relation volume, language selection, closure strategy, guards, error handling and client normalization change. Those implementation costs remain inside the measured application call. This does not assert that the candidate execution cost or behavior is unchanged, or grant native/parity/performance acceptance. The unset language choice remains XTQL for point state reads and SQL otherwise.

The complete `qualification/workloads/temporal-workloads.json` bytes are unchanged (`322c773db2049b5a704d36925738859aef4982ca27194d13a659d1b0e9081271`). Its workload 20 projection already defines distinct node-sequence paths on the acyclic A/B/C/D fixture. It still expects 2, 1 and 0 supports as B>D then C>D are removed; the generalized path counter implements that same requested operation. No fixture, expected-answer, offered-command rate, random seed or clock schedule is edited by either recipe diff.

| File / exact hunk | Changes operations / data / schedule | Assessment |
| --- | --- | --- |
| `xtdb-workloads.ts` `@@ -2,16 +2,50 @@` | No / No / No | Comments document hazards; imports provide exact arithmetic, errors and path counting. No operation descriptor, input data or schedule edit. |
| `xtdb-workloads.ts` `@@ -29,7 +63,21 @@ interface ReachabilityContext extends Context {` | No / No / No | Types add explicit closure seeds and reusable reachability selector. Seeds bound the implementation to the same task start; no operation/data/schedule edit. |
| `xtdb-workloads.ts` `@@ -39,17 +87,12 @@ type Select = (` | No / No / No | Session type exposes both closure-language selectors and supported language names. This selects the native implementation; no operation/data/schedule edit. |
| `xtdb-workloads.ts` `@@ -109,6 +152,23 @@ const integerChannel = (alias: string) => {` | No / No / No | XTQL integer and attribute-view helpers translate the existing fact filters. No input values, parameter meaning or schedule changes. |
| `xtdb-workloads.ts` `@@ -131,108 +191,160 @@ const valueOf = (value: RecordValue): unknown => {` | No / No / No | Execute/closure helpers add explicit language dispatch, task-wide source-position capture, same contract parameter typing, seeded read-only traversal and a mark-join hazard refusal. Unset routing stays XTQL state reads and SQL otherwise. Additional reads, per-round execution, refusal limits and client work are candidate costs. Requested logical operations, requested valid/recorded cuts, fixture data and offered schedule stay fixed; multi-call coherence is an implementation correctness fix. |
| `xtdb-workloads.ts` `@@ -240,12 +352,17 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 03 purchase-time query gains equivalent XTQL and retains SQL joins/filters. Purchases and at-purchase price requests are unchanged; no data/schedule edit. |
| `xtdb-workloads.ts` `@@ -264,28 +381,37 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 04 coordinate and coverage queries gain XTQL equivalents. The same claim, coverage, policy and event-derived valid subcut feed the existing existence operation. No operation/data/schedule edit. |
| `xtdb-workloads.ts` `@@ -293,41 +419,66 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 05 distinct accepted-event count and highest-revision status gain XTQL; 06/07 replace unsafe aggregate arithmetic with exact split sums and typed overflow. Same account/currency/SKU/ledger operands, grouping and requested outputs. Correct arithmetic/refusal behavior changes execution, not operation definitions, data or schedule. |
| `xtdb-workloads.ts` `@@ -335,54 +486,91 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 07 final subtraction uses typed int64 failure; 08 implements the same capture-minus-refund total exactly; 09 SQL correlated predicates use IS TRUE and gains XTQL; 10 gains XTQL for unchanged deadline/completion/watermark steps. No operation/data/schedule edit; client normalization and native query costs remain measured. |
| `xtdb-workloads.ts` `@@ -396,98 +584,191 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workloads 11/13/14/15 and 20 closure dispatch use seeded read-only closure and same joins/targets; 13 adds a hazard guard; 12 gains XTQL and SQL null-hazard correction; 16 retains its input/metadata lineage reads in both languages; 17 gains XTQL for the same ordered three-step conversion and bounds. Branch relocation does not remove any operation. Physical traversal, intermediate rows and guard reads change; logical operations/data/schedule do not. |
| `xtdb-workloads.ts` `@@ -513,28 +794,40 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 17 builder closes unchanged SQL assembly; 18 adds equivalent XTQL interval endpoint segmentation and fixes SQL correlated-null predicates; 19 switches to the shared execute helper. Same clipping bounds and recorded-fact relation, union-duration operation and prediction lookup; no input data or schedule change. |
| `xtdb-workloads.ts` `@@ -543,8 +836,12 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 19 adds XTQL for the same customer/predicted-at/feature-known-at/fraud projection, retaining the SQL and subsequent historical feature reads. Requested logical subcuts and parameters remain unchanged; no operation/data/schedule edit. |
| `xtdb-workloads.ts` `@@ -560,49 +857,24 @@ export const evaluateXtdbNativeWorkload = (` | No / No / No | Workload 20 closure moved to the common closure branch above; support counting replaces three length-1..3 SQL counts with one distinct-edge extraction plus bounded general simple-path counting. The immutable fixture is the acyclic A-B/C-D diamond with edge retirements and path counts 2/1/0, so the requested operation/result meaning stays identical. Query count, intermediate volume, limits and host cost change and are measured. No fixture data, requested cut or offered schedule edit. |
| `qlever-workloads.ts` `@@ -5,6 +5,7 @@` | No / No / No | Imports the shared bounded path-count helper. No operation/data/schedule edit. |
| `qlever-workloads.ts` `@@ -197,6 +198,7 @@ export const evaluateQleverNativeWorkload = (` | No / No / No | Allows a caller-specific maxRows, keeping the previous 1000 default for all existing calls. The support-edge scan requests a completeness witness up to SUPPORT_EDGE_LIMIT+1. No logical operation, source data or schedule edit. |
| `qlever-workloads.ts` `@@ -219,7 +221,7 @@ export const evaluateQleverNativeWorkload = (` | No / No / No | Passes the selected row cap to the native query. This is execution admission/completeness handling; no operation/data/schedule edit. |
| `qlever-workloads.ts` `@@ -577,31 +579,22 @@ export const evaluateQleverNativeWorkload = (` | No / No / No | Workload 20 replaces three fixed-length SPARQL witness counts with distinct-edge extraction and bounded general simple-path counting over the same graph, endpoints and captured task cut. The frozen A/B/C/D diamond and its 2/1/0 expected counts are unchanged. Query sequence/volume/client cost/refusal behavior change; the requested support-count operation, data and offered schedule do not. |

Full raw diffs and the machine-readable 17-hunk review are retained in [evidence-0.3.12-round3/workload-hunk-review.json](evidence-0.3.12-round3/workload-hunk-review.json). The before/after pin identities are:

| Pinned recipe | Old SHA-256 | New SHA-256 |
| --- | --- | --- |
| `packages/qualification/src/native/xtdb-workloads.ts` | `22d785b034e440ca896b3fce7fe2df94e643586cb802fddd940fea84aff31fc3` | `ff39d3f2fcb74ee2a318e8801a12680a4f9f366b4a7f5ed9e20e89d5ccd8a3d0` |
| `packages/qualification/src/native/qlever-workloads.ts` | `410963c62f46be95525643f5eb78bf4069dee27d986b251f2aca33d05e48d2b3` | `9349878403ee468ce6b64922c648d88f598f799b1c65fc42a712aa47598e54da` |

This pre-pin review permits the two repins to land in the same commit as the integration merge (Q45a). Q88a-c will be compiled verbatim; Q78e, Q86g, Q89 and Q90 remain pending for their authorized later work. The known QLever C8 loaded-ancestor timeout remains a separate investigation; this task does not rerun or resolve it. Integration, compilation and fresh gate receipts follow below.
