# ITEM6 proposed source acceptance obligations

**Research proposal only. No implementation or empirical admission.** These are project-level requirements inferred from the separately cited source/literature findings in `10-RESEARCH.md`, not declarations of an installed engine's behavior. All candidate acceptance checks remain UNRUN.

## 1. Evidence dimensions, not one cancelled Boolean

A future bounded operation needs at least these independently evidenced dimensions. Names below are descriptive specification labels, not a new engine ABI or logging implementation.

| Dimension | Necessary distinctions |
|---|---|
|Admission/submission|Not submitted; admitted but not submitted; submitted/in-flight; unknown whether submitted.|
|Cancel request|Not requested; requested for this logical query epoch; acknowledged by the owner; stale/unknown target.|
|Query terminal outcome|Complete success; complete failure; terminal cancellation; still in-flight; unknown.|
|Transaction outcome|None/read-only; active; rollback acknowledged; commit acknowledged; invalidated/unknown.|
|Public result|None; exactly one complete accepted result; delivery/publication unknown. A private prefix is not a public success.|
|Health|Reusable under a stated policy; explicitly restart/recovery-required; unknown.|

A known outer/process exit is not a database transaction outcome. A cancellation setter's return is not the query's terminal response. A query error need not mean the enclosing transaction has rolled back. A transaction rollback does not retract bytes already delivered to an ordinary consumer. No missing field may be synthesized as zero work, no rows, healthy reuse, or successful cancellation.

### Minimum top-level distinctions

- **IN_FLIGHT / UNKNOWN:** no trustworthy terminal query/recovery/publication acknowledgment. Do not reuse the uncertain connection or replay the operation merely to obtain a nicer receipt.
- **CANCELLED:** terminal query cancellation is known, with transaction disposition and result withholding separately known. Do not call cancellation fully recovered if those latter facts are missing.
- **COMPLETE_FAILURE:** an ordinary complete failure is known; no partial success was published. Recovery policy may still mark restart-required. An expected failure is not a cancellation acknowledgment.
- **COMPLETE_SUCCESS:** ordinary complete query/result agreement is known, the permitted transaction disposition is acknowledged, and the entire result is accepted exactly once. A late cancel request cannot retroactively relabel a committed operation cancelled.

“Restart-required” is an explicit quarantine state in this specification, not authorization to perform a restart/recovery action now. Unknown health cannot be upgraded to reusable by omission.

## 2. Source obligations before any implementation could be accepted

**A1 — exact binding and policy.** Name the selected public engine pin/API and application transaction policy. State one persistent-store scope, explicit versus autocommit semantics, result retention mode, and whether the adapter owns the entire transaction. Do not infer default policy from another release, a header alone or a connection that happens to answer. External catalogs/UDF side effects/files/network publication are excluded unless independently specified.

**A2 — cancel ownership and epochs.** The cancel request must belong to one logical query epoch, not merely a reusable connection. Show that no outstanding stale cancel caller can affect the next query. An epoch is a project identifier, not a PID/thread/environment inventory. Once submission or terminal state is unknown, forbid automatic replay/rebinding as a recovery shortcut.

**A3 — a terminal acknowledgment path.** Identify the exact source transition that establishes execution stopped, outstanding work no longer publishes, and the result owner completed/closed. Flag setting, pending task progress, cursor destruction, internal enum assignment and a timeout alone do not meet this obligation. Missing body evidence remains an explicit gap, not a hypothetical pass.

**A4 — transaction disposition.** Distinguish autocommit's individual statement from an explicit multi-statement transaction and any expanded statement. Specify what must survive and what must be undone. Require acknowledged rollback/commit, preserve earlier independent commits, and do not confuse a COMMIT request with a committed outcome when invalidation can change its effect. Rollback errors and database invalidation must remain visible as non-reusable state.

**A5 — atomic public result.** Keep candidate rows private until all accepted completion/type/size/transaction conditions hold. The public operation is one complete result or no success, not a prefix followed by an error. If a future streaming interface is chosen, its tentative-chunk/commit/abort consumer semantics must be explicit; ordinary already-delivered rows cannot be “unpublished” by a later rollback. No such streaming protocol is implemented here.

**A6 — pre-materialization admission.** Validate finite input shape and sound mathematically defined cardinality/logical-byte upper bounds before the allocation/expansion they govern. A post-hoc row cap or optimizer estimate is not pre-admission proof. A checked source bound must cover input retention, candidate/delta materialization and result staging separately; reject an oversized claim before constructing it. Where a tight bound cannot be certified, use a conservative bound or leave admission unresolved rather than trust an estimate.

