# Removal on request without stopping other accounts (DX-ERA2, 2026-11-24)

Builder DX-ERA2, branch `exp/DX-ERA2-removal-per-account` from `exp/DX-SCALE2-wide-thin` (`3e3e652b9`, which contains
the one branch `23b7df344`). Mac work is correctness and counts at toy size; every Mac time below is diagnostic.
Nothing ran on a server. One option, default off: `TX2_REMOVAL_PER_ACCOUNT=1`. All accounts stay in one Datomic
database. Datomic is not modified; the installed writer functions' code is unchanged (their stored texts differ only in
reader-generated names, section 9).

**History, in plain words (third pass, 2026-11-24).**

1. **The first version broke (F1).** A derived write whose ticket names no account was checked only against the last
   published removal, so while a removal was committed but not yet published, a copy of the removed value could land
   after it and stay readable after the acknowledgement (DX-ERA3's first review, details below).
2. **The fix introduced three new faults (N1, N4, N5), found by DX-ERA3's second review** (`era3/REVIEW-2.md`, of
   `27733d980`). N1: a removal stopped between its new declaration and its intent left a block in Datomic that refused
   every derived write naming no account, in every account, with no gateway able to see why, until another removal ran.
   N5 (a break, after an operator restores the removal log from a backup older than the data): the next removal's
   declaration released an account that had lost a value, and a derived write that had read it landed after the removal.
   N4: deliveries between databases into a database guarded per account were refused.
3. **The third pass (section 15) fixes them** by ordering the steps intent first, declaration second, so every stop
   leaves a removal that every gateway sees as pending and any gateway completes on contact; by refusing every removal,
   restore and request while the data is ahead of the removal log; and by checking a delivery only against its source.
4. **The invariant now:** a ticketed write commits only if, at Datomic's serial point, no removal that can reach an
   account it read (any account, for a ticket naming none) has declared or committed itself after the published cut
   its ticket was checked against; and no removal declares, releases or commits while the data is ahead of the log.

**Known unmet requirement (E9, not this branch's work).** A derived copy recorded BEFORE a removal (a settlement frame,
notice or Publish that copied the value while it was still current) stays readable after the removal, in its document
and in its own journal entry, unsealed and sealed, on today's database-wide rule and on this branch alike. TARGETS 7.3
asks that erasure reach every place a protected value or anything derived from it lives. That is owned by
`exp/DX-ERA4-derived-copies`; this branch only promises that no copy lands after a removal.

**An independent review found a break in the first version.** DX-ERA3 (`origin/exp/DX-ERA3-removal-review`,
`8fe9a06f1`, its page `era3/REVIEW.md`, merged here with its tests) showed on `6bc2484f0`: a settlement frame, notice,
archive record or Publish whose ticket names no account (every such caller on this branch) was compared only with the
last *published* removal, and nothing checked it at Datomic's commit point. While a removal was committed in Datomic
but not yet published (its gateway killed or restarted, its commit outlasting the gateway's 5 s wait, the removal log
briefly unwritable), a frame computed from the old value was accepted, landed after the removal, and its copy of the
removed value stayed readable after the removal was acknowledged. Today's database-wide rule refuses the same request.
It also found that any ticketed write was accepted while a removal's intent was pending (F1b), that a removal committed
by a gateway with the subject check could not be finished by one without it (F2), and that a gateway without the
per-account option left an intent behind that blocked every removal (F3). All are fixed from `a9da13f89`: every
removal now declares itself in Datomic before it selects or records anything, and every ticketed write is checked
against that declaration at Datomic's commit point (section 14). Proof item 5, section 6 and the settlement-frame row
of section 13.2 were wrong and are rewritten; section 14 lists exactly what changed.

## 0. Results

**Saves in other accounts that a removal refused: before, 35 to 796 per cell (3.7% to 87.9%); after, 0 in every cell.**
Toy stacks on the Mac: one Datomic database for all accounts, the production write switches (per-subject writer with
ordered IDs, the PostgreSQL removal authority shared by a write and a read gateway), one commit per subject's save, 30
saves per second in all, 30 s per cell, removals of fresh subjects' protected values in ONE account (three in one cell).
"Refused" counts a save, read or frame refused at least once because of the removal sequence; the driver then retries
after 10 ms, and every refused attempt is counted (503 attempts, SDK CasConflict replays).

| Cell | Other accounts' saves refused, before | After |
| --- | --- | --- |
| 10 accounts, 1 removal per s | 35 of 945 (3.7%) | **0** of 898 |
| 10 accounts, 10 removals per s | 796 of 906 (87.9%) | **0** of 902 |
| 200 accounts, 1 removal per s | 82 of 954 (8.6%) | **0** of 886 |
| 200 accounts, 10 removals per s | 274 of 873 (31.4%) | **0** of 930 |
| sealed values, 10 accounts, 10 per s | 415 of 914 (45.4%) | **0** of 937 |
| removals in 3 accounts at once, 10 per s | 424 of 922 (46.0%) | **0** of 930 |
| transactor restarted 8 s in, 1 per s | 58 of 874 (6.6%) | **0** of 938 |
| controls (no removals), 10 and 200 accounts | 0 of 949, 0 of 902 | 0 of 1,016, 0 of 998 |

**Table 1. Before** (`F2-base`: this branch's driver and stack scripts, the base gateway `3e3e652b9`, option absent):

| Cell | Other accounts: saves refused | SDK CasConflict replays | 503 attempts | ErasureFrontierChanged | Reads refused | Frames refused | Removal account, other subjects: saves refused | Subjects being removed: saves refused | Removal p50 / p99 ms (diagnostic) | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 accounts, no removals | 0 of 949 (0.0%) | 0 | 0 | 0 | 0 of 2,902 | 0 of 108 | 0 of 107 | 0 of 0 | - / - | 0 wrong, 0/0 marked, 0 leaks |
| 10 accounts, 1 per s | 35 of 945 (3.7%) | 0 | 102 | 1 | 77 of 2,891 | 19 of 128 | 9 of 124 | 5 of 62 | 75.7 / 293 | 0 wrong, 30/30 marked, 0 leaks |
| 10 accounts, 10 per s | 796 of 906 (87.9%) | 30 | 4,145 | 9 | 609 of 1,786 | 10 of 110 | 84 of 103 | 44 of 58 | 302.1 / 1676.8 | 0 wrong, 300/300 marked, 0 leaks |
| 200 accounts, no removals | 0 of 902 (0.0%) | 0 | 0 | 0 | 0 of 3,429 | 0 of 116 | 0 of 121 | 0 of 0 | - / - | 0 wrong, 0/0 marked, 0 leaks |
| 200 accounts, 1 per s | 82 of 954 (8.6%) | 0 | 479 | 1 | 69 of 2,983 | 21 of 104 | 9 of 123 | 3 of 54 | 66.1 / 1018.7 | 0 wrong, 30/30 marked, 0 leaks |
| 200 accounts, 10 per s | 274 of 873 (31.4%) | 15 | 1,043 | 4 | 498 of 2,766 | 97 of 120 | 26 of 98 | 23 of 61 | 31.1 / 660.4 | 0 wrong, 300/300 marked, 0 leaks |
| sealed, 10 accounts, 10 per s | 415 of 914 (45.4%) | 13 | 1,800 | 5 | 523 of 2,393 | 66 of 103 | 57 of 117 | 29 of 64 | 44 / 1027.8 | 0 wrong, 300/300 marked, 0 leaks |
| removals in 3 accounts, 10 per s | 424 of 922 (46.0%) | 14 | 1,686 | 7 | 534 of 2,633 | 80 of 133 | 56 of 108 | 22 of 53 | 45.3 / 840 | 0 wrong, 300/300 marked, 0 leaks |
| transactor restart, 10 accounts, 1 per s | 58 of 874 (6.6%) | 0 | 457 | 0 | 87 of 7,805 | 6 of 107 | 37 of 122 | 4 of 15 | 442.4 / 48441.5 | 0 wrong, 30/30 marked, 0 leaks |

**Table 2. After** (`F3-on`: this branch at `f06bdba77`, `TX2_REMOVAL_PER_ACCOUNT=1`, each cell's database moved
before seeding):

| Cell | Other accounts: saves refused | SDK CasConflict replays | 503 attempts | ErasureFrontierChanged | Reads refused | Frames refused | Removal account, other subjects: saves refused | Subjects being removed: saves refused | Removal p50 / p99 ms (diagnostic) | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 accounts, no removals | 0 of 1,016 (0.0%) | 0 | 0 | 0 | 0 of 3,265 | 0 of 129 | 0 of 117 | 0 of 0 | - / - | 0 wrong, 0/0 marked, 0 leaks |
| 10 accounts, 1 per s | 0 of 898 (0.0%) | 0 | 0 | 0 | 0 of 3,438 | 0 of 140 | 0 of 113 | 0 of 52 | 28.5 / 607.4 | 0 wrong, 30/30 marked, 0 leaks |
| 10 accounts, 10 per s | 0 of 902 (0.0%) | 0 | 0 | 0 | 0 of 3,256 | 0 of 117 | 0 of 118 | 1 of 53 | 52.5 / 798.3 | 0 wrong, 300/300 marked, 0 leaks |
| 200 accounts, no removals | 0 of 998 (0.0%) | 0 | 0 | 0 | 0 of 2,451 | 0 of 122 | 0 of 107 | 0 of 0 | - / - | 0 wrong, 0/0 marked, 0 leaks |
| 200 accounts, 1 per s | 0 of 886 (0.0%) | 0 | 0 | 0 | 0 of 2,775 | 0 of 103 | 0 of 127 | 0 of 38 | 148 / 2431.7 | 0 wrong, 30/30 marked, 0 leaks |
| 200 accounts, 10 per s | 0 of 930 (0.0%) | 0 | 0 | 0 | 0 of 3,693 | 0 of 126 | 0 of 120 | 0 of 49 | 75.2 / 9291.3 | 0 wrong, 300/300 marked, 0 leaks |
| sealed, 10 accounts, 10 per s | 0 of 937 (0.0%) | 0 | 0 | 0 | 0 of 3,202 | 0 of 129 | 0 of 119 | 1 of 57 | 56.9 / 3926.5 | 0 wrong, 300/300 marked, 0 leaks |
| removals in 3 accounts, 10 per s | 0 of 930 (0.0%) | 0 | 0 | 0 | 0 of 3,363 | 0 of 116 | 0 of 112 | 2 of 46 | 35.6 / 1217.7 | 0 wrong, 300/300 marked, 0 leaks |
| transactor restart, 10 accounts, 1 per s | 0 of 938 (0.0%) | 0 | 0 | 0 | 0 of 6,702 | 0 of 136 | 0 of 110 | 1 of 27 | 320.8 / 29268.3 | 0 wrong, 30/30 marked, 0 leaks |

**Which paths refused.** Before: every path in section 1's table. A plain save read the database-wide sequence, so a
removal anywhere refused it with 503 while pending (the 503 attempts), with 409 CasConflict at the per-subject writer's
serial point (replayed by the SDK) or 409 ErasureFrontierChanged at the general writer's (not replayed); reads refused
503 while a removal was pending; a frame's ticket was refused by any removal after it was read. After: no save, read or
frame of another account, and no other subject of the removing account, was refused once. The only refusals left are
saves of the subjects being removed (0 to 2 per cell), which must be refused.

**Growth law (before).** The share of other accounts' saves refused is about min(1, removals per second x removal
duration): 1 x 76 ms = 7.6% against 3.7% measured; 1 x 66 ms = 6.6% against 8.6%; 10 x 31 ms = 31% against 31.4%;
10 x 302 ms = 100% against 87.9%. It does not depend on which account removes or how many accounts there are, only on
the whole database's save rate R: refused saves per second = R x min(1, removal rate x removal duration). At 200 saves
per second, 0.2 removals per second and a 50 ms removal, that is 2 refused saves per second across all accounts (7,200
an hour). After: 0 at every account count and rate (a save is fenced only on the counters of the entities it writes, which
a removal elsewhere never moves).

