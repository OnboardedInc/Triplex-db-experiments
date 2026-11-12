# DX-R3 part 7 — NO equivalence PASS; position-oracle defect fixed, native rerun required
North star: P1 exact pinned reads and P2 public commits; lab/SCOPE.md, NORTH-STAR.md and TARGETS.md remain the contract.
Implementation head: cf099a46. This report is committed last.
## Historical seed failure
The original log ends in `WriteError: Resend the client suffix from expectedSequence`; it retained neither the first rejection nor its exact ordering code.
That historical cause remains unproven. Three fresh strict 2,000-subject seeds here succeeded; the last completed in 26.7 s, without seed failures.
A deterministic batch defect was fixed: logical journals inside one strict physical commit previously received different clocks.
The adapter now caches the first physical instant on shared outer transaction state, using the stored immutable scope policy, and issues a fresh clock on replay.
A returned conflict maximum advances issuance immediately, including large finite clocks where adding one rounds back; exhaustion returns WriteError before consuming a send.
A synchronous TRIPLEX_CLOCK submission refusal now supplies both ordinary and timed dereference, preserving the error while consuming its ordered turn.
That synchronous edge is proven with the actual source function and explicit Datomic doubles, not claimed as the historical seed cause.
README documents automatic public clock selection; the strict source rule and administrative-write boundary are unchanged.
## Native observations and failed proof
p7-probe passed: 2,000 subjects / 59 seed commands / zero failures / 29.13 s; eight-journal physical batches shared one instant twice.
Four strict/non-strict/non-strict/strict arms each verified 256 durable commands with 32 in flight; all 64 deliberately induced ClockConflict responses recovered without a suffix gap.
Those stress timings include injected strict retries and unequal initial database sizes: they are not a fair policy-cost comparison.
p7-both-3 reached 10,000 complete pairs with zero differences in 307.42 s (32.5 pairs/s); I terminated it through the holder cleanup because its projection exceeded the 40-minute lease.
The checker now memoizes complete canonical member text only after descriptor/prototype validation and recursive immutability proof, performed in the canonical traversal.
The world container embeds the already encoded typed members directly; decoded equivalence to the former escaped container is tested, including controls, quotes and signed zero.
The differential performs one complete local/gateway byte comparison per pair, alternating eager/lazy local materialization, plus whole-world observation equality; no facts or pairs are sampled.
p7-final reached 10,000 equal comparisons in 112.20 s, then FAILED at n=16096, subject 96, floor position 59. No ladder ran.
Definite oracle defect: comp.pull called public T.reach; core resolveTemporalBasis retains time but discards internal recordedPosition. Position-only floor/current requests became latest.
The failed expected-side read therefore was not bound to position 59; this is not a valid same-basis equivalence result and does not exonerate the copy.
Composition now forwards Datomic positions directly to getReachTriples; declined optimized reads traverse getByEntities with the identical basis on every level, including split-root verification.
A missing exact adapter path fails closed. No packages/core or DatomicClient read path was changed. Native rerun of this correction is outstanding.
## Gates and limits
56 Node tests pass, including all three unchanged reviewer value claims, typed-container equivalence, exact direct/generic position routing and publication binding.
31 package vitest tests pass; four native tests skipped. Three typechecks pass (package, driver, r3); affected checks were rerun after the position correction.
Actual Clojure source submit/order checks pass: timed/plain error identity and next-turn retry; eight DX-B10 order tests / 98 assertions, including 10,000 reordered arrivals.
Final recorded replay passes: 2,000 journals/clocks, 3,000 complete typed worlds, 10,000 optimized observations; zero differences. Packed copy at 1,000 subjects: 67,698,904 bytes.
The 200,000-pair final proof, ladder/routing/raw-local quotas/time-only local share, 300 native B10 scenarios and native HTTP order gates remain unverified.
Fair strict/non-strict cost and absolute indexed-policy-read cost remain unmeasured; both comparison arms execute the policy lookup, so that contrast alone cannot isolate its absolute cost.
The prepared cost fixture seeds identical 2,000-subject worlds in every arm and excludes conflict warmup; DX_R3_COST_RATE=55 offers eight-fact commands at 55/s.
DX-S5 held the lock across most of the budget and reclaimed it after releases; all owned containers/networks/volumes were removed before releasing each lease.
## Commands and raw evidence
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/p7-*.log.gz; one compressed raw output per run, no manifests/source captures.
Primary logs: p7-probe, p7-both-3 (terminated), p7-final (failed), p7-final-node, p7-position-checked, p7-replay-final, p7-regressions-final, p7-clock-build, p7-timed-deref, p7-source-order.
Retained unsuccessful intermediate probes/typechecks and the superseded slow replay; their output is not reported PASS.
DX_R3_TRY_LOCK=1 node lab/bin/heavy.mjs --label DX-R3-p7-next -- bash lab/experiments/EXP-DX1/r3/run.sh both <fresh-prefix>
Native B10: same command with gates <fresh-prefix>; cost: DX_R3_COST_RATE=55 with probe <fresh-prefix>. Default caps: 39 minutes for both, 19 otherwise.
DX_R3_HOLD_SECONDS may shorten those deadlines; it never reduces read counts or phases and an incomplete run fails.
Node: node --experimental-strip-types --test lab/experiments/EXP-DX1/r3/*.test.ts lab/verify/DX-V1/round3/value-claims.test.ts lab/bench/test/datomic-publication.test.ts
Types/build: pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p <package|r3/driver-tsconfig|r3/tsconfig>; same pnpm --filter @triplex-build/triplex-datomic build.
Replay: node lab/bin/heavy.mjs --label DX-R3-replay -- node --experimental-strip-types lab/experiments/EXP-DX1/r3/replay.ts /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages
## Outcome audit: content / freshness / binding
physical-clock tests check exact issued times, finite/exhaustion behavior, actual retry payloads and all 32 sequence turns; fresh UUID scopes/lanes bind the shipped functions.
order-rejection evaluates shipped submit! with real order lanes and explicit doubles, checks original error identity through timed/plain deref and exact next cursors; no engine claim.
canonicalRow/immutable/member caches validate all descriptors, prototypes and nested frozen data before admission; fresh-process WeakMaps bind exact immutable objects, never IDs or revisions alone.
World-container tests compare every decoded typed member with the prior encoding; every differential pair still includes all returned fields and facts.
reachPull positional tests prohibit latest calls, check the exact requested cut on direct and every generic level, verify public metadata and truthful round-trip counts; fresh mock inputs, no native claim.
Native fixture verdicts require fresh scopes/stored policy, seed completion, unique receipt positions, strict clock order and exact durable command values. Expected injected refusals are labelled.
The live failure invalidates any full equivalence PASS; the corrected oracle requires fresh source/slot/basis binding. No acceptance edits, changed pinned paths found, bar/core edits, root/pack check, promotion, push or main merge.
