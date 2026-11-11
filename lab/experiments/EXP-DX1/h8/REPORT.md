# DX-H8 — stored-preview activation
T1 **MISS**: 1k/64 ACK 3.571288 s (280.01 subjects/s), read/writer diagnostic p99 ratios 0.508/1.549; 1k/512 ACK 5.289895 s (189.04/s), ratios 1.013/4.498.
Both runs: 147 affected, 853 reused, largest fan-out 138 (`loc:l01`); real live writer and shared-location wage correction between B0/B1; 889 deliveries.
Fresh no-preview fallback: 6.177184 s (161.89/s), read/writer ratios 3.633/3.557; historical H6's 223/s was not reproduced.
T2 **MISS**: best 256-subject steady republication is 1.067 ms/subject including build (0.970 ms commit-only), above 0.5 ms.
| Frame cap | ACKs / subjects | Mean commit ms | End-to-end ms/subject | Max request bytes |
| --- | --- | --- | --- | --- |
| 64 | 16 / 1000 | 333.143 | 5.686 | 563565 |
| 256 | 4 / 1000 | 242.605 | 1.067 | 2010978 |
| 512 | 2 / 1000 | 854.956 | 1.833 | 4011943 |
| 1024 | 0 / 0 | rejected | rejected | 7820678 rejected |
These are repeated existing-state updates after verified activation, with no live traffic; tail frames have 40/232/488 subjects. Default activation cap is 256. The 1024 cap attempted the available 1000 subjects, rejected before ACK.
Real gateway body limit: 4,194,304 bytes (`gateway/main.clj:100-101`); observed 1024 frame gets HTTP 400 InvalidValue `Request too large`.
T3 **IN PROGRESS**: fresh serial 10k seeding under the separately guarded 70-minute lease, after T1/T2 code and results were committed.
T4 **PENDING**: 10k activation, all-subject post-ACK verification and matched live ratios not yet measured.
T5 **PENDING**: dedicated 2/4-worker preview wall, CPU, durable memo persistence and live ratios run after T4 gates, not before them.

Design as built (W0 scope):
1. Atomic JSON-file memo v1 stores scope, release hash, B0, per-subject output, record, world digest and sorted closure.
2. Closure includes root, every visible fact owner, and empty targets of W0's six forward-reference attributes.
3. Adding a reachable reference changes an already reached source entity; first facts at an empty target change its stored target ID. Reverse/unrooted dependencies are outside W0.
4. Fix valid time and release; walk every dense journal position in (B0,B1], rejecting gaps and excluding later transactions.
5. Scan closures against changed entity IDs, recording affected subjects and largest distinct-subject fan-out.
6. Missing/malformed/mismatched memo or entry means fresh evaluation; valid-time change invalidates the entire memo.
7. Unaffected entries retain bytes except basis labels rebased to B1; affected subjects use the existing exact grouped-read pipeline at B1.
8. Selection/file parse/feed work runs in a ready worker inside activation timing; 512-run main selection CPU fell from 404 to 26.6 ms.
9. Publish every subject in list order through existing atomic state+outbox transactions; await prior frame ACK; cursor advances only after ACK.
10. Coalesced state reads use bounded groups; no package, kernel, oracle, schema or stored transaction-function edits.
11. No-preview fallback remains full evaluation; completed-cursor resume remains a no-op.
12. Full stored-journal decoding and history transport use bounded read-peer concurrency; semantic comparisons remain independent.

