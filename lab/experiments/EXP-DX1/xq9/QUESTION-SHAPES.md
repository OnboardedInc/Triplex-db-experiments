# The question shapes the sweep still refused: related entities, "is not", OR, top N, "contains", sums (XQ9, 2026-11-24)

**The slow exact route now answers questions over a subject's related entities (S10), "is not", "any of these
groups", the top N by an attribute (S9), text "contains" (S8) and exact sums and averages, each behind its own name in
one option, `TX2_SWEEP_SHAPES`.** With the option unset the route answers and refuses every request exactly as at
`5faf8b80e` (2,242 of 2,242 answers of the sweep builder's whole gate byte-identical to a twin gateway running the base
source). Every new shape is exact against an independent brute force on three accounts, three positions and three valid
instants (8,519 checks, 0 failures). Branch `exp/DX-XQ9-question-shapes`, based on `exp/DX-XQ8-console-questions`
`5faf8b80e`. Not merged onto `exp/DX-INT1`.

## 1. The product's twelve shapes (design of 2026-11-24, section 3)

| # | Shape | Before this branch | Now |
| --- | --- | --- | --- |
| S1 | All entities of a kind, keyset pages | Answered (ID list, sweep) | Answered |
| S2 | Equality on a reference | Answered (`eq` on a ref) | Answered |
| S3 | Status-like value, "has no value" | `eq`, `missing` | Answered, plus **`ne`** ("is not") |
| S4 | Several conditions (AND) | Up to 8, AND only | Answered, plus **`anyOf`** (up to 4 groups of AND, 8 conditions in all) |
| S5 | Range on a date or number | Answered | Answered |
| S6 | Count, distinct count, count per value | Answered | Answered, plus **exact sum and average** of an integer attribute |
| S7 | Join through one reference | Not on the sweep | **Answered, one hop**: `has` with `link {ref}` (forward reference) or `link "key"` (same number in the ID). Two hops: refused by type |
| S8 | Substring text search | Prefix only | **Answered: `contains`**, case-sensitive or any case, on non-protected text |
| S9 | Sort by an attribute | Refused | **Top N (N up to 1,000) by one attribute of the entity asked about**, ascending or descending. Sorting by an attribute of a *referenced* entity, and ordered pages beyond N, are refused by type (`OrderedPagingNeedsIndex`): the index route's |
| S10 | Filters over a subject's children | Not expressible | **Answered, one level**: `has` with `some`, `none` or a count comparison, evaluated on each subject's related entities read at the same position and valid time |
| S11 | Which entities a change affects | Answered | Answered |
| S12 | Lookup by a protected value | Refused | **Refused, always** (`ProtectedValueLookup`), now in every new position too |

