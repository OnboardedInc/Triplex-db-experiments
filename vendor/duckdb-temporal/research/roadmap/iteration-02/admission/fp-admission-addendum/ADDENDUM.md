# Adjacent FP-admission addendum: Python values and DuckDB persistence

Research date: 2026-10-30 UTC. **Research/probes only; no production source changes or item2 acceptance claim.** This is separate from the already frozen28-file admission snapshot, whose manifest remains `569e306f800ee5bb674c7202b625c48bab0ddec2a3e6b29bb5473effba19b5ca`. An exact text/source-only copy is retained at `../frozen-revision-02/`. Nothing in that snapshot was rewritten for this addendum.

## Decision-relevant result

**Python Value bit-hardening alone is insufficient.** DAZ corrupts current value normalization/identity and JSON output, but the isolated raw DuckDB2.0 probe additionally loses tested positive subnormal values after persistence/reopen under DAZ. A row inserted before DAZ was enabled is also affected when the connection is closed under DAZ. A supported-host precondition must therefore cover storage/serialization boundaries, not only the native evaluator or the Value factory.

A read-only documented glibc `fegetenv` call is a viable **target-specific** detection route on this tested Linux x86-64 glibc2.41 host, without making persistence depend on the optional native engine. The saved `fenv_t` layout is implementation-defined, not portable Python/C ABI; its known size/offsets must be explicitly confined to this target and verified. Do not silently repair/change the host FP controls.

## 1. Safety and evidence boundaries

- All control changes occurred in isolated child processes with saved controls restored in `finally`. Twelve value/storage children and four guard children exited successfully and reported restored controls.
- The parent orchestration process did not load the control-changing helper or alter its FP state.
- The helper is ordinary inspectable C++ source using documented `_mm_getcsr`, `_mm_setcsr`, `_fxsave`, and public `fegetenv`. There are no executable byte stubs, generated machine-code memory pages, private Python-object memory pokes or production linkage.
- Every ctypes foreign function has declared argument/return types. Direct `fegetenv` writes only into an owned, correctly sized/aligned opaque buffer; decoding reads that owned public-API output, not private process objects.
- Only exact unmodified copies of the previously frozen four store/schema files were imported. Their copied storage ROOT and caps were not patched. The copied trusted-engine path was deliberately absent, so persistence without native evaluation was genuinely exercised. No engine-availability check was weakened or bypassed.
- All incidental artifacts stay under this addendum's own root; databases and spill files are children of `work/`. Only the source/text whitelist in its separate manifest is suitable for publication. The original source tree, Git/PR/Page/Site state and frozen research files were not changed by this worker.

Actual host: CPython3.12.14, Clang22.1.3-built interpreter, Linux x86-64, glibc2.41, DuckDB2.0.0. The helper compiler is the same available GCC14.2.0 toolchain used in the earlier standalone probe. These observations are not universal statements about all Python implementations or DuckDB versions.

## 2. Fresh primary-source basis

