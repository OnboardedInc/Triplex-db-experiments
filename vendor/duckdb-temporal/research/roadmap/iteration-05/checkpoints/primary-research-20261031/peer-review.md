# Item 5 independent research peer review

Revision 001. Authored 2026-10-31 UTC. Source-only review, not a selected contract or an acceptance result.

## Verdict

The three new research packages are useful and broadly consistent. Their central distinctions survive independent review: full-tuple set support is not DISTINCT-by-measure; an exact scalar result needs a completed-source barrier; an explicit empty global group differs from an observed group; and exact-final checked sum is not a narrow checked-prefix fold. The proposed conservative N1 direction is coherent, provided the remaining decisions below are resolved before code.

Carry four additive corrections or qualifications into any synthesis: the numeric headline's 80-bit wording; the qualification that HUGEINT is the default registered BIGINT sum state rather than the only possible optimized state; the missing floating/Kahan registration locator; and the omitted coauthor of the historical aggregation article. None invalidates the exact-i64 bound or selects an implementation. The originals must remain unchanged.

Items 3 and 4 and dependent held native syntax remain HOLD. Item 4 remains incomplete; item 4.1 is separately researched and untested. Every empirical compiler, native, database, oracle, test, benchmark, ownership, spilling, compatibility and performance result remains UNRUN.

## Reviewed evidence and limits

The local review inputs are exactly the eleven allowlisted files in the three new revision-001 packages. The parent later separately allowlisted its coordinator SYNTHESIS-DRAFT.md, read once for the bounded addendum below. No held implementation, stopped save, original project code, old command, or prior admission payload was read or reconstructed in this lane. Private-project implementation statements remain attributed to the new reports; I did not independently fetch that older project source.

Fresh public primary-source checks covered the pinned DuckDB v2 header/bridge and spill path, its integer/floating sum code, the reported upstream issue, three aggregate-semantics papers, and selected arithmetic/official-documentation references. The bibliography additions give exact locators and limits. Public code reading is static evidence, not evidence about any installed runtime or executed plan. Paper measurements are not this project's measurements.

## Additive errata and source precision

### E1 Correct the numeric headline to 80 magnitude bits

The numeric report's first finding says the 100,000-contribution bound needs “fewer than 80 magnitude bits.” That wording is false. Since 2^16 < 100000 < 2^17, the magnitude of 100000 copies of i64_min lies strictly between 2^79 and 2^80. It therefore requires 80 magnitude bits, not fewer. The report's body correctly says 80 magnitude bits plus sign, or a signed 81-bit two's-complement representation, suffice. Its signed-128 conclusion remains sound.

Suggested additive replacement: With at most 100,000 contributions, every exact partial total has magnitude below 2^80; 80 magnitude bits plus sign suffice, and a proved signed-128 representation is ample. This is a mathematical bound, not a claim that such a type is available or has been tested.

### E2 Qualify the BIGINT sum state claim

The numeric report's section 7 should distinguish the default registered implementation from possible optimized implementations. At the declared pin, ordinary BIGINT sum is registered with a HUGEINT state and HUGEINT result. The same file also defines a BIGINT sum_no_overflow variant with int64_t state and HUGEINT result, and the statistics propagation callback can substitute that implementation when its bounds prove the narrow state safe. Consequently, the public result-widening claim is supported, but the unconditional physical-state reading is too strong. No particular query plan or substitution was observed. [Pinned sum registration and statistics substitution](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L286-L449)

Suggested additive replacement: The default BIGINT sum registration uses HUGEINT state and result; source-level statistics optimization can choose a proved-safe narrow internal state without narrowing the public result. A native i64 result still requires its own specified final range check.

### E3 Extend the floating and Kahan registration citation