**A7 — logical accounting units.** Define work units (e.g. application candidate pairs or admitted frontier-edge expansions) and logical byte charges before code exists. Separate reserved, admitted, attempted, completed, rolled-back and published quantities. Logical bytes/work are not engine allocations, RSS, I/O, CPU cycles, elapsed time or a native counter campaign. Parallel/cancelled prefixes must not double-charge completion or zero out already consumed logical work.

**A8 — cooperative checkpoint map.** For each accepted operation, identify actual check sites and a finite logical upper bound on work between them. Cover join build/finalize/probe/skew/empty-output loops, spill or blocking phases if admitted, recursive source/frontier/inner-edge expansion, copying/materialization, and publication. Checking only outside an opaque engine call or at an unbounded frontier boundary is insufficient. Library/helper coverage must be source-established, not inferred from one flag-check function. Missing executor/recursive bodies currently prevent closing this map.

**A9 — deadline semantics.** Define equality/expiry precedence and the relation between application and engine deadlines. “Every 256 check calls” is a call-frequency rule, not a 256-row, bounded-work or wall-time theorem. A cooperative logical bound needs a bound on work inside each unchecked region; OS stalls or opaque calls preclude a universal elapsed-time guarantee. Preserve unknown on a failed acknowledgment rather than fabricate terminal cancellation.

**A10 — commit/publication races.** Declare the linearization/irreversibility boundary. If cancellation wins before commit/publication, the cancelled result must not appear. If commit wins, a late cancellation cannot justify “rolled back.” If the commit response is lost, represent uncertainty and prohibit blind replay. Query success, committed state and delivered result can differ; report each rather than force every race into one Boolean.

**A11 — recovery and reuse.** Reusable means the owned result/work is terminal, transaction policy has settled, no stale interrupt can target the next query, and store invariants are preserved. A future independently authorized sentinel observation may help falsify those claims; a single generic ping cannot prove them all. No health query/probe is performed or requested now. Cleanup exception, uncertain ownership or unknown transaction state requires quarantine and explicit restart/recovery-required policy, not speculative continued use.

**A12 — evidence and failure privacy.** Use finite project outcomes and exact bounded evidence. Ordinary failure, terminal cancellation and interrupt/transport/source failures must not be merged. Unknown counters remain unknown. Do not return raw exception text, partial rows or machine details as an oracle. Collection, binding, result-format and transaction errors stay nonpassing, with no resampling/fallback path. All implementation/control/publication requests remain separate.

## 3. Why earlier tests/scopes cannot establish ITEM6

This is a scope comparison from already provided project descriptions; no stopped/paused packet was reopened.

| Existing evidence type | What it cannot establish |
|---|---|
|Graph14 hand classifications and typed post-call value checks|No database query execution, interrupt acknowledgment, transaction rollback, connection epoch safety or store recovery is covered by the abstract graph API cases.|
|Graph14 source/transport/collector framing review|Exact bytes/counts, EOF or a child exit concern result transport; they do not prove SQL cancellation or recovery semantics. The admitted outer nonpass leaves selected activity/cleanup unknown, not zero.|
|Semantic8 hand projection/unit/binding source review|Pure result projection equality, including no rows in a mathematical failure, is not evidence that a real database emitted no prefix or recovered a transaction. Its source-only closure is not runtime acceptance.|
|Consumed native compile nonpass and benchmark-source analysis|No successful build/pilot/performance result or DB cancellation/reuse observation follows. STOP remains unchanged.|
|A process timeout/nonzero exit, an interrupt setter returning, or a closed cursor|None individually establishes a known transaction outcome, worker quiescence, no published prefix or healthy store.|
|A row-presence, differential-result or repeated-success oracle|Can miss wrong cardinality, correlated wrong results, stale cancel races, dirty/aborted state and missing terminal acknowledgment; it is not a recovery/history oracle.|
|A final table snapshot with expected counts|May conceal duplicate application, a cancelled operation that committed, an earlier commit incorrectly rolled back, or already leaked public rows. Unique values and outcome/order evidence are needed.|

No earlier PASS is broadened and no earlier UNKNOWN is relabeled. These are research acceptance obligations for ITEM6 only. Independent review must resolve requirements, source gaps and inter-lane consistency before any code task is selected.
