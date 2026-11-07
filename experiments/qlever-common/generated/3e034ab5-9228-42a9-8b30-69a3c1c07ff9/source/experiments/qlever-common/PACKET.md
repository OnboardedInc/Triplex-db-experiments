# Full-compiler QLever source experiment, Wave 3

The original 4 GiB gate remains failed after three observed OOMs. The third
failure occurred in the attempted compact integration, which exported unused
temporal metadata and filtered visibility outside the assertion SELECT. Its
planner setting was not observed. No original-profile retry is authorized by
this packet. A fresh node's observed default of 1500 is not evidence of the
failed node's setting.

A3 reconstructs canonical scalar channels from typed lexical payloads, uses
constant-predicate numeric-order lookups, applies visibility inside each leaf,
and exports only logical identity/scalar columns. B3 independently reads
persisted canonical channels through the same common leaf. Missing persisted
channels reject before main execution. Both retain SPARQL bag multiplicity;
neither leaf uses DISTINCT. Native SUM/AVG shadows are fetched only for their
input variables. Both feed the identical negation, OR, aggregation, optional,
recursion, pending transaction, and pagination operators and public runtime.

Hypothesis A3: faithfully retaining A2's local visibility and narrow projection
boundary prevents the integration optimizer explosion. Hypothesis B3: persisted
channels reduce reconstruction costs inside that same boundary. The changed
variable between candidates is the scalar source builder. Neither is a positive
query fast path or host fact evaluator.

Use retained candidate A/B datasets on ports 7021/7022, equal fresh deterministic public
test scopes and clock/ID seeds on the independent datasets, two CPUs and 2 GiB each, native allocator 512M, cache 64M, four native
threads, planner budget 100 read back before queries. The original node is
stopped. Aggregate QLever allowance is 4 GiB. This explicitly differs from the
unobserved failed planner setting and from the original 4 GiB node topology.

Run the same seven focused tests concurrently, one process per node, stopping
each candidate at its first failure. The first test includes the unchanged
seven-type projection and the actual qualification runner's nine-pattern
workload17 AST, all three window/order cases. Further tests cover pending
assertion/retraction visibility and exact integer SUM, optional/null/keyset
behavior, recursive support/retractions/pagination, scalar/ref joins and
grouping/AVG, conjunctive negation/OR, and full-range exact numeric contracts.
All assertions and source event ingestion are frozen in the same test file.

The production width default remains four, recording a resource limitation.
The experiment explicitly admits up to 32 patterns, a provisional test bound
covering these ASTs. It does not establish arbitrary query width support.
Native query timeout is five seconds, public executor deadline six seconds,
and each test has its existing 60-second watchdog. No budgets increase after
failure. Response bytes remain capped at 4 MiB; final rows, aggregate contributions and recursive rows each have a 1000-row probe cap, with errors rather than partial results.

One QLever lease owns both nodes for the wave. Do not run initialization,
metadata checks, recovery, or another agent's tests concurrently. A sampler
records cgroup memory, server RSS/CPU and client process RSS, requests native
cancellation and terminates the owned test process on a node reaching 1.5 GiB,
aggregate nodes reaching 3 GiB, aggregate clients reaching 2 GiB, or node loss.
Record registry observations and node state afterward; process exit alone does
not prove backend termination. No automatic restart or retry. Evidence/source
archives are create-only. A survivor still needs unchanged 44/142 original-profile
qualification and a correctly observed frozen configuration before promotion.
