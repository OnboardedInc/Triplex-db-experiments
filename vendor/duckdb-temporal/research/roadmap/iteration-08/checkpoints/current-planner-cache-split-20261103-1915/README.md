# Split goal 8 reuse at the current planner boundaries

3 November 2026, 19:15 UTC. **New source research and proposed next step. No cache implementation or runtime action is selected by this record.** Goal 8 remains unaccepted. Existing stopped actions, databases, artifacts and acquisition attempts are unchanged.

## Useful result

The older goal 8 research remains correct about the invocation-local native dictionary and the incomplete inspection IR. The newest independently published planners create a more useful starting point:

- Independent goal 3.1 already produces an owned, unbound SQL template and typed constant-key parameters from **compile(program, goal)**. A reusable artifact therefore needs the requested goal in its identity. It is not a resolved DuckDB plan, a dataset or a cached answer.
- Goal 5 now owns a strictly decoded, immutable Program for its proved positive, acyclic, filter-free SQL subset. That does not make inspection IR2 a complete native executable plan: opaque filters still select native execution.
- Goal 5's prepared request, proof, SQL and parameter values are not program-only artifacts. Their contents depend on complete retained facts, visibility cuts, requested limits and, for SQL generation, inferred measure types.
- Pure compiler-template work can proceed independently of a shared snapshot cache. It should not be stalled merely because crash recovery is unfinished. Shared facts, indexes and answers still require database-incarnation, committed-publication and owner-lifetime contracts.

This is a narrower, actionable continuation of [the original goal 8 research]([PRIVATE_REFERENCE_REMOVED]), not a replacement of its historical findings or evidence.

## Reconciliation and ownership

The ten-goal Page (private application reference omitted) was read at sequence 107. Its goal 8 block still names the prior unselected parse-artifact research. Current [PR 18]([PRIVATE_REFERENCE_REMOVED]), [PR 19]([PRIVATE_REFERENCE_REMOVED]) and [PR 20]([PRIVATE_REFERENCE_REMOVED]) were reconciled separately; their newer implementation/evidence scopes must not be inferred solely from that older goal 8 block.

PR 18 is draft/unmerged at a6f72041d2620355fd4fcd7f1c33f8deb1bb6bfa, source-only recovery with actual DuckDB execution still unrun. PR 20 is draft/unmerged at 3de749d706de5a421248195483ec22cd053972fb; its selected aggregate conformance has a recorded pass, while its public-store integration remains blocked/unrun. This research does not rerun or independently certify either campaign.

The parent continuation identified active independent 3.1/4.1 work and no known active goal 8 implementation. The available agent listing agreed that no goal 8 implementation worker was visible. Bounded repository/issue searches returned no separate current cache implementation. These observations do not establish predecessor retirement or prove that unpublished work is absent. This packet is independent research only and changes neither existing owners nor their branches.

Later-goal state remains:
- 6: narrow stream-interrupt and logical-bound units exist; expensive private-loop polling and full resource acceptance remain open.
- 7: private ledger unit exists; the separate rollback subject is NONPASS, with no accepted database outcome.
- 8: source research, including this packet; no observed cache hit or incremental maintenance.
- 9: private coverage source-authoring work, not a public interval/history API.
- 10: pinned adapter-contract research, not an implemented/conformant adapter.

## Four different objects, four different reuse boundaries

### A. Owned compiler template

PR 18's compiler accepts complete program text and a requested goal. Its [output]([PRIVATE_REFERENCE_REMOVED]) owns generated SQL text and typed constant-key parameter data. It uses the fixed td31_facts input-column profile and runtime-bound cuts; it does not bind a particular DuckDB connection or input database.

Proposed key: exact complete program bytes, exact raw requested-goal bytes, compiler/language/codec/cap identity and the expected facts-schema profile. Include exact key equality in addition to any digest. Do not key only the whitespace-normalized goal name: raw goal byte/UTF8/cap checks precede parsing. A schema label alone is insufficient if compiler behavior or generation limits change.

