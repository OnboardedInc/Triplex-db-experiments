# Third adversarial review: the reordered removal guarded per account (DX-ERA3, 2026-11-24)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review`, which merges `origin/exp/DX-ERA2-removal-per-account` at
`3edb9f5d9` (gateway code at `e921f3ef1`). The removal code was not changed. This pass adds:

- `era3/attack3.clj`: cases K2 to K12, and a third fuzzer whose schedules add a second, active gateway;
- `era3/stack3.sh` and `era3/stack3-ack.mjs`: two stack scenarios;
- a rerun of the second review's cases E1 to E9 on the new code.

Conditions: Mac only, toy sizes, the lab VM shared with other builders; every time is diagnostic. The diff and both of
the builder's edits to my tests were read before the page's section 15. Predictions were written at 22:28 EST, before
the first run. Every container of every run ran the pinned runtime image `sha256:21a67288007d...` (PostgreSQL
`sha256:526f86d93c6e...` on the stacks), recorded per run. Written 2026-11-24, 22:56 to 23:05 EST.

## Page 1, for the owner

**Is there a break now? Yes, one, and again only after an operator mistake (M1). I found none without one.**

- **The mistake:** an operator puts back a copy of the removal log that was taken while a removal was pending in it.
  The removal had since been published (in-process also acknowledged to its client).
- **What happens:** nothing refuses. The pending removal in the copy accounts for the commit in Datomic, so the new
  agreement check sees no disagreement. Every read route then answers the removed value again. This lasts until a
  derived write, a removal or the resend arrives and completes the removal a second time.
- **How sure:** certain. It reproduced every time in-process, on both per-account settings, unsealed and sealed.
  It also reproduced on a real stack with the PostgreSQL authority (`stack3.sh logpending`).
- **Today's rule:** the same sequence answers 503 to every request and never answers the value. So this is a
  regression.

**Are N1, N4 and N5 truly closed? Yes, as I reported them.** The second review's own tests now pass on both settings:

| Finding | Closed by | My test on the new code |
| --- | --- | --- |
| N1 | `removal_commit.clj` line 409 writes the intent, then line 411 declares; a refused write completes the removal (`main.clj` 501-502, `complete-pending!` at `removal_commit.clj` 440) | `e1`, all four clearing routes: the first frame naming no account 503, the next four 200, the removal published |
| N4 | `removal_commit.clj` line 139: no recipient check for a ticket naming another database | `e4`: 200, 200 |
| N5 | the agreement check before anything is written (`removal_commit.clj` 402), `declare!`'s own check (271-272), `rebuild!` (491), every request (`erase.clj` 329-331) | `e7b` and `e7`: 503 `RemovalLogBehind` while behind, no copy; counters agree once the log is back |

Two of these fixes are incomplete beyond the cases I first reported:

- **N5's check misses a copy taken while a removal was pending.** That is M1 above.
- **N4's exemption goes further than N4 needed.** A derived write that names any other database as its source loses
  every check of its own database's removals (M2).

**The most serious remaining findings**

1. **M1, the break above.**
   - **Where:** `disagreement`, `removal_commit.clj` lines 79-85. The log's top is the pending removal when it is one
     past the head (line 81), so a commit in Datomic at that sequence is "in agreement".
   - **Why it matters:** reads are served from the published head while a removal is pending. That is allowed before
     its publication (TARGETS 7.1: the boundary is the publication), but this copy undoes a publication that already
     happened.
   - **Tests:** `attack3.clj` `k6` (`ERA3_PHASES=k6`).
   - **One behind, per-account settings:** a read of a1 200 and the value answered, unsealed and sealed; a save of
     another account 200; the first frame naming no account 503, after which a1 is masked again.
   - **One behind, today's rule:** every request 503 and the value not answered.
   - **Two behind:** `RemovalLogBehind` on both per-account settings.
   - **Stack, `era3/stack3.sh ... logpending`** (the write gateway paused after its declaration, the PostgreSQL log
     rows copied, the gateway killed, the removal completed by the read gateway and published as sequence 1, then
     the copy put back and the read gateway restarted):
     `start check: 0 lines | published sequence seen 0, 1 pending | read of a1: the value answered 3 of 3 times over
     4 s | a save of another account 200 | a frame naming no account 503 | then a1 not answered`.
