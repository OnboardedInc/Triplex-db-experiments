# Item 2 native read-only review

**Outcome:** no blocking defect found in the frozen native core within this review's bounded checks. This is a review result, **not item-2 acceptance or production certification**.

## Exact target and scope

- Contract: `/tmp/temporal-roadmap-research/iteration-02/CONTRACT.md`, SHA-256 `56c7b0c54670d95c4b012e925e8d931963951129663f49f94e58d6ed76950180`.
- Frozen six-file source: `native-implementation/checkpoint-first/`; its `MANIFEST.json` SHA-256 is `a13b681fb32ba19a3aeb90fffa264a0bb706b89d924bbe3b1dbc46666f665dec`. All six files are byte-identical to `checkpoint-final/src/` at final review read-back.
- Genuine loaded extension: SHA-256 `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`. Runtime independently returned DuckDB module `2.0.0`, SQL `v2.0.0`, loaded extension `temporal_datalog` version `0.3.0` (`runtime.json`). No loader/version bypass was used.
- A separate review-local O3 rebuild from the frozen core, unchanged binding source, existing actual-v2 headers and pinned production footer recipe was **byte-for-byte identical** to that extension (`extension-rebuild.sha256`). The build wrapper was not invoked, because it writes outside this review directory.
- This worker was tasked/configured as native Sol6.1 max, not Codex. That instruction is not independent runtime/model attestation; no hidden session paths were read. No Codex task or user computer was used.
- All writes, including builds and probes, stayed under this directory. No source, Git, PR, remote, Page, Site, or deployed-v1 mutation was performed.

## Review and independent checks actually run

The oracle and all review probes were authored in this directory without importing implementation tests or existing arithmetic/decimal/oracle corpora. The numeric oracle uses integer/Fraction operations and an explicit integer ties-even binary64 quantizer; the relational oracle is a naive whole-candidate positive fixed point, separate from the indexed semi-naive implementation.

| Check | Actual outcome |
| --- | --- |
| Frozen core build | Passed GCC 14.2, C++17 O2, `-fno-fast-math -frounding-math -ffp-contract=off -mfpmath=sse -msse2`, `-Wall -Wextra -Wpedantic -Wconversion -Wshadow -Werror`; no diagnostics |
| Independent main oracle | **6,134 passed**: 4,537 direct core + 1,597 actual-v2 binding observations (`oracle-results.json`) |
| Independent direct ASan/UBSan | Same **4,537 core observations passed**, no address/undefined-behavior diagnostics, `detect_leaks=0` (`oracle-san.json`) |
| Additional focused boundaries | **81 passed**: 27 normal core + 27 actual-v2 + 27 ASan/UBSan core, plus 3 subsequent good-call recoveries (`boundary-results.json`) |
| Fresh filter-free item1 differential | **2,400 passed**: exact successful typed rows, rounds, derived-facts and work against accepted item1; rejected calls compare normalized error classes, not full diagnostic text (`compatibility.json`) |
| Isolated FP-control children | **24 passed**, **6,042 explicit assertions**: independent x87/MXCSR rounding and masks, FTZ, DAZ and combined FTZ/DAZ, x87/MXCSR sticky flags, primitive identity/order/interning, nonfinite rejection, unchanged controls and rejected add/run retry (`fp-results.json`, `fp-children.json`) |
| Reproducible actual-v2 artifact | Review-local strict O3 rebuild equals the supplied extension exactly |

The main oracle includes 382 rational decimal tokens (including 20–95 significant digits and representable midpoint neighborhoods), 1,600 exact arithmetic cases, 300 expression trees checked at each intermediate, all 1,536 selected tag/operator comparison combinations, 64 arithmetic-tag cases, 540 naive recursive fixed-point/source permutations, and targeted late-fault delta-driver, compact lexer, structural/work and temporal endpoint probes. The quantizer additionally passed 10,000 random-bit round-trip attempts (nonfinite patterns skipped); those self-checks are not included in the observation total.