The template owns cut descriptors, not the invocation's cut values. Its SQL/constant-key manifest has no input-history row shape or data-derived types; the compiler receives only program and goal. Database identity and valid/known cuts need not be invented for a genuinely unbound syntax template. If catalog resolution, loaded-function identities, physical facts or a prepared statement are added, it is a different object with a stronger key and lifetime. This is a design inference from the pinned code, not an executed reuse result.

### B. Strictly decoded goal 5 compiler IR

[ir2.py]([PRIVATE_REFERENCE_REMOVED]) uses frozen records and owned tuples for typed constants, relations, rules, signed edges and component order. The [decoder]([PRIVATE_REFERENCE_REMOVED]) validates the exact native model/effects and complete signed graph.

The current [helper contract]([PRIVATE_REFERENCE_REMOVED]) still requires genuine compiler output from the admitted session. Its [selection path]([PRIVATE_REFERENCE_REMOVED]) obtains that output afresh. This packet does not silently remove that call or allow caller JSON. A cache after fresh compilation could save decoding only; it would not avoid native parsing and its benefit is unmeasured. Avoid implementing that intermediate cache merely to claim progress.

A future contract that skips genuine compilation on a hit must explicitly establish compiler identity, whole-program equivalence and fresh invocation guards. It cannot inherit that permission from the existing helper.

### C. Data-dependent proof and generated SQL

The immutable [_Prepared]([PRIVATE_REFERENCE_REMOVED]) contains facts, both cuts, limits, Program, Proof, SQLPlan and Explanation. Immutability does not make the object independent of those inputs.

[analyze]([PRIVATE_REFERENCE_REMOVED]) derives active typed sets, per-column domains, aggregate range/tag safety, work/fact/output bounds and the route decision. Dictionary accounting also includes complete retained inputs, not only visible results.

[sql.py]([PRIVATE_REFERENCE_REMOVED]) expands one VALUES arm per retained fact, binds current cuts and constants, and selects MIN/MAX payload columns from the current proof's measure domain. Program-only reuse of either SQLPlan or Explanation would therefore be unjustified. Even equal answer rows do not establish equal admitted route, parameter shape or native-budget behavior.

Recommendation: retain fresh input ownership, proof, SQL generation and parameters in this first reuse lane. SQL-template factorization for goal 5 would be a separate redesign, not a cache around _Prepared.

### D. Bound plans, snapshot indexes and results

PR 18's [adapter]([PRIVATE_REFERENCE_REMOVED]) currently opens and closes a fresh in-memory connection for each execution. It establishes no cross-call prepared-plan owner. A future bound plan needs connection/temp-table generation and rebind/invalidation rules; reusing the same table name is not a generation certificate.

A shared snapshot index or answer additionally needs an authenticated database incarnation, complete relevant schema/program identity, valid cut and committed knowledge/history identity. Tentative positions must remain transaction-private. Reopen, restore, corrections/retractions, limits, retained-row validation and trust/FP checks remain separate. The original goal 8 and goals 6–7 obligations still apply here.

## Proposed next bounded deliverable

**Recommend the independent 3.1 owned compiler-template lane, not a snapshot/result cache.** Source authoring can be separated from its actual DuckDB execution gate. The initial design should:

1. Introduce an explicit caller-owned, single-threaded template-cache object rather than a function global, borrowed callback address or implicit database singleton.
2. Cache successful SQL-producing complete compiler artifacts only, keyed by full program bytes, raw goal bytes and exact compiler/profile identity. Keep non-SQL native_required output uncached. Do not memoize errors, diagnostic permission, facts, cuts, proof bounds, data-dependent route outcomes or database handles. The deterministic template's own route/schema metadata stays part of its artifact.
3. Use a declared entry-count and owned-logical-byte envelope, with pre-copy admission and accounting for resident keys/templates plus replacement/in-flight overlap. Oversized cache admission declines reuse and preserves the independently supported fresh compile path. This is not a process-RSS bound.
4. Return owned results without exposing mutable cache internals. Preserve complete-program validation, including unused definitions, on population. Key/version changes miss; owner destruction retires the cache.
5. Keep input capture, typed validation, current guards, SQL parameter binding, execution, result decoding and close behavior fresh. A compiler-template hit is not a cached runtime-admission decision. If integrated into the scalar callback, every hit must still charge the current batch's serialized output against its existing 8 MiB limit and preserve input/error order; logical cache bytes do not replace that per-batch cap.
6. First verify deterministic pure-template behavior, key changes, collisions, limits and ownership; then admit a separate actual-host test comparing complete cached versus fresh results. Measure parse/SQL-generation savings separately from input setup and execution.

