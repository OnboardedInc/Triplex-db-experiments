# O-REPLAY case and output schema (v1; oracle 0.4.4)

O-REPLAY reads one case file and writes one expected-answer document. Python 3 standard library
only; it imports nothing from Triplex. Semantic rules are in [RULES.md](RULES.md).

```
python3 -I lab/oracles/replay/cli.py CASE.json [-o OUT.json] [--lane qlever]   # exit 0 PASS/EXPECTED-ONLY, 1 FAIL, 2 malformed
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
  A lexeme must read back as written (its shortest round-trip binary64 rendering has the same exact
  value, R-VAL-7, Q33a). Inside a user `json` value a lexeme that does not, or a -0 or non-finite one,
  rejects the command with E-INEXACT-JSON-NUMBER (R-VAL-11, Q30a). Anywhere else in the case
  (`9007199254740993` or `1e-400` as a typed number, instant or coordinate) it is a malformed case;
  give the exact lexeme or `bits`.
- **Integers travel as canonical decimal text**: `{"type":"integer","value":"9223372036854775807"}`.
- **binary64** is `{"type":"number","value":<JSON number>}` or `{"type":"number","bits":"0x<16 hex>"}`.
  `-0.0` (or `-0`) is kept.
- **decimal** is `{"type":"decimal","value":"16.50"}`; the attribute's declaration (case
  `attributeDeclarations` or a schema release) gives precision and scale; inline `"precision"` and
  `"scale"` are allowed and must agree with it (R-DEC-0, R-DEC-1).
- **Instants and valid-time coordinates** (`clock`, `instant`, `validFrom`, `validTo`, `recordedAt`,
  `validAt`) are JS numbers, possibly fractional, compared exactly as rationals. A written instant
  (`validFrom`, `validTo`, a datetime value) given as -0 rejects the command with E-NEGATIVE-ZERO-INSTANT
  (R-VAL-10, Q30b); a read basis given as -0 is E-NEGATIVE-ZERO-INSTANT too (R-CUT-4, Q43h).
- **Untyped predicate constants**: in `where` items and `compare.right`, a bare JSON string or number
  is an untyped constant (CMP-UNTYPED-STRING, CMP-NUMERIC-CONST); typed constants are value objects.

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
  "abortedPositions": {"s1": [{"stream": "log", "epoch": 1, "offset": 20, "ordinal": 0}]},
                                              // optional (Q31c): positions the feed's resolution stream lists
                                              // as aborted; they take no ordinal (R-RCP-1, R-RCP-8)
  "lane": "qlever",                           // optional (R-LANE-1): core (default), xtdb, qlever or a lane id;
                                              // cli.py --lane overrides it
  "laneIntegerRanges": {"qlever": ["-576460752303423488", "576460752303423487"]},   // optional override
  "attributeDeclarations": {":pay/rate": {"type": "decimal", "precision": 9, "scale": 2}},   // Q18
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
    // erasure (R-ERA-2), in a command of its own (no other ops, no preconditions; Q52g):
    // {"op": "erase", "entityId": "...", "attribute": "..."}, {"op": "erase", "entityId": "..."} (every value
    // of the entity), {"op": "erase", "target": "ann-name"} or {"op": "erase", "id": "<actual id>"} (the
    // retract selectors, Q56f); an unknown target or id is E-INVALID-VALUE (Q56a)
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

`position` is an integer (a dense or gapped scope counter) or a coordinate (Q31c):
`{"stream": "log", "epoch": 1, "offset": 12, "ordinal": 0}` or the list `["log", 1, 12, 0]`, ordered
lexicographically; `stream` is a string or an integer, the other fields non-negative integers. One scope uses
one kind. Positions need not be dense; the oracle assigns its own dense ordinals for cuts (R-RCP-8).

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

`type` is one of the nine families; a `decimal` attribute also gives `precision` and `scale` (Q18), and
that declaration governs writes to its attribute. Repository queries name the `schemaVersion` they read with
(default 1). A schema commit through ConfigStore is declared as an `internal` command so its position is
accounted for.

### 2.4 Nested and internal positions

- **Each allocated position is its own cut.** A nested transaction is declared as consecutive commands
  with the same `physicalGroup`; every member is one logical Triplex commit with its own receipt,
  position, txId and journal record. Members are validated in order against the state that includes
  the earlier accepted members; a failing member is rejected alone. If the host abandons the outer
  transaction, every member carries `hostAbort: true`.
- **Receipt check:** committed members of one physical group must hold consecutive positions
  (coordinates: one (stream, epoch, offset) and consecutive ordinals, R-RCP-5).
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
"cut": {"scope": "s1", "position": 5 | "latest" | {"afterCommand": 3} | {"coordinate": {...}},   // R-CUT-5
        "recordedAt": 1000.25,   // optional R, independent of P
        "validAt": 20.25,        // V; required where the kind reads valid time
        "publicBasis": true}     // false lets self-checks use negative instants
```

