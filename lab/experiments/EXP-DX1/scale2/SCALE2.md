# Many small accounts in the one database (DX-SCALE2, 2026-11-24)

Builder DX-SCALE2, branch `exp/DX-SCALE2-wide-thin` from `exp/DX-ACT7-settlement-1b-prep` (`82ba1ca38`) with
`exp/DX-XQ6-exact-sweep` (`909309c63`) merged in (no conflicts). Mac work is correctness and counts at toy size; every
Mac time below is diagnostic. Nothing here ran on a server. Every option is default off; no existing default changed.
All accounts stay in one Datomic database throughout.

## 1. Short answer

1. **The store itself does not grow with the number of accounts.** The gateways and the transactor keep no state per
   account (except the sweep's gates, fixed below), and at toy size the counted work of a save, a pinned or current read, a feed entry, an ID list and a sweep
   was the same at 563 and at 2,063 accounts (rows per save 5.4 to 5.7; a 5-subject account's ID list examined 5
   entries in both; every answer exact: 688,145 read rows, 2,295 feed entries, 627,279 final rows at 2,063 accounts).
   A tiny account's subject shares an index leaf with other accounts' subjects; that touches only cache use, never
   exactness or isolation (section 4).
2. **What grows badly is around Publish, and the worst of it is not fixed.** One account's Publish and enrolment
   commit only if **the whole database's head** has not moved since they read it (three tries, then they give up). In
   one database with other accounts saving, **3 of 3 Publishes and 3 of 3 enrolments were refused** on the toy. The
   held runner's measured Publishes (under one second) **paused and drained every account's saves** for each Publish;
   the product has no such pause, and with many accounts each Publish would stop every account. This is the change
   the many-accounts case needs first (proposal P8: ACT5's progress precondition applied to Publish and enrolment);
   it changes what the Publish record's position means, so it was not built here.
3. **Fixed, behind default-off options:** the SDK's ID list range check compared every pair of per-account ranges
   (6.6 s at 10,000 accounts, about 11 minutes at 100,000; now 63 ms at 100,000:
   `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS`); the settlement process opened about 13 connections to the gateways per
   settling account (670 for 50 accounts; now 69: `TRIPLEX_DATOMIC_SHARED_AGENT`); the sweep kept one gate per account
   ever swept (now none left: `TX2_SWEEP_GATE_EVICT`); and the enrolment's own writer check refused other accounts'
   commits (`TX2_ENROL_BESIDE_SAVES`, necessary for P8, not sufficient alone).
4. **Not fixed, proposals with their effect (section 7):** the settlement process holds about 0.4 MB per settling
   account (41 GB at 100,000); one removal sequence and lock for the whole database; every Publish copies the whole
   release document into each account (17 KB measured, up to 1.3 MB); 7 to 8 enrolment commits and about one notice
   frame per subject for small accounts; account metadata outside the account's prefix; no account filter on the feed;
   no "list accounts" (an account registry is proposed).
5. **The server test is written** (`scale2/server.sh`, section 8): 1,000 and 10,000 thin accounts (and an optional
   100,000) added to fresh copies of the sealed 1 billion database beside the ten deep accounts, 54 to 117 minutes,
   USD 1.00 to 2.15 for the two rungs, with predictions per priority. Its adoption mode passed a dry run on the Mac.

## 2. What exists today, and the test shape chosen

**The owner's scale target** (`lab/NORTH-STAR.md`, 2026-11-19, and `lab/V0.1.md`) asks for three populations in one
database: ten deep accounts, a few *wide* accounts (very many subjects with a few facts each) and small and mid-sized
accounts. "Wide thin" in the owner's wording is the wide account: many subjects, few facts. This task tests the other
axis the wording implies but nothing has measured: the *number of accounts*. The target's own counts are far below the
1,000 to 100,000 accounts tested here; the larger counts are headroom for growth (2026-11-19: "We're growing rapidly so
that is the scale we need").

**What the repository has for many accounts:**

| Piece | Where | State |
| --- | --- | --- |
| Small accounts as separate databases | `scale1/small-plan.ts` (`smallScope`: one scope per small account, 100 accounts of 100 or 2,000 subjects) | Superseded by the one-database rule; never measured as one database |
| A realistic seed: ten deep accounts, one wide thin account, small accounts, in ONE database | `real1/population.ts`, `real1/load.ts`, `real1/seal.ts` (REAL1, merged on `exp/DX-INT1`) | Built and toy-gated (5,600-subject toy). **Its wide and small accounts all live under `acct/real1/account-0NN/`**, so every per-account mechanism keyed on `acct/<account>/` (the write gateway's account turns, the ID list route, the sweep, the held settlement's names) sees them as **one account named `real1`** |
| A card step on that seed | `v01/realistic-plan.ts` (`realisticTape`: 80% of busy saves to deep accounts, 15% to the wide account, 5% to small accounts; a 3.5/s quiet stream in account 0) | Built (`a36c88e6c`, `55278014a` on the one branch); **never ran on a server** (stopped at a launch check on 2026-11-21, repaired, not rerun) |
| A tape over many accounts | none (`productionHeldTape` and the card's tapes are fixed at ten accounts: `Array.from({ length: 10 })`) | — |
| A result with more than ten accounts in one database | none | — |
| Held settlement for several accounts | `HeldSource.namespace` (ACT5), proven with 3 and 10 accounts (ACT7) | `DX_ACT5_ACCOUNTS` asserts 2 to 10; accounts must be the toy seed's own ten |

**The shape chosen** (`scale2/population.ts`, deterministic from a seed):

- **Deep accounts:** SCALE1's deep subject (about 160 facts), ten accounts (eight subjects each on the toy; the sealed
  database's 100,000 each on a server).
- **Thin accounts:** each under its own `acct/<account>/` prefix (unlike REAL1), sizes drawn 60% from 5 to 15
  subjects, 30% from 16 to 60, 10% from 61 to 200 (median about 14, mean about 30; invented, not taken from any
  production count). A thin subject is a root with four facts (account, member, status, team) and one form of six
  fields: ten facts in two entities.
- **Publishing accounts:** small accounts (5 to 12 subjects on the toy, 5 to 40 on a server) whose subjects are
  deep-shaped, because W0's release rules and the settlement oracle are defined on that shape.
- **Rungs:** 2,000 thin accounts on the toy; 1,000, 10,000 and (optional) 100,000 on a server, beside the ten deep ones.
- **Saves:** one commit per subject's save (the owner's decision of 2026-11-24): a thin save changes 1 to 6 form fields
  and, one save in three, the status (one commit over two entities); a deep save changes 5 to 17 form fields. About 40%
  of saves revisit a recently saved subject (the production study's 39% within 10 s); the rest pick any subject,
  accounts weighted by size. A busy deep account and a quiet thin account have their own streams.

## 3. Everything that is per account, ranked

Read from the code of this branch (gateways, transactor functions, SDK, the held settlement, the load harness), with a
count or a micro-measurement per item. "A" is the number of accounts in the database; "settling" counts only accounts
with a Publish being settled. Bytes and microseconds per account come from `scale2/micro.ts` (Mac, `micro-1.json`), the
miniature (`F1`: 2,063 accounts) or, where marked, from object sizes (not measured). Ranked by how badly they grow.

| # | Per-account thing | Where | Grows | Per account (how known) | At 1,000 | At 10,000 | At 100,000 | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **One account's Publish and enrolment need the whole database's head unchanged** | `actv-lazy/join/account.ts` `execute` (every joined command, Publish included, commits with `expected` = the head it read, retries 3 times, then "Joined command exhausted three serial predecessor attempts"); `installHeld` (the same, and its writer check `suffix`); `held-campaign.ts` near line 851 (the held runner **pauses and drains every account's saves** around each Publish) | Fails beside other accounts' writes; the pause the runner uses stops every account, once per Publish | F0: 3 of 3 Publishes beside the saves refused ("Joined command exhausted three serial predecessor attempts"); enrolment beside saves refused 3 of 3 without the option ("Unclassified native writer left the joined source open", F1, F0) and 3 of 3 with it ("Source changed at admission", F2) | each Publish stops all saves for its duration (or fails) | 10,000 Publishes an hour: about 5 to 10 minutes of whole-database save pause per hour at 30 to 60 ms each | 10 times that | **Not fixed** (proposal P8). Built: the writer-check half for enrolment (`TX2_ENROL_BESIDE_SAVES`, necessary, not sufficient) |
| 2 | **ID list ranges of a type, one per account: the range check compares every pair, and every page sorts them again** | `packages/datomic/src/idLists.ts` `validateIdListOptions`, `candidateIds` | O(A²) at start-up; O(A log A) per page | pairwise 90 ms at 1,000, 605 ms at 3,000, 6.6 s at 10,000 (micro) | 90 ms | 6.6 s | about 11 minutes (A² from the measured points) | **Fixed, option `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS=1`**: 0.5 ms / 2.6 ms / 63 ms, sort kept per type |
| 3 | **The settlement process holds one store per enrolled account and three per settling account, each with its own HTTP clients, agents and sockets** | `actv-lazy/store.ts` `openStore` (a Triples runtime, a composition, several `DatomicClient`s), `join/archive.ts` `Archive.open` (two more stores) | O(settling) memory and connections | heap 163 KB per enrolled account (slope 10 → 50 accounts, F1) plus 251 KB per account at settlement open; open TCP connections to the gateways: 6.9 per enrolled account, 6.4 more at settlement open (F1: 4 → 350 → 670 for 50 accounts) | 0.41 GB, 13,300 connections | 4.1 GB, 133,000 connections | 41 GB, 1.33 million connections | **Connections fixed, option `TRIPLEX_DATOMIC_SHARED_AGENT=1`** (one agent per process); memory: proposal P1 |
| 4 | **One removal sequence and one removal lock for the whole database** | `storage.clj` line 212 and `commit.clj` line 187: in a database with a removal policy every commit carries a compare-and-set of the database's one `erasure-seq`; `privacy.clj` `guard` (a PostgreSQL advisory lock keyed by the database) serialises removals and the guarded write path across gateways | Refusals and lock waits grow with A × removals per account | a removal on request in any account refuses the commits of every account then between their gateway's cut and the serial cut (each must be sent again), about (saves per second × commit time): 10 to 20 at 400 saves/s; which saves take the guarded path rather than the independent one was not traced here | small | about 10 times the 1,000 rate | about 100 times | Proposal P2 (removal sequence and lock per account) |
| 5 | **Publish writes the whole release document into every account** | `JoinedAccount.publish` (one commit per account, the release document in it) | O(A) bytes and writer time per release sent to all accounts | 17,158 bytes for the 20-forms, 20-policies release (F1, every account); up to about 1.3 MB at the definitions ceiling | 17 MB (1.3 GB at the ceiling) | 172 MB (13 GB) | 1.7 GB (130 GB) | Proposal P3 (store a release document once, Publish refers to it) |
| 6 | **Enrolment and settlement have a fixed cost per account** | `installHeld` (census copy, enrolment record), R1's notices, `Archive` frames close at the account's end | O(A) commits and frames | 7 to 8 commits to enrol an account (F1, every account); settlement frames per subject 1.09 to 1.20 for accounts of 5 to 12 subjects against 0.78 for a deep account of 512 (ACT7): about one notice frame per subject plus a value frame per 5 subjects | 8,000 commits | 80,000 | 800,000 (about 2.2 h of commits at 100/s) | Proposal P4 (lazy enrolment at first Publish; notice frames across subjects as ACT7 wrote) |
| 7 | **Sweep gates: one fair semaphore per account ever swept** | `sweep.clj` `account-gates` (a map that never shrinks) | O(A swept), forever | about 140 bytes (object sizes, not measured); count verified: 1,000 gates after sweeping 1,000 accounts (gate test), 65 after 65 (F1) | 0.14 MB | 1.4 MB | 14 MB | **Fixed, option `TX2_SWEEP_GATE_EVICT=1`** (a gate lives only while its account sweeps) |
| 8 | **An account's settlement metadata lives outside its prefix** | `store.ts` names `lazy/account/releases/<account>` and four more; documents under `notice:v1:<hash(scope, account)>:` | O(A) entities | 5 names plus its notice, settlement and control documents per publishing account | — | — | — | Proposal P5 (move or index them under `acct/<account>/`) |
| 9 | **The feed has no account filter** | `/v2/db/{db}/transactions` (`journal.clj` `page`) | O(A × saves) if each account follows its own changes | a consumer of one account reads every account's commits | 1,000 × | 10,000 × | 100,000 × | Proposal P6 (one follower that dispatches by prefix; the runtime's design) |
| 10 | **A type listed across accounts walks every account's range** | `idLists.ts` `candidateIds` | O(A) route calls per full walk | at least one ID list call per account, empty or not | 1,000 calls | 10,000 | 100,000 | Proposal P7 (per-account runtimes; a "list accounts" route) |
| 11 | Settlement turn queue | `join/bulk.ts` `BulkQueue`: `ready` (accounts with a frame ready), `turnsByKey` (one count per account ever served), `nextAt` (paced accounts) | O(ready) per turn; `turnsByKey` O(A) forever | 660 to 790 bytes per ready account; a turn's choice 2.5 to 18 µs up to 100,000 ready; 45 to 192 bytes per account served (micro) | 0.2 MB | 1.7 MB | 4.5 MB | Kept (bounded by the number of accounts; the counts are read by the checks) |
| 12 | The load harness's credits (the scorecard's ingress) | `prep1/rolling-credits.ts`, `fair-turns.ts`: one served count per account, a fairness window of A grants | O(A) small | 14 to 20 bytes per account; one dispatch 0.01 to 0.18 ms at any A | 20 KB | 140 KB | 1.4 MB | Kept |
| 13 | The write gateway's account turns | `group.clj` lane: `:accounts`, `:tails` hold only accounts with queued work (at most 256 pending, 128 per account) | O(1) in A | only when group commit or the priority policy is on | — | — | — | Nothing to do |
| 14 | Read admission, the ID list route's running set, caches, the transactor | `admission.clj` (one global fair queue), `ids.clj` `running` (removed after each request), object and entity caches keyed by segment or entity, `commit.clj` | O(1) in A | no per-account state | — | — | — | Nothing to do (but see section 4: no per-account share of the read queue or the caches) |
| 15 | Per-account rows of the deep shape | SCALE1 `person`: a directory entity per account, a page entity per 256 subjects | O(A) tiny | 2 entities per small account | — | — | — | Nothing to do |

**Start-up, Publish and maps that never shrink.** The gateways do no per-account work at start-up (no account
registry exists). The settlement process opens stores per account it settles (item 3). Each Publish is per account
(items 5 and 6). Maps keyed by account that never shrink: the sweep gates (item 7, fixed), the settlement queue's
`turnsByKey` and `nextAt` (item 11, small), and the SDK's ID list ranges (item 2, configuration). The quiet-account
measurement and the launch guard hold nothing per account (the harness names one quiet account by index).

**Two whole-database walks found on account paths, both outside the held mode.** `JoinedAccount.install` (the non-held
enrolment) and the dated-edit lookup (`account.ts` near line 973) walk the feed from position 0. In one database that is
every account's history per call. The held mode used for the one database does not call either (`Store.input` refuses
held stores), and nothing here changes them; any per-account path added later must not walk the database-wide feed.

## 4. What many thin accounts do to the layout

**Where a subject's rows sit.** In the lean layout an entity is upserted by its string ID (`:triplex.entity/id`,
unique) and gets a Datomic entity number from the default partition when first written (`storage.clj`: tempid
`"e:<entity>"`; no partition per account). Its row datoms (`:triplex.entity/row`) are on that number. So two indexes
matter, ordered differently:

- **AVET on the string ID**: ordered by `acct/<account>/...`, so one account's IDs are contiguous. XQ3 measured about
  6,400 IDs per storage read along this index.
- **EAVT on the entity number**: ordered by *when the entity was first written*, not by account. Entities created in
  one commit are adjacent; entities created at different times are interleaved with every other account's entities
  and with the per-commit journal entities. The XQ6 toy put about 65 subjects of 12 facts in one storage read, so a
  leaf holds on the order of 1,000 datoms. A thin subject here is two entities and about 14 datoms (rows, ID, revision),
  so about 70 thin subjects fit one leaf when they were created together.

**A save.** One commit per subject's save writes the subject's own entities (and a journal entity). It touches the
AVET leaf of its IDs (to resolve them), the EAVT leaves of its entities and the indexes' roots. None of this depends on
the number of accounts; the transactor keeps no per-account state (section 3, item 14). A thin account's save costs the
same as a deep account's save of the same width. The miniature's saves wrote the same rows per save at 563 and at 2,063
accounts (section 5).

**A pinned read.** One AVET lookup per ID plus the EAVT leaf (or two) holding the entity's datoms, as-of the position
(at an old position the history tree too, as RD1 found). For a thin account's subject, created with its account's
other subjects in one import, the leaf also holds about 70 other subjects, most of them other accounts' (a 5-subject
account always shares its leaf). That is **more** sharing than a deep account's subject (whose leaf neighbours are
mostly its own account's), and it does not matter for exactness or isolation: index segments never leave the gateway;
every read filters by entity and position; the ID list route walks only `acct/<account>/<prefix>` and checks every
returned ID against the account; the sweep reads only listed IDs (gate 2i of XQ6). It matters for the cache only: the
object cache is shared by all accounts with no per-account share, so a busy account (or a sweep, XQ6 section 4.2)
evicts a quiet account's leaves. A thin account read rarely finds its leaf cached; when it is read, it brings 70
neighbours with it, useful only if they are read soon. **Subjects of an account created over months** (an account
growing one hire at a time) are spread one per leaf: then a read of a whole thin account costs one leaf per subject.

