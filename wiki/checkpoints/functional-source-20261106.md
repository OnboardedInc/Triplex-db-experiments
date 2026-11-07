# Current functional source checkpoint

This records the source-only `ca2dd6d321aaf4e479bfe31eb3e0b0163309cbad`
integration snapshot. Later Duck queued-withdrawal results and current working
source are recorded in [live status](../status.md); old snapshot results are not
silently relabeled as that later build.

Tags: `scope:local`, `surface:five-query-paths`, `status:functional-fixtures-qualified`,
`problem:read-priority`, `status:load-failures-retained`, `scale:target-open`.

The five public query paths have fresh source-bound functional passes on the
current compiled SDK bytes. Three physical foundations serve them. These are
fixture correctness and reproducibility results; defaults, calibrated capacity,
the ten outcome goals and the10m-entity/100m-active-fact target remain separate.

| Public query path | Current functional evidence | Exact qualified profile |
| --- | --- | --- |
| DuckDB Triplex Datalog | `duckdb-sdk-entry-v8/0001`:48 checks including the unchanged44; `duckdb-datalog-packet-v4/0001`:142 current/reopen checks | Existing native Mac C++ paired artifacts through the public TS package; one engine thread,128MB native memory and64MB maximum native spill. Linux portability is not assumed. |
| XTDB Triplex Datalog | `xtdb-foundation-44-v5/0001`:unchanged44; `xtdb-datalog-packet-v3/0001`:142 | Shared Triplex assertion/history store on the owned3GiB XTDB foundation; current signed-zero transport/core evidence repair included. |
| QLever Triplex Datalog | `qlever-foundation-budget1-v1/0001`:unchanged44; `qlever-datalog-budget1-packet-v1/0001`:142 | Explicit F candidate:2GiB engine, persisted scalar source, eligible MINUS, paired retirement, bounded complete aggregate answers, E off, planner threshold1. Main and interval point executors share these flags. Each gate proves100→1→100. SDK defaults remain unchanged. |
| XTDB native XTQL/SQL | `xtdb-native-packet-v7/0001`:142; current direct34 numeric/language controls and13 native entry checks | Authored native queries through the existing Triplex schemas, shared writes/history and fixed source cuts. Charged working-state helpers cover recursive tasks. |
| QLever native SPARQL | `qlever-native-packet-v5/0001`:142; `qlever-native-entry-final-v1/0001`:11 | Authored typed SPARQL, baseline planner100 read before/after, same2GiB foundation. One upper source position per multi-call task, with explicit earlier cuts preserved. Native property-path working graphs and bounded final aggregate scalar normalization are charged. |

Independent current reviews are
[DuckDB48/142 and stage diagnostic](../../qualification/reviews/duckdb-final-combined-stage-independent.json),
[XTDB44 and both142 paths](../../qualification/reviews/xtdb-final-combined-independent.json),
[QLever combined142/44](../../qualification/reviews/qlever-combined-final-functional-independent.json)
and [QLever entry11](../../qualification/reviews/qlever-native-entry-final-independent.json).
The reviews bind actual raw answers, source/build/dependency pins, canonical
terminal anchors and preserved source/controller preimages. Older greens remain
historical. Q native v4 and XTDB native v5 worker-only results remain explicitly
`controller_publication_failed`; fresh results do not adopt their raw terminals.

## The strict read-priority diagnostic has failed on all three Datalog paths

The declared small diagnostic offers480 reads over30s at16reads/s to256 logical
clients, with16 dispatch slots and six ten-entity writer commands at five-second
intervals. Every read and all six writer ACKs/public visibility must succeed
inside the fixed window. The fixture contains1000 distinct domain-fact subjects
per scope and one active domain fact each; it has no persisted configured-entity
presence/type-version events. This is not the full scale model.

| Path/run | Correct reads | Read errors | Writers visible inside30s | Reconciled after drain | Strict result |
| --- | ---: | ---: | ---: | ---: | --- |
| `five-surface-rate16-duckdb-datalog-v1/0001` |145|335|4/6|6/6|FAIL availability and writer floor |
| `five-surface-rate16-xtdb-datalog-v1/0001` |480|0|1/6|6/6|FAIL writer floor, despite a byte-verified report PASS |
| `qlever-qualified-rate16-datalog-v2/0001` |215|265|0/6|6/6|FAIL availability and writer floor;100 restored |

These windows have different declared co-runners and retained engine histories;
there is no throughput winner. A late but reconciled command does not satisfy
in-window writer progress. Q's separate strict wrapper also checks the raw offer
schedule, result digests, client progress, six unique atomic commands and their
ACK/visibility times. Successful Q reads match the independent returned-cut
catalog, all at position2; the deadline errors are availability failures, not
observed wrong answers. The Q native sibling of the failed wave stays unexecuted.

The new [native-only Q hypothesis](../../qualification/load-waves/qlever-native-only-point-rate16-v1/plan.json)
has separate identities and requires untouched-instance position2/recorded-time
and immutable seed/oracle verification before the unchanged-rate diagnostic.
It is not a retroactive completion of the failed foundation wave. Any narrowly
isolated measurement window is declared explicitly; ordinary global admission
still permits up to three expensive groups when the resource vector fits.

## Open outcomes and measurement limits

QLever's raw correlated outer-FILTER `NOT EXISTS` counterexample and arithmetic
limits remain recorded in the [native feature matrix](../../qualification/qlever-live/native-feature-matrix.json).
Passing positive-grouping task recipes does not qualify arbitrary SPARQL.
Per-call completeness/pair admission, helper maintenance, history and all SDK
normalization remain application costs. Exact bounded aggregate recipes have
explicit domains/caps; they do not establish full-scale aggregation.

The Q [failure receipt](../../qualification/evidence/qlever-qualified-rate16-datalog-v2-failure.json)
and [source/trace attribution](../../qualification/qlever-live/read-priority-attribution-wave1.json)
separate observed driver queue/ACK/visibility timings from unmeasured native
admission, planner, final-query and physical-cancellation phases. The Duck
17-answer stage diagnostic identifies repeated ownership work and a cancelled
call whose accepted metadata work later runs; it is measurement evidence, not
physical cancellation acceptance. Instrumented driver spans include driver,
network, server and observer costs; they are not exact engine/indexing times.

Independent-writer/write-fault/restore and running native cancellation gates are
still open. Read-OOM recovery with ACK/history reconciliation is not write-crash
or power-loss proof. All larger entity/fact/history ladders, complete schema and
entity costs, calibrated writer floors, three repeated matched cohorts and tail
sample adequacy remain required. No production latency SLA is invented.

The source-only local Git checkpoint excludes caches, generated builds,
databases, VM/disk images, credentials and raw captures. Local evidence remains
retained and charged under the50GB hard/46GB operational storage policy. A source
commit identifies implementation bytes; the retained canonical receipts identify
what ran and what remains unqualified.

Later dependency-scope clarification: the [retained scope note](../../qualification/evidence/runtime-dependency-scope-v1.json)
shows direct preparation omitted `ulidx`→`layerr` and type-library transitive
bytes. This snapshot's counts/reviews establish the **declared** input bytes,
answers and anchors, not a complete transitive/conditional dependency/environment
closure. No original receipt or source manifest is rewritten. Corrected recursive
capture requires a separately prepared fresh run.
