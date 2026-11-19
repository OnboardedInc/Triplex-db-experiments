A reader now keeps a person's facts after a real read and drops old entries when its byte budget fills.
Adding 98,000 untouched thin people or 9,800 untouched deep people grew the packed reader and measured gateway caches by zero bytes.
Reader process memory still grew by 266 bytes per thin person and 1,718 per deep person. Both exceeded the provisional 64-byte limit.
The first exact cold read at the 99th percentile took 6.09 ms for thin people and 103.08 ms for deep people. The provisional limit is 100 ms.
Over 8,000 SQL-backed reads with a moving active set, reader memory settled near 179 MiB. All returned facts matched.
The small release tests matched Python and preserved both sides of a first read that crossed a write and a release.
One test stack held 100,000 thin people, and another held 10,000 deep people. Each run read and wrote 2% of them.
The mixed production population and million-person capacity remain unproven. One command queues the two wide populations and both 100-account placements.

| Role | Bytes per untouched thin person | Bytes per untouched deep person | Bytes per idle scope | Threads per idle scope |
| --- | ---: | ---: | ---: | ---: |
| Reader process | 265.7 | 1,718.2 | 131,072 | 0 |
| Read gateway | 2,925.8 | 53,025.2 | 1,399,662 | 4 |
| Write gateway | 3,781.5 | 44,788.5 | 1,538,926 | 4.14 |
| Transactor | 4,300.5 | 43,981.4 | 2,871,881 | 8.14 |
| PostgreSQL | 9,333.0 | 147,617.8 | 1,122,889 | 0.14 |
| Driver apparatus | 354.4 | 8,357.9 | 224,695 | 0 |

Signed RSS differences hold the admitted people fixed. PostgreSQL process RSS can count shared pages more than once. The wide arm used two exclusive slots. The deep and idle arms used one 3.5 GiB slot with two independent gateway JVMs. Idle cost is the difference between one and eight unqueried scopes divided by seven.
The thin/deep imports contained 800,000/1,604,464 seed facts and added 2,884/120,759 bytes in PostgreSQL relations and indexes per cold person. Native read comparisons numbered 16,000/800, read-your-own-write checks 2,000/200 and Python entity queries 64/420.
Thin first-read p50/p99 was 1.32/6.09 ms across 1,000 people. Deep p50/p99 was 18.55/103.08 ms across 100. The deterministic deep first-read sample had 117–288 facts and omitted the largest 34-task class. Mac timings are diagnostic.
At a 128 KiB retention budget the native reader evicted 166 times. Quarterly median RSS was 173.1 / 177.3 / 179.3 / 179.4 MiB. A 48,000-person guest fixture verified 96,000 reads. With 2 MiB and 109 evictions its medians were 177.8 / 184.2 / 184.4 / 186.8 MiB, against 267.1 / 398.4 / 460.9 / 461.3 MiB unbounded.
Native proof used 100 thin and 100 deep people. O-REPLAY matched 21 pinned reads across 372 entity queries. Across four releases O-DOMAIN matched 400 evaluations and guarded states. R1 loaded two changed worlds per account. R2 loaded three after the interposed write. The narrow release excluded all 100 thin people and selected all 100 deep people. Demand admissions stayed fixed. R1/R2 took 0.59/0.35 s thin and 0.72/0.34 s deep at these small sizes.
All 23 named schedules ran on SQL, including three historical controls that reproduced their expected stale outcomes. An independent transcript check matched 48 logged guarded states. The sender worker returned all 118 original rows at its pinned receipt. SCALE1’s ordinary deep activation and its nonzero tenant range matched 24 more guarded states with zero cold source pulls. The neighboring person on the same page retained an empty guard.
Native placement tested the same 32 deep people in eight accounts, once pooled and once in eight databases. All 128 guarded states matched Python. Original seed hashes, logical outputs and receipt-checked catalog membership matched across placements. Replay checked 8 pooled and 24 isolated reads. A matched one-slot wide census is running. The first deep import stopped at a 4,086-assertion command. The corrected import sizes commands by facts and preserves each person’s complete seed.
The five public heads at the 20:38 UTC integration cutoff were SCALE1 `f33e65ddd`, ACT1 `eb154ca8a`, BM1 `0aff20db6`, DRV1 `4d1bdb6ed` and THIN1 `e758c4400`. The controller merge retained BM1's clean-seed and owner checks, ACT1's worker-specific evidence and deadlines, and the legacy queue handoff. The reader merge kept bounded admission. The final driver and activation merge retained SCALE1’s account ranges and restored seeds, with INT1’s first-touch selector and bounded reader.
All 17 package suites passed, including 407 Datomic tests with 52 declared skips. The focused runs passed 85 Node tests, 13 Vitest tests and one BM1 pristine-seed test. All 13 package tarballs installed in a clean consumer. The repository-wide formatter stops in the existing 2,000-level nested JSON fixture. The contract, frozen v3 trace and bars are unchanged. No changed file was pinned.
The standard experiment uses `reach-touched` with 16 MiB per reader/scope. `DX_TOUCHED_RETAIN_BYTES=Infinity` restores unbounded retention. SCALE1 accepts `DX_INT1_READERS=touched` and an optional EAD-only release through `DX_INT1_DEEP_RELEASE=ead90`. Durable import projection time and bytes are reported separately.
From the clean published checkout, set `BENCH_SERVER` to the assigned machine and run `node --experimental-transform-types lab/experiments/EXP-DX1/int1/control.ts launch BATCH UTC_CUTOFF`. The local controller and six-core reader affinity were exercised without a bench connection. Expect about four times the seed rows and coverage work at 4M versus 1M, with bounded reader charge. Both small arms use the same 29,000 deep people and 580 active, and must agree on every account's roster and logical outputs.

**Evidence audit**
- Reader admission checks the requested source cut and complete closure. Generation identity rejects a late page even at the same position. The moving trials compare original rows at each read and bind samples to the reader, run and budget.
- The import ledger matches issued facts, full receipt metadata and the observed ordered feed. Exact reads check original rows. O-REPLAY binds its expected bytes and every query to the newly generated case and actual receipt positions.
- The projection checks the immutable seed and first change, source identity, cursor and cut. The selector and publisher check page members, release, transaction and stored guards, including a neighboring tenant on the same physical page. Python evaluates original worlds. The schedule gate checks the complete named TAP transcript.
- The census binds source and build hashes, guest boot, nonce, scope, active slot, image and observation. Collection checks watermarks against on-disk membership. The physical queue rechecks the published tree, every raw receipt, pinned oracle bytes, raw latency percentiles, each original tenant seed digest, the persistent catalog, and normalized outputs from both fresh placements.
- Raw attempts and failed controls are indexed in [EVIDENCE.md](EVIDENCE.md) and sealed in [SHA256SUMS](SHA256SUMS). The provisional bars are from `origin/main` at `8f014afb9`, section 1.2.
