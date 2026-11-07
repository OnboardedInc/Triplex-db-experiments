# Native companion consistency review — source-only addendum

2026-10-31 UTC. This is separate from frozen semantic packet `0bf35021d0cd7d57bfcb465213cb945d02a93b60492e4d611a736c8d35375a26`; that packet and its members are unchanged. No author file was edited. No implementation, compiler/module/native/database execution, test, benchmark, Git or Page action occurred.

## Result and scope

**Closed source-only review: no unresolved semantic contradiction found in the final frozen execution packet.** Final manifest SHA256 `4615f510898a14ffd3cc1145e826113b42cf41d0b4891e0e10922a73b405deb5`; eight members /69,201 bytes. Final native SHA256 `1160eb56cabf5468c1115931d95395be3350f45e8448f45f417cf49e4d55822e`; IR2 SHA256 `c680654909a0b480889feb193e4d30395ea525ef1466fca070f1744b09314bd6`; diagnostic table SHA256 `1465cc039786db2bb5699f7f275b4afafa15daad6bbd2b04c11baed1f2a29aae`. Final exact byte/hash readback, corrected native sections, full IR2/diagnostics and budget-model read were completed before closure.

Full `NATIVE-CONTRACT.md` was read at initial observed SHA256 `d8cd1015100ea7532a328ef1a99c496518a0243cb237640faa2bd6a702a785c8`. `IR2-CONTRACT.md` initial observed SHA256 was `f97feb77f21383500565b9d786936920767f9763cd207d0442836d766948c630`. These were proposal bytes, not implementation evidence or an immutable author checkpoint at that read.

Two root-selected refinements were confirmed in the final byte readback:

1. Remove a new whole-source UTF8/comment pass: keep inherited program1..65536 raw-byte/NUL admission, ASCII identifiers and typed-literal/value UTF8 checks. Ignored comments gain no new validation. IR2 output still contains only validated text/ASCII identifiers, not comments, and therefore can remain UTF8 JSON.
2. Remove new pending-ID sorting: keep relation-ID merge order and existing pending-set iteration, without promising cross-platform candidate/first-fault determinism. Static SCC/rule/variant order and sorted successful result sets are the stated deterministic boundary.

The final packet applies both refinements. The initial proposal hashes above are retained only as review history, not recommended current artifacts.

The final cycle diagnostic prints only the selected rule/body/edge IDs and member_count, not a full SCC-name list. `DIAGNOSTICS.md` preserves inherited helper messages/categories and uses an accurate new `TD_E_EXEC phase=P:` callback envelope around the stable inner native code. New negative-group/component-round/IR checks get their own prefixes; no universal resource-enum retrofit or shared-helper string parsing is introduced. This is consistent with the frozen semantic packet's six post-parse classes and source-structural ties.

The root's merged selection candidate `.agent-logs/goal4-contract-coordinator/proposal-001/CONTRACT.md` was separately read at observed SHA256 `1230df6e474341cabcf277fae4b170796b5a6927b0010edf760e88fb9c92d3c6`. No contradiction with semantic0bf or final execution4615f5 was found. This was a proposal read, not final immutable adoption or source/runtime permission. Its initial generated semantic oracle is deliberately filter-free; hand-derived filter/barrier cases and unchanged item2 regressions are an explicitly narrower evidence selection, not a claim of an arbitrary binary64 arithmetic oracle. The required combined fault seam and separate accounting ledger remain acceptance obligations.

## Positive findings

- The new seven-argument `td_query_stratified_v1` and separate new limits/result types preserve old names/types/counters. Its ten-field result has rows and **nine** fixed BIGINT metrics; `component_rounds` is not the old `rounds` metric.
- Both new entrypoints explicitly require VOLATILE/fallible/special-NULL/collation-ignore registration and actual v2 ownership/error APIs. This supports fresh FP admission without changing legacy registration or granting cached authority.
- `!atom` only, ordinary `not(...)`/`?_`, positive binding, fixed static diagnostic class order/source-structural ties, both-sign SCCs, minimal weighted levels and same-level positive completion match the frozen semantic proposal.
- All IDB components execute, including answer-unreachable ones. Base outputs stay pending until wave end; every current positive delta position is covered; negative targets are fixed full completed sets. Explicit empty completion prevents treating unfinished state as absence.
- Eager filters precede negative group billing and head dedup. False does not skip later filters, actual faults abort, and every admitted negative group decision counts even after an early match.
- Global pending fact reservations are transferred, not charged twice. `work = positive_attempts + expression_work + negative_work`; `negative_checks` is audit detail, not an added work charge.
- Exact proposed callback output units are `72 * callback_row_count + sum(40 * typed_cells + emitted_string_UTF8_bytes)`, bounded by32MiB plus the separate tuple/cell caps. The72 coefficient follows from nine8-byte metrics. These are explicit new logical units, not memory/RSS or allocator measurements; old encoding remains unchanged.
- Owned IR2 has a sole rule seeding source, full named postfix filters, independent encoded-byte limits, no borrowed authority/handles, and no supplied-IR execution API. Future-consumer validation documentation is not a new decoder implementation.
- Full supplied history admission may interleave validation/selection, but finishes before run/result. Direct scalar arguments do not prove complete external DB history; persisted store/planner integration and item3 authority remain held.

## Hand-derived accounting checks — not executed

| Proposed empty-input program | Required logical result/counters |
|---|---|
| `answer('ok') :- !triple('x','blocked',true).` | One derived answer, base plus no-change verification =2 component rounds; one arity3 decision charges4 negative work/checks1, positive/expression0. Work cap3 rejects group admission; cap4 permits. Round cap1 rejects verification. |
| Same program with one matching visible blocking triple | No derived answer; empty base is final round1; same negative work4/check1; visible EDB1/input row1. |
| `answer('ok') :- [1=1].` | One answer, rounds2, expression work3, no positive/negative work. |
| Replace filter by `[1=2]` | Empty answer, rounds1, expression work3. |
| Replace filter by `[1/0=1]` | Five-node precharge; a work allowance below5 fails before division. With sufficient work, division-zero is the fault. Compilation exports the filter without evaluating it. |

These checks confirm arithmetic coherence only. The production positive greedy enumeration, overlapping delta occurrences and resource event order need the independent accounting ledger and later authorized tests. The ordinary stratified oracle is for successful sets/required fault presence under ample limits, not exact physical counters or universal multi-fault/near-cap permutation outcomes.

## Stopping boundary

This addendum reviews a pre-code proposal. It does not approve a mutable code candidate, activate SQL/store routing, relax any attachment/FP guard, introduce callback cancellation, accept item3/item4, or establish measured performance. Exact corrected proposal hashes and local documentation verification belong in the final review manifest.
