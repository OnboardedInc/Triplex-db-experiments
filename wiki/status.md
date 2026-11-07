# Current evidence and next waves

> **triplex-db-2 scope note (2026-11-07):** goals, scope and performance targets for this checkout are defined only in
> [`lab/SCOPE.md`](../lab/SCOPE.md), [`lab/NORTH-STAR.md`](../lab/NORTH-STAR.md) and [`lab/TARGETS.md`](../lab/TARGETS.md). Where this
> file states goals, targets, scale, load profiles, lanes, queues, resource grants or devloop procedure, it is superseded
> history from the homebase. Read it only for facts about code and evidence.

Current evidence update:2026-11-07. References retain their exact as-run source/build scope. All ten outcomes and the10m-entity/100m-active-domain-fact target remain OPEN. No path is promoted and no production SLA or winner is claimed. A CLI `completed_verified_bytes` result establishes its registered checks; later timing/liveness review can still disqualify an observation.

The source-only integration base (before the later Duck withdrawal repair) is
`ca2dd6d321aaf4e479bfe31eb3e0b0163309cbad`, tree
`3fc5ddc0af1f637bdc2fd13a57d2831c0f50bde1`.
[Independent verification](../qualification/reviews/source-integration-final-independent.json)
matches all251 selected files/modes, unchanged baseline entries and799 qualified
source/build/native-artifact pins across nine canonical gates. The compact
[five-path checkpoint](checkpoints/functional-source-20261106.md) records exact
profiles and strict load failures. Later product/helper/docs changes are explicitly
content-bound; no clean-tree, remote publication or default promotion is implied.

Dependency scope is explicit: historical preparation lists captured direct
packages but omitted transitive witnesses such as `ulidx`→`layerr` and
`@types/node`→`undici-types`. [The scope note](../qualification/evidence/runtime-dependency-scope-v1.json)
does not invalidate retained answers, anchors or declared-byte checks. Those pin
counts are **declared inputs**, not proof of a complete transitive/conditional
package or environment closure. A corrected builder and fresh attempt are
separate work; no missing dependency is retroactively added to an old receipt.

A later full-source noEmit diagnostic found a separate baseline metadata type
gap: general `ReadBasis.scope` required a brand that existing low-level runtime
strings do not carry. Both the isolated A source and unchanged no-A control
reported the same seven errors. The control's expected-failure byte check is
**not type acceptance**; [both failures remain retained](../qualification/evidence/read-basis-scope-brand-noemit-failure-v1.json).
The separate annotation-only correction now passes strict noEmit and four
negative static witnesses [on its exact source](../qualification/evidence/read-basis-scope-baseline-types-v1.json).
The witness is included in the standard core runtime type project, and both
[normal copied source/runtime type projects also pass noEmit](../qualification/evidence/read-basis-scope-baseline-types-v2.json).
General scope remains the existing opaque string; native/public runtime inputs
keep branded validation. [Independent source/type review passes](../qualification/reviews/read-basis-scope-baseline-final-independent.json).
Ordinary public declaration generation and real public type witnesses are
[independently cleared](../qualification/reviews/read-basis-generated-public-final-independent.json).
The current 380-file public tree is `55f6fce60c3cb12b167076287b7df06275a44f91abaf5a2a3b4992fb1e53bea3`;
all 104 executable JavaScript files are byte-identical to the retained earlier build.
The [required 13-package clean consumer gate also passes independent review](../qualification/reviews/read-basis-core-pack-final-independent.json);
its native engine smoke was disabled. Earlier engine results retain their
original as-built identities. The rebased isolated A draft passes full noEmit
and its three fake-port contrast cases under a new768MiB profile; the earlier
512MiB resource failure and original seven-error type attempts remain retained.
[Independent source/type/fake review](../qualification/reviews/duckdb-owner-a-rebased-final-independent.json)
establishes that scope. The isolated optional-capable Core→Duck tree now
[typechecks and emits with independent review](../qualification/reviews/duckdb-owner-a-isolated-build-v1-independent.json),
but its first seed failed before database creation on an unbundled Core import.
The [closed import-map successor](problems/unbundled-core-module-resolution.md)
now passes the fresh seed and both small native arms: same tree,17answers/bases,
37→20 physical BEGIN/COMMIT/full owner activations (34→17 eligible plus3 common
setup), and genuine queued zero-later-work cancellation.
[Independent arm review](../qualification/reviews/duckdb-owner-a-actual-v3-arms-independent.json)
qualifies only that isolated diagnostic scope. The [new exact-emitted three-case fake gate](../.devloop/jobs/duckdb-owner-a-emitted-settlement-components-v1/attempts/0001/terminal.json)
also [passes independent component review](../qualification/reviews/duckdb-owner-a-emitted-settlement-v1-independent.json); the [wording correction](../qualification/evidence/duckdb-owner-a-emitted-settlement-scope-v1.json)
keeps old emitted-versus-copied evidence distinct. The later [public-suite apparatus first failure](../qualification/evidence/duckdb-owner-a-qualification-v2-first-failure.json) retains separate44 PASS and combined setup failure against the frozen service; neither142 v2 arm ran. The v3 successor now independently passes [both unchanged44 modes](../qualification/reviews/duckdb-owner-a-foundation44-v3-independent.json) and [both full142 modes](../qualification/reviews/duckdb-owner-a-packet142-v3-independent.json). Its194 eligible point calls per arm verify388→194 complete physical scopes and matching captured/returned cuts;10 fixed-basis interval calls remain ineligible. Raw SQL/parameters and auxiliary point rows are digests; full142 business rows are retained. Acquired public-answer cancellation/resource-failure remains a required separate gate. No A integration, default,
physical acquired-query cancellation or performance claim follows.

