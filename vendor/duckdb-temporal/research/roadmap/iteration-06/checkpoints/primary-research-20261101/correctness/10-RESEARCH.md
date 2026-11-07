# ITEM6 — cancellation, terminal acknowledgment and recovery correctness

2026-11-01 UTC · **NEW PUBLIC-PRIMARY / THEORY / SOURCE-ONLY RESEARCH. ALL EMPIRICAL CHECKS UNRUN.**

## Result first

A credible ITEM6 contract must keep **cancellation request, query termination, transaction outcome, result publication and connection/store recovery separate**. Returning from an interrupt API, seeing a timeout, receiving a nonpassing frame, or destroying a result cannot alone establish all of them. A request with no terminal acknowledgment remains unknown/in-flight; it must not become “cancelled and healthy” or a zero-work success.

The exact public DuckDB pin supplies concrete reasons for these distinctions. Primary concurrency/oracle literature explains why missing responses and incomplete observations must stay indeterminate. This lane proposes source acceptance obligations and tiny hand specifications; it does not implement a runner, choose a current runtime, establish a bounded engine cancellation latency, or authorize an action. Root must integrate all heavy lanes and independent review before implementation.

## Evidence: exact public pin, not installed observations

All DuckDB source URLs below use **d54cbbe3df17e8e5ce68312f483b4155836112aa**. This is the selected source identity, not a claim about a loaded library. Focused source sections were read through public web tools. No source was imported, parsed, compiled, executed, downloaded into a code workspace or compared against stopped material. No computed full-source content hash or tree-membership proof is claimed; immutable URLs and read sections are recorded in `40-SOURCE-LEDGER.md`.

### D1. Interrupt/transaction code — narrowly stated source facts

The client-context implementation sets an interrupt flag; separate checks throw later. Deadline polling is throttled to every 256 qualifying check calls, while the blocking check evaluates its deadline each call; neither counts elapsed work between calls. Error invalidation and automatic rollback are policy-sensitive. A wrapper that starts its own transaction rolls it back on error, whereas an already active transaction may instead be invalidated. An invalidated COMMIT is converted to rollback; a successful commit suppresses subsequent ordinary interrupts. The context-destruction routine catches rollback exceptions. Expanded multi-statement effects can require ending the transaction to undo them. These are source-path facts, not universal recovery guarantees. [Pinned implementation, sections 203–237, 403–418, 812–906, 1014–1061, 1092–1205](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp).

**Project inference:** terminal cancellation cannot be inferred from the flag setter, and a late cancel cannot be assumed to undo an irreversible commit. A normal-looking transaction command must be interpreted with its transaction state/policy; a destructor is not a rollback-success acknowledgment. This is not a source bug finding or a proposal to remove guards.

### D2. Query handle lifetime is a distinct boundary

The header distinguishes a blocking retained-result query from nonblocking submission returning a handle. Submission does not produce data until a materializing operation or result stream is chosen. It also distinguishes open-result connection ownership, abandonment and completion. These declarations do not themselves prove implementation-level drain/cleanup, nor do they grant a caller a no-partial-publication guarantee. [Pinned header, sections 140–183, 278–301, 315–327](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb/main/client_context.hpp).

**Project inference:** releasing the execution handle, completing a query and committing an externally consumable result need separate source evidence. A generic “next query worked” observation would not establish that the intended transaction footprint, all outstanding cancel callers and store recovery are correct.

### D3. Recovery can itself fail

The meta-transaction rollback path accumulates errors, skips invalidated databases and can throw after processing transaction state. A rollback-state enum is assigned even after a caught rollback exception. Persistent writes to more than one attached database are restricted, with system/temporary exceptions. An internal state label alone is not a successful undo acknowledgment, and this source should not be generalized into external-system atomicity. [Pinned meta-transaction implementation, sections 152–178 and 239–263](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/meta_transaction.cpp).

**Project inference:** cleanup failure/unknown must quarantine the connection/store and explicitly require restart or separate recovery, rather than assert healthy reuse. This is a proposed state contract, **not a request to restart anything**.

### D4. Join phase boundaries need an actual checkpoint proof

The hash-join source exposes build, probe and scan phases, and an internal loop can continue until tuples appear or the operator is finished. The inspected file has no literal InterruptCheck call; that is not proof cancellation is absent, since checks can be delegated. It also does not prove a bound on the unchecked delegated region. [Pinned hash-join implementation, sections 2099–2114 and 2445–2580](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/operator/join/physical_hash_join.cpp).

