# R38: EXP-ER01, erasure end to end on lanes X, Q and D

**Written:** 2026-11-08, planner R38 (Opus 5.5, high) under `lab/PROTOCOL.md`. Design only: no engines, no Docker, no product code.
**North star:** Sam's must-have "real erasure or crypto-shredding of PII" (`lab/SCOPE.md` 2.3, `lab/TARGETS.md` section 3 row 5 and
section 7), with P1 (pinned readers) and P3 (the feed) held during erasure, measured by GS.16's three sub-schedules (pinned reader,
rebuild, restore) and O-OBS canary scans of every protected copy (Q82d).
**Status:** complete.

## Sections

0. Answer
1. The public `erase` operation and the ErasedValue marker (the Q24 against Q89i conflict)
2. Per-subject keys (shared core, then lanes Q, X, D)
3. The erasure frontier and the erasure ledger
4. Proof of erasure
5. P1 and P3 during erasure
6. Builder briefs, gates and order
7. Decisions for Sam
8. Sources

## 0. Answer

1. **The operation.** `erase` is its own command for one subject, with selectors `{entityId}`, `{entityId, attribute}` and `{id}` (Q52g, Q56f). Every read route returns `ErasedValue {type: "erased", valueType, erasedAt, erasureTxId}` at every basis for every request that starts after the erasure publishes; history keeps its shape.
2. **The Q89i conflict.** Recommended (Sam decision S1): the erasure frontier is read at each request's start and every answer carries `erasure: {seq}`. Same basis and same sequence give identical bytes; a newer sequence may differ only by markers, so bytes never change silently and no request that starts after an erasure returns plaintext. Q66b's "same prefix on later pages" is replaced by markers, or a typed `CursorErasureConflict` when the cursor orders by an erased value.
3. **Keys.** One random data key per protected assertion (not per subject, because `{id}` must erase one assertion), from a durable pre-issued pool so commits add no fsync. Keys are wrapped by per-tenant epoch keys that rotate after erasures, which makes every stale key copy (WAL, freed blocks, backups) useless. Values are sealed in the TypeScript core; no engine ever holds plaintext of a protected value.
4. **Per lane.** Q: envelopes in frames, H1, `recent_rows`, replica and `cur` graph; `keys.db` beside `broker.db`; generations drop erased ciphertext. X: envelopes through `packValue`, including `value_identity` and journal; `tx_erasures` in the erase transaction; no XTDB `ERASE`. D: envelopes in `:f.v/string`, `:f/erased-in`, keys in Postgres schema `triplex_keys`, excision of value datoms as the second layer.
5. **Frontier and ledger.** Every erasure is recorded twice: in the data commit and in a ledger kept with the keys. The key store and ledger only move forward, so a data restore replays the ledger and can never bring a value back (its key is gone).
6. **Proof.** Four scans with their own positive controls (plaintext with an unprotected twin, ciphertext copies, key bytes, and a decryption attempt with every key copy the lab can reach). QLever needs an FSST decoder; Datomic segments are expected to be REFUSED for plain scans, so lane D passes through key evidence.
7. **P1 and P3.** No erasure step takes a lock readers use; the feed never carried values; erase commits are ordinary feed positions; an admission controller paces the 10k-subject job against the writer bar.
8. **Order.** ER01-C (core) with ER01-S (scanners) first; then ER01-X and ER01-R (rotation); ER01-Q in two rounds behind Q58c and QG1; ER01-D behind DA04. Sam: S1 to S4 in section 7.

## 1. The public `erase` operation and the ErasedValue marker

### 1.1 What exists today

| Piece | State on main (59e07afb) | Source |
| --- | --- | --- |
| `erase` op | absent. `TransactOp` is `assert`, `retract`, `retract-pattern` only | `packages/core/src/Triple.ts:100-129` |
| ErasedValue | absent from `TripleValue`; W0 and O-REPLAY model it (`{"erasedAt": ...}` only on PII attributes) | `packages/core/src/Value.ts:65-75`; `packages/w0/src/schema.ts:14-23,169-173` |
| PII flag on attributes | absent from core `Attribute.Definition`; W0 has `pii: true` on `worker.ssn` only | `packages/core/src/config/Attribute.ts:26-37`; `packages/w0/src/schema.ts` row `ssn` |
| Journal value copies | every `:_tx/change` fact holds "the complete typed value" | `packages/core/src/store/Triples.ts:91-106` |
| XTDB plaintext derived copies | `value_identity = canonicalJson(value)` on every assertion row and in `tx_constraint_graphs`; maintained-query cache tables hold projected values | `packages/xtdb/src/XtdbStorageAdapter.ts:297-298,706-716`; `ConstraintValidation.ts:48,117`; `MaintainedQueries.ts:62-64,310` |
| QLever plaintext channels | value literals, numeric order keys and lexical channels per row | `packages/qlever/src/rdf.ts` (`literal`, `numericOrderKey`) |
| Broker frames | rows and priors as full `TripleRow` arrays in JSON, including journal rows | `.claude/worktrees/agent-a56ab43df1f0e0ef7/packages/qlever/src/broker/frames.ts` |
| Broker feed | identities only: `(op, entity, attribute, validFrom, validTo, position)`, no values | same worktree, `broker/feed.ts:31-47` |
| Evaluation closures | record `sha256` digests of observed values; `World.ts` itself warns a digest over a low-entropy value is reversible. An SSN has about 10^9 values, so an unkeyed digest of it is recoverable by enumeration | `packages/core/src/config/World.ts:15-24` |
| Contract | `ERASURE`, `PROTECTED_COPY_INVENTORY` and 44 `ER-*` obligations are compiled; GS.16 is TO-AUTHOR | `lab/acceptance/build_contract.py:1291-1318`; `obligations.json` |

So erasure is a contract with no product behind it, and today's code writes plaintext PII into at least seven kinds of copy.

### 1.2 The operation

The shape follows Q52g, Q56a, Q56f and Q56g.

```ts
// packages/core/src/Triple.ts (additive)
export const EraseSelector = Schema.Union([
  Schema.Struct({ entityId: EntityId }),                         // every protected assertion of the entity
  Schema.Struct({ entityId: EntityId, attribute: Schema.String }), // every protected assertion of one attribute
  Schema.Struct({ id: TripleId }),                                 // one assertion (Q56f)
]);
export const TransactEraseOp = Schema.Struct({ op: Schema.Literal("erase"), selector: EraseSelector });
```