The acquired-answer resource apparatus now has a bounded [19-control fake-only
checkpoint](../qualification/evidence/duckdb-owner-a-public-resource-apparatus-fakes-v2-author.json).
It preserves the source-blocked locked-settings and duplicate-file predecessors;
the successor requires both distinct files and the unchanged mandatory lock.
The [independent source/component review clears that scope](../qualification/reviews/duckdb-owner-a-progress-initialization-v4-independent.json). No SDK/compiler/native operation ran in
that gate; real public activity, cancellation/drain, answer admission and
fresh-process defaults remain unexecuted.

The later [controller state-growth incident](problems/controller-state-growth.md)
left fresh XTDB-native-v5 and QLever-native-v4 child142 results **unpublished and
unqualified**. Exact old/post-reconcile state bytes are retained. The explicit
v2 repair migrated the actual68MB history to478KB under a256MiB heap;27 focused
controller tests and old-receipt/history audits pass. The explicit orphan cleanup
disposition released only proven-gone clients, retaining shared backends and
missing terminal anchors. Independent6+12+5 migration/component/disposition
checks [pass](../qualification/devloop/evidence/controller-thin-state-independent-link-20261106.json),
so v2 is ready for fresh product captures. A current source/diff archive is preserved; old working-tree
hash records provide partial reconstruction, not full source snapshots.
New jobs now retain [copied source/runner/oracle/recipe preimages](../qualification/devloop/evidence/controller-preimages-20261106.json)
and actual controller bytes. The current31-test suite, nine independent checks
and real canonical logical recipe/retained-byte verification pass. Credentials
and dependency/build caches are omitted, and no historical snapshot is invented.

