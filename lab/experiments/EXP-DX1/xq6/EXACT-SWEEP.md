# The exact sweep: questions across subjects, read subject by subject (XQ6, 2026-11-24)

**The read gateway can now answer a question across the subjects of one account exactly, at any commit position and
any valid-time instant, for any attribute that is not protected, with nothing written per save and nothing built in
advance.** It lists the IDs of one kind with the ID list route's own walk (`ids/scan!`), reads each listed subject with
the pinned read's own code (`storage/read-rows`, the `read` route) at one position and one valid time, tests the
question's conditions on that subject's visible facts, and returns matching IDs, a count or counts per value, in pages
bounded by subjects read and time, with a signed cursor. It is slow on a deep account (prediction in section 5). It is
the fallback for what the commit-time index (`exp/DX-XQ4-commit-index`) refuses, the reference answer for that index's
exactness gates, and the reader a per-account backfill would use. Option: **`TX2_SWEEP=1`** on the read gateway
(default off: the route is absent and the gateway answers 404 `NotFound` exactly as before). Branch
`exp/DX-XQ6-exact-sweep`, based on `exp/DX-XQ3-id-lists` `f1f0908df` (which contains `exp/DX-INT1` `23b7df344`).
Design: part 2 of `research/2026-11-24-cross-subject-questions/DESIGN-FABLE.md` (private).

## 1. What it answers and what it refuses

`POST /v2/db/{db}/sweep` (SDK: `sweepPage`, `sweepPageWaiting`, `sweepAll`, `sweepCount` in `packages/datomic/src/sweep.ts`).

```json
{ "account": "account-003",
  "from": { "prefix": "tk:", "shape": "tk:{8 digits}:{digits}" },
  "where": [ { "attribute": ":task/assignee", "op": "eq", "value": { "type": "ref", "value": "acct/account-003/pl:00000005" } },
             { "attribute": ":task/status", "op": "in", "values": [ { "type": "string", "value": "pending" } ] } ],
  "result": "ids", "project": [":task/due"], "limit": 100,
  "basis": { "recordedPosition": 28309866, "validAt": 1795000000000 },
  "bounds": { "subjects": 256, "ms": 200 }, "cursor": null }
```

| Part | Accepted |
| --- | --- |
| `account` | Required; one account per question (`acct/<account>/`). |
| `from` | The kind: an ID prefix after the account's base and an optional shape, in the ID list route's grammar. Default: every ID of the account. |
| `where` | Up to 8 conditions, all required (AND), in the find route's grammar so a question the index refuses can be sent here unchanged: `eq`, `in` (1 to 64 values), `range` (`from`/`fromExclusive`, `to`/`toExclusive`; string, integer, number, datetime), `prefix` (string), `exists`, `missing`. Values are `{type, value}` with type string, ref, integer (decimal text), number, datetime, boolean. **Any attribute, declared or not**, except a protected one. |
| `result` | `ids` (matching IDs in ID order, `limit` 1 to 1,000 per page, optional `project` of up to 8 attributes whose visible values come back with each ID), `count`, or `countByValue` with `of` (subjects per distinct value; a subject without a value counts under `null`; at most 1,000 values). |
| `basis` | `recordedPosition` or `recordedAt`, and `validAt`; or `atLeastPosition` (a receipt). None: the reader's head and the gateway's clock. **The answer states `position` and `validAt`, and every page of the question is read at them.** |
| `bounds` | `subjects` read per page (default 256, cap 10,000) and `ms` per page (default 200, cap 2,000). |

