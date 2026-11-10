# DX-B5 — opt-in Datomic lean layout

L0–L5 are implemented. The 300-scenario differential and real W0 page comparisons pass. L6 is measured on the prescribed B3 command distribution, including a same-stack legacy baseline; the performance bars are **not all met**. Final whole-package and mutant reruns are complete; owned resource inventories are empty. No acceptance PASS, scorecard promotion or contract change is claimed.

Legacy remains the default; existing scopes are never converted. The final source preserves the inherited untyped-journal error, because the task permits only D0 behavior changes on legacy scopes. That existing edge blocks a fully green package suite in addition to the declared signed-zero/int64 domain failure.

## Milestones

| Milestone | Built and checked | Status |
| --- | --- | --- |
| L0 | Process-wide timestamp registration; HTTP-send order released at socket `finish`; gateway per-client sequence submission with a 20 ms predecessor bound; typed clock conflict, bounded catch-up and callback replay | 16 clients ×200 commands have exact positions, regular scopes, zero send regressions/fast declines and per-receipt record-time equality with fallback. Isolated run: zero clock replays; final shared CPU-5 runs: **58 lean /22 legacy**. Four processes ×500 commands pass on each layout: **77 lean /176 legacy clock replays**, zero declines, exact per-receipt fallback equality. Zero one-process replays is not universal under contention. |
| L1 | Immutable rows-version 3; indexed row text; row-only assertions/retractions; retirement markers; serial-point identity/live checks; unchanged entity/revision, transaction, scope, claim and operation metadata | Commit, duplicate, claim, CAS, lost-ACK and nested tests exercised both layouts. Known domain failure remains. |
| L2 | Exact native cut/history readers for ID/entity/list/pattern/scans, staged reads, begin prefetch, reach, transactions and command lookup | Row equivalence passes. Native `q` and old `log` explicitly reject lean. Existing untyped-journal edge remains a typed error on both layouts; its original success-expecting test therefore remains a blocker. |
| L3 | 300 seeded scenarios; ordered full values, metadata, positions and public journals; three semantic mutants | Final production source: **95,028 comparisons, 5,664 fast cuts and 5,664 raw-row closure checks**, 378.61 s; separate regular-scope typed-error parity passes. All three strengthened final mutants are rejected by actual content assertions. |
| L4 | Optional `getReachRows` / `getReachRowsMany`; decoded immutable rows cached next to triples; conservative malformed-coverage decline | Full rows equal getByEntities-based closures on both layouts; other adapters compile unchanged. |
| L5 | One batch raw-row reach per Datomic page; global BFS ordering/dedup; genuine recorded positions | Real H2 N=200 world passes on both layouts: 8,290 seed commands each, four pages ×two cuts each, exact portable content and **one actual reach HTTP request per page**. |
| L6 | Source/build/stack-bound B3-derived runner; raw observations; bounded lock and proven owned cleanup | Prescribed matrix complete. Serial/median, loaded-tail and seed-rate bars remain unmet; tables below. |

Production SDK/gateway source was frozen at `5e70772972ff5d184b8944be6a214946bfeee299`. The corrected benchmark source is `c21134fcac4a36ffd13e2b8f63153ff760c7a2c2`; its only subsequent production-independent change restored B3's original command-size distribution. Complete source/build copies are retained in `source-final-5e707729/` and `source-final-c21134fc/`, each with a byte-indexed CAPTURE.json. Later test changes strengthen observation checks, not runtime behavior. `test-source-8d3ff3ac/` explicitly labels its controller/test copy as captured after whole-suite startup and before mutants; it is not represented as original execution-time Git proof. Runtime preimages were already retained before execution.

## L6 — prescribed B3 distribution

Stack `tx2-dxb5-measure-pair-1794286658`, one lock hold, lean first then a fresh legacy scope. PostgreSQL is durable (fsync, synchronous_commit and full_page_writes read back); transactor CPUs 0,1, PostgreSQL CPU 0, write peer CPU 2, read peer CPUs 3,4. Transactor Xmx2g/container 3g; gateways Xmx1g/container 1500m. This is the B3 profile; no S3 report exists on this branch. Source, local image IDs, exact container IDs, CPU/memory settings, source/build hashes and actual PostgreSQL settings are in the attempt files. No downloads.

