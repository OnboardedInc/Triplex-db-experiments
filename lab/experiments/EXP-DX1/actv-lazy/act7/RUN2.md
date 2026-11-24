# Settlement beside saves at 1 billion records: what was missing, the frame analysis, the server runs

Builder DX-ACT7, 2026-11-24, branch `exp/DX-ACT7-settlement-1b-prep` from `exp/DX-ACT5-settlement-live` (`c1579ee50`),
with `exp/DX-INT1` (`23b7df344`: the journal bounds, the save shape and the production-S tape, merged) merged in. Mac work
is correctness at toy size; every count here is exact, every Mac time diagnostic. Nothing here ran on a server. Every
option below is default off; with none set the held runner behaves as before (regression runs in section 3).

## 1. Short answer

1. **Run 2 (three and then ten accounts settling at 1 billion beside saves) is now one command per case** (section 6).
   The six missing pieces are built (section 2). A miniature of the same shape passes and fails as it should:
   - an aged toy (SCALE1's toy fixture, aged by AGE1's own code at its load pin: 400 saves on 30 subjects, 4 probe
     saves, single and grouped bulk-loader saves) is adopted from a handoff bundle of the 1 billion bundle's shape;
   - **without the adoption** the runner stops at its first check ("Restored logical head differs");
   - **with the adoption but the old oracle** (no aged history) the exactness check stops at the first aged subject
     (`pl:s00000000`: the store's facts hold task 0's answer at the aged position, the oracle's at the seed's);
   - **with all pieces, three accounts and then ten** settle the 20 forms and 20 policies release at once under the
     progress precondition, beside the production-S tape in all ten accounts, each account's settlement first killed in
     a child process and resumed, checked one account at a time: 10 accounts × (474 changes, 168 notices in order,
     8 ledgers, 16 reads and 16 fact sets at both release positions, the independent form rule 8 of 8 owing), 0 frames
     refused, every save acknowledged (counts in section 3).
