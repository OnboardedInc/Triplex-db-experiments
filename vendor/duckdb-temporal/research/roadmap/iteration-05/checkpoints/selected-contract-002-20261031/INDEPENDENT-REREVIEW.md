# Contract 002 bounded independent re review

Revision 002. 2026-10-31 UTC. Source-only closure review, not implementation or acceptance evidence.

## Gate result

**B1, B2 and C1 are closed in contract-draft revision 002. No residual blocking contradiction was found within this bounded re-review. The revised source contract is ready for coordinator selection consideration only.** This review does not itself select the contract or approve implementation, execution or acceptance.

Exactly these new frozen files were read:

- .agent-logs/goal5-contract-draft/revision-002/CONTRACT-DRAFT.md
- .agent-logs/goal5-contract-draft/revision-002/ARITHMETIC-AND-ACCOUNTING.md
- .agent-logs/goal5-contract-draft/revision-002/REFERENCES-AND-GATES.md
- .agent-logs/goal5-contract-draft/revision-002/REVISION-NOTES.md
- .agent-logs/goal5-contract-draft/revision-002/MANIFEST.json

No activity log, older project source, product code, stopped material or external reference was fetched. Previous review conclusions are retained as prior context, not rewritten. The author's own resolution claims were checked against the normative revised text rather than accepted from its manifest alone.

## B1 NUL free domain and first failure order

CONTRACT-DRAFT sections 3 and 6 now agree on the NUL-free domain: empty strings are permitted, but decoded U+0000 is not. The closed error set contains nul_string in value_validation with bounded raw row/column/byte ordinals.

The single left-to-right decoder fixes the required distinction. At a scalar boundary, byte 00 is a decoded-NUL domain failure. In a required continuation position, it is malformed UTF-8, not a new scalar. Restricted continuation ranges detect an invalid prefix when it first becomes impossible; overlong encodings of zero cannot become an admitted NUL. An unfinished scalar at EOF reports its lead offset, with no fictional EOF-byte ticket.

The hand examples are consistent: 00 -> nul_string at byte 0; C2 00 -> invalid_utf8 at byte 1; C0 00 -> invalid_utf8 at byte 0; E0 80 00 -> invalid_utf8 at byte 1; E2 82 at EOF -> invalid_utf8 at byte 0. Earlier NUL versus earlier malformed syntax is determined by actual consumed-byte order, not a preliminary scan. Descriptor and complete shape/size phases still precede content validation. Duplicate and unused fields remain covered. The decisive consumed byte receives its ticket before the error; later bytes are not inspected.

These are source-contract/hand checks, not observed validator results. B1 is closed without changing finite-word ordering, full-tuple set identity or operator arithmetic for admitted values.

## B2 Exact prefix and reservation state machine

ARITHMETIC-AND-ACCOUNTING section D.1 now specifies the formerly missing commitments, consistently with CONTRACT-DRAFT section 6:

| Boundary | Revised committed prefix |
| --- | --- |
| Initial or descriptor failure | Numeric counters zero except performed descriptor tickets; reservation flags false; live/peak zero |
| Descriptor success | Descriptor size enters input_bytes only; no state reservation |
| Raw envelope or shape failure | No raw-row/value/tuple-size commits; descriptor bytes remain; live/peak zero |
| Row sizing | Admit tuple header first; admit each complete value size and raw_values together; commit raw_rows only after the whole row sizes successfully |
| Rejected size charge | Preserve the previously admitted header/values/completed rows; do not record the rejected value/bytes as admitted |
| Phase 3 entry | Atomically reserve full input plus 256 workspace; set input/workspace flags and live/peak before validation |
| Phase 4 entry | Separately reserve both row-reference arrays before either acquisition; acquire both before any index write; zero rows still produce the specified true zero-byte sort flag |
| Output | All prospective caps pass, then copy-work precharge passes, then output row/bytes/live/peak commit atomically, then owned copy occurs |

The flagged live-state equation applies before and after these transitions. A rejected reservation does not alter its flag/live/peak. Admitted reservations remain in the failure report if subsequent allocation fails. This fixes the prior conflict between zero-initialized counters and an unconditional workspace/array charge.

The FF example is correct: descriptor 5 plus tuple 7 gives input_bytes 12, raw_rows=raw_values=1. Phase 3 admits 12+256=268 logical bytes. Its invalid_utf8 report has input/workspace true, sort false, live=peak=268. It cannot report 0 or 284. A scalar-boundary 00 has the same sizing/state prefix but nul_string instead. These values are hand-derived, not run.

Output failure prefixes are also fixed. Passing an individual prospective cap does not commit a row. Rejected output work precharge leaves all staged/live/peak values at their preceding prefix. After successful precharge, all output reservations commit jointly; a later allocation failure includes that work and reservation even if copying was incomplete. Neither case returns any staged value. Publication/cleanup preserves reported pre-cleanup counters and peak rather than retroactively zeroing them.

First-pass group admission, distinct compaction and duplicate counters have explicit commit points. One adjacent-key comparison per reached adjacency in each observed pass, and zero-based canonical group ordinals, close the requested traversal precision. No new counter is appended to old engine metrics. B2 is closed as a source specification; allocation-free failure construction, cleanup and counter reconciliation are still unimplemented/unverified properties.

## C1 Work and state guard classification

Sections C and D.2 explicitly retain the premises used by the prior hand proof: bounded arity/key width, no extra comparator traversals, first-difference/end lexicographic scans, one emitted row per merge comparison, one dedup comparison per later raw row, exact adjacent-key comparisons, and one later-measure comparison for extrema.

The sufficient bound remains 40*16,777,216 + 340*100,000 + 64 = 705,088,704 tickets, below one billion. Using global ceilings correctly covers the empty global group; the proof does not assume its group count is bounded by its actual zero input rows. Copy-work tickets are bounded by the separate admitted output-byte ceiling because output checks precede precharge and commit. Allocation or semantic failure only stops a prefix; NUL rejection adds no extra scan and only shortens validation.

The 35,954,688 logical-state bound remains below 40 MiB for the selected ledger. Source/group/output-row/state/work ceilings are now correctly described as invariant guards under tighter fixed admission. Raw and output-byte limits remain reachable. No impossible production guard failure is demanded, and lowering/bypassing admission cannot be presented as production boundary coverage. These are logical proofs, not actual memory, timing, capacity or empirical observations. C1 is closed.

## Preserved scope and final status

No changed text undermines the previously reviewed four-limb final-range arithmetic, strict four-tag/canonical-zero key semantics, full-tuple contribution identity, comparable per-group extrema or observed/global empty choices. Those were not reopened into a new design exercise.

This component still does not certify dependency extraction, temporal visibility or producer completion. It does not implement Datalog, host v2, a SQL adapter, old-surface compatibility, ownership destruction or spilling. Items 3/4 and dependent native syntax remain HOLD; item 4 is incomplete; item 4.1 is separately researched and untested. F64 sum remains deferred.

All implementation/compiler/native/SQL/oracle/test/benchmark/control/ownership/compatibility/integration/performance stages remain UNRUN. No computer-environment packet, stopped reconstruction, Codex, subagent or external write is introduced. No approval is inferred from a successful source re-review. Freeze this bounded closure; no call or approval question remains pending in this lane.