| kind | inputs | result |
| --- | --- | --- |
| `assertions` | `scope` | complete application assertion relation (spec item 4), raw lifetime |
| `journalFacts` | `scope`, optional `txId` | the modeled journal facts (`:_tx/change`, `:_tx/changed-entity`, R-JNL-5) |
| `match` | `cut`, `pattern` | visible rows; `raw` is the match contract (AMB-01 A, `contract` names it), `snapshot` the as-of view; journal facts when the pattern names the journal |
| `entityTriples` | `cut`, `entityId` | visible rows of one entity, as `match` |
| `history` | `entityId`, optional `cut` (no V needed), `applyValidAt` | `rawLifetime` and `asOfSnapshot` |
| `assertionSnapshot` | `cut`, `mode` (`live-at-valid`/`known-at-valid`), `pattern` | O-HAM SnapshotAssertion rows; `knownRetirement` `{retractedAt, retractTxId, retractedPosition}` (AMB-02) |
| `transactions` | `after`, `limit` (1..1000, default 100; outside it E-CURSOR malformed, R-JNL-7) | `{transactions, next}` |
| `transaction` / `transactionByCommand` | `txId` / `commandId` | record or null |
| `transactionsForEntity` | `entityId`, `limit`, `snapshotPosition`, `beforePosition` | newest first, `nextBeforePosition` |
| `cutCatalog` | `scope` | every position (the oracle's ordinal) with instant, txId, command, internal flag, group, the receipt `coordinate` when the scope uses coordinates, and `erasure: true` for an erasure commit |
| `entityPage` | `entityType`, `limit` (1..200, default 50), `cut`, or `cursorFrom: {query, page}` / `cursor` | pages of complete bodies, ids in codepoint order, `nextCursor` per page (R-PAGE-2..4) |
| `get` / `getMany` | `entityType`, `entityId` / `entityIds`, `include`, `schemaVersion`, `cut` | model(s) or E-CONFLICTING-VALUES |
| `find` | `entityType`, `where`, `orderBy`, `include`, `select`, `limit`, `pageSize`, `compare`, `cut` | `{total, pages:[{ids, entities, hasMore}]}`; fails on a conflicted attribute in a returned document (AMB-17 A) |
| `count` | `entityType`, `where`, `cut` | `{total}`; only filter attributes can fail it |
| `timeline` | `entityType` + `prop` (or `attribute`), `entityId`, `cut` (P, R; no V filter) | every assertion of the attribute recorded at (P, R) with `{identity, value, recordedAt, knownRetirement}` (AMB-02, AMB-03) |
| `modelTimeline` | `entityType`, `entityId`, `cut` (R, V) | model after each position that changed the entity (the 0.1 `timeline`) |
| `validTimeline` | `entityType`, `entityId`, `cut` (P, R) | half-open valid-time segments with models |
| `valueSupports` | `cut`, `pattern` | per (entity, attribute, value identity): count and assertion ids |
| `reachability` | `cut`, `attribute`, `from`, optional `to` | closure; supportCount, paths with edge assertion ids |
| `aggregate` | `cut`, `match.attributes {var: attribute}`, `match.entityType`, `where`, `groupBy`, `aggregates [{op, var, as, convert?}]`, `varTypes`, `emptyAs` | rows; `convert: "toNumber"` before AVG (AMB-11; `integerAvg: "convert"` is the 0.1 alias) |
| `expr` | `expr: ["add", v, ["mul", v, v]]`: add sub mul div rem neg abs cast-int64 to-number (toNumber) to-int64 (toInt64, toInteger) to-decimal (toDecimal); `["divide", a, b, scale, "half-even"]`, `["round", x, scale, "half-up"]`, `["toDecimal", x, p, s]` (x an integer, decimal or json value; a JSON number converts as written, DR-JSON-CONVERT, Q49e), `["toDecimal", number, p, s, "down"]` and `["toDecimal", json, p, s, "half-up"]` (the as-written reading rounded, Q52f) take bare JSON integers and rounding strings as parameters | typed value or typed error |
| `compare` | `left` (value or expression), `right` (value, expression or untyped constant), `compare` mode | eq/ne/lt/gt each a boolean or the pinned error, identity, same group |
| `sortValues` | `values` | distinct values in ACC 4.5 order (first given representation survives) |
| `analyticCounts` | `n`, `width` (1 or 10) | configured-entity population counts |
| `orderKey` / `decimalKey` / `tdk1Key` | any | refused, exit 2 `X-NOT-MODELED` (TDK1 keys, Q35; R-DEC-17) |

Any query may carry `"readStart"` (a position, `{"afterCommand": k}` or `{"coordinate": c}`): the last position
published when the read started; erasure commits of its scope published after it are in flight for it
(R-ERA-6). Q52e: the read sees each in-flight commit whole, so when the answer depends on them the entry is
`{"id", "kind", "inFlight": {"rule": "ER-INFLIGHT-ALL-OR-NONE ...", "acceptable": [{"erasuresSeen": [], "result":
...}, {"erasuresSeen": ["tx:3"], "result": ...}]}}` (each alternative a `result` or an `error`), one alternative per
prefix of the commits in position order (Q66a: none, the first, the first two, ...), the all-old answer first;
otherwise it is the plain `result` or `error`. An `entityPage` with `cursorFrom` is answered from the read it names,
whether or not that read had commits in flight: per prefix of that read, from that prefix's page, in the same form,
never with its own `readStart` (Q66b, Q70a). A literal `cursor` token equal to a `nextCursor` that a read with commits
in flight issued earlier in the case continues that read the same way (Q70b); any other token uses the query's own
read view.

`where` items: `{"prop"|"var": ..., "op": "eq|ne|lt|lte|gt|gte|in|exists|missing", "value": ...}` (`values` for
`in`); `value` is a typed value object or an untyped bare JSON string/number. `orderBy`:
`[{"prop": "age", "direction": "asc|desc"}]`; entity id ascending breaks ties.

A query that fails returns `{"id", "kind", "error": {...}}` with the ACC 4.7 fields: `error` (the 4.7 id, for
example `E-CONFLICTING-VALUES`, `E-INTEGER-OVERFLOW`, `E-MIXED-FAMILY`, `E-INTEGER-AVG`, `E-CURSOR`), `_tag`,
`reason`, `phase`, `reasonAlternatives` (multi-reason ids), `message` and detail (`conflicts` lists every
conflicted `{entityId, attribute}`). Errors without a 4.7 row use `X-` ids (`X-CYCLE`, `X-NO-POSITION`,
`X-NOT-MODELED`) with `ruling` naming the RULING-NEEDED item (R-ERR-2). A case the oracle cannot answer
exactly (decimal scale evolution, TDK1 keys) exits 2 with a message starting `X-NOT-MODELED`; a pattern that could
select unmodeled transaction envelope facts is a typed `X-NOT-MODELED` answer (R-JNL-6).

## 4. Output document

```jsonc
{
  "format": "triplex-db-2/o-replay-expected/1",
  "oracle": {"id": "O-REPLAY", "version": "0.4.4", "sourceSha256": {"values.py": "..."}},
  "caseId": "...", "caseSha256": "<sha256 of the case bytes>",
  "lane": {"name": "qlever", "integerRange": ["-576460752303423488", "576460752303423487"]},
  "verdict": "PASS | FAIL | EXPECTED-ONLY",
  "divergedAtCommand": null,          // first command whose receipt disagreed (answers after it bind fewer identities)
  "receiptConsistency": {"status": "PASS | FAIL | NOT-APPLICABLE", "violations": [{"rule": "R-RCP-1", ...}],
                         "positions": [{"scope": "s1", "coordinates": "integer | tuple", "dense": true,
                                        "aborted": [...]}]},   // only when informative (R-RCP-8)
  "commandOutcomes": [{"command": 0, "expected": {"outcome": "committed"}, "observed": {...}, "verdict": "PASS"}],
  "state": [{"scope": "s1", "lastPosition": 5, "assertions": [...], "transactions": [...]}],
  "queries": [{"id": "...", "kind": "...", "result": ...}],
  "rulesInEffect": {...}, "reservedNamespaces": {...}
}
```

- **Typed values** come out as `{"type","value"}`; binary64 and datetime add `"bits"`; json adds
  `"canonical"`; decimal adds `"scale"` and `"precision"` (no storage form, Q35b); `value` of a number is the ECMAScript
  shortest lexeme, `-0` for negative zero; integers are canonical decimal text (AMB-10).
- **Erased values** (R-ERA-1): `{"_tag": "ErasedValue", "erasedAt": <instant>}` in place of the typed value, at every
  basis; a marker group standing for several erased values reports the earliest erasedAt (Q52c). A read whose
  `readStart` precedes an erasure commit lists whole answers under `inFlight` (R-ERA-6, Q52e). An erasure commit's
  journal record lists identity-only changes `{"op": "erase", "entityId", "attribute", "assertionIds"}` (R-ERA-3, Q49a).
- **Assertion rows** carry every field of spec item 4: `id, entityId, attribute, value, validFrom, validTo,
  recordedAt, recordedPosition, createdBy, entityType, schemaVersion, txId, retractedAt,
  retractedPosition, retractTxId`; journal fact rows add `"journal": true`.
- **Rejected expected outcomes**: `{"outcome":"rejected","error":"<4.7 id>","errorTag","reason","phase",
  "reasonAlternatives"?,"detail"?,"message",...}`; `detail` is `inexact-json-number` (E-INEXACT-JSON-NUMBER) or
  `no-negative-zero` (E-NEGATIVE-ZERO-INSTANT); `host-abort` has `errorTag` null and a `ruling` note (R-CMD-9).
- **Phase of a two-phase row**: E-DECIMAL-OVERFLOW ("preflight or execution") is `preflight` on a rejected
  write and `execution` on a query result (R-DEC-16).
- **Verdicts per command**: `PASS`, `PASS-OUTCOME-ONLY` (rejected as expected, tag not checkable),
  `FAIL`, `EXPECTED-ONLY`.
