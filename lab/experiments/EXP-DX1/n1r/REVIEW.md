# DX-N1R: review of the key-pool fix (N1) and the reply texts (N3) before they merge

Reviewed: `origin/exp/DX-N1-key-pool` at `94c63ad6b` (`c78185f5b` N1, `9a6c90ca0` N3 narrow, `94c63ad6b` N3 wide),
three commits on the one branch's head `8a362ac38`. Every option off. Mac only; every time below is diagnostic.

## Page 1

**Is there a break? No break in the key pool (N1); one gap in the reply rule (N3), low.** How sure: high for N1, high
for N3's routes.

- **N1 holds.** A gateway that restarted, or never served the declaration, now stores its first sealed save at once;
  a save of 300 or 600 protected values is stored; no key is issued twice, used by two values, deleted wrongly or left
  undeleted after its removal's grace. On a real stack with a real restart: 0 saves refused, and a value sealed with a
  key from the fill on demand was read on the other gateway, removed, and its key deleted.
- **N3 holds on every route.** With an `SQLException`, Datomic's `ExceptionInfo`, an `AssertionError`, a
  `StackOverflowError` or an `OutOfMemoryError` injected at every storage and authority call, no answer carried its message, SQL or key bytes; every typed refusal whose message is
  built carries only the caller's own field names, numbers or fixed texts.
- **The gap (F1):** the new last catch sits inside the trace wrapper, not around it. An exception raised by the trace
  wrapper itself reaches Jetty's own HTML error page, with its class and message. With tracing off (the default) the
  wrapper cannot throw, and nothing it does with tracing on carries a driver's or Datomic's text today, so nothing
  leaks now; but the branch claims "a last catch around the whole handler".

**Recommendation: merge `94c63ad6b` after one named fix, F1** (move the last catch outside `trace/handler`: one line in
`main.clj`), so that the claim holds whatever the trace level. F2 (a save that may be stored answers 400 and the SDK
takes it as final) was there before and is not this branch's; it is what `origin/exp/DX-S6-save-line-fixes`'
`outcome.clj` addresses, and merging S6 after this branch needs the hand resolution in F4.

**Counts** (all diagnostic, Mac only):

| Attack | Result |
| --- | --- |
| The builder's gate, every phase, this branch and `8a362ac38` | as claimed: N1 fixed (pool 5 of 5 on PostgreSQL, the base 4 of 5 failing); paired native logs and replies identical on both authorities; suites 86 tests, 71,244 passes, 1 error on both; scenarios 43 of 43; lines 10 of 10; replies 9 and 15 of 15 |
| Key-pool fuzzer on PostgreSQL | 20,000 schedules (500 databases, 50 unsealed): 62,703 saves stored, 8,014 concurrent steps, 5,929 restarts, 11,588 removals, 45,071 passes; 1,341,561 sealed values, 3,424,429 pool keys and 365,854 published keys checked: **0 violations** |
| Replies with `Error`s, the ID-list and sweep routes, the question reader's guard, real Jetty | every route: no message, SQL or hex in 5 walks of 39 requests on each authority; one leak through the trace wrapper (F1) |
| Stack by image ID, PostgreSQL key store, a real restart | prediction held: 0 saves refused after the restart or on the gateway that never declared; 300- and 100-value saves stored; the value sealed after the restart removed and its key row deleted |
| TypeScript, `packages/datomic` | 473 passed, 53 skipped, 0 failed |

**Not tested:** a killed PostgreSQL session or transactor during a save, two gateway processes filling at the same
moment, the HA mains.

## 1. What the branch carries

`git diff 8a362ac38...94c63ad6b -- packages/`: `key_pool.clj` and `reply.clj` (new); `envelope.clj` (`provision!` and
`take-key!` call the key pool); `storage.clj` (`EnvelopeKeyPoolEmpty` kept as a typed 503; the refusal's text from
`reply/commit-message`, Datomic's exception kept as the cause); `main.clj` (the routes' catches answer
`reply/message`; a last catch of any `Throwable` around the whole handler); `canonical.clj`, `ha_observer.clj`,
`ha_shared.clj`, `uncached.clj` (no exception text in a reply or the admin counters). Lab: `n1-keys/` (`pool.clj`,
`replies.clj`, `run.sh`, `stack.sh`), the gate's `n1` phase and a `replies` part of its `lines` phase, and
`stack/up.sh`'s new `DX_ERASURE_SQL=1` switch (the PostgreSQL authority on an ordinary toy stack).

