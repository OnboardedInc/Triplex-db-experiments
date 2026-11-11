# DX-R3 part 6 — value claims pass; live proof pending
North star: P1 exact returned payloads and the correctness floor; P2 policy-read cost remains to be measured against lab/TARGETS.md.
Merged review/DX-V1 at c51a6b32 first; reviewer files are unchanged. Code commit: f86936a2.
## R3-C2: Option validation and cache admission
Only the actual supported Effect Some/None prototypes admit Option encoding; unknown prototypes decline as invalid values.
Every own descriptor is inspected before any Option value is read. Accessors, symbols, hidden extras and invalid tag/value shapes reject.
Canonical encoding reads validated descriptor values; enumerable extras, including an own tag, contribute to the bytes instead of disappearing.
The member cache now uses the same supportedDescriptors validation for the row and every nested object/Option/array.
Only recursively frozen own data enters its WeakMap; mutable Option payloads are re-observed, never certified from an old digest.
The injected frozen accessor is rejected on its first observation with zero getter calls, so it cannot seed a stale cached verdict.
## R3-C1/C3: array shape
Arrays require Array.prototype, exactly the own data indices 0..length-1, each enumerable, plus their non-enumerable length.
The validator checks actual ownership of each index; matching key counts or numeric-looking names alone do not establish density.
Hidden indices, sparse arrays, 4294967295/01/-0/1e0 keys, accessors and extras reject before reading values.
Reviewer command: 3 pass / 0 fail. Own tests cover both Option variants, all descriptor faults, mutable cache payloads, extras and valid dense arrays.
## R3-N: source policy lookup
Kept the trusted serial policy read; no client flag bypass was added and commit.clj is unchanged in this part.
It resolves the attribute ID with d/entid, then reads first(d/datoms db :eavt scope attribute): one indexed (entity,attribute) prefix lookup.
It is additional work on non-strict scopes too; the existing maximum lookup is unchanged, with no added maximum scan.
The actual quoted function executed offline with explicit Datomic doubles: 25 clock/boundary checks and 40 non-strict old/new comparisons passed.
Its read vectors confirm one added attribute-ID resolution plus one policy EAVT lookup; outputs/errors match in all 40 comparisons.
No engine ran for this probe. Native cost cannot be inferred from double timing; leave the latency measurement to the orchestrator's next commit run.
## Adapter guidance and ClockConflict
packages/datomic/README.md now explains creation-only immutable strictRecordClocks, default/existing false, low-level opt-in and actual capability policy.
It explains local time-only eligibility, closed cuts/fallback, position/current eligibility, sealed-seed behavior and one increasing clock per strict commit.
History import remedies: a fresh non-strict scope, or a strict scope loaded in increasing commit times, one clock per commit; existing strict scopes cannot downgrade.
It explicitly bounds enforcement to gateway commit-function writes: raw administrative Datomic transactions can bypass/alter the policy and are outside the guarantee.
Gateway ClockConflict retains its code/maximum and now names the record-clock policy, greater-clock remedy and history-import alternatives.
Four actual source-formatter cases pass offline; native SPI and gateway selftests now also assert the policy/remedy message when run.
## Gates and evidence
65 Node regressions pass (48 builder, 17 reviewer), including the exact three value claims; three typechecks pass.
25 package vitest tests pass, 3 live tests skipped; 11 benchmark tests pass. Lint and git diff --check pass.
Recorded replay: 2,000 journals/clocks, 3,000 complete typed public worlds, 10,000 source/prepared/materialized observations; zero differences.
No fresh rate, RSS, follower-delay or engine timing is claimed. No correctness bar or workload rule changed.
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/p6-*.log.gz; compressed raw command output, one file per run.
Primary logs: p6-claim-command, p6-final-validated, p6-vitest, p6-bench-unit, p6-clojure, p6-final-replay, p6-lint.
The first Java attempt failed before Clojure execution because the old extracted JRE lacked lib/modules (p6-clock-probes).
Successful probes used a fresh temporary extraction of the already retained CX-DF01 JRE archive, then removed that owned temporary runtime; no download.
Live admission: p6-native-admission.log.gz exited 75, DX-S5 still holds the lock; no lease/container/volume/slot created. Native strict SPI/differential/ladder remain unverified.
## Commands
node --experimental-strip-types --test lab/verify/DX-V1/round3/value-claims.test.ts
node --experimental-strip-types --test lab/experiments/EXP-DX1/r3/*.test.ts lab/verify/DX-V1/round3/{claims,value-claims,temporal,capability,read-regressions,reader-probes}.test.ts
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p packages/datomic/tsconfig.json
Same tsc invocation with lab/experiments/EXP-DX1/r3/driver-tsconfig.json and lab/experiments/EXP-DX1/r3/tsconfig.json.
Clojure: retained JRE 21.0.13+9 / Clojure 1.12.5, clojure.main round3/commit-probe.clj and r3/clock-message.clj, -Xmx128m (source AST/doubles, not Datomic).
node lab/bin/heavy.mjs --label DX-R3-p6-final-replay -- node --experimental-strip-types lab/experiments/EXP-DX1/r3/replay.ts /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages
DX_R3_TRY_LOCK=1 node lab/bin/heavy.mjs --label DX-R3-p6-both -- bash lab/experiments/EXP-DX1/r3/run.sh both p6-both
## Outcome audit (content / freshness / binding)
dataDescriptors/plain/optionData/typed/canonicalRow: validate every own descriptor and supported prototype; fresh descriptor snapshots before reads; exact object fields and complete typed values.
supportedDescriptors/frozenData/observe/cache: identical shape checks plus recursive frozen data; fresh process WeakMap; exact immutable row instance, never identity-only or getter-backed reuse.
Unchanged judgeRead/readVerdicts and expected model consume those complete contributions; invalid values remain violations. Every read remains checked at its requested basis.
Node/reviewer/Clojure/replay assertions check content and explicit counts in this attempt, bind exact source functions/rows/bases, and label doubles and historical inputs; no engine slot is claimed.
strict-source/native selftest assert ClockConflict code, maximum and message against their own scope; full-row readback/source binding remain mandatory. Those native assertions are not reported PASS.
No acceptance edits or changed pinned paths found; no root check, native performance PASS, promotion, push or merge to main.
