# DX-B5 — opt-in Datomic lean layout

Status: L0–L5 implemented, with the inherited untyped-journal edge retained under the strict legacy-compatibility constraint. Final differential/error-parity and mutant reruns are running; L6 is partial and its corrected comparison is blocked on another agent’s measurement lock. This report records developer evidence, not an acceptance-contract promotion. Legacy is still the default and existing scopes are never converted. `lab/acceptance/` is unchanged.

## Implementation by milestone

| Milestone | Built | Evidence/status |
| --- | --- | --- |
| L0 | Process-wide timestamp registration, send ordering released at HTTP `finish`, gateway per-client sequence submission (20 ms bound), typed clock conflict and bounded replay | Isolated 16-client × 200-command gate: 3,200 exact receipts, zero clock replays/declines/send regressions. Four independent processes × 500 commands: 2,000 exact receipts, 162 clock replays, zero declines; each receipt's record-time pull equals fallback. Under shared CPU-5 contention the full lean suite observed 171 clock replays, zero send regressions/declines and exact answers. The expected zero one-process replay count is therefore not universal. |
| L1 | Immutable rows-version 3 selection, indexed row text, retirement markers, serial-point identity/live checks, row-only writes plus unchanged entity/transaction/scope/claim metadata | Native commit/claim/CAS/lost-ACK/nested/identity tests exercised both layouts; full-suite limitations below. |
| L2 | Exact native row cut/history readers; ID/entity/list/pattern/scans, staged reads, begin prefetch, reach, transactions and command lookup | Legacy reader remains in place. Lean explicitly rejects only native `q` and old `log`. |
| L3 | 300 seeded differential scenarios with deterministic identities/clocks and ordered full answers | Pre-compact final run: 95,028 comparisons, 5,664 accepted fast cuts and 5,664 raw-row closures, 249.91 s. All three semantic mutants fail content assertions. Current compact rerun also passes all the same denominators in 235.62 s. |
| L4 | Optional `getReachRows` / `getReachRowsMany` core adapter members; immutable decoded rows cached next to triples | Row-for-row portable closure comparison on both layouts; conservative malformed-coverage decline. Other adapters compile unchanged. |
| L5 | Datomic W0 reader uses one batch raw-row reach, reconstructs global BFS order/dedup and preserves actual recorded positions | Small native 64-root page test passes on both layouts. Real H2 N=200 comparison passes on both layouts: four pages × two cuts each, exact portable content and one actual reach HTTP request per page. |
| L6 | B3-derived measurements, source/hash/stack binding, raw outputs, one bounded lock around lean and legacy comparison, verified owned cleanup | First partial lean run below; final corrected comparison pending. |

The gateway hot readers use native index APIs, not `d/q`, `d/entity` or `d/pull`. Responses on reach/journal hot paths remain hand-written. Reflection warnings stay disabled.

## Layout and compatibility details

A new live application row adds one `:triplex.entity/row` datom, no fact entity and no `:f/*`; a ref target without its own rows gets no entity. Existing entity IDs/revisions, transaction attributes, scope position/max clock, claims, operation IDs and conflict checks remain. Existing row IDs remain reserved through Datomic history, matching legacy identity behavior after retirement.

The compact lean transport sends each new row once as canonical text, plus only retirement columns for retired rows and an explicit input row-order list. The gateway validates identities/order/text binding and normalizes the decoded record timestamp to Datomic's double type. It selects this protocol only from the actual immutable create response; requesting lean while reopening a legacy scope retains the legacy payload. This is a transport optimization; stored row text and legacy protocol are unchanged.

The raw-row batch request has an explicit 64-root/50,000-entity bound; normal triple reach retains its existing 5,000-entity bound. Both retain the existing 100,000-row bound. A real W0 page includes over 10,000 answer entities, so the original bound would silently force the portable fallback. Raw rows share one decoded ID index per batch rather than rebuilding it per root.

Routes returning HTTP 409 `{"code":"LayoutUnsupported","route":"..."}` on lean scopes: **`q`** (native Datalog) and **`log`** (older feed). The adapter surfaces these as typed `ReadError` with route identity. The row-pattern query route, transaction feed and command lookup are implemented on lean.

