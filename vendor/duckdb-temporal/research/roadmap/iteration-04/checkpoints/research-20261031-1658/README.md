# Item 4 safe stratified negation preimplementation research

31 October 2026. **Research checkpoint, not implementation or acceptance.** Contributor directed work to move to item4 while item3 remains incomplete and blocked. This preserves only genuinely new item4 theory, exact-engine execution research, QA design and independent review. It does not save, reconstruct, summarize or replace any stopped item3 backup. Later local-only item3 work is not claimed saved by this checkpoint.

## Main conclusions

- Negation is a fully grounded absence test after whole-rule positive binding. Signed body-to-head dependencies reject any negative edge inside an SCC. Complete lower predicates, including empty ones, before testing absence at the same valid/known point.
- Reuse the existing native full-key relation set and one execution-local typed dictionary. Preserve the complete-positive-binding scalar barrier: every inherited filter executes before anti-pruning and before head dedup. Endpoint exclusion must not be pushed into recursive traversal.
- Prefer a separate additive signed API/owned IR. Legacy positive APIs, strict IR1 and their counters must not silently change. SQL anti-join variants remain research-only behind the unresolved integration trust gate; the actual unstable C APIv2 remains pinned to DuckDB2.0.0/d54cbbe3df17e8e5ce68312f483b4155836112aa.
- Proposed new accounting globally sums component-rounds and positive/expression/negative work; no per-stratum reset. The concrete model is still a proposal, not a selected API or proof of allocator/RSS/cancellation/wall-time bounds.
- A tiny independent semantic oracle uses all graph predicates, including fixed triple/3, for its finite level bound. Successful set/fault-presence checks are separate from exact budget-counter or multiple-fault-priority proofs.

## Read the research

1. [Theory and semantic contract proposal](theory/REPORT.md), [primary-source inventory](theory/SOURCE-INVENTORY.md), and [77 proposed acceptance obligations](theory/FIXTURE-OBLIGATIONS.md).
2. [Exact-DuckDB/native execution research](execution/execution-research.md), [30-case benchmark and EXPLAIN design](execution/benchmark-and-explain-plan.md), and its exact source inventories. Source is inspected, not executed; no speedup or physical-plan result is claimed.
3. [Current root QA research](qa/RESEARCH.md), [32 proposed QA obligations](qa/FIXTURE-MATRIX.json), [source readback](qa/PUBLISHED-SOURCE-READBACK.json) and [explicit change record](qa/CHANGE-RECORD.json).
4. [Independent peer review](peer/REVIEW.md) and [readback evidence](peer/EVIDENCE.json).

Counts overlap and are NOT test passes. All proposed implementations, fixtures, oracle runs, compiler/native/database checks, benchmarks and EXPLAIN observations are **UNRUN**. No current code or PR source was changed by this research checkpoint.

## Current-domain and QA precision

Logical values remain four tags: NUL-free valid UTF8 strings, Boolean, int64 and finite canonical float64. STRUCT refers to the typed carrier/schema, not a new nested logical value. NaN/infinity/NUL belong to rejection controls. Binary zero bytes in an optional physical BLOB-key encoding are different. Same identifier at a different arity remains an error; no overloading is added.

Current QA revision002 incorporates the source-reviewed correction of an earlier unrun NUL fixture and clarification of row-wise loading. Rows may validate/select into the EDB incrementally, but ALL supplied carrier rows finish before rule evaluation or any returned result; do not visibility-prefilter retained history before admission. The source-readback inventory accurately contains seven files; the prose's residual word “six” is a nonblocking count typo, not a different inspected set. Earlier QA001/addenda are retained locally as provenance, not recommended standalone fixtures. L06 does not add callback-local cancellation to item4; that capability remains later work.

## Status and next gate

The project remains experimental. [Published code and draft PR7]([PRIVATE_REFERENCE_REMOVED]) is in private Contributor/research-reference at source52b1e81f1d71590bdefb376e62924c9f717d4344. This checkpoint does not accept item3 or activate its SQL/store planner. Next: settle signed grammar/API/IR, deterministic diagnostics and the aggregate accounting contract; independently review that contract before code and separately gate any execution.

[Checkpoint index](CHECKPOINT-INDEX.json) records exact byte sizes, SHA256 and Git blob identities. Each author's retained manifest excludes itself. These are research records, not copied paper/source corpora or runtime evidence.
