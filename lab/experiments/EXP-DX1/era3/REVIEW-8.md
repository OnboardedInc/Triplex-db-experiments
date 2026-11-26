# Eighth adversarial review: removal on request merged onto the one branch (DX-ERA3, 2026-11-26)

**Under review:** `origin/exp/DX-ERA6-removal-on-save-line` at `99359fa93`. Its gateway source equals the merge commit
`1be3efbab` (`git diff --stat 1be3efbab 99359fa93 -- packages/` is empty; the later commits change `era2/gate.clj`,
`era3/expected-failures.json`, `era3/expected.py`, `era6/expected-save-line.json` and the page). `1be3efbab` merges the
one branch `origin/exp/DX-INT1` at `65a851d1b` into the reconciled branch (`e98bd5bd8`).

**The pin and 9d08319cd:** `9d08319cd` (the five rule-off checks) and `8fb5f87c2` (M3 with the rule on only) are
ancestors of `99359fa93`, so the pin already carries both. Nothing to move.

Reviewer branch `exp/DX-ERA3-removal-review`. It merges `99359fa93` at `3e10a3b8c`, taking the builder's copies of
`era3/review7.clj` and `era3/run.sh`. Tests added this pass:
- `era3/review8.clj`:
  - **C**, the entity cache and a removal learned on the key pass's repair path;
  - **S1**, one command across the replay rule's seam;
  - **P**, pinned reads under every read option set, with the pinned-read review's log audit;
- `era3/run.sh` modes `r8` and `7plant` (fuzz7 with a planted fault);
- `era3/stack6.sh restore-journal`.

No code under review was changed.

Conditions:
- Mac only, toy sizes. The lab's four heavy slots were shared with four other builders; at most two heavy jobs of this
  reviewer ran at once.
- Every container ran image `sha256:21a67288007d...` (PostgreSQL `sha256:526f86d93c6e...`) with the reviewed source
  mounted, recorded per run.
- Every time here is a Mac diagnostic.
- Written 2026-11-25 23:38 to 2026-11-26 00:25 EST.

## Verdict

**Fit to merge into the one branch with every option off: yes.** Removal on request on this head answered no removed
value on any read route I tested. That holds on the gateway that took the removal and on one that learned of it late,
under every read option set, at every pin. The new findings sit at two seams: the replay rule's switch (S1) and the
fleet's journals (J1).

