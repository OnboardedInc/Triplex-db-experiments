# DX-V1 round three — FIX-FIRST

Reviewed builder `59fb16aef7e74a1c6d2b18dd297803f88765f638`, merged as requested into `review/DX-V1`. Tools/evidence commit: 0f2cb9b9.
No product, benchmark or acceptance edits after the merge; no containers, engine slot, measurement lock, push or promotion. Prior report is `REPORT-round2.md`.
Original counterexamples are repaired for the intended reasons. The broader invalid-value claim still fails, including wrong public metadata accepted by the actual judge. No normal local/gateway disagreement was found in this offline round.

## Claim-only rulings

| Claim | Ruling and reason | Fresh output |
| --- | --- | --- |
| R2-A | FIXED in tested cases: one full-row visibility walk supplies digest/count/stamp; cache cuts include reachable version/reference intervals. Expired old world rejects; exact smaller world accepts. | `round3/claims.log`, test 1; `temporal-capability.log` |
| R2-B | FIXED at the gateway/adapter boundary: missing/non-strict policy never admits time-only local reads; strict admission needs a later clock, and serial validation rejects old/equal SPI clocks too. Native boundary/live limits below. | `claims.log`, test 2; `commit.log`, `scope.log` |
| R2-C | Original Date/object defect FIXED by prototype validation. Broader invalid-value claim NOT FIXED: Option descriptors and array shape checks have gaps below. | `claims.log`, test 3; `value-claims.log` |

`node --experimental-strip-types --test lab/verify/DX-V1/round3/claims.test.ts`: **3 pass / 0 fail**, without old-defect prerequisite assertions.
Old assertions moved from `round2/attacks.test.ts` to `round3/attacks-round2.historical.ts`; current regressions explicitly supply strict-source proof. New `value-claims.test.ts` asserts only intended rejection: exit 1, **0 pass / 3 fail**. Separate historical characterizations reproduce accepted corruptions.

## Findings

**R3-C2 — MEDIUM, wrong public metadata accepted by the check.** `lab/bench/lib/canonical.ts:68-76`; `lab/bench/lib/observe.ts:25`, `:42-63`.
Sequence: bind correct createdBy Some("writer"); substitute a same-prototype Effect Option whose own value is a getter over a mutable string; freeze Option, row and nested data. First observation matches and caches. Change the string to "WRONG-ACTOR": the public field and direct canonical row differ, but observe reuses the old digest and the actual driver judge returns `{ok:true,kind:"correct"}`.
Repro: `round3/value-characterization.historical.ts:37-80`, `values.log`; claim-only rejection fails at `value-claims.test.ts:14`. Option canonicalization bypasses descriptor validation; frozenData treats a frozen Option as immutable without checking its accessor. No fabricated supplied observation or probabilistic hash collision.
Likelihood: deterministic wrong-return-shape injection; normal decoder creates data Options, so no frozen-trace/production decoder failure is demonstrated. A later sampled raw comparison would catch the changed payload if selected; unsampled cached checks still accept it.
Fix: validate supported Option prototypes and every own descriptor before reading them; reject accessors/hidden/symbol extras, and use the same validation before member-cache admission. Add the mutable-accessor rejection regression.

**R3-C1/C3 — LOW, invalid array shapes escape validation; one shares a valid canonical form.** `lab/bench/lib/canonical.ts:38-46`, `:11`.
C1: expected JSON [7]; make only index 0 non-enumerable. Object.keys differs, but canonical world is identical and the real judge accepts it. C3: Array(1) with absent index 0 and numeric non-index key "4294967295" passes key-count/regex checks; map skips the hole despite the sparse-array rejection claim.
Repro: same characterization file C1/C3, `values.log`; claim-only tests at `value-claims.test.ts:9,29` fail. C1's JSON values/bytes remain equal: its demonstrated violation is invalid shape accepted. C3 demonstrates invalid admission, not acceptance against a valid dense-array model.
Likelihood: injected faults absent from ordinary JSON decoding/current workload. Fix: require exactly enumerable own data indices 0..length-1 plus length; reject numeric-looking non-index keys. Key count alone does not prove density.

**R3-N — LOW, non-strict commit-path cost is not unchanged.** `packages/datomic/gateway/src/triplex/gateway/commit.clj:92-93`.
Repro: `round3/commit-probe.clj` executes both actual quoted functions. Forty non-strict old/new cases have identical outputs/errors, but new code adds policy-attribute d/entid plus one EAVT scope-policy lookup when that attribute exists, including false/missing scope values (`commit.log` exact vectors). No latency/throughput regression is claimed.
Likelihood: every non-strict commit on current schema. Extra work only; no wrong answer. Fix: explicitly qualify/measure this cost, or provision an immutable per-database function/policy arrangement preserving the old path without trusting an unchecked client flag.

## Strict clocks, creation and capability