## 2. Read from the code

**N1, the fill on demand** (`key_pool/take-key-refilled!`).

1. **No key is issued or used twice.** A fill is `envelope/refill!`: under the pool's own lock, 256 random UUID
   handles, one authority transaction (`authority-sql/issue!`, all or nothing), then added to the pool; a take is
   `ConcurrentLinkedQueue.poll`. The worker's refill, a save's fill and the declaration's fill share that lock. Two
   gateways have separate pools of separate handles.
2. **A key is committed before a save can use it.** The fill commits before `poll`; inside the privacy guard it runs on
   the guard's own PostgreSQL session (a transaction on that session leaves the session's advisory lock in place).
3. **A save of more protected values than the pool holds takes several fills**, each committed on its own before the
   save's transaction; if the save is then refused, the keys it took seal nothing and stay in the authority (orphans,
   as every refused sealed save left before this branch; nothing deletes them). The keys still in the pool stay usable.
4. **Only sealed databases fill.** `take-key!` is called only by `seal!`, which `protect` calls only when the cut says
   sealed. The fill does not depend on the policy.
5. **A fill cannot meet a key deletion.** The pass deletes only handles named in published removals; a fill's handles
   are new.

**N3, the reply texts** (`reply.clj`).

6. **A typed refusal** (an `ExceptionInfo` with a string `:code`) keeps its message; only the gateway throws those. I
   read every one whose message is built: the ID-list and sweep refusals (the caller's own field names, operation,
   type family, attribute), `at_least` and `ids` (positions and milliseconds), `import_bound` (numbers), `lean` and
   `lean_query` (fixed route names and reasons), `owner_layout` (a map of booleans), `canonical` (a typed refusal's own
   fixed text), the question reader (fixed). None carries a stored value, another exception's text or SQL.
7. **Anything else** answers `"The gateway could not complete the request"` and goes to `failures/note!` (`reply`,
   scrubbed, one line a minute per kind). Datomic's refusals in `storage/commit!` answer a fixed text per code.
