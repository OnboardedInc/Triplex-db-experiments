# Python FP admission hardening — implementation findings

30 October 2026. Separate from the already-frozen main research and FP addendum. This records a local, bounded implementation checkpoint, not item-2 acceptance or production certification.

## Fresh blocker research and chosen boundary

The initial `struct.pack('>d', exact_float)` approach was not safe under every unmasked exception setting. The preserved isolated probe has **SIGFPE / exit -8** for struct and successful exact binary64 bits for the diagnostic binary-pickle alternative. No production pickle or unpickling is selected.

CPython 3.12.14's big-endian double wrapper calls `PyFloat_AsDouble` and performs a floating error-sentinel comparison before entering `PyFloat_Pack8`. A subnormal can therefore raise the unmasked denormal exception; a signaling NaN also requires invalid-exception caution. The IEEE Pack8 path then copies the original double's bytes without numerical reconstruction. This distinction explains why a byte-oriented public API was not by itself a no-floating-instruction guarantee. [CPython `_struct.c`, bp_double](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_struct.c), [CPython floatobject.c, PyFloat_Pack8](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/floatobject.c).

The coordinator selected **masks-only preflight before the first extraction**, followed by a frozen private canonical integer-bit cache. New Python f64 Value admission rejects *any* unmasked x87/MXCSR exception with `TD_E_EXPR_FLOAT_ENV`, before touching the float. DAZ, FTZ or non-nearest rounding alone do not prevent this exact-float byte copy on the validated target. Existing admitted Value equality, hash and sort key read only integers and remain stable after controls change, including unmasked modes. This is deliberately narrower admission than native integer-bit primitives, not a claim that all Python float operations are safe in such states. Public `Value(tag,payload)` construction and wire/carrier shapes remain unchanged; float subclasses remain rejected.

The C-accelerated pickle diagnostic takes its exact-float path before reducer dispatch and reaches Pack8 directly. It helped isolate the wrapper fault, but adding an implementation/backend-sensitive serialization dependency is unnecessary for the selected cached design. The probe serializes only a locally constructed exact float and never unpickles data. [CPython `_pickle.c`, save/save_float](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_pickle.c), [Python pickle security and format documentation](https://docs.python.org/3.12/library/pickle.html).

## Read-only guard and target

Production uses declared `ctypes` signatures for public `libm.so.6` `fegetenv`, an owned aligned32-byte buffer, and only reads the admitted fields. It does not invoke a helper, inspect Python object memory, run machine-code stubs, alter a saved environment or repair caller controls. The GNU manual makes fenv representation implementation-defined, so this code fails closed outside its validated CPython/Linux x86-64 little-endian LP64/glibc2.41 ABI. Pointer/long/integer/double widths, IEEE double format and owned-storage size/alignment are checked. Public-header compiled tests independently verify size32/alignment4/control0/MXCSR28. [GNU public control API](https://sourceware.org/glibc/manual/latest/html_node/Control-Functions.html), [glibc2.41 x86 fenv declaration](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86/fpu/bits/fenv.h).

`fegetenv` is read-only at its public semantic boundary. The actual glibc implementation saves/restores x87 state internally while collecting x87 and SSE controls; tests compare snapshots before/after the call and after rejection. No application control repair is performed. [glibc2.41 fegetenv implementation](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86_64/fpu/fegetenv.c).

## Full store and codec guard

Store construction, connection creation, explicit migration, every inherited public readiness entry, typed query/history codecs, observed-size checks and open-store close/checkpoint require nearest rounding, all exception masks and DAZ/FTZ off. Ordinary sticky flags remain allowed and may be set by supported arithmetic/DB work. The immutable ABI binding alone is cached; current controls are read each time.

A rejected close leaves the connection open and does not roll back previously committed commands. Restore compatible controls before retrying cleanup or receipt lookup. Already-closed close stays idempotent, including after a later host-state change. The new tests use a temporary no-DB-entry sentinel to prove unsupported pre-entry rejection occurs before reads, writes or close, then restore the genuine connection and verify history/clock/receipts and persisted subnormal bits after real reopen.

The pre-existing transaction code is unchanged. Genuine native expression errors roll back staged assertions/retractions/clock/receipts in the same SQL transaction. Postcommit observed-size failure still carries `BudgetExceeded(committed_position)`; the no-engine test injects only that error (not a relaxed cap), checks the receipt and rejects duplicate replay.

## Limits retained

- Supported controls must last throughout connection/caller-codec lifecycle, including cleanup. No hostile midcall signal, callback, allocator or finalizer protection is claimed.
- Already externally decoded JSON may already have lost bits. A later caller `json.dumps` or float repr is not made safe by returning a dict. Compatible controls are the caller's continuing obligation.
- Pure carrier wrapping is not arithmetic; reconstructing a Value from a carrier still applies initial masks preflight.
- No-engine persistence remains real persistence with no optional native helper/evaluator dependency. Query/evaluated command without the trusted artifact explicitly raises NativeUnavailable and rolls back; there is no Python/SQL evaluator substitute.
- Legacy storage, schemas, migration format, root confinement, caps, old tests and migration_adapter were not edited. The same original 16MiB/512history/256commit/32operation/512byte limits remain admission/observed-size guards, not a process sandbox.
- These controls and tests do not certify arbitrary DuckDB clients, process crashes or production readiness.
