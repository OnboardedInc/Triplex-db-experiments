# Second adversarial review: the fixed removal guarded per account (DX-ERA3, 2026-11-24)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges the fixed head
`origin/exp/DX-ERA2-removal-per-account` at `27733d980` (code unchanged since `5114a74b0`). The removal code was not
changed. This pass adds `era3/attack2.clj` (cases E1 to E9 and a second fuzzer whose schedules include the declaration
step and late transactions), `era3/stack2.sh` and `era3/stack2-ack.mjs` (four stack scenarios), and runs the first
review's tests again on the fixed code. Mac only, toy sizes, the lab VM shared with other builders; every time is
diagnostic. The diff was read first and the suspicions written down (19:25 EST) before the page's section 14 was read.
Written 2026-11-24, 20:09 to 20:13 EST. Every container of every run ran the pinned runtime image
`sha256:21a67288007d...` (PostgreSQL `sha256:526f86d93c6e...` on the stacks), recorded per run in `image-ran` or
`images-ran`.

## Page 1, for the owner

**Is there a break now? Yes, one, and only after an operator mistake. Without that mistake I found none.**

- **The break (N5).** An operator restores the removal log (the removal authority) from a backup older than the data.
  The next removal's first step then releases an account that had lost a value. A derived write that read that value
  before its removal then commits after it, and its copy is readable once the correct log is back.
- **How sure:** certain. It reproduces every time in-process, on both per-account settings. On today's database-wide
  rule the same sequence is refused (503) and leaves no copy, so this is a regression.
- **Not run:** this case on a stack.

**Is F1 truly closed? Yes, on every route I could find, unless N5's operator mistake happens.** Three lines enforce it:

- **Tickets naming no account:** `removal_commit.clj` line 50,
  `[:db/cas scope :triplex.scope/removal-intent t t]`. It is added to every such write's transaction at `storage.clj`
  line 219.
- **The removal's first step:** every removal's first native transaction moves that value (`removal_commit.clj`
  line 152, called at line 245, before the removal selects anything).
- **Tickets naming accounts:** they are held by the fence's comparison at `removal_scope.clj` line 95. The same first
  transaction sets the counters it compares to minus the removal's sequence.

**What I tried, and what got through:**

| What I tried | Count | Copies that landed after a removal or were readable after its acknowledgement |
| --- | --- | --- |
| Native transactions prepared under the old cut and submitted straight to Datomic, after the removal declared itself, after it committed, and after it answered | 15 in-process; 14,029 in the fuzzer | 0 (every frame and replay with an old ticket refused) |
| The first review's stack case on the fixed code, options 2 and 1 (option 0 unchanged) | 3 stacks | 0 (both frames 503 while pending) |
| A second read gateway with a cached Reach session, read in a loop around 20 acknowledgements | 6,076 reads after them | 0 answered the value |
| Fuzzer schedules: both settings, sealed and unsealed, with the declaration step as a new dimension | 44,000 schedules (308,967 checks) | 0 violations |

**The fix also adds a way to refuse every derived write of the database that names no account, a refusal of
deliveries between databases, and two upgrade hazards.** N1, N2 and N3 reproduce on real stacks; N4 and N5
in-process; each reproduced every time it was run.

**The most serious findings**

1. **N5, the break above.** In `declare!` (`removal_commit.clj` line 151), "the declared sequence equals mine" is
   read as "the earlier declaration is my own, left by a stop". It can also mean "a removal at my sequence committed,
   but the log I was handed does not show it".
   - **What it does:** the step releases that removal's accounts (lines 155-156) to the old log's counters.
   - **Test:** `attack2.clj` `e7b` (`ERA3_PHASES=e7b`).
   - **Per-account settings:** the old frame was refused 503 before the second attempt, committed 200 after it at
     position 5, after the removal at 4, and its copy was readable.
   - **Today's rule:** the same frame was refused 503 at both points, and no copy was left.
   - **E7:** once the correct log is back, frames naming either account are refused permanently, even after another
     removal.
