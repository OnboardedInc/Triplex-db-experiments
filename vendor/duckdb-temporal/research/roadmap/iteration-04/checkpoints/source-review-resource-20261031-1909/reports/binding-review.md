# Independent source-only binding review — final closure

2026-10-31 UTC. Reviewer: `iteration04_binding_review`.

## Result

**No unresolved binding-source blocker identified.** The two narrow initial
findings are resolved in the exact coordinator-authorized binding revision 002.
This is a static source-review conclusion, **not** a compilation, test, ABI,
performance, capacity, production or store-integration acceptance result.

Final reviewed binding receipt:
`cb2ec7e6b1fcfde3d7ff1a709535abe1bc40eefc07462c057f23fcdab2f1df7e`.
Its three files total 54,388 bytes:

| File | SHA-256 |
|---|---|
| `engine/src/temporal_datalog.cpp` | `2f29b74772dd0d0d33ecceb2afc047f1d5adffe6f9998b300bc66e743441c39c` |
| `engine/build.sh` | `02f64e4b074b2b3b4f772d0d49a7521b56da7cca48eb0e490c7f062871a69fa2` |
| `engine/ITERATION-04.md` | `543a4169725d7dadcabd6a36d93b268bb66167ff36c56b0032593aebc9d0a5c3` |

Final new-header receipt:
`cfcece1e081a16c2a915e229fba183b07c20ff08046fc0d679c676f769a80be2`.
The stratified header is `84c104e344032e3d5c0cfe119a1a68ca9abb5fa22a8b13c3d2697f68b0fe63a9`;
the IR2 header is `1c322e1f14a6dd56c403efb50db8448278adce0d48c63319adfc203da17f9ef7`.

## Findings and closure

1. **Source-byte phase consistency — resolved.** In frozen revision 002, query
   line 563 and IR2 line 617 set `Compile` immediately before source text
   extraction on lines 564 and 618. NULL/limit checks remain `Request`. Oversized
   program admission is therefore classified consistently with native
   compilation. This is a text/control-flow finding, not a runtime observation.
2. **Stack-only reporting wording — resolved.** Lines 377–378 now limit the
   stack-only claim to local envelope formatting and acknowledge fallible host
   copying into owned storage. This agrees with the pinned primary C API docs,
   which explicitly say error text is allocated/copied by DuckDB.

An independent exact reconstruction proves those two phase moves and the comment
are the **only** revision-001-to-002 changes. The previous three-file freeze and
header receipt were not overwritten. The initial review and observed coordinated
header transition remain in this evidence packet.

## Coverage and preserved conclusions

`INITIAL-REVIEW-BINDING-001.md` records the full initial line-by-line review and
its two historical findings. Its otherwise unchanged source observations carry
forward to revision 002; binding line numbers after the new two-line comment
increase by one. `BINDING-CORRECTION-002-CHECK.json` records the exact delta and
current candidate/frozen equality.

Coverage includes genuine pinned v2 function/callback/property types and byte
layout; typed tags and NULL carrier rules; container normalization and alias-view
refresh; constant/dictionary selection; all ten result fields; checked 72-byte
metric precharge, tuple/cell/byte admission; post-reserve pointer refresh; arena
copy ownership; empty answer/batch control flow; IR arena-copy limits; bounded
phase-aware domain/API/OOM transport; continuous-FP trusted-callee premise and
source-level guard-count derivation; legacy line preservation and metadata-only
build changes.

The coordinator additionally authorized read-only inspection of four published
baseline headers. Their candidate counterparts are byte-identical:
`temporal_plan_ir.hpp`, `temporal_typed_core.hpp`, `temporal_value_domain.hpp`,
`temporal_float.hpp`. Static compatibility checks confirm:

- `PlanAtom` is exactly the two-member aggregate expected by the new `{0, {}}`
  initializers. IR2's added `std::array`/`std::variant` types come through the
  existing included header; there is no new enum-ABI serialization claim.
- `ValueTag` values are exactly String=1, Boolean=2, Int64=3, Float64=4, matching
  the SQL tag-to-payload mapping. Payloads are owned; the existing typed domain
  explicitly validates UTF-8/NUL, finite float bits and canonical-zero dictionary
  identity. Final core use of these helpers is still a separate review obligation.
- The actual FP guard reads x87 control/MXCSR and throws rather than repairing
  controls. The documented binding-only formulas were independently reproduced:
  `122 + 11*I + F + O + 25*R + 13*N + 2*L` for query and
  `11 + I + O + 2*L` for IR2. Core checks are additional and overhead is unmeasured.
- All 415 baseline binding lines remain exact and in order in final revision 002.
  Build changes remain only the leading comment and 0.5.0 artifact metadata;
  strict flags and the exact host/footer pin are unchanged.

## Gates deliberately still closed

The active `temporal_core.cpp` was not read or relied upon. Its final evaluator,
parser, serializer pre-append checks, counters, exact output admission and owned
IR behavior need their own final source review. Native compilation/linking,
DuckDB runtime vector/error behavior, callback recovery/no-partial semantics,
legacy differential checks and any authorized performance campaign are **UNRUN**.
No source assertion in this packet is a runtime pass.

No source edit, application/project import, native/module load, database, oracle,
test, build, compiler/preprocessor/linker, FP/control/limit change, Git/Page
mutation, Codex task, user-computer action or background process was performed.
Only scoped text inspection and standard-library text/hash/diff evidence writing
were used. Stopped item-3 material, controllers, later staging and denied session
paths were not inspected/copied/repackaged. Original source owners retain writes.
The coordinator owns any durable publication and further execution permission.

Exact read identities and evidence hashes are frozen alongside this report.
