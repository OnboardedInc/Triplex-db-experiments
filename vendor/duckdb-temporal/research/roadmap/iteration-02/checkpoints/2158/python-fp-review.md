# Python FP hardening and verifier/export read-only review

**Result:** no remaining blocking finding in the reviewed FP changes. One inherited clean-export fixture defect was reproduced, reported, fixed by the coordinator, and independently verified closed. This is **not item-2 acceptance**.

This review is separate from the frozen native review. All review writes/tests stayed under `/tmp/temporal-roadmap-research/iteration-02/python-fp-review`; no production, Git, PR, remote, deployed Site, or native-review artifact was edited. Only a tiny test helper was compiled; no large build or timed performance comparison was run during the final SQL integration lane.

## Exact reviewed sources

The five storage files match `storage-implementation/SOURCE-MANIFEST.json` (SHA-256 `c8d1bbaf2eb48638e72e08edfbb7fe5df90a2c20207e7fa6265f843f59ca5dcc`) at initial and closing read-back:

| File | SHA-256 |
| --- | --- |
| `storage/typed_store.py` | `abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555` |
| `storage/fp_environment.py` | `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c` |
| `storage/tests/test_expression_store.py` | `343bdb64a24b94431393c19b49720b7be32f505d2bdf0059f2cd20c2bd674549` |
| `storage/tests/test_fp_environment.py` | `3544459f7a197a59233e5707dad279287326273436543f8a0312b16e13034598` |
| `storage/tests/fp_environment_helper.cpp` | `99e769a597fc51ce2fdfecbabb05fe50bf10ff836c703f57d87902b209612e9c` |

Coordinator files reviewed at close:
- `verify_expressions.sh`: `8c3cd0afd96e56fa77afb9bdb6865f4743bbb4ce881a15fb7731e1cc8af1f81d`.
- `verify_typed.sh`: `61f09f3144a01d33a7d3eda18c81b53798e2008f871f1e5d1eca4e94741e9b37`.
- Fixed `export_source.py`: `ca9675d08a79ee3760785751dcb78880482b2485c6d38f85e3ae8deead728b90` (initial reviewed version `274d935d0ab382a4dc3b7ba2e7d32551919c1e9104cd672b6a4ec21dd3f930aa`).
- Fixture-path-only `storage/tests/test_typed_store.py`: `f0382285323c8640eb1c60198550b3c5fdb70275986981bb84b72b2d567d34e8`.
- The eight self-contained synthetic JSON values and their original/copy hashes are independently checked in `export-fix-results.json`; closing source/fixture fingerprints are in `CLOSING-SOURCE-MANIFEST.json`.

## FP implementation assessment

