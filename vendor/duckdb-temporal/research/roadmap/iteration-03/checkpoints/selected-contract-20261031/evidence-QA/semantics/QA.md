# Goal 3 IR + correctness evidence QA

**Decision-ready research with minor errata; not implementation acceptance.**
2026-10-31 UTC. Root alone selects/integrates the architecture. No project,
database, native, FP-helper, build or benchmark code was imported or executed;
no Codex, user-computer operation, remote mutation or child worker was used.

## Inputs and actual checks

- Immutable input: `/tmp/temporal-roadmap-research/iteration-03/recovery-0359/snapshot`.
  Supplied snapshot-manifest SHA256
  `849c98fee64ca679ca70d6fbe1ddd133708dc8c1639d4d8d4e5fc28125f59123`
  matches. All **15 IR/safety files, 234,259 bytes**, match their manifest hashes,
  modes and UTF-8 checks. Originals remain untouched.
- Read both `research.md` reports, IR alternatives/test obligations, safety
  hazards/matrix and all 73 corpus cases. The IR receipt's **17 project files**
  independently rehash correctly against its recorded bytes, including export
  manifest `cb63b5055b4e58dc9a2cfbaaf4d316a107be8c807b4cac6d387d40446151273d`.
  Source observations refer to that accepted-item-2 export, not a new test of
  later documentation-only heads.
- Source-receipt checks: **27 IR web + 10 IR pinned + 24 safety documentation +
  11 safety pinned**; all 51 short-text hashes match. All **54 cited URLs**
  (counting distinct fragments) have receipt coverage. Five repeated pinned
  source URLs have matching full-body hash/length records across lanes; binder
  and executor also agree with supporting performance receipts. Their four
  supporting receipt/excerpt inputs were hash-checked before use.
- Exact split v2 header joins **in memory only** to 751,463 bytes, SHA256
  `73026a28e5b55952afb6e2e9ce80fd4f76614afedce329da895ccaf85a4a8be6`;
  both parts match their recorded hashes and metadata pin
  `d54cbbe3df17e8e5ce68312f483b4155836112aa`. Targeted header text independently
  supports lazy execution, late errors, terminal cancellation, unfinished-result
  abort, copied parameter values, missing named/session fallback and one live
  statement per connection. See `v2-header-source-check.json` for line references.
- **73 specifications, not 73 passed queries:** JSON/receipt script exit 0;
  39 row cases, 34 error cases, 44 fact records and 51 expected row records.
  Duplicate keys/IDs, shapes, exact decimal i64s, intervals/cuts, finite bit
  patterns, expected canonical zero, typed expected-row set/order and literal
  error-marker presence were checked without FP arithmetic or DSL execution.
  Query answers, parser acceptance and error precedence remain UNRUN.

Commands/exits are in `command-exit.jsonl`; `audit_specs.py` is an evidence-only
stdlib checker. No new browsing was needed: concrete checks were resolved by
existing pinned receipts, verified excerpts and immutable source/header text.
Catalog skills loaded; the absent workspace skill-copy paths are a terminal
documented lookup failure, not a research or permission blocker.

## Claims that survive reconciliation

| Claim | Evidence and consequence |
|---|---|
| Source identifiers are case-sensitive; SQL identifiers are not | Core string-key maps/parser and IR D06/safety D05. Generate structural relation/variable/parameter IDs; quoting source names is insufficient. |
| Equality is tagged identity, not SQL combination casting | Core dictionary/domain/expression plus IR D04/D07 and safety D01/D02. Four equal-looking tags stay distinct; explicitly fixed carriers/schemas and byte-string identity are required. |
| Partial filters are eager effects | Core `filters_match/evaluate/run` (459–581): after a complete join, later filters run after false, errors precede head dedup; every program rule participates. Empty joins must not invent faults; ground filter-only rules have one candidate. |
| Legacy caps/counters are operational | Core 438–480/553–605 and exact store decoder: all active EDB/all IDB facts, native probes/filter work and global rounds. Answer-unreachable growth matters. SQL counts/estimates/zero placeholders cannot populate `SnapshotResult.native`. |
| Existing IR is not a portable compiler interface | Private dictionary-ID terms/rules in core; public `TypedEngine` accepts only program plus temporal `triple/3`. Native-owned logical ProgramIR/export is feasible new work, not an existing capability. Arbitrary-IDB/SCC seeding requires a separate validated API. |
| Recursion needs a bounded proof scope | Ordinary `UNION` supports the analytical total linear-singleton proof. Multiple plain self-references are frontier×frontier and can omit old×new facts. Pinned binder 223–231 binds `recurring` unconditionally, disproving keyed-only advice; nonlinear delta variants still need separate proof/tests. |
| 2.0 keyed behavior differs from older advice | IR/safety WITH receipts plus pinned executor records: keyed `UNION` propagates new/changed finalized state; `UNION ALL` propagates candidates. Partial keys can overwrite distinct facts. Mutual named recursive CTEs remain unsupported. |
| Completion is not prepare/first-row success | Exact v2 header and safety P07/P11: bind every typed positional value, use the same explicit transaction/connection, privately consume/validate terminal output, then commit/return. A new connection does not preserve staged-snapshot ownership. |

