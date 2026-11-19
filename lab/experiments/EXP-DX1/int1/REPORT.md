A reader now keeps a person's facts after a real read and drops old entries when its byte budget fills.
Adding 98,000 untouched thin people left packed reader data and both gateway application caches unchanged.
The reader process still grew by 266 bytes per added person. Both gateways also exceeded the provisional 64-byte limit.
The first exact cold read took 6.09 ms at the 99th percentile across 1,000 thin people on the shared Mac.
Over 8,000 SQL-backed reads with a moving active set, reader memory settled near 179 MiB. All returned facts matched.
A release crossed a first read and a subsequent write. Independent replay verified both sides, and every guarded small-case decision matched Python.
The 10,000-person deep census is pending. The first attempt stopped at 2,138 people, and the corrected import is waiting for a disk reservation.
Single-machine capacity for millions of people is unproven. One command queues the two wide populations and both 100-account placements.

| Role | Bytes per untouched thin person | Bytes per untouched deep person | Bytes per idle scope | Threads per idle scope |
| --- | ---: | ---: | ---: | ---: |
| Reader process | 265.7 | pending | 131,072 | 0 |
| Read gateway | 2,925.8 | pending | 1,680,530 | 4 |
| Write gateway | 3,781.5 | pending | 2,749,001 | 4 |
| Transactor | 4,300.5 | pending | 2,719,159 | 8.29 |
| PostgreSQL | 9,333.0 | pending | 5,726,208 | 0.29 |
| Driver apparatus | 354.4 | pending | 149,797 | 0 |

RSS differences use the same admitted people before and after the cold import. PostgreSQL process RSS can count shared pages multiple times. The thin arm had 100,000 people, 800,000 seed facts and 2,000 touched. PostgreSQL added 2,884 bytes of relation and indexes per cold person. Idle cost averages seven additional provisioned, unqueried scopes.
Thin first-read p50/p99 was 1.32/6.09 ms against the provisional 100 ms p99. There were 16,000 full-metadata read comparisons, 2,000 read-your-own-write checks and 64 Python entity queries. Mac times are diagnostic.
At a 128 KiB retention budget the native reader evicted 166 times. Quarterly median RSS was 173.1 / 177.3 / 179.3 / 179.4 MiB. A 48,000-person guest fixture verified 96,000 reads. With 2 MiB and 109 evictions its medians were 177.8 / 184.2 / 184.4 / 186.8 MiB, against 267.1 / 398.4 / 460.9 / 461.3 MiB unbounded.
Native proof used 100 thin and 100 deep people. O-REPLAY matched 21 pinned reads across 372 entity queries. Across four releases O-DOMAIN matched 400 evaluations and guarded states. R1 loaded two changed worlds per account. R2 loaded three after the interposed write. The narrow release excluded all 100 thin people and selected all 100 deep people. Demand admissions stayed fixed.
All 23 named schedules ran on SQL, including three historical controls that reproduced their expected stale outcomes. An independent transcript check matched 48 logged guarded states. The sender worker returned all 118 original rows at its pinned receipt. SCALE1's ordinary deep activation matched 12 more guards and fetched zero cold closures.
The small placement control compared eight active deep accounts in one and eight in-memory scopes, including every release guard and Python decision. The native eight-account replay and the corrected deep census await a fresh grant. The pending compact diagnostic requests one standard slot for PostgreSQL, the transactor and two gateway JVMs.
The five public heads at the 19:40 UTC integration cutoff were SCALE1 `6cb5c97a3`, ACT1 `21e6c3523`, BM1 `0aff20db6`, DRV1 `4d1bdb6ed` and THIN1 `e758c4400`. The controller merge retained BM1's clean-seed and owner checks, ACT1's worker-specific evidence and deadlines, and the legacy queue handoff. The reader merge kept bounded admission over ACT1's imported older copy.
All 17 package suites passed, including 407 Datomic tests with 52 declared skips. The focused runs passed 76 Node tests, 13 Vitest tests and one Python packaging-fixture test. All 13 package tarballs installed in a clean consumer. The repository-wide formatter stops in the existing 2,000-level nested JSON fixture. The contract, frozen v3 trace and bars are unchanged. No changed file was pinned.
The standard experiment uses `reach-touched` with 16 MiB per reader/scope. `DX_TOUCHED_RETAIN_BYTES=Infinity` restores unbounded retention. SCALE1 accepts `DX_INT1_READERS=touched` and an optional EAD-only release through `DX_INT1_DEEP_RELEASE=ead90`. Durable import projection time and bytes are reported separately.
From the clean published checkout, set `BENCH_SERVER` to the assigned machine and run `node --experimental-transform-types lab/experiments/EXP-DX1/int1/control.ts launch BATCH UTC_CUTOFF`. The local controller and six-core reader affinity were exercised without a bench connection. Expect about four times the seed rows and coverage work at 4M versus 1M, with bounded reader charge. Both small arms use the same 29,000 deep people and 580 active, and must agree on every account's roster and logical outputs.

**Evidence audit**
- Reader admission checks the requested source cut and complete closure. Generation identity rejects a late page even at the same position. The moving trials compare original rows at each read and bind samples to the reader, run and budget.
- The import ledger matches issued facts, full receipt metadata and the observed ordered feed. Exact reads check original rows. O-REPLAY binds its expected bytes and every query to the newly generated case and actual receipt positions.
- The projection checks the immutable seed and first change, source identity, cursor and cut. The selector and publisher check page members, release, transaction and stored guards. Python evaluates original worlds. The schedule gate checks the complete named TAP transcript.
- The census binds source and build hashes, guest boot, nonce, scope, active slot, image and observation. Collection checks watermarks against on-disk membership. The physical queue rechecks the published tree, every raw receipt, pinned oracle bytes and normalized outputs from both fresh placements.
- Raw attempts and failed controls are indexed in [EVIDENCE.md](EVIDENCE.md) and sealed in [SHA256SUMS](SHA256SUMS). The provisional bars are from `origin/main` at `8f014afb9`, section 1.2.