This recommendation does not select code changes or execute the recovered PR 18 source. The exact authoring interface, numerical cache envelope and test/action admission should be finalized against that lane's current owner before implementation, avoiding duplicate implementation. The first proof can remain independent of database snapshots, dependency installation and crash-recovery tests.

## Twelve new hand controls

These are source-derived specifications and small mathematical distinctions, **not run tests or simulated project results**.

1. **Goal identity:** one program defines two different output relations; compiling goal A and goal B must not hit the same compiled-template entry merely because program/cuts match.
2. **Unused invalid definition:** modifying an unused component to an invalid or recursive definition changes complete program identity. Invalid syntax/safety must retain its diagnostic; a disconnected recursion must retain the compiler's native_required route rather than an old SQL success.
3. **Compiler identity:** equal program, goal and IR schema labels under a different compiler/codec/cap revision miss unless equivalence is explicitly established.
4. **Digest collision:** unequal complete key bytes assigned the same test hash bucket remain unequal. Hash equality alone never authorizes reuse.
5. **Fresh data:** an eligible pure-template hit with a different owned retained history binds that new history; it does not retain a prior invocation's rows.
6. **MIN/MAX domain:** the same goal 5 program with only i64 measures versus only f64 measures has different SQL payload-column choice. A program-only cached SQLPlan is not interchangeable.
7. **Retained shape:** adding a valid inactive retained fact can preserve the visible mathematical answer while changing the VALUES-arm count and parameter vector.
8. **Limits:** high versus low max_work can change SQL proof/admission or native outcome for otherwise equal program/history/cuts. A previous route explanation is not reusable permission.
9. **Inactive malformed input:** equal visible triples do not permit a cached path to bypass validation of a newly malformed inactive retained row.
10. **Fresh bound owner:** a newly created connection or recreated same-name td31_facts relation cannot inherit a prior prepared-handle owner merely by name.
11. **Oversize/replacement:** the current entry plus a candidate/key/return copy are counted together at replacement. Eviction cannot label still-owned bytes freed.
12. **Retraction/correction:** an unbound template may remain eligible for changed input, but no old closure/result is maintained by that fact. Recompute facts/proof/answers until a separate support-tracking design is accepted.

## Independent source challenge

A separate read-only source countercheck of the pinned PR 18 compiler, adapter and scalar callback found one draft ambiguity: complete compiler artifacts contain their own syntactic route/reason, so excluding every route field contradicted the proposed object. The draft was corrected to cache SQL-producing artifacts only and retain their compiler metadata while excluding data-dependent proof/route outcomes and runtime-admission decisions. Exact raw goal identity, cached cut descriptors versus fresh values, whole-program invalid/recursive distinctions and the existing per-batch output cap were also made explicit. No remaining blocking PR 18 source finding was reported after these corrections. This is a source/design review, not independent runtime evidence.

## Evidence and remaining limits

The companion source ledger records named files, immutable refs, connector-returned blob identities and independent source review. No subject parser/compiler/import, build, SQL/native/database operation, package acquisition, computer snapshot or Codex task ran in this research. No original held/stopped material was inspected, repaired, adopted or retried. No cache speedup, memory bound, healthy reuse, cache hit, randomized equivalence, incremental insertion/deletion or full goal acceptance is established.
