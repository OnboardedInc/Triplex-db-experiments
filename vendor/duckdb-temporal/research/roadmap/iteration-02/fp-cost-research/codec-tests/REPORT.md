# Codec batch test research — CPython and bit-level equivalence

**Research/test specifications only, accessed 2026-10-30. No production patch is selected or accepted here.** This lane writes only its own `fp-cost-research/codec-tests` directory. Prior browser research/implementation releases remain untouched. The coordinator reports source checkpoint `8b14300c` / main `28cee096`; this lane verified the actual three Python source hashes below rather than independently verifying a remote commit.

## Findings and evidence

### 1. A float byte-copy wrapper still needs a preceding FP boundary

**Verified primary source:** CPython **v3.12.14** `bp_double` first obtains a C double and compares it with the error sentinel, then calls `PyFloat_Pack8`. `unpack_double` also checks a floating sentinel after unpacking. Consequently fixture construction with `struct.unpack`, as well as validation with `struct.pack`, belongs under masked exceptions. Do not create a minimum-subnormal or signaling-NaN fixture after unmasking and accidentally blame the candidate for the test harness trapping. [Pinned `_struct.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_struct.c).

**Verified primary source:** `PyFloat_AsDouble` directly reads float objects; other numeric objects can invoke conversion protocols. On the admitted IEEE target, Pack8/Unpack8 copy bytes rather than compute a new binary64 value. This supports exact-float bit extraction inside a freshly guarded private region, not permitting arbitrary numerics or skipping the region guard. [Pinned `floatobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/floatobject.c). The pinned struct documentation specifies IEEE binary64 for `d` and explicit endian conventions. [Pinned `struct.rst`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/library/struct.rst).

