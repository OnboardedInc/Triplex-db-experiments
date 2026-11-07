# Item 1 typed core implementation checkpoint

Updated 2026-10-30 19:09 UTC. Work is isolated in the authorized implementation copy; original and frozen sources remain untouched. The coordinator owns all Git/PR/publication work. No Codex or user-computer action was used.

## Design

- Public legacy `temporal_core.hpp` is unchanged. Added the agreed `Value`, `ValueTag`, `TypedResult`, `TypedEngine` API in `temporal_typed_core.hpp`; its implementation is compiled through the existing `temporal_core.cpp` unit.
- One templated ID-only kernel serves separate legacy/typed policies. Tuple, seen-set, lazy-index, join and delta logic remains shared. Legacy parsing, byte-string admission and resource units remain separate.
- Typed values are owned and validated. Maps split string/int64/normalized-float identity but allocate from one execution-local uint32 namespace. Reverse entries retain only owned string-map key pointers or scalar payloads; rehash does not invalidate those keys. Failed reverse insertion rolls back its new typed map entry.
- Runtime parsing only; no AST cache, borrowed DuckDB handle, cross-query ID, global query state or retained snapshot answers.
- Typed dictionary admission charges `sizeof(reverse Entry)` per distinct value plus string bytes, with 300000 entries and 16 MiB limits. Typed output charges each outer row descriptor, each owning Value cell and repeated string bytes, capped at 16 MiB. These are explicit admission units, not complete allocator accounting. Legacy units remain unchanged.

## Verification so far

- Existing unchanged core suite passed: 500 nonlinear recursion trials and 10000 bounded legacy parser fuzz cases.
- Initial focused typed suite passed, including four-tag identity, strict literals, all eight positions, text validation, full int64, subnormals, positive-zero output, resource guards and owned-result lifetimes.
- Independent declarative golden corpus passed 20 answer cases and 8 native parser-rejection cases through the actual C++ TypedEngine. The 7 source JSON/clock adapter rejections are outside the C++ API and not claimed tested here.
- A focused decimal parsing probe produced the expected two halfway ties-to-even and near-underflow subnormal result under FE_TONEAREST/DOWNWARD/UPWARD/TOWARDZERO on GCC 14.2. These were added to the maintained tests.
- Final normal and ASan/UBSan campaigns both passed on the exact current source hashes: 515 focused checks, 200 independent mixed-tag graph closures under two rule permutations, 10000 typed fuzz inputs, the unchanged 500 nonlinear legacy oracle trials/10000 legacy fuzz inputs, 20 golden answers/8 parser rejections, and 12024 frozen/current comparisons matching rows, rounds, derived_facts, work and exact error text. Both reports contain 9 successful commands and empty stderr. ASan used detect_leaks=0:halt_on_error=1; UBSan used halt_on_error=1:print_stacktrace=1. LeakSanitizer remains unverified, not silently claimed passed.
- Historical helper-only compile failures are retained in `core-tests/normal-initial-helper-failure.*`, `core-tests/normal-second-helper-failure.*`, and `core-tests/sanitized-initial-helper-failure.*`: escaped #include path, then GCC coalescing identical pragma-once headers. None was an engine conformance failure. The corrected helper generates a distinct namespace-renamed header; final normal and sanitizer differential runs passed. An interrupted sanitizer attempt had no completed new report; the subsequent complete rerun is the final evidence.

## Paths and next gate

Normal results: `/tmp/temporal-roadmap-research/iteration-01/core-tests/normal/verification.json`; sanitizer results: `core-tests/sanitized/verification.json`. Final source hashes were rechecked against both passing reports after the sanitizer run; no source edits or pending test processes remain. The coordinator must still run genuine DuckDB C API v2 integration, legacy extension regression, independent JS/SQL comparisons, persistence/migration and full-path performance checks. Core passes alone do not complete item 1 or establish production readiness.

## Current SHA-256

```
58eaddcd16de74a6f61dc245b81683e5f752c81d332b758271fa295929ac2275  engine/src/temporal_core.cpp
870f946e1128fc109c1e3242cc0695fc01a5894eba67864dd14bd374b24c6658  engine/src/temporal_core.hpp
aada0f109eb42e4fd091baedf5cf1f00f8045b5d8b0a92b3bd458ff742b61d3d  engine/src/temporal_typed_core.hpp
987aaa9892fdbec72d63f656f0f3d893b09a632d5e7724a40f12f1d3b2fd2794  engine/src/temporal_value_domain.hpp
9828f6040b1eb78d135056f9eb27319cd014d7e5bbbb68de768207ad0096031d  engine/tests/test_typed_core.cpp
19f3415d19513e1aa6519191c45abd4bbbb61b77a25fd63f6c4ca778f65381bc  engine/tests/run_typed_core.py
```