**Still refused, and why.** S12 by ruling. Ordered pages beyond the top 1,000 and sorting by a referenced entity's
attribute (S9's product form "placements sorted by the subject's last name"): a sweep reads every entity once and can
keep only a bounded set; pages in value order need an index that is read in value order (`find`, exp/DX-XQ4). Related to
related (two hops): refused by type (`NestedRelatedUnsupported`). Entities that point back at the subject with no
reference from the subject (`refBack`): refused by type (`ReverseLinkUnsupported`); ask it from the other side.

## 2. The meaning of each addition

One line each, then the detail. Every addition keeps the sweep's contract: one account, one position, one valid-time
instant per question, stated in every answer; a subject is a listed ID with at least one visible fact; a condition is
tested on the subject's visible facts.

| Name in `TX2_SWEEP_SHAPES` | Meaning |
| --- | --- |
| `ne` | `{attribute, op: "ne", value}`: no visible value of the attribute equals the value; **a subject with no value matches**. |
| `or` | `anyOf: [[...], ...]`: 1 to 4 groups; a subject matches when every `where` condition holds and at least one group's conditions all hold. |
| `related` | `{op: "has", related: {prefix, shape?, link}, where?, quantifier?}`: how many of the subject's related entities of that kind satisfy `where`, compared by `some` (at least 1, default), `none` (0) or `{op: gte, gt, lte, lt or eq, value}`. One level. |
| `top` | `result: "top"`, `order: {by, type, direction}`, `limit` N (1 to 1,000): the N matching entities with the best value; ties by ID ascending; entities without a value of that type last, in ID order. Known only when the sweep is complete. |
| `contains` | `{attribute, op: "contains", value: {type: "string", value}, caseInsensitive?}`: a visible text value contains the needle (1 to 256 characters). |
| `sum` | `result: "sum"`, `of`: the exact sum of every visible integer value of `of` on every matching entity, the count of values, an exact average. |

### 2.1 `ne`: a subject with no value is "not that value"

**Chosen: `ne v` is the complement of `eq v`.** For every subject exactly one of `eq v` and `ne v` holds, so counts add up
and "everything else" is one condition. "Has a value, and it is not v" is `ne v` with `exists`. A subject with two values
`a` and `v` does not match `ne v` (one of its values equals v), the same way it matches `eq v`. Values of another type
are not equal. The console shows "is not" with "no value counts as not" beside it, and the tool's description says the
same. Rejected: SQL's `<>` (a subject with no value matches neither `eq` nor `ne`, so the two do not add up, and "no
status or not complete", the product's "open", would need OR).

### 2.2 `anyOf`

**Groups of AND, at most 4, inside the 8-condition bound.** `where` and `anyOf` together hold at most 8 conditions, a
`has` counting one plus its own. Each subject is evaluated once, so a subject that satisfies two groups is counted once:
counts and counts per value stay exact. Rejected: nesting OR inside OR (no product question needs it; the bound would
stop meaning anything).

### 2.3 `has`: one level of related entities (S10, S7)

**How a child is tied to its subject, in the lean layout and the ID scheme.**

- **Lean layout.** Every entity is its own Datomic entity, carrying only its own row texts
  (`:triplex.entity/row`, `storage/tx-data`). A subject's read never contains its children's facts, so a question over
  children must read the children. There is no packing of a child's facts onto its subject in this layout.
- **ID scheme** (`lab/bench/lib/world.ts`, `deep-world.ts`; ID list page `xq3/ID-LISTS.md`). IDs are
  `acct/<account>/<kind>:<key>[:<more>]`; the key is the text after the kind's colon up to the next colon. A subject
  root `pl:00000005` has key `00000005`; its placements are `pl:00000005:p0`, its tasks `i9:00000005` and
  `i9:00000005:t3`, its profile `wk:00000005`, its subtasks `sec:00000005:3:1`. So **`link: "key"`** finds a subject's
  related entities of kind K as the IDs of K whose key is the subject's key: one ID list walk of `<K><key>` (the ID list
  route's own `ids/scan!`), keeping IDs that end there or continue with a colon, filtered by the related shape. It works
  both ways: a task's subject is the `pl:{8 digits}` ID with the task's key.
- **References.** The deep loader also ties them by reference: `:person/placement` from the root to each placement,
  `:placement/task` from a placement to a task, `:person/profile` to the profile. **`link: {ref: attribute}`** takes
  the swept entity's visible values of that reference attribute, kept when they are IDs of the related kind inside the
  same account (a reference to another account is never read; gate 9a's cross-account reference). In the lean layout a
  reference target that has no fact of its own has no ID (ID list page) and is not a related entity.
- **Pointing back** (a task with `:task/subject` pointing at its subject, and nothing from the subject to the task) has
  no route without an index: refused by type, `ReverseLinkUnsupported`, naming the reverse question.

**Evaluation.** For each page's batch of 16 subjects: the subjects are read as before; for each subject whose own plain
`where` conditions hold, the related IDs of each `has` condition are found as above; all of them are read in one call
of the pinned read's own code (`storage/read-rows`, chunks of 256) at the question's position and valid time; a related
entity counts when it has a visible fact and every condition of its `where` holds on its visible facts. The quantifier
compares that count. More than 1,000 related entities of one subject refuses the question (422 `RelatedLimitExceeded`)
rather than count part of them. The answer adds `related` (related entities read with a visible fact),
`relatedListed`, `relatedRows` and `relatedMicros`.

**What it costs** (section 5): every related entity is read, so a subject with 5.7 tasks of about 21 rows costs about 10
times the rows of the subject alone. **When the children were created in the subject's own commit** (as one commit per
subject's save does, and as the deep loader did), their entity numbers sit next to the subject's and the extra rows come
from segments already loaded; **when they were written later in other commits**, each child can cost its own segment
loads. Section 5 measures both layouts on the toy.

### 2.4 Top N (S9)

**A whole sweep keeping the N best in the signed cursor.** Each page adds its matching subjects to a sorted set of at
most N (a `TreeSet` with the order below), and the next cursor carries that set, gzip-compressed inside the
HMAC-signed body. Chosen over a server-held state: a cursor survives a read gateway restart exactly (gate 9b, case b5:
the read gateway restarted inside a top N, the answer exact) and any read gateway with the same secret continues it; a
server-held state would be lost on restart and need a lifetime. The price is the cursor's size: measured up to
`cursorBytes` in section 5; the cursor bound rises from 65,536 to 1,048,576 characters only when `top` is on.

- **Order value.** Ascending: the subject's least visible value of `by` in the order's `type` (string, integer, number
  or datetime); descending: its greatest. Values of another type do not count.
- **Ties** break by ID ascending, in both directions. **Missing values** come last, in ID order, in both directions.
- **Cost:** every entity of the kind is read once; the answer's `examined`, summed over the pages, is every listed ID
  of the kind (checked in gate 9a). Pages before the last return no IDs; the complete page returns `ids` and `values`.
- **Refused:** `order` on a list of IDs (`OrderedPagingNeedsIndex`), N above 1,000 (the same code), a protected order
  key (`ProtectedValueLookup`).

### 2.5 `contains` (S8)

**Per subject, no index.** Java's `String.contains` on each visible text value; with `caseInsensitive` both sides are
lower-cased with the root locale (Java `toLowerCase(Locale.ROOT)`; the gate's brute force uses JavaScript's
`toLowerCase`, which agrees on the test's non-ASCII text). Only text values are searched (not references). **Bound on
value length:** values are searched whole up to 65,536 characters; a longer value refuses the question (422
`ContainsValueTooLong`) rather than answer from part of it; the needle is 1 to 256 characters. Cost: one scan of each
value of that attribute per subject, CPU only (section 5).

### 2.6 Sums and averages

**They fall out of the count's code.** The count keeps a running number in the cursor; the sum keeps a running
`BigInteger` in the cursor as decimal text, so nothing overflows (Java's arbitrary-precision integers; the stored
integers are decimal texts already). Every visible integer value of `of` on every matching subject is added (a subject
with two values adds both); values of another type are skipped and counted (`skipped`). The answer gives `sum`,
`valuesAdded`, `subjectsWithValue`, `skipped`, and on the complete page `average` as an exact reduced fraction plus a
decimal rounded to 6 places, half to even. Number and datetime values are not summed (they are binary doubles: not exact).

## 3. The contract additions

Requests (strict supersets of `5faf8b80e`'s; each accepted only when its name is in `TX2_SWEEP_SHAPES`):

```json
{ "account": "account-003", "from": { "prefix": "pl:", "shape": "pl:{8 digits}" },
  "where": [ { "op": "has", "related": { "prefix": "i9:", "link": "key" },
               "where": [ { "attribute": ":task/status", "op": "ne", "value": { "type": "string", "value": "complete" } } ],
               "quantifier": { "op": "gte", "value": 3 } } ],
  "anyOf": [ [ { "attribute": ":person/name", "op": "contains", "value": { "type": "string", "value": "smith" }, "caseInsensitive": true } ],
             [ { "attribute": ":person/score", "op": "range", "from": { "type": "integer", "value": "80" } } ] ],
  "result": "top", "limit": 10, "order": { "by": ":person/score", "type": "integer", "direction": "desc" } }
```

New refusals (all typed): 400 `NestedRelatedUnsupported`, 400 `ReverseLinkUnsupported`, 400 `OrderedPagingNeedsIndex`,
422 `RelatedLimitExceeded`, 422 `ContainsValueTooLong`; 400 `UnsupportedOperation` for more than 4 groups, more than 8
conditions in all, a contains needle outside 1 to 256 characters or not text; 409 `ProtectedValueLookup` for a protected
attribute anywhere: `ne`, `contains`, an OR branch, a related entity's condition, the reference that ties related
entities, the order key, the summed attribute.

**For `find` (exp/DX-XQ4-commit-index).** The names are the unit of adoption: `ne`, `or` and `contains` are conditions
`find` can take or refuse by name; `related` with `link {ref}` is its one-hop reverse join seen from the other side;
`top` is what an index read in value order gives for free, and ordered pages beyond N belong there; `sum` is a range
scan that adds. A request that `find` refuses with a fallback can be sent here unchanged.

## 4. Gates (Mac toy, one ordinary heavy token each, counts exact, times diagnostic)

Evidence: `evidence/DX-XQ9/` (private, outside the repository), one folder per run.

| Gate | Run | Result |
| --- | --- | --- |
| **9k. Off equals before (byte-identical)** | `twin-off-2`: this branch's gateway with `TX2_SWEEP=1` and `TX2_SWEEP_SHAPES` unset, a twin read gateway on the same stack running the base source (`git archive 5faf8b80e`), and the sweep builder's whole gate (`xq6/gate.ts`, unchanged) run through `twin-proxy.mjs`, which sends every sweep request to both | **The sweep builder's gate passes on this branch: 5,917 of 5,917 checks. 2,242 of 2,242 sweep answers byte-identical** to the base gateway's (status, code, message, IDs, counts, groups, position, signed cursor), after removing only timing, storage accounting and the head each process saw (and, for a first page with no stated valid time, the gateway's own clock); 8 requests of the burst test (2j) not compared because one side answered `SweepBusy`; 0 twin errors |
| 9k'. On is a strict superset | `twin-on-1`: the same with `TX2_SWEEP_SHAPES=all` | 2,242 of 2,243 compared answers byte-identical to the base; **the one difference is the `ne` request the base refuses with `UnsupportedOperation` and this branch now answers** (the old gate's one failed check, "refusal: not-equal", is that request); 7 burst requests not compared |
| 9u. In-memory checks | `unit-2`: `sweep_shapes_test.clj` against the seeded model (not the store), `TX2_SWEEP_SHAPES=all` | 89 of 89 |
| **9a. Every new shape** | `shapes-1`: `xq9/shapes.ts`, brute force from one history read of the whole scope at the position (`lean/history-entity` over `d/history`, not the sweep's as-of read), visibility at (position, valid time), then every condition, related entity, OR group, top N and sum recomputed in TypeScript | **24 question shapes × 3 accounts (`account-003`, `account-0031` whose name starts with the first's, `account-009` with zero subjects) × 3 positions (8, 10 and the head 12) × 3 valid instants (20 days ago, 5 days ago, now + 1 h) × rotating page sizes (3 matches and 5 subjects per page; 7 subjects; 10,000): 648 sweeps, 2,334 pages, 2,950 IDs, 942 counted subjects and 998 top-N entries equal to brute force**; every page at the question's position and valid time, only the last page complete, every page within its subject bound, every top N's pages before the last empty, and every top N examined exactly the kind's listed IDs. 35 of the 48 non-empty (account, question) pairs have different true answers across the nine cells, so the matrix can fail; 216 of 648 answers are empty, all of them `account-009`'s (24 questions × 9 cells) |
| **9b. Between pages** | `shapes-1` | Each pinned at the head, pages of 4 subjects: **b1** subjects and their tasks changed ahead of and behind the cursor and new tasks created (9 commits): 10 pages equal brute force at the pinned position (18 matches; 25 at the new head, where a fresh sweep also equals brute force). **b2** a child retired (every fact of two tasks ahead of the cursor, 7 commits): equal at the position (28; 22 at the head). **b3** a removal on request between pages, on a question with `contains`, an OR group and a `has`: equal at the position and at the new head, no protected value on any page. **b4** top 9 by rank (ranks repeat every 4 subjects, so ties cross every page boundary) with ranks ahead of the cursor changed between pages: equal (ties by ID). **b5** the read gateway restarted in the middle of a top 6 (the heap travels in the signed cursor), a save after it: equal at the position; the true answer moved at the head in b1, b2, b4 and b5 |
| **9c. Refusals** | `shapes-1` | 17 of 17: a protected attribute in `ne`, in `contains` (both cases), in an OR branch, in a related entity's condition, as the reference that ties related entities, as the order key, as the summed attribute (`ProtectedValueLookup`, before any subject is read); related to related (`NestedRelatedUnsupported`); entities pointing back (`ReverseLinkUnsupported`); ordered pages of IDs and a top above 1,000 (`OrderedPagingNeedsIndex`); five OR groups, nine conditions across `where`, OR and `has`, a 257-character needle, an integer needle (`UnsupportedOperation`); a quantifier above 1,000 (`InvalidValue`) |
| 9d. Isolation | `shapes-1` | A subject of `account-003` that references a placement of `account-0031`: the reference is not followed (count equal to brute force with the same rule); no ID outside the account on any page; no protected value in any answer |
PLACEHOLDER-MOREGATES

## 5. Cost per 1,000 subjects (Mac toy, diagnostic)

PLACEHOLDER-COST

## 6. Predictions at 1 billion records, one deep account of 100,000 subjects (written before any server run)

PLACEHOLDER-PREDICTIONS

## 7. Not verified

- **Nothing ran on a server.** Every time in this page is the Mac's (diagnostic); section 6 is a prediction.
- **The cost of related entities at 1 billion** depends on whether a subject's tasks sit in the segments its root
  already loads. The deep loader created each subject with its tasks in one frame (adjacent entity numbers), so the
  prediction assumes they do; not measured on the sealed database.
- **The console's real product IDs.** `link "key"` relies on the loader's and the console's ID scheme
  (`<kind>:<key>[:...]`); the product's own entity IDs inside Triplex do not exist yet (design, section 8 of
  DESIGN-FABLE). Where they do not follow it, `link {ref}` is the route.
- **Case-insensitive "contains" on unusual text.** Java's root-locale lower-casing and JavaScript's agree on the gate's
  text (ASCII and É); characters whose lower case changes length (İ, ß in upper case) are not gated.
- **Settlement.** As the sweep: stored facts only (`facts: "stored"`); a value a release has not written yet is not seen
  by a `has`, an order or a sum either.
- **Interior positions** stay refused (`InteriorPosition`), as on the sweep.
- **The top N cursor's size** is measured on the toy only (section 5); at 1,000 entries with long IDs and long text
  values it may approach the 1 MiB cursor bound, which the route then refuses as a malformed cursor. Not seen.
- **Not merged** onto `exp/DX-INT1`; `find` (exp/DX-XQ4) does not call these shapes, and the owner's console on 28580 still
  runs `dx-con1-app` (switching it needs the owner's word; the steps of `demo/toy/README-FOR-CONSOLE.md` apply from this
  worktree after `pnpm install`, the SDK build and `vite build`).
PLACEHOLDER-NV2

## 8. Files

| File | What |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/sweep.clj` | `TX2_SWEEP_SHAPES`; `ne`, `contains`, `has` in the condition compiler; `anyOf`, `top`, `sum` in the question; related entities, the top-N heap in the cursor, the sum |
| `packages/datomic/gateway/src/triplex/gateway/sweep_shapes_test.clj` | In-memory checks against the seeded model (`xq9/unit.sh`) |
| `packages/datomic/src/sweep.ts`, `index.ts` | SDK types: `SweepHasCondition`, `SweepPlainCondition`, `anyOf`, `order`, top and sum answers |
| `lab/experiments/EXP-DX1/stack/up.sh`, `demo/server/profile.mjs`, `demo/server-up.sh` | `DX_SWEEP_SHAPES` (unset: environment unchanged); the demo profile turns all six on; the ready file records them |
| `examples/demo-mcp/src/tools.ts`, `questions.ts` | `ask_across_subjects`: `ne`, `contains`, `has`, `anyOf`, `top` with `order`, `sum`; plain sentences for the new refusals |
| `examples/console/src/pages/questions.tsx` | "is not", "contains" with "any case", "Has related entities where...", "Any of these groups", "Top N by", "A sum", S8, S9, S10, S13 examples |
| `examples/demo-mcp/src/prove-questions.ts`, `examples/console/e2e/questions-pass.mjs` | The console proofs, extended to every new path |
| `lab/experiments/EXP-DX1/xq9/gate.sh`, `shapes.ts`, `twin.py`, `twin-proxy.mjs`, `load.ts`, `dryrun.ts`, `unit.sh` | Gates, the byte-identity twin, the cost runner, the server runner's dry run |
| `lab/experiments/EXP-DX1/xq6/server.ts` | Arm C added (the server command in section 6) |
