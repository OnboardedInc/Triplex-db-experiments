# Full-compiler QLever domain summaries, Wave 4

Wave 3 remains a failed 5-second native / 6-second public-query feasibility
profile. Both full compiler variants returned the exact scalar7 row, then the
first focused test timed out in workload17. A completed one expensive per-variable
COUNT/MAX/REGEX domain query and cancelled the second; B completed three such
queries and cancelled main execution with about one second remaining. Three final
registry cuts were empty, nodes remained alive, and no memory threshold was crossed.
This is a deadline-profile failure, not evidence of an incorrect funnel answer or
of the original 30-second public correctness profile failing semantically.

Native logs, exact logged-cut reconstructed SELECTs, and their matching 5000-byte
logged prefixes are retained under `qlever-common-3e034ab5-native`. The original
4 GiB gate still has three observed OOMs; no original-profile retry occurs here.
The failed third node's planner budget was not observed. Fresh-node default1500
must not be attributed to that failed execution.

## Competing hypotheses and common code

Both nodes use the SAME A3 compact scalar source and the identical full compiler,
public Runtime and seven focused tests. Temporal visibility stays inside each
leaf, only logical channels are projected, joins share canonical columns, and
SUM/AVG shadows are fetched on demand. The only candidate difference is how
non-SUM numeric-family information is summarized from the SAME completed positive
candidate relation at the same temporal/source cut:

- A4 projects all needed family columns in ONE `SELECT DISTINCT`, with a bounded
  summary-row cap plus one sentinel and explicit overflow error. It performs no
  COUNT, extrema, regex or numeric-range admission work for ordinary comparisons.
- B4 independently emits ONE native aggregate query containing exact0/1 family
  presence flags for each variable. It returns at most one small summary row and
  rejects invalid/partial flags. It does not fetch candidate fact rows.

Hypothesis A4 is that a single family-only projection removes redundant relation
execution. Hypothesis B4 is that native presence flags avoid summary multiplicity
while retaining the same type proof. SUM/AVG keep their existing per-variable
range, contribution-count and exact-shadow admission checks unchanged. Mixed
number/integer candidate relations still reject; unrelated facts excluded by
identity or joins must not poison a selective query. Empty relations remain empty.

## Frozen conditions and test packet

Use the retained candidate A/B datasets on ports7021/7022, equal fresh deterministic
public scopes, clock cuts and assertion-ID seeds. Two CPUs and2 GiB each, native
allocator512M, cache64M, four native threads, planner budget100 set and read back.
The original node is stopped. Aggregate QLever allowance remains4 GiB. The source
profile is explicitly different from the original4 GiB topology/unobserved failed
planner setting. No budgets increase after a failure.

Run the same seven tests concurrently, one process per node, stopping each at its
first failure. They cover unchanged scalar7, the actual qualification runner's
nine-pattern workload17 and all three boundary/order cases; pending assertions,
retractions, typed refs and full-range exact SUM; optional/null/keyset behavior;
recursive support/retractions/pagination; scalar/ref joins/grouping/AVG;
conjunctive negation/OR; and numeric boundaries. The final test also verifies
point-selected integers and join-selected integers amid unrelated float facts,
mixed candidate-family rejection and empty type summaries. Ingestion comes from
business events, never from expected answers.

Production width admission remains four, recording a resource limitation. This
experiment explicitly admits32 patterns, a provisional bound for these ASTs.
Native timeout5 seconds, executor deadline6 seconds, test watchdog60 seconds,
response cap4 MiB, and final/aggregate/recursive caps1000 rows are unchanged.
Summary truncation never returns partial type inference or answers.

## Ownership, traces and stopping

One QLever qualification lease owns both nodes. No other initialization, metadata
check, recovery or test runs concurrently. Source/oracle/harness hashes and archives
freeze before execution. Every native HTTP request from the test clients records
its exact query body, Query-ID, timeout URL and request/error/header timestamps.
Header timing is labeled as such; full native planning/compute timing comes from
server logs, not from assuming headers mean decoded completion. The packet is
correctness/feasibility evidence and reports no latency percentiles.

A sampler records server RSS/cgroup/CPU and client-process RSS. It requests native
cancellation and terminates only the owned test process at a node reaching1.5 GiB,
aggregate nodes3 GiB, aggregate clients2 GiB, or node loss. Observe registries and
node state separately afterward; client exit alone does not prove backend stop.
No automatic restart or retry. Evidence and source archives are create-only.
Survivors need a public build, unchanged44/142 original-profile qualification and
an explicitly observed frozen configuration before any compatibility promotion.
