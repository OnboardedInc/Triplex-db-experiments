# DX-B2R: review of the key-deletion fix (B2) before it merges

Reviewed: `origin/exp/DX-B2-key-deletion` at `4743df766`, against the one branch `origin/exp/DX-INT1` at `1ed2650bd`.
Every option off, today's database-wide removal rule. Mac only; every time below is diagnostic.

## Page 1

**Is there a break? No.** I found no way to make the fix delete a key it must not, keep a published removal's key
past its grace (beyond the cases the brief admits and three that were there before the fix), change an answer when
no removal is pending, print a protected value, a subject or an account name, or stop a pending removal or the
restore route from completing. **How sure: high.** The change removes one check that never guarded what the pass
reads: the pass only reads entries up to the published head, and the head moves only after a removal's native commit.

**Recommendation: merge into the one branch with one named fix, F9.** On the PostgreSQL authority, the new
`key-pool-refill` log line prints one key of the failed batch in its encrypted (wrapped) form, because the database
driver puts the whole statement into its error message. That key was never used to seal a value, so nothing is
exposed today, but key material should not reach a log. The fix is a few lines in `failures.clj` (log the error
code and the server's error text, not the statement). Advisable in the same change: F5, one line per failure place
per minute instead of one every 500 ms. F1 and F3 were there before the fix and can follow separately.

**What was attacked, in numbers** (all diagnostic, Mac only):

| Attack | Result |
| --- | --- |
| The builder's gate, rerun on the branch and on `1ed2650bd`, both authorities | Claims confirmed: the published key outlived its grace by 17-40 ms on the branch against 30,018-30,212 ms on the base with the other removal held 30 s; native log digests, replies and key stores identical with and without removals; suites 78 tests, 71,220 passes, 1 error on both |
| A schedule fuzzer (two or three removals, every stop point, passes on two gateways, restarts, lost locks, log and data restores), checked after every pass | 20,000 schedules on each authority, 104,493 + 105,102 passes, 134,335 deleted keys and 328,342 due keys checked: **0 violations**. The same fuzzer on the base: 1,259 violations in 2,000 schedules, all B2 |
| Scenarios through the routes (completion by resend, the restore route after a data restore, the new lines) | 42 of 42 checks on the branch, both authorities; a rerun of S3 with a key-bytes check fails on PostgreSQL (F9). The base fails the B2 check and "failure lines printed" (it has none) |
| A toy stack from the branch by image ID (file authority, default 300 s grace) | Prediction held: the published removal's key gone at publication + 320 s with the other removal pending; the pending one completed by the client's resend; its key gone 3 s later; no removed value in any reply |
| TypeScript removal tests on the branch | pass: `packages/datomic` 4 files, 22 passed, 2 skipped (integration cases that need a live gateway); `packages/host` feed test 13 passed. The branch changes no TypeScript |

**Not tested:** a PostgreSQL authority on a stack (the launcher has none outside a measurement mode whose grace is
fixed at 0), a real Datomic backup and restore, a real transactor restart.

## 1. What the branch carries (read first, then confirmed)

`git diff 1ed2650bd...4743df766`: 7 files, 568 lines added, 4 removed. Nothing else.

| File | Change |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/envelope.clj` | `shred-published!` reads `(privacy/cut name nil true)` (the published prefix, a pending removal allowed) instead of `(privacy/cut name nil)`; its `catch`, the key-pool refill's `catch` and the worker loop's `catch` call `failures/note!` instead of dropping the failure |
| `packages/datomic/gateway/src/triplex/gateway/failures.clj` (new) | `note!`: one counter (`/v2/admin/scan-stats` `:removalFailures`) and one JSON line `triplex.removal-failure.v1` with `where`, `database`, the exception class, `code`, `message` |
| `lab/experiments/EXP-DX1/b2-keys/` `b2.clj`, `b2.sh`, `gate.sh`, `paired.clj`, `stack.sh` | the builder's tests |

- The gateway code is the same at `f2e33ac50` and `4743df766` (`git diff f2e33ac50 4743df766 -- packages` is empty).
- No absolute home path, address other than 127.0.0.1, or credential in the diff.

## 2. Why the change is safe, read from the code

1. **The pending check never kept an unpublished removal out of the pass.** The pass reads `head.json` and the entry
   records `1..head.seq` only (`privacy.clj` 128-161). The head moves only in `privacy/publish!` (file: entry, then
   head, then the intent's removal, 179-184; PostgreSQL: one transaction that also checks the head it replaces and the
   intent it deletes, `authority_sql.clj` 92-103). `erase!` calls `publish!` only after its native commit succeeded or
   was found (`erase.clj` 216-229). A pending removal's entry has `seq = head + 1` and is not read. So the published
   prefix cannot include or run past the pending removal, with or without `pending.json`.
2. **One intent per database.** `erase!` refuses another command while an intent is pending (`erase.clj` 211-213), so
   two pending removals in one database need a lost lock (the second overwrites the first's intent).
3. **`erasedAt` rises with the sequence.** `make-entry` stamps `max(now, max-recorded-at + 1)` (`erase.clj` 123) and
   each removal's native commit sets `max-recorded-at` to its stamp, so the pass's `take-while` on `erasedAt` never stops
   behind a later removal.
4. **Nothing reads a value while a removal is pending.** Reads, saves, deliveries, `erasure-frontier` and the restore
   route all call `cut` without the pending allowance (`main.clj` 446, 469, 477, 486; `erase.clj` 237) and refuse;
   after the pending removal completes, the published removals are masked by the cut. So deleting a published
   removal's key while another is pending cannot make a value unreadable that the product must still serve.
5. **The pending removal's completion and the restore route use no key.** `make-entry` takes identities from the
   detached record (`envelope/assertion-identity`, no decryption); `apply-native!`, `publish!`, `response` and
   `replay-after-restore!` never decrypt.
6. **`failures/note!` cannot throw** outside a request (`trace/counter!` is a no-op there; every field is a string or
   nil), so the worker loop cannot die from its own reporting. `Error`s still end the thread, as on the base.

## 3. Findings

No break of the five kinds in the brief. One finding is new with this branch and has a small named fix (F9). F1 to F4
were there before the fix (the base behaves the same); F5 to F8 are notes.

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F9 | **Low, new with this branch: the named fix** | **On the PostgreSQL authority the `key-pool-refill` failure line prints a wrapped key.** `note!` logs `(.getMessage e)`; for a failed batch the PostgreSQL driver's message is the statement with its parameters, so the line carries `INSERT INTO triplex_removal.keys(scope,id,wrapped) VALUES ((<database>),(<handle>),'\x<120 hex characters>'::bytea)`: one key of the batch, encrypted under the wrapping key. That batch is rolled back, zeroed in memory and never added to the pool (`envelope.clj` 86-96), so no value is sealed with a key that reaches this line, and no protected value, subject or account name is printed. It is still key material in a log, which the base did not print (it dropped the failure). The `shred` line on PostgreSQL likewise prints the statement (the database name and a key handle, no key bytes). | scenario S3 on PostgreSQL: check "prints no hex run of 64 or more characters" FAILS on the branch (the line is in `scen-s3-pg-branch/run.log`); the file authority passes | In `failures.clj`, for a `java.sql.SQLException` log the SQL state and the server's error text (`ServerErrorMessage`, or the next exception's), never the driver's message with the statement. A few lines; no other file changes. |
| F1 | Low, before the fix | **A gateway that has seen a newer removal log than a restored older copy refuses every cut, the pass included, until it restarts.** A published removal in the restored log whose grace ends after the restore keeps its key on that gateway until a restart (another gateway, or a restart, deletes it). The fix does not change this; it now counts and logs it (`shred`) on every pass. | `privacy.clj` 144 (`(< n (:seq prior))`) and 156 (the seal no longer matches the cached state); fuzzer category `i2-miss-gateway-ahead-of-a-restored-log`: 93 in 20,000 file schedules, 78 in 20,000 PostgreSQL schedules; the base: 12 in 2,000 file schedules | In the pass only, when the cut refuses because the head is behind or differs from the cached one, read the log once more without the cache (every removal in a restored published prefix was published) and reset that scope's progress mark. Reads keep the refusal. |
| F2 | Low, admitted in the brief, before the fix | **A key file restored after its deletion stays until a restart**, because the pass starts after its progress mark (`shredded`). What the fix changes: with a log restored to a pending-state copy, a restart now deletes the restored keys of published removals (the base kept them through restarts while the restored intent was pending; era5's M2; read from the code, not measured apart: the fuzzer counts any restored key as admitted). | fuzzer category `i2-miss-admitted-restored-key`: 173 file, 116 PostgreSQL | As era5 M2: check every published removal's keys again from time to time, not only from the progress mark. |
| F3 | Low, before the fix, file authority, needs a lost lock | **The file authority's publication writes the head from the writer's own view without comparing it with the head on disk.** A writer that held its check across another removal's publication moves the head back (a published removal leaves the log); over a restored copy it writes a head whose chain does not verify, and every cut refuses it. PostgreSQL compares (`UPDATE ... WHERE payload=?`). The file lock is an operating-system lock, so this needs a lock that does not hold (for example shared storage that ignores it). | `privacy.clj` 179-184; fuzzer: `head-moved-back-outside-a-restore` 10 and `i2-miss-log-does-not-verify` 2 in 20,000 file schedules, 0 on PostgreSQL | In `publish!` (file), compare the head on disk with `(:wire current)` before writing, as the PostgreSQL branch does. |
| F4 | Note, before the fix | **A data restore to a copy older than a pending removal's predecessor leaves the pending removal stuck:** the restore route refuses while a removal is pending (503) and the client's resend fails on the restored data (400 `GatewayError`: the native compare-and-set of the removal sequence fails); it stays pending. Identical on the base and the branch, both authorities. | scenario S2a | Out of this fix; the restore route needs a way to replay with an intent present (the ERA2 line's work on stuck states). |
| F5 | Note | **The new lines have no rate limit.** A failure that persists prints one line per failing place per pass, every 500 ms (F1's gateway prints two a second per database until restarted; an unreachable PostgreSQL authority the same). | `envelope.clj` 211, 217, 226; `failures.clj` | Log the first failure and then at most once a minute per (place, database, code); keep counting every one. |
| F6 | Note | **What a line carries:** `database` is the database name, `s2-` followed by the base64url of the scope string (S3 decodes it to the scope's own words); the same name is in every request path, and under the one-database rule it names no account. The PostgreSQL messages repeat it and print a key's handle (a random UUID); the file messages print the key file's path (the authority directory, then SHA-256 of the name and of the assertion ID). No protected value or subject ID on either authority; key bytes only in F9's line. | scenario S3 on both authorities | If the scope string should stay out of logs, print a short hash of the name instead. |
| F7 | Note | **The builder's `b2.clj` does not show the pending removal completing after the deletion on the branch:** it resends r2 only when r1's key was not deleted (`r2-resent nil` on the branch). Scenario S1 and the stack show it (resend 200, intent gone, both keys gone, reads clean). | `b2-keys/b2.clj` 104 | Resend r2 in every run. |
| F8 | Note | **`erasedAt` is the first attempt's time.** A removal left pending longer than its grace loses its key at the first pass after its publication. The same on the base; the builder says so in `stack.sh`. Within the design: the grace bounds in-flight requests, and every request is refused while the removal is pending. | `erase.clj` 123, 217 | None needed. |

## 4. What was attacked without a break

**1. The builder's gate, rerun here** (`gate.sh`, base `1ed2650bd`, runtime image
`sha256:21a67288007d…` by ID, PostgreSQL `sha256:526f86d93c6e…`; times diagnostic):

| Authority | r2 stopped | r1's key outlived its grace: branch | base |
| --- | --- | --- | --- |
| file | none (control) | 22 ms | 40 ms |
| file | at its publication, held 30 s | 22 ms | 30,146 ms |
| file | before its native commit, held 30 s | 17 ms | 30,129 ms |
| PostgreSQL | none (control) | 63 ms | 49 ms |
| PostgreSQL | at its publication, held 30 s | 32 ms | 30,018 ms |
| PostgreSQL | before its native commit, held 30 s | 40 ms | 30,212 ms |

- `b2`: 12 checks, 0 failed on the branch; 2 failed on the base (both B2), on each authority. The builder's numbers
  (26 ms and 30,155 ms file; 52 ms and 30,237 ms PostgreSQL) reproduce to within the pass interval.
- `paired`: the native log digest, every reply, the reads and the key store after one pass are identical between
  the base and the branch, unsealed and sealed, with removals (651 and 696 datoms) and with every removal left out
  (647 and 697 datoms). "Byte-identical" holds after `paired.clj`'s normalisation (clock values, random IDs and
  ciphertext replaced by placeholders), not on raw bytes.
- `suites`: 78 tests, 71,220 passes, 0 failures, 1 error on both (the same `http-route` error).

**2. The schedule fuzzer** (`b2r/fuzz.clj`, section 6): the real removal log, key and pass code of the source under
test; the native commit modelled as a compare-and-set of the removal sequence. Two or three removals per schedule
(15% name the same subject twice); stops after the intent, after the native commit, at the publication, after the
entry record, after the head (file), or a re-made entry after a moved head; resends; a writer that lost its lock
between its check and its writes; passes on two gateways; gateway restarts; saves; log snapshots and restores
(records only, or records and keys, including pending-state copies); data snapshots and restores; the restore route;
a drain. Checked after every pass: I1 (every deleted key belongs to a published removal past its grace) and I2 (no
published removal's key outlives its grace plus one pass); and after every other step that no key disappeared.

| | file, branch | PostgreSQL, branch | file, base `1ed2650bd` |
| --- | --- | --- | --- |
| Schedules | 20,000 | 20,000 | 2,000 |
| Steps | 359,963 | 360,005 | 36,054 |
| Passes | 104,493 | 105,102 | 10,433 |
| Passes with a removal pending | 34,558 | 30,705 | 3,272 |
| Passes with a removal pending and a published removal past its grace (B2's state) | 9,201 | 7,722 | 896 |
| I1 checks (keys deleted) | 68,620 | 65,715 | 5,765 |
| I2 checks (keys due) | 166,548 | 161,794 | 14,941 |
| of which with a removal pending | 16,777 | 13,992 | 1,519 |
| Log restores / data restores / lost-lock writes | 6,273 / 4,196 / 2,214 | 6,175 / 4,050 / 2,284 | 644 / 423 / 230 |
| **Violations** | **0** | **0** | **1,259** (all I2 with a removal pending: B2) |
| Counted apart (section 3) | F1 93, F2 173, F3 10 + 2 | F1 78, F2 116 | F1 12, F2 24 |

- The base run is the check that the fuzzer can see B2: 1,259 kept keys, every one with a removal pending.
- A first file run on the branch reported 2 violations; both were F3's log that does not verify (the oracle then
  treated a head over a missing entry as published). The oracle now checks the chain itself; the run above is the
  rerun with the same seeds.

**3. Scenarios through the routes** (`b2r/scenarios.clj`; 42 checks each; branch and base, both authorities):

| Scenario | Branch (file, PostgreSQL) | Base (file, PostgreSQL) |
| --- | --- | --- |
| S1: r1 published, r2 stopped at its publication; a pass past r1's grace | r1's key deleted, r2's kept | **r1's key kept (B2)** |
| S1: requests while r2 is pending | read 503, save 503 (today's rule) | the same |
| S1: r2 resent by the client | 200, intent gone; reads 200 with no removed value and the kept value served; both keys gone after a pass | the same |
| S2b: data restored to a copy taken after r1 and before r2, r1's key already deleted, r2 pending | restore route 503 while pending; r2's resend 200 on the restored data; restore route then 200; reads clean; both keys gone | the same (r1's key still there before the resend) |
| S2a: data restored to a copy older than r1, r2 pending | stuck (F4) | stuck, identically |
| S3: forced failures at each new line | lines printed and counted; no protected value, subject ID or scope word; **on PostgreSQL the key-pool refill line prints a wrapped key (F9)** | no line (the base drops them) |

**4. The stack** (`b2r/stack.sh`, branch `4743df766`, file authority, write and read gateways, the runtime image
`sha256:21a67288007d…` by ID for the transactor and both gateways, PostgreSQL storage `sha256:526f86d93c6e…`;
prediction written before the run, 06:07 EST): every predicted line held.

| Step (EST, 2026-11-25) | Result |
| --- | --- |
| 06:33:57 read a1 before its removal | 200, carries a1's value |
| 06:33:58 a1 removed; c1's publication blocked | 200; c1 400 `GatewayError`, intent pending |
| 06:33:58 read and save of b1 while c1 pending | 503 `ErasureFrontierUnavailable` both |
| 06:39:19 a1's publication + 300 s grace + 20 s, c1 pending | **a1's key file gone**, c1's present |
| 06:39:19 c1 resent by the client | 200, intent gone |
| 06:39:22 3 s later | c1's key file gone (its grace counts from its first attempt) |
| 06:39:23 reads of a1 and c1 on both gateways, read of b1, b1's save resent | all 200, no removed value in any reply |
| failure counters and lines on both gateways | none |

**5. Read in code, no break:** every caller of `privacy/cut` (section 2), the key pool and its refill, `issue!`
(a key is never re-created for a removed assertion), `decode!`, `erase-keys!` on both authorities, the scope listing,
`authority_sql.clj` in full, `erase.clj` in full (the completion and restore routes use no key), the worker start
(`serve!` starts it before the first request, so a gateway started after a publication deletes on its first pass).

**6. TypeScript removal tests on the branch:** pass. `packages/datomic` (`erasure-write-ticket`, `predecessor`, `reach-erasure`, `protected-write`): 4 files, 22 passed, 2 skipped (the two `predecessor` integration cases, which need a live gateway: `DATOMIC_INTEGRATION=1`). `packages/host` `test/feed/feed.test.ts`: 13 passed. They need the core, host and datomic packages built first (without them 3 files fail on a missing `@triplex-build/triplex/runtime`). The branch changes no TypeScript. The host test (about 4 minutes of child processes) ran outside a heavy token.

## 5. Not tested

1. **A PostgreSQL authority on a stack.** The stack launcher has a PostgreSQL authority only in its erase1
   measurement mode, which replaces the gateway's main and fixes the grace at 0; with no grace the published removal's
   key goes within one pass whether or not another removal is pending, so the run could not tell the branch from the
   base. Covered in process instead (the gate, the fuzzer and the scenarios on PostgreSQL).
2. **A short grace on the stack.** The launcher passes no grace on the file authority; the stack ran with the
   default 300 s, as the builder's did.
3. **A real transactor restart, two gateways racing a real removal, and a lost PostgreSQL session on a stack.** The
   fuzzer models the native commit and the lost lock (a writer acting on a check it made before another writer's
   steps); it does not run Datomic. The builder's ERA2 line tested lost sessions on its own branch, not this one.
4. **A data restore from a real Datomic backup.** S2 uses two in-memory databases under one name. On PostgreSQL the
   older copy's values have their own key handles (each save takes keys from the pool), so S2's key counts there
   follow the handles the removal log names.
5. **Derived copies outside the gateway** (era5's M2 decoding a copy with a restored key): out of this fix.
6. **Times:** every time here is from the shared Mac VM and diagnostic only.

## 6. How to run, evidence

All under one ordinary heavy token each, `DOCKER_HOST` set to the lab VM's socket. Every container this review started
carries the label `tx2.holder=DX-B2R` except the stack's (`stack/up.sh` names them `tx2-dxb2r-s-*` and labels none) and
the builder's gate's (`tx2-dxb2-gate-*`, `tx2-dxb2-b2-*`, run with `--rm`, unlabelled).

| What | Command |
| --- | --- |
| The builder's gate (b2, paired, suites) | `B2_GATE_PHASES="b2" bash lab/experiments/EXP-DX1/b2-keys/gate.sh NEW_DIR 1ed2650bd`, then `B2_GATE_PHASES="paired suites"` |
| The schedule fuzzer | `bash lab/experiments/EXP-DX1/b2r/run.sh NEW_DIR worktree file\|pg fuzz.clj '(b2r-fuzz/main)' B2R_SCHEDULES=20000 B2R_SEED=1000000` (a commit in place of `worktree` runs that commit's gateway source) |
| The scenarios | `bash lab/experiments/EXP-DX1/b2r/run.sh NEW_DIR worktree file\|pg scenarios.clj '(b2r-scenarios/main)'` (add `B2R_SCENARIOS=S3` for one scenario; S3 fails on PostgreSQL until F9 is fixed) |
| The stack | `bash lab/experiments/EXP-DX1/b2r/stack.sh NEW_DIR BODIES_DIR HEAD` (bodies: era3's stack bodies `seed-a1.json`, `seed-c1.json`, `save-b1-0.json`) |
| TypeScript removal tests | `pnpm install --frozen-lockfile --store-dir <the shared store>`, build `@triplex-build/triplex`, `packages/host`, `packages/datomic`, then `npx vitest run` in `packages/datomic` (four files) and `packages/host` (`test/feed/feed.test.ts`) |

Evidence (outside the repository): `evidence/b2r/` in the project's private evidence folder, sealed as
`b2r-<head>.tar.gz`.
