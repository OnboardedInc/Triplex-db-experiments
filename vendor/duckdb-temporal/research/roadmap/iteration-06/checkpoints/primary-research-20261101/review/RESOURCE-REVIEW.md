# Item6 B resource/theory — independent source-only peer

2026-11-01 UTC · Sol6.1-max · **SCOPED RESEARCH CLOSURE; NO CONCRETE P0/P1/P2 BLOCKER**

## Scope and disposition

I did not author B. I literally read all eight frozen files in `goal6-resource-theory-primary/research-001/`, verified every supplied SHA256 and the eight-file total **51,886 bytes**, and independently checked the hand mathematics and targeted primary sources below. The input manifest and sums match the supplied identities; the peer manifest records the complete file list, sizes and hashes. No original was edited; the frozen D peer remains unchanged.

The lane properly separates **F** source facts, **D** conditional derivations and **H** unselected design obligations. No mandatory corrective erratum is required for the stated bounds or scope. Two nonblocking wording/citation precision notes appear below. Closure covers this research lane only: A is still separate, item4.1/item5 remain incomplete, and neither overall goal6 closure nor implementation, plan selection, publication or execution authority follows.

## 1. Primary-source claims

- **Set joins and algorithm assumptions:** AGM Lemma2 bounds the full natural-join set using any feasible fractional edge cover. NPRR Theorem3.2/Remark3.3 distinguishes evaluation, data preparation and query preparation, and conditions removal of data-preparation cost on specific prior indexes. B does not transfer either theorem to an arbitrary binary plan, private extension, bag/provenance semantics or variable-byte cost model. Independently corroborated. [AGM, Lemma2](https://www.cs.upc.edu/~atserias/papers/joins/queries-revised.pdf), [NPRR, Theorem3.2/Remark3.3](https://pages.cs.wisc.edu/~chrisre/papers/paper49.Ngo.pdf).
- **Recursion:** the exact semiring paper distinguishes Boolean sets from annotations, restricts generalized semi-naive evaluation, and explicitly warns that interpreted functions may grow the active domain. PostgreSQL's working/intermediate-table description, changing-depth cycle example and parent-demand caveat support B's comparative claims, not a selected project evaluation algorithm. Independently corroborated. [Semiring paper, §§2.3,4.3,6 and key-space-function discussion](https://arxiv.org/pdf/2105.14435v5), [PostgreSQL WITH, §7.8.2](https://www.postgresql.org/docs/current/queries-with.html).
- **Host memory settings:** PostgreSQL describes operation-level memory allowances and parallel-query per-worker scope. DuckDB2.0 documentation expressly excludes some vectors, result and complex aggregate memory from its buffer-manager limit. These facts defeat blanket coverage inferences; they do not prove exact-pin unstable-v2 allocation participation. Independently corroborated; no setting/default or machine observation adopted. [PostgreSQL resource consumption](https://www.postgresql.org/docs/18/runtime-config-resource.html), [DuckDB2.0 resource management](https://duckdb.org/docs/2.0/configuration/pragmas).
- **Polling, races and health:** SQLite's approximate VM interval, callback restriction, near-completion race and specified interrupted-write rollback are comparative API facts only. DuckDB2.0's internal-error page describes undefined/restricted state and a new-session requirement, not the health of every project failure. B retains that distinction. Independently corroborated. [SQLite progress handler](https://www.sqlite.org/c3ref/progress_handler.html), [SQLite interrupt](https://www.sqlite.org/c3ref/interrupt.html), [DuckDB2.0 internal errors](https://duckdb.org/docs/2.0/dev/internal_errors).
- **Deadline advertisement:** the generic2.0 page advertises `max_execution_time`. B expressly leaves exact-pin/private-loop coverage to A; documentation is not a demonstrated latency or cancellation guarantee. [DuckDB2.0 pragmas](https://duckdb.org/docs/2.0/configuration/pragmas).

These were targeted section reads, not whole-document, implementation or immutable-public-byte audits. The exact successful PostgreSQL current page displays18; the semiring PDF identifies v5/24 January2024. Public text was paraphrased, not reproduced as diagnostics or action instructions.

## 2. Independent hand checks

### D1 — final output, intermediate rows and candidate work

`DERIVED-BOUNDS.md:7–15` is correct under set/equality-skeleton hypotheses. In its triangle, each `(a_i,b0)` joins every `(b0,c_j)`, giving exactly `N²` first-intermediate triples; none matches T because every `d_i` is outside the c-set. For `N>1`, this exceeds the full-triangle AGM ceiling `N^(3/2)`, although the final result is empty. A separate disjoint-key nested loop still examines `N²` pairs without emitting any row. Thus output, intermediate cardinality and rejected-candidate work require different bounds.

The specified left-deep prefix sum is an enumeration bound only. Integral-cover products are conservative; for nonnegative rational weights with positive common denominator q, the certificate `product N_i^p_i ≤ b^q` safely proves the proposed b. Feasibility, integer comparison and checked arithmetic cannot be replaced by approximate roots/LP estimates. Denying a loose upper bound does not establish actual oversize.

### D2/D3 — finite facts and temporal cells, not arbitrary recursion

`19–33`: with a fixed typed domain, fixed predicates/arities, no fresh terms and complete set dedup, the disjoint predicate universes contain at most `G=sum D^a_p` facts. Each nonempty monotone insertion round consumes a previously unused fact; hence at most G such rounds. The explicitly specified naive schedule may require the final empty round, yielding the stated `(G+1)` body-combination multiplier. Failed probes, prefix work, repeated derivations and retained provenance do not become bounded by novel insertions alone.

The ground-triple active-domain ceiling `3N+C` is safe for the declared union of relevant snapshot/request triples plus constants, not raw-record or byte admission. For E fixed endpoints including a bounded half-open window's boundaries, H=`E−1` cells give at most GH fact/cell pairs. Each normalized truth fragment contains at least one cell, so GH also safely bounds fragments. This is not a current-store restriction or a bound for computed endpoints, annotations, unbounded paths or witness records. The one-pair disjoint-list intersection advances a pointer each step, so `p+q` is a safe step/piece ceiling; it cannot be multiplied away across all fact joins.

### D4/D5 — reservation invariant, transient ownership and overflow

`37–55`: starting with `0≤live≤C`, granting only `n≤C−live` preserves the cap without overflowing a representable C; releases require an actual owner end and `r≤live`. Initializing peak from the baseline and updating each grant captures the logical high-water because releases only decrease live. Pending construction is explicitly held reservation, not already committed payload.

The resize example is valid: current600 includes old400; allocating new500 while retaining old reaches1100, not the final-state700. The new allocation must be refused under C=1000 before construction; scratch would add further charge. Persistent baseline, references/capacity/indexes, rollback and staging cannot disappear through request reset or bookkeeping-only decrement.

The `a+n*b` division guard, zero-multiplier separate count/work obligation, pre-narrowing range check and separate over-cap flag at maximum-width C are sound. Work is monotonic even when live charge falls; pre-admitted upper work is not a measurement of completed events. These unselected logical weights do not establish allocator/RSS or physical allocation success.

For the conditional string model, each valid UTF8 BMP scalar uses one to three input bytes and at most six escaped bytes; a supplementary scalar uses four input bytes and at most12 escaped bytes. Each case therefore uses at most six output bytes per input byte. Summing gives the loose but safe `6B+2` ceiling, including quotes; names/framing/numbers/copies remain separately charged. This is not a bound for an arbitrary formatter, repeated escaping or pretty printer. [RFC8259, §§7–8.1](https://www.rfc-editor.org/rfc/rfc8259.txt).

### D6 — polling distance is not elapsed cancellation latency

`59–63`: k counted units plus u **total** opaque/unpolled units per whole check interval yields at most `k+u` further work to the next boundary for an already-visible request, under the stated reachability/synchronization premises. Detection adds check cost; reporting adds cleanup. The conditional time expression additionally needs bounded counted-unit, total opaque, check and cleanup durations, none observed here. Precharging a large copy does not create checks within it. The rough `ceil(n/k)*h` overhead assumes a positive poll quantum and includes distinct initial/final costs; no tuning or physical deadline promise is selected.

## 3. Publication, cancellation and health limits retained

`RESEARCH.md:80–88`, `DERIVED-BOUNDS.md:63` and `OPEN-QUESTIONS.md:13–25` correctly leave publication order, error precedence and health as future explicit choices. Private staging can prevent project-computation success prefixes, not recall already-observed stream chunks or guarantee later host conversion. Undo must be admitted before mutation; shadow construction needs old and new owners concurrently held. Terminal error/discard rules cannot be represented as empty success.

A final poll rejects cancellation **observed at that poll**. It does not by itself settle a request arriving between the poll and the later commit/publication point; the chosen race/linearization policy must close that interval. No blanket post-commit immunity or deadline immunity is established, and ordinary interruption need not share deadline semantics. Missing terminal/commit/rollback acknowledgment remains unknown rather than zero work, rollback success or reusable state.

Controlled cleanup can justify reuse only for its source-proven scope. Unknown/fatal/undefined health may require a restart-required **marker**, not proof that a restart happened and not permission to restart, delete, replay or retry. Zero logical live reservation is not a health or all-owner-coverage proof. These are proportionate logical/source obligations, not universal host/machine, security, latency or production assurances.

## 4. Nonblocking precision notes — additive only if adopted

1. `DERIVED-BOUNDS.md:55`: “at most one standard escape per scalar” should mean one scalar encoding, **allowing two `\uXXXX` escapes for a supplementary scalar**. Literal one-escape wording is too restrictive for ASCII-only supplementary text. Its own12-byte case already accounts for the pair; the6B+2 result is sound and no format/code is selected. [RFC8259, §7](https://www.rfc-editor.org/rfc/rfc8259.txt).
2. `PRIMARY-SOURCES.md:9`: the finite-grounding section locator is imprecise. In the exact v5 PDF, ground atoms/finite-domain instances are in §2.3 and program grounding is in §4.3; §2.4 discusses sum-product queries/provenance. The finite-domain argument is independently valid; this is a citation-navigation note, not an unsupported convergence claim. [Exact v5 paper](https://arxiv.org/pdf/2105.14435v5).

Neither note is a P0/P1/P2 or a reason to rewrite frozen originals. If incorporated, retain an additive erratum/qualification rather than silently altering history.

## 5. Public gaps and final boundary

- B's stopped explicit DataFusion55.2.0 MemoryPool URL and pinned DuckDB `src/include` tree were not requested, retried or acquired by another route. No unread API is treated as absent. I deliberately did not refetch DataFusion's successful `latest` page as a substitute; its limited visible participation/exclusion fact remains B's attributed read, **not this peer's independently verified version-page/source audit**.
- New peer gap: the single exact S12 open `https://duckdb.org/2024/07/09/memory-management` returned `UnexpectedStatusCode`. Reported and stopped, without retry, mirror/version/copy/search or alternate transport. Its supplementary spilling/accounting discussion is not independently corroborated by this peer. No central mathematical conclusion needs it.
- Ten other exact paper/official-document URLs above returned successfully. No exact-pin unstable-v2 header/private allocation/error/deadline coverage was acquired here; that remains A's distinct assignment, not stable-C-ABI substitution.

Only named new project text, hashes and public primary text were handled. No code/import/parser/AST/feed/fixture/test/oracle/compiler/native/host/database/benchmark execution, machine/system/SDK/process/path/clock/capacity probe, diagnostic collection, stopped/paused payload access, Codex, external mutation, deletion or repair occurred. All item6 empirical stages remain **UNRUN**. No public call or approval remains pending. Next authority, if any: the coordinator's exact A-lane handoff and later synthesis; no action is opened by this review.
