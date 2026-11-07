# Primary-source notes and evidence map

2026-10-31 · source/text research only · all execution UNRUN.

## Local allowlisted evidence

Only the following five published candidate files were read; no included header outside this list was opened.

| File | Relevant line ranges | Finding / evidence limit |
|---|---|---|
| `engine/src/temporal_core.cpp` | 26–69, 98–123 | Fixed tuple bound, exact tuple hash/equality, rows plus authoritative seen, lazy ascending row-ID postings. Tuple allocator size was not measured. |
| same | 509–650 | Ordered whole-program safety validation; signed dependency SCCs; all-rule deterministic component scheduling. |
| same | 652–750 | Fact admission; validation before temporal visibility; separate positive/expression/negative charging; full-group actual exact membership audit. |
| same | 730–808 | Greedy positive joins; designated delta only; complete-candidate eager filters before head dedup; old delta-index row skip precedes charge. |
| same | 840–940 | Native output admission/sort; base/delta/final verification waves; all exported metrics; work reconciliation and FP return check. |
| same | 1390–1519 | Inspect-only owned filter export, schema and budget labels, bounded serialization. No compiler invocation was made. |
| same | 1522–1588, 1606–1625 | Tag-sensitive values, finite canonical float construction, error poisoning on entered add/run. Full dictionary/carrier internals excluded. |
| `engine/src/temporal_expression.hpp` | 12–16, 29–150 | Bounded postfix filters, checked type/arithmetic faults, strict per-node binary64 result checks, string surcharge, eager code evaluation. |
| `engine/src/temporal_stratified_core.hpp` | 7–35 | Result metric fields, one-invocation ownership, supplied history cut, no SQL/connection/caller-IR execution. |
| `engine/src/temporal_plan_ir_v2.hpp` | 18–70 | Owned inspect-only signed/filter IR and byte caps; compilation exports filters without evaluation/folding. |
| `engine/ITERATION-04.md` | 1–15, 47–54, 56–149 | Source-only status, selected operational obligations, host diagnostic/admission/FP cost model, explicit UNRUN execution. Published provenance pointers were read as document content, not checked through Git. |

The complete prefix for these paths is `temporal-roadmap-item04-20261031/candidate-001/`. Exact typed interning, inactive carrier slot treatment, and all host implementation details are contract premises outside this local audit.

## External primary sources actually relied on

All links were opened or returned with primary text by web research on 2026-10-31. Retrieval date is not a claim of latest dependency suitability. No source was downloaded into or imported by the project.

1. **Michael Arntzenius and Neel Krishnaswami. _Seminaïve Evaluation for a Higher-Order Functional Language_. POPL 2020, article 22.** [Author-hosted paper](https://www.cl.cam.ac.uk/~nk480/seminaive-datafun.pdf). Relevant §§2, 4, 6 and discussion: least fixed points, stratification, delta/derivative evaluation. Used for the set-semantics foundation, not current counter equivalence or transplanted speed results.
2. **Mihai Budiu, Tej Chajed, Frank McSherry, Leonid Ryzhyk and Val Tannen. _DBSP: Automatic Incremental View Maintenance for Rich Query Languages_. PVLDB 16(7), 2023.** [Publisher paper](https://www.vldb.org/pvldb/vol16/p1601-budiu.pdf). Relevant §§5–6: recursive queries and incrementalization. Used as future architecture context only; no maintained cross-call state is authorized.
3. **Pavle Subotić, Herbert Jordan, Lijun Chang, Alan Fekete and Bernhard Scholz. _Automatic Index Selection for Large-Scale Datalog Computation_. PVLDB 12(2), 2018.** [Author-hosted paper](https://psubotic.github.io/papers/p141-subotic.pdf). Relevant primitive-search/index-cover formulation and §7.2.4: data-structure tradeoffs depend on access pattern. The report does not assert its measured speed/memory results apply here.
4. **Soufflé project. _Rules_.** [Official docs](https://souffle-lang.github.io/rules). Relevant negation/grounding and query-plan sections. Illustrates the difference between usual declarative semantics and this candidate's stronger operational contract.
5. **Soufflé project. _Relations_.** [Official docs](https://souffle-lang.github.io/relations). Relevant representation/indexing sections. Multiple exact relation layouts are workload-dependent; not a warrant for a second current negative index.
6. **Differential Dataflow maintainers. _arrangement.rs_.** [Official crate source, rendered docs.rs](https://docs.rs/differential-dataflow/latest/src/differential_dataflow/operators/arrange/arrangement.rs.html). Introductory source comments explain shared indexing and completeness before reading logical times. Used as a design analogy, not current snapshot authority.
7. **Differential Dataflow maintainers. _Collection::antijoin_.** [Official crate API](https://docs.rs/differential-dataflow/latest/differential_dataflow/collection/struct.Collection.html#method.antijoin). Distinguishes relational set anti-join from general multiplicity arithmetic. The viewed docs identified crate 0.25.1; no crate was installed or adopted.
8. **C++ working draft. _Unordered associative containers_, `[unord.req]`.** [Editor-hosted draft](https://eel.is/c++draft/unord.req). General requirements and lookup/rehash/reserve entries: average versus worst-case complexity; rehash iteration effects. This is standards-level reasoning, not an inspection of the candidate's unbuilt standard-library binary.
9. **Abseil maintainers. _Swiss Tables Design Notes_.** [Official design](https://abseil.io/about/design/swisstables). Dense metadata, intra-lookup SIMD candidate filtering, exact equality and storage tradeoffs. No dependency recommendation, install, import, or performance extrapolation.
10. **Peter Boncz, Marcin Zukowski and Niels Nes. _MonetDB/X100: Hyper-Pipelining Query Execution_. CIDR 2005.** [CWI author manuscript](https://ir.cwi.nl/pub/16497/16497B.pdf). Vector primitives and cache/interpretation tradeoffs. No vector-size or timing number is imported into the candidate's cost model.
11. **Thomas Neumann. _Efficiently Compiling Efficient Query Plans for Modern Hardware_. PVLDB 4(9), 2011.** [Publisher paper](https://www.vldb.org/pvldb/vol4/p539-neumann.pdf). Data/code locality and compilation motivation. No compilation or JIT is authorized or executed here.
12. **Hung Q. Ngo, Ely Porat, Christopher Ré and Atri Rudra. _Worst-case Optimal Join Algorithms_. PODS 2012.** [Author-hosted paper](https://cs.stanford.edu/~chrismre/papers/paper49.Ngo.pdf). Multiway join complexity foundation. Does not establish an optimal bound for the current greedy evaluator.
13. **Todd L. Veldhuizen. _Leapfrog Triejoin: A Simple, Worst-Case Optimal Join Algorithm_. ICDT 2014.** [Conference paper](https://openproceedings.org/2014/conf/icdt/Veldhuizen14.pdf). Indexed multiway joins and its logarithmic-factor bound. A future different positive-work contract, not an approved replacement.

## Interpretation rules applied

- Local source facts, derived mathematics, unverified hypotheses, and future measurements are labeled separately in the report.
- Failed external fetches and secondary search-result summaries were not treated as technical evidence.
- No published benchmark value is used as an estimate for this candidate.
- Exact positive/negative/eager-fault prefix preservation is stronger than ordinary set-answer equivalence.
- A cache can mathematically retain billed numerical values under a redefined logical counter, but that does not satisfy today's no-cache/exact-probe mechanism or actual-check audit.
- Allocation/layout optimizations are not certified to preserve every resource-error prefix merely because successful rows match.