2. **A correction to the brief's premise.** The settlement builder wrote that the oracle's worlds not knowing the aged
   history would make "every check fail". It would not: no rule of W0 or of the synthetic forms reads a task's answer,
   so the aged saves change no settled value, notice, ledger or answer (shown on the miniature: the old checks pass with
   the old oracle). What they change is the facts every read pulls (value and position of task 0's answers). The
   miniature only fails without the aged oracle because the streamed check now also compares the store's own facts with
   the oracle's world. That comparison is what makes the 1 billion run test the read path over 1,400 aged versions.
3. **What bounds a frame (section 4).** Both writers' frames close because the next whole subject would push the
   estimated service over 8 ms. The estimate is 3.5 ms per transaction plus 45 µs per estimated row plus 70 µs per KiB
   of three times the JSON. A value frame (5 subjects, 292 changes) spends 46% of its 7.7 ms on the fixed 3.5 ms, 18%
   on rows, 36% on bytes. A notice frame (1 to 2 subjects, about 35 notices) spends 48% fixed, 26% rows, 27% bytes.
   The rows the estimate counts match the datoms the transactor wrote: value frames 28 to 30 datoms (estimated 31),
   notice frames 37 to 68 datoms (estimated 31 to 71). The server's own serial apply for commits of that size is 2 to
   3.5 ms (S1's ladder, 2026-11-24). So **real transactor work is about 30 to 45% of the 8 ms** (derived, not measured).
4. **Built: `TX2_SETTLE_COST=FIXED_US,ROW_US,KIB_US`** (default off: exactly today's model). It sets the estimate's
   three coefficients from a server measurement and keeps the 8 ms bound. With any calibration at or below
   2,500 / 25 / 55, frames hold 1.6 times more changed values and 3.8 times more notices (the 64 KiB wire estimate then
   closes them), and one account owing 20 forms on 100,000 subjects needs about 42,500 frames instead of 84,500.
   **Settle times, today and calibrated:**

   | Accounts | Frames today | Settle today | Frames calibrated | Settle calibrated |
   | --- | --- | --- | --- | --- |
   | 1 (fresh, 235 saves/s) | 84,500 | 46 to 76 min | 42,500 | 26 to 42 min |
   | 3 (1 billion) | 240,000 | 65 to 100 min | 114,000 | 35 to 50 min |
   | 10 (1 billion) | 786,000 | 3.4 to 5.5 h | 366,000 | 1.6 to 2.5 h |

   The calibration is measured by run 1 below (its frames' own serial apply). Run C checks it before it is used.
5. **Faults found:** `held-server.sh` refused `DX_HELD_MINUTES` over 180, so the published run 1 (240) and run 2 (420)
   exited at once with status 1 and no message (fixed: up to 960, with a message). ACT5's run 1 forecast of 85,000 to
   100,000 notice frames used frames-check's R2 base; the case publishes on R1, which gives about 64,200 (section 5).
   The several-accounts case kept only account 0's saves in the oracle's history, so an account enrolled for it did not
   know earlier cases' saves to its subjects (invisible to every old check; fixed). REAL2's production tape generator can
   give a save of more than 100 rows a duplicate field in windows of a few seconds (the writer refuses it; the tape now
   says so; never seen at 8 s or more).

## 2. The six pieces

| Piece | What was missing | Built (default off) | Files |
| --- | --- | --- | --- |
| 1. Adopt the aged seal | `runHeld` checked the head equals the SCALE1 cut 87,002; the 1 billion head is 28,309,866 | An `aged` seal on the adopted seed: head, replay, cut. The runner checks the peer at the aged head, AGE1's last save (its journal rows and claim, PREP1's `agedJournal`), and **every adopted subject's task fields 0 to 2 against the regenerated tape** (value, row ID, position) before anything is written. `held-server.ts`: `DX_ACT7_AGED_BUNDLE` + `DX_ACT7_AGED_PIN` (the bundle admitted by PREP1's `agedCut`), `DX_HELD_PROFILE=server-32` | `act7/aged.ts`, `join/held-campaign.ts`, `join/held-server.ts` |
| 2. The oracle's worlds for aged subjects | The oracle built worlds from seed facts and the run's own saves | `expected(i, at, history, positions, aged)`: AGE1's tape regenerated per subject in O(1) from the handoff's replay ledgers (section 2.1) | `act7/aged.ts`, `act7/edn.ts`, `join/held-campaign.ts`, `join/settle-live.ts` |
| 3. Journal bounds merged | Separate branch | `exp/DX-INT1` `23b7df344` merged (it carries JRN1). The held ledger sends bounded pages and follows their cursor with `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1` (the SDK's own option name) | `join/held-ledger.ts` |
| 4. Check streamed one account at a time | The case folded every release at Publish and held every account's owed notices and ledgers in memory | `DX_ACT7_STREAM_CHECK=1`: nothing folded at Publish; after settlement each account is checked alone with a fresh oracle pool, page by page against the store's packets (read in order), its stored changes (read frame page by frame page, `Archive.storedStream`) and its ledgers; plus reads and the store's facts of chosen subjects (`DX_ACT7_STREAM_READS`: `all` on the toy, `aged` on the server: every aged subject and one in 97) at every release position | `act7/stream.ts`, `join/archive.ts`, `join/settle-live.ts` |
| 5. Production-S saves | The runner played the held tape | `DX_ACT7_TAPE=production-S[:ROWS]`: the card's production-S tape (no end burst) in all ten accounts at ROWS form rows per second (default 394), predecessors checked as the card checks them (AGE1's rows against its tape) | `act7/tape.ts`, `join/settle-live.ts` |
| 6. A prepared copy of the 1 billion database | None | `act7/prepare-copy.sh TEMPLATE PREPARED WAL` (byte copy, WAL on the other device, as PART9) from the stopped 1 billion cluster; fetch as `demo/server-up.sh --fetch` (section 6.1) | `act7/prepare-copy.sh` |

Also: `DX_ACT7_MULTI_KILL=1` (each account's settlement in its own child, all at once, each killed at a random moment,
then all resumed); `DX_ACT7_FRAME_COUNTERS=1` (each bulk frame's datoms, request bytes, serial apply and estimate, for
`act7/calibrate.ts`); `TX2_SETTLE_COST`; `DX_ACT7_PLAIN_ORACLE=1` (diagnostic only: the old oracle).

### 2.1 The oracle method, and what the check proves

**Chosen: regenerate AGE1's tape from its replay inputs.** AGE1's save at offset n goes to adopted subject n mod
`active` (or a probe's owner), at logical position seedHead + n + 1, and writes task 0's fields 0 to width − 1 with value
sha256("edit-owner-n-j")[0:57] and row ID "B" + pad25(16n + j) (`tape.clj`). The handoff bundle carries the population
ledger (the roster) and the checkpoint (the final offset and the probe map). From them each subject's current task
fields are a closed form: its last save and, for a field that save did not write, the latest earlier one that did. On
the miniature this agreed with AGE1's own `expected-adopted` on all 50 adopted subjects and 150 fields (96 aged rows,
4 probe saves, one probe subject saved twice).

**Rejected:** reading each subject's facts from the store and feeding them to the oracle (a wrong read would then agree
with itself, so the read path would no longer be tested); replaying 28.2 million saves into the runner (hours and
gigabytes to learn three values per subject).

**What the check then proves:** every stored change, notice, ledger, read and fact set equals the oracle's evaluation of a
world built independently of the store's read path. Before any write, the database's aged rows were checked equal to
the regenerated ones (20,020 subjects at 1 billion). **What it no longer proves:** that AGE1 applied its tape correctly
to subjects outside the roster (AGE1 writes only roster subjects, and its seal readback checked them); fields 3 and
above of task 0 (no aged save writes them). If the regeneration were wrong the run stops before any Publish (the aged
rows check), so a wrong regeneration fails loudly; it cannot hide a store fault.

## 3. The miniature (Mac, diagnostic times; evidence `evidence/DX-ACT7/mini/`)

`act7/miniature.sh` under one heavy token: a fresh stack in the lab VM (laptop profile, the held toy's write-gateway
switches), the SCALE1 toy fixture (8 subjects in each of ten accounts), AGE1's own code at its load pin `5cda4ab20` in
its own transactor and peer JVM (`act7/aged_toy.clj`: adoption of 3 subjects per account plus probe and idle subjects,
4 probe saves at offsets 5 to 8, 40 single native saves then 360 grouped saves in groups of 8; aged head 406), then this
branch's transactor and gateways on the aged database, then the phase. Phases share these settings: `TX2_SETTLE_FRAMES=bytes`,
the progress precondition, `DX_ACT7_TAPE=production-S:394`, bounded ledger pages of at most 3 entries
(`DX_ACT7_LEDGER_EXAMINE=3`), frame counters, `TX2_SWEEP_STRICT=1`.

| Phase | Settings | Result |
| --- | --- | --- |
| `unadopted` | as before (no aged seal) | **Refused** at the first check: "Restored logical head differs" |
| `plain` | aged seal, `DX_ACT7_PLAIN_ORACLE=1`, stream, 3 accounts | **Fails**: "the store's facts differ from the oracle's world: pl:s00000000 at release 1" (the aged answer at position 398 against the seed's) |
| `three` | aged seal, stream, kill, 3 accounts, control case 8 s then the several-accounts case 8 s | **Pass** (counts below) |
| `ten` | the same with 10 accounts, case window 20 s | **Pass** (counts below) |
| `regress-default` | fresh toy, nothing set (the held campaign's windows) | **Pass**: 86 changes and 8 notices equal to the oracle, 8 Publish windows 2 of 2 inside 1 s, 0 read and 0 visibility failures |
| `regress-act5` | fresh toy, ACT5's cases `own23` and `multi-p` with the held tape, no ACT7 option | **Pass**: 474 changes, 160 notices, independent rule 8 of 8 per account, 0 refused |

| Counts | Three accounts | Ten accounts |
| --- | --- | --- |
| Aged adoption | 50 adopted subjects checked at the aged head: 33 aged, 96 aged rows and 54 seed rows equal to the tape | same |
| Changes, notices (R1 then the release), ledgers per account | 474; 8 + 160 in order; 8 | 474; 8 + 160; 8 |
| Reads and fact sets equal to the oracle, per account | 16 and 16 (8 subjects × 2 releases) | 16 and 16 |
| Independent form rule | 8 of 8 owing, 474 changes, 160 notices, per account | same, 80 subjects in all |
| Frames refused | 0 | 0 |
| Kill and resume | 3 children killed (SIGKILL) inside settlement; the runner finished the rest | 10 children at once: 6 killed inside settlement, 4 finished first; the runner resumed and committed 14 frames |
| Saves (production-S, all ten accounts) | 222 in the control case, 222 in the case: all acknowledged | 476 in the publishing accounts: all acknowledged |
| Settled | 12.3 to 12.5 s after the window opened (8 s window; the children ran one after another then) | 5.6 to 8.6 s into the 20 s window, while saving; the admission lane granted 14 frames and declined 39 grant checks while saves waited |
| Ledger journal pages | 172 bounded pages of at most 3 entries, 0 skipped | 308, 0 skipped |

The final runs on the pushed head are listed in section 8 with their archives.

## 4. Why so many frames (database-free counts, `act7/frames-account.ts`)

512 deep subjects, R1 then R1 plus 20 forms and 20 policies (every subject owes; the server runs' case), the writers'
own frame builders and bound:

| | Value frames | Notice frames |
| --- | --- | --- |
| Frames per subject | 0.203 (104 for 512) | 0.576 (295) |
| Units per frame | 292 changed values, 5 subjects | 34.7 notices, 1 to 2 subjects |
| Ops per frame (estimated rows = 5 per op + 16) | 3 (31) | 5.2 (41) |
| JSON per frame | 12.2 KB (the page 11.7 KB) | 8.1 KB (ledger 2.8, packet 4.7, cursor 0.5 KB) |
| Estimated wire (3 × JSON + 4 KiB) | 40 to 48 KB | 21 to 33 KB |
| Estimated service, mean | 7,684 µs | 7,301 µs |
| Share: fixed 3,500 µs / rows / bytes | 45.5% / 18.1% / 36.3% | 47.9% / 25.5% / 26.6% |
| What closed the frame | the next whole subject over the service bound (except at census page and release end) | the same |
| Datoms the transactor wrote (toy counters) | 28 to 30 | 37 to 68 |

**What bounds each frame.** Under today's model the service estimate always closes a frame before the 64 KiB wire bound:
at 64 KiB of estimated wire the bytes term alone is 4,480 µs, which with the fixed 3,500 µs and any rows passes 8,000.
A notice frame carries a fixed part (the transaction's 3,500 µs, the cursor change and the packet: about 4,900 µs) and
each subject adds two ops for its ledger change (450 µs) and about 1,000 µs for its ledger and deliveries' bytes, so one
or two subjects fit. A value frame's fixed part is smaller (three ops), so five subjects' changes fit.

**Real work against the estimate.** The estimate's row count is not the conservative part: it matches the datoms. The
conservative parts are the fixed 3.5 ms and the 70 µs per KiB of three times the JSON. On a server, S1's size ladder
(Datomic's own serial apply, warm, general writer) gave 1.89 ms for 39 datoms and 8.5 KB, 2.12 ms for 59 datoms and
15.9 KB, 3.92 ms for 87 datoms and 26 KB. Settlement frames are 28 to 68 datoms and 14 to 36 KB of request, so about 2
to 3.5 ms of serial apply against 7.3 to 7.7 ms estimated: **30 to 45% real work** (derived from another run's
measurement; the Mac's apply times, 2 to 280 ms, are not usable). Run 1 below measures it per frame.

**What would let a frame do more per unit of writer time without loosening the 8 ms a live save can wait:**

| Change | Built? | Frames per subject (values + notices) at 20 forms | Settle, 1 / 3 / 10 accounts |
| --- | --- | --- | --- |
| Today | — | 0.203 + 0.576 + R1's notices 0.066 = 0.845 | 46–76 min / 65–100 min / 3.4–5.5 h |
| A calibrated estimate (`TX2_SETTLE_COST`), at or below 2,500 / 25 / 55 | **Yes, default off** | 0.125 + 0.234 + 0.066 = 0.425 (the 64 KiB wire estimate then closes every frame) | 26–42 min / 35–50 min / 1.6–2.5 h |
| The wire bound on the request's measured bytes instead of 3 × JSON + 4 KiB, with the calibration | No (a one-line model change; needs the request bytes per frame, which run 1's counters record) | not counted: with the calibration every frame is closed by the wire estimate, so any slack measured there converts directly into more subjects per frame | — |
| A subject's ledger change as one op (one replacing assert instead of a retract and an assert) | No (`recorded.ts`, the release-limits builder's file) | notices about 1.7 → 2.2 subjects per frame (forecast from the cost terms): 0.203 + about 0.45 + 0.066 = about 0.72 | about 15% below today |
| Notices of one subject written as one compact record (its deliveries only; the ledger derived from the event and the subject's record when read) | No (`recorded.ts`; changes the ledger's shape every reader of it uses) | notices about 5 subjects per frame (forecast: about 570 µs of estimate per subject once its two ledger ops and its ledger bytes are gone): about 0.45 in all | about 45% below today |

The calibrated estimate is the only one that changes neither the store's shape nor anything a reader sees, which is why
it is the one built. All of them leave the one-frame-at-a-time rule as it is, so at full size the commit round trip
(40 to 65 frames per second, the settlement builder's figure) is what remains; fewer frames is the only lever there.

## 5. Corrections to the run 1 forecast

Run 1's case publishes the large release on R1. Counted per subject on that pair: 20,300 value frames and 57,600 notice
frames, plus 6,640 frames for R1's own notices, recorded first (ACT5 wrote 20,000 to 25,000 and 85,000 to 100,000, from
the R2 base). Changes 5.94 million (59.39 per subject), notices 2.00 million.

## 6. Server runs (none has run)

Build once as `v01/READINESS.md` "Next server session" step 1 (`COMMIT` = the head of this branch carrying this page, or
of `exp/DX-INT1` once it is merged there), and use the same `$BUILD`. Inputs as that session: the SCALE1 image pair
(`$SCALE1_IMAGE`, `$SCALE1_IMAGE_SHA256`, `$SCALE1_TRANSFER_SHA256`), the fresh template (`$SCALE1_PGDATA`), the stopped
1 billion cluster (`$AGED_PGDATA_SOURCE`) and its handoff (`$AGE_HANDOFF_JSON`, SHA-256 `faab1bc5…` as in
`demo/server-up.sh`), a WAL directory on the second NVMe. One prepared copy per run, removed after it.

### 6.1 The 1 billion database on the machine

**What must be in object storage** (already uploaded on 2026-11-23, in the prefix `demo/server-up.sh --fetch` reads; no
bucket or key here): the stopped cluster as one zstd tar (145.4 GB, SHA-256 `ea9a4b1d…`), its handoff
`aged-scorecard.json` and the manifest files. **Getting it there:** the steps of `demo/server-up.sh --fetch` (download,
both digests, extract, the tree check: 1,642 files, 176,078,670,513 bytes). Not measured: forecast 15 to 35 minutes
(download at 150 to 400 MB/s, extract and tree hash 8 to 18 minutes); 520 GB free needed while the archive is kept.
AGE1's native restore (33 minutes) is not used. **A prepared copy per run:** `act7/prepare-copy.sh`, 2 to 3 minutes
(the demo copied the same cluster in 122 s on 2026-11-23). If the session's card steps already fetched the cluster,
nothing is fetched again.

```sh
prepare() { sudo bash lab/experiments/EXP-DX1/actv-lazy/act7/prepare-copy.sh "$1" "$PREPARED_PGDATA" "$PREPARED_WAL"; }
discard() { sudo rm -rf --one-file-system "$PREPARED_PGDATA" "$PREPARED_WAL"; }
held() {  # $1 template; the rest of the environment comes from the caller
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" "$@" \
    bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
    "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
    "$TEMPLATE" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
}
AGED=("DX_ACT7_AGED_BUNDLE=$AGE_HANDOFF_JSON" "DX_ACT7_AGED_PIN=$AGE_HANDOFF_SHA256" "DX_HELD_PROFILE=server-32")
LIVE=("TX2_SETTLE_FRAMES=bytes" "DX_ACT3_SETTLE=0" "DX_ACT5_LIVE=1" "DX_ACT5_SERVER=1" "DX_ACT7_FRAME_COUNTERS=1")
```

### 6.2 (a) Run 1: one account, 100,000 subjects, fresh database (ACT5's run, the fault fixed, counters on)

```sh
TEMPLATE=$SCALE1_PGDATA; prepare "$TEMPLATE"; DX_LAZY_OUT=/var/tmp/act7-run1
held "${LIVE[@]}" "DX_HELD_MINUTES=180" \
  "DX_ACT5_CASES=control:progress:bytes:none:23.5:1:::300,head:head:bytes:large:23.5:1:stop::300,settle:progress:bytes:same:23.5:1:::5400"
discard
node --experimental-transform-types lab/experiments/EXP-DX1/actv-lazy/act7/calibrate.ts "$DX_LAZY_OUT"/act7-frame-counters-settle.json
```

**Duration** about 2 h 15 min to 2 h 30 min: copy 3, boot and checks 4, enrolment and the first Publish 2, the oracle's
first fold 3 to 6, control 5, Publish and its fold 5 to 10, head arm 5, the settle case's window 90 (settlement inside it),
the check 15 to 30. **Cost** about USD 2.50 to 2.75.

### 6.3 (C) The calibration check (only if run 1's `calibrate.ts` gives a model at or below 2,500 / 25 / 55)

```sh
TEMPLATE=$SCALE1_PGDATA; prepare "$TEMPLATE"; DX_LAZY_OUT=/var/tmp/act7-runC
held "${LIVE[@]}" "DX_HELD_MINUTES=150" "TX2_SETTLE_COST=<calibrate.ts output>" \
  "DX_ACT5_CASES=control:progress:bytes:none:23.5:1:::300,settle:progress:bytes:large:23.5:1:::3600"
discard
```

**Duration** about 1 h 35 min to 1 h 50 min (copy 3, boot 4, enrolment 2, folds 8 to 16, control 5, window 60, check 15
to 30). **Cost** about USD 1.75 to 2.

### 6.4 (b) Three accounts at 1 billion, production-S in all ten accounts, per-account pause and pace once

```sh
TEMPLATE=$AGED_PGDATA_SOURCE; prepare "$TEMPLATE"; DX_LAZY_OUT=/var/tmp/act7-run2-3
held "${LIVE[@]}" "${AGED[@]}" "DX_HELD_MINUTES=240" "DX_ACT5_ACCOUNTS=3" "DX_ACT7_STREAM_CHECK=1" \
  "DX_ACT7_TAPE=production-S:394" "TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1" "DX_ACT7_MULTI_KILL=1" "TX2_SETTLE_CONTROL=1" \
  "DX_ACT5_CASES=control:progress:bytes:none:23.5:1:::300,many:progress:bytes:large:23.5:1:multi:admission:6000"
discard
```

Per-account pause and pace "once during (b)": with `TX2_SETTLE_CONTROL=1` the workers obey the stored control; the
driver pauses account 2 for 5 minutes and then paces it at 200 ms between frames for 10 minutes, from a second shell,
40 minutes after the case starts (`join/settlement-control.ts` `setSettlementControl`, as the toy's `pause-p` case;
the call is one write through the write gateway; no new route). **Not built as a case flag:** the toy case `pause-p`
proves the mechanism at toy size; the server step is a manual write, written down in the run's notes with its times.

**Duration** about 2 h 35 min to 3 h: copy 3, boot and the aged checks 6, account 0 and R1 3, control 5 with its
predecessors, enrolment of two accounts 4 to 6, Publishes 1, the window 100 (settlement inside it), the streamed check
30 to 55. **Cost** about USD 2.80 to 3.30.

### 6.5 (c) Ten accounts at 1 billion

```sh
TEMPLATE=$AGED_PGDATA_SOURCE; prepare "$TEMPLATE"; DX_LAZY_OUT=/var/tmp/act7-run2-10
held "${LIVE[@]}" "${AGED[@]}" "DX_HELD_MINUTES=600" "DX_ACT5_ACCOUNTS=10" "DX_ACT7_STREAM_CHECK=1" \
  "DX_ACT7_TAPE=production-S:394" "TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1" "DX_ACT7_MULTI_KILL=1" \
  "DX_ACT5_CASES=control:progress:bytes:none:23.5:1:::300,many:progress:bytes:large:23.5:1:multi:admission:14400"
discard
```

With run C's calibration accepted, add `TX2_SETTLE_COST=<accepted>`, set the window to 9000 and `DX_HELD_MINUTES=420`.

**Duration** today's model: 6 h 20 min to 9 h 10 min (copy 3, boot and checks 6, account 0 3, control 5, enrolment of
nine accounts 18 to 25, Publishes 2, the window 240 and settlement up to 330, the check 100 to 180). Calibrated: 4 h 50
min to 6 h 10 min. **Cost** USD 6.90 to 10 today; USD 5.30 to 6.70 calibrated.

**Adding them to the session list** (`v01/READINESS.md`): after step 6, (a) 2 h 15 to 2 h 30; then (C) 1 h 35 to 1 h 50
if (a)'s calibration qualifies; then (b) 2 h 35 to 3 h; then (c) 4 h 50 to 9 h 10 (shortest with the calibration).
All four: about 11 h 15 min to 16 h 30 min, USD 12.30 to 18.

### 6.6 Predictions (written before any run) and what would show each wrong

| Quantity | (a) one account, fresh | (b) three, 1 billion | (c) ten, 1 billion | Wrong if |
| --- | --- | --- | --- | --- |
| Aged adoption before any write | — | 20,020 subjects; about 2,000 aged per account; every aged row equal to the regenerated tape | same | any row differs (then the regeneration or the copy is wrong; nothing is written) |
| Frames refused (progress precondition) | 0 (the head arm: at most 1% committed, at least 3,000 refused in 300 s, as ACT5) | 0 | 0 | any refusal in a progress case |
| Frames per account (release plus R1's notices) | values 20,300, notices 57,600 + 6,640 (±5%) | same per account | same | outside ±5% |
| Changes / notices per account | 5.94 million / 2.00 million (+ R1's 39,000 first) | same | same | more than 2% off |
| Settle time | 46 to 76 min (central 58), inside the 90 min window | 65 to 100 min (central 80), inside the 100 min window | 3.4 to 5.5 h (central 4.4): the first 4 h beside saves | (a) over 90 or under 35; (b) over 120 or under 50; (c) over 6.5 h or under 2.5 h |
| Turns between accounts | — | each account within 10% of the others' committed frames in every minute while all settle | same | an account below half of another's in any minute |
| Serial apply per frame (counters) | p50 2 to 3.5 ms, p99 under 6 ms; real work 30 to 45% of the estimate; `calibrate.ts` model at or below 2,500 / 25 / 55 | same | same | p50 over 5 ms or p99 over 8 ms (then the estimate is not conservative and the calibration is refused) |
| With the calibration (C) | frames per subject 0.425 (±5%); settle 26 to 42 min; serial apply p99 under 8 ms | — | 1.6 to 2.5 h | p99 over 8 ms, or saves' p99 more than 1.2 times run (a)'s settle window |
| Saves (live) | none refused or uncertain; account p99 within 1.3 times the control outside stall seconds | production-S per account: p99 within 1.3 times the control case | same | any refused or uncertain save; p99 over 1.5 times |
| Exactness | every change, notice, ledger equal to the oracle; reads exact | every change, notice and ledger of every account equal; about 3,000 reads and fact sets per account per release equal | same | any difference |
| Runner memory (stream check) | — | under 4 GiB heap; oracle processes under 3 GiB | same | out of memory |
| Streamed check time | 15 to 30 min | 10 to 18 min per account | same | over 30 min per account |

## 7. Not verified

- **Nothing at full size.** Every count is from a toy of 8 subjects per account and 400 aged saves.
- **The 1 billion bundle's ledgers were not read on the Mac** (the bundle is in object storage). The EDN reader and the
  replay were proven on the toy's ledgers written by AGE1's own `pr-str` and on a unit test; at full size the aged rows
  check (every roster subject, before any write) is what proves them, and it stops the run if they disagree.
- **Real transactor work per frame is derived** from S1's ladder of ordinary saves, not measured for settlement frames.
- **The calibrated estimate is unmeasured**: `TX2_SETTLE_COST` is built and its frame counts are counted, but whether
  frames of that size keep their serial apply under 8 ms is what runs (a) and C decide.
- **Per-account pause and pace at full size** is a manual step in (b), proven at toy size only (ACT5 `pause-p`).
- **Two settling processes per database** are not covered (one runner settles every account, as ACT5).
- **The fetch and extraction of the 1 billion cluster** on a new machine is not timed.
- **Mac clocks:** all diagnostic.

## 8. Evidence (private, `evidence/DX-ACT7/`)

`mini.tar.gz`: every miniature run (logs, toy handoffs, the replay cross-check, each case's counts, frame counters);
`frames-account-*.json`: section 4's counts. The runs on the pushed head are named `final-*` inside the archive.
