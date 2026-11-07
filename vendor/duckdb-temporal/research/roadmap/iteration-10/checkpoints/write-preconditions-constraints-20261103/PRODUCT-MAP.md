# Mapping the unchanged DuckDB command boundary

Source-only mapping at published PR8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241. No product execution or modification occurred.

## Existing foundations

The current [typed transact implementation]([PRIVATE_REFERENCE_REMOVED]) accepts a required command ID, separate assertion and retraction arrays and an optional evaluated query. It validates values, text, nonempty command changes and duplicate retraction IDs before opening a transaction. Within one RLock/connection it checks the command receipt, increments the transactional clock, inserts receipt metadata, retracts exact IDs, inserts typed facts and optionally evaluates the resulting snapshot before commit.

Every product retraction requires exactly one live matching ID. A miss raises StaleRetraction. Separate equal EAV values can be retained as separate assertion identities. The schema preserves half-open valid intervals and recorded logical-position intervals, four disjoint value families and complete retained rows. These are useful existing contracts. The source's try/rollback structure is not a new proof of rollback acknowledgement, lost-ack recovery, host health or crash durability.

## Required distinctions for a future Triplex facade

- Precondition errors differ. Pinned Triplex accepts an unconditioned missing retract as zero changes, while TripleLive makes it a conflict. Passing all Triplex retracts through the product's strict path would change this behavior. Silently ignoring product errors would weaken the product contract. A selected facade needs its own explicit policy and atomic mapping.
- The pinned standalone retract helper checks its result after transact returns and can report WriteError after a no-op position/envelope committed. The product raises StaleRetraction inside its transaction. A facade must retain this error/outcome distinction rather than infer noncommit from any returned error.
- The product has no EntityState parameter. A separate ID read followed by product transact with no comparison inside that same serialized transaction would not implement EntityState. The comparison must occur inside the write boundary before command mutations. The Triplex comparison includes unretracted future-valid and expired-valid facts, not merely rows returned by a current valid-time snapshot.
- The product always retracts before inserting. Triplex retains operation order and can query broad patterns after earlier assertions in the same command. Splitting one Triplex command into product commits would lose atomic position/claim/journal semantics. The product has no pattern-retraction operation.
- A product command must contain at least one declared assertion or retraction, whereas the pinned shared service does not have the same inspected empty-operations rejection. The exact claimed empty/no-op command surface needs selection and tests, rather than assuming equivalence from the method name.
- Product fact IDs are derived from position and assertion index, and the public schema requires tx_from < tx_to. An adapter must separately address ordered same-command assert/retract effects, returned asserted identities and journal changes; it cannot infer that the current fixed-order history representation already supports them.
- TypedFact and schema2 have entity, attribute, four-tag value and temporal columns, but no entityType field, typed reference family, createdBy, schemaVersion, assertion/retraction transaction-ID columns or graph rule parameter. The earlier typed-value research already records the broader value mapping gap. Application EAV conventions alone do not implement Triplex's typed subject and reference-target behavior.
- Cardinality and uniqueness cannot share a deduplicated query result. The former counts retained live assertion rows at a valid cut, while the latter distinguishes entity claimants by tagged storage identity. Datalog set semantics or flattened public scalar rows cannot reconstruct both counts reliably.
- A check limited to the command's selected valid_at would not cover the pinned graph gate. It must compare current and complete projected relevant facts at all represented valid boundaries while preserving current-recorded identity and single-command ordering.
- An instance-local RLock is not evidence of cross-instance or cross-process graph serialization. Existing bounded single-writer ownership must remain explicit. A new concurrency/constraint guarantee needs its own design and evidence; this packet does not broaden ownership.
- Schema2 td_commits records position, command ID and timestamp, but no authoritative Triplex causal envelope or complete changes journal. Existing receipts do not by themselves establish Triplex command-claim identity or its graph enforcement contract.

Sources: [TypedFact and admission]([PRIVATE_REFERENCE_REMOVED]), [instance lock and initialization]([PRIVATE_REFERENCE_REMOVED]), [schema2]([PRIVATE_REFERENCE_REMOVED]), [retained row and receipt reads]([PRIVATE_REFERENCE_REMOVED]).

## Limits and next selection

Existing limits remain 512 retained assertions, 256 commits, 32 operations, 512 UTF-8 text bytes and the separately qualified observed file-size guard. A future adapter must expose a narrower capability/input envelope honestly or satisfy the broader contract; this research chooses neither route. Source: [legacy constants]([PRIVATE_REFERENCE_REMOVED]).

These are source-derived obligations and intentional contract differences, not runtime failures or evidence of impossibility. No code, transaction, graph model, concurrency test, source helper, dependency or conformance corpus was invoked. In particular, the stopped schema2 attempt and its database were not inspected, reopened, queried, adopted, repaired or retried. Goals 3/original 4 remain held and all prior outcomes remain unchanged.
