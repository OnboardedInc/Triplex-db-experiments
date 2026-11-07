# Explicit assertion snapshots: source-only next wave

The strict eight-entity qualification remains **failed**. The independent
[V4 review](../../reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json)
recomputes 47 passing checks and five failures of the new historical metadata
target, including eleven future-retirement field witnesses. Membership, values,
full lifetime history, both schema releases, Required rejection and receipts
passed separately. None of those facts relabels the combined failure or admits
100k entities. No implementation, build, oracle test or new engine action in this
directory has run.

Use one [event oracle](oracle.mjs) and [frozen proposal](reproducers.json) for two
separately selectable candidates. Prefer **A first**: a distinct committed
assertion-snapshot helper over the already closed native relations. It changes no
raw lifetime API or default runtime. B compares the integration cost of the same
cut/projection inside a new adapter primitive. They are correctness mechanisms;
no performance comparison is proposed by this menu.

The public input is the existing schema/QueryRequest plus **R/V only**. Each new
read captures committed upper P internally once, resolves V once, preserves an
explicit R only when supplied, and returns the real scope/P/V/R in ReadBasis.
The existing Native provider already follows that source-cut pattern
([NativeQueries.ts](../../../packages/xtdb/src/native/NativeQueries.ts):76–103).
The ordinary TemporalBasis does not admit private P
([Temporal.ts](../../../packages/core/src/Temporal.ts):11–21,41–55). Returning
P does not grant a caller permission to inject it into ordinary match/query.

The distinct `SnapshotAssertion` carries the usual Triplex identity, typed value,
validity and assertion lineage, plus a clearly named `knownRetirement` option.
It does not silently redefine `Triple.retractedAt` on ordinary raw reads. Both
`live-at-valid` and `known-at-valid` modes apply half-open V; the latter also
returns retired assertions whose arrival is known at the cut, with their known
retirement lineage. Current raw `match/entity/entities/history` remain unchanged.
The result is a qualified projection API, not a test-harness normalizer.

The new result codec is explicit rather than borrowing the old `Triple` shape:

```ts
type SnapshotAssertion = {
  readonly id: Triple["id"];
  readonly entityId: Triple["entityId"];
  readonly attribute: Triple["attribute"];
  readonly value: Triple["value"];
  readonly recordedAt: number;
  readonly validFrom: number;
  readonly validTo: number | null;
  readonly createdBy: string | null;
  readonly entityType: string | null;
  readonly schemaVersion: number | null;
  readonly txId: TransactionId | null;
  readonly knownRetirement: null | {
    readonly recordedAt: number;
    readonly txId: TransactionId | null;
  };
};
```

This uses existing TypeExpr/TypeSchema and leaf types. Nullable metadata is a
declared codec of the new result, not a change to ordinary Option-valued Triple
metadata. Actual schemaVersion is copied as adapter metadata and never inferred
from an application type-version fact. The source oracle uses symbolic receipt
IDs; an actual test binds those only to its independently retained write ACKs.

The existing native source is useful owning-code inspiration: all retirement
fields are guarded by retirement P and optional R before projection
([Sources.ts](../../../packages/xtdb/src/native/Sources.ts):58–97). Its fresh
qualification is still required for the new declared row/result contract.
Candidate B must capture P before its one selective read and use internal
ResolvedTemporalBasis; no separate latest-position lookup after the answer may
be labeled its cut. A writer between those operations must not leak retirement
metadata. The first candidates are committed-only and do not claim that a basis
serializes pending transactions, children or retries.

Each candidate uses the four-commit/five-version fixture and the same two-commit
same-R control. Internal capture is paused, a second real writer commits, and
the original read resumes at its **actually captured** upper P. The oracle's P
field is a replay coordinate, never an extra public input. Original raw lifetime
read controls, exact retirement equality, half-open boundaries and a fresh-client
repeat are mandatory. Maximum fixture writes are six commits/seven assertion
versions; values/lineage are never reconstructed from candidate query outputs.
The main and same-R fixtures each use one subject in their own fresh scope; each
candidate therefore owns two scoped subjects and the two candidates use disjoint
scopes. This is a microfixture, not configured-entity capacity.
The seven pure test definitions are unexecuted until separately granted.

`SnapshotService` is not this raw assertion view. Its public result contains an
entity attribute map/hash and transaction identity
([canonical.ts](../../../packages/core/src/snapshots/canonical.ts):24–45).
Its writer reconstructs commit state, serializes values and writes
`entity_blobs/entity_snapshots`
([SnapshotServiceLive.ts](../../../packages/core/src/snapshots/SnapshotServiceLive.ts):80–208).
It requires SQL `rawQuery`; the current XTDB StorageAdapter does not expose that
refinement. The post-commit capability explicitly cannot roll back a source
transaction when projection fails
([EntitySnapshotsCapability.ts](../../../packages/core/src/snapshots/EntitySnapshotsCapability.ts):74–87).
It would add projection storage/write/freshness costs and still omit individual
assertion retirement metadata. Do not enable or rename it to imply this target
has passed.

C stays gated research. XTDB's engine system timeline supports historical table
reads, but it is a different coordinate from the fixture's numeric Triplex R.
The current driver records await visibility tokens, not a durable logical-cut
mapping ([XtdbClient.ts](../../../packages/xtdb/src/XtdbClient.ts):252–264).
Authoritative semantics distinguish snapshot visibility from query wall time;
current documentation is corroboration, not a pin of the entire running image.
See the [official query basis reference](https://docs.xtdb.com/reference/main/sql/queries.html#basis)
and [time model](https://docs.xtdb.com/about/time-in-xtdb.html#system-time).
The verified `v2.2.0` [SQL grammar](https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4#L81-L87)
admits the snapshot/system-time syntax. That syntax alone does not prove a mapping
from scope P or recordedAt. One physical commit can contain staged logical
positions; native time alone may therefore need the same logical projection.
No CLOCK_TIME conversion or post-COMMIT latest-token shortcut is eligible.

Freeze exact source and independent oracle before pure tests, then exact private
build selection and grants before native tests. Keep control/candidate artifacts,
the old raw compatibility behavior and V4 failure independently reproducible.
No default integration, metadata masking in the harness, new persistent index,
Rust, larger capacity or sustainability claim is included.