2. **N1: a removal stopped between its declaration and its intent leaves a block that no gateway can see.** It blocks
   every derived write of the database that names no account.
   - **What stays behind:** the declaration stays in Datomic, but no intent was written. No gateway sees a pending
     removal, and the frontier is unchanged.
   - **What is refused:** in every account, every settlement frame, notice or Publish whose ticket names no account is
     refused at Datomic's commit point (409 CasConflict). So is every one naming the removal's account.
   - **How long:** until another removal of the database completes, the same removal is resent, or an operator moves
     the database back and forward or calls the restore route. Time alone never clears it.
   - **It needs no crash.** The declaration's own wait can expire: the removal answers 503 and the declaration lands
     afterwards. If the client does not resend, the block stays.
   - **Before the fix,** a removal stopped at that point left nothing behind.
   - **Stack, `era3/stack2.sh ... orphan`** (the write gateway killed while the intent's INSERT was held):
     `intents pending: 0 | frontier seq 0 | frames with no accounts: 409 CasConflict at 0, 5 and 10 s, after the write
     gateway restarted, and 60 s later | frame naming account a: 409 | frame naming b, plain saves: 200 | after another
     removal: 200`.
   - **Stack, `orphan-wait`** (the wait set to 1 ms, no crash): the removal answered 503 and no intent was recorded.
     Every frame with no accounts was refused for the 91 s observed. Another removal on that gateway also answered 503,
     because the same 1 ms wait applies to it.
   - **In-process and fuzzer:** in-process `e1` reproduces it on both settings and with each of the four ways to clear
     it. In the fuzzer, a probe after 6,250 such stops was refused 409 in 5,546 cases. The other 704 were exactly the
     cases where another removal ran in between.
   - **The builder's own orphan gate case** sends only a frame of the held account and another account's save, so it
     never saw this.
3. **N4: delivery between databases into a database guarded per account is refused.**
   - **The cause:** a delivery (`erasureSourceDatabase`) carries the SOURCE database's ticket.
     `ticket-intent-ops` (`removal_commit.clj` lines 46-50) still adds a compare-and-set of that number against the
     RECIPIENT's declared sequence.
   - **When it fails:** whenever the two numbers differ, which is the normal case. When they happen to match, the check
     means nothing.
   - **Test `e4`:** a recipient with two removals and a source with none; deliveries carrying the current source ticket
     got `409 CasConflict, 409 CasConflict`. The same test on today's database-wide rule got `200, 200`.
4. **N3: on a fleet with mixed versions, one removal by a gateway of an earlier version blocks every new-version
   derived write that names no account.** The block lasts until a removal by the new version runs.
   - **Test, stack `era3/stack2.sh ... upgrade`,** with `OLD_REF=6bc2484f0` and with `272a1bd66`, the same outcomes:
     `frames while it was pending: 503 | resumed on the new version: 200 | frames with a fresh ticket: 409 CasConflict,
     twice ("Compare failed: 1 0") | after a removal by the new version: 200`.
5. **N2: on a database moved per account by an earlier build, the fixed version cannot remove anything.**
   - **Same stack test, both old builds:** `removal by the new version: 400 GatewayError ":db.error/not-an-entity
     Unable to resolve entity: :triplex.scope/removal-intent" (twice) | frame with no accounts: 400 | move back and
     forward: 200, 200 | then removal 200, frame 200`.
   - **The page is wrong here.** Section 8 says such a database is fail-closed "until a removal runs or the database is
     moved back and forward once". A removal does not run on it.
   - **Who is affected:** the page says no such database exists outside the toys.

**One recommendation: merge with named fixes, not as is.**

- **N5:** in `declare!`, treat an earlier declaration at the same sequence as the removal's own only when the native
  `removal-seq` is below s. When the native `removal-seq` is at s or above (the log is behind the data), refuse
  before writing anything.
- **N1:** record something a gateway can see before the declaration. The least change is to write the intent before
  the declaration; the commit's own check already covers the subject's changes after the selection. A stop then leaves
  a visible pending removal, which gateways answer with 503 and any resend completes, as today's rule does.
  - A repair by any gateway is not safe: it cannot tell an orphan from a removal that is between its two steps.
  - The builder must prove the reordered steps again.
- **N4:** skip the declared-sequence check when the ticket names a source database.
- **N3 and N2:** state the order in the page. Every gateway runs this version before any removal runs on a moved
  database. A database moved by an earlier build is moved back and forward on this version first. Alternatively, the
  first removal installs the two attributes itself.

## 1. Findings

| # | Severity | Finding | Reproducing test | Result on `27733d980` | Today's rule | Named fix |
| --- | --- | --- | --- | --- | --- | --- |
| N5 | **High (a removed value comes back), after an operator mistake** | `declare!` releases the accounts of a removal that committed, when the log it was handed is behind the data (`removal_commit.clj` 151, 155-156); an old derived write then lands after the removal | `attack2.clj` `e7b` (`ERA3_PHASES=e7b`, settings `on` and `subject`) | old frame 503 before the second attempt, **200 at position 5 after the removal at 4, copy readable** once the log is back (both settings) | same sequence: 503, 503, no copy (`e7b-off`) | release only when native `removal-seq` < s; refuse when it is ≥ s, before declaring |
| N1 | **High (every derived write naming no account refused, database-wide)** | a stop or an expired wait between `declare!` (line 245) and `prepare!` (line 249) leaves the declaration in Datomic and nothing in the authority; nothing a gateway reads shows it | `e1` (4 clearing routes; `ERA3_PHASES=e1`); `stack2.sh orphan`; `stack2.sh orphan-wait`; fuzzer probe | 409 CasConflict 5 of 5 in-process; stacks: refused through restart and for 60 s and 91 s; fuzzer: 5,546 of 6,250 refused (the other 704 after another removal) | a stop at that point leaves nothing | write the intent before the declaration |
| N4 | **High (a feature stops working)** | delivery between databases (`erasureSourceDatabase`) into a recipient moved per account compares the source's sequence with the recipient's declared one (`removal_commit.clj` 46-50, `storage.clj` 219) | `e4` (`ERA3_PHASES=e4`) | 409, 409 | 200, 200 | no declared-sequence check when the ticket names a source database |
| N3 | Medium (rollout) | a removal by an earlier version leaves the declared sequence one behind the committed one; every new-version ticket naming no account is refused until a new-version removal runs. While such a removal is pending, frames get 503 (safe) | `stack2.sh upgrade` (`OLD_REF=6bc2484f0`, `272a1bd66`); `e3` in-process | 409 twice ("Compare failed: 1 0"), 200 after a new-version removal | n/a | page: no removal before every gateway runs this version |
| N2 | Low (no such database outside the toys) | a database moved per account by an earlier build has no `:triplex.scope/removal-intent` attribute; every removal and every frame naming no account fails | `stack2.sh upgrade` (both old builds) | removal 400 GatewayError twice, frame 400; a move back and forward fixes it | n/a | page section 8 corrected; or install the attributes in the first removal |
| E7 | Low (follows from N5) | after N5's release, once the correct log is back, the released account's counter is behind the log and the declaring removal's account is at -s; frames naming either are refused permanently, even after another removal | `e7` (`ERA3_PHASES=e7`) | frames naming a or b: 409, 409, 409 after another removal; counters a 0 vs -1, b 1 vs 0 | n/a | N5's fix |
| E1b | Low (part of N1) | a removal whose selector reaches an account it did not declare (here forced; in life a lagging peer) refuses with 503 as it should, but after its declaration, which leaves an orphan of the wrong account until resent | `e1-bucket` (in `ERA3_PHASES=e1`) | 503; frames with no accounts 409 until the resend, which completes 200 | n/a | N1's fix |
| E6 | Information (by design) | a ticket that names fewer accounts than its writer read passes, and its copy survives the removal | `e6` | frame naming b, which read a: 200 at position 4, after the removal at 3; copy readable | not run; it compares one database-wide sequence, so it would refuse the frame | none in the store: every caller must name every account it read (page section 5, case 1). Callers not reviewed here |
| E9 | **High against TARGETS 7.3, but older than this branch** | a derived copy recorded BEFORE a removal stays readable after it, in its document and in its own journal, unsealed and sealed | `e9` (`ERA3_PHASES=e9`) on `on`, `subject`, `off` | copy readable, in the journal; 4 native copies unsealed, 2 sealed | **the same** | a separate piece of work (section 2, item e) |
| P1 | Page | section 8: "until a removal runs" is wrong (N2); section 8, order for a fleet: says nothing about versions (N3); 14.2 F1b row and gate case `orphan-and-rebuild`: the orphan was called a pass, but frames with no accounts were never sent (N1) | (page) | | | correct the three places |

## 2. The coordinator's list, item by item (what I ran)

**(a) The declaration step itself. Ran.**

- **A removal that declares and then dies (N1),** in three runs:
  - in-process `e1` on both settings, each cleared four ways: resend 200, another removal 200, a move back and forward
    200 200, the restore route 200;
  - two stacks;
  - the fuzzer: 6,250 stops after the declaration, of which 1,276 were never resent. In every one of the 1,276, once
    another removal of the database had run, a fresh frame with no accounts and one naming the account committed.
- **What the orphan blocks:**
  - every derived write naming no account, in every account;
  - every one naming the removal's account.
  - Plain saves are not blocked, and neither are derived writes naming other accounts.
  - Who clears it is listed above. Nothing clears it with time. It can block every such derived write of the database
    for as long as no removal runs.
- **`rebuild!` and `stale-counter-ops` after a restore:**
  - the restore route clears an orphan (`e1 :restore-route`);
  - the move zeroes counters that the log does not derive (`e1 :move`);
  - counters agree with the log at every fuzzer block end: 220 comparisons of the declared and committed sequences,
    plus every counter, 0 disagreements.
  - Not run: a restore of a real backup.
- **A declaration at s while a removal at s has committed:** `e7` and `e7b` (N5, E7).
- **A declaration at s while a removal at s+1 has committed:** not run.
  - It needs the log two behind the data.
  - From the code: `declare!` does not check that s is above the current declared value, so the compare-and-set moves
    it backward. The commit then fails at `[:db/cas head :triplex.scope/removal-seq (dec s) s]`.
- **Two removals declaring at once:** not run. Both hold the database's authority lock (`privacy/guard`), so this needs
  the lock lost.
  - From the code: the second `declare!` at the same s would take the first's held accounts as its own earlier
    declaration and release them.
  - The first's copies land before its commit, so they are of the E9 kind, not F1.
- **A wrong accounts list:**
  - a ticket naming fewer accounts than it read: `e6`, the copy survives (E6);
  - a removal whose selector reaches an undeclared account: `e1-bucket`, refused 503 after its declaration (E1b).

**(b) The window between a ticket's check and its commit. Ran.**

- **`e5` and the fuzzer's late transactions.** The write's native transaction is captured as its gateway prepared it
  and submitted straight to Datomic later. That bypasses every gateway check, so it is also the case of a ticket
  committed through another gateway. It was submitted:
  - after the declaration;
  - after the commit;
  - after the acknowledgement, with the removal declared, committed and published entirely inside the window.
- **In-process `e5`, per account:**
  - frames with no accounts, frames naming the account and import replays: refused at all three points, 9 of 9;
  - a frame of another account: committed, 3 of 3;
  - a plain save of the subject: at the declaration it committed before the removal's selection and was removed with
    it; after the commit and after the acknowledgement it was refused.
- **Fuzzer, 44,000 schedules:**
  - old-ticket frames, with no accounts or naming the account: refused 14,029 of 14,029;
  - frames of another account: committed 7,204;
  - late saves of the subject: committed before the removal and removed with it 2,232 times, refused 5,018 times, and
    0 committed after it.
- **A ticket prepared before the move and committed after it (`e8`):**
  - two transactions prepared on the database-wide rule and submitted after the move, without a removal: both refused
    by the database-wide fence (`TRIPLEX_ERASURE_FRONTIER`);
  - two more after a removal: both refused;
  - no copy.
- **Two gateways:**
  - the first review's stack case on the fixed code (`stack.sh`, options 2 and 1, write gateway killed inside the
    publication, read gateway sharing the log): the subject's save 409, both frames 503 while pending, the removal
    resumed 200 (sequence 1, position 3), the frame resent after the acknowledgement 409 ErasureFrontierChanged, no
    copy, a1 no longer answers its value;
  - option 0 unchanged: everything 503 while pending.

