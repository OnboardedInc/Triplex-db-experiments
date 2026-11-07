# Conditional logical bounds and hand counterexamples

**D = derivation; H = unselected model.** These are mathematics/source-contract constraints, not executed fixtures, code, selected quotas, measured work/memory/latency or permission. Symbols/weights below are logical, not computer properties.

## D1. Set joins and the missing intermediate bound

Let a conjunctive equality join have variables V and nonempty set relations R_i of sizes N_i. A valid fractional cover has x_i≥0 and, for each variable v, sum of x_i over incident atoms≥1. The [AGM bound](https://www.cs.upc.edu/~atserias/papers/joins/queries-revised.pdf) is B=product N_i^x_i. Empty input relations are handled separately; do not evaluate log0 or ambiguous0^0. Extra inequality/overlap filters can remove answers from a correctly modeled equality skeleton, but do not remove candidate-loop cost.

For triangle edges, x_R=x_S=x_T=1/2 gives B=sqrt(N_R N_S N_T). This is a full **set binding** bound, not a bag/provenance bound or a preprojection witness-work bound. [NPRR](https://pages.cs.wisc.edu/~chrisre/papers/paper49.Ngo.pdf) further requires a chosen algorithm/model and preprocessing/index assumptions; it is not evidence that any existing binary plan realizes B-space/B-work.

**Hand counterexample:** R(A,B)={(a_i,b0)}, S(B,C)={(b0,c_j)}, T(A,C)={(a_i,d_i)},1≤i,j≤N. The a_i are distinct, the c_j are distinct, and no d_i is a c_j. Each input has N tuples. R⋈S has N² triples; adding T yields zero. A final cap based on B=N^1.5 does not admit that first intermediate. Separately, nested loops over disjoint join keys can perform N² pair checks and produce zero intermediate rows. Hence distinct result size, intermediate size and examined candidates are different quantities.

For a **specified** left-deep enumeration, complete combinations are≤product_i N_i and all prefix combinations≤sum_j product_{i≤j}N_i, before accounting key/byte work. These are loose bounds for that schedule only, not a universal implementation-cost bound. Each materialized intermediate needs its own size/byte admission or incremental before-append reservation; candidate/probe counters remain necessary even without materialization.

If an implementation later uses fractional bounds for admission, an approximate infeasible cover or downward-rounded product is unsafe. An integral cover gives a conservative checked integer product. Rational weights p_i/q need an exactly verified cover; a proposed integer upper bound b can be certified through product N_i^p_i≤b^q. All arithmetic must reject/flag over-cap rather than wrap; no numeric LP/root routine is selected now. Conservative rejection of an overlarge upper bound is not proof the actual result is that large.

## D2. Fixed-domain recursion bounds only novel facts

Assume finite canonical typed domain size≤D, D≥1; fixed safe/function-free positive rules; fixed predicate arities a_p; no new values; global set dedup by the complete fact key; monotone insertion. The possible ground facts number at most G=sum_p D^a_p. Every nonempty delta inserts at least one previously absent fact, so all inserted deltas together have≤G facts and there are≤G nonempty insertion rounds. One final empty check may be needed. The proof is finite counting, not a runtime measurement.

This does **not** bound unsuccessful tuple combinations/probes, duplicate derivations, provenance/path objects, old/next frontier copies or bytes per term. For a particular naïve schedule with at most G insertion rounds that stops after its first empty delta, complete body combinations can be bounded by (G+1) times the sum of the rule-body products of relation-size upper bounds, including the final empty round. Prefix combinations, widths/byte work and index construction must still be added. Semi-naive evaluation reduces repeated work but does not make candidate work equal novel fact count.

The [semiring convergence paper](https://arxiv.org/pdf/2105.14435v5) explicitly separates the Boolean setting from generalized annotations. A changing aggregate value, fresh arithmetic term, path/depth field or nonmonotone semantics does not inherit this proof. A finite fixed-width value domain alone can be enormous and is not an operational bound from a small input. Query/rule count, variable count and arities must themselves be admitted; fixed-program polynomial data complexity is not a uniform small bound for arbitrarily large programs.

For ground triples with no new terms, the active-domain upper bound is 3N+C, where N counts the union of relevant snapshot/store and admitted request distinct triples, and C counts admitted rule constants; typed tags remain part of identity. Repeated raw occurrences may make raw count/validation bytes much larger than N, so raw input admission cannot use only N.

## D3. Temporal endpoints — conditional finite expansion

Choose, **for this model only**, a bounded half-open time window whose sorted endpoint set has E≥2 entries, including its boundaries. Permit only endpoint-preserving interval set operations; forbid creation of fresh endpoints. There are H=E−1 elementary cells. With at most G possible ground facts, there are≤GH fact/cell truth states. Monotone insert-once cell deltas therefore have≤GH novel states/nonempty insertion rounds. A normalized interval representation has≤GH fragments, since every fragment contains at least one cell.

This bounds normalized truth, not raw overlapping input records or distinct proof witnesses. Storing derivation paths/provenance separately needs another bound. Timestamp arithmetic or other endpoint generation invalidates H; no such restriction is asserted for the current store by this research.

For two already aligned, sorted, internally disjoint interval lists with p/q segments, a two-pointer intersection advances at least one pointer per step and takes≤p+q steps, with≤p+q emitted pieces as a safe bound. That proof applies to **one such pair**, not all fact-key join combinations. Join fanout and sorting/coalescing preparation remain separate.

## D4. Owner/capacity ledger and incremental reservation

Define a later-selected logical charge w(o)≥0 for each admitted owner/capacity, including dictionary payloads/entries/buckets, all index records, binding/frontier/scratch buffers, staged emitted bytes and any rollback state. Shared payload has one owner charge; separately owned references/copies still count. Here live means **held logical reservation**, including pending construction; a separate committed-payload count may be lower. Initialize peak at initial live, then update it to the maximum at every grant; let cap be C. Borrowed input/host-owned buffers need an explicit separate admission/ownership scope; do not silently count or omit them while calling the result total memory.

Invariant proof: initially0≤live≤C. A request n≥0 is granted only if n≤C−live; then live+n≤C and addition is representable whenever C fits the chosen word. Denial leaves live/peak unchanged. Release r requires0≤r≤live, then live−r≥0; it does not reduce peak. Repeated reserve/release cannot refund monotonically accumulated work. Counter changes must correspond to actual owner admission/end, not a bookkeeping fiction.

**Resize counterexample in logical units:** C=1000, live=600, old owner charge400 and proposed new charge500. A final-state-only calculation gives600−400+500=700. But copying while old is needed reaches1100; pre-copy admission correctly refuses500>1000−600. Reserve old+new+scratch simultaneously until genuine release/transfer. This is not a capacity recommendation or an allocation observation.

One possible symbolic decomposition, not selected weights, is:

`L = L_raw + L_dictionary_payload + U*e_dictionary + bucket_capacity*e_bucket + sum(index_entries_j*e_index_j) + sum(binding_capacity_j*(h_j+v_j*r_j)) + L_frontier + L_staged_output + L_scratch + L_undo + L_fixed`.

Logical coefficients e,h,r are declared model units, not guessed sizeof/allocator values. For k one-entry-per-fact indexes, count≤kN; if indexing temporal fragments, use fragment count F instead of N. A length-only charge does not cover spare container capacity unless that omission is explicit. Zero payload length does not waive entry/count/work charges; a byte quota alone need not bound a number of zero-length items. Global/request/store quotas need declared scopes; resetting request counters cannot erase persistent owners.

## D5. Checked arithmetic and encoded strings

Assume nonnegative admitted sizes and work 0≤t≤W. Admit increment k≥0 only when k≤W−t. Validate external counts/ranges before narrowing. To admit base a+n*b against nonnegative remaining R, first require a≤R; for b>0 require n≤floor((R−a)/b) **before multiplication**. A zero multiplier does not waive separate count/work admission. Release/free is not a work refund. Whether a counter charges attempts, conservative pre-admitted work or completed primitives must be declared; precharging an upper bound is not observation that all those operations ran.

For products, if b>0 and a>floor(C/b), mark over-cap before forming a*b. A conceptual saturating value C+1 is not representable when C is the largest word; use a separate over-cap state rather than wrapping a sentinel. Optional diagnostic fields must not publish truncated attempted sizes. Widths/enums/presence policy remain future contract choices.

Raw UTF8 byte length is not encoded output length. As one conditional example, an ASCII-escaped JSON representation that uses at most one standard escape per scalar has encoded string length≤6B+2 for B valid UTF8 input bytes: a one-byte scalar needs≤6 ASCII bytes;2/3-byte BMP scalars≤6;4-byte supplementary scalars≤12; add two quotes. The escape forms come from [RFC8259 §§7–8](https://www.rfc-editor.org/rfc/rfc8259.txt). This is **not** selection of JSON or an arbitrary pretty-printer bound. A chosen formatter must also charge names/delimiters/numbers, concatenation buffers and any returned copy before construction; incremental chunk reservation is an alternative to full preflight.

## D6. Polling: conditional work-distance versus time

Define one counted primitive as one bounded logical work unit. Between adjacent checks permit at most k counted units plus at most u **total additional unpolled units** in all opaque regions in that interval. An already visible cancel request reaches the next check boundary within at most k+u further units, assuming it is reached and observations follow the chosen synchronization contract. If performing the check costs h more units, detection can add h. This bounds the whole interval, not u for every nested helper. Precharging B bytes before one opaque B-byte copy creates no intermediate checks; u must include that copy unless a later design has bounded chunks.

Only with **additional, unobserved premises** of≤tau time per counted unit,≤t_opaque total opaque time per check interval,≤t_check per check and≤t_cleanup cleanup could one infer latency≤k*tau+t_opaque+t_check+t_cleanup. No such bounds are known or claimed here. For n counted units and per-check cost h in the same abstract model, polling contributes about ceil(n/k)*h plus initial/final checks, while residual overshoot grows with k. This is a tradeoff equation, not a measured tuning rule, wall deadline guarantee or action plan.

Success needs a defined cancellation/deadline-versus-publication order. A final observed check before a linearization point can reject precommit cancellation; a later request cannot erase output already accepted. Error/staging/rollback and host-health rules must be chosen explicitly rather than silently reporting empty success or reusable state.