**Meaning.** A subject is a listed entity with at least one fact visible at the position and valid time
(`Triples.entityPage`'s rule). A condition holds when one of the subject's visible facts of that attribute satisfies
it (`exists`: at least one; `missing`: none). Visible means recorded at or before the position, not retired at it, and
valid at the instant. These are the same rows `read` returns for that subject at that basis (gate 2c).

**The answer** carries `position`, `t`, `head`, `validAt`, `facts: "stored"`, `complete`, `stopped` (`end`, `limit`,
`subjects`, `time`), `examined`, `listed`, `subjects`, `matched`, `rows`, `cpuMicros`, `micros {list, read, evaluate,
queue}`, the IDs or the running `count` / `groups` with `countComplete`, and `next` (null exactly when complete). A
page that stops on a bound is never described as complete; a count is exact only on the page that says
`countComplete: true`.

**The cursor** is HMAC-SHA256 signed (key from `TX2_SWEEP_CURSOR_SECRET`; give every read gateway of one client the
same secret so a cursor survives a restart, else a random key per process) and binds the database, the account, a hash
of the question (kind, conditions, result, projection), Datomic `t`, the position, the valid time, the last ID examined
and the running count. Any edit, another account, another question or another basis: 409 `CursorMismatch`.

**Refused, all typed:**

| Request | Answer |
| --- | --- |
| A protected attribute in `where` (any op, `exists` included), `project` or `of` | 409 `ProtectedValueLookup` |
| No account; a malformed account | 400 `AccountRequired`; 400 `InvalidValue` |
| `ne`, OR, text "contains", sums, averages, more than 8 conditions, a json or blob value | 400 `UnsupportedOperation` |
| A cursor edited, or replayed with another account, question or basis | 409 `CursorMismatch` |
| A position inside a group commit or a multi-position transaction | 409 `InteriorPosition` (the ID list route's rule; not answered yet) |
| An irregular scope's record-time basis; a layout without row texts | 409 `IrregularScope`; 409 `LayoutUnsupported` |
| A position the peer has not reached in time | 409 `BasisNotAvailable` / `AtLeastTimeout` |
| More than 1,000 distinct values in `countByValue` | 422 `GroupLimitExceeded` |
| No permit within the queue wait | 503 `SweepBusy` with `retryAfterMs` (the SDK waits and retries) |

**Not answered (stated, not refused by a code):** questions over a subject's children (the product's S10, "subjects
whose next open task is due…") read one entity per subject, so they need the child's values on the subject or a join
step; values a release computes but has not stored yet (`facts: "stored"`, see 4.4).

### Admission

Its own pool, `TX2_SWEEP_PERMITS` (default 1, 1 to 16), beside the read permits, the journal permits and the ID list
pool. A sweep never holds a read permit: `storage/read-rows` is called with `admission/*own-pool*` bound, which makes
its `admission/execute` skip the read semaphore (unbound everywhere else, so every other read is admitted exactly as
before). One sweep per account at a time by default (`TX2_SWEEP_PER_ACCOUNT`, 1 to 16), waiting in a fair queue per
account and then a fair queue for the pool for at most `TX2_SWEEP_QUEUE_MS` (default 200), then 503 `SweepBusy`. With
`TX2_SWEEP_PER_ACCOUNT` and `TX2_SWEEP_PERMITS` above 1, `sweepCount(client, db, request, split)` runs one question as
several ID-prefix parts in parallel, all pinned to the first part's position and valid time, and adds them up.

## 2. Exactness gate (Mac toy, one ordinary heavy token, counts exact)

`xq6/gate.sh` → `xq6/gate.ts`, run `gate-2` (evidence `DX-XQ6/gate-2`, private): **PASS, 5,917 checks, 0 failures.**
Stack of this branch's gateway with `TX2_SWEEP=1`, one cursor secret, an erasure directory; writes through Triplex's
own runtime. **Brute force, independent of the sweep's path:** one history read of the whole scope at the position
(`lean/history-entity` over `d/history`, not the as-of live read the sweep uses), then visibility at (position, valid
time) and every condition, projection and grouping recomputed in TypeScript.

**Workload (25 positions before the matrix, 51 at the end):** accounts `account-003` and `account-0031` (whose name
starts with the first's) with 30 subjects, 60 tasks and 4 forms each; `account-009` with zero subjects; five value
families; references; a subject with 200 forms (200 attributes); protected values on five subjects; corrections dated
in the past (old value valid until 10 days ago, new value from then); retirements (every fact of some tasks, some
statuses replaced); facts whose validity ended a week ago; an import through a client of write class `import` (new
subjects valid from 15 days ago, a backdated value); a removal on request of three subjects' protected values; a
release writing a value to account-003's tasks in frames of 8 (2 frames before the matrix, the rest between pages).

| Gate | Result |
| --- | --- |
| **2a. Every accepted shape** | 17 question shapes (list, count, eq, eq on a reference with `in` ("who owes subject 5") and a projection, `in` count, datetime range, integer range count, number range with exclusive end, prefix, boolean, `missing`, `exists` count, `countByValue`, two conditions, the 200-form subject, the release-written value, the whole account grouped by status) × 3 accounts × 3 positions (19, 21 and the head 25) × 3 valid instants (20 days ago, 5 days ago, now + 1 h) × rotating page sizes (limit 3 with 5 subjects per page; 7 subjects per page; 10,000): **459 sweeps, 2,134 pages, 2,247 IDs and 2,890 counted subjects equal to brute force**; every page at the question's position and valid time, only the last page complete, every page within its subject and match bounds. 22 of the 34 non-empty (account, question) pairs have different true answers across the nine (position, instant) cells, so the matrix can fail; 177 of 459 answers are empty (153 of them account-009). |
| 2b. Default basis and record time | No basis: the answer states the head (25) and the gateway's clock, and equals brute force at what it states. Record times of 4 receipts: stated position at or after the commit, equal to brute force there. |
| **2c. Equals `read`** | For every task of account-003 with a status at (19, 20 days ago), (21, 5 days ago), (25, now): the sweep's projected values of 4 attributes equal what `POST read` with that one `entityId` returns: **672 comparisons, 0 differences.** |
| **2d. A subject changed between two pages** | Pinned at 25; between pages, tasks ahead of the cursor change status, new tasks are created after the end, a fact behind the cursor is retired (17 commits, head 42). 18 pages equal brute force **at 25**; the true answer at the head differs (18 against 36 matches), and a fresh sweep at 42 equals brute force at 42. |
| **2e. A removal on request between two pages** | Pinned at 42; two subjects' protected values removed between pages (head 44). 15 pages equal brute force at 42 and the fresh sweep at 44; no protected value in any answer (checked on every page of every sweep: 0 occurrences of the protected text). |
| **2f. Settlement frames between pages** | Pinned at 44; one 8-task frame of the release committed between each two pages (head 50). 24 pages equal brute force at 44 (16 matches; 60 at the head). |
| **2g. Read gateway restart between pages** | Pinned at 50 (account-0031 count); the read gateway restarted after page 2, a save after page 3; the cursor issued before the restart continued after it; 9 pages, count equal to brute force at 50 (24; 25 at the head). |
| **2h. Refusals** | 15 of 15 as expected: protected attribute in `eq`, `prefix`, `exists`, `project`, `of` (`ProtectedValueLookup`); cursor in another account, cursor edited to name another account's ID and position 1, cursor edited to another account, cursor with another question, cursor with another position (`CursorMismatch`); no account; malformed account; `ne`; a json value; nine conditions. The original cursor then still continued its own question. |
| 2i. Isolation | No ID outside `acct/<account>/` on any page of any sweep (account-003 never returns account-0031). |
| 2j. Busy | 12 full counts of account-003 and 3 of account-0031 at once, one permit, one per account: 3 refused `SweepBusy` after their queue wait, 12 answered, every answer exact. |
| **2k. Off equals before** | Gateway suites (`xq6/suites.sh`: selftest, commit-order, cache-key, group, feed, recent, pinned, trace, ids; 72 tests, 71,161 assertions) with `TX2_SWEEP` unset and set: 0 failures, 1 error in both (`feed-test/http-route`: the response body is bytes where the test reads a string; **the same error on the base `f1f0908df` without this branch's changes**). With the option unset `POST /v2/db/{db}/sweep` answers `404 {"code":"NotFound"}`. SDK `tsc --noEmit` clean. |

## 3. Cost per 1,000 subjects (Mac toy, diagnostic)

`xq6/load.ts`, run `load-1`: account-007 with 4,000 subjects of 12 facts (4,000 more facts changed on a third of them
after position 58), indexed; a count with one `eq` condition over all 4,000 (`shape "pl:{8 digits}"`), pages of up to
10,000 subjects and 2 s. Storage reads are PostgreSQL index scans of Datomic's table net of the idle baseline (2 per
11 s), as XQ3 counts them; Datomic's io-stats attributed 0 segment loads to the sweep's reads, as it did to XQ3's walk.

| Per 1,000 subjects | Head, uncached (reader restarted) | Head, cached (repeat) | Position 58, uncached | Position 58, cached |
| --- | ---: | ---: | ---: | ---: |
| Storage reads | 15 | 0.25 | 16.5 | 0.25 |
| Rows read (row texts decoded) | 12,667 | 12,667 | 12,000 | 12,000 |
| Reader CPU, s (thread CPU of the sweep) | 0.37 | 0.55 | 0.36 | 0.20 |
| Gateway time, s (one permit) | 0.93 | 0.97 | 0.89 | 0.28 |
| of which listing, s | 0.05 | 0.03 | 0.06 | 0.01 |

**What these say and do not say.** The toy's subjects were written 100 to a commit, so one storage read brings in about 65 of them and an
uncached subject costs 0.015 storage reads; at 1 billion subjects are scattered and cost 1.5 to 2.0 (measured
2026-11-23). The CPU figures move by 2.7× between runs of the same work on the shared VM (head cached 0.55 against
position 58 cached 0.20), so the toy gives one usable number: **the sweep's own CPU per subject of 12 rows is 0.2 to
0.55 ms on the Mac VM**, most of it inside the `read` route (0.84 of 0.93 s at the head uncached; the conditions
take 0.04 s), which a sweep pays because it reads through that route on purpose (2c). The listing is under 7% of the
time.

## 4. The other readers

### 4.1 Counted work per pinned read (Mac toy)

`load-1` and `load-2`: 256 pinned readers of random subjects (4,000 + 3 × 600) at the head, through `POST read`, 20 s
windows, alone and beside one and four sweeps (accounts 007 to 010 in a loop, one permit, so four sweeps take turns).
Ten windows in `load-2` (order 0, 1, 4, 0, 4, 1, 0, 1, 4, 0) plus four in `load-1`.

| Per pinned read | Alone (6 windows) | Beside 1 sweep (4) | Beside 4 sweeps (4) |
| --- | --- | --- | --- |
| Rows returned, per subject | identical in every window: **0 of 329,621 reads** returned a row count different from that subject's first read | same | same |
| Read permits taken | exactly 1.000 per read | 1.000 | 1.000 |
| Read queue peak | 256 (every reader queued on the one read permit) | 256 | 256 |
| Entity cache hits / misses | 0 / 0 (the entity cache is off on this stack) | 0 / 0 | 0 / 0 |
| Subjects swept meanwhile | 0 | 11,648 to 22,736 per window | 19,456 to 25,512 per window |
| Reads/s (diagnostic) | 844 to 1,592 | 618 to 1,387 | 910 to 1,311 |
| p99 ms (diagnostic) | 343 to 1,850 | 322 to 800 | 351 to 597 |

**Reading.** The counted work of a pinned read does not change while sweeps run: the same rows, one read permit, no
sweep work on the read permits. The timings move by 2× between windows with the same arm (other builders share the
VM), more than any arm-to-arm difference, so the Mac says nothing about the time cost. One window (`load-1`, one sweep)
halved the reads per second; the next three one-sweep windows did not.

### 4.2 What a sweep does to other readers at 1 billion (prediction, not measured)

- **CPU.** A sweep permit uses up to one of the reader's cores for as long as it runs. The default (1 permit) leaves the
  tuned reader (3 cores) two cores for the read classes; 3 or 6 permits on that reader take most of it.
- **The cache, which is the larger effect.** An uncached subject at 1 billion costs 1.5 to 2.0 segment loads, so a
  sweep of 100,000 subjects passes 150,000 to 200,000 segments through the reader's 3 GiB object cache, which holds
  a few thousand (about 6,000, the review of 2026-11-24). Every segment other accounts' readers had cached is evicted
  within seconds and stays evicted while the sweep runs. **Predicted: re-read pinned readers fall from 8,000 to 11,000
  reads/s toward the random-subject level (1,200 to 1,750 reads/s), and their p99 rises from 75 to 115 ms toward 250
  to 340 ms, during a sweep and for about 10 to 60 s after it**. The commit path is not affected (sweeps read only on
  the read gateway; the saves share PostgreSQL with it, which serves both from its own buffers).
- **What would avoid it (not built):** run sweeps on a second read gateway with its own cache (the SDK's sweep calls
  take a client, so a sweep client can point at another reader), or bound a sweep's segment loads per second. Arm B of
  the server command measures whether this is needed.

## 5. Prediction for 100,000 subjects at 1 billion (written before any server run)

Units: an uncached pinned subject read costs 1.1 to 1.7 ms and 1.5 to 2.0 segment loads (measured 2026-11-23); the
sweep adds its own CPU per subject (0.2 to 0.55 ms on the Mac VM for 12 rows, about 0.1 to 0.4 ms on the server at a
Mac-to-server ratio of 1.0 to 1.9; subject roots at 1 billion may carry more rows); the listing examines about 280,000
`pl:` IDs (2.8 per subject) at about 6,400 IDs per storage read (XQ3), about 45 reads and 0.3 to 1 s.

| Count of one account's 100,000 subjects with one condition, alone, from a cold reader | Predicted |
| --- | --- |
| 1 permit (one part) | **120 to 210 s** (1.2 to 2.1 ms per subject) |
| 3 permits (3 parts at once, `TX2_SWEEP_PER_ACCOUNT=3`) | **45 to 80 s** (storage waits overlap; CPU within the reader's 3 cores) |
| 6 permits (6 parts) | **30 to 60 s** (floor set by about 0.6 to 1.0 ms of CPU per subject over 3 cores) |
| Storage reads | 150,000 to 200,000 for the subjects, about 45 for the listing |
| Answer | Exact: `examined` 100,000 subjects, the same count in all three arms |
| Filtered list over the first 10,000 subjects, pages of 100 | cold 12 to 21 s; repeated at once 2 to 6 s (about half the 10,000 subjects' segments still cached) |

DESIGN-FABLE's own prediction was 57 to 83 s for 100,000 on three cores; this one is close at 3 parts and slower at one.

**What would show it wrong.** Any count that differs between the three arms, or `examined` other than 100,000: the
sweep is not exact at that size (stop; nothing builds on it). One part above 300 s (over 3 ms per subject): the `read`
route's per-row work costs far more at 1 billion than on the toy; then the sweep should decode only the attributes it
tests (the early-filter decode `TX2_READ_FILTER_EARLY` already does this for one attribute) and the equality with `read`
must be re-proved. 6 parts not at least 1.3× faster than 3: CPU-bound on the reader; more permits do not help there.

## 6. Server command (for the day a machine is rented; needs the owner's approval of the rental)

As XQ3's: one rented server with the sealed 1 billion cluster, the demo stack brought up from this branch with the
sweep on, the runner on the same machine. Arm A only reads; arm B writes a save loop on account-005 of the working copy.

```bash
cd "$REPO" && git checkout "$COMMIT"            # head of exp/DX-XQ6-exact-sweep
pnpm install --frozen-lockfile && (cd packages/core && pnpm run build) && (cd packages/datomic && pnpm run build)
sudo env DX_SWEEP=1 DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_SWEEP_QUEUE_MS=5000 \
  DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#   prints DEMO READY head=28309866 records=1000251169 t=62888918 ...
sudo node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/server.ts \
  /var/tmp/triplex-demo/ready.json "$OUT/xq6-1b" account-003
sudo bash demo/server-down.sh
```

**Duration:** bring-up as the demo's (3 to 12 min); arm A 10 to 20 min (four reader restarts, three counts, two lists);
arm B 10 to 14 min (five windows: warm-up 120 s, control 120 s, a one-part count, a three-part count, control 120 s);
in all about 25 to 45 min.

**Arm A predictions:** section 5's table.

**Arm B (256 pinned readers re-reading 5,000 subjects of other accounts at position 87,002, a save loop of one commit
per subject's save, 17 facts, 23 saves/s, on account-005), predictions:**

| Window | Re-read pinned readers | Saves | Sweep |
| --- | --- | --- | --- |
| Control | the demo reader's re-read level (8,000 to 11,000 reads/s and p99 75 to 115 ms if it is the tuned reader) | p50 5 to 10 ms, p99 under 50 ms | — |
| One-part count beside them | reads/s down 30 to 80%, p99 2 to 4× the control (the cache, 4.2) | p99 within 1.25× the control | 150 to 300 s, exact |
| Three-part count beside them | reads/s down 50 to 85%, p99 2.5 to 5× | p99 within 1.25× | 60 to 150 s, exact |
| Control again | back within 10% of the first control | as control | — |

**What would show them wrong:** readers within 10% of the control while a sweep runs (the cache effect is smaller than
predicted; then sweeps can share the main reader); readers not back within 10% in the last control (the sweep leaves
damage behind); save p99 above 1.25× the control (sweeps reach the commit path through PostgreSQL; then they need their
own storage read budget); any read or save error.

## 7. Files

| File | What |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/sweep.clj` | The route, admission, conditions, signed cursor |
| `packages/datomic/gateway/src/triplex/gateway/admission.clj` | `*own-pool*`: a sweep's `read-rows` call skips the read permit; unbound, nothing changes |
| `packages/datomic/gateway/src/triplex/gateway/main.clj` | The route, present only with `TX2_SWEEP=1` |
| `packages/datomic/src/sweep.ts`, `index.ts` | SDK |
| `lab/experiments/EXP-DX1/stack/up.sh` | `DX_SWEEP`, `DX_SWEEP_PERMITS`, `DX_SWEEP_PER_ACCOUNT`, `DX_SWEEP_QUEUE_MS`, `DX_SWEEP_CURSOR_SECRET` (unset: environment unchanged) |
| `xq6/gate.sh`, `gate.ts`, `load.ts`, `suites.sh`, `server.ts`, `dryrun.ts` | Gates, measurements, server runner and its Mac dry run (run `dryrun-1`: every step of `server.ts` ran on a toy stack) |

## 8. Not verified

- **Nothing ran on a server.** Every time is the Mac's (diagnostic); sections 4.2, 5 and 6 are predictions.
- **The effect on other readers' cache at 1 billion** is the main unknown and is not measured anywhere; the toy fits
  in memory. Sweeping on a second reader is not built or tested.
- **Interior positions** (inside a group commit) are refused, not answered; group commits are off by default.
- **Release-written values during settlement (review finding B1):** the sweep answers stored facts and says so
  (`facts: "stored"`); it does not know which attributes a release writes nor the account's settlement state, so it
  neither refuses with `SettlementInProgress` nor works the release's answer out per subject. Gate 2f shows it is exact
  about stored facts while frames land; a caller running a Publish must check settlement itself.
- **Questions over a subject's children** (product S10) are not expressible; one entity is read per listed ID.
- **The legacy layout** is not gated (lean scopes only). **Several read gateways behind one URL** with one cursor
  secret: not tested beyond one gateway restarting.
- **io-stats** attributed no segment load to the sweep's reads on the toy (as for XQ3's walk); storage reads were
  counted in PostgreSQL only.
- **The SDK helpers** (`sweepCount` with `split`) ran in the dry run and the load runner, not in a unit test.
- **Not merged** onto `exp/DX-INT1`; the commit-time index's route (`find`) does not yet call the sweep for what it
  refuses.