**(c) Counters set to minus s. Ran.**

- **A frame or save that reads a negative counter:** the fence compares exactly, and no published counter is negative,
  so the frame is refused. That was 409 in every orphan case above. A plain save fences only on its own subjects, so it
  commits.
- **A stop before the counter is restored:** that is N1.
- **"`commit!` releases declared accounts that lost nothing":** the case where an account that lost a value is
  released is in `declare!`, not in `commit!`. It is N5.
  - In `commit!` itself the released accounts are exactly the declared ones that the entry does not reach (lines
    171-174).
  - Line 248 makes the entry's accounts a subset of the declared ones.
  - I found no other case in the code, and the counter comparisons above found none.

**(d) Byte identity and old databases. Ran.**

- **Paired native log, run by me** (`era2/gate.sh` phase `paired`):
  - option off, and on with the database not moved: identical to `272a1bd66` (twice) and to `6bc2484f0`;
  - hashes: unsealed `e6ea7dfc4eec...` (653 datoms), sealed `033f30cd2767...` (698 datoms);
  - replies identical, md5 `2caaf1e83af2...`.
  - Against `3e3e652b9` the log differs (`d4b11ca64ba8...` and `5197942ff092...`). That is the difference in installed
    function names that the page already records.
- **Databases written by the earlier builds:**
  - `stack2.sh upgrade` with `6bc2484f0` and with `272a1bd66` (N2, N3);
  - a removal started on the old version and resumed on the new one completed, 200 in both databases, and the value
    was removed;
  - in-process `e2` (attribute present but no value): fail-closed until a removal runs, then 200. That matches the page
    for this narrower case only.

