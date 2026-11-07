# Native atomic entity batches

## Approved first slice

One command commits one knowledge position for 1–32 distinct entities. Every
member selects `put` or interval-local `patch`, an entity type and ID, a full
schema record, and a half-open valid interval. The batch selects one immutable
schema name/version. Native C++ validates and lowers the request into one DuckDB
transaction. The batch spike must be rebased onto the mandatory audited native-ownership
strategy before integration. Its earlier portable execution assumption is retired.

The public methods are `batch`, `batchRecords`, and `batchReceipt`. Structured
fields use the existing schema-record encoder. Records retain exact native i64
values. The initial serialized members envelope is limited to 96 KiB, including
UTF-8 bytes, so the public PRAGMA transport stays below its 256 KiB SQL limit.
Each record retains the existing 64 KiB bound. The batch admits at most 4096
submitted distinct facts, 4096 affected old assertions, and 8192 generated
assertions including carry fragments. Every resulting entity retains the
existing 4096-current-assertion bound. Existing retained storage budgets apply.

## Identity, references, and replay

Members are ordered by UTF-8 entity-ID bytes. Duplicate IDs are rejected. A
reference may target an existing native identity or any valid proposed member
of this batch in the same schema with the required type. This admits forward
references and cycles without imposing an execution order. Identity presence
does not require a currently active record.

The parent command owns all new assertions and closes old assertions at the
same position. A parent receipt contains the canonical ordered member receipts,
each with operation, type, entity ID, asserted IDs and retracted IDs. Parent
replay checks canonical request identity before state-dependent reference and
admission checks. Existing command-kind collisions remain errors. Replay returns
the original receipt after later writes and with smaller configured budgets.

The request hash uses the new `td.entity.batch/1` domain. Value IDs use
`td.entity.batch.value/1` with the parent command, canonical member ordinal and
canonical value ordinal. Carry IDs use `td.entity.batch.fragment/1` with the
parent command, entity ID, source assertion and side. Legacy IDs stay unchanged.
Carry provenance keeps the original flattened validation command. No source
chains are introduced.

## Catalog and compatibility

The first successful batch advances store format to 7 and catalog revision to
3. Additive batch-header and batch-member tables retain one main command row and
one clock increment. Effective creator and effective patch views union legacy
commands with batch members and use command ID plus entity ID as the join key.
History, references, and orphan validation resolve through those views.

New binaries continue opening and writing old format 5/6 stores. Old binaries
reject format 7 through their embedded literal format guards. The Python
reference continues explicitly rejecting unsupported native formats 6/7.

Two native entrypoints separate ordinary format-7 execution from first-batch
migration. The thin host reads the format and selects the entrypoint. Both
entrypoints validate the actual current format. The initial entrypoint performs
an idempotent metadata constraint migration and the batch within the same
transaction. It also accepts format 7, so replay through that entrypoint remains
stable. Ordinary batches perform no catalog DDL. A race between first batches
either succeeds atomically or returns an explicit retryable catalog conflict.
No host-authored DDL participates in the migration.

Failure, caller rollback, cancellation, or crash before commit preserves all old
facts, provenance, owners, receipts, clock, usage, format, and revision. A crash
after commit preserves the complete batch and original replay receipt.

## Acceptance work

Focused native/public tests must cover audited execution, canonical replay,
forward and cyclic references, rejected member rollback, interval carries,
format 5/6 migration and old-binary rejection, exact admission boundaries,
caller rollback, late failures, and one observed process-kill phase. An
independently authored oracle exercises simultaneous entity changes and every
small valid/knowledge cut. Build and execution wait for the orchestrator's
exclusive resource lease. Direct C++ append optimization remains a subsequent
measured change.