## Design deviations and retained failures

- Datomic coalesces assertion and retraction in one physical transaction. A born-retired row therefore retains its row text plus retirement marker; cut/reach exclude it and history reconstructs it. Ordinary retirement retracts the row datom. Explicit nested/import retirement fields use the prescribed marker, including empty transaction IDs and signed-zero time.
- Ordered registration applies to replay-safe callbacks; unsafe SPI callbacks can await another transaction with a fixed imported timestamp and would deadlock if ordered. Clock rejection requires the callback's public journal, which proves replay re-reads its runtime clock. Other SPI callbacks retain legacy irregular-scope behavior. Timestamps and journal values are never rewritten.
- Clock conflicts have a separate minimum 32-retry budget; CAS retains its configured retry budget. The 50 ms catch-up wait is per replay, not permission to alter clocks.
- The inherited B4 journal reader decodes untyped SPI rows before filtering; a raw `tx_id: "spi"` causes a typed ReadError. An initial helper correction filtered those rows first, but the final scope audit reverted it: the hard constraint permits only D0 behavior changes on legacy scopes. This existing edge therefore remains on both layouts. The final differential explicitly compares this typed error as well as successful answers. The earlier full-suite results below predate that narrow rollback; they cannot establish that the final tree has only the declared domain failure. A separately authorized journal fix is needed for the existing untyped-journal test.
- Imports with logical position zero still obey their physical publication cut; history is bounded by the physical database before applying logical visibility.
- The indexing-duration test compares VM wall time with host monotonic elapsed time plus 5 ms. It remains unchanged and failed under shared CPU contention by about 4–10 ms. The known `preserves signed zero and int64 bounds` domain failure also remains. Neither is relabelled as passing.
- First differential attempt OOM-killed a 1.5 GiB transactor container while large suites overlapped. Replacement functional runs are sequential, keep Xmx1g, and use a 2 GiB container limit. Gateways keep Xmx768m. Initial OOM, transport-fixture/import errors and all failed reruns remain in evidence.
- First real H2 W0 comparison could not import the unbuilt qualification dist; the unchanged dependency was built locally with no downloads before a fresh-stack rerun.
- First compact native attempt rejected an integral JSON record timestamp as the wrong Datomic double type; corrected at compact decode and rerun on a new stack.
- First L6 attempt stopped late because `W0.rung(64)` is invalid (N must be a positive multiple of 50). The corrected fixture seeds N=100 and reads its first 64 subjects. No legacy result or full matrix is inferred from that failed attempt.

The captured benchmark commit has 26 new rows, one retired row and three touched entities. Static counting of the transaction function for that regular source-bound command gives **32 native index API reads**: 26 identity-history range seeks, one live-ID range seek, one retirement-marker seek, one exact entity-row retirement seek, two scope-value reads and one existing-entity revision read. There are additionally five entity identity resolutions (three touched entities, retirement subject and journal absence) and one or two cached attribute-ID resolutions. These are API calls, not measured physical disk I/Os; Datomic internals/upserts are not instrumented. The marker seek is required for the born-retired exception. The exact captured input and source are retained.