**(e) The items the builder lists as not tested.**

- **A Reach session on a second read gateway:** ran (`stack2.sh ack`).
- **Mixed gateways and the move on a stack:** ran (`stack2.sh upgrade`, with the fleet mixed by replacing the mounted
  source and restarting only the read gateway).
- **A gateway killed on a stack:** ran after the declaration (`orphan`) and inside the publication (`stack.sh`), not
  at every step.
- **Restore with the option on, on a stack:** not run.
- **F5, copies made by a derived write before the removal:** ran `e9` on both rules.
  - **What the store promises today:** P5 in page section 2 says a derived write "never re-materialises a value
    removed after its inputs were read". So the only promise is that no copy can land after the removal.
  - **What it does not promise:** a removal reaches only the identities its selectors name. A copy that a derived
    write recorded before the removal, in its own document and in its own journal entry, is not reached.
  - **Tested on both rules:** on today's database-wide rule and on this branch, unsealed and sealed, the copy is
    readable after the acknowledgement and present in the journal.
  - **Against the target:** TARGETS 7.3 asks that erasure reach "every place a protected value or anything derived
    from it lives", or that the value be stored only under a per-subject key that is destroyed. Neither rule meets
    that.

**(f) Is the acknowledgement ever sent before the value is unreadable? Ran (`stack2.sh ack`). No such read was
found.**

