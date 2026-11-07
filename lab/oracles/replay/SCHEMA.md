# O-REPLAY case and output schema (v1)

O-REPLAY reads one case file and writes one expected-answer document. Python 3 standard library
only; it imports nothing from Triplex. Semantic rules are in [RULES.md](RULES.md).

```
python3 -I lab/oracles/replay/cli.py CASE.json [-o OUT.json]   # exit 0 PASS/EXPECTED-ONLY, 1 FAIL, 2 malformed
python3 -I lab/oracles/replay/cli.py --self-check               # O-HAM, O-CFG8, O-EVT reproduction
python3 -I lab/oracles/replay/cli.py --test                     # unit tests (same as below)
python3 -I -m unittest discover -s lab/oracles/replay/tests -t .
python3 -m lab.oracles.replay CASE.json                         # module form; needs the repo root on sys.path, so not with -I
```

`python3 -I -m lab.oracles.replay` cannot work: `-I` removes the working directory from
`sys.path`. `cli.py` adds exactly the repository root computed from its own path.

## 1. Encoding rules for every number in a case

- **Numbers are read as lexemes.** The loader keeps every JSON number as its source text and converts
  it once with correctly rounded decimal-to-binary64 parsing. `NaN`/`Infinity` tokens are refused.
- **int64 travels as canonical decimal text**: `{"type":"integer","value":"9223372036854775807"}`.
- **binary64** is `{"type":"number","value":<JSON number>}` or `{"type":"number","bits":"0x<16 hex>"}`.
  `-0.0` (or `-0`) is kept.
- **Instants and valid-time coordinates** (`clock`, `instant`, `validFrom`, `validTo`, `recordedAt`,
  `validAt`) are JS numbers, possibly fractional, compared exactly as rationals.

## 2. Case file

```jsonc
{
  "format": "triplex-db-2/o-replay-case/1",
  "caseId": "CS-ENTITY/core/0001",
  "defaultScope": "s1",                       // scope used when a command or query names none
  "adapter": {"schemaVersion": 1},            // per-assertion adapter metadata (XTDB codec Some(1)); omit -> null
  "rules": {"retractNonLive": "noop"},        // optional overrides of RULES.md defaults (section 5)
  "schemas": [ /* schema releases, 2.3 */ ],
  "enforcement": {"mode": "off"},             // or {"mode":"on","rules":[...]} / {"mode":"on","fromSchema":2}
  "initialPositions": {"s1": 0},              // optional: last position before the first command, per scope
  "commands": [ /* 2.1, in submission order */ ],
  "receipts": [ /* 2.2 */ ] ,                 // or omit / null: expected-only mode with symbolic identities
  "queries": [ /* section 3 */ ]
}
```

### 2.1 Commands (captured command intent)

```jsonc
{
  "kind": "transact",                // default; "internal" = a position-allocating write the oracle does not model
  "scope": "s1",
  "clock": 1000.25,                  // the deterministic runtime clock input, when the harness controls it
  "operations": [
    {"op": "assert", "ref": "ann-name",           // case-local symbol for this assertion
     "entityId": "person:ann", "attribute": ":person/name", "value": {"type": "string", "value": "Ann"},
     "entityType": "Person", "createdBy": "agent:a", "validFrom": 0, "validTo": 86400000},
    {"op": "retract", "target": "ann-name"},       // by symbol, or {"op":"retract","id":"<actual id>"}
    {"op": "retract-pattern", "pattern": {"entityId": "...", "attribute": "...", "entityType": "...", "value": {...}}}
  ],
  "meta": {
    "actor": "agent:a", "commandId": "cmd-1", "correlationId": "req-1", "causationId": "evt-1",
    "configSnapshot": "snap-id",
    "enforce": {"constraints": [{"_tag": "Required", "v": 1, "entityType": "Person", "attribute": ":person/name"}]},
    //   or {"fromSchema": 1}: Required / Cardinality(max 1 for cardinality one) / Unique / ReferenceTarget
    "preconditions": [{"_tag": "TripleLive", "target": "ann-name"},
                      {"_tag": "EntityState", "entityId": "person:ann", "targets": ["ann-name"], "tripleIds": []}]
  },
  "physicalGroup": "g1",             // nesting: members share one physical transaction (2.4)
  "race": "r1",                      // contiguous members race; see 2.5
  "hostAbort": false,                // the host rolled this command back on purpose (expected: host-abort)
  "expectedOutcome": "committed",    // internal commands only (their validity is not modeled)
  "journaled": true                  // internal commands only: false = allocates a position, absent from transactions()
}
```

