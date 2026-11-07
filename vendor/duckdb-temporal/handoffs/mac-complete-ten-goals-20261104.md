# Complete the ten-goal DuckDB triple store on Contributor's Mac

**Current takeover entry point:** [5 November zero-context handoff](mac-zero-context-takeover-20261105.md).
This 4 November document preserves historical source/acceptance context; the
later handoff records the integrated Mac runtime, research and current vision.

Prepared 4 November 2026, from the living roadmap at sequence 132, published project research and fresh PR metadata reads at approximately 23:16–23:18 UTC. This is a project-only handoff, not a machine backup. Current observed main: `836c061e26ed23e45b1b8bd9bf2a71be5c7f572d`.

## Mission

Complete all ten roadmap items and build the strong, working DuckDB triple store Contributor described. Use the living ten-goal roadmap (private application reference omitted) as the acceptance guide. Deliver integrated code running against actual DuckDB, with correctness and honest full-path performance evidence, rather than treating reference models or source-only modules as the deliverable.

Contributor deliberately selected unstable DuckDB C API v2 for as much of the implementation as useful, accepting exact-host rebuilds and interface changes. The November 1 scope requires working performant code inside DuckDB; browser compatibility and a deployed web demonstration are not required. The November 4 clarification requires applicable lanes to build/test with real DuckDB early.

This handoff does not apply dot-cloud-only workflow skills or cloud-machine settings to Contributor's Mac. The parent supplies the authorized local task and model separately. Do not install or propagate cloud-only skills.

## Read first

