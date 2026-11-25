# Version 0.1 readiness

Rewritten on 2026-11-23 (night) by the integration builder from the measurements of that day, after the evening's
merges onto `exp/DX-INT1`; updated on 2026-11-24 after the seven merges of that day (ACT4, JRN1, CARD2, RD4, W3, W4,
S1; no server ran on 2026-11-24, so no measured number below is new): the card's new judging rules applied to the 2026-11-23 numbers where the evidence allows, today's
options in "Proposed defaults", one cause withdrawn (fault 22), and the section "Next server session"; updated again on
2026-11-24 (afternoon) after four more merges (ACT5 settlement beside live saves, XQ3 ID lists, RD5 uncached pinned
reads, XQ6 the exact sweep; Mac toy evidence only): their options in "Proposed defaults", the section "What the 2026-11-24 afternoon merges
put on the branch" with every gate on the final head and the contradictions found, and "Next server session" rewritten
in the owner's order of 2026-11-24 with costs; and again that evening after three more (XQ7 the question reader,
ACT7 settlement at 1 billion, HA2 failover recovery time): their rows in the merge and defaults tables, their gates, and
steps 2b, 8, 10a to 10c, 17 and 18 of the session list; and on 2026-11-25 (morning) after the evening merge (ACT6 release limits, SCALE2 many accounts, S4 with S2, S3 and IMP2, RPT1 the reporting copy; the B2 key-deletion fix, pushed alone first; then XQ10 questions connected): step 0 (the stored-function identities, below) first, the faults the independent reviews reported, the options table, the merges, their gates with the image each ran, and "Next server session" rewritten with four totals. One row per
priority: the bar, the latest measured value at 1 billion records and on the
fresh database (430 million records, ten deep accounts of 100,000 subjects), the settings it was measured with, the
verdict and the next step. Mac clocks are never used here; every number below is from a rented bare-metal server
(12 cores, 96 GB, two NVMe drives). Bars are from `lab/TARGETS.md` on `main`; the owner's rulings from `lab/V0.1.md`.
The earlier merge-trial tables of this page are in its history (`git show 61a794c1d:lab/experiments/EXP-DX1/v01/READINESS.md`).

**The 1 billion database:** AGE1's sealed cut, t 62,888,918, head 28,309,866, 1,000,251,169 records. Its 28.2 million
aged saves fall on 2,000 subjects per account (about 1,400 saves each); every other subject is a seed subject.
**Tapes:** "Saturday's tape" sends nearly every save to a subject not seen before; the "production-shaped tape"
follows the production write study (39 / 69 / 82% of saves within 10 s / 60 s / 5 min of the same subject's previous
save) in two commit shapes: R, one commit per form row, and S, one commit per subject's save.
**Profiles:** `server` = transactor 3 cores, 24 GiB heap, 16 GiB object cache; one read-gateway core with a 1.5 GiB
cache. `server-32` = the same with a 48 GiB Java 25 ZGC heap and a 32 GiB object cache. **Credits:** "whole-turn" is
barrier 6 (the default); "per-save" is rolling 6.

## Step 0 of the 2026-11-25 merge: did the afternoon merge move stored functions? Yes; restored

**Answer: yes.** With every option off, `1ed2650bd` (the afternoon merge) installed different code for 17 of the 58
stored-function identities and code hashes that `23b7df344` installed, in every one of 8 writer settings (base,
server, server with the wide writer, with both hint options, serial retirement, owner head, the question routes on,
the read prefetch on). The 17 are the commit function (`:triplex/commit`, its code, stamp and operation code and
source hash), the per-subject writer (`:triplex.subject/v-…`), the owner-head function, the general-writer hint
function and the packed journal's encoder. The function bodies say the same thing; only generated names inside them
differ (the counter behind `#(...)` parameters and auto-gensyms).

**Why: two causes, each enough alone to move all 17.** Both compile before `commit.clj`, so every generated name in
the stored code after them is numbered differently:

1. RD5's `lean.clj` change (a `require` of `uncached` and an inline prefetch call) and `uncached` placed early in
   `main.clj`'s requires. This is the hazard the connection builder named.
2. **Not named by anyone before:** XQ6's `admission.clj` change (`execute-admitted` with its own trace spans, and an
   `and` in `execute`). The connection builder's base (`2ef4cb3c4`) already carried it, so its "58 of 58 equal the
   base" is against a base that had already moved; against `23b7df344` the XQ10 line also differs.

Fixing only the first left all 17 moved (to other values); fixing only the second left all 17 moved; both fixed: 58
of 58 equal.

**What it meant for an existing database.** `commit/install-base!` compares the scope's stored `commit-fn-hash`
with its own and, when they differ, transacts a new `:triplex/commit` at scope open; the per-subject writer's function
is installed under its new ident when the subject option is on. So a gateway of `1ed2650bd` opening a database that a
gateway of `23b7df344` wrote would have written new function versions at its first open (one commit per scope, moving
the database's head), with every option off. Whether that would have happened to the sealed 1 billion database
depends on which build's hash it stores (its loader ran on 2026-11-22; not checked on the Mac). A paired-log gate
between `23b7df344` and `1ed2650bd` would not compare equal: XQ4's G8 log (33,609 datoms, head 620) differed in
exactly 6 datoms, the function installs (commit function and hash, write variant ident and code, per-subject ident and
code); every data datom was equal. No gate of the afternoon merge compared stored logs between heads, so none saw it.

**Fix, in the connection builder's late-hook form** (`371d30c90`): `lean.clj` is `23b7df344`'s plus one hook var and
one call through it (XQ10's form); `uncached.clj`, now loaded last by `main.clj`, fills the hook only with
`TX2_READ_PREFETCH=1`; `admission.clj` keeps `23b7df344`'s `execute` body unchanged inside one `if` (no macro), and
`*own-pool*` now holds a function that `sweep.clj` binds (the sweep's admitted-work span moved into `sweep.clj`).

**The merges of this round moved them twice more, both restored the same way before any gate ran:**
- The save line (S4, via S2's planner edit in `subject_save.clj`): one clause fewer in an `and` moved the owner-head
  and general-hint functions (the 5 values the S4 builder reported; installed only with their options on). A neutral
  `true` keeps three clauses (`8b44422f7`). The 8 new keys are S3's and S4's own functions, installed only with their
  options on.
- The reporting copy (RPT1): `privacy.clj` compiles before `commit.clj`; its new omitting function and a third clause
  of an `or` moved all 17 again with every option off. The function moved to `omit_protected.clj`, loaded late, which
  fills `privacy/omit-hook` (`04c1dc4d0`).

**Proof on the head carrying this page:** on `9f2a4c431` (image `dccde0ba`) 58 of 58 identities equal `23b7df344`'s in
all 8 writer settings, with every option off; the 12 new keys are S3's, S4's and XQ10's own functions, installed only with
their options on. The key fix alone (`212853708`) moved nothing (58 of 58 equal to `1ed2650bd`); batch 1 with it
(`8a362ac38`) 58 of 58. The paired stored log (G8) equals `23b7df344`'s; IMP2's option-off digest is identical to
`23b7df344`'s and differs from `1ed2650bd`'s. Tools: `int5/idents.sh` (S3's and XQ10's method, by image
ID) and `int5/compare-idents.py`; evidence `DX-INT5/idents/`.

## Faults on the one branch (independent reviews, reported 2026-11-25; R3, R1 and R8 fixed here, the rest open)

| # | Fault | Severity | Where | Options | Being fixed on |
| --- | --- | --- | --- | --- | --- |
| R1 | **A save that is stored can be reported as failed.** If the transactor stops between applying a save and acknowledging it, the gateway answers `400 TransactionRejected`; the SDK treats 400 as final, so the caller is told the save failed while it is stored. This contradicts the store's lost-acknowledgement requirement (save review F1) | high | gateway `storage.clj` 627 to 645; SDK `DatomicStorageAdapter.ts` 658 to 684 | **every writer, every option off** | **fixed here** by the save-line fixes (`cdfc70e02`, F1): after the hand-over an unrecognised failure answers `503 OutcomeUnknown`, the SDK looks the operation up and fences it; outcome gate below |
| R2 | **Two accounts publishing with the same command ID collide**: command IDs for joined commands are looked up across the whole database, so the second gets the first's receipt and nothing is written for it (Publish review F1). **More than one publishing account in one database is NOT safe until this is fixed, unless every command ID contains the account** (the lab's callers do: the miniature's `scale2:<run>:<account>:…`, ACT5's `<attempt>:act5:<account index>:…`; checked for every several-account gate below) | high | `actv-lazy/join/account.ts` near 562 | on today through the settlement-live merge's per-account names | the Publish builder's branch |
| R3 | **One pending removal stopped the deletion of every published removal's key** (a key outlived its grace by 30 s; shown in process by `era2/b2.clj` on the removal branch). **Fixed on this branch** by `exp/DX-B2-key-deletion` `46a8f746a` (merged with its review's tests `801ef756a`; pushed alone first as `212853708`). Under today's rule a pending removal still makes every request answer 503 until the client resends; that is unchanged by this fix and is an open decision for the owner | was high | removal path (`envelope.clj`, `failures.clj`) | every option off | **fixed here**; standing gate `b2-keys/gate.sh` (below) |
| R4 | With `TX2_RELEASE_DOCS=ref` the definitions command ID is the same in every account: a second account storing the same definitions is refused and can never publish by reference while its current release matches another account's (Publish review F2) | high | release-limits line | `TX2_RELEASE_DOCS=ref` only | the Publish builder's branch |
| R5 | A release needing more than 10 ledger parts is acknowledged, and then its notices, and every later release's notices in that account, are never recorded (Publish review F3) | medium | release-limits line | `TX2_NOTICE_LEDGER=parts` only | the Publish builder's branch |
| R6 | Under `TX2_SETTLE_PRECONDITION=progress` a frame can commit after a pause is durable (0 under the head rule, 1 to 5 under progress) (Publish review F4) | medium | settlement queue | `TX2_SETTLE_PRECONDITION=progress` | the Publish builder's branch |
| R7 | The import commit bound can be passed by a frame built to estimate low and cost high (a 1-fact frame with a very large read set held the writer 85 to 174 ms on the toy) (save review F2) | medium | IMP2's bound | `TX2_IMPORT_COMMIT_US` | **bounded here behind an option** by the save-line fixes (F2): lookups are priced in the estimate; with `TX2_READ_SET_BOUND=1` (default off) every class refuses a repeated name or a read set of more than 4,096 names |
| R8 | The card's identity check passes a wide-writer run in which no eligible save took the per-subject writer (save review F5): every session arm below that claims a share of saves on the per-subject writer reads it from the gateway's own counters (`saveRoutes`, the writer's route counts), never from the check passing | medium | `v01/adopted.ts` | card | **fixed here** by the save-line fixes (F5): the card fails a run in which no eligible save took the per-subject writer |
| R9 | Gate runs on the Publish review's branch stopped once on one save of the gate's own save tape with "assertion ID already in the database's history", every option off. **The third Publish review names the cause (U1, `act10/REVIEW-3.md` at `f596d1267`):** a save's ordered identity takes a block of 256 assertion IDs from the same monotonic ID factory as the SDK's other IDs; in the same millisecond an ID inside the block can equal one of the save's, the transactor refuses whichever commits second ("TRIPLEX_IDENTITY f/id"), nothing wrong is stored, and the refused save's resend keeps its IDs and is refused again (about 1 expected collision per gate run). **In this round:** one save of tape M with creation off was rejected once in 4 runs ("Datomic transaction was rejected", attempt `25775093-1020-4a21-97cf-e17a81563654`, image `c33d0c3fe083` built by the gate from `526ae9a6d`, removed; one deterministic tape, so no seed). **Consistent with U1, not confirmed:** the SDK gives that message for every refusal code except the conflicts it replays, the transactor's log file went with the gate's container, and the gate's log has no identity line. The gate now records the gateway's code (`356608926`); three reruns passed. Evidence `DX-INT5/gates/b-production-m0-t1/` | high (U1) | SDK ID allocation (`orderedSaveIdentity.ts`, `packages/core` ID factory) | every option off, more often with ordered saves | `exp/DX-U1-id-allocator` (the Publish builder; after its review) |

### Faults found in merged code on 2026-11-25 and their fixes

| Fault (in the one branch before the fix) | Fixed by | Commit on the one branch | Gate that now guards it |
| --- | --- | --- | --- |
| One pending removal stopped the deletion of every published removal's key (R3) | `exp/DX-B2-key-deletion` `46a8f746a` | `59e10e754` (pushed alone, `212853708`) | `b2-keys/gate.sh` (b2, scenarios, fuzz, lines; paired against the previous head), standing on every head |
| A stored save answered as refused when the transactor stops after applying it (R1, save review F1), and the command path settling on another account's transaction | `exp/DX-S6-save-line-fixes` `cdfc70e02` | `dc0bd5696` | `s6/final.sh` gates (the outcome gate in five writer settings), the SDK's fault stack, the fuzzer with faults |
| Every batched read refused (this merge's own: step 0 against API1's `batch.clj`) | this merge | `ee9d5da5a` | API1's `api1/gate.sh` gate phase |
| With the PostgreSQL key store, sealed saves refused after a gateway restart and a save of more than 256 protected values refused for good; a refused protection declaration answering with the driver's statement, wrapped keys included | `exp/DX-N1-key-pool` `09730f887` | the next push | its key gate with the n1 and reply phases on both key stores (planned with that push) |
| Two assertion IDs collide in the product's save path with ordered saves on: a save's identity block and a later SDK ID in the same millisecond (U1, the third Publish review); one rejected save of tape M here was consistent with it | `exp/DX-U1-id-allocator` `cc5656aa2` | the push after | the review's A1 to A5, the builder's I1 to I4, an adapter-level block check, tape M four times (planned with that push) |

The save review's F6 (the 5 differing stored-code values pinned to S2's `subject_save.clj` edit, none installed with
options off) is the second item of step 0, restored here. Four independent reviews found that a rule chosen per
process or held outside the data breaks at the seam: nothing merged here turns such an option on, and every option
below is default off.

**R1 in this round's gates.** The one gate here that stops the transactor under saves (RPT1's, on the head's image) saw 6 saves refused before commit ("Transactor not available") and resent, and no 400 on a stored save. That does not show R1 is absent: its window (after the apply, before the acknowledgement) is narrow and no gate here aims at it.

## The nine priorities

| Priority and bar | 1 billion records | Fresh (430 million) | Settings | Verdict | Next step |
| --- | --- | --- | --- | --- | --- |
| **P1 Pinned reads.** At 256 readers: 0 wrong reads; goodput not below the 64-reader level; read p99 ≤ 100 ms; writer commit p99 ≤ 1.25× its zero-reader value. At 1,024: goodput ≥ 0.9 of the 256 level. | **Default reader:** 18 to 20 reads/s at every ladder step at the old pin (87,002), 256 seats p99 13,566 ms; 0 wrong values. **Both pinned options, one core:** 478.80 reads/s at 256 seats (p50 516 ms), 0 wrong. **Tuned reader with shape S saves running, re-read subjects:** old pin 8,879 reads/s, p99 **99.33 ms**; near the head 8,960 reads/s, p99 112.13 ms. **Random subjects, with saves:** 1,216.6 reads/s, p99 323.58 ms (3 permits); 1,585.8, 266.24 ms (6); 1,747.2, 258.05 ms (12). S commit p99 beside readers 52.48 to 64.77 ms against 55.55 alone (up to 1.17×). 1,024 seats (no saves): 1,482 reads/s near the head against 12,375.9 at 256 (collapse). 0 wrong values in every window. | Fresh card (2026-11-21, default reader): 893.2 reads/s at 256 seats, p99 860.16 ms; 1,560.8/s at 64; 509.4/s and p99 2,375.68 ms at 1,024. | Card: `server`, one read core, options off. Tuned arm (`rd1/PINNED-1B.md`): `server`, three read cores, 3 GiB read cache, 3 / 6 / 12 read permits, both pinned options, batches of up to 8 subjects, early filter, 256 seats, 90 s windows, shape S at 23 commits/s. | **Not met.** Met only for re-read subjects at the old pin with saves (99.33 ms); near the head 12 ms over; random subjects 2.6× over; the 1,024-seat stress level collapses. | Owner decision: must the bar hold for subjects not in the reader's memory in 0.1? The model (not refuted) needs about 3,600 reads/s, about 7 reader cores with permits about twice the cores, so a reader machine; no affordable cache holds the working set (0.7 to 1.1 TB). Make the pinned options and the tuned reader defaults (below). The 1,024 collapse is the 3 GiB cache thrashing (1.43 to 1.78 loads per subject). **Next server session step 3:** the full card with `--reader tuned --read-permits 12` (CARD2), which now judges re-read and random subjects on separate rows; forecast re-read L256 8,000 to 11,000/s, p99 75 to 115 ms (even odds), random 1,350 to 1,800/s, p99 250 to 340 ms (missed). **Steps 11 and 16** (RD5, merged on 2026-11-24 afternoon): where an uncached subject's 1.7 ms goes, the read prefetch, read-ahead off and a second reader on its own machine. |
| **P2 Commits.** p50 ≤ 10 ms and p99 ≤ 50 ms with P1's 256 readers running; the pull at the returned position sees the commit; duplicates and lost replies return the original receipt. | **Production-S card** (90 s cells, every commit durable, 0 expired, every field read back exactly): shape S commits p50 / p99 14.91 / 66.56 ms at 50 rows/s, 11.65 / 43.01 at 235, 10.69 / 45.31 at 394, 12.10 / 48.64 at 620; all loaded saves including the quiet account 5.66 / 57.6, 8.96 / 40.96, 9.34 / 44.03, 11.39 / 46.59 ms. Out of card, 300 s at 394: S second-half p99 40.6 ms; R 430 ms (32 GiB) and 713 ms (16 GiB). **With 256 readers:** S commit p50 / p99 7.46 / 52.48 ms (old pin) and 8.06 / 64.77 (near the head). **Saturday's tape:** 394 stored at 394 offered with p99 11,010 ms (`server-32`, per-save); 249.41/s with 5,523 expired (`server`, whole-turn). | Production tape, 300 s at 394: S 23.06 commits/s, p99 42.0 ms whole, 41.5 ms second half, save completion 42.8 ms; R 393.13 rows/s, 157 ms second half, completion 237 ms. Fresh card (Saturday's tape): reference tape p50 / p99 5.57 / 24.58 ms alone, 5.60 / 22.53 ms with readers; 342.90/s stored at 394. | Card: `--tape production-S --profile server-32 --credit-mode rolling6 --window-seconds 90` (build `090c189a8`, renderer `6c4f9e4fe`). Out of card: REAL2 runner, rolling 6, 300 s. With readers: the tuned reader arm above, `server`. | **Not judged in steady state; forecast met** (card rule of 2026-11-24, CARD2: P2 is judged on the second half of cells of 300 s or more; the card's cells were 90 s). Its halves, all loaded saves, second / first half p50 / p99: 5.54 / 57.6 and 5.73 / 57.3 ms at 50/s; 7.94 / 46.1 and 10.11 / 37.6 at 235; 10.11 / 53.0 and 8.96 / 31.2 at 394; 10.56 / 48.1 and 12.29 / 46.6 at 620 (in 90 s cells the second half is not yet steady). **Forecast** for 300 s cells on the no-burst tape (CARD-READER.md section 7): second-half p50 7 to 10 ms at 50/s and 7 to 9 ms at 235 to 620, p99 30 to 50 ms, met at all four loads with about 55% confidence (the 50/s p99 is the risk). Basis: REAL2's 300 s run at 394 on this database, p50 by minute 10.81 / 6.32 / 7.91 / 8.21 / 8.04 ms, whole window 7.99, second-half p99 40.6 ms; 43 to 51% of a 90 s cell's commits read storage cold (the 2026-11-24 analysis). One commit per row (R) and Saturday's tape stay far outside. With 256 readers the 90 s windows gave p99 52 to 65 ms (not steady state either). Receipts and read-back: exact in every cell. | One commit per subject's save is the product's save shape (owner, 2026-11-24). **Next server session step 3** judges P2 on it (300 s cells, no-burst tape); step 4 measures the wide writer, steps 6 and 12 the writers' hints (W3, W4), step 5 the cost by save size. |
| **P3 Ordered feed.** 0 gaps and 0 order violations per subject; resume replays exactly; lag p99 ≤ 250 ms with 256 readers. | Production-S card: 1,260 ordered exact changes. **Lag at P1's 256 readers p99 30.6 ms** (card rule of 2026-11-24: judged at the 256-reader step; by step 48.6 / 35.6 / 34.6 / 41.0 / 30.6 ms at 1 / 4 / 16 / 64 / 256 readers; 700.4 ms at the 1,024-reader stress step; whole tape 288.8 ms as first reported). On this loader-built database the SDK refuses the feed from before the aged head (the loader's non-canonical journal rows) unless the compatibility option is on. | Fresh card: 1,260 exact ordered changes with readers, lag p99 98.30 ms (whole tape). | Card as P2 (one read core); steps re-rendered from the same campaign with CARD2's code (`evidence/DX-CARD2/prodS-card-rerendered-SCORECARD.md.gz`). | **Lag clause met at 1 billion** (30.6 ms at the bar's 256 readers) and on fresh; 0 gaps and 0 order violations at both sizes. **Resume after a crash not measured on a server**, so the priority is met on every clause measured, not yet on all. The 1,024-reader stress step (700.4 ms) is outside the bar; its likely cause, parked pinned reads holding the read gateway's 512 web threads, was reproduced at toy size (W3). | Resume after a crash on a server; **next server session step 14** (the waiting-read bound at the 1,024 step, forecast lag p99 under 250 ms there). Journal routes now have an opt-in bound and cursor (JRN1, below). The loader must write canonical journal rows before it is used again (the SDK refuses its rows below the sealed head). |
| **P4 Current pulls.** Single-client p50 ≤ 5 ms, p99 ≤ 25 ms; ≥ 1,100 pulls/s per core; flat as history grows. | p50 / p99 4.35 / 44.54 ms (production-S card); 4.42 / 46.59 (`server-32` card, Saturday's tape); 4.22 / 47.10, max 33,179 ms (`server` card). | 4.54 / 50.18 ms (fresh card). | Card pulls beside the card's save loads, one read core. | **Not judged in steady state; forecast met.** By the card rule of 2026-11-24 (CARD2), P4 starts after the reader's backlog drains; last night's pulls ran beside the abandoned 1,024-reader reads and the one-core reader's collector pauses (paused 8 to 9% of the pull window in stops of 18 to 142 ms; the p99 predicted from the pauses, 45 / 42 / 48 ms, matches the cards). p50 met. **Forecast** with the tuned reader (three cores, three collector threads, 3 GiB cache in a 9 GiB heap) after the drain: p99 12 to 25 ms (the card builder gives it about even odds). Throughput per core and flatness with depth not measured. | **Next server session step 3** judges it; measure depths 1, 3 and 10. |
| **P5 Publish.** Per account of 100,000 subjects, under one second to the permanent record and every read returning the new answers; live read and commit p99 ≤ 1.5× without Publish. | Not run. | **100,000 subjects** (ACT3 runner `f5f8c09ff`): small release 100 of 100 Publishes inside 1 s in 11 windows, first correct answer p50 31.6 to 45.3 ms, p99 50.9 to 421.4 ms; large release (20 forms, 20 policies) 120 of 120 inside 1 s, p50 32.1 to 67.3, p99 55.2 to 322.8 ms. Live saves at 39.4/s during Publish: p99 1.7 to 2.3× the control (small release); at 3.5 and 23.5/s at or under 1.1×. First release settled in the background: values 14.5 min, notices 19.2 min (no bar). A large release's background settlement cannot finish (frames exceed the writer's bound). | `server`, whole-turn and per-save credits, live saves at 3.5, 23.5 and 39.4/s, two Publishes per window. | **Under one second: met** at 100,000 on fresh. **Live traffic: not met** as measured at 39.4 saves/s; read from the same evidence on 2026-11-24 (ACT4, `actv-lazy/SETTLEMENT-FRAMES.md` section 8), the p99 is set by one to three whole-store stalls per 100 s window that occur in the control windows too (3 of 14 at an index adoption, 7 of 14 8 to 18 s before one; timing only): outside the stall seconds the Publish windows' save p99 is 0.76 and 1.07 times the control with per-save credits, 1.54 and 2.02 times with whole-turn credits. Not measured at 1 billion. | Built on 2026-11-24, default off: settlement frames sized by bytes (H11.6, ACT4) and "at least" reads for receipt holders (H11.4, RD4; owner decision on making it the product's promise). **Next server session steps 9 and 15.** Judge the live ratio over windows holding the same number of index jobs, or outside stall seconds; run at 1 billion. **Step 8** (ACT5): settlement beside live saves, which the head rule made impossible at size. |
| **P6 Quiet account.** Commit, pinned-read and feed p99 loaded / alone ≤ 1.25, or loaded commit p99 ≤ 50 ms; 0 wrong reads; no expiries. | Production-S card: quiet commit p99 alone → loaded 18.94 → 12.16, 14.34 → 20.74, 13.70 → 17.54, 32.26 → 21.25 ms at 50 / 235 / 394 / 620; 0 wrong; 315 commits per side (the card requires 500). Saturday's tape, `server-32` per-save: loaded 43.52, 57.09, 34.81, 47.62 ms. Quiet pinned reads with the one-core reader missed about two thirds of their offers (0 wrong). Beside 256 tuned readers: 22 to 35 ms; 52.22 and 59.13 ms in the random quiet-stream window (6 and 12 permits). | Production tape: quiet p99 22 ms (R) and 24.0 ms (S). Saturday's tape, rolling 6: 43.91 / 54.00 / 61.79 ms at 235 / 394 / 620. | As P2. | **Commit clause met** on the production-shaped tape at every load at 1 billion (card line PARTIAL: 315 commits per side against 500). Not met on Saturday's tape at 235 at 1 billion or at 394 and 620 fresh. Read and feed ratios not measured. | Cells long enough for 500 commits per side (the card now takes `--window-seconds` up to 600; 150 s gives 525 per side, 300 s 1,050); quiet reads with the tuned reader; the 52 to 59 ms window was the first window after the stack started (100% of the quiet saves read storage; replicated three times), which the card now labels. **Next server session step 3.** |
| **P7 Cost follows activity.** ≤ 64 B per never-touched subject outside PostgreSQL; idle scope cost per role; cold first read p99 ≤ 100 ms. | First pull p99 86.0 ms. Added resident bytes per roster subject 53.0 B transactor, 375.0 B write gateway, 267.8 B read gateway (production-S card). | First pull p99 66.56 ms; 16.9 / 55.4 / 70.3 B (fresh card). | Card restore-to-empty footprint, not a population slope. | **Cold read met** at both sizes. **Bytes per subject not met** as measured (about 700 B at 1 billion, 143 B fresh), and the measure is a boot-to-boot footprint, not the bar's slope. | Two matched population rungs at fixed activity. |
| **P8 Import beside live traffic.** Other accounts' read and commit p99 ≤ 1.5× baseline; ≥ 3,000 facts/s. | Card paced import 3,266 facts/s with save p99 19.98 ms and read p99 6.27 ms (production-S card); 3,250 facts/s (`server` card). Ratio not measured at 1 billion. | Live-first import, 48 GiB heap, 32 GiB cache, memory index 512m: 3,671 facts/s (3,454 second half), busy p99 36.4 ms = 3.05× its 12.9 ms baseline, quiet 32.5 ms, worst read ratio 1.46×. With the 256m index: 3,321 facts/s, 45.1 ms (4.6×). 16 GiB / 24 GiB heap: 3,059 facts/s, 103.7 ms. | `load1/fair-server.sh --import-policy yield`, 32-fact frames, rolling 6. | **Rate met; ratio not met** (3.05×). Busy p99 is inside 50 ms, so an absolute 50 ms clause (asked of the owner) would be met. | Owner decision on the 50 ms clause for busy accounts; the deep (16 million facts) and wide (4.5 million subjects) imports are not measured. |
| **P9 Machine loss and moves.** 0 acknowledged saves lost; saves resume ≤ 60 s; pinned reads continue; a planned move pauses one account ≤ 30 s. | Not run. | Two machines, 235 saves/s: **policy B** 0 of 2,830 lost, first protected save after 603.4 s (local copy 131 s, SHA-256 452 s), reads continued (first 16.5 ms, longest gap 47 ms, 0 of 30,172 missed). **Policy A** 0 of 4,885 lost, 19.5 s. **Planned move** 0 of 4,146 lost, 14.1 s. | HASYNC1 pair `b03e806fd`, direct WAL path, autovacuum off. | **Policy B (version 0.1):** zero loss and reads met; 60 s not met, accepted by the owner. Planned move met. | Skip the re-hash of an already verified seed (about 2.5 min instead of 603 s); fix the second-failure check (it reads the fenced disk through the killed transactor on port 4334); policy C for 1.0. |

