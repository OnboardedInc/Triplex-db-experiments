# Independent reader-only correctness acceptance

2026-10-31 UTC. **PASS within the bounded checks below; no performance claim and
no roadmap-item-2 acceptance.** Two QA-harness failures are retained separately,
with explicit parent authorization before each distinct correction/run. No
application defect was established and no application source was edited here.

## Exact candidate and independent inputs

- Immutable candidate: `residual-reader-implementation/candidate-01/source`.
  All268 source entries were checked; all264 nonowned files match immutable
  `candidate-snapshot-ffc524` byte-for-byte.
- EXPORT-MANIFEST SHA-256:
  `f90aeb568221184c8a858bb6f639659df77ba9dad67994dd22e91b3b3b9e1130`.
- Reader SHA-256:
  `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164`.
- Protected manifest SHA-256:
  `09bac71770a43fbcbe150b33a5c83015e9f7c92e7654f414348e5298d7eedc69`.
- Final independent harness SHA-256:
  `0c695795406dd3bafe71f0377304ad5e3a1e4453b739615e97fc3b9955183f31`.
- Genuine original normal-a native artifact:
  `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`.
  No engine rebuild, working-artifact overwrite or fallback occurred.
- Actual runtime: ordinary/assertions-enabled CPython3.12.14, Linux x86-64,
  little-endian LP64, installed glibc2.41; genuine DuckDB2.0.0 from the supplied
  `/tmp/temporal-datalog-20261030/engine/python2` path.

The existing pre-change test helper was copied byte-identically and extended only
in this lane with installed public-header layout/oracle functions. It independently
uses public `fenv_t`/`fegetenv`, not the candidate's ctypes decoder. Public
`femode_t`/`fegetmode` supplied an additional independent direct observer. Both
old and new layouts were statically asserted by the C++ compiler. This is a
test-only helper, not a new production dependency.

## Actual terminal outcomes

`run-03` completed at00:22:30 UTC, controller exit0. All84 launched records
(one oracle compilation, four correctness groups,79 isolated control children)
have exit0, no signal and no timeout. Session27399 was reaped. Supplemental
session27097 terminated exit0 at00:24:32 UTC. All earlier failed processes were
also reaped. Assertions stayed enabled. Full candidate source pre/post manifests
and selected native bytes remained identical.

### Independent unit and source checks: PASS

Ten independently authored unit groups cover:

- Public mode layout8/alignment4/offsets0,2,4 and unsigned ushort/ushort/uint fields;
  correct libm/public symbol/argtypes/restype and immutable binding caching.
- Every existing target check, every scalar width, bad mode size/alignment and
  independently isolated bad descriptor offsets; rejection before library load.
- Missing library/symbol, argtypes/restype assignment errors, four positive or
  negative nonzero returns, raised read exception and preserved exception causes.
- Raw `Controls(x87_control,mxcsr)` exact Python integers, unsigned edges, raw
  zero-output return versus rejection by both public predicates.
- Every mask bit, independent rounding, FTZ/DAZ, admitted sticky/ignored precision
  bits and unchanged mask-only versus full-support distinction.
- Distinct live owned buffers, recursive observer independence and a fresh failed
  observation after a successful guard; no successful-state permission cache.
- Mask preflight before float packing, public Value constructor signature/subtype
  setter and immutable integer identity, initial/final private codec guard
  priority, and independently rejected nested public calls inside conversion.
- Existing owned-record allocation exception boundary (MemoryError before the
  read-translation try) retained rather than silently broadened.

Mocks above are synthetic unit/negative controls, **not native-engine passes**.
`STATIC-COMPATIBILITY.json` additionally establishes unchanged ASTs for Controls,
FloatEnvironmentError, `_failure`, require_masked and require_supported; all11
preexisting target checks remain in order. Typed store and legacy source remain
byte-identical, including every guard position, original caps and confinement.

### Real FP observation and isolated controls: PASS

-128 default public-env → candidate → public-mode → public-env observations,
  complete returned CW/MXCSR parity and no observed control change.
-79 fresh isolated children:64 independent x87/SSE rounding × FTZ/DAZ cases,
  12 individual unmask bits and3 sticky combinations. No retries/dropped children.
-All79 matched independent public-header oracles, preserved control bits and
  restored saved public environment words in `finally` before JSON output.
-Initial Value admission stayed mask-only; unsupported full predicates rejected.
  Previously admitted identity/hash/order remained integer-only. Finite bit
  identities and signed-zero/nonfinite admission boundaries remained intact.
-Zero DB/native-engine calls occurred in the control children. All floats/Values
  and helpers were prepared before unmasking. No controlling-process setter ran.

