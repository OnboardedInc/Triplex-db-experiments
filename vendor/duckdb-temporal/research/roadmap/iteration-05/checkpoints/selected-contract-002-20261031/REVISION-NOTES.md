# Revision 002 — additive contract correction

2026-10-31 UTC · **FROZEN SOURCE-ONLY DRAFT FOR INDEPENDENT RE-REVIEW**

This is a new local revision. Frozen revision-001 is unchanged. No implementation or empirical stage has started; all remain UNRUN. This draft is not selected, accepted, or execution authority.

## Coordinator blocking finding

Revision-001's admission of embedded U+0000 widened the selected project value domain. The proposed first slice must instead use **NUL-free UTF-8**. This is an actual contract defect, not an optional compatibility feature or a passing test result.

## Required additive correction

* A string is empty or shortest-form UTF-8 for nonzero Unicode scalar values U+0001–U+D7FF and U+E000–U+10FFFF. Decoded U+0000 is outside the logical string domain.
* Keep the existing phase/row/column/byte order. Size admission remains before content inspection. During the value-validation phase, decode a string once, left-to-right, without a preliminary NUL scan or recovery/rescanning.
* When the next scalar starts with byte 00, that byte is a complete well-formed U+0000 scalar: return the distinct domain error `nul_string` at that zero-based byte offset immediately. Do not inspect later bytes.
* When a continuation is required, byte 00 is not a valid continuation: return `invalid_utf8` at that zero-based consumed-byte offset, **not** `nul_string`. Do not reinterpret the same byte as a new scalar.
* An earlier malformed UTF-8 event wins over a later NUL. An earlier decoded NUL wins over later malformed input. Overlong encodings are malformed UTF-8 and never admitted/converted into a NUL scalar. At end-of-string, an unfinished scalar retains the existing lead-byte error offset rule.
* Add `nul_string` to the closed error-code set, with phase `value_validation`; diagnostics remain fixed, owned, bounded, allocation-free and without payload echoes.
* The existing single-byte validation ticket applies before consuming the error-causing byte, including 00. No second ticket/scan is introduced. All raw copies and unused columns are still validated before dedup/reduction.

All scalar/FP rules, owned raw/full-tuple set semantics, fixed ceilings, four-limb proof, boundaries, holds, and UNRUN status remain unchanged. The fresh peer additionally required the exact reservation/commit clarification and guard-honesty proof below; neither changes mathematical set/arithmetic semantics or grants execution.

## Frozen peer handoff and further corrections

The bounded review was received and only its four named files were read: `.agent-logs/goal5-contract-peer/revision-001/{10-review.md,20-counter-and-bound-analysis.md,30-revision-obligations.md,90-manifest.json}`. It reviewed revision-001, not this revised text, and gave no implementation approval.

**B2:** `ARITHMETIC-AND-ACCOUNTING.md` §D.1 now fixes initial/descriptor/shape/sizing prefixes; admitted tuple headers and value sizes; completed-row counts; phase-3 input/workspace reservation flags; separate phase-4 sort-array reservation/acquisition; prospective output checks and copy-work precharge before joint output reservation; allocation failure; peak update; and pre-cleanup reporting. Its flagged state equation is valid before and after each reservation. The hand-derived FF/one-row/global-count prefix is fully sized input12, then phase-3 live/peak268 with no sort reservation. It cannot choose a competing zero/284-byte prefix. Exactly one adjacent-key comparison per reached adjacency per observed pass and zero-based canonical group ordinals are explicit.

**C1:** the fixed reference schedule supports the peer's sufficient hand bound `40·16777216 + 340·100000 + 64 = 705088704 < 1e9` work tickets. The companion carries its premises/decomposition using the separate admitted output-byte ceiling, reconciling the author's earlier looser derivation. The source/group/output-row/state/work caps are classified as closed invariant guards under the tighter fixed input limits. No fabricated/bypassed/lowered-admission run can be called a production boundary; no run occurred. Raw and output-byte limits remain reachable logical boundaries; allocation failure is not a capacity guarantee.

The coordinator also supplied immutable NUL-domain confirmation at project commit `691ccf65eb0bee686c1919bfa893d1027db30162`, `temporal_value_domain.hpp` lines27–31, blob `99ff9118354d3bba5e48ad461442ef2493e94086`. It is attributed static evidence; this author did not fetch that original source.

## Illustrative byte outcomes — hand-derived, never executed

Offsets are zero-based bytes within one raw string, after unchanged shape/size admission:

| Bytes in hexadecimal | Expected first value-validation outcome |
|---|---|
| empty | Admitted empty string |
| 00 | `nul_string`, byte0 |
| C2 00 | `invalid_utf8`, byte1: required continuation |
| C0 00 | `invalid_utf8`, byte0: illegal overlong leading byte |
| E0 80 00 | `invalid_utf8`, byte1: restricted continuation already invalid |
| E2 82 then end | `invalid_utf8`, byte0: unfinished scalar lead |
| 00 FF | `nul_string`, byte0; later byte not inspected |
| FF 00 | `invalid_utf8`, byte0; later byte not inspected |

These are source-contract examples, not generated data, validator observations, tests or an execution packet.

## Current status

The six-file revision-002 package is frozen after the final local write for coordinator/peer re-review. The author considers B1/B2/C1 addressed in source text; independent re-review/selection of this new revision has **not** been asserted or accepted. All implementation/empirical stages remain UNRUN. Frozen revision-001 and the frozen research/review packages are unchanged.

Running/queued/yielded calls, pending approval questions, uncertain mutations and authorized implementation/empirical actions in this lane: **none** after handoff. No external process, code/test/compile/native/SQL/benchmark/control action, computer inspection, stopped-material read, external publication or Git mutation was started. The next decision belongs to a separately bounded coordinator/peer review, not to an automatic implementation continuation.