The command trace is unchanged B3 sizing: 60% 5–10 facts, 30% 11–25, 10% 26–50. Both layouts use the same source, seeded NS world, trace and Poisson arrival sequence. Each burst offers 3,291 commands at nominal 55/s over 60 s. All four lean bursts and the legacy burst have zero conflicts/replays. Serial phases each have 3,000 warm-up and 3,000 timed commits.

| Serial metric | Lean | Legacy | Requested bar |
| --- | ---: | ---: | --- |
| Datoms/commit p50 /p90 /p99 | **48 /82 /124** | **251 /540 /898** | About 45 for a 10-fact probe; exact probe below |
| Commit p50 /p90 /p99, ms | **7.493 /13.103 /23.306** | **9.885 /18.500 /32.520** | Lean p50 ≤5: unmet |
| Native transact p50 /p90 /p99, ms | 3.105 /5.306 /15.416 | 4.011 /7.484 /18.572 | Diagnostic |
| Observed HTTP calls/commit | 1.0077 | 1.0077 | Includes occasional additional calls; no claim every observed commit is exactly one call |

At the median the physical datom count is 5.23× smaller; p90 and p99 counts are 6.59× and 7.24× smaller. These are observed transaction-datom distributions, not physical I/O counts or a production-scale memory qualification.

| Burst | Layout | p50 ms | p99 ms | Count >50 ms | Bar ≤10 /≤50 ms |
| --- | --- | ---: | ---: | ---: | --- |
| No readers, run 1 | Lean | 14.243 | 41.302 | 4 | Median unmet; tail below bar |
| No readers, run 2 | Lean | 14.185 | 40.032 | 4 | Median unmet; tail below bar |
| No readers, run 3 | Lean | 14.204 | 41.242 | 12 | Median unmet; tail below bar |
| 32 readers | Lean | 10.762 | 67.823 | 71 | Both unmet |
| Same unloaded burst | Legacy | 16.847 | 56.210 | 57 | Comparison only |

Legacy repeats one unloaded burst and the full serial phase in the same stack/session; three legacy repetitions and a reader-loaded legacy burst were not run. No historical B3 number is substituted for this baseline. The before/after order was not randomized and no A/A calibration or independent acceptance review is claimed.

| Pull/read metric | Lean observed |
| --- | ---: |
| Single client, 20k warm +20k timed, p50 /p99 ms | 2.227 /7.005 |
| Single-client pulls/read-gateway CPU-second | 858.94 |
| 32 readers, 30 s, count | 149,400 |
| 32-reader pull p50 /p99 ms | 4.216 /38.722 |
| 32-reader pulls/read-gateway CPU-second | 2,525.41 |
| RYOW | 2,000 exact checks; p50 6.131 /p99 24.248 ms |
| Real W0 page: first 64 subjects of N=100 | **777.473 ms; 1 HTTP; 32,570 rows**, exactly equal to portable page |
| Raw NS graph page, separately labelled | 476.413 ms; 1 HTTP; 31,615 rows; 64 roots |

| NS seed writers | Commands | Facts | Commands/s | Facts/s |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 2,039 | 83,185 | 97.17 | 3,964.26 |
| 8 | 2,039 | 83,185 | 264.82 | 10,803.90 |
| 32 | 2,039 | 83,185 | **288.97** | 11,789.29 |

Each seed runs the complete 2,000-subject NS command plan through public Triples.transact, including 39 shared batches. The ≥400 commands/s bar is unmet. These are acknowledged workload throughput diagnostics, not full P5 stored-world/fingerprint acceptance at 100k subjects.

Primary results under the durable evidence root:

- `bench-1794286683427-16848fcf-7368-4966-9128-27cff468948c/`: lean result.json, raw observations, exact runner and metric streams.
- `bench-1794287297825-4e72050f-0ccb-4987-b954-31352d5f93bf/`: same-stack legacy baseline.
- `banded-measurement-table.md`: tables derived from those raw results by analyze-results.py.
- `cleanup-tx2-dxb5-measure-pair-1794286658-1794287475215944000.json`: exit zero, exact saved/current container identity, actual removals and successful empty inventories before lock release. Hold lasted about 13m37s, below 15 minutes.

## Fixed-size probe and retained failed attempts

The completed earlier fixed-10 matrix on source 5e707729 is retained in `bench-1794285688683-6bf9ac35-e014-4064-a255-a0b72eae27e9/` (lean) and `bench-1794286290006-5e62d1f2-9424-4eed-b5b7-762ee07e2e02/` (legacy). Its ten-fact probe wrote **48/48/48** datoms versus legacy **251/252/252**. `final-measurement-table.md` indexes its other diagnostics. Final audit found that forcing ten facts had removed B3's larger commands; the prescribed matrix above was rerun with the original distribution. Fixed-size tails are not relabelled as B3 target results.

That captured 10-fact command has 26 new rows, one retired row and three touched entities. Static counting of the regular source-bound transaction function gives **32 native index API reads**: 26 identity-history range seeks, one live-ID range seek, one retirement-marker seek, one exact entity-row retirement seek, two scope-value reads and one existing-entity revision read. Additionally there are five entity identity resolutions (three touched entities, retirement subject and journal absence), and one or two cached attribute-ID resolutions. These are API calls, not measured physical disk seeks; native internal/upsert work is not instrumented.

The first partial measurement (`bench-1794282248414-b4d95250-f1fe-4d8d-b2fe-3f14bff884c2/`, source 9c5e496e) stopped late at an invalid W0 fixture: W0.rung(64) requires a positive multiple of 50. It has no legacy result; nothing is inferred from the missing phases. The corrected fixture seeds N=100 and selects its first 64 subjects. Its successful cleanup receipt and `partial-measurement-table.md` remain retained.

Other first failures are retained: initial unsupported pnpm-exec option (offline install itself succeeded with zero downloads), an OOM-killed 1.5 GiB transactor container when large suites overlapped, missing local qualification dist on first real W0 import, and a compact-row integral JSON timestamp rejected by Datomic's double attribute. The corrected compact parser casts the record timestamp to double; replacement functional runs are sequential, with Xmx1g transactor/container 2g and Xmx768m gateways. No failed attempt is replaced or adopted as a semantic success. The first final integrity verifier expected Docker’s raw Id key while the retained stack manifest uses normalized id; its KeyError is retained in final-binding-attempt1.json, and corrected verification is a fresh attempt2. The first typed-error fixture accidentally used an irregular scope and therefore correctly declined; its failure was retained and the error witness was moved to separate fresh regular scopes.

## Design, compatibility and deviations

