# R36: can one content fingerprint replace K01's process evidence?

**Written:** 2026-11-08 by planner R36 (Opus 5.5, high). **Moves:** measurement speed for P1 to P5 (a clone replaces a 38 to 53 minute
XTDB seed per arm), with correctness as the floor (`lab/NORTH-STAR.md` item 3). Goals and targets come only from `lab/SCOPE.md`,
`lab/NORTH-STAR.md` and `lab/TARGETS.md`.

## How to read this report

- **Evidence labels.**
  - `[K]` K01 builder branch `exp/K01-seed-clone` at `d35fc4b4` (implementation `d4298c10`), worktree
    `/Users/sam/projects/triplex-db-2/.claude/worktrees/k01`. Paths are relative to that worktree.
  - `[V]` reviewer branch `verify/K01`, worktree `/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-k01`, files
    `lab/verify/K01/VERIFY*.md`.
  - `[R]` lab research and rulings in the main checkout: R26, R30, R34, `lab/acceptance/RULINGS.md`, `RULINGS-PENDING.md`.
  - `[S]` pinned XTDB source as cited by R26 and R30 (I did not reread it; I cite their line references).
  - `[E]` my inference or arithmetic, with the inputs shown.
- **What I did not do.** I started no engine, ran nothing in Docker, edited no product or experiment code and spawned no agents.
- **Note on where Q83 lives.** The brief points at `RULINGS-PENDING.md` for Q83a-e. They are compiled in `lab/acceptance/RULINGS.md`
  (lines 605-627) and bound in `load-contract.json` (lines 174-234). I used those.

---

## 0. Answer

**Recommendation: (B) simplify.** Keep the freeze recipe. Take away the power of every process observation to grant a PASS. Let
exactly one check grant: a content fingerprint read through the engine by the driver itself, immediately before its warm-up, compared
with a digest pinned before the freeze began. Every other check either refuses or is a diagnostic.

| # | Question | Short answer |
|---|---|---|
| 1 | What does process evidence protect that a content fingerprint does not? | Section 2. Four things: (a) physical equivalence to a fresh seed (layout, compaction, catalog checkpoint), which matters for latency, not content; (b) a stale golden whose content is the same but whose bytes come from an old adapter, image or config; (c) state the fingerprint does not read (raw history fields, claims, attempts, other scopes); (d) correct resume, so new writes land at the next position. None of the four needs a stop proof, a log-tail decoder, F/M/T frontiers or a persisted readiness certificate. Each has a cheaper guard. |
| 2 | Smallest set of checks? | Section 3. One granting gate (G0: content digest equals the pinned digest), one precondition (engine health), six refusal-only checks (golden key, copy tree hash, post-start quiescence, Triplex position, first-commit position, end counts) and two once-per-recipe validations (E1, and a two-start determinism check per golden). |
| 3 | Design | Section 4. It deletes about 1,200 to 1,400 of the 1,957 lines K01 adds outside its evidence folders `[E]`, including the whole stopped-tail decoder, the owner readiness certificate and lifecycle tokens, and the C3-C8 exact-equality machinery. The Log4j race and #6174 stop mattering: neither can block or grant anything. |
| 4 | A, B or C? | **B.** A is not converging: 3, 4, 3, 3, 4 findings per round, tests growing about 50 per round (41 to 262), zero live goldens after six rounds. C is cheap only where K01 is not needed anyway; for the case K01 exists for (XTDB at the N01 10k rung, P1-P4 duets) re-seeding costs 76 to 106 minutes per duet against about 6 to 20 minutes with B (section 5). |

```
 TODAY (A): ~27 success boundaries, each must be free of false PASS     B: one boundary grants; the rest can only refuse
 ---------------------------------------------------------------       --------------------------------------------------
 stop proof ---+                                                       stop, settle, tails, F/M/T, inspect, stderr,
 settle F/M/T -+                                                       timers, C1, C3-C8, disk  ---> diagnostics / REFUSE
 tail decoder -+--> golden PASS --> owner.json readiness  --> driver                                     |
 C1 tree ------+        |           (certificate, lifecycle,  reads                                     v
 C3-C8 exact --+        |            lock, attempt id)        it later       driver process, same endpoint, right before warm-up:
 inspect/logs -+        v                                                      health ok?  ---- no ---> REFUSE
                   reference start                                             G0: digest(scope rows) == D_pinned
                                                                                   yes ---> PASS     no ---> REFUSE
 every arrow is a place a failed, partial or stale reading               D_pinned = read on the seeding node before freeze,
 can become a PASS: that is what six rounds kept finding                 and = O-DOMAIN's digest where an oracle exists
```

---

## 1. Why the review loop does not converge

### 1.1 The numbers

| Round | Builder report | Review | Findings | Tests after the round | Live golden made? |
|---|---|---|---|---|---|
| 1 | `REPORT.md` | `VERIFY.md` | 3 (F1 HIGH, F2, F3) | 41 + 21 | No: refused (missing block hang, missing `Node stopped.`) |
| 2 | `REPORT-round2.md` | `VERIFY-round2.md` | 4 (R2-F1 HIGH, R2-F2 HIGH, R2-F3, R2-F4) | 85 + 14 | No: G3 refused live (compaction advanced the source watermark), then blocked on capacity |
| 3 | `REPORT-round3.md` / `round4.md` | `VERIFY-round3.md` | 3 (R3-F1, R3-F2, R3-F3 HIGH) | 134 + 36 | No: offline only |
| 4 | `REPORT-round5.md` | `VERIFY-round4.md` | 3 (R4-F1, R4-F2, R4-F3) | 209 + 13 | No: offline only |
| 5 | `REPORT-round6.md` | `VERIFY-round5.md` | 4 (R5-F1 HIGH, R5-F2, R5-F3, R5-F4) | 262 + 27 | No: offline only, and R5-F1 means the live path cannot consume a real clone-check result |