- **Setup:** 20 removals on the write gateway, all acknowledged. On the second read gateway, three reads ran in a loop:
  a current read, a read pinned before the removal, and a Reach session cached at that pin.
- **Result:** 7,212 reads, 6,076 of them started after the acknowledgement (session 2,052, current 2,026, pinned
  1,998), and **0 answered the value**. 736 reads that started before the acknowledgement did, which TARGETS 7.1
  allows.

**(g) The fuzzer with the declaration as a new dimension. Ran.**

- **Size:** 44,000 schedules: 22,000 on each setting, 16,000 of them sealed.
- **New dimensions:**
  - a stop and a release right after the declaration;
  - a late transaction of five kinds at three points;
  - a resume that never comes (only after a stop at the declaration);
  - a resume after another removal first;
  - a derived write of another account during the removal;
  - liveness probes after every schedule.
- **Results:**

| Run | Setting | Sealed | Seed | Schedules | Checks | Violations |
| --- | --- | --- | --- | --- | --- | --- |
| su1b | subject | no | 501 | 7,000 | 47,882 | **0** |
| su2b | subject | no | 502 | 7,000 | 47,874 | **0** |
| ss1 | subject | yes | 701 | 8,000 | 58,616 | **0** |
| ou1 | per account | no | 601 | 7,000 | 48,041 | **0** |
| ou2 | per account | no | 602 | 7,000 | 48,046 | **0** |
| os1 | per account | yes | 801 | 8,000 | 58,508 | **0** |
| co2, with DX-IMP2 | per account | no | 902 | 2,000 | 13,744 | 4, all the `e1` orphan cases (N1) |
| cs2, with DX-IMP2 | subject | no | 901 | 2,000 | 13,828 | 4, all the `e1` orphan cases (N1) |