Intel documents DAZ as converting subnormal input operands to signed zero and FTZ as handling subnormal results without gradual underflow. This predicts why a numerical comparison can mistake a stored subnormal for zero even while moving its bits is safe. [Intel 2026 FTZ/DAZ guide](https://www.intel.com/content/www/us/en/docs/dpcpp-cpp-compiler/developer-guide-reference/2026-0/set-the-ftz-and-daz-flags.html), [Intel architecture manual](https://cdrdv2-public.intel.com/671436/253665-sdm-vol-1.pdf)

Python's C API explicitly describes bit-copy behavior for pack/unpack on IEEE-format platforms. The actual CPython3.12.14 source's IEEE `PyFloat_Pack8`/`Unpack8` branches copy bytes, while float rich comparison performs ordinary C double comparisons and float hashing delegates to `_Py_HashDouble`. Thus byte identity and numerical identity have materially different exposure to altered controls. [Python3.12 float C API](https://docs.python.org/3.12/c-api/float.html), [exact CPython source](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/floatobject.c)

The struct module defines its `d` interchange format as IEEE binary64. Dataclass equality/hash generation relies on its fields' equality/hash rather than providing special binary64 identity. In the tested Python3.12 family the generated equality compares field tuples; newer versions change that implementation detail, not the need to avoid unsafe float comparison semantics. [Struct documentation](https://docs.python.org/3/library/struct.html), [Python3.12 dataclasses](https://docs.python.org/3.12/library/dataclasses.html)

GNU libc documents `fegetenv` as saving the current FP environment, and cautions that `fenv_t` size/content are implementation-defined. The local public x86-64 glibc header explicitly contains x87 controls and MXCSR. We validated its size32/alignment4, control offset0 and MXCSR offset28 against compiled `sizeof/alignof/offsetof`, not a guessed ctypes bitfield layout. [GNU libc control functions](https://www.gnu.org/software/libc/manual/html_node/Control-Functions.html). Local header: `/usr/include/x86_64-linux-gnu/bits/fenv.h`, SHA256 `66736e50e7e29aca7293e465d7fbe0d3042d4b714987d6e86f8bcbcb4a95e823`.

ctypes documents shared-library calls, compatible types and declared signatures; the probe uses those supported mechanisms, not arbitrary addresses or object-layout inspection. [Python3.12 ctypes](https://docs.python.org/3.12/library/ctypes.html)

## 3. Value factory, identity, hashing and serialization observations

The probe constructs binary64 values directly from known bit patterns before changing controls, then compares independent byte classification with current typed-store behavior. Payloads include both zeros, two positive subnormals, the largest positive subnormal, a negative subnormal, the smallest normal and1.0; special-value finite classification is separately checked.

For positive minimum subnormal bits `0000000000000001`:

| Observation | Normal | DAZ | FTZ only | DAZ+FTZ |
|---|---|---|---|---|
| struct8 pack/unpack retains input bits | yes | yes | yes | yes |
| ordinary `payload == 0.0` | false | **true** | false | **true** |
| current Value factory payload | subnormal | **+0** | subnormal | **+0** |
| preadmitted Value equals zero Value | false | **true** | false | **true** |
| JSON dump of preadmitted float payload | `5e-324` | **`0.0`** | `5e-324` | **`0.0`** |
| JSON load of text `5e-324` | subnormal | subnormal | **+0** | **+0** |

The generated hash of the same preadmitted immutable Value changes from `5608900160533374013` normally to `-6348126469135965181` under DAZ, and returns to the former value after restoring controls. This is unacceptable for equality/hash stability and could invalidate membership in hash containers. Hash values themselves are process/runtime evidence, not durable identifiers.

`math.isfinite` still correctly classified the tested values in these runs. That does not save the current factory: the subsequent `payload == 0` is enough to destroy a valid subnormal. IEEE exponent-bit finite classification and magnitude-bit zero detection are state-independent in the observed struct8 path.

All32 finite-value pack/unpack roundtrips across the four control configurations preserved their bits. The pure integer-bit comparator distinguishes subnormal from zero in every configuration. Do not generalize this to struct's `f` format: binary32 conversion can perform FP operations; the relevant primitive is exact binary64 `d` packing on the declared IEEE host.

The JSON results establish two distinct upstream/downstream risks. A bit-hardened Value cannot recover a subnormal already lost by a caller's JSON decoder under FTZ, and returning a dict containing the correct float bits does not force a later caller's `json.dumps` under DAZ to retain them. A supported-host requirement must extend to caller-controlled wire encoding/decoding, or a separate bit-exact textual codec would be needed. That larger codec is not implemented here.

## 4. Raw DuckDB and genuine no-engine persistence observations

### Raw DuckDB

For each control configuration, the child opens a real file-backed DuckDB connection with one thread and bounded memory/spill settings, creates a DOUBLE table, inserts a subnormal while controls are normal, then enables the selected mode. It performs bound-parameter SELECT, INSERT and fetch, then closes under that mode and reopens after restoring controls.

Under DAZ and DAZ+FTZ:

- Bound `SELECT ?::DOUBLE` and immediate INSERT/fetch preserve the tested input bit patterns.
- SQL equality nevertheless considers the positive subnormal equal to zero.
- After close/reopen with normal controls, `tiny`, `tiny2`, `largest_sub` and even `inserted_normal` contain positive zero rather than the supplied positive-subnormal bits.
- The tested negative subnormal and smallest normal survive this particular path. **Do not claim every subnormal always disappears** or infer a complete compression root cause from these observations.

Under normal and FTZ-only controls, these raw persisted values retain their tested bits. FTZ remains unsupported under the selected contract because JSON parsing and arithmetic are independently exposed.

The tests demonstrate a persistence hazard in this pinned path; they do not establish the exact DuckDB internal phase responsible. This worker did not alter compression settings to obtain a preferred answer, file an upstream issue, or assert a universal DuckDB defect.

### Exact-copy TypedTemporalStore, without the engine

The child copies only unmodified store/schema files; `TRUSTED_EXTENSION` does not exist and `_native_ready` is false on both open and reopen. Ordinary `transact(..., evaluate=None)` still genuinely works and creates one receipt/position, preserving missing-engine persistence semantics.

Under normal/FTZ-only controls, a preadmitted subnormal and a Value constructed during the mode both reopen with their original tiny bits. Under DAZ/DAZ+FTZ, the newly constructed Value is already zero; after the command, raw stored payloads and reopened history are zero for both that row and the preadmitted-value row. There was no native evaluation for an evaluator guard to intercept.

Consequently, it is not sufficient to guard only `query()` or native constructor/add/run. The persistence wrapper must reject unsupported controls before entering DuckDB, including persistence-only paths, and must consider close/checkpoint lifecycle as well as mutation. The observation that a normal-inserted row changes when closed under DAZ is particularly important for the lifecycle contract.

## 5. Read-only glibc detection versus helper dependency

`readonly_fenv_prototype.py` demonstrates a helper-free detection option for the verified ABI. It calls public `libm.so.6:fegetenv` into owned aligned storage and decodes only the validated x87-control/MXCSR fields using integer operations. It does not restore, mask, clear flags or normalize the host environment.

Four additional child tests compare it against the compiled helper:

- Normal controls are accepted.
- DAZ, FTZ and DAZ+FTZ are rejected with `TD_E_EXPR_FLOAT_ENV`.
- Read controls exactly match the helper, and each read leaves MXCSR unchanged.
- All child controls are restored before exit. Existing sticky status bits are ignored by the predicate, as required by the common selected contract.

The tested predicate requires all six x87 exception masks and nearest rounding; all six MXCSR masks and nearest rounding; DAZ/FTZ off. This focused campaign does **not** test unmasked exceptions or independently changed x87/MXCSR rounding modes; the core campaign owns those dangerous-control combinations.

A bounded normal-state diagnostic ran five batches of10,000 guard calls, reporting approximately828–993ns/call on this host. This is only local prototype call overhead, not a full-store benchmark or speedup claim.

### Option comparison

- **Read-only fegetenv binding:** no new helper/native-engine dependency, so normal-state persistence can remain available when the evaluator artifact is absent. It is glibc/x86-64 ABI-specific; fail clearly on unsupported targets and verify header/layout assumptions. Do not present it as portable Python.
- **Small compiled helper:** lets the platform C compiler own layout and register details. It adds a separately packaged/trusted binary dependency; making this helper part of the optional engine would wrongly make persistence depend on that engine. No such dependency is introduced by this research.
- **Documentation-only precondition:** accurately narrows support, but does not prevent silent accidental corruption. An explicit early rejection is preferable on the declared test target.

Because a host can change controls between calls or during connection cleanup, an entry guard alone is not an absolute isolation guarantee. Document that compatible FP controls must remain in force for the connection's entire relevant lifecycle, including close/checkpoint and caller wire codecs. An error detected at close must not be described as undoing an earlier committed command. Do not silently clear DAZ/FTZ around operations: that would violate the selected rule not to alter caller state.

## 6. Proposed surgical direction and regression requirements

No source change is made here. A defensible bounded implementation direction is:

1. Make pure Python Value finite validation, zero canonicalization, equality, hashing and ordering keys use binary64 integer bits. Preserve exact payload/tag admission; no int/bool coercions. Explicit equality/hash methods must agree; replacing normalization alone leaves generated dataclass equality/hash and float sort keys exposed.
2. Add a target-explicit read-only supported-FP-state guard before store operations that can enter DuckDB or encode/decode values, independent of evaluator availability. Preserve normal-state no-engine persistence. Where public `from_json` converts a numeric int to f64, also require a supported environment before that conversion or separately specify a bit-exact converter.
3. Keep native entry guards too: Python protection does not protect callers of the C++/SQL binding directly.
4. Explain the lifecycle/caller-codec precondition and error boundary. Do not claim earlier corruption can be detected or repaired when the received payload is already zero.

Proposed acceptance fixtures, in isolated children:

- Under DAZ/FTZ, bit-level finite Value construction/identity/hash/sort retain exact tagged semantics or explicitly reject according to the selected primitive contract; no silent normalization to zero.
- A preadmitted tiny Value retains equality/hash stability when controls change; subnormal and zero never become equal as language values.
- Persistence-only open/transact/history/close paths reject unsupported controls before the unsafe DuckDB operation, while the same cases under normal controls commit/reopen without an evaluator artifact.
- Restore controls and prove the rejected command did not advance receipt/clock/history; do not blanket-classify an already committed close/checkpoint failure as rollback.
- JSON text decoding/encoding under unsupported controls is rejected at the supported text boundary or explicitly outside the interface's supported-host contract; no false claim that a later Value validator can reconstruct lost bits.
- Verify public fegetenv read-only behavior, target/layout checks, normal-state sticky flags and native/Python guard parity. Keep independent dangerous-control tests in native child processes.

## Reproduction and publication

Compile only the own-path research helper, then run the two child drivers with the existing pinned module path. The helper and incidental DBs are excluded from publication:

```sh
export BASE=/tmp/temporal-roadmap-research/iteration-02/admission/fp-admission-addendum
export TMPDIR="$BASE" PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2
c++ -std=c++17 -O2 -shared -fPIC -Wall -Wextra -Wpedantic -Werror \
  -fno-fast-math -ffp-contract=off "$BASE/fp_controls_probe.cpp" \
  -o "$BASE/fp_controls_probe.so" -lm
python3 -B "$BASE/run_fp_admission_probes.py"
python3 -B "$BASE/run_readonly_guard_probe.py"
```

The report, sources, drivers, textual probe outputs and separate manifest are useful preserved evidence. No source hardening, full FP safety guarantee, item2 acceptance, crash recovery or production readiness is claimed.