Sources: `lab/experiments/EXP-DX1/STATUS.md` on `lane/d-native`, entries of 2026-11-23; the result pages now on this
branch: `scale1/V01-AGED.md`, `V01-AGED-S32.md`, `V01-AGED-PROD-S.md`, `RD2-PROBE.md`, `OWNER-HEAD-1B.md`,
`bm1/PUBLISH100K-READING.md`, `STARTUP-AGED-READING.md`, `OWNER-HEAD-READING.md`, `PRODUCTION-TAPE-READING.md`,
`AGED-CACHE-READING.md`, `FAILOVER-READING.md`, `IMPORT-YIELD-READING.md`, `rd1/PINNED-1B.md`,
`actv-lazy/LARGE-RELEASE.md`, `actv-lazy/PUBLISH-STOP.md`. Added on 2026-11-24 (Mac work and readings of the same
evidence, no new server number): `v01/CARD-READER.md`, `actv-lazy/SETTLEMENT-FRAMES.md`, `jrn1/JOURNAL-BOUNDS.md`,
`rd4/AT-LEAST.md`, `w3/GENERAL-WRITER-HINTS.md`, and the private analysis `research/2026-11-24-undiagnosed-misses/`.

## Launch faults found on servers on 2026-11-23

Faults 1 to 15 were recorded in part 15 of [V0.1-STATE](../int1/V0.1-STATE.md#launch-faults-found-on-servers-on-2026-11-23)
before 16:00; they are repeated here in short with the evening's faults after them.

| # | What faulted | Where | Fixed |
| --- | --- | --- | --- |
| 1 | The 1 billion seal's readback could not connect (a restore does not copy the transactor's location row) | `age1/server.mjs measure-loaded` | AGE1 `bb9ec7324` (`resume-readback`) |
| 2 | The resume crashed after writing the seal (`.trim()` on null) | `age1/resume-host.mjs` line 20 | `4e64e0d97` |
| 3 | The 32 GiB cache arm at 1 billion refused the aging loader's journal position rows | `prep1/ceiling-seed.ts` | PREP1 `1bbaf54cd` |
| 4 | The start-up read's copy of the same check | `jvm1/startup-aged.ts` | JVM1 `968285954`, `8805f75c9` |
| 5 | The scorecard's fresh-peer aged check could not resolve the transactor's container name | `age1/scorecard.mjs` via `v01/adopted-server.ts` | `71cfed6cb` |
| 6 | A refused scorecard part consumed its campaign directory | `v01/sequential.ts` | `71cfed6cb` |
| 7 | Card part 2 refused at the residency listing (`docker top`, Docker 29.1.3) | `thin1/native-metrics.ts` | On the branch (the change of `92f8e6c30`); the card's pin predated it |
| 8 | Failover case 1: the staged seed kept mode 0400 on `global/pg_control` | the second machine's staging | Environment; the driver |
| 9 | Failover case 2: the standby started about 21 GB behind and could not catch up through the tunnel | `hasync1/pair.ts` line 337 | HASYNC1 `b03e806fd` |
| 10 | The start-up read runner and the import path had no first-offer hook; `startup-server.sh` dropped the dry-run variables | `jvm1/startup-server.ts`, `.sh`; `load1/fair-campaign.ts` | `b620c565e`, `c01b20c69` (the driver's runs used JVM1 `968285954`, which predates them) |
| 11 | The collector asserted the fresh head 87,002 after the aged cache arm's windows | `prep1/server-collect.py` line 281 | REAL2 (`seed_head`); test `607c46e8b` |
| 12 | The production launch refused at the prepared-copy allowlist with nothing printed | `stack/up.sh` | REAL2 `4ee421c87` |
| 13 | Shape S refused at its first commit of more than 256 assertions | `packages/datomic/src/orderedSaveIdentity.ts` line 47 | REAL2 `092a76916`, `32ca969bb` (the general identity for such a commit) |
| 14 | The owner-head pair at 1 billion needed a logical dump that does not exist | `v01/study-server.ts` | `1f4dad810` |
| 15 | The pinned probe's 12 GiB reader-cache pass refused at peer start | `rd1/pinned-probe-server.sh` | Not fixed (a probe setting no launcher uses) |
| 16 | Owner-head pair on fresh: the summary refused other event kinds in the lookups file | `w1/serial/summarize.py` line 149 | W1 `3cf8e4843` |
| 17 | Owner-head pair: the read sampler took a new cut after reading, so a save of the same subject in between failed a correct store (14 errors, windows unjudged) | `w1/migrated-reads.ts` | W1 `3cf8e4843` (pins at the saved position; 0 errors in both later pairs) |
| 18 | Owner-head pair at 1 billion: the summary required the reference function in the owner-head arm | `w1/serial/summarize.py` line 125 | W1 `6cae9ba1b` (the server run of the fresh pair met it too; both summarised on the Mac) |
| 19 | Production-S card assembly: rows whose due time rounds to the cell's end | `v01/windows.ts` line 16 | CARD1 `d79d3686c`, `8663ff19e`, `6c4f9e4fe`; exact re-assembly on the server matched |
| 20 | Publish at 100,000, per-save window: a probe answered at a basis before an acknowledged Publish (the read gateway's peer trails the write gateway) | `actv-lazy/join/held-campaign.ts` line 417 | Runner: ACT3 `766ff8167`, `9848a7a7f`, `cb282d6b2` (recorded as a visibility failure, later windows run). Store: not changed (owner decision) |
| 21 | Console proof at 1 billion: the first release on an empty store could not reference `Subject` | `examples/demo-mcp` releases | CON1 `333db33db` |
| 22 | Console journal on the 1 billion copy: a journal page walked the position index for minutes under the single journal permit. **Cause withdrawn on 2026-11-24:** the statement that the loader's 28 million position rows never pass the feed's filter and cause the walk is unconfirmed; on a loader-aged toy all 1,200 of the loader's saves passed the filter and came back as journals, and the walk reproduced only over position entries that yield no journal (`jrn1/JOURNAL-BOUNDS.md`). Which entries the 1 billion copy's walk went over is unknown until the JRN1 probe runs (next server session step 2) | gateway `journal.clj` `page`, `entity-positions` | Console side: CON1 `fff5ba67a`, `a7083cb4e`. Gateway: opt-in bound and cursor, default off (JRN1 `e4c0a3771`, merged `2a10a7703`) |
| 23 | Pinned arm with saves: `savesWindows` used before initialization | `v01/study-server.ts:305` | RD1 `e02bf4edf` (`v01/saves-arm.ts`, a Mac harness, a dry run into the window driver) |
| 24 | Random arm: two configurations under one parent shared `ladders/` | `rd1/prepared.ts:85` | `a1d2473f8` (the document; the refusal names the cause) |
| 25 | Failover second-failure check read the fenced disk through the transactor the first fault had killed | `hasync1` old-disk check | Not fixed |
| 26 | The aged cache arm's collector was patched by hand on the server | `prep1/server-collect.py` | Already in the repository (fault 11) |
| 27 | Shape R cannot be assembled on the production tape (rows scheduled up to 67 ms past each cell's end) | `w1/field/production.ts` | Not fixed (changing the tape changes REAL2's measured R tapes; H11.9) |

## Proposed defaults (for the owner; nothing is switched on this branch)

| Option | Default now | Proposed | Evidence | What changes if adopted |
| --- | --- | --- | --- | --- |
| Launch profile `server-32` | `server` | `server-32` | 430 million, Saturday's tape, three runs: 394.00 and 620.00/s with no expiries (16 GiB: 394 with seconds-long p99, 438 to 486/s at 620). 1 billion, Saturday's tape: 331.03/s at 394 whole-turn, 394.00 per-save (16 GiB: 249.41). 1 billion production R at 394: p99 430 against 713 ms. Import: busy p99 45.1 against 103.7 ms, no allocation stalls. | One line in `jvm1/launch.mjs`. Not combinable with the tuned reader today (4 GiB over the role caps; proposal 57 GiB transactor container and 8 GiB reader). Re-run both cards. |
| Credits | whole-turn (barrier 6) | per-save (rolling 6) | `server-32` card at 1 billion: +19% stored at 394 (394.00 against 331.03), +27% at 620 (302.61 against 238.61), quiet loaded p99 halved or better in every cell. | Re-run both cards. |
| Pinned read options `TX2_PINNED_CUT_LOOKUP`, `TX2_PINNED_SHORTCUT` | off | on | 1 billion, old pin, one core: 19.37 → 467.92 reads/s at one seat, 20.20 → 478.80 at 256; 0 wrong values in 12 steps; toy: 14,176 comparisons over 10,653,258 rows, 0 differences, owner head on and off. | Every read route; re-run P1 and the console proof. |
| Tuned reader (three cores, 3 GiB cache, batches of up to 8, early filter) and read permits | one core, 1.5 GiB, 3 permits when tuned | tuned, 6 or 12 permits | 256 seats, re-read subjects: 8,879 to 12,375.9 reads/s, p99 72 to 112 ms. Random subjects with saves: 3 → 6 → 12 permits gives 1,216.6 → 1,585.8 → 1,747.2 reads/s, p99 323.58 → 266.24 → 258.05 ms; S commit p99 beside them 55.81 → 55.55 → 62.98 ms. | Core plan (all 12 cores are assigned today); 12 permits costs the saves 7 ms at p99. |
| One-time start-up read | off | on | 1 billion, Saturday's tape, restart at 394/s: save p99 in the first 30 s 7.26 s → 0.385 s; stop to admission 22.2 → 41.8 s (bar 60 s); 394.0 stored in both arms. Limit: it helps only subjects saved just before the restart (production study: about 39% of saves in the five minutes after a restart with a two-minute tail). | Restart time; not measured at 430 million. |
| Live-first import (`--import-policy yield`) and memory index 512m under import | `fair`, 256m | `yield`, 512m | Fresh: busy p99 103.7 ms (`yield`, 16 GiB) against 286 ms (no rule); with the 48 GiB heap and 32 GiB cache 45.1 ms, and 36.4 ms with 512m (6 index adoptions per 300 s instead of 11). | The log replayed at restart grows (forecast 370 MB against 200 MB, not measured). |
| Covering owner head `TX2_SUBJECT_OWNER_HEAD` | off | **stay off** | 1 billion: late reads per save −15% at 235/s, apply −21 to −37%. Fresh at 620/s: stored 574.3 / 506.4 per s against the reference's 620.0 / 605.0, 8,801 refused or expired, apply 1.52 against 1.16 ms. | — |
| Wide saves `TX2_SUBJECT_WIDE` (W2, merged on 2026-11-24 through S1 `68e43248f`, both old conflicts resolved there) | off | off until next server session step 4; then on only if it shows at least 1.5× less serial apply for commits of 60 facts or more (W2's rule) | Toy: the general writer's serial apply is 1.9 to 3.9× the wide writer's at 17 to 20 facts; with it on, all 840 R and 88 S commits of the production gate take the per-subject writer (S1). Gates on this branch: W2's wide gate 4 tests / 221 assertions, the mixed-identity suite, production and aged gates pass with it off and on. | Step 4 (S1's "Wide" arm against step 3). One commit per subject's save is now the product's save shape, which was W2's condition for considering it. |
| Loader position-row reading (`acceptLoaderPositionRows`, `TRIPLEX_DATOMIC_LOADER_POSITION_ROWS`) | off | **stay off** | Only for databases built by the aging loader; the demo turns it on from its connection file. The loader must write canonical rows instead. | — |
| Save shape (product) | — | **decided by the owner on 2026-11-24: one commit per subject's save** (`lab/V0.1.md` on `main`; contract in `v01/SAVE-SHAPE.md`) | 1 billion: S 40.6 ms second-half p99 against R 430 ms; fresh 41.5 against 157 ms; whole form save 43 ms against 237 to 342 ms. | Commits per second fall about 17 times; P2 is judged on S. |
| The card's tape for new runs (S1, the one default that changes) | Saturday's tape | **changed on this branch: `production-S-noburst`** (S1 made it `production-S`; with CARD2's tapes here it is the no-burst variant, as S1 asked); the realistic card keeps its own tape; a recorded campaign without a tape name still reads as Saturday's | The owner's save-shape decision. The default plan output now differs from `9e02cf1d2` only in its first line: "saves/s" becomes "rows/s (offered as one commit per subject's save)" and the save-tape title becomes "the production-shaped tape, shape S (one commit per subject's save, at the same saves as shape R), with the end-of-cell burst removed (…)". Every other plan line, and every plan that names its tape, is byte-identical. | Step 3 runs it. Saturday's tape stays selectable (`--tape saturday`). |

**Options merged on 2026-11-24 (every option default off; the notice-selection fix and the card's judging rules are not options and are in force; Mac toy evidence only, no server has run any of them).** "What a server
must confirm" names the step of the next server session that judges it.

| Option (builder) | Default now | Proposed | Evidence (Mac toy, diagnostic clocks) | What a server must confirm |
| --- | --- | --- | --- | --- |
| Settlement frames sized by bytes `TX2_SETTLE_FRAMES=bytes` (ACT4; page `actv-lazy/SETTLEMENT-FRAMES.md`) | off (frames of 16 / 4 subjects) | on, after step 9 | The 20 forms and 20 policies release settles to the end with both writers killed and resumed: 4,272 changed values and 1,440 notices equal to the oracle and to an independent statement of the form rule; small release byte-identical to the old framing (by SHA-256); 150 forms per subject (every subject split) exact; every frame estimate at or under 8,000 µs. Pages keep `{subject, changes}` only (2.5 KB per subject at 20 forms against 5.5 KB). | Step 9: 100,000 subjects all owing 20 forms settle within the bound: 6.90 million changes and 2.04 million notices, 22,660 value and 50,000 notice frames (±5%), values 20 to 40 min, notices 25 to 45 min, all exact. Settlement beside live saves, which this row once listed as covered by no command, is step 8 since the afternoon merge (ACT5, below): the risk was real and wider (every frame needed the whole database's head unmoved; on the toy 316 of 325 frames were refused with the account saving 39.4/s and none committed while it saved). |
| Notice selection for a release that changes only forms or policies (ACT4 `fa812ca31`) | **fixed, not an option** | — | Before the fix such a release selected no subject outside the held campaign, so its owed notices were never recorded. Releases without forms or policies take the same path as before; the held campaign of 2026-11-23 was not affected. | — |
| Bounded journal pages: `"bounded": true` on `/transactions` and `/entity-transactions`, SDK `boundedJournalPages` / `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`, caps `TX2_JOURNAL_EXAMINE_ENTRIES` (4096), `TX2_JOURNAL_EXAMINE_MS` (100) (JRN1; page `jrn1/JOURNAL-BOUNDS.md`) | off (per request) | SDK option on, after step 2 | Whole feed, pinned pages, entity journals, field history and the SDK adapter equal to the unbounded routes in 5 + 15 + 45 + 48 + 8 cases on a loader-aged toy; with 3,000 non-journal entries ahead the old page examined 3,001 entries, the bounded page at most 256; the SDK's live suite passed with a bound of 2 entries. A reader that does not ask gets byte-identical answers. | Step 2 (probe, read-only): which entries the 1 billion walk goes over (pages stopping on `limit` with 1,000 journals, or on `entries` / `time` with none); every bounded page at most 4,096 entries and about 100 ms. |
| Field-history page `DatomicClient.historyPage` (JRN1) | new method, unused | the console's field history, after step 2 | 48 of 48 cases equal to the unbounded history read filtered and sorted; 20,701 bytes against 42,016 on the toy. | Step 2 probe 4: warm 20 to 120 ms against 250 to 420 ms unbounded; cold 1.5 to 5 s (it still reads every row datom of the entity). |
| `TX2_JOURNAL_PERMITS` (JRN1) | 1 | 2 only once every journal reader sends bounded pages | Proposal only; nothing measured. **No launcher passes it** (`stack/up.sh` does not), so no server command can set it today. | Needs a launcher pass-through, then P3 lag p99 and receipt-lookup p99 with the card's 256 readers at 1 and 2 permits. |
| Card settings `--reader tuned`, `--read-permits N`, `--window-seconds 90..600`, tapes `production-S-noburst` / `production-R-noburst` (CARD2; page `v01/CARD-READER.md`) | default reader, 90 s cells, burst tapes | for the card's server runs: tuned, 12 permits, 300 s, no-burst | The default card's plan output is byte-identical to `9e02cf1d2` in six option sets (two refusals identical except the stack line); toy cards with both readers and both tapes passed, 0 wrong values; launch guard 95 cases; `server-32` + tuned reader caps sum to the 89 GiB guard exactly (transactor 57, writer 6, reader 11, PostgreSQL 5, host 10). | Step 3, with its refuters: transactor peak at or above 56 GiB or any limit event; the random line's SQL time per storage read above 0.7 ms (PostgreSQL's page cache cut from 8 to 5 GiB is unmeasured); re-read L256 below 7,000/s or p99 above 130 ms. |
| The card's judging rules (CARD2) | **on for every card rendered from this branch** (rules, not options) | — | P2 on the second half of cells of 300 s or more ("Not judged" otherwise); P3 lag at the 256-reader step; P4 after the drain; the first window after each stack start labelled; latency from due and from send with timer lateness; earlier figures printed beside. The plan output is unchanged; a re-rendered 90 s card now says "Not judged" on P2. | Step 3 is the first card judged under them. |
| "At least this position" reads: `atLeast` / `atLeastPosition` on unpinned reads, SDK `ReadAtLeast` (RD4; page `rd4/AT-LEAST.md`) | off (per reader) | the product's reader for anyone holding a receipt (owner decision H11.4); the console uses it from 2026-11-24 | Two-peer toy: a receipt reader early 0 of 300; a plain read sent straight after the acknowledgement early 9 of 150; the gateway waited on 6 of 300 at-least requests (0.3 to 19.6 ms); held peer: waits to the receipt or refuses with `AtLeastTimeout`; no request to the transactor. Held Publish toy with `DX_ACT3_AT_LEAST=1`: 8 of 8 inside 1 s, 0 defects. A sync on every unpinned read was priced and not built (9,000 to 12,000 transactor messages a second at the tuned reader's rates). | Step 15: 0 early answers and 0 refusals in 120 Publishes; first-correct p50 within +3 ms of 2026-11-23 per window; waits on 0 to 10% of requests, mean under 5 ms. |
| Publish runner probe from receipts `DX_ACT3_AT_LEAST=1` (RD4) | off | on for the Publish runs | As the row above. | Step 15. |
| General-writer hints `TX2_GENERAL_PREFETCH=1` (W3; page `w3/GENERAL-WRITER-HINTS.md`) | off | stay off until step 6 | Paired log of 395,917 datoms and 220 receipts identical with hints on and off; production exactness gate on fresh and loader-aged toys identical. Reads inside apply per general commit fell about half (2.84 → 1.38 one at a time) while the transactor's total reads rose 6 to 11% and the gateway made about 3 more cold reads per commit: hints buy writer capacity, not single-save latency. The worst-case tape barely uses the general writer, so hints cannot help it (the morning's forecast for it is withdrawn). | Step 6 (S1's "Hints" arm against step 3): general reads inside apply fall 40 to 55% in the first loaded cell; commit p99 at 620/s down 10 to 30%. |
| Waiting-read bound `TX2_READ_WAIT_LIMIT=N` (`DX_READ_WAIT_LIMIT` in `stack/up.sh`) (W3) | off (every read waits) | 128 on the read gateway, after step 14 | Toy with 16 web threads, 1 permit, 64 pinned flood clients: off, every thread busy and the feed poll and health check took 10.5 s; with 4, feed poll p50 13.7 ms / p99 119 ms, health p99 120 ms, current pulls never refused (p50 0.91 s behind the permit queue), 8,723 pinned reads refused and retried by the SDK. | Step 14: at the 1,024-reader step the feed lag p99 under 250 ms with `busyPeak` under 200, pinned goodput within 20% of off. |
| Web-thread counters `TX2_THREAD_COUNTERS=1` (`DX_THREAD_COUNTERS`), `GET /v2/admin/threads` (W3) | off (the route is always present) | on for server measurement runs | A 50 ms sampler of Jetty busy and queued threads and the read permit queue; the route answered in 43 ms on the starved toy with the bound on. | Step 14 uses it. |
| Per-subject writer hints with ordered IDs `TX2_SUBJECT_HINTS=1` (W4, merged on 2026-11-24; page `w4/SUBJECT-WRITER-HINTS.md`) | off (the old `TX2_SUBJECT_PREFETCH` and its guard unchanged) | **off until the server pair** (steps 12 and 13) | Paired log of 394,317 datoms and 400 receipts identical off and on (W4's toy; 76,317 and 400 again on this branch); stale, wrong and failing hints leave every outcome unchanged (6 tests, 41 assertions); production and aged gates exact with hints on every per-subject save. Reads inside apply per first touch 1.19 → 0.58 one at a time, 0.87 → 0.435 eight in flight; with an 80 ms queue EAVT loads fall 79%. The launch guard refuses it without the per-subject writer and beside `TX2_SUBJECT_PREFETCH=1` (cases added on 2026-11-24, both refused, each beside an admitted control). | Steps 12 and 13 (worst-case tape off and on; restart with and without the start-up read). |
| Settlement precondition `TX2_SETTLE_PRECONDITION=progress` (ACT5; page `actv-lazy/SETTLEMENT-LIVE.md`) | off (`head`: every frame needs the whole database's head unmoved since its read) | on, after step 8 | Toy (ten accounts of 8 subjects, the 20 forms and 20 policies release, 9 frames): with the head rule 316 of 325 frames refused and none committed while the account saved 39.4/s; 242 of 251 refused with only the nine other accounts saving 211.5/s; 2 of 11 refused with no saves (the two writers refuse each other). With `progress`: 0 refused, 9 of 9 committed while saving, every change and notice equal to the oracle and the independent form rule, through three kills, a second release mid-settlement, a rival process, pause, restart and pace; 20 creation races, exactly one landed each time. No live save refused under either rule. A release half settled under one rule finishes under the other | Step 8: head arm at least 3,000 refusals in 300 s and at most 1% committed; settle arm 0 refused, 5.93 million changes and 2.00 million notices within 2%, 65 to 110 min beside 235 saves/s, live p99 within 1.3 times the control outside stalls |
| Several publishing accounts in one database: per-account names `HeldSource.namespace`, the settlement queue's round-robin turns and admission lane, per-account pause, pace and status `TX2_SETTLE_CONTROL=1` (ACT5) | off (one publishing account per database; account 0 keeps its names) | on when several accounts settle at once, after step 10 | Toy, three accounts publishing back to back and settling at once with saves in all ten: under `progress` 0 refused, 9 frames each, finished within 55 ms of each other; with the lane, save p99 the lowest of the three settings; 7 of 7 queue tests (round-robin among three accounts, pause, pace, hold, lane); pause held through a restart, pace 300 ms gave at least 300.3 ms between frames | Step 10 (not runnable from this branch): 0 refused, each account within 10% of the others' frames per minute; the ten-account writer time (about 2.5 h at one frame at a time) is the owner's question before choosing |
| ID lists: route `POST /v2/db/{db}/ids` behind `TX2_ID_LISTS=1` (`DX_ID_LISTS` in `stack/up.sh`), its permit pool `TX2_INDEX_QUERY_PERMITS` (default 1), SDK `listIds` and the adapter option `idLists` (XQ3; page `xq3/ID-LISTS.md`) | off (the route answers 404 as before; the adapter scans) | on for the read gateway, after step 2 | Gateway test 16,460 assertions against a brute-force pass; through the store 1,654 checks (750 page sequences, 34,500 IDs equal to the store's own history read); 72 `entityPage` chains byte-equal to the scan; removal on request leaves the list identical and returns no protected value; a burst of 8 counts on one account ran 1 and refused 7 as busy. Toy account of 400,000 IDs: a cold page of 1,000 costs 2 storage reads at the head, 6 at an old pin; a full cold count 62 to 67 reads. Writes nothing per save; no backfill | Step 2: exactly 100,000 subjects at the head and at 87,002; warm walk 0.1 to 0.35 s, cold 0.3 to 1.0 s; the old pin within 2.5 times the head |
| Uncached pinned reads: batch prefetch `TX2_READ_PREFETCH=1` (`DX_READ_PREFETCH`), Datomic's read-ahead off on the reader `DX_READ_AHEAD_OFF=1` (`-Ddatomic.readAheadPool=0`, configuration only), the reader cache size for the random arm, a second reader on a second machine (`DX_REMOTE_READER_HOST`, `rd5/second-reader.sh`, `DX_RD5_SECOND_READER`) (RD5; page `rd5/UNCACHED-READ.md`) | off | prefetch with permits equal to cores after step 11; read-ahead off only if step 11 shows it is the excess load; the second reader after step 16 | Breakdown of 2026-11-23's evidence: 1.52 of the 1.71 ms of reader CPU per random subject is 1.76 segment loads (0.86 ms each); the 14.1 storage round trips of an exchange run one after another inside the permit. Toy: 3 × 30,548 whole `/read` comparisons, 0 differences; read-ahead off cut storage gets per subject 34 to 45% and CPU 30 to 43%; the prefetch halved an exchange's wall time without changing loads. The toy does not reproduce the 1.76 loads per subject | Step 11: `pf3` 1,500 to 1,850 reads/s; `pf3r` 2,100 to 2,600 if read-ahead is the excess, which would bring the P1 bar from about 7 to about 5 reader cores. Step 16: two readers 4,200 to 5,000 reads/s, p99 85 to 115 ms |
| The exact sweep: route `POST /v2/db/{db}/sweep` behind `TX2_SWEEP=1` (`DX_SWEEP` in `stack/up.sh`), its pool `TX2_SWEEP_PERMITS` (default 1), `TX2_SWEEP_PER_ACCOUNT`, `TX2_SWEEP_QUEUE_MS`, `TX2_SWEEP_CURSOR_SECRET`, SDK `sweepPage`, `sweepAll`, `sweepCount` (XQ6; page `xq6/EXACT-SWEEP.md`) | off (the route answers 404 as before) | on for the read gateway after step 2, as the fallback for what the commit-time index refuses and as that index's reference answer | Gate 5,917 checks against a brute force from the store's history read: 459 sweeps, 2,134 pages over 17 question shapes, 3 accounts, 3 positions and 3 valid instants; equal to `read` in 672 comparisons; exact at its position while subjects change, a removal on request, settlement frames and a reader restart land between pages; 15 typed refusals; no protected value in any answer. A sweep's reads skip the read permit (`admission/*own-pool*`); with nothing bound every other read takes and releases its permit exactly as on `23b7df344` (the permit gate below) | Step 2: a count of 100,000 subjects exact and equal at 1, 3 and 6 parts, 120 to 210 s at 1 part, 45 to 80 s at 3; arm B, the re-read readers' loss while a sweep runs on the same reader (the main unknown) |
| The question reader (XQ7): `DEMO_QUESTION_READER=1`, `DX_QUESTION_*` pools | off (sweeps and ID lists on the main reader) | stay off until step 2b | Toy gates only (section "Gates"); no server number | Sweeps and lists move to their own gateway; the main reader's cache is no longer shared with them |
| ACT7's runner options `DX_ACT7_*`, `TX2_SETTLE_COST` | off | `TX2_SETTLE_COST` only after step 10a accepts a calibration | Miniature at toy size; no server number | The settlement estimate per frame |
| HA2's cold-copy options `TX2_HA2_COLD_CORES`, `TX2_HA2_COLD_PIPELINE` | off (every cold copy as at `b03e806fd`) | on for policy B after step 17 | Toy repair gate and the second-failure drill; no server number | The replacement's copy and check use all cores and check each file as it is copied |

## Options on the one branch after the 2026-11-25 merge: which a server run may turn on

Every option is default off; no default changed in this merge. "Safe to turn on in a server run" means: gated on the
toy on this head, no open review finding against it, and turning it on for a measurement cannot change a stored
answer outside its own route. It is not a proposal to make it a default (that is "Proposed defaults", above).

**Safe to turn on in a server run**

| Option | What it does | Limit |
| --- | --- | --- |
| `server-32` profile, per-save credits (`rolling6`), the tuned reader with read permits | earlier measurements (above) | as "Proposed defaults" |
| `TX2_PINNED_CUT_LOOKUP`, `TX2_PINNED_SHORTCUT` | pinned read options | — |
| `TX2_SUBJECT_WIDE`, `TX2_GENERAL_PREFETCH`, `TX2_SUBJECT_HINTS` | writers and hints | an arm claiming a per-subject share reads it from the gateway's counters (R8) |
| `TX2_SETTLE_FRAMES=bytes` | settlement frames sized by bytes | — |
| `"bounded": true` journal pages, `TRIPLEX_DATOMIC_BOUNDED_JOURNAL`, `historyPage` | bounded journal reads | `TX2_JOURNAL_PERMITS` has no launcher pass-through |
| `atLeast` reads, `DX_ACT3_AT_LEAST` | reads at least a receipt's position | — |
| `TX2_READ_WAIT_LIMIT`, `TX2_THREAD_COUNTERS` | waiting-read bound and counters | — |
| `TX2_ID_LISTS` (+ permits), `TX2_SWEEP` (+ permits, queue, cursor secret), the question reader | questions across subjects | — |
| `TX2_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_REMOTE_READER_HOST` | uncached pinned reads | — |
| HA2's `TX2_HA2_COLD_CORES`, `TX2_HA2_COLD_PIPELINE` | failover copy | — |
| **New:** `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS` (SCALE2) | the SDK's ID list range check sorted once | — |
| **New:** `TRIPLEX_DATOMIC_SHARED_AGENT` (SCALE2) | one HTTP agent per process | transport only |
| **New:** `TX2_SWEEP_GATE_EVICT` / `DX_SWEEP_GATE_EVICT` (SCALE2) | a sweep gate lives only while its account sweeps | — |
| **New:** `TX2_ENROL_BESIDE_SAVES` (SCALE2) | enrolment's writer check accepts other accounts' commits | partial: enrolment still needs the database head (SCALE2 P8) |
| **New:** `orderedSaves`, `saveSizeRule` (S2; `TRIPLEX_DATOMIC_ORDERED_SAVES`, `TRIPLEX_DATOMIC_SAVE_SIZE_RULE`; `DX_S2_PRODUCT` on the card) | the product's saves as one ordered block per subject's save | **a behaviour change by the save contract:** two saves of different fields of one subject sent at once now conflict and the second is replayed by the SDK |
| **New:** `TX2_SUBJECT_SEVERAL_OWNERS` / `severalOwners` (S3; `DX_S3_OWNERS`) | a save of two to four owners on the per-subject writer | needs `TX2_SUBJECT_WIDE=1`, not with the owner head |
| **New:** `TX2_SUBJECT_CREATE` / `creationSaves` (S4; `DX_S4_CREATE`), tape M (`production-M`, `production-M-burst`) | creations on the fast writer; the real mix of saves | needs several owners |
| **New:** `TX2_IMPORT_WHOLE_SUBJECT` (IMP2) | one import commit per subject | with `TX2_IMPORT_COMMIT_US`: **the bound holds for honest frames only until fixed** (R7) |
| **New:** `"omitProtected": true` per request; `packages/reporting` (RPT1) | the reporting copy; protected values never leave the gateway for it | — |
| **New:** `TX2_READ_BATCH` / `DX_READ_BATCH` (API1; read gateway only), the SDK's `CallReads` loader | one API call's reads in one request at one position, by-reference entries, one read permit | the route is absent when unset; the server run of API1 measures it |
| **New:** `"stopAt"` per reach request (API1) | a world read stops at references by the named attributes | only when a request sends it (1 to 64 attribute names) |
| **Not an option, in force:** the entity cache's drops at a removal (API1) | a parsed entry of an entity a newly published removal names is dropped when a reader first sees the removal | every reader with the parsed-entity cache |
| **Not an option, in force:** the kernel's cap on forms and policies raised from 512 to 8,192 (ACT6, `packages/w0`) | releases of up to 8,192 forms and policies compile | applies to every release on this branch |
| **Not an option, in force:** the B2 key-deletion fix (`46a8f746a`) | one pending removal no longer stops the deletion of the other published removals' keys (R3) | a pending removal still makes every request answer 503 until the client resends: unchanged, an open decision for the owner |
| **Not an option, in force, replies change:** a save whose outcome is unknown (save-line fixes F1) | after the transaction is handed to Datomic, a failure is a refusal only when a stored function or Datomic decided it; anything else, including the transactor stopping between apply and acknowledgement, answers **`503 OutcomeUnknown`** with the failure's class (`cause`), where it answered `400 TransactionRejected` before; the SDK looks the operation up and, when it is not stored, fences it (new route), then answers the receipt or `DatomicOperationNotApplied` | R1 fixed: a stored save is no longer reported as failed |
| **Not an option, in force, replies change:** a save racing a removal on request (F3) | `409 CasConflict` on every writer (the SDK re-reads and replays); `ErasureFrontierChanged` only when the request itself named the frontier (`erasureSeq`) | before, the general writer answered `ErasureFrontierChanged` and the per-subject writers `CasConflict` for the same race |
| **Not an option, in force, replies change:** the command path across accounts (section 9 of the save-line page) | the SDK's command path no longer settles on another account's transaction: an operation committed first by another caller is not taken as this save's outcome | another account can still deny or learn a command ID with the account setting off (section 9.1 of its page) |
| **Not an option, in force:** a creation of a family a removal named before the entity existed (F4, F11) | a creation framed after the removal commits; a removal made on a gateway without the creation option counts too | — |
| **Not an option, in force:** typed refusals at the real full-document limits (ACT6) | a marker or event value over the store's 1 MiB is refused before any write, naming the sizes | the store refused it anyway, later |

**Under independent review, or with an open finding: not to be turned on until it reports or is fixed**

| Option | State |
| --- | --- |
| **`TX2_ACCOUNT_CLAIMS` / `:triplex.scope/account-ids` (the save-line fixes' account setting): stays OFF** | Its third review found two high breaks with it on: a reopen by a process with a different general-writer hash puts the old writer back (R3-1), and any caller can take an account's command ID first and make that account's SDK settle on its transaction (R3-2). Nothing merged here turns it on. **Before it is turned on anywhere:** (1) R3-1 fixed, or every gateway of the database runs with predecessor lookup on and no process with another general writer (another build, `TX2_LOAD1_PROFILE=1`, the covering-owner options) ever opens it; (2) the reserved prefix refused on the removal route, and no claim in the database already begins with it; (3) the account a request names comes from the authenticated caller, and a caller can write only its own account's entities; (4) R3-4 fixed (an ordered import stream that names its account stops at the transition); (5) every gateway runs this build or later, and a database restored from a backup taken before the transition is back to the setting absent; (6) if the per-account removal branch merges, the merged rule of the review's section 2 |
| `TX2_READ_SET_BOUND` (save-line fixes, F2) | new, default off: caps every class's read set (no repeats, at most 4,096 names); not measured at 1 billion |
| `TX2_NOTICE_LEDGER=parts` (ACT6, the ledger of a subject owing 200 forms or more, in parts) | Under the Publish and settlement review (reported, R5): **releases above the parts cap are not refused at Publish time yet.** A server run may use it only where every ledger stays within 10 parts (1,000 forms is 6 parts per subject) |
| `TX2_RELEASE_DOCS=ref` (ACT6, definitions by reference, written ahead of the Publish) | Under the same review (reported, R4): **one publishing account only until fixed** |
| `TX2_SETTLE_PRECONDITION=progress` (ACT5) | R6: **a pause is at most a few frames late under the progress precondition** |
| `TX2_SETTLE_CONTROL`, `HeldSource.namespace` (several publishing accounts, ACT5) | R2: **not safe with more than one publishing account unless every command ID contains the account** |
| `TX2_IMPORT_COMMIT_US` (IMP2) | R7: bounds honest frames only |
| ACT7's `TX2_SETTLE_COST` | only after step 9 accepts a calibration |
| `TX2_SUBJECT_OWNER_HEAD`, loader position rows | stay off (above) |
| **XQ10 (second batch): the commit-time index and `find` (`TX2_CROSS_INDEX`, `TX2_SWEEP_SHAPES`, `TX2_INDEX_HINTS`, SDK `askPage`, `askAll`)** | **Exact on the toy against two independent paths** (the reporting copy's SQL and the sweep, compared with `find` at one watermark: pair-find below; XQ10's own suites and stacks); **cost at 1 billion not measured.** A server run turns it on only as the measurement of that cost (session list, the index runs). XQ10's G5 60 ms time clause is not verified on the Mac and is not loosened. The index on an existing database is a backfill; the dry-run backfill after the pair adds and retracts nothing. **On the toy with the index on, every tape M save left the per-subject and creation writers for the general writer** (declined "protected-values-or-frame"; per-subject 23 of 360 against 360 of 360 without the index): an index run must read the writer counts, not assume the fast writer |

**Not merged, and why**

| Branch | Why |
| --- | --- |
| `exp/DX-ERA2-removal-per-account` | an independent review found a break (a derived write keeps a removed value while a removal is committed but unpublished); being fixed |
| `exp/DX-ERA4-derived-copies` | in independent review with open findings |
| `exp/DX-ACT9-account-tickets` | in progress; depends on the removal fix |
| `exp/DX-ACT8-publish-beside-saves` | in independent review |
| `exp/DX-XQ2-index-cost` | a measurement, not a build |
| every review branch (`exp/DX-ACT10-publish-review`, `exp/DX-S5-save-line-review`, …) | reviews, not builds |

## What the night's merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-CON1-console` `e6405e403` | `bc097008a` | Triplex Console (`examples/console`, React on shadcn/ui), the 22-tool catalogue and MCP server (`examples/demo-mcp`), `demo/**` |
| `exp/DX-CARD1-prodS-assemble` `78ad445a6` | `48c14a875` | Card rows placed by tape offset, `--renderer`, `--platform-tape`, the card `v01/SCORECARD-1B-production-S.md` |
| `exp/DX-W1-ownerhead-fix` `6cae9ba1b` | `f794423d8` | Owner-head pair: summarizer and sampler fixes, `w1/serial/compare.ts`, `w1/OWNER-HEAD-1B-READING.md` |
| `exp/DX-RD1-readers` `d94dff145` | `f1451e083` | Tuned pinned reader arm, saves arm (`v01/saves-arm.ts`), random-subject windows, `DX_RD3_READ_PERMITS` |
| `exp/DX-ACT3-large-release` `f5f8c09ff` | `385798988` | Release size for the Publish runner (`DX_ACT3_RELEASE`), the repaired probe, `DX_HELD_WINDOWS`, `actv-lazy/LARGE-RELEASE.md`, `PUBLISH-STOP.md` |
| `exp/DX-JVM1-startup-aged-fix` `968285954` | already on the branch | The start-up read's 1 billion runner |
| Drivers' result pages (documents only) | `c614de614` | SCALE1 `ec4d96cb0` and BM1 `769d8ef72` pages listed under the table above |
| Fixes | `a1d2473f8`, `607c46e8b` | The random arm's command block and the `ladders/` refusal; a test of the collector's aged head |

**Not merged:** `exp/DX-W2-wide-saves` `4ccbbf518` (`TX2_SUBJECT_WIDE`). It does not merge cleanly: `erase1/local.mjs`
(the pinned-option environment lines against the wide-saves line, one hunk) and `scale1/decision/writes.ts` (the
production commit path against the wide identity token, one hunk). By the rule for this merge it is left out.

## What the 2026-11-24 merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-ACT4-settlement-frames` `b623914a4` | `cd55cfe61` | `TX2_SETTLE_FRAMES=bytes`, `DX_ACT4_INITIAL=large`, `DX_HELD_MINUTES`, the notice-selection fix `fa812ca31`, `actv-lazy/SETTLEMENT-FRAMES.md` |
| `exp/DX-JRN1-journal-bounds` `adf744f6b` | `2a10a7703` | `"bounded": true` journal pages and cursors, `boundedJournalPages`, `historyPage`, `TX2_JOURNAL_PERMITS`, the 1 billion probe, `jrn1/JOURNAL-BOUNDS.md` |
| `exp/DX-CARD2-reader-setting` `a9d8c1fce` | `cb59b276a` | `--reader tuned`, `--read-permits`, `--window-seconds`, the `-noburst` tapes, the card's judging rules, the trace file per process start, `v01/CARD-READER.md` |
| `exp/DX-RD4-at-least-read` `dd96da3b2` | `84cc1e26d` | `atLeast` reads on the gateway, `ReadAtLeast` in the SDK, `DX_ACT3_AT_LEAST`, `rd4/AT-LEAST.md` |
| `exp/DX-W3-writer-hints` `a6146ff4f` | `287bb0816` | `TX2_GENERAL_PREFETCH`, `TX2_READ_WAIT_LIMIT`, `TX2_THREAD_COUNTERS`, `/v2/admin/threads`, the SDK's `ReadBusy` retry, `w3/GENERAL-WRITER-HINTS.md` |
| Fix | `fdabb86e5` | Gateway `reach.clj`: W3's change closed `admission/execute` one form early, so every `/reach` and `/reach-many` answered a boolean (HTTP 500) whatever the settings; found by the console's gates |
| Console | `b6611ad3b` | The console reads after its own writes: every acknowledged commit raises a `ReadAtLeast` floor that every unpinned read on the read gateway asks for (2 s wait); `DEMO_TOY_NAME` / `DEMO_TOY_PORTS` run a second toy beside the owner's |
| Gate | `73a9c8bf3` | `rd4/gate.ts` records the read gateway's journal, at-least and read-queue counters at the end |
| `exp/DX-W4-subject-hints` `27fee5dc1` | `5d661f4c1` | `TX2_SUBJECT_HINTS` (per-subject writer hints with ordered IDs), its pass-through and `stack/up.sh` refusals, `w4/SUBJECT-WRITER-HINTS.md` |
| `exp/DX-S1-save-shape` `68e43248f` | `0fec06280` | W2's wide writer `TX2_SUBJECT_WIDE` (its two old conflicts resolved on S1), writer options that reach the card and are recorded and checked against the writer's readback, the save-size ladder, the card's new-run default tape (`production-S-noburst` here), `v01/SAVE-SHAPE.md`; S1's own copy of the reach fix (`f1c95ad80`, the same line as `fdabb86e5`) |
| Gate | `b1193d72e`, `982c54a90` | `int3/reach-gate.sh`: every subject pull (`/reach`, `/reach-many`, row and gzip pages, an old cut and the head) answered by this branch's read gateway, by the unmerged baseline's gateway source (`9e02cf1d2`) and by this source with the waiting-read bound on, on one toy, compared exactly; W3's head (`a6146ff4f`) as the negative control |
| Guard | `07144498e` | Launch guard cases for W4's two refusals and S1's wide writer, each beside an admitted control |
| Card | `4c34fd0f8` | `DX_READ_WAIT_LIMIT` and `DX_THREAD_COUNTERS` reach the card's arms and are recorded (`run.ts` dropped them, so W3's "bound on" arm would have run with the bound off) |

**Conflicts and how each was resolved** (both sides kept every time; W4: gateway `main.clj`'s requires; S1: `v01/run.ts`,
`adopted-server.ts`, `mac.ts` and `saves-arm.ts`, where CARD2's reader setting and first-window label sit beside S1's
writer options and ladder, and `defaultCardTape` became `production-S-noburst`): `actv-lazy/join/held-campaign.ts` (ACT4's large
first release is offered, then RD4 hands its receipt to the probe reader); `packages/datomic/src/DatomicStorageAdapter.ts`
(both adapter options); gateway `admission.clj` (JRN1's journal permit setting with W3's read bound, counters and
`execute` / `execute-for`); gateway `storage.clj` (JRN1's field-history page admitted through W3's `execute-for`);
gateway `main.clj` (the namespace requires RD4's `at-least` and W3's `general-prefetch` and `admission`). Merged
without conflict: `ha1/local.ts` (RD4's holder beside ACT4's hook), `stack/up.sh` (RD4's read-hold proxy beside W3's
pass-through), `DatomicClient.ts` and `index.ts` (JRN1, RD4, W3).

## What the 2026-11-24 afternoon merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| `exp/DX-ACT5-settlement-live` `c1579ee50` | `36bbf53ef` | `TX2_SETTLE_PRECONDITION=progress` (a frame guards its writer's own progress row instead of the database head); per-account metadata names `HeldSource.namespace`; the settlement queue's round-robin turns per account, `hold`, per-account pause and pace, the admission lane (`settlementLane`); `TX2_SETTLE_CONTROL=1` with `readSettlement` / `setSettlementControl`; the held runner's live phase (`DX_ACT5_LIVE`, `DX_ACT5_SERVER`, `DX_ACT5_CASES`, `DX_ACT5_ACCOUNTS`); `actv-lazy/SETTLEMENT-LIVE.md` |
| `exp/DX-XQ3-id-lists` `f1f0908df` | `395df900f` | The ID list route `POST /v2/db/{db}/ids` behind `TX2_ID_LISTS=1`, its permit pool `TX2_INDEX_QUERY_PERMITS`; `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_XQ3_ERASURE_DIRECTORY` in `stack/up.sh`; SDK `listIds`, `listIdsPage`, `configStoreIdLists` and the adapter option `idLists`; the core SPI member `StorageAdapter.getEntityPage`; the gate, count and server runners; `xq3/ID-LISTS.md`. Its history carries one commit (`1308d44d8`) with a local socket path, removed in the next commit; not rewritten (the same path is in the tracked `CLAUDE.md`) |
| `exp/DX-RD5-uncached-read` `67bca118e` | `67417e609` | `TX2_READ_PREFETCH` (gateway `uncached.clj`, called from `lean/rows`); `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_REMOTE_READER_HOST` in `stack/up.sh`; `DX_RD5_READ_PREFETCH`, `DX_RD5_READ_AHEAD_OFF`, `DX_RD5_READ_CACHE_MIB`, `DX_RD5_SECOND_READER` in the random arm (`v01/study-server.ts`, `rd1/pinned-ladder.ts`); `rd5/second-reader.sh`; the gate and probes; `rd5/UNCACHED-READ.md` |
| `exp/DX-XQ6-exact-sweep` `909309c63` (added by the orchestrator during the merge; based on XQ3 `f1f0908df`) | `f56199112` | The exact sweep `POST /v2/db/{db}/sweep` behind `TX2_SWEEP=1` (gateway `sweep.clj`: lists IDs with the ID list walk, reads each subject with the pinned read's own code, tests conditions, signed cursor), its pool `TX2_SWEEP_PERMITS`, `TX2_SWEEP_PER_ACCOUNT`, `TX2_SWEEP_QUEUE_MS`, `TX2_SWEEP_CURSOR_SECRET` (and the `DX_SWEEP*` names in `stack/up.sh`); `admission/*own-pool*` (a sweep's reads skip the read permit; unbound, every read is admitted as before); SDK `sweepPage`, `sweepPageWaiting`, `sweepAll`, `sweepCount`; gate, suites, load and server runners; `xq6/EXACT-SWEEP.md` |
| Launch | `1d6072615`, `b0d88c9ae` | `stack/up.sh` refuses a wrong `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF` or `DX_REMOTE_READER_HOST` before the first Docker change; `DX_INDEX_QUERY_PERMITS` takes the gateway's range 1 to 64 (fault 2 below); the same for XQ6's five `DX_SWEEP*` settings; the ha1 toy stack passes `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS` and `DX_SWEEP` to its gateways (nothing when unset) |
| Guard | `853b0ee6a`, `6616b5132` | Fifteen launch guard cases for the new options |
| Gate | `4596f184f` | `int3/reach-gate.sh` records the write-options report of this source and the baseline's; `REACH_WRITE_OPTIONS_SAME=1` makes byte identity part of the verdict |
| Fix | `91f02e68b` | `large-release-check.ts`: its writer-admission stub carries what `Archive.write` reads since ACT5 (fault 1 below) |
| Pairs and the permit gate | `b0b8b079e`, `bcab3640f`, `08d81d3b2`, `3b72ff93a`, `6bba00011`, `2aa1ad8fa` | (a) `DX_ACT5_ID_LISTS=1` in the held live phase; (b) `RD5_TREATMENT_ENV`, `RD5_POOL`, `RD5_AT_LEAST` in the RD5 gate; (c) `int4/pair-c.sh` and `pair-c.ts`; (d) `DX_ACT5_SWEEP=1` in the held live phase; `int4/permit-gate.sh` and `.ts` (read permits counted against the baseline's gateway). All default off; nothing changes when unset |
| Image choice | `67cb0eecf`, `329cb48cd`, `3f8c135dd` | The ha1 toy runner runs only on a Datomic image built from the checkout under test (fault 3); `lab/bin/gate-image.sh`: the aged, RD5, RD2 shortcut and XQ6 suite gates start from one image ID, record it and refuse fixed shared tags (fault 4); the aged gate passes `DX_READ_PREFETCH`, `DX_ID_LISTS` and `DX_SWEEP` to its gateway |
| `exp/DX-XQ7-question-reader` `a5631af24` (second push) | `8072b5ad5` | A separate read gateway role for the question routes (ID lists and the sweep), default off: gateway `question_reader.clj`, the per-role ID list and sweep pools in `stack/up.sh` (`DX_QUESTION_*`), `DEMO_QUESTION_READER=1` in `demo/server-up.sh`, SDK question-reader routing; gate, cache gate, plan check, suites and server runner; `xq7/QUESTION-READER.md`. One conflict in `stack/up.sh` (XQ7's per-role block kept with this branch's 1 to 64 range) |
| `exp/DX-ACT7-settlement-1b-prep` `82ba1ca38` (second push) | `ee4c06297` | Settlement at 1 billion: the held runner adopts the aged seal, an oracle for aged subjects, `DX_ACT7_STREAM_CHECK`, `DX_ACT7_TAPE`, `DX_ACT7_CONTROL`, `TX2_SETTLE_COST`, frame counters and `act7/calibrate.ts`, `held-server.sh` over 180 min, the miniature; `actv-lazy/act7/RUN2.md`. Two conflicts kept side by side (`held-campaign.ts`, `settle-live.ts`'s context type) |
| `exp/DX-HA2-recovery-time` `13fe78536` (second push) | `7a05aac07` | Failover policy B's cold-copy options `TX2_HA2_COLD_CORES`, `TX2_HA2_COLD_PIPELINE`, `TX2_HA2_CASES`, default off; the second-failure check repaired; `hasync1/RECOVERY-TIME.md`. One conflict in `ha1/local.ts` (both holders kept) |
| Image choice, second push | `69648310a` | `xq7/suites.sh` and ACT7's miniature start their Datomic containers by image ID (fault 4) |

**Conflicts:** none in text; each merge applied cleanly. The overlaps were read and kept side by side:
`ha1/local.ts` (ACT5's holder beside ACT4's hook and RD4's holder), `actv-lazy/join/held-campaign.ts` (ACT5's live phase
and exported helpers beside RD4's receipt handoff), gateway `main.clj` (RD5's `uncached` require and its two
write-options entries, shown only when on, beside the hints entries; XQ3's `ids` require and route, absent when off),
`stack/up.sh` (RD5's remote-reader ports and reader options beside XQ3's ID list options). XQ3 and RD5 had each merged
`23b7df344` already. XQ6 merged after XQ3 and RD5 (it is based on XQ3; RD5 was already on the branch when it was added); its `main.clj` route sits beside XQ3's and its `up.sh` options beside XQ3's and this branch's early refusals, without conflict.

**Faults found in the merges (1 to 4 fixed on this branch; 5 is a harness fault, not fixed):**

1. **The database-free large-release check stopped at its first frame after the ACT5 merge** ("A settlement frame
   names its progress row"). ACT5's `Archive.write` reads the archive's precondition, frame counts and queue key; the
   check's stub (ACT3) had none of them, so neither the head rule nor a guard applied. ACT5 ran `frames-check.ts` but not
   this check. Fixed in the stub (`91f02e68b`); its counts are identical to the morning's run at `5e1bb75ba`.
2. **`stack/up.sh` admitted `DX_INDEX_QUERY_PERMITS` of 65 to 99, which the gateway refuses at start-up** (the test said
   "1..64" but matched two digits), and XQ3's and RD5's options were checked only in the gateway loop, after PostgreSQL
   and the transactor had started, so a wrong value cost a started stack and the launch guard could not see it. Fixed
   in `1d6072615`; the guard's new cases show each refusal stopping at its own test.

3. **The ha1 toy runner ran on whichever Datomic image was built last, by any builder, from any branch** (found when
   the orchestrator relayed another builder's report). In its diagnostic, `load-*` and `hasync-*` modes `ha1/local.ts`
   took the newest `datomic-build` event in the shared `lab/locks/events.jsonl` whose image still existed. Every
   builder appends such an event when it builds a Datomic image, so a run started after another builder's build ran
   on that builder's image: its `/opt/gateway` (other than the mounted `src/` and codec spec), `/config` and
   `/opt/datomic`. **The exact condition:** any ha1 run in those modes, on any branch, at any time another branch's
   Datomic image had been built after the run's own branch's and was still in the lab VM. Every ha1 case of this
   afternoon's first pass ran on another builder's image (`d6008c8d…`, `73259ca7…`, `4fbfd98a…`, built by other
   builders, and `575f1c5e…`, this builder's production-gate image, built from a staged copy whose inputs differ), so none of them is counted below; all were rerun. **Fixed** in `67cb0eecf` (`ha1/image-choice.ts`): the
   image must be an engine build whose build inputs equal those computed from the checkout under test (sources and
   the verified distribution; the formula reproduces `main`'s pinned `3a010a2b…`), or the private build named by
   `DX_HA1_DATOMIC_RECEIPT` whose sources are the checkout's; otherwise the run refuses and names the build command;
   `image.json` now records the image, how it was chosen and the checkout's inputs. Four tests (a newer build of
   another branch is passed over; refused when only other branches' images exist; refused when the event's image is
   gone or relabelled; a receipt only with this checkout's sources). The reruns used `tx2-dxthin-jre21:98f93dce098bcbcc`
   (`sha256:390e96e8…`), built from this head (sources `3aa2ef59…`). This is a unit test, not a `guard-check.sh` case:
   the launch guard dry-runs `stack/up.sh`, which takes its images by name and never used the build events.

4. **Mac gates that start a Datomic container themselves started it from a fixed shared tag** (found on the
   orchestrator's report that every builder's production gate retags `tx2-datomic:dx-real2-production`). Four ways a
   run takes its Datomic image on the lab VM, audited:
   - **`engine.mjs` (the REAL2 production gate through `prep1/manage.py`, the selftest lane, the toy cards):** builds
     to a tag, reads the image's ID and build-input label back at once (a label other than its own build inputs is
     refused), pins the ID in the staged `slots.json`, re-checks that the tag still names that ID before each step and
     starts containers by the ID. A retag by another builder makes the run refuse ("Datomic local image id differs
     from slots.json"); it cannot run the other image. Holders DX-THIN1, DX-S1, DX-W3 and DX-W4 build to a private tag
     named from the attempt; every other holder shares `tx2-datomic:dx-real2-production` (production mode) or
     `tx2-datomic:dx-prep1-<mode>`, so their concurrent runs refuse each other, which costs retries, not results.
   - **`stack/up.sh` without a receipt** (`xq3`, `xq6`, reach, permit gate, pair (c), the demo toy): takes the runtime
     tag `tx2-datomic:1.0.7745-da00`, resolves it to an ID before its first container, starts every role by that ID and
     records it (`config/java-image.txt`; every case here recorded `21a67288…`, created 2026-11-21). It does not
     compare that ID with a build of its own; the gateway directory is mounted from the checkout. Not changed: the demo
     toy and the console's second toy start this way, and refusing the tag would stop both.
   - **ha1:** fault 3 (fixed; starts by ID).
   - **Scripts that call `docker run <tag>` directly:** `real2/aged-gate.sh` (default `dx-real2-production`),
     `rd5/gate.sh` and `rd1/shortcut-gate/gate.sh` (`1.0.7745-da00`), `xq6/suites.sh` (`dx-real2-production`), and
     outside this merge `w3/gate.sh`, `w4/gate.sh`, `s1/suites.sh`, `s1/ladder.sh`, `v01/production-aged-toy.sh`,
     `age1/readback-gate.mjs` (`dx-jvm1-startup-read`), `xq3/counts.ts`'s seeder, and the older `b5`, `b8`, `b10`,
     `h5`, `h6`, `r1`, `s4` launchers. These ran whatever image the tag named at that second and recorded nothing.
     **The exact condition for a wrong image:** such a script started while the tag named an image built from another
     checkout whose image-supplied bytes differ from the run's own: the baked gateway (when not mounted), the codec
     spec and vectors, `lab/config/datomic` (Dockerfile, classpath), the Datomic distribution or the Java base. Today
     every such script but `age1/readback-gate.mjs` mounts the gateway source, and those other bytes are identical in
     every Datomic image in the lab VM (table above), so no result counted here depends on it.
   **Fixed for the four scripts in this merge** (`329cb48cd`, `lab/bin/gate-image.sh`): the image must be an ID or a
   private per-build tag (`tx2-dx<holder>-jre21|jre25|native|managed:<hex>`; a JRE tag's label must match its name); it is
   resolved to the ID before any Docker change, the container starts by that ID, `image.json` records it and the
   container's own image is checked against it. Fixed shared tags, including each script's old default, are refused
   with a message naming what to pass. `ha1/gate-image.test.ts` (11 cases) and six live refusals are the guard cases;
   the launch guard itself dry-runs `stack/up.sh`, which this does not change. The aged gate also now passes the read
   options to its gateway and records the gateway's own environment (`3f8c135dd`; before it, its "with options" run
   carried them only in the driver).
   **Results on other branches exposed:** none from the engine route (it refuses rather than runs a moved tag); every
   ha1 run on any branch before its own image-choice fix (fault 3; ACT8 added a receipt route in `813264dac`); and
   every run of the direct scripts above whose evidence lacks an image ID, which is all of them before `329cb48cd`, in
   principle. In effect, only where the image's non-mounted bytes differed, which this audit found nowhere among the
   images present today. `age1/readback-gate.mjs` runs the image's baked gateway: its results reflect the gateway that
   last built `dx-jvm1-startup-read` (`a7f9ce70…`, 2026-11-23), not necessarily the branch that ran it.

5. **`xq7/plan.sh` writes a temporary copy of the base `stack/up.sh` into the checkout while it runs** (`stack/up-xq7-base.sh`, removed on exit), so a held or settlement run started meanwhile refuses with "Checkout has uncommitted inputs". Found when the second push ran its gates in two lanes; those two cases were rerun after every other gate. A harness fault, not fixed (the base copy must sit beside `up.sh` for its relative paths); run the plan check alone.

**Contradictions between the four pages and the merged code** (the pages are left as their builders wrote them):

1. `xq3/ID-LISTS.md` section 2 and section 6 say the console's gates cannot run beside the owner's toy because
   `demo/toy` offers no second toy. The one branch has offered one since `b6611ad3b` (`DEMO_TOY_NAME`, `DEMO_TOY_PORTS`;
   the console's gates ran that way this morning and this afternoon). Switching the console to `configStoreIdLists` is
   therefore a small change with a gate available, not "not small".
2. `xq3/ID-LISTS.md` section 1 gives `TX2_INDEX_QUERY_PERMITS` the range 1 to 64, as the gateway does; the merged
   `stack/up.sh` admitted 65 to 99 (fault 2, fixed).
3. `rd5/UNCACHED-READ.md` says every option is default off. The options are, but `/v2/admin/scan-stats` now always
   carries a `readPrefetch` entry (`{prefetch: false, batches: 0, …}` when off), so that diagnostic answer is not
   byte-identical to `23b7df344` with nothing set. The write-options report is (gate below). Not changed.
4. `actv-lazy/SETTLEMENT-LIVE.md` section 9.2 item 3 asks for JRN1's journal bounds to be merged before the 1 billion
   run. They are on this branch, but the held runner's ledger walks `/transactions` with its own request
   (`held-ledger.ts`, no `"bounded": true`), not through the SDK adapter, so `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1` does not
   bound it: the merge alone does not satisfy that item. The ACT7 preparation should ask for bounded pages there.
5. `actv-lazy/SETTLEMENT-LIVE.md` section 9.1 and `actv-lazy/SETTLEMENT-FRAMES.md` section 9 predict the same release
   (20 forms and 20 policies on 100,000 subjects, byte frames) differently: 5.93 million changed values and 85,000 to
   100,000 notice frames against 6.90 million changes and 50,000 notice frames. ACT7 (second push,
   `actv-lazy/act7/RUN2.md` sections 4 and 5) counts the frames without a database and corrects both: per account
   20,300 value frames and 57,600 + 6,640 notice frames (about 64,000), 5.94 million changes and 2.00 million notices
   plus R1's 39,000. Step 8 now uses ACT7's numbers; step 9 keeps ACT4's, and the two differ in the first release
   (ACT4's `DX_ACT4_INITIAL=large` publishes R1 plus the forms from nothing).
6. The four pages name their own branch head as `COMMIT` for their server commands; on the one branch every command
   uses the one build (step 1). `rd5/UNCACHED-READ.md` and `xq3/ID-LISTS.md` say nothing else would change.
7. `stack/up.sh` accepts `DX_REMOTE_READER_HOST` matching `10.*`, `172.*` or `192.*` with any later octets, which is
   wider than the page's "this machine's private IPv4 address" (`172.16/12`, `192.168/16`). The driver passes the
   address; no wrong behaviour on a correct address. Not changed.
8. **`feed-test/http-route` errors on the base too, and has since 2026-11-09.** XQ6's page reports one error in the
   gateway's `feed-test` suite on its base without its changes. It is also on `23b7df344` (rerun here: 13 tests, 82
   assertions, 0 failures, 1 error, with and without `TX2_SWEEP`). It comes from `f909a94f1` (DX-B2 N3, 2026-11-09),
   which made `main/timed` encode every response body to UTF-8 bytes before the elapsed-time header is taken; the test
   (`feed_test.clj` line 87) still reads `(:body response)` as a string (`ClassCastException: [B cannot be cast to
   String`). A test fault, not a route fault: the wire answer is the same JSON. Not fixed (no gate runs that suite).
9. The REAL2 production gate's "with options" run (asked for by the merge brief) cannot test the read options: `prep1/manage.py` starts its gateway through `engine.mjs`, which passes none of `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_ID_LISTS` or `DX_SWEEP`. It is reported as a second default run; the options are exercised by the held, pair, permit and aged gates.

### Gates on the merged head (2026-11-24 afternoon)

Mac, toy size, one ordinary heavy token per step, no lease, 18:45 to 21:40 UTC. Counts are results; clocks are
diagnostic. Evidence: `DX-INT4/gates/` in the lab evidence store (`queue.log` lists every case with the head it ran at;
each ha1 case's `image.json` names its image and how it was chosen). The non-ha1 cases ran at `2aa1ad8fa`, `9b4ebba26`
or `093d75bc5`; the commits between them change only the pairs' and the RD5 gate's harnesses, each default off. The
ha1 cases ran at `67cb0eecf` (fault 3's fix, which changes only the ha1 runner). The aged gates ran again at `3f8c135dd` (fault 4's fix, which changes only gate scripts), by image ID. **Every ha1 case
of the first pass is void (fault 3) and is not counted; each was rerun on `sha256:390e96e8…`, the Datomic image built
from this head** (`tx2-dxthin-jre21:98f93dce098bcbcc`, sources `3aa2ef59…`, pinned by `DX_HA1_DATOMIC_RECEIPT`).

| Gate (owner) | Image | Result |
| --- | --- | --- |
| Default card's plan output against `23b7df344` | none | Byte-identical in all six option sets that run; the two refused sets differ only in the source path of the stack line |
| Write-options report against the baseline (`int3/reach-gate.sh`, `REACH_WRITE_OPTIONS_SAME=1`, base `23b7df344`; also against `9e02cf1d2`) | `21a67288…` (recorded by `stack/up.sh`) | Byte-identical, nothing set |
| Lab unit tests (`v01`, `rd1`, `w1`, `ha1` launch hooks, `jvm1`, `actv-lazy/join` frames, ranges, bulk, held, observations) | none | 78 of 78 (73 this morning; the 5 new are ACT5's queue tests) |
| ha1 runner tests (`ha1/*.test.ts`) | none | 27 of 27 (16, plus fault 4's 11) |
| All `actv-lazy/join/*.test.ts` | none | 31 of 31 |
| Identity tests (`w2/wide-ids`, `prep1/ordered-ids`) | none | 5 of 5 |
| SDK (`packages/datomic`, unit; `tsc --noEmit`) | none | 462 passed, 53 skipped; type check clean |
| Core (`packages/core`, unit) | none | 863 of 863 |
| Gateway selftest, prefetch off and on | fixed tag (fault 4) | 29 tests, 54,160 assertions, 0 failures, both |
| XQ3's gateway test (`ids_test.clj`) | fixed tag (fault 4) | 16,460 assertions, 0 failures |
| RD5's `prefetch-test.clj` | fixed tag (fault 4) | Pass (2 batches, 18 subjects, 0 failures) |
| XQ6's gateway suites (`xq6/suites.sh`: selftest, commit-order, cache-key, group, feed, recent, pinned, trace, ids), `TX2_SWEEP` unset and set | fixed tag (fault 4) | 72 tests, 71,161 assertions, 0 failures, 1 error in both: `feed-test/http-route`, which errors on `23b7df344` too (13 tests, 82 assertions, 1 error; contradiction 8). Sweep route unset: 404 `NotFound`. |
| Launch guard (`ha1/guard-check.sh`) | none (dry run) | 117 cases, 0 mismatches; 15 new: each of `DX_ID_LISTS`, `DX_INDEX_QUERY_PERMITS`, `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_REMOTE_READER_HOST`, `DX_SWEEP`, `DX_SWEEP_PERMITS`, `DX_SWEEP_QUEUE_MS`, `DX_SWEEP_CURSOR_SECRET` refused at its own test before the first Docker change, beside admitted controls |
| Fixed shared tags refused (fault 4): `aged-gate.sh`, `rd5/gate.sh`, `rd1/shortcut-gate/gate.sh`, `xq6/suites.sh` with the image unset or set to `tx2-datomic:dx-real2-production` or `dx-prep1-subject-query` | none | All six refused, exit 2, before any Docker change; no gate container created. Admitted controls: the `g-` rows below, started by ID |
| **Read permits after the sweep merge** (`int4/permit-gate.sh`, new): four copies of one toy's read gateway, 2 permits, bound 2, `TX2_SWEEP` unset: `23b7df344`'s source, this source, the source before the sweep merge with the prefetch on, this source with the prefetch on; 40 pinned, 40 current and 40 at-least reads of 8 subjects, then a burst of 24 | `21a67288…` (recorded) | Per phase, every copy took exactly 40 permits, refused 0, left 0 waiting and 2 of 2 permits free; at-least requests 40 in the at-least phase on all four; prefetch batches 40 per phase on both prefetch copies, 0 on this source without it; answers identical to the baseline's. Burst: admitted + refused = 24 on every copy (9 + 15, 16 + 8, 8 + 16, 6 + 18: refusals by the bound vary with timing), 0 waiting and both permits free after. Sweep route 404 on all four |
| `frames-check.ts 256`, `large-release-check.ts 256` (ACT4, ACT3) | none | Pass, pass (counts equal to this morning's; fault 1 fixed) |
| Subject pulls (`int3/reach-gate.sh`), base `9e02cf1d2` and base `23b7df344` | `21a67288…` (recorded) | 22 of 22 identical across this source, the baseline's and this source with the bound; the negative control differs in 22 of 22 |
| XQ3 store gate (`xq3/gate.sh`) | `21a67288…` (recorded) | PASS, 1,654 checks |
| XQ6 gate (`xq6/gate.sh`) | `21a67288…` (recorded) | PASS, 5,917 checks, 0 failures: 472 sweeps, 2,215 pages, 2,513 IDs and 2,939 counted subjects equal to brute force, 15 refusals as expected |
| RD5 gate (`rd5/gate.sh`, ten accounts of 200) | fixed tag `1.0.7745-da00` (`21a67288…`, created 2026-11-21, fault 4) | Pass: 30,548 comparisons over 1,686,030 rows, 0 differences; the four probes 0 wrong, 0 errors (first attempt stopped at a seed save answered "commit outcome unknown"; the seed now resends, `093d75bc5`) |
| **Pair (b): RD5's gate with the waiting-read bound 2, thread counters and at-least reads on both prefetch readers, 16 comparisons in flight** | fixed tag `1.0.7745-da00` (`21a67288…`) | Pass: 30,548 comparisons over 1,686,252 rows, 0 differences; both read windows 0 wrong, 0 errors; 26 at-least reads after live saves, 0 early, 0 wrong echoes; the bound refused 3,646 and 5,969 reads, all retried by the SDK; prefetch 15,200 and 15,705 batches, 0 failures |
| **Pair (c): ID lists and the read prefetch on one read gateway, one permit each, 64 pinned readers, 60 s** | `21a67288…` (recorded) | Pass: 8,480 pinned reads (67,265 rows), all 200, 0 wrong against the reference; 568 steady ID lists at the head and pinned, all exact (3,518 pages answered, 1 page `IndexBusy` by the permit wait, retried); count bursts 32 answered exact, 28 `IndexBusy` (one request per account); nothing refused outside its own bound; prefetch 8,480 batches, 0 failures; 3 seed resends |
| REAL2 production exactness gate: default; with `DX_READ_PREFETCH`, `DX_READ_AHEAD_OFF`, `DX_ID_LISTS`, `DX_SWEEP` | private `tx2-dxthin-native:<attempt>` (`575f1c5e…`, built by the gate itself, run by pinned ID) | Pass, both: 2,836 fields exact, 0 expired. **The options do not reach this gate's gateway** (`prep1/manage.py` runs it through `engine.mjs`, which passes none of them), so the second run is a second default run; the read options are exercised by the held, pair, permit and aged rows instead |
| REAL2 production tape on a loader-aged toy (`real2/aged-gate.sh`): default; with `DX_READ_PREFETCH=1 DX_ID_LISTS=1 DX_SWEEP=1` | `3f13d2c1…` by ID (`tx2-datomic:dx-prep1-subject-query`, created 2026-11-20) | Pass, both, run by ID and recorded (`image.json`: the container ran `3f13d2c1…`): 120 aged rows admitted, a tampered aged row refused, 1,927 fields, final cut 1,289, 840 + 88 offers acknowledged, 0 expired. With the options, the running gateway reports `TX2_ID_LISTS=1`, `TX2_READ_PREFETCH=1`, `TX2_SWEEP=1` (`gateway-options.txt`; read-ahead off is not passed, the container fixes its JVM flags). The first pass (at `093d75bc5`, tag by name, options only in the driver) gave the same counts |
| Settlement-frames gate (`DX_ACT4_GATE=1`), strict | `390e96e8…` | Pass: ACT4's counts (4,272 changes, 1,440 notices, independent rule 72 of 72) |
| Held Publish toy, strict: default; large release; large release settled by bytes; the same with `TX2_SETTLE_PRECONDITION=progress`; bytes with at-least reads (pair 1 of this morning); at-least reads | `390e96e8…` | Pass, all six (the runner's own checks: deadline Publishes inside 1 s, 0 read, visibility or at-least defects, settlement equal to the oracle and the independent rule). |
| Held with an injected stale at-least probe (must fail) | `390e96e8…` | Fails as designed: the injected stale read is caught (`1 !== 0` at the at-least check) |
| ACT5's own cases, first set (control; 39.4/s own saves under head and progress; the nine other accounts saving under head and progress; the admission lane; three kills; pause and pace through a restart; stop under head then finish under progress; same release) | `390e96e8…` | All ten cases pass: head refuses frames while saving and commits none while saving; progress 0 refused, settled while saving; every case 474 changes, 160 notices, independent rule 8 of 8; kill: 3 children killed, finished exact; pause: 0 frames while paused, pace kept |
| ACT5's own cases, second set (guard, rival process, second release mid-settlement with the 150-form release, three accounts under head, progress and the admission lane, delivered once) | `390e96e8…` | Pass: progress 0 refused everywhere; three accounts 474 changes and 160 notices each, equal to the independent rule; 20 of 20 creation races one winner; notices delivered once, 0 the second time |
| **Pairs (a) and (d): ID lists and sweeps of the settling account beside settlement with the progress precondition and live saves**, one case per fresh toy | `390e96e8…` | Pass, all three cases. 23.5/s own saves with the nine other accounts: 49 ID-list answers checked at their positions (10,339 IDs equal to the store's history read), 12 sweeps checked. 39.4/s own saves: 64 ID lists, 43 checked at 11 positions (9,073 IDs); 82 sweeps, 13 checked at 12 positions (1,477 IDs), 0 `SweepBusy`. Kill: 60 ID lists, 40 checked at 10 positions (8,440 IDs); 74 sweeps, 12 checked at 11 positions (1,266 IDs). Every case: settlement exact (474 changes, 160 notices, independent rule). Running the three cases on one toy exhausts the toy read gateway's 320 MB heap in the checker's history reads (a harness limit, not a store result) |
| Console gates on a second toy (`DEMO_TOY_NAME=int4`) | `21a67288…` via `stack/up.sh` (gateway mounted) | g12, config 16/16, entities 19/19, query 24/24, journal 7/7, derive 4/4, catalogue 70/70, proof 37/37; 94 at-least requests. The owner's toy on 28580 was not touched |
| Toy cards (`v01/mac.ts`): default; `production-S-noburst` tuned reader, 12 permits | private `tx2-dxthin-managed:<inputs>`, run by pinned ID | Both pass (first attempts of the default refused for room by the memory pool; the run that counts is `n-toy-card-default-t2`) |

**Images that ran from a fixed tag (fault 4) and why they are counted.** The XQ3 gateway test, RD5's prefetch test, the
first selftest and suites runs, the RD5 gate and pair (b) started from `tx2-datomic:dx-real2-production` or
`tx2-datomic:1.0.7745-da00` by name, and their image ID was not recorded. Each of them mounts this head's gateway
source (and, where it uses one, this head's codec spec) over the image's copy. Everything else they take from the image
was compared across every Datomic image in the lab VM (`21a67288…`, `3f13d2c1…`, `da58aea1…` and this head's
`390e96e8…`): the `/opt/datomic` tree hashes to `82738ed5…` in all four, Java is 21.0.13 in all four, and the baked
`codec-spec.json`, `codec-cases.json`, `codec-vectors.json`, `history-range-case.json` and `trace-logback.xml` are
byte-identical in all four (only `trace.jfc`, a recording profile none of these runs uses, differs in `3f13d2c1…`). No
branch has changed `lab/config/datomic`'s Dockerfile or classpath, or those files, since 2026-11-21. So whichever
builder last retagged those names, these runs took the same bytes as this head's own image. 

### Gates on the second push's head (XQ7, ACT7, HA2; 2026-11-24 evening)

Mac, toy size, one ordinary heavy token per step, no lease, 21:25 to 23:17 UTC, at `3d5d2950a` (the merges, the
image-ID fixes for XQ7's suites and ACT7's miniature, and the first push's page). Counts are results; clocks are
diagnostic. Every ha1 case and ACT7's miniature ran on `sha256:58970a61…` (`tx2-dxthin-jre21:5bd0d1f72455bf8b`), built
from this head (sources `83789d1f…`), by ID; the selftest-style runs on the same ID.

| Gate (owner) | Result |
| --- | --- |
| Lab unit tests | 78 of 78 (the first attempt failed 3 `rd1/prepared.test.ts` cases with "Allow 16 GiB of free space on the PGDATA filesystem" while the Mac had 13 GiB free, an environment refusal; rerun at 38 GiB free: 78 of 78; those files are unchanged since the first push) |
| ha1 runner tests (`ha1/*.test.ts`, HA2's "ha1") | 27 of 27 |
| HA2: `recovery-options.test.ts`, `sunday.test.ts`, `catch-up.test.ts` (vitest; includes the default cold-copy script pinned byte for byte) | 13 of 13 |
| HA2: `supervisor.test.ts` | 7 of 7 |
| ACT7: `act7/aged.test.ts` | 2 of 2 |
| All `actv-lazy/join/*.test.ts`; identity tests | 31 of 31; 5 of 5 |
| SDK (`packages/datomic`, unit; `tsc --noEmit`) | 466 passed, 53 skipped (the 4 new are XQ7's question-reader routing); type check clean |
| Core (`packages/core`, unit) | 863 of 863 |
| `frames-check.ts 256`, `large-release-check.ts 256` | Pass, pass |
| Launch guard (`ha1/guard-check.sh`) | 122 cases, 0 mismatches (117 plus XQ7's 5: the question reader admitted, each wrong setting refused beside an admitted control) |
| Gateway selftest; XQ3's `ids_test.clj` (image `58970a61…` by ID) | 29 tests, 54,160 assertions, 0 failures; 16,460 assertions, 0 failures |
| XQ6's suites, `TX2_SWEEP` unset and set | 72 tests, 71,161 assertions, 0 failures, the known `feed-test/http-route` error in both; sweep route unset 404 `NotFound` |
| XQ7's suites (`xq7/suites.sh`), three arms | Unset: 78 tests, 71,220 assertions, 0 failures, the known error; ID list and sweep routes 404 `NotFound`; the guard passes every request. Set (`TX2_READ_IO_COUNTERS`, `TX2_ID_LISTS`, `TX2_SWEEP`): 0 failures, the known error. Queue (`TX2_ID_LIST_QUEUE_MS=200`): exactly the one assertion the page says must fail (`ids_test.clj` line 140: with a queue a second list of a busy account waits instead of being refused) |
| XQ7's option-off check (`xq7/plan.sh`, base `9092eb79d`, the first push's head) | Launch commands identical (7), containers identical (environment, command, image, CPU set, memory, binds, ports), `stack.json` identical apart from creation time and container IDs |
| Default card's plan output against `23b7df344` | Byte-identical in all six option sets that run; the two refused sets differ only in the source path of the stack line |
| Write-options report and subject pulls (`int3/reach-gate.sh`, base `23b7df344`, `REACH_WRITE_OPTIONS_SAME=1`) | Write-options report byte-identical; 22 of 22 pulls equal; the negative control differs in 22 of 22 |
| Read permits (`int4/permit-gate.sh`; this source now carries XQ7's gateway) | Pass: every phase as in the first push (40 permits per phase per copy, 0 refused, 2 of 2 free after; at-least 40; prefetch 40 on both prefetch copies); burst admitted + refused = 24 on every copy; sweep route 404 |
| XQ3 store gate; XQ6 gate | PASS, 1,654 checks; PASS, 5,917 checks (472 sweeps, 2,215 pages, 2,513 IDs, 2,939 counted subjects, 15 refusals as expected), 0 failures |
| **XQ7 gate (`xq7/gate.sh`): byte-equal answers of the question reader and the main reader, restart mid-sweep, behind by design** | PASS, 6,876 checks, 0 failures: **2,794 pages byte-compared** (2,176,978 bytes), 462 sweeps over 2,183 pages, 2,283 IDs compared, 2,914 counted subjects, 3,492 listed IDs; 304 behind-by-design probes |
| XQ7 cache gate (`cache.ts`, `DX_SWEEP_PERMITS=2 DX_XQ7_HOT=700`), once | Pass: 256 pinned readers' storage reads per read on the main reader: controls 0.0001, 0 and 0.0026; with every sweep on the question reader 0.0001 and 0 (2 and 0 reads in 63,647); with the same sweeps on the main reader 0.0014 and 0.003 (25 and 44 in 33,003). 0 row-count changes; all 32 sweeps counted exactly. As on XQ7's page, the toy's displacement is small (its 32 MB cache keeps a set re-read every few ms); the server step (2b) is what measures it |
| REAL2 production exactness gate (default) | Pass: 2,836 fields exact, 0 expired (private image built by the gate, removed after) |
| REAL2 production tape on a loader-aged toy: default; with `DX_READ_PREFETCH=1 DX_ID_LISTS=1 DX_SWEEP=1` (`3f13d2c1…` by ID) | Pass, both: 120 aged rows, a tampered row refused, 1,927 fields, final cut 1,289; with the options the running gateway reports `TX2_ID_LISTS=1`, `TX2_READ_PREFETCH=1`, `TX2_SWEEP=1` |
| **ACT7's miniature** (`act7/miniature.sh`, each phase on a fresh aged toy; aging containers on `58970a61…` by ID) | `unadopted` (no aged seal): **refused** at the first check, "Restored logical head differs". `plain` (the old oracle, `DX_ACT7_PLAIN_ORACLE=1`): **fails** as designed, "the store's facts differ from the oracle's world: pl:s00000000 at release 1". `three` (3 accounts, stream check, all children killed): **pass**; 50 adopted subjects replayed (96 aged rows, 4 probes); 3 of 3 children killed inside settlement and resumed; 0 frames refused; 171 bounded ledger pages, 0 skipped; 164 saves of the other accounts all acknowledged. `ten` (10 accounts, 20 s window): **pass**; 10 children killed and resumed; 0 refused; 307 bounded pages, 0 skipped; the admission lane granted 46 frames |
| HA2's PostgreSQL gate (`hasync1/repair-gate.ts`) with both options (`TX2_HA2_COLD_CORES=0-1`, `TX2_HA2_COLD_PIPELINE=1`), once | Pass: 43 of 43 acknowledged inserts present after the kill and promote; the replacement synchronous; the damaged byte refused by the pipelined copy (the clean copy verified, 8 workers); every cold copy recorded `cold-cores` and then `cold-cores-restored` |
| Held Publish toy, strict, default; settlement-frames gate, strict (image `58970a61…` via receipt; `image.json` `chosenBy: receipt`) | Pass, both: the held default's eight windows inside their deadlines with 86 changes and 8 ledger entries equal to the oracle; ACT4's counts (4,272 changes, 1,440 notices). Both first refused a dirty checkout while `xq7/plan.sh` ran (fault 5) and were rerun after every other gate |

## What the 2026-11-25 merges put on the branch

| Merge | Commit | What it brings |
| --- | --- | --- |
| Step 0 | `371d30c90` | The 58 stored-function identities of `23b7df344` restored (RD5's `lean.clj` hook, XQ6's `admission.clj`); `int5/idents.sh`, `idents.clj`, `compare-idents.py` |
| `exp/DX-ACT6-release-limits` `b0529e87d` | `0c1dde07e` | The ledger of a subject owing 200 forms or more in parts (`TX2_NOTICE_LEDGER=parts`), definitions by reference (`TX2_RELEASE_DOCS=ref`), the kernel's cap on forms and policies 512 → 8,192 (**not an option**: in force for every release), typed refusals at the real full-document limits (in force); `ledger-check.ts`, `definitions-check.ts`, `release-limits-gate.ts`, `read-cost.ts`; `actv-lazy/RELEASE-LIMITS.md` |
| `exp/DX-SCALE2-wide-thin` `3e3e652b9` | `191c9b022` | `TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS`, `TRIPLEX_DATOMIC_SHARED_AGENT`, `TX2_SWEEP_GATE_EVICT` (`DX_SWEEP_GATE_EVICT`), `TX2_ENROL_BESIDE_SAVES`; the miniature (`scale2/mini.ts`, `mini.sh`), `scale2/server.sh`, `gates-test.sh`, `sweep_gates_test.clj`; `scale2/SCALE2.md` |
| `exp/DX-S4-real-mix` `2d78680f7` | `c081516a1` | The product save path (`orderedSaves`, `saveSizeRule`; S2), several owners (`TX2_SUBJECT_SEVERAL_OWNERS`, `severalOwners`; S3), whole-subject import (`TX2_IMPORT_WHOLE_SUBJECT`, `TX2_IMPORT_COMMIT_US`; IMP2), creation saves (`TX2_SUBJECT_CREATE`, `creationSaves`; S4), tape M; the card's identity check fix for wide-writer arms (`v01/adopted.ts`); pages `s2/PRODUCT-SAVES.md`, `s3/SEVERAL-OWNERS.md`, `imp2/WHOLE-SUBJECT.md`, `s4/CREATION-SAVES.md` |
| Identities | `8b44422f7` | The owner-head and general-hint functions restored after S2's planner edit |
| `exp/DX-RPT1-sql-reporting` `f084d5adb` | `94d05e2f1` | The reporting copy (`packages/reporting`: projector, schema, views, CLI) and the gateway's opt-in `omitProtected`; `rpt1/SQL-REPORTING.md` |
| Identities | `04c1dc4d0` | RPT1's omitting function moved to `omit_protected.clj` (late hook) |
| Launch | `b43413000`, `1df7e4f7e` | `DX_SWEEP_GATE_EVICT` refused before the first Docker change; S3's and IMP2's early refusals name their setting; 12 launch guard cases |
| Pair (a) | `526ae9a6d` | `DX_INT5_PAIR_A=1` in the RPT1 gate; the gate's expected Datomic image is the launcher's own (the receipt's when given) |
| Production gate | `356608926` | A product-path save's failure reason names the gateway's status, code and message (the first tape M run's one rejected save had none recorded) |
| `exp/DX-B2-key-deletion` `46a8f746a` | `59e10e754` | The fix of R3: one pending removal no longer stops the deletion of the other published removals' keys (`envelope.clj`, `failures.clj`); `b2-keys/` (the gate: `b2.sh`, `b2.clj`, `paired.clj`, `lines.clj`, `stack.sh`, `gate.sh`). **Merged alone onto `1ed2650bd` and pushed first** (`212853708`), as the coordinator asked |
| `exp/DX-B2R-key-deletion-review` `801ef756a` | `212853708` | The review's tests only: `b2r/` (`REVIEW.md`, `scenarios.clj`, `fuzz.clj`, `lines2.clj`, `run.sh`, `stack.sh`) |
| The key fix into this round | `8a362ac38` | `212853708` merged into the batch-1 head; no conflicts |
| `exp/DX-XQ10-questions-connected` `f078320a2` (second batch) | `81488450d` | XQ10 with XQ9 (question shapes), XQ8 (console page and agent tools) and XQ4 (the commit-time index and `find`: `TX2_CROSS_INDEX`, `TX2_SWEEP_SHAPES`, `TX2_INDEX_HINTS`; SDK `askPage`, `askAll`); `xq10/QUESTIONS-CONNECTED.md` |
| RPT1 gate: pair-find | `912813888` | `DX_INT5_PAIR_FIND=1` with `DX_CROSS_INDEX=1`: seven attributes declared on both stores and backfilled, six whole subjects imported, a dry-run backfill that must add and retract nothing, then the reporting copy's SQL, the sweep and `find` compared at one watermark (at least 30 comparisons) |
| Launch | `631dd9d3c`, `221108d6b` | `DX_CROSS_INDEX`, `DX_ID_LIST_QUEUE_MS`, `DX_ID_LIST_PER_ACCOUNT`, `DX_SWEEP_SHAPES` refused before the first Docker change; 6 launch guard cases |
| Batch 1 into batch 2 | `a2f1f4856` | `8a362ac38` merged into the XQ10 line; no conflicts |
| RPT1 gate | `9f2a4c431` | With pair-find on, the kill and two-projector replays end where the clean copy ends (pair-find imports after `P_H`) |
| Readiness page | `f633233f6` | This page (pushed with the second batch) |
| `exp/DX-API1-api-call-reads` `2bba5e360` (third push) | `d3f66ca1d` | The batched read route `POST /v2/db/{db}/batch` (`TX2_READ_BATCH`), the SDK's `CallReads` loader with its memo, `stopAt`, the entity cache's drops at a removal, the definitions cache; `api1/API-CALL-READS.md`, `api1/cache-gate.ts`. Conflicts (both sides kept): `demo/server/profile.mjs`, gateway `main.clj` (`batch` required after `uncached`; `sweepGates` beside `readBatch`), `uncached.clj` (`touch-all!` beside XQ10's hook), `DatomicClient.ts` (the batch route among the busy-retry routes beside XQ7's question route). **As merged it moved all 17 stored identities with every option off** (its `privacy.clj`, `entity_cache.clj` and `reach.clj` changes compile before `commit.clj`); restored in the late-hook form in the same merge commit: `privacy/drop-hook`, `reach/ref-attr-hook` and `reach/stop-at-hook` are vars called through `when` and `if`, and API1's code moved unchanged to `removal_drops.clj` and `reach_late.clj`, loaded after `commit.clj` |
| Launch | `dbade70c7` | Guard cases: `DX_READ_BATCH` admitted, its bad value refused before the first Docker change |
| Second batch's page | `4b3f0bc32` | `f633233f6` merged into the API1 line |
| The batched read | `ee9d5da5a` | `batch.clj` binds admission's `*own-pool*` to the function that runs admitted work (it bound `true`, which step 0 had made a function: every batch failed) |
| Readiness page | `fc668ac69`, `9eda0a935` | API1 on this page (third push) |
| `exp/DX-S6-save-line-fixes` `cdfc70e02` (fourth push), default off | `dc0bd5696` | Decided or unknown outcomes with lookup and fence (F1), the estimate and `TX2_READ_SET_BOUND` (F2), one refusal code for a save racing a removal (F3), creations against earlier removals (F4, F11), the card's check (F5), F6, one stored form per ID, the account setting `TX2_ACCOUNT_CLAIMS` (stays off); `s6/SAVE-LINE-FIXES.md`. Conflicts (both sides kept): gateway `main.clj` (XQ4's find fallback beside S6's named cause), `storage.clj` (XQ4's index-entry bound beside S6's read-set bound; the decided codes of ACT6 and S3 beside S6's unknown rule), `subject_save.clj` (the same F6 restoration on both sides, kept once), `DatomicClient.ts` (XQ4's index routes beside S6's idempotent protection resend). Identities: 58 of 58 |
| `exp/DX-S5-save-line-review` `c85a0d0b3` | `12937e7bc` | The third review of the save line and its tests (lab only) |
| Production gate | `d144ab6d3` | The transactor's warnings, errors and Triplex refusals printed into the gate's log before the container goes (the one rejected save of tape M could not be traced) |
| Batch fix and the API1 page into the save line | `93511c42d`, `ecbba0def` | — |

**Conflicts and how each was resolved (both sides kept every time).** ACT6: `ha1/local.ts` (HA2's second-failure holder
beside ACT6's release-limits holder). SCALE2: `stack/up.sh` (SCALE2's `DX_SWEEP_GATE_EVICT` beside XQ7's per-role sweep
queue), gateway `main.clj` (SCALE2's `sweepGates` beside RD5's `readPrefetch` and XQ7's question-reader entries in
`scan-stats`), `DatomicClient.ts` (XQ7's question reader URL beside SCALE2's shared agent). S4: `ha1/local.ts` (IMP2's
whole-subject snapshot holder beside ACT5, HA2 and ACT6's), `real2/aged-gate.sh` (INT4's read options beside S3's owners
and S4's tape M; S4's private port), `stack/up.sh` (INT4's early refusals beside S3, S4 and IMP2's writer options),
gateway `main.clj` (requires: S3's and S4's namespaces before `uncached`, which stays last for step 0; write options:
RD5's entries beside IMP2's), `DatomicStorageAdapter.ts` (imports of both), `index.ts` (XQ7's `questionReaderUrl` beside
S2's and S3's options). RPT1: none. The key fix: none, both times. XQ10 (five): `prep1/manage.py` (holders, staged files, image tags and the
record of S2, S3, S4 beside XQ4's; `DX_XQ4_CROSS_INDEX` also admitted under the DX-S4 holder, for tape M with creation
and the index on), `prep1/production-gate.ts` (XQ4's declare-and-backfill before the seed beside S2's product path;
`crossIndex` in the `REAL2_GATE` line), `real2/aged-gate.sh` (S2's private name and port; INT4's read options, S3's
owners and S4's tape M beside XQ4's index), gateway `main.clj` (requires: S3's, S4's and RPT1's namespaces, then XQ4's
`cross-find` and XQ10's `index-hints`, then `uncached` last for step 0; scope open installs both; the error answer
carries `estimatedMicros` and `fallback`), `storage.clj` (`cross-index` beside S3's and S4's late requires; IMP2's import
bound beside XQ4's index-entry frame bound).

**Faults found in this merge (all fixed on this branch, except as stated):**

1. **The stored-function identities moved three times** (step 0, above): by the afternoon merge (RD5 and XQ6), by the
   save line (S2's planner), and by the reporting copy (RPT1's `privacy.clj`). Each restored before any gate ran.
   Lesson for every builder: any edit to a namespace that compiles before `commit.clj` (privacy, envelope, erase,
   group, group-prepare, trace, save-ledger, pinned, group-cut, recent, entity-cache, lean, journal, stats, admission,
   and everything they require) can move the stored functions; only a stored-log or identity comparison between heads
   sees it.
2. **`stack/up.sh` checked SCALE2's `DX_SWEEP_GATE_EVICT` only in the gateway loop**, after PostgreSQL and the
   transactor had started (the same fault as the afternoon's fault 2); fixed (`b43413000`). S3's and IMP2's early
   refusals exited without a message; each now names its setting.
3. **This merge's own harness fault, found and not counted:** the first run of the production exactness gate
   (`b-production-t1`) exported the head image's receipt to `engine.mjs`, whose Datomic selftest then took the receipt's
   image and ran the plain gateway selftest (29 tests, 54,160 assertions) instead of the production gate (no
   `REAL2_GATE` line). It exited 0 and is not counted; rerun with the receipt passed only to `stack/up.sh` gates.
4. **This merge's harness faults, not counted as results:** (a) the w0 kernel's built copy (`packages/w0/dist`, not
   tracked) still had the cap of 512 after the ACT6 merge, so ACT6's ledger at 1,000 forms stopped at "release forms";
   rebuilt, the rerun passed. Any checkout of this branch must rebuild `packages/w0` before ACT6's checks. (b) ACT6's
   harness leaves its `oracle.py` child running after an error, which keeps the engine (and a heavy slot) alive; killed
   by hand. (c) Pair (a)'s first run set `TX2_IMPORT_COMMIT_US=8000`, below the gate's own multi-subject creation
   commit (31,914 µs estimated; the bound covers commits without claims, as IMP2's page says); rerun at the default.
   (d) Editing a running queue script broke one exit line (bash reads scripts as it runs); scripts are copied, never
   edited, since. (e) The harness took "the newest receipt" as the head's image; a receipt for the key fix's image
   landed in the same folder while queues ran. The running queues had fixed their image at start, so no case took it;
   the final head's queues name their receipt.
5. **Open: tape M with creation off rejected one save in 4 runs** of one deterministic tape ("Datomic transaction was
   rejected"; the gateway's code was not recorded then; it is now, and three reruns passed). See R9.
6. **Harness faults of the final head's gates, not counted:** (a) the final lanes' case script was not executable; every
   case failed before starting and nothing ran; restarted. (b) The XQ4 world ran XQ10's agreement phase without
   `XQ4_SWEEP_SHAPES=all` (XQ10 section 4 runs the sweep with every shape on), so the sweep refused and the phase
   stopped; `xq4/gate.sh` still exited 0 (it does not carry a phase's exit), so read each `XQ4_EXIT` line. Rerun with
   every shape on. (c) This merge's pair-find imported after the RPT1 gate's replays stopped (fixed, `9f2a4c431`).
   (e) The second toy for the console ran without `DX_XQ3_ERASURE_DIRECTORY=1`, which XQ10's questions proof needs
   (`demo/toy/README-FOR-CONSOLE.md`): with no erasure directory the gateway answers every protection declaration 503
   `ErasureFrontierUnavailable` at once (`privacy/path`), on any head. Rerun with it.
   (d) The B2 gate's suites phase loads every `*_test.clj` of the head with every option off, so on a head with XQ9's
   `sweep_shapes_test` (which needs `TX2_SWEEP_SHAPES=all`) and a base without `cross_index_test` it cannot pass;
   XQ10's suites cover those tests in their arms. The standing gate is run with `B2_GATE_PHASES="b2 paired scenarios
   fuzz lines"` and the paired base set to the one branch's previous head.
7. **Gates that decide on a reply's message text rather than its code** (asked for before the N1 key-pool fix, which
   changes reply texts with every option off): `rpt1/gate.ts` 110 (retries while the message reads "Transactor not
   available"), `s2/gate.ts` 271 (code `InvalidValue` and message "Request too large"), `scale2/mini.ts` 146
   (`/DUPLICATE|AlreadyCommitted/` in code and message), `actv-lazy/join/account.ts` 918 (`/Request too large/`, the
   Publish path's size fallback), and the console's `examples/demo-mcp/src/query.ts` 168 (`/deadline/` in the message
   gives its "Deadline" answer).

**Contradictions between pages and code** (the pages are left as their builders wrote them):

1. `xq10/QUESTIONS-CONNECTED.md` section 3 says 58 of 58 identities equal the base after its fix. Its base
   (`2ef4cb3c4`) already carried XQ6's `admission.clj` change, which moves all 17 against `23b7df344`; on the XQ10 line
   alone they differ from the one branch's state before the afternoon merge. On this branch both causes are fixed.
2. `s4/CREATION-SAVES.md` (builders' note) says the line differs from the one branch in 5 identities "of the owner-head
   and general-writer hint functions" and asks for the cause: S2's planner edit in `subject_save.clj` (one `and` clause
   fewer); the save review's F6 pins the same. Restored.
3. `rpt1/SQL-REPORTING.md` says that with `omitProtected` unset every reader gets byte-identical answers. True of the
   answers, but its `privacy.clj` edit moved all 17 stored identities with every option off; its suites compared
   answers, not identities. Restored.
4. `actv-lazy/RELEASE-LIMITS.md` lists the kernel's cap of 8,192 forms and policies among the limits without saying it
   is not behind an option: on this branch it is in force for every release.
5. `s2/PRODUCT-SAVES.md` section 8 and `s3`, `s4` refer to "step 2", "step 3" and "step 8" of the eleven-step list of
   2026-11-24 morning; the session list here renumbers them (mapping in the session section).
6. The old session list labelled HA2's failover steps "P4"; failover is P9.
7. `scale2/SCALE2.md` and `rpt1/SQL-REPORTING.md` name their own branch heads as `COMMIT`; on the one branch every
   command uses the one build.
8. The miniature (`scale2/mini.ts`) sends its saves as raw wire commits, not through the SDK adapter, so the SDK's save
   options (`orderedSaves`, `severalOwners`, `creationSaves`) and tape M cannot be turned on in it (pair (d) below).
9. **Between two instructions to this merge:** one listed `exp/DX-API1-api-call-reads` `2bba5e360` for the second
   batch; the later ones said not to merge API1 then. It was merged afterwards, on its own, as the third push.
11. `api1/API-CALL-READS.md` says nothing changes with its options unset. True of the answers, but its inline code in
    `privacy.clj`, `entity_cache.clj` and `reach.clj` moved all 17 stored identities with every option off (restored
    here); its gates compared answers, not identities.
10. `xq10/QUESTIONS-CONNECTED.md` says its console proofs were not rerun at its final head. On this branch they were
    rerun on a second toy at the final head (gates below).

## Gates of the 2026-11-25 merge, with the image each ran

All on the Mac's lab VM at toy size; no measurement lease, ordinary heavy tokens, other builders' stacks running beside
(no timing here is a result). A stack gate counts only where the image ID its containers ran is the one built from the
head under test. Evidence: `DX-INT5/gates/` (one folder or `.out` per case, `queue.log` with each start, head and exit).

**Images.** Batch 1 (`356608926`): `e12e228f3154…` (`tx2-dxthin-jre21:b641b932adff3404`, engine build, receipt
`datomic-image-receipt-1df7e4f7e.json`; the gateway sources are the same through `356608926`), the native production
image `fe26dbb9f91b…` (built by the production gate from the head's staged checkout), and images the production and
card gates built for themselves (named per row, removed after). The key fix (`212853708`): `678f26751595…`
(`tx2-dxthin-jre21:92d958a1f68719f7`, receipt in `DX-INT5/key/`), removed after. The final head: `dccde0babe20…` (`tx2-dxthin-jre21:089ca04f8ce8878a`, engine build from `a2f1f4856`, receipt `DX-INT5/final/`; the gateway sources of `9f2a4c431` are the same, that commit changes only the RPT1 gate), the native image `d00f228e68f6…` (built by the production gate from the head, removed after its users) and `15aa2789b26b…` (built again for the XQ4 world's rerun, removed after).

### The key fix, alone (`212853708`, pushed first)

| Gate | Result | Image |
| --- | --- | --- |
| Stored-function identities against `1ed2650bd` | **58 of 58 equal in all 8 writer settings, 0 new keys: the fix moves nothing** | `58970a61` by ID, the tree mounted |
| `b2-keys/gate.sh`, phase b2 (`era2/b2.clj` on both authorities) | **16 checks, 0 failed on the file and the PostgreSQL authority**; the base `1ed2650bd` fails 2 on each (the fault) | `678f2675` |
| phase paired (removals, and none) | native log, replies and the key store after a shred pass **identical** to the base's | `678f2675` |
| phase suites | 78 tests, 71,220 assertions, 0 failures, the 1 known error: equal to the base | `678f2675` |
| B2R scenarios | 43 checks, 0 failed, on file and on PostgreSQL | `678f2675`; PostgreSQL `526f86d9` |
| B2R fuzz | 20,000 schedules from seed 1,000,000 on each authority: **0 violations** (file: 68,620 I1 and 166,548 I2 checks) | `678f2675` |
| lines | 10 checks, 0 failed (one line per five failures, SQL state and server text only, no statement, parameters or key bytes) | `678f2675` |

**Standing gate from now on**, on every head of the one branch: `bash lab/experiments/EXP-DX1/b2-keys/gate.sh OUT BASE`
with `DX_B2_IMAGE_ID=<the head's image>`. Phases b2, scenarios, fuzz and lines with `BASE=1ed2650bd` (the b2 phase shows
the fault on that base); phase paired with `BASE=<the one branch's previous head>` (from `1ed2650bd` the native log
differs by step 0's restored functions alone). The suites phase is not used after XQ10 (fault 6d below). Under today's rule a pending removal still makes every request answer 503 until the client resends; that
is unchanged by this fix and is an open decision for the owner.

### Batch 1 (ACT6, SCALE2, S4 with S2, S3 and IMP2, RPT1) on `356608926`

| Gate | Result | Image |
| --- | --- | --- |
| Stored-function identities against `23b7df344` | 58 of 58 equal in 8 settings (8 new keys: S3's and S4's functions, installed only with their options on); with the key fix (`8a362ac38`) the same, and 66 of 66 equal to the head without it | `58970a61` by ID, the tree mounted |
| XQ4's G8 paired stored log | 33,609 datoms, head 620, hash `0569a8f8…` = `23b7df344`'s (`1ed2650bd`: `dc408264…`, 6 datoms differ) | `fe26dbb9` |
| IMP2's option-off digest against `23b7df344` | **identical** (defaults and v01: 12 frames, 3,532 datoms); against `1ed2650bd` it differs in both, an independent confirmation of step 0 | `fe26dbb9` |
| Plan output, options off | 6 of 6 running option sets byte-identical to `23b7df344`'s; the 2 refused sets differ only in a stack-trace path | none (planner) |
| Reach (write options) | 22 of 22 equal, the control differs 22 of 22, `writeOptionsSame` true against `23b7df344` | `e12e228f` |
| Permits | every phase 40 permits per copy, 0 refused; bursts total 24 | `e12e228f` |
| Unit (v01, rd1, w1, ha1 hooks, jvm1, join) | 79 of 79; join with the new kernel 31 of 31; ids 5 of 5; ha1 27 of 27; IMP2 snapshot 6 of 6 | — |
| SDK; `tsc`; core | 473 passed, 53 skipped; clean; 863 of 863 | — |
| Gateway selftest; ids test | 29 tests, 54,160 assertions, 0 failures; 16,460 assertions, 0 failures | `e12e228f` |
| XQ6, XQ7, RPT1, SCALE2 suites | 72 / 71,161, 0 failures, the known feed-test error; 78 / 71,220 as XQ7's page (the one designed queue failure); 76 / 71,176, 0 failures, the known error; 34 / 70,629, 0 failures, 0 errors | `e12e228f` |
| XQ3, XQ6, XQ7 question routes | 1,654; 5,917; 6,876 checks, 0 failures | `e12e228f` |
| Production exactness, default | 840 R + 88 S acknowledged, 0 expired, 2,836 fields | `9c9a97cc` (the gate's own, from the head; removed) |
| Aged gate, default | 120 aged rows, tampered refused, 101 writes over aged, 1,927 fields | `fe26dbb9` |
| Production, tape M, creation on | 2,836 fields; tape M 360 of 360, 0 expired, 290 created; writers from the gateway's counts: per-subject 360, general 0 | `b8f6862c` (the gate's own; removed) |
| Production, tape M, creation off | **1 rejected save in the first of 4 runs** (open, R9 row); runs 2 to 4 pass: 360 of 360, writers per-subject 23, general 337 | the gate's own each (removed) |
| Aged gate, product path, wide, owners, tape M, creation on | 128 aged rows, 2,254 fields; tape M 270 of 270, writers per-subject 270, general 0 | `fe26dbb9` |
| ACT6 ledger at 200, 500, 1,000 forms | pass at all three (1,000: 16 subjects, 16 stops, 5 inside parts, 6 parts each, 16,000/8,000/24,016 notices; independent rule equal); the first run's 1,000 stop was the stale kernel copy (fault 4a) | `e12e228f` |
| ACT6 definitions, four sizes | by reference 3.5 KB at 1,000 to 5,000 forms (4 changes); full documents refused typed above 1 MiB | `e12e228f` |
| ACT6 ledger-check, definitions-check | pass: 72 subjects, 6 rows equal to ACT6's published `ledger-check-72.json` row for row (forms, mode, notices, frames, splits, checks between frames, parts, the whole-ledger refusals); definitions output equal to ACT6's `definitions-check.json` | — |
| Frames check; large-release check | 11 of 11 release pairs identical to ACT4's; pass | — |
| Settlement gate, strict | 4,272 changes, 1,440 notices; independent rule equal | `e12e228f` |
| Held runs, `TX2_SWEEP_STRICT=1` | default, bytes/large/progress, at-least: pass | `e12e228f` |
| ACT5 cases | ten of set 1 pass (progress 0 refused; head 158, 140, 123); set 2 pass (guard: 20 race pairs, one won each; rival and second 0 refused, exact 474 changes and 160 notices; three accounts: head 82 of 84 refused, progress 0 refused; delivered 1,848 once, 0 again) | `e12e228f` |
| IMP2 gates | memory and PostgreSQL 6 tests, 272 assertions each; removal gate 1 test, 28 assertions | `fe26dbb9` |
| S2, S3, S4 gate sets (with IMP2's) | S2 b, c, d and the size rule pass with the wide writer on and off (product-qualifying 6 and 2 of 11; gate (a), byte identity against the commit before S2, needs a build of that commit and is not rerun); S3 in-memory 255, 255, 269 assertions and both arms ok (owners 1 to 4: 20 of 25 per-subject each, off: 0 of 25 for 2 to 4); S4 in-memory 144, 144, 146 and arms before, SDK-only, after ok, 50 judged each, 0 unexpected, 9 containers all `e12e228f` | `e12e228f` |
| RPT1 gate with its file scan | 606 checks, 0 failures; 2,362 files, 0 protected occurrences (the control finds 11) | `e12e228f` |
| SCALE2 563-account miniature | options off: 560 accounts, 2,319 saves, 0 refused, 172,810 rows read; with SCALE2's three options: same counts, sweep gates 0 left after 63, sockets 4 to 69 | `e12e228f` |
| Console gates, second toy | all pass (config 16, entities 19, query 24, journal 7, derive 4, catalogue 70, proof 37) | by receipt (ID not kept on this run) |
| Toy cards | default: pass (managed `ab378e13`, removed); tuned reader (`production-S-noburst`, 12 read permits): pass, 0 expired, quiet 28 of 28 and 42 of 42 (managed `7e4ad8a2`, removed; five tries refused for room first) | managed, from the head |
| Launch guard | 134 cases, 0 mismatches (12 new: each new option admitted, its bad value refused before any Docker change) | — |

### The pairs

| Pair | Result |
| --- | --- |
| (a) the reporting copy while whole-subject imports run | **pass**: 12 subjects × 24 facts imported whole while the projector followed; 150 polls, each one repeatable-read transaction, saw every subject at 0 or 24 facts only; 12 watermarks, the copy equal to the store's history at each (24,450 facts compared); 620 checks (`e12e228f`) |
| (b) tape M with settlement beside it | **not built**: needs tape M and the product saver in ACT5's `play()` and oracle |
| (c) the ledger in parts beside the reporting projector | **not built**: needs ACT6's ledger machinery beside RPT1's projector in one gate |
| (d) the miniature with the save options | **partial pass**: 560 accounts with the write gateway's `TX2_SUBJECT_WIDE`, `TX2_SUBJECT_SEVERAL_OWNERS`, `TX2_SUBJECT_CREATE` on: 2,319 saves, 0 refused, every read exact; tape M and the SDK's save options cannot be turned on in the miniature (raw wire saves) |
| XQ10's: the index against the reporting copy and the sweep (RPT1 gate, `DX_CROSS_INDEX=1 DX_INT5_PAIR_FIND=1`) | **pass** (rerun at `9f2a4c431`): seven attributes declared and backfilled on both stores, six whole subjects imported, the dry-run backfill added and retracted nothing, and 90 questions answered by SQL on the copy, the sweep and `find` at one watermark and three valid times, all equal; the rest of the RPT1 gate 699 checks, 0 failures (`dccde0ba`). The first run (`a2f1f4856`) failed two checks only because this merge's own addition imported after the gate's replays stopped (fixed in `9f2a4c431`) |
| XQ10's: tape M with creation and the index on (production gate, `DX_XQ4_CROSS_INDEX=1`) | **pass, exact**: R 840 of 840, S 88 of 88, tape M 360 of 360, 0 expired, 290 created, readback 313 owners and 3,030 fields; six attributes declared, the dry-run backfill added and retracted nothing (508 entities), 738 questions over 738 pages. **Finding:** with the index on every tape M save declined the per-subject and creation writers ("protected-values-or-frame") and took the general writer (per-subject 23, general 337, as with creation off); without the index they took the per-subject writer (360, 0). Cost not measured (image `ef8c9bd4`, the gate's own, removed) |

### The final head (`9f2a4c431`; gates at `a2f1f4856` and reruns at `9f2a4c431`, same gateway sources): batch 1, the key fix and XQ10

| Gate | Result | Image |
| --- | --- | --- |
| Stored-function identities against `23b7df344` | **58 of 58 equal in all 8 writer settings**; 12 new keys (S3 4, S4 4, XQ10's index hints 4), installed only with their options on | `dccde0ba` by ID |
| XQ4's G8 paired stored log | 33,609 datoms, head 620, `0569a8f8…` = `23b7df344`'s, the index code present and off | `d00f228e` |
| Plan output, options off | 6 of 6 identical, INDEX identical; the 2 refused sets differ only in the path | none |
| Reach (write options) | 22 of 22 equal, control differs 22 of 22, `writeOptionsSame` true against `23b7df344` | `dccde0ba` |
| Unit; SDK; `tsc`; core | 79 of 79; 482 passed, 53 skipped; clean; 863 of 863 | — |
| Launch guard | 140 cases, 0 mismatches (6 new for XQ10's settings) | — |
| Gateway selftest; ids test | 29 tests, 54,160 assertions, 0 failures; 16,464, 0 failures | `dccde0ba` |
| XQ10 suites (unset, index, routes, queue) | 84 / 236,356; 84 / 236,392; 85 / 236,445; 84 / 236,356: 0 failures, the known feed-test error each (= XQ10's page) | `dccde0ba` |
| XQ6, XQ7, RPT1, SCALE2 suites | 72 / 71,165; 78 / 71,224 (all three arms; XQ7's designed queue failure no longer fires on this head); 76 / 71,180; 34 / 70,633: 0 failures, the known error where it was before | `dccde0ba` |
| B2 key gate (standing) | b2 16 checks, 0 failed on both authorities (base `1ed2650bd` 2 failed each); scenarios 43, 0 failed, both; fuzz 20,000 schedules, 0 violations, both; lines 10, 0 failed. Paired against `8a362ac38`: native log, replies and key store **identical** with removals and without. Against `1ed2650bd` the native log differs (datom counts and replies equal): step 0's restored functions. Its suites phase is not a result on this head: `1ed2650bd` has no `cross_index_test`, and `sweep_shapes_test` needs `TX2_SWEEP_SHAPES=all` (XQ10's suites run it so) | `dccde0ba` |
| Production exactness, default | R 840 of 840, S 88 of 88, 0 expired, 2,836 fields | `d00f228e` (the gate's own) |
| Aged gate, default | 120 aged rows, tampered refused, 101 writes over aged, 1,927 fields, cut 1,289, 0 expired | `d00f228e` |
| XQ10's stacks (xq3, xq6, xq9 off and shapes, xq7, the question reader, refusals) | every step passed; the reader: 5,783 checks, 36 refused byte-equal on both readers, 36 the index refused and the sweep answered, 0 failed; refusals 9; every container ran the pinned image and the gateway source hash of this tree | `dccde0ba` |
| XQ4 world with XQ10's agreement gate (`XQ4_SWEEP_SHAPES=all`, rerun at `9f2a4c431`) | every phase exit 0 (g3, d3, b1, g6, the two worlds' seeds, declarations, groups and more saves, the index replay, g2, check, g4, g5, e1, sweep, edges, agree, table); **agreement: 4,626 questions (2,361 IDs, 2,023 counts, 242 counts per value) at 3 positions and 3 valid times, 0 differences, 0 refused**, 11,003 find pages and 14,134 sweep pages (= XQ10's page: 4,626, 0); the first run left the shapes off (fault 6b) | `15aa2789` (the native image, built by the production gate from the head, removed after) |
| Console gates and XQ10's console proofs, second toy (index on, `DX_XQ3_ERASURE_DIRECTORY=1`; rerun at `9f2a4c431`) | **XQ10's questions proof 2,599 of 2,599** (54 questions on both routes and auto, 324 questions, 1,305 IDs compared, 8 questions whose answer changes across cuts; XQ10's page reported 2,603 at an earlier commit); the console's gates: g12, config 16, entities 19, query 24, journal 8, derive 4, catalogue 80 (with `ask_across_subjects` and `indexed_attributes`), proof 37. The first two runs left the erasure directory off (fault 6e) | `dccde0ba` (transactor and both gateways, recorded while the toy was up); PostgreSQL `526f86d9` |
| Toy card, default | pass, 0 expired, quiet 28 of 28 and 42 of 42 (the toy's loaded quiet p99 7.3 times alone under other builders' load: diagnostic, never a verdict on the Mac) | managed, from the head (removed) |

### API1 (`ee9d5da5a`; image `7ba83d89f36f…`, `tx2-dxthin-jre21:3bb08577e15b2180`, built from `dbade70c7`; the only gateway change since is `batch.clj`'s fix, used only by the batch route, which API1's own gates ran on the fixed source)

| Gate | Result | Image |
| --- | --- | --- |
| Stored-function identities against `23b7df344` | **58 of 58 equal in all 8 writer settings** (as merged, before the late form: 17 moved) | `7ba83d89` by ID |
| B2 paired phase against the second batch (`f633233f6`) | native log, replies and key store after a shred pass **identical**, with removals and without: API1 changes nothing with its options off | `7ba83d89` |
| B2 standing gate | b2 16 checks, 0 failed on both authorities (base 2 failed each); scenarios 43, 0 failed, both; fuzz 20,000 schedules, 0 violations, both; lines 10, 0 failed | `7ba83d89` |
| XQ4's G8 paired stored log | 33,609 datoms, head 620, `0569a8f8…` = `23b7df344`'s | the production gate's native image (removed) |
| Plan output; reach | 6 of 6 identical, INDEX identical (the 2 refused differ only in the path); 22 of 22 equal, control differs 22 of 22, `writeOptionsSame` true | none; `7ba83d89` |
| Unit; SDK; `tsc`; core; guard | 79 of 79; 482 passed, 53 skipped; clean; 863 of 863; 142 cases, 0 mismatches (2 new: `DX_READ_BATCH`) | — |
| Selftest; ids; XQ10 and RPT1 suites | 29 / 54,160, 0 failures; 16,464, 0; XQ10 four arms 0 failures and the known error; RPT1 76 / 71,180, 0 failures and the known error | `7ba83d89` |
| Production exactness, default; aged gate | R 840 of 840, S 88 of 88, 0 expired, 2,836 fields; aged pass | the gate's own native image (removed) |
| Console and XQ10's questions proof, second toy | questions proof 2,599 of 2,599; console proof 37 of 37; every console gate | `7ba83d89` (recorded while the toy was up) |
| **API1's gate** (`api1/gate.sh gate,straddle`, at `ee9d5da5a`) | **167,357 comparisons of the batch and the loader against single reads, 0 differences**; refusals as designed (history, row ID lookups, scans, held handles: `BatchUnsupported`); straddle: the product's unpinned path inconsistent in 87 of 334 calls (what API1 measures), pinned, loader and batch 0 of 369, 1,133 and 1,527. **The first run found a fault of this merge** (every batch 400 "Boolean cannot be cast to IFn": step 0 had made `admission/*own-pool*` a function and API1's `batch.clj` still bound it to `true`); fixed in `ee9d5da5a` | API1's runtime image `21a67288…` by ID (it needs node), the head's gateway source mounted |
| API1's parsed-entity cache gate (`cache`, `TX2_ENTITY_CACHE_VERIFY=1`) | 6,208 probes, 0 removed values served, 0 missing; 64 refused, the designed 503s while a removal is pending (32 each, sealed and unsealed) (= API1's page) | `21a67288…`, source mounted (run at `4b3f0bc32`; the cache gate does not use the batch route) |
| XQ10's stacks (xq3, xq6, xq9 off and shapes, xq7, the question reader, refusals) | every step passed; reader 5,783 checks, 36 refused byte-equal on both readers, 36 the index refused and the sweep answered, 0 failed; refusals 9. **xq3's first run stopped once** on 503 `ErasureFrontierUnavailable` right after its scope was created (no gateway exception logged; its write gateway had restarted once at start, unable to read the transactor's location); **rerun alone: 1,654 checks, pass**. Cause not found; open | `7ba83d89` |
| RPT1 gate with its file scan | 606 checks, 0 failures, 8,226 facts compared (the first run did not start: the worktree's install predated `packages/reporting`) | `7ba83d89`, PostgreSQL `526f86d9` |

### The save-line fixes (`ecbba0def`; image `f7992c560738…`, `tx2-dxthin-jre21:837731032577fa24`, built from `d144ab6d3`; the only gateway change since is `batch.clj`'s fix, which no save-line gate uses)

| Gate | Result | Image |
| --- | --- | --- |
| Stored-function identities against `23b7df344` | **58 of 58 equal in all 8 writer settings** (12 new keys as before, installed only with their options on); the merge moved nothing (70 of 70 equal to the API1 head) | `f7992c56` by ID |
| B2 paired phase against the API1 head (`4b3f0bc32`) | native log, replies and key store after a shred pass **identical**, with removals and without (no fault is injected there, so the save line's new replies do not appear) | `f7992c56` |
| B2 standing gate | b2 16 checks, 0 failed on both authorities (base 2 failed each); scenarios 43, 0 failed, both; fuzz 20,000 schedules, 0 violations, both; lines 10, 0 failed | `f7992c56` |
| Plans; selftest; SDK; `tsc`; unit; guard | 6 of 6 identical, INDEX identical; 29 / 54,160, 0 failures; 489 passed, 53 skipped; clean; 82 of 82; 142 cases, 0 mismatches | `f7992c56` / — |
| The save line's `review` step (the second review's tests in five settings; the one-stored-form gate) | second review: 12 tests in each setting, 0 failures (22 to 64 assertions per setting); stored form: 6 tests, 109 assertions, 0 failures in each of 4 settings | `f7992c56` |
| `gates` step | **outcome gate 5 tests, 426 assertions, 0 failures in each of 5 writer settings** (server, general, accounts-on, group, group-accounts); race 22; bound 127; S5's attacks 49 (server) and 151 (import), 0 failures | `f7992c56` |
| `accounts` step (two accounts; 1,000, 2,000 and 2,000 schedules, reduced from 10,000 for slots) | 5 tests each, 0 failures (account setting off, on, with grouping) | `f7992c56` |
| Fuzzer with faults and the second account, option off (`fuzz-faults-4`, ten seeds; the other four settings not run here for slots) | 18,629 serial and 9,000 concurrent saves, 2,113 fault steps, 3,629 shadow saves: **0 differing, 0 unjustified refusals** | `f7992c56` |
| Production exactness, default (the gate now keeps the transactor's warnings, errors and refusals) | R 840 of 840, S 88 of 88, 0 expired, 2,836 fields | the gate's own native image (removed) |
| XQ4's G8 paired stored log; reach; aged gate | `0569a8f8…` = `23b7df344`'s; 22 of 22 equal, `writeOptionsSame` true; 1,927 fields, tampered refused | native (removed); `f7992c56`; native |
| Production, tape M, creation on and off | exact both: tape M 360 of 360, 0 expired, 290 created, readback 313 owners and 3,030 fields; writers per-subject 360 and general 0 (on), 23 and 337 (off); no Triplex refusal in the transactor's lines | the gate's own images (removed) |

## Next server session (one driver, in this order; none has run)

Rewritten on 2026-11-25 after the evening merge (ACT6 release limits, SCALE2 many accounts, S4 with S2, S3 and IMP2,
RPT1 the reporting copy; then XQ10 questions connected), in the owner's order of 2026-11-24: **A. questions across
subjects and the save shape; B. scale** (settlement beside saves, a subject owing 200 forms or more, a release near the
ceiling, many accounts, 1 billion records); **C. the other priorities**, in priority order. No server is rented; a
rental needs the owner's approval in money terms (spend to date USD 247.62 against the USD 200 budget,
`cloud/LEDGER.md`). Cost at **USD 1.09 per machine hour**; every step needs one machine except 26, 32 and 33.

Build the head of `exp/DX-INT1` that carries this page once (step 1); every command uses that one build (`COMMIT` = that
head; the merged pages name their own branch heads, which this build replaces). Environment, copies and the scorecard
parts as `v01/AGED-SERVER-32.md` and `v01/PRODUCTION-CARD.md`; the held runs as `actv-lazy/PART9.md`. Each step's
full predictions and refuters are in its page; the table after the commands gives the headline ones.

**Two rules for every arm below.** (1) An arm that claims a share of saves on the per-subject writer reads that share
from the gateway's own counters (the client's `saveRoutes`, the writer's route counts, the receipts'
`subjectDeclined`), never from the card's identity check passing (R8). (2) A run in which more than one account
publishes uses command IDs that contain the account (R2); the miniature's (`scale2:<run>:<account>:…`) and ACT5/ACT7's
(`<attempt>:act5:<account index>:…`) do. `TX2_RELEASE_DOCS=ref` runs publish from one account only (R4); a ledger in
parts stays within 10 parts per subject (R5; 200 forms is 2 parts, 1,000 forms 6).

**What changed against the list of 2026-11-24 (evening).** The old steps 4 ("Wide": the wide writer measured with the
lab producer) and 6 ("Hints") are **replaced** by the product-path arms (steps 10 to 12): the lab producer sends ordered
blocks the product never sends, so it measured the writer on saves the product does not make (`s2/PRODUCT-SAVES.md`
section 8); arm C carries the hints, so the old hints step folds into it. The index cost pair (old step 7, a
placeholder) is replaced by XQ10's ordered runs (steps 4 to 7). New: the reporting copy (8), tape M with the creation
option (13 to 15), the release-limit runs (20, 21), the many-accounts rungs (22), the import arm (31). The old HA2
steps were labelled P4; failover is P9 (corrected). Old to new: 1 → 1, 2 → 2, 2b → 3, 3 → 9, 4 → 10, 5 → 16, 6 → 10,
7 → 4 to 7, 8 → 17, 9 → 18, 10a → 19, 10b → 23, 10c → 24, 11 → 25, 12 → 27, 13 → 28, 14 → 29, 15 → 30, 16 → 26,
17 → 32, 18 → 33.

| Step | What | Page | Machines | Duration | Cost (USD) |
| --- | --- | --- | --- | --- | --- |
| **A** | **Questions across subjects and the save shape** | | | | |
| 1 | Provision, build at `COMMIT` (`v01/build.ts`: SDK, packages, image), fetch and unpack the sealed 1 billion cluster (145 GB compressed; never timed), the card's dry run (part 1 to its first offer) | `xq10/QUESTIONS-CONNECTED.md` §8 row 0; `v01/CARD-READER.md` §7 | 1 | 40 to 75 min | 0.73 to 1.36 |
| 2 | **Bring-up 1** of the 1 billion working copy (`DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all`, six sweep permits): the journal probe first, then the **ID lists** (A), then the **sweep arms** A, B and C (D; arm B writes, so last); then down | `xq3/ID-LISTS.md` §5; `xq6/EXACT-SWEEP.md` §6; `xq9/QUESTION-SHAPES.md` §6; `jrn1/JOURNAL-BOUNDS.md` | 1 | 50 to 96 min (bring-up 3 to 12, probe about 3, A 3 to 10, D 40 to 70, down 1) | 0.91 to 1.74 |
| 3 | **Bring-up 2**: the question reader (XQ7; XQ10's E) | `xq7/QUESTION-READER.md` §6 | 1 | 31 to 57 min | 0.56 to 1.04 |
| 4 | **The commit-time index: backfill of the 1 billion database** with exactness samples (XQ10's B) | `xq4/COMMIT-INDEX.md` S-1 | 1 (its own copy) | 90 to 240 min | 1.64 to 4.36 |
| 5 | **The index: the save pair judged against the bars** (XQ10's C), two copies of the backfilled database; optional third arm `TX2_INDEX_HINTS=1` (57 min, USD 1.04) | `xq4/COMMIT-INDEX.md` S-2 | 1 | about 116 min | 2.11 |
| 6 | **The index: question bench** (XQ10's F) | `xq4/COMMIT-INDEX.md` S-3 | 1 | 40 to 60 min | 0.73 to 1.09 |
| 7 | **The agreement gate at 1 billion** (XQ10's G): bring-up 3 on the backfilled copy, index against the slow route on account-003 | `xq10/QUESTIONS-CONNECTED.md` §8 | 1 | 18 to 42 min | 0.33 to 0.76 |
| 8 | **The reporting copy at 1 billion**: rebuild of account-003, then the card's four steps with the projector following and without (control) | `rpt1/SQL-REPORTING.md` §7.3 | 1 | 75 to 220 min | 1.36 to 4.00 |
| 9 | The full card at 1 billion with the tuned reader and 300 s cells (no-burst shape S, `server-32`, 12 read permits, per-save credits, **the lab producer**): the comparison with 2026-11-23 | `v01/CARD-READER.md` §7 | 1 | 125 to 155 min | 2.27 to 2.82 |
| 10 | **The product's save path, wide writer and both hints** (S2's arm C): every save sent as the product sends it; **replaces the old "Wide" and "Hints" steps** | `s2/PRODUCT-SAVES.md` §8 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 11 | The same plus several owners (S3's arm D, a no-regression arm: the production tape has no two-owner save) | `s3/SEVERAL-OWNERS.md` §8 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 12 | The product's save path, option on, no wide writer (S2's arm B); optional arm A (option off, 71 to 85 min) if 75 more minutes | `s2/PRODUCT-SAVES.md` §8 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 13 | **Tape M (the real mix, most saves creations), creation option off** (S4's arm E): the control | `s4/CREATION-SAVES.md` §6 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 14 | **Tape M, creation option on** (S4's arm F) | `s4/CREATION-SAVES.md` §6 | 1 | 71 to 85 min | 1.29 to 1.54 |
| 15 | Tape M's creation burst, option on, 600 s cells (S4's arm G) | `s4/CREATION-SAVES.md` §6 | 1 | 130 to 155 min | 2.36 to 2.82 |
| 16 | The save-size ladder at 1 billion with 256 pinned readers (seven windows, 5 to 1,000 facts), wide writer off | `v01/SAVE-SHAPE.md` §6.2 | 1 | 33 to 36 min | 0.60 to 0.65 |
| **B** | **Scale** | | | | |
| 17 | **Settlement beside live saves**, one account, 100,000 subjects, fresh database (ACT7's (a)), then `act7/calibrate.ts` | `actv-lazy/act7/RUN2.md` §6.2 | 1 | 2 h 15 min to 2 h 30 min | 2.45 to 2.73 |
| 18 | Publish at 100,000 subjects with the large first release settled by bytes, then the four 39.4/s windows | `actv-lazy/SETTLEMENT-FRAMES.md` §9 | 1 | 55 to 85 min | 1.00 to 1.54 |
| 19 | ACT7's (C), the calibration check: **only if step 17's model is at or below 2,500 / 25 / 55** | `actv-lazy/act7/RUN2.md` §6.3 | 1 | 95 to 110 min | 1.73 to 2.00 |
| 20 | **A subject owing 200 forms, run A**: one subject in ten (10,000 subjects) owes 200 forms and policies, settled to the end with the ledger in parts, streamed exactness check, two live windows at 39.4/s; one publishing account; 2 ledger parts per subject. Run B (every subject owes; 5 to 8 h, USD 5.45 to 8.72) only if the owner wants the full figure | `actv-lazy/RELEASE-LIMITS.md` §6.1 | 1 | 45 to 85 min (this page's estimate from the page's figures: copy 4.4, enrol and publish about 5, settlement 25 to 50, streamed check 5 to 16, windows about 5) | 0.82 to 1.54 |
| 21 | **A release near the ceiling**, 100,000 subjects, nine neighbours saving: arm 1 full documents at 1,800 forms (0.45 MiB), arm 2 by reference at 1,800, arm 3 by reference at 5,000 forms (1.25 MiB); one publishing account | `actv-lazy/RELEASE-LIMITS.md` §6.2 | 1 | about 75 min (three arms of about 25, each from its own copy) | 1.36 |
| 22 | **Many accounts**: 1,000 and 10,000 thin accounts added to fresh copies of the sealed 1 billion database beside the ten deep accounts (`scale2/server.sh`, 200 and 500 publishing accounts with account-bearing command IDs); the 100,000 rung (79 to 257 min, USD 1.44 to 4.67) only if the first two say so | `scale2/SCALE2.md` §8 | 1 | 54 to 117 min | 0.98 to 2.13 |
| 23 | ACT7's (b), three accounts settling at 1 billion | `actv-lazy/act7/RUN2.md` §6.4 | 1 | 2 h 35 min to 3 h | 2.82 to 3.27 |
| 24 | ACT7's (c), ten accounts settling at 1 billion (with step 19's calibration accepted: 290 to 370 min, USD 5.27 to 6.72) | `actv-lazy/act7/RUN2.md` §6.5 | 1 | 6 h 20 min to 9 h 10 min | 6.90 to 9.99 |
| — | **1 billion records**: every step above marked "at 1 billion" runs on the sealed database; the ceiling above 1 billion is the fourth total below (a proposal) | | | | |
| **C** | **The other priorities, in priority order** | | | | |
| 25 | P1: uncached pinned reads, command 1 (prefetch at 3 permits; read-ahead off; 1.5 GiB cache) | `rd5/UNCACHED-READ.md` §7 | 1 | about 50 min (ceiling 60) | 0.91 to 1.09 |
| 26 | P1: a second read gateway on a second machine | `rd5/UNCACHED-READ.md` §8 | **2** | about 55 min | 2.00 to 2.18 |
| 27 | P2: W4 (a), the worst-case (Saturday's) tape at 1 billion, per-subject hints off and on | `w4/SUBJECT-WRITER-HINTS.md` §4 (a) | 1 | about 2 × 50 min | 1.82 |
| 28 | P2: W4 (b), restart with per-subject hints, with and without the start-up read | `w4/SUBJECT-WRITER-HINTS.md` §4 (b) | 1 | about 2 × 25 min | 0.91 |
| 29 | P3: the 1,024-reader step with the waiting-read bound off and 128 | `w3/GENERAL-WRITER-HINTS.md` §4 (b) | 1 | about 2 × 45 min | 1.64 |
| 30 | P5: Publish at 100,000 subjects, all twelve windows, probe reading at least each receipt | `rd4/AT-LEAST.md` §4 | 1 | about 35 min | 0.64 |
| 31 | **P8: whole-subject import** (IMP2): 32-fact frames against 160-fact whole subjects, live-first, on the fresh scale image. The bound holds for honest frames only (R7) | `imp2/WHOLE-SUBJECT.md` §6 | 1 | about 45 min (about 75 with server preparation) | 0.82 to 1.36 |
| 32 | P9: HA2 run 1, failover policy B with both cold-copy options, cases `b-235`, `a-235`, `move-235` (pair set-up not timed) | `hasync1/RECOVERY-TIME.md` | **2** | 25 to 40 min | 0.91 to 1.45 |
| 33 | P9: HA2 run 2 (optional), cores only | `hasync1/RECOVERY-TIME.md` | **2** | 15 to 20 min | 0.55 to 0.73 |
| — | **Not yet runnable from this branch:** Publish beside saves (page on `origin/exp/DX-ACT8-publish-beside-saves`, in independent review); removal per account (`origin/exp/DX-ERA2-removal-per-account`, a review found a break); an API call's reads (`origin/exp/DX-API1-api-call-reads`, in progress) | | | | |

**Four totals** (runnable steps only):

| Session | Steps | Duration | Cost (USD) |
| --- | --- | --- | --- |
| **1. Shortest that settles the top-ranked questions**: is the index affordable and exact at 1 billion (backfill, the save pair against the bars, index against the slow route), and how the product's own saves (shape S with the wide writer and hints, and tape M with creation off and on) meet the P2 bars | 1, 4, 5, 7, 10, 13, 14 | 7 h 57 min to 12 h 08 min (40 to 75 + 90 to 240 + 116 + 18 to 42 + 71 to 85 + 71 to 85 + 71 to 85 min) | 8.67 to 13.23 |
| **2. Everything runnable on one machine** | 1 to 18, 20 to 25, 27 to 31 (and 19 if step 17 qualifies) | 39 h 32 min to 57 h 19 min (group A 18 h 23 min to 27 h 57 min; group B 14 h 59 min to 20 h 42 min without step 19, up to 22 h 32 min with it; group C 6 h 10 min to 6 h 50 min) | 43.09 to 62.48 |
| **3. Everything, with the second machine** for steps 26 and 32 | all runnable steps | 40 h 52 min to 58 h 59 min of the first machine, plus 80 to 100 min of the second (2,532 to 3,639 machine minutes) | 46.00 to 66.11 |
| **4. The ceiling between 1 billion and 10 billion records (a proposal; nothing above 1 billion has been measured)** | see below | 2 billion rung: 35 h 40 min to 47 h; 3 billion rung: 41 to 57 h more; 10 billion directly: 277 to 375 h of aging alone | 2 billion: 38.90 to 51.20; 3 billion: 44.50 to 62.20 more; 10 billion: 302 to 409 for aging alone |

Optional runs not in the totals (steps 5's hint arm, 12's arm A, 20's run B, 22's 100,000 rung, 33): 537 to 919
machine minutes, USD 9.76 to 16.70.

**The fourth total: what would settle whether the store's size ceiling holds between 1 and 10 billion records.**
Nothing above 1 billion has been measured; the owner's rule of 2026-11-20 stops age tests at 1 billion, so this is a
proposal for his decision, not a planned step.

- **What exists.** The sealed database (1,000,251,169 records, t 62,888,918) was aged from 430 million by the aging
  loader at 9,022.51 records/s with maintenance in its second window, falling to 8,187, 7,407 and 6,676 records/s in
  its last three cycles; its PostgreSQL directory is 176 GB (176,382,197,760 bytes at 1,000,002,769 records); the
  native backup 115 GB in about 14 min, the full verify about 23 min, the restore about 33 min. AGE1's growth model
  predicts every index stays at three levels through 8 billion records (EAVT leaves 333,334 at 1 billion, 2,666,667 at
  8 billion), point reads, feed pages and save lookups flat, backup, verify and restore linear.
- **What would have to be aged.** 10 billion means 9 billion more records into the one database (the ten deep
  accounts and the thin ones), at the loader's measured 6,676 to 9,022 records/s: **277 to 375 hours of one machine
  (12 to 16 days), USD 302 to 409, before any measurement**, more if the rate keeps falling. Disk: about 1.8 TB of
  PostgreSQL at 10 billion plus about 1.2 TB of backup; the machine type's disks must be checked first. Object storage
  of the sealed copy: about 1.45 TB compressed (145 GB per billion today), about USD 22 a month.
- **Proposed instead: two rungs that test the growth model where it would first break.** Age the sealed copy to
  **2 billion** (+1 billion: 30.8 to 41.6 h at 6,676 to 9,022 records/s), seal, then the card's steps that depend on
  size (P1 random-subject pinned reads with the tuned reader, P2 shape S second half, P4 current pulls at depths 1, 3
  and 10, P7 cold first read) and the backup, verify and restore (about 140 min): **35 h 40 min to 47 h, USD 38.90 to
  51.20.** A **3 billion** rung, the same again with the rate assumed down to 5,500 to 8,000 records/s: 41 to 57 h more,
  USD 44.50 to 62.20. With three points (430 million, 1 billion, 2 billion; then 3 billion) the slopes extrapolate to
  10 billion.
- **Predictions (AGE1's model; written before any run) and what would show the ceiling failing before 10 billion.**
  At 2 billion: EAVT still three levels; random-subject storage loads per pinned read 1.76 ± 0.2 (1.76 at 1 billion);
  S commit p99 second half within 10% of 1 billion's; first-pull p99 under 100 ms; backup about 230 GB and 28 min,
  verify about 46 min, restore about 66 min. Wrong if: a fourth index level before 8 billion (directory bytes, leaf
  counts); loads per random read up by more than 0.3 per billion; S commit p99 up more than 10% per billion; the aging
  rate below 5,000 records/s (then 10 billion cannot be built in under 21 days and the ceiling question needs a faster
  loader first, which is not built).
- **A faster loader would change the arithmetic.** AGE1's bulk ladder arms sustained 15,242 to 18,081 indexed
  records/s at different settings (`age1/CONTINUATION.md`); at 18,000 records/s 9 billion is 139 h, about USD 151. It
  changed the index geometry, so a database aged that way answers a different question unless its geometry is shown
  equal.

**Which steps share a bring-up.** Steps 2 and 3 use bring-ups 1 and 2 of the sealed working copy (`demo/server-up.sh
--reset`); step 3 cannot reuse step 2's (the question reader is chosen at bring-up and sweep arm B writes). Step 4 makes
its own copy and backfills it; steps 5 (two copies), 6 and 7 (bring-up 3) use the backfilled copy; whether
`demo/server-up.sh` accepts it as `DEMO_ORIGINAL` is not checked (if it refuses, start step 7's stack with `stack/up.sh`
as `xq1/server.ts verify` does). Step 8 brings up the sealed copy with the ID lists on and its own PostgreSQL for the
copy. Every card arm (9 to 15, 27, 29) makes a new physical copy per part from the same 1 billion source and shares only
the build; steps 10 to 12 and 13 to 15 compare among themselves and with step 9 (a shared measurement, not a shared
bring-up). Steps 17, 18, 19, 20, 21 and 30 each boot a new prepared copy of the fresh template (about 4.4 min each; a
settled release changes the copy). Steps 23 and 24 each prepare a copy of the stopped 1 billion cluster
(`act7/prepare-copy.sh`, 2 to 3 min). Step 22 makes a fresh working copy per rung. Step 25 makes one copy per
configuration; step 26 reuses step 25's function. Steps 32 and 33 use the two-machine pair set-up. One build (step 1)
serves every step.

```bash
# 1. Build once, from the commit that carries this page; fetch the sealed cluster as XQ10 §8 row 0
COMMIT=<head of exp/DX-INT1 carrying this page>
BUILD=/var/tmp/triplex-v01-int5-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
# part() and arm() exactly as in this page's history at 1ed2650bd (section "Next server session"); unchanged.
CARD=(1B production-S-noburst server-32 300 tuned)
EXTRA=; DX_DRY_RUN_FIRST_OFFER=1 part 1 "$DRY_COPY" /var/tmp/v01-int5-card-dry "${CARD[@]}"   # "DX-DRY-RUN first offer reached"

# 2. Bring-up 1: journal probe, ID lists, sweep arms A, B and C (as at 1ed2650bd's step 2, with DX_SWEEP_SHAPES=all)
sudo env DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_SWEEP_QUEUE_MS=5000 \
  DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#    then jrn1/probe.ts, xq3/server.ts, xq6/server.ts (arms A, B), the shapes arm C as xq9/QUESTION-SHAPES.md §6; down
# 3. Bring-up 2: the question reader, exactly as at 1ed2650bd's step 2b (xq7/server.ts)
# 4 to 7. XQ10 §8 rows B, C, F, G exactly as that page (xq1/server.ts backfill; scorecard.mjs --cross-index;
#    xq1/server.ts bench; xq10/server.ts on bring-up 3 with DX_CROSS_INDEX=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all ...)
# 8. The reporting copy exactly as rpt1/SQL-REPORTING.md §7.3 (its own PostgreSQL container; follow, rebuild, card with
#    and without the projector)
# 9. The full card: parts 1 to 3 and assembly (as at 1ed2650bd's step 3)
OUT=/var/tmp/v01-1b-prodSnb-s32-tuned
for n in 1 2 3; do make_copy "$COPY"; part "$n" "$COPY" "$OUT" "${CARD[@]}"; remove_copy "$COPY"; done
sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$OUT"
# 10 to 12. The product's save path (s2/PRODUCT-SAVES.md §8, s3/SEVERAL-OWNERS.md §8)
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"              arm /var/tmp/s2-card-product-wide   "${CARD[@]}"  # 10 (C)
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 DX_S3_OWNERS=1" arm /var/tmp/s3-card-product-owners "${CARD[@]}"  # 11 (D)
EXTRA="DX_S2_PRODUCT=1"                                                                            arm /var/tmp/s2-card-product-on     "${CARD[@]}"  # 12 (B)
# 13 to 15. Tape M (s4/CREATION-SAVES.md §6)
CARDM=(1B production-M server-32 300 tuned); CARDB=(1B production-M-burst server-32 600 tuned)
BASE="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 DX_S3_OWNERS=1"
EXTRA="$BASE"                arm /var/tmp/s4-card-m-before "${CARDM[@]}"   # 13 (E)
EXTRA="$BASE DX_S4_CREATE=1" arm /var/tmp/s4-card-m-after  "${CARDM[@]}"   # 14 (F)
EXTRA="$BASE DX_S4_CREATE=1" arm /var/tmp/s4-card-m-burst  "${CARDB[@]}"   # 15 (G)
# 16. The save-size ladder: saves_arm exactly as v01/SAVE-SHAPE.md §6.2, wide off
# 17, 19, 23, 24: ACT7's runs exactly as actv-lazy/act7/RUN2.md §6 (17 = §6.2 then calibrate.ts; 19 = §6.3 only if
#    17's model is at or below 2,500 / 25 / 55; 23 = §6.4 with DX_ACT7_CONTROL=2:2400:300:200:600; 24 = §6.5)
# 18. Publish with the large first release settled by bytes (as at 1ed2650bd's step 9)
# 20. A subject owing 200 forms, run A (actv-lazy/RELEASE-LIMITS.md §6.1; one publishing account, 2 ledger parts each)
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "TX2_NOTICE_LEDGER=parts" "TX2_SETTLE_PRECONDITION=progress" \
  "DX_ACT3_RELEASE=forms=200,policies=200,permille=100" "DX_ACT3_SETTLE=1" "DX_ACT4_INITIAL=large" \
  "DX_ACT6_STREAM_CHECK=1" "DX_HELD_MINUTES=150" "DX_HELD_WINDOWS=rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
# 21. A release near the ceiling, three arms, each from its own fresh prepared copy (RELEASE-LIMITS.md §6.2)
W="rolling6/3.5/0,rolling6/3.5/1,rolling6/23.5/0,rolling6/23.5/1,rolling6/39.4/0,rolling6/39.4/1"
for arm in "forms=1800,policies=1800,permille=100|" "forms=1800,policies=1800,permille=100|TX2_RELEASE_DOCS=ref" \
           "forms=5000,policies=5000,permille=100|TX2_RELEASE_DOCS=ref"; do
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" ${arm#*|} \
    "DX_ACT3_RELEASE=${arm%|*}" "DX_ACT3_SETTLE=0" "DX_HELD_WINDOWS=$W" \
    bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
    "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
    "$SCALE1_PGDATA" "$PREPARED_PGDATA_NEW" "$PREPARED_WAL_NEW" "$DX_LAZY_OUT"   # a new prepared copy per arm
done
# 22. Many accounts (scale2/SCALE2.md §8)
sudo env DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" \
  bash lab/experiments/EXP-DX1/scale2/server.sh /var/tmp/scale2 1k 10k
# 25 to 30, 32, 33: as at 1ed2650bd's steps 11 to 18 (unchanged commands; numbers per the table)
# 31. Whole-subject import (imp2/WHOLE-SUBJECT.md §6), on a prepared server as load1/FAIR-SERVER.md
TX2_IMPORT_WHOLE_SUBJECT=1 node lab/bin/heavy.mjs --label DX-IMP2-whole-160 -- \
  bash lab/experiments/EXP-DX1/load1/fair-server.sh "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
  "$SCALE1_TRANSFER_SHA256" "$TEMPLATE" "$OUT/imp2-whole" \
  --pg-data "$COPY" --wal-dir "$WAL_COPY" --credit-mode rolling6 --frame-facts 32,160 --import-policy yield
```

Headline predictions and what would show them wrong (written before any run; the steps not listed keep the rows of
this page at `1ed2650bd`, renumbered as above):

| Step | Predicted | Wrong if |
| --- | --- | --- |
| 4 | value entries 17.9 million ± 5%; 230 to 330 B per entry; backfill 25 to 75 min; 10,000 sampled subjects 0 mismatches; dry run 0 to add, 0 to retract | any sample mismatch or a non-zero dry run (stop); backfill over 4 h; entries outside 17.0 to 18.8 million |
| 5 | index on minus off: datoms per save +1.5 to 2.5; log bytes +300 to 800 B; reads inside apply +0 to 0.05; commit p50 +0.05 to 0.4 ms, p99 +0 to 3 ms; stored rate unchanged | save median over 10 ms or p99 over 50 ms where the off arm is inside them; over 0.5 ms of writer time per save for 1 to 3 declared values; over 0.2 extra reads inside apply per first touch |
| 6 | first pages 1 to 5 ms warm, 8 to 50 ms cold; a full count of a deep account 0.15 to 0.5 s warm | a first page over 20 ms warm or 100 ms cold at p99 |
| 7 | 11 comparisons of 7 questions on account-003 at the head, now and 30 days ago: 0 differences; index counts 0.03 to 0.5 s warm; a sweep of 100,000 subjects 30 to 60 s on 10 parts | any difference (stop); an index count over 3 s |
| 8 | rebuild of account-003 exact; 410 to 540 B per fact; lag p99 under 150 ms at 50 and 235 saves/s, 80 to 200 at 394, 100 to 300 at 620; pinned-read p99 and feed lag within 10% of the control | apply p99 over 200 ms per page at 394; lag growing through a 300 s step; pinned-read p99 more than 10% worse with the projector |
| 10 | 95 to 100% of shape S commits on the per-subject writer **(from `saveRoutes`)**; mean serial apply 0.6 to 1.2 ms; commit p50 0.5 to 2 ms below arm A's forecast, p99 within 20% | under 95% on the per-subject writer; apply not 1.5 times below the general writer's for commits of 60 facts or more (then remove the wide option); any lost save |
| 11 | the same as 10 within 1 point; 0 `owners:<n>`; p50 within 1 ms, p99 within 15% of 10 | any `owners:<n>` count; share 2 points off 10's |
| 12 | 25 to 40% on the per-subject writer; p50 within 1 ms of arm A's forecast (8 to 12 ms at 50/s) | outside 20 to 45%; replays above 1% |
| 13 | 8 to 12% on the per-subject writer (the form saves); commit p50 6 to 9 ms, p99 20 to 45 ms per step | over 15% on the per-subject writer; p99 over 50 ms |
| 14 | 99 to 100% on the per-subject writer **(from `saveRoutes`)**; serial apply 0.3 to 0.6 ms; p50 0.2 to 1 ms below 13, p99 within 15% | under 99%; p50 above 13's by more than 1 ms or p99 more than 20% above (remove the option) |
| 15 | 99 to 100% per-subject; p99 20 to 45 ms at the 394 cell; at most one index job in 600 s | p99 over 50 ms or more than one index job at 394 |
| 20 | completes, every frame at or under 8,000 µs; 6.9 million changed values and 2.0 million notices (± 3%); 22,000 value and 46,000 notice frames (± 10%); 20,000 ledger parts; settlement 25 to 50 min; exact | any refusal or frame over 8,000 µs; over 90 min or under half the low end; any difference |
| 21 | by reference: Publish record 3.5 to 3.6 KB and 4 changes; definitions written ahead before the first window; pause to durable p50 25 to 45 ms; neighbours' p99 0.8 to 1.3 times the control; 20 of 20 inside one second. Full documents at 0.45 MiB: about 1.11 MB added per Publish; first-correct p50 rising with every Publish; fails the second in later windows | by reference over 5 KB or more than 4 changes; a definitions write after the second Publish; arm 2/3 p50 above 60 ms or neighbours above 1.5; arm 1 flat across windows |
| 22 | every read, feed entry, ID list, sweep count and settled change exact; small-account save p99 30 to 60 ms at 1k, within 1.2 times at 10k; quiet thin p99 at or under 50 ms; 200 / 500 Publishes p50 15 to 40 ms; settlement 0 refused; 0 sweep gates left; connections under 100 | any difference (stop); the 10k rung's p99 above 1.3 times the 1k rung's; any refused frame; connections growing with accounts |
| 31 | 32-fact frames 3,000 to 3,700 facts/s; 160-fact whole subjects 3,500 to 6,000; quiet p99 32 to 48 ms; 0 `ImportCommitTooLarge` | arm 2's quiet p99 over 50 ms while arm 1's is under; frame apply p99 over 60 ms; arm 2's rate under arm 1's |

## Gates on the merged head (2026-11-24 morning, at `4c34fd0f8` and before)

Mac, toy size, one ordinary heavy token per step, no lease, 2026-11-24 13:17 to 15:56 UTC. Clocks are diagnostic.
Evidence: `DX-INT3/` in the lab evidence store (`gates/queue.log` lists every case with its commit). The gates of
2026-11-23 (at `607c46e8b`) are in this page's history (`git show 9e02cf1d2:lab/experiments/EXP-DX1/v01/READINESS.md`).

**The reach fault and which passes ran with it.** W3's commit closed `admission/execute` one form early in
`reach/response`, so from the W3 merge (`287bb0816`) every `/reach` and `/reach-many` answered a Boolean (HTTP 500 on
the wire). The console's gates on a second toy found it at 08:12 local (entities, query, derive and the proof failed);
`fdabb86e5` fixed it before any other gate ran. **Every pass below ran on a head with the fix**: the first queue at
`73a9c8bf3` and `5e1bb75ba`, the second and third at `07144498e` and `4c34fd0f8`. The production and aged gates read
through `/read` and would have passed with the fault. The held Publish runner's probe reads through `/reach-many`
(`sweepRows`) but **falls back to `/read` on any error unless `TX2_SWEEP_STRICT=1`**, so its passes alone do not show
that subject pulls work; the held runs were therefore repeated with `TX2_SWEEP_STRICT=1` (both passed), and
`int3/reach-gate.sh` now compares the pulls directly.

| Gate (owner) | Head | Result |
| --- | --- | --- |
| Lab unit tests (`v01`, `rd1`, `w1`, `ha1`, `jvm1`, `actv-lazy/join` frames, ranges, bulk, held, observations) | `4c34fd0f8` | 73 of 73 (69 of 69 at `73a9c8bf3`) |
| Identity tests (`w2/wide-ids.test.mjs`, `prep1/ordered-ids.test.mjs`) (S1) | `4c34fd0f8` | Pass |
| SDK (`packages/datomic`, unit) | `07144498e` | 458 passed, 53 skipped |
| Gateway selftest (in memory, RD4's at-least tests included) | `07144498e` | 29 tests, 54,160 assertions, 0 failures |
| **Subject pulls against the baseline** (`int3/reach-gate.sh`, new): 22 pulls (8 single, 3 many, row pages, gzip pages; an old cut and the head) | `07144498e` | 22 of 22 identical across this branch, `9e02cf1d2`'s gateway and this branch with `TX2_READ_WAIT_LIMIT=4`; the negative control (W3 `a6146ff4f`) differs in 22 of 22 (HTTP 500) |
| Launch guard (`ha1/guard-check.sh`) with 7 new cases (W4's two refusals, S1's wide writer, controls) | cases at `0fec06280` | 102 cases, 0 mismatches; both W4 refusals stop at their own new test in `stack/up.sh` |
| Default card's plan output against `9e02cf1d2` | `4c34fd0f8` | Byte-identical in every option set that names its tape; with no tape named the first line differs in the tape only (Proposed defaults); refused option sets differ only in a stack line |
| `frames-check.ts 256`, `large-release-check.ts 256` (ACT4, ACT3) | `5e1bb75ba` | Pass, pass |
| Settlement-frames gate (`DX_ACT4_GATE=1`) (ACT4) | `5e1bb75ba` | Pass, ACT4's own counts: frames 10 → 5 (values) and 36 → 29 (notices) on the small release; 4,272 changes and 1,440 notices; 32,040 changes in the split case |
| Held Publish toy: default; large first release settled by bytes; probe from receipts (`DX_ACT3_AT_LEAST=1`); old framing with the large release (ACT3, ACT4, RD4) | `5e1bb75ba` | Pass each: 8 of 8 deadline Publishes inside 1 s, 0 read, visibility or at-least defects; bytes framing 2 value and 6 notice frames, 560 changes and 168 notices equal to the oracle, 474 and 160 equal to the independent rule; 18 at-least requests per Publish window, 0 waits |
| Held, injected stale probe with at-least reads | `5e1bb75ba` | Fails at the end as designed: one at-least defect (basis 11 against receipt 43) |
| **Pair 1: held Publish with `TX2_SETTLE_FRAMES=bytes` and `DX_ACT3_AT_LEAST=1` both on** | `5e1bb75ba`; strict at `4c34fd0f8` | Pass, both: the same frames and counts as bytes alone, 8 of 8 inside 1 s, 0 defects, 18 at-least requests per Publish window |
| Held default with `TX2_SWEEP_STRICT=1` | `4c34fd0f8` | Pass |
| JRN1 gate (`jrn1/gate.sh`, loader-aged toy, probe included) | `73a9c8bf3` | DX-JRN1 GATE PASS |
| RD4 two-peer gate | `73a9c8bf3` | Pass: receipt reads early 0 of 300; a plain read sent first early 6 of 150; deadline refusal; pinned and feed unchanged; same request counts |
| **Pair 2: RD4's gate with `DX_READ_WAIT_LIMIT=4`, `DX_THREAD_COUNTERS=1` and `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`** | `73a9c8bf3` | Pass: receipt reads early 0 of 300 (plain 9 of 150); the read gateway ran with the bound (limit 4, 807 reads admitted, 0 refused), served the feed as bounded pages only (`transactions-bounded` 2 calls), 604 at-least requests, 7 waits, 1 deadline refusal (the designed one) |
| W3 gate, hints: paired log, receipts, final state, suites | `73a9c8bf3` | Pass: 46,877 datoms identical by SHA-256, 132 receipts identical; 235 and 22 assertions |
| W3 gate, waiting-read bound | `73a9c8bf3` | Pass: bound off, feed poll 12.9 s; bound 4, feed poll p50 14.3 / p99 192.7 ms, health p99 179.1 ms, 0 busy answers to current pulls, 6,260 pinned reads refused and retried |
| W4 gate (`w4/gate.sh`) | `07144498e` | Pass: 76,317 datoms identical off and on, 400 receipts and 6,400 live rows identical; suites 235 and 41 assertions |
| S1 suites (`s1/suites.sh`): mixed-identity suite off, wide, wide with both hints; W2's wide gate | `07144498e` | 235 assertions in all three; wide gate 4 tests, 221 assertions, wide and wide with hints |
| REAL2 production exactness gate: default; W3 hints; W4 hints; wide with both hints | `5e1bb75ba` (W3), `07144498e` (others) | Pass, all four: 840 R and 88 S commits acknowledged, 0 expired, 2,836 fields exact; hinted commits 506 (W3), 431 (W4), 928 per-subject and 9 general (S1) |
| REAL2 production tape on a loader-aged toy: default; W3; W4; wide with both hints | `5e1bb75ba`, `07144498e` | Pass, all identical: 120 aged rows, a tampered row refused, 101 writes over aged rows, 1,927 fields, final cut 1,289 |
| Combined check: read study with both pinned options, and off | `4c34fd0f8` | Pass (twice with the options); one earlier run at `5e1bb75ba` failed: the study's first save was refused `ErasureFrontierChanged` by the removal the study starts beside it on purpose (the fence doing its job; a timing race in the study, not reproduced in the two later runs with the options) |
| Combined check: removal with owner head and both pinned options, and plain; fair import with Publish; native append recovery | `5e1bb75ba` | Pass, all |
| Saves arm harness (S1's ladder case included); saves gate | `07144498e`; `5e1bb75ba` | Pass; 0 wrong in 204,113 reads over five pin kinds, every planted wrong value caught in all three planted windows |
| Owner-head toy with step 7; pinned short-cut gate with owner head on and off | `5e1bb75ba` | Pass; 92,880 comparisons over 14,901,208 rows, 0 differences, both |
| Trace file per process start (CARD2) | `73a9c8bf3` | Pass |
| Console gates on a second toy (`DEMO_TOY_NAME=int3`), with reads after own writes | `07144498e` | g12, config 16/16, entities 19/19, query 24/24, journal 7/7, derive 4/4, catalogue 70/70, proof 37/37; 94 at-least requests at the read gateway. The owner's toy on 28580 was not touched |
| Card toys: the new default tape (`production-S-noburst`), and the tuned reader with 12 permits | `4c34fd0f8` | Pass, both: 171 fields of 12 subjects read back exactly in both arms; `adopted.ts` write-options check held; tuned random line 0 wrong |

**Not run on the Mac:** every server launcher past its Linux guard; the JRN1 probe at 1 billion; the SDK's live suite
(JRN1 ran it on its branch). Environment refusals, each rerun and passed: the lab pool (other builders' stacks) refused
the card toys twice; the ha1 diagnostic slot refused the read and held cases for about 30 minutes; one production gate
image build failed in containerd ("failed to commit: rename … ingest") and passed when rerun.
