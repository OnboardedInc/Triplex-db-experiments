# Start here: independent XTDB/QLever native effort

Read the [scope and evidence](README.md) first. Work only in your own checkout
and foundations. This source handoff grants no operation on the Codex homebase;
do not reuse its15442/17019 services, canonical queue, databases, dependencies,
VM, credentials or resource reservations. There is no shared coordination mailbox
or cross-vendor launcher to adopt.

1. **Orient without running historical commands.** Read
   [Core NativeQuery](../../packages/core/src/native/NativeQuery.ts),
   [native read basis](../../packages/core/src/Temporal.ts),
   [XTDB native entry](../../packages/xtdb/experiments/native-entry.ts),
   [QLever native entry](../../packages/qlever/experiments/native-entry.ts), and
   the two [native workload recipes](../../packages/qualification/src/native/).
   Archive/handoff scripts describe their own machines and old authority.
2. **Establish your own reproducible baseline.** Pin source, runtime/dependency
   versions, actual build inputs/outputs, engine configuration, schema contracts,
   fixture and independent expected answers before a trial. Use small fresh
   disjoint scopes, retained receipts and fixed cuts; preserve raw outcomes
   before assertions. Reopen clients and repeat original-cut reads. A clean
   checkout does not include every ignored local experiment or historical binary.
3. **Prioritize XTDB XTQL, retain SQL as a named alternative.** Public
   `makeXtdbNativeQueries().select` authors XTQL; `selectSql` authors SQL.
   Start with matching typed values, assertion identities/history, R/V/fixed P,
   current/reopen and atomic shared-write receipts. Existing native142 contains
   authored SQL controls; it cannot qualify the whole XTQL language. Do not map
   logical recordedAt to native system time without proving the cut mapping.
4. **Prioritize actual QLever semantic counterexamples.** Keep the original
   mixed-case/codepoint and correlated-NOT-EXISTS expected answers. Compare
   semantic evaluation repair, coherent vocabulary/index representation, or an
   explicitly schema-derived maintained order key only as separately named
   hypotheses. An encoded key must prove its own order under the pinned engine;
   it does not make arbitrary SPARQL STR compliant. Count rebuild, freshness,
   historical retirement, write and storage costs.
5. **Keep write/cancellation outcomes honest.** HTTP acceptance, ACK, visibility,
   local Effect settlement and physical native termination are different.
   A caught inner request error can make an outer Effect appear successful.
   Homebase source review
   [abeed866…](../../qualification/reviews/qlever-wrapper-runtime-v3-source-metadata-independent.json)
   leaves the full-suite wrapper blocked; a private SDK observation successor is
   source work only. Do not borrow its pending0/cleanup claim or manipulate the
   homebase's unresolved hold markers. Unknown writes require durable outcome
   resolution before retry, not a new latest-position oracle.

Useful read-only source searches **in your own checkout**:

```sh
rg -n 'selectSql|run\("xtql"|recordedPosition' packages/xtdb/src/native
rg -n 'makeQleverNativeQueries|resolveNativeReadBasis|knownRetraction' packages/qlever/src/native
rg -n 'claimCommand|withTransaction|OutcomeUnknown|replaySafe' packages/xtdb/src packages/qlever/src
```

Choose and record your own bounded CPU/memory/disk/concurrency envelope before
heavy work. Account for engine plus client/compiler/observer/cleanup, persistent
data, history, WAL, spill, index rebuild and backup overlap. Preserve failures
when a cap is reached; do not clean them away or call logical file bytes peak
allocation. Do not change HOME or borrow global caches. The repository's
`tools/bootstrap/with-env.sh` is a **homebase-owned** cache/VM/storage wrapper;
read it as a setup example rather than running it against this workspace or
adopting its Docker socket in your independent environment.

For orientation only, the homebase uses max3 heavy jobs/10GiB/8CPU including
5GiB/3.5CPU resident foundations, with46GB operational/50GB hard owned storage
including ZIP, mounted workspace and private VM. Those are **not** available
capacity or a grant for the independent effort. Its `status`/`doctor` CLI can
publish a state revision; read-only inspection there uses `readState`, not
snapshot. Do not operate that state at all from the independent native project.

Codex keeps DuckDB/XTDB/QLever Datalog, shared foundations/controller and common
SDK/schema work. This handoff does not authorize edits or commits in their
workspace, promise automatic cross-path acceptance, or introduce human approval
for each source edit in your own project. Native-only qualification must name
its actual public entrypoint and independent source/build/oracle receipts.
