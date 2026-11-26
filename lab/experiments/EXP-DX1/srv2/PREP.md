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

**Gate: `srv2/classify-gate.sh`** (the shortcut gate's container; seed of 10 accounts × 50 subjects, aged by AGE1's
code; an indexing job first, so the data is in stored segments; each phase restarts the reader on 8080 with the tuned
reader's switches and the read profile written to the output). Run 3, image `sha256:0515ccd092a4…`, evidence
`evidence/DX-SRV2/classify-3.tar.gz`:

| Check | Result |
| --- | --- |
| Forced cold case: reader restarted, one read before anything else touches it | 3 of 3 classed **not in memory**, with 13, 13 and 10 storage reads |
| Forced warm case: the same read again | 3 of 3 classed **in memory**, 0 storage reads |
| The card's random-line read (`pinnedWindow`, random subjects at the seed cut, batches of 8, every exchange sampled) on a freshly restarted reader | 6,376 reads in 1,595 exchanges, all sampled, **0 unmatched**, 0 wrong, 0 errors; 4 reads (the first exchange) not in memory with 1 storage read per subject, 6,372 in memory |
| The same window again (warm) | 6,896 reads, all sampled, 0 unmatched, 0 not in memory |
| Paired: every task subject at three pins with and without the profile header | **1,500 of 1,500 identical** |
| The store across the sampled reads | head 361 before and after; SHA-256 of every subject's full history equal (`462943fb…`) |

Runs 1 and 2 failed and found two faults, both fixed before run 3: on the toy no read ever fetched a segment (the
data was in the memory index; section 6 item 9), and a trace offset taken before a reader restart skipped the new
file's first records (section 6 item 8), which had hidden exactly the cold exchanges.

**Unit tests** (`v01/card-reader.test.ts`, 7 of 7): the option's values and refusals; the read options' parsing and
the reader-container check; the trace reader (hit, miss, unrelated request, metrics minute, torn last line); the rule
on batches; unmatched reads; the rows' verdicts (toy PARTIAL; server MET, MISSED, NOT JUDGED); the trace mark across a
restart. The rest of `v01/*.test.ts` and `rd1/*.test.ts`: 51 of 53, the two failures (`owner-groups.test.ts`,
`writer-split.test.ts`) fail the same way at the base `efee27905`.

**Not yet run: the toy card with the classification** (`v01/mac.ts --fixture` with `DX_V01_SAMPLE_EVERY=1`, the
re-read ladder's path in `adopted.ts`). Every exclusive Datomic slot of the lab engine was held all evening (s1 and s2
by DX-ACT8, s3 by DX-ACT6; two of the three owner processes are not running), and the toy card takes one. The command
is `session.sh a4 --dry-run` (section 3).

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

**One driver, `srv2/session.sh STEP --settings FILE [--dry-run]`**, with `srv2/lib.sh` (spend, copies),
`srv2/bootstrap.sh` (a fresh machine's first command), `srv2/dry-check.ts` (the Mac checks), `srv2/mac-alert.sh`. On
the server each step runs its page's commands exactly as written there (the plan's C.3, `v01/READINESS.md` "Next
server session" and its history at `1ed2650bd`, `rd5/UNCACHED-READ.md` §7–8, `api1/API-CALL-READS.md` §7,
`xq4/COMMIT-INDEX.md` S-1 to S-3, `xq10/QUESTIONS-CONNECTED.md` §8, `actv-lazy/act7/RUN2.md` §6), with `part()`,
`card_parts()` (one new copy per part, removed after), `rd5_arm()`, `pinned_variant()`, `demo_up()` and the ACT7
`prepare`/`held`/`discard` defined once. Every step writes `run-record.json` (step, machine, commit, the build's image
IDs from `BUILD-v0.1.json` or, in a dry run, the toy image's ID and the code that ran, the options, the settings
digest, spend at start and end, exit) into `$OUT_ROOT/<step>/`, where its evidence goes; a dry run writes the same
tree under `DRY_ROOT`. The Mac's dry runs use this builder's images: `tx2-dxthin-managed:a9bbcc8dafd49f05`
(`sha256:0515ccd092a4…`, the toy card's image, also used for the single-container gates) and
`tx2-dxthin-jre21:87be4fe3e64ddfd6` (`sha256:f29632f0bcdc…`, the engine's private build for `stack/up.sh` stacks).

DRY-RUN TABLE BELOW.

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

## 6. Set-up faults found while preparing (each would have cost server minutes or a wrong reading)

1. **The card dropped the read options.** `v01/run.ts` passes the arm an allowlist of variables; `DX_READ_PREFETCH`
   and `DX_READ_AHEAD_OFF` were not on it, so the plan's A4 (`EXTRA` with the read options) would have run without
   the prefetch and with read-ahead on, and nothing would have recorded it. Fixed: run.ts passes them and
   `DX_V01_SAMPLE_EVERY`, refuses a bad value before anything starts, the campaign input records them, and the reader
   check before the first offer asserts the reader's container carries `TX2_READ_PREFETCH=1` and
   `-Ddatomic.readAheadPool=0` exactly when asked (`reader-check.json` records what it saw).
2. **`make_copy` and `remove_copy` existed only as words.** Every page names them ("the copy steps the drivers already
   use"); no script defined them. Now `srv2/lib.sh`, gated in a Linux container (section 3).
3. **The SCALE1 metadata directory is not fetched by `demo/server-up.sh --fetch`** (it takes `aged-1b/` only), and every
   card, study and held command needs `--seed` with `image.json` and `transfer.json`. `stage` fetches them from
   `fresh-a/` and checks both digests.
4. **A fresh machine has no Node, and `v01/build.ts` needs Node to start.** `srv2/bootstrap.sh` installs the pinned
   Node 22.23.2 (digest checked) and checks out the commit.
5. **The A9 second reader needed a person at a prompt.** The page's sequence (start, wait for the other machine,
   stop, start again) is now three unattended actions: `session.sh a9 --action start0|switch|stop` on machine B.
6. **The toy card's reader wrote no trace**, so the classification could not be checked on the toy card; with
   `DX_V01_SAMPLE_EVERY` set the toy reader now writes the read profile under the card's output.
7. **The toy stack did not take the product save path's writer options** (S2's toy note); `v01/mac.ts` and
   `thin1/managed.ts` now pass `TX2_SUBJECT_WIDE`, `TX2_SUBJECT_HINTS`, `TX2_GENERAL_PREFETCH`, `DX_S3_OWNERS` and
   `DX_S4_CREATE` to the toy's writer and driver as `stack/up.sh` does on a server.
8. **A trace offset taken before a reader restart skips the new file's first records** (found by the classification
   gate; trace.clj sets the old file aside at the new process's first record). Fixed for the classification
   (`traceMark`). The same pattern exists, untouched, in the random line's `readerRecords` offset and P4's
   `gatewayTimes`; on a server the reader starts once per stage, so it bites only if the reader restarts mid-stage.
9. **On a toy nothing is ever "not in memory" unless an indexing job ran**: a new peer receives the memory index with
   the log, so the toy's reads fetch no segment. The classification gate requests an index first.
10. **Every Mac gate's default image is a shared tag that `gate-image.sh` refuses** (`tx2-datomic:1.0.7745-da00`);
    the dry runs pass this builder's own images by environment.
11. **Whether `demo/server-up.sh` accepts the backfilled copy (B6) is still not run**; from the code it checks only
    the handoff's digest and `PG_VERSION` before starting, and skips the head equality when the head moved, so it
    should accept it. The plan's fallback (start B6's stack with `stack/up.sh` as `xq1/server.ts verify` does) stands.

## 7. The first hour on the server, command by command (machine A; machine B the same without the card's dry run)

Before it, the orchestrator: check stock (the plan's E.5), rent two machines, private network, firewall TCP 22 only;
write each machine's order time into its settings file (`MACHINE_A_STARTED`, `MACHINE_B_STARTED`); start the Mac
alert (`nohup bash lab/experiments/EXP-DX1/srv2/mac-alert.sh '<forecast end + 2 h>' <private hosts file> >> <log> 2>&1 &`).
Predictions are the plan's D.1 unless stated.

| Minute | Command (as root on machine A) | Predicted | Wrong if |
| --- | --- | --- | --- |
| 0–2 | copy `srv2/bootstrap.sh` and the two private files (settings, storage) to the machine; `bash bootstrap.sh $COMMIT /var/tmp/srv2-src` | "bootstrap done: node v22.23.2, checkout … at <COMMIT>" in 1–2 min | any digest refusal (then stop: the release or the repository changed) |
| 2–3 | `cd /var/tmp/srv2-src && bash lab/experiments/EXP-DX1/srv2/session.sh check --settings /root/srv2.settings` | 17 page scripts present at COMMIT; spend about USD 0.05 | a missing script (the head is not the one the plan ran) |
| 3–13 | `… session.sh stage --settings /root/srv2.settings` part 1: `v01/build.ts` at COMMIT into `$BUILD` (bootstrap of Docker, images, packages) | 5–10 min (15 if Docker installs first) | over 20 min |
| 13–53 | `stage` part 2: `demo/server-up.sh --fetch` (download 145.4 GB, both digests, extract, tree check 1,642 files and 176,078,670,513 bytes, bring-up to DEMO READY head=28309866 records=1000251169), `server-down`, then the SCALE1 metadata and both digests | fetch 8–40 min, extract and tree 8–18 min, bring-up 3–12 min | the fetch over 60 min (then B copies to A over the private network, plan C.2 A0); any digest or tree difference (stop) |
| 53–65 | `stage` part 3 (machine A only): the card's dry run, part 1 with A4's full options (`DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 DX_READ_PREFETCH=1 DX_V01_SAMPLE_EVERY=1`, tuned reader, 12 permits, 300 s cells) on its own copy | copy 2–3 min; `DX-DRY-RUN first offer reached: scorecard arm 1 headline/zero`; `reader-check.json` shows prefetch true, read-ahead as A2 has not yet chosen (off = false), read profile true | any refusal before the first offer (read its line; fix; one retry on a new copy) |
| 65– | `… session.sh a1 --settings …` (A1: control, off-permits4, cut-only, one copy each), then `a2`, `a2b` with `READ_AHEAD_OFF` set from A2's result | the plan's D.2 and D.3 | the plan's D.8 items 1 to 3 |

Machine B in the same hour: bootstrap, check, stage (no card dry run), then `b1`. Each step's records:
`$OUT_ROOT/<step>/run-record.json`; `session.sh spend` at any time.