- **Options off equal the one branch at `65a851d1b`:**
  - **the paired native log:** identical datom for datom (unsealed 653, sealed 698), replies identical (md5
    `3d94b2f60622` on every arm);
  - **a save that says nothing about its frame,** of a removed subject's value: 409 `ErasureReplayDeclined` here and
    on the one branch alike;
  - **per account and on the commit boundary:** identical apart from the 11 decline datoms;
  - **stored-function identities:** 70 of 70 equal in each of 11 writer settings, 0 differ, 0 missing; 2 new keys
    (the removal fence's).
- **The merge with the save line is the corrected one (REVIEW-4 R4-3).** With the replay rule off, every writer
  declines a save framed before a removal:
  - this head: 0 removed values stored in 27 combinations on each of six writers;
  - the faulty trial merge `f17410ed5`: 20 of 20 on each non-creating writer;
  - the save line's own R2-2 group: 23 of 23 with the rule off, 22 of 23 with it on (R4-9, as listed).
- **7b, the entity cache:** no removed value was answered from a cache on any read route.
  - **Where tested:** per account, commit boundary, database-wide, file and PostgreSQL; on the gateway that took the
    removal and on one that learned of it only from the key pass (the repair path in 96 cases, the pass's own cut in
    128); 224 cases, 1,297 oracles, 0 violations.
  - **What the builder's drop does:** it removes the parsed entry (1 to 0), so the value is no longer held in the
    reader's memory.
  - **What keeps the value out of answers is not the drop:** with the drop planted out of the repair path, the entry
    stays and reads hit it, and still no route answers the value, because every route masks at answer time from the
    request's frontier.
  - **The test can see a leak:** an arm with that mask planted out finds the value on 14 of 14 routes it checks.
- **The carried findings are fixed on this head:**
  - R5: all 10 ways print the acknowledged line;
  - R2: refused at the protection call;
  - R3: only saves writing the missing attribute wait, and there is a way out that adds nothing;
  - R6: 409 `OperationDuplicate`;
  - the creation rule: 27 of 27 with the rule on.
- **New, Medium (S1): switch (i)'s seam reopens R3-3 for a request that names its account.**
  - **What happens:** one command can be declined by a gateway with the replay rule on and then stored by one with it
    off, or the other way round. The value chosen before the removal is then stored after it.
  - **Count:** 4 of 4 when the request names its account, 0 of 4 when it does not.
  - **Cause:** the two rules key a declined command differently.
- **New, Medium (J1, operations): the acknowledged journal is per gateway.** Each start check names only the
  removals its own gateway took, so step 5 must read every gateway's journal.
- **Also new:**
  - G1, low: three of the save line's listed failures check no detail;
  - L1, medium at scale, by code: R2's fix scans every live row while holding the database's removal lock.
- **Older SDKs (question 5): deployment alone is acceptable for turning the replay rule on, because the flip neither
  opens nor closes that gap. It is not acceptable as the only guard against the gap itself.**
  - **Ship with the flip:** the counting half of the gateway check.
  - **Before any database relies on removal on request with callers outside this SDK:** the refusing half, as a
    one-way value in the database.
  - **Exemptions:** only writes the gateway fences with a ticket.
- **The three switches:** each is a process setting, not a value in the database.
  - (i) is not ready to be on by default until S1's keys agree.
  - (ii) is ready.
  - (iii) is ready only together with the SDK default change and the harness overrides.

## Findings

| ID | Severity | Where (`1be3efbab`) | What | Test | Result | Smallest fix I would accept |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | medium | `removal_commit.clj` `commands-of` 984 against `storage.clj` `declined-keys` 240 (`account-claims/stored-command` 398) | Across the replay rule's seam, a command declined by one rule is stored by the other when the request names its account: the value chosen before the removal is stored after it (R3-3 back) | `review8.clj` `s1` | 4 of 4 named-account cases stored (both directions, with and without `TX2_ACCOUNT_CLAIMS`); 0 of 4 without an account | One key function: `commands-of` calls `stored-command` with the database, or both checks look up both forms; S1 as a gate case |
| J1 | medium (operations) | `removal_ack.clj` (one journal per process); `acknowledged-lost!` 1649 | Each gateway's start check compares only its own journal: after a restore of the data and the authority, the write gateway named the removal it took and the read gateway the one it took; neither named both | `stack6.sh restore-journal` | lost lines: write gateway 1 (a1's), read gateway 1 (b1's); a1 and b1 answered again until step 5; after step 5 and a restart, 0 | One journal shared by every gateway, outside both backups, or the start check reads every gateway's journal; step 5 says so |
| F4 | high where it applies (callers not on a frame-stating SDK) | `storage.clj` `frame-of` 176; `removal-after-source` | A replay that states a fresh `sourceK` and nothing about its first attempt is stored, rule off or on: an SDK older than the save line replaying across a removal stores the value chosen before it (the builder's 6.1, listed as `era-replay-without-frame-source`, "a finding no review covers") | `s5/attack3_era.clj` `r2-2-replays-across-a-removal` (the builder's test), run here with the rule off and on | stored, `"sdkReplay":[200,null]`, `"storedAfter":"value chosen before"`: rule off 2 of 2 writers (`era-off`), rule on 2 of 2 (`era-on`) | Question 5 below: the counting check with the flip; the refusing check, as a one-way value in the database, before callers outside this SDK write a protected database |
| G1 | low (the gate's exactness) | `era6/expected-save-line.json`, `expected_save_line.py` | Three listed failures carry no `must_contain` (`race-general-writer`, both `R4-9` entries), and the checker compares failing test names, not assertions: a different failure of the same test in the same setting passes as the listed one | `r22-faulty` | the faulty merge fails `r2-2-race-on-each-writer` with a stored value (`"removal":200`, `"replay":[200,null]`, `"storedAfter":"chosen before"`); in a listed general setting that would pass | `must_contain` for each (`"removal":503` and the failure line; `"replayWithNullFrameSource":[409,"ErasureReplayDeclined"]`) and the assertion count per test and setting; better, run the race test's removal on its own thread (REVIEW-4: 15 of 15 pass) and drop the entry |
| L1 | medium at scale (code read) | `removal_commit.clj` `non-string-value` 1437, called inside `protect!`'s `privacy/guard` 1546 | R2's fix reads every subject's live rows while holding the database's removal lock. At the ten deep accounts' size an addition holds the lock for the whole scan; removals and every save that takes the lock wait | code | not measured (Mac) | Scan before taking the lock, at a basis; under the lock check only what was written after that basis |
| R2b | low | `protect!` | R2's residual: an attribute with no values yet can still be added; its later numeric saves are refused 400 for every account, for good. The page now limits the route to the owning service and an operator, enforced in front of the gateway | code | by code | That rule, written in the deployment; or record the attribute's type at the addition |
| W1 | low (rule off, by the save line's design) | `storage.clj` `record-declined!` 257 (`:stated` only) | With the replay rule off, a declined save that stated nothing is not recorded, so its command sent again with fresh points is stored; with the rule on it is declined. A second face of the seam | `review7b.clj` `m1` (M2) rule off | resend stored on 6 of 6 writers (`q2-off`); declined on 6 of 6 with the rule on (`q2-on`, `q2-subject`) | Accept, and list it with S1 as a difference between the rules; it closes when the rule is on everywhere |

Notes on the table:

- **S1, the evidence.** The case: a1's protected value saved framed before a removal of it, declined, then the same
  command sent again with every point fresh, the rule switched between the two sends.
  - **Without an account:** both rules record and look up the command as sent: declined both ways (4 of 4 held).
  - **When the request names its account `a`:** the merged rule records `acct-id/v1/1/a/<command>`. The save line's
    rule records `<command>`, and looks up the scoped form only once the database's account setting is on. Each rule
    misses the other's record, judges the resend by its points (fresh) and stores it.
  - **Process settings:** with `TX2_ACCOUNT_CLAIMS` unset (the one branch's default, `s1-plain`) the setting stays
    off; with it set (`s1-claims`) the resend's own commit turned the setting on, after the decline check had
    already missed. Stored in both.
  - **Where the seam exists:** every rollout of switch (i) (some processes on, some off), any process left with
    `TX2_REMOVAL_REPLAY_RULE=0`, and one gateway restarted into the other default with commands declined before it.
  - **Who sends such a resend:** this branch's SDK never sends a declined save again; a caller's own retry that
    rebuilds its frame and keeps its command does. The SDK names its account only when `claimAccount` is configured.
- **J1, the evidence.** PostgreSQL authority, log boundary, sealed. Each gateway's journal at
  `/tmp/ack/journal.jsonl` inside its container; a1 removed on the write gateway, b1 on the read gateway, after the
  backup.
  - **The journals:** 2 lines in all, one per gateway.
  - **After `restore-db` and the authority's records and keys put back:** the start checks printed one
    `RemovalAcknowledgedLost` each, naming only their own removal. a1's value answered (current 1, history 1), b1's
    answered.
  - **Step 5,** each lost removal sent again under a new command: 0 values. After a restart of both gateways: 0 lost
    lines (resolved).
  - **The design works per gateway.** The gap is the fleet: a replaced or scaled-down gateway takes its journal with
    it unless it lives on a volume that outlives the container, and an operator who reads one gateway's start lines
    misses the others'.
- **F4 is older than this branch, not a regression.** The flip of switch (i) neither opens nor closes it
  (question 5).

## Rulings on the builder's changes to its own checks

**Question 3: each named expected failure.** Each entry is the case the review rated, quoting the review's sentence
(checked against `REVIEW-7.md` at `7da3ca3b3`, `s5/REVIEW-3.md` and `s5/REVIEW-4.md` at `84d470328`):

| Entry | The case it names | Detail checked by the list | Ruling |
| --- | --- | --- | --- |
| `R4-third-oracle` (era3) | R4, log-put-back, log boundary, file | both 503 `RemovalLogBehind`, value not answered | right, exact |
| `M3-fast`, `M3-general` (era3) | M3 with the rule on | 409 `ErasureReplayDeclined`, datoms 13, 60, 3 | right, exact (`q2-on`: the same numbers) |
| `E9-unsealed`, `E9-sealed` (era3) | REVIEW-2's E9, open, High against TARGETS 7.3 | copy readable after the acknowledgement | right; an open High finding, listed so the gate is exact, not accepted |
| `race-general-writer` (save line) | REVIEW-7's harness explanation | none | the right case, but G1: an unchecked detail |
| `era-replay-without-frame-source` (save line) | the builder's own 6.1 | `sdkReplay` 200, `storedAfter` the chosen value | right as a description; I rate it here (F4) |
| `era-optimistic-save-casconflict` (save line) | REVIEW-3, row 3, "removal branch", rated right | 409 declined without the stamp, 409 `CasConflict` with it | right, exact |
| `R4-9-optimistic-replay-rule-on`, `R4-9-...-attack3` (save line) | REVIEW-4 R4-9, Low | none | the right case, but G1 |

A run passes only on exactly the listed failures in both checkers, at the granularity each uses:
- **`expected.py` (era3)** matches case, message and detail text. On my reruns it passed exactly the listed ones:
  - `a7-on`: 1 listed (R4);
  - `b7-on`, `q2-on`: the 2 M3 entries;
  - `b7-off`, `a7-pg`: none.
- **`expected_save_line.py`** matches test names per setting (G1).

**Question 4: fuzz7's P3 (`fa71ac485`): the change is right.**
- **Why RemovalLogBehind is a right answer there:** when the event put the log back behind the data, every request
  waits with 503 `RemovalLogBehind` until the rebuild route (20.5, step 4). That check comes before the policy check,
  so the save of the missing attribute is refused, typed, and nothing is stored. Accepting it only for the log-put-back
  events, never as "any 503", keeps the oracle exact.
- **The relaxed check still fails on a real fault.**
  - **The fault planted:** `check-writes!` without its policy-behind hold, so a save of the attribute the stored
    policy lacks is stored while the policy is behind.
  - **With the fault:** 226 P3 violations in 2,000 schedules (seed 7801, log boundary, sealed). All 226 are on
    data-restore events (the stored policy set back), the save answered 200 each time.
  - **Without it, same seed and schedules:** 0 violations, 32,993 oracles.
  - **No planted store hid behind RemovalLogBehind:** the log-put-back events refused the save before the planted
    check could matter.

**Question 4b: the five rule-off checks (`9d08319cd`).** Each new expected answer is the save line's fourth pass, which
the one branch runs since `65a851d1b`, and matches what I measured on this head:

| Check | New expected answer, rule off | Right? | One-branch caller sees a change the readiness page lists? |
| --- | --- | --- | --- |
| `replay-rule-off`: a source-less save of a removed subject's value | 409 `ErasureReplayDeclined`, value not answered, no stamp | yes; the paired run's source-less case is 409 on `65a851d1b` and here alike | **no**: the page lists "the merged rule's frame on every save and the declined commands recorded" (row `07ee03fec`), not that this save, stored until `65a851d1b`, is now refused |
| merged-rule 2: the declined command sent again | 409 | yes (when the first save stated a frame; W1 for one that did not) | no (as above) |
| merged-rule 3: optimistic first attempt with a fresh stamp | 200 | yes (R3-6) | unchanged answer |
| merged-rule 3b: a null first source with a fresh own source | 200 | yes as a description of the rule-off path; it is F4's form, the gap, not a target | unchanged answer |
| merged-rule 4: a stamp before the removal | 409 | yes (`frame-of` reads `removalSeen`) | no |
| merged-rule 7: another account's save under the declined command's name | 409 | yes with the account setting off (command IDs database-wide) | no |

The behaviour changes are the one branch's own (`65a851d1b`), not this branch's. The readiness page should list the
answers a caller sees, not only the mechanism:
- a save that states no frame of a removed family is refused (it was stored);
- a declined command stays declined;
- another account's save under that command name is refused while the setting is off.

**Question 4c: M3 (`8fb5f87c2`): closed with every option off, still as rated with the rule on.**
- **Every option off (`b7-off`):** the 20 stateless declines wrote 0 datoms and the other caller's save was answered
  200 (no command taken).
- **With the rule on (`q2-on`, `q2-subject`, `b7-on`):** 13, 60 and 3 datoms and the other caller's save 409, as the
  seventh review rated it.

## Question 5: older SDKs and R4-9

**Decision: deployment alone is acceptable for turning the replay rule on. It is not acceptable as the only guard
against the gap. The gateway check goes in as two halves, neither of which blocks the flip.**

- **Why the flip need not wait.** The gap (F4) is the same with the rule off and on: the builder's
  `r2-2-replays-across-a-removal` stored the value chosen before the removal on 2 of 2 writers in each (`era-off`,
  `era-on`). With the rule off, the save line's `frame-of` judges a replay with no `frameSourceK` by its own fresh
  `sourceK`; with it on, the merged rule does the same. Refusing the flip until the check exists closes nothing.
- **Why deployment alone is not enough for the gap.** The failure is silent: a removal acknowledged, its value stored
  again, no refusal and no line. This line's recurring fault has been a rule held outside the database disagreeing with
  the data (S1 is one more). "Every caller runs a frame-stating SDK" is such a rule.
- **What can tell old from new.** Only `removalSeen`.
  - This branch's SDK states it on every save when the rule is on: every answer carries the stamp header, and an
    optimistic commit reads it first.
  - The one branch's current SDK does not state it. Its non-optimistic first attempt states only `sourceK`, exactly
    like an older SDK's replay.
  - So any refusing check keyed on the frame turns away the one branch's SDK. That is the rollout's cost, and it is
    the same order the flip already assumes.
- **The two halves:**
  1. **With the flip: count, refuse nothing.**
     - **What it counts:** every save that writes a protected value and states no `removalSeen` while the rule is on,
       per database, counted and logged at most once a minute (as the decline line is).
     - **Why:** that count is the rollout's evidence, instead of an assumption.
  2. **Before a protected database is written by any caller outside this SDK: refuse.**
     - **The rule:** such a save answers 409, as the builder sketched.
     - **Where it is held:** as a one-way value in the database (moved by an operator route when the count has been 0
       for a window), not a per-process switch, so a mixed fleet cannot disagree (S1's lesson).
- **Which writers are exempt, and why:**
  - **Exempt:** only writes the gateway fences with a ticket it checks against the current frontier. A settlement
    or derived-copy frame carries `erasureSeq` (`privacy/ensure-seq!`), and a delivery's source is checked
    (`check-source!`). A stale ticket is refused, so the ticket is the frame.
  - **Not exempt by a label the caller sends.** `writeClass "import"` is set by the request: an import frame carries
    no ticket and must state the stamp like any save, or be given a ticket.
  - **Not affected:** a write of no protected value; the check runs only when `written-protected` is not empty.

## Question 6: the three switches

All three are process settings: an environment variable read at load, defaulting to one compiled line
(`removal_commit.clj` `switch` 1008). None is a value in the database. Per-account removal is itself a process option
(`TX2_REMOVAL_PER_ACCOUNT`) beside a one-way value per database.

| Switch | Turned on by | A mixed fleet at the seam | Ready for the one branch's default? |
| --- | --- | --- | --- |
| (i) the replay rule (`replay-rule-default`, `TX2_REMOVAL_REPLAY_RULE`) | the process | **S1**: a command declined on one side is stored on the other when the request names its account; **W1**: a stateless decline is recorded on the rule-on side only; the stamp header is sent by rule-on gateways only (harmless: a rule-off gateway reads `removalSeen` through `frame-of` too) | **not until S1's keys agree**; then yes, with the paired condition for `off` changed to `[11, 11]` in the same commit (7.1, item 6) |
| (ii) the completion worker under the database-wide rule (`TX2_REMOVAL_WORKER_DATABASE_WIDE`) | the process | a stale removal is completed by whichever gateway's worker has the switch; completion is the client's resend, so two kinds of gateway cannot disagree; one is enough | yes (B2 on the flip, the builder's; nothing new here) |
| (iii) protected attributes refused on an unsealed database (`TX2_PROTECTION_SEALED_ONLY`) | the process; the override `TX2_PROTECTION_UNSEALED_FOR_TESTS` too | a declaration through a process without the switch (an older build, or `=0`) creates an unsealed protected database, which every gateway then keeps working and reports at start (`triplex.protection-unsealed.v1`, `atStart`) | yes, only together with the SDK's `declareProtection` default changed to sealed and every harness given the override; the override must never reach a deployment (it disables the decision with no line beyond `"override": true`) |

Of the three, only (i) decides a save's outcome per process, and so only (i) shows the recurring fault: a rule chosen
per process disagreeing with the database's record (S1).

## Question 7: the carried findings on this head

| Seventh review's finding | On `1be3efbab` | Evidence |
| --- | --- | --- |
| R5: no acknowledged line in 4 of 10 ways | fixed: 10 of 10 ways print it once | `a7-on` (file), `a7-pg` (PostgreSQL): 0 violations; with the journal, J1 |
| R2: any caller protects a number attribute, every save of it 400 for good | fixed for an attribute that holds numbers: the addition is refused 409 `ProtectedTypeUnsupported` and numeric saves stay 200; residual R2b, scale cost L1 | `a7-on` R2, 4 of 4 |
| R3: a name only the copy lists stops every account's writes | fixed: only saves writing it wait; `removal-policy-copy-drop` adds nothing | `a7-on` R3 (the builder's adapted oracle), 4 of 4 |
| R6 = M4: a stored save resent answered declined | fixed: 409 `OperationDuplicate`, as with every option off | `a7-on`, `a7-pg` R6; `b7-on`, `q2-on`, `q2-subject` M4, fast and general |
| M1-c: creations and import frames, 3 of 27 | fixed with the rule on: 27 of 27 on all six writers | `q2-on`, `q2-subject`, `b7-on`; with the rule off 26 of 27 (a stamp alone does not frame a creation there; the decline is on the exact side) |

## Question 7b: the entity cache

**The test (`review8.clj` `c`).**
1. A database with a1, b1 and c1. Each of them is read through every route that uses the parsed-entity cache, at
   the head and at a pin before the removal:
   - rows (`v1/read`), rows with history, rows pinned;
   - `reach-many`, `reach-many` pinned, a reach session;
   - `batch` (reach and rows), `batch` pinned.
2. The reading gateway's state is kept: its verified frontier and its cache entries for the database.
3. a1's values are removed through the gateway that takes the removal, which then reads through every route.
4. One of two triggers decides how the reading gateway learns of the removal from its key pass:
   - **another removal's intent recorded:** the pass's own cut advances the frontier (with no database, so the drops
     wait for the next request's cut);
   - **the log's policy copy rewritten** by a protection call: the pass's cut is refused, and `shred-after-failure!`
     (the repair path, where the builder added the drop) advances it.
5. The reading gateway's state is put back, and one key pass runs, as on a gateway that did not take the removal.
6. Reads through every route at both pins, with the drop hook in place or planted out of the pass.

**Results:**
- **Removed values answered:** 0 on any route, on either gateway, in 224 cases (112 with the drop hook in place, 112
  with it planted out). Modes and options:
  - per account (log and commit boundary), the subject check, database-wide;
  - file and PostgreSQL; unsealed and sealed;
  - the four combinations of the pinned short-cut and the cut lookup;
  - with `TX2_RECENT_REVISIONS=1` and `TX2_READ_PREFETCH=1`.
- **The paths under test ran:**
  - the frontier advanced in every case (0 to 1);
  - the repair path ran in the 96 copy-trigger cases (one `shred` failure counted, then the re-read);
  - every route answered the value before the removal, and b1's value after it (all but the session's second call,
    which omits an entity the session holds).
- **What the drop changes.**
  - **In place:** a1's parsed entry is gone at the first request after the pass (1 to 0, one drop counted).
  - **Planted out:** the entry stays (1), and the reads hit the cache (12 hits against 11 with the drop). Still no
    route answers the value, because each one masks at answer time from the request's frontier (`privacy/masked`,
    `reach/append-protected-rows!`).
  - **So the drop does not keep the value out of answers; the answer-time mask does.** What the drop does is take
    the removed rows out of the reader's memory.
- **Sensitivity:** with that mask also planted out, the test finds the value on 14 of 14 checked routes, per
  boundary.
- **The question reader:** its routes (`ids`, `sweep`, `find`) do not read the parsed-entity cache. The cache's users
  are `reach`, `reach_late`, `batch`, `recent` and `main`, by code. Not run as a separate process.

## Question 8: the pinned-read rules

**Result:** 0 removed values answered, and 0 audit violations.

**The test (`review8.clj` `p`).**
1. **The writes:**
   - a1 saved three times (each save retiring the one before) and b1 twice;
   - a1's values removed;
   - c1's removal stopped after its native commit and then published (the rebuild route per account, the resend
     database-wide);
   - a new value of a1 framed after the removal.
2. **The reads:** at every position from 1 to the head (10 pins), under each of the four read option sets: rows
   pinned, rows with history pinned, `reach-many` pinned, `batch` pinned.
3. **The audit:** the pinned-read review's log audit (`rd6/attacks.clj` `audit` at `968d60bf4`, the same rule) over
   every transaction.

**Results** (log and commit boundary, unsealed and sealed; per account, the subject check, and database-wide on the
log boundary):
- **Reads:** 160 per case, 0 removed values answered, the new value answered at the head by every route.
- **Audit:** 17 to 25 transactions per case, 0 subjects retracted without an assertion on them, 0 grouped-save
  positions retracted or repeated. Every retraction of a subject datom (`:triplex.entity/row`) came with an assertion
  on the same subject (`:triplex.entity/rev`).
- **With the stop points installed** (`p2-on`, `p2-subject`, `p2-off`; the first runs lacked them, so c1's stop did
  not stop): c1's removal stopped after its native commit (503 `OutcomeUnknown`), the rebuild route 200 per account,
  the resend 200; again 0 removed values at any pin, 0 audit violations (17 to 25 transactions).

## What held

| What | Runs | Count |
| --- | --- | --- |
| Options off against the one branch `65a851d1b`: the paired native log | `paired` | every datom identical (653, 698), replies identical on every arm; per account and commit boundary identical but the 11 decline datoms; the source-less case 409 on the one branch, on this head and on the corrected trial merge `9fe2e5f02` |
| Stored-function identities against `65a851d1b` (the tools from that commit) | `idents` | 70 of 70 equal in each of 11 writer settings (base, server, server-wide, server-wide-hints, serial-retire, owner-head, several, create, questions, index, accounts); 0 differ, 0 missing; 2 new keys, `removal-scope/fence-ident` and `fence-code` |
| The merge with the save line, rule off, every writer | `q2-off`; control `q2-faulty` (`f17410ed5`) | 27 combinations on each of six writers: 0 removed values stored, 20 declined and 7 stored on the four non-creating writers as the merged rule says (the fourth pass reads `removalSeen` too); the faulty merge stored 27 of 27 on those writers, 20 of them removed values |
| The same, rule on | `q2-on` (database-wide), `q2-subject` (per account) | 27 of 27 on all six writers; M2 resend declined and new command stored |
| The save line's R2-2 group (REVIEW-4's tests at `84d470328`, `S5_ONLY=r22`) | `r22-off`, `r22-on`, `r22-gen-off`; control `r22-faulty` | 23 of 23 rule off; 22 of 23 rule on (R4-9); the general writer only: the race test's 10 harness assertions (503 `OverlappingFileLockException`, 5 of 5, the listed form); the faulty merge: `r2-2-replays-across-a-removal` stored the value chosen before 4 of 4 (REVIEW-4's R4-3) |
| The entity cache (7b) | `c-on2`, `c-subject`, `c-pg`, `c-recent`, `c-all`, `c-off`, `c-pg-off`, `c-all-off` | 224 cases and 13 sensitivity cases, 1,297 oracles, 0 violations |
| The pinned-read rules (8) | `p-on`, `p-subject`, `p-off`, and with the stop points `p2-on`, `p2-subject`, `p2-off` | 20 cases, 60 oracles, 0 violations |
| The seventh review's cases on this head | `a7-on`, `a7-pg`, `b7-on`, `b7-off` | 50, 34, 22, 4 oracles: only the listed failures |
| fuzz7 control (seed 7801, 2,000 schedules) | `f7-control` | 32,993 oracles, 0 violations |
| R2 and R3 on PostgreSQL in process (the copy-drop route) | `a7-pg-r3` | 16 oracles, 0 violations |
| The acknowledged journal across a restore, PostgreSQL | `st-journal` (log boundary), `st-journal-commit` | the same on both boundaries: 2 journal lines, 2 `RemovalAcknowledgedLost` lines (one per gateway, J1), the values answered again until step 5, then 0, and 0 lost lines after a restart |

## Not tested

1. **Scale:** nothing ran on a server; L1 is by code.
2. **The question reader as its own process** (`TX2_QUESTION_READER=1`): by code it does not read the parsed-entity
   cache.
3. **The SDK end to end:** no SDK build here; the gateway answers only.
4. **Switches (ii) and (iii) flipped under the attack arms:** the builder's flip arms only; (i) was run on in every
   rule-on arm here (`q2-on`, the `r22-on` group, S1).
5. **A gateway replaced between the removal and the restore** (J1's fleet gap): read from the design, not run.
6. **The stack with each switch flipped:** the restore stacks ran with every switch at its default.

## Tests, evidence, cleanup

Every heavy step ran through `node lab/bin/heavy.mjs --label DX-ERA3-8-<step> -- <command>` with `DOCKER_HOST` set to
the lab VM's socket, at most two at a time. `SRC` is `1be3efbab` (`ERA3_SOURCE_REF`).

- **7b (C):** `ERA3_MAIN=r8 ERA3_SOURCE_REF=1be3efbab ERA3_EXTRA_ENV="TRIPLEX_ERASURE_SHRED_GRACE_MS=0 TX2_READ_BATCH=1
  [TX2_RECENT_REVISIONS=1 TX2_READ_PREFETCH=1 ERA3_R8_ALL_READ_OPTIONS=1]" bash lab/experiments/EXP-DX1/era3/run.sh
  <out> <on|subject|off> c` (`ERA3_PG=1` for PostgreSQL).
- **S1:** the same with phase `s1`, mode `off`, with and without `TX2_ACCOUNT_CLAIMS=1` in `ERA3_EXTRA_ENV`.
- **P:** phase `p`, modes `on`, `subject`, `off`.
- **Question 2:** `ERA3_MAIN=r7b ERA3_TESTS_REF=99359fa93 ERA3_SOURCE_REF=<1be3efbab|f17410ed5>
  ERA3_EXTRA_ENV="TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1
  [TX2_REMOVAL_REPLAY_RULE=1]" run.sh <out> <off|subject> "m1 m3 m4"`; the save line's group with `ERA3_MAIN=s5a3
  ERA3_TESTS_REF=84d470328 ... S5_ONLY=r22`.
- **F4:** `ERA3_MAIN=s5era ERA3_TESTS_REF=99359fa93 ... run.sh <out> off -`, with and without
  `TX2_REMOVAL_REPLAY_RULE=1`.
- **Question 4:** `ERA3_MAIN=<7plant|7> ERA3_BOUNDARY=log ERA3_N=2000 ERA3_SEED=7801 ERA3_SEALED=1 run.sh <out> on
  fuzz7`.
- **Carried findings:** `ERA3_MAIN=r7 ... run.sh <out> on "r1 r2 r3 r4 r5 r6"` (`ERA3_PG=1`: "r1 r4 r5 r6", and
  "r2 r3"); `ERA3_MAIN=r7b ... "m1 m3 m4"`.
- **Question 1:** `bash era3/idents7.sh <out> 65a851d1b 1be3efbab`; `bash era3/paired7.sh <out> 65a851d1b 1be3efbab
  9fe2e5f02 99359fa93`.
- **J1:** `BOUNDARY=<log|commit> SEALED=1 SOURCE_REF=1be3efbab
  DX_GATEWAY_ENV_WRITE=TX2_REMOVAL_ACK_JOURNAL=/tmp/ack/journal.jsonl
  DX_GATEWAY_ENV_READ=TX2_REMOVAL_ACK_JOURNAL=/tmp/ack/journal.jsonl bash era3/stack6.sh <out> <bodies>
  restore-journal`, the bodies from the seventh review's evidence.
- **Run notes:**
  - The first `c-on` run counted the reach session's second answer as a control (it omits an entity the session
    holds) and used a stop point the r8 runs had not installed; it is kept and not counted, and `c-on2` replaces it.
  - `p-*` ran without the stop points; `p2-*` with them.
  - `ERA3_7B_RULE_OFF` (an oracle that ignored `removalSeen`) was dropped before any run used it: the fourth pass
    reads `removalSeen` (`frame-of`), so the merged rule's oracle applies with the rule off too.
  - The first `s1-off` run named the account `acct/a`, which the account rule refuses (400 `InvalidValue`); it is
    kept and not counted, and `s1-plain` and `s1-claims` name it `a`.
  - Each run's `tests` file names the commit its tests came from.
- **Evidence:** the archive `DX-ERA3-8.tar.gz` in the lab's evidence folder for this reviewer (outside the
  repository): every run's log with its image and source commit, the identity and paired outputs, the stacks' steps,
  replies, start-check lines and journals.
- **Cleanup, 00:19 EST:**
  - `docker ps -a --filter label=tx2.holder=DX-ERA3`: 0 containers;
  - by name (`tx2-dxera3*`, which covers the stacks' and PostgreSQL containers): 0;
  - no `dxera3` network, no volumes;
  - no image built, pulled or removed.

Branch head: the commit that adds this page's final form, "DX-ERA3: eighth review ..." (`git log -1 --
lab/experiments/EXP-DX1/era3/REVIEW-8.md`), on `exp/DX-ERA3-removal-review`.