Sources: `[K] lab/experiments/EXP-K01-seed-clone/REPORT*.md`; `[V] VERIFY*.md`. The finding count per round is flat. The test count
grows by about 50 per round. The builder's own PASS audit lists 27 success boundaries (`[K] REPORT-round6.md`, "Updated PASS audit"
table), and every review so far has found new ones the audit missed (R4-F2 `oneCutProbe.snapshotRemoved`, R5-F4 the final
`process.exit(0)` timer).

### 1.2 The cause

**The acceptance rule is a conjunction of many observations, and any one of them can grant.** A golden is published when the settle
verdict, the stop verdict, the offline tail proof, the copy tree equality, the reference start check, the C3-C8 fingerprint and the
reference stop are all true (`[K] lab/bin/engine.mjs:755-882`). A clone is admitted when `owner.json` carries a PASS whose
certificate hash recomputes (`[K] lab/bench/lib/bulk.ts:44-61`). So every producer of a boolean is on the trusted path, and the
review question is "can this boolean be true when its observation failed, was partial, or is stale?". That question has an answer per
producer, per consumer and per transport (child process stdio, owner file, lock, subprocess exit code). The space is a product, so a
fixed review effort keeps finding new members of it.

**Each fix adds more producers.** Round 3 added PENDING revocation; round 4 added a lock, a certificate and a tail decoder; round 5
added lifecycle tokens and a schema-recursive protobuf validator; round 6 added an observation envelope. Each of these is itself a new
success boundary that the next review then audits.

### 1.3 What the 17 findings become under B

| Finding | What it was | Under B | Why |
|---|---|---|---|
| V1 F1 HIGH | failed re-verification leaves an older PASS usable (`engine.mjs:888`) | **gone** | no persisted PASS; the driver computes admission in its own run |
| V1 F2 | T1 runner ignores `verdict.ok:false` | harmless | stop proof is a diagnostic |
| V1 F3 | settle ignores the current tx gauge (`clone-check.ts:119`) | harmless | settle grants nothing; T is checked on the clone, and content by G0 |
| R2-F1 HIGH | cleanup deletes a golden from an earlier run | **kept, operational** | deleting a golden is a tooling bug, not an acceptance bug; fix by never deleting goldens from a runner (manual `golden-rm` only) |
| R2-F2 HIGH | owner read and publish not atomic | **gone** | no readiness publication |
| R2-F3 | copy proof or golden can change without invalidating PASS | **gone** | no certificate; G0 reads the content itself |
| R2-F4 | failed inspect or log read still yields a stop or start proof | harmless | diagnostics |
| R3-F1 | tail decoder accepts malformed FlushBlock and nested bodies | **gone** | decoder deleted |
| R3-F2 | C1 re-verification trusts the saved pass bit | harmless | C1 is refusal-only, computed once at copy time |
| R3-F3 HIGH | `down` races verify and PASS is published for a removed container | **gone** | no readiness publication; the driver reads the container it measures |
| R4-F1 | shell pipeline failure yields matching partial C1 trees | harmless | a false C1 match cannot grant; G0 still has to match |
| R4-F2 | one-cut probe cleanup claims removal on failed inspect | **gone** | `oneCutProbe` deleted (it served R30 T3 and T6, which B does not need) |
| R4-F3 | pool admission accepts NaN disk readings (`lib.mjs:322-339`) | **kept, operational** | shared helper bug, independent of K01; keep the round-6 fix as its own small change |
| R5-F1 HIGH | `cloneCheck` inherits stderr, so every real result is refused | **gone** | G0 runs in the driver process, no child verdict to transport |
| R5-F2 | driver owner read conflates failure with absence (`bulk.ts:44-50`) | **gone** | the driver no longer reads readiness from the owner file |
| R5-F3 | C8 EXPLAIN fields accepted when required fields are missing | harmless | plan hash is a diagnostic |
| R5-F4 | final `process.exit(0)` overrides a failed CLI status | harmless | clone-check CLI is diagnostic |

**Totals:** 7 gone with their code, 7 harmless because the check can no longer grant, 3 kept as ordinary operational bugs (two of
them already fixed). The live blockers of rounds 1 and 2 (the Log4j race, the stale `sharedSnap`, fast compaction past F) were
also all failures of process evidence to come out true. Under B none of them can block or grant.

---

## 2. Q1: what each piece of process evidence protects against that a content fingerprint does not

### 2.1 What the fingerprint is, so the comparison is exact

`[E]` G0 for K01 is one streaming SQL read per Triplex table through the clone's pgwire endpoint, over the seed scope, at the current
XTDB system time and all valid time, of the fields Triplex answers from: `tx_assertions` (`entity_id`, `attribute`, value columns,
`valid_from`, `valid_to`, `recorded_position`, `retracted_position`), `tx_claims` (`command_id`, `position`), `tx_attempts`, and
`tx_meta` (`scope_key`, `position`, every scope present). Rows are sorted and digested canonically. Wall-clock fields
(`recorded_at`, XTDB system time) and per-operation random ids are excluded, so the digest is the same for every seed of the same
manifest. The adapter answers every basis from exactly these fields (`packages/xtdb/src/XtdbStorageAdapter.ts:55,65,647-664`), so the
digest determines the answer at every Triplex basis, not only the latest. For W0 seeds it also computes R34's worlds digest at
`B0 = {recordedPosition: basis.tx, validAt: V_W0}` and compares it with O-DOMAIN's (`[R] R34` section 5, G0).