**The ID list walk.** One AVET range per account: seek to `acct/<account>/pl:` and walk. The first page of a tiny account
examines exactly its own IDs: the miniature examined 5 entries for every 5-subject account and 200 for every 200-subject
account, at 563 and at 2,063 accounts alike (the seek does not pass other accounts). Cold, XQ3 measured 3 storage reads
for a first page (the index root, a directory, the leaf); a tiny account's whole list is in one leaf.

**Listing accounts.** No route lists accounts, and the product does not need one for saves, reads or Publish: the
application already knows its accounts (they are the customers that call it). What does need one: an operator's view
("which accounts have settlement in progress", ACT5 section 8), Publish to every account (someone must name the
accounts), moving or removing one account (P9), and the console. What would serve it, cheapest first: (a) a registry
entity per account written once at enrolment under a reserved prefix (`_triplex/accounts/<account>`), listed by the
existing ID list route with `account: "_system"`: O(A) entities, no gateway change; (b) a skip-scan of AVET from
`acct/`: after each account, seek past `acct/<account>/` (one seek, usually one leaf, per account), O(A) seeks and no
writes; (c) Datomic's own `:tenant/account` directory entity per account (the deep shape already has one) listed by a
pattern read: a scan, refused under `refuseScans`. (a) is the recommendation (proposal P7).

