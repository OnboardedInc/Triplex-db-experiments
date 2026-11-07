# Goal 3 delta from issue 26

Status: independently authored source/research synthesis, 5 November 2026.
No compiler, DuckDB execution, performance test or runtime change was made.

The input is the [final issue 26 report]([PRIVATE_REFERENCE_REMOVED]),
Git blob `a24458e1f01601b630f6722aee3658404d9ed4cc`. Root supplied its
local pinned copy and manifest. Its executed evidence is independent Python
model checking; its DuckDB plans, lifecycle and performance are unexecuted
research proposals. They do not qualify a new application route.

I also inspected current owning source at main HEAD `ee4e345c`:
`temporal_store_query.cpp` still tries scan, union, join, anti-join and
completed-source aggregate plans, then rejects unsupported scalable shapes.
The native evaluator already completes recursive SCCs with batched delta
publication. The ledger therefore correctly leaves scalable recursive
planning open while the bounded recursive language is already supported.
This note does not change the completed Goals 2/5 semantics or the ongoing
same-workload query-admission qualification.

## Backlog changes

1. **Make usefulness part of the first recursion proof.** A small ordinary
   `UNION` recursive CTE for one positive linear SCC is the cheapest
   integration candidate, provided its whole-run witness/frontier/byte
   bound admits an actual intended workload. Use exact tuple identity, no
   path/depth payload in the logical key, and point queries first. Exclude
   filters, computed heads, negatives and aggregates from this first SQL
   slice; validate the entire program so disconnected effects still reject.
   Keep bounded `query` and native counters unchanged. A new scalable route
   needs its own reason, SQL route and null native counters.
2. **Do not confuse the 100,000-row answer cap with a traversal cap.** Current
   scalable API permits at most 100,000 output rows and 16 MiB encoded output.
   For source-preserving reachability a proof such as `S*V` may bound output
   and accumulated pairs, while `S*E` bounds edge witnesses only for the
   proved rule shape. One root, one million endpoint values and only 256
   actually reachable nodes can still fail `S*V`. Do not raise public caps or
   traverse first and count afterward. Include this small-frontier/large-
   domain case in initial usefulness qualification. If it represents the
   required workload and no separately admitted narrower scope is available,
   bring the round controller ahead of the coarse CTE rather than promoting
   an unusable route.
3. **Keep a C++-owned round controller as the general path.** One leased reader
   and one snapshot transaction must span source admission, every round,
   completion and output. C++ owns SCC scheduling, typed identity, admission
   and cancellation; DuckDB executes generated joins and spillable relations.
   Use private per-predicate `All/Delta/Next` tables first. Nonlinear recursion
   must cover each needed fresh occurrence against accumulated inputs, then
   publish predicates together; `delta*delta` alone is incorrect. Mutually
   recursive CTE encoding and keyed-state alternatives are separate proof
   tasks, not prerequisites to the first controller. Do not invoke nested
   SQL from an executing scalar callback or use an unqualified host BEGIN as
   a substitute for the required native reader/transaction protocol.

## Admission and costing consequences

- Cost estimates choose between already semantically eligible, admitted
  plans. They cannot justify bounds or preserve native maxWork/maxRounds
  behavior by themselves. Keep native-counter acceptance distinct from the
  scalable logical input/intermediate/output contract.
- Prove all live phases, not just final `Next`: source/predecessors,
  accumulated state, delta, statistics, each join prefix, candidate bag,
  novelty metadata, next state, publication overlap and output sorting/wire.
  Use checked/saturating arithmetic and actual typed widths. Heavy-key skew
  and many witnesses for one answer require multiplicity or conservative
  product bounds before expensive construction. Post-counting a materialized
  result is not admission.
- Record logical row/carrier reservations separately from DuckDB's buffered
  memory/spill limits and sampled process RSS. The paused native evaluator
  allocator work does not account for DuckDB recursive operators. A joint
  live reservation protocol is a further controller obligation; neither
  logical bytes nor `memory_limit` establish whole-process containment.
- Keep one invocation deadline/cancellation authority across prepare,
  statistics, round joins, novelty, publication, sort and result drain. Test
  cancellation during actual work, rollback/no partial answer and reader
  reuse. Do not restart at a newer K after a failed/expensive round.

## Practical next acceptance sequence

First inspect and generate the narrow linear point plan on the exact pinned
engine. Prove failing gates dominate allocation, eight-tag equality/order,
cycles/diamonds, source-rule preparation, empty/future cuts, cancellation
and same-connection reuse. Compare only admitted same-cut answers and account
for startup and output separately. Include a modest reachable graph and the
large disconnected domain case before selecting CTE-first versus controller-
first. No throughput claim follows from the report's model checks.

For a controller, first qualify a frozen one-reader snapshot and private
round lifetime with an actual transaction/owner test. Then test nonlinear
and mutual SCCs, full-tuple novelty, lower-stratum completion, heavy-key
prefix rejection and combined-live reservations. Demand/constant propagation
can improve small-frontier cases only with a completeness/effect proof; it
cannot prune disconnected faults or incomplete negative/aggregate sources.
Interval, multi-cut and correlated-lookup composition remain later gates:
all must preserve cut namespaces and one outer clock, rather than unioning
facts from different times.

The pinned source research corrects one design assumption: ordinary
`recurring.R` is available, and keyed `UNION` versus `UNION ALL` frontier
semantics must not be treated as interchangeable. Buffer-managed C APIv2
collections are possible bounded staging, not an automatic spillable novelty
index. Neither fact requires a DuckDB fork. Consider a narrowly pinned epoch
hook only after actual extension-only CTE/controller measurements identify
an indispensable boundary or unacceptable repeated setup/build cost.