8. **Codes and statuses** are unchanged except: the declaration's refused fill (400 `GatewayError` to 503
   `EnvelopeKeyPoolEmpty`), a save that finds the pool empty and cannot fill it (400 `TransactionRejected` to 503
   `EnvelopeKeyPoolEmpty`), and an `Error` thrown by a route (Jetty's HTML 500 page to a JSON 500 `GatewayError`).

## 3. Findings

No break of the five kinds in the brief. One finding concerns this branch's own claim (F1, low, a one-line fix);
F2 is a defect that was there before and stays; F3 to F7 are notes.

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | Low, this branch's claim | **The new last catch is not around the whole handler.** It wraps `route-handler`, inside `trace/handler`. An exception raised by the trace wrapper itself reaches Jetty's own error page, which prints the exception's class and message in the page title (and the page is HTML, not the JSON answer). With tracing off (the default, `TRIPLEX_TRACE_LEVEL=off`) the wrapper only parses a header and cannot throw; with tracing on, nothing the wrapper does today carries a driver's or Datomic's text. | `n1r/replies2.clj` J2: `trace/attribute!` throwing the injected message (marker, SQL statement, 64-character hex) answered Jetty's HTML 500 page with all of it, on both authorities | Put the catch outside: `(defn handler [r] (try (trace/handler route-handler r) (catch Throwable t (response 500 ...))))`, or give Jetty an error handler that prints nothing. |
| F2 | Medium, before this branch, unchanged | **A save that may have been stored can still answer 400, and the SDK takes a 4xx save answer as final.** `storage/commit!`'s generic catch answers 400 `TransactionRejected` for any failure it does not recognise, including one after the transaction was handed to Datomic; a route's catch answers 400 `GatewayError` for a driver failure, including one after the commit (for example the guard's unlock on a session that died). `DatomicStorageAdapter.ts` 720-745: any 4xx but `OperationDuplicate` becomes `WriteError("Datomic transaction was rejected")` (or a serialization conflict), with no receipt lookup. This branch changes only these answers' texts. | `storage.clj` 629-647, `main.clj` 437-440 and 517-519; the fuzzer's injected "transacted, then an exception" save: 4,027 saves transacted (stored) and then failing in the gateway answered 400 `TransactionRejected`; 45 saves sent while the PostgreSQL authority was gone answered 400 `GatewayError` | `origin/exp/DX-S6-save-line-fixes`' `outcome.clj` (after the submit, a failure that is not a decided refusal answers 503 `OutcomeUnknown`, and the SDK looks the operation up) covers the save path; a driver failure after the commit needs the same. |
| F3 | Note | **`EnvelopeKeyPoolEmpty` (503) is not retried by the SDK as a refusal:** for any 5xx the adapter polls the operation's receipt until its deadline and then reports `TransactionOutcomeUnknown`, though this 503 is raised before the transaction (nothing is stored). | `DatomicStorageAdapter.ts` 748-786 | Treat a typed 503 raised before the submit (`EnvelopeKeyPoolEmpty`, `WriteQueueFull`) as "not stored, retry". |
| F4 | Note, merge order | **Merging `origin/exp/DX-S6-save-line-fixes` (`cdfc70e02`) after this branch conflicts in three places** (`main.clj` the two route catches, `storage.clj` the commit refusal; `git merge-tree`). The rules do not contradict each other: S6 chooses the status and code (400 decided, 503 `OutcomeUnknown`), this branch the text. S6's "exact message" rule (`outcome.clj` `decided?`) reads the whole cause chain, and this branch keeps Datomic's exception as the cause, so it still decides. Whoever merges must keep `EnvelopeKeyPoolEmpty` in the rethrow list (else an empty pool answers 400 again) and `reply/message` for the text. `origin/exp/DX-ERA2-removal-per-account` matches only codes across the gateway boundary (`after-refusal`) and already calls `reply/message`. No SDK or lab code matches a reply's message text, except `s2/gate.ts` 271 (`"Request too large"`, a typed refusal, unchanged). | `git merge-tree 94c63ad6b cdfc70e02` | Merge S6 with the resolution above. |
| F5 | Note | **Orphan keys.** Keys a save took and then could not use (the save refused, or the gateway restarted with keys in its pool, or a fill committed while the gateway saw an error) stay in the authority, seal nothing and are never deleted. Not new; a larger save now takes more. | fuzzer: 2,145,585 at the ends of 500 databases (about 4,300 each) | None needed for correctness; a sweep could delete keys no value names after a quiet period. |
| F6 | Note | **An `Error` thrown by a route** now answers a JSON 500 `GatewayError` where it answered Jetty's HTML 500 page: a third change of code, not in the claim's list (a better one). | `replies2.clj` E1-E3, J1 | None. |
| F7 | Note | **The failure log's limiter** (place, database, code, SQL state, class) now also keeps one entry per database for place `reply`; never removed (the B2 re-check's N3). | `failures.clj` | As before. |

## 4. What was attacked without a break

**1. The builder's gate** (`b2-keys/gate.sh`, every phase, this branch against `8a362ac38`; runtime image
`sha256:21a67288007d…`, PostgreSQL `sha256:526f86d93c6e…`, by ID):