## Validation

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/`.

| Run | Result |
| --- | --- |
| `offline-compact.log` | 143 pass, 40 native skips / 183; includes touched core tests |
| `compact-unit.log` | 2 compact/legacy wire-selection fixtures pass |
| `SDK-final.log` | 101 pass: client, queue, real held-ACK old-wrapper compatibility, malformed coverage |
| `compact-build.log`, `compact-types.log` | Package/dependency build and typecheck succeed |
| `adapters.log` | 12 Turbo tasks pass across nine adapter/core typecheck targets |
| `compact-bench-types.log` | Focused changed benchmark modules typecheck |
| `compact-equivalence2.log` | 300 scenarios, 95,028 comparisons, 5,664 fast cuts/closures; passes in 235.62 s |
| `final-equivalence.log` | 300 scenarios, 95,028 full comparisons, 5,664 fast cuts/row closures; then three content-failing mutants |
| `real-W0-legacy-suite.log` | Real N=200 H2 worlds, lean and legacy each: 8 exact page comparisons and 8 actual single-request pages; 8,290 seed commands each |
| `compact-full-legacy.log` | Before helper rollback: 180 pass, one declared domain failure / 181; indexing timing passes; 5 clock replays, zero send regressions/declines |
| `compact-full-lean.log` | Before helper rollback: 178 pass, one declared domain failure, two intentional native-q skips / 181; indexing-duration assertion passes; one-process clock replays 60, zero send regressions/declines |
| `final-lean2.log` | 173 pass, 2 fail, 2 intentional native-q skips / 177; known domain failure and unchanged cross-clock timing assertion |
| `final-legacy.log` | Historical pre-clock-budget run: 174 pass, 3 fail / 177; domain, timing and old exhausted-clock-retry failure. Current full legacy rerun is recorded above. |

The differential compares getById, entity/list reads, entity/attribute/entity-type patterns, dependencyState, history, reach, transaction feed, command lookup and receipt positions. It includes past/future/bounded valid times, equal record times, retract/reassert, retraction-only commits, nested two-position transactions, explicit imported positions, irregular scopes, duplicate commands and born-retired rows. Bases include head, every earlier physical endpoint, an interior position, before/at/between commit record times, and valid boundaries. Order and full metadata must match. Mutants independently replace marker retirement position with transaction position, remove the cut valid-time filter, and treat irregular scopes as regular; every accepted mutant result requires a healthy newly started gateway and an actual assertion difference, not a startup/transport failure.

Lint has zero errors (seven existing/spike warnings); the touched package/core TS files pass formatting. No root-wide `pnpm check`, pack consumer or external backend acceptance is claimed. The package pack script is not used because its unmodified installer can attempt network access; this task permits no downloads. Broad bench typecheck retains unrelated audit-traffic/round2 errors; the changed modules pass their focused check.

## L6 — fixed-size diagnostics; prescribed distribution rerun pending

Source/build copy: `source-final-9c5e496e/`. Stack: `tx2-dxb5-measure-pair-1794280959`; CPU 0–4 held under measurement lock; durable PostgreSQL + transactor and split write/read gateways. Results: `bench-1794282248414-b4d95250-f1fe-4d8d-b2fe-3f14bff884c2/result.json`. This predates compact transport, the shared row index and real-page bound. It is partial fixed-10 diagnostic evidence, not the prescribed B3-distribution comparison. A second fixed-10 run completed the entire lean matrix and same-stack legacy baseline on source 5e707729; its raw results are retained in final-measurement-table.md. Final audit found the ten-fact override was inappropriate for comparing B3 tail behavior. The default now preserves the original banded trace (60% 5–10, 30% 11–25, 10% 26–50 facts); fixed size is an explicitly labelled optional probe. The prescribed matrix is being rerun. No fixed-size tail is relabelled as the variable-distribution target result.

| Metric | Lean observed | Requested bar |
| --- | ---: | ---: |
| Datoms/10-fact command p50 / p90 / p99 | 48 / 48 / 48 | about 45 |
| Serial commit p50 / p90 / p99, ms (3k warm + 3k timed) | 6.448 / 8.282 / 15.732 | p50 ≤5 |
| Native transact p50 / p90 / p99, ms | 2.995 / 4.091 / 10.572 | diagnostic |
| 55/s ×60s burst 1 p50 / p99, ms | 12.950 / 38.385 | ≤10 / ≤50 |
| Burst 2 p50 / p99, ms | 12.888 / 41.428 | ≤10 / ≤50 |
| Burst 3 p50 / p99, ms | 12.511 / 35.118 | ≤10 / ≤50 |
| 55/s +32 readers p50 / p99, ms | 10.412 / 74.087 | ≤10 / ≤50 |
| Single pull p50 / p99, ms (20k warm +20k timed) | 1.617 / 5.794 | diagnostic |
| Single pull / read-gateway CPU-second | 1,189.59 | diagnostic |
| 32-reader pull p50 / p99, ms | 4.148 / 37.875 | diagnostic |
| 32-reader pulls / read-gateway CPU-second | 2,601.48 | diagnostic |
| NS seed 1 writer, commands / facts per second | 84.58 / 3,450.47 | diagnostic |
| NS seed 8 writers | 203.00 / 8,281.96 | diagnostic |
| NS seed 32 writers | 228.89 / 9,338.15 | ≥400 commands/s |
| Raw NS graph page, 64 roots | 508.91 ms, 1 HTTP, 24,564 rows | not substituted for W0 |
| RYOW | 2,000 exact checks; p50 5.821 / p99 21.738 ms | diagnostic |

Each seed is the complete 2,000-subject NS command plan, 2,039 commands / 83,185 facts including shared batches. Baseline legacy and true W0 are pending in the corrected run. The first cleanup receipt verifies saved container IDs, successful removal and empty fresh container/network/volume inventories before releasing the owned lock.

## Observation-to-verdict audit

No acceptance PASS, promotion or contract receipt is emitted. Before committing developer verdicts, the following are the complete observation-to-verdict sites introduced or changed here:

1. `CommitOrder.test.ts`, `send-wrapper.test.ts`, `compact.test.ts`, `client.test.ts`, `reach-rows-fault.test.ts`, and row-text/identity tests: assertions inspect exact new fixture bytes/order/typed errors. Fixtures are newly constructed or use fresh native UUID scopes; the real transport fixture binds its own loopback server and held ACK. Offline checks do not claim a native slot.
2. `concurrent-commits.test.ts`, `clock-order.test.ts` / `clock-worker.mts`: actual receipts/positions, scope regularity, per-receipt record-time fast response and row fallback equality; UUID scope/process identity and owned fresh stack bind this attempt. Clock counts are reported rather than inferred from exit zero.
3. `layout-differential.test.ts`: deep full ordered equality and nonzero fast/closure denominators; seeded IDs/clock and newly created legacy/lean scopes; actual native source copied/indexed at startup. No prior artifact is read as a current observation.
4. `reach.test.ts`, route/read-pin/journal/adapter tests and `w0-reader.test.ts`: source-selected native response content, metadata and actual HTTP counts; fresh scope fixtures and exact basis; stack health/source hash records bind native runs. Unsupported q cases assert the typed rejection or explicitly skip the incompatible native-query-only scenario.
5. `mutants.sh`: requires startup health, fresh isolated copied gateway source, an actual content assertion failure and successful owned cleanup. A transport failure cannot count as mutant rejection.
6. `bench.mjs`: stores raw observations, exact RYOW/page content comparisons and request counts; fresh UUID output/scope, captured input/source/build hashes, measured stack IDs/CPU/configuration and current lock bind the attempt. Bars are assessed from actual distributions, not `passed:true` or process exit. Failed/partial runs retain their error.
7. `cleanup-measurement.py`: checks saved/current container identity, actual removal status, successful fresh empty inventories and exact lock owner before unlock. It is resource cleanup evidence only; it cannot declare semantic acceptance.
8. `hash-inventory.py`, evidence SHA256SUMS/index and this report: hash actual source/evidence bytes and retain old hashes from the recorded baseline; readback verifies manifests. `analyze-results.py` renders retained raw distributions with attempt head/stack/error labels; it does not emit acceptance. These establish binding/integrity, not semantic correctness or completeness.

## Scope, pins, cleanup and remaining work

Only `packages/datomic/**`, the two authorized benchmark edits, the optional core adapter members and `b5/**` are changed. No generated dist is committed, no dependency changes/downloads, no acceptance edits, no push/merge/deploy. Full old/new source hashes and acceptance-reference checks are in `HASH-CHANGES.json`; 31 changed source paths, with zero old hashes mentioned in acceptance. The inventory found no changed old hash or path referenced by acceptance pins.

Owned resource cleanup and final source/evidence sealing are pending the final gate/measurement stack. The default Docker context, shared residents, other agents' locks/containers and forbidden ports were not altered. This work does not qualify P5 at 100k subjects, scale at 10m entities/100m facts, or production acceptance. The inherited lab publication observer can still reject shifted ACK positions under concurrent public-driver use; fixing its validation is outside the owned files.
