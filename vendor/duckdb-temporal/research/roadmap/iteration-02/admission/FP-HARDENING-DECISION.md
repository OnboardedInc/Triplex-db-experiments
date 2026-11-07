# Selected Python-store floating environment hardening

30 October 2026. This follows the distinct [FP admission addendum](fp-admission-addendum/ADDENDUM.md), not an implementation/acceptance result. The original completed research freeze remains unchanged.

The isolated probes reproduce real loss of tested positive subnormal values in persistence/close/reopen under DAZ, as well as unsafe Python Value equality/hash and JSON conversion. Merely making the native evaluator or Value factory bit-safe does not protect the store. Select early read-only environment rejection, not silent control repair or an optional-engine dependency.

## Bounded target and design

- Declare and enforce the tested CPython/Linux x86-64 little-endian/glibc 2.41 fenv ABI. Public fegetenv writes into owned aligned storage; verified size32, x87 control offset0 and MXCSR offset28. Unknown targets/ABI/read failures fail explicitly with TD_E_EXPR_FLOAT_ENV. Do not guess a portable layout, execute byte stubs or inspect private objects.
- Use only documented libm fegetenv with declared ctypes signatures. Require nearest rounding, masked exceptions, FTZ/DAZ off; ignore sticky status flags. Do not change host FP controls. Recheck at typed-store readiness and connection/codec lifecycle boundaries, including open and close/checkpoint, not only native query. Normal-state persistence without the evaluator artifact must remain available.
- Make pure Python Value finite validation, zero canonicalization, equality, hash and sort key bit-based. Pure admitted value identity remains stable under altered state; operations that enter DuckDB or convert/encode f64 still require supported controls. Preserve exact tags and all original input/path/storage caps.
- Reject unsupported controls before f64 int conversion and supported public codec boundaries. Already-decoded external JSON payloads cannot reveal prior lost bits, and a later caller-controlled JSON encode is outside the function's control. Document compatible FP controls throughout caller codec and connection lifetime, including finalization.
- Preserve closed/idempotent semantics and serialize checks with existing store locks. A rejected pre-operation command must not advance history/clock/receipt; a failure at close does not roll back already committed commands. Restore supported controls before retrying cleanup/receipt reconciliation. Mid-call hostile signal handlers, allocators or callbacks changing FP controls are outside this prototype's supported-host contract.

## Verification gate

Use isolated child processes and inspectable test-helper source; restore controls before cleanup. Test bit-level Value identity/hash/order, strict finite/zero admission, all public/inherited store readiness and close paths, codec conversion, sticky flags, independent x87/MXCSR modes/masks and actual read-only snapshots. Demonstrate normal no-engine persistence/reopen and early rejection under DAZ/FTZ with unchanged receipts/history, then restore and cleanly close/reopen. Verify ABI against public headers/compiled layout and fail-closed unknown-target checks. Re-run actual native/store/migration suites on final source; no all-client FP safety, crash certification or production readiness claim.

Source writes remain with the coordinator until this research/decision is durably preserved and a separate explicit storage ownership handoff is given.