| Phase | This branch | `8a362ac38` |
| --- | --- | --- |
| `b2` (file, PostgreSQL) | 16 of 16 checks each | 16 of 16 each |
| `paired` (file): native log, replies, key store, with and without removals, unsealed and sealed | identical | |
| `n1` paired on PostgreSQL | native log and replies identical, with and without removals | |
| `n1` pool (R0 to R3) | 5 of 5 on each authority | file 5 of 5; **PostgreSQL 4 of 5 fail** (N1) |
| `suites` | 86 tests, 71,244 passes, 1 error | the same |
| `scenarios` (S1, S2a, S2b, S3) | 43 of 43 on each authority | |
| `lines` (F5, F9; the builder's replies D and W1-W3) | 10 of 10; replies 9 of 9 (file), 15 of 15 (PostgreSQL) | |

**2. The key-pool fuzzer** (`n1r/pool-fuzz.clj`, PostgreSQL authority, through the routes): 20,000 schedules in four runs of 5,000 (seeds 100,000 to 400,000), 1,590 s diagnostic; 500 databases (450
sealed, 50 unsealed), two gateways each.

| What happened | Count |
| --- | --- |
| Saves stored (1 to 3 values mostly; 10 and 100; 255, 256, 257, 300 and 600 one save in twenty) | 62,703 |
| Saves refused 503 `EnvelopeKeyPoolEmpty` while every key insert was refused (plain, refused and unknown kinds) | 965 + 92 + 72 |
| Saves refused by the transaction after taking their keys (Datomic's conflict injected): 409 `TransactionRejected` | 4,940 |
| Saves transacted, then an exception to the gateway: **400 `TransactionRejected`** (F2) | 4,027 |
| Concurrent steps (2 to 4 saves at once, the worker's pass, half the time a removal and a pass) | 8,014 |
| Gateway restarts / removals published / passes | 5,929 / 11,588 / 45,071 |
| Faults: key inserts refused / key deletes refused / a key batch committed while the gateway saw an error | 4,047 / 2,994 / 2,904 steps (423 such batches) |

| Check | Checked | Violations |
| --- | --- | --- |
| K1 every handle inserted once | every batch the gateway sent | 0 |
| K2 no handle seals two values | 1,341,561 sealed values | 0 |
| K3 every kept value's key in the authority (and at each database's end, all of them) | 1,341,561 | 0 |
| K4 every deleted key a published removal's | every deletion, at every later step of its database | 0 |
| K5 no published removal's key after a pass with no fault | 365,854 | 0 |
| K6 every pooled key in the authority, sealing nothing, not deleted | 3,424,429 | 0 |
| K7 stored values read back as saved (6 per schedule) | 106,840 reads | 0 |
| An unsealed database holds no key | 50 databases | 0 |

- **Orphan keys (F5):** 2,145,585 at the databases' ends, about 4,300 per database: the pools dropped by 5,929
  restarts, the keys of the 9,071 refused or unknown-outcome saves, and the 423 batches committed while the gateway
  saw an error.
- **A first run of the same 20,000 lost its PostgreSQL part way through** (every connection closed, 53 databases
  abandoned, no invariant violated; most likely the default 1 GB write-ahead log on a 512 MB tmpfs, the log was not
  kept); the runs above are with the log capped and the database's log kept. In that first run the saves sent while
  the authority was gone answered 400 `GatewayError` (45), another instance of F2.

**3. Replies the builder's walk left out** (`n1r/replies2.clj`, both authorities): `AssertionError`,
`StackOverflowError` and `OutOfMemoryError` holding a marker, an SQL statement and a 64-character hex run, injected at
every storage and authority call, on the 39 requests of the builder's walk: 34 answered 500 `GatewayError` with the fixed
text, none carried the marker, the statement or the hex run (body or headers). The same `SQLException` with the ID-list
and sweep routes on (their own catches reached): 33 answered 400 and 1 503, the fixed text, no leak. The question
reader's guard throwing: 39 answered 500, the fixed text. Through a real Jetty: an `Error` from a route answered the
fixed JSON 500. **One leak, F1:** an exception raised by the trace wrapper itself.

**4. Read in code** (section 2): every catch the diff touches; every typed refusal whose message is built
(`privacy/failure!`, `codec/invalid`, `lean`, `lean_query`, `at_least`, `ids`, `sweep`, `import_bound`,
`owner_layout`, `canonical`, the question reader); every place that still reads an exception's text (`erase`,
`group`, `storage`, `subject_save`, `jfr`: matching or a file, never a reply); the admin counters (`uncached`'s last
failure is now a class name); the SDK's handling of each status and code (`DatomicClient.ts`,
`DatomicStorageAdapter.ts`); message matching in `packages/`, the lab gates, `origin/exp/DX-S6-save-line-fixes`
`cdfc70e02` (`outcome.clj`) and `origin/exp/DX-ERA2-removal-per-account` `c4dc117b0` (`after-refusal`).