**Project inference:** an adapter checking only before and after an opaque join/recursive operation has not established cooperative responsiveness during build, collision expansion, spill, probe, synchronization, frontier expansion, or final materialization. The missing executor/recursive/result implementation reads prevent a complete pin-specific checkpoint audit here. No current engine latency claim follows.

### D5. Public SQL documentation is contextual, not a pin bridge

The fetched transaction documentation redirected to the public **2.0** page. It describes transaction visibility and abort discarding changes. That is useful conceptual context; it is not evidence of the selected pin's default invalidation/auto-rollback settings or the behavior of any installed API. [DuckDB transaction documentation](https://duckdb.org/docs/2.0/sql/statements/transactions).

## Primary literature: what it does and does not justify

### L1. Pending responses are not failed operations

Herlihy and Wing define histories using invocations/responses; pending invocations can have taken effect even without a response. Their distinction between linearizability and transactional serializability also warns against treating per-object checks as a transaction-wide proof. This is a correctness framework, not an elapsed-time or implementation-progress guarantee. [Herlihy & Wing, *Linearizability*, 1990, §§2.1–2.2 and 3.3](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf).

**Project inference:** lost completion, cancel/commit races and stale cancellation must remain explicitly represented; an unacknowledged operation cannot simply be erased as “did not run.”

### L2. Strong oracles need informative histories

Elle reasons from observations compatible with potentially multiple histories, including indeterminate transactions. Its strongest inferences depend on traceable data and uniquely attributable writes; its stated analysis does not cover predicates universally. Such a checker can expose a counterexample under its model, not prove every recovery/liveness property. [Kingsbury & Alvaro, *Elle*, PVLDB 14(3), §§2–3 and limitations](https://www.vldb.org/pvldb/vol14/p268-alvaro.pdf).

**Project inference:** unique hand sentinel writes, explicit terminal outcomes and observer-visible committed state distinguish rollback/commit errors better than equal final counts. Unknown observations must not be filled with convenient zeros or assumed aborts.

### L3. A result oracle is not a recovery oracle

Pivoted Query Synthesis uses an oracle requiring inclusion of a chosen pivot row but explicitly only partially validates results; the paper excludes general transaction/concurrency correctness and cannot establish exact result cardinality/order. Its benefit is a restricted independent witness, not a complete certificate. [Rigger & Su, *PQS*, OSDI 2020, introduction and limitations](https://www.usenix.org/system/files/osdi20-rigger.pdf).

**Project inference:** differential agreement, a pivot row, a correct aggregate or a small semantic projection can coexist with partial delivery, stale cancellation, leaked transactional state or wrong cleanup. ITEM6 needs separate state/history oracles.

### L4. Scheduling granularity matters

Morsel-driven parallelism checks a query-cancellation marker at morsel boundaries and permits workers to clean up cooperatively. Its scheduling design does not supply a worst-case wall-time bound for arbitrary morsel work. [Leis et al., SIGMOD 2014, §3.2](https://ir.cwi.nl/pub/22547/22547B.pdf).

Recursive-query literature distinguishes source-level and frontier-level morsels, with inner neighbor expansion and later consumers as separate work. A frontier or source is not a universal constant-work unit. The paper is about its specified graph systems, not proof of DuckDB's pinned recursive implementation. [Chakraborty & Salihoğlu, PVLDB 2025 / arXiv v1, §§2–3](https://arxiv.org/pdf/2508.19379).

**Project inference:** state a logical bound on the work between actual checks, not merely “one round” or “one vector.” High fanout, skewed joins and empty-output scanning need dedicated obligations.

## Research conclusion and limits

`20-ACCEPTANCE-OBLIGATIONS.md` separates admission, request, terminal, transaction, publication and health evidence and lists source obligations; `30-HAND-FIXTURE-SPECS.md` supplies new tiny mathematical examples, not generators/feeds/execution recipes. The obligations are proposed project requirements, not claims that DuckDB already meets them or authority to add code.

Thirteen selected pinned-file reads were unavailable with public-tool cache misses; one new ARIES full-paper read timed out. They were not retried through trees, other versions, mirrors, installed headers or alternate transports. The original ARIES publisher metadata was readable but does not substitute for the unavailable full text; no ARIES implementation claim is used. Exact URLs and gaps are recorded. In particular, full terminal cleanup, default transaction policy, C API binding and every large-join/recursive checkpoint remain open pin-specific verification work.

Every empirical check is **UNRUN**. There is no installed-version/connection/store-health observation, cancellation event, recovery run, source implementation, benchmark, resource measurement, diagnostic collection or external mutation in this lane. Current graph/native nonpasses and old/paused scopes remain unchanged and supply no ITEM6 acceptance evidence. Independent review and coordination with the other heavy lanes remain necessary before implementation.