A live lean application row is one row-text datom: no fact entity, no :f/* and no entity for a rowless ref target. The immutable rows-version 3 header selects lean; rows-version 2 remains legacy. Cut readers use eligible immutable db values and valid time; general readers reconstruct assertion/retraction history and exact retirement fields from markers or retracting transaction metadata. Physical publication cuts precede logical filtering, including explicit imported position zero. Existing row IDs stay reserved through native history, matching legacy.

Datomic coalesces an assertion and retraction in one physical transaction. A born-retired row therefore retains its row text plus a marker; cut/reach exclude it and history reconstructs it. Ordinary retirement retracts the row datom. This necessary exception is covered by the differential. Markers preserve explicit nested/import retirement positions/times/IDs, including empty IDs and signed zero.

Ordered registration applies to replay-safe callbacks; unsafe SPI callbacks can await another fixed-clock transaction and would deadlock if ordered. Clock rejection requires the callback's public journal, which establishes that replay re-reads the runtime clock. Other SPI callbacks retain legacy irregular behavior. Timestamps and journal values are never rewritten. Clock retries have a separate minimum budget of 32; CAS retains maxRetries. Catch-up waits at most 50 ms per replay.

The lean compact transport sends fresh rows once as canonical text, retirement columns for retired rows, and explicit input order. The gateway validates identity/order/text bindings. Selection follows the actual immutable create response: reopening legacy while requesting lean retains the legacy wire payload. No controlled causal speedup is claimed for compact transport alone.

Raw-row batch reach is bounded to 64 roots/50,000 entities, retaining the 100,000-row cap. Ordinary triple reach retains its 5,000-entity cap. A real W0 page exceeds 10k answer entities; the earlier cap forced portable fallback. One decoded ID index is shared across roots. This is a bounded extension, not an unbounded graph route.

**LayoutUnsupported routes on lean: `q` (native Datalog) and `log` (older feed), only.** Both return HTTP 409 with code and route; the adapter surfaces typed ReadError with route identity. Row-pattern query, transaction feed and command lookup are implemented. Hot gateway row readers use native indexes, not d/q, d/entity or d/pull; reflection warnings remain off and hot responses are hand-written.

The inherited B4 journal reader decodes untyped SPI rows before filtering; a raw tx_id `spi` causes branded Schema validation failed. An initial helper correction filtered first, then final scope audit reverted it to honor the hard legacy constraint. Both layouts now preserve the typed ReadError. A separately authorized journal fix is needed for the existing success-expecting test. The new error-parity witness reads back the actual untyped stored row and requires the exact schema-error cause, so a transport failure cannot satisfy it.

## Verification and evidence

Durable evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/`. Bulky raw output stays there; [SHA256SUMS](SHA256SUMS) and [EVIDENCE.json](EVIDENCE.json) index **4,842 files /632,697,190 bytes**, with all 4,842 read back against the emitted manifest. The committed manifest is 603 KiB; no bulky raw output is committed.

| Gate | Result |
| --- | --- |
| `legacy-parity-differential2.log` | Final runtime: 300 scenarios, 95,028 comparisons, 5,664 fast cuts/closures, plus regular-scope typed-error parity; two tests pass |
| `source-final-suites-mutants.log` | Strengthened row-byte/schema-cause parity passes; **all three mutants rejected by content**; cleanup inventories empty |
| `source-final-legacy.log` | **180 pass, 2 fail /182**: declared domain failure and inherited untyped-journal test; seven touched core tests pass; four-process and 16-client gates pass |
| `source-final-lean.log` | **178 pass, 2 fail, 2 intentional native-q skips /182**: same failures; seven touched core tests pass; four-process and 16-client gates pass |
| `real-W0-legacy-suite.log` | Real H2 N=200 reader comparison passes on both layouts, eight one-request pages each |
| `final-source-offline.log` | 143 pass, 41 native skips /184, including touched core tests |
| `final-binding-attempt2.json` | 699 unchanged runtime/dependency files and 78 measured hashes match; container IDs, expected phase counters and cleanup bind; integrity only |
| `final-source-types.log` | Final package source typecheck passes |
| `adapters.log` | Nine adapter/core typecheck targets, 12 Turbo tasks pass |
| `compact-bench-types.log` | Changed benchmark modules pass focused typecheck |
| `legacy-parity-build.log` | Final runtime/dependency builds pass; generated dist is not committed |
| `final-source-lint.log`, `final-source-format.log` | Zero lint errors (seven existing/spike warnings); touched package/core TS formatting passes |
| Earlier full suites | Before the journal rollback: legacy 180 pass/one declared failure; lean 178 pass/one declared failure/two native-q skips, each /181. These are historical, not final-tree green claims. |

The differential compares ordered getById/entity/entities/history/pattern/dependencyState results, reach and raw closures, transaction feed, command lookup and receipt positions. It includes valid-time boundaries, equal record times, retract/reassert, retraction-only commits, nested two-position commits, explicit imported positions, irregular SPI scopes, duplicate commands and born-retired rows. Bases include head, every earlier endpoint, an interior position, before/at/between commit times and valid boundaries. The separate regular-scope witness compares the same inherited typed error on both layouts.

Mutants replace marker retirement position with transaction position, remove valid-time filtering, and treat irregular scopes as regular. Each must reach a fresh healthy gateway and fail an actual content assertion; startup, transport and timeout failures cannot count. All three strengthened final rejections are retained in source-final-suites-mutants.log and their fresh mutants/tx2-dxb5-mutant-*/test.log files. Earlier rejections are retained separately in final-equivalence.log and mutants-final.log.