Source links and narrower provenance are in the recovered receipt files. Versioned
2.0 documentation is movable, not an immutable runtime specification. Recorded
full-body hashes agree; bodies were not retained, so this is **cross-receipt
consistency**, not an independent current-remote-body rehash. Classic abstract/
index-only evidence stays labeled; analytical proofs are not attributed to unread
full papers. Transaction search-cache disagreement does not justify implicit
transactions: keep explicit BEGIN/COMMIT/ROLLBACK and later pin-test actual APIs.

## Feasible choices and selection advice — not a selection

1. **Smallest compatibility surface:** additive planned request/result/explain,
   leaving the six-field Query, legacy query/JSON/evaluated-command paths and
   genuine native envelope unchanged. Planned SQL rows/metrics are route-specific;
   native metrics exist only when native really ran. Static plans, physical
   estimates and observed execution are distinct records.
2. **Smallest shared language surface:** one native-owned, versioned logical
   ProgramIR with owned literal values/canonical f64 bits and structural IDs.
   Native SQL+parameter export is another feasible boundary. Neither may expose
   invocation-local dictionary IDs/borrowed vectors or silently drop FP admission.
3. **Smallest SQL proof surface:** whole-program positive acyclic relational
   rules, initially no filters, or explicitly admitted total equality/inequality.
   Totality must hold on every complete candidate independently of other filters.
   Fixed typed carriers, exact binary string semantics, predicate set unions,
   both half-open temporal predicates and canonical output remain mandatory.
4. **Optional recursive increment:** total linear singleton SCCs with fixed
   lower-SCC inputs and ordinary full-tuple UNION. No depth column in identity,
   silent LIMIT/truncation or partial-key overwrite. Mutual/nonlinear/partial-
   filter programs can correctly use the **whole original native program**;
   current APIs cannot support a fictional SQL-prefix/native-SCC handoff.
5. **Broader filters are genuinely more work:** pure total status evaluation,
   mandatory consumption over all complete candidates before pass filtering/head
   dedup, all-rule error reachability and full terminal draining. CASE/TRY,
   CanThrow or a materialization hint alone is not the proof. Recursive partial
   effects and native work/round equivalence remain separate obligations.

## Genuine decisions before implementation

- Exact initial SQL/filter/recursion subset and capability/fallback reasons.
- Planned budget/error policy versus legacy operational limits. Strict legacy-
  budget requests require genuine native execution unless exact equivalence is
  proved; merely borrowing the numeric cap names is not compatibility.
- Continuous schema/session/FP trust boundary and validation of **malformed
  invisible rows**. Native admits/validates input before visibility; SQL temporal
  pushdown must not silently weaken that guarantee. Valid invisible wrong-tag
  expression inputs, by contrast, must not fault.
- New IR/result ownership/version surfaces, unavailable-native behavior,
  diagnostic redaction and multi-error reporting. Existing single-fault markers,
  request capture and rollback/lost-ack protocol must be retained.

These are bounded contract choices, not evidence that native/SQL feasibility is
blocked. There is no pending source retrieval, approval or execution session.

## Acceptance still required

Prioritize: (a) legacy/parser/owned-IR/FP parity; (b) required SQL routes actually
using SQL scans/joins, strict tags/sets/bytes and both full-width clocks; (c) false-
then-fault, empty complete join, duplicate head and unreachable-rule sentinels;
(d) same-snapshot concurrency, staged rollback/reopen/retry, late fetch/codec/
cancellation no-prefix tests; (e) selected linear shapes/seedless cycles and
nonlinear old×new/mutual genuine fallback; (f) actual plan/provenance/resource
admission plus fair paired cold/warm full-path measurements.

The corpus does **not** replace the matrix: boundary generators, multiple linear
branches/anchors, malformed data, request callbacks, transaction interleavings,
resource caps, ownership and host-control cases need an actual harness. Require
an independently represented typed oracle, not the emitter's own equality code.
No measured speedup, acceptance pass, production claim or root architecture
decision follows from these checks.

## Publication/quotation hygiene

IR+safety retained receipt excerpts total at most **19 whitespace words per
source URL**, even conservatively counting fields labeled paraphrase. Excerpt
hashes are explicitly not whole-page hashes. This QA stores references, compact
findings and check results—not full upstream pages/headers/excerpts, secrets,
platform text or private reasoning. Analytical prose attribution is not decided
by the automated quote count; preserve concise syntheses/citations rather than
adding full-source caches. Minor corrections and recovery boundaries are in
`errata.md`. All application/native/SQL/performance checks remain **UNRUN**.