The numeric report's section-7 binding/output citation stops at sum.cpp line 545. That span does not cover the DOUBLE sum and Kahan registrations supporting the adjacent DOUBLE-input/output claim. Add a citation to lines 548–585. The helper's Kahan constant-update multiplication is in lines 143–153, beyond the narrower 20–143 helper anchor in the report. The claims themselves are supported; their precise source anchors should be extended. [Pinned registrations](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L548-L585), [pinned Kahan helper](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp#L143-L153)

### E4 Complete the historical article attribution

Performance bibliography D9 credits Hannes Mühleisen alone. The official article credits Hannes Mühleisen and Mark Raasveldt. Its historical/contextual evidentiary status is otherwise correctly limited. [Official article byline](https://www.duckdb.org/2022/03/07/aggregate-hashtable)

These are additive corrections for later synthesis or an errata note. They do not authorize editing the frozen reports.

## Independent mathematical checks

### Integer bounds and exact final range semantics

Let L = -2^63 and U = 2^63-1. A prefix or disjoint partial state covering n admitted i64 contributions satisfies nL <= S <= nU. If n <= 100000, then |S| < 2^80. A signed-128 implementation can therefore avoid wide overflow under the cap, regardless of visitation order, provided it widens before arithmetic, implements conversion safely, and never merges a state whose combined count exceeds the cap. The final public i64 check is separately L <= S <= U.

The theory package's broader sufficient premise n <= 2^64-1 is also sound: its negative extreme is -2^127+2^63 and its positive extreme is below 2^127. This is not a need to permit such cardinalities. The proposed 100,000 cap is a far smaller design choice.

The distinguishing fixtures are correct. [U,1,-1] has exact total U; a narrow checked fold in that order fails. [L,-1,1] similarly has final total L. [L,U] totals -1. Returning a widened SQL scalar, narrowing after each update, or changing to floating arithmetic after overflow would each implement a different policy.

For full-tuple sets, partition combination additionally requires disjoint contributor sets, or a preceding uniqueness guarantee. Associative arithmetic does not license summing the same source fact in two partial states. Counts and type summaries must travel with any admitted partial state. This is a proof obligation, not a claim that a combine implementation exists.

### Floating bound and overflow midpoint

The numeric report's fixed-point proof checks out. Every finite binary64 input is a multiple of q = 2^-1074. With M = 2^1024-2^971, M/q = 2^2098-2^2045. Fewer than 2^17 inputs give an exact integer coefficient with magnitude below 2^2115. Thus 2115 magnitude bits plus sign suffice under the proposed cap; the 34-limb illustration is adequate but is not an observed layout or physical-size claim. Exact accumulation and one final rounding are distinct from an ordinary fold. [Neal's primary superaccumulator construction](https://arxiv.org/html/1505.05571v1)

The overflow-midpoint examples are also correct under binary64 round-to-nearest/ties-even. The spacing at M is 2^971. The exact total M+2^969 is below the midpoint and rounds to M; M+2^970 reaches the midpoint toward the next binade and rounds nonfinite. Therefore “exact total exceeds the largest finite value” is not equivalent to “rounded result is nonfinite.” These are hand derivations, not executed reference results.

The sum-only subnormal observation is valid too: a nonzero exact integer multiple of q cannot have magnitude below q. If the total lies in the subnormal range, that multiple is representable; cancellation to zero is not arithmetic underflow. This does not rescue a contribution expression that already failed its scalar multiplication/division or other per-node checks.

Deferring f64 sum is sensible for this slice. Reproducibility, an error bound, exact state, correct rounding, and prefix finiteness must not be treated as synonyms. MPFR's correctly rounded mpfr_sum could be a later independent reference only with explicit binary64 range/subnormal conversion; precision 53 alone does not establish that adapter. No MPFR or other reference was run. [Official MPFR representation and arithmetic contract](https://www.mpfr.org/mpfr-current/mpfr.html#Arithmetic-Functions)

## Set support and grouping

N1 gives an unusually clear contribution identity: R is an already completed relation, and every distinct full tuple of R belongs to exactly one group. Two tuples with equal measures still contribute twice; two proofs or physical copies of one logical tuple do not create a second logical contribution. Deliberately dropping a discriminator in a completed lower relation deliberately changes the source set. The theory examples correctly exhibit that distinction, consistent with the primary set-aggregation examples. [Mohapatra and Genesereth, Examples 2 and 3](https://web.stanford.edu/~abhijeet/papers/aggregates.pdf)

This is not a request to retain all join witnesses. If the lower relation drops a witness column, those proofs collapse there. If it retains the witness, the resulting tuples are different contributors. No unproved functional dependency or hidden bag semantics is necessary.

The observed/global split is correct. Observed grouping over empty R has no discovered group; explicit global mode can define one group even when R is empty. Classical zero-key group construction and SQL empty global aggregation genuinely differ. Empty key syntax must not accidentally select one. [Mumick, Pirahesh and Ramakrishnan, Definition 3.1 and section-3.2 footnote](https://www.vldb.org/conf/1990/P264.PDF)

The proposed empty outputs are coherent together when each descriptor has one operator and one result relation: global count yields i64 zero; global sum_i64 yields i64 zero; empty global min/max yields no tuple. The last case must still mark its producing stage complete. A separate count is not lost when a separate minimum is absent. No status field, placeholder, NULL or fabricated extremum is needed. Souffle's documented empty-minimum failure supplies a comparable null-free partial-result design, not this project's required semantics. [Official Souffle aggregate reference](https://souffle-lang.github.io/aggregates)

One unresolved boundary matters even for N1: a cap on distinct source tuples does not bound a physical input sequence containing arbitrarily many duplicates. Either the reducer accepts an already validated set representation, or its adapter must separately bound and charge attempted rows, bytes and dedup work. A semantic contribution cap alone is not complete admission control. This is an additional clarification, not evidence that the reports' arithmetic proof is wrong.

## Completion and stratification

The completion argument is sound. Exact Count(1) can be replaced by Count(2) under source growth, so the ordinary set of output facts is nonmonotone even though the numeric count increases. Exact extrema likewise can replace old output facts. Threshold predicates or lattice orders studied elsewhere do not make these exact scalar facts append-only.

The conservative graph rule is well founded: ordinary positive dependencies may share a level; every aggregate-source or negative dependency is strict. Reject any SCC containing a strict edge, including unreachable cycles. A positive recursive lower relation can reach its own fixed point before a higher aggregate consumes it. The theoretical stratification premise was independently confirmed in Pelov Definition 5.8. [Pelov, Denecker and Bruynooghe, section 5.2](https://arxiv.org/pdf/cs/0509024)

A graph certificate is not proof that extraction covered every program occurrence, and an accepted graph is not proof of runtime completion. Integration needs both correct dependency extraction and actual completion for the same invocation and temporal cut. A reducer over an externally supplied mathematical relation does not establish either. Do not import acceptance of item 4 or item 4.1 from this reasoning.

## Actual pinned v2 lifecycle and spill conclusions

The performance report's lifecycle findings are source-supported. The pin requires size/init/update/combine/finalize callbacks, with optional bind/destroy. Row-to-state pointers can repeat; combination must not modify the source; finalization uses offset+i. Only bind has a context in this callback family. The bridge drops destructor-slot errors, so reporting cleanup failure is not a recovery mechanism. These facts require an ownership/error design; they do not prove cleanup on any future project's abort/finalization path. [Pinned v2 declarations](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L4890-L5788), [pinned bridge](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_aggregate.cpp#L160-L377)

The spill negative must stay narrow. The inspected pinned public-v2 builder does not install the internal state-description hooks required by TryCreateSpillPlan, whose path also rejects state destructors. This supports a negative about that builder/custom-state export path. It does not prove that no v2 row payload, no inline pointer-free aggregate state, or no built-in host aggregate can spill. The same source explicitly distinguishes pointer-free states whose rows spill without this export machinery. No spill behavior was measured. [Pinned state-spill gate](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/aggregate_state_spilling.cpp#L14-L75)

Typed collections really offer buffer-managed row spooling, but are not public group routing or sorting operators and do not make an unrelated native hash map spillable. A useful extra ownership note for later work: collection append may flatten complex input vectors and assumes valid UTF-8 rather than validating it. An adapter must preserve its own value validation and cannot retain invalidated aliases across such mutation. This is a documentation-derived obligation, not a new implementation or a demonstrated defect. [Pinned collection contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L1191-L1538)

The supplied unstable extension header confirms API-family 2, exact-version instability, and the prohibition on mixing v1/v2 extension headers. Availability of an API is not permission to register a UDF, create a connection, run SQL inside a callback, change a host pin, or grant store access. [Pinned extension header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L14-L78)

Issue 28132 was freshly re-read as open and labeled reproduced. Its report concerns distinct same-signature aggregate UDFs being coalesced. It remains a relevant future UDF-path regression gate, not a locally reproduced result or proof that the exact declared pin is affected. It is not automatically a blocker for a separate argument-only native reducer that does not register aggregate UDFs. No attachment or reproduction command was used. [Official upstream issue](https://github.com/duckdb/duckdb/issues/28132)

## The conservative direction and a clearer first boundary

The proposed direction is coherent and useful without extending its authority:

- One completed source relation; full source tuples; direct column selectors rather than a new inner join/expression language.
- One operator and one exclusive aggregate producer per target relation. Ordinary lower rules can still union into the source under set semantics.
- Explicit observed versus global mode. A simpler first grammar rejects zero-key observed mode and reserves zero keys for an explicit global descriptor.
- Count across validated tuples of any tag; homogeneous-per-group string/i64/finite-f64 min/max; reject Boolean or mixed-tag measures for extrema; i64-only checked sum. Group keys can still use all admitted tags under strict tagged equality.
- Exact-wide integer state with one final i64 check; a separately declared contribution cap and aggregate accounting; no f64 sum in this slice.
- New, additive API/IR/work-model identities later, with no new host SQL inside callbacks and no reactivation of dependencies 3/4.

These bullets describe a candidate, not an adopted contract. A standalone typed-relation reducer is a clearer first component boundary than modifying the held parser/executor or callback path. It makes arithmetic/grouping review independently useful while honestly leaving temporal extraction, producer completion, dependency extraction, transport, SQL adaptation and compatibility unresolved. It must not become a renamed route for a stopped operation.

There is no reason to require a second contribution-dedup set for a genuinely unique N1 source, or to sort all contributions merely for exact-i64 arithmetic. Deterministic errors, result order and accounting may still require a canonical scan or another explicitly proved policy. Hash grouping has expected rather than unconditional linear lookup cost, and completed relations/key bytes/output sorting remain part of total resource cost. The performance research correctly supplies hypotheses rather than a winner or a measured speedup.

## Bounded addendum on the coordinator draft

The separately allowlisted SYNTHESIS-DRAFT.md was read at approximately 2026-10-31T21:38:47Z. It is a mutable coordinator draft, not one of the frozen research inputs. This review applies to the text read then, not an assumed later revision.

No blocking mathematical or safety-equivalence flaw was found in that version. Its unselected typed-relation reducer is explicitly not completion evidence, full item-5 integration, or execution authority. Its 100,000-per-reducer-invocation bound resolves the per-group-versus-total ambiguity for that candidate, but still requires the physical-admission distinction above.

Two wording improvements were returned to the parent: separately bound/charge physical duplicate input work, and say identical visible logical tuples deduplicate. Overlap by itself does not mean latest-value resolution; overlapping rows with distinct resulting logical triples remain distinct. A separate reducer or certificate checker does not retire any dependency hold. No source edit or test follows from this addendum.

## Remaining blockers and closure

Before code, select the descriptor and physical-input contract, ownership and type representation, cap scope, deterministic error/accounting order, output order, exact wide representation and portability requirement. Define whether atomic failure is per reducer/invocation and how it maps to the eventual batch/request boundary. Select new API/IR/language/work-model identifiers before integration. The decision-and-gate ledger makes these concrete.

Before empirical or acceptance claims, obtain a separately reviewed authorized scope and preserve dependency holds. Independently verify arithmetic, set admission, empty/type/error behavior, all limits, temporal correction and completion integration, SQL adapters, old compatibility, callback ownership and any chosen spill path. Source reading cannot replace those checks. No computer-environment packet is needed or permitted.

This bounded review is complete once its new local package is written and frozen. No external call or approval is awaiting completion. No further monitoring or execution is authorized by this source-only review.