| Surface | Fresh bounded evidence | Remaining gate |
| --- | --- | --- |
|`duckdb-datalog`|[Current SDK48v9](../.devloop/jobs/duckdb-sdk-entry-v9/attempts/0001/terminal.json) and [142v5](../.devloop/jobs/duckdb-datalog-packet-v5/attempts/0001/terminal.json) pass after the separate queued-read withdrawal repair; [final independent review](../qualification/reviews/duckdb-withdrawal-final-independent.json). [Scoped checkpoint](../qualification/evidence/duckdb-withdrawal-scoped-checkpoint-20261106.json) retains all9 attempts and first failures.|Confirmed queued cancellation executes zero later native work; every actual transaction still audits. Already acquiring standalone metadata may finish after caller interruption. Strict16RPS failure remains145correct/335errors and4/6writers inside30s; no performance/default/capacity or A/B/C result.|
|`xtdb-datalog`|[Current44v5](../.devloop/jobs/xtdb-foundation-44-v5/attempts/0001/terminal.json) and [142v3](../.devloop/jobs/xtdb-datalog-packet-v3/attempts/0001/terminal.json), including final signed-zero/core bytes, pass; [independent combined review](../qualification/reviews/xtdb-final-combined-independent.json).|Strict16RPS/256-client load has480correct/0errors but only1/6writers in30s. Returned-cut correctness does not satisfy writer liveness.|
|`xtdb-native`|[Current142v7](../.devloop/jobs/xtdb-native-packet-v7/attempts/0001/terminal.json) passes with final source preimages. Narrow signed-zero24+10 and unchanged native13 gates pass after the retained four-case parameter failure.|Earlier640-correct5s and128RPS dispatch observations fail liveness/availability. A separate native16RPS control has480correct/0errors and6/6writers inside30s under a different cohort. It is a diagnostic, not calibrated capacity or transferred Datalog acceptance.|
|`qlever-datalog`|[Qualified unchanged44](../.devloop/jobs/qlever-foundation-budget1-v1/attempts/0001/terminal.json) and [142](../.devloop/jobs/qlever-datalog-budget1-packet-v1/attempts/0001/terminal.json) pass at explicit F1 profile: same2GiB,persisted/MINUS/paired/bounded,Eoff,planner1 restored100; [independent combined review](../qualification/reviews/qlever-combined-final-functional-independent.json).|The separate public string extension fails seven of nine checks, including an impossible wrapper text-family guard and actual mixed-case sort/page errors. Qualified-F1 strict load fails215correct/265errors and0/6writers inside30s. Earlier A–E/default failures remain; F1 survival does not promote a default or establish capacity.|
|`qlever-native`|[Qualified142v5](../.devloop/jobs/qlever-native-packet-v5/attempts/0001/terminal.json) and [entry11](../.devloop/jobs/qlever-native-entry-final-v1/attempts/0001/terminal.json) pass at planner100 before/after,same2GiB,after the [task-wideP repair](../.devloop/jobs/qlever-native-task-cut-fixed-v1/attempts/0001/terminal.json); [independent entry review](../qualification/reviews/qlever-native-entry-final-independent.json).|The separate public string extension fails nine of eleven checks. Raw correlated-NOT-EXISTS controls remain separate real failures; authored recipes do not qualify arbitrary SPARQL. Native-only16RPS fails448correct/32deadlines and0/6writers inside30s. RDF quads/wrapper size are not qualified domain scale.|

The [actual public string extension v6](../qualification/reviews/qlever-public-string-v6-terminal-independent.json)
retains31 raw SDK responses: translated2/9 and native2/11 logical checks pass,
while cursor/P1/R, three acknowledged commands, correction history and settings
invariants pass. Mixed-case order/range/page failures are actual observations,
not only source hypotheses. The [wrapper-lowering guard](problems/qlever-wrapper-string-range.md)
is distinct from the [native STR codepoint discrepancy](problems/qlever-native-string-order.md).
An isolated adapter-only repair now has [independent package-output review](../qualification/reviews/qlever-wrapper-sdk-build-v3-actual-independent.json)
and [pure16/strict public-DTS prerequisites](../qualification/reviews/qlever-wrapper-runtime-v1-source-independent.json).
Its [actual17-call lowercase probe](../qualification/reviews/qlever-wrapper-lowercase-v1-actual-independent.json)
passes all12 native/current/reopen range answers,15 bases and all eight terminal
pages. The [unchanged31-call mixed-case successor](../qualification/reviews/qlever-wrapper-mixed-v1-actual-independent.json)
still fails seven of nine translated and nine of eleven native logical checks.
The repaired wrapper returns `>E=[z]` and `<c=[A]` instead of impossible-family
empty arrays; those rows still fail the original common oracle. Both attempts
retain their actual planner100→1→100/final100 readback, ACKs and cleanup.
The mixed attempt retains all24 bases, old cursors and correction history.
Native engine comparison semantics and old expected answers are unchanged;
unchanged44 and both142 on the isolated candidate remain unexecuted. No other
surface's string results or performance acceptance is inferred.

The [actual eight-subject configured XTDB fixture](../qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json)
independently reproduces47 passed checks and five failed NEW historical
retirement-metadata target checks. Ten typed snapshots and100 lifetime versions
retain11 future-retirement row witnesses at older public R cuts. Membership,
lineage, both ConfigStore releases, explicit Required atomic rejection, seven
ACKs/journals, five command claims and seven operation receipts pass their scoped
checks. Presence/type-version are explicit application facts; adapter codec
version1 is distinct, and datatype auto-enforcement is unqualified. The prior
raw-lifetime match contract is not relabeled as an old regression. Nine file
metadata snapshots show+2,583,961 logical bytes with zero observed block/backing
delta; this is neither exclusive fixture growth nor a peak/capacity estimate.
The strict tiny gate stays failed and larger stages remain blocked.

