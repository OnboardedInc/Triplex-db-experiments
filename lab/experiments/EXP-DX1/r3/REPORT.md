# DX-R3 part 4 — offline fixes verified; requested acceptance not complete
North star: P1 exact pinned reads; correctness floor in lab/SCOPE.md, NORTH-STAR.md and TARGETS.md.
Merged review/DX-V1 (4b9f6382) first. Code: 00a927f9 / 539bf77a; final worker-branch test b6f26cb4. Reviewer files remain unchanged.
F1: packed rows now retain source recordedAt/createdBy/entityType/schemaVersion/txId; local public Triples return every gateway field and real Effect Options.
The row page/journal already contains these fields; no gateway change. The standalone SweepRow projection remains unchanged by default.
Fixed metadata tuples avoid repeating object keys; projection-only buffers without source metadata decline instead of claiming a public answer.
F2: canonical rows tag types, missing/undefined fields, every public field, Option tags/payloads, nested values and signed zero; unexpected fields also contribute.
Canonical checks require actual Effect Options, rejecting plain wire lookalikes; restored worker replies satisfy that contract.
The independent full-row model binds seed and every write receipt to operation values/intervals and assertion IDs; metadata follows the public write contract.
The judge requires full-row provenance, stamp, fact count and whole-world digest; old business-only expectations cannot certify a read.
Prepared contributions hash the same complete public rows once per immutable version; every fact still contributes to every read.
Raw samples call the route under test and the gateway, compare complete canonical worlds and compare prepared/materialized observations; full samples are retained.
Effect Option prototype tags were also lost by structured clone: worker replies now carry explicit tags and restore real Options at the parent.
F3: time-only cuts remain ineligible until a later applied journal has a strictly greater clock; unknown/duplicate/regressing clocks decline conservatively.
Explicit position cuts remain bounded. Receipt positions guide catch-up but are no longer silently inserted into a time-only benchmark basis.
Open cuts have an explicit open-record-clock fallback reason. Fresh ladder fallback counts and RYOW waits remain unmeasured.
Split pending/mixed policies remain unchanged; assignment/first-step-end/ACK/second-step-start/end and target position are retained for every selected split.
Source application timestamps are written by the follower worker; exact positions join them after drain. Raw steps/application logs survive an unfinished run.
Completed split files live beside disposable observation chunks. Diagnostic counts distinguish later ACKs, applications between steps, and missing witnesses.
## Evidence and measurements
Part-4 evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/p4-*.log.gz; compressed raw command output, one file/run. Whole evidence directory 59.5 MB.
Primary: p4-gates-final.log.gz, p4-option-gates.log.gz, p4-unit-complete.log.gz, p4-replay-option.log.gz, p4-review-option.log.gz, p4-footprint-b.log.gz, p4-offline-rate-c.log.gz, p4-native-admission-{a,b,c}.log.gz.
Matched 1,000-subject recorded bootstrap, 442,196 facts / 145,138 entities: packed bytes 46,211,688 -> 67,690,600 (+46.48%).
Bytes/subject: 46,211.688 -> 67,690.600; accounted prepared sidecars 75,289,972 bytes. These are W0 recording bytes, not 10k NS process RSS.
One offline quiescent host-thread comparison, 200,000 verified reads/arm: 8,233.555/s before -> 7,406.972/s after (-10.04%).
Client CPU ms/pull: .121159 -> .133852. Historical source abbac16b and corrected readers saw identical original recorded rows; no writer or engine ran.
Those rates diagnose the stronger payload/check path; they do not establish T1/T2/T3 or a live 10k throughput regression.
Recorded replay: 3,000 complete public-world pairs across bootstrap/end/retained cuts and 10,000 prepared/materialized/source observations, zero differences.
Final compact-encoding replay also has zero differences: 3,000 full worlds, 10,000 source/prepared/materialized observations, 2,000 original journals/clocks.
Fresh 200,000-pair differential and pending/mixed ladders: NOT RUN. Three nonblocking admissions, last 17:10 UTC, returned 75 (DX-S5 seed lock held).
Per the free-when-ready instruction, no queued lease, container, volume or engine slot was created; live rates/locality, open-clock fallbacks, waits and 10k RSS remain unverified.
## Reviewer command incompatibility
The requested unmodified command cannot exit 0 after these fixes: its unconditional characterization assertions require the old defects.
F1 asserts missing recordedAt/createdBy, numeric validTo and unequal public rows before its equality claim (adversarial.test.ts:146-155).
F2 asserts that wrong rows are accepted immediately before requiring rejection (line 190-191); its fake seed IDs also have no receipt provenance.
Its signed-zero test unconditionally requires equal observations. F3 unconditionally requires replica/old value/unequal worlds before requiring equality (545-549).
The unmodified command exits 1 (5 pass / 8 fail): five old-defect assertions plus three projection-only fixtures that now correctly decline public admission.
These assertions were left failing as instructed; corrected regressions exercise complete gateway wire rows and the actual driver judge without weakening reviewer files.
## Gates and commands
Checks: 36 focused node tests, 11 benchmark tests, 23 package vitest tests passed (3 live tests skipped); three typechecks, explicit worker-entry typecheck, lint and shell syntax passed.
Replay: node --experimental-strip-types lab/experiments/EXP-DX1/r3/replay.ts /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages
Footprint/rate: same recorded path with r3/footprint.ts and r3/offline-rate.ts; old modules are read from abbac16b in memory, no source captures/manifests.
Gates: node --experimental-strip-types --test lab/experiments/EXP-DX1/r3/*.test.ts; exact pnpm/vitest/typecheck commands are echoed in the gate logs.
Review: DX_V1_ASSERT_CLAIM=1 node --experimental-strip-types --test lab/verify/DX-V1/adversarial.test.ts
Native, only if free: DX_R3_TRY_LOCK=1 node lab/bin/heavy.mjs --label DX-R3-p4-both -- bash lab/experiments/EXP-DX1/r3/run.sh both p4-both
Mixed ladder, only if free: DX_R3_TRY_LOCK=1 DX_R3_SPLIT_TARGET=mixed node lab/bin/heavy.mjs --label DX-R3-p4-mixed -- bash lab/experiments/EXP-DX1/r3/run.sh benchmark p4-mixed
## Outcome audit and limits
observe/canonical + prepareEntity: content includes every returned field; contributions bind exact immutable source versions and read VT/cut, built afresh in this process.
FullRowModel/seed/driver judge: receipt identities and operation content bind the same run's source; no read result becomes its own expectation; unbound expectations reject.
Reader raw-pair check, differential and replay: equality compares complete typed canonical source/local bytes at the exact requested basis, with fresh execution/count assertions.
Node/vitest assertions and offline-rate: freshly constructed/loaded inputs and explicit counts/content comparisons; historical recordings are labelled offline, no engine-slot claim.
Split diagnostics count actual per-read times/position witnesses, not a PASS. Existing sequence/drain/accounting checks still guard every retained/judged read.
No acceptance edits or changed pinned paths found. No full-pair rerun, root check, push, merge to main or promotion; native counts/waits/10k peak memory remain open.