2. **M2: a derived write that names another database as its source escapes every check of its own database's
   removals.**
   - **What happens:** prepared before a removal and landing after it, its copy is readable after the acknowledgement.
   - **Today's rule:** refuses the same transaction with its own database's sequence (`storage.clj` 221,
     `[:db/cas scope :triplex.scope/erasure-seq seq seq]`, from the write's own cut).
   - **Test `k8`:** on both per-account settings the late transaction committed at position 4, after the removal at
     3, and its copy was readable. On today's rule it was refused (`TRIPLEX_ERASURE_FRONTIER`) and left no copy.
   - **What it needs:** a write that names a source it did not read, which is a caller's fault. The client states the
     source the way it states its accounts (E6). Unlike E6, though, today's rule protects this case.
3. **M3: the bound of page 15.3 fails without 1 ms waits.** It fails when a removal's commit takes longer than the
   wait and the subject is saved while that commit is in flight. No value survives; the removal never completes.
   - **The mechanism:** each contact makes one commit attempt that lands late and is refused (the subject moved). The
     subject guard is never taken, because the attempt count restarts with every request (`erase!` loop, line 414,
     `tries 1`).
   - **Test `k4`** (the wait 300 ms, the commit landing at 600 ms, one save of the subject in flight each time):
     10 of 10 contacts refused, 10 late commits refused, still pending.
   - **The control without saves:** published at the second contact.
   - **The size:** in-process a commit costs 21 to 27 µs per identity removed (4,000 identities in 84 to 109 ms).
     At that rate the 5 s wait is passed near 200,000 identities. A real transactor writes to storage and is slower;
     I did not measure it. The same commit is sent by every gateway, so the default wait fails on all of them at
     once.
4. **M4: a delivery refused because its source has a pending removal starts no completion** (`main.clj` 484 reads the
   source's cut without its pending removal, so it answers a plain 503).
   - **Test `k7`:** 5 of 5 deliveries 503 and the source's removal still pending. It completed only when a write in
     the source arrived.
   - The page's "every refusal starts the completion" does not hold for these.

**One recommendation: merge with named fixes, not as is.**

- **M1:** a request that finds the pending removal already committed in Datomic either publishes it before serving,
  which needs only the authority write, or masks reads by that native commit's identities. A restored copy can then
  never make an acknowledged value readable.
- **M2:** for a ticket naming another database, compare-and-set this database's own committed and declared sequences
  as read at request time. That is what today's rule does with its sequence. It does not bring N4 back: N4 compared
  the source's number with the recipient's.
- **M3:** a resumed removal takes its subject guard before its first commit attempt, or the intent counts attempts
  across requests.
- **M4:** tag the source-pending refusal and complete the source's removal.

**Is the design converging, or should the per-account rule be rebuilt? Converging. Do not rebuild the per-account
rule; simplify the one place where faults keep appearing.**

- **What has held.** The per-account guard itself has held for three rounds: the counters, and the checks at
  Datomic's serial point inside one database. In normal operation no copy landed after a removal in 198,000 fuzzer
  schedules since the first fix: the builder's 114,000 and my 84,000, including 40,000 this round with a second,
  active gateway. Another 16,000 ran composed with DX-IMP2. Both fixes so far
  repaired what I reported, and their tests pass.
- **Where every finding sits.** Every finding of rounds 2 and 3 sits at one of two boundaries:
  - between the external removal log and Datomic: N1, N5, E7, M1;
  - between databases: N4, M2, M4, K9.
- **Why the fixes keep producing faults.** Each round's fix added states at the first boundary: intents, declarations,
  completions and agreement checks. The next round found the edge of the new states.
- **The simpler mechanism.** Let a removal take effect for reads at its native commit, not at the log's publication.
  The log could then only lag behind the data, never undo it, and the window, the completions and the agreement checks
  would matter only for liveness. The one-database goal removes the second boundary.
- **Who decides.** Moving the boundary of TARGETS 7.1 from publication to the native commit is the owner's call.

## 1. Findings

| # | Severity | Finding | Reproducing test | Result on `3edb9f5d9` | Today's rule | Named fix |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | **High (an acknowledged removed value answered again), after an operator mistake** | the removal log put back to a copy taken while a removal was pending in it; `disagreement` (79-85) sees the pending removal as accounting for the native commit; reads are served from the published head | `k6` (1 and 2 behind, unsealed and sealed); `stack3.sh logpending` | one behind: read of a1 200 with the value, a save of another account 200, until the first frame naming no account (503) completes it again; two behind: `RemovalLogBehind` | 503 for every request, value not answered | publish a pending removal found committed natively before serving, or mask reads by it |
| M2 | **Medium-High (a copy lands after a removal), needs a write naming a source it did not read** | a ticket naming another database gets no check of its own database's removals (`removal_commit.clj` 139) | `k8` | late transaction committed at position 4 after the removal at 3, copy readable | refused (`TRIPLEX_ERASURE_FRONTIER`), no copy | check this database's own committed and declared sequences from its own cut |
| M3 | Medium (a removal that never completes; nothing survives) | a commit longer than the wait, with the subject saved while it is in flight: one attempt per contact, each refused (subject moved), the guard never taken | `k4` (wait 300 ms, commit at 600 ms) | 10 of 10 contacts 503, 10 late commits refused, still pending; without saves: published at the second contact | not run; read from code: saves are refused while a removal is pending, so its late commit cannot fail this way | take the subject guard on a resume |
| M4 | Low-Medium (liveness) | a delivery refused by its source's pending removal is a plain 503 (`main.clj` 484) and starts no completion | `k7` | 5 of 5 deliveries 503, source removal still pending; completed by a write in the source | deliveries refused while the source has any pending removal | tag it and complete the source's removal |
| M5 | Low (needs a lost lock whose session lives; the PostgreSQL authority runs every write on the lock's own session) | a removal that lost its lock records its intent after another removal at its sequence was published (`put-intent!` with nothing expected only checks that no intent exists); every later removal and every derived write naming no account refused, no route out | `k2` | intent `k2-b` at sequence 1 with head 1; 4 of 4 later requests 503 | the same (stuck, 400 then 503) | the first intent write also requires the head it read |
| M6 | Information (the fleet order) | an earlier build's derived write naming no account, prepared before this version's removal and landing after it, commits; its copy is readable | `k10` (the transaction with its sequence checks removed) | committed, copy readable; naming the account: refused by the account fence | (not applicable) | none: the page's upgrade order is the only protection; confirmed |
| K9 | Information (the same as today) | a delivery prepared before a removal in its source and landing after the acknowledgement commits; copy readable in the recipient (page 15.8) | `k9` | committed, readable | **the same** | page 15.8's options |
| E6 | Information (by design) | a ticket naming fewer accounts than it read lets its copy survive | `e6` | unchanged | refused | callers must name every account |
| E9 | High against TARGETS 7.3, older than this branch | a derived copy recorded before a removal stays readable | `e9` | unchanged, both rules | the same | `exp/DX-ERA4-derived-copies` |

## 2. The coordinator's list, item by item (what I ran)

**(a) Completion by another gateway. Ran (`fuzz3`, `k3`).**

- **Two gateways driving one removal at once.** A removal holds the database's lock for its whole request, so a live
  starter and a completer cannot both be inside it.
  - **`k3`:** a starter paused inside its commit, holding the lock, while another write arrived. The write waited for
    the lock (1.0 s), then answered 409 ErasureFrontierChanged. One removal, published once, value gone; the same on
    today's rule.
  - **What remains is a starter whose wait expired:** it answered 503 and released the lock, but its native step is
    still in flight. On PostgreSQL a lost lock also loses the session that carries the starter's writes, so the only
    concurrent driver is that in-flight step (M5 covers the file authority).
- **`fuzz3` makes exactly that state:**
  - the starter's declaration, subject guard or commit is held back as an expired wait leaves it;
  - the subject, a new subject or another subject of the account may change;
  - a second gateway (fresh cut cache) completes the removal by a resend, a refused derived write (no account, or the
    account), or a removal of another command, and may itself stop at any step;
  - the held-back step lands before the completion, after its declaration, between its selection and its commit,
    after its commit, after it answered, or never.
- **Results, 40,000 schedules (20,000 per setting, 20,000 sealed), 356,857 checks, 0 violations:**

| Run | Setting | Sealed | Seed | Schedules | Checks | Violations |
| --- | --- | --- | --- | --- | --- | --- |
| f3-on | per account | no | 3101 | 10,000 | 90,378 | **0** |
| f3-subject | subject | no | 3201 | 10,000 | 90,386 | **0** |
| f3-on-sealed | per account | yes | 3301 | 10,000 | 88,001 | **0** |
| f3-subject-sealed | subject | yes | 3401 | 10,000 | 88,092 | **0** |

- **The held-back steps (31,904 schedules had one):**

| Held-back step | Landed (before the removal's commit) | Refused before the commit | Refused after the commit |
| --- | --- | --- | --- |
| commit | 6,278, each then published as the removal | 4,217 (the subject moved) | 9,430 |
| declaration | 1,331 | 2,905 | 3,859 |
| subject guard | 2,045 | 0 | 1,839 |

- **The three questions, every schedule checked:**
  - **Removed less than it acknowledged?** No. The seed value and every value committed before the removal's position
    were among its identities, and no read route answered any of them: current, history, pinned basis, a Reach session
    cached before.
  - **Acknowledged twice with different contents?** No. The resend's answer, the next resend's answer and the
    completer's own answer were identical. Each equalled the log's entry, and there was one native erasure record per
    command.
  - **Lost?** No. Every removal answered 200 within the completer and at most three resends. Nothing was pending
    afterwards. 40,000 of 40,000 pairs of fresh derived writes (no account, and the account) answered 200.
- **Block-end checks:** counters and the declared sequence equal to the log at every block end.
- **A completer on an older gateway:** not rerun. The builder ran `mixed` with `27733d980` and `272a1bd66` on a stack.
  M6 is the related window.

**(b) Intent before declaration. Ran (`k2`, `k6`, `e1`, `e1-bucket`).**

- **A log restored or truncated after the intent:**
  - restored to a copy from before the intent, while the data holds the declaration or the commit:
    `RemovalLogBehind` on every request (my `e7` and `e7b`, the builder's `log-behind`);
  - restored to a copy holding the intent after the removal was published: M1, the removal is undone for reads.
- **An intent at s while another gateway committed s under a different command:** M5, possible only with a lost
  lock. On PostgreSQL the lock and the writes share one session.
- **Many intents queued:** there is one pending record per database. Every other removal completes the pending one
  first or answers 503.
- **The "written only where none exists, replaced only over the text last seen" rule:**
  - it holds for two removals that both write before either publishes (the builder's `lock-lost`, 40 of 40 pairs);
  - it does not hold for an intent written after the other removal published (M5).

**(c) The two typed refusals. Ran (`stack3.sh ack3`; read from code for the window).**

- **False positives in a normal sequence:** I found no path that produces one.
  - Each check reads the data first and the log second. In a normal sequence every native step follows its log
    step, except the commit, which the pending intent covers.
  - Reads and saves of an unrelated account during 20 removals, on the second gateway: 1,543 reads and 376 saves of
    another account, all 200, 0 typed refusals, 0 refusals of any kind.
  - The subject's own reads: 3,898 started after an acknowledgement and 0 answered the value. 560 that started before
    did, which is allowed.
- **The commit-to-publication window:** reads are served from the head (the value may be answered before
  publication, TARGETS 7.1). Saves of other subjects are served. Derived writes the removal can reach get 503 and
  start the completion. The window lasts until the starter publishes or the first such contact completes it.
- **A slow peer:** after four synced tries it gets `RemovalDataBehind`, whose message tells the operator to run the
  restore route. On a healthy database that route is harmless (I read it; not run).

**(d) N4's exemption. Ran (`k8`, `k9`, `e4`, on both rules).**

- **A write that should be checked, claiming another database:** M2. Late, it lands and its copy is readable;
  today's rule refuses it.
  - Sent live after the acknowledgement, the same write commits on both rules. The ticket then speaks for the other
    database, and today's rule compares only its own current sequence.
- **The delivery window the page lists (15.8):** `k9`, a delivery prepared before a source removal and landing after
  its acknowledgement. It commits and the copy is readable in the recipient, **on both rules**: the same as today,
  not a regression.

**(e) The bound. Ran (`k4`, `k12`).** M3. The bound also fails when the commit takes longer than the wait on every
gateway, which a large removal or a slow transactor causes with the default 5 s.

- **What else it needs:** the subject must be saved while each commit is in flight. Without that the late commit
  lands and the next contact publishes it.
- **A garbage-collection pause on the gateway:** this costs one extra contact. The commit itself lands at once, and
  the next contact publishes it.
- **The size, measured in-process (in-memory Datomic, diagnostic):** 250 identities, commit 17 ms; 1,000, 31 ms;
  4,000 in one subject, 84 ms; 4,000 over 20 subjects, 109 ms.
- **The threshold:** at 21 to 27 µs per identity, 5 s is near 200,000 identities. The selector limit is 100
  subjects, and the target holds 160 facts per subject, so 100 subjects with about 12 versions of history per fact
  reach it at in-memory speed. A real transactor also writes the transaction to storage, so the true threshold is
  lower; not measured.

**(f) The lower-of rule. Ran (`k5`).** No construction exists:

- the gateway refuses a ticket outright when the declared value it read is past the ticket (line 141), so the lower
  of the two is always the declared value itself;
- a removal always moves the declared value to its own sequence, which is above every older ticket;
- the declared value is lowered only by the move, `rebuild!` and the first install, and the first two refuse while a
  removal is pending.

`k5` built the one case where the declared value is below the ticket: an emulated earlier-build removal leaves it at
0 with the committed one at 1. The ticket's transaction carries `[cas removal-seq 1 1]` and `[cas removal-intent 0 0]`.
Submitted after this version's declaration and after its acknowledgement, it was refused both times
(`cas-failed`), with no copy.

**(g) The fuzzer with a second, active gateway. Ran.**

- **`fuzz3`:** 40,000 schedules, above.
- **The composition with DX-IMP2** (`exp/DX-ERA3-compose-imp2-v3`, `2693cd996`, local only: `d4411c77b` with
  `3edb9f5d9`, `TX2_IMPORT_WHOLE_SUBJECT=1`):
  - `fuzz2` 8,000 schedules, 55,029 checks;
  - `fuzz3` 4,000 schedules, 36,150 checks;
  - 0 violations.
- **The known import resend:** it committed 0 times there; the builder counts 471 on this branch alone. **What closes
  it:** DX-IMP2's whole-subject import (`TX2_IMPORT_WHOLE_SUBJECT=1`, branch `exp/DX-IMP2-import-whole-subject` at
  `d4411c77b`), which refuses an import frame of an entity named before it had a row.

**(h) What the builder lists as not tested.**

- **A log restored behind the data with a removal pending in it:** ran (M1), in-process and on a stack.
- **A late transaction from an earlier build's gateway during and after a declared removal:** ran in-process as an
  emulation (`k10`, the transaction with its sequence checks removed).
  - Naming no account, it commits and its copy is readable.
  - Naming the account, the fence refuses it.
  - The upgrade order is the only protection.
- **The subject guard's stop on a stack:** not run. In-process the guard was held back in 3,884 `fuzz3` schedules.

**The second review's cases on the new code (`e-on`, `e-subject`, `e-off`). Ran.**

- **Pass on both per-account settings:** E1 (four routes), E1b, E2, E3, E4 (200, 200), E5, E7 and E7b
  (`RemovalLogBehind`, no copy), E8.
- **E6:** by design.
- **E9:** older than this branch.
- **Today's rule:** E4, E5, E7b and E9 as in round two.
- **The builder's two edits to my tests do not weaken them:**
  - E1 now requires the stopped removal to be visible (pending), the first frame naming no account to be refused and
    then complete it, and the next four to commit. That is stronger than the original for the new order, and would
    catch a return of N1.
  - E3 now strips the declared-sequence checks from the emulated removal's own transactions, which is what an earlier
    build sends. Its oracles are unchanged.

## 3. What I could not test

1. **No server run.** Toy sizes only; the commit sizes in (e) are in-memory and diagnostic.
2. **M3 with a real slow commit**: the delay was forced in-process, not produced by a large removal on a stack.
3. **M2, M4 and M5 on a stack**: in-process only.
4. **Two late steps from two earlier attempts landing in one completion**: `fuzz3` holds back one step per schedule.
5. **A completer on an older gateway**: the builder's `mixed` stack, not rerun here.
6. **The subject guard's stop on a stack**, the owner-root fold under the guard, and the PostgreSQL advisory lock's
   fairness.
7. **Recovery when the removal log is lost and only an older copy exists, two or more behind**: every request answers
   `RemovalLogBehind`, and no route rebuilds the log from the native erasure records. Today's rule is stuck the same
   way (read from code; not run on today's rule).
8. **Whether callers name every account and the right source database** (E6, M2): callers not reviewed.

## 4. Tests, how to run them, evidence

- **In-process:** `ERA3_MAIN=3 node lab/bin/heavy.mjs --label <name> -- bash lab/experiments/EXP-DX1/era3/run.sh
  <new dir> <on|subject|off> "<cases>"`.
  - The cases come from `k2 k3 k4 k5 k6 k7 k8 k9 k10 k12 fuzz3`.
  - Fuzzer settings: `ERA3_N`, `ERA3_SEED`, `ERA3_BLOCK=200`, `ERA3_SEALED=1`.
  - `ERA3_SOURCE=<checkout>` and `ERA3_EXTRA_ENV` run another source and settings.
  - `ERA3_MAIN=2` runs the second review's cases.
- **Stacks:** write the bodies once (`ERA3_MAIN=2 ... run.sh <dir> subject bodies2`), then
  `bash lab/experiments/EXP-DX1/era3/stack3.sh <new dir> <bodies> <logpending|ack3>`. Its predictions are in its
  header, written before the first run.
- **Evidence** (private, not in the repository): `DX-ERA3-3.tar.gz` in the project's evidence folder. It holds every
  run's log, image IDs, and the predictions file written before the first run.
