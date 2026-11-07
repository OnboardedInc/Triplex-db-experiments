# Database scope and lifecycle hand controls

All fourteen controls below are unexecuted specifications or source deductions. They add no runtime observations, passed tests or goal 10 acceptance. Triplex source is pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0; product mapping is pinned to unchanged PR 8 0e8823973f5e1b886b7ef96e8dc5a899f467f241. Detailed links are in SCOPE-LIFECYCLE.md, CONFORMANCE-PRODUCT.md and PRIMARY-SOURCES.json.

## Identity and physical mapping

1. **Complete tuple.** Keep env=prod, tenant=a:b, database=c, generation 0 distinct from env=prod, tenant=a, database=b:c, generation 0. The canonical tuple representation distinguishes them. Advance only generation to 1 and require a different scope. This is an encoding expectation, not physical isolation.

2. **Validation boundaries.** Blank identity strings and generation -1, 0.5, NaN, Infinity or above the safe-integer range reach TypeError branches in DatabaseScope.make. A cast of the legacy string default cannot pass public Runtime validation. Whitespace within a nonblank string is retained rather than normalized away.

3. **Repeatable test scope.** Two DatabaseScope.test calls with the same name intentionally construct the same test/test/name/generation 0 identity. The fixture owner must separately supply isolated storage. No global uniqueness follows from the helper name.

4. **Shared storage with different identities.** On paper, provide two runtimes the same already-built underlying storage service but different valid scopes. Cursor identities differ; the source has not selected separate data partitions. This hypothetical composition must not be counted as an isolation pass.

5. **Matching storage and query route.** For each proposed DuckDB identity, list the one authorized file/incarnation used by StorageAdapter, QueryExecutor, receipts, commit clock and history. Reject a design in which only cursor scope changes or storage/query layers point at different files. No file is opened for this control.

## Continuation and replacement

6. **Generation-only continuation.** Hold query/type/limit/basis fixed and change only generation 0 to 1. Query and entity-page helpers derive a different scope fingerprint and reject the old cursor with scope_mismatch, assuming an otherwise well-formed cursor. The separate upstream cursor assertion changes database identity; it is not an executed generation-only reset test.

7. **Query size versus entity limit.** For a query cursor, changing pageSize 1 to 2 changes the normalized query fingerprint and yields query_mismatch when scope/basis otherwise match. EntityPage's envelope has no limit field: a new valid limit 2 can pass its preparation checks for a cursor created with limit 1. Helper acceptance does not prove rows were read correctly.

8. **Distinct cursor families.** Entity-page fingerprints are domain-separated and its envelope contains entityType and after, while query envelopes contain queryFingerprint, scopeFingerprint and ordering values. Do not cast one cursor family into the other or assume their page sizes and query-mismatch rules are interchangeable.

9. **Stable reopen versus replacement.** A reopen of the same database incarnation preserves its identity. Replacement requires a host-owned generation advance plus retirement/fencing of old services. The public builder exposes the supplied generation but does not allocate or persist it. This is a future adapter acceptance target, not an implemented prototype feature.

10. **Legacy same-name clear.** Trace manager clear(name) through delete then create(name,description). Its reconstructed scope remains database:name. No generation-based scope mismatch results from that name-preserving transition alone. Old query/type/basis conditions may still reject or change results, so do not label this a successful stale replay.

## Lifecycle failures and coverage

11. **Registry-first creation.** Suppose registration succeeds and service initialization fails. The inspected create branch has no compensating unregister. Record the unresolved registry/storage recovery state rather than assuming creation was atomic. This is a conditional source trace, not an induced failure.

12. **Delete and clear acknowledgements.** Suppose cached scope close or physical storage deletion fails. The legacy delete branch catches those error-channel failures; its storage deletion occurs after unregistering metadata. Its completion alone cannot certify physical removal; a clear that continues into create needs explicit partial-reset semantics. Do not execute deletion or retry any old action for this control.

13. **ACLs and retained handles.** With an ordinary registry access grant and no concurrent writer, successful unregister cascades that grant away; clear's recreate path restores name/description, not access entries. Separately trace cached service references: cache hits precede registry lookup, and operations on a returned TriplesService have no visible per-call registry/generation fence in this manager. Do not infer actual post-close usability, revocation or resource leakage without separate checks.

14. **Keep evidence categories separate.** Mark source encoding/branches, upstream source assertions and actually executed adapter checks separately. runtimeConformance supplies one runtime to the shared Triples cases; it does not establish two-database isolation, entity-page generation invalidation, clear/recreate fencing or manager release. Positive PostgreSQL/FoundationDB isolation source assertions also remain unexecuted here and do not authenticate a future DuckDB adapter.
