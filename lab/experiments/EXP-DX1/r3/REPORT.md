# DX-R3 part 5 — offline regressions fixed; native proof pending
Merged review/DX-V1 at 720f6774 first; reviewer files remain unchanged. Code commits: aed7b489, 75ddfd79.
R2-A: expected digest, fact count and stamp now come from the same receipt-bound full-row visibility walk.
Cache cuts include every reachable seed/shared/historical row's record start/retraction and validFrom/validTo, including reference intervals.
Receipt-version changes invalidate those boundaries; the old business-only model remains ineligible for driver correctness verdicts.
Test: expired assertion rejected by cached judge; exact smaller world accepted; exhaustive seed/shared/reference/retraction boundary comparisons pass.
R2-C: canonicalization validates prototypes and own data properties before enumeration; Date/Map/Set/classes, sparse/custom arrays, symbols and accessors reject.
Plain objects (Object.prototype or null) and ordinary arrays remain supported; typed numbers retain signed zero.
Unsupported returned values produce CanonicalValueError, classified as invalid-value violations, including the driver's compact verdict array.
Tests exercise prototype attacks, correct public rows, and the actual compact verdict pipeline; nothing is sampled in correctness judging.
R2-B: scope creation writes immutable strictRecordClocks with the unique bootstrap transaction; defaults and existing missing properties mean false.
Reopening/late initialization cannot enable or disable it. Creation replies and supported replica capabilities report the actual stored property.
The serial commit function checks strict SPI and replay-safe writes against the durable prefix maximum, including claim-only/empty commit clocks.
Strict mode requires one finite numeric record clock per physical commit, above that maximum; clocks normalize to doubles before storing the maximum.
Uniformity prevents journals inside one physical commit, delivered across feed pages, from closing then regressing a cut.
Follower clock admission also requires journal instant values to match the stored record timestamps; a mismatched header maps to NaN and declines.
Existing non-strict SPI/import behavior stays unchanged. Strict imports must use uniformly clocked, increasing commits; unordered historical imports need non-strict scopes.
Only a source capability with strictRecordClocks=true admits time-only local cuts, still requiring a greater applied clock and exact mapping/window/closure.
Position/current admission does not require strict clocks. Policy survives shared images; missing old image fields default false.
New benchmark/seed openings explicitly request strict scopes; existing sealed seeds cannot be upgraded by reopening.
Thus old sealed seeds have 0% local time-only admission by construction; the current time-only ladder mix uses the gateway on them.
No fresh strict-scope time-only local share or RYOW wait was measured; report.timeOnlyRouting and replicaRecordClockPolicies now expose actual counts/policy.
Tests: delayed regressing SPI fixture falls back with complete matching rows; non-strict position/current reads remain local; strict closed cuts/image copies work.
Native tests added: strict-record-clock-policy in gateway selftest (both head layouts), plus strict-source.ts before the differential.
The SPI probe checks fresh scope creation, immutable policy/capability, complete row readback, regression/equal-clock rejection, mixed-clock rejection and claim-only maximum.
Raw oracle: every active ladder level requires at least one actual local full-payload sample compared against the gateway; none makes run status ERROR.
Open-clock fallbacks do not spend local quota; each worker renews quota per phase after the global extra-sample budget is exhausted.
All retained local phase samples reach the raw file and oracle; gateway default keeps its prior cap. Oracle model lookup binds exact phase/start/subject/basis.
Worker test: two phases each retain one matching local sample with global budget 1, after open-clock fallbacks; coverage test rejects missing/mismatched levels.
Fresh per-level sample counts are unavailable because no native hold was acquired; the offline worker fixture counts are 1 / 1.
## Gates and evidence
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/p5-*.log.gz (raw command output, one compressed file per run).
45 node tests and 11 benchmark tests pass; 25 package vitest tests pass, 3 live tests skipped; three typechecks pass; explicit worker-entry typecheck passed.
Lint: zero errors, five pre-existing unused-variable warnings. Package build and git diff --check pass.
Recorded replay: 3,000 complete typed public worlds and 10,000 prepared/materialized/source observations, zero differences; 2,000 original journals applied.
Final row layout is unchanged from part 4; no fresh throughput, 10k memory, 200,000-pair result or ladder locality/wait claim is made.
Primary logs: p5-clock-gates, p5-vitest, p5-bench-unit-host, p5-final-clock-replay, p5-domain-verdict, p5-review-final, p5-review-original-final.
Native admissions: p5-native{,-clock}-admission.log.gz, both exit 75; DX-S5 still holds the lock. No lease, container, volume or engine slot was created.
## Reviewer command incompatibility
New-claim command exits 1 (3 pass / 4 fail), for corrected behavior at unconditional old-defect assertions, not its optional claim assertions.
round2/attacks.test.ts:27 requires stale cached digest; :29 requires expired rows accepted; :32 requires the correct smaller world rejected.
:59 requires Date and {} canonical equality; :61 requires acceptance. :92 requires replica routing and :93 requires unequal worlds after an unseen regression.
Its closed-clock fixture :178 also assumes default-strict RecentReads without a source guarantee; the new contract requires explicit strict proof.
Original command: 2 pass / 1 fail; F3's fixture similarly assumes strict policy and the old fallback reason. F1/F2 continue passing.
The review run.sh itself requires three failing claims and writes reviewer files, so it was not invoked. No reviewer assertion was edited or bypassed.
## Commands
node --experimental-strip-types --test lab/experiments/EXP-DX1/r3/*.test.ts
node --experimental-strip-types --test lab/bench/test/bench.test.ts (host boot-session sysctl access required)
DX_V1_R2_ASSERT_CLAIM=1 node --experimental-strip-types --test lab/verify/DX-V1/round2/attacks.test.ts
DX_V1_ASSERT_CLAIM=1 node --experimental-strip-types --test lab/verify/DX-V1/adversarial.test.ts
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p packages/datomic/tsconfig.json
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p lab/experiments/EXP-DX1/r3/driver-tsconfig.json
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p lab/experiments/EXP-DX1/r3/tsconfig.json
Vitest: node lab/bin/heavy.mjs --label DX-R3-p5-vitest -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec vitest run packages/datomic/test/{replica,replica-packed,replica-source,rowText,reach,sweepRows,compact}.test.ts
Replay: node lab/bin/heavy.mjs --label DX-R3-p5-final-clock-replay -- node --experimental-strip-types lab/experiments/EXP-DX1/r3/replay.ts /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages
Native, free-only: DX_R3_TRY_LOCK=1 node lab/bin/heavy.mjs --label DX-R3-p5-prove -- bash lab/experiments/EXP-DX1/r3/run.sh both p5-prove
## Outcome audit (content / freshness / binding)
canonical/observe/prepareEntity: complete typed fields validated; immutable version contributions created in this process; exact entity/version/valid cut.
FullRowModel.summary, Model.expected, ExpectationCache, judgeRead/readVerdicts: full expected content/count/stamp; fresh receipt model and cache invalidation; source command identities and exact basis.
readOnce/rawLocalCoverage/driver finalization/runOracle: full local/gateway payloads plus independent model verdict; fresh worker arrays/quotas; exact run phase, attempt start, subject, basis and actual route.
TimedSource/RecentReads.resolve/image: header values match stored record clocks; strict closed cut/window/closure checks; fresh image/feed clocks bound to source capability and exact position. Unknown proof declines.
create/capability/commit: actual stored immutable policy and serial maximum, no request echo; initial transaction/current serial db; exact scope/commit input. Native execution still unverified.
strict-source, differential/replay and test assertions: explicit outcomes/counts/complete typed content; fresh execution (recordings labelled offline); own scope/source and requested inputs/cuts. Native tests are not reported PASS.
No acceptance edits or changed pinned paths found. No root check, native performance PASS, promotion, push or merge to main.
