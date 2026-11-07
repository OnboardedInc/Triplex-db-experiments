# Engine-first lane reconciliation, 4 November 2026

Project-only coordination checkpoint. Remote project text and current open PR metadata were read around 03:21–03:23 UTC. This pass did not import or execute DuckDB, run project/test code, acquire dependencies or inspect old databases.

## Goal7 normal clean persistence update, 05:10 UTC

A later genuinely independent goal7 gate now adds normal file-backed checkpoint/close/fresh-process clean read-only reopen. The writer's known initial exit 0, 17 checks, 67 acknowledged helpers, explicit CHECKPOINT/full-fetch and both closes were independently reviewed consistently with 618 assertions. The separate project-only reader completed known first terminal exit 0: 21 checks, 28 helpers, two complete 5/18-fact captures, both closes, 99 journal phases and unchanged source/shared/runtime inputs. Its separate retained-evidence audit completed consistently with 477 assertions. Complete histories/catalogs and selected float/timestamp carriers match; both selected DB byte/hash pins are unchanged and no WAL/other sidecars appeared. [Result and scope]([PRIVATE_REFERENCE_REMOVED]) · [independent reader review]([PRIVATE_REFERENCE_REMOVED]).

The original successful writer receipts included file-identity fields and remain unchanged/local. This new reader package contains only independently verified project-only derived captures and new reader evidence with relative bindings/byte-hash facts; no raw identities or computer-path observations were published. This was an internal package boundary, not an actual denial or a safety-stopped writer. No held material was stripped/repackaged or used.

This resolves only the selected normal clean-persistence prerequisite. Migration execution remains unselected because the complete earlier held migration scope cannot be verified without inspecting held material. Migration, WAL/crash/lost-ack recovery, rollback/retry/health semantics, contention, backup/restore, public-controller integration and full goal7 acceptance remain open. The original rollback DB and all other lane holds stay untouched. Current goal7 scope has no runtime invocation/session or approval pending.

## Current verification, 04:29 UTC

The [04:20 all-ten-goal audit]([PRIVATE_REFERENCE_REMOVED]) supersedes the current-status portions of the earlier sections below. The reusable real-engine method is now actually adopted by **goal7 and goal10**, not only goal10. No other lane's ownership or old uncertainty is cleared by this fact.

- **Goal7:** [corrected full-capture gate]([PRIVATE_REFERENCE_REMOVED]) has initial exit0, 22 checks, 74 acknowledged helpers, three complete captures and two close ACKs. The result/evidence/owner observation are remotely preserved. A separate [complete retained-evidence audit]([PRIVATE_REFERENCE_REMOVED]) completed consistently with 141 assertions, including exact types/full histories/raw rows/catalogs, all event/journal sequences and unchanged selected source/shared/runtime pins. It is not a second terminal observation. A distinct capped/uncapped diagnostic isolates an artificial virtual-address-cap-sensitive SET fault; it does not establish the original capture001 fault's exact stage or an allocator cause. Capture001 remains NONPASS139. No real migration or persistence/recovery gate has passed, and the old rollback database remains frozen.
- **Goal10:** the [actual host/storage differential]([PRIVATE_REFERENCE_REMOVED]) records 30,600 comparisons, 45 commands and 49 retained facts, with close and unchanged inputs. This pass is source-bound to wire v1. The later local wire-v2 12-edge-check pass is not a full regression; no smoke/differential rerun on v2 has occurred. Wire-v3 column metadata is source-only/unissued. The official Effect metadata request failed with EAI_AGAIN. Public Effect/StorageAdapter/QueryExecutor and full pinned conformance remain open.
- Both current owners report no runtime invocation/session or approval pending. That is coordinated owner-report visibility, not process inspection or a direct approval-queue audit. Earlier3.1/goal9 outcomes and predecessor ownership limits remain unresolved.

All old held/frozen/consumed subjects, timestamp acquisition boundaries and full-goal acceptance states remain unchanged. This documentation update performs no runtime, acquisition, Codex, snapshot, deletion, merge or deployment action.

## Later verified update, 03:51 UTC

The earlier goal10 pre-execution status below is historical. The active owner has now preserved a passing SQL-only Python connection regression and a separate corrected immutable-ledger schema/transaction gate: 20 checks, 67 acknowledged subject helpers, seven deliberate constraint controls and acknowledged close. [Exact source, result, independent receipt review and reusable recipe]([PRIVATE_REFERENCE_REMOVED]).

The [shared runtime guide](DUCKDB-RUNTIME-REUSE.md) now records the proven connect ordering and immutable-parent lesson. [Cross-goal applicability](REAL-ENGINE-METHOD-20261104.md) identifies where other lanes can reuse the method and the exact limits. Actual current adoption is confirmed only for goal10. No live continuation owner is verified for the other prior implementation lanes, and no new action was selected for them. Frozen timestamp acquisition, unresolved PR18/goal9 operations, goal6's unsupported interrupt API and all old subjects/databases remain unchanged. This update adds no full-goal, native-extension, TypeScript/Effect or persistence acceptance.

## Why the gap recurred

The published lane boundaries correctly distinguish synthetic tests from actual runtime behavior, but several lanes stopped at those boundaries without selecting an early engine action. In particular, PR22 says no admitted fresh binding/driver exists and PR24 says no fresh/current driver/extraction owner exists. The [shared runtime guide](DUCKDB-RUNTIME-REUSE.md) already identifies an exact existing immutable 69-file DuckDB closure and successful separately bounded native uses in PR19/20.

The supported inference is a coordination/selection gap: reusable input knowledge was not consistently carried into concrete driver/action planning across lanes. It is not evidence that every engine action is prohibited, that a new package must be installed, or that the prior independent results are false. A runtime candidate can be known while a particular action, driver/API or ownership lease is still unselected.

