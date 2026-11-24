# XQ2: what an index by attribute and value costs per save, and what a question across subjects costs

Spike for the cross-subject design (`OPUS-XQ1`), 2026-11-24. Branch `exp/DX-XQ2-index-cost` from `exp/DX-INT1`
`9e02cf1d2`. Everything is behind one option, default off: `TX2_ATTRIBUTE_INDEX` (a comma-separated attribute list;
`@type` adds type markers; an entry ending in `*` is a prefix). Nothing here is proposed as the final design. Every
time on this page is from the Mac lab VM and is **diagnostic**; the counts (datoms, bytes, storage reads, entries
examined, exactness) are the result.

## The answer in five lines

- **Exact.** The 20,000-subject gate (two accounts, both writers, corrections with a past valid time, retirements,
  removals on request, an import, a transactor restart) matched a brute-force scan in **92 of 92** query comparisons
  and **175,286 of 175,286** index entries checked entity by entity; **0** of 126,842 index datoms (current and history)
  sit on a wrong entity; **0** protected values ever entered the index; **0** rows of the other account came back.
- **Writer time:** about **0.12 ms per declared value replaced** on the Mac (general writer, clean hot measure at
  k = 20: +2.40 ms on a 1.46 ms 20-row save), **nothing measurable** for the per-subject writer at k = 1. Scaled by the
  Mac-to-server ratio of an ordinary fact, the server estimate is **0.2 to 0.33 ms per declared value**: k = 1 is
  0.2 to 0.33 ms, **k = 3 is 0.6 to 1.0 ms (at or over the design's 0.5 ms line)**. Needs the server pair below.
- **Storage reads inside apply per first touch:** **+0.05** (spread 0.12 over five paired arms, 250 to 1,000 pairs
  each) with entries on the row's entity; +0.08 on a twin entity. Under the design's 0.2 line, not distinguishable from 0.
- **Bytes per entry: 274 B** (production-length keys, about 120 characters; all three indexes plus log after an
  indexing job and gc), 214 B with short keys. Log bytes per declared value replaced: 290 to 410 B.
- **Uncached subject read** with 20 entries per subject: no measurable change (whole EAVT range walk 3.70 vs 3.91 ms
  cold, 0.71 vs 0.67 segment loads per subject).

## Per-save cost table (Mac lab VM, toy, times diagnostic)

**How it is measured.** 2,000 subjects x 160 facts (`forms-f1`, production-length IDs) and 4,000 x 160 (`reads-r1`,
short IDs); one arm per list (n0 = nothing indexed, n1 = 1 attribute, n3, n5, n20 = 20 attributes; t1 = 1 attribute on
a twin entity in its own partition); each arm is its own database seeded identically, indexed and gc'd, then the
transactor is restarted cold and a new gateway JVM measures. **Paired:** in one database, saves of indexed fields
alternate with the same saves of never-listed fields (first in pair alternates). The null arm n0 shows the bias of
the pairing itself (the two fields sit at different places in a subject's EAVT range: -0.29 to +0.13 reads per save),
so effects are reported as the arm's difference minus n0's difference. Writer server switches: per-subject ordered
writer, numeric owner, predecessor lookup, group commit off; transactor cache 128 MB, PostgreSQL 64 MB buffers.

| Save (writer) | k declared values written | Extra datoms | Extra log bytes | Reads inside apply, arm minus null | Apply p50 change (hot, no reads) |
| --- | --- | --- | --- | --- | --- |
| First touch, 1 field (per-subject) | 1 | +2 (21 -> 23) | +240 to +410 B | n1 +0.17 / +0.16; n3 -0.11; n5 -0.05; n20 +0.07; twin t1 +0.08 | |
| Second save, 1 field (per-subject) | 1 | +2 | +330 B | n1 -0.01 / -0.04; n3 +0.08; n5 +0.03; n20 +0.29; twin +0.15 | |
| Same field again and again (per-subject, hot) | 1 | +2 | | 0 (hot) | within each arm, indexed minus unindexed: n1 +0.04 / -0.08; n3 +0.04; n5 +0.02; n20 -0.02; twin +0.02 (null arm r1: -0.02) |
| 20-row form, first touch (general) | 1 / 3 / 5 / 20 | +2 / +6 / +10 / +40 | +410 / +1,040 / +1,600 / +5,850 B | n1 -0.16; n3 -0.10; n5 -0.15; n20 -0.02 | |
| 20-row form, hot (general) | 1 / 3 / 5 / 20 | as above | | n20 0.098 vs 0.072 (hot) | **n1 +0.20 (r1: +0.22); n20 +2.40** (1.46 -> 3.86 ms); n3, n5 not hot (0.24 to 0.6 reads) |
| Import, 15 new subjects x 160 rows (general) | 0 to 300 new entries | +15 to +300 | +0.3 to +5 % | 1.2 to 3.4 (all arms) | not separable (one commit of 2,400 rows: 33 to 55 ms in every arm) |

- **Writer time.** The only clean slope is k = 20 on the general writer: 2.40 ms / 20 = **0.12 ms per declared
  value replaced** (0.06 ms per tuple datom: an add and a retract each). k = 1 on the general writer measured +0.20 and
  +0.22 ms in two runs. On the per-subject writer the one-field hot loop shows -0.08 to +0.04 ms within each arm, so
  nothing distinguishable at k = 1.
- **Translation to the server.** On the Mac a hot 20-fact general save costs 1.46 ms, 0.073 ms per fact; the server's
  warm fit is 0.201 ms per fact. If an entry costs the same share of a fact on both machines, a declared value costs
  0.2 to 0.33 ms of serial apply on the server. Only the server pair below can settle it.
- **Where the time goes (not proven).** Each entry is an ordinary indexed datom: the transactor checks a cardinality-many
  assertion for redundancy (an EAVT lookup of the same entity, already loaded) and writes it into three indexes (EAVT,
  AEVT, AVET). The general writer also decodes the retired row's stored text to compute its entry; the null-attribute
  side of the same arms pays that decode too and shows no difference against n0, so the decode is not the cost.

## Bytes

| Measure | Short keys (about 75 characters) | Production-length keys (about 120 characters) |
| --- | --- | --- |
| Table growth per entry after an indexing job and gc (EAVT + AEVT + AVET + log) | 214 B (n1, 4,000 entries) | **274 B** (n20, 40,000 entries) |
| Same, before the final indexing job (log plus earlier index jobs) | 146 B | 218 B |
| Segments per 100,000 entries | 950 | 442 |
| Log bytes per declared value replaced (add + retract) | about 120 B per datom | 293 B (k = 20) to 410 B (k = 1) per value |
| Twin entity instead of the row's entity | 354 B per entry (+140 B: the twin's identity datoms) | not run |

Arms with 2,000 to 10,000 entries in the long-key run gave 476 to 1,169 B per entry: the fixed noise of an indexing
job (a few hundred kilobytes) dominates there. b = 274 B is from the 40,000-entry arm.

**Size at 1 billion records, with its assumptions.** Index datoms = L + 2H (L current entries, H declared values
replaced since the index was built; each leaves its assertion and its retraction in history), bytes = datoms x b.
Assumptions: b = 274 B per datom-entry as measured on 120-character keys (history datoms cost about the same per
datom, not measured separately); the design's deep-6 declaration gives about 17.9 current entries per subject and 10
deep accounts of 100,000 subjects, so L = 17.9 million; H = 0 right after a backfill. Then **about 4.9 GB** (17.9 M x
274 B), 1.7% of the about 293 GB database. Each later save that replaces k declared values adds 2k datoms, about
2k x 274 B to the indexes and about k x 300 to 400 B of log. At production-S rates (about 23 saves/s, k about 1),
about 13 KB/s, 1.1 GB per day of saves at that rate.

## Uncached subject reads with the index on (priority 1)

| Arm | Entries per subject | Whole EAVT range walk, cold (ms; segment loads per subject; datoms) | Read route pinned at the head, cold (ms; loads) | Warm (range walk / read route) |
| --- | --- | --- | --- | --- |
| n0, production-length keys | 0 | 3.91; 0.67; 162 | 8.36; 0.04 | 0.03 / 4.37 ms |
| n1 | 1 | 3.29; 0.67; 163 | 6.78; 0.06 | 0.02 / 3.78 |
| n3 | 1 (f12 only on the read set) | 3.51; 0.66; 165 | 7.31; 0.07 | 0.02 / 5.36 |
| n5 | 5 | 3.24; 0.66; 167 | 7.52; 0.09 | 0.02 / 5.73 |
| n20 | 20 | 3.70; 0.71; 182 | 7.13; 0.08 | 0.03 / 4.46 |
| n0 / n1 / t1, short keys (r1) | 0 / 1 / 1 | 3.96; 1.03 / 3.89; 1.02 / 5.40; 1.03 | 9.17; 0.80 / 8.66; 0.73 / 8.03; 0.49 | |

200 subjects per pass, first pass in a new gateway JVM after a transactor restart. The range walk is what
`reach/parse-entity` iterates; the reach route itself returned a gateway error on these toy rows (a null number), not
investigated, so the walk was measured directly. **No measurable cost at 20 entries per subject**: +0.04 segment loads
(+6%) at noise level and no time difference; the entries sort after the rows (their attribute ids are higher), so a
subject read that stops at the rows never decodes them.


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

## Exactness gate (20,000 subjects; `gate-20k`)

**What the index means on the valid-time axis, as tested:** an entry exists at record position P exactly when its
row is believed at P (asserted at or before P and not retracted at or before P), whatever its valid interval; a query
"valid at V" keeps entries whose `[valid-from, valid-to)` contains V. This is the existing reads' `visible?` rule, so
the oracle is the existing read route at the same basis and the same `validAt`.

- **Data.** Account `a`: 20,000 subjects (status of 5 values with 55/20/13/8/4%, a start date spread over 2026, a name,
  a score, a flag on about 1 in 97, a protected `:ssn` on 1 in 10) plus 1,000 placements of type `Placement`; account
  `b`: 2,000 subjects. Listed: `:status :start-date :flag :name :score @type`. `:ssn` is protected (unsealed policy);
  declaring protection on `:status` was refused (`ProtectedAttributeIndexed`).
- **Workload (3,105 commits: 1,800 per-subject writer, 1,305 general writer):** 1,500 status replacements; 600 form
  saves (status, date, score, flag); 400 corrections with a past valid time (the old value kept until T0, the new value
  from T0, T0 30 to 230 days into the year); 300 flag retirements with nothing in their place; 200 saves in account
  `b`; an import of 1,000 new subjects in 5 commits; 40 removals on request of `:ssn`; 100 status saves after the
  removals. Then the transactor restarts and a new gateway JVM checks.
- **Checks, all passed:**

| Check | Result |
| --- | --- |
| Index datoms of every entity equal the key function of its current rows (head, account a) | 85,960 expected, 85,960 present, 0 missing, 0 extra |
| The same at the position after the first 1,500 saves (as-of view) | 81,206 / 81,206, 0 / 0 |
| The same in account b | 8,120 / 8,120, 0 / 0 |
| Query answers equal the brute-force scan: eq for each status, count for each status, range of 30 days, rare flag, eq and eq (merge join), eq and range (probe), type Subject and Placement; at the head and at the earlier position; valid now and valid 20 days into the year; accounts a and b | **92 of 92 equal** |
| Index datoms, current and history, on the entity their tuple names | 126,842 checked, 0 wrong |
| Protected attribute or protected value ever in the index (history included) | 0 and 0; a query on `:ssn` is refused (400 `AttributeNotIndexed`) |
| Rows of account a in an account b answer | 0 of 1,250 |

The 400-subject smoke run of this gate failed first and found a real bug: the general writer's appended index
operations arrive in the transactor as `java.util.List`, and the optimized writer's tempid normalization
(`predecessor/normalization`) rewrites only Clojure vectors, so each index datom of an existing subject went to a new
orphan entity (queries returned stale entries; the structural check missed 48). Fixed by converting them to vectors
inside the function (`commit/with-attribute-index`). Any design that passes peer-computed operations through a
transaction function's payload meets the same trap.

## Query cost at 20,000 subjects (`gate-20k`, query-cost phase)

First query of each shape in a new JVM after a transactor restart (cold), then again (warm). Limit 10,000,
`maxExamined` 10,000,000. Peer reads are PostgreSQL segment reads by the gateway's role.

| Shape | Answer | Examined | Head cold ms / reads | Head warm ms | Earlier position cold / warm ms |
| --- | --- | --- | --- | --- | --- |
| eq status = active (55%), first 10,000 | 10,000 (limit) | 10,071 | 392 / 16 (first query in the JVM) | 71 | 80 / 47 |
| eq status = terminated (4%) | 1,780 | 1,860 | 25 / 2 | 5.1 | 11 / 6.9 |
| eq flag = true (1%) | 360 | 360 | 2.7 / 1 | 1.7 | 4.3 / 1.9 |
| range start date, 30 days | 1,722 | 1,722 | 10 / 1 | 5.7 | 6.8 / 5.3 |
| count status = active | 11,455 | 11,535 | 17 / 0 | 5.6 | 9.6 / 6.4 |
| active and flag (merge join) | 142 | 11,880 | 8.8 / 0 | 7.4 | 5.9 / 10.8 |
| active and start date < 60 days (probe each candidate's EAVT) | 1,776 | 22,360 | 404 / 91 | 55 | 61 / 40 |
| type Subject, first 10,000 | 10,000 (limit) | 10,000 | 16 / 2 | 5.2 | 7.2 / 14 |

- **AVET scan rate:** warm about 2,000 entries per ms (count: 11,535 in 5.6 ms); cold about 1.6 segment loads per
  1,000 entries (short keys, about 630 entries per segment). The probe (eq then the other clause on each candidate's
  own index datoms) costs one EAVT segment per candidate when cold (91 loads for 11,455 candidates here, the rest cached).
- **What an as-of read walks:** Datomic merges the current AVET with the history AVET over the same bounds. In this
  database, after 3,105 commits, the bounds of `status = active` hold 11,535 current datoms and 13,385 history
  datoms; `flag = true` 360 and 672; 30 days of start dates 1,722 and 1,828. The far-behind measure is below.

## As-of far behind the head (`asof-edge`, as-of phase)

20,000 subjects with `:status` and `:name`; the pin is taken; then **30,000 one-field saves** (per-subject writer)
change `:status` (every subject at least once; by construction all end on the same value, so `status = active` has 4,000
entries at the pin and none at the head). `:name` never changes. New JVM after a transactor restart.

| Range | Current datoms in range | History datoms in range | Head cold / warm | At the pin, 30,000 commits back, cold / warm |
| --- | --- | --- | --- | --- |
| `status = active` (churned) | 0 | 8,000 | 80 ms, 9 loads (answer 0) / 2.6 ms | **72 ms, 5 loads / 14.4 ms** (answer 4,000) |
| `name` from name-05000 to name-10000 (never changed) | 5,000 | 5,000 | 53 ms, 4 loads / 9.9 ms | 9.5 ms, 0 loads / 8.8 ms (answer 5,000) |

An as-of answer costs what Datomic walks: current plus history datoms inside the bounds. For a range nobody changed,
as-of costs the same as the head. For a churned one, about 3.6 us per answer entry warm (two history datoms each)
against about 2 us at the head: about 1.8 times, and it grows with the changes inside the bounds since the position
read, not with the database's size or the distance in commits as such.

## What goes wrong (`asof-edge`, edge phase, and the gate)

| Case | What happened |
| --- | --- |
| **A value nearly every subject shares** (90,000 of 100,000 `:common = yes`) | Count is exact and bounded: 90,000 examined, 245 ms cold (27 segment loads), 265 ms warm, about 340 entries per ms; the time is the distinct-entity set, not storage. With `maxExamined` 10,000 it stops at 10,000 with a cursor. An equality page of 100 is unaffected (first entries). |
| **High-cardinality attribute** (a unique 37-character value per subject) | Equality: 1 entry examined, 3.2 ms. A range over it is just a bounded scan (stopped at its limit with a cursor). Bytes per entry grow with the value. |
| **A save that changes 100 indexed facts** (one subject with 100 indexed and 100 unindexed attributes; one general save each) | +200 datoms (419 against 219). Apply 71.7 ms against 7.7 ms here and 27.2 ms against 10.5 ms in the 2,000-subject smoke, with **4 to 5 storage reads inside apply against 0**. Two single samples; the extra reads are not explained (the subject's index datoms were written by the seed and should be cached). k = 20 forms showed no extra reads, so the threshold between 20 and 100 is not known. A save that rewrites many declared values of one subject (an import correction, a bulk edit) is the risk. |
| **A value the tuple cannot hold** (a 300-character string) | One `:triplex.xq/long` marker instead; a range over that attribute is refused (400 `IndexIncomplete`), an equality on a short value still answers (it cannot match the long value). Nothing is answered without it. |
| **An import of new subjects** | Entries are written with the rows: +1 datom per declared value and one type marker per new entity seen by the peer; reads inside apply unchanged (1.2 to 3.4 per 2,400-row commit in every arm). Grouped commits are refused with the option on (every save goes alone), which an import path that relies on grouping would feel. |
| **A restart** (transactor restarted, new gateway JVM) | The index is in Datomic: the gate's checks ran after a restart and passed. The log a restart replays carries the entry datoms (about 300 to 400 B per declared value replaced since the last indexing job). |
| **Grouped commits** (design item 7) | Probed: one transaction that adds and retracts the same datom is refused with `:db.error/datoms-conflict` (both for an existing datom and a new one). With the option on, this spike keeps every save out of groups (`group/eligible?`), so it never meets the case; a group that carries the index must drop such pairs before sending. |
| **Writer frame bound** (design item 8) | Entries here are not rows and not request bytes, so `group/bound-frame!` (96 rows, 64 KiB) and the bulk row/byte limits are unchanged, and they do not see the entry datoms either; nor does the write budget's estimate (`write-policy/work`, from `(count (:ops p))`). A 96-row import frame can carry up to 96 more datoms. |
| **Option set on a scope with older data** | Retracting an absent tuple is a no-op (probed), so saves do not fail; the index is incomplete until a backfill (not built), and nothing in this spike refuses queries before one (the design's epoch rule). |

## Where this spike differs from the design (`DESIGN.md` section 7)

| Design | This spike | Consequence |
| --- | --- | --- |
| One `:triplex.ix/entry` string per entry, an escaped, order-preserving encoding | One tuple attribute per value family; Datomic orders the values | No escaping or number encoding; strings over 256 characters cannot be held (marker and refusal instead of the design's 200-character prefix plus row check) |
| Key splits open and closed intervals (`O` / `C`), so "valid now" skips closed entries | `valid-from` and `valid-to` are tuple elements after the entity; every entry of the value is examined and filtered | "Valid now" examines old closed entries of the same value too (in the gate, 80 extra of 1,860 for one status); the design's split avoids that |
| Retractions computed on the write gateway from the entity's current entries; stored functions unchanged | The general writer computes the retired row's entry from the stored text **inside** the serial function (its text changes when the option is on); the per-subject writer from the certified predecessor | Same exactness; the design keeps the function text and pays a peer read on a cold entity (outside the writer) |
| Entry operations in `:ops`, admitted by `small-op?` | A separate payload key `:xq-adds`; eligibility unchanged | Same; watch the `java.util.List` normalization trap above |
| Group commits cancel add/retract pairs | Grouping refused with the option on | Item 7 confirmed by probe; not exercised |
| Fence `[:db/cas decl :triplex.ix/seq s s]` | No declaration in the database; the list is the gateway option | The design's fence is needed for a declaration that changes while saves are in flight |
| Account token `_system` for `_triplex/` entities | Only `acct/<a>/` entities are indexed | |
| Type entries only for declared types | Type markers for every entity type when `@type` is listed, asserted when the peer sees the entity as new | Same "never retracted" rule |

## Server pair (to run the day a machine is rented; nothing was run on a server)

**Question.** Does one declared value per save cost the single writer what the Mac suggests (0.2 to 0.33 ms of apply
per value, no extra reads inside apply), and what does that do to the production-S commit p50 and p99 at 394 rows/s?

**Command** (three runs back to back on one machine, fresh template, the same environment as REAL2's `production-s`:
the fresh template stopped as `$SCALE1_PGDATA`, the second NVMe as `$SCALE1_WAL_MOUNT`, the Java 21 and 25 images,
a clean checkout of `exp/DX-XQ2-index-cost` at the commit that adds this page; the launcher refuses any other `HEAD`):

```bash
git checkout <this page's commit>; export DX_BARE_METAL=1
run() { node lab/bin/heavy.mjs --label "DX-XQ2-$1" -- bash lab/experiments/EXP-DX1/prep1/server.sh production-s \
  "$XQ2_OUT/$1" "$(git rev-parse HEAD)" "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"; }
run off
DX_ATTRIBUTE_INDEX=":task/field-0,:task/field-1,:task/field-2" run k3
DX_ATTRIBUTE_INDEX="$(seq -s, -f ':task/field-%g' 0 19)" run k20
```

`DX_ATTRIBUTE_INDEX` reaches every gateway role through `stack/up.sh` (`-e TX2_ATTRIBUTE_INDEX=...`). The production-S
tape writes `:task/field-r` for row r of a save (fields 0 to 12 or 13 seeded), so `k3` puts about 3 declared values in
most saves and `k20` about 17 (every row of a typical save). The template has no index entries: retractions of seeded
values are no-ops (probed), assertions are real, which is the per-save cost a backfilled index would also pay.
**Duration:** about 20 minutes each (arm limit 1,500 s, command cap 1,600 s), about 60 to 65 minutes in all.

**Predictions (written before any run), against the `off` arm of the same machine:**

| Measure (S at 394, 23.1 commits/s) | k3 | k20 |
| --- | --- | --- |
| Datoms per commit | +5 to +6 | +30 to +34 |
| Warm serial apply per commit (`applyMsBySize`) | +0.6 to +1.0 ms | +3.4 to +5.6 ms |
| Reads per commit from 150 s | +0 to +0.1 | +0 to +0.2 |
| Commit p50 | +0.5 to +1.2 ms | +3 to +6 ms |
| Commit p99 | +1 to +4 ms | +5 to +15 ms |
| Stored rate, expiries | 23.1/s, none | 23.1/s, none |

**What would show the predictions wrong:** k3 apply more than 1.5 ms over `off` (then a declared value costs more than
0.5 ms on the server and the design's switch rule fires for k = 3), or less than 0.3 ms (the Mac overstates it);
reads per commit from 150 s more than 0.3 over `off` (entries are not co-located with what the writer reads);
k3 commit p99 more than 5 ms over `off` (the design's third threshold).

## Evidence and how to rerun

Evidence (private): `evidence/DX-XQ2/` in the lab evidence store, one archive per run: `reads-r1` (paired reads,
4,000 x 160, arms n0 n1 t1), `forms-f1` (production-length keys, arms n0 n1 n3 n5 n20), `cost-b` and `cost-c1`
(earlier unpaired and paired arms, superseded but kept), `gate-20k`, `asof-edge`, smokes, and the three probe logs.
Every run records the source commit and a dirty listing. Rerun on the Mac with one ordinary heavy token:
`XQ2_PHASES=gate node lab/bin/heavy.mjs --label DX-XQ2-gate -- bash lab/experiments/EXP-DX1/xq2/gate.sh NEW_DIR`
(other phases: `cost` with `XQ2_ARMS`, `asof`, `edge`); `python3 lab/experiments/EXP-DX1/xq2/summarize.py NEW_DIR/out`.
