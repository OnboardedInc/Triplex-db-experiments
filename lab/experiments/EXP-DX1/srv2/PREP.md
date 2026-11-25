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

**Proposal (for the independent review; not applied).** PROPOSAL TEXT BELOW.

## 3. Run scripts with dry runs

FILLED BELOW.

## 4. Guards

FILLED BELOW.

## 5. Inputs

FILLED BELOW.

## 6. Set-up faults found while preparing

FILLED BELOW.

## 7. Head, merges and what is not proven on the Mac

FILLED BELOW.