**The cost moved to the removal.** Other saves no longer pause during a removal, so the removal's own database-wide
check (P9: "the head has not moved since my selection") retries more often: removal p99 at 200 accounts and 10 per
second was 660 ms before and 9,291 ms after (diagnostic; 35,195 ms in an earlier run of the same cell). Counted
with `TX2_REMOVAL_TRIES_LOG=1` (`F4`: the same three cells in both modes on this branch's final code):

| Cell | Database-wide (option off): tries per removal, mean / p99 / max | Per account (option on) | Other accounts' saves refused, off / on |
| --- | --- | --- | --- |
| 10 accounts, 10 per s | 1.87 / 3 / 3 | 1.66 / 6 / 8 | 663 of 896 (74.0%) / 0 of 936 |
| 200 accounts, 1 per s | 1.53 / 3 / 3 | 5.20 / 63 / 63 | 36 of 919 (3.9%) / 0 of 929 |
| 200 accounts, 10 per s | 1.92 / 3 / 3 | 2.36 / 17 / 23 | 743 of 964 (77.1%) / 0 of 921 |

Database-wide, a removal needs at most 3 tries because every other save pauses once its intent is written. Per account,
nothing pauses, so it retries until no commit of any account lands inside its selection-to-commit window: one removal
took 63 tries and 15 s in the gateway at 30 saves per second. The retry loop has no bound. This was the open cost of the
change (section 11, item 3; prediction 8). **Addressed by `TX2_REMOVAL_SUBJECT_CHECK=1` (section 13)**: the removal
checks its selection per subject and takes its position at its own commit; on the same toy cells mean 1.00 to 1.10
tries, at most 4 by construction, at most 3 measured (with 40 racing saves per second on the subjects being removed). The option-off column also repeats Table 1 on this branch's own code: with the
option off it refuses other accounts as the base does.

**One read refused, then fixed.** The first "after" run (`F2-on`, `1e7b0539b`) refused 1 read of 4,564 in the
200-account, 10 per second cell (503 ErasureFrontierUnavailable): a request's cut was behind the published log or lost
a race with a newer cut on the same gateway, and was refused after one sync. Since `f06bdba77` such a request is
retried up to four times on a synced database and served only from a cut that passes the rule (section 3). Table 2 is
that code: 0 reads refused in 9 cells.

## 1. What the one removal sequence does today (traced in code)

A protected database has one removal log outside Datomic (the removal authority: PostgreSQL in production, files in
tests): `head.json` (the published sequence, its seal, the protected attributes), one entry per removal
(`erase-<seq>.json`: command, selectors, the removed assertion identities and their entities) and `pending.json` (the
removal being applied). Datomic holds the same sequence on the database's scope entity, `:triplex.scope/erasure-seq`.
A removal (`erase.clj` `erase!`) takes the database's lock, selects the identities, writes `pending.json`, commits one
native transaction (`apply-native!`: its journal entry, `[:db/cas scope erasure-seq s-1 s]`, and a check that the
database's head has not moved since the selection), then publishes the entry and deletes `pending.json`.

Every request on a protected database goes through `main.clj` `route-handler`, which reads the published cut
(`privacy/cut`) and checks it against the native data (`privacy/verify-data!`). What each path does with it:

| Path | When | Takes the database lock | Carries the sequence to Datomic's serial point | What a removal in ANY account does to it |
| --- | --- | --- | --- | --- |
| Per-subject writer, narrow and wide (`subject_save.clj`), covering owner head (`owner_layout.clj`) | a plain save, `TX2_SUBJECT_SAVE=1`, unsealed or the PostgreSQL authority | no (the "independent" path) | yes: the plan's `expected-erasure` against the scope's `erasure-seq` inside the installed function | refused **503 ErasureFrontierUnavailable** while the removal is pending (prepare to publish) or the native sequence differs from the published one; refused **409 CasConflict** (TRIPLEX_CONFLICT) when the removal commits between the cut and the serial point. The SDK replays a CasConflict (`DatomicSerializationConflict`, replay-safe transactions) and returns a 503 to the caller |
| General writer (`commit.clj`, line 187) | a plain save the per-subject writer does not take (more than 1 to 3 replacements, first writes) | no (independent path) | yes: `[:db/cas scope erasure-seq s s]` in the data; the installed commit function refuses a commit whose fence is missing or old | the same 503s; **409 ErasureFrontierChanged** (TRIPLEX_ERASURE_FRONTIER) at the serial point, which the SDK does **not** replay |
| Group commit (`group.clj`) | `DX_GROUP_COMMIT=1` | no | yes, the same data, checked speculatively and under the basis guard | the same |
| Import frame, loader actor `bulk-import` | an import without a ticket | no | yes | the same; its families check (`ErasureReplayDeclined`) uses the cut |
| Import replay with a ticket (`erasureReplay`) | archived values sent again | **yes** | yes, plus the ticket | waits for the lock; **409 ErasureFrontierChanged** if any removal published after the ticket |
| Settlement frames, notices, Publish markers, staging (`actv-lazy/join/account.ts`, `archive.ts`, `recorded.ts`, `staging.ts` through `withErasure`) | a derived write with a ticket (`erasureSeq`) | **yes** | yes, plus the ticket | the client's `recheckErasure` throws `ErasureFrontierChanged` ("Discard the old protected input cut") when the database's sequence moved at all; the gateway waits for the lock, then refuses **409 ErasureFrontierChanged**. A Publish marker records the sequence, so a removal in any account after a Publish makes that Publish's settlement refuse its marker |
| Cross-database delivery (`erasureSourceDatabase`) | a recipient database fed from a source | yes, both databases | yes | the same (not a one-database path) |
| Every save when `TX2_SUBJECT_SAVE` is off; every save of a sealed database on the file key store | | **yes** | yes | waits for the lock for the whole removal |
| Reads: rows, Reach, journal pages, feed, ID lists, sweep, frontier | every read | no | no | refused **503** while any removal is pending or the native sequence differs; a Reach reply cached at a pin is re-sent whole after any removal (its reference is keyed by the sequence) |
| The removal itself | | yes | `cas erasure-seq` and "the head has not moved since my selection" | retried inside the gateway after **any** commit of any account between its selection and its commit |

The lock (`privacy/guard`: a PostgreSQL advisory lock keyed by the database; a file lock in tests) serialises removals
with each other and with every locked path above.

## 2. What the sequence protects, and the narrowest exact guard for each

| # | Protection | Narrowest exact guard | Built |
| --- | --- | --- | --- |
| P1 | A removed assertion identity is never written again (`validate-write!` `ErasedAssertionIdentity`) | none needed from the sequence: every identity ever written is reserved natively (the writers' history check); a removed identity exists in history, so no save can write it whatever its cut | unchanged |
| P2 | An import never replays a removed field (`families`: (entity, attribute) pairs) | a save is fenced on the removal sequence of **each entity it writes**: only a removal of a value on that entity can change this decision | yes |
| P3 | The journal of a save never holds a removed value in clear: sealed change values become the token or the marker (`envelope/protect`), every read masks a change by its assertion identity | the same per-entity fence (a change describes an assertion of an entity the save writes); masking needs nothing | yes |
| P4 | A save prepared before a removal and committed after it cannot use a cut that misses that removal (a late native write after a timed-out request included) | per written entity, at Datomic's serial point (the fence function `:triplex.removal/fence-v1`, beside the writer's own checks on the same db-before) | yes |
| P5 | A derived write (settlement frame, notice, Publish, staging, import replay) never re-materialises a value removed after its inputs were read | **per account read**: the ticket names the accounts it read (`erasureAccounts`); it is refused when a removal published after the ticket touched one of them or touched an entity outside every account. A ticket that names no account keeps today's database-wide rule | yes (gateway, SDK and the shared helper); the settlement code itself is ACT8's (section 7) |
| P6 | A request uses a cut the native data agrees with (no route serves a restored database before the removals are replayed) | per request: the native removal sequence equals the published one, or is one ahead by the removal being published; anything else is retried up to four times on a synced database, then refused | yes |
| P7 | A read after publication answers the marker (the boundary in TARGETS section 7.1) | unchanged: masking uses the published cut read for that request | unchanged |
| P8 | A cached decoded copy is not reused after a removal (Reach session references at a pin, the SDK's reach cache) | per entity would be exact (an entity's rows are masked only by removals of that entity); the SDK stamps one sequence per reply, so narrowing needs an SDK change | **not built**: kept database-wide (costs re-sent rows, never a refusal or a wrong answer) |
| P9 | A removal selects exactly the identities present at its own serial point | the removal's "head has not moved" check | unchanged (database-wide: a removal retries when any account commits in between; that is the removal's own latency, not a refusal of anyone else) |
| P10 | Removals form one ordered log (one pending intent, one seal chain, one restore replay) | truly database-wide | unchanged |

**Why per subject for saves and per account for derived writes.** What the gateway decides from the cut for a save
(P2, P3, P4) depends only on removals of values on the entities that save writes. A save does not carry its client's
reads: today the cut is read when the request arrives, so a plain save computed from a value read before a removal and
sent after its publication is not refused by any sequence, today or here (section 5, case 4). A derived write declares
its reads through its ticket, and the settlement and Publish code reads a whole account, so the account is its unit.

## 3. The rule as built (`TX2_REMOVAL_PER_ACCOUNT=1` and the database moved)

- **Native state** (new attributes, written only on a moved database): `:triplex.scope/removal-seq` (the global
  sequence, moved by every removal), one counter per entity that ever lost a value (`:triplex.removal/entity`,
  `:triplex.removal/seq`) and one per account (`:triplex.removal/account`; the account of `acct/<account>/...`, and ""
  for every other entity). Each counter holds the global sequence of the latest removal that touched it, derived from
  the one ordered log (`removal_scope.clj` `add-entry`). The database-wide `:triplex.scope/erasure-seq` is held at -1.
- **A removal** first declares itself (one native transaction, `removal-commit/declare!`): `:triplex.scope/removal-intent`
  takes its sequence s and the counter of every account its selectors can reach takes -s. It then selects, records its
  intent and commits, in one transaction: the database-wide fence on -1 (unchanged), `cas removal-seq s-1 s`, and the
  counters of every entity it names or that lost a value and of their accounts (set to s; a declared account that lost
  nothing goes back to its published value). It holds the database's lock (removals stay one ordered log) and the locks
  of the accounts its selectors can reach.
- **A save** carries the installed writers' database-wide fence on -1 (always true, so the installed functions are
  unchanged) and one fence: each entity it writes must have the counter value of the save's cut. A removal elsewhere
  never moves those counters.
- **A derived write with a ticket naming accounts** takes those accounts' locks (not the database's), is checked
  against them (no removal after the ticket in a named account or in ""), waits (503) while a pending removal can reach
  one of them, and carries those accounts' guards in its fence, which a removal's declaration makes fail. **A ticket
  naming no account** takes the database's lock, must equal the published sequence, waits (503) while any removal is
  pending, and carries `[:db/cas scope :triplex.scope/removal-intent t t]`, which any removal's declaration makes fail
  (rewritten after DX-ERA3's F1: before, nothing checked it at the commit point).
- **Requests while a removal is being applied** use the last published cut: the native removal sequence may equal it
  or be one ahead by the removal named in `pending.json`. A save is then fenced at the serial point; a read is a read
  that started before that removal's publication (TARGETS section 7.1 allows the old value). Anything else (a native
  sequence behind the published one: another gateway's removal not yet seen by this peer; a cut read that lost a race
  with a newer one on the same gateway) is retried up to four times on a freshly synced database, then refused as
  today. Retrying changes only whether a request waits: it is served only from a cut that passes the rule above.
- **The frontier route** adds `perAccount`, `unscopedSeq`, and with `?account=<a>` that account's `accountSeq`.
- **Paths without the subject writer** are no longer serialised behind the lock: the general writer has the same fence,
  so a plain save takes the independent path on a moved database whatever `TX2_SUBJECT_SAVE` says. A sealed database on
  the file key store keeps the database's lock (its key files are issued under it); production uses the PostgreSQL
  authority, whose saves are independent.

## 4. Proof that no removed value can survive or reappear

Let removal R (global sequence s) remove identities I on entities E (accounts A = accounts of E).

1. **Every identity of I is masked on every route after R's publication.** Masking (`privacy/masked`, `text`, Reach's
   protected rows, the feed's identity-only changes) uses the published cut read for that request; after publication
   that cut contains R. Nothing in masking changed. R's identities are those at R's serial cut (P9 unchanged).
2. **No save re-creates a member of I.** Its identity exists in history; the writers refuse any new assertion with an
   identity found in history, independently of any sequence (P1).
3. **No import replays a removed field.** A replay of (e, attribute) with e in E writes e, so it is fenced on e's
   counter: if R commits after the replay's cut, the fence refuses it; if R was published before, the families check
   refuses it (`ErasureReplayDeclined`); if R was pending, the replay's cut lacks R while R's native commit (if it came
   first) moved e's counter, so the fence refuses it. A replay of another entity cannot carry R's values through the
   gateway: the gateway reads no other entity to prepare it.
4. **A save's journal holds no removed value in clear.** Its change rows describe assertions and retirements of the
   entities it writes. If one of them is in E, the save is fenced on that entity (refused if R committed after its cut).
   Otherwise its change rows concern no member of I. Sealed values are written as tokens or markers; every route masks
   a change by its assertion identity.
5. **A derived write cannot re-materialise a value of R** (rewritten after DX-ERA3's F1; the first version was false
   for a ticket naming no account while R was committed but unpublished, and for any ticket while R's intent was
   pending). R's first native transaction, before it selects or records anything, sets `:triplex.scope/removal-intent`
   to s and the counter of every account R's selectors can reach to -s; its commit sets those counters to s (or back to
   their published value) and `removal-seq` to s. A ticketed write commits only in a transaction that also checks, at
   Datomic's serial point: for a ticket naming no account, `[:db/cas scope :triplex.scope/removal-intent t t]` with t
   the ticket, which the gateway requires to equal the published sequence; for a ticket naming accounts, the fence's
   guard on each named account and on "" (each counter must equal its published value, which the gateway requires to
   be at most the ticket). A ticketed write ordered after R's declaration therefore fails whenever R can reach what it
   read, whether R is in flight, committed and unpublished, or stopped at any step; one ordered before R's declaration
   landed before R began, like any frame made before the removal was requested. Nothing depends on publication timing.
   The gateway also answers such writes 503 while R is pending, so clients see today's codes. Exactness still rests on
   the ticket naming every account its inputs came from (section 5, case 1); a ticket naming none is treated as having
   read every account.
6. **Values cannot cross accounts on any write path the store performs.** Every value the gateway writes comes from the
   request's rows (on the entities written) or from those entities' stored rows (retirements, journal rewrites). A
   Publish copies the release document (definitions, never subject values) into the account. A reference carries an
   entity ID, and protected attributes take strings only (`ProtectedTypeUnsupported`), so an ID is never a protected
   value. The enrolment census copies subject IDs. The settlement reads one account's subjects (held source per
   account) and writes that account's documents.
7. **Restore.** A Datomic copy older than the published log has a lower native removal sequence: on every try it is
   still behind, so every route refuses until `restore-erasure` replays the missing removals (the replay commits them
   in whichever mode the restored copy is in; a copy restored from before the move is moved again afterwards).
8. **Mixed gateways.** On a moved database the database-wide sequence is -1, which never equals a published sequence
   (never negative): a gateway without the option refuses every request on it (503), its removal included, before it
   writes anything (DX-ERA3 F3: the first version wrote an intent first, which blocked every removal). Gateways with the
   option take one removal path whatever `TX2_REMOVAL_SUBJECT_CHECK` says (DX-ERA3 F2: the first version had two, and
   a removal committed by one could not be finished by the other). A save prepared under one mode and committed after a move fails its fence once (the
   installed functions see the database-wide value change) and is sent again under the new mode.
9. **Two removals at once** serialise on the database's lock and on `cas removal-seq`; each moves its own counters.
10. **A removal stopped at any step** leaves `pending.json`: before its native commit nothing moved (saves of its own
    subject commit, and the resumed removal re-selects over them: the "head moved" check); after it, its subject's
    counter moved, so saves of that subject are refused until it is published; resuming with the same command
    completes exactly once (its operation ID is found natively). Other subjects and accounts are not refused at any step.

## 5. Where a narrower sequence would let a value survive or reappear, and what is kept database-wide

1. **A derived write that names fewer accounts than it read.** A ticket is the writer's statement of what it read;
   naming account A while reading B would pass a removal in B. Kept: a ticket without `erasureAccounts` is checked
   database-wide. The settlement code must name exactly the account its frames read (it reads one).
2. **A value stored outside every account prefix** (settlement documents, journals, system names). Its removal moves
   the "" counter, which every derived write is checked against, and its own entity counter.
3. **Cached Reach replies** stay keyed by the database-wide sequence (P8 not built).
4. **A plain save computed from a value read before a removal and sent after its publication** is not refused by any
   sequence today either (the gateway reads the cut when the request arrives); unchanged.
5. **The removal's own "head has not moved" check** was database-wide (P9) in the first version; it is replaced by the
   per-subject check (section 13), which every per-account removal now uses.

## 6. The locks, and why they are not what keeps derived writes out (rewritten after DX-ERA3's F1)

Removals keep the database's lock among themselves (one log, one pending intent). A removal also takes the lock of each
account its selectors can reach (`removal-scope/lock-name`), after the database's lock, in sorted order. A derived write
that names its accounts takes only those accounts' locks, in sorted order, and never the database's, so no wait cycle is
possible. Plain saves take no lock. Left on the database's lock: tickets without accounts, cross-database delivery, and
sealed databases on the file key store.

The locks only order live requests. A removal whose run is cut short (its gateway killed or restarted, a wait expired,
the removal log briefly unwritable) releases them with its intent still pending, and a derived write can then take
them. The first version relied on the locks here ("a ticket naming no account is checked database-wide, as today"),
which was false (DX-ERA3 F1, F1b). What keeps a derived write out of a removal's window is the removal's declaration,
checked at Datomic's serial point (section 4, item 5).

## 7. Where this meets the per-account guards of Publish and enrolment (ACT8, not edited here)

ACT8 (`exp/DX-ACT8-publish-beside-saves`, files under `actv-lazy/join/`) is replacing the "whole database head
unchanged" guard of Publish and enrolment with the account's own state. The removal sequence enters the same commands in
these places, and each needs the account passed through (the helpers in `lab/bench/lib/datomic-erasure.ts` take it as an
optional last argument; without it they behave as before):

| Where | Today | With the account |
| --- | --- | --- |
| `account.ts` Publish (`readErasure(this.s.comp)`, near line 686) and its marker's `erasureSeq` | the database-wide sequence | `readErasure(comp, account)`; the marker keeps the global sequence (it is a point in the one log) |
| `account.ts` `recheckErasure(this.s.comp, sequence)` before the Publish commit (near line 833) and when settlement loads the marker (`marker()`, near line 576) | refused by any removal since the Publish, in any account | `recheckErasure(comp, sequence, account)`: refused only by a removal of that account (or of an entity outside every account) |
| `account.ts` `withErasure(sequence, ...)` around the Publish command | database-wide ticket | `withErasure(sequence, work, undefined, [account])` |
| `archive.ts` (`recheckErasure` near lines 261, 418, 448, 504, 596) and `recorded.ts` (`readErasure` near line 135, recheck near 346, the packets' `erasureSeq`) | database-wide | the same two changes, with the account of the frame |
| `staging.ts` stage records (`erasureSeq`) | database-wide | unchanged record; the recheck passes the account |

ACT8's account guard and this removal guard are independent checks in the same commit: the account guard says "nothing
of this account changed since the command read it"; the removal guard says "no removal touched what the command read".
A Publish that passes both lands beside other accounts' saves and other accounts' removals.

## 8. Moving an existing database, and back

`POST /v2/db/{db}/removal-per-account` (only with the option on) under the removal lock: refuses while a removal is
pending, checks the published log against the native sequence, installs four attributes and the fence function, writes
the counters derived from the log (parts of 1,000 entities; nothing reads them yet), then one transaction moves the
global sequence to its own attribute and sets the database-wide one to -1. `{"back": true}` moves it back (the counters
stay; they are ignored database-wide). Online: removals wait for the move (it holds their lock); a save prepared before
the move fails its fence once and is sent again; gateways must all run the option before the move (a gateway without it
refuses every request on a moved database).

**The sealed 1 billion database.** It was loaded without a removal policy (`demo/EXAMPLES.md` section 14 answers
"This database has no protected fields"), so today it has no removal log and nothing to move. Removal on request there
first needs a policy for a new protected field, added by ERASE2's trusted staging at the head (a populated scope refuses
a public declaration). The move then costs, in this order:

| Step | Transactions | Size on the 1 billion database | Blocks |
| --- | --- | --- | --- |
| Install four attributes and the fence function | 1, first use only | schema only | nothing |
| Counters for entities and accounts that already lost a value | one per 1,000 entities | 0 after a fresh staging (no removal yet); one entity per removed subject later | nothing (no route reads them before the switch) |
| Switch: global sequence to its own attribute, database-wide one to -1 | 1 | one scope entity | removals wait for it (it holds their lock) |