`round3/TRACE.md` answers each source-path question with file/line references. Actual Clojure ASTs execute without Datomic: **25 clock/boundary checks, 40 old/new comparisons, 15 scope/capability checks**. Datomic calls are explicit doubles, not a native engine.
Creation writes policy with a fresh unique/value bootstrap token. Reopen/schema/function installation do not overwrite it; a late opposite-policy bootstrap aborts under native uniqueness/atomicity. Missing/default remains false. The double simulates duplicate rejection; native concurrent initialization still needs execution.
Strict validation combines assertion/retraction, metadata and claim clocks: finite, one binary64 time per physical commit, strictly above durable max. Equal/lower, NaN/infinities and mixed times reject; same-clock multi-journal, no-row and retraction cases hold. Retirement preserves max. Fully empty gateway commits supply wall time, not an empty clock list.
First -0 is allowed without prior; subsequent +0 compares equal and rejects. Native integer 9007199254740993 rounds to 9007199254740992 and rejects against that prior. This proves conservative double normalization, not exact arbitrary-precision timestamps.
The prior max comes from the latest physical Triplex transaction (legacy: scope header). Extra lookup is policy, not another max scan; strict scopes also scan supplied clocks. Serial function execution means equal-clock contenders cannot both pass after one publishes max. Sequential evaluation tests that predicate, not native simultaneous submission/hints.
The bit is NOT immutable against administrative Datomic writes: schema.clj:12 is an ordinary boolean; raw d/transact can clear it or bypass the function. Native function payloads can clear it through ops, or omit all clocks and pass vacuously; both reproduced. HTTP tx-data exposes no arbitrary ops and always supplies a clock. No HTTP bypass found. All-writer proof must exclude/fence native maintenance writers; these boundaries are not labelled a new HTTP wrong-read defect.
Capability reads stored flag from the supplied DB snapshot, not requested create input/cached boolean. A lagging snapshot missing the flag is conservative. Per-scope policy survives shared images; missing/non-strict images replace old true. Actual host reset hook discards clock proof with NaN on rebuild while held payloads survive. This does not certify a deployed lagging peer or replacement generation.

## What held, imports and live work

Fresh forced build: **5 tasks / 0 cache hits**. Positive reviewer gates: 14 tests; separate current characterizations: 3; builder-focused Node checks: 44; all pass. Exactly three new validator-contract assertions fail. Earlier route-label/fallback-quota fixture mistakes remain labelled in error logs.
Independent temporal oracle: **1,728** digest/count/stamp comparisons over two roots, shared/cyclic closures, reference expiry, entering/leaving reachability, retirement and late p2 ACK after p3; zero differences. Metadata revisions, same-revision prepared identity, Option restoration, floor/newest clock, image downgrade and held-buffer/rebuild tests held.
Real workers compare local payloads with a separate gateway call; wrong gateway/prepared injections become retained errors. Attempted=completed=retained, active=0 at stop. Open fallbacks no longer spend local raw quota. Coverage helpers and driver.ts:982-1019 impose ERROR when an active ladder lacks a local matching raw sample; live ladder coverage remains unverified.
Fresh recorded replay: **2,000 journals/clocks, 3,000 full public worlds, 10,000 prepared/materialized/source comparisons, zero differences** (`round3/replay.log`). Inputs are historical gateway pages containing valid ordinary data; shared canonicalization is not independent proof of its own validator.
History imports: create a fresh non-strict scope (default false), accepting time-only fallback; reopening strict with false cannot downgrade. Alternatively import into fresh strict scope in increasing physical-commit times, one clock per commit. Existing strict scopes cannot preserve imports <=durable max. Do not rewrite meaningful history clocks merely to satisfy the fence.
Adapter documentation does not explain this: README.md:162 still promises unsafe SPI's legacy irregular behavior without a strict exception; no strict/import provisioning guidance. ClockConflict gives numeric maximum and TRIPLEX_CLOCK text, without policy/remediation. Low-level create's third boolean is unexplained; normal runtime creation passes scope/layout only. Builder report is not adapter-facing guidance.
Still live-unverified: serial contention/bootstrap races, actual strict SPI/empty/retraction commits, stale hints, deployed follower lag/generation, raw samples at every ladder, local time-read share on newly strict data, full differential/benchmark and added commit cost. No live throughput, root/package suite or performance qualification attempted.

## Outcome audit and evidence

Every observation-to-outcome site is enumerated in `round3/AUDIT.md`: claim/temporal/capability/read/worker tests, extracted judge, characterizations, Clojure probes, runner, builder gates/replay, hash capture and report. Each identifies content, freshness and source/input binding; doubles, injections and historical pages are explicit. No engine-slot identity is borrowed.
`round3/binding.json` / `SHA256SUMS` bind source 59fb16ae, rebuilt JS, dependencies, tools/logs, historical pages and JRE/Clojure bytes. Independent byte read-back verified 9,709 records. Bulky index/runtime: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-V1/round3/`. No pinned reviewer path found; no product/acceptance hashes changed by this review.
Reproduce: `node lab/bin/heavy.mjs --label DX-V1-r3-repeat -- bash lab/verify/DX-V1/round3/run.sh`. Runner success reproduces FIX-FIRST; it does not accept the claim. Report committed last; code under review was not fixed.