**Verified architectural evidence:** Intel Volume 1 **253665-093US, September 2026**, sections4.8.3.4/10.2.3/11.5, distinguishes quiet/signaling NaNs and MXCSR exception, rounding, FTZ and DAZ controls. DAZ treats subnormal input operands as signed zero before computations; FTZ alters the underflow response. Neither is a substitute for preserving subnormal wire bits. Both are incompatible with the selected gradual-underflow contract. Build fixtures before mode changes, examine controls by integer masks, and restore the saved environment before cleanup. This lane did not mutate hardware controls. [Intel SDM Volume1](https://cdrdv2.intel.com/v1/dl/getContent/671436).

### 2. Exact containers are necessary but not sufficient

**Verified primary source:** CPython `type(obj)`'s one-argument builtin path returns the object's actual type directly. Exact-type admission therefore avoids `isinstance`/protocol-based provenance inference for this private path. [Pinned `typeobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/typeobject.c).

An exact dict can still contain callback-capable keys. Its generic lookup can call rich comparison; its key iterator instead returns stored key objects. **Recommendation:** first require exact dict, then iterate only to check each key's exact `str` type, and only then compare the key set or perform field lookup. Never format a rejected object in an error. [Pinned `dictobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/dictobject.c). Likewise require exact lists before iteration, indexing or length; the builtin list iterator returns stored elements directly. [Pinned `listobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/listobject.c).

Exact strings use CPython's UTF-8 fast path, but the existing public store calls an overridable `.encode` on admitted string subclasses. Private rejection before such hooks must **not** narrow the public factory behavior. The ordinary-state probe verified the existing public subtype is retained and its ordinary contains/encode hooks still run. [Pinned `unicodeobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/unicodeobject.c). Bool is an int subtype, so tag and i64 checks must remain exact-type checks rather than numeric-subtype acceptance. [Pinned `boolobject.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/boolobject.c).

### 3. The private region does not mean “Python cannot reenter”

GC has application callbacks, and allocation schedules collection in CPython. Exact native carriers remove **data-dispatched hooks**, not every possible interpreter callback. Ordinary reentry must still call public factory/codec guards independently; no global, thread-local or context-variable checked flag is valid. Do not disable GC or silently label ordinary callbacks unsupported. A callback which changes controls and leaves them invalid in the middle of an unguarded primitive is not newly made safe by this proposal; the existing continuing-supported-controls limitation remains explicit. [Pinned `gc.rst`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/library/gc.rst), [pinned `gcmodule.c`](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/gcmodule.c).

## Local compatibility boundary

The local public `Value.from_carrier(...).to_json()` remains the reference for **valid exact native carriers**, augmented by independently specified raw-bit expectations. It is not the reference for accepting arbitrary private impostors. The store's existing 512 UTF-8-byte limit and NUL/surrogate rejection apply even though native terms allow 16,384 bytes. Returning a 513-byte native literal without that check would change the public boundary.

The private batch must preserve tag identity, selected nonnull payload and all unused fields exactly None, exact bool/int/float, signed64 range, finite binary64, actual-zero-only canonicalization, UTF-8 text domain/cap, order and no returned prefix after any late failure. No arithmetic, float coercion, Value initialization bypass, domain interning, partial iterator or exposed skip permission is needed. Public APIs keep their existing independent guards and accepted subtype semantics. Shared validation must remain one auditable source of domain/canonicalization rules, even if private provenance admission is stricter.

## Executed ordinary-state probe — not production acceptance

`probe_codec_spec.py` imported unchanged public sources and the admission lane's **research** `batch_prototype.py` (SHA256 `2ca1877e4b0979500b3e017ba2bb2631e8bb59396a91da511139dfb676ae3c93`). It used existing pinned DuckDB dependencies only to import the public module; it executed **no database calls**, native evaluator, benchmark or physical control writes.

Results in `ordinary-probe-results.json`: **PASS**, no failures.

- 16,376 finite patterns: both signs, every finite exponent field, four fraction boundaries. Public/prototype wire bits matched explicit integer expectations; both zeros canonicalized and all nonzero bits preserved.
- 59 explicit domain examples: signed subnormals/normal/maxfinite, both infinities and multiple signed qNaN/sNaN payloads, i64 boundaries, UTF-8/NUL/surrogate/512-byte cases.
- 480 complete carrier key insertion-order permutations.
- 84 nonnull-unused, 4 selected-null, 61 wrong payload-type, 9 wrong-tag and 18 container/key shape rejection cases; applicable rejected protocols recorded zero callbacks.
- Public ordinary str-subclass compatibility,256-cell late faults without returned prefix/input mutation, and owned output containers passed.
- The research prototype performed 2 fresh environment reads for 0/1/256-cell conversions. This is a call-count observation, **not** persisted speedup evidence or a requirement to delete other public boundaries.

The first command failed before tests because default Python could not import DuckDB. Its original log is retained. The successful command used `PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2`, `PYTHONDONTWRITEBYTECODE=1`, and Python3.12.14. No package was installed. The raw first/success logs and results are not overwritten by interpretation.

## Production obligations still unrun

`guard-transaction-specs.json` contains **199 SPEC_UNRUN_PRODUCTION** cases: 79 physical-control, 60 request-snapshot, 9 reentry, 15 external-return, 20 complete-envelope, 6 return-atomicity, 7 transaction/restore/retry and 3 compatibility specifications. `TEST-SPEC.md` defines the acceptance workflow.

The source proof obligation is wider than a guard inside `_query`: inherited `query` starts a transaction/reads position first, and evaluated `transact` stages writes first. An ordinary Query descriptor can then leave unsupported controls and a new guard can raise into an old handler which calls ROLLBACK under that state. **Recommendation:** materialize a single request snapshot before any budget/BEGIN/position/staging DB work; fresh full guard after callback-capable extraction and immediately before DB entry; fresh full post-fetch guard before any envelope protocols/float extraction; final guard before publication. Do not reread descriptors later. Keep optional known-at resolution against the transactional snapshot; avoid changing its range semantics.

A bad native-return state is a separate cleanup decision: detecting it does not prove ROLLBACK, COMMIT or close is safe. The coordinator must select and preserve an explicit taint/deferred-cleanup/reconciliation policy before tests can accept that path. If root retains the existing continuous-supported-host premise, this stronger bad-native-return cleanup guarantee can remain explicitly outside the selected scope; the codec optimization need not silently add a new taint lifecycle. Its defensive post-fetch rejection must still not be described as proving safe automatic cleanup. Query snapshots also do not prove safety against arbitrary TypedFact hooks or asynchronous midcall control changes. No host repair or bad-state retry is recommended. Under supported controls, late conversion failures must still roll back the full evaluated command and permit corrected whole-command retry; a postcommit budget error still requires receipt reconciliation, not a claim that the commit vanished.

The actual complete pinned fetch envelope and any exact-base-str request normalization must be frozen and tested on the selected implementation. The batch-theory peer independently located pinned DuckDB-Python converter evidence; its source-backed findings are in that lane, not claimed as a host probe here. The rows-only prototype does not prove root/fetch-envelope handling.

## Reproduction and evidence pins

```
PYTHONPATH=/tmp/temporal-datalog-20261030/engine/python2 PYTHONDONTWRITEBYTECODE=1 \
python3 -B probe_codec_spec.py \
 --source-root /workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation \
 --candidate ../admission/batch_prototype.py --output ordinary-probe-results-repeated.json
```

Public source hashes, before and after ordinary probes:

| File | SHA256 |
|---|---|
| storage/typed_store.py | abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555 |
| storage/fp_environment.py | facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c |
| storage/store.py | 10fe4928a74ac0230b07d4ea8871399651fcb82a54c43ffa94c47dfb350c6552 |

Primary-source pinning uses v3.12.14 source URLs, not moving 3.12 documentation (which now identifies 3.12.16). Version-specific rendered documentation fetches failed; pinned raw C/RST evidence was available. No claim is made that3.12.14 is the newest Python. `source-evidence.json` records locations/access dates and retrieval limits. `publication-manifest.json`/`SHA256SUMS` include text/source only, no binaries. Parent owns durable preservation and any implementation decision. **Production acceptance, DB rollback/retry integration, performance acceptance, UI and deployment are UNRUN in this lane.**