No root pnpm check, pack consumer, release, large P5 world, 10m-entity/100m-fact run, maintenance, crash recovery acceptance or independent review is claimed. The pack script can attempt network installation; it was not run under the no-download constraint. Broad benchmark typecheck retains unrelated audit-traffic/round2 diagnostics; changed modules pass the focused check. The inherited lab publication observer can still reject shifted ACK positions under concurrent public-driver use; its validation is outside the owned files.

## Observation-to-verdict audit

No acceptance PASS/receipt or promotion is emitted. The complete introduced/changed developer-verdict sites are:

1. CommitOrder, held-ACK wrapper, compact/client, row-codec, raw-coverage and identity tests inspect actual new fixture bytes/order/typed errors. Real HTTP fixtures bind their own loopback server; native fixtures use fresh UUID scopes. Offline checks claim no native slot.
2. Concurrent and distributed-clock tests inspect actual receipts, positions, regularity and per-receipt record-time fast/fallback equality. Fresh scopes/processes and saved owned stack source/IDs bind the attempt; observed clock counts are reported.
3. layout-differential.test.ts checks deep ordered full values/metadata and nonzero fast/closure denominators on paired fresh scopes with deterministic IDs/clock. Its retained-error witness reads actual stored bytes and requires the expected branded schema-error cause. Prior artifacts are never loaded as current observations.
4. Reach, route, journal, read-pin, adapter and real W0 tests inspect exact content, metadata and actual request counts at named bases. Fresh native source copies/health hashes and scope IDs bind them. Native-query-only tests are explicitly skipped on lean or assert typed unsupported, not counted as supported queries.
5. mutants.sh requires a new healthy source-mutated stack, an actual assertion mismatch and successful owned cleanup; generic nonzero exit is insufficient.
6. bench.mjs retains raw current-attempt distributions, exact RYOW/page comparisons, source/build hashes, stack/CPU/durability identities, fresh UUID scopes and lock ownership. Missing/failed phases retain their errors. Banded and fixed-size results remain distinct; no emitted boolean is semantic acceptance.
7. cleanup-measurement.py checks saved/current container IDs, actual removals, successful fresh empty inventories and exact lock owner before release. Functional cleanup likewise requires successful fresh empty inventories. Cleanup cannot declare semantic correctness.
8. hash-inventory.py, analyze-results.py, final-binding-verifier.py, evidence SHA256SUMS/index and this report bind actual retained bytes and labelled attempt identities. The retained one-off binding verifier checks 699 unchanged runtime/dependency files, 78 measured hashes, expected phase counters, saved stack IDs and actual cleanup outcomes. Manifest readback checks every source file. Tables/hashes establish observations/integrity, not acceptance or completeness.

## Pins, scope and remaining work

Only packages/datomic, the two authorized benchmark edits, the optional core adapter members and b5 files changed. No dependency changes, generated dist commits, acceptance edits, push, merge or deployment. `HASH-CHANGES.json` lists every changed source path with old/new SHA-256 against the pre-DX-B5 baseline. Final inventory lists 31 source paths with zero old hashes or exact paths mentioned in acceptance. There are therefore no directly referenced pinned-file hash changes to list; the conservative full inventory is supplied for the contract builder.

Final functional cleanup is complete: source-final-functional-inventory.json contains successful empty container, network and volume readbacks, and the private guard was removed. All measurement attempts removed their owned stacks and released only their own lock after verified cleanup. The cleanup helper is idempotent so its outer trap still reaches those readbacks after the pre-mutant stack was already removed. Shared residents, foreign locks/containers, default Docker context and forbidden ports were not changed.

Open work: the unmet performance bars; the declared domain failure and inherited journal test versus strict legacy compatibility; the lab publication-observer shifted-ACK blocker; and full downstream P1–P5/scale qualification. This report does not turn diagnostic counts or focused passing gates into those broader outcomes.