The [20-test controller checkpoint](../qualification/devloop/evidence/controller-load-interop-20261106.json) and independent [13 direct guards](../.artifacts/comparison-hardening-independent/94712402-f4ac-4393-b1f4-33ef33527e4b/review.json) cover retained result bytes, immutable receipt anchors, private owner/resource admission and controlled comparison inputs. Earlier6/7-check independent actual-process/recovery reviews retain their own exact-source scope. No controller review substitutes for public engine gates.

The later [current23-test owner-freshness checkpoint](../qualification/devloop/evidence/controller-owner-freshness-20261106.json) adds fresh required-owner inspection before grant. Its [independent actual stopped-aux review](../.artifacts/required-owner-independent/c3a76549-6a2b-4fc4-8766-06bae324dd1e/review.json) passed five checks: a stale ACTIVE record for the real stopped auxiliary and a live PID with wrong birth identity are refused, UNKNOWN is durable, reservations stay held and no attempt/child is created. Canonical foundations are unchanged by that component-only review.

The earlier compact [Duck/controller/public checkpoint](../qualification/evidence/duckdb-public-checkpoint-20261106.json) binds ten actual completed attempts, four independent/component review references and a fresh18.0GB owned-disk guard result. The independent [full packet review](../qualification/reviews/duckdb-packet-v3-independent.json) recomputes packet expected rows and compares raw answers/traces; it does not claim performance. Source/build identities apply to each attempt's exact closure. Historical working-tree hashes/commands/traces give partial reconstruction; they are not complete source preimages. The earlier [source/diff archive](../.runtime/source-checkpoints/4430cb24-e593-423f-be8b-b9aa5727221d/checkpoint.json) remains retained; new jobs now preserve copied content-addressed source/runner/oracle/recipe and actual controller preimages. Immutable full per-run build closures remain deferred.

[Required package check](../.devloop/jobs/public-pack-regression-v2/attempts/0001/terminal.json) passed12 tarballs/clean consumer/type exports/SQLite/CLI checks. [Required PostgreSQL integration](../.devloop/jobs/public-postgres-regression-v3/attempts/0001/terminal.json) passed20/20 tests,zero skipped, including the unchanged shared-conformance composite on an owned512MiB auxiliary. The later [13-package native consumer](../.devloop/jobs/public-native-consumer-v2/attempts/0001/terminal.json) also passes actual new facade reads and Duck explicit C++ artifact loading/interval reopen; its first authored tagged-text fixture error remains under `public-native-consumer-v1`. Nothing has been published.

## Live problem-led candidate menus

These replace automatic priority from the initial15 unexecuted menus. Candidate source/queued menus are hypotheses until actually executed; only measured same-problem arms become comparative evidence.

| Lane | Measured stage or required first probe | Two or three alternatives for its next rolling wave |
| --- | --- | --- |
|DuckDB Triplex|Measured repeated complete owner-activation wall dominates the point fixture; queued withdrawal is independently qualified correctness only.|A: same isolated tree now verifies17answers/bases and37→20 physical audited scopes, explicit queryAll/includeBasis only, with independent review. Exact-emitted3fake and isolated44/142 modes pass independent review, with194 point calls proving388→194 complete physical scopes. Acquired public-answer cancellation/resource-failure, ordinary integration/default/performance remain unqualified. B: proven physical/catalog/context/mutation read epochs; C: cheaper complete audits after finer internal spans remain competing proposals.|
|XTDB Triplex|The later isolated16RPS diagnostic passes480/6; actual22pre-BEGIN SELECTs per writer include20 duplicated identity lookups.|One-consumable-row getById→retract handoff; cheaper equivalent native-id predicate; separately designed bulk staging SPI. [Both explicitly selected builds pass unchanged44](../qualification/reviews/xtdb-selected-foundation44-v1-independent.json). The [fresh actual seven-case pair is independently verified](../qualification/reviews/xtdb-handoff-observed-focused-v2-independent.json): current/reopen answers and native safe/unsafe CAS match, with20→10 exact per-ID identity callbacks and all pools/leases closed. Old v1 fixture-decoding failures remain; overlapping timings are descriptive only, with no default/full142/performance adoption.|
|XTDB native|Earlier native16RPS passes and128RPS/5s observations fail under their own cohorts. The measured identity duplication lives in shared Triplex writes.|The same narrow handoff/predicate/bulk alternatives need this path own whole-public rerun and helper maintenance accounting. No automatic transfer of a Datalog outcome or timing winner.|
|QLever Triplex|F planner1 survives44/142 at2GiB, then the qualified-F1 load fails215/265 and0/6writers.|Collect read-admission/answer/write phase spans first. Conditional alternatives are same-cut admission-proof reuse, reduced native query work and a selective write-lookup handoff. The XTDB mechanism transfers only as a fresh hypothesis, not measured Q evidence.|
|QLever native|Authored native142 passes; separate native-only16RPS fails448correct/32deadlines,0/6writers,all6reconciled at planner100.|First locate the actual point/write phase. Conditional alternatives: fewer same-cut round trips, bounded native statement work, selective write-lookup handoff. Preserve shared writes/history and native correlation limitations; no optimization is qualified.|

