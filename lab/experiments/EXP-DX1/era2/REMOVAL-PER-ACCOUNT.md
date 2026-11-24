# Removal on request without stopping other accounts (DX-ERA2, 2026-11-24)

Builder DX-ERA2, branch `exp/DX-ERA2-removal-per-account` from `exp/DX-SCALE2-wide-thin` (`3e3e652b9`, which contains
the one branch `23b7df344`). Mac work is correctness and counts at toy size; every Mac time below is diagnostic.
Nothing ran on a server. One option, default off: `TX2_REMOVAL_PER_ACCOUNT=1`. All accounts stay in one Datomic
database. Datomic is not modified; the installed writer functions' code is unchanged (their stored texts differ only in
reader-generated names, section 9).

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
took 63 tries and 15 s in the gateway at 30 saves per second. The retry loop has no bound. This is the open cost of the
change (section 11, item 3; prediction 8). The option-off column also repeats Table 1 on this branch's own code: with the
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
- **A removal** commits, in its one transaction: the database-wide fence on -1 (unchanged), `cas removal-seq s-1 s`,
  and the counters of every entity and account its identities belong to. It holds the database's lock (removals stay
  one ordered log) and the locks of the accounts its selectors can reach.
- **A save** carries the installed writers' database-wide fence on -1 (always true, so the installed functions are
  unchanged) and one fence: each entity it writes must have the counter value of the save's cut. A removal elsewhere
  never moves those counters.
- **A derived write with a ticket naming accounts** takes those accounts' locks (not the database's), is checked
  against them (no removal after the ticket in a named account or in "") and adds them to its fence. A ticket without
  accounts is checked database-wide under the database's lock, as today.
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
5. **A derived write cannot re-materialise a value of R.** Its ticket names the accounts it read; R moves the counter of
   every account in A before or with its publication (same native transaction as its sequence). The ticket is checked
   against the published cut under the named accounts' locks, and the fence re-checks the named accounts at the serial
   point (a removal that took the account's lock after a timed-out request is still caught). A ticket naming no account
   is checked database-wide, as today. Exactness here rests on the ticket naming every account its inputs came from,
   exactly as today's ticket rests on its sequence being the one its inputs were read at (section 5, case 1).
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
   (never negative): a gateway without the option refuses every request on it (503) and its removal's
   `cas erasure-seq` fails. A save prepared under one mode and committed after a move fails its fence once (the
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
5. **The removal's own "head has not moved" check** stays database-wide (P9): it retries the removal, it never refuses
   another account's work.

## 6. The lock

Removals keep the database's lock among themselves (one log, one pending intent). A removal also takes the lock of each
account its selectors can reach (`removal-scope/lock-name`), after the database's lock, in sorted order. A derived write
that names its accounts takes only those accounts' locks, in sorted order, and never the database's, so no wait cycle is
possible. Plain saves take no lock. Left on the database's lock: tickets without accounts, cross-database delivery, and
sealed databases on the file key store.

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
checks 1 to 3 min each: 40 to 60 min per arm, **80 to 120 min for both arms, USD 1.45 to 2.20** (plus USD 0.45 to 0.90
for a first build).

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
| 8 | on against off, removal latency | higher in arm on: other saves no longer pause, so the removal's own database-wide "head has not moved" check (P9) fails more often. Mean tries = e^(C x w), C = all commits per second (about 225), w = the selection-to-serial-point window: w 5 to 15 ms gives 3 to 30 tries. 0.2 per second: p50 under 300 ms, p99 under 2 s. 10 per second: removals queue on the database's lock if tries x try time exceeds 100 ms | Mac at 30 saves per second: per account mean 1.7 to 5.2 tries, max 63; database-wide at most 3 (section 0) | 10 per second with p99 under 1 s (P9 is then no problem at server rates), or a backlog that grows through the cell (removals starve: P9 must be narrowed before such rates, section 11) |
| 9 | on, the move | under 5 s at the head of the 1 billion copy; 0 to 2 refused saves at the switch | section 8 | over 60 s, or refusals after the switch |


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
   pause for it. The retry loop has no bound. Narrowing it needs the removal to take its log position at the serial
   point (today its journal rows carry the position it selected at): a change to the journal entry, not built.
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
| A settlement frame materializing a value in that window | cannot commit in the window: the removal holds the database's lock and the lock of every account its selectors reach for its whole run, and ticketed writes take those locks (a ticket naming no account takes the database's). A frame writing the subject itself carries the subject's fence. Unchanged |
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

- **at most 4 tries** (2 narrow, then at most 2 under the guard), one guard commit;
- a hard stop at 5 tries answers 503 and leaves the removal pending, its subjects guarded, resumable with the same
  command (a resumed removal finds its guard by the negative counters);
- **worst-case time to remove**, under any save rate: the wait for earlier removals on the database's lock, plus at
  most 5 tries and 1 guard commit, each bounded by the gateway's own timeouts (sync 2 s, commit 5 s): at most
  5 x 7 s + 5 s = 40 s before it answers (done, or 503 and resumable).

A guard taken and then stopped (gateway killed) keeps the subject's saves refused until the removal is resumed, as a
removal stopped after its native commit does today.

### 13.4 Proof that no removed value survives or reappears

Sections 4.1 to 4.10 hold unchanged except item 9's selection (P9), which becomes: R's identities are those of its
named subjects at R's serial point, because no datom any selector reads changed between R's selection and its serial
point (the installed check), and other datoms cannot enter the selection. After R's commit, every entity R names (with
or without a row) has a moved counter, so no write prepared before R can write it (fence); after R's publication every
route masks R's identities. Under the guard, no fenced write of R's subjects commits until R does.