- The production reader is explicitly ABI-bound, not a portable opaque `fenv_t` interpretation: CPython, Linux x86-64, little endian, LP64, glibc 2.41, IEEE binary64, declared buffer size/alignment. Unknown targets, unavailable bindings and failed/empty reads fail closed. Only the immutable function binding is cached; controls are reread.
- The pinned CPython wrapper compares a floating sentinel before entering the binary64 pack routine, while its admitted IEEE pack branch copies bytes. Masks-only preflight before initial extraction, followed by a canonical private integer-bit cache, is therefore a justified narrow boundary—not a claim that arbitrary Python float operations are safe. [CPython wrapper](https://raw.githubusercontent.com/python/cpython/v3.12.14/Modules/_struct.c), [binary64 pack implementation](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/floatobject.c).
- The public glibc structure and a separately compiled helper agree on size32/alignment4/control0/MXCSR28. `fegetenv` internally saves/restores the x87 state while collecting controls; “read-only” is its public semantic effect, not a claim of zero internal register writes. No application control repair is introduced. [glibc layout](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86/fpu/bits/fenv.h), [glibc reader](https://raw.githubusercontent.com/bminor/glibc/glibc-2.41/sysdeps/x86_64/fpu/fegetenv.c).
- Admitted f64 equality/hash/sort use cached integer bits, preserve strict tags/subnormals, canonicalize signed zero and avoid payload re-extraction. New exact-float construction rejects unmasked exceptions; masked DAZ/FTZ/non-nearest modes retain exact bits in the tested extraction boundary.
- Full store/codec readiness is stricter: nearest rounding, all masks, no DAZ/FTZ. Constructor, migration, connection creation, inherited readiness entries, query/history codecs, size inspection and open-store close reject before DB access. A rejected close preserves the open connection; a closed close remains idempotent. Restoring controls permits cleanup/retry, without pretending to undo previous commits.
- Root confinement, schemas, caps and transaction logic remain unchanged. Persistence remains possible with real DuckDB but without the optional evaluator; evaluated commands without that artifact explicitly fail and roll back. No Python/SQL evaluator substitute or production helper dependency was added.

## Independent checks actually run

| Check | Result |
| --- | --- |
| Independent child-only FP/identity/lifecycle probes | **15 child modes, 3,122 assertions passed**; 9 children used genuine no-engine persistence, rejection-before-DB sentinels, rollback, good retry and reopen |
| Independent target/binding/read/control matrix | **299 checks passed**; fake `fegetenv` writes only owned buffers, with no host FP-control changes |
| Tiny public-header helper | Strict warning build passed; independently confirmed target layout and restoration |
| Verifier command scheduling trace | 3 scenarios passed: normal scheduling, FP failure and explicit store failure; artifact/digest propagation, separate 3 storage suites, browser expression test inclusion, normal/sanitized core array paths and baseline arguments checked |
| Exact isolated exporter before fix | Reproduced missing sibling migration fixture dependency; original failure preserved |
| Exact isolated exporter after root fix | All 8 fixture/expected parsed values exactly equal originals; original/copy size and SHA checks passed; all are exported with provenance; synthetic `.so` sentinel excluded |
| Exported no-engine typed-store suite | **17 passed; 2 genuine-native tests explicitly skipped/unavailable**, 19 methods total. All four migration histories and 400 independent SQL storage snapshots passed. No native evaluation pass claimed |
| Test-logic comparison | AST comparison proves typed-store test logic unchanged after removing only the `PREP` assignment; storage implementation/schema/cap sources unchanged |

The verifier trace used command stubs only to inspect scheduling, arguments and failure propagation. **It is not an execution/pass of the complete verifier or its native/sanitized suites.** The full verifier was deliberately not run while the final integration lane owned heavy work. `TD_SANITIZE=1` schedules direct core sanitizers; the script explicitly leaves full-path sanitizer/performance/acceptance scope to separate records.

## Concrete finding and resolution

**Inherited clean-export fixture dependency (closed).** Original `storage/tests/test_typed_store.py:16/21/136` resolved sibling `test-prep/storage-contract` outside the exported root. `export_source.py` did not include that closure; a successful clean export then raised `FileNotFoundError` on `fixtures/rich_history.json` before any DB entry. Expected: the retained migration tests can find their synthetic inputs in a standalone export. Original repro: `inspect_export.py`, `export-probe.json`.

The coordinator copied the precise eight fixture/expected JSON values into `storage/tests/fixtures/storage-contract`, added original/copy hashes and provenance, changed only the test `PREP` assignment, and explicitly whitelisted that closure. Independent parsed-value, hash, AST, source-confinement and exported-suite checks passed (`verify_export_fix.py`, `export-fix-results.json`). No assertion/cap/path bypass was needed.

## Preserved setup/negative results

- One initial review-child SIGFPE came from **my probe's `struct.unpack` while constructing an argument before entering the guarded API**, with the SSE denormal exception unmasked. `setup-probe-unpack-localization.stderr` localizes it to the probe's `unpack` function and lambda. The initial script/logs are preserved. Correcting argument preparation to use the already-admitted payload yielded the clean 15-child pass; no production change was made for this probe error.
- The first verifier scheduling fixture omitted its synthetic `storage` directory; the copied script correctly failed on `cd storage`. Initial trace/logs are preserved separately. The corrected private fixture passed all 3 scheduling scenarios.
- The original export failure remains preserved separately from its successful fixed-export check. Two real-native methods remain explicitly unavailable in the no-engine exported suite; they are not hidden as passing checks.
- The first tool attempt selected a not-yet-created working directory and failed before execution. The directory was then created from an existing workspace; no production operation occurred.

## Remaining limits

The reviewed target is deliberately narrow. Supported controls must persist through the connection/caller-codec lifecycle. Externally decoded JSON may already have lost bits; later caller `json.dumps`, float repr, arbitrary callbacks/finalizers or hostile mid-call control changes are not protected. This review does not attest model runtime independently, prove exhaustive numeric/resource/crash safety, rerun the final native integration campaign, certify arbitrary DuckDB clients, establish full-path performance, or declare roadmap acceptance.
