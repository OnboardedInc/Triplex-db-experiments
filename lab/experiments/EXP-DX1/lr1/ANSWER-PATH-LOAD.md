# DX-LR1: the answer path's load race at first use

Branch `exp/DX-LR1-answer-path-load`, from the one branch's `65a851d1b`. No option; the fix is in force.

## 1. The fault

**What a caller saw:** a request the gateway refuses with a typed answer, sent at the same moment as another failing
request in a process that had not yet answered any failure, could be answered something else:
- 500 `GatewayError` (or 503 `OutcomeUnknown` on a path whose outer catch answers by the route's rule) instead of the
  typed refusal;
- when every lookup lost, Jetty's own HTML error page, titled with the exception's class and its message
  (`Attempting to call unbound fn: #'triplex.gateway.reply/message`). That message names a var, not data, but it is the
  kind of text `reply.clj` exists to keep out of answers.

Nothing was stored or lost by it: the request had already failed before its answer was built. A caller using the SDK
then looked the operation up and fenced it, so a refusal the SDK would have replayed (409 `CasConflict`) became a
visible failure.

**Where:** `main.clj` `route-handler-routed`'s catch calls `((requiring-resolve 'triplex.gateway.reply/message) e name)` and
`((requiring-resolve 'triplex.gateway.outcome/kind) e)`; the other catches call `reply/message` the same way. At
`65a851d1b`: lines 600-601, 507, 612, 616, 481 and 499. Added by the key-pool and reply fix (`39d1087c0`, reply) and the
save-line fixes (outcome); not present at `23b7df344`.

**The mechanism:**
1. `requiring-resolve` resolves first and requires only when that fails.
2. While a namespace loads, the compiler interns each `defn`'s var when it reads the form, compiles the body, then binds
   it.
3. So a second thread at the namespace's first use can find the var interned and unbound. It skips the require, calls
   the var, and throws `IllegalStateException` inside the catch that was building the answer.

**Reachable with every option off:** yes. Every database route's failure path runs it, whatever the options. It needs
two requests failing at once in a process where `reply.clj` or `outcome.clj` was never loaded.

**Found by:** the derived-copies builder's series, 4 violations in 657,579 oracles (seeds 830, 837, 931, 939); 830 and
837 passed on rerun.

## 2. The fix

- **`main.clj` `load-answer-path!`:** it loads `answer-path-namespaces`, and `serve!` calls it first, before the key-shred
  worker starts and before Jetty accepts a request. The namespaces are `reply`, `outcome`, `failures`, `account-claims`,
  `key-pool` and `import-bound`.
- **Why it moves no stored function:** it runs after every namespace `main` requires. A stored function's code is built
  when its own namespace loads, so every one is already built when the hook runs.
- **Why not elsewhere:**
  - requiring these namespaces from an early namespace (`privacy`, `storage`, `envelope`, `erase`, `subject_save`) moves
    the stored functions' generated names, as on 2026-11-25;
  - a lock around every lookup makes every answer pay for it;
  - catching the unbound call does not work, because the catch is the path that fails.

**account-claims, checked before it was added:**
- **What its load does:** two `defonce` hooks wrap `d/transact` (inside `installing` only) and the scope-open install
  functions.
- **When it loads today:** the first scope open (`create-scope!` → `account-claims/installing`), which is before any
  install. So every install already runs under its hooks.
- **With the account setting absent** (every option off): `install-transact` transacts exactly the transaction it is
  given, and `repair!` returns the database unchanged.
- **The stored code:** its own stored code (the setting guard) is identical whether it loads first or in the hook's
  order (the gate's `LR1_IDENTS` line).
- **The paired native log** (installs at every scope open) is identical to the one branch's.

## 3. Every lazy lookup at request or worker time (`git grep` on this source)

| Namespace | Called from | Loaded by `main`? | Covered |
| --- | --- | --- | --- |
| `reply` (`message` ×6, `hidden` ×2, `commit-message`) | main, storage, ha_observer, ha_shared | no | the hook |
| `outcome` (`kind`, `route-status`, `unknown`, `fence!`, `decided?`) | main, storage | no | the hook |
| `failures` (`note!` ×6) | envelope's key-shred worker, key_pool, reply | no | the hook (before the worker starts) |
| `account-claims` (`check-ids!` ×7 and 13 more) | main, storage, journal, feed, lean_feed, outcome | no | the hook (section 2) |
| `key-pool` (`provision!`, `take-key-refilled!`) | envelope | no | the hook |
| `import-bound` (`removal-families`, `bound!`, `read-set!`) | erase, storage, subject_create | no | the hook |
| `group/persisted-account` | account_claims, subject_owners | yes | safe: loaded before any request |
| `at-least/await!` | ids, cross_find | yes | safe |
| `subject-create/*` | erase, storage, privacy | yes (storage requires it) | safe |
| `stats/*` | main | yes | safe |
| `datomic.config/prefetch-enabled?` | native_settings | yes (Datomic's own) | safe |
| `layout-replay/run!` | replay_capture | no | not covered, safe: one call from the one replay-capture thread (`TRIPLEX_LAYOUT_REPLAY=1`, lab tooling), so no second thread at first use |

`ns-resolve` and `find-ns`; none loads a namespace:
- `commit.clj` 336-337: inside a stored function's code, guarded by `find-ns` and a catch of `Throwable`; `jfr` is loaded
  by `trace`, which `main` loads;
- `group_prepare.clj` 68: quoted stored code naming a lab namespace (nil when absent);
- `feed_live.clj` 26: `datomic.api`;
- `native_settings.clj` 18: `datomic.config`, looked up with `find-ns`;
- `native_counters.clj` 32: a Datomic namespace object already in hand.

The removal line adds its own namespaces (`removal-commit`, `removal-ack`, `removal-repair`). They are added to the hook
in a second commit once that line is on the one branch.

## 4. Tests (`lr1/race.clj`; each case in a fresh JVM; `b2-keys/gate.sh` phase `lr1`, a standing step)

| Case | Base `65a851d1b` | This branch |
| --- | --- | --- |
| `inventory`: lazily resolved namespaces after `main` (and after the hook) | 7 not loaded: account-claims, failures, import-bound, key-pool, layout-replay, outcome, reply | after the hook only layout-replay |
| `lost-once` (deterministic: the first lookup finds `reply/message` unbound, the load then completes): the second protection declaration, typed 409 `ProtectionPolicyMismatch` | **500 `GatewayError`** | 409 `ProtectionPolicyMismatch` (the state cannot arise: the namespace is loaded before any request) |
| `lost-always` (every lookup loses) through the handler and a real Jetty | the exception leaves the handler; **Jetty answers 500 `text/html` titled with the exception's text** | 409, `application/json`, no exception text |
| `hooked`: six failing requests on different routes | they load failures, outcome and reply while answering | they load no gateway namespace; every answer typed |
| `loop`: 200 rounds × 8 threads at first use (reply and outcome unloaded each round; with the hook run each round) | **2 of 1,600 answered 500 `GatewayError`** (the race, reproduced) | 1,600 of 1,600 typed 409 |

## 5. Gates on `cfae0bff9` (the fix; this page's commit changes only this page)

`b2-keys/gate.sh` with phases `paired lines lr1` against `65a851d1b`, then the removal branch's `era3/idents7.sh`; the
runtime image `sha256:21a67288…` by ID; 2026-11-26 01:49 to 01:57 EST. All passed.

| Gate | Result |
| --- | --- |
| Stored-function identities, `s3/idents.clj` (main loaded), every writer setting (11) | 70 of 70 equal in each, none new |
| The same taken after the answer-path namespaces load (`lr1/idents-hook.clj`: base by requiring them in the hook's order, this branch by the hook), 11 settings | 73 of 73 equal in each |
| account-claims loaded first (as a scope's first open loads it on the base) against loaded by the hook | its 3 keys equal |
| Paired native log, every option off, with removals and with none, unsealed and sealed | native log, replies and key store after a shred pass identical |
| The key-pool review's reply checks: `n1-keys/replies.clj`, `replies2.clj`, file and PostgreSQL | 9 and 15, 17 and 17 checks, 0 failed; lines 10, 0 failed |
| `lr1/race.clj`, every case on both | as section 4: the base breaks in every case that should break it, this branch holds in every case |