The immediate observer comparison uses full CW/MXCSR words; the later comparison
spanning public Value processing excludes **only** MXCSR low0x3f sticky flags.
The final diagnostic's default case observed CW895 unchanged and MXCSR8064
before/immediately after observation, then8067 after Value processing: only sticky
XOR0x3. Across79 children, sticky XOR counts were0x3×35,0x1×32,0×12; observed x87
status XOR was0 in all79. These observations do not strengthen the ISA contract
into whole-fenv equivalence. Analysis and all per-child records are retained in
`run-03/CONTROL-OUTCOME-ANALYSIS.json`.

### Actual trusted native/store lifecycle: PASS

Exact unchanged source copies computed their own natural storage ROOT and fixed
engine/build path. Native480456 was hash-checked and copied; no ROOT/cap bypass,
native fallback or Python evaluator substitution occurred. Genuine tests covered
open, query/query_json, evaluated transaction, staged native divide-by-zero and
work-budget rollback with no returned partial prefix, retry-free receipt
inspection, reopen, duplicate-command protection and32-operation cap rejection.

| F64 result cells | Shape | query reads | query_json reads |
|---|---:|---:|---:|
|0 | empty |6 |7 |
|1 |1×1 |6 |7 |
|16 |16×1 |6 |7 |
|256 |256×1 |6 |7 |
|1024 |128×8 |6 |7 |

Returned f64 bits/order were checked exactly. All fixtures obeyed original
MAX_FACTS512, MAX_OPERATIONS32 and MAX_COMMITS256. No elapsed-time result is used
as performance evidence.

### No-engine and selected compatibility: PASS

Without an optional artifact, real persistence/reopen preserved subnormal bits;
query/query_json/evaluated transact explicitly raised NativeUnavailable, with no
committed failed evaluation or receipt. No substitute evaluator was installed.

Two additional unchanged frozen tests were independently executed, not the full
batch suite: private initial/final guard and actual GC/reentry test, plus all18
query/query_json/transact × six-field getter-close cases. Both passed in a new
owned no-engine copy, with unchanged source hashes. See `supplement-01/`.

## Retained failures, not hidden reruns

1. **Run-01 QA setup failure:** harness incorrectly asserted MAX_COMMITS32.
   Immutable baseline actually preserves256. Source gate and oracle compilation
   passed; unit/hardware/DB/native tests were UNRUN. Parent explicitly authorized
   only the literal QA assertion correction in a new run directory. Original
   harness, traceback, exit1 and provenance remain unchanged.
2. **Run-02 QA overconstraint:** four bounded groups passed; first default control
   child passed immediate oracle parity and Value checks, then failed a whole-
   MXCSR comparison spanning Value/struct.pack processing. Its final words were
   not printed and are **not reconstructed**. Finally restoration completed.
   Remaining78 controls were UNRUN. Parent explicitly authorized only a final
   control-bit comparison excluding documented stickies and post-restore word
   diagnostics, producing distinct run-03. Original failure and passing receipts
   are retained. New diagnostics support the sticky explanation only for the
   distinct corrected run.

Each approved harness diff/hash is retained; no application fix, favorable sample
dropping, automatic retry or overwrite of the failed runs occurred. The primary
source cache was hash-verified while held: pinned CPython's big-endian double
packer compares a floating sentinel before Pack8, explaining why representation
admission can affect sticky status. Source/retrieval limits are preserved too.

## Explicit UNRUN / limits

-No macro latency/profile study, residual-cost acceptance or roadmap-item-2
  acceptance. Root's two strict ordered comparisons and aggregate gates remain
  separate. Item3 is not opened by this report.
-This lane did not independently run all56 old FP children, full115 batch/request
  suite, all13 expression-store groups, all26 migration groups, full legacy23,
  typed presence/absence aggregate, browser/core/sanitizer/repro-build verifier.
  Only the exact gates above are claimed.
-Lost-ack/postcommit budget-failure injection is UNRUN independently; native
  duplicate receipts/rollback/reopen are not mislabeled as lost-ack coverage.
-No separate direct full-fenv controlling-process before/after equality snapshot
  was collected. The controller imported no application and made zero FP setter
  calls; all hardware setters were in reaped child processes. The independent
  child restore assertions and parent owner's separate controls gate are distinct.
-No whole-x87-fenv architectural preservation, hostile-mode atomicity, callback
  freedom, protection from arbitrary corrupted native callees/finalizers or
  signal-fault recovery is promised. FNSTCW C0–C3 remain undefined. Continuous
  supported controls/trusted callees, restore-before-cleanup and caller JSON
  codec obligations remain unchanged.

This lane performed no Git/PR/Page/ref/deploy action. Root owns durable private
checkpoint integration and any later coherent source/performance release.