### 2.2 Receipts (the only system-provided input)

One per command, `command` = index into `commands`:

```jsonc
{"command": 0, "outcome": "committed", "txId": "tx-A", "position": 4, "instant": 1000.25,
 "assertionIds": ["i1", null]}                            // aligned with operations; null for non-asserts
{"command": 1, "outcome": "rejected", "category": "constraint-violation",          // category optional
 "error": {"_tag": "ConstraintViolationError", "codes": ["unique"]}}
{"command": 2, "outcome": "unknown", "resolvedOutcome": "committed", ...}          // after EP-RESOLVE
```

**Receipts bind identities, never validity.** The oracle derives every expected outcome from the
command intent, stream order, preconditions and rules, then compares. A receipt that commits a command
the oracle rejects is a FAIL and the command stays out of the expected state. Inside a race group the
receipt positions give the serial order the system chose among committed members; that is the only
ordering fact taken from receipts.

**Expected-only mode** (no `receipts`): positions are `last+1`, txIds `tx:<command index>`, assertion ids
the op's `ref` (or `a:<command>:<op>`), instants the command `clock`. Harnesses map these symbols to
real identities after the run. The verdict is `EXPECTED-ONLY`.

### 2.3 Schema releases

```jsonc
{"version": 1, "entityTypes": {"Person": {"attributes": {
  "name": {"attribute": ":person/name", "type": "string", "cardinality": "one", "required": true, "unique": true},
  "tags": {"attribute": ":person/tag", "type": "string", "cardinality": "many"},
  "org":  {"attribute": ":person/org", "type": "ref", "target": "Org"}}}}}
```

`type` is one of the eight families. Repository queries name the `schemaVersion` they read with
(default 1). A schema commit through ConfigStore is declared as an `internal` command so its position is
accounted for.

### 2.4 Nested and internal positions

- **Each allocated position is its own cut.** A nested transaction is declared as consecutive commands
  with the same `physicalGroup`; every member is one logical Triplex commit with its own receipt,
  position, txId and journal record. Members are validated in order against the state that includes
  the earlier accepted members; a failing member is rejected alone. If the host abandons the outer
  transaction, every member carries `hostAbort: true`.
- **Receipt check:** committed members of one physical group must hold consecutive positions.
- **Internal writes** (ConfigStore commits, consumer checkpoints, maintenance) are `kind: "internal"`.
  They take a position, appear in `cutCatalog`, and appear in `transactions()` as opaque records unless
  `journaled: false`.

### 2.5 Race groups

Contiguous commands with the same `race` id. Committed members are replayed in receipt position order
and each must succeed. A rejected member must fail at some serialization point (before, between or after
the committed members); its expected outcome lists `possibleCategories`. A member that would succeed at
every point is a FAIL.

## 3. Queries

Every query has `id`, `kind`, and usually a `cut`:

```jsonc
"cut": {"scope": "s1", "position": 5 | "latest" | {"afterCommand": 3},
        "recordedAt": 1000.25,   // optional R, independent of P
        "validAt": 20.25,        // V; required where the kind reads valid time
        "publicBasis": true}     // false lets self-checks use negative instants
```