The expected value `D` is pinned in the golden record from a read on the seeding node **after the last seed commit and before the
first `finish-block`**, plus closed-form counts from the manifest (`assertionsMatchClosedForm`), plus O-DOMAIN where one exists. So no
step of the freeze can influence the value the clones are compared against.

### 2.2 Evidence by evidence

| Evidence (where) | Risk it protects against | Does G0 catch it? | Residual risk after G0 | Cheaper guard for the residual |
|---|---|---|---|---|
| **Stop proof**: exit 143, under 10 s, `Stopping node...` and `Node stopped.` (`[K] engine.mjs:708-753`; Q83a, Q83b; R30 1.3) | torn `LOG` tail; in-flight upload; close exceptions; `halt(1)` | Torn tail: the engine refuses to start (`LocalLog.kt:61-95` `[S]`), so health fails. Missing data: G0 mismatches. | **None for content.** R30 1.4: a clean stop of an idle node leaves the same bytes as a kill at the same instant; there is no on-disk marker. The proof says nothing the bytes do not. An in-flight compaction at stop shows up as compactor work at clone start. | refusal-only quiescence check on the started clone (jobs 0, live rows 0, layout digest equal to the golden's) |
| **Log tails, offline** (`[K] engine.mjs:602-661`, `lab/bin/xtdb-log.mjs`) | a corrupt tail; an application tx hidden after the block cut | Corrupt tail: start refuses. Hidden tx in the seed scope: G0 mismatches. | A tx in another table or scope changes no scope row. | refusal-only: `latestCompletedTxId` on the clone equals the golden's T, and `tx_meta` lists only the seed scope (both read in G0) |
| **Frontiers F, M, T** (Q83d, Q83e; `[K] clone-check.ts` settle) | the immutable block cut F vs the settled replay head M; T unchanged | T: yes, as above. F and M are source-log offsets that compaction advances (`Compactor.kt:150-152`, `BlockCutter.kt:280-295` `[S]`); they say nothing about content. | none | none needed; record F and M as diagnostics |
| **Resume at M** ("resuming after X", `startCheck`) | the clone resumes the source log at the wrong place, so new writes are lost, duplicated or wait | Skipped messages that carry data: G0 mismatches. A resume that leaves the node behind the log head: `/healthz/started` stays not 200 (`healthz.clj:62-80` `[S]`) and lag is not 0. | new writes after the window starts are not read by G0 | refusal-only: the first warm-up commit must get position `manifest.lastPosition + 1`; G9 end counts equal start plus recorded commands (`[R] R34` section 5) |
| **Settle evidence**: two finish-blocks, jobs 0 x3, trie digest stable, new block's tx and msg id equal gauges (Q83b, Q83d) | the golden still had live rows, a compaction backlog, or no catalog checkpoint | No: content is the same either way. | **physical state differs from a settled fresh seed**: live rows replayed at start, compaction during the window, plans over L0 until the first write (#6174, R30 2.2) | keep the two finish-blocks and the jobs-0 wait as **recipe steps** (a timeout refuses); check the effect on the started clone (refusal-only quiescence check) |
| **`xt.live_tables` on the running source** (old Q74b) | live index not empty | No | none: R30 2.1 shows it is stale on a running source anyway | read it only on a freshly started node, where it is correct (R30 2.1, "Why a restart reads zero") |
| **Copy tree hash C1** (`[K] engine.mjs` `listingScript`, `parseListing`) | the copy dropped or changed a file | Partly: a dropped file the catalog references makes reads hang or fail, so G0 fails (with a deadline). A changed byte in a scope row: mismatch. | a dropped or changed file that no G0 read touches: XTDB system-time history versions, superseded L0 files, block files older than the latest, bloom metadata. These change latency, not answers. | keep C1 **refusal-only**: computed once at copy time, a mismatch refuses, a match grants nothing. A false match (R4-F1) is then harmless |
| **C3 xt.txs counts and system times** | lost tail of transactions | Lost scope rows: yes. | system times are wall clock; equal per golden lineage, different across seeds (`[K] REPORT.md` correction 5) | diagnostic |
| **C4 positions and counts** | missing or extra rows | **Yes** (counts and positions are inside the digest's inputs). | none | fold into G0 |
| **C5 history counts** (`FOR ALL SYSTEM_TIME`) | lost XTDB system-time versions | No: Triplex never reads XTDB system-time history; it reads its own positions. | storage size and layout | C1 and E1 |
| **C6 layout digest** (`xt.trie_stats`, `xt.block_files`) | different index layout | No | latency | refusal-only `xt.trie_stats` digest equal to the golden's reference digest; drop `xt.block_files` (the missing-block hang, Q83c, R30 Q4) |
| **C7 compactor jobs** | unsettled clone | No | compaction in the measured window | refusal-only (same quiescence check) |
| **C8 20-subject pulls and EXPLAIN plan** | wrong data in the pull path; R7's stale-plan anomaly | Pulls: superseded, G0 reads every subject. Plan: no. | plan differences, which disappear after the first trace write (R30 5.2 note) | plan hash as a diagnostic; E1 measures any latency effect |
| **`docker inspect`**: container id, start time, OOM (`[K] engine.mjs` stop and start) | evidence bound to the wrong container instance | Binding is by construction: the driver reads the endpoint it then measures, in the same process, seconds before warm-up. | none | record as diagnostics in the receipt |
| **stderr and process status of helpers and `clone-check`** (round 6 `observation.ts`; R5-F1) | a failed producer looking successful | Only matters when the producer's output can grant. Under B only G0 grants, and it runs in-process. | none | none |
| **Timers**: the 15-minute block timer, `freezeS < 600`, the CLI exit timer | a timer block cut changing the listing during fingerprinting; R5-F4 | Not content. | a timer block inside the measured window | procedure, already in R30 5.2: every arm starts its window the same number of seconds after `/healthz/started`; G0 must finish before that offset or the run refuses |
| **Owner reads**: readiness, certificate, lifecycle tokens, lock (`[K] engine.mjs:981-1099`; `bulk.ts:44-61`) | stale or superseded admission | The whole class exists only because one process grants and another consumes later. | none | none: delete |
| **Disk readings** (Q74f; R4-F3) | filling the VM or host disk | Not content. | operational | keep as a resource refusal (shared `lib.mjs` admission) |
| **Golden key** (Q74a; `assertSeedInputsCurrent`, `bulk.ts:64-80`; config check in `clone`) | **a stale golden**: same content, bytes written by an older adapter, image or config (for example Q76b's dropped `tx_query_relations` table) | Only if the change altered content. | **real**: a run on an old physical schema or old engine config | keep, refusal-only. It is a pure function of file hashes, already reviewed in rounds 1 to 5 |

### 2.3 The user's three examples, concretely

1. **"Matches today, copied from a still-running node, will diverge on restart."** On XTDB every clone start is already a restart
   from the copied bytes: it loads the latest block, replays `REPLICA_LOG`, then resumes the source log (R26 1.2 items 2 to 6,
   `LogProcessor.kt:279-297` `[S]`). G0 reads the state that restart produced. A hot copy has three outcomes, and all are visible:
   - log and storage from different moments: `validateOffsets` refuses the start (`Database.kt:229-251` `[S]`), or a catalog entry
     names a file that is missing, so reads hang (R30 Q4) and G0 fails on its deadline;
   - a valid shorter log prefix: positions or rows are missing, G0 mismatches;
   - a content-equal state with compaction still pending: the quiescence check refuses (jobs above 0).
   The residual is a clone whose **second** start differs from its first, which matters only for runs that restart the engine
   (GS.04). B covers it once per golden: qualification starts, fingerprints, stops and starts again, and both digests must equal `D`.
   The copy tool also refuses to copy a running container (one `docker inspect` precondition); that is a refusal, not evidence.
2. **"History or indexes the fingerprint does not read."** History in the Triplex sense (retractions, corrections, valid-time
   ranges, older positions) is inside the digest, because the digest covers `recorded_position` and `retracted_position` for every
   row, not only rows visible now. What G0 does not read is XTDB's own system-time history and the physical index (tries, blocks,
   blooms). Neither changes an answer; both change latency. That is E1's job once per recipe, plus C1 and the layout check per clone.
3. **"Resume of the log at the right position."** `/healthz/started` waits for the log head seen at start, lag 0 proves the node
   is at the head, the Triplex position check already fails closed (`bulk.ts:10-13` on main), and the first warm-up commit must be
   assigned `lastPosition + 1`. That last check is the direct test of "new writes land where they should", and it costs nothing.

---

## 3. Q2: the smallest set of checks that still covers those risks

### 3.1 The rule that makes it small

**A check that can only refuse needs almost no validation.** Its two failure modes are a false refusal, which is visible and costs a
rerun, and a false acceptance, which is harmless because a PASS still needs G0. So reviewing it means confirming two things: it is
wired so that nothing reads it to grant, and it cannot hang (every read has a deadline). Every finding class of rounds 1 to 5,
"accepted when failed, partial or stale", is a false acceptance. For a refusal-only check that class is empty by construction.

**Only the granting check needs the full review.** Under B that is one function (the G0 digest and its comparison), one input (the
provenance of `D`) and one binding (G0 runs in the driver, on the endpoint the driver measures, immediately before its warm-up).

### 3.2 The set

| Class | Check | When | Grants? | What it covers (section 2) |
|---|---|---|---|---|
| **Granting gate** | **G0 content digest** over the seed scope's Triplex rows (section 2.1) equals `D` from the golden record; counts equal the manifest's closed form; `tx_meta` holds only the seed scope; for W0 seeds the worlds and R2 output digests equal O-DOMAIN's (R34 G0) | in the driver, after health, before warm-up, every run (clone or fresh) | **yes, the only one** | content at every Triplex basis; lost, extra or changed rows; other scopes |
| Precondition | engine health: `/healthz/started` 200 through `docker exec`, `/healthz/alive` 200, one trivial query | same | no (G0 cannot run without it) | partial replay, a node that did not start |
| Refusal-only | **golden key current**: seed generator, built adapter, image digest and system config equal the key (Q74a; `assertSeedInputsCurrent`; the config check in `clone`) | driver start and `clone` | no | stale golden with equal content |
| Refusal-only | **C1 tree hash** of the copy equals the golden record's | `clone`, before the first start | no | dropped or changed files G0 does not read |
| Refusal-only | **quiescence on the started clone**: compactor jobs 0 on three readings, `xt.live_tables` total 0, `xt.trie_stats` digest equals the golden's reference digest `L`, `latestCompletedTxId` equals the golden's `T`, lag 0 | in the driver with G0 | no | live rows replayed, compaction pending, layout drift, a foreign tx |
| Refusal-only | **Triplex position** equals `manifest.lastPosition` (exists: `bulk.ts:10-13`) | driver start | no | lost tail of commands |
| Refusal-only | **first warm-up commit** gets `lastPosition + 1` | warm-up | no | resume at the wrong position |
| Refusal-only | **end counts** equal start plus recorded commands (R34 G9) | run end | no | writes lost or duplicated during the run |
| Once per golden | **two-start determinism**: qualification clone starts, G0 equals `D`, stop, start, G0 equals `D` again and `L` unchanged | golden qualification | publishes the golden | a second start that differs from the first (GS.04 runs) |
| Once per recipe | **E1** (Q74c): fresh-seeded arm against a clone under PAIR-0 A/A, 1.10 at p50 and 1.15 at p99 | once per recipe, image or XTDB version | allows clone receipts at all | latency equivalence: layout, compaction state, catalog checkpoint, cold caches |

Everything else K01 records today (stop exit code and log lines, F, M, settle readings, offline tail framing, inspect output, C3, C5,
C8 plan hashes, timings) stays in the receipt as **diagnostics**: written, never read by a decision. They are what you look at when
G0 or a refusal-only check fails.

### 3.3 The one place B keeps a non-trivial review burden

**Common-mode reader faults.** `D` and the clone digest come from the same reader, so a reader that drops rows on both sides
matches itself. R5-F3 was exactly this shape for C8 (an incomplete reference matching an incomplete clone). Three guards, all cheap:

1. Counts come from separate `COUNT(*)` queries and must equal the manifest's closed form (an independent generator), so an empty or
   partial read cannot match.
2. For W0 seeds the worlds digest must equal O-DOMAIN's, which is independent code (`lab/oracles/domain`).
3. Negative controls in the G0 test file: one row changed, one row dropped, one subject missing, an empty table, a read at the wrong
   position, a read deadline exceeded. Each must refuse.

An optional fourth guard for the N01 world, which has no oracle digest: compute `D` a second time by seeding the in-process `memory`
composition (`lab/bench/lib/memory.ts`) with the same manifest options, engine-free, and require both values to agree.

---

## 4. Q3: the simplified design

### 4.1 Flow

```
 GOLDEN, once per key                                            EVERY RUN (clone arm)
 ---------------------------------------------------------      ----------------------------------------------------
 1 seed on an exclusive slot (xtdb-seed.ts, exists)              1 engine.mjs clone: refuse if golden key stale,
 2 D := G0 digest on the running source, BEFORE finish-block       copy golden -> slot volume (cp -a, ro source),
      counts == closed form; W0: worlds == O-DOMAIN                 C1 tree == golden tree, else REFUSE; start;
      --> pinned into the golden record                             wait /healthz/started
 3 recipe (diagnostics only, timeouts refuse):                   2 driver, same process that will measure:
      finish-block; wait jobs 0; finish-block; wait jobs 0;         health precondition
      docker stop -t 60; refuse if still running;                   refusal-only: key, position, quiescence (jobs 0,
      cp -a into tx2-golden-xtdb-<key8>; record tree hash           live 0, trie digest == L, tx == T, lag 0)
 4 qualification = an ordinary clone of the golden:                G0: digest == D   --> PASS, else REFUSE
      start, G0 == D, record L and T; stop; start; G0 == D, L      3 warm-up: first commit position == lastPosition + 1
      --> publish golden record {key, D, L, T, tree, diagnostics}  4 measured window; end counts (G9)
 5 the golden volume itself is never started                     receipt: seededBy clone, golden key, D, G0 result,
                                                                    refusals checked, diagnostics
 FRESH ARM (E1 comparator, or any run without a clone)
      seed -> D' := G0 -> same recipe 3 (no copy) -> start -> run steps 2 to 4 with D'; also require D' == D (same manifest)
```

### 4.2 Gates

| Gate | Inputs | Pass condition | Fails to | Where the code lives |
|---|---|---|---|---|
| K0 key | manifest `seedInputs`, current `packages/*/dist`, image id, system config hash | all equal | REFUSE | `bulk.ts` `assertSeedInputsCurrent` (exists), `engine.mjs clone` config check (exists) |
| K1 copy | golden record tree hash, copy listing | equal | REFUSE before start | `engine.mjs clone` (exists, keep its C1 line) |
| K2 health | `/healthz/started`, `/healthz/alive`, `SELECT 1` | 200, 200, one row, within 5 min | REFUSE | `engine.mjs` probe (exists) |
| K3 quiescence | gauges, `xt.live_tables`, `xt.trie_stats` | jobs 0 x3 5 s apart, live 0, trie digest = `L`, tx = `T`, lag 0 | REFUSE | new, about 40 lines, reusing `clone-check.ts` `gauges()` |
| **G0 content** | scope rows, counts, (W0) worlds | digest = `D`, counts = closed form, scopes = {seed scope}, (W0) = O-DOMAIN | **PASS**, else REFUSE | new shared module, about 120 lines, the same reader R34's G0 needs |
| K4 resume | first warm-up commit receipt | position = `lastPosition + 1` | REFUSE (run invalid) | driver, a few lines |
| K5 end counts | start and end counts, command log | end = start + recorded | run invalid | R34 G9 |

Every read in K2, K3 and G0 has a deadline (10 minutes at the 10k rung `[E]`), because a read of a missing file hangs forever on
2.2.0 (R30 Q4). A deadline converts a hang into a refusal.

### 4.3 What it deletes

Line counts are additions on `exp/K01-seed-clone` against its merge base `e232c7a5` (`git diff --stat`, excluding
`lab/experiments` and `lab/verify`); "kept" is my estimate `[E]`.

| File (added lines) | Delete | Keep |
|---|---|---|
| `lab/bin/xtdb-log.mjs` (97) | all: the LocalLog framing parser and the schema-recursive SourceLogMessage decoder (R3-F1) | none |
| `lab/bin/engine.mjs` (+837) | `offlineCheck` (602-661), `oneCutProbe` (884-950), `verify` (1036-1099), the tail re-decode in `loadGolden` (951-979), stop-proof gating and lifecycle tokens in `stopSlot` (708-753), lifecycle markers in `up`, `down`, `releaseSlot`, owner `volumeContent.readiness`, certificate and attempt ids, most of `golden` (755-882) | `golden` reduced to recipe plus record (about 50), `clone` copy, C1 and start (about 50), `golden-rm` (manual only), `listing` and `toolcheck` as diagnostics: about 200 lines |
| `lab/bench/clone-check.ts` (306) | the settle predicate with its stability streaks and F/M/T rules, `startCheck` exact equalities, `compareFreeze` C3-C8, `verify` | `finish-block` plus a jobs-0 wait, `gauges()`, a `diagnostic` dump, K3: about 100 |
| `lab/bench/lib/clone.ts` (101) | `cloneCertificateHash`, `planShape`, block-file parsing | golden key: about 20 |
| `lab/bench/lib/bulk.ts` (+70) | the clone branch of `seedPathOf` (owner read, certificate recomputation, R5-F2) | `assertSeedInputsCurrent`; `seededBy: clone` taken from the golden record plus this run's G0 result: about 30 |
| `lab/bin/observation.ts` (61), `owner-state.mjs` (+13) | not needed by K01 any more | `lib.mjs` keeps only the admission input validation (R4-F3 fix) as its own change |
| `lab/bench/xtdb-seed.ts` (120), `slots.json` (+6) | none | all; `xtdb-seed.ts` gains the pre-freeze G0 call; `slots.json` keeps the Log4j flag |
| tests: `lab/bin/test/lab.test.mjs` (+74), `lab/bench/test/clone.test.ts` (130), reviewer suites on `verify/K01` (about 289 cases) | retire with the code they test | about 15 G0 controls (3.3) and one wiring test that no refusal-only result is read by a PASS path |

**Net `[E]`:** about 1,200 to 1,400 of the 1,957 added lines go, plus the reviewer suites; about 150 new lines arrive, and the G0
module is shared with R34's P5 harness, so it is built once for both.

### 4.4 R30's two cases under B

**Case 1: the Log4j shutdown-hook race (R30 Q1, Q83a).**
- Under A, a missing `Node stopped.` refused the golden (round 1) and drove Q83a, a config change, and a stop verdict with seven
  conditions that two reviews then audited (V1 F2, R2-F4).
- Under B the stop is a recipe step. Its exit code, duration and log tail are recorded as diagnostics. Nothing reads them to decide.
- Why that is safe: R30 1.3 and 1.4 show that a stop of an idle node, clean or killed, leaves the same bytes and no marker. The
  question a stop proof answers ("did close finish?") is answered for the bytes by the next start and by G0.
- Keep the `-Dlog4j2.shutdownHookEnabled=false` flag on s1 to s3: it is one line and makes diagnostics complete. Drop the rule that
  requires the lines.

**Case 2: #6174's stale `sharedSnap` (R30 Q2, Q3).**
- Under A, it caused the round-1 refusal (61,709 phantom live rows on the running source) and the two-finish-block rule, the
  reference start, and "never read `xt.live_tables` on a running source".
- Under B:
  1. `D` is read on the source **before** `finish-block`, right after the last seed commit. That commit refreshed the snapshot
     (R30 2.1: a newer basis forces `refreshSnap0`), so the read is current. Content reads at an explicit position are not affected by
     the cached live-table counts in any case.
  2. Nothing reads `xt.live_tables` on a running source. K3 reads it only on a freshly started clone, where R30 2.1 shows it is
     correct.
  3. The two `finish-block`s stay as recipe steps, because the second one records the post-compaction catalog in the latest block
     (R30 2.2 item 2). If the recipe ever omitted it, the effect is plans over L0 files until the first write. Content is unchanged,
     so G0 still passes, and the first trace commit of the warm-up refreshes the snapshot (R30 5.2 note), so the measured window does
     not see it. E1 would show any residual latency effect once.
  4. When XTDB 2.2.1 is pinned (#6174 fixed upstream, R21), the second `finish-block` can be dropped by rerunning E1, not by
     changing an acceptance rule.

**Also moot under B:** Q83c's missing-block hang (B never queries `xt.block_files`; `xt.trie_stats` reads the catalog without file
reads, R30 4.2) and Q83d/Q83e's fast-compaction frontier problem (F, M are diagnostics).

### 4.5 Other lanes

R34 already plans the same shape for the other lanes: a broker store clone is "file copy of `broker.db` after a TRUNCATE checkpoint",
a Datomic clone is a Postgres volume copy, and "G0's fingerprint sweep runs after every seed or clone" (R34 section 3.1 table and
section 5; Q92g). Under B, K01 uses that same rule, so one G0 module serves every lane. Under A, every lane would need its own stop
proof, frontier model and tail decoder.

---

## 5. Q4: recommendation

### 5.1 The three options

| | (A) keep iterating | **(B) simplify** | (C) drop K01, re-seed per run |
|---|---|---|---|
| Correctness basis | conjunction of about 27 process booleans, each audited for false PASS | one content digest against a value pinned before the freeze, plus refusal-only checks | the commit path itself; same oracle checks the driver already runs |
| Trend | 3, 4, 3, 3, 4 findings per round; 41 to 262 tests; no live golden in six rounds | review surface: one function, one input, one binding | nothing to review |
| Remaining work before a live golden | unknown number of rounds, then the live window, where R30-style surprises may reopen the protocol | one builder round (mostly deletion), one review round, then the live window | none |
| Live surprises like round 2 (compaction moved the watermark) | block the golden | become diagnostics | n/a |
| Time per XTDB 10k duet window | 6 to 20 min (if it ever qualifies) | 6 to 20 min | 76 to 106 min |
| Works for other lanes | XTDB only | same G0 as R34 for every lane | n/a |

### 5.2 What re-seeding costs per run (option C)

Rates: XTDB A0 commit path 120 to 293 facts per second (EXP-M01 about 120; N01 receipt 168.6; K01's 500-subject seed 293, as R34
risk 3 uses). W0 population sizes from R34 section 1.1: 1k about 445k facts, 10k about 4.45M, 100k 44,537,987. N01 world: 384,785
assertions at 10k (R26 0), scaled linearly for the other rungs `[E]`. Clone costs from R30 3.3 (2 to 5 minutes per clone at 10k)
plus G0 (0.5 to 5 minutes at 10k `[E]`, to be measured; R34 A1 expects 5 to 20 s for a 1k sweep).

| Store and world | Rung | Size | Re-seed per arm (C) | Per duet (C) | Per arm with B | Note |
|---|---|---|---|---|---|---|
| XTDB A0, N01 world (NS, P1-P4 PAIR-0) | 1k | about 38.5k assertions `[E]` | 2 to 5 min | 4 to 11 min | 2 to 4 min | a clone does not pay at 1k |
| XTDB A0, N01 world | **10k** | 384,785 assertions | **38 to 53 min** (N01 measured 38.0) | **76 to 106 min** | **3 to 10 min** | **the case K01 exists for**; P1 is the top priority |
| XTDB A0, N01 world | 100k | about 3.85M `[E]` | 6.3 to 8.9 h | 13 to 18 h | does not fit | the Local log is about 25 GB (R26 6.8 item 8) against an 8 GiB slot forecast |
| XTDB A0, W0 (P5 lane X native) | 1k | about 445k facts | 25 to 75 min (R34 risk 3) | 50 to 150 min | 3 to 6 min | R34 A2 duet needs two copies of one store |
| XTDB A0, W0 | 10k | about 4.45M facts | 4.2 to 10.3 h | 8.4 to 21 h | does not fit | 13 GB log against 8 GiB (R34 2.5; Q92d: X native at 1k only) |
| XTDB A0, W0 | 100k | 44,537,987 facts | 42 to 103 h | 84 to 206 h | does not fit | 130 GB log |
| broker host store (lanes Q and X-broker, P5) | 10k / 100k | 4.45M / 44.5M facts | under 2 min / several minutes (R34 B0, risk 3) | 2x | file copy plus G0 | not K01's domain |
| Datomic on Postgres (lane D) | 10k / 100k | about 26.7M / 267M datoms | 7 to 36 min / about 70 to 360 min `[E]` (R34 risk 3, scaled 10x) | 2x | volume copy plus G0 (untested) | not K01's domain |

**Reading the table.**
- XTDB A0 at 10k and 100k on the W0 population does not fit a slot at all, with or without a clone. K01 cannot help there; R34
  already routes those rungs to the broker host store (Q92d).
- K01's value is concentrated in two places: **NS and PAIR-0 duets on the N01 world at 10k** (saving about 56 to 100 minutes per
  duet window) and **the P5 lane X 1k duet** (saving about 40 to 145 minutes per window).
- A PAIR-0 window runs 8 to 24 rounds on one seed per arm (Q60a), so the saving is per window, not per round. Ten 10k windows cost
  13 to 18 hours of seeding under C against about 2 to 4.5 hours under B (one golden of about 1 to 1.2 hours plus ten pairs of clones) `[E]`.

### 5.3 Verdict

**Choose B.** It keeps the saving that matters for P1 (the 10k XTDB duets) and for P5's 1k lane X duet, and it makes K01 use the
same G0 rule R34 already requires for every seed and clone. It also turns the next review into a bounded task.

**Fall back to C only if** B's live qualification fails in a way G0 cannot explain, or E1 shows that clones do not hold the 1.10 and
1.15 margins. C is always available and needs no new code.

**Do not choose A.** The loop has not reached a live golden in six rounds, and nothing in its trend suggests the seventh round will
be the last.

---

## 6. What changes in the rulings

| Ruling | Today | Proposed |
|---|---|---|
| **New Q93a: process evidence refuses, never grants** | n/a | For seed reuse on every lane, the only evidence that grants admission is a content fingerprint (G0) read through the engine by the process that will measure, on the endpoint it measures, before its warm-up, compared with a digest pinned before the freeze began (and with O-DOMAIN where one exists). Every other observation (stop, settle, log tails, frontiers, inspect, stderr, timers, owner state, copy hashes, plan hashes, disk) is refusal-only or a diagnostic, and no decision reads a diagnostic. |
| **New Q93b: G0 for K01** | n/a | Fields, pinning point and counts as in sections 2.1 and 3.2; every read has a deadline; the golden is published only after two starts of a clone each reproduce `D` and the layout digest `L`. |
| Q74a golden key | refuse a stale key | **unchanged** (refusal-only) |
| Q74b canonical freeze state | settled: finish-block, jobs 0, live index empty | becomes the **recipe**: two finish-blocks, jobs-0 waits, `docker stop -t 60`, copy from a stopped container. A timeout refuses; nothing in it grants. |
| Q74c E1 first | no clone receipt counts until E1 passes | **unchanged**; E1 is rerun when the recipe, the image or the XTDB version changes |
| Q74d readiness | `/healthz/started` plus C1-C8 PASS stored in `owner.json` | **replaced** by Q93a/b: health precondition plus G0 in the driver; `owner.json` holds slot ownership only |
| Q74e, Q74f, Q74g | maintenance event in the window; disk floor; broker compositions copy together | unchanged |
| Q83a Log4j flag | required so the stop lines appear | **kept as a diagnostic aid**; no rule requires the lines |
| Q83b settle and clean-stop evidence | gating evidence | **superseded by Q93a**: the steps stay in the recipe, their readings become diagnostics; `xt.live_tables` is read only on a freshly started node (K3) |
| Q83c block listing | never read an unlisted block | kept for diagnostic tools; B never reads `xt.block_files` |
| Q83d settle after fast compaction | gating predicate | **retired** |
| Q83e three frontiers F, M, T | gating, with a stopped-tail proof for (F, M] | **retired**; F and M recorded as diagnostics, T checked on the clone (K3) |
| Q92c, Q92g (P5 fingerprint) | "freshly seeded or fingerprint-verified clone"; G0 after every seed or clone | unchanged; Q93a makes K01 conform to them |
| `load-contract.json` lines 174-234 | binds Q83b, Q83d, Q83e precedence and the F/M/T schema | replace with the Q93a/b binding in the next contract version |

**Sam's call or the orchestrator's?** This changes acceptance procedure, not a bar, an engine choice or a priority, and it keeps
correctness as the floor (G0 is stricter on content than C8's 20-subject sample). It is the orchestrator's call under
`lab/NORTH-STAR.md` item 4 ("specifics are adjustable"). The Log4j flag already had the orchestrator's approval as Q83a.

---

## 7. Risks of B and how the live run tests them

| # | Risk | Mitigation | Prediction for the first live run (500 subjects, then 10k) | If wrong |
|---|---|---|---|---|
| 1 | common-mode reader fault (3.3) | independent counts, O-DOMAIN for W0, negative controls, optional `memory` second source | a fresh seed's `D'` equals the golden's `D` exactly | the digest includes a nondeterministic field: find it and exclude it |
| 2 | stale golden with equal content | K0 golden key | a rebuilt adapter refuses at K0 | K0 is not refusal-only in practice: fix the wiring |
| 3 | latency not equivalent | E1, K1, K3 | E1 holds 1.10 and 1.15 | recipe change, then rerun E1 |
| 4 | second start differs (GS.04) | two-start qualification | both starts reproduce `D` and `L` | GS.04 runs seed fresh |
| 5 | R30 1.4 is wrong (a clean stop writes something an idle kill does not) | none needed: the bytes are judged directly | a golden made with `docker kill` instead of stop passes G0 and K3 (one diagnostic run) | keep the stop step, still without gating on its lines |
| 6 | G0 is slow at 10k | one streaming query per table | under 5 minutes at 10k `[E]` | page the read; it is a scan, not a pull per subject (A0 pulls are 627 ms p50 at 10k, EXP-P4, so never fingerprint through 10,000 pulls) |
| 7 | a refusal-only check refuses every clone | visible at once | K3 passes on the qualification clone | fix the check; no wrong receipt was produced |

---

## 8. Sources

- Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (sections 1.1 P5, 2, 6.1), `lab/PROTOCOL.md`.
- Rulings: `lab/acceptance/RULINGS.md` Q60a, Q74a-g (lines 543-549), Q76b, Q83a-e (lines 605-627), Q92a-k
  (`RULINGS-PENDING.md`); `lab/acceptance/load-contract.json` lines 174-234; `lab/acceptance/ACCEPTANCE.md` lines 20, 64.
- Design: `lab/research/R26-seed-clone.md` (sections 0, 1.2-1.5, 4, 5, 6.7-6.9), `lab/research/R30-xtdb-freeze-protocol.md`
  (sections 0-6), `lab/research/R34-p5-sweep-brief.md` (sections 1.1, 2.5, 3.1, 4.4, 5, risk table, experiment table).
- Builder: `.claude/worktrees/k01/lab/experiments/EXP-K01-seed-clone/{BRIEF,REPORT,REPORT-round2..6,PASS-AUDIT-round5}.md`;
  code at `d35fc4b4`: `lab/bin/engine.mjs` (functions at 602, 670, 697, 708, 755, 884, 951, 981, 1036), `lab/bench/clone-check.ts`
  (182-300), `lab/bench/lib/bulk.ts` (1-80), `lab/bin/xtdb-log.mjs`, `lab/bin/observation.ts`; `git diff --stat e232c7a5 HEAD`.
- Reviews: `.claude/worktrees/verify-k01/lab/verify/K01/VERIFY.md`, `VERIFY-round2.md` to `VERIFY-round5.md`.
- Adapter fields: `packages/xtdb/src/XtdbStorageAdapter.ts` lines 55, 65, 314, 519-524, 620, 647-664, 706-710.
- XTDB `[S]` references are R26's and R30's citations of `references/xtdb` at `c6c1962`; I did not reread them.