**The sweep.** Per account, over that account's listed subjects only; cost in proportion to the account's size and its
leaves (one to three leaves for a thin account created together, up to one per subject for one created over time),
independent of the number of other accounts. The miniature swept 65 accounts exactly (counts equal to the oracle).

**A release published to many accounts at once.** Publish is per account: each account has its own release list,
notice stream and settlement progress (`HeldSource.namespace`), so 10,000 accounts receiving one release are 10,000
Publishes, each one commit carrying the whole release document (17,158 bytes for the 20-forms release, measured; up to
about 1.3 MB at the definitions ceiling), then each account's settlement. **What 10,000 Publishes in an hour cost the
single writer**, from the measured sizes and S1's server size ladder (serial apply 3.9 ms for a 26 KB commit, not
measured for Publish commits): the Publish commits themselves 10,000 × about 3 to 5 ms = 30 to 50 s of writer time per
hour (1 to 1.4%) at 17 KB, and on the order of 10,000 × 100 to 200 ms = 17 to 33 minutes per hour (28 to 55%) at the 1.3
MB ceiling (an extrapolation: no commit near 1.3 MB has been measured). Then settlement: at about 1.1 frames per
subject for small accounts (section 5) and a median of about 14 subjects, about 15 frames per account, 150,000 frames for
10,000 accounts, at 40 to 65 frames per second one at a time (ACT5's figure): **40 to 60 minutes of settlement
turns**, about 5 to 9 minutes of real writer work (2 to 3.5 ms per frame, ACT7). Enrolment, if done at first Publish, adds
7 to 8 commits per account (80,000 commits). So 10,000 small-account Publishes fit in an hour beside live saves only at
the release sizes measured; at the ceiling the release document has to be stored once (P3).

## 5. The miniature (Mac, toy size, counts exact)

`scale2/mini.sh` under one ordinary heavy token: a fresh toy stack in the lab VM (laptop profile, the held toy's
write-gateway switches, the ID list route and the sweep on the read gateway), then `scale2/mini.ts`. One database per
run. The oracle for every subject is the generator plus every acknowledged save (regenerated per subject when needed);
the settled releases are checked by ACT7's streamed check, one account at a time. Three final runs:

- **F1**: 2,063 accounts (10 deep, 53 publishing, 2,000 thin), every option off;
- **F0**: 563 accounts (the same, 500 thin), every option off, plus Publish beside saves in 3 accounts and the adoption
  dry run of the server test;
- **F2**: 563 accounts, the options on (`TRIPLEX_DATOMIC_SHARED_AGENT`, `TX2_SWEEP_GATE_EVICT`, `TX2_ENROL_BESIDE_SAVES`).

Each: a 10 s quiet-account baseline alone, then a 40 s tape (40 saves/s spread over every account by size with 40% revisits,
15/s busy deep account, 2/s quiet thin account; the Mac stretched it to 125 to 152 s), 6 readers checking every answer,
a feed follower, and 50 publishing accounts settling the 20-forms release at once through one queue under the
progress precondition. **Everything exact in all three runs.**

| Count (exact) | F1: 2,063 accounts | F0: 563 accounts | F2: 563, options on |
| --- | --- | --- | --- |
| Subjects / facts loaded (each subject one commit position) | 61,669 / 683,764 | 16,324 / 230,314 | 16,324 / 230,314 |
| Saves acknowledged / refused / lost replies | 2,319 / 0 / 0 | 2,321 / 0 / 0 | 2,388 / 0 / 0 |
| Accounts that took saves in the window | 621 | 359 | 360 |
| Rows per save (one commit per subject's save) | 5.42 | 5.52 | 5.72 |
| Pinned / current reads checked against the oracle; rows compared | 33,962 / 33,643; 688,145 | 20,710 / 20,354; 437,550 | 29,433 / 29,062; 623,186 |
| Feed: saves found once, at their receipt position, in order per subject | 2,295 of 2,295 | 2,297 of 2,297 | 2,364 of 2,364 |
| Final read of every subject's root and form at the last position (rows) | 627,279 in 2,063 accounts | 173,829 in 563 | 173,829 in 563 |
| ID lists: accounts / IDs equal to the generator / entries examined | 65 / 2,887 / 3,128 | 64 / 1,856 / 2,127 | 64 / 1,856 / 2,127 |
| A 5-subject account's list: entries examined | 5 | 5 | 5 |
| Sweeps: accounts / subjects read / count equal to the oracle | 65 / 2,887 / 1,082 | 64 / 1,856 / 751 | 64 / 1,856 / 747 |
| Sweep gates left in the read gateway afterwards | 65 | 64 | **0** |
| Publishing accounts settled at once / frames value + notice / refused | 50 / 121 + 462 / 0 | 47 / 114 + 439 / 0 | 50 / 121 + 462 / 0 |
| Settled changes / notices equal to the W0 oracle and the independent form rule | 29,820 / 10,605 | 28,284 / 10,059 | 29,820 / 10,605 |
| Frames per subject (accounts of 5 to 12 subjects) | 1.09 to 1.20 | the same | the same |
| Enrolment commits per account; Publish record bytes | 7 to 8; 17,158 | 7 to 8; 17,158 | 7 to 8; 17,158 |
| **Publish beside the saves** (3 accounts) | — | **3 of 3 refused**: "Joined command exhausted three serial predecessor attempts" (0.7 to 2.5 s) | — |
| **Enrolment beside the saves** (3 accounts) | **3 of 3 refused** (writer check) | **3 of 3 refused** (writer check) | **3 of 3 refused** ("Source changed at admission": the head precondition) |
| Settlement process: heap per enrolled account (slope over 10 to 50 accounts) | 163 KB | 174 KB | 147 KB |
| Open connections to the gateways: start / 50 enrolled / 50 settling | 4 / 350 / 670 | 4 / 349 / — | **4 / 4 / 69** |
| Gateways' resident memory before load / after load / after the window, MB (diagnostic) | not recorded | write 229 / 361 / 614; read 226 / 227 / 382 | write 230 / 347 / 581; read 228 / 229 / 394 |

**What grew with the number of accounts** (563 against 2,063, options off): nothing in the counted work of a save, a
read, a feed entry, an ID list or a sweep. Rows per save, entries examined per account's list, subjects read per sweep,
frames per subject and enrolment commits per account were the same; a tiny account's list examined its own 5 IDs in
both. What grew: sweep gates with the accounts swept (65 and 64, kept for ever; 0 with the option), and the settlement
process's heap and connections with the accounts it holds (not with the accounts in the database). Diagnostic only
(Mac, shared VM, one run each): save p50 320 to 520 ms in every run (the VM, not the accounts: the quiet account alone
was 23 to 27 ms p50); feed lag p50 17 to 23 ms; the gateways' memory followed the data loaded, not the accounts.

**The adoption dry run** (`D1`): the server test's adoption mode (`DX_SCALE2_ADOPT`) on the toy's own database, used
as the sealed one: a first run (74 accounts) builds it; the second adopts it, knows its ten deep accounts only by
reading them, adds 4 publishing and 60 thin accounts (19,996 facts), and runs the window: 1,172 saves acknowledged, 0
refused; 18,866 rows of final reads exact (every new subject and every deep subject it touched); 4 accounts settled
exactly (5 to 12 subjects, 0 refused). **Pass.** An earlier attempt on F0's database first met its own fault (the save
IDs of the two runs collided: every command ID now carries a run nonce) and then a restart of the toy write gateway
(its container at 630 of 640 MB after three runs' data; cause not recorded); D1 ran on a fresh stack.

## 6. Built, all default off

| Option | Default | What it changes | Proof |
| --- | --- | --- | --- |
| `TX2_ENROL_BESIDE_SAVES=1` (`actv-lazy/join/account.ts` `suffix`) | off: as before | A namespaced account's enrolment also accepts a commit in its enrolment window when none of the commit's changes touches its own enrolment documents, its account's data (`acct/<account>/`) or its metadata names. A commit that does still stops it. **Partial:** it removes the writer-check refusal only; enrolment's own commits still require the database head (P8). | Miniature: off, 3 of 3 late enrolments refused by the writer check (F1, F0); on, 3 of 3 refused one step later by the head precondition ("Source changed at admission", F2). Every other check of section 5 passed with it on |
| `TRIPLEX_DATOMIC_SHARED_AGENT=1` (`packages/datomic/src/DatomicClient.ts`) | off: one HTTP agent per client | Every `DatomicClient` of the process shares one keep-alive agent with the same limits (512 sockets); `close()` leaves it open. Transport only: requests, replies and caches unchanged. | Miniature: open TCP connections to the gateways with it on: 4 before and 4 after enrolling 50 accounts, 69 once 50 accounts settle at once (F2); with it off: 4, 350 and 670 (F1); every check passed |
| `TX2_SWEEP_GATE_EVICT=1` (`sweep.clj`; `DX_SWEEP_GATE_EVICT` in `stack/up.sh`) | off: one gate per account ever swept | An account's gate is created when its first sweep joins and removed by the last one to leave (counted inside `ConcurrentHashMap.compute`), so it never has two gates and the per-account limit is unchanged. Scan statistics show `sweepGates` when the sweep is on. | Gate test (`sweep_gates_test.clj`, 4 tests): 1,000 accounts swept leave 1,000 gates off and 0 on; a second sweep of a busy account is still refused (`SweepBusy`) and the gate goes when the account's sweep ends; 16 threads × 300 sweeps on 3 accounts: never two holders of one account, 0 gates left. Gateway suites with it on and off: 34 tests, 70,629 assertions, 0 failures each (`gates-1`). Miniature: after sweeping 64 accounts, 0 gates left with it on (F2) against 65 left after 65 accounts with it off (F1); every sweep count exact in both |
| `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS=1` (`packages/datomic/src/idLists.ts`) | off: pairwise check, sort per page | The range check sorts the starts once and compares neighbours (same decision: if a start lies inside another, the other's sorted successor does too); the sorted ranges are kept per options object and type. | `id-lists-many.test.ts`: 2,000 random rosters decided identically with and without (over 100 of them refused, so the test can fail); 100,000 ranges checked in 63 ms; the existing ID list tests pass (6 of 6); `tsc` clean |

## 7. Proposals not built, with their expected effect

| # | Proposal | Expected effect | Why not built here |
| --- | --- | --- | --- |
| P1 | **One settlement store per process, shared by every account**: the account's names become a parameter of each call instead of a property of a store; open an account's workers only while it owes work and close them after | Heap per settling account from about 414 KB to the account's own frame state (a few KB); start-up of a settlement process no longer O(A) stores | `store.ts`, `archive.ts`, `account.ts` are ACT5's and the release-limits builder's files and the change touches every settlement path |
| P2 | **Removal sequence and removal lock per account** (the compare-and-set on an account's own removal entity; the advisory lock keyed by account) | A removal in one account no longer refuses or waits other accounts' commits; refusals stop growing with A | A transactor-function and gateway change on the removal path, which ERASE1 proved as a whole; needs its own exactness gates |
| P3 | **A release document stored once** (content-addressed by its SHA-256), each account's Publish writing only the reference and its own decision | Publish bytes per account from 17 KB (up to 1.3 MB) to about 200 bytes; 10,000 Publishes at the ceiling from 13 GB and 17 to 33 writer minutes per hour to about 2 MB and under a minute | The Publish record is the durable record the 1-second bar rests on; changing its shape needs ACT3's checks rerun |
| P4 | **Enrol at first Publish, and fewer fixed frames per small account** (one enrolment commit holding the census of a small account; ACT7's one-op ledger change and compact notice record) | Enrolment from 7 to 8 commits to 1 to 2 per small account; notice frames for a 5-subject account from 5 to 1 or 2 | ACT7 forwarded the notice changes to the release-limits builder, who owns `recorded.ts` |
| P5 | **Account metadata under the account's prefix** (`acct/<account>/_triplex/...` for names and documents) | An account's whole state is one ID range: listable, movable and removable by prefix | Renames the held names every existing run uses |
| P6 | **One feed follower per runtime, dispatching by account prefix** (or an account filter on the journal route that still walks once) | Feed reads stay O(saves), not O(A × saves) | A runtime design choice, not a store change; the store already gives every change's entity ID |
| P8 | **Publish and enrolment guarded by the account's own state instead of the database head** (ACT5's progress precondition, applied to the joined commands: an entity guard on the account's release list, clock, origin, removal marks and notice tail; the Publish record states the position it actually landed at, and `sourceBefore` becomes "the account's own state unchanged since", not "the position just before") | A Publish and an enrolment land beside every other account's saves and settlement without any pause; no whole-database gate in front of the writers; 10,000 Publishes an hour cost only their own commits | It changes what the durable Publish record means (its position is no longer "head + 1"), which the one-second bar, the notice events (`ownedCommand`), the oracle and ACT3's checks all rest on. It is the change the many-accounts case needs first |
| P7 | **An account registry** (`_triplex/accounts/<account>`, written once at enrolment) listed by the existing ID list route under `_system` | "List accounts" in pages, O(A) entities, no gateway change; a type spanning accounts can then list accounts first and skip empty ones | No product route asks for it yet |

## 8. The server test (for the day a machine is rented)

**How the small accounts get into the sealed 1 billion database.** They are added at the start of each rung by
`scale2/mini.ts` in adoption mode (`DX_SCALE2_ADOPT`), on a fresh working copy of the sealed cluster made by
`demo/server-up.sh --reset` (a byte copy and the demo's identity checks, as XQ3 and XQ6's server commands). The ten deep
accounts are the sealed ones (100,000 subjects each); the run's oracle learns a deep subject from one read at the run's
start position the first time it touches it (the runner is the only writer during the run), and regenerates every small
account's subjects from the generator. Each subject's facts are one commit inside its account (up to 1,000 rows per
commit, 8 commits in flight). **No sealed copy with small accounts is needed** for the 1,000 and 10,000 rungs: they load
in minutes onto each fresh copy. A sealed copy pays only if the 100,000 rung is run more than once (about 30 million
facts and 22 GB more in PostgreSQL at SCALE1's 723 bytes per fact; about 200 GB as one archive, about USD 3 a month at
R2's rate, 10 to 25 minutes to upload). The adoption mode ran on the Mac in a dry run (section 5, `F0/adopt`).

**The command** (one rented server with the sealed 1 billion cluster and its handoff, as the demo's server bring-up;
`COMMIT` is the head of `exp/DX-SCALE2-wide-thin` carrying this page):

```sh
cd "$REPO" && git checkout "$COMMIT"
sudo env DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" \
  bash lab/experiments/EXP-DX1/scale2/server.sh /var/tmp/scale2 1k 10k
# optional, only if the first two say so:  ... server.sh /var/tmp/scale2-100k 100k
```

Each rung (`scale2/server.sh`): `demo/server-up.sh --reset` with the ID list route, the sweep (2 permits, gates
evicted) and the held write-gateway switches; then `mini.ts` with the branch's options on (shared agent, enrolment
beside saves, bounded journal pages, loader position rows accepted); then `demo/server-down.sh`. The rung's shape:

| Rung | Thin accounts | Publishing accounts (5 to 40 deep-shaped subjects) | Enrolled during the window | Saves (600 s window) | Readers |
| --- | --- | --- | --- | --- | --- |
| 1k | 1,000 (about 30,000 subjects) | 200 | 10 | 40/s spread (35% to small accounts), 8/s busy deep account, 1/s quiet thin account: about 49 saves/s, about 430 rows/s | 32 closed-loop, half pinned at a recent receipt, half at least the subject's last receipt |
| 10k | 10,000 (about 300,000) | 500 | 10 | same | same |
| 100k (optional) | 100,000 (about 3 million) | 1,000 | 10 | same | same |

**Durations and cost** (USD 1.09 per machine hour; nothing here has run; the server figures are scaled from the Mac
counts and the 2026-11-23 server measurements named in each line):

| Step | 1k rung | 10k rung | 100k rung |
| --- | --- | --- | --- |
| Bring-up (`--reset`: copy, start, checks; XQ6's figure) | 5 to 12 min | 5 to 12 min | 5 to 12 min |
| Load (0.9 / 4.5 / 35 million facts at 4,000 to 20,000 facts/s; the paced import measured 3,266 to 3,671 under live load in 32-fact frames) | 1 to 4 min | 4 to 19 min | 30 to 145 min |
| Enrolment (7 to 8 commits each; Mac p50 0.52 s per account) and Publish | 1 to 2 min | 2 to 5 min | 4 to 10 min |
| Window (settlement inside it) | 10 min | 10 min | 10 min |
| Checks (final reads, feed, ID lists of the ten deep accounts and 50 small ones, sweeps, settled releases account by account) | 5 to 13 min | 11 to 30 min | 30 to 80 min |
| **Rung** | **22 to 41 min** | **32 to 76 min** | **79 to 257 min** |
| **Cost** | **USD 0.40 to 0.75** | **USD 0.60 to 1.40** | **USD 1.45 to 4.70** |

With the 1 billion cluster already fetched and the build done by the session's step 1, the two rungs take 54 to 117
minutes, **USD 1.00 to 2.15**. Fetching and building first adds 25 to 50 minutes (RUN2's figures), USD 0.45 to 0.90.

**Predictions** (written before any run; Mac counts are exact, every server figure an estimate) **and what shows each
wrong:**

| Priority | Quantity | 1k rung | 10k rung | Wrong if |
| --- | --- | --- | --- | --- |
| Correctness (floor) | Every final read, pinned and current read, feed entry, ID list, sweep count, settled change, notice and ledger equal to the oracle | all equal | all equal | any difference (stop: nothing here may ship) |
| P2 saves | Small-account saves (1 to 7 rows) p50 / p99 | 5 to 12 ms / 30 to 60 ms | the same within 1.2 times | the 10k rung's p99 above 1.3 times the 1k rung's (something on the commit path grows with A) |
| P2 saves | Busy deep account p99 | 40 to 65 ms (production-S at 1 billion: 41 to 45 ms second half) | the same within 1.2 times | as above |
| P6 quiet account | Quiet thin account, loaded p99 against alone | at or under 50 ms (the bar's absolute clause); alone 10 to 25 ms | the same | over 50 ms and over 1.25 times alone |
| P1 pinned reads | p99 of the 32 readers (random subjects of any account, uncached at 1 billion, the demo's one-core reader) | 60 to 150 ms | within 1.2 times the 1k rung | above 1.3 times (the shared cache or the AVET walk grows with A) |
| P3 feed | Lag p99, every save once in order | 20 to 100 ms; 0 gaps | the same | over 250 ms or any gap |
| P5 Publish | 200 / 500 Publishes of the 20-forms release, back to back (17 KB each) | p50 15 to 40 ms each; 3 to 8 s in all | 8 to 20 s in all | p50 over 80 ms |
| P5 settlement | Accounts settling at once beside the saves, under the progress precondition | about 4,400 frames (1.1 per subject, about 20 subjects per account), 70 to 110 s, 0 refused; every account finishes in the last 20% of the settlement time | about 11,000 frames, 2.8 to 4.6 min, 0 refused; the same | any refused frame; an account finishing before 50% of the time or after the last by more than 20% (unfair turns); frames per subject outside 1.0 to 1.3 |
| P5 enrolment | 10 accounts enrolled during the window (`TX2_ENROL_BESIDE_SAVES=1`) | 10 of 10, 7 to 8 commits each | 10 of 10 | any refused |
| P7 idle cost | Gateway resident memory added by the small accounts (after load against before) | under 100 MB (data in caches, no per-account state) | under 300 MB | over 1 KB per account on either gateway beyond the cache |
| P7 idle cost | Settlement runner: heap per settling account; open connections to the gateways (shared agent) | 0.2 to 0.5 MB; under 100 connections | the same per account; under 100 | connections growing with accounts (the option did not take) |
| — | Sweep gates left after the run (evicted) | 0 | 0 | any |
| — | ID list of a thin account: entries examined / first page cold | its own subjects (5 to 200) / 5 to 30 ms | the same | more entries than subjects (the walk passes other accounts) |
| P8 import | Load rate of the small accounts (no live traffic during the load) | 4,000 to 20,000 facts/s | the same | under 3,000 facts/s (the import bar) |

What these rungs do **not** measure: the bars at the card's 256 readers (the card does that; this measures the
change between rungs), failover (P9) and settlement of a large release in deep accounts beside the small ones (ACT7's
run 2).

## 9. Not verified

- **Nothing at full size, nothing on a server.** Every count is from the toy (at most 2,063 accounts, 61,000 thin
  subjects); every Mac time is diagnostic (the lab VM was shared with other builders' stacks at 85 to 214% CPU during
  the runs). The values at 10,000 and 100,000 accounts in section 3 are the measured per-account bytes and counts
  multiplied out, and the A-squared range check is extrapolated from 1,000, 3,000 and 10,000.
- **Bytes per sweep gate** are from object sizes (the gateway image has no `jcmd`); the count of gates is measured.
- **The removal path (item 4)** is read from the code: which saves take the guarded write path rather than the
  independent one was not traced, and no removal ran in the miniature.
- **Publish and settlement cost at the release ceiling (1.3 MB)** is extrapolated; no Publish near that size ran.
- **The 1 billion bundle's deep subjects** are learnt by reading them in adoption mode, not checked against AGE1's tape
  (ACT7's oracle does that for its own run). A wrong read of an untouched field at the run's start would agree with
  itself; every field this run saves is checked exactly.
- **One settlement process** settles every publishing account, as in ACT5 and ACT7; several processes are not covered.
- **The held ledger's writer check** (`verifyThrough`) is replaced in this runner by the oracle checks: every stored
  value, notice, ledger and read is compared, but a stray writer outside the checked entities would not be noticed.
- **Saves here are raw commits** (one per subject's save, retracting the old rows), not through the Triplex runtime;
  publishing accounts take no saves before their Publish (so the oracle's history is empty there), and the accounts
  enrolled during the window take none at all.
- **The adoption dry run** used the toy's own database as "sealed", not the 1 billion bundle; the demo bring-up on a
  server is XQ3's and XQ6's, not rerun here. `server.sh` itself has not run anywhere (it needs the server's demo stack).
- **The Mac runs were stretched** (a 40 s tape took 125 to 152 s on the shared VM); the toy write gateway restarted once
  in a third run on one database (section 5); no run here measured a latency.

## 10. Files and evidence

| File | What |
| --- | --- |
| `scale2/population.ts` | The roster and every subject's facts, seeded |
| `scale2/mini.ts`, `scale2/mini.sh` | The miniature and its stack; adoption mode for the server; `DX_SCALE2_ADOPT_DRYRUN` |
| `scale2/server.sh` | The server test, rungs 1k, 10k, 100k |
| `scale2/micro.ts`, `scale2/heap-diff.ts` | Micro-measurements; heap snapshot difference by constructor |
| `scale2/gates-test.sh` | Gateway suites with the sweep gate test, both settings |
| `packages/datomic/gateway/src/triplex/gateway/sweep.clj`, `sweep_gates_test.clj`, `main.clj` | `TX2_SWEEP_GATE_EVICT`; gate count in scan statistics |
| `packages/datomic/src/idLists.ts`, `test/id-lists-many.test.ts` | `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS` |
| `packages/datomic/src/DatomicClient.ts` | `TRIPLEX_DATOMIC_SHARED_AGENT` |
| `actv-lazy/join/account.ts` | `TX2_ENROL_BESIDE_SAVES` |
| `stack/up.sh` | `DX_SWEEP_GATE_EVICT` pass-through |

Evidence (private, `evidence/DX-SCALE2/`, compressed): `F1` (2,063 accounts, options off), `F0` (563 accounts, options
off, Publish beside saves; its adoption attempts), `F2` (563 accounts, options on), `D1` (the adoption dry run), `gates-1`, `micro-1.json`, `t1` to `t4` (trials while
building; `t3/heap-diff.json` names what an enrolled account holds). SHA-256 (first 12): `F1.tar.gz` `b9f82eb044a6`,
`F0.tar.gz` `7e3f33e27eb8`, `F2.tar.gz` `e2ae58479fa7`, `D1.tar.gz` `b5e477ab55e4`, `gates-1.tar.gz` `fd3c781ba747`,
`micro-1.json` `77d7d83c0712`.
