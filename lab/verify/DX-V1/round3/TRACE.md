# Round-three source trace and execution limits

Reviewed source is builder `59fb16aef7e74a1c6d2b18dd297803f88765f638`.
`commit-probe.clj` evaluates the actual quoted `commit/code` form. `scope-probe.clj`
evaluates the actual named creation and capability function forms. Their Datomic
calls use explicit index/transaction doubles. They do not execute a Datomic engine.
The scope double simulates unique/value rejection; that is an assumption checked
against schema.clj:27, not a native concurrency result.

## Scope policy and write boundary

- `main.clj:31-46`: bootstrap transaction includes a fresh tempid with the unique/value
  `:triplex.scope/bootstrap "singleton"` and the header/policy. A duplicate bootstrap
  aborts the whole transaction; its catch synchronizes, checks the scope, and accepts
  only an existing initialized scope. The double tests both winning policies and a
  late opposite-policy initializer. An unrelated failure is not proof of bootstrap
  success when the scope is absent. Native uniqueness/atomicity still needs a run.
- `main.clj:47-70`: reopen does not initialize an existing header; schema upgrade writes
  schema/hash, then installs the commit function. Neither changes the policy. Old
  headers with no flag remain false even when reopened with requested true. Only
  boolean arguments are accepted by create. No in-place upgrade/downgrade API exists.
- Both HTTP transact handlers (`main.clj:142-145`, `:182`) call `storage/commit!`.
  `storage.clj:107-221` constructs the one `:triplex/commit` call. Client-supplied rows,
  claims and their timestamps do not provide arbitrary `ops` or a scope-header map.
  Staged `d/with` also uses tx-data; transaction hints never replace the function with
  speculative expanded operations (`storage.clj:225-239`). No HTTP bypass was found.
- Other production direct transactions are schema/bootstrap/hash installation and
  `commit/install!`; index maintenance uses `d/request-index`. The repository's
  native feed/excision fixture and self-tests also use direct Datomic transactions.
  Those native writes are not made subject to the new guard by this change.
- The bit is a normal cardinality-one boolean (`schema.clj:8-12`), not a Datomic
  immutable attribute. A native connection can `d/transact` an add/retract of the
  bit, add rows without the function, or alter journal/maximum annotations. Even
  native calls to the function accept an op that clears the bit (`commit.clj:87`),
  and empty `times` plus empty `record-clocks` vacuously pass (`:94-103`). These two
  function-call boundaries are executable in commit-probe. They are NOT reachable
  by passing arbitrary ops to the HTTP row API. Administrative bypass is an explicit
  trust boundary, not a newly demonstrated HTTP wrong read. Time-local certification
  must exclude such native writers, or enforce/fence them with a new source identity.

## Clock admission and cost

- `commit.clj:88-103`: prior maximum is read from the latest physical Triplex commit
  in head-v2, or the scope in legacy mode. Validation happens in the installed
  transaction function, not a peer check before submission. Two writers staged at
  the same max cannot both commit an equal clock if transaction functions execute
  serially on their actual db-before: the second sees the first's new maximum.
  Sequential evaluation proves the predicate; actual simultaneous native submissions
  and stale hint handling were not executed.
- Strict checked clocks combine every new assertion/retraction timestamp with the
  metadata/claim clocks, normalize to doubles, require one value per physical commit,
  and reject <=prior even with replaySafe=false. The storage builder always supplies
  metadata (`storage.clj:115-119,218`): first fresh clock, retirement clock, claim clock,
  or current wall time for a completely row/claim-free commit. The direct-function
  clockless case above is therefore outside the ordinary gateway builder.
- NaN/infinities/non-numbers in record-clocks reject; typed HTTP doubles also reject
  nonfinite values in codec.clj:32. Mixed finite times reject. A two-journal commit
  with one clock passes; different clocks reject. No-row and retraction-only commits
  advance the maximum and do not reset it after rows disappear. Native raw times
  without record-clocks are not an independently defended input boundary.
- First -0 is admitted with no prior; subsequent +0 is equal and rejects. Clocks are
  binary64: 9007199254740993 normalizes to 9007199254740992; with that prior it rejects,
  rather than accepting two distinct clocks that round to the same double. This is
  not proof of retaining exact arbitrary-precision clock integers. Ordinary typed
  gateway record clocks already use doubles (`storage.clj:56`, codec.clj:32).