| kind | inputs | result |
| --- | --- | --- |
| `assertions` | `scope` | complete assertion relation (spec item 4), raw lifetime |
| `match` | `cut`, `pattern` | visible rows, `raw` and `snapshot` contracts |
| `entityTriples` | `cut`, `entityId` | visible rows of one entity, both contracts |
| `history` | `entityId`, optional `cut` (no V needed), `applyValidAt` | `rawLifetime` and `asOfSnapshot` |
| `assertionSnapshot` | `cut`, `mode` (`live-at-valid`/`known-at-valid`), `pattern` | O-HAM SnapshotAssertion rows |
| `transactions` | `after`, `limit` (1..1000, default 100) | `{transactions, next}` |
| `transaction` / `transactionByCommand` | `txId` / `commandId` | record or null |
| `transactionsForEntity` | `entityId`, `limit`, `snapshotPosition`, `beforePosition` | newest first, `nextBeforePosition` |
| `cutCatalog` | `scope` | every position with instant, txId, command, internal flag, group |
| `entityPage` | `entityType`, `limit`, `cut` | pages of complete bodies, ids in codepoint order |
| `get` / `getMany` | `entityType`, `entityId` / `entityIds`, `include`, `schemaVersion`, `cut` | model(s) or `ConflictingValuesError` |
| `find` | `entityType`, `where`, `orderBy`, `include`, `limit`, `pageSize`, `compare`, `cut` | `{total, pages:[{ids, entities, hasMore}]}` |
| `timeline` | `entityType`, `entityId`, `cut` (R, V) | model after each position that changed the entity |
| `validTimeline` | `entityType`, `entityId`, `cut` (P, R) | half-open valid-time segments with models |
| `valueSupports` | `cut`, `pattern` | per (entity, attribute, value): count and assertion ids |
| `reachability` | `cut`, `attribute`, `from`, optional `to` | closure; supportCount, paths with edge assertion ids |
| `aggregate` | `cut`, `match.attributes {var: attribute}`, `match.entityType`, `where`, `groupBy`, `aggregates [{op,var,as}]`, `integerAvg`, `emptyAs` | rows |
| `expr` | `expr: ["add", v, ["mul", v, v]]` (add sub mul div neg abs cast-int64) | typed value or typed error |
| `compare` | `left`, `right`, `compare` mode | eq/ne/lt/gt, identity, same group |
| `sortValues` | `values` | distinct values in canonical order |
| `analyticCounts` | `n`, `width` (1 or 10) | configured-entity population counts |

`where` items: `{"prop"|"var": ..., "op": "eq|ne|lt|lte|gt|gte|in|exists|missing", "value": {...}}` (`values` for
`in`). `orderBy`: `[{"prop": "age", "direction": "asc|desc"}]`; entity id ascending breaks ties.

A query that fails returns `{"id", "kind", "error": {"error": "<code>", ...}}`. Codes include
`ConflictingValuesError` (with every conflicted `{entityId, attribute}`), `integer-overflow`,
`number-overflow`, `division-by-zero`, `mixed-families`, `type-mismatch`, `invalid-cast`,
`DatalogValidationError` (integer AVG), `cycle`, `unavailable-cut`, `invalid-basis`, `ReadError`, `invalid-query`.

## 4. Output document

```jsonc
{
  "format": "triplex-db-2/o-replay-expected/1",
  "oracle": {"id": "O-REPLAY", "version": "0.1.0", "sourceSha256": {"values.py": "..."}},
  "caseId": "...", "caseSha256": "<sha256 of the case bytes>",
  "verdict": "PASS | FAIL | EXPECTED-ONLY",
  "divergedAtCommand": null,          // first command whose receipt disagreed (answers after it bind fewer identities)
  "receiptConsistency": {"status": "PASS | FAIL | NOT-APPLICABLE", "violations": [{"rule": "R-RCP-1", ...}]},
  "commandOutcomes": [{"command": 0, "expected": {"outcome": "committed"}, "observed": {...}, "verdict": "PASS"}],
  "state": [{"scope": "s1", "lastPosition": 5, "assertions": [...], "transactions": [...]}],
  "queries": [{"id": "...", "kind": "...", "result": ...}],
  "rulesInEffect": {...}
}
```

- **Typed values** come out as `{"type","value"}`; binary64 and datetime add `"bits"`; json adds
  `"canonical"`; `value` of a number is the ECMAScript shortest lexeme, `-0` for negative zero.
- **Assertion rows** carry every field of spec item 4: `id, entityId, attribute, value, validFrom, validTo,
  recordedAt, recordedPosition, createdBy, entityType, schemaVersion, txId, retractedAt,
  retractedPosition, retractTxId`.
- **Rejected expected outcomes**: `{"outcome":"rejected","category","errorTag","message",...}`.
  `errorTag` is null with `errorTagRuling: ORCHESTRATOR-RULING-NEEDED` where Triplex documents no tag.
- **Verdicts per command**: `PASS`, `PASS-OUTCOME-ONLY` (rejected as expected, tag not checkable),
  `FAIL`, `EXPECTED-ONLY`.
