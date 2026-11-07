# Goal 6 cancellation and resource accounting research

This is a **preliminary source and theory checkpoint**, not an implemented feature or acceptance of goal 6. Three heavy primary-research lanes, their independent reviews, an additive API citation/precision erratum and the independent cross-lane synthesis review are preserved. All goal 6 empirical checks remain **UNRUN**.

The selected software source is actual unstable DuckDB C APIv2 at `d54cbbe3df17e8e5ce68312f483b4155836112aa`, declaring v2.0.0. That is a project source identity, not an installed-computer observation or a promise of future ABI stability. Older goals 3, 4, 4.1 and 5 remain incomplete; the earlier bounded acceptance of 1–2 is not broadened.

## Read first

- [Cross-lane synthesis](RESEARCH-SYNTHESIS.md) and [independent synthesis review](review/SYNTHESIS-REVIEW.md).
- [Exact pinned API boundaries](api/REPORT.md), [sources and limits](api/SOURCES-AND-LIMITS.md), [additive erratum](api/ERRATA.md) and [its provenance](api/ERRATA-PROVENANCE.md).
- [Resource and algorithm theory](resource-theory/RESEARCH.md), [conditional bounds](resource-theory/DERIVED-BOUNDS.md), [primary sources](resource-theory/PRIMARY-SOURCES.md), [open choices](resource-theory/OPEN-QUESTIONS.md) and [read gaps](resource-theory/PUBLIC-READ-GAPS.md).
- [Cancellation/recovery theory](correctness/10-RESEARCH.md), [12 proposed obligations](correctness/20-ACCEPTANCE-OBLIGATIONS.md), [12 hand-only specifications](correctness/30-HAND-FIXTURE-SPECS.md) and [source ledger](correctness/40-SOURCE-LEDGER.md).

Independent reports cover [API source evidence](review/API-REVIEW.md), [its evidence/limits](review/API-EVIDENCE.md), [the erratum delta](review/API-ERRATUM-DELTA.md), [resource theory](review/RESOURCE-REVIEW.md) and [correctness theory](review/CORRECTNESS-REVIEW.md). These close research-claim scopes, not code, runtime or production guarantees.

## Main conclusions

1. Callback-local reservation can govern subsequent extension-owned copies and data structures; it cannot retroactively admit already constructed SQL LIST/vector/constant arguments. The upstream construction boundary remains unproved.
2. Final join size, novel facts and live bytes do not bound all intermediate or rejected-candidate work. Logical reservations must cover simultaneous old, new and scratch owners before construction; they are not allocator/RSS or total-capacity measurements.
3. Interrupt request, query termination, transaction acknowledgment, public result and health require separate evidence. An outstanding canceller for an earlier query must not target a later query on a reused connection.
4. The inspected callbacks execute synchronously. A direct local poll is unverified on the searched public surface, not globally proved absent. The deadline throttle is persistent thread-local eligible-check state, not a per-query work/time quantum or latency guarantee.
5. Borrowed scan/vector/arena lifetimes, flattening, copying and retained capacity need explicit ownership charges. Cancelling a result cannot retract ordinary chunks already observed by a consumer.
6. A final poll does not resolve later commit/publication races. A cancelled/error status, destructor or rollback-state label alone does not prove reusable connection/store state.

## How to read the frozen qualifications

The original reports retain their historical pending-review wording. Read them with their later peer/delta records. Both API research precision findings are closed by the additive erratum; no upstream API repair or runtime behavior was demonstrated. The initial API peer's incomplete independent public-source-content rehash qualification survives.

The synthesis carries the resource peer's nonblocking corrections: a supplementary Unicode scalar may use two surrogate escapes (12 bytes; the conditional 6B+2 string bound remains valid), and the semiring paper's finite-domain ground atoms/program-grounding pointers are sections 2.3/4.3, not 2.4.

Unavailable public reads remain explicit historical gaps, not absence proofs or silently successful acquisitions. Later attributed source evidence does not automatically close every earlier coverage gap. Generated headers/all API modules, upstream planner materialization, complete engine cleanup/checkpoint coverage and physical memory/latency guarantees are not exhaustively established.

## Performance implications and open work

Lifecycle-safe sharing/copy avoidance, paid reusable indexes, fewer candidate intermediates, incremental reservation, bounded batching and polling granularity are **unmeasured conditional opportunities**. No algorithm, numerical quota, tuning value or performance winner is selected.

The next distinct design work must select an actual admission/ownership scope, logical units, supported cooperative participation or bounded unchecked regions, publication/cancellation linearization, transaction policy and healthy-versus-restart-required evidence. This record supplies no implementation or execution plan and admits no test, retry, deployment or recovery action.

## Preservation and integrity

This checkpoint contains 23 selected project files: research, source ledgers, conditional mathematics, hand specifications, reviews and this guide. It excludes raw acquisition responses, progress logs, diagnostics, computer-environment snapshots/details and old stopped or paused payloads. It does not claim to archive all 49 files of the API lane or all original acquisition caches.

`SOURCE-IDENTITIES.json` is the frozen synthesis's 19-input provenance record, not the complete publication inventory. `CHECKPOINT-MANIFEST.json` records the other 22 selected files and excludes itself. Original research bytes and additive corrections are preserved separately.

Living ten-goal roadmap (private application reference omitted) · [Existing draft source PR]([PRIVATE_REFERENCE_REMOVED])
