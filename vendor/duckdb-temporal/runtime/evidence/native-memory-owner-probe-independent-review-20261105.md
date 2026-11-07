# Native memory owner probe: independent source review

Reviewed source `fd034365bf34a3c3509a8c4c445985f1bb84c703` (implementation
`1532bf5b`) on `codex/temporal-native-memory-owner-probe-20261105`. This is a
source-only review: no compilation, engine execution, test execution or artifact
qualification was performed. It is separate from the qualified production SDK
and the current SDK performance comparison.

**Result:** no source blocker to the proposed two-method actual-engine lifetime
gate. This instrumentation does not implement a shared byte budget or change
resource policy, result wire, native work counters or SDK transport.

## Ownership and unwind proof

- `native/src/temporal_datalog.cpp:1503–1519` creates one shared owner for an
  extension entrypoint and supplies it to the seven ordinary evaluator
  registrations. The optional allocation-diagnostic eighth registration is
  disabled by the proposed test profile. Each registration owns a different
  opaque `FunctionOwner`, avoiding a multiply destroyed raw pointer.
- `temporal_datalog.cpp:535–546,563–568` retains registration handles with RAII
  and transfers the wrapper only after `set_user_data` succeeds. The pinned
  DuckDB source `capi_v2_func_scalar.cpp:117–124,272–285,350–357` carries the
  opaque object through shared scalar-function metadata. Its
  `capi_v2_internal.hpp:919–962` destroys owned opaque data once; a null equals
  callback uses pointer equality, which is conservative for these distinct
  wrappers. Later registration failure releases local handles normally.
- `temporal_memory_owner_probe.hpp:55–85` copies the shared owner into each
  callback scope. The scope precedes input preparation, control acquisition,
  `Core` construction/import and synchronous borrowed encoding in
  `temporal_datalog.cpp:299–437`; reverse destruction retains the owner through
  those objects and error unwind. Wrapper destruction increments its counter
  before releasing its owner reference.

## Observation and build boundaries

`temporal_memory_owner_probe.hpp:17–27,87–102` provides 32 cumulative,
non-reused diagnostic slots, including destroyed owners; it is not a live
instance quota. Fields are independently atomic, not a coherent live event
snapshot. In particular, reservation increments `next_slot` before publishing
`slot.id` (`:35–41`), so live enumeration can temporarily include an unpublished
zero-ID slot. The authored tests enumerate after completed opens/loads and use
quiet/drained equality assertions. Capacity overflow and concurrent slot
publication are not yet qualified.

`node_control.cpp:41–76,124–148` reads the fixed diagnostic ABI through a symbol
resolved from the same pinned `dlopen` handle as control functions, without
querying the database. `build_native.py:15–18,34–56,72,80–83,92–95` keeps the
probe default-off, passes the same define to core and bridge, and records the
flag, source and artifact identities. Scheduled execution must still verify
actual paired bytes and the same-image counters.

## Authored actual-engine conditions and remaining gates

`adapter/test-native-memory-owner-probe.ts:60–171` constructs a real instance
with writer plus 16 readers and a separate two-connection instance. It invokes
all seven overloads, raw token zero and positive controls, repeated and
same-byte alias `LOAD`, `ATTACH`/`USE`/`DETACH`, prepared and materialized results,
cancellation, and final destruction. Sixteen connections do not establish
sixteen simultaneous native cores or controlled callbacks.

The second method (`:182–221`) uses an actual public 4096-value store, sixteen
calls, live cancellation and drained close, then exact original/copied reopen.
As corrected by `fd034365`, that isolated stage-two SDK always carries a control;
the raw method supplies token-zero coverage. The qualified production SDK
`8240cebc…` remains independently tokenless without signal/timeout.

Partial entrypoint failure/retry, registration replacement, 32/33-owner capacity,
and deliberately retained prepared handles beyond final instance teardown remain
unproved. Earlier functions can survive a later entrypoint registration failure;
therefore this initial source cannot establish one owner across partial-load
retry or justify a production shared quota. Retained-byte overlap/peak and
pre-LIST/compiler allocation containment also remain outside this lifetime gate.