Equality / PASS-producing locations:
`w0-driver.ts`: G0 compares fresh stored counts and every-world fingerprint to Python; G1/G2 compare every B1 subject's output/record bytes after last ACK; G3 requires later-write witnesses while retaining the captured cut.
`w0-driver.ts` + `w0-gates.ts`: G5 compares actual atomic outbox effects to Python's independently folded per-frame state; G7 checks observed page basis/epoch; G9 compares complete ordered stored journal with fresh native history counts.
`w0-driver.ts`: stored-preview proof compares every output AND record to full B1 evaluation; resumed completed cursor checks exact coverage and no extra publication.
All comparisons consume this attempt's actual reads, source scope, B0/B1 and source/runner identities already recorded by the controller; no historical receipt is promoted to a fresh PASS.
Both 1k preview attempts and fresh fallback passed G0/G1/G2/G3/G5/G7/G9 and completed-cursor resume; G4 remains PARTIAL (no ten abrupt stops), G6/G8 not run, acceptance=false.
`preview-cost.ts` only records a completed preview after comparing every output/record to its B0 memo; `publication-matrix.ts` requires a fresh ACK with no repeated deliveries, and records rejection separately.
Journal shard test checks every raw ordered transaction, operation counts, entities and missing-page rejection; four workers each check their exact segment and common source cut. This emits no semantic gate PASS.

Publication profile (64 activation, summed 16 frames): build 668.560 ms, main CPU 136.541 ms; lookup 326.007, state read 317.334, fold 25.219 ms; commits 1828.016 ms.
Complete JFR export, first `triplex.gateway` frame within actual build/ACK intervals: gateway 167 samples, 39 attributable, only eight distinct frames (top-ten list exhausted); transactor 137 samples, zero matching frames.
| First gateway frame / line | Samples |
| --- | --- |
| scope$value.invokeStatic:38 | 26 |
| lean$decode.invokeStatic:20 | 4 |
| lean$decode.invokeStatic:19 | 3 |
| storage$tx_data.invokeStatic:123 | 2 |
| reach$select_db$value__514.invoke:55 | 1 |
| reach$entity_id.invokeStatic:50 | 1 |
| lean$rows.invokeStatic:65 | 1 |
| storage$tx_data$fn__931.invoke:216 | 1 |
Owner requests: reduce repeated scoped lookups/lean decoding (26/167 gateway samples at scope.value; sampled CPU share is not wall-time savings).
512 live activation's first commit made 7 HTTP requests and took 2986 ms; next 488-subject commit made one, took 969 ms (792 ms gateway). Investigate package retry/serialization/transaction work; meeting 0.5 ms/subject requires about 725 ms less for that 488-frame, unverified.
Reduce journal/precondition wire amplification: 1000 steady updates encoded 7.82 MB; fitting one 4 MiB frame needs about 46% fewer bytes without losing atomicity/history. No saving claimed until measured.

100k arithmetic: pending 10k results; extrapolations will be explicitly unqualified, not scale acceptance.
Validation: five H8 test suites pass; targeted H8 TypeScript passes. Broad bench TypeScript fails in pre-existing audit-traffic.ts, hs01-seed.ts and round2.ts outside owned files; root check/pack not run.
No acceptance-contract file or pinned path was changed (no changed owned file appears in lab/acceptance); no merge, push, package edit or deployment.
Commands: `node --experimental-strip-types --test lab/experiments/EXP-DX1/h8/*.test.ts`; `node node_modules/typescript/bin/tsc --noEmit -p lab/experiments/EXP-DX1/h8/tsconfig.json`.
Engine runs: `node lab/bin/heavy.mjs --label DX-H8-<run> -- bash /private/tmp/dxh8-attempt-<run>.sh <seed|sweep> <tx2-dxh8-prefix> ...`; templates are h8/attempt.sh, raw command output retained below; seed argv: `--rung 10000 --scope dxh8-w0-10000-v1 --seed-concurrency 1 --seed-warmup-commands 0 --g0-only`.
Profile: `bash h8/reprint.sh <64b evidence> <owned holder>` then `python3 h8/profile.py <64b evidence> --full2`; first truncated export/failures retained, complete second export used.
Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H8/`; `tx2-dxh8-1000-64b`, `tx2-dxh8-1000-512`, `preflight/tx2-dxh8-seed-10000`, `tx2-dxh8-seed-10000`; receipt.json and per-run command output are primary evidence.
Source phases: 64b=0c744e19; 512=0a9654d1; long-hold preflight=af12a44d; journal decoding changed to 05a3449c after preflight while seed was still writing, before its first count. Profile helpers=71febe05.
Cleanup / retained seed: pending terminal inventory; only the sealed 10k seed may remain. Resource aborts/timeouts are failures, never acceptance.