### Specific contracts inspected/probed

- Lexical signed MIN, compact `1-2`, `1+-2`, `1--2`, `1---2`, exponent signs, Boolean delimiters, computed unary and unsupported operators; expressions remain excluded from heads/atom arguments.
- Independent 16 positive atoms and 16 filters; FILTER-only AST node counting at 256/257 per rule and 4,096/over per program; comparison-inclusive height; combined unary/parenthesis syntax nesting; variable-63 grounding bit.
- Static literal errors behind empty joins versus dormant valid-literal arithmetic; filter-only seed evaluation; false does not guard a later fault; unreachable-rule faults; errors before seen/pending head dedup; late recursive candidates under each chosen delta position.
- Int64 node-by-node mathematical range checks, exact truncating division, MIN negation and MIN/-1; tagged arithmetic with no float coercion; finite binary64 operation rounding and intermediate overflow/underflow; valid subnormals and canonical zero.
- Bitwise finite admission, canonical zero, exact equality, monotone float order and typed interning under unsupported FP controls. Typed constructor/add/run rejection occurs before mutable admission/one-shot state; retries after restoring controls succeed.
- Borrowed strings point to stable unordered-map keys; expression values are copied inline onto a fixed stack, never interned. The height bound bounds left-to-right postfix stack occupancy. Source inspection found no per-candidate parse or expression-owned string allocation.
- Full FILTER AST precharge plus `ceil(sum UTF-8 bytes/64)`; false candidates still pay; new expression-budget exhaustion versus preserved old tuple-candidate work exhaustion. Measured logical counters are not wall-clock/allocation accounting.
- Filter-free compatibility and finite active domain: no expression-generated relation cell or recursive arithmetic domain.

## Preserved negative/setup results

1. Initial oracle marker extraction incorrectly selected the binding's outer `TD_E_EXEC` rather than its inner canonical marker. A second harness check treated a generic tuple-work failure's outer wrapper as a new class. Both were review-harness issues, not implementation defects. Original logs/observations remain in `setup-marker-parser-initial.*` and `setup-generic-wrapper-initial.*`; the fixed clean run is separate.
2. The first sanitized run completed every observation but LeakSanitizer aborted at process exit: **“LeakSanitizer does not work under ptrace”** (`asan.13`, `setup-lsan-failed.*`). Address/UB checks were rerun with leak detection explicitly disabled. **No leak-check pass is claimed.**
3. The workspace AGENTS reference paths `/workspace/shared/dot-cloud-skills/{repo-work,durable-work,qa-and-testing-in-dot-cloud-machine}/SKILL.md` were absent. Catalog repo-work/durable-work/software-engineering instructions were read instead, with this task's narrower read-only/write-directory scope retained.
4. A separate runtime-inspection attempt used DuckDB 2's removed relation `.fetchone()` convenience; the corrected probe uses connection `.execute(...).fetchone()` and its successful result is preserved. This did not affect the actual binding oracle, which already used the supported connection API.

## Limits and handoff

- Actual-binding sanitizer verification belongs to the separately coordinated final integration lane; this review's sanitizer evidence covers the direct frozen core, not DuckDB internals or the binding callback.
- This worker did not independently rerun the full browser reference, totalized SQL candidate oracle, persisted-store transaction/migration/rollback suite, all large batch/vector shapes, or full-path matched performance controls. Other lanes' reports are not represented as this worker's passes.
- These are bounded deterministic samples and source review on Linux x86-64 glibc/GCC 14.2/DuckDB 2.0.0. They do not establish other target support, exhaustive semantic proof, crash/cancellation safety, complete resource accounting, arbitrary SQL streaming guarantees, or production readiness.
- No timed performance comparison was run while parallel work was active; no performance gain is claimed. No SQL planner/pushdown feature or items 3–10 completion is claimed.

The useful next gate is the root's reconciliation of final actual-binding sanitizers, independent SQL/browser/store results and final-source full-path matched controls. This review found no production patch to request.
