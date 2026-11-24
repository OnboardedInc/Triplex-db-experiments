# Removal on request without stopping other accounts (DX-ERA2, 2026-11-24)

Builder DX-ERA2, branch `exp/DX-ERA2-removal-per-account` from `exp/DX-SCALE2-wide-thin` (`3e3e652b9`, which contains
the one branch `23b7df344`). Mac work is correctness and counts at toy size; every Mac time below is diagnostic.
Nothing ran on a server. One option, default off: `TX2_REMOVAL_PER_ACCOUNT=1`. All accounts stay in one Datomic
database. Datomic is not modified; the installed writer functions are unchanged.

RESULTS-PLACEHOLDER

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
| P6 | A request uses a cut the native data agrees with (no route serves a restored database before the removals are replayed) | per request: the native removal sequence equals the published one, or is one ahead by the removal being published; behind is synced once, then refused | yes |
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
  that started before that removal's publication (TARGETS section 7.1 allows the old value). A native sequence behind
  the published one is synced once (another gateway's removal not yet seen by this peer), then refused as today.
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
7. **Restore.** A Datomic copy older than the published log has a lower native removal sequence: after one sync it is
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
pending, checks the published log against the native sequence, installs three attributes and the fence function, writes
the counters derived from the log (parts of 1,000 entities; nothing reads them yet), then one transaction moves the
global sequence to its own attribute and sets the database-wide one to -1. `{"back": true}` moves it back (the counters
stay; they are ignored database-wide). Online: removals wait for the move (it holds their lock); a save prepared before
the move fails its fence once and is sent again; gateways must all run the option before the move (a gateway without it
refuses every request on a moved database).

**The sealed 1 billion database.** MIGRATION-PLACEHOLDER

## 9. Gates

All on the Mac, toy size; counts are results, times diagnostic. Evidence under `evidence/DX-ERA2/` (private).

**(a) Option off changes nothing.**

- **Paired native log** (`era2/paired.clj`, `gate.sh` phase `paired`): one fixed workload (4 accounts, saves on both
  writers, 3 removals, a ticketed derived write and a refused stale one, a refused import replay, history reads),
  unsealed (653 datoms) and sealed (698 datoms), run twice on the base gateway, once on this gateway with the option
  unset and once with it on but the database never moved. Every reply's status and code is identical in all four runs.
  The base is reproducible (both base runs identical after replacing clocks, random removal IDs, hashes and ciphertext);
  this gateway's log, option unset and option on, is identical to the base's in every datom written by saves, removals,
  frames and reads. **3 datoms differ, all in installed function texts**: the reader-generated argument names inside
  the commit function (`p1__2400#` against `p1__2516#`) and the per-subject writer function, and the source line
  numbers stored with that function. They change whenever gateway code that loads before them changes (here the new
  namespace), as on every branch; their behaviour is the same. Consequence: a database first opened by the base gateway
  gets its writer functions installed once more by this gateway (one transaction), with or without the option.
- **Gateway suites** (`selftest`, `group-test`, `ids-test`, `feed-test`, `pinned-test`, `recent-test`,
  `cache-key-test`, `commit-order-test`, `sweep-gates-test`, `trace-test`): 76 tests, 71,170 assertions, the same
  result on the base, on this gateway with the option unset and with it on: 0 failures, 1 error, the same error in all
  three (`feed-test` `http-route` reads a byte body as a string; it fails on the base too).
- **The existing removal regression** (ERASE1/ERASE2's 13 route checks, both writer modes, and the sealed witness):
  REGRESSION-PLACEHOLDER

**(b) The fault measurement with the option on**: section 0, table 2.

**(c) Adversarial cases, each deterministic** (`era2/gate.clj`, in-process: the gateway's own route handler, an
in-memory Datomic, a file removal authority; a save is paused after its cut was read and its data prepared, the step
runs, then the save commits). Every case checks that the removed value is never answered by current reads, history
reads, reads pinned before the removal, a Reach session that cached the subject at that pin, journal pages and the feed;
and that the native data holds no copy of it outside its own subject and journals (unsealed: masking keeps the native
bytes, as today) or **none at all** (sealed). Database-wide **360 checks, 0 failed**; per account **417 checks, 0
failed** (G5).

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

**(d) The sealed removal check**: REGRESSION-SEALED-PLACEHOLDER

**(e) The production exactness gate and the combined check with removals in three accounts at once**: the `three` cell
of the fault measurement (removals round-robin in three accounts at 10 per second, 7 other accounts saving, reading and
writing frames): EXACTNESS-PLACEHOLDER


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

PREDICTIONS-PLACEHOLDER


## 11. Not verified

NOTVERIFIED-PLACEHOLDER

## 12. Files and evidence

| File | What |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/removal_scope.clj` | The option, the account of an entity, the counters derived from the log, the fence function, the ticket check, the move's counters |
| `privacy.clj` | Counters in the cut (option on only); the prepared removal's sequence on an allow-pending cut; `ensure-ticket!`; `verify-data!` on a moved database; the sentinel fence value; account lock directories |
| `storage.clj` | The fence in a save's data on a moved database; the per-subject writer's expected value |
| `subject_save.clj` | The per-subject writer accepts the fence in its returned data (option on only) |
| `erase.clj` | The removal's transaction on a moved database; account locks; `request-cut`; the move route `per-account!` |
| `main.clj` | Routing on a moved database: the published cut while a removal is applied, account locks for named tickets, the move route, the frontier's per-account fields |
| `packages/datomic/src/erasure.ts`, `DatomicClient.ts` | `withDatomicErasureSequence(..., accounts)` sends `erasureAccounts` (absent: unchanged bytes) |
| `lab/bench/lib/datomic-erasure.ts` | `readErasure`, `recheckErasure`, `withErasure` take an optional account (absent: unchanged) |
| `lab/experiments/EXP-DX1/stack/up.sh` | `DX_ERASURE_SQL=1` (the PostgreSQL removal authority on a toy stack, a fresh wrapping key kept out of the evidence) and `DX_REMOVAL_PER_ACCOUNT` (both default unset) |
| `era2/fault.ts`, `era2/fault.sh` | The fault measurement (cells ACCOUNTS:RATE[:sealed|three|restart]; `DX_ERA2_GATEWAY_REF` runs the base gateway) and its adoption mode for the server |
| `era2/gate.clj`, `era2/paired.clj`, `era2/gate.sh` | The in-process interleavings, the paired native log, the gateway suites |
| `era2/server.sh` | The server run (written, not run) |

