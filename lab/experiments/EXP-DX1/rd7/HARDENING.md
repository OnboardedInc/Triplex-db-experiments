# Pinned reads: the cut lookup's hardening and the writers' audit gate (DX-RD7)

Builder's page, branch `exp/DX-RD7-pinned-read-hardening`, first from `origin/exp/DX-INT1` at `2ce636613`, then merged
with `65a851d1b` (the save line's fourth pass, landed while this ran) before any gate. Conditions 1 and 2 of the
pinned-read review (`rd6/REVIEW-1.md`). Neither option's default changes here. Every time is a Mac diagnostic.

## 1. The hardened cut lookup (condition 2)

`packages/datomic/gateway/src/triplex/gateway/group_cut_guard.clj`, required last by `main.clj` (after `batch`, so after
`commit.clj` and every stored function). With `TX2_PINNED_CUT_LOOKUP=1` at load it replaces `group-cut/member-at`;
with the option off it replaces nothing, so the gateway is the base byte for byte (identities and log below).

The guard reads the position's history once (`d/datoms (d/history current) :avet position cut`, at most two datoms):

| History of the position | Answer |
| --- | --- |
| no datom | nil: no view can hold a number that was never asserted (this keeps solo-save pins off the walk) |
| exactly one datom, its assertion | the current database's answer, accepted when its transaction is at or before the view's t (the builder's rule) |
| anything else (a retraction, a second assertion) | the lookup ref on the past view, the reference (and a fallback count) |

This differs from the review's harness form in one way: the review sought the history, then sought the current index
again (two seeks); the guard takes the entity and transaction from the one history datom (one seek). It also differs
from a literal reading of "only when the history holds exactly its one assertion": a position with no history at all
answers nil instead of walking, because the walk is what the option exists to avoid and an empty history proves the
answer.

**Shown (in memory, the head's image `ce17d18e`, `rd7/clj-run.sh`):**

| Check | Without the guard | With the guard |
| --- | --- | --- |
| The review's `attack grouped` case, an interior member's position retracted (`grouped-saves-and-the-cut-lookup`; option sets `on` and `cut`) | 2 of 6 reads differ, each set | **0 of 6** |
| The same number then asserted on another entity | 2 of 6, each set | **0 of 6** |
| Every other case of the review's targeted tests, 9 writer settings (server, grouped, owner head, serial, general, index, import, hints, accounts) | as the review: equal everywhere except the short-cut's own planted break (R6-1: 2 of 2 and 1 of 12 under `on` and `short`) | the same counts, case by case; tests 8 per setting, 0 failed, 0 errors in both runs |
| `rd7/harness.clj` `guard-main`: positions 0 to 999 at 43 pins against the lookup ref on the past view; 300 transactions, 30 interior positions retracted and 30 asserted again on new entities, 400 numbers never written | 22 of 43,000 lookups differ | **0 of 43,000** (1,290 fell back to the view) |
| The review's fuzz hook (`rd6-attacks/fuzz-main`, unchanged), `TX2_PINNED_CUT_LOOKUP=1` at load so `on`, `cut` and `hard` run the guard; seed 11, 600 serial steps, 2 rounds, unsealed protection, removals, faults; server, serial, grouped, import | — | 61,865 read shapes x 4 option sets = 247,460 comparisons, **0 differences**; 514,281 short-cut answers; S5's own comparison 0 differing; the review's audit 0 violations on both scopes of every point |

The runs without the guard are the same image with `TX2_PINNED_CUT_LOOKUP` unset at load (the guard is then not
installed; the harness switches the option per read, which reaches the builder's lookup).

**Cost on the Mac toy, diagnostic only** (`cost!`, grouped setting, 40 subjects edited 40 times before the pin, 300
groups of four after it, 900 grouped positions; microseconds per lookup, 400 rounds over 50 positions):

| Lookup | Builder's | Review's hardened form | This guard | Walk on the view (option off) |
| --- | --- | --- | --- | --- |
| Interior position of a group | 0.63 | 1.24 (+0.61) | 0.71 (**+0.09**) | 0.60 |
| Solo save before the pin | 0.48 | 1.55 (+1.07) | 0.45 (**-0.02**) | 15.61 |
| Number never written | 0.59 | 0.93 (+0.34) | 0.32 (**-0.27**) | 0.34 |

Whole pinned reads through `/v1/.../read` on the same toy (ms per read): interior 0.354 off, 0.322 builder, 0.326
guard; solo 0.371, 0.243, 0.229; at the pin 0.387, 0.221, 0.275. The spread between repeats is larger than any
difference here (an earlier small toy gave the opposite order), so the toy shows no cost of the guard on a whole
read; the review measured +0.87 us per lookup for its form on its toy. Answers equal under all three in every timed
read. Not measured on storage: at 1 billion the history seek may load one history segment that the current seek does
not; the server session's A1 step is the place for it (condition 3).

## 2. The writers' audit gate (condition 1)

**The rule** (`rd7/audit.clj`) is the review's `audit` (`rd6/attacks.clj`) unchanged, with a verdict. Over every
transaction of a database's log, the gate fails on:

- **(a)** a transaction that retracts a datom of a subject (an entity that has ever had `:triplex.entity/id`) without
  asserting anything on that subject other than an index entry;
- **(b)** a retraction of a grouped-save position, or a number asserted on a second entity;
- **(c)** (added, stricter) a removal-on-request transaction that retracts any datom of a subject.

The two allowed exceptions are named in the script, in the review's sentences: "the index backfill's reconciliation of
an index entry, which no row answer contains" (counted as `indexOnlyRetractions`, never a failure), and "removal on
request retracts nothing of the subject" (needs no exception from (a); (c) checks that it stays so). A report-only
count (d) is printed beside them: see section 3.

**Where it runs (one command, one exit code, one summary line):**

```
DOCKER_HOST=<lab VM socket> DX_RD7_IMAGE=<the head's image ID> bash lab/experiments/EXP-DX1/rd7/audit-gate.sh OUT [PRODUCTION_OUT]
# prints: DX-RD7_AUDIT_GATE pass|fail {...}   exit 0 or 1
```

- **In memory:** the save line's fuzzer (`s5/fuzz.clj`, unchanged) in five writer settings (server, serial, import,
  group, accounts-serial; seeds 31 and 32, 600 serial steps, 2 concurrent rounds, unsealed protection, removals,
  faults, value types; the accounts setting with the second account and the setting's transition), on the head's own
  image. `rd7/harness.clj` wraps wfix1's `in-scope`, so every scope any gate opens (control and candidate) is audited
  over its whole log just before it is deleted. The verdict is the audit's; the fuzzer's own comparison is printed
  (`s5Differing`) and stays the save line's gate's.
- **On PostgreSQL:** the production gate (`prep1/manage.py ... production`) now runs the audit itself after its
  driver, as a peer of its own database while the transactor still runs (`prep1/stack.sh`), prints `DX-RD7_AUDIT`, and
  fails the gate on a break. So every merge's production step is audited with no new step. `audit-gate.sh` reads that
  line from `PRODUCTION_OUT` (the merge's own production directory), or runs the production gate itself.

**For the merge agent** (one new kind in its case file, beside `production`):
`rd7-audit) env DX_RD7_IMAGE=$IMG "$@" bash $X/rd7/audit-gate.sh $E/$name $E/<that merge's production step>-t1 ;;`
(not under `$H`: the script takes one ordinary heavy token per setting itself). Without the second argument it runs
its own production gate (holder `DX_CHK1_HOLDER`, default DX-THIN1). About 7 minutes of slot time for the memory part
and 4 for a production gate on the Mac toy, waits for a slot not counted.

**Runs** (every count is the audit's; databases = in-memory scopes or PostgreSQL databases; the in-memory runs of
other heads mount that head's gateway sources and S5 harness on the lab runtime image `da58aea16b31`, read-only):

| Head | Input | Databases | Transactions | (a) | (b) retractions / repeats | (c) | Removal transactions | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| this branch `adbca8c5f` (= `65a851d1b` + the guard), the command itself | memory, 5 settings, 10,104 saves | 20 | 18,481 | 0 | 0 / 0 (2 positions asserted, group setting) | 0 | 342 | pass |
| the same run | production gate's PostgreSQL database (R 840 of 840, S 88 of 88, wide 2 of 2, 0 expired) | 2 | 942 | 0 | 0 / 0 | 0 | 0 | pass |
| `65a851d1b` (the one branch, branched from; the save line's fourth pass merged) | memory, the same 5 settings (seeds 41, 42), 10,063 saves | 20 | 18,397 | 0 | 0 / 0 (3 asserted) | 0 | 282 | pass |
| `9f210018f` (the save line's fourth pass as it stood) | memory, the same 5 settings (seeds 41, 42), 10,063 saves | 20 | 18,402 | 0 | 0 / 0 (2 asserted) | 0 | 282 | pass |
| `f771157ae` (removal-per-account line), its removal options off | memory, server, serial, group, 5,838 saves | 12 | 10,614 | 0 | 0 / 0 | 0 | 156 | pass |
| `f771157ae`, `TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_SUBJECT_CHECK=1 TX2_REMOVAL_REPLAY_RULE=1 TX2_REMOVAL_COMMIT_BOUNDARY=1` | memory, server, serial, group, 5,838 saves | 12 | 10,784 | 0 | 0 / 0 | 0 | 156 | pass |
| each of the four heads | the review's targeted tests (`attack`), every scope audited, 6 to 9 settings | — | — | only in the tests that plant the review's breaks | only in the grouped test's planted break | 0 | — | as designed: product-writer scopes all pass |

The in-memory runs use the gate's sizes (2 seeds x 600 serial steps and 2 concurrent rounds per setting, unsealed
protection, removals, faults, value types).

**The gate bites** (`RD7_PLANT`, the review's two raw-transaction breaks planted into every audited database after the
gate's own writes):

| Plant | Memory part | Production gate | Command |
| --- | --- | --- | --- |
| `row` (R6-1: one row of the subject with most rows retracted, nothing asserted) | 4 of 4 scopes fail rule (a) | the gate's database fails rule (a) (1 violation in 943 transactions; the stack's empty health database has nothing to plant into and is audited unplanted) and the production step exits 1 | `DX-RD7_AUDIT_GATE fail`, exit 1 |
| `position` (R6-3: a position retracted, then the number asserted on another entity) | 4 of 4 scopes fail (b): 4 retractions, 4 repeats | 2 of 2 databases fail (b) and the step exits 1 | `DX-RD7_AUDIT_GATE fail`, exit 1 |
| none (the run above) | 20 of 20 pass | 2 of 2 pass | `DX-RD7_AUDIT_GATE pass`, exit 0 |

The review's own attack tests also fail the audit exactly where they plant: `a-retraction-without-an-assertion` (1
violation), `a-retraction-then-reassertion-and-a-moved-datom` (2), `grouped-saves-and-the-cut-lookup` (1 retraction,
1 repeat), in every setting and head; `index-entries-after-the-pin` shows the first named exception (1 index-only
retraction, a pass).

**Answers to the review's questions on the two lines:** neither the save line's fourth pass nor the removal-per-account
line adds a retraction of a subject datom without an assertion (0 under rule (a) in every run above), nor any write of
a grouped position other than the group writer's assertions, nor a removal transaction that retracts a subject datom
(rule (c), 0 of 156 or 282 removal transactions). The removal line's masking, re-checked under all five option sets
(off, both on, cut lookup alone, short-cut alone, the review's hardening), with its removal options off and on, in the
server, grouped, serial and general settings: 117 reads per case, unsealed and sealed, 0 differences, 0 removed values
visible at any position.

**Observation (not a fault of this branch): the S5 fuzzer's own comparison in the `group` setting** (per-subject
writers with the group writer on) reports stored-datom differences on every head (1 run of 2 on `65a851d1b` and on
this branch, 2 on `9f210018f`): the group writer adds `:triplex.entity/retired` markers that the general-writer control
does not, and `s5/fuzz.clj` skips the datom comparison only for append retirement. The differing datoms are those
markers (checked in the first difference). The save line's standing fuzz does not use this setting.

## 3. R6-2 and R6-4

**R6-4 (documentation), corrected.** `rd1/PINNED-1B.md` said, in three places, that a fold "without moves" retracts on a
subject and asserts nothing. A root always holds at least one text (`owner_root.clj` `decode` refuses a root with
none), so every fold moves at least one text onto the subject and the short-cut refuses a subject folded after the
pin. The three places now say so and cite the review. The audit confirms it on data: 5 folds in the owner-head
setting of every attack run (each `+row -row -root` on the subject), 0 violations.

**R6-2 (Info): the reach route's parsed-entity cache.** With every option off, `entity_cache.clj` (on by default, 256
MiB) keys each parsed entity by entity and revision on every `/v2/.../reach` and `reach-many` read, pinned or not
(`reach.clj` `read-entity-recent` and `read-entity-legacy`). It is exact only while no writer changes an existing
entity's rows, retirement markers or owner root in a transaction that does not move its revision. That rule is
stronger than the short-cut's: a transaction that retracts a row and asserts something else on the subject without
the revision (a row moved in, a marker) passes the short-cut's rule, which sees the assertion after the pin, but would
leave the cache's parse stale. **The audit gate covers only the part the two share:** its rule (a) fails a retraction
with no other assertion on the subject, which breaks both; a change that also asserts without moving the revision
passes (a). To make the rest visible the audit prints a report-only count (d): every transaction that touches an
existing subject's rows, markers or root without asserting its revision, folds counted apart (they change no logical
row) and entities born in that transaction left out. On every database audited here (section 2's runs) it found only
the review's planted hypothetical writers (3 row retractions and 2 row assertions per attack run) and the owner-head
folds; no product writer. Proposal for the independent review: make (d) a failing rule with those two exceptions; it
is printed but not enforced here, because it goes beyond the review's rule and no review has vetted it against every
writer (for example the save ledger's implicit revisions in the grouped settings).

## 4. Gates

Head of the gates: `65a851d1b` merged (`7d7de18c8`), the guard and gate code as committed. The head image
`ce17d18e0b59…` (`tx2-dxthin-jre21:c6cfb1193a536c2c`, engine build from `0959f2507`; the later commits change lab files
only, no gateway source) for every in-memory run; the stack gates on the production gate's native image built from
`adbca8c5f` (`c99f800ef887…`, removed after), started by ID. Evidence in the private evidence folder `DX-RD7/`.

| Gate | Result |
| --- | --- |
| Stored-function identities (`int5/idents.sh` with `INT5_IDENTS_PREFIX=tx2-dxrd7-idents`, `compare-idents.py`) against `65a851d1b` | **70 of 70 equal in each of 13 settings**: the 8 the one branch checks, `TX2_SUBJECT_SAVE=1` alone, and each of `TX2_SUBJECT_NUMERIC_OWNER`, `TX2_SUBJECT_ORDERED_IDS`, `TX2_PINNED_CUT_LOOKUP`, `TX2_PINNED_SHORTCUT` alone; 0 new keys |
| Option-off stored log against `65a851d1b` (`b2-keys/gate.sh`, phase paired) | native log, replies and key store after a shred pass **identical**, with removals and without, unsealed and sealed (4 runs) |
| `rd1/shortcut-gate` (readers off, both on, cut lookup alone, tuned; owner head on) | 92,880 comparisons, **0 differences**; both-on readers 1,522,752 short-cut answers |
| RD5 gate (`rd5/gate.sh`; the tuned readers with both options on) | 30,548 comparisons, **0 differences**; probes finished |
| `srv2/read-cost.sh` (from `957a4f836`; 42,277 grouped saves after the pin, pins 61 to 42,638) | 1,020 comparisons, **0 differences**. Diagnostic times on a busy Mac: old pin, one seat, p50 4.06 ms off, 1.65 cut lookup alone, 1.03 both on, 1.32 tuned; 16 seats 1,156 / 4,038 / 4,016 / 3,659 reads/s (SRV2's run without the guard: 4.86 / 1.30 / 1.56 ms, 1,408 / 4,669 / 4,463 reads/s) |
| The review's targeted tests (`rd6/attacks.clj`), 9 settings, options off and the guard on | 8 tests per setting, 0 failures, 0 errors, both runs; counts in section 1 |
| The review's fuzz hook, guard on, 4 settings | 247,460 comparisons, 0 differences (section 1) |
| Guard against the past view (`guard-main`) | 0 of 43,000 (builder 22) |
| The writers' audit gate, the one command, on this head | **pass** (section 2) |
| Production gate (inside the audit command) | R 840 of 840, S 88 of 88, wide 2 of 2, 0 expired |

## 5. Reproduce

One ordinary heavy token per in-memory command (the audit command takes its own); `DOCKER_HOST` names the lab VM;
`IMG` is an image built from the head (`DX_JAVA=21 node lab/bin/engine.mjs build --lane datomic --holder DX-THIN1
--variant-receipt <new path>`).

```
node lab/bin/heavy.mjs --label DX-RD7-guard -- env DX_RD7_IMAGE=$IMG RD7_ENV=TX2_PINNED_CUT_LOOKUP=1 bash lab/experiments/EXP-DX1/rd7/clj-run.sh OUT guard grouped
node lab/bin/heavy.mjs --label DX-RD7-attack -- env DX_RD7_IMAGE=$IMG RD7_ENV=TX2_PINNED_CUT_LOOKUP=1 bash lab/experiments/EXP-DX1/rd7/clj-run.sh OUT attack "grouped server ownerhead serial general index import hints accounts"
node lab/bin/heavy.mjs --label DX-RD7-attack-off -- env DX_RD7_IMAGE=$IMG bash lab/experiments/EXP-DX1/rd7/clj-run.sh OUT attack grouped
DX_RD7_IMAGE=$IMG bash lab/experiments/EXP-DX1/rd7/audit-gate.sh OUT                       # the gate
DX_RD7_IMAGE=$IMG RD7_PLANT=row RD7_SETTINGS=server bash lab/experiments/EXP-DX1/rd7/audit-gate.sh OUT       # must fail
DX_RD7_IMAGE=$IMG RD7_PLANT=position RD7_SETTINGS=grouped bash lab/experiments/EXP-DX1/rd7/audit-gate.sh OUT # must fail
```

## 6. Not tested

- Anything at scale or on storage timings: every run is a Mac toy, in memory except the production gate and the three
  stack gates. The guard's cost at 1 billion (one history seek that may load a history segment) is not measured; the
  server session's A1 step should measure the cut lookup alone with the guard (condition 3).
- The PostgreSQL side of the audit on the save line's fourth pass as it stood (`9f210018f`) and on the removal line:
  their audits ran in memory with their own sources; a production gate needs their own checkout and image, and running
  it would have changed them (the audit lives on this branch). `65a851d1b` contains the fourth pass, and its production
  gate is the one this branch ran (the audit's code does not touch the gateway).
- The review's index test on `9f210018f`: that head has no `cross_index.clj`, so the test errors there (1 error per
  setting), not an audit result.
- The guard under the review's mixed fleet (several gateways on one PostgreSQL database while writers run) and under
  real older builds: not run; the shortcut and RD5 gates run three or four readers with the options on beside readers
  with them off on one PostgreSQL database, with the guard installed in every reader that has the cut lookup on.
- Excision: the audit cannot see datoms an excision removed from the log (no product writer excises; it would remove
  them from every view alike).
- Rule (d) as a failing rule: printed only (section 3).
- The option's default: unchanged (`TX2_PINNED_CUT_LOOKUP` and `TX2_PINNED_SHORTCUT` default off); that is the
  separate reviewed change after A1.
