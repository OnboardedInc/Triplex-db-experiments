# QLever scalar-channel OOM experiments

Status: Wave 2 predeclared; no Wave 2 candidate execution yet.

The reconstructed-channel implementation exhausted the original 4 GiB development
container twice: first on workload17, then on the unchanged upstream typed scalar
projection. Both failures remain failed gates. The reconstructed baseline is stopped
and will not be rerun in this experiment. Reducing its provisional admission cap to
four patterns records an unsupported resource boundary; it does not pass either gate.

## Competing candidates

| Candidate     | Source representation                                                                                                  | Changed planning mechanism                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2: projected | Existing typed payload fields, one constrained payload-predicate pivot, three constant-predicate numeric-order lookups | Hold A1's compact projection and shared columns fixed; replace only its correlated order-predicate pivot, which produced empty integer funnel answers |
| B2: persisted | Mandatory `scalar_family`, `scalar_lexical`, `scalar_order` fields already emitted by the storage codec                | Project each assertion in a scoped SELECT with direct constants and two local nullable temporal guards, then join shared canonical columns            |

Both accept the same validated Triplex Datalog AST. Neither evaluates stored facts
in the host. The candidate compiler is deliberately limited to positive patterns
and comparisons for this experiment. It rejects other AST forms explicitly. Source
position, valid time, recorded-time cut, typed-ref restrictions and flattened scalar
families are held equal. All query text and ASTs are written before execution.

Wave 1 is retained as a failed experiment: A1 passed all seven scalar columns then
returned the wrong empty integer funnel result; B1 passed six scalar columns then
exhausted its native 512M query allocator at seven columns. Both nodes survived,
and neither candidate is a survivor. Wave 2 performs no allocator, response-cap,
deadline, planner-budget, container-limit or stopping-threshold increase.

Hypothesis A2: direct numeric-order predicate lookups preserve integer order values
that were lost in A1's correlated OPTIONAL. Hypothesis B2: local assertion relations
bound the join intermediates that exhausted B1's allocator. A benefit from either is a
planning/storage tradeoff, not evidence of larger data-scale acceptance.

## Fixed experimental profile

Two isolated owned containers, ports7021/7022, 2 GiB RSS/cgroup limit and two CPUs
each; aggregate QLever allowance remains4 GiB. The original development node is
stopped. Each candidate retains its separate copy of the same closed index and
snapshot plus acknowledged Wave 1 fixture writes. Wave 2 uses a fresh funnel scope
and the same copied scalar scope; neither node is restarted or reset.
Native query allocator argument`512M` and planner budget100 are fixed before
the wave. Read-only checks record image digest, node version, container limits,
runtime planner setting, initial graph counts and snapshot hash. No original-node
setting or global Docker setting changes. These are new experimental profiles,
not a rerun or repair of the failed4 GiB acceptance profile.

## Correctness fixtures and progression

1. Read the acknowledged copied seven-fact scalar fixture on both nodes and
   create the funnel fixture via the same public command on each candidate.
   The typed fixture is the unchanged upstream seven-fact scalar projection:
   string`007`, number7, booleantrue, datetime1700000000000, JSON`{"ok":true}`,
   ref`7`, and blob descriptor. Expected flattened values are declared separately
   from ingestion and independently checked by the acceptance agent.
2. Execute prefix widths1,2,4,6, then the full seven-pattern scalar query. A stage
   advances for each candidate only after its prior stage returns the complete expected row.
   A failed candidate stays stopped while the other can continue its own ladder.
3. Use workload17's twelve business events/36 assertions, generated from source
   events rather than expected answers. Compare the exact same nine-pattern AST
   and cuts. Independent replay must return sessions`S` for[0,40), `S,U` for[0,41),
   and no match for the equal-timestamp session. Arrival order is reversed during
   ingestion with one public transactional command. Equality of timestamps does not satisfy strict ordering.
4. Metadata-domain probes are recorded separately from main execution. Type-only
   probes return only distinct canonical families; this comparison does not claim
   aggregate or arithmetic qualification. Loading and channel storage cost are
   reported separately from query costs.

## Metrics and stopping rules

The primary outcome is correct complete results with peak server RSS below the
2 GiB cap and no OOM/restart. Record end-to-end latency, native planning/compute
timing when available, server RSS sampled at100 ms, CPU, query bytes, RDF counts,
snapshot growth, client RSS and acknowledged fixture-load cost. Include transport
and decode in end-to-end time. A few observations are feasibility evidence only;
do not report latency percentiles.

Queries run concurrently across the two independent candidate nodes. Native
timeout5 seconds, client deadline6 seconds, result cap1000 rows, response cap4 MiB.
Stop a candidate on any wrong result, deadline, native memory error, server RSS
at or above1.5 GiB, OOM, or lost node. Request native cancellation and observe the
registry/node independently; client abort alone is not backend-stop evidence.
Do not retry a failed candidate or automatically restart it. Preserve its query,
resource samples, native response, container inspect and snapshot receipt. Stop
the wave if aggregate candidate RSS reaches3 GiB or local disk reserve is breached.

A source-only experimental public Runtime/QueryExecutor wrapper calls these emitters
through `Triples.queryAll`; it does not add an alternate application query syntax.
Native preflight/domain/main phases are recorded separately. Pagination, writes,
rules and aggregates are outside this particular candidate surface and are never
silently evaluated in the host. The ordinary Triplex mutation API loads the fixture.

A survivor must later pass unchanged public44 and142 workload executions on the
original4 GiB profile before promotion. The smaller candidate wave cannot pass
those acceptance gates and cannot establish entity-scale or concurrency claims.
