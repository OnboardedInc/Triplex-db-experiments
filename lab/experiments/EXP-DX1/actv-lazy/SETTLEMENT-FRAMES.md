# Settlement frames sized by bytes (`TX2_SETTLE_FRAMES=bytes`, default off)

Builder DX-ACT4, 2026-11-24, branch `exp/DX-ACT4-settlement-frames` from `exp/DX-INT1` `9e02cf1d2`. Mac work is
correctness at toy size; every Mac time here is diagnostic. Nothing here ran on a server (none is rented today).

## Short answer

1. **The background settlement of a large release now finishes.** With the option set, both writers (changed values
   and notice entries) fill each frame subject by subject up to the writer's own bound (8 ms of estimated service and
   64 KiB of estimated wire, checked by the same function in `Archive.write`), and split a subject whose changes alone
   exceed it. At toy size the 20 forms and 20 policies release settled completely, after both writers were killed
   mid-release and resumed, equal to the oracle and to an independent statement of the form rule.
2. **Pages no longer store the full answer beside each subject's changes.** One reader used it: a read at the release's
   own basis took the stored answer instead of working it out. With the option set that read is worked out from the
   record like every read before settlement; the gates check it gives the same answer.
3. **A frame still holds the single writer for at most 8 ms of estimated service**, the same bound as before; frames
   now sit close to it (p50 7.3 to 7.8 ms) and there are more of them (about 22,700 value frames and 50,000 notice
   frames for 100,000 subjects owing 20 forms, against 6,250 and 25,000 frames for the small release).
4. **Fault found and fixed (not an option):** a release that changes only forms or policies selected no subject for
   its notices outside the held campaign, so its owed notices were never recorded (`strategy()` in `join/index.ts`
   looked only at the eleven rules). It now selects every subject. LARGE-RELEASE.md section 4 item 5 said this case
   selected the whole census; it did not.
5. **The 39.4 saves/s slowdown during Publish is mostly not Publish.** In every 100-second window at 394 saves/s in all
   (control windows too) one to three whole-store stalls of 0.13 to 0.71 s set the save p99; they line up with the
   transactor's index jobs. Outside those seconds the Publish windows' save p99 is 0.76 and 1.07 times the control with
   per-save credits, and 1.54 and 2.02 times with whole-turn credits. Details in section 8.

## 1. The frame rule and the split rule

**Frame rule.** A frame's candidates are the rest of the current census page of 64 subjects (frames never cross a
page). The frame takes the longest run of whole subjects, in census order, that stays within the writer's bound when
the frame is built exactly as it will be written (the same ops `Archive.write` checks); the next frame starts at the
first subject left out. A value frame is the progress change and one page of `{subject, changes}`; a notice frame is
the ledger change of each subject it finishes, the cursor change and one packet of deliveries.

**Split rule.** If the first subject left out is the first one in the frame with anything to write, it alone exceeds the
bound. The frame then also takes the longest run of that subject's next units that fits (a value frame: its next
changed values; a notice frame: its next deliveries, without its ledger change), and records where it stopped
(`part` in the progress or cursor, `part`/`tail` on the page or packet). The next frame continues the same subject at
the next unit. A subject's notice ledger change is written with its last deliveries, or in a frame of its own after
them. A single changed value, or one subject's ledger value alone, larger than the bound is refused as before; with
the synthetic forms a ledger value reaches that at about 200 owed forms per subject (12.5 KB packed at 200 forms).

**What a reader sees between two halves of a split subject.** Reads never consult the settled pages or packets; every
read of a subject at a position works its answer out from the permanent record (the release marker) and the
subject's facts at that position, before, during and after settlement. So a half-written subject changes no answer.
The stored changes of a split subject are complete only when its last part is written; `stored()` joins the parts and
refuses a part that does not continue the same subject at exactly the number of changes already joined. A notice
recipient that has the first part of a subject's deliveries has an exact prefix of the ordered stream (each delivery
carries its own sequence per item), the same as between any two frames today. The subject's ledger keeps its earlier
state until its last part, so a restart works the same deliveries out again and skips the `part` already recorded.

