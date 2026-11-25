# Preparation for the rented-server session at 1 billion records (SRV2)

Written 2026-11-25 from 17:53 EST by the session-preparation builder, branch `exp/DX-SRV2-session-prep` from the one
branch `origin/exp/DX-INT1` at `efee27905` (the three merges of the plan's E.1 had not landed when this was finished;
see section 7). The plan is `srv1/SESSION-PLAN.md` on `origin/exp/DX-SRV1-session-plan` (`702a5b44a`); its section E
is the task list. Nothing was rented and nothing ran on a server. Every time below is a Mac diagnostic; counts
(comparisons, differences, wrong values, refusals) are results. No default changed on the one branch.

## The answer in short

| # | Plan item (E.2 to E.4) | State on the Mac | Where |
| --- | --- | --- | --- |
| 1 | Per-read classification on the card: "P1 in memory" (100 ms) and "P1 not in memory" (300 ms) | SEE SECTION 1 | `v01/card-reader.ts`, `v01/adopted.ts`, `v01/adopted-card.ts`, `srv2/classify-gate.ts` |
| 2 | The pinned pair's arm variants for A1 | built; server-only path (dry run to the first offer is the server's first A1 minute); option parsing tested | `rd1/pinned-ladder.ts` `pairVariant`, `v01/study-server.ts` |
| 3 | The card accepting the read options and the product save path | built; the card dropped the read options before (fault, section 6) | `v01/run.ts`, `v01/adopted-server.ts` `checkReader` |
| 4 | Publish windows on an aged copy | SEE SECTION 3 | `srv2/session.sh a5` |
| 5 | Dry runs of the other runners | SEE SECTION 3 | `srv2/session.sh` |
| 6 | The second reader across machines | not possible on the Mac (never ran anywhere; accepted risk, costs only A9) | — |
| E.3 | Inputs | section 5 | — |
| E.4 | Guards | built and tested (section 4) | `srv2/session.sh`, `srv2/lib.sh`, `srv2/mac-alert.sh` |

## 1. Per-read classification

