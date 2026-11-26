# Adversarial review of the two pinned-read options (DX-RD6, first review)

Reviewer's page, branch `exp/DX-RD6-pinned-read-review` from the one branch `origin/exp/DX-INT1` at `345f833e4`.
Written __WRITTEN__ by the review agent. Every count below is a result; every time is a Mac diagnostic. Nothing here
changes the code under review: the tests redefine the two option vars in one JVM, or start separate gateways with the
options set.

Options under review:

- `TX2_PINNED_CUT_LOOKUP` (`group_cut.clj` `member-at`): finds a grouped-save position on the current database and
  accepts it when its assertion is at or before the view's t, instead of the lookup on the past view.
- `TX2_PINNED_SHORTCUT` (`pinned.clj` `current-eid` and `unchanged-since?`, the latter replaced at load by
  `cross_index.clj` line 318 with the same rule plus "index entries do not count"): answers a named subject from the
  current database when its revision is at or below the pin and every current datom of it was asserted at or before
  the pin.

Proposal reviewed: `srv2/PREP.md` section 2 on `origin/exp/DX-SRV2-session-prep` at `957a4f836`.

## Verdict

__VERDICT__

## Heads

| Head | What landed | Gateway sources against `345f833e4` | Retracting paths |
| --- | --- | --- | --- |
| `345f833e4` | reviewed | — | the list in section 1 |
| `2ce636613` | the Publish line (`a6f89a409`), every option and setting off | identical (`git diff 345f833e4 2ce636613 -- packages/datomic/gateway` is empty; one message change in `DatomicStorageAdapter.ts`) | unchanged; the Publish line writes only through the SDK's transact route (`actv-lazy/store.ts` `commit`, `h.triples.transact`), so its settlement, ledgers and retired-item archive reach the same gateway writers as every other save |
__LATER_HEADS__

## 1. Every path that retracts

The short-cut is wrong at a pin exactly when, after the pin, a transaction retracts a datom of the subject that a read
uses (`:triplex.entity/row`, `:triplex.entity/retired`, `:triplex.owner/root`, the legacy overflow flag) and asserts no
datom on that subject other than an index entry. The cut lookup is wrong exactly when a grouped-save position
(`:triplex.group/position`, unique value) is retracted, or asserted again on another entity after a retraction.