**Durability and repeats.** Progress is durable at the last committed frame (values: the `values:<seq>` row with
`through`, `part`, `frame`; notices: the cursor with `start`, `part`). The frame chosen from a given progress row is
always the same (its candidates are the rest of the page, its content the data at the record's cut), so a frame
retried after a lost reply has the same command id and is recognized; and every frame commits only if the account's
head is still the one its progress was read at, so two different frames can never both follow one progress row.
Evaluated subjects are kept in memory for the rest of their page (keyed by the release, the removal sequence and the
page), so each subject is read and evaluated once per page however many frames the page takes.

**A second release during settlement** supersedes as before: the older release's values progress is marked
`superseded` at its next frame; its notices are still recorded in full, in order.

**Framing is chosen per release and per notice event.** A release keeps the framing it started with (its progress row
names it), so a restart with the option changed resumes it as it began; the notice cursor changes framing only at an
event boundary.

## 2. Who read the full answer stored beside each subject's changes

| Reader | What it used | What it needs now |
| --- | --- | --- |
| `Archive.reader()` (the `receipt-archive` route of `LazyReader`), for a read pinned exactly at a release's position and valid time | the stored answer JSON of that subject, to skip pulling and evaluating | nothing: with the option set the read is worked out from the record (route `authoritative-source`); the toy gates check the answer equals the oracle's and the old route's |
| `Archive.stored()` and its callers (held campaign first-settlement check, settle-gate, settle-price, erase1 regression) | every changed subject's `{subject, json, changes}` for comparison with the oracle | the changes only; the held campaign compares `{subject, changes}` when the release was settled by bytes |
| Anything else | none found (`grep` for the page key, `unpack<Answer`, `receipt-archive`) | — |

So the pages store `{subject, changes}` (and `part` for a split piece) and nothing else. Per subject owing 20 forms
that is 2.5 KB packed instead of 5.5 KB with the answer (measured with the kernel on deep toy subjects).

## 3. Gates at toy size (Mac, diagnostic clocks)

**`join/settle-frames-gate.ts`** on the toy stack (`engine.mjs ha1 --experiment load-fair --diagnostic --holder DX-ACT4`
with `DX_ACT4_GATE=1`), 72 deep subjects (two census pages), real stores, at `fa812ca31`: **pass**.

| Part | What ran | Result |
| --- | --- | --- |
| A. Small release, both framings, two stores seeded alike | R1 then R2, each settled | changed values (subject and changes), notice deliveries and ledger values byte-identical between the framings (same SHA-256), and equal to the oracle; values 10 frames by count, 5 by bytes; notices 36 and 29. A read at the release's basis: archive route by count, worked out by bytes, the same answer. The old framing refuses the 20-forms release at its first values frame ("Bulk batch exceeds W1 service estimate") |
| B. 20 forms and 20 policies, every subject owes | values writer killed after 2 frames (11 subjects), notice writer after 3 frames; resumed | 15 value frames; 4,272 changed values and 1,440 notices, equal to the oracle and to the independent rule (72 of 72 subjects owe); reads during settlement equal the oracle |
| C. Second release while the first is half settled | 24 forms at 500 permille, values killed after 1 frame; then R2 published | the half-settled release marked superseded at subject 14; its 136 notices recorded; R2 settled and equal to the oracle |
| D. 150 forms and 150 policies (each subject exceeds one frame) | values killed after its first (split) frame, notices after 2 | 144 value frames, 72 ending inside a subject; 144 notice packets, all ending inside a subject; 32,040 changes and 10,800 notices equal to the oracle and to the independent rule |
| Every notice of every release | all 12,519 deliveries in order | equal to the oracle; delivered once to a recipient (a second delivery adds 0); every ledger equal to the oracle's item states |
| Frame bound | 168 value frames and 352 notice frames in the gate's own process | estimated service at most 8,000 µs and 7,991 µs; wire at most 48,406 and 45,289 B; rows at most 3 and 11 |

**`join/frames-check.ts 256`** (no database): drives the writers' own frame builders (`valuesFrame`, `noticeFrame`)
over 256 deep subjects for 11 release pairs, checks every frame fits, the frames joined give back exactly the kernel's
changed values and notices, and the form-adding releases match the independent rule. **Pass** (output in the private
evidence, `frames-check-256.json`). Frames per 256 subjects:

| Release pair | Changed values | Notices | Value frames (subjects per frame p50) | Notice frames (p50) |
| --- | ---: | ---: | --- | --- |
| R1 from nothing (small) | 2,465 | 100 | 6 (56) | 17 (7) |
| R1 → R2 (small) | 1,527 | 255 | 4 (64) | 49 (4) |
| R1 + 20 forms, all owe, from nothing (the server forecast's case) | 17,669 | 5,220 | 58 (4) | 128 (2) |
| R2 → R2 + 20 forms, all owe | 15,204 | 5,120 | 52 (5) | 230 (1) |
| R2 → R2 + 20 forms, one in ten owes | 1,650 | 560 | 7 (47) | 25 (7) |
| R2 → R2 + 150 forms, all owe | 114,030 | 38,400 | 512 (two per subject) | 768 (three per subject) |

**Held campaign, toy** (8 subjects, eight 8-second windows): with `TX2_SETTLE_FRAMES=bytes DX_ACT3_SETTLE=1
DX_ACT4_INITIAL=large DX_ACT3_RELEASE=forms=20,policies=20,permille=1000`: first release R1 + 20 forms settled (2
value frames, 6 notice frames), 560 changed values and 168 notices equal to the oracle, 474 changes and 160 notices
equal to the independent rule; every window's Publishes inside one second; 0 read and 0 visibility failures. The
default campaign (nothing set) is in section 9.

**Unit tests:** `join/frames.test.ts` 5 of 5 (the rule on synthetic sizes: whole subjects, split, closing piece alone,
refusal, estimate); `join/ranges.test.ts` 1 of 1 after the selection fix; `bulk.test.ts`, `held.test.ts`,
`observations.test.ts` pass. Type check of `actv-lazy` clean.

## 4. The independent check

The forms and policies were added to the kernel and the oracle together, so their agreement does not show either is
right. `join/form-expect.ts` states the rule a third time from its text alone (bucket = first eight hex digits of
SHA-256 of the subject mod 1000, below the permille owes; due at the next midnight after the start date plus the
form's business days, Monday to Friday; overdue at or after it; a due obligation while before it; one notice work
item per policy with notice set), with its own hash call, its own calendar walk (JavaScript `Date`, not the kernel's
`dates.ts`) and its own key and value shapes. For a release that only adds forms to a form-free predecessor it
requires every stored change and every recorded notice to be one it predicts, and nothing else (the held campaign's
first release from nothing compares only the policies' changes and the form notices). It agreed on 256 + 256 + 72 +
72 + 8 subjects (frames-check, toy gate parts B and D, held toy).

## 5. The small release: what is identical and what is not

Identical with either framing (checked by SHA-256 in gate part A): each subject's changed values (keys, values,
order), the notice deliveries (content and order), each subject's ledger value, what a recipient receives, and every
read's answer. Different by design: the value pages (no full answer; numbered by frame; up to 64 subjects each instead
of 16), the progress row and the cursor (they name the framing and the split position), the notice packets' boundaries
and batch numbers (about 4 to 7 subjects each instead of 4), the route of a read at the release's own basis (worked
out instead of read back), and so the number of settlement transactions (values 5 against 10 and notices 29 against 36
at 72 subjects; at 256 subjects R1 → R2 takes 4 value frames instead of 16 and 49 notice frames instead of 64).

