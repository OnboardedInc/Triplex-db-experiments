# Adversarial review of removal on request guarded per account (DX-ERA3, 2026-11-24)

Reviewer DX-ERA3, branch `exp/DX-ERA3-removal-review` from `exp/DX-ERA2-removal-per-account` at `6bc2484f0` (base
`exp/DX-SCALE2-wide-thin` at `3e3e652b9`). The removal code was not changed. This branch adds tests, a runner, a stack
reproduction and a proposed fix that is applied only to private source copies inside test containers. Mac only, toy
sizes, the lab VM shared with other builders; every time below is diagnostic. The code was read before the builder's
page, and the suspicions were written down before the page was opened (the break below was the first of them).

## Page 1, for the owner

**Is there a break? Yes. How sure: certain.** It reproduced every time it was set up: on a real stack with the
PostgreSQL removal log shared by two gateways, in-process on both per-account paths (with and without the subject
check), unsealed and sealed, and in 925 of 925 fuzzer schedules that set it up. It is a regression: on the same stack
and in the same tests, today's database-wide rule refuses the same requests.

**The break in plain words.** A settlement frame, notice, archive record or Publish carries a ticket: the removal
sequence at which it read its inputs. Every such caller on this branch sends its ticket without naming accounts (the
builder's page, section 11, item 2). On a database moved per account, that ticket is compared with the last
*published* removal, and nothing at Datomic's commit point compares it at all. So when a removal has committed in
Datomic but is not published yet, a frame computed from the value before the removal is accepted. It lands in the log
*after* the removal, and its copy of the removed value is readable after the removal is acknowledged. A removal is in
that state whenever its run is cut short between its commit and its publication: the gateway is killed or restarted, the
commit takes longer than the gateway's 5-second wait (it answers 503 and the commit lands afterwards), or the removal
log cannot be written for a moment (the kill was reproduced on a stack; the other two causes are argued from the code:
`erase.clj` 192 and `removal_commit.clj` 123 answer 503 after 5 s with the transaction still queued). The removal's
lock is then released and its intent stays pending until the client resends it. Today the same frame is refused (503
while the removal is pending, 409 after it).

**The three most serious findings**

1. **F1 (break): a derived write whose ticket names no account lands after a removal and keeps a copy of the removed
   value, readable after the acknowledgement.**
   Stack test `era3/stack.sh`, option 2 (per account with the subject check), evidence `DX-ERA3/st2-stack`. The write
   gateway was killed inside the removal's publication (after its commit in Datomic); on the read gateway, which shares
   the removal log:
   `frontier while pending: seq 0 | a1's own save: 409 CasConflict (removal-fence :entity) | frame with no accounts:
   200 at position 4 | frame naming account a: 409 CasConflict (removal-fence :account) | removal resumed there: 200,
   seq 1, position 3 | after the acknowledgement, a current read of the frame's document answers "derived:<a1's
   value>": true | a1 answers the marker`.
   The same script, option 0 (today's rule, `st0-stack`): `both frames 503 ErasureFrontierUnavailable while pending |
   resumed 200 | the frame resent after it: 409 ErasureFrontierChanged | no copy`. Option 1 (per account, head check,
   `st1-stack`): the same as option 2 (frame with no accounts 200 at position 4 after the removal at position 3; copy
   readable after the acknowledgement: true).
   In-process, `era3/attack.clj` case `D1`: the same outcome on both per-account paths, unsealed and sealed; the
   builder's own leak check (`era2-gate/removed-everywhere!`) fails on every such case ("no native copy of the removed
   value outside its subject and journals", and "route :journal never answers the removed value").
2. **F2 (a removal that cannot finish while the fleet is mixed): a removal committed by a gateway with the subject
   check cannot be completed by a gateway without it.** Test `D2`: `intent at position 4, commit at position 5
   (another account committed inside the try) | 10 resumes without the subject check: 503 ErasureFrontierUnavailable
   10 of 10 | the value readable meanwhile: true | another removal meanwhile: 503 | resumed with the subject check:
   200`. In the fuzzer, a resume without the subject check answered 503 in 61 of 2,024 resumes (each completed on the
   next resume with the option).
3. **F3 (every removal blocked by one misconfigured gateway): a gateway without `TX2_REMOVAL_PER_ACCOUNT` on a moved
   database leaves a removal intent behind.** Test `D3`: `its read and its save: 503, as the page says | its removal:
   400 GatewayError, intent left: true | a removal on a correctly configured gateway: 503 until that exact command is
   resent there, then 200`.

**One recommendation: do not merge as is. Merge with fix 1 (required) and fixes 2 and 3 (small).** Fix 1 is about
ten lines (`era3/fix-proposal.py`): a ticket that names no account keeps today's exact commit-point fence, on the global
removal sequence (`cas removal-seq offered offered`), and a ticketed write waits (503, as today) while a pending removal
can touch an account it read. Applied to a test copy: 0 violations in 4,000 fuzzer schedules and 16 D1 cases on both
paths; the builder's own gate passes (8,743 checks with the subject check, 475 with the head check, 0 failed); and a
frame of another account still commits while a removal is pending (8 of 8), so the per-account gain is kept. Fixes 2
and 3 are in section 1.

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | **Highest (break)** | A derived write with a ticket naming no account (every settlement, notice, archive and Publish caller on the branch) commits while a removal is committed in Datomic but unpublished; it lands after the removal's position, and its copy of the removed value stays readable after the acknowledgement. Today's rule refuses it. Lines: `request-cut` accepts a cut one removal behind Datomic when that removal is the pending one (`erase.clj` 312-322, `removal_scope.clj` `consistent?`); `ensure-ticket!` then compares the ticket with the published sequence (`privacy.clj` 209-213); the commit-point fence carries only the written entities when the ticket names no account, and the database-wide `cas` is on the constant sentinel (`storage.clj` 216-217) | Stack `st2-stack` against control `st0-stack`; `D1` stopped after the commit and at publication, 8 of 8 cases (both paths, unsealed and sealed); fuzzer 925 of 925 schedules (subject check 511, head check 414) | `fix-proposal.py` part 1: at `storage.clj` 216, a ticket with `erasureSeq` and no `erasureAccounts` also carries `[:db/cas scope :triplex.scope/removal-seq offered offered]` |
| F1b | High (behaviour change; not a break by log order) | Any ticketed write, with or without accounts, commits while a removal's intent is written but before its commit (stopped before the commit, or after its guard). It lands before the removal's position, so it is equivalent to a frame sent before the removal began, which leaves the same copy in both designs. But section 13.2 claims frames cannot commit in that window, and today's rule refuses them (503) | `D1` stopped before the commit and after the guard (both frames 200, copy readable); fuzzer 941 schedules (470 with no accounts, 471 naming the account) | `fix-proposal.py` part 2: in `main.clj` after `request-cut` (475), a ticketed write is refused 503 while the pending intent's accounts include one of the ticket's accounts or the unscoped account, or the ticket names none |
| F2 | High (a removal that cannot finish while the fleet is mixed) | The old removal path matches a committed record to the intent byte for byte (`erase.clj` 168); the subject-check path rewrites the committed position and stamp (`removal_commit.clj` `commit-code`). A subject-check removal stopped after its commit and before its intent is rewritten (`removal_commit.clj` `publish!`) is refused 503 by every gateway without `TX2_REMOVAL_SUBJECT_CHECK`; meanwhile the value stays readable and every other removal of the database is refused. The page's section 8 documents the refusal when turning the option off, but also says gateways with and without it "can run together" | `D2` (10 of 10 resumes 503); fuzzer 61 of 2,024 resumes without the option | In `apply-native!`'s committed branch, accept a record equal to the entry without `position` and `erasedAt` and publish the record, as `removal-commit/committed` does |
| F3 | Medium (every removal blocked by one misconfigured gateway) | A gateway without the per-account option refuses reads and saves on a moved database (as the page says), but its removal writes the intent (`erase.clj` 265) before its `cas erasure-seq` fails on the sentinel (189). Every removal on correctly configured gateways is then refused 503 until that exact command is resent to one of them. Today any failure after `prepare!` has the same consequence; what is new is that a configuration mistake causes it on every removal attempt | `D3` | In the old path, check the cut against the data (`privacy/verify-data!`, which refuses the sentinel) before `prepare!` |
| F4 | Low (the page) | Proof item 5 and section 6 ("a ticket naming no account is checked database-wide, as today") and the 13.2 row "a settlement frame ... cannot commit in the window" are false once a removal's run is cut short. Section 13.3 says "at most 2 under the guard"; the code allows 3 (`guarded-tries 3`, 5 commit attempts before the 503). The bound "at most 4 tries" holds only while the owner-root fold is the only unfenced write of a subject, and no run (the builder's or mine) had an owner root | code | Correct the page; exercise the fold under the guard |
| F5 | Information | A derived write's own journal holds its copy of the value in clear: its change record carries the derived row's identity, which no removal masks. Same root as F1 for copies that land after a removal; true of any derived copy written before a removal in either design | fuzzer: 1,825 derived journal entries in clear (before and after the removal's position) | Fix 1 for copies after a removal; derived copies made before a removal are outside this branch |

**Known and closed elsewhere (not a finding of this branch).** An import frame of an entity the removal named before
it had a row, refused and resent after the removal, commits with the value on this branch alone: 488 resends in the
fuzzer (297 subject check, 191 head check). The builder's page records it as DX-IMP2's finding. With DX-IMP2 merged
(local branch `exp/DX-ERA3-compose-imp2`, `9b96a91b5`, conflicts in `privacy.clj` and `main.clj` resolved by keeping
both sides) and `TX2_IMPORT_WHOLE_SUBJECT=1`: 0 such commits in 4,000 schedules, and no violation other than F1 and
F1b.

## 2. What was attacked and did not break

Counts are from the evidence runs named in section 4. "Schedules" are the fuzzer's interleavings; unless said
otherwise they are the 20,000 unpatched per-account schedules (12,000 with the subject check, seeds 11 to 13; 8,000
with the head check, seeds 21 and 22).

1. **The windows the head check used to close.** A save prepared before the removal (7 kinds: a new value of the
   subject, a retirement of the removed value, the creation of an entity the removal names, an import frame creating
   it, an import frame replacing the subject's value, a save of another subject, a save of another account) was paused
   after its cut was read and released at one of 7 points: before the removal, after its intent, inside its commit
   (between its selection and Datomic's serial point), after its guard, after its commit, after its answer, after its
   resume (each about 2,850 schedules). **0** racing writes of the subject or a named entity committed after the
   removal's position; **every** racing value committed before it was removed with it (0 violations); **0** answers of
   a removed value on current, history and pinned reads and on a Reach session cached at the pin; at the end of each of
   the 100 blocks of 200 schedules, **0** removed values in the journal pages, the feed or any native datom outside
   their subjects (derived documents counted under F1 and F5), positions 1..N with no gap or repeat, and no removal's
   record time before the commit before it. Stops: before the commit 3,606, after it 3,663, at publication 3,573,
   after the guard 97 (of 443 removals that took it), none 7,175; every stopped removal completed after at most three
   resumes (0 violations), resumed on the same gateway, on a "restarted" one (its caches cleared: 7,977 schedules) or,
   with the subject check, first on a gateway without it (F2). While stopped: the subject's own saves were refused
   (409) whenever the removal had committed (916), and committed only before its commit, then removed (449); reads were
   served (1,338); other removals were refused 503 (1,372) and completed after the resume (0 violations).
2. **The counters.** After every block, every native removal counter of every entity and account was compared with the
   one derived from the published log: **43,222 comparisons, 0 disagreements** (so no subject or account was left
   refused, including after the 97 stops after a guard). Entities named with no row (creation and import kinds): 0
   survived. The move back and forward (`D6`) with three save shapes in flight each way: each refused exactly once (409
   ErasureFrontierChanged), then a fresh save of every subject committed; counters agree with the log. Counter overflow
   is not reachable (64-bit).
3. **Paths that carry values across the guard's boundary.** Frames naming the removal's account: refused in 907 of 907
   schedules stopped after the commit or at publication (409 CasConflict, the account fence) and in 1,204 of 1,204
   sent after the answer (409). A frame naming another account that writes the removed subject: refused (`D5`, entity
   fence). An import replay of the removed field and an import frame without a ticket while stopped after the commit:
   refused (`D5`); in the fuzzer, replays while stopped were refused 963 times and committed 444 times, always before
   the removal's commit and then removed by it. Plain saves carry only the client's values; references carry IDs; the
   Reach session cache is keyed by the global sequence (re-sent after any removal, as the page says).
4. **Clients that misbehave within the protocol.** The removal command resent after its answer (a lost reply): 6,720,
   every one answered the same removal (same sequence and position). The racing save resent unchanged after the
   removal: 6,652; duplicates refused (OperationDuplicate); a first attempt that had been refused landed as new data
   after the removal (new values of the subject and retirements: allowed by the page's section 5, case 4); import
   frames of a removed field resent: **0 committed** (ErasureReplayDeclined); import frames of a named entity with no
   row: see "Known and closed elsewhere". Saves prepared before a removal and released only after it was resumed:
   2,817. Import frames from a loader that sends no ticket: 5,660 schedules of the two import kinds.
5. **The guard and the lock.** 443 subject-check removals took the guard (one narrow try, a racing save inside it); 97
   were stopped right after it and resumed; all completed and their subjects' counters returned to the log's values.
   The builder's hammer on the fixed copy: 30 of 30 removals within 3 tries. The database's lock (`D4`, in-process
   file lock, diagnostic): 87 to 92 removals per second one after another; another account's removal during a burst
   of removals from 4 threads waited 11 to 126 ms and was overtaken by at most 8 of them (5 samples per mode). A
   pending removal does not refuse its subject's reads (the value stays readable until the acknowledgement, which
   TARGETS section 7.1 allows).
6. **The proof's own steps.** Table below.
7. **Randomized.** 29,300 schedules in all: the 20,000 above; 4,000 with DX-IMP2 merged; 4,000 with the fix; 1,000 on
   today's database-wide rule (control: 125 unrelated saves refused, today's cost; 0 derived copies after a removal);
   300 calibration. The schedules are regenerated from their seeds by `era3/summarize.py` (checked against every
   schedule a violation names).

| Proof item | The line that makes it true | Tried to falsify with | Result |
| --- | --- | --- | --- |
| 1 Masking after publication | `privacy.clj` `masked`/`text` (220-273) with the published cut read per request (`main.clj` `run`) | route checks after every schedule; block scans | holds |
| 2 No save re-creates a removed identity | `commit.clj` history check (`identity-row`, 171-174, 271); `privacy.clj` 285 | 6,652 resends | holds |
| 3 No import replays a removed field | entity fence (`removal_scope.clj` `fence-code`, `storage.clj` 216-217); families (`privacy.clj` 289-290) | `D5`; replays and import resends in the fuzzer | holds (named entity with no row: DX-IMP2's, closed by it) |
| 4 A save's journal holds no removed value | the per-entity fence | journal scans | holds for saves; a derived write's journal holds its copy (F5) |
| 5 A derived write cannot re-materialise a value | ticket check `privacy.clj` 209-213 and fence `storage.clj` 216-217 | `D1`, fuzzer, stack | **false** for a ticket naming no account while a removal is pending after its commit (F1); the account fence holds after the commit, not before it (F1b) |
| 6 No write path copies values across accounts | the gateway writes only the request's rows | `D5` frame naming another account writing the subject | holds |
| 7 Restore | `request-cut` refuses a copy behind the log | not tested (section 3) | - |
| 8 Mixed gateways | the sentinel -1 (`removal_scope.clj` `sentinel`) | `D3`, `D2` | requests refused as claimed; a removal attempt leaves an intent (F3); mixed subject-check settings stick (F2) |
| 9 Two removals at once | the database's lock and `cas removal-seq` (`erase.clj` 186, `removal_commit.clj` 120) | other removals while one is pending (1,372), bursts (`D4`) | holds |
| 10 A removal stopped at any step | the intent and the operation ID (`removal_commit.clj` `committed`) | 10,939 stops, three resume kinds | holds on one configuration; F2 across configurations |
| 13.4 The per-subject selection check | `removal_commit.clj` `commit-code` `changed` (28-45) | 2,864 racing saves released inside the commit (1,695 with the subject check, 1,169 with the head check; five of the seven kinds write the subject or a named entity), and the guard | holds |

## 3. What was not tested

1. **No server run**; all counts are toy size, all times diagnostic.
2. **The 5-second commit timeout as the cause of F1** (`D1t`): in-process the in-memory connection transacts
   synchronously, so the gateway's wait never expires (observed: the first reply took 6.6 s and answered 200). On the
   stack the window was opened by killing the gateway inside its publication instead. The timeout path is argued from
   the code (`erase.clj` 192 and `removal_commit.clj` 123 answer 503 with the transaction still queued).
3. **A transactor restart**: in-process the store cannot restart; the stack runs killed a gateway, not the transactor.
4. **Restore with the option on**: neither the builder (its regression ran with the option unset) nor this review.
5. **The owner-root fold under the guard**, the bound's only unfenced write: no run had an owner root.
6. **The PostgreSQL advisory lock's fairness** under removal bursts: only the file lock, in-process.
7. **Sealed values in the fuzzer**: unsealed only; sealed in `D1` only. The sealed after-guard case of `D1` did not
   reach the guard (on the file key store a sealed save takes the database's lock, so the racing save cannot land
   inside the removal's try).
8. **Mixed gateways and the move on a stack**: `D2`, `D3` and `D6` are in-process only.
9. **Reach sessions on a second read gateway**: one gateway's session cache in-process; the stack runs did not read
   Reach.
10. **Gateway suites with the fix**: only the builder's in-process gate ran on the fixed copy.
11. **A ticket that names fewer accounts than its writer read**: a client error outside the protocol, as the page says.

## 4. Tests and how to run them

All runs take one ordinary heavy token and the lab VM's Docker socket from the environment (`DOCKER_HOST`); every
container ran the pinned runtime image by ID (`sha256:21a67288007d...`, `tx2-datomic:1.0.7745-da00`; PostgreSQL
`sha256:526f86d93c6e...` on the stacks), and each run records the image its container actually ran (`image-ran`,
`images-ran`) and fails if it differs. All 22 in-process runs and every stack container ran those IDs.

| Test | File | Run | What it checks |
| --- | --- | --- | --- |
| D1 | `era3/attack.clj` `d1` | `run.sh OUT MODE d1` | a removal stopped before its commit, after it, at publication, after its guard; while stopped, frames with a ticket read before the removal (naming no account, naming the account, naming another account); then resumed; the copy, the log order, the builder's leak check |
| D1t | `d1-timeout` | `run.sh OUT MODE d1t` | the same window opened by a commit slower than the gateway's 5 s wait (a real transactor only) |
| D2 | `d2` | `run.sh OUT subject d2` | a subject-check commit whose head moved, stopped before its intent is rewritten, resumed 10 times without the subject check, then with it |
| D3 | `d3` | `run.sh OUT on d3` | a gateway without the per-account option on a moved database: read, save, removal; the intent it leaves |
| D4 | `d4` | `run.sh OUT MODE d4` | the database's lock: removals per second, and another account's removal during a 4-thread burst (diagnostic) |
| D5 | `d5` | `run.sh OUT MODE d5` | while stopped after the commit: a frame naming another account that writes the removed subject, an import replay, an import frame; after: the command resent, the import frame resent; a removal by assertion ID racing a replacement |
| D6 | `d6` | `run.sh OUT MODE d6` | the move back and forward with three save shapes in flight; fresh saves; counters against the log |
| F | `fuzz` | `ERA3_N=4000 ERA3_SEED=11 run.sh OUT MODE fuzz` | the schedule fuzzer (section 2) |
| builder | `era2/gate.clj` | `ERA3_PATCH=1 run.sh OUT MODE builder` | the builder's own gate, here on the fixed copy |
| fix | `era3/fix-proposal.py` | `ERA3_PATCH=1 run.sh OUT MODE "d1 fuzz"` | the proposed fix, applied to the container's private source copy only |
| stack | `era3/stack.sh` | `stack.sh OUT BODIES 0, 1 or 2` (BODIES from `run.sh OUT subject bodies`) | D1 on a real stack, by a write gateway killed inside the removal's publication; predictions in the script header, written before the first run |
| summary | `era3/summarize.py` | `summarize.py RUN_DIR...` | violations by message, outcome tallies, exact coverage per dimension |

`run.sh` is `bash lab/experiments/EXP-DX1/era3/run.sh NEW_ABSOLUTE_DIR MODE "PHASES"`; `MODE` is `off` (database-wide),
`on` (per account, head check) or `subject` (per account with the subject check). `ERA3_SOURCE=<checkout>` runs another
checkout's gateway (the DX-IMP2 composition used the local merge above, with `ERA3_EXTRA_ENV=TX2_IMPORT_WHOLE_SUBJECT=1`).

Evidence (private, outside the repository, one archive `DX-ERA3/DX-ERA3-2026-11-24.tar.gz` under the lab's evidence
folder; these are the run folders inside it): `st2-stack`, `st1-stack`,
`st0-stack` (stacks); `f1-subject` to `f3-subject`, `f4-on`, `f5-on` (the 20,000 schedules); `c1-imp2-subject`,
`c2-imp2-on` (composition); `p1-patched-subject`, `p2-patched-on`, `p3-patched-subject-d1`, `p4-patched-builder-subject`,
`p5-patched-builder-on` (the fix); `p0-unpatched-subject-d1`, `d-on`, `d-off`, `s1-subject-d1`, `s2-subject-rest`,
`s5-subject-cal` (deterministic cases); `f6-off` (control). Each holds `run.log` (or `steps.log` and `verdict.json`),
`image-ran` and `seconds`.