**5. A stack by image ID with the PostgreSQL key store and a real restart** (`n1r/stack.sh`: the builder's
`n1-keys/stack.sh` plus step S6; transactor and both gateways `sha256:21a67288007d…`, PostgreSQL `sha256:526f86d93c6e…`;
prediction written before the run, 10:47 EST). Every predicted line held:

| Step (EST) | Result |
| --- | --- |
| S0 a save on the gateway that served the declaration | 200 |
| S1 saves on the read gateway, which never served the declaration | stored at the first, 0 refused (353 ms) |
| S2 the write gateway restarted for real (`docker restart`, healthy after 15.1 s), then saves on it | stored at the first, 0 refused (158 ms) |
| S3 one save of 300 protected values, three times | 200, 200, 200 |
| S4 four saves of 100 protected values back to back | 200 × 4 |
| S5 a database declared on the read gateway, its first save on the write gateway | 200 |
| end: the control value read on the read gateway | read |
| S6 (11:12) the value stored right after the restart (its key from the fill on demand): read on the read gateway, removed on request, 3 s later | read; removal 200; key rows 3,584 to 3,583 (its key deleted); the value no longer answered |

**6. TypeScript:** `packages/datomic` `vitest run` on this branch (core, datomic, host, testkit, qualification and w0
built): 73 files passed, 17 skipped; 473 tests passed, 53 skipped, 0 failed. The branch changes no TypeScript.

**7. Option off, unchanged apart from the texts** (check 5): the paired native logs and replies (status and code) are
identical on both authorities. What else changes with every option off: a refused request that is not typed now also
writes a scrubbed failure line (place `reply` or `transaction-rejected`, one a minute per kind) and counts it in
`/v2/admin/scan-stats` `:removalFailures`; `uncached`'s `lastFailure` counter is a class name; an `Error` answers JSON.

## 5. Not tested

1. **A real transactor failure or a lost PostgreSQL session during a save.** The fuzzer injects a Datomic refusal and
   an exception after the transaction (in `d/transact-async`), and refused key inserts and deletes (database triggers),
   and a key batch committed while the gateway sees an error; not a killed session or transactor.
2. **Two gateway processes filling at once.** The fuzzer runs two gateways' pools in one process (concurrent saves,
   the worker's refill and a removal run truly at once only within one gateway); the stack has two real gateways but
   their saves were sequential. Separate gateways draw separate random handles from separate batches.
3. **The HA mains** (`ha_observer`, `ha_shared`) were read, not run.
4. **Jetty's own refusals before the handler** (a malformed request line, a header too large): Jetty answers them
   with its own text, which holds nothing of the gateway's.
5. **Times:** every time here is from the shared Mac VM and diagnostic only.

## 6. How to run, evidence

All under one ordinary heavy token each, `DOCKER_HOST` set to the lab VM's socket. Containers carry the label
`tx2.holder=DX-N1R` (this review's runner, and the builder's runner with `N1_HOLDER=DX-N1R`) or `tx2.holder=DX-B2R` (the
gate's `scenarios` phase calls `b2r/run.sh`); the stack's containers are named `tx2-dxn1rs-*` (the launcher labels none).

| What | Command |
| --- | --- |
| The gate | `N1_HOLDER=DX-N1R B2_GATE_PHASES="b2 paired suites" bash lab/experiments/EXP-DX1/b2-keys/gate.sh NEW_DIR 8a362ac38`, then `B2_GATE_PHASES="scenarios lines n1"` |
| The key-pool fuzzer | `bash lab/experiments/EXP-DX1/n1r/run.sh NEW_DIR worktree pg pool-fuzz.clj '(n1r-pool-fuzz/main)' N1R_SCHEDULES=5000 N1R_SEED=100000 TRIPLEX_ERASURE_SHRED_GRACE_MS=0` |
| The reply attacks | `bash lab/experiments/EXP-DX1/n1r/run.sh NEW_DIR worktree file\|pg replies2.clj '(n1r-replies2/main)'` (J2 fails until F1 is fixed) |
| The stack | `bash lab/experiments/EXP-DX1/n1r/stack.sh NEW_DIR BODIES_DIR HEAD` (bodies: `n1-keys/pool.clj` with `N1_MODE=bodies`) |

Evidence (outside the repository): `evidence/n1r-<head>.tar.gz` in the project's private evidence folder.
