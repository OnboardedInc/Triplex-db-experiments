# Where compact saves move the work

**North star.** P1/P4 exact pinned and current pulls, P7 touched-subject cost, and P8 import alongside live traffic. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Read work

A new peer reaches an account and subject through the uniqueness indexes. A cold current pull fetches the subject's complete event chain, decodes the bodies, and folds live intervals. Shared roots each have their own chain. A subsequent current pull uses the immutable cached projection or folds the suffix from its last event to the captured head. The bounded cache retains no plaintext protected values. It has no entries for subjects that have neither been read nor edited through that peer. Datomic itself retains its own live index and segment cache.

A pinned pull selects the account's native transaction, skips later logical positions within a group, and folds the older subject chain. Retired rows are omitted from the visible world and retained in history with both clocks and valid bounds. A person with many years of edits can take proportionally longer to reconstruct. Add independently verifiable subject checkpoints before promising a history-depth tail. Such a checkpoint needs the exact source event, live assertion IDs and intervals, content checksum, erasure frontier, and replay from its successor. A corrupted or missing checkpoint can fall back to the Datomic chain. Checkpoints belong in a recoverable read projection with their own write budget.

The incumbent local TypeScript replica reads a different representation with an already built projection. The matched native-gateway read comparison prices storage access and decoding. The replica needs its own update, bootstrap and retention test before replacing its feed source.

## Import and migration

One 160-fact subject image fits in an event envelope. The loader groups eight prepared images and validates each durable member before progressing. A full 16M-fact account needs 100,000 logical first saves and roughly 12,500 physical groups on this loader. Throughput with live traffic depends on the longest granted frame, current and pinned read latency, and index jobs. A bulk import should have a bounded grant, with explicit progress under sustained live traffic.

The encoder sampled 256 evenly spaced synthetic subjects across the 100k ID range. Their 160-fact bodies averaged 6,844 B, which puts 16M facts at about 684 MB of event bodies. That figure excludes native datom headers, indexes, log tree and WAL.

At the lab's 3,000-fact/s mixed-traffic target the import takes about 89 minutes. Staging, receipt checks, indexing and readiness have to fit inside the real import measurement.

To migrate, export each account's original dense order, command IDs and request identities, original receipt tuples, assertion and retirement IDs, both time axes, release and notice state and the current erasure frontier. Replay into a fresh account with a migration-only coordinate/clock writer and an original-to-new assertion and native-transaction lookup. A legacy transaction touching several owners at one logical position requires one logical event with separately addressable owner slices. If the source lacks a request fingerprint or its exact preimage, keep the legacy receipt resolver for those commands. Copy encrypted protected payloads only under keys that are still live. Publish old erasure tombstones before opening the destination.

Compare the source and destination at named cuts and page size one, with exact receipt resend, active and retired records, ready notices and erasure markers. Follow the intervening feed through a recorded barrier. Fence the old route and move the account after the new write fence and receipt lookup are durable. Keep the old route available for original-coordinate pin resolution until the alias and restore paths have been checked. Native queries over incumbent row attributes and existing cursor encodings need explicit adapters.

## Remaining engineering

- The prototype covers one subject per normal command and the W0 schema. Bulk imports with original shared logical coordinates, arbitrary Triplex SPI journal rows, whole-scope constraints and native Datalog range projections need implementation.
- Index selectivity and hot-cache fit change when head markers, unique claim keys and retained events grow from thousands to millions. The cold path can lose the write-side gain if each save first reconstructs a long subject chain. Use a persistent or cached touched-subject projection with a measured bounded suffix.
- Publication recipes carry the source witness. Concrete changed outputs, ready notice debt, delivery progress and the one-second visibility gate need the ACT1/ACT2 integration. Protected range data and key custody require the separate erasure system and its restore proof.
- Datomic Pro's peer can address every account in its database. The experiment separates account keys and feed predicates. Production storage-layer isolation and quiet-account behavior require separate qualification or account placement in separate databases.