- **What the checks cover:**
  - derived writes sent during a stopped or completed removal: 9,552, none landed;
  - liveness after every completed schedule: a fresh frame with no accounts and one naming the account, 42,724 pairs,
    all 200;
  - removals completed within three resumes, including resumes on a gateway with the other setting.
- **The import resend of an entity named before it had a row** committed 472 times on this branch alone (the
  builder's known item 8). It committed 0 times composed with DX-IMP2 (`exp/DX-ERA3-compose-imp2-v2`, `ad7c62c16`,
  local only, `TX2_IMPORT_WHOLE_SUBJECT=1`).
- **Earlier runs not counted above:**
  - su1 and su2 used the same seeds with an earlier oracle, which flagged values of removals that never ran (8 and 14
    flags, 0 real);
  - a 400-schedule smoke run.
- **Derived journal entries in clear at block ends:** 44 across the six runs. None held a copy of a removed value.
  - **How I checked:** I reran the first 1,200 schedules of ou1 with a print of every derived write that landed
    (`dbg-ou1-on`, the `ERA3_DERIVED_LANDED` lines).
  - **What landed:** both were late frames naming the account, in schedules whose removal stopped after its declaration
    and was never resent. The next removal, of another account, released the orphan's account, and the frame then
    committed.
  - **Why that is allowed:** the frame's value had never been removed. When such a removal is resent later, the copy is
    one made before the removal (E9).

## 3. What I could not test

1. **N5 and E7 on a stack** (in-process with the file authority only; the code path is the same with PostgreSQL).
2. **Restore with the option on, on a stack**; only the restore route and the move, in-process.
3. **A gateway killed at every step on a stack**: only after the declaration and inside the publication.
4. **A late transaction submitted through an old-version gateway on a mixed fleet** (the open F1 window while a fleet
   is mixed): argued only; old-version tickets carry no declared-sequence check, so the fix protects only once every
   gateway runs it.
5. **Two removals at once with the authority lock lost**, and a log two behind the data: argued from code (section 2a).
6. **The owner-root fold under the guard**, and the PostgreSQL advisory lock's fairness (the builder's items 4 and 6).
7. **Whether the branch's callers that name accounts name every account they read** (E6 depends on it).
8. **No server run**: toy sizes only; no time here is a measurement.

## 4. Tests, how to run them, evidence

- In-process: `ERA3_MAIN=2 node lab/bin/heavy.mjs --label <name> -- bash lab/experiments/EXP-DX1/era3/run.sh
  <new dir> <on|subject|off> "<cases>"`, with cases from `e1 e2 e3 e4 e5 e6 e7 e7b e8 e9 fuzz2` (the third argument
  becomes `ERA3_PHASES` in the container). Fuzzer settings: `ERA3_N`, `ERA3_SEED`, `ERA3_BLOCK=200`, `ERA3_SEALED=1`.
  `ERA3_SOURCE=<checkout>` runs another checkout's gateway source; `ERA3_EXTRA_ENV` passes settings.
- Stacks: write the request bodies once (`run.sh <dir> subject bodies2` with `ERA3_MAIN=2`), then `bash
  lab/experiments/EXP-DX1/era3/stack2.sh <new dir> <bodies> <orphan|orphan-wait|ack|upgrade>` (`OLD_REF=<commit>` for
  `upgrade`); predictions are written in its header and were written before the first run. The first review's stack
  case: `era3/stack.sh <new dir> <bodies> <0|1|2>`.
- Evidence (private, not in the repository): `DX-ERA3-2.tar.gz` in the project's evidence folder.