At most three heavy trials run; admission may allow fewer. Aged opportunities and physically admissible vectors permitted concurrent Duck/Q trials. Workers do source, oracle and review work while queued. Controls/candidates retain common measurement/dependency/oracle inputs; implementation changes remain allowed and require independent exact-candidate verification. Fixed cohort labels and initial admission snapshots alone are not a continuous whole-window co-runner audit.

See [Duck recursion/resource failures](problems/duckdb-recursion.md), [native correlation](problems/native-correlation.md), [load offer timing](problems/load-offer-timing.md), and [storage/spill lifecycle](problems/storage-and-spill.md). Reuse a mechanism across lanes only as a new hypothesis with that lane's own rerun.

QLever translated A–E attempts retain their actual same2GiB planner OOMs, including compact projected/MINUS/scalar/paired/order variants. An unavailable-server MINUS attempt remains a setup failure. The later F planner-threshold1 candidate passes unchanged44 and all142 with actual100→1→100 restoration, but its strict load still fails. Native-only planner100 also fails availability/liveness under a separately declared diagnostic; neither is a throughput comparison. Nested double-NOT was rejected by the actual public validator before lowering, so its defensive MINUS-eligibility coverage is not an observed current Datalog bug; the raw SPARQL controls remain a separate finding.

Fresh repaired stress observations are now retained: [512](../qualification/evidence/xtdb-load-512-open-stress-v2-strong-bytes.json) has299 correct actual bodies/981 declared rejections; [1024](../qualification/evidence/xtdb-load-1024-open-stress-v2-strong-bytes.json) has334/2226. Both pass raw timing/returned-cut checks after the monotonic pacer repair. Both still have zero writer commits visible within the fixed5s window, so neither is liveness or performance acceptance. The initial timing-disqualified attempts remain unchanged.

The [independent writer/pool/timed-population review](problems/load-liveness.md) now distinguishes ACK lateness from visibility probing and keeps actual wire-template hashes. Later frozen8/16/32 dispatch arms all fail read availability/liveness:647/992/974 correct replies through drain, but only571/781/765 completed inside30s. Goodput uses those timed counts; tail replies remain in latency accounting. No arm is a qualified winner. The [QLever planner chain](problems/qlever-planner-memory.md) records subsequent same2GiB projected/MINUS/scalar failures and the paired-retirement work separately.

The later [16RPS control independently rehashes](../qualification/reviews/xtdb-writer-rate16-control-v1-independent.json)
480 correct replies,479 inside30s, zero read errors, all256 clients progressing
and all six writers visible/reconciled. Its offered load differs from the failed
128RPS arms, so this is a bounded diagnostic rather than a promoted winner.
The fresh [XTDBnative-v6 independent review](../qualification/reviews/xtdb-native-v6-duckdb-independent.json)
checks all142 expected/raw answers and210 native traces after successful v2
publication. Its historical source retention remains partial.

An isolated [actual XTDB native float-parameter probe](../.devloop/jobs/xtdb-native-f64-parameters-v1/attempts/0001/terminal.json)
retains four of24 failed bit checks: bound negative zero returned positive zero
in SQL/XTQL current/reopen paths, while20 other checks pass. Native literal/text
controls preserve negative zero. No application writes occurred; this is a
parameter/evidence-path finding, not demonstrated stored-fact loss. The narrow
driver/evidence repair now passes24 parameter checks plus ten inspected controls
and the unchanged13-check entry. [Independent review](../qualification/reviews/xtdb-signed-zero-v2-independent.json)
checks all four repaired raw/typed negative-zero paths, distinct metadata tags,
source preimages and unchanged exact-int64 decoding. The first failure remains
unchanged; full binary64 and stored-fact qualification are open. See the
[problem/solution note](problems/native-number-parameters.md).