- 40 comparisons against actual `7ec1c313` code give identical non-strict outputs or
  errors for both header layouts, missing/false policy, SPI/replay-safe and empty,
  equal, lower, greater and mixed clocks. Cost is NOT unchanged: current code adds
  `d/entid` for the policy attribute and one EAVT scope/attribute lookup even when
  false/missing on a schema containing the attribute. An older schema with no such
  attribute only pays the entid lookup. Strict scopes additionally scan their supplied
  clock lists. The existing durable-max lookup is reused; this is not one new maximum
  scan. No latency, memory or concurrent-writer cost was measured.

## Capability, images, rebuild and lag

- `reach.clj:280-292` reads the stored boolean from the request's database snapshot.
  `config` caches identifier/config information (`:36-50`), not the strict boolean.
  A lagging snapshot predating the flag sees false and declines time-local admission.
  Once initialized, an unchanged immutable-in-the-gateway bit is stable under lag.
  Scope probes alternate false/true snapshots without a shared boolean cache.
- `replica-reads.ts:376-385` requests actual capability; requested create policy is
  not proof. The host takes this boolean once and carries it into its per-host index.
  `RecentReads.image/install` copies the flag; a missing flag defaults false.
  Mixed strict/non-strict indexes and old/shared images pass the new tests.
- `replica-reads.ts:338-356` deliberately assigns NaN to subsequent reset images.
  A rebuild discards the bootstrap clock proof even while retaining the policy;
  later clocks do not resurrect time-only reads. Actual host update-hook and held
  payload tests pass. Position reads remain eligible. Newest time, first closed cut
  and exact window-floor cases pass. A replaced/restored database needs a new source
  generation; policy images are not independent evidence of native enforcement.
- `TimedSource.ts:45-65` binds journal instant to every stored journal row and change
  clock; malformed/mismatched pages publish NaN or no clocks. The original recorded
  feed and forged stored-clock builder tests pass. Two distinct metadata/payload
  revisions sharing a revision number retain distinct prepared observations.

## History import and documentation

To retain arbitrary old record times, create a new non-strict scope (default false;
low-level `DatomicClient.create(scope, layout, false)`), and expect time-only local
reads to fall back. Reopening an already strict scope with false cannot downgrade it.
Alternatively import into a fresh strict scope in strictly increasing binary64
physical-commit times, one clock for all rows/claims in each commit. An existing
strict scope cannot accept preserved times at or below its durable maximum. Do not
rewrite history clocks merely to avoid the guard when their exact values matter.

The adapter README has no strictRecordClocks provisioning/import guidance. Its
line 162 says unsafe SPI retains legacy irregular-history behavior, which needs a
strict-scope exception. The low-level create signature exposes an undocumented third
boolean; the regular runtime creation path only passes scope/layout
(`DatomicStorageAdapter.ts:968`). `ClockConflict` includes the numeric maximum but
the text `TRIPLEX_CLOCK ...` does not explain immutable scope policy or remediation.
The builder report explains the change, but is not adapter-facing documentation.

## New checker findings and scope

`value-characterization.historical.ts` contains exact accepted corruption sequences.
`value-claims.test.ts` independently asserts only the intended invalid-value contract
and currently fails three tests. The Option case changes a real public metadata
string after the first observation without changing the frozen row identity; the
real driver judge still accepts the previous digest. This is not a hash collision.
Hidden array slots are not rejected; numeric non-index keys can replace a sparse
slot in the shape test. These are fault injections, not observed outputs of the
current normal Datomic decoder. Raw sampled full-row comparison would detect a
changed Option payload if sampled after mutation; it does not make the unsampled
cached digest exact. No normal local-read disagreement was found in this round.

The separate temporal test walks only its own receipt rows, retaining independent
record retirement intervals and enumerating active references. Across 1,728 bases,
two roots, shared nodes, a cycle, entering/leaving closures and late p2 ACK after p3,
the warmed expected cache agrees in digest/count/stamp and invalidates on the late ACK.
It uses the same canonical serializer for valid rows, so it does not independently
prove that serializer's injectivity; the new validator attacks test that separately.