## 6. The live-traffic bound

Every frame passes the same admission as before (`frameEstimate`: estimated service `3.5 ms + 45 µs per row + 70 µs
per KiB` at most 8 ms, estimated wire under 64 KiB), and the fill uses that function on the exact ops, so **the longest
single hold of the writer one frame can cause is 8 ms of estimated service, the same as the old frames' bound**. The old
frames that were admitted could also reach 8 ms (the small release's took 7.4 ms); the ones that would have gone over
were refused and settlement stopped. What changes is how often: frames now sit near the bound (p50 7.3 to 7.8 ms) and a
large release has many more of them. The fair-turn rule is unchanged: a bulk turn runs only when no live write of this
process is in flight or after eight live completions, one turn at a time, so a live save waits behind at most one
frame. The estimate is a model; the real service time per frame has not been measured on a server (the toy's
client-side turn durations, 43 to 257 ms, are Mac clocks).

**A risk found, not changed:** every settlement frame commits only if the account's head is still the one it read
(`requireDatomicSourcePosition`, scope-wide). In the held campaign the first settlement runs before the live windows,
so this never met live saves. Beside live saves in the same account (one every 25 ms at 39.4/s) most frames would be
refused and retried, old or new framing alike. The background writing beside a busy account's live saves has not been
measured anywhere; the 14.5 and 19.2 minutes of 2026-11-23 ran with no live saves.

## 7. Fault fixed: notice selection for a release that changes only forms or policies

`strategy()` (`join/index.ts`) decides which subjects a release's notices visit outside the held campaign. It compared
only the eleven rules (`W0.diff`), so a release that added forms and policies chose `none`: no subject was visited and
its owed notices were never recorded. The settlement-frames gate found it (event 3 finished in two empty frames).
`W0.extensionDiffers` (added by DX-ACT3, unused until now) now makes such a release select every subject. Releases
without forms or policies (W0 R1 to R3) take the same path as before. The held campaign selects every subject anyway, so
the server runs of 2026-11-23 were not affected.

## 8. Why live saves' p99 rose to 1.7 to 2.3 times their control at 39.4 saves/s

Evidence: `bench4-publish-r1` (small release) and `bench4-publish-large`, every save's due, dispatch, send and end
times, the write gateway's stage timeline per save, each Publish's pause, drain and durable times, and the
transactor's index adoptions. Read with `join/stall-reading.py` (committed).

**Which saves waited, and behind what.** At 39.4 saves/s per account (394/s over ten accounts) the slowest 1% of
saves are not spread out: they fall in one to three bursts per 100-second window, each 1 to 2 seconds long, hitting
all ten accounts equally. Inside a burst the transactor completes nothing for 25 to 490 ms at a time (for example six
saves of six accounts submitted together and completed 137 ms later), and saves then wait at the client for a credit
(in the small run's two whole-turn windows the slowest 1% waited 177 and 328 ms there, p50, and their own trip
through the gateway took 8 and 9 ms). Bursts happen in the control windows too. Of the 14 bursts at 39.4/s, 3 fall at
an index adoption (within 0.1 s), 7 fall 8 to 18 s before the next adoption (where an index job starts; the earlier
import study found allocation stalls at index-job starts), 3 in the first second of a Publish window (window starts
show the same in the 23.5/s controls), and 1 has no adoption inside its window to compare. That link is a timing
correlation (the window files hold no collector pauses).

| Window (39.4/s) | Save p99 | Stalls (start s, worst save ms) | p99 outside stall seconds | Ratio to control: all / outside stalls |
| --- | ---: | --- | ---: | --- |
| Small, whole-turn, control | 118.9 | 54.5 (276), 67.0 (183) | 33.2 | |
| Small, whole-turn, Publish | 276.0 | 0.0 (126), 29.3 (283), 73.0 (390) | 51.2 | 2.32 / 1.54 |
| Small, per-save, control | 165.4 | 33.4 (203), 93.7 (435) | 35.9 | |
| Small, per-save, Publish | 273.0 | 0.0 (180), 52.8 (540), 68.2 (134) | 27.2 | 1.65 / 0.76 |
| Large, whole-turn, control | 46.0 | 53.1 (219) | 35.0 | |
| Large, whole-turn, Publish | 101.2 | 20.0 (185) | 70.8 | 2.20 / 2.02 |
| Large, per-save, control | 35.5 | none | 35.5 | |
| Large, per-save, Publish | 611.6 | 0.0 (163), 50.3 (711) | 38.1 | 17.2 / 1.07 |

**The Publish's own part.** A Publish pauses every account's save admission until it is durable: pause to durable
p50 26 to 37 ms, p99 74 to 123 ms at 39.4/s (drain of in-flight saves p99 3 to 27 ms; the Publish's own commit behind
the transactor's queue the rest). Saves whose life overlapped such a hold are 0.8 to 1.3% of all saves, near the 1%
that sets the p99. With per-save credits the Publish windows outside the stalls match their controls (0.76 and 1.07).
With whole-turn credits they are slower outside the stalls too (1.54 and 2.02): of the saves above the control's p99
there, 150 and 251 overlapped a hold and 109 and 131 came within 300 ms after one, but most (733 and 1,409) came
elsewhere, clustered around the index jobs (in the large release's window: seconds 11 to 22 and 27 to 28 before and
at the adoption at 27.8 s, and second 86 at the adoption at 86.0 s); these two Publish windows each held two
adoptions against one in their controls.

**Not involved:** settlement frames (the first settlement was skipped in both runs, so no frame ran during any window)
and the probe and deadline reads (they go to the read gateway; the slow saves' time is spent waiting for the
transactor).

**Fix.** Not small, so not built: the stalls belong to the transactor's indexing at this load (P2, P8: memory index
size, heap headroom), and the Publish hold is the priority turn itself. What the next run should do instead: judge the
live ratio over windows long enough to hold the same number of index jobs (300 s or more) or report it outside stall
seconds as above, and use per-save credits (already the proposed default).

## 9. Server command (when a machine is rented) and predictions

Run the held campaign with the first release R1 + 20 forms + 20 policies, every subject owing, settled by bytes before
the windows, then the four 39.4/s windows. Commit: the head of `exp/DX-ACT4-settlement-frames` carrying this page; build
as for `PART9.md` (the w0 package from the same commit), fresh prepared copy (about 4.4 minutes).

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "TX2_SETTLE_FRAMES=bytes" "DX_ACT3_RELEASE=forms=20,policies=20,permille=1000" \
  "DX_ACT3_SETTLE=1" "DX_ACT4_INITIAL=large" "DX_HELD_MINUTES=120" \
  "DX_HELD_WINDOWS=barrier6/39.4/0,barrier6/39.4/1,rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
```

**Duration:** 55 to 85 minutes (boot and checks 4, enrolment and first Publish 2, settlement 25 to 45, the oracle and
independent check of 6.9 million changes and 2.04 million notices 5 to 15, four windows about 9, reopen 1). The limit
is raised to 120 minutes for this run only.

**Predictions** (from the small release's measured 872.8 s for 6,250 value frames and 1,154 s for 25,000 notice frames,
split into a per-frame part of 40 to 70 ms (values) and 25 to 40 ms (notices) and a per-subject part of 3 to 6 ms, and
frames-check's frames per subject):

| Quantity | Prediction | Shows the analysis wrong |
| --- | --- | --- |
| Settlement completes, every frame within the bound | yes; frame estimate at most 8,000 µs | any refusal, any frame estimate over 8,000 µs |
| Changed values / notice entries | 6.90 million / 2.04 million (frames-check: 69.0 and 20.4 per subject) | either more than 2% away |
| Value frames / notice frames | 22,660 / 50,000 (±5%) | outside 21,500 to 23,800 or 47,500 to 52,500 |
| Values written | 20 to 40 minutes (central 29) | over 45 or under 15 minutes |
| Notices written | 25 to 45 minutes (central 32) | over 50 or under 20 minutes |
| Exactness | every stored change and notice equals the oracle's; the independent rule agrees for all 100,000 subjects | any difference |
| Runner memory | under its 8 GiB heap (about 5 GiB for the stored changes and packets it compares) | out of memory: the check must stream |
| Publish windows, live save p99 against matched control | per-save credits: 0.7 to 3 for all saves (set by stall luck), 0.8 to 1.2 outside stall seconds; whole-turn: 1.0 to 2.5 all, 1.3 to 2.1 outside stalls | per-save outside stalls above 1.5 (Publish itself would then slow saves beyond its hold); or stalls in the Publish windows at least twice as many as in the controls over both modes |
| First correct answer, Publish windows | as the large release on 2026-11-23 at 39.4/s (p50 63 and 67 ms) within 15 ms | outside that |

Live saves do not run beside this settlement (the runner settles before the windows), so it says nothing about the
risk in section 6.

## 10. Not verified

- Any time at 100,000 subjects; the per-frame service time behind the 8 ms estimate on a server.
- Settlement beside live saves in the same account (section 6), with either framing.
- The link between the 39.4/s stalls and index jobs is a timing correlation; no collector pause data was in the window
  evidence.
- A subject whose own notice ledger value exceeds the bound (about 200 owed forms) is still refused; a ledger split by
  item is not built.
- The held toy campaign and the gate use deep toy subjects; real forms and policies (other attributes, shared forms)
  are not modelled.

## Files

`join/frames.ts` (rule, estimate, mode), `join/archive.ts` (`valuesFrame`, byte frames, `stored()` by frame, reader),
`join/recorded.ts` (`noticeFrame`, byte frames, packets with `part`/`tail`), `join/settlement.ts` and
`join/settle-child.ts` (framing passed through; kill after N frames), `join/index.ts` (selection fix),
`join/form-expect.ts` (independent rule), `join/frames-check.ts`, `join/frames.test.ts`, `join/settle-frames-gate.ts`,
`join/held-campaign.ts` (`DX_ACT4_INITIAL=large`, changes-only comparison, frame evidence in `held-setup.json`),
`join/held-server.sh` (`DX_HELD_MINUTES`), `join/stall-reading.py`, `ha1/local.ts` and `load1/fair-local.ts` (toy
hooks for holder DX-ACT4). Evidence (private): `evidence/DX-ACT4/`.
