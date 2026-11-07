# Independent source-only packaging review — final closure on integration 003

2026-10-31 UTC. Reviewer: `iteration04_binding_review`. This packet is separate
from, and does not modify, the frozen native binding review.

## Conclusion and exact identity

**No unresolved source-packaging blocker identified on frozen integration 003.**
The two initial findings—symlink-parent admission and imprecise local/Git mode
prose—are resolved by the coordinator-owned correction. This is static source
review, not an exporter/test/fixture/generator execution result or release proof.

Final source receipt:
`f9aa92c7a1b2fe8688febe06b3ad1a435ea9c1d30886146dfd28ffb74fcc2ce8`.

| File | Bytes | SHA-256 |
|---|---:|---|
| `export_source.py` | 4560 | `b254d36e5adc04597d30b6431e2a7ab9b110ba08efb11f7d6e5786173bdc0a56` |
| `engine/tests/test_source_export.py` | 7365 | `7ab0f57461bf4a9c1d3bdf42efe4c0569b21da38008f26e738801c900fa16a89` |

Independent source SHA-256, byte length and Git-blob SHA-1 computations match the
receipt. Both current candidate files equal their frozen copies and are regular,
non-symlink files with filesystem mode 0644, consistent with Git mode 100644.
The immutable local baseline files are 0444; published Git mode 100644 is a
separate coordinator-proven source52 identity, not inferred from local 0444.

## Findings and resolution

### R1 — Directory/ancestor symlink selection: CLOSED by source inspection

The original helper checked only leaf symlink status. An added source folder
could therefore be a directory symlink and cause ordinary outside leaves to be
selected. The current snapshot's actual directories were real, so this was a
policy gap rather than an observed leak. The initial evidence is retained in
`INITIAL-REVIEW-EXPORT-002.md` and `STATIC-REVIEW-CHECKS.json`.

Revision 003 adds `source_path_allowed` (`export_source.py:11–21`): it rejects
paths outside lexical ROOT, rejects `..`, walks components from canonical ROOT
and rejects a symlink at any component. `matching` checks its base **before**
glob enumeration (`25–30`). Both explicit `choose` paths and matched leaves
check the guard **before** `is_file()`/selection (`22–30`). No resolution of a
rejected outside path is used as an admission fallback.

This closes the identified base/ancestor/leaf selection gap under a static,
trusted-source filesystem premise. It is not a hardlink/provenance or adversarial
concurrent-filesystem sandbox; the snapshot can still change between checks and
copying. Those stronger guarantees are not claimed.

Separate proposed regression methods now represent a symlinked stratified base
and a symlinked `engine/tests` ancestor (`93–125` in the test source). By static
reasoning, each setup reaches the corrected base guard before its outside
sources could be enumerated. The tests check manifest exclusion, absence of the
corresponding exported folder, and unchanged outside bytes. They are **UNRUN**.

### R2 — Mode provenance wording: CLOSED

Revision 003's `RESEARCH-AND-CORRECTION.md` distinguishes candidate/frozen 0644,
intentionally immutable local baseline 0444, and the prior source52 manifest /
remote evidence for Git 100644. The earlier 100755 metadata assumption and the
002 wording are retained as historical records. No actual file mode change was
performed by this reviewer.

## Policy closure and preservation checks

- The original 002 exporter delta is exactly the explicit
  `engine/ITERATION-04.md` whitelist item plus one nonrecursive stratified rule:
  `*.cpp`, `*.hpp`, `*.py`, `README.md`. No fixture JSON or nested-helper admission
  is introduced. Existing `engine/src/*.hpp` already covers the new native
  headers; that wildcard remains unchanged.
- Independent exact reconstruction shows 002→003 changes only the new path
  guard and its explicit/matching call-site checks. Existing whitelist contents,
  output/manifest/hash/zip code and nonrecursive stratified patterns otherwise
  remain unchanged. The guard also tightens inherited choose/matching paths;
  this coordinated change was explicitly authorized for R1 closure.
- In the new stratified scope, `.so`, `.duckdb`, `.log`, raw `.json`, `.env` and
  generated nested source are not selected by these filename patterns and
  nonrecursive traversal. Leaf/base/ancestor symlinks are checked before
  selection. This does not ban every source-looking generated file or every
  JSON/log elsewhere: unrelated existing evidence whitelists remain intact.
- Metadata-only inspection found the eight current top-level QA source files
  are regular/non-symlink and matched: seven `.py` files and `core_driver.cpp`.
  `README.md` was absent at that observation; the rule admits it when the QA
  owner releases it. This review does not certify an unfinished QA source
  packet's dependency/release completeness or a generated export's contents.
- All five original method ASTs remain unchanged: `setUp`, `write`,
  `run_export`, and the two original test methods. There are five methods,
  not five original test cases. All methods already present in 002—including
  the added closure/exclusion method—also remain AST-identical in 003.
- Removing only the two new directory-symlink test methods from 003 reproduces
  the entire 002 test module AST. Relative to source52, the only test additions
  are `STRATIFIED_FILES` and those three proposed test methods.
- The closure test continues to check exact manifest membership, source byte
  lengths/hashes, and actual destination file-set equality; its synthetic
  source filenames exercise the allowed extensions without needing to equal
  the real QA inventory.

## Independent primary crosscheck

Python's official docs describe relative-path checks as lexical and file/directory
checks as following their targets. This supports the original gap distinction.
See [official pathlib documentation](https://docs.python.org/3.12/library/pathlib.html#pathlib.PurePath.relative_to).

The [tagged CPython 3.12.14 pathlib source](https://raw.githubusercontent.com/python/cpython/v3.12.14/Lib/pathlib.py)
independently confirms that `relative_to` is lexical, `is_symlink` checks lstat,
and glob's base selection uses directory checks. These sources were read, never
executed or installed. The live documentation rendered patch version 3.12.16;
this is not a claim that the project/runtime was upgraded or run.

## Evidence and unrun gates

`CORRECTION003-STATIC-CHECKS.json` contains the exact delta/AST/hash/mode checks.
The earlier checker command's reviewer-local syntax typo is logged; it failed
before any project code execution and was corrected only in the review command.
`READ-IDENTITIES.json` identifies every source/receipt input relied upon;
`FINAL-READBACK.json` and `REVIEW-EVIDENCE-MANIFEST.json` freeze final identities.
The previous binding review manifest remains
`98fc91cc3fab92347f1e3f940ed381a4d05d43b989a77bf20a03973516ee0781` unchanged.

Only shell text/metadata inspection, independent Python standard-library
AST/hash/diff/stat work and read-only primary web research were performed.
Neither the exporter, tests, fixtures, generators, project modules nor the new
helper was invoked/imported. No project subprocess, native/module load,
compiler/build/database/oracle/runtime, FP/control/limit change, Git/Page
mutation, Codex task, source edit or background process occurred. No stopped
item-3 material, later staging/controller or denied session path was inspected.
Original source owners retain writes. Actual export/test closure and any later
publication/execution campaign remain separately gated and **UNRUN**.