[Project working guidance](AGENTS.md) now makes an early real-engine slice the default for applicable implementation lanes. Fresh action and fresh installation are explicitly separated. Standalone components remain useful independent oracles, but do not replace the integrated deliverable.

## Current lane map

- **Independent 3.1, PR18:** head `983eaeb20cc93dac11d83b9042c339fc96d56971`. Actual LOAD, v2 callbacks, generated SQL, differentials and timings remain unrun in its current published scope. Earlier operation/initial terminal outcome remains unresolved; no live continuation owner is verified. Shared runtime knowledge does not clear that uncertainty or permit a duplicate action.
- **Independent 4.1, PR19:** head `878871fec9416e32d5509210092b2cfd7008dadb`. Bounded real native campaigns already passed. Public48 is source-only, hard-disabled, unselected and unrun. Its approved pytz acquisition ended prestart NONPASS and stays frozen. Do not retry acquisition, remove the timestamp dependency or substitute another path to complete that blocked profile.
- **Goal5, PR20:** head `3de749d706de5a421248195483ec22cd053972fb`. Bounded native/reference/planned conformance already has actual results. Public correction/receipt/clean-reopen coverage still needs exact public API, timestamp/dependency and same-path admission. Shared native success does not supply that missing public coverage or clear the separate frozen acquisition.
- **Goal6, PR23:** head `2a2dfc96fb78fb00126f33f15d38b3ac60ea6e4f`. Pure application-local authority/model work is complete within its stated synthetic scope. The concrete gap is a supported callback-safe host-interrupt predicate and actual native-loop/owner/publication/resource integration. Existing 2.0.0 availability does not manufacture that API. Select a supported route before claiming native cancellation; do not substitute more synthetic breadth for this integration decision.
- **Goal7, PR24:** head `b624a486306acb5bcc5c6aaee871b786a2af660a`. Supplied-history verifier is synthetic. An existing runtime candidate is available for evaluation, but the lane still needs a reviewed concrete extractor, consistent full capture, exact timestamp/typed-slot decoding, schema/catalog checks and fresh lifecycle subject. Previous rollback DB outcome stays unknown and frozen. Neither equal supplied histories nor a package upgrade establishes migration, rollback or durability.
- **Goal8, PR21:** head `5c7a5b8bcee029272d999b97bca2024838b7ccda`. Cache-mechanics tests are synthetic. Next select a genuine immutable compiler-provider adapter and actual cached-versus-fresh host results, with fresh facts/cuts/parameters and resource close. PR18's unresolved action is not a provider handoff and must not be attached or replayed.
- **Goal9:** latest published reconciliation reports its branch at zero ahead of main, with no matching PR; earlier publication's initial outcome remains unresolved. Reconcile that outcome before publishing duplicate work. This is not a DuckDB availability finding.
- **Goal10, PR22:** head `610194ac6d7eee0dd2df3f10a85560a72c9c5cd1`. Reference storage, typed values and recording-port SQL-owner foundations are useful but do not establish a real StorageAdapter. The existing runtime closure is the first candidate for a fresh exact-driver schema/transaction/typed-row slice. Ownership, exact input/action review and a concrete bridge still must be established. This integration investigation is active; no run or lease completion is claimed here. Pinned Triplex/Effect and full conformance are separate remaining gates.

All cited PRs remain draft and unmerged at the checked heads. Goals1–2 retain their prior bounded acceptance; no other goal becomes accepted by this documentation.

## Ownership reconciliation

The [22:20 checkpoint](research/roadmap/progress-check-20261103-2220.md) records goal6/7 scoped owners completed with no pending invocation. Goal7's own integration gate likewise declares no pending or uncertain invocation within that new lane. PR19/20 selected successful native subjects are terminal and consumed, not replayable reusable runs.

Current coordination has not verified an additional live runtime owner beyond the unresolved PR18 operation. This is a limit of available evidence, not proof that the old shared closure lease is released. Do not inspect processes or inventory the machine to fill the gap. A new action must obtain its own supported read-only ownership coordination while leaving package bytes immutable and old subjects/databases untouched.

## Required next checkpoint for each applicable lane

Record the concrete driver/runtime candidate and exact selected source, current owner/read-only input coordination, independent fresh subject/targets, action review, actual initial terminal outcome and complete results, then the next integrated acceptance dependency. If blocked, distinguish unselected action from unavailable API, frozen dependency, denied action and uncertain outcome. Keep unknowns unknown.

The shared runtime guide and this rule have been passed to the active goal10 integration investigation. No propagation to inactive or future lanes is claimed merely from saving these files; future continuations must receive/read the guidance explicitly.

Sources: current [open PRs]([PRIVATE_REFERENCE_REMOVED]); [PR18]([PRIVATE_REFERENCE_REMOVED]), [PR19]([PRIVATE_REFERENCE_REMOVED]), [PR20]([PRIVATE_REFERENCE_REMOVED]), [PR21]([PRIVATE_REFERENCE_REMOVED]), [PR22]([PRIVATE_REFERENCE_REMOVED]), [PR23]([PRIVATE_REFERENCE_REMOVED]), [PR24]([PRIVATE_REFERENCE_REMOVED]); the exact-head source and integration gates linked in those PRs. Source inspections and coordination reports are not new engine observations.

## Active goal10 coordination update, 03:25 UTC

The goal10 integration owner explicitly acknowledged the engine-first guidance and reports a coordinated fresh distinct read-only PR22 lease. Exact source/action review is still pending, so no execution or runtime result is claimed. The proposed driver subject uses no custom extension LOAD and touches no old database. PR18/PR9 uncertainties and the limits on current-image authentication remain unchanged. This confirms guidance reached the active lane; it is not automatic propagation to inactive lanes.