| Path | Where (`345f833e4`) | What it retracts | Same transaction asserts on that subject |
| --- | --- | --- | --- |
| General writer: retirement, retirement alone, correction of a past value, valid-time save, import frame, several owners | `storage.clj` 303–316 (`:triplex/retract` per old row), expanded in `commit.clj` 278–297 (`[:db/retract e :triplex.entity/row text]`, `e` from the row's own subject ID) | the subject's row | yes: `storage.clj` 320 asserts `:triplex.entity/rev` at the save's position on every entity with a fresh or old row, resolved to the same entity; a timed or born-retired retirement also asserts a marker (294, 308) |
| Per-subject writer (one owner) | `subject_save.clj` 258 (`render-ops`) | the owner's row | yes: `revision-update`, 151–152 (`[:db/cas owner :triplex.entity/rev revision final]`, or the narrow form) in the stored function's head; with append retirement (`marker`) no retraction at all, a marker assertion instead (249–256) |
| Several owners | `subject_owners.clj` 96 | each retired row's owner (must be one of the plan's owners) | yes: 33–42, a revision compare-and-set for every owner of the plan |
| Creation writer | `subject_create.clj` (the several-owners rendering), revisions 53–54 | existing owners' rows | yes: revision per existing owner; new owners are new entities |
| Grouped saves | `group.clj` 162–206 `materialize` (net of the members' reports: line 201 emits `:db/retract` for a pre-group datom a member retired) | the subject's row; the old revision (cardinality one) | yes: the last member's revision survives the net, and 196–199 add a `:triplex.entity/retired` marker for every retracted row on the same entity |
| Grouped saves, prepared path | `group_prepare.clj` 270–273 | the subject's row | yes: the marker in the same op pair (272–274) and the revision ops kept |
| Covering owner head (a save) | `owner_layout.clj` 137–150 `version-ops` (owner retractions become markers on the version entity), 51–55 `update-code` | the owner's old root (cardinality one, implicit) | yes: the new root and `[:db/add owner :triplex.entity/rev final]` |
| Owner head fold | `owner_layout.clj` 62–72 `fold-code` | the owner's root, its masked rows, each covered text from its version entity | yes: every covered text is asserted on the owner (71); a root always holds at least one text (`owner_root.clj` `decode` refuses a root with none, so "a fold without moves" in `rd1/PINNED-1B.md` cannot occur). The revision does not move, and the logical rows do not change |
| Removal on request | `erase.clj` 164–197 `apply-native!` | nothing of the subject: a transaction journal entity, a claim, two compare-and-sets on the scope | — (checked: the subject's datoms are unchanged; values are masked at read time from the request's own erasure cut, identically on both paths) |
| Key deletion (removal body cleanup) | `envelope.clj` `erase-keys!` (keys in the PostgreSQL authority or key files) | nothing in Datomic | — |
| Key pool refill (N1) | `key_pool.clj` | nothing in Datomic | — |
| Account-ID setting transition | `account_claims.clj` 108–132 `swap-ops`, `turn-on!` | stored functions' bodies (`[:db/add e :db/fn @refusal]` replaces a cardinality-one value) | not a subject |
| Index entries (commit time) | `cross_index.clj` 300–308 `tx-ops` | `:triplex.ix/entry` of the retired fact's subject | yes: the save's revision; and index entries are never part of a row answer |
| Index backfill and reconciliation | `cross_find.clj` 185–245 (`[:db/retract eid :triplex.ix/entry k]`, 223) | index entries only | no, by design: the builder's rule ignores entries, and no pinned route returns them (tested, section 2) |
| Outcome fence after a 503 | `outcome.clj` 79 | nothing (asserts an operation ID on a transaction with no position) | — |
| ID allocator, key-pool and reply fixes (U1, N1, N3) | merged at `345f833e4` | no new retraction (in the general writer's path) | — |
| Rebuild and reconcile routes | `layout_replay.clj` (speculative `d/with` only), `cross_find` reconcile (above) | nothing stored by the replay | — |
| Aging loader (AGE1, lab) | `age1/.../native.clj` 105–117, 121–152 | the subject's row; the prior revision | yes: the revision, markers |
| Excision | only `feed_live.clj` (a feed test fixture) | — | not a product writer; it would remove datoms from every view alike |
| Failover promotion (option B) | storage level (a synchronous standby promoted) | no transaction | — |
| Restore from backup | `erase.clj` `replay-after-restore!` replays removals at new positions; the data is the backup's history | no retraction; positions after the backup's head are reused by later saves | — (section 3) |
| Account move between databases (HA1, lab) | `ha_shared.clj` 133 (the copied body through `storage/tx-data`) | as the general writer | as the general writer |

The log audit (`rd6/attacks.clj` `audit`) checks this list against the data: for every transaction in a database's
log, every entity with a retraction and no assertion other than an index entry, split by subject and other entities,
and every retraction or repeated assertion of a grouped-save position. It ran on every scope of every test and fuzz
run below: __AUDIT_TOTAL__.

## 2. Attacks on the short-cut

Harness: `rd6/attacks.clj` (targeted tests, the fuzz hook, the audit, the cost toy) and `rd6/clj-run.sh` (one JVM per
writer setting, in-memory Datomic, the gateway's own route handler, the S5 harness's save frames). Every read is
answered five ways, the gateway's caches cleared before each answer: options off (the reference), both on, cut lookup
alone, short-cut alone, and both on with the hardening of section 5. Read shapes at every position: one subject at
three valid times, all subjects in one request, field 0 by pattern, record clocks (`recordedAt`), and worlds
(`reach-many`).

**Targeted tests** (`deftest`s in `attacks.clj`; every setting that enables them; fail 0 and error 0 in each
final run):

| Test | Settings it ran in | Reads compared (each under 4 option sets) | Differences from options off | Short-cut answers |
| --- | --- | --- | --- | --- |
| Every retirement shape through the product's writers at every position: a retirement alone on the per-subject and on the general writer, a replacement, an owned entity (a form the subject references) changed alone and then retired (the subject's revision does not move), two owners in one save, the reference retired, a new owner created with a reference beside an existing one, a mixed retirement on the general writer | server, grouped, owner head, serial (narrow revision, reused predecessor, append retirement), general, index | 192 per setting | 0 | 21 per setting |
| Removal on request before and after the pin, unsealed and sealed: U's value removed before later pins, T's value replaced and both its values removed, S's removed after; every position, every read shape | the same six | 117 per case, 2 cases per setting | 0; and 0 removed values visible at any position under any option set (all five) | 147 per case |
| Index entries written and retracted after the pin: declaration, backfill (entries asserted on subjects with no other datom), a stale entry planted, a second backfill whose reconciliation retracts it (an entry-only retraction), a save | index (`TX2_CROSS_INDEX=1`) | 65 | 0 | 105 |
| Covering owner head and its fold: three replacements per subject, an add-only save (the fold first), a retirement alone, a replacement after the fold | owner head | 234 | 0 (15 root datoms, 3 folds) | 315 |
| Grouped saves: three groups on distinct subjects, with replacements, retirements alone, mixed, every interior and end position | grouped | 390 | 0 | 126 |

**Hypothetical writers** (raw `d/transact`; no writer on the head does any of these, as the audit shows):

| Attack | Differences, short-cut on | Differences, hardening on |
| --- | --- | --- |
| After the pin, retract one row of S, assert nothing on S | 2 of 2 reads (the row read and the world) | 0 |
| Retract a row of S and re-assert the same text in a later transaction | 0 (the re-asserted datom carries a transaction after the pin, so the short-cut refuses) | 0 |
| Move a row from U to T in one transaction (retract on U, assert on T) | 1 of 12 (U at the pin; T is refused correctly) | 0 |
| The first attack, read on the options-off reach route: a pinned read cold, then a head read, then the same pinned read | the options-off answer itself changes: the head read stores S's parsed rows under (entity, revision), the revision did not move, and the pinned read then answers the head's rows | — |

The last row matters for the decision: the parsed-entity cache of the reach route (`entity_cache.clj`, on by default,
256 MiB) already assumes that an entity's rows never change without its revision moving, with every option off. A
writer that broke the short-cut's invariant would already make options-off reach reads wrong. The short-cut extends
that existing assumption to the `/v1/.../read` route, which has no such cache, and makes it slightly weaker: it also
catches a change that asserts anything on the subject without moving the revision.

**The fuzz** (`fuzz-main`): the S5 reviewer's differential fuzzer (`s5/fuzz.clj`) runs unchanged, and at every one of
its deep comparison points (every 400 serial steps, at the end of the serial phase, after each concurrent round) the
hook reads, on both of its scopes (fast writers and the general-writer control): the last 25 positions and 25 random
ones, 12 random owners, every read shape, under all five option sets, then audits both logs.

| Run | Writer setting | S5 dimensions | Serial / concurrent saves | Deep points (both scopes) | Read shapes compared | Differences | Short-cut answers | Audit violations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fuzz-1 | server (per-subject, several owners, creation, wide) | unsealed protection, removals and removal races, unknown outcomes (faults), races, kills, resends | 1,644 / 720 | 16 | 30,759 × 4 | 0 | 274,710 | 0 |
| fuzz-1 | serial (+ narrow revision, reused predecessor, append retirement) | as above | 1,644 / 720 | 16 | 30,993 × 4 | 0 | 281,592 | 0 |
| fuzz-3 | accounts-serial (+ `TX2_ACCOUNT_CLAIMS=1`) | as above, second account, the account-ID setting's transition and stale planners | 1,154 / 300 | 10 | 19,549 × 4 | 0 | 157,494 | 0 |
| fuzz-3 | hints (+ subject hints, general prefetch) | as fuzz-3 | 1,169 / 300 | 10 | 19,590 × 4 | 0 | 173,100 | 0 |
__FUZZ2_ROWS__

Writers that took the serial saves (fuzz-1, server): creation 532, several owners 130, one owner 308, general 619. The
S5 fuzzer's own comparison (control against candidate) found 0 differences in every run.



## 3. Attacks on the cut lookup

Writers of `:triplex.group/position`: `group.clj` 176–178 (`materialize`; the position goes to `metadata`, never into the
net of added and retracted datoms, so it cannot be retracted), `group_prepare.clj` 256–258 (`render`), and AGE1's lab
loader (`native.clj` 136–140). The attribute is `:db.unique/value` (`group.clj` 47), so two entities cannot hold one
position at once; a repeat needs a retraction first. No code retracts it.

| Route the task names | What it does to grouped positions | Tested |
| --- | --- | --- |
| Resend of a committed save | refused before staging (`OperationDuplicate`, `storage.clj` 594; inside a group `TRIPLEX_OPERATION_DUPLICATE`), nothing written | fuzz modes same-operation, same-command, lost-reply, kill-after (table above) |
| Replay across a removal | refused (`ErasureReplayDeclined`) or committed as a new save at a new position | fuzz removal-race steps (S5_REMOVALS=1) |
| 503 `OutcomeUnknown` lookup and fence | the fence asserts an operation ID on a transaction with no position (`outcome.clj` 79); a later commit of that operation then fails its unique check | fuzz fault steps (S5_FAULTS=1) |
| Imports | general or ordered saves; grouped only through the group writer | import setting (fuzz and attacks) |
| Restore from backup to an older position | the whole history is the backup's; positions above its head are assigned again to later saves | not run (no backup on the in-memory runs). Both read paths then read the same restored history, so the options cannot disagree; a client pin taken before the restore names different data afterwards with either option set |
| A second gateway with different options | both options are read-side (they appear only in `pinned.clj`, `group_cut.clj` `member-at`, `lean.clj` 137, `reach.clj` 277, `reach_late.clj` 50); nothing a reader stores depends on them | section 4 |

The cut lookup acts only on the `/v1/.../read` route (and the batch and sweep routes that call it): there `lean/rows`
receives the past view from `storage/at-position`. The reach routes call `select-db` on the current database, where
`member-at` always took the lookup ref and never paid the walk.

| Attack (grouped setting) | Differences, cut lookup on | Hardened cut lookup |
| --- | --- | --- |
| Every interior and end position of three groups (product writers) | 0 of 390 | 0 |
| Retract an interior member's position (hypothetical writer) | 2 of 6 reads at that position (the read falls through to the group's end and sees a later member's save) | 0 |
| Then assert the same position on a new entity | 2 of 6 | 0 |

Audit over every grouped scope: __GP_AUDIT__.


## 4. Mixed fleet

`rd6/fleet.sh` (one lab container: PostgreSQL 17 with synchronous commit, a transactor, one write gateway, three read
gateways started with the options off, both on, and the tuned reader's set: both on, the early filter, the read
profile, three read permits; their write options were checked at start). Four writer threads saved through the write
gateway for 75 s in each of three writer phases (the write gateway restarted between them): per-subject writers,
grouped saves (`TX2_GROUP_COMMIT=1`, live priority), append retirement. Each thread owned its subjects: replacements,
retirements alone, two-subject saves, new forms referencing a subject, protected values, and one removal on request in
a hundred steps. Four reader threads at once read a random committed position (or a record clock) for one to six
random subjects from all three readers in parallel, by row, by field pattern, by clock and as worlds; after the writes,
about 700 positions (the last 100 and 600 spread) for every subject.

| Phase | Saves committed (total) | Removals (total) | Comparisons (total) | Differences |
| --- | --- | --- | --- | --- |
| per-subject | 7,731 | 93 | 88,640 | 0 |
| grouped | 13,298 | 157 | 211,788 | 0 |
| append retirement | 20,559 | 226 | 279,990 | 0 |
| sweep after the writes (head 20,785, 2,151 subjects) | — | — | 115,020 more (395,010) | 0 |

The short-cut answered 1,281,839 subjects from the current database and 1,110,144 through the past view on the
options-on reader (1,281,811 and 1,110,124 on the tuned one). 411 comparisons had one side refused with
`503 ErasureFrontierUnavailable` (a reader whose peer had not caught up with a just-published removal); these are not
counted as differences and fall evenly on both sides: options-on refused while options-off answered 98 times, the
reverse 109; tuned 103 and 101. No answer differed when both readers answered.

A first fleet run (fleet-1, stopped at 10 minutes in its full sweep) used four times the removal rate and counted
those refusals as differences; its numbers are not used.


## 5. The cheap hardening

**What was built (in the test harness only; `attacks.clj` `hardened-unchanged`, `hardened-member-at`):**

- Short-cut: the builder's rule, and no datom of the subject in the history index (assertion or retraction) with a
  transaction after the pin; index entries left aside, as the builder's rule leaves them.
- Cut lookup: the current-database answer only when the position's history holds exactly one datom (its assertion);
  otherwise the lookup on the past view.

**Does it close what was found?** Yes, both: with the hardening on, 0 differences in every hypothetical case of
sections 2 and 3 (a retraction alone: 0 of 2; a moved row: 0 of 12; a retracted grouped position: 0 of 6; the same
position asserted again elsewhere: 0 of 6), and 0 differences in every product-writer test, fuzz point and the
targeted tests (it is the fifth option set compared everywhere above).

**Cost on the Mac toy (diagnostic; `cost-main`, grouped setting, in-memory Datomic).** 40 subjects of 8 fields, each
edited 80 times before the pin (one unchanged subject: 10 current datoms, 330 in its history), then half of them
edited again and 500 groups of 4 saves (1,500 grouped positions after the pin):

| Check, one call | Microseconds |
| --- | --- |
| Builder's short-cut rule (`unchanged-since?`, cross_index form) | 43.6 |
| Hardened short-cut rule | 61.8 (+18.2) |
| For scale: the subject's datoms at the pin (what the as-of path reads) / now / its whole history | 22.5 / 14.4 / 10.6 |
| Cut lookup on the past view (the walk; cheap in memory) | 0.51 |
| Builder's cut lookup | 0.70 |
| Hardened cut lookup | 1.57 (+0.87) |

Whole pinned reads through the route on the same toy were 0.25 to 0.42 ms under every option set, with no ordering
between them: the in-memory toy has no storage reads, so neither the walk nor the history segments cost what they do
at 1 billion. What the toy does show is the shape of the cost: the hardened short-cut reads the subject's whole history
(33 times its current datoms here), which is what the past view reads to answer the same subject, so on a storage
database it adds about one as-of read of the subject to every answer the short-cut gives, and its saving would mostly
go. The hardened cut lookup adds one seek into the position's history (a range no writer ever fills), a small fixed
cost per pinned read. Neither was measured on storage; the server's A1 step is where to do it if the coordinator
wants the numbers.


## 6. Verdict on defaults

__DEFAULTS__

## Findings

__FINDINGS__

## What held

__HELD__

## Not tested

__NOT_TESTED__

## Reproduce

One ordinary heavy token per command, from a checkout of this branch (the scripts copy the gateway sources and refuse a
checkout whose gateway sources differ from HEAD):

```
node lab/bin/heavy.mjs --label DX-RD6-attack -- bash lab/experiments/EXP-DX1/rd6/clj-run.sh OUT attack "server grouped ownerhead serial general index"
S5_SEEDS=11,12 S5_STEPS=800 S5_ROUNDS=2 S5_THREADS=4 S5_PER_THREAD=60 S5_PROTECTED=unsealed S5_REMOVALS=1 S5_FAULTS=1 \
  node lab/bin/heavy.mjs --label DX-RD6-fuzz -- bash lab/experiments/EXP-DX1/rd6/clj-run.sh OUT fuzz "server serial"
RD6_SUBJECTS=40 RD6_EDITS=40 RD6_GROUPS=300 node lab/bin/heavy.mjs --label DX-RD6-cost -- bash lab/experiments/EXP-DX1/rd6/clj-run.sh OUT cost "grouped server"
RD6_SECONDS=75 node lab/bin/heavy.mjs --label DX-RD6-fleet -- bash lab/experiments/EXP-DX1/rd6/fleet.sh OUT
```

`DOCKER_HOST` names the lab VM. The images are started by ID: the lab Datomic runtime `sha256:da58aea16b31…` for the
in-memory runs and `sha256:21a67288007d…` for the PostgreSQL stack, with the head's gateway sources (a copy taken at
start) first on the classpath.