No index build, no copy, no rewrite of stored rows. Predicted under 5 s at the head of the 1 billion copy (the server
run times it). Measured on the Mac: 24 to 197 ms on a fresh toy database, with no load during the move. **Online:**
saves and reads never take the removal lock and keep running. A save in flight at the switch fails its fence once: on
the per-subject writer as 409 CasConflict, which the SDK replays; on the general writer as 409 ErasureFrontierChanged,
which the SDK does not replay (the caller sees one refusal). Predicted 0 to 2 such refusals at 200 commits per second,
once, at the switch. In-process this is gate case "Move per account" (the prepared save is refused once, the next save
commits); a move under live saves on a stack was not measured. **Order for a fleet:** every gateway runs
`TX2_REMOVAL_PER_ACCOUNT=1` first (a gateway without it refuses every request on a moved database: the sentinel -1
never equals a published sequence), then one call to the move route. **Back:** `{"back": true}`, the same way.
[Third pass, DX-ERA3 N3 and the fleet's versions:] **every gateway runs this version before any removal runs on a
moved database, and no gateway of an earlier build takes derived writes on a moved database while a removal can run.**
An earlier build's derived writes carry no check of the declaration, so during a mixed fleet a copy can land between a
removal's declaration and its commit (a copy made before the removal, E9's kind) and, on builds before `a9da13f89`,
after its commit (F1). This version tolerates an earlier build's removals (its tickets are checked on the committed
sequence, so N3's refusals are gone, and it completes an earlier build's pending removal on contact); section 15.6 has
the mixed-fleet stack run in both orders.

**The subject-check path (section 13) and the declaration (section 14).** From `a9da13f89` every removal on a moved
database takes the subject-check path; `TX2_REMOVAL_SUBJECT_CHECK` is read and ignored, so gateways with and without it
behave the same (the first version had two paths, and a removal committed by one could not be finished by the other:
DX-ERA3 F2). No data migration: the first removal installs one function (`:triplex.removal/commit-v1`) and, with the
move, two attributes (`removal-intent`, `removal-held`); the move sets `removal-intent` to the published sequence and
zeroes any counter the log does not derive. [Corrected in the third pass: the earlier text said a database moved by an
earlier build is fail-closed "until a removal runs or the database is moved back and forward once"; a removal did not
run on it (DX-ERA3 N2: 400 not-an-entity).] From the third pass, a database moved by an earlier build needs nothing:
its tickets naming no account are checked on the committed sequence alone until its first removal installs the two
attributes and starts the declared sequence at the committed one (section 15). Named entities without a row take a
removal's counter (section 13.2). On the 1 billion database nothing changes beyond section 8: it has no removal yet.

## 9. Gates

All on the Mac, toy size; counts are results, times diagnostic. Evidence under `evidence/DX-ERA2/` (private).

**(a) Option off changes nothing.**

- **Paired native log** (`era2/paired.clj`, `gate.sh` phase `paired`): one fixed workload (4 accounts, saves on both
  writers, 3 removals, a ticketed derived write and a refused stale one, a refused import replay, history reads),
  unsealed (653 datoms) and sealed (698 datoms), run twice on the base gateway, once on this gateway with the option
  unset and once with it on but the database never moved. Every reply's status and code is identical in all four runs.
  The base is reproducible (both base runs identical after replacing clocks, random removal IDs, hashes and ciphertext);
  this gateway's log, option unset and option on, is identical to the base's in every datom written by saves, removals,
  frames and reads. **3 datoms differ in each log, all from installed functions**: the reader-generated argument names
  inside the commit function (`p1__2400#` against `p1__2516#`) and inside the per-subject writer function, and that
  function's versioned name, which is a hash of its text. They change whenever gateway code that loads before them
  changes (here the new namespace), as on every branch; their behaviour is the same. Run on the final code (`G7`, at
  `aa9aa5e0a`): base against base 0 lines differ, option unset against option on 0, base against this 3 per log, every
  reply identical in all four. Consequence: a database first opened by the base gateway
  gets its writer functions installed once more by this gateway (one transaction), with or without the option.
- **Gateway suites** (`selftest`, `group-test`, `ids-test`, `feed-test`, `pinned-test`, `recent-test`,
  `cache-key-test`, `commit-order-test`, `sweep-gates-test`, `trace-test`): 76 tests, 71,170 assertions, the same
  result on the base, on this gateway with the option unset and with it on: 0 failures, 1 error, the same error in all
  three (`feed-test` `http-route` reads a byte body as a string; it fails on the base too).
- **The existing removal regression** (ERASE1/ERASE2's 13 route checks, both writer modes, and the sealed witness):
  `engine.mjs erase1 --run ledger-authority-regression` on this branch's final code (`32c25d98c`, option unset as the
  regression runs it), each on its own stack with the PostgreSQL authority, a backup and a real restore: per-subject
  writer **13 of 13** route checks, general writer **13 of 13**, per-subject writer with the sealed witness **13 of
  13** (`reg-subject`, `reg-general`, `reg-sealed`, all exit 0). The 13 cases: an open handle, fresh history, a current
  and a retained replica, the journal, feed resume, import replay, the Publish barrier, notice sender and recipient,
  joined marker staging, the SSN rule, backup and restore.

**(b) The fault measurement with the option on**: section 0, table 2 (0 other-account saves refused or replayed; the
subjects being removed refused 0 to 2 per cell).

**(c) Adversarial cases, each deterministic** (`era2/gate.clj`, in-process: the gateway's own route handler, an
in-memory Datomic, a file removal authority; a save is paused after its cut was read and its data prepared, the step
runs, then the save commits). Every case checks that the removed value is never answered by current reads, history
reads, reads pinned before the removal, a Reach session that cached the subject at that pin, journal pages and the feed;
and that the native data holds no copy of it outside its own subject and journals (unsealed: masking keeps the native
bytes, as today) or **none at all** (sealed). Database-wide **360 checks, 0 failed**; per account **417 checks, 0
failed** (G5, and the same on the final code in G7).

| Case | Database-wide (today) | Per account |
| --- | --- | --- |
| A save of the same subject computed before the removal, committed after it | refused 409 CasConflict | refused 409 CasConflict |
| A save of another subject of the same account in that window | refused 409 CasConflict | **commits** (its subjects' sequences did not move) |
| A save of another account in that window | refused 409 CasConflict | **commits** |
| A settlement frame of the removed account, ticket read before the removal | refused 409 ErasureFrontierChanged; its derived copy never lands | the same |
| A Publish of the removed account in that window (ticketed, `lazy/account/releases/a`) | refused 409 ErasureFrontierChanged | the same |
| A ticket naming no account | refused | refused (database-wide, unchanged) |
| A settlement frame of another account, ticket read before the removal | refused 409 ErasureFrontierChanged | **commits** |
| An import replay of the removed field | refused 409 ErasureReplayDeclined | the same |
| An import replay of another account | commits | commits |
| A pinned reader that read the value and holds a cached Reach session, reading the same pin after the removal | the marker | the marker |
| Two removals racing in two accounts, with a third account saving | both commit, sequences 1 and 2; the third account's save may be refused | both commit; each account and subject takes its own sequence; the third account's sequences stay 0 and its save commits |
| A removal stopped before its native commit, then resumed with the same command | while stopped: every save and read of every account refused 503 | while stopped: another account's save and read, another subject of the account and the subject itself all commit; the resumed removal re-selects and removes the value saved meanwhile too |
| A removal stopped after its native commit (and at publication), then resumed | every request refused 503 | other accounts and other subjects commit; the subject's own save refused 409 CasConflict until publication; resumed: completes once, sequence 1 |
| Move per account, a save prepared before a move back, a fresh save after it, the move again | (per account only) | the prepared save refused once; the fresh save commits; moving twice changes nothing; the counters are restored from the log |

Every case runs unsealed and sealed except the paused-save cases, which are unsealed only (a sealed database on the file
key store takes the database's lock for every save, so a save cannot be paused beside a removal there; the PostgreSQL
authority's sealed saves are covered by the fault measurement's sealed cell).

**(c, on a stack) A removal during a transactor restart**: the `restart` cell of the fault measurement (table 1 and 2):
the transactor is restarted 8 s into a 1-per-second removal window; every removal is retried with the same command until
it answers.

**(d) The sealed removal check**: the regression with `--sealed-witness` (13 of 13, and its sealed route witness and
writer removal witness written), the sealed cases of the in-process gate (database-wide and per account, every case
except the paused saves) and the sealed fault cell on the PostgreSQL authority with the option on (300 of 300 removals,
0 wrong, 0 removed values found by the scans, 0 other-account saves refused of 937).

**(e) The production exactness gate and the combined check with removals in three accounts at once**: the `three` cell
of the fault measurement (removals round-robin in three accounts at 10 per second, 7 other accounts saving, reading and
writing frames): with the option on, 300 of 300 removals completed, 2,499 values checked exact, every removed value
marked on current reads, and 0 removed values found by the scans of reads pinned before the removals, pinned Reach,
the feed and the journal pages; other accounts' saves refused 0 of 930.
The same cell before: exact as well, with 424 of 922 other accounts' saves refused. The production exactness gate
(`prep1/manage.py production`) was not run on this branch (section 11, item 4).


## 10. Server run (for the day a machine is rented)

**What it runs** (`era2/server.sh`, Linux only, root, a clean clone at the branch head; written, not run anywhere). Per arm
(option off, then on): a byte copy of the stopped 1 billion cluster; the stack on that copy with the production write
switches and the PostgreSQL removal authority (`stack/up.sh --pg-data`, the ERASE2 path); a removal policy for a NEW
protected field added by ERASE2's trusted staging at the copy's head (the 1 billion database was loaded without a policy:
`demo/EXAMPLES.md` section 14 answers "This database has no protected fields"); then `era2/fault.ts` in adoption mode,
three cells of 600 s each on that copy: no removals (control), 0.2 removals per second (realistic: 720 an hour) and 10
per second (heavy), all removals in ONE deep account (fresh subjects under that account's prefix, each with a value of
the new field); 200 small accounts added to the same database saving 200 commits per second in all (one commit per
subject's save, 70% of 1 to 3 fields on the per-subject writer, 30% of 4 to 6 on the general writer, 1 in 20 replacing a
protected value), a quiet account at 3.5 saves per second, 8 per second in the deep account's other subjects, 2 per
second on subjects about to be removed, 32 readers (rows and pinned Reach) and 10 settlement-shaped frames per second.
With the option on, each cell first calls the move (the first call moves the database; it is timed).

**Durations and cost** (USD 1.09 per machine hour, one machine): build 25 to 50 min if not already built; per arm a copy
of 176 GB 3 to 12 min, bring-up and staging 3 to 6 min, three cells of 10 min plus seeding (about 1,100 subjects) and
checks 1 to 3 min each: 40 to 60 min per arm, **120 to 180 min for the three arms (off, per account, per account with
the subject check), USD 2.20 to 3.30** (plus USD 0.45 to 0.90 for a first build). Arms 0 and 2 alone: 80 to 120 min,
USD 1.45 to 2.20.

**Predictions, written before any server run.** Offered per cell: 200 saves per second in 200 other accounts (120,000
in 600 s), the quiet account at 3.5 per second, the deep account's other subjects at 8, 2 on subjects being removed, 10
frames per second naming their account. "Refused" counts a save that still failed after the driver's retries (10 ms
back-off), as on the Mac.