1. This handoff and the [research/source index](research-index-20261104.md).
2. The [latest complete progress audit]([PRIVATE_REFERENCE_REMOVED] for exact held, unknown, failed and unrun boundaries.
3. The [project-data policy]([PRIVATE_REFERENCE_REMOVED]). Preserve source, contracts, synthetic cases and actual results only. Never collect or transmit computer snapshots, device/process identities, inventories, secrets or detailed computer paths.
4. The relevant source README, contract, test report and final source review at the exact branch heads below. Main alone does not contain the implementation branches.

## Current source map

All ten PRs below were freshly verified **open, draft and unmerged**, at these exact heads. A PR's historical description can be stale; use the head metadata and the exact source/evidence documents. No merge, deletion, force-push, deployment or acceptance is implied.

| PR | Scope | Branch | Exact head | Base |
| --- | --- | --- | --- | --- |
| [7]([PRIVATE_REFERENCE_REMOVED]) | Temporal Datalog research prototype: native DuckDB ABI kernel + bitemporal playground | `dot/temporal-datalog-prototype-20261030` | `a7ddd79021ce3f5a7030420ebc1003e855fccfde` | `main` |
| [8]([PRIVATE_REFERENCE_REMOVED]) | Native DuckDB temporal triple store v0.6: independent reviewed checkpoint | `dot/native-cloud-v06-independent-20261102-0056` | `0e8823973f5e1b886b7ef96e8dc5a899f467f241` | `main` |
| [9]([PRIVATE_REFERENCE_REMOVED]) | Triple-store direct continuation: semantic, vector and narrow cancellation checks | `dot/triple-store-direct-20261102-2330` | `dbb7d27a20430e09413f92259007961ad8e66ac3` | `dot/native-cloud-v06-independent-20261102-0056` |
| [18]([PRIVATE_REFERENCE_REMOVED]) | Build independent goal 3.1 SQL planner | `dot/goal31-independent-20261103` | `983eaeb20cc93dac11d83b9042c339fc96d56971` | `main` |
| [19]([PRIVATE_REFERENCE_REMOVED]) | Complete independent stratified negation for goal4.1 | `dot/negation41-persisted-relation-20261103` | `878871fec9416e32d5509210092b2cfd7008dadb` | `main` |
| [20]([PRIVATE_REFERENCE_REMOVED]) | Build goal5 aggregate conformance | `dot/goal5-temporal-composition-20261103-1211` | `3de749d706de5a421248195483ec22cd053972fb` | `main` |
| [21]([PRIVATE_REFERENCE_REMOVED]) | Build isolated goal8 template cache | `dot/goal8-template-cache-20261103` | `38d3723c08bed3ebd1e7b71da3fad2efa1b34c92` | `main` |
| [22]([PRIVATE_REFERENCE_REMOVED]) | Build Triplex adapter foundations | `dot/goal10-value-boundary-20261103` | `d3143ce170916d10c21bed36d542bd54ab2d10ff` | `main` |
| [23]([PRIVATE_REFERENCE_REMOVED]) | Build invocation cancellation authority | `dot/goal6-control-protocol-20261103` | `7bf95500fb457debe0dfea18d6d09252b927fe4d` | `main` |
| [24]([PRIVATE_REFERENCE_REMOVED]) | Verify goal7 history preservation | `dot/goal7-history-equivalence-20261103` | `a63ae47a2e88861ce9f8d01f265f86b102ab1db6` | `main` |

PR9 is stacked on PR8. Do not merge every branch mechanically: source packages overlap, some original work is held, and independent prototypes have different languages/contracts. Preserve unrelated local edits and each meaningful source checkpoint. Follow the local task's authorized source-control workflow; do not delete old branches or PRs.

Goal9's known branch `dot/goal9-history-timeline-20261103` remains recorded at `e2c6c8f4ba422ebc998bc11ce32cf1c9f9d2f52e`; an exact-head-branch all-state PR search is empty. That is not proof its earlier publishing operation terminated or failed.

## Architecture to retain and integrate

- **Bitemporal set semantics:** EAV assertions retain independent valid and recorded intervals, both half-open [from,to). A point read uses one coherent valid/knowledge cut. Command identity, receipts and committed positions are separate from wall-clock timestamp order.
- **Typed kernel:** string, boolean, signed int64 and finite binary64 are disjoint tags. Carry tags through literals, interning, equality/order/hash, SQL storage, parameters and output. No silent numeric coercion or JavaScript rounding. Unsupported type families must fail explicitly.
- **Bounded typed expressions:** body comparisons and checked arithmetic operate on already-bound inputs, with explicit incompatible-type, overflow and division faults. False filters must not hide faults. No unrestricted functions or recursively generated value domain.
- **SQL first, native where justified:** push snapshot selection, ordinary acyclic joins and eligible completed-stratum operations into parameterized DuckDB SQL. Use a correct bounded native fallback for unsupported recursion; expose the chosen route/materialization/fallback reason. Prevent catalog shadowing and reject extra attachments, including HIDDEN, rather than assuming a filtered catalog listing is authoritative.
- **Negation and aggregates:** signed dependencies, completed lower strata and one shared cut. Reject negative/aggregate cycles and unsafe variables. Aggregate contribution identity is the complete set tuple, not an accidentally projected bag; empty groups, checked sum and output types are contractual.
- **Reuse:** cache owned immutable unbound compiler templates using complete program/raw-goal bytes and fixed compiler/language/codec/profile identity. Never let an artifact silently cache facts, cuts, admission, live database handles or result state. Invocation-local dictionary IDs and tentative positions are not shared committed identities.
- **Recovery:** compare complete histories, command/clock/receipt state and strict typed carriers, not only visible EAV sets. Retry whole commands only after confirmed rollback. Normal close/reopen does not prove crash/WAL/lost-ack safety.
- **Goal10 transaction bridge:** preserve the acknowledged Node→DuckDB transaction protocol, strict wire-v3 type boundary and actual commit/rollback acknowledgments. The corrected schema uses immutable command headers plus a separate leaf completion ledger; updating the referenced header triggered a concrete DuckDB foreign-key limitation.
- **Cancellation ownership:** cancellation request, delivery retirement, actual execution termination, transaction outcome and healthy reuse are distinct states. Logical budget accounting is not physical memory containment or observed cancellation latency.

The exact dependency research is part of the project. Do not copy the cloud's installed runtime, binary artifacts or environment. Establish an appropriate real DuckDB runtime on the Mac through the local task's permitted tools, use official sources, and verify the supported version/API/architecture. A new platform requires new build/runtime evidence.

## Ten-goal acceptance and next work

### 1. Typed values end to end

**Accepted bounded prototype scope.** Four distinct scalar tags, exact integers, SQL carrier and typed persistence/migration fixtures exist. Preserve this behavior during integration.

Evidence: [typed native implementation]([PRIVATE_REFERENCE_REMOVED]); [final acceptance of goals1–2]([PRIVATE_REFERENCE_REMOVED]). Earlier typed checkpoint passed 57 typed native integration tests, 29 independent SQL/native cases and 22 legacy cases on its declared host. This is not Mac compatibility evidence. Reference/date/timestamp/null values remain outside the accepted four-tag contract.

**Completion guide:** preserve type distinctions and round trips in the integrated Mac build; do not silently widen the accepted type set.

### 2. Typed comparisons and bounded scalar expressions

**Accepted bounded prototype scope.** Comparisons, parentheses, checked +/−/×/÷ and unary minus, already-bound variables, no coercion/computed heads/assignment.

Evidence: [accepted implementation/limits]([PRIVATE_REFERENCE_REMOVED]); [final codec acceptance]([PRIVATE_REFERENCE_REMOVED]). Normal evidence includes 262 SQL/native cases with recovery and separate native/browser/FP checks; categories overlap. The original large Python-binding sanitizer case remains incomplete after SIGKILL, not retroactively passed.

**Completion guide:** regression-test the declared expressions/faults through the final supported SQL/native paths on the Mac.

### 3. SQL-first planning, using independent 3.1

**Not accepted.** Original goal3 is held/incomplete, including a recorded catalog-shadow rejection failure. PR18 preserves an independent typed acyclic planner, v2 binding source, strict builds, 17 unittest groups and 7,203 parser/IR/model identities across 23 programs. These are not 7,203 real SQL runs.

[PR18 verification]([PRIVATE_REFERENCE_REMOVED]); [acceptance design]([PRIVATE_REFERENCE_REMOVED]).

**Next:** reconcile its unresolved predecessor operation; establish the new permitted real build/LOAD/v2 callback path; execute generated SQL, complete oracle differentials and fair end-to-end timings. Preserve correct fallback and attachment/catalog authority. Do not retry held original goal3.

### 4. Safe stratified negation, using independent 4.1

**Strong bounded native evidence, whole goal incomplete.** PR19 preserves relational (149 fixtures/562 native submissions), scalar/filter (158/400), legacy/API regression (161 cases/296 submissions) and a separate 36-call synthetic persisted-relation gate. These are distinct finite scopes, not one additive certification score.

[Current goal/evidence map]([PRIVATE_REFERENCE_REMOVED]).

**Next:** finish genuine public-store integration and final acceptance. Public48 is SOURCE_ONLY / UNSELECTED / BLOCKED / UNRUN. Its original TIMESTAMPTZ/resource/API/dependency admission remains unresolved; the stopped timestamp acquisition cannot be replaced or retried as a workaround. Original goal4 and dependent syntax/save holds remain.

### 5. Grouped aggregates over completed strata

**Independent component complete; full goal not accepted.** PR20 records 113 identities in two orders/226 complete records: 150 real SQL-selected reads, 72 native fallback attempts and four compiler errors, checked against 222 independent raw-input SQL statements. Earlier additional native aggregate gates are separately recorded.

[Conformance execution]([PRIVATE_REFERENCE_REMOVED]); [remaining-work decision]([PRIVATE_REFERENCE_REMOVED]).

**Next:** genuine public command/correction/receipt/cut/error-health integration and a reviewed same-database clean reopen. The 1,210 public query attempts/570 records are expectations, UNRUN. The current continuation decision selects no independent unfinished component slice: another SQL-only consumer does not complete public acceptance. Preserve the frozen timestamp/dependency/path boundary.

### 6. Cancellation and full resource accounting

**Synthetic foundation and official-source research, not native acceptance.** PR23 contains 28 component methods, eight extension methods and all 5,040 bounded seven-event model orders in separate completed invocations.

[Current goal]([PRIVATE_REFERENCE_REMOVED]); [public C API findings]([PRIVATE_REFERENCE_REMOVED]); [matched-version C++ route]([PRIVATE_REFERENCE_REMOVED]).

**Next:** actual matched-engine implementation/validation of callback-safe interrupt/deadline polling and native loop integration. V2 supplies current callback context but inspected public C headers/vtables expose no interruption/deadline poll. The concrete internal C++ ExpressionState::GetContext().InterruptCheck() route is version-coupled, unbuilt/unrun. Add upstream list admission, full byte/owner coverage, actual publication/transaction/cleanup acknowledgments, resource containment and measured request-to-terminal latency.

### 7. Transaction recovery and schema evolution

**Bounded capture and normal clean persistence passed; recovery/evolution not accepted.** PR24 preserves a 22-check real database extractor, a 17-check clean writer, and a separate 21-check fresh-process read-only reader. Separate writer/reader retained-receipt reviews completed with 618/477 assertions, not second engine runs.

[Current reader scope/evidence]([PRIVATE_REFERENCE_REMOVED]).

**Next:** independent permitted recovery work: contention, atomic command/position/receipt invariants, fault timing, confirmed rollback and whole-command retry, lost acknowledgment, WAL-only restart, backup/restore and actual versioned migrations. The schemas so far were independently initialized, not migrated. Migration remains unselected at an earlier held-scope boundary; do not inspect/reopen held databases or material. A tight RLIMIT_AS is not DuckDB's buffer-memory cap and caused a separate controlled profile failure.

### 8. Snapshot-safe reuse and incremental maintenance

**Template-cache component and retained genuine-CQ gate passed locally; full goal not accepted.** PR21's remote head remains its pre-run source/action checkpoint. Cache mechanics: 27 methods normal/-O, 2,000 exact-LRU comparisons, 10,000 varied-budget operations and 11 distinguishing refined mutations. A later retained genuine temporal-eav-cq/1 gate records terminal exit0, 648 checks, 65 cases, 93 compiled SELECTs, three closed connections and complete fresh/cached/oracle matches; separate retained-file review completed.

[Cache contract]([PRIVATE_REFERENCE_REMOVED]); [selected CQ action]([PRIVATE_REFERENCE_REMOVED]); latest audit above for retained local result/review identities.

**Critical unresolved state:** remote result/review preservation and the owner's current operation/pending call/approval/publication outcome are unknown. Do not duplicate its run or publication. Obtain the actual reconciliation through the existing owner. No local result files are bundled here.

**Next after reconciliation:** integrate the selected compiler with fresh facts/cuts/parameters/admission, complete broader error/order/resource tests and fair timing. Prepared-plan/shared snapshot/index reuse and incremental maintenance remain open. Initially recompute on corrections/retractions until deletion-support tracking is correct.

### 9. Explicit history and interval query results

**No completed public API/test/publication verified.** Earlier independent private keyed Boolean-coverage contract and 34 hand controls are preserved in PR8, source-only.

[Independent interval research]([PRIVATE_REFERENCE_REMOVED]); [selected contract]([PRIVATE_REFERENCE_REMOVED]).

**Next:** reconcile the earlier uncertain publication before duplicate/dependent work. Build a separate API returning assertion identity, valid/recorded intervals and correction provenance at a pinned knowledge cut; specify intersection/coalescing without bridging gaps. Prove equivalence to point reads at every relevant endpoint, including boundary, overlap, correction and retraction cases.

### 10. Pinned Triplex adapter with honest conformance

**Real Node→DuckDB primitives work; Effect/public adapter remains source-only.** PR22's actual runtime scope is pinned to `a397e0204468ac51a61a30a54e1cb5dce4f66900`: 22 checks/30,600 complete wire-v3 differential comparisons and a separate 18-check public primitive gate with exact 360-row/20-column readback. Later `d3143ce1` adds QueryExecutor/result-boundary source only.

[Runtime bridge/results]([PRIVATE_REFERENCE_REMOVED]); [latest QueryExecutor review]([PRIVATE_REFERENCE_REMOVED]); [pinned Triplex contract](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/docs/custom-runtimes.md).

**Next:** supported dependency/build access for exact Triplex `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`, Effect 4.0.3 and the declared ulidx/build closure; semantic typecheck; real imports; StorageAdapter/Effect/QueryExecutor/lifecycle/SQL-strategy execution; all 44 unmodified runtimeConformance cases plus capability, cursor, type, timestamp-tie, restart, interruption and migration tests. Capabilities.none still runs all44 cases. Prior npm DNS failure and executor-prestart failure are separate unresolved events, not installation evidence. Do not route around a stopped acquisition.

## How to drive the local continuation

1. Preserve existing local user work. Establish the source and branch plan from the exact checkpoints, without adopting held material or assuming a missing worker released ownership.
2. Read the relevant current contracts. Make a compact ten-goal ledger with actual PASS / FAIL / UNRUN / BLOCKED state, current integrated source and evidence links.
3. Establish a real DuckDB build/driver early and run a smallest supported end-to-end typed query before growing new layers. Use references to challenge the engine, not replace it. The cloud-specific runtime closure is not a Mac binary or a transferable environment.
4. Resolve goal3.1/8/9 owner-operation uncertainties through supported coordination before duplicate work. Ask the parent for missing evidence. Fresh local scope is not permission to reconstruct a denied pipeline.
5. Integrate and close goals in a dependency-aware sequence, continuously regression-testing accepted1–2, parameterized SQL/native differentials, temporal corrections/receipts and explicit capability/error behavior.
6. Commit coherent source/checkpoint increments to a dedicated work branch and keep the draft PR current within the local task's authorization. Keep actual source, bounded results and full test commands available; never replace them with narrative.
7. Run fair full-path benchmarks on final correct integrated candidates: charge setup, cuts, materialization and result consumption equally. Existing historical medians show deep recursion can win while scans/joins lose; no universal speedup has been established.
8. Continue until all ten declared scopes have their actual acceptance evidence or a specific permission/input blocker genuinely prevents progress. Report meaningful milestones and blockers promptly. Never promote a source parse, metadata read or empty CI list to a runtime pass.

## Known unavailable or unresolved materials

- Goal8's completed full result/review packet is retained locally but not remotely verified, and its current publication operation is unresolved.
- Goal9's later continuation source/results/publication cannot be verified from the current branch/PR state.
- Original/PR18 owner and pending-operation states are not proven by historical idle statements.
- No canceled backup, held save/dependent action, frozen runner/database or computer-environment snapshot is included or to be reconstructed.
- Existing successful scoped runs are historical evidence. Do not replay consumed subjects blindly or erase their first failed/uncertain outcomes.

This handoff adds no acceptance, execution, acquisition, snapshot, merge or deployment. It consolidates verified project knowledge and explicitly preserves what is not known.