| Rule | Behaviour | Basis |
| --- | --- | --- |
| Spelling | `erase`; `erasure` is a typed invalid-command error | Q52g |
| Own command | a command holding an erase holds only erase ops, all for one entity (one subject, so P2's per-subject commit holds); no preconditions; anything else is a typed invalid-command error | Q52g; per-subject commit (SCOPE 2.3) |
| Resolution | selectors resolve inside the commit, at the commit's own position, under the subject's CAS, so a write racing the erase is either before it (erased) or after it (a new, readable value) | Q31c positions |
| Unknown id | E-INVALID-VALUE, as for retract | Q56a |
| Matches nothing | commits with an empty change list | Q49b, Q56a |
| Re-erase | changes nothing; `erasedAt` stays the first one | Q49b |
| Retract after erase | commits; history shows the marker with the retraction time | Q56g |
| Unprotected target (new) | an `{id}` selector naming an assertion of an attribute not declared protected is a typed `E-ERASE-NOT-PROTECTED`; entity selectors skip unprotected attributes. Reason: a plaintext copy in XTDB's log or QLever's vocabulary cannot be removed, so honouring the request would claim an erasure that did not happen | TARGETS 7 items 3 and 9; Sam decision S4 |
| Journal record | an ordinary transaction with a position, txId, `:_tx/` facts and a change list of identities only (entity, attribute, assertion id, key id) | Q49a |
| Result | `TransactResponse` plus `erased: number` and `erasureSeq` (the ledger sequence, section 3.3) | additive |

### 1.3 The marker and the read value type

```ts
// packages/core/src/Value.ts (additive; never accepted on the write path)
export const ErasedValue = Schema.Struct({
  type: Schema.Literal("erased"),
  valueType: ValueType,      // the assertion's declared type: shape is kept (Q24 "shape")
  erasedAt: Schema.Number,   // record-time stamp of the first erasure commit (Q90a stamp / 1000, epoch ms)
  erasureTxId: TransactionId,
});
export type ReadValue = TripleValue | ErasedValue; // every read route returns ReadValue
```

An `assert` whose value has `type: "erased"` is E-INVALID-VALUE. Protected attributes are declared in config: `Attribute.text("ssn", { protected: true })` (W0's `pii: true`). A protected attribute is limited to the kinds the envelope supports in round 1 (string, integer, decimal, datetime, date, json); `blob` is refused until the blob store is in the inventory, because a blob's value is a content hash of the document.

### 1.4 What every read route returns, before, at and after the erasure

Let E be the erasure commit at position p_E, published at instant t_pub. Let a request start at instant t_start and name basis B.

| Request starts | Basis B | Value returned | Rule |
| --- | --- | --- | --- |
| before t_pub, still running at t_pub | any | for each erasure commit in flight: all of its values as they were, or all as markers, never a mix; several in flight: a prefix in position order | Q52e, Q66a |
| after t_pub | B >= p_E | ErasedValue | Q24 |
| after t_pub | B < p_E (a pre-erasure basis) | ErasedValue, never the value | Q24; TARGETS 7 item 1 (flagged) |
| after t_pub | a basis before the assertion existed | nothing (the assertion is absent at B, as without erasure) | shape kept |
| any | history and raw-lifetime APIs | the assertion with its intervals and ids, value replaced by ErasedValue | Q24 shape; Q89i raw-lifetime rows |

The same table holds for every route: repository pulls (`getByEntity`, `getByEntities`, `query`, `history`), the P4 current path (broker H1, XTDB `tx_current`, QLever `cur` graph, Datomic `:f/live`), the journal (`transactions()`, `:_tx/change`), subscriptions, explain, cursors, and native queries through the facade (Q58a). For native queries see 1.6.

Value-dependent query semantics stay as compiled (Q49c, Q52a to Q52d, Q56b to Q56e): an erased value matches no value predicate, aggregates skip it, COUNT counts it, ORDER BY puts it after readable values and before missing ones, Unique ignores it, Required is satisfied by it, and answers never depend on what the value was.

### 1.5 The conflict between erasure and Q89i, settled explicitly

**The conflict.** Q89i (pending) says a read at a named basis returns the snapshot as known at that basis, so "repeating the request after later commits returns identical bytes". An erasure is a later commit that, under Q24, changes what a pre-erasure basis returns. Taken literally the two rules cannot both hold. Q66b (compiled) sides with the snapshot for cursors: "every later page answers with that same prefix", which means a cursor opened before an erasure keeps serving plaintext on later pages after the erasure published. The brief adds two constraints: a pinned snapshot taken before an erasure must not start returning plaintext after it, and must not silently change bytes.

**What a fix must satisfy.**

1. No request that starts after t_pub returns plaintext of an erased value (Sam's must-have; the brief).
2. A change in bytes caused by erasure is visible as such in the answer, never silent (the brief; Q89i's purpose).
3. Readers keep working through a 10k-subject erasure at P1 bars (GS.16; P1 is Sam's first priority).
4. Answers never depend on the erased value, including through ordering (Q56c; TARGETS 7 item 4).

**Options.**

| Option | Rule | Plaintext after t_pub | Bytes change silently | P1 during erasure | Key destruction | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Frontier at request start (recommended) | Each request applies every erasure published before it started. Requests in flight at t_pub may finish with old values (Q52e). Continuation pages, lease steps and repeats are new requests. Every answer carries `erasure: {seq}`. Q89i becomes: same basis and same `erasure.seq` give identical bytes; a newer `erasure.seq` may differ only by value to ErasedValue at assertions erased in between. A cursor whose order or filter depends on a value erased since its first page fails with typed `CursorErasureConflict` instead of re-ordering | only inside requests already running at t_pub (bounded by the request deadline) | no: the `erasure.seq` field changes with the bytes, and the harness checks the only difference is markers | unaffected; a cursor conflict only when it orders by a protected value | after a grace G equal to the longest admitted request deadline | meets 1 to 4 |
| B. Snapshot keeps its erasure prefix (Q66b as written) | A cursor, lease or pinned read keeps the erasure prefix it started with for its whole life | yes, for the life of the cursor or lease; a P5 sweep pin may live up to 24 h (Q68b) | no | unaffected | must wait until every older lease drains, up to 24 h | fails 1 |
| C. Refuse stale snapshots | A cursor, lease or repeat whose erasure prefix is behind the frontier fails typed `SnapshotErased`; it never returns markers inside a pinned read | no | no | every pinned reader in flight across GS.16 (10k erasures over minutes) restarts, so correctness-qualified goodput falls | after G | meets 1, 2, 4; hurts 3 |
| D. Erasure is basis-relative | a pre-erasure basis keeps returning the value | yes, forever | no | unaffected | never | not erasure; rejected |

**Recommendation: A.** It is Q24 plus Q52e, with two amendments: Q89i's identical-bytes contract is stated per `(basis, erasure.seq)`, and Q66b's "same prefix on later pages" is replaced by "markers on later pages, or `CursorErasureConflict` when the cursor's order or filter reads an erased value". This needs Sam (decision S1) because it changes the public contract of pinned reads, and Q24 and TARGETS 7 item 1 are already flagged for him. Until he answers, builders implement A as provisional; changing to B or C later changes the read path in one place (section 3.2) and regenerates GS.16's goldens.

**Why the answer carries `erasure.seq`.** Under A two requests at the same basis can differ. Without a field the caller cannot tell a correct erasure from a bug, which is what "silently" means. The field is the per-tenant erasure-ledger sequence (section 3.3), not a data position, because restore can renumber positions but never the ledger. Q58a's answer envelope `{basis: {low, high}, route}` gains `erasure: {seq}`.

**Consequences for the contract (orchestrator rulings, after S1).**

| Item | Change |
| --- | --- |
| Q89i | "identical bytes" holds per `(basis, erasure.seq)`; across sequences the route-equivalence harness (Q89f) replaces erased values by markers on both sides, as Q31f already requires |
| Q66b | replaced as above; O-REPLAY's `cursorFrom` on an in-flight entry answers with the cursor's current frontier, or the typed conflict |
| ER-CURSOR-ERASURE-PREFIX | expected answers regenerate; the oracle author changes O-REPLAY, a separate builder from the SUT (Q90f pattern) |
| Explain at a pre-erasure basis | shows the marker (TARGETS 7 item 1), unchanged |

### 1.6 Native queries

Engines never see plaintext of a protected value (section 2), so a native SPARQL, XTQL, SQL or Datalog result holds the envelope text in a protected cell. The native facade (Q58a) turns every cell that parses as an envelope into `SealedValue {type: "sealed", valueType, keyId}`, or `ErasedValue` when its key id is in the erased set. It decrypts a sealed cell only when the query also projects that row's assertion id, because the envelope's authenticated data binds it to (tenant, entity, attribute, assertion id) and the facade needs that context to check it. A native query cannot filter, join, order or aggregate on a protected value; the engine sees random ciphertext, so it would answer wrongly, and the facade refuses such queries on protected attributes with typed `E-PROTECTED-NOT-INDEXABLE` where its compiler can see the attribute (Triplex-compiled routes always can; hand-written native text is documented as unsupported). This is an orchestrator ruling, not a Sam decision.

## 2. Keys

### 2.1 Shared design (core `KeyVault`)

**Unit of key: one assertion, not one subject.** Erase accepts `{id}` (one assertion) and `{entityId, attribute}` (Q56f), and the oracle expects every other assertion of the subject to stay readable. With one key per subject, crypto-shredding cannot erase one assertion without erasing all of the subject's protected values, and the engines cannot rewrite old ciphertext under a new key (XTDB's log and QLever's vocabulary are append-only). So each protected assertion gets its own random 256-bit data key. This refines Q58e's "encrypted per subject" to "per assertion, grouped by subject"; erasing a subject destroys all of its assertions' keys. It needs an orchestrator ruling, not Sam.

**No derivation for data keys.** A data key derived from a longer-lived key (for example HKDF over a tenant key and the subject id) can be derived again, so deleting it destroys nothing. Data keys are random. Nothing else is derived from them: the envelope is their only use. The evaluation closure stops digesting protected values and records the assertion id instead (a changed value is a new assertion, so the dependency still changes exactly when the value does; `World.ts` already notes digests are reversible over small value spaces).

**Key hierarchy.**

| Level | What | Where | Destroyed when |
| --- | --- | --- | --- |
| K_a, data key | 256-bit random, one per protected assertion | key store row `(key_id, tenant, epoch, wrapped)`; `wrapped = AES-256-GCM(KEK_t,e, K_a, aad = key_id)` | the shredder deletes the row after the erasure publishes plus grace G (section 3.4) |
| KEK_t,e, epoch key | 256-bit random, one per tenant and key epoch | the key authority (`kms.db` in the lab, a cloud KMS key version in production) | at rotation, after every surviving K_a of the tenant is re-wrapped under KEK_t,e+1 (section 2.6) |
| Root | wraps epoch keys in the lab key authority | a file outside every data directory, volume and backup | never (it wraps only epoch keys; their stale copies are covered by the rule that `kms.db` has no backups older than its last destruction) |

The epoch key exists for one reason: the key store is large and busy (one row per protected assertion, so millions of rows, WAL churn, freed pages and its own backups), and any stale copy of a deleted K_a in its WAL, free space or backups would undo the shred. Wrapping every K_a under an epoch key that is itself destroyed after re-wrap makes every stale copy useless at once, and leaves one small file (`kms.db`) whose copies must be controlled. R32 4.3 item 2 reaches the same point for lane D ("the WAL window must close before the erasure counts as done, or the tenant key must also rotate"). Epoch keys are per tenant, which also gives R19's per-tenant cryptographic isolation (option E) with no extra mechanism.

**Envelope.** `txe1.` + base64url of `keyId (16 B) | nonce (12 B) | ciphertext | tag (16 B)`, AES-256-GCM, plaintext padded to a multiple of 32 bytes so length leaks only a bucket. Authenticated data: `(tenant, entityId, attribute, assertionId, valueType)`, so a ciphertext copied into another row fails to open. The plaintext is the canonical value encoding the lane would have stored (decimal TDK1 text, integer decimal text, and so on), so a decrypted value round-trips exactly (SCOPE 2.4). One envelope is computed per assertion and the same bytes go to every copy (row, journal change, frame, current copies).

**Key pool, so the commit path adds no fsync.** The vault creates keys in batches (default 4,096 per tenant), wraps them under the current epoch, and inserts them in one durable write, already marked as issued to this process incarnation. A commit takes the next key from memory. After a crash, unused issued keys are abandoned and never reissued, so no key can ever encrypt two assertions. The binding from assertion to key is the key id inside the envelope, which is stored with the data, so the key store needs no write on the commit path. Abandoned keys cost about 100 bytes each and are dropped at the next rotation (a key with no envelope referring to it is found by the rotation's scan of live key ids, 2.6).

**Reads.** Every adapter's decode step calls one core function, `unseal(rows, frontier)`: rows whose assertion id is in the erased set (section 3.2) become ErasedValue; the other envelopes are opened with keys from an in-process LRU (keys only, never plaintext), loading misses for the whole request in one key-store query (`WHERE key_id IN (...)`). A key missing for an assertion that is not in the erased set is a typed `KeyMissing` error, never plaintext and never a silent marker.

**What may stay plaintext.** Entity ids, attribute names, `value_type`, assertion ids, key ids, positions, valid and record times, transaction ids, entity types, actor ids and references. The schema rule is that entity ids and reference values are opaque (no email or SSN as an id). Every attribute not declared protected stays plaintext, with its order keys and lexical channels unchanged.

**What protection costs (SCOPE 2.4, TARGETS 7 item 4).** Ciphertext under per-assertion keys has no order and no equality across assertions, so a protected attribute is not eligible for engine-side range predicates, ORDER BY, equality filters or joins, Unique, GROUP BY or value aggregates. Range rules and value predicates over a protected attribute run in the TypeScript kernel per subject after `unseal`, which SCOPE 2.4 already allows ("arithmetic runs in the TypeScript kernel per subject"). A schema that declares a protected attribute Unique or uses it in an engine-compiled range rule fails at definition time with `E-PROTECTED-NOT-INDEXABLE`. W0 is unaffected: its only protected attribute is `ssn`, its range rules are on `payRateCents`, `weeklyMinutes` and the wage tables, and nothing is Unique on `ssn`. Order-preserving encryption is rejected: it leaks order and approximate value, and it cannot work across per-assertion keys. A blind index for Unique over a protected attribute (a keyed hash kept in the key store, deleted on erasure) is a later option; it is not needed for any golden scenario. Sam confirms this cost in decision S3.

**Commit-path cost.** One AES-256-GCM seal per protected value (R19 E10 estimates well under 0.1 ms per command with 10 values) and no extra durable write. Commits without protected values are unchanged.

### 2.2 Interface

```ts
// packages/core/src/crypto/KeyVault.ts (new)
export interface KeyVaultService {
  readonly seal: (tenant: string, ctx: SealContext, plaintext: Uint8Array) => Effect.Effect<Envelope, VaultError>;
  readonly unsealBatch: (tenant: string, cells: readonly SealedCell[]) => Effect.Effect<readonly Uint8Array[], VaultError | KeyMissing>;
  readonly shred: (tenant: string, keyIds: readonly KeyId[]) => Effect.Effect<void, VaultError>; // idempotent, durable
  readonly rotate: (tenant: string) => Effect.Effect<RotationReceipt, VaultError>;            // section 2.6
  readonly status: (tenant: string) => Effect.Effect<VaultStatus, VaultError>;                // epochs, pool, pending shreds
}
```

Two backends: `SqliteKeyVault` (better-sqlite3, its own file `keys.db`, never the data file) for lanes Q and X and the core test bed, and `PostgresKeyVault` (schema `triplex_keys`, own role) for lane D (Q88c). The erasure ledger (section 3.3) lives in the same store as the keys, because both must survive a restore of the data and neither may be restored from an older copy.

**SQLite settings for `keys.db`.** WAL, `synchronous=FULL`, `fullfsync=ON`, `checkpoint_fullfsync=ON` (the R23 and R25 durability pragmas), `secure_delete=ON` so a deleted row's bytes are zeroed in the page, never `VACUUM` (it writes a new file and frees the old file's blocks with the bytes in them), and a fixed `journal_size_limit` so the WAL is reused in place. These narrow the stale copies; the epoch rotation is what makes the remaining ones (APFS copy-on-write under the host file, SSD remapping) useless.

### 2.3 Lane Q: broker frames, H1 and QLever generations

| Copy | Today | With ER01 | Erasure action |
| --- | --- | --- | --- |
| Broker log frames (`rows`, `priors`, journal rows) | plaintext `value_string`, `value_json`, numeric columns | protected rows carry the envelope in `value_string`; numeric columns null; `value_type` kept | none in the log (Q58e: no rewrite); the erase member is an ordinary commit-group member with identities only |
| `recent_rows` overlay (Q58c) | plaintext | envelopes | the erase frame's transaction sets `value_string = NULL, erased_at = ...` in place (`secure_delete=ON`); defense in depth |
| H1 `live_rows`, `retired_rows` (R25 section 6) | plaintext | envelopes | same in-place update in the erase frame's transaction (R25 open question 8) |
| Consumer checkpoints, MANIFEST | no values | unchanged | none |
| QLever replica (default graph, ledger graph, journal graph) | plaintext literals, order keys, lexical channels | envelope literal only; no order key or lexical channel for protected attributes | applying the erase frame: `DELETE` the envelope literal triple, `INSERT` a marker literal `"erased:<erasureTxId>"` so the assertion keeps its shape |
| QLever `cur` graph (Q68f) | plaintext | envelope literals only (ciphertext, not personal-data literals; crypto-shredding is the reindex-free erasure path Q68f asks for) | same as the replica |
| QLever `.vocabulary.*`, `.update-triples`, `previous.*` | keeps every literal across in-place rebuilds (R17 6.2, R27 8.2) | keeps envelope literals: ciphertext under a key that is destroyed | none needed for the requirement; T2 generations drop them (next row) |
| QLever generations (Q91c, R35 T2) | rebuilt from the log | the generation builder reads the erasure ledger at build start, writes the marker literal instead of the envelope for every erased assertion, and records `appliedErasureSeq` in the generation `MANIFEST`; catch-up replays later erase frames | a generation built after an erasure holds neither plaintext nor that ciphertext; the old generation retires when its leases drain and its directory is deleted |
| QLever metrics log, server log, rebuild log (R27 8.2) | full operation text, so plaintext literals | operation text holds envelopes only | none |
| Keys and ledger | none | `keys.db` beside `broker.db`, owned by the broker process | shred and rotation |

**Why `keys.db` is a separate file, not a table in `broker.db`.** One SQLite transaction would make key creation atomic with the frame, but the key store must never be rolled back by a restore of the log, and `broker.db` is exactly what a lane-Q restore restores. The pool (2.1) removes the need for atomicity: keys exist durably before any frame can refer to them. SQLite does not make a commit across attached WAL databases atomic, so the design does not rely on `ATTACH`.

**Feed.** Unchanged in shape: `FeedChange` has no value field. Erase members appear as transacts with `op: "erase"` changes `(entity, attribute, validFrom, validTo, position)`, so consumers re-run the subject (W0's `everify.ssn-erased` task, Q36f). The feed never carried plaintext, and still does not.

**Ordering inside the broker.** The broker resolves the erase selectors under the writer lock against its own record (H1 and frames, never a read-back of QLever, R17 2.1 item 6), appends the ledger entry (3.3), writes the frame with the erase member and the in-place H1 and `recent_rows` updates in one SQLite transaction, publishes the watermark and the new `erasure_head` in the marker row, then ACKs.

### 2.4 Lane X: XTDB rows through the adapter

XTDB 2.2.0 has no at-rest encryption and no per-table authorization (R19 Q4), and `ERASE` leaves the value in `LOG`, `REPLICA_LOG` and kept L0 files (R16 6.2). So values are sealed in the adapter before they reach XTDB, and XTDB never holds plaintext of a protected value.

| Copy | Change |
| --- | --- |
| `tx_assertions.value_string` | envelope for protected attributes; `value_number`, `value_datetime`, `value_json` null |
| `tx_assertions.value_identity` | `canonicalJson` of the envelope for protected attributes (`ConstraintValidation.ts:48,117` and `XtdbStorageAdapter.ts:298` change in one place, `packValue`) |
| `tx_constraint_graphs` | envelopes, through the same `packValue`; protected attributes cannot appear in Unique or engine range rules (2.1), so no SQL predicate reads them |
| journal `:_tx/change` facts | the change JSON holds the envelope in its value field |
| `tx_current` (Q68a, EXP-P4) | envelopes |
| maintained-query tables (`tx_query_members`, generations) | envelopes; a maintained query whose projection reads a protected attribute takes a new generation when the erasure frontier passes an assertion it holds (Q31f cache invalidation) |
| erasure record | a new table `tx_erasures (_id, scope_key, assertion_id, key_id, erasure_seq, erased_at, position)` written in the erase transaction, plus `erasure_head` in `tx_meta`; both in the same XTDB transaction as the journal record |
| `LOG`, `REPLICA_LOG`, `buffers/`, `xt.source_log_msgs` | hold envelopes only; no rewrite |
| DEBUG logs and spans (R27 8.1) | parameters are bound, so SQL text carries no values; any span that logs parameters holds envelopes only |
| keys and ledger | `SqliteKeyVault` in the Triplex host process (the adapter runs on the host); behind the broker (EXP-P2B) the broker's `keys.db` serves both replicas |

**XTDB `ERASE` is not used.** It deletes the row for all system and valid time, so history would lose the assertion and its shape (Q24), and it does not reach the log, so it adds no protection beyond crypto-shredding. Old ciphertext in compacted files under a destroyed key meets TARGETS 7 item 9.

**Range and order on lane X.** Unprotected attributes keep BIGINT, DECIMAL and VARCHAR exactly as today, with their order (SCOPE 2.4). Protected attributes lose engine-side range and order; the kernel applies them after `unseal` (2.1).

### 2.5 Lane D: Datomic values, with excision as the second layer

| Copy | Change |
| --- | --- |
| fact value attribute (`:f.v/string`, R29 mapping) | protected facts store the envelope in `:f.v/string`; `:f/type` keeps the declared type; no `:f.v/long` or `:f.v/double` copy |
| AVET (`:db/index true` on value attributes) | indexes ciphertext; harmless and useless for protected attributes |
| journal changes | envelope in the change value |
| erasure record | the erase transaction asserts `:f/erased-in` on each erased fact entity (R29 4.5) and carries `:triplex.tx/erasure-seq` on the transaction entity; `erasure_head` is the latest such sequence |
| keys and ledger | `PostgresKeyVault` in schema `triplex_keys` of the lane's Postgres (Q88c), owned by a role the transactor and peers do not hold; peers stay SELECT-only on Datomic storage (Q88a) |

**Excision, the second layer (Q88c).** After the shredder has destroyed the keys, an excision job removes the ciphertext value datoms: `[:db/excise <fact> :db.excise/attrs [:f.v/string]]` for erased facts, in batches of at most 2,000 datoms, each followed by `d/request-index` and `d/sync-excise` before the next batch (Datomic's guidance and R32 4.1). Only value datoms are excised: `:f/id`, `:f/subject`, `:f/attr`, `:f/type`, `:f/erased-in` and the journal entry stay, so history keeps its shape. Journal change datoms keep their envelope (ciphertext under a destroyed key); excising them would delete the journal entry. Storage is reclaimed by `gc-storage` on its normal schedule, which Datomic says should use an older-than of about a month, so excision is defense in depth and never part of the read boundary or of the completion criterion.

**Dev storage cannot prove erasure.** An acknowledged key deletion on H2 dev storage can be lost on an abrupt stop and the peer can write storage (R32 4.3 item 3, Q88a). Lane D erasure evidence is diagnostic until EXP-DA04 puts lane D on SQL storage on Postgres.

**Postgres key store closure.** After `shred`: `DELETE` of the key rows, `VACUUM (FULL)` on the key table only (small, cheap, R32 4.3), `CHECKPOINT`, `pg_switch_wal()`, and waiting until the segments that held the rows are recycled. No WAL archive and no base backup of `triplex_keys` older than the last rotation exists.

### 2.6 Rotation of epoch keys (the step that makes erasure complete)

1. The vault creates KEK_t,e+1 in the key authority and points the pool at it.
2. It re-wraps every live K_a of tenant t from epoch e to e+1 in chunks of 10,000 rows, one transaction each, off the commit and read paths (key material does not change, so key caches stay valid).
3. It records the set of live key ids it re-wrapped, which also finds abandoned pool keys: keys referred to by no envelope are deleted. The live set comes from the data (the key ids in envelopes), read at a pinned basis in short pages (R25 section 2 verdict).
4. It takes the one allowed backup of the key store under epoch e+1 (the key store needs its own backup, because losing it loses every protected value).
5. It destroys KEK_t,e at the key authority and deletes key-store backups older than epoch e+1.

After step 5, every stale copy of a shredded K_a (key-store WAL, freed pages, old backups, copy-on-write blocks) is wrapped under a key that no longer exists. Rotation runs when the tenant has shredded keys whose epoch is still alive, at most once per rotation window R (default 15 minutes). Cost: one re-wrap per live protected assertion; at 10M protected assertions, about 10 s of AES and 20 s to a few minutes of row rewrites [E], so rotation is batched per window, not per erasure.

**The invariant that makes restore safe: the key store only moves forward.** A data restore always uses the current key store, never an older copy. Keys are deleted only by erasure, so the current key store holds every key any older data backup needs, minus the erased ones. Restoring old data therefore cannot bring back an erased value: its key is gone. The cost of this invariant is that the key store must be as durable as the source of truth (P2-grade fsync, its own backup after each rotation); losing it loses every protected value. That trade is decision S2 for Sam.

## 3. The erasure frontier and the erasure ledger

### 3.1 Two copies of every erasure record

| Copy | Where | Holds | Restored with | Repairs |
| --- | --- | --- | --- | --- |
| Data erasure record | in the source of truth, in the erase commit itself: the broker frame's erase member, XTDB `tx_erasures` plus `tx_meta.erasure_head`, Datomic `:f/erased-in` plus `:triplex.tx/erasure-seq` | `seq`, txId, position, `erasedAt`, and per assertion: entity, attribute, assertion id, key id | the data | the key side after a key-store restore (re-shred every key id it lists) |
| Erasure ledger | in the key store (`keys.db` table `erasure_ledger`, or `triplex_keys.erasure_ledger`), apart from the data (TARGETS 7 item 5) | the same fields, plus `commandId`, state (`pending`, `published`, `shredded`, `complete`) and the instants of each state | the keys, never older than the current copy (2.6) | the data side after a data restore or rebuild (replay, 3.6) |

`seq` is a dense per-tenant sequence assigned by the ledger. It, not the data position, is the erasure frontier's unit, because a restore can change positions but never the ledger. An erasure is lost only if both copies are rolled back past it at once, which the forward-only key store (2.6) prevents.

### 3.2 The frontier, on every route

**Definitions.** `E_pub` is the highest `seq` whose data commit has published in the scope; every source exposes it in the head row each request already reads for its basis (lane Q: the broker `marker` row gains `erasure_head`, read as the first statement of the read transaction, R25 section 2; lane X: `tx_meta`; lane D: the `erasure_head` attribute read from the latest `d/db`, even when the request then reads `d/as-of`). `F_route` is the highest `seq` a route or cache has applied.

**The rule (TARGETS 7 item 7, Q31f).** A request reads `E_pub` at its start and returns an answer only through routes with `F_route >= E_pub`. The basis plays no part. A route that is behind waits at most 10 ms (Q31d) for the feed to deliver the missing erase transacts, then loads them directly from the source's erasure records above `F_route` (an indexed read of a few rows), then answers. It never answers with `F_route < E_pub`. The answer carries `erasure: {seq: E_pub}` (1.5).

**Why one in-memory erased set is enough for correctness.** Protected values are opaque ciphertext to every engine (2.1), so no engine-computed answer depends on a protected value: engine predicates, orders, groups, Unique and aggregates on protected attributes are refused. The only place a protected value becomes readable is `unseal` in the TypeScript core, and `unseal` consults the core's erased set (`assertionId -> {seq, erasedAt, erasureTxId, keyId}`, copy-on-write, so each request holds an immutable version). The erased set is therefore the frontier that decides correctness. Engine-side markers (H1, `recent_rows`, QLever literals, generations, Datomic excision) are defense in depth and report their own `F` for rebuild and restore gates.

| Index or cache | What it holds after ER01 | How it meets the frontier | Erasure action |
| --- | --- | --- | --- |
| Core erased set (per scope, per process) | identities and key ids of erased assertions | advanced by the feed; checked against `E_pub` at every request start | none |
| Core key LRU | data keys, never plaintext | shredded key ids are dropped when the shredder runs | drop on shred |
| Evaluation cache and closures (`config/Evaluate.ts`, `World.ts`) | assertion ids for protected observations, no digests | an erase transact in the feed invalidates every closure that observed an erased assertion id | invalidate |
| Maintained queries (XTDB `tx_query_*`) | envelopes | a generation that holds an erased assertion is retired when `E_pub` passes it | new generation |
| Subscriptions (`SubscriptionManager`, `SyncHub`) | events delivered to subscribers | emit an erase event per erased assertion; buffered undelivered events are re-decoded through `unseal` at delivery | re-decode |
| Broker H1 `live_rows`, `retired_rows`, `recent_rows` | envelopes; markers after the erase frame | erase frame updates them in its own transaction, so `F = E_pub` at publication | in-place marker |
| QLever replica, `cur` graph, QLever result cache | envelopes; markers after apply | applier records `F` with its marker; the result cache holds envelopes only and `unseal` masks them | DELETE/INSERT |
| QLever generations | markers for every erased assertion up to the build's ledger read | `MANIFEST.appliedErasureSeq`; the router admits a generation only with `F >= E_pub` (R35 5.2 item 2) | rebuild |
| XTDB `tx_assertions`, `tx_current`, journal, `tx_constraint_graphs` | envelopes | `tx_erasures` and `erasure_head` in the same transaction | none |
| Datomic indexes, peer object cache | envelopes | `:f/erased-in` in the same transaction | excision later |
| Native facade (Q58a) | sealed or erased cells | the facade calls `unseal`, so the same rule applies | none |

### 3.3 The ledger record

```
erasure_ledger(tenant, seq PRIMARY KEY per tenant, command_id UNIQUE, tx_id, position, erased_at,
               identities  -- JSON: [{entity, attribute, assertionId, keyId}], identities only, never values
               state, pending_at, published_at, shredded_at, complete_at)
```

The ledger holds identities only, so it is not itself a protected copy; it is metadata of the kind that stays plaintext (2.1).

### 3.4 One erasure, step by step, with crash points

| Step | Action | Durable effect | If the process stops abruptly here |
| --- | --- | --- | --- |
| 1 | Resolve selectors against the source's own record at the head, under the subject's lock | none | nothing happened; the caller retries with the same command id |
| 2 | Append ledger entry `pending` with the resolved identities (group-commit: one fsync per batch of up to 64 entries) | ledger row | recovery finds the command id unresolved; it re-drives the commit with the recorded identities (an erasure request is never withdrawn) |
| 3 | Data commit: the erase journal record, the data erasure record, `erasure_head = seq`, plus the in-place H1 and `recent_rows` markers on lane Q; the commit's CAS checks that the subject's protected assertions still equal the resolved set, else steps 1 and 2 repeat with a superseding entry | data | lost-ACK resolution by command id returns the original result |
| 4 | Publication. This is `t_pub`, the read boundary (Q24) | watermark | as step 3 |
| 5 | ACK | none | the caller resolves by command id |
| 6 | Ledger `published` (lazy; recovery also finds published erasures by scanning data erasure records above the ledger's published high-water) | ledger | redone at recovery |
| 7 | Shredder, at `t_pub + G`: `shred(keyIds)`, durable; ledger `shredded`. G is the longest admitted request deadline plus 1 s (2 s default deadline, Q58a; native queries with longer timeouts raise G to their cap) so requests in flight at `t_pub`, which Q52e allows to finish with old values, never meet a missing key | key rows deleted | the shredder resumes from the ledger; `published_at` fixes when G expires |
| 8 | Rotation (2.6) for the tenant within the window R; ledger `complete` | epoch key destroyed | rotation resumes from its chunk checkpoint |
| 9 | Lane D: excision batches. Lane Q: next generation built without the ciphertext | storage | resumable, idempotent |

**Times reported per erasure:** publication latency (command arrival to step 4), shred time (`t_pub` to step 7, about G) and completion time (`t_pub` to step 8, at most G + R + rotation duration). Completion time is the one Sam's must-have is about; decision S2 sets its bound.

### 3.5 Rebuild

Every derived route rebuilt from the log or the source (QLever generation, H1 rebuilt from frames, `tx_current`, a replica behind the broker, maintained queries) reads the ledger head `n_b` when it starts, writes markers instead of envelopes for every assertion erased at or below `n_b`, consumes the feed from its checkpoint (which delivers later erase transacts), records `F`, and becomes eligible only when `F >= E_pub` at a request's start. A rebuild therefore never holds plaintext (it never had any) and, for erasures up to `n_b`, never holds the erased ciphertext either.

### 3.6 Restore

1. Mark the tenant's routes ineligible (`F` unknown); requests wait then fail typed `BasisNotAvailable` (Q89c), never answer.
2. Restore the data from a backup of any age, by the lane's own mechanism (lane Q: `broker.db` copy, then a generation from the log; lane X: a golden clone volume, R26; lane D: `restore-db` into the Postgres storage).
3. Keep the current key store and ledger. They are never restored from an older copy in this procedure.
4. For every ledger entry with `seq` above the restored data's `erasure_head`, in `seq` order, commit a replay erasure carrying the entry's original `seq`, `erasedAt` and `erasureTxId` and only the identities present in the restored data. Assertions created after the backup are not in the restored data; their keys are orphans and go at the next rotation.
5. Check that the restored data's own erasure records at or below its `erasure_head` equal the ledger's; a difference is a typed restore failure.
6. Rebuild or verify every derived route as in 3.5; re-open reads when every route has `F` equal to the ledger head.

Even before step 4, an erased value cannot come back: its key is gone from the current key store, so `unseal` could only fail. Step 4 turns that failure into the correct marker and puts the erasure back into the journal.

**Key-store restore (the mirror case).** If the key store is lost and restored from its last backup (taken at the last rotation), re-shred every key id in the data's erasure records above that backup's ledger head, append those entries to the ledger, then rotate. Keys created after that backup are lost, and with them the protected values they encrypted: that is the cost decision S2 names.

## 4. Proof of erasure

### 4.1 The problem with the canary rule under encryption

Q82d requires every scanned location to first find a canary written before the erasure, with the same scanner, or the verdict is REFUSED. Under crypto-shredding a protected canary never reaches any engine as plaintext, so a plaintext scan for it finds nothing before the erasure either, and every location would be REFUSED. The proof therefore uses four scans, each with its own positive control. All scans are evaluator-owned (O-OBS observer sidecars started by `engine.mjs`, Q82c), never builder code.

| Scan | Question | Positive control (must be found first, or REFUSED) | Pass after erasure |
| --- | --- | --- | --- |
| P, plaintext | is the protected value's plaintext anywhere? | a twin canary: same value kind and length bucket, written through the same commit path into an unprotected attribute, so it lands in the same files as plaintext | the protected canary's plaintext is absent from every location at every time (before and after erasure) while the twin is found |
| C, copies | does every location the inventory lists hold the protected value's copy, and only as ciphertext? | the protected canary's envelope bytes, read by the observer through a native query (an EI source), found in each location before the erasure | the envelope is absent from locations that erase in place (H1, `recent_rows`, generations built after the erasure, Datomic storage after excision and `gc-storage`); it may remain in append-only locations (log frames, XTDB `LOG`, QLever vocabulary, Datomic log before excision) |
| K, keys | are the key bytes gone? | the canary's wrapped key bytes in `keys.db` (or `triplex_keys`), its WAL and the key-store backup, and the epoch key's bytes in `kms.db`, found before shred | after step 7: the wrapped K_a under any live epoch is absent from every key-store copy; after step 8: the destroyed epoch key is absent from `kms.db` and its WAL, and no key-store backup under that epoch exists |
| D, decryption | can anything the lab can reach open the envelope? | a non-erased control canary opens with the same procedure | with every key-store copy, every key-store backup, `kms.db` and the root key, the erased canary's envelope does not open |

C plus D is the evidence TARGETS 7 item 9 asks for: every surviving copy is ciphertext, and no surviving key opens it. P shows plaintext never existed in the stores. K shows the key's own copies are gone.

### 4.2 Inventory per lane, and what each lane can show

The inventory extends `PROTECTED_COPY_INVENTORY` with the Q82d additions (observer outputs, old generations, freed blocks) and with three locations this design found: evaluation closures, XTDB `value_identity` and maintained-query tables, and the key store and key authority themselves.

| Location | Lane | P | C | K | Can the lab show it? |
| --- | --- | --- | --- | --- | --- |
| broker frames (`broker.db` after Q58c, or the segment files today), its WAL | Q | byte scan | byte scan | n/a | yes, file level; the broker runs on the Mac host (APFS, copy-on-write), so freed blocks cannot be scanned; rotation covers them |
| `recent_rows`, H1 tables | Q | byte scan | must be absent after step 3 (secure_delete) | n/a | yes, file level |
| QLever `.vocabulary.*` | Q | needs an FSST decoder (R27 8.2; plain grep gives false PASS) | same decoder | n/a | only with the decoder; without it the cell is REFUSED, so the decoder is required before acceptance |
| QLever `.update-triples`, `previous.*`, `.index.*` (ids only) | Q | byte scan | byte scan | n/a | yes |
| QLever generations (`gens/g*`) | Q | as vocabulary | absent in generations built after the erasure; old generation directories deleted | n/a | yes, with the decoder |
| QLever metrics log, server log, rebuild log | Q | byte scan | byte scan | n/a | yes |
| XTDB `log/LOG`, `log/REPLICA_LOG` | X | byte scan (R27 8.1) | byte scan | n/a | yes |
| XTDB `buffers/` (L0 to Ln), garbage tries until `garbageLifetime` | X | byte scan (no compression codec in core) | byte scan | n/a | yes |
| `xt.source_log_msgs.tx_ops` | X | EI query | EI query | n/a | yes |
| XTDB DEBUG log, spans (docker json log) | X | byte scan | byte scan | n/a | yes |
| Datomic storage table in Postgres (segments) | D | positive control likely fails (segment encoding undocumented, R27 G4) | same | n/a | REFUSED for P and C on segments is expected; C and D through the EI read path and the D scan are the pass path (R27 G4 says crypto-shredding with key evidence is the only PASS path) |
| Datomic transactor `log/`, gateway logs | D | byte scan | byte scan | n/a | yes |
| Postgres `pg_wal` (Datomic storage) | D | as segments | as segments | n/a | as segments |
| Key store: `keys.db` and WAL (Q, X) | Q, X | n/a | n/a | byte scan | yes, file level; host APFS freed blocks covered by rotation |
| Key store: `triplex_keys` heap, TOAST, `pg_wal` (D) | D | n/a | n/a | byte scan after `DELETE`, `VACUUM FULL`, `CHECKPOINT`, WAL recycle (R32 4.3) | yes, file level, inside the VM |
| Key authority `kms.db` and WAL | all | n/a | n/a | byte scan | yes, file level; it is the last layer and its residual is stated below |
| Backups and golden clone volumes (R26), `backup-db` output | all | byte scan | byte scan | key-store backups only | yes |
| Observer stores, proxy captures (T2), docker logs | all | byte scan | byte scan | n/a | yes; the proxy stores hashed literal payloads (R27 8.2) |
| Triplex host process logs and error messages | all | byte scan | byte scan | n/a | yes; core error messages must never quote a protected value (a builder gate) |
| Evaluation closures, outbox and work items | all | byte scan | n/a (assertion ids, no values) | n/a | yes |
| JVM heaps, Node heaps, key LRU | all | not scannable from outside | | | no; restart clears them; stated in the inventory |
| Freed filesystem blocks | all | | | | inside the VM only, and only on a per-slot filesystem that is discarded (R27 8.4 item 3); not on the Mac host |

**What no lane can show.** Bytes below the filesystem the lab can open: the APFS copy-on-write blocks under the VM disk image and host files, and SSD remapping. For values this does not matter (they are only ever ciphertext). For keys it is covered by rotation down to the key authority. The last residual is `kms.db`'s own freed blocks; production replaces `kms.db` with a cloud KMS whose key-version destruction is the trust anchor. The lab reports this residual as a stated limit, not as a PASS.

**Lab artifacts outside the system under test.** Oracle inputs and outputs, golden expectations and harness receipts hold the synthetic canary values by design (Q56h). They are declared and excluded from the scan; no real personal data enters the lab.

## 5. P1 and P3 during erasure

### 5.1 What erasure adds to the read and write paths

| Work | Path | Cost | Why it does not block |
| --- | --- | --- | --- |
| read `E_pub` | every request | none extra: one column in the head row the request already reads | |
| erased-set check | every protected cell | one hash lookup | copy-on-write: a request holds an immutable version; the feed applier swaps in a new one |
| key fetch on LRU miss | requests with protected cells | one batched key-store query per request (SQLite in process: tens of microseconds; Postgres on lane D: about 0.3 to 1 ms [E]) | reader connections to the key store are read-only; key-store writes are pool batches, shreds and rotation chunks, all short |
| seal | commands with protected values | one AES-GCM per value, no durable write | pool |
| erase commands | writer | one small commit per subject (identities only); ledger fsync once per 64 | admission control, 5.2 |
| shred | background | a batched `DELETE` per shred window | off the request paths |
| rotation | background | about one re-wrap per live protected assertion, in 10,000-row transactions | short transactions; key material unchanged, so caches stay valid |
| QLever delta | lane Q replica | 2 delta triples per erased assertion (DELETE envelope, INSERT marker); 10k subjects with W0's one SSN each is about 20k triples | R35: scan cost is linear in per-block delta; the rebuild sub-schedule exercises the threshold |
| Datomic excision | lane D transactor and indexing | "a substantial burden on background indexing" (R29, R32) | batches of at most 2,000 datoms, one at a time, after shredding; measured inside the window, never hidden by moving it out |

No erasure step holds a lock a reader takes. Readers never wait for erasure except the at most 10 ms frontier wait of 3.2, which only happens when a process's erased set is behind the source.

### 5.2 The erasure job (GS.16's load)

GS.16 erases PII for 10k subjects during live traffic. A job driver submits one erase command per subject (Q52g: one subject per command) through an admission controller of the kind R24 designs for P5: it starts at 50 commands per second (R25 measured the broker writer at 50 commits/s with 3.4 to 4.1 ms median commit beside 4 to 16 reader threads) and halves the rate when writer commit p99 exceeds 1.25 times its zero-reader baseline (the P1 writer bar). At 50/s the job takes about 200 s. Ledger appends are group-committed, so the job adds one key-store fsync per 64 erasures.

### 5.3 P3: the feed during and after erasure

| Requirement | How it holds |
| --- | --- |
| ordered, no gaps | erase commits are ordinary positions; the feed lists them in position order; NS-P3-GAPS-MAX applies unchanged |
| resumable | consumers checkpoint as today; replaying an erase transact is idempotent (Q49b) |
| entity, attribute and valid-time range affected (TARGETS 3) | each erase change reports them |
| no plaintext after erasure | the feed never carried values (`FeedChange` has no value field), and erase changes carry identities only; the evaluation closures and outbox carry assertion ids, never protected values |
| the runtime re-runs affected subjects | W0's EVSUB rule turns an erased SSN into its own `everify.ssn-erased` task (Q36f), published through the outbox like any other result |

### 5.4 GS.16's three sub-schedules

All three run with the fixed writer trace, 256 closed-loop readers on the TARGETS 2 basis mix (80% latest, 15% within the hour, 5% up to 90 days back) and the erasure job, on the lane's chosen composition.

| Sub-schedule | Setup | Checked |
| --- | --- | --- |
| 1. Pinned reader | 64 of the 256 readers hold multi-request reads across erasure publications: cursors over erased subjects (one ordered by assertion id, one by a protected attribute through the kernel), generation or replica leases, and repeated requests at a fixed pre-erasure basis | every answer equals the oracle's for `(basis, erasure.seq)` at the request's start, with Q52e and Q66a in-flight tolerance; no request that started after an erasure's `t_pub` (from the ledger) returns that erasure's plaintext; the protected-order cursor fails typed `CursorErasureConflict`; the id-ordered cursor continues with markers |
| 2. Rebuild | during the job, one rebuild per lane: lane Q a QLever generation swap (Q91c phase 2), or an online `rebuild-index` where generations are not built yet; lane X a rebuild of `tx_current` and of a maintained query; lane D an indexing job plus, in a broker composition, an H1 rebuild from frames | a rebuilt route is admitted only with `F >= E_pub`; Q89i byte identity holds across the swap per `(basis, erasure.seq)`; the C scan finds no envelope of an assertion erased before the build started in the new generation or rebuilt table |
| 3. Restore | a backup taken before the job; after the job completes (all 10k at `complete`), restore it as in 3.6 on a separate instance | reads are refused typed until replay ends; then all 10k subjects read as markers at every basis; the journal holds the replay erasures with their original `seq` and `erasedAt`; the D scan cannot open any erased canary; ER-ORACLE-POST answers match |

Bars: NS-P1-READ-P99-256-MS (read p99 at most 100 ms at 256 readers), the P1 writer bar (commit p99 at most 1.25x its zero-reader baseline), NS-P3-GAPS-MAX, and zero correctness violations. Every GS receipt before contract 0.4.0 is diagnostic (Q94e); lane D evidence on dev storage is diagnostic (Q88a).

## 6. Builder briefs, gates and order

Every builder is Codex `gpt-6.1-sol` at medium through `node lab/bin/agent.mjs launch --role builder`; every reviewer is Codex at high through `--role reviewer`, phrased as quality assurance of our own harness (PROTOCOL section 6: "abrupt process stop (the power-loss case)", "check that each documented check rejects the inputs it should"). A builder never reviews its own branch. Each brief cites `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (3, 7) and this file.

### 6.1 ER01-C: shared core (first)

**North star.** Sam's must-have "real erasure or crypto-shredding of PII" (SCOPE 2.3) as a correctness floor for P1 and P3; measured by the 44 `ER-*` obligations and gates G-C1 to G-C9.
**Base.** main after RT01 round A merges (both edit `TriplesLive.transact`; RT01 sets the stamp that `erasedAt` uses, Q90a).
**Builds.** Sections 1.2, 1.3, 1.6 (the `unseal` helper and `SealedValue`; the facade wiring lands where the facade exists), 2.1, 2.2 (`KeyVault`, `SqliteKeyVault`, pool), 3.1 to 3.6 (data erasure record API for adapters, ledger, erased set, frontier at request start, shredder, restore and rebuild hooks), the protected flag on `Attribute`, `E-PROTECTED-NOT-INDEXABLE`, `E-ERASE-NOT-PROTECTED`, `KeyMissing`, `CursorErasureConflict`, closures recording assertion ids for protected observations, and in `packages/testkit` the GS.16 job driver with its admission controller and the three sub-schedule checkers. The core test bed is `packages/sqlite`.

| Gate | Pass |
| --- | --- |
| G-C1 | the 44 `ER-*` obligations pass on the test bed against the pinned O-REPLAY, except the ones S1 changes, which are listed and wait for ER01-O |
| G-C2 | over 10,000 generated commands, an adapter spy sees no plaintext of a protected value in any row, journal change, constraint input or error message |
| G-C3 | an abrupt process stop at each pool step, 1,000 times: no key id is ever used by two assertions, and no committed envelope lacks its key |
| G-C4 | an abrupt stop at each step of 3.4: each recovers to the stated outcome; no erasure is lost; ledger and data erasure records agree |
| G-C5 | with one process's erased set held back on purpose, no request that starts after `t_pub` returns plaintext (it waits, loads directly, then answers with markers) |
| G-C6 | restore (3.6) and key-store restore on the test bed: zero plaintext of erased values, replay erasures in the journal with original `seq` and `erasedAt` |
| G-C7 | the Q89f route-equivalence harness passes per `(basis, erasure.seq)`, and across sequences differs only by markers |
| G-C8 | commands with no protected values: journal bytes identical to main and commit latency unchanged within run-to-run spread |
| G-C9 | unseal opens a non-erased envelope exactly (round trip of every supported kind, including decimal TDK1 and 2^53 integers) and refuses a ciphertext copied into another row |

**Out of scope.** Engine adapters, rotation and the lab key authority (ER01-R), scanners (ER01-S).

### 6.2 ER01-S: erasure scanners (O-OBS owner, in parallel with ER01-C)

**North star.** Evidence for Sam's must-have (TARGETS 7 item 9, Q82d); measured by positive-control fixtures.
**Who.** A builder who writes no system-under-test code for ER01 (the scanners are evaluator-owned observer code, Q82c).
**Builds.** The four scans of 4.1 as O-OBS normalizers over raw observer chunks; an FSST decoder for QLever `.vocabulary.*` verified against an index built with known literals (R27 8.2); file scanners for SQLite (`keys.db`, `broker.db`, WAL), Postgres heap, TOAST and `pg_wal`, XTDB `LOG` and `buffers/`; the D scan as a read-only decryptor that is given every key-store copy and backup, `kms.db` and the root key.

| Gate | Pass |
| --- | --- |
| G-S1 | each scanner finds planted controls in fixture files of every location kind in 4.2 |
| G-S2 | a scanner run blind on purpose (vocabulary without the decoder) returns REFUSED, never PASS |
| G-S3 | the D scan opens a non-erased control envelope and does not open one whose key and epoch key were removed |

### 6.3 ER01-R: epoch rotation and the lab key authority (after ER01-C)

**North star.** Completion of erasure (decision S2) without moving P1 bars; measured by K and D scans and P1 receipts during rotation.
**Builds.** Section 2.6: `kms.db` with a root key file outside data directories and backups, epoch keys per tenant, chunked re-wrap, the live-key-id scan, key-store backup per rotation, epoch destruction, `PostgresKeyVault` rotation for lane D.

| Gate | Pass |
| --- | --- |
| G-R1 | after rotation, the K scan finds no destroyed epoch key in `kms.db` or its WAL, and the D scan cannot open erased canaries with any key-store backup taken before rotation |
| G-R2 | an abrupt stop at every rotation chunk: rotation resumes and no live key becomes unreadable |
| G-R3 | rotation of 1M keys beside 256 readers moves neither read p99 nor writer p99 beyond run-to-run spread (diagnostic on this host) |

Required before acceptance evidence; not required for GS.16 screening.

### 6.4 ER01-X: lane X (after ER01-C merges)

**North star.** Sam's must-have on lane X with P1 and P3 held (GS.16 bars); measured by `ER-*` on lane X, P, C and D scans of the 4.2 lane X locations, and GS.16 sub-schedules.
**Base.** main's XTDB A0 composition first; then the lane's chosen composition (EXP-P2X or the broker replica of EXP-P2B).
**Builds.** Section 2.4: `packValue` seals protected values and derives `value_identity` from the envelope; `tx_constraint_graphs`, journal, `tx_current` and maintained queries carry envelopes; `tx_erasures` and `erasure_head` written in the erase transaction; decode through `unseal`; the head read returns `erasure_head`; restore from a golden clone volume (R26) plus ledger replay. No XTDB `ERASE`.

| Gate | Pass |
| --- | --- |
| G-X1 | `ER-*` obligations on lane X (tiny concurrent profile, Q29e) |
| G-X2 | P scan clean and C scan envelope-only on `LOG`, `REPLICA_LOG`, `buffers/`, `xt.source_log_msgs`, DEBUG logs and clone volumes, each with its positive control found (ER01-S) |
| G-X3 | existing lane X suites and the numeric-rule vectors unchanged for unprotected attributes |
| G-X4 | GS.16 three sub-schedules on an exclusive X slot (diagnostic until contract 0.4.0, Q94e) |

### 6.5 ER01-Q: lane Q (after ER01-C, in two rounds)

**North star.** Sam's must-have on lane Q (Q58e, Q68f) with P1 and P3 held; measured by BR-LOG-CRYPTO-SHRED, `ER-*` on lane Q, the 4.2 lane Q scans with the FSST decoder, and GS.16.
**Round 1 base.** the broker branch's successor after P2Q and SQL01 merge. Builds: envelopes in frame rows, priors and journal rows; the erase member and ordering of 2.3; `marker.erasure_head`; `keys.db` and ledger in the broker process; replica apply of erase frames (DELETE envelope literal, INSERT marker literal); no order key or lexical channel for protected attributes; `cur` graph envelopes; feed erase changes.
**Round 2 base.** after the Q58c SQLite substrate and EXP-QG1 phase 2 (Q91c). Builds: in-place markers in `recent_rows`, `live_rows`, `retired_rows` in the erase frame's transaction with `secure_delete=ON`; the generation builder reads the ledger and writes markers, `MANIFEST.appliedErasureSeq`, router admission by `F`.

| Gate | Pass |
| --- | --- |
| G-Q1 | `ER-*` on lane Q; BR-LOG-CRYPTO-SHRED |
| G-Q2 | P scan clean on frames, WAL, vocabulary (decoder), `.update-triples`, `previous.*`, metrics and server logs, with positive controls |
| G-Q3 | round 2: C scan finds no envelope of an erased assertion in `recent_rows`, H1 or a generation built after the erasure |
| G-Q4 | Q89i byte identity per `(basis, erasure.seq)` across three generation swaps during an erasure job |
| G-Q5 | GS.16 three sub-schedules on an exclusive Q slot (diagnostic until 0.4.0) |

### 6.6 ER01-D: lane D (after ER01-C and EXP-DA04)

**North star.** Sam's must-have on lane D (Q88c) with P1 and P3 held; measured by `ER-*` on lane D, key-store closure scans, excision receipts and GS.16.
**Base.** lane D after EXP-DA04 (SQL storage on Postgres; dev storage evidence is diagnostic, Q88a).
**Builds.** Section 2.5: envelopes in `:f.v/string`; `:f/erased-in` and `:triplex.tx/erasure-seq` in the erase transaction; `erasure_head` read from the latest db; `PostgresKeyVault` in schema `triplex_keys` with its own role; the excision job (batches of at most 2,000 datoms, `request-index`, `sync-excise`, one batch at a time) after shredding; restore through `restore-db` plus ledger replay.

| Gate | Pass |
| --- | --- |
| G-D1 | `ER-*` on lane D |
| G-D2 | K scan of `triplex_keys` heap, TOAST and `pg_wal` after the R32 4.3 closure |
| G-D3 | excision of GS.16's datoms in batches; writer commit p99 during excision reported against the P1 writer bar |
| G-D4 | one diagnostic run with `gc-storage` at a test older-than, then a C scan of the storage table (expected REFUSED if segment encoding defeats the control, R27 G4; recorded, not hidden) |
| G-D5 | GS.16 three sub-schedules on an exclusive D slot |

### 6.7 ER01-O: oracle amendment (only if S1 is A)

A separate oracle author changes O-REPLAY for option A (answers keyed by `(basis, erasure.seq)`, `cursorFrom` with the current frontier or `CursorErasureConflict`), then an independent check before the pin moves, then a contract version (the Q90f pattern).

### 6.8 Order

| Step | Work | Depends on | Slot |
| --- | --- | --- | --- |
| 0 | Orchestrator rulings R38-a to R38-h (6.9); S1 to S4 to Sam; builders proceed on the recommended answers, provisional | this design | none |
| 1 | ER01-C and ER01-S in parallel; ER01-O once Sam answers S1 | RT01 round A merged (C only) | none |
| 2 | Review of ER01-C (Codex high), merge | step 1 | none |
| 3 | ER01-X and ER01-R in parallel | ER01-C on main | X exclusive for G-X4 |
| 4 | ER01-Q round 1, then round 2 | ER01-C; P2Q and SQL01 merged; round 2 also Q58c and QG1 phase 2 | Q exclusive for G-Q5 |
| 5 | ER01-D | ER01-C; DA04 | D exclusive for G-D5 |
| 6 | GS.16 screening per lane, then acceptance evidence with ER01-R | steps 3 to 5; contract 0.4.0 | exclusive, one lane at a time |

The critical path is ER01-C then lane Q round 2 (waits on Q58c and QG1 phase 2) and ER01-C then lane D (waits on DA04). Lane X is the first lane that can show GS.16 end to end.

### 6.9 Orchestrator rulings this design proposes (no Sam needed)

| Id | Ruling |
| --- | --- |
| R38-a | Keys are per protected assertion, random, from a durable pre-issued pool; this refines Q58e's "per subject" |
| R38-b | Protected values are sealed in the TypeScript core before any adapter or engine; one `unseal` decodes every route; engines never see plaintext |
| R38-c | Protected attributes are refused for engine-side predicates, order, Unique, grouping and aggregates (`E-PROTECTED-NOT-INDEXABLE`); kernel-side semantics stay as Q49c, Q52 and Q56 |
| R38-d | Native results return `SealedValue` or `ErasedValue` for protected cells; they decrypt only when the row's assertion id is projected |
| R38-e | Two copies of every erasure record (data and ledger); the key store and ledger are never restored from an older copy; restore and key-store restore repair each other (3.6) |
| R38-f | The frontier is the per-tenant ledger `seq`, read from the source's head row at each request's start; answers carry `erasure: {seq}` |
| R38-g | Q82d under encryption is read as the four scans of 4.1, each with its own positive control |
| R38-h | XTDB `ERASE` is not used; Datomic excision removes value datoms only; QLever generations drop erased envelopes; evaluation closures record assertion ids for protected observations |

## 7. Decisions for Sam

| Id | Question | Options | Recommendation |
| --- | --- | --- | --- |
| S1 | When a reader pinned a point in time before an erasure, what does it see afterwards? | A: every request that starts after the erasure sees the marker; answers carry an erasure sequence so a change is never silent; a cursor ordered by an erased value stops with a typed error. B: a pinned read keeps showing the old value for its whole life (up to 24 h for a sweep), so erasure waits. C: a pinned read that crosses an erasure fails and must restart, which costs P1 during a large erasure | A (section 1.5) |
| S2 | How fast must an erasure become unrecoverable, and is the key-store trade acceptable? | The erasure is visible at once (the read boundary), and unrecoverable within the grace G plus the rotation window R: about 20 minutes with R = 15 min. The key store becomes as critical as the data: losing it loses every protected value, and it must never be restored from an older copy. The lab can prove this down to files it can open; the last layer below that (`kms.db` blocks on the Mac's disk) is a stated limit that a cloud KMS removes in production | accept, with R = 15 min |
| S3 | Protected attributes cannot be compared, ordered, made Unique or used in range rules by the engines; only the kernel can, per subject. Accept? | A: kernel only (TARGETS 7 item 4). B: add a blind index later for equality and Unique. C: order-preserving encryption (leaks order; rejected) | A now, B only if a golden scenario needs it (none does) |
| S4 | Can `erase` target an attribute that was not declared protected? | A: no, a typed error, because its plaintext is already in append-only engine logs and cannot be removed. B: yes, as a marker only, with no physical guarantee | A |

Not a lab decision, but stated: whether crypto-shredding satisfies GDPR Article 17 is contested (R15 [W12]: encrypted personal data may still be personal data). Counsel should confirm before Triplex calls it compliant.

## 8. Sources

- Scope and targets: `lab/SCOPE.md` (2.3, 2.4), `lab/NORTH-STAR.md`, `lab/TARGETS.md` (3, 7), `lab/PROTOCOL.md`.
- Rulings: `lab/acceptance/RULINGS.md` Q24, Q29e, Q31d, Q31f, Q36f, Q49a to Q49d, Q52a to Q52g, Q56a to Q56h, Q58a to Q58e, Q66a to Q66c, Q68a to Q68g, Q82a to Q82e, Q88a to Q88c; `lab/acceptance/RULINGS-PENDING.md` Q78e, Q89a to Q89i, Q90a to Q90g, Q91c, Q94e.
- Contract: `lab/acceptance/build_contract.py` `ERASURE` and `PROTECTED_COPY_INVENTORY` (lines 1291 to 1318); `lab/acceptance/obligations.json` (`ER-*`); `lab/acceptance/ACCEPTANCE.md` GS.16.
- Research: R15 section 5; R16 6.2; R17 6.2; R19 Q4 and options D, E; R23 open question 4; R24 open question 4; R25 sections 0, 2, 6 and open question 8; R27 sections 8 and 9; R29 4.5; R32 section 4; R35 sections 2, 5.2, 5.3; R37 B4 and 3.4.
- Code on main at 59e07afb: `packages/core/src/Triple.ts`, `Value.ts`, `Temporal.ts`, `storage/StorageAdapter.ts`, `store/Triples.ts`, `store/TriplesLive.ts`, `config/Attribute.ts`, `config/World.ts`, `config/Evaluate.ts`; `packages/xtdb/src/codecs.ts`, `XtdbStorageAdapter.ts`, `ConstraintValidation.ts`, `MaintainedQueries.ts`; `packages/qlever/src/rdf.ts`; `packages/w0/src/schema.ts`, `population.ts`, `kernel.ts`.
- Broker at `.claude/worktrees/agent-a56ab43df1f0e0ef7` (branch `exp/P2Q-qlever-log-broker`, 36dacc2e): `packages/qlever/src/broker/frame.ts`, `frames.ts`, `feed.ts`, `snapshot.ts`, `broker.ts`.
- Evidence labels: `[E]` marks an inference; every other number is from the cited source. No engine, Docker or product code was run or changed for this design.