| # | Arm, cell | Prediction | Basis | Shown wrong if |
| --- | --- | --- | --- | --- |
| 1 | both arms, control (no removals) | 0 refused saves, reads and frames in every account; exact | Mac controls: 0 | any refusal |
| 2 | off, 0.2 per second | other accounts: 0.2% to 3% of saves refused (240 to 3,600 of 120,000), frames 1% to 10%, reads 0.1% to 3% | the growth law (section 0): refused share = min(1, removals per second x removal window); window 10 to 60 ms on the server (Mac 30 to 300 ms) | under 0.05% (the database-wide rule would then cost little at the realistic rate) or over 10% |
| 3 | off, 10 per second | 20% to 90% of other accounts' saves refused; the quiet account fails its bar (p99 over 1.25x and over 50 ms above control) | Mac: 31% and 88% | under 10% |
| 4 | on, every cell | other accounts: **0** saves refused, 0 CasConflict replays, 0 503 attempts, 0 ErasureFrontierChanged, 0 frames refused, 0 reads refused; the deep account's other subjects: 0 refused | the rule (sections 3 and 4); Mac: 0 in 9 cells | any one: it names a path still guarded database-wide |
| 5 | on, every cell | refused saves only on the subjects being removed (a save computed before that subject's removal committed and sent after it): under 10% of those saves | Mac: 0 to 3 of 42 to 65 | a refusal on any subject not being removed |
| 6 | both arms, every cell | exact: 0 wrong values, every removed value marked on every route, 0 copies outside its own subject and journals (none at all when sealed) | Mac: every cell exact | any miss: stop, the rule is wrong |
| 7 | on, 10 per second | the quiet account meets its bar against its control | no refusals, no lock; the removal's own commits are about 5% of commits | over the bar: the removal's commit load, not refusals, costs other accounts |
| 8 | arm 1 (per account, head check) against arm 0, removal latency | higher in arm 1: other saves no longer pause, so the database-wide head check fails more often. Mean tries = e^(C x w) (section 13.1), C = all commits per second (about 225), w = 5 to 15 ms: 3 to 30 tries. 0.2 per second: p50 under 300 ms, p99 under 2 s. 10 per second: removals queue on the database's lock when tries x try time exceeds 100 ms | the law, fitted on the Mac (section 13.1) | 10 per second with p99 under 1 s, or under 1.5 mean tries |
| 9 | on, the move | under 5 s at the head of the 1 billion copy; 0 to 2 refused saves at the switch | section 8 | over 60 s, or refusals after the switch |
| 10 | arm 2 (subject check), every cell | other accounts: 0 refused, as arm 1. Tries per removal: mean 1.00 to 1.05, **max 4** (the bound), guards 0 to 10 per cell (only saves of a subject being removed can fail a try: 2 per second spread over 3 subjects) | section 13.3; Mac: mean 1.01 to 1.03, max 2, no guard at 2 per second | any removal over 4 tries; any refusal in another account; a removal answering 503 |
| 11 | arm 2 against arm 1, time to remove | arm 2: one try plus the wait for earlier removals: p50 10 to 40 ms, p99 under 200 ms at 0.2 per second and under 1 s at 10 per second, flat across the cell; arm 1 at 10 per second follows the law (several tries, a growing queue when tries x try time exceeds 100 ms) | the bound and the law | arm 2 p99 over 1 s at 0.2 per second, or arm 2 not below arm 1 at 10 per second |
| 12 | arm 2, every cell | exact as in 6; positions 1..N with no gap or repeat; no removal's record time before the commit before it | gate (section 13.5) | any |


## 11. Not verified

1. **Nothing ran on a server.** Every time on this page is a Mac time with five other builders in the lab VM:
   diagnostic only. The counts are results at toy size (10 and 200 accounts, 30 saves per second, 30 s cells).
2. **The settlement and Publish code still sends tickets without accounts.** The gateway, the SDK
   (`withDatomicErasureSequence(..., accounts)`) and the shared helper (`withErasure`, `readErasure`, `recheckErasure`
   with an account) are built, and the fault measurement's frames name their account. ACT8's files
   (`actv-lazy/join/`) were not edited (section 7 lists the five places). Until they pass the account, real settlement
   frames and Publish keep today's database-wide ticket rule (a removal in any account refuses them), on a moved
   database too. Plain saves and reads do not depend on this.
3. **The removal's own latency rises** (prediction 8). P9 stays database-wide: a removal retries when any commit of any
   account lands between its selection and its serial point, and with the option on other accounts' saves no longer
   pause for it. The retry loop has no bound. **Built in the second pass behind `TX2_REMOVAL_SUBJECT_CHECK=1`
   (section 13)**: the removal takes its position at its serial point (the journal entry's form is unchanged) and is
   bounded at 4 tries by a guard on its own subjects.
4. **The production exactness gate** (`prep1/manage.py production`) was not run: it admits only its listed builders,
   and its database has no removal policy, where this code does nothing (`per-account?` needs a protected database
   that was moved). The option-off evidence is the paired native log, the gateway suites and the removal regression.
5. **A move under live saves on a stack** was not measured (in-process only: the prepared save refused once).
6. **Mixed gateways** (one with the option, one without, on a moved database) were not run: argued from the code (the
   sentinel -1 never equals a published sequence, so the gateway without the option refuses every request).
7. **Cached Reach replies (P8)** stay keyed by the database-wide sequence: after any removal a pinned Reach session
   re-sends whole rows instead of references (the Reach inline/ref columns). A cost, never a refusal or a wrong answer.
8. **A sealed database on the file key store** keeps the database's lock for every save (its key files are issued under
   it). Production uses the PostgreSQL authority, whose saves are independent; the sealed cell ran on it.
9. **The 1 billion move and the server rates** (removal tries at about 225 commits per second, the quiet-account bar)
   are predictions only (section 10).

## 12. Files and evidence

| File | What |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/removal_scope.clj` | The option, the account of an entity, the counters derived from the log, the fence function, the ticket check, the move's counters |
| `privacy.clj` | Counters in the cut (option on only); the prepared removal's sequence on an allow-pending cut; `ensure-ticket!`; `verify-data!` on a moved database; the sentinel fence value; account lock directories |
| `storage.clj` | The fence in a save's data on a moved database; the per-subject writer's expected value |
| `subject_save.clj` | The per-subject writer accepts the fence in its returned data (option on only) |
| `erase.clj` | The removal's transaction on a moved database; account locks; `request-cut` (retries up to four times); the move route `per-account!`; the tries log (`TX2_REMOVAL_TRIES_LOG=1`, default off) |
| `removal_commit.clj` | `TX2_REMOVAL_SUBJECT_CHECK=1`: the per-subject selection check and position at commit (`:triplex.removal/commit-v1`), the subject guard, the bounded loop; loaded on first use only |
| `removal_scope.clj` (second pass) | Named entities without a row take a removal's counter |
| `main.clj` | Routing on a moved database: the published cut while a removal is applied, account locks for named tickets, the move route, the frontier's per-account fields |
| `packages/datomic/src/erasure.ts`, `DatomicClient.ts` | `withDatomicErasureSequence(..., accounts)` sends `erasureAccounts` (absent: unchanged bytes) |
| `lab/bench/lib/datomic-erasure.ts` | `readErasure`, `recheckErasure`, `withErasure` take an optional account (absent: unchanged) |
| `lab/experiments/EXP-DX1/stack/up.sh` | `DX_ERASURE_SQL=1` (the PostgreSQL removal authority on a toy stack, a fresh wrapping key kept out of the evidence), `DX_REMOVAL_PER_ACCOUNT` and `DX_REMOVAL_TRIES_LOG` (all default unset) |
| `era2/fault.ts`, `era2/fault.sh` | The fault measurement (cells ACCOUNTS:RATE[:sealed|three|restart]; `DX_ERA2_GATEWAY_REF` runs the base gateway) and its adoption mode for the server |
| `era2/gate.clj`, `era2/paired.clj`, `era2/gate.sh` | The in-process interleavings, the paired native log, the gateway suites |
| `era2/server.sh` | The server run (written, not run) |

Evidence (private, compressed, under the lab's evidence folder `DX-ERA2/`): `F2-base` (Table 1), `F2-on` (the first
"after" run, one read refused), `F3-on` (Table 2), `F4-o0` and `F4-o1` (tries), `G7` (paired log, interleavings and
suites on the final code), `reg-subject`, `reg-general`, `reg-sealed` (the existing removal regression), and the earlier
`F0`, `F1-base`, `G1` to `G6` runs that shaped the driver and the gates.

## 13. The removal's own selection check, per subject (`TX2_REMOVAL_SUBJECT_CHECK=1`, 2026-11-24)

Second pass of DX-ERA2, from `272a1bd66`. Its own option, default off, effective only with `TX2_REMOVAL_PER_ACCOUNT=1`
on a moved database. A removal that cannot finish under load is a privacy fault (the value stays readable), so this
section treats its time to finish as part of exactness.

### 13.1 The law of the database-wide check (from the code and the F4 counts)

A try is: sync (the selection's basis `t_b`), select, write the intent (`pending.json`), commit. The installed
`:triplex.erase/check-position-v1` refuses the commit unless the head position at Datomic's serial point is the one
the selection saw, so a try fails when **any** position-bearing commit of **any** account lands between `t_b` and the
serial point (the window `w`). With commits of the whole database arriving at rate `C` (Poisson), a try succeeds with
probability `e^(-C x w)`; the number of tries is geometric: mean `e^(C x w)`, P(more than n tries) `= (1 - e^(-C x w))^n`.
The loop in `erase!` has no upper limit.

Fitted on the Mac from F4 with the option on (commit rate measured per cell from acknowledged saves and frames): 40.9,
36.4 and 35.5 commits per second gave mean tries 1.66, 5.20 and 2.36, so `C x w` = 0.51, 1.65, 0.86 and `w` = 12, 45
and 24 ms (diagnostic). The tails are heavier than geometric (p99 17 at mean 2.36, where a fixed window gives 9),
because `w` varies with load on the Mac.

Mean tries exceed 10, 100 and 1,000 above `C` = 2.30/w, 4.61/w and 6.91/w commits per second:

| Window w | Mean tries over 10 above | over 100 above | over 1,000 above |
| --- | --- | --- | --- |
| 5 ms (server, predicted) | 461 per s | 921 per s | 1,382 per s |
| 10 ms | 230 per s | 461 per s | 691 per s |
| 24 ms (Mac fit) | 96 per s | 192 per s | 288 per s |

Against the production-shaped card's load steps for shape S (50, 235, 394 and 620 rows per second, taken as commits
per second), mean tries `e^(C x w)`:

| Commits per second | w = 5 ms | w = 10 ms | w = 24 ms |
| --- | --- | --- | --- |
| 50 | 1.3 | 1.6 | 3.3 |
| 235 | 3.2 | 10.5 | 281 |
| 394 | 7.2 | 51 | 12,785 |
| 620 | 22 | 493 | 2.9 million |

At 394 commits per second with a 10 ms window the removal takes about 50 tries on average; at 620 per second it
practically never finishes. With the option off (database-wide rule) every other save pauses once the intent is
written, so only the selection-to-intent part of the window is exposed: at most 3 tries measured; the cost there is
the other accounts' refusals (section 0).

### 13.2 The narrow check, and what the head check protected

The selection of an entity selector reads only that subject's own datoms: its entity's rows (history) and retirement
markers, the version entities of a migrated owner (`:triplex.owner/version-owner`), and its sealed records
(`:triplex.private/entity`). So the removal's installed function `:triplex.removal/commit-v1` refuses a try when, since
`t_b`, any datom was added or retracted on the subject's entity, on a version link to it or a version entity of it, or
on a sealed record of it (or such a record was added); `d/history` of `d/since t_b`, at the serial point. If none
changed, the selection made at `t_b` is the selection at the serial point. An assertion selector names one identity,
which no later write can add to, so it needs no check. Every other commit of the database is irrelevant to the
selection and no longer fails the try.

The head check also gave the removal its log position. The removal now takes it at its serial point: the gateway
renders its journal rows and its entry at a provisional position and stamp, and the installed function sets the next
position (head + 1, as the save commit function does) and the stamp `max(selection stamp, newest commit's record time
+ 1 ms)`, rewriting `recorded_position` and `recorded_at` in each row, the `:_tx/instant` value, the stored entry's
`position` and `erasedAt`, and `:triplex.tx/position`, `:triplex.journal/position`, `:triplex.entity/rev`. Positions
stay dense and ordered and record time does not go back at the removal. The published entry is the stored one, read
back after the commit.

| What the head check protected | How the per-subject form catches it |
| --- | --- |
| A fact of the subject written between selection and commit (a new value, a replacement, a retirement) | it adds datoms to the subject's entity after `t_b`: the try is refused, the next selection includes it. After the commit, a save prepared before is refused by the subject's fence (its counter moved) |
| A new entity the removal names, created in that window (plain creation save, import frame) | the entity exists at the serial point with datoms after `t_b`: refused and re-selected. Created after the commit by a write prepared before: refused by the named entity's fence, because **a removal now moves the counter of every entity a selector names, with or without a row** (both natively and in the counters derived from the log) |
| Such an entity created after publication by a new request | a plain save is new data after the removal. An import frame is refused by DX-IMP2's families (its own option, `origin/exp/DX-IMP2-import-whole-subject`, which records the named (entity, attribute) pairs). On this branch alone the resent frame commits, exactly as with today's defaults (IMP2's finding). The named counters keep IMP2's fix closed under the per-account rule: without them, an import frame prepared before the removal passed both the families check (old cut) and the fence (counter unmoved) |
| A version entity or sealed record of the subject added or changed in the window | checked the same way (version links and versions; records and their datoms) |
| A reference to the subject from another entity | carries an entity ID; protected fields take strings only (`ProtectedTypeUnsupported`). The head check never selected it either |
| A settlement frame materializing a value in that window | **Corrected after DX-ERA3 (F1b).** The first version said it cannot commit in the window because of the locks; that was false once a removal's run is cut short (the locks are released, the intent stays pending). Now the removal's declaration comes before its selection, so a ticketed write that can read the removal's accounts and is ordered after the declaration fails at Datomic's serial point, and waits 503 at the gateway while the removal is pending. A frame writing the subject itself also carries the subject's fence |
| Another removal | serialised on the database's lock |
| The removal's own log position | taken at the serial point (above) |

**The journal entry's form does not change**: the same rows, the same fields, the same stored record. Only where the
position and stamp are decided moves. Old entries stay readable as they are. On resume, a prepared intent is matched to
a native commit without its position and stamp, so an intent written by the old path (exact position) is still
recognised.

### 13.3 The bound: a guard on the removed subjects only

After `narrow-tries` (2) refused tries, the removal takes a guard: one native transaction sets the removal counter of
every subject it names to `-(its pending sequence)`. No save's fence can expect a negative value, so every save of
those subjects fails at Datomic's serial point (409 CasConflict, which the SDK replays; it lands after publication).
Other subjects of the account and other accounts are untouched. The removal's commit sets the counters to its sequence
in the same transaction. Under the guard, a try can fail only by a write to the subject that carries no fence: an
owner-root fold (once per subject, ever). So:

- **at most 4 commit attempts** (2 narrow, then at most 2 under the guard: `guarded-tries` is 2 from `a9da13f89`; it was
  3 in the first version, so the code then allowed 5, which DX-ERA3 F4 pointed out), one guard commit;
- if the 4th attempt fails it answers 503 and leaves the removal pending, its subjects guarded, resumable with the same
  command (a resumed removal finds its guard by the negative counters);
- **worst-case time to remove**, under any save rate: the wait for earlier removals on the database's lock, plus the
  declaration, at most 4 commit attempts and 1 guard commit, each bounded by the gateway's own waits (sync 2 s, each
  native transaction `TX2_REMOVAL_WAIT_MS`, default 5 s): at most 5 s + 4 x 7 s + 5 s = 38 s before it answers (done,
  or 503 and resumable).

A guard taken and then stopped (gateway killed) keeps the subject's saves refused until the removal is resumed, as a
removal stopped after its native commit does today.

### 13.4 Proof that no removed value survives or reappears

Sections 4.1 to 4.10 hold unchanged except item 9's selection (P9), which becomes: R's identities are those of its
named subjects at R's serial point, because no datom any selector reads changed between R's selection and its serial
point (the installed check), and other datoms cannot enter the selection. After R's commit, every entity R names (with
or without a row) has a moved counter, so no write prepared before R can write it (fence); after R's publication every
route masks R's identities. Under the guard, no fenced write of R's subjects commits until R does.

### 13.5 Gates (Mac, toy; counts are results, times diagnostic)

Images: every container of every run below ran the runtime image pinned **by ID**,
`sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be` (`tx2-datomic:1.0.7745-da00`, built
2026-11-21), and PostgreSQL `sha256:526f86d93c6e...`; each run records the ID every container ran (`images-ran`) and
refuses to run when one differs from the pinned ID. The gateway code under test is this checkout's, mounted read-only.
The earlier fault runs (F1 to F4, sections 0 and 9) were checked from their own container records: every Datomic
container ran `21a67288007d` and PostgreSQL `526f86d93c6e`. The ERASE1 regression harness (section 9 (a)) chose its
own image, `sha256:fd497d71a313...` (another builder's `tx2-dxthin-managed` build, the newest recorded build present):
not this checkout's pinned image, so those three runs (13 of 13 each) are reported but not counted.

**Option off, byte for byte** (`G10`, at `5f1fb905a`, base `272a1bd66`): the paired native log, unsealed (653 datoms)
and sealed (698), is **identical** on the base twice, on this code with both options unset, and with both set on a
database never moved; every reply identical. (A first run, `G8`, differed in 2 datoms: an `and` in the early-loaded
`erase.clj` generated a name and renumbered the per-subject writer function's stored text; replaced by a nested `if`.)
Gateway suites: 76 tests, 71,170 assertions, the same single pre-existing `feed-test` error on base, off and on.

**Interleavings** (`G10`): database-wide 360 checks, per account 475, **subject check 8,529, 0 failed**. The subject
check arm reruns every case of section 9 (c) with the new path (held saves, derived writes, import replay, pinned
reader, two removals in two accounts, a removal stopped before its native commit, after it, at publication and **after
its guard**, the move), plus:

- **the race loop, 1,000 races**: a save of the subject prepared before its removal and released at a random moment
  during it (random delays after the removal's intent is written): 250 each of a new fact of the subject, the creation
  of an entity the removal names before it exists, an import frame creating that entity, and a retirement of the
  removed value. 749 racing saves committed, each before its removal's serial point, and every racing value was
  removed with its subject (the 185 committed retirements carried no new value; the value they retired was removed);
  251 were refused (409 CasConflict). Of the arm's 1,030 removals, 712 took two tries (one refused by the per-subject
  check), 314 one, 4 were resumed after their commit; none took more. Each race ends with no removed or racing value in current or history reads, a pinned read, a Reach session
  cached at the old pin, the journal pages or the feed; one final pass over every native datom finds none outside
  its subjects and journals. The stored journal rows equal the gateway's own encoding at the committed position and
  stamp in every race; positions are 1..N with no gap or repeat; no removal's record time is before the commit before it;
- **a removal naming an entity with no row**: a creation save and an import frame prepared before the removal and sent
  after it are refused (409 CasConflict; the entity's counter moved with no row); a creation sent after the removal
  commits (new data);
- **a subject mid-import** (40 import frames, each replacing the last, while the subject is removed): every frame that
  committed was removed by the removal (3, 1 and 2 in three runs: per account, subject check twice), the rest refused (CasConflict or
  ErasureReplayDeclined), and a second removal finds nothing left;
- **two removals of the same subject at once**, unsealed and sealed: both answer, sequences 1 and 2, the value removed
  by exactly one;
- **the hammer** (`G11`, 30 rounds): four writers save the subject without pause (one replacing its protected value)
  while it is removed: **every removal took exactly 3 tries** (2 refused by the narrow check, the guard, then commit),
  30 guards, every protected value committed before the removal's position removed, another account untouched; `G11`
  subject check 2,343 checks, 0 failed (with 200 races).

The in-process authority is held to the PostgreSQL authority's rule that only an entry equal to the stored intent can
be published (section 13.7).

**Fault cells on a stack**, tries counted by the gateway (`TX2_REMOVAL_TRIES_LOG=1`); "racing saves" are the saves of
the protected field of subjects about to be removed (2 per second, or 40 in the hot cells): those committed before
their subject's removal position must have been removed with it, and are then checked on the read gateway too (rows,
a Reach session cached at the racing save's own position, the feed and the journal pages). `fast` is the highest save
rate tried: 150 saves per second offered, 120 to 141 commits per second acknowledged.

Per account, head check (`F5-o1`, `TX2_REMOVAL_SUBJECT_CHECK` unset):

| Cell | Removals | Tries mean / p99 / max | Guards taken | Gateway ms p50 / p99 / max | Client time to remove p50 / p99 ms | Commits per s (acked) | Other accounts refused | Racing saves: removed with subject / after removal / NOT removed | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a10-r1 | 30 | 2.70 / 13 / 13 | 0 | 42 / 748 / 748 | 45.4 / 753.7 | 40.9 | 0 of 924 | 17 / 11 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a10-r10 | 300 | 1.65 / 7 / 8 | 0 | 21 / 369 / 463 | 24.9 / 348.9 | 40.7 | 0 of 915 | 24 / 5 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r1 | 30 | 4.23 / 40 / 40 | 0 | 86 / 10802 / 10802 | 83.4 / 10811.8 | 36.7 | 0 of 969 | 24 / 4 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a200-r10 | 300 | 1.88 / 8 / 12 | 0 | 28 / 1411 / 1549 | 31.5 / 1365.7 | 40.2 | 0 of 901 | 19 / 10 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-fast | 300 | 3.93 / 26 / 69 | 0 | 186 / 3869 / 4437 | 182.7 / 3835.5 | 141.0 | 0 of 4144 | 29 / 0 / 0 | 0 wrong, 300/300 marked, 0 leaks |

Per account with the subject check (`F5-o2`):

| Cell | Removals | Tries mean / p99 / max | Guards taken | Gateway ms p50 / p99 / max | Client time to remove p50 / p99 ms | Commits per s (acked) | Other accounts refused | Racing saves: removed with subject / after removal / NOT removed | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a10-r1 | 30 | 1.07 / 2 / 2 | 0 | 64 / 1023 / 1023 | 67 / 1033.1 | 41.3 | 0 of 919 | 20 / 12 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a10-r10 | 300 | 1.01 / 2 / 2 | 0 | 207 / 3067 / 3634 | 215.1 / 2991.1 | 34.5 | 0 of 942 | 23 / 3 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r1 | 30 | 1.10 / 2 / 2 | 0 | 72 / 4319 / 4319 | 66.9 / 4325.6 | 33.5 | 0 of 899 | 18 / 6 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a200-r10 | 300 | 1.03 / 2 / 2 | 0 | 61 / 1767 / 1802 | 65 / 1683 | 42.2 | 0 of 963 | 24 / 3 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-fast | 300 | 1.00 / 1 / 1 | 0 | 180 / 2461 / 2521 | 185.7 / 2173 | 119.8 | 0 of 3494 | 25 / 1 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-sealed | 300 | 1.00 / 1 / 2 | 0 | 14 / 82 / 176 | 16.3 / 84.8 | 41.6 | 0 of 938 | 23 / 5 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-three | 300 | 1.01 / 2 / 2 | 0 | 11 / 191 / 317 | 13.1 / 193.6 | 40.1 | 0 of 909 | 23 / 9 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r1-restart | 30 | 1.03 / 2 / 2 | 0 | 447 / 3599 / 3599 | 432.8 / 27628.3 | 22.3 | 0 of 901 | 9 / 5 / 0 | 0 wrong, 30/30 marked, 0 leaks |

Hot racing saves (40 per second on the subjects about to be removed), head check (`F6-o1`) then subject check (`F6-o2`):

| Cell | Removals | Tries mean / p99 / max | Guards taken | Gateway ms p50 / p99 / max | Client time to remove p50 / p99 ms | Commits per s (acked) | Other accounts refused | Racing saves: removed with subject / after removal / NOT removed | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a10-r10 | 300 | 2.71 / 14 / 16 | 0 | 95 / 1404 / 1737 | 97.9 / 1296.9 | 67.5 | 0 of 900 | 350 / 62 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r10 | 300 | 2.47 / 19 / 33 | 0 | 109 / 6076 / 6223 | 111.9 / 5994.9 | 54.9 | 0 of 932 | 276 / 21 / 0 | 0 wrong, 300/300 marked, 0 leaks |

| Cell | Removals | Tries mean / p99 / max | Guards taken | Gateway ms p50 / p99 / max | Client time to remove p50 / p99 ms | Commits per s (acked) | Other accounts refused | Racing saves: removed with subject / after removal / NOT removed | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a10-r10 | 300 | 1.00 / 1 / 2 | 0 | 275 / 3684 / 3996 | 282.7 / 2823.4 | 47.8 | 0 of 927 | 225 / 0 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r10 | 300 | 1.10 / 3 / 3 | 4 | 116 / 3758 / 3970 | 117.7 / 3075.8 | 44.2 | 0 of 921 | 205 / 36 / 0 | 0 wrong, 300/300 marked, 0 leaks |

**Reading.** With the head check, tries grow with the whole database's commit rate: mean 1.65 to 4.23, p99 up to 40,
max 69 at 141 commits per second (the law's fit: `w` about 10 ms there). With the subject check, tries depend only on
saves of the subject itself: mean 1.00 to 1.10, max 2 at 2 racing saves per second (no guard needed) and max 3 with 4
guards at 40 per second; never over the bound of 4. Other accounts' saves refused: 0 of every count in every cell,
both options. Every racing protected value committed before its subject's removal was removed (0 not removed in 17
cells, 1,334 removed with their subject). Exact in every cell. Times include the wait on the database's lock behind
earlier removals and the Mac's other load (five builders); the restart cell includes the transactor's restart.

### 13.6 Defects found while building this, both fixed

1. **The committed entry could not be published on the PostgreSQL authority.** The authority deletes the intent by its
   exact payload in the same transaction that publishes the entry, and the committed entry carries the position and
   stamp given at the commit, so the first stack cell (`F5-o2-stuck`) left a removal committed and unpublishable:
   every later removal refused (503) and the removed subject's saves refused. The in-process gate used the file
   authority, which publishes anything. Fixed (`5f1fb905a`): the intent is rewritten to the committed entry first; the
   in-process gate now holds the file authority to the same rule.
2. **The named-entity counters** (section 13.2): before this pass, a removal naming an entity with no row moved no
   counter, so with DX-IMP2's families fix an import frame prepared before the removal could still create the entity
   after it. Fixed for both per-account paths.

### 13.7 Not verified (this pass)

1. **No server run.** The law's server numbers (13.1) and predictions 8 to 12 rest on a window `w` of 5 to 15 ms, which
   is a prediction; the Mac fits are 10 to 45 ms.
2. **The guard's bound under a write that carries no fence**: the only such write found is the owner-root fold (once per
   subject); no toy or gate run had an owner root. The hard stop at 5 tries was never reached.
3. **DX-IMP2's families fix together with this branch**: the composition is argued (13.2) and the in-flight frame is
   gated here; the resend's refusal needs IMP2's option, which is on its own branch.
4. **The worst-case time of 40 s** is the sum of the gateway's own timeouts, not a measurement; measured client time
   to remove: p99 85 ms to 4.3 s (subject check, toy), plus the restart cell's 27.6 s.
5. **The ERASE1 regression** was not rerun on a pinned image (its harness picks the newest recorded build).
6. **A kill at every step** is in-process: the gateway's step throws after the intent, after the guard, after the
   native commit and at publication, and a later request resumes the removal. A gateway process killed on a stack
   was not run (the stack cells restart the transactor only).
7. **Code state of the evidence**: the gateway code is unchanged since `5f1fb905a`; `G10` ran at `5f1fb905a`, `G11`
   and the `F5`/`F6` cells at `e3f2b959f` (driver and gate changes only).

## 14. The independent review (DX-ERA3) and the fixes (2026-11-24)

Review: `origin/exp/DX-ERA3-removal-review` at `8fe9a06f1`, page `era3/REVIEW.md`, of this branch at `6bc2484f0`. Its tests
(`era3/attack.clj`, `run.sh`, `stack.sh`, `fix-proposal.py`, `summarize.py`) are merged into this branch and run in
`era2/gate.sh` (phase `era3`) from now on. Fixed at `a9da13f89`, `f2bf6b690` and `5114a74b0` (the last two: a refactor so
that the stored function texts stay byte for byte, and gate cases).

### 14.1 The invariant, and where it is enforced

**A ticketed write commits only if, at Datomic's serial point, no removal that can reach an account it read (any
account, for a ticket naming none) has declared itself after the published cut its ticket was checked against.**

- A removal's first native transaction, before it selects or records anything, is its declaration
  (`removal_commit.clj` `declare!`, line 140; the operation `[:db/cas head :triplex.scope/removal-intent intent s]` at
  line 152, and the counters of the accounts its selectors can reach set to -s). Its commit sets those counters to s,
  or back to their published value when the account lost nothing, and `removal-seq` to s; the declared sequence then
  equals the committed one again.
- The line that enforces it at the serial point, for a ticket naming no account: `removal_commit.clj` line 50,
  `[:db/cas scope :triplex.scope/removal-intent t t]`, added to every such write's transaction at `storage.clj` line 219;
  Datomic evaluates the compare-and-set inside the transaction. For a ticket naming accounts: the fence function's
  comparison `(when-not (= v expected) (throw ...))`, `removal_scope.clj` line 95, on each named account and on "" (the
  guards built by `fence-op`, `storage.clj` line 218). The gateway's part, in the same request and on the same cut: a
  ticket naming no account must equal the published sequence (`ensure-seq!`), one naming accounts must not be older
  than any of their published counters (`ticket-current?`).
- Not relied on for exactness, only for today's answer codes: the gateway answers 503 to a ticketed write while a
  pending removal can reach what it read (`privacy.clj` line 214, `removal-commit/pending-touches?`).

### 14.2 Each finding, its fix and the test that now passes

Reproduced first, on `6bc2484f0` (a pristine copy, the review's tests): `X1-repro-subject`, `X2-repro-on` (in-process)
and `X4-stack2-repro` (stack, option 2), with 15 and 12 violations in-process and the copy readable on the stack. Then the same tests on the final code (`5114a74b0`).

| # | Finding (the review's words, shortened) | Reproduced on `6bc2484f0` | Fix | Test that now passes (final code) |
| --- | --- | --- | --- | --- |
| F1 | A derived write whose ticket names no account lands after a removal committed but not published; its copy stays readable after the acknowledgement | `D1` after the commit and at publication: frame with no accounts 200, copy readable, both paths, unsealed and sealed (8 of 8 cases); stack option 2: the frame 200 at position 4 after the removal at 3, copy readable after the acknowledgement | the declaration (section 14.1): a ticket naming no account carries `[:db/cas scope :triplex.scope/removal-intent t t]`, which every removal's first transaction makes fail; the gateway answers 503 while it is pending | `D1`, all stops, both settings, unsealed and sealed: both frames 503 while stopped, 0 copies; review's stack, options 1 and 2: the frame with no accounts 503 while pending, 409 ErasureFrontierChanged when resent after the acknowledgement, no copy (option 0 unchanged); `D1-timeout` (commit landing 1.5 s after a 300 ms wait): frame refused, no copy; the frame race (40 late transactions behind an expired wait, released after the declaration): 20 of 20 failed `cas-failed`, 20 of 20 failed the account fence, 0 committed; on a stack with the waits forced to 5 and 10 ms: 5 ms: the removal answered 503 61 times before its 200 (62 attempts), each frame (no accounts, and naming the account) refused 62 of 62 times (58 at Datomic's serial point, 409 CasConflict; 3 by the gateway, 503; 1 after the acknowledgement, 409 ErasureFrontierChanged), 0 landed, no copy, and the subject's own racing save, which committed during the attempts, removed with it and 10 ms: 31 attempts, every frame refused (28 at the serial point, 2 by the gateway, 1 after), 0 landed, no copy; with the transactor restarted while the removal is pending: both frames 503, the removal resumed 200, no copy |
| F1b | Any ticketed write commits while a removal's intent is pending, before its commit | `D1` before the commit and after the guard: both frames 200, copy readable | the same declaration, which comes before the removal's selection and intent; the account counters hold tickets naming the account | `D1` before the commit and after the guard: both frames 503, 0 copies; the orphan case (stopped after its declaration, before its intent: nothing pending, so the gateway's check passes): the frame naming the account fails at the serial point (409 CasConflict); stack timeouts: 172 frames refused at the serial point while only the declaration had landed. [Corrected in the third pass: the orphan case was called a pass, but it never sent a frame naming no account, which that orphan refused in every account until another removal ran (DX-ERA3 N1); the stop point no longer exists, section 15] |
| F2 | A removal committed by a gateway with the subject check cannot be completed by one without it | `D2`: 10 of 10 resumes 503 | one per-account path: `TX2_REMOVAL_SUBJECT_CHECK` is read and ignored. (The review's suggested fix in the old path is not needed: the old path never runs on a moved database now except on a gateway without the per-account option, which F3's fix stops before it reads or writes anything) | `D2`: 10 of 10 resumes without the setting 200; fuzzer resumes "mixed" all completed (section 14.4) |
| F3 | A gateway without the per-account option leaves a removal intent that blocks every removal | `D3`: removal 400, intent left, another removal on a good gateway 503 | the old path refuses (503) before it writes an intent when the database holds the per-account sentinel (`erase.clj` 254) | `D3`, both settings: removal 503, intent left: false, another removal on a good gateway 200 |
| F4 | Page errors (proof item 5, section 6, the 13.2 row; the bound said 2 tries under the guard where the code allowed 3) | (page) | rewritten (sections 4, 6, 13.2, 13.3, and the statement at the top); `guarded-tries` set to 2, so the code allows what the page says: at most 4 commit attempts | the hammer: 30 of 30 removals in exactly 3 attempts |
| F5 | A derived write's own journal holds its copy in clear | (information) | no derived write can land after a removal's declaration any more; copies made before a removal are outside this branch | fuzzer: no derived write landed after a removal's position (section 14.4) |

### 14.3 What changed, exactly (for the second review)

| File | Change |
| --- | --- |
| `removal_commit.clj` | `declare!` (new): the declaration, run under the removal's locks before its first selection, and again on a resume (a declaration left by a removal that stopped before recording its intent is replaced; its other accounts released). `commit!`: releases the declared accounts that lost nothing. `transact!` (new): every native transaction of the removal through `d/transact-async`, waited for at most `wait-ms` (`TX2_REMOVAL_WAIT_MS`, default 5000), so a test can make the wait expire. `guarded-tries` 3 to 2: at most 4 commit attempts. `ticket-intent-ops`, `pending-touches?` (new, moved here from `removal_scope.clj` so the stored function texts do not change). `stale-counter-ops`, `rebuild!` (new): counters the log does not derive go back to 0; a restore replay rebuilds counters, declaration and held accounts |
| `removal_scope.clj` | `install!`: two attributes, `:triplex.scope/removal-intent` (long) and `:triplex.scope/removal-held` (string) |
| `storage.clj` (218-219) | a ticket naming no account adds the compare-and-set on `removal-intent` to its transaction |
| `privacy.clj` | `cut` keeps the pending intent itself (`:pending`); `ensure-ticket!` answers 503 while a pending removal can reach the ticket's accounts (line 214) |
| `erase.clj` | `erase!`: every removal on a database guarded per account takes the subject-check path (`TX2_REMOVAL_SUBJECT_CHECK` is read and ignored; F2). The old path refuses before writing an intent when the database holds the per-account sentinel (line 254; F3). The move sets `removal-intent` and zeroes stale counters; the restore replay calls `rebuild!` |
| `stack/up.sh` | `DX_REMOVAL_WAIT_MS` forwards `TX2_REMOVAL_WAIT_MS` |
| `era3/` (the review's) | merged; `attack.clj`: the fuzzer runs sealed with `ERA3_SEALED=1` (racing saves sent before the removal, because a sealed save on the file key store holds the database's lock); `d1-timeout` submits the commit late behind an expired 300 ms wait (the in-memory connection runs a queued transaction in its caller's thread, so the review's slow transaction could not expire the wait); `stack.sh`: `ERA3_TX_RESTART=1` restarts the transactor while the removal is pending |
| `era2/gate.clj` | new cases: the frame race (a derived write's transaction held back behind its expired wait until the removal has declared itself), an orphan declaration and the restore rebuild |
| `era2/gate.sh` | runs the review's attacks and fuzzer on both per-account settings (phase `era3`) |
| `era2/stack-timeout.sh` | new: the removal's waits expiring on a real stack |

### 14.4 Gates on the final code (`5114a74b0`)

Images: every container of every run below ran the pinned runtime image by ID, `sha256:21a67288007d...`
(`tx2-datomic:1.0.7745-da00`), and PostgreSQL `sha256:526f86d93c6e...` on the stacks; each run records the ID its
containers ran (`image`, `image-ran`, `images-ran`) and fails on a mismatch. Evidence (private): `DX-ERA2/final-5114a74b0.tar.gz`;
the reproduction on `6bc2484f0` and the intermediate runs: `DX-ERA2/fixpass-intermediate.tar.gz`.

- **Option off, byte for byte** (`G14`): the paired native log, unsealed (653 datoms) and sealed (698), identical on the
  base `272a1bd66` twice, on this code with the options unset, and with them set on a database never moved; every reply
  identical. (A run at `a9da13f89` differed in 2 datoms per log: two new top-level functions in the early-loaded
  `removal_scope.clj` renumbered the stored function texts; they moved to `removal_commit.clj` at `f2bf6b690`.)
- **Gateway suites** (`G14`): 76 tests, 71,170 assertions, the same single pre-existing `feed-test` error on base, off
  and on.
- **The builder's interleavings** (`G14`): database-wide 360 checks, per account 695, subject check 8,963, **0 failed**
  (with the race loop of 1,000 races, the hammer, the frame race of 40 late transactions per setting, the orphan
  declaration and the restore rebuild).
- **The review's attacks** (`G14`, phase `era3`, both settings): `D1` (all stops, unsealed and sealed), `D1-timeout`
  (both ticket kinds), `D2`, `D3`, `D5`, `D6` and 400 fuzzer schedules each: per account 1,979 oracles, subject
  setting 1,988, **0 violations**; the builder's checks inside them 163 and 200, 0 failed.
- **The review's fuzzer** on the final code, 20,000 schedules on each setting plus 30,000 with sealed values (70,000 in
  all, 351,784 oracles, **0 violations**; a sealed racing save is sent before its removal, because a sealed save on the
  file key store holds the database's lock):

| Run | Schedules | Oracles | Violations | Derived writes sent / landed after a removal | Resumes on a gateway without the subject setting | Counter comparisons (0 disagreements) |
| --- | --- | --- | --- | --- | --- | --- |
| subject setting, unsealed (seed 101) | 20,000 | 94,712 | **0** | 4,886 / 0 | 3,385, all 200 | 43,182 |
| per account, unsealed (seed 201) | 20,000 | 95,697 | **0** | 5,071 / 0 | - | 43,175 |
| subject setting, sealed (seed 301) | 20,000 | 107,491 | **0** | 5,074 / 0 | 3,344, all 200 | 43,227 |
| per account, sealed (seed 401) | 10,000 | 53,884 | **0** | 2,536 / 0 | - | 21,605 |

  In every run 0 derived journal entries were in clear after a removal. The only tally that is not this branch's to
  close: import frames of an entity named before it had a row, refused and then resent after the removal, committed
  (941 in the two unsealed runs, 0 sealed across the runs; DX-IMP2's families option closes it, section 14.5 item 8).
- **The review's stack case** (`S0`, `S1`, `S2`: the write gateway killed inside the removal's publication; the read
  gateway shares the removal log): options 1 and 2: the subject's save 409 CasConflict, both frames (no accounts, and
  naming the account) **503** while pending, the removal resumed 200 (sequence 1, position 3), the frame resent after
  the acknowledgement 409 ErasureFrontierChanged, **no copy**, a1 answers the marker. Option 0 unchanged (everything
  503 while pending). **With the transactor restarted while the removal is pending** (`S2r`): the same outcomes.
- **The removal's waits expiring on a stack** (`stack-timeout.sh`, option 2): at 5 ms, 62 attempts (61 answered 503),
  at 10 ms, 31 (30); every frame refused, 172 of them at Datomic's serial point (409 CasConflict, while only the
  declaration had landed), 0 landed, no copy; the subject's own racing value removed.
- **The fault cells** (`F7-o2`, option 2, the declaration in every removal): other accounts' saves, reads and frames
  refused **0** in every cell; racing protected saves committed before their subject's removal all removed (0 not
  removed); exact:

| Cell | Removals | Tries mean / p99 / max | Guards taken | Gateway ms p50 / p99 / max | Client time to remove p50 / p99 ms | Commits per s (acked) | Other accounts refused | Racing saves: removed with subject / after removal / NOT removed | Exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a10-r1 | 30 | 1.03 / 2 / 2 | 0 | 216 / 1353 / 1353 | 216.6 / 1355.5 | 42.0 | 0 of 951 | 21 / 12 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a10-r10 | 300 | 1.03 / 2 / 2 | 0 | 48 / 484 / 530 | 52.9 / 487.7 | 41.6 | 0 of 940 | 33 / 6 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r1 | 30 | 1.03 / 2 / 2 | 0 | 50 / 3528 / 3528 | 52.6 / 3545.1 | 41.1 | 0 of 919 | 17 / 6 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a200-r10 | 300 | 1.00 / 1 / 2 | 0 | 74 / 2997 / 3249 | 77 / 2796.5 | 41.1 | 0 of 934 | 22 / 5 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-fast | 300 | 1.00 / 1 / 1 | 0 | 93 / 6525 / 7143 | 94.7 / 5337.8 | 76.6 | 0 of 2539 | 25 / 0 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-sealed | 300 | 1.00 / 1 / 1 | 0 | 25 / 1812 / 1962 | 27.3 / 1608.1 | 40.4 | 0 of 931 | 26 / 8 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r10-three | 300 | 1.01 / 2 / 2 | 0 | 60 / 2364 / 2523 | 62.8 / 1924.7 | 40.2 | 0 of 950 | 28 / 4 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a10-r1-restart | 30 | 1.00 / 1 / 1 | 0 | 416 / 1087 / 1087 | 403.3 / 26030.8 | 16.9 | 0 of 911 | 3 / 8 / 0 | 0 wrong, 30/30 marked, 0 leaks |
| a10-r10 | 300 | 1.07 / 2 / 3 | 1 | 57 / 1012 / 1072 | 59.9 / 724.8 | 62.6 | 0 of 883 | 327 / 85 / 0 | 0 wrong, 300/300 marked, 0 leaks |
| a200-r10 | 300 | 1.02 / 2 / 2 | 0 | 236 / 1937 / 2314 | 238.8 / 1689.8 | 58.7 | 0 of 878 | 328 / 19 / 0 | 0 wrong, 300/300 marked, 0 leaks |

(The last two rows: 40 racing saves per second on the subjects being removed.)

### 14.5 Still not tested

1. **No server run.** Toy sizes only; every time is diagnostic.
2. **Restore with the option on**: only its new step, in-process (a copy whose counters, declaration and held accounts
   are out of step with the log, then the restore replay, which rebuilds them: gate case `rebuild`). No real backup and
   restore of a moved database ran (the ERASE1 regression's restore runs with the option unset, on its harness's
   image).
3. **Mixed gateways and the move on a stack**: in-process only (`D2`, `D3`, `D6`, the migrate case); `stack/up.sh`
   gives both gateways of a stack the same options.
4. **The owner-root fold under the guard**, the bound's only unfenced write: no run had an owner root.
5. **A gateway killed at every step on a stack**: killed inside the publication only (the review's stack case, with and
   without a transactor restart); the other steps are stopped in-process, and the expired waits at every step ran on a
   stack (`stack-timeout.sh`, 5 and 10 ms).
6. **The PostgreSQL advisory lock's fairness** under bursts of removals: only the file lock, in-process.
7. **The ERASE1 regression on a pinned image** (its harness chooses the newest recorded build).
8. **DX-IMP2 together with this branch**: the in-flight import frame of an entity named before it had a row is refused
   here; the refusal of its resend needs DX-IMP2's families option, on its own branch.
9. **Derived copies made before a removal** (the review's F5: a derived write's journal holds its copy in clear): no
   copy can land after a removal's declaration any more; copies made before a removal are outside this branch.
10. **A ticket naming fewer accounts than its writer read**: a client error, outside the protocol (section 5, case 1).

## 15. The second review (DX-ERA3, `era3/REVIEW-2.md`) and the third pass (2026-11-24)

Review: `origin/exp/DX-ERA3-removal-review` at `1c656316b`, of this branch at `27733d980`. It confirmed F1 closed on
every route it tried and found new faults the fix had introduced. Its new tests (`era3/attack2.clj`, `stack2.sh`,
`stack2-ack.mjs`, the `run.sh` changes) are merged and run in `era2/gate.sh` phase `era3` from now on (cases E1 to E8
and a 400-schedule fuzzer on both settings; E9 is reported, not counted, section 0). Fixes at `0ea7db896` and `e921f3ef1`;
the stack scripts at `b1d524802` and `a735e0a7e`. Every result below was reproduced first on `27733d980`, then rerun on the fixed code.

### 15.1 The order of a removal's steps, and the invariant

A removal now runs, under the database's removal lock and the locks of the accounts its selectors can reach:

1. **Agreement check** (`removal_commit.clj` 402): the data's committed and declared sequences are not past the log's
   top (its head, or the pending removal one past it), and the committed one is not behind the head. Otherwise a typed
   503 (`RemovalLogBehind` or `RemovalDataBehind`) before anything is written (N5).
2. **First removal on a database moved by an earlier build** (`ensure-declaration!`, 245): installs the two
   attributes and starts the declared sequence at the committed one (N2).
3. **Intent** in the log (`put-intent!`, 333, called at 409): written only where no intent is (PostgreSQL
   `INSERT ... ON CONFLICT DO NOTHING`, one row or 503), and later replaced only over the exact text this removal last
   wrote (`UPDATE ... WHERE payload=`), so two removals that both believe they hold the lock cannot replace each
   other's intent.
4. **Declaration** in Datomic (`declare!`, 254; operations 273-277): the declared sequence moves to s, the accounts its
   selectors reach take -s. It lands only while the committed sequence is still s-1 (`[:db/cas head removal-seq (dec
   s) (dec s)]`, 274), and an earlier declaration at s is taken as its own only when its intent was already in the log
   (272: otherwise refused before writing).
5. **Selection and commit** (`commit!`, 281): the commit lands only under its own declaration
   (`[:db/cas head removal-intent s s]`, 303) and only if the selected subjects did not change; at most 4 attempts and
   one subject guard (`hold!`, 230, guarded the same way, 238-239). A commit refused at the serial point because an
   earlier attempt's commit landed first publishes that commit (424).
6. **Intent rewritten to the committed entry, then publication** (`publish!`), unchanged.

**The invariant, in one sentence:** a ticketed write commits only if, at Datomic's serial point, no removal that can
reach an account it read (any account, for a ticket naming none) has declared or committed itself after the published
cut its ticket was checked against, and no removal declares, releases or commits while the data is ahead of the log.

**Where it is enforced at the serial point:**

- **A ticket naming no account** (`removal_commit.clj` 142-143, added to the write's transaction at `storage.clj`
  219): `[:db/cas scope :triplex.scope/removal-seq t t]` (no removal of any version committed since the ticket) and
  `[:db/cas scope :triplex.scope/removal-intent (min d t) (min d t)]` (no declaration since the ticket; d is the
  declared sequence the gateway read, lower than t only after an earlier build's removals, which do not declare).
- **A ticket naming accounts:** the fence's comparison, `removal_scope.clj` 95, unchanged: a declaration sets those
  accounts' counters to -s and the commit to s, and the ticket expects its published value.
- **The declaration, the hold and the commit** carry their own compare-and-set (274, 238-239, 303), so a late
  transaction of a stopped attempt cannot land after a later state.
- **Not at the serial point, and not relied on for exactness:** the gateway's early 503 while a pending removal can
  reach a ticket (`refuse-pending!`, 160, called at `privacy.clj` 215), the same refusal before
  submission when the gateway's data already shows a declaration against the ticket (137, 141), and request-time
  agreement (`erase.clj` 329-331).

### 15.2 Every stop point, what it leaves, and who completes it

s is the removal's sequence, h = s - 1 the log's head. "Refused" means refused for derived writes the removal can
reach (a ticket naming no account, or naming one of its accounts); every other write and every read is served
throughout.

| # | Stopped after | Log | Datomic | What a gateway sees and does | Who completes it, and why it is safe |
| --- | --- | --- | --- | --- | --- |
| P0 | the agreement check (nothing written) | head h | unchanged | nothing to see; nothing refused | nothing to complete; the resend starts afresh |
| P1 | its intent (the declaration not sent, or sent and its wait expired) | head h, intent at s | declared h, or s if the late declaration lands | the pending intent: 503 for the writes it can reach, and the refusing gateway completes it | **any gateway**, as a resend: its declaration reads the declared sequence (h, or s: then its own, because its intent was in the log before) and compares-and-sets from it, so a late declaration of the stopped attempt makes one of the two fail (503, completed at the next contact) and never lands after the commit (its `removal-seq` check) |
| P2 | its declaration | head h, intent at s | declared s, accounts at -s | as P1; at the serial point the declared sequence and the counters refuse | any gateway: the declaration at s is its own (its intent was in the log); it declares again and releases what it no longer reaches |
| P3 | its subject guard | as P2 | + the subjects' counters at -s | as P1; saves of those subjects refused at the serial point | any gateway: it finds the subjects held and keeps them held; a late hold cannot land after the commit (238-239) |
| P4 | a commit sent whose wait expired | intent at s (this attempt's selection) | committed h, or s if it lands | as P1 | any gateway: if the commit landed, it is found by the command's claim and published (the same removal: same command, selectors, sequence, previous seal; its selection is the commit's own); if it lands during the completer's own attempt, that attempt is refused at the serial point and publishes it (gate case `late-own-commit`) |
| P5 | its commit | intent at s | committed s | as P1; the committed sequence refuses tickets at h | any gateway: publishes the commit |
| P6 | the intent rewritten to the committed entry | intent = committed entry | committed s | as P1 | any gateway: publishes it |
| P7 | its publication (no answer sent) | head s | declared = committed = s | nothing pending; tickets at h are stale (409 ErasureFrontierChanged at the gateway, refused by the committed sequence at the serial point) | nothing; the resend answers 200 from the log |

**The reviewer's ambiguity is gone:** "a declaration without an intent" cannot be produced by this version (the
intent comes first, and the log loses an intent only by publishing it). When it is found, the data is ahead of the
log (a log restored behind the data, or the earlier build `27733d980`), and every gateway refuses with
`RemovalLogBehind`, which names what clears it.

### 15.3 How long a stopped removal can refuse others' writes

- **What it refuses:** only derived writes whose ticket names no account or names one of the accounts its selectors
  reach. Reads, plain saves and derived writes naming other accounts are served throughout (stack runs, 15.6).
- **The bound:** from the stop, until the first such write arrives at any gateway, plus one completion. That write is
  refused (503) and its gateway, after releasing the write's locks, completes the removal (`main.clj` 500-502,
  `complete-pending!` 440). A completion waits for the removal lock (only if a live gateway still holds it, which is
  itself bounded) and runs at most six native transactions (one declaration, one guard, 4 commit attempts; seven on a
  database's first removal, which installs its function), each waited at most 5 s: at most 30 to 35 s at the default
  wait, plus the log's round trips (milliseconds on the stacks). If a completion is itself refused (a late transaction of the
  stopped attempt landed first), it answers 503 and the next refused write completes it from what landed.
- **What clears it:** the first refused derived write (any gateway), any removal of another command (which completes
  the pending one first), or the removal's own resend. Time alone does not, but nothing it refuses can wait unseen:
  every refusal is a 503 with a typed code, and every refusal starts the completion.
- **The precondition:** at least one gateway's wait (`TX2_REMOVAL_WAIT_MS`, default 5 s) outlasts one native
  transaction. With every gateway at 1 ms (the review's `orphan-wait` setting) no completion can finish: the removal
  stays pending and visible, and the writes it can reach get 503, not an unexplained 409 (15.6).
- **The only other unbounded case** is a removal log or data that disagree (an operator restored one of them): refused,
  typed, until the operator puts the current log back or runs the restore route. That is today's rule's behaviour too.

### 15.4 Each finding, its fix and the test that now passes

Reproduced first on `27733d980` with the review's tests (`R1-on`, `R1-subject`: 9 violations on each setting; stacks
`orphan`, `orphan-wait`, `upgrade` with `272a1bd66`), then rerun on `e921f3ef1`.

| # | Finding | Reproduced on `27733d980` | Fix | Test that now passes (on `e921f3ef1`) |
| --- | --- | --- | --- | --- |
| N5 | High: the removal log restored behind the data; the next removal's declaration released an account that had lost a value, and a derived write that read it landed after the removal | `e7b`, both settings: the old frame 200 at position 5, after the removal at 4, copy readable once the log is back; the second attempt 400 | agreement check before anything is written, in every removal (402), the restore route (491) and every request (`erase.clj` 329-331); the declaration lands only while the committed sequence is s-1 and takes a declaration at s as its own only when its intent was in the log (272-274); the gateway's start reports it (`start-check!`, 460) | `e7b`, both settings: the second attempt 503 `RemovalLogBehind`, the old frame 503 `RemovalLogBehind` before and after it, no copy. Gate `log-behind`, one and two removals behind: the removal and the restore route 503 `RemovalLogBehind`, a frame that read the removed value and a frame naming no account refused, the declared and committed sequences, the held list and the counters unchanged, the start check reports `RemovalLogBehind`; once the current log is back a frame naming b, one naming no account and the removal 200, every counter equal to the log's. Stack `logbehind` (the PostgreSQL log one removal behind, gateways restarted): the start check reports it; a removal, the restore route, a read and frames with the old ticket 503 `RemovalLogBehind`; with the current log back, all 200 and the value not answered.TACK |
| E7 | Low: after N5's release, frames naming either account refused for good once the log was back | `e7`: 409, 409, 409 after another removal; counters a 0 against -1, b 1 against 0 | N5's fix (nothing is released from a log behind the data) | `e7`: the removal while behind 503 `RemovalLogBehind`, reads while behind 503; once the log is back frames naming a and b 200, and after another removal; every counter equal to the log's |
| N1 | High: a removal stopped between its declaration and its intent (a kill, or its declaration's wait expiring) refused every derived write naming no account, in every account, with nothing any gateway could see, until another removal ran | `e1`, 4 clearing routes, both settings: 5 of 5 frames 409 CasConflict; stacks: refused at 0, 5 and 10 s, after the write gateway restarted and 60 s later; with 1 ms waits for the 91 s observed, and another removal 503 | intent first (409), then the declaration (411); the pending intent is seen by every gateway, which answers 503 (tagged) to the writes it can reach and completes it once the refused write released its locks (`main.clj` 500-502, `complete-pending!` 440); a removal of another command completes it first | `e1`, 4 clearing routes, both settings: the intent pending; of 5 frames naming no account the first 503, then 4 of 4 200, and the removal published after the first; gate `stop-points`, 5 stops (intent, declared, held, committed, prepared), both per-account settings: the first frame naming no account 503 and the removal published by that contact, the next one and one naming the removed account 200, a frame naming another account and another account's save 200 while stopped, the resend 200 with sequence 1, the value gone everywhere, every counter equal to the log's. Fuzzer (44,000 schedules): 6,309 stops right after the declaration, every one completed by the first derived write after it (3,456 times the probe itself, 503; 2,853 times an earlier action); the liveness probes after every schedule 44,000 of 44,000 pairs 200. Stacks: the write gateway killed at intent, declared, committed, prepared and published, and its waits at 1 ms: in every run the first frame naming no account 503 and the read gateway completed the removal, every later frame 200, the value not answered; the review's `orphan` stack: nothing recorded, every frame 200 throughout. |
| E1b | Low: a removal whose selection reached an account it had not declared was refused after its declaration, leaving a block of the wrong account | `e1-bucket`: 503, then frames naming no account 409 until the resend | the intent first; the completion computes the accounts again | `e1-bucket`: 503; the next frame naming no account 503 and completes it; the resend 200; then 200 |
| N4 | High: a delivery between databases into a database guarded per account was refused | `e4`: 409, 409 | no check against the recipient's sequences when the ticket names another database (`ticket-intent-ops`, 139); a delivery into the same database keeps both checks | `e4`: 200, 200. Gate `deliveries`, both per-account settings, per account to per account, per account to database-wide, database-wide to per account, and into the same database: a delivery with the current source ticket 200, one with a source ticket older than a source removal 409 ErasureFrontierChanged, one with the new ticket 200 |
| N3 | Medium: after a removal by an earlier version, this version's tickets naming no account were refused until a removal by this version ran | stack `upgrade`: fresh frames 409 twice, "Compare failed: 1 0"; `e3`: a fresh frame 409 | a ticket naming no account is checked on the committed sequence (any version's removals move it) and on the declared sequence where the gateway read it (the lower of it and the ticket) | `e3` (an earlier version emulated): a frame while its removal is pending 503 and completes it, a fresh frame after it 200, no copy, this version's removal and a fresh frame after it 200. Stack `mixed` with `27733d980` and with `272a1bd66`: this version's frames after an earlier build's removal 200, 200; an earlier build's pending removal completed by this version's first refused frame. |
| N2 | Low: a database moved by an earlier build had no declared sequence; every removal and every frame naming no account failed | stack `upgrade`: the removal 400 twice, the frame 400 | the first removal installs the attributes and starts the declared sequence at the committed one (`ensure-declaration!`, 245); until then tickets are checked on the committed sequence | `e2` (the value retracted): a frame naming no account 200, the removal 200, a frame after it 200. Stack `upgrade` with `272a1bd66` (the review's): on the database moved by the earlier build, a fresh frame 200 and a removal by this version 200, resent 200. |
| E6 | Information: a ticket naming fewer accounts than its writer read lets its copy survive | `e6` | none (by design: every caller must name every account it read, section 5, case 1) | `e6`: unchanged, the copy survives |
| E9 | High against TARGETS 7.3, older than this branch: a derived copy recorded before a removal stays readable | `e9` | none here: `exp/DX-ERA4-derived-copies`; stated at the top of this page | `e9` (reported by the gate, not counted): copy readable, in the journal, 4 native copies unsealed, 2 sealed |
| P1 | The page: section 8 ("until a removal runs"), the fleet order, the 14.2 F1b row | (page) | corrected in place, marked "[Corrected in the third pass ...]" | (page) |

**Found while fixing (not in the review), fixed and tested:**

- **A commit whose wait expired could land after the resend recorded a fresh selection**, and the removal could then
  never be published (the stored intent's selection differed from the commit's). Now the same removal means the same
  command, selectors, sequence and previous seal, and the commit's own selection is published. Gate
  `late-own-commit`, both settings: the first attempt 503, its commit landed during the resend, the resend 200 with the
  landed commit's position, a frame naming no account 200, every counter equal to the log's.
- **A subject guard whose wait expired could land after the commit** and refuse the subject's saves until another
  removal touched it. The guard now lands only while the removal is declared and uncommitted (238-239).
- **Two removals that both believe they hold the lock could replace each other's intent.** The intent is written only
  where none is, and replaced only over the text last seen (333). Gate `lock-lost`: 20 pairs of removals of two
  accounts with the database's lock bypassed, both per-account settings: in every pair one 200 and one 503 at once, both
  200 when resent, two sequences, both values gone, every counter equal to the log's. Stacks `lockloss-intent` and `lockloss-declared` (the PostgreSQL sessions of the gateway in the middle of a removal killed): the other gateway completed it and ran its own; the one that lost its lock wrote nothing.
- **A ticket naming an account the data already showed declared** (the account reached through an assertion selector
  with nothing left to remove there) was refused at the serial point without starting the completion; now it gets the
  tagged refusal before submission (137, 141).

### 15.5 What changed, exactly (for the third review)

Commits after the reviewed head `27733d980`: `0ea7db896` (the fixes and the merged tests), `b1d524802` (the stack
script), `e921f3ef1` (the tagged refusal before submission, below), `a735e0a7e` (the log-behind stack script), and the
page commit.

| File | Change |
| --- | --- |
| `removal_commit.clj` | `erase!`: the new order (agreement check, first-removal install, intent, declaration, selection and commit, publication); a removal of another command left pending is completed first (`complete-pending!`); a commit refused at the serial point publishes an earlier attempt's commit when that is what landed. New: `disagreement`, `refuse!`, `consistent?`, `refuse-inconsistent!` (data against log, typed answers); `declared-seq`, `ensure-declaration!` (N2); `put-intent!` (the intent written only over the text last seen); `pending-refusal`, `refuse-pending!` (the tagged 503) and `complete-pending!`; `start-check!`; `step!` (the test seam `TX2_REMOVAL_TEST_PAUSE_AT` and `TX2_REMOVAL_TEST_PAUSE_MS`, unset by default). Changed: `transact!` (a refused native step answers 503, tagged as refused); `ticket-intent-ops` (now also takes the database value: the committed-sequence compare-and-set, the declared one at the lower of the declared sequence and the ticket, nothing for a delivery from another database, and the tagged refusal before submission when the data already shows a declaration against the ticket); `declare!` (lands only while the committed sequence is s-1; takes a declaration at s as its own only when its intent was in the log); `hold!` and `commit!` (only under their own declaration); `same-removal` (the command, selectors, sequence and previous seal); `publish!` (the intent rewritten only over the text last seen); `rebuild!` (refused when the data is ahead of the log) |
| `privacy.clj` 215 | `ensure-ticket!` raises the tagged refusal (`refuse-pending!`) instead of the plain 503 |
| `storage.clj` 219 | passes the database value to `ticket-intent-ops` |
| `erase.clj` 329-331 | `request-cut`: agreement includes the declared sequence; after its retries a typed answer (`RemovalLogBehind`, `RemovalDataBehind`) |
| `main.clj` 500-502, 518-521 | a write refused by a pending removal: the gateway completes that removal once the write's locks are released; at start, every database guarded per account whose data and log disagree is reported |
| `stack/up.sh` | `DX_REMOVAL_WAIT_MS_WRITE`, `DX_REMOVAL_TEST_PAUSE_AT`, `DX_REMOVAL_TEST_PAUSE_MS` (the write gateway only) |
| `era3/` (the review's) | merged: `REVIEW-2.md`, `attack2.clj` (two adaptations, 15.7), `stack2.sh`, `stack2-ack.mjs`, `run.sh` |
| `era2/gate.clj` | new cases `stop-points` (5 stops, each with a frame naming no account), `late-own-commit`, `log-behind` (one and two behind, and a declaration the log does not show), `rebuild`, `deliveries` (three directions, the same database, and the cross-database window), `lock-lost` (20 pairs of removals with the database's lock bypassed); `orphan-and-rebuild` removed |
| `era2/gate.sh` | phase `era3` also runs the second review's cases E1 to E8 and its fuzzer (400 schedules) on both settings, and E9 (reported, not counted) |
| `era2/stack-steps.sh` | new: a gateway killed at each step, an expired wait, a lost lock, a data restore taken while a removal was declared, a mixed fleet in both orders |

**Change after the first rerun (`e921f3ef1`):** a ticket naming accounts whose data already showed one of them
declared (counter negative) was refused at the serial point (409, untagged), so a removal whose declaration reached an
account through an assertion selector with nothing left to remove there could refuse that account's frames without
its completion starting. Every refusal a declaration causes now starts the completion; every result below is on
`e921f3ef1`.

### 15.6 Gates on the fixed code

Gateway code `e921f3ef1` for every run below (later commits change only lab scripts and this page). Images: every
container of every run ran the pinned runtime image by ID, `sha256:21a67288007d...` (`tx2-datomic:1.0.7745-da00`), and
PostgreSQL `sha256:526f86d93c6e...` on the stacks; each run records the IDs it ran (`image-ran`, `images-ran`).
Evidence (private): `DX-ERA2/p3/` in the project's evidence folder, compressed as `third-pass-e921f3ef1.tar.gz`.

**In-process (`era2/gate.sh`, run `G2`):**

| Gate | Result |
| --- | --- |
| Option off byte for byte (paired log, base `272a1bd66`) | identical: unsealed `e6ea7dfc4eec...` (653 datoms), sealed `033f30cd2767...` (698 datoms), on the base twice, on this code with the option off, and with it on and the database not moved; replies identical (md5 `2caaf1e83af2...`) |
| Own gate, database-wide / per account / subject setting | 360 / 1,545 / 9,813 checks, 0 failed (per account was 695 before this pass: the new cases) |
| `stop-points` (5 stops, both per-account settings) | 10 of 10: the first frame naming no account 503 and the removal completed by it (10 completions logged), the next frames 200 |
| `late-own-commit`, `log-behind` (1 and 2 behind, undeclared), `rebuild`, `deliveries` (4 kinds) | all checks passed on both settings |
| `lock-lost`, 20 pairs per setting | 40 of 40 pairs: one 200 and one 503 at once; all resent 200; two sequences; values gone; counters agree |
| Frame race (late transactions behind an expired wait, released after the declaration) | 40 per setting: 20 refused by the declared sequence (`cas-failed`), 20 by the account fence; 0 committed |
| Race loop, 1,000 saves racing a removal of their subject | 839 committed before the removal and removed with it, 161 refused (409 CasConflict), 0 after it |
| Hammer, 30 rounds | 30 of 30 removals in 3 attempts, 30 guards |
| The first review's attacks (`era3/attack.clj`, D1 to D6 and 400 schedules) | per account 1,979 oracles, subject setting 1,988; 0 violations |
| The second review's cases E1 to E8 and 400 schedules (`era3/attack2.clj`) | 2,785 oracles on each setting; 0 violations |
| E9, reported only | 2 violations, as on today's rule (the known unmet requirement) |
| The gateway's Clojure suites | 76 tests, 71,170 assertions, the same single error as the base (`http-route`, `json.clj:82`) on all three arms |

**The second review's fuzzer with the declaration dimensions (`era3/attack2.clj` fuzz2), 44,000 schedules, 0
violations of F1, F1b or N5:**

| Run | Setting | Sealed | Seed | Schedules | Oracles | Violations |
| --- | --- | --- | --- | --- | --- | --- |
| Z1 | per account | no | 1501 | 14,000 | 95,780 | 0 |
| Z2 | subject | no | 1601 | 14,000 | 95,897 | 0 |
| Z3 | per account | yes | 1701 | 8,000 | 58,637 | 0 |
| Z4 | subject | yes | 1801 | 8,000 | 58,622 | 0 |
| **Total** | | 16,000 sealed | | **44,000** | **308,936** | **0** |

What the 44,000 schedules exercised (sums over the four runs):

- **Late transactions with an old ticket** (prepared before the removal, submitted straight to Datomic after its
  declaration, after its commit or after its answer): frames naming no account or naming the account, 14,183 refused,
  0 committed; frames of another account 7,151 committed (as they must); late saves of the subject 2,090 committed
  before the removal and removed with it, 4,867 refused, 0 after it.
- **Derived writes sent during a stopped or completed removal:** 9,416, none landed after it.
- **Stops right after the declaration:** 6,309. The first derived write after the stop: 3,456 times the fuzzer's probe
  (503, and it completed the removal), 2,853 times an earlier action of the schedule had already completed it (the
  probe then 200). Of these, 1,287 were never resent by their client: in every one, the next removal of the database
  (another account) answered 200 and the liveness probes after it committed.
- **Liveness after every schedule:** a fresh frame naming no account and one naming the account, 44,000 pairs, all 200.
- **DX-IMP2's known resend** (an import frame of an entity named before it had a row, resent after the removal):
  committed 471 times on the unsealed runs, as before (the families option on DX-IMP2's branch refuses it).

**Stacks (per account, PostgreSQL authority shared by a write and a read gateway):**

| Run | What was done | Result |
| --- | --- | --- |
| `step-intent`, `step-declared`, `step-committed`, `step-prepared` | the write gateway's removal of a1 paused at that step and the gateway killed there; nobody resent; every request after it to the read gateway | 4 of 4: the intent pending (1), published sequence 0; a frame naming b 200 and a save of b1 200; the first frame naming no account 503, after which the intent was gone and the removal published (sequence 1) by the read gateway; the next frame naming no account 200, a frame naming a 200; the resend 200 with sequence 1; another removal 200 with sequence 2; a1's value answered by its subject 0 times and by the refused frame's document 0 times; the write gateway restarted: a frame 200, no start-check line |
| `step-published` | killed after its publication, before its answer | nothing pending, published sequence 1; every frame 200; the resend 200 with sequence 1; a1's value answered by its subject 0 times (the frame counted once was sent with ticket 1, after the publication: new data) |
| `wait` | the write gateway's waits 1 ms (its removal answered 503 and its steps landed later); no resend | the same as the step runs: intent pending, the first frame naming no account 503 and the read gateway (5 s waits) completed the removal, everything after 200, the value not answered |
| `lockloss-intent`, `lockloss-declared` | the write gateway's removal of a1 paused 20 s at that step; its PostgreSQL sessions killed (advisory locks 2, then 0); meanwhile a removal of b1 on the read gateway | 2 of 2: the read gateway's removal 200 with sequence 2, after completing the paused one as sequence 1; the paused removal, going on without its lock, answered 400 ("This connection has been closed.") and wrote nothing (nothing pending, the published sequence still 2); both resends 200 with sequences 1 and 2; frames naming no account, a and b 200; no value answered |
| `restore` | a data backup taken while the removal of b1 was declared (paused); b1 (sequence 1) and a1 (sequence 2) then published; transactor and gateways stopped, `restore-db` from that backup (exit 0), restarted | start check: `RemovalDataBehind`, native 0, declared 1, log 2; a read of a1, a frame and a removal 503 `RemovalDataBehind` (a1's restored value not answered); the restore route 200 (sequence 2); then frames naming no account, a and b 200, a removal 200 with sequence 3; no value answered |
| `logbehind` (`stack-logbehind.sh`) | the PostgreSQL removal log put back to a copy taken before the removal of b1; both gateways restarted; then the current log put back and both restarted | start check: `RemovalLogBehind`, native 1, declared 1, log 0; a removal, the restore route, a read of b1 and frames with the old ticket (naming b, naming none) all 503 `RemovalLogBehind`; with the current log back: no start-check line, frames 200, a removal 200 with sequence 2, b1's value not answered |
| `mixed` with `27733d980`, and with `272a1bd66` (the read gateway on the earlier build) | 1. earlier build's removal, then this version's frames; 2. this version's removal, then the earlier build's frames; 3. this version's removal paused 15 s after its declaration while the earlier build sent frames with tickets from before it; 4. the earlier build's removal killed inside its publication, then this version's frames; 5. the earlier build back | both builds alike: 1. 200, 200 (N3 gone); 2. 200, 200; 3. the earlier build's two frames waited for the database's lock and were refused 409 ErasureFrontierChanged once the removal had published; 0 copies of a1 in their documents; its plain save 200; 4. intent pending; this version's frame naming b 503 and this version completed the earlier build's removal (published sequence 4); the frame naming no account with the same old ticket 409 ErasureFrontierChanged; fresh frames 200; 5. the earlier build's resend 200 with sequence 4, its frames 200; no value answered |
| the review's `stack2.sh orphan` | the write gateway killed while its removal's first authority write (now the intent) was held by a table lock | nothing recorded and nothing declared: every frame naming no account 200 at 0, 5 and 10 s, after the restart and 60 s later; frames naming a and b 200; another removal 200 (before the fix: all 409 CasConflict until another removal) |
| the review's `stack2.sh orphan-wait` | every gateway's removal waits 1 ms (the review's setting: both gateways); no resend | the removal answered 503 and stayed pending, visibly (1 intent); every frame naming no account and the frame naming a 503, at 0, 5 and 10 s, after the restart and 60 s later; the frame naming b, saves and reads 200; 9 completions were tried on contact and each timed out at 1 ms, as did another removal (503). This is the bound's one precondition: a completion needs one gateway whose wait outlasts a native transaction (with 5 s waits on the read gateway, run `wait` above, it completed at the first contact) |
| the review's `stack2.sh ack` | 20 removals on the write gateway; on the read gateway a current read, a read pinned before the removal and a cached Reach session, in a loop | 20 of 20 acknowledged; 5,314 reads started after an acknowledgement (session 1,776, current 1,775, pinned 1,763), 0 answered the value; 736 of 1,115 reads started before an acknowledgement did (allowed) |
| the review's `stack2.sh upgrade`, `OLD_REF=272a1bd66`, and the same with `6bc2484f0` (identical outcomes) | both gateways on the earlier build, a database moved by it; the read gateway switched to this version, a second database moved by it; a removal by the earlier build stopped inside its publication in each; then everything on this version | the database moved by this version: a frame naming no account 503 while the earlier build's removal was pending, one naming b 200; the removal resumed 200; frames with a fresh ticket 200, 200 (before the fix 409 twice, N3); a removal by this version and a frame after it 200. The database moved by the earlier build (no declared sequence): a frame 503 while pending, a save and a read 200; the removal resumed 200; a fresh frame 200 and one naming b 200 (before: 400); a removal by this version 200 and resent 200 (before: 400 twice, N2); moves back and forward, a removal and a frame 200 |
| the first review's `stack.sh`, options 0, 1 and 2 | the write gateway killed inside the removal's publication; frames to the read gateway with the old ticket | option 0 (today's rule) unchanged: everything 503 while pending, the removal resumed 200 (sequence 1, position 3), the frame resent after it 409 ErasureFrontierChanged, no copy. Options 1 and 2 alike: the subject's own save 409 CasConflict; the frame naming no account 503, and its gateway completed the removal; the frame naming the account, with the same old ticket, then 409 ErasureFrontierChanged; the resend 200 (sequence 1, position 3); no copy; a1 no longer answers its value |
| `era2/stack-timeout.sh`, 5 ms and 10 ms waits on both gateways | the removal sent again and again until it answers 200; after every answer, frames with the old ticket (naming no account, naming the account) and a save of a1 to the read gateway | 5 ms: 35 attempts (34 answered 503), 68 completions tried on contact and each timed out; each frame kind refused 35 of 35 (34 by the tagged 503, which the gateway now gives before submission because its data shows the declaration; 1 after the acknowledgement, 409 ErasureFrontierChanged); 0 landed after the removal; no copy; a1 not readable. 10 ms: 3 attempts, every frame refused (2 + 1), 0 landed, no copy |

### 15.7 The review's tests that had to change, and why

- **E1's first oracle** said "a stopped removal that recorded no intent does not refuse every unnamed derived write".
  No stop records no intent now. It is replaced by three oracles: the stopped removal's intent is pending; it refuses
  unnamed derived writes only until the first one, whose gateway completes it (that one 503, the next four 200); and the
  log has the removal after that first write. The rest of E1 is unchanged.
- **E3's emulation of an earlier version** removed only the declaration step. This version's commit and hold also
  check the declaration, so that emulation no longer behaved like an earlier build; it now also strips those checks
  from the removal's own transactions (`earlier-version` in `attack2.clj`).
- **`era2/gate.clj`'s orphan case** is replaced by `stop-points` (each stop, with a frame naming no account), and its
  restore-rebuild part by `rebuild` (a copy restored from mid-removal; the declaration the log does not show is now
  case `log-behind/undeclared`, refused and cleared by the move).

### 15.8 The cross-database delivery window (the account-ticket builder's finding)

**Confirmed unchanged by these fixes.** Gate case `deliveries`, last part, both settings: a delivery's recipient
transaction prepared under the source's current ticket and submitted after a removal in the source was acknowledged
committed, and its copy of the removed value is readable in the recipient. The delivery's check of the source runs in
the gateway, under the source's lock; it is not at any serial point, because each database here is its own Datomic
database and no transaction spans two. Live requests are ordered by the lock; a delivery whose wait expired (its lock
released) can land later.

**What would close it.** Either (a) the source and the recipient in one Datomic database (the one-database goal): the
recipient's transaction then carries the source's committed and declared compare-and-sets, exactly as a delivery into
the same database does now (gate case `deliveries/same-database`: an old source ticket refused); or (b), while they
are separate, a two-step delivery: a claim written in the source (checked there against its sequences) before the
recipient commit, and a token in the recipient that the source's removal must revoke (a write into every recipient
with an open claim) before it commits.

### 15.9 Still not tested

1. **No server run.** Toy sizes only; every time is diagnostic.
2. **The subject guard's stop (P3) on a stack:** in-process only (gate `stop-points/held`, the fuzzer's `after-guard`
   stops); a stack cannot force the subject to change between attempts. Every other step was killed on a stack.
3. **A completion's latency under load.** The bound (15.3) is from the code; no run measured a completion while the
   database took load, and the toy completions took under a second.
4. **A removal log behind the data with removals pending in it** (a backup of the log taken while a removal was
   pending, restored after more removals): in-process the log was put back one and two removals behind, idle; on a
   stack one removal behind, idle.
5. **Earlier builds' derived writes during this version's declared removal** (the window the fleet order forbids):
   measured on the mixed-fleet stack, not closed; the order in section 8 is the only protection.
6. **The owner-root fold under the guard** (the bound's only unfenced write): no run had an owner root.
7. **The PostgreSQL advisory lock's fairness** under bursts of removals: not measured.
8. **The ERASE1 regression on the pinned image** (its harness chooses the newest recorded build).
9. **DX-IMP2 together with this branch:** the known resend (471 times here) is refused only with DX-IMP2's families
   option, on its own branch.
10. **Whether every caller that names accounts names every account it read** (E6 depends on it): callers not reviewed.
11. **The cross-database delivery window** (15.8): confirmed open, not closed.
12. **E9, derived copies recorded before a removal:** a known unmet requirement, owned by `exp/DX-ERA4-derived-copies`.

## 16. Commit as the boundary (`TX2_REMOVAL_COMMIT_BOUNDARY=1`, default off): the design (written 2026-11-24, 23:20 EST, before its gates ran)

**What the owner is asked to confirm.** TARGETS 7.1 says a read that started before a removal's publication MAY
return the old value, and every read that starts after it returns the removed marker. With this option a removal takes
effect at its commit in Datomic, which is before its publication: stricter than 7.1 asks, which its wording permits, but
it moves the moment a removal becomes visible. Nothing changes unless the option is set, and it applies only to a
database guarded per account. The third review (`era3/REVIEW-3.md`) proposed it, because every fault of rounds two
and three sat at the boundary between the external log and Datomic (N1, N5, E7, M1).

### 16.1 What a reader needs in Datomic to mask without the log

- **The removal's own record.** Every removal's commit carries its entry on its transaction
  (`:triplex.tx/erasure-record`). The entry holds:
  - its sequence and the previous entry's seal;
  - the command and its selectors;
  - every removed identity (assertion ID, value type, entity, attribute);
  - its stamp and transaction ID.
  It is the exact text its publication writes into the log (the publication publishes the native record). The marker
  a reader answers is built from these fields by the same function as today (`privacy/apply-entry`).
- **The reader's position.** The database value the gateway serves the request from (its current value, synced as
  today), not a pinned basis. A pinned or history read masks every removal committed up to that value, as it masks
  every published one today.
- **What is not in Datomic: the policy** (the protected attributes, sealed or not). It is in the log's head and never
  changes. So a missing log cannot be served, and the rebuild route asks for the policy (16.6).
- **The cost.** One index lookup per request (the newest `erasure-record` datom), with the entries cached per database
  and extended from the newest one seen; the effective state applies only the entries past the log's head (normally
  none, or the one being published).

**The state every request is served from (`removal_commit.clj` `effective`):** the log's cut, with every removal
committed in the data past the log's head applied in order. The two are hash chains (each entry carries the previous
seal), so one comparison at the log's head proves they agree on every earlier entry.

### 16.2 Sealed scopes: when the key is destroyed

- **Unchanged: after publication** (plus the grace period), by the shred worker, from the log.
- **Between the commit and the key's destruction a reader masks by the commit**: it answers the marker and never
  unseals the value. A write cannot reuse the identity: `issue!` and `take-key!` check the same erased set.
- **Destroying the key at the commit** would also be exact (the commit is durable), but it is not needed. Keeping it at
  publication keeps the key store following the acknowledged record, and a log put back behind the data cannot bring a
  key back by itself (the key store's rows are deleted, and a restored key store would still meet the commit's mask).

### 16.3 The 503s while a removal is pending

- **Today's database-wide rule** (option off) answers 503 to every request while a removal is pending. Unchanged:
  this option is for databases guarded per account only.
- **Per account, on either boundary:** reads were already served while a removal is pending.
- **With the commit boundary, reads are never refused because the log and the data disagree in time.** That covers
  the log behind the data (any amount, a copy with a removal pending in it, or an orphan declaration) and the data
  behind the log. Only a missing log refuses reads, because the policy is in the log.
- **Writes the pending removal can reach** still get the tagged 503, and their gateway completes the removal, which
  publishes it.
- **Writes are refused (typed) only** while the data is behind the log (`RemovalDataBehind`, until the restore route)
  or the two disagree on an entry (`RemovalLogConflict`).

### 16.4 What acknowledgement means

Unchanged: the removal's 200 is sent after its publication, so it still means "committed in Datomic and recorded in
the acknowledged log". The value stops being answered at the commit, which is before the acknowledgement. So every read
that starts after the acknowledgement returns the marker, as 7.1 requires, and so does every read that starts after the
commit.

### 16.5 The log ahead of, behind, or missing relative to the data

| Relation | The log's boundary (today's per-account default, with this pass's fixes) | With the commit boundary |
| --- | --- | --- |
| The log and the data agree | served | served |
| A removal in flight (intent; declared; committed but not published) | served; writes it can reach 503 and complete it | the same |
| The log one behind with that removal pending in its copy (M1) | served; reads masked by that commit (the M1 fix below) | served from the data |
| The log behind the data, no intent for the missing removals, any number | every request 503 `RemovalLogBehind`; the rebuild route is the way out | served from the data; the next removal or the rebuild route appends the missing entries |
| A declaration past every commit with no intent (an earlier build; a copy put back from before the intent) | every request 503 `RemovalLogBehind`; moving back and forward clears it | served; the next removal releases it |
| The data behind the log (older data restored) | every request 503 `RemovalDataBehind` until the restore route | reads served, masked by the log; writes 503 `RemovalDataBehind` until the restore route |
| The log and the data disagree on an entry | not told apart (each side checked against itself only) | reads masked by both; writes 503 `RemovalLogConflict` |
| The log missing | every request 503, no way out before this pass | every request 503 `RemovalLogMissing`; the rebuild route with the policy writes it from the data |

**On the log's boundary this pass also fixes M1.** A pending removal that is already committed in the data takes
effect for requests (`served`), so a copy put back with it pending cannot answer its value again. This is the one case
of the commit boundary that the log's boundary needs to stay exact.

### 16.6 The rebuild route (both boundaries)

`POST /v2/db/{db}/removal-log-rebuild`, under the removal lock:

- **The data's records must be a dense chain:** sequences 1 to n, each previous seal right.
- **When the log exists:** it must agree with them up to its head. The missing entries are then appended, each with
  the text its publication would have written, and a pending intent of an appended removal is dropped.
- **When the log is missing:** it is written whole from the data. The body gives the policy
  (`{"attributes": [...], "sealed": bool}`), which must cover every removed value's attribute, and must say sealed if
  the data holds sealed values.
- **Refused** when the data is behind the log (the restore route does that) or when the two disagree.
- **This is the way out the third review found missing** (its "not tested" item 7): a log two or more removals behind,
  or lost.

### 16.7 What becomes impossible by construction, and what can be deleted

| Finding | With the commit boundary | Why |
| --- | --- | --- |
| N5 (a declaration released an account from a log behind the data) | impossible | a removal first appends the data's missing entries to the log (`catch-up!`), so the declaration's values are the data's; and requests are served from the data |
| E7 (counters behind the log once the right log was back) | impossible | the same: nothing is released from a log behind the data |
| M1 (a log copy with a pending removal answered the value again) | impossible | reads are masked by the commit; no copy of the log can unmask it |
| N1 (a block no gateway could see) | already impossible by the order of the steps (intent first); unchanged | the intent is always in the log before the declaration |

**Checks the option makes dead.** The log's boundary still needs them, and it stays the default until the owner
confirms. Each would be deleted if the option became the rule:

1. the `RemovalLogBehind` branch of `disagreement` and its three callers (the removal at `erase!`, `rebuild!`,
   `start-check!`);
2. `consistent?`'s comparison of the declared and committed sequences with the log;
3. `refuse-inconsistent!`'s refusal (it serves instead);
4. the M1 special case in `served`;
5. `typed-failure` for everything but a missing log;
6. the restore route's refusal of a log behind the data.

The declaration's own check (an earlier declaration at s is its own only if its intent was in the log) stays: it
protects against a lost lock, not against a lagging log.

### 16.8 The number of states

**Log and data relations the code tells apart, and what each does:**

| # | State | The log's boundary | The commit boundary |
| --- | --- | --- | --- |
| 1 | agree | serve | serve |
| 2 | intent only | serve; reachable writes 503 + complete | the same |
| 3 | intent and declaration | the same | the same |
| 4 | intent and commit | the same | the same |
| 5 | the log behind, a removal pending in its copy (M1) | serve, masked by the commit | serve (state 7) |
| 6 | the log behind by an intent-less declaration | refuse all | serve; release it |
| 7 | the log behind by one or more commits | refuse all | serve; catch up |
| 8 | the data behind the log | refuse all | serve reads; refuse writes |
| 9 | the log and the data disagree | not told apart | serve reads masked by both; refuse writes |
| 10 | the log missing | refuse all (now: until the rebuild route) | refuse all until the rebuild route |

**What the numbers say:**

- **On the log's boundary**, 5 of these 10 states refuse every request: 6, 7, 8, 10, plus the copy of state 5 two
  behind, which falls into 7.
- **On the commit boundary**, 1 does (10), and 2 refuse writes only (8, 9). States 5, 6 and 7 become one state, "the
  log lags the data", which is served and caught up.
- **States with a different behaviour each:** 7 on the log's boundary (serve; serve with the M1 mask; refuse
  LogBehind; refuse DataBehind; refuse missing; refuse after M1's two-behind; the M1 case) against 4 on the commit
  boundary (serve; serve and catch up; serve reads and refuse writes; refuse missing).
