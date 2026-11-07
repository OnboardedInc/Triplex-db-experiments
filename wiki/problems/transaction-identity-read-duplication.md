# Repeated XTDB transaction identity reads

Tags: `backend:xtdb`, `surface:xtdb-datalog`, `surface:xtdb-native`,
`problem:transaction-identity-read-duplication`, `mechanism:transaction-local-row-handoff`,
`status:observed`, `status:hypothesis`.

The isolated instrumented `xtdb-driver-stages-observed-v1/0001` diagnostic uses
256 logical clients,16 read offers/s,16 dispatch slots and six ten-entity atomic
corrections over30s. It passes480 actual returned-cut rows, zero errors, all256
clients progressing,479 replies inside30s and six writers ACKed/visible inside
the window. [Independent raw/cut review](../../qualification/reviews/xtdb-driver-stages-observed-v1-independent.json)
and [trace/cohort review](../../qualification/reviews/xtdb-driver-stages-observed-v1-trace-independent.json)
also check2,370 fulfilled callbacks, two20-connection pools,1,150 released leases,
119 other canonical heavy intervals with no overlap and complete cleanup. The
two existing pre-window point validations and setup calls remain recorded;
no extra warmup or hidden retry was introduced. Both commissioned engine
reservations stayed charged; this is not proof of an idle host/native engine.

Each writer actually makes22 SELECT calls before BEGIN:20 identity lookups,
one basis read and one command-claim read. Across six writers, all120 identity
statements form60 pairs with equal SQL hashes and typed parameters, each
returning exactly one row. The [independent pair check](../../qualification/reviews/xtdb-driver-identity-pairs-independent.json)
confirms that equality without executing more queries or using a cache.
Public write start to first BEGIN issue is2.60–3.90s per command; COMMIT SYNC
driver callback spans are126–203ms. These are wrapper/driver wall spans including
network, server and observer overhead. COMMIT SYNC is a composite; no separate
indexing instant or engine CPU attribution is inferred.

The owning source repeats lookup during public transaction validation and then
retraction staging. That code is shared by XTDB's Datalog and authored native
read surfaces, while each surface still needs its own whole-path rerun. The
owner's [new source-only hypothesis contract](../../qualification/load-waves/xtdb-identity-read-hypotheses-v1/plan.json)
proposes one consumable transaction-local row handoff, an equivalent cheaper
native-id predicate and a separately designed bulk staging SPI. The first is
bounded to one row/64KiB, exact source/identity/overlay proof, private copying and
fallback under uncertainty. Draft/component results are not an integrated
optimization or native-engine qualification.

Equal lookups in this fixture do not prove a handoff safe under changed overlays,
child/retry contexts, independent writers, unknown outcomes, stale source cuts,
large rows or different query families. It must retain all logical/public
semantics, transaction preconditions, history/receipt costs, ACK reconciliation
and exact-number behavior. A QLever transfer is a fresh hypothesis requiring Q's
own actual query/phase evidence and qualification, not a presumed shared win.
No Rust bottleneck, throughput winner, production SLA or target-scale result is
established. The earlier failed co-runner/load/dispatch windows remain failed.