**Rule (the plan's section B).** An exchange is **in memory** when the reader's io-stats for that request (Datomic's
`with-io-stats` bound to the request thread in `trace.clj` `handler`, the prefetch pool's touches included) show no
storage read (`sql`, `dev`, `mem`, `ddb`, `cass` all 0; only object-cache hits); otherwise **not in memory**, with its
count of storage reads. Each read takes its exchange's class.

**What was built (lab TypeScript only; no gateway change, so no stored-function identity can move).**
- `DX_V01_SAMPLE_EVERY` (1, 2, 4, 8 or 16; only with `--reader tuned`): every n-th exchange of both P1 lines carries a
  read-profile header. The exchange hook tags the rows it returns with the profile id (`pinned-fields.ts`
  `exchangeTags`, `profiledExchange`); each read of a batch keeps the tag; the ladder and the random line keep
  `[profile id, client latency]` per sampled read.
- After the ladder, the reader's trace is read line by line (a 256-seat card with every exchange sampled writes
  hundreds of MB, past one string's limit) and each sampled read is classed (`card-reader.ts` `traceExchanges`,
  `classifyReads`). Per population: reads, exchanges, share, p50 and p99 from the client, permit wait and admitted
  work per exchange (the `gateway.admission-wait` and `gateway.admitted-work` spans), storage reads per subject, SQL ms
  per read, handler CPU. Reads missing from the trace are counted (`unmatched`); a server row with any is NOT JUDGED.
- The card prints two rows after P1: **P1 in memory** (the re-read line's in-memory reads at 256 seats; bar p99 ≤ 100
  ms) and **P1 not in memory** (the random line's not-in-memory reads; bar p99 ≤ 300 ms, aim 100), each with the other
  cell printed and not judged, and a table "Reads by where the subject is" per step. The random line also states the
  sampled storage reads against the reader's StorageGet count over the line (the difference is Datomic's read-ahead and
  other requests).
- Unset, nothing changes: no exchange is profiled on the ladder, the random line keeps one in sixteen, the card's
  files are as before (the existing card tests pass unchanged).

GATE RESULTS: SEE BELOW (filled from the runs).

## 2. The two read options and a proposal on defaults

**The options.** `TX2_PINNED_CUT_LOOKUP` (`group_cut.clj` `member-at`): resolve the pinned position among the
grouped-save positions on the current database and accept it only if it was asserted at or before the view's t,
instead of the lookup on Datomic's past view, which walks every grouped-save position asserted after the pin.
`TX2_PINNED_SHORTCUT` (`pinned.clj`): a subject whose revision is at or below the pin and none of whose current datoms
was asserted after the pin's t is read from the current database instead of the past view. Both default off on the
one branch; the card's tuned reader, the console toy and every tuned arm run both on.

**Toy cost (`srv2/read-cost.sh`, run 2; Mac diagnostic).** The shortcut gate's seed (10 accounts × 50 subjects), aged
by AGE1's code, then 300 s of grouped saves from 16 seats on accounts 5 to 9 only: 42,900 saves, 43,200 positions
after the seed cut. Four readers of the same database (off; cut lookup alone; both on; tuned = both on + early filter,
read profile, 3 permits). Field 0 of one subject per read:

| Reader | Old pin, unchanged subject, 1 seat p50 / p99 ms | Old pin, changed subject, p50 / p99 | Near the head, p50 | 16 seats at the old pin, reads/s (p99 ms) | Answered from the current database (unchanged / changed) |
| --- | --- | --- | --- | --- | --- |
| Both off | **4.86** / 16.38 | 5.79 / 14.59 | 1.20 | **1,408** (25.7) | — |
| Cut lookup alone | 1.30 / 5.15 | 2.93 / 12.48 | 2.00 | 4,669 (9.9) | — |
| Both on | 1.56 / 3.87 | 2.40 / 7.10 | 2.30 | 4,463 (10.4) | 269 of 300 / 0 of 300 |
| Tuned | 1.03 / 2.34 | 2.29 / 14.98 | 2.10 | 4,061 (11.8) | 269 of 300 / 0 of 300 |

With 43,200 grouped positions behind the pin the off reader pays about 3.6 ms per read (about 83 ns per position on
the Mac; the plan's 28 to 30 ms at about a million positions on the server is about 28 ns), and 16 seats lose 3.3×.
The 31 unchanged-account reads that went to the past view are subjects AGE1's aging edited after the seed cut. Run 1
(2 seats, 37,905 saves, saves on every subject) showed a smaller walk (off 1.50 ms against 1.20 both on), because two
seats made fewer grouped positions; every subject had changed, so the short-cut never answered (0 of 300), as designed.

**Exactness with them on (every gate below compares a reader with the options on against one with them off, or checks
every value against the seed).**

| Gate | Result |
| --- | --- |
| `rd1/shortcut-gate` (aged toy, every writer: ordered, resend, valid-time, general, import, grouped, append retirement, owner head and its fold, removal on request; readers off / both on / cut lookup / tuned; every pinned route at every position, both time axes, history and worlds) | **92,880 comparisons over 14,901,208 rows, 0 differences**; owner head on; the ladder refused a reader with the wrong options; image `sha256:0515ccd092a4…` |
| `srv2/read-cost.sh` runs 1 and 2 (5 pins × 500 subjects, field and whole rows, each reader against off) | 1,020 + 1,020 comparisons, 0 differences; 0 wrong values in 4,800 probe reads and 0 in the 16-seat loads |
| OTHER GATES | SEE BELOW |

**Proposal (for the independent review; nothing switched here).** Make both options the default on the one branch,
as one small reviewed change after the three merges of E.1 land, on these conditions.

- *What it changes.* Every pinned read (a read with a recorded position or a recorded time) on every read route of
  every gateway: the cut lookup replaces one Datomic lookup on the past view by one AVET seek on the current database
  plus a transaction check; the short-cut answers a subject unchanged since the pin from the current database (98% of
  the card's old-pin reads at 1 billion on 2026-11-23). Reads at the head, history reads, interiors and scans are not
  touched. No save, stored function or stored datom changes (both options are read-side; no stored-function identity
  can move, since `group_cut.clj` and `pinned.clj` are already loaded with the options off).
- *Why now.* With the options off a default reader repeats the flat 18 reads/s at any old pin (the plan's A.1); the
  card's tuned reader and the console already run both on, so the default today is the configuration nobody measures.
- *What could go wrong, in order of weight.*
  1. **The short-cut's rule sees assertions only.** `unchanged-since?` accepts a subject whose revision is at or below
     the pin and whose *current* datoms were all asserted at or before the pin. A writer that retracts a subject's datom
     after the pin without asserting anything on that subject in the same transaction (no revision bump) leaves the
     subject "unchanged" by this rule, and the short-cut would answer the pin without the retracted value. The shortcut
     gate's ten writer phases give 0 differences, but the rule depends on an invariant of the writers, not on the data,
     and this builder did not audit every retracting path. (Removal on request does not exercise it: `erase.clj` writes
     a privacy journal entry and retracts none of the subject's datoms; the value is masked at read time on both paths.) **Condition:** the
     review confirms it for every path that retracts on the final head (removal on request, retirement, settlement
     frames, the key-pool and ID-allocator fixes, the Publish line), and for the removal-per-account line before it
     merges. A cheap hardening, not built: also refuse the short-cut when the history index holds any datom of the
     subject with a transaction after the pin (one history seek per pinned read; to be measured first).
  2. **The cut lookup assumes grouped-save positions are unique and only ever asserted.** A writer that retracted or
     reused a grouped position would make the current-database lookup disagree with the past view. No writer does today
     (grouped saves only assert them); the shortcut gate's grouped phase and the cost toy's 42,900 grouped saves give 0
     differences.
  3. **Cost on changed subjects.** A subject changed after the pin pays the short-cut's check (its current datoms) and
     then the past view. The toy shows changed subjects no slower with both on (2.40 ms against 5.79 off at the old
     pin); at 1 billion 2% of old-pin reads took that path.
- *Gates that cover it, to rerun on the final head's own image with the default flipped:* `rd1/shortcut-gate` (every
  writer, every pinned route, every position, both time axes, owner head on and off), `srv2/read-cost.sh`, `rd5/gate.sh`
  (its off/on reader comparison), `api1/gate.sh`, the card's toy (`v01/mac.ts --fixture`, default reader: it would then
  run both on), the console proof (`demo/toy/gates.sh`), and on the server A1 (old pin, default reader) and A4.
- *Recommendation:* **on by default for both**, conditional on point 1's confirmation; if the review cannot confirm the
  retraction invariant, ship the cut lookup alone first (point 2's invariant is narrower: only the grouped writer
  writes those positions) and keep the short-cut on the tuned reader only.

## 3. Run scripts with dry runs

FILLED BELOW.

## 4. Guards

- **One settings file per machine** (`session.settings.example` names every key). The parser takes `KEY=plain-value`
  lines only, from a fixed list of keys; anything else (a `$`, a space, a quote, an unknown key) refuses before any
  step. Object storage credentials are not in it: `STORAGE_ENV` names a second private file read only by `stage` and
  passed only through the environment to `rclone` and `demo/server-up.sh`.
- **Spend from elapsed machine minutes.** `MACHINE_A_STARTED`/`_ENDED` and `MACHINE_B_STARTED`/`_ENDED` (epoch
  seconds from the provider, written by the orchestrator), `PRICE_PER_HOUR` 1.09 and `SPEND_BEFORE`; `session.sh spend`
  prints the estimate. Tested: 20 h of A and 5 h of B at 1.09 gives USD 27.25 with one machine running.
- **No new step past USD 46.** Before every step: spend so far + the step's high estimate (the plan's C.2 ceilings,
  charged at every running machine's price, which is stricter than the plan's wording) + 30 minutes of cleanup per
  running machine; over 46 the step refuses with exit 98. Tested at USD 44.87 so far: `check` (0 min) runs, `a4`
  (160 min) refuses with a forecast of USD 51.77.
- **Delete at USD 48.** At or past 48 every step refuses with exit 99 and writes `$OUT_ROOT/STOP-DELETE-NOW`; a
  watcher beside each running step checks every 60 s and stops the step's whole process group (`setsid` on the
  server) at 48. Tested at USD 48.47: `a1` stops before starting and writes the marker.
- **The delete is held by the last-run driver.** `session.sh finish` (A10, B10) makes one evidence archive per
  machine with its SHA-256 and `deletion-ready.json` listing the four remaining actions (copy and check on the Mac,
  delete through the provider, confirm 404, ledger row). **No script in `srv2/` can create or delete a machine**: none
  holds a provider credential or calls a provider; `grep` over the folder finds no provider endpoint.
- **Detached alert on the Mac** (`srv2/mac-alert.sh 'YYYY-MM-DD HH:MM' HOSTS_FILE`, started with `nohup … &`): from the
  deadline (forecast end plus 2 hours) every 15 minutes, a notification on the Mac's own notification centre while any
  listed machine answers on TCP 22; stops when none answers, or after 14 hours. The hosts file is private, outside the
  repository. Tested on the Mac with a local listener: it alerted every interval while the port answered and ended
  ("no rented machine answers; alert loop ends") within one interval of the listener stopping.

## 5. Inputs (what can be verified from the Mac without credentials, and what the orchestrator checks)

| Input | Verified here | Left for the orchestrator |
| --- | --- | --- |
| `aged-1b/cluster.tar.zst`, 145,378,109,239 bytes, SHA-256 `ea9a4b1d…` (pinned in `demo/server-up.sh`), with `aged-scorecard.json` (`faab1bc5…`) and the manifest files | the pins in the code match the ledger's figures | the bucket listing (needs the storage credentials, private) |
| SCALE1 metadata (`image.json` `77d66794…`, `transfer.json` `1fabec59…`, from `scale1/HANDOFF.md`) | **not fetched by `demo/server-up.sh`** (it fetches `aged-1b/` only): `session.sh stage` now fetches both from `fresh-a/` and checks both digests | that `fresh-a/image.json` and `transfer.json` are in the bucket (the ledger of 2026-11-23 says so) |
| Datomic Pro 1.0.7745 | the archive at the vendor's URL is 272,751,248 bytes, equal to `lab/config/datomic/verification.json`; its SHA-256 `60ac6bc5…` is checked after download by `t1/bare-metal.sh` on the server | — |
| Node 22.23.2 for Linux x64 | downloaded on the Mac: SHA-256 `d60acfe0…`, equal to the pin in `t1/bare-metal.sh` and in `srv2/bootstrap.sh`, and to the release manifest | — |
| Java 21 and 25 | the two base images are pinned by digest in `lab/config/datomic/runtime.mjs` (`eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830…`, `25.0.5_8-jre-noble@sha256:23481dc3…`); a wrong digest fails the pull | — |
| `AGE_JAVA`, `AGE_DATOMIC_HOME` | the aged check's fresh peer runs in a container from the reader's image (`age1/scorecard.mjs` `peerCommand`), so `AGE_JAVA` is that image's `/opt/java/openjdk/bin/java` and `AGE_DATOMIC_HOME` the directory `demo/server-up.sh` copies out of the image (`$DEMO_ROOT/datomic-home`); `stage` checks the jar is there | — |
| Disk per machine | `demo/server-up.sh --fetch` refuses under 520 GB free under `DEMO_ROOT` (archive 146, original 177, working copy 177, slack); `make_copy` refuses without the copy's size plus 20 GiB; `stage` refuses `SCRATCH` and `WAL_ROOT` on one device | the root NVMe of each machine (960 GB) holds the cluster, one working copy and the scratch copies one at a time; machine B also needs the backfilled copy (about 540 GB after the archive is deleted) |
| Credentials, addresses, the SSH key name | none in the repository | private settings and storage files on each machine |

## 6. Set-up faults found while preparing

FILLED BELOW.

## 7. Head, merges and what is not proven on the Mac

FILLED BELOW.
