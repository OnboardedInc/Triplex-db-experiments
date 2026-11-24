# XQ2: what an index by attribute and value costs per save, and what a question across subjects costs

Spike for the cross-subject design (`OPUS-XQ1`), 2026-11-24. Branch `exp/DX-XQ2-index-cost` from `exp/DX-INT1`
`9e02cf1d2`. Everything is behind one option, default off: `TX2_ATTRIBUTE_INDEX` (a comma-separated attribute list;
`@type` adds type markers; an entry ending in `*` is a prefix). Nothing here is proposed as the final design. Every
time on this page is from the Mac lab VM and is **diagnostic**; the counts (datoms, bytes, storage reads, entries
examined, exactness) are the result.

RESULTS_PLACEHOLDER

## The index form chosen, and why

**One tuple datom per current row of a listed attribute, on the row's own entity**, in Datomic's AVET:

```
:triplex.xq/<family>  [account  attribute  value  entity-id  valid-from  valid-to  row-id]
```

- **Families** (one tuple attribute each, so Datomic orders values natively): `s` string, `r` reference (target id),
  `i` integer that fits 64 bits, `x` larger integer (by text, equality only), `n` number, `d` datetime, `b` boolean.
  `:triplex.xq/type [account type entity-id]` is the type marker; `:triplex.xq/long [account attribute reason
  entity-key row-key]` marks a row the tuple cannot hold (below).
- **Why a tuple and not a composed string.** Probed on Datomic 1.0.7745 (`probe_forms.clj`, `probe_limits.clj`;
  evidence `DX-XQ2/probe-limits.log`): heterogeneous tuples work up to 8 elements (9 refused), allow `nil`, keep `-0.0`,
  sort doubles numerically, and `d/index-range` takes a partial tuple as a bound (a partial tuple sorts before every
  full tuple with its prefix). A composed string needs an escape scheme (the probe shows a value `open\u0001x` falling
  inside an equality range for `open` without one) and a sortable text encoding of numbers. **The tuple's limit:**
  a string element over 256 characters is refused (`:db.error/invalid-tuple-value`; 256 two-byte characters pass, so
  the limit is characters). A row whose value, entity id or row id is longer, or whose value is json or blob, gets one
  `:triplex.xq/long` marker instead; a query that such a row could match is refused (`IndexIncomplete`), never
  answered without it. Retracting an absent tuple is a no-op (probed), so a scope whose old rows predate the option
  takes the option without failing saves (its index is incomplete until backfilled; not built).
- **Why the row's own entity and not one entity per account.** On the row's entity, removal of a whole entity
  (excision) would take its index datoms with it; the per-subject writer's existence checks land in the subject's own
  EAVT neighbourhood, which the writer already reads; the and-probe reads one subject's index datoms. On a per-account
  entity every assertion's redundancy check seeks into one huge EAVT run at a random place. Both were built and
  costed (arms `n*` against `a*` below).
- **Who writes it.** The peer computes each assertion from the request's own row text (`attribute_index/tx-adds`,
  called from `storage/tx-data`, carried as `:xq-adds` so the per-subject writer's eligibility is unchanged). The
  per-subject writer appends the assertions and retracts each retired row's tuple from its certified predecessor text
  (`subject_save/plan`). The general writer appends the assertions and retracts from the **stored** row text inside the
  serial function (`commit/with-attribute-index`): the client's retired-row columns are never trusted. Import goes
  through the general writer. Grouped and prepared commits assemble members from plain ops, so with the option on
  every save goes alone (`group/eligible?`); the covering owner-head writer is refused at start.
- **Protected attributes** cannot be listed: declaring protection on a listed attribute is refused
  (`ProtectedAttributeIndexed`), rows of protected attributes are never keyed, and a query on one is refused.
- **Valid time.** The index holds every **currently believed** row (record time: asserted and not retracted at the
  position read) with its whole valid interval. A query takes `validAt` (default the server clock) and keeps entries
  with `valid-from <= validAt < valid-to`: exactly the existing reads' `visible?` rule. So one index answers "valid now",
  "valid at a past or future date", and, through Datomic's as-of view of the same AVET, "as believed at past position P".
- **Read route** `POST /v1/db/<name>/xq`: `account` (required; every scan's bounds start with it, so no entry of
  another account can be reached), `shape` `eq | range | count | and | type`, `validAt`, `basis.recordedPosition`,
  `limit` (1 to 10,000), `maxExamined` (1 to 10,000,000), `cursor`. `and` takes two clauses: two equalities merge-join
  (entries under one value are ordered by entity id); otherwise the first equality drives and the other clause is
  checked on the candidate's own index datoms (EAVT of that entity). The answer carries `position`, `head`, `asOf`,
  `examined`, `complete` and a `cursor` when a bound stopped it.
