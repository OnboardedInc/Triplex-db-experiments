# EXP-FD01: identity-only feed and host consumer

North star: P3, ordered exact resume with zero gaps, order violations and duplicate visible effects
(`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3). This is offline infrastructure, not NS.P3 acceptance.

Public subpaths: `@triplex-build/triplex/feed`, `@triplex-build/triplex-host/feed`,
`@triplex-build/triplex-testkit/feed`. The host root stays portable; the host `/feed` subpath uses Node's
SQLite (runtime SQLite >= 3.51.3). Run it in a dedicated consumer process/worker. It is synchronous host
IO, separate from the source database. `openBrokerFeedReader` isolates synchronous broker reads in a
worker; it consumes a built module exporting `LogFeed`, not backend source imported into host.

`FeedEntry` is a source resolution containing zero or more identity-only logical transactions. Coordinates,
positions and microsecond stamps use canonical decimal strings to avoid number narrowing. Arrays retain
source order; `feedBytes` canonicalizes object keys and rejects unknown fields. A cursor binds the immutable
tenant/database/generation/source identity. Supply a new source identity after replacement/restore unless
the source publishes an explicit epoch transition. Publication monotonic instants belong in a separate
source observation map; a decided stamp must never be used as the start of a lag interval.

`SqliteConsumerStore.apply(consumer, expectedCheckpoint, page, affected)` uses BEGIN IMMEDIATE, keyed effects,
affected subjects, resume digests and checkpoint in one transaction. It checks the expected checkpoint,
source/stream binding, resolution order and changed replay bytes. Its separate SQLite `.lock` file excludes
another writer for the life of the store. Close the store to release ownership; do not delete live WAL or
lock files. The store creates fresh tables only; this first implementation has no migration from old JSONL
journals. Retain old journals as historical evidence. Affected subjects must be provided by the dependency
consumer (EXP-DI01); direct entities are only a diagnostic. Effects here are durable work records, not
external delivery acknowledgements: an external receiver must also deduplicate its delivery key (GS.19b).

## Integration seams

- Broker (`exp/SQL01-broker-sqlite` 4863a8e0): `LogFeed.poll` returns resolutions, native cursor and transacts.
  FD01's reader-worker request kind is `feed`. The branch's changes omit assertion IDs; delivery refuses
  these tuples until the broker includes its original row identity. Optional decided stamps remain pending
  RT01. The adapter supports epoch, abort and seal resolutions; the upstream reader must actually emit seals.
  This work does not mutate/cherry-pick the unmerged broker or its JSONL consumer. After merge its caller
  should use this store instead of `FeedConsumerStore`; the old implementation is a historical control.
- Native XTDB (`exp/P2X-xtdb-commit-feed` fb6681a4): `poll` always gets `exact:true`; METADATA is never a
  substitute for tuples. The branch omits assertion and transaction IDs, so `xtdbChangeFeed` requires an
  asynchronous source-backed identity lookup for each ordinal/change index. Do not invent IDs from position
  or value hashes. The lookup must run at the same source cut. Enable decided stamp exposure only after RT01
  round B qualifies the source stamp. P2X's in-engine consumer remains a control; production callers use this store.
- Journal: `journalChangeFeed` projects identity-only fields from `transactions`; its arm is always
  `A0-control`. Stamps remain pending unless supplied by an explicit decided-stamp resolver after RT01.
- Datomic: `datomicChangeFeed` throws `FeedUnavailable` naming EXP-DF01. No log route exists in the inspected
  DA01 branch. Do not substitute value datoms or txInstant. DF01 must test byte-exact resume across excision.

## Offline checks

With dependencies installed from the shared pinned store, run:

```sh
node lab/bin/heavy.mjs --label CX-FD01 -- node lab/experiments/EXP-FD01/verify.mjs
```

The script retains attempt-specific source hashes and raw outputs in the durable CX-FD01 evidence directory.
It builds public exports, checks types and runs the host feed suite, including 600 abrupt child-process exits
(100 per hook for each arm). O-REPLAY runs fresh on `oracle.case.json`; source fixtures are independently
written, not copied from oracle output. Fixture adapters are not a qualification of unmerged lane engines.
`runFeedCrashConformance` is reusable with a lane-specific stop/reopen driver; `auditFeed` requires an independently
enumerated final source prefix and O-REPLAY identities, never expectations inferred from the delivered stream.
The unkeyed split control must duplicate after every after-effect crash or the trial is void. The gap mutation
first audits the unmutated feed, drops a commit resolution and requires the audit to reject it.

## Round 2: atomicity and publication clocks

QA `verify/FD01` at `fd8f670` showed that keyed replay hid a two-transaction consumer. The store itself
is unchanged; conformance now requires `ConsumerSnapshot` observations **before replay** and independent
complete before/after expectations. `runFeedCrashConformance(run, {before, after})` checks 500 keyed
stops (100 each at the three application hooks and immediately before/after actual SQLite COMMIT),
300 unkeyed split controls and 100 keyed split controls. The keyed split is the reviewer's exact
in-memory `COMMIT; BEGIN IMMEDIATE` mutation. The child intercepts actual COMMIT execution, including
compound statements, so a split inserted after the after-effect application hook is exposed. A
candidate's partial effects/affected/checkpoint state fails before replay even if replay would deduplicate.
The explicit keyed-split negative arm must be rejected; a non-duplicating unkeyed control remains void.

`publicationLagMs(publication, known)` computes the interval from two source/stream/epoch/position-bound
host-monotonic observations sharing a clock ID. No stamp or ACK is an input. `auditFeedLag` requires
one durable-known observation for every committed position, requires its publication observation,
and compares each reported lag with the computed interval. Missing, duplicate, foreign and mismatched
observations fail. The QA fixture (publication 100, durable 400, decided stamp 399) must yield 300 ms;
a stamp-derived claim of 1 ms fails.

The NS A0 consumer now requires a `publicationOf(key)` source-observer callback and exposes
`publicationKey(position)` for indexing those independent observations. Missing publication data fails
before advancing the checkpoint; record time and ACK arrival are never substituted. Samples are bucketed
at publication time. ACK diagnostics remain separate and nullable until ACK observation. **The legacy NS
driver has no source observer integrated yet and now refuses those P3 samples**; P3M must supply the actual
lane publication map. This is deliberate refusal, not a new live-lane or 256-reader result.

Unmodified reviewer probes and their `fd8f670` hashes live in `round2/reviewer-probes/`. Their original
relative paths assume `lab/verify/FD01`; the adapted `round2/source-hook.mjs`, `mutant-hook.mjs`,
`check-mutant.mjs` and `clock-probe.mjs` run here. The original mutator is imported verbatim by the crash
child and the adapted mutation runner. The runner requires the specific before-replay atomicity failure;
an import error or arbitrary nonzero test exit cannot count as rejecting the mutation.
