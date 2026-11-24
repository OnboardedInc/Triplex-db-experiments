# What a large release costs: 20 new forms and 20 new policies in one Publish

The owner's question (2026-11-23): some saves will be big, for example 20 new forms and 20 new policies shipped in one
save. How would that look, given what we know? This note answers from the code on `exp/DX-INT1` (`61a794c1d`) and from
what is measured, and adds a release-size setting so the answer can be measured at 100,000 subjects. Each number is
labelled **measured** (with where), **derived** (from which measurements), or **unknown**.

## Short answer

1. **The one-second path barely grows.** Publish writes one transaction of four fact changes whatever the release size
   or the number of subjects. The record holds the new release document twice and the old one once, so it grows with
   the documents, not with subjects: 5.3 KB of operations for the small test release, 17.7 KB for 20 forms and 20
   policies (measured on the Mac, and identical for 1 subject in 10 or all subjects owing). Reads before settlement work each answer out from the record; 20
   more policies add about 0.1 ms of evaluation per read.
2. **The background writing does not finish today.** The two background writers (changed values and individual
   notices) write a fixed number of subjects per frame (16 and 4). With 20 owed forms each subject's answer is about
   five times larger, so every frame exceeds the writer's own bound (64 KiB and 8 ms of estimated service) and the
   writer refuses it. Settlement stops at the first such frame. Reads stay correct (they derive from the record),
   but the values and notice entries are never written. This holds whether every subject owes all 20 forms or one in
   ten does. It is proven at toy size through the writers' own admission check.
3. **Fix before the full-size background run:** size frames by bytes instead of by subject count (and stop storing the
   full answer beside each subject's changes). Until then, tonight's server run can measure only the one-second path
   for the large release.

## 1. What a release is in this store

**The permanent record.** `JoinedAccount.publish` in `owed` mode (the held campaign's mode) writes one native
transaction through a priority admission turn (`AccountAdmission`, kind `publish`), on the general writer:

| Change | Content | Grows with |
| --- | --- | --- |
| Marker `lazy/activation` (assert) | epoch, sequence, **old release document**, **new release document**, release hash, source cut, valid time, census root hash, notice recipe hash, output summary (zero subjects in `owed` mode) | document size (twice) |
| Notice tail (retract + assert) | sequence, parent hash, release name, valid time, custom release hash | nothing |
| Notice event `event:<n>` (assert) | the recipe: **new release document**, census root, source cut, request id | document size (once) |

- The census is referenced by its root hash; no subject is listed, read or evaluated at Publish (`ids = []` for
  `owed`). **Size ≈ 3.0 KB + 1.2 × (2 × new document + old document)** of operations (the 1.2 is JSON escaping inside
  string values), fitted to the toy measurements in section 6: 5,268 to 5,273 B for R2 → R3, 17,618 to 17,663 B for
  R2 → R3 with 20 forms and 20 policies, 11,176 to 11,201 B for the way back.
- The document is the **whole** definition set in force (all eleven W0 rules plus, now, forms and policies), not a
  delta. A release that adds 20 forms to an account that already has 200 carries all 220.
- **Measured** (2026-11-19, `COST.md`): 22.2 KiB native write request and four fact changes at 1,000 and at 10,000
  subjects with W0 documents of 0.5 to 0.7 KB. **Measured** (2026-11-21, 25,000 deep subjects): four fact changes,
  about 22 KiB, 166 owed notices recorded, no subject visited.

**How every read returns the new answers before any value is written.** A connected reader (`LazyReader`) queries the
native head, reads the account's winning release marker at that position, pulls the subject's pinned world (the
subject and its dependencies) and evaluates the W0 kernel under the marker's document, then checks removal and
admission. **Measured** (Mac, diagnostic, `STAGES.md`): pull 3.5 to 18.5 ms, evaluate and serialize 0.8 to 2.1 ms, for
eleven rules. The rule evaluation is linear in the number of policies:

| Release (deep toy subjects) | Kernel evaluation per subject, Mac, diagnostic | Answer JSON per subject (p50) |
| --- | ---: | ---: |
| W0 R1 / R2 / R3 (eleven rules) | 15 to 19 µs | 2.6 to 3.0 KB |
| R3 + 20 forms + 20 policies, every subject owes all 20 | 85 to 110 µs | 15.3 KB |
| R3 + 20 forms + 20 policies, one subject in ten owes all 20 | 40 to 42 µs (mean over all subjects) | 4.2 KB (p50 over all) |
| R3 + 1 form + 1 policy, every subject owes it | 19 to 23 µs | 3.7 KB |

(`large-release-check.ts`, 64 and 256 subjects.) The synthetic policies read only `startDate`, which the pull already
fetches; a real policy that reads other attributes adds them to the pull.

**What the background writing does per subject** (`Settlement`, `Archive`, `RecordedNotices`, `BulkQueue`):

| Writer | Frame | Per subject | Commit |
| --- | --- | --- | --- |
| Changed values (`Archive.turn`) | 16 subjects in census order | evaluate old and new release at the record's cut; if anything changed, append `{subject, changes, full answer JSON}` to the frame's page (deflated, base64) | one bulk commit, class `activation`: progress change (retract + assert) and one page assert |
| Notice entries (`RecordedNotices.turn`) | 4 subjects | W0 `publish` over the subject's work items against its stored ledger; deliveries for new or changed items | one bulk commit, class `notice`: per changed subject a ledger change, the cursor change, one packet of deliveries |

Both go through `Archive.write`, which refuses a frame whose estimated wire size is 64 KiB or more or whose estimated
service time (`bulkUs` = 3.5 ms + 45 µs per row + 70 µs per KiB) is over 8 ms. `BulkQueue` is the fair-turn rule: a
bulk turn runs only when no live write is in flight or after eight live completions, one account's turn at a time,
then waits `elapsed × (1/duty − 1)` (duty 0.5 by default, 1 in the held campaign). A turn, once sent, is not
preemptible.

## 2. The release the tests used so far

| | Baseline Publish (R1 from nothing) | Burst Publishes (R2 ↔ R3) | 20 forms + 20 policies |
| --- | --- | --- | --- |
| Forms added | 0 | 0 | 20 |
| Policies / rules changed | 11 rules (all new) | 1 rule (overtime scope) | 20 policies added |
| Document bytes | 501 | 531 to 704 | 5,746 to 5,949 (12 fields per form) |
| Subjects with a changed value (256-subject sample) | 256 of 256 | 0 of 256 | 256 of 256 (all owe) / 28 of 256 (one in ten owes) |
| Changed values per affected subject | 9.6 | 0 | 59.4 / 58.9 |
| Notices per affected subject | 0.39 | 0 | 20 / 20 |

(**Measured** with the kernel and the oracle on deep toy subjects, `large-release-check.ts`.) The burst Publishes that
gave the 19.83 / 36.72 ms first answers changed nothing for any sampled subject: they priced the record and the read
path, never background writing. The large release is about 8 to 12 times the document, 6 times the changed values per
subject of the baseline and 50 times its notices.

## 3. Worked example: 20 new forms and 20 new policies, 100,000 subjects in one account

| Step | Cost | Status |
| --- | --- | --- |
| Definitions' own save | None separate: the definitions are the release document and travel inside the Publish transaction (four fact changes, general writer, priority turn). If the product first saves the 40 definitions as entities (about 340 facts at 12 fields per form), that is one ordinary save on the general writer (the ordered per-subject writer takes 1 to 256 ordered ids and 1 to 3 replaced facts; this is neither), about 41 ms of serial apply at 0.12 ms per fact (DX-W2), well under the 4 MiB request limit | derived |
| Permanent record | 17.6 to 17.7 KB of operations and 4 fact changes (small release 5.3 KB), the same with 1 subject in 10 or all owing. Independent of subjects. Real definitions are larger: 3.0 KB + 1.2 × (2 × new + old document) | measured at toy size (8 subjects); 100,000 derived (no subject term in the code) |
| Limits on the record | 4 MiB request limit in the gateway (`main.clj` line 171) and the client (`DatomicClient.ts` line 434): the document must stay under about 1.3 MiB. Publish is 4 changes, so the 256-id ordinal and the 96-row bulk frame do not apply. `TX2_WRITE_BUDGET_US` is unset in the held profile | derived from code |
| Time to first correct answer | Small release at 25,000: 19.83 / 36.72 ms (p50 / p99) at 3.5 saves/s. The large release adds 12.4 KB to the record (about 0.9 ms at 70 µs per KiB of writer time, plus transfer) and about 0.1 ms of evaluation and the larger answer's serialization: forecast +1 to +6 ms. On the Mac toy (diagnostic) the large and small releases gave first answers in the same range (58 to 329 ms large, 63 to 288 ms small), dominated by the Mac stack | small release measured; large derived; 100,000 with priority not yet run (tonight) |
| Read before settlement | Pull unchanged (synthetic policies read `startDate` only); evaluation 15 to 19 µs → 88 to 110 µs; answer 3.0 → 15.3 KB | measured on the Mac (diagnostic) |
| Changed values to write | N × Σ policies (share owing) × 3 (the form task, its due obligation and the notice work item; 2 once the due date passes). All owe: **6,000,000** for 100,000 subjects. One subject in ten owes all 20: **600,000** for 10,000 subjects | derived from the formula, checked against the oracle on 256 subjects |
| Notice entries to write | N × Σ policies (share owing). All owe: **2,000,000**. One in ten: **200,000** | same |
| Background frames | 6,250 value frames (16 subjects) and 25,000 notice frames (4 subjects) in either case. All owe: every value frame is about 236 to 245 KB estimated and 21 ms; every notice frame about 58 KB and 10.6 ms. **All refused** (bound 64 KiB and 8 ms) | measured through `Archive.write`'s admission at toy size |
| One subject in ten owes all 20 | A value frame with 3 or more owing subjects among its 16 exceeds the bound (binomial: 21% of 6,250 frames); a notice frame with 2 or more among its 4 (5.2% of 25,000). At toy size (256 subjects, 28 owing): 4 of 16 value frames and 2 to 5 of 64 notice frames refused, worst 64 KB / 9.3 ms and 32.6 KB / 8.03 ms. The first refused value frame is expected within the first five | measured at toy size; full size derived |
| Time to write everything if frames were admitted | Per-frame time is dominated by the pulls and round trips (Mac 10,000-subject run: 216 s values, 254 s notices), not by bytes. Same frame counts, about 4 to 5% more per frame: 17 to 42 min values, 21 to 47 min notices (the PART9 small-release forecast 16 to 40 and 20 to 45, scaled) | derived; small release unmeasured at 100,000 |
| Single-writer time inside that | Values 6,250 × 21 ms ≈ 131 s; notices 25,000 × 10.6 ms ≈ 265 s; about 400 s total (small release about 240 s) | derived from `bulkUs` |
| What live saves and reads see meanwhile | Reads: unchanged answers, derived from the record until the page is written. Saves: one bulk turn per eight live completions; a save that arrives mid-turn waits for it, up to 21 ms with the large frames (the 8 ms bound exists to cap exactly this). Import beside live traffic measured busy-account save p99 at 36 to 45 ms | derived; import measured (DX-LOAD2) |
| What actually happens today | Publish and every read are correct; settlement stops at the first refused frame and reports the failure (`Settlement.idle` rethrows it); no values or notice entries are written for that release | proven at toy size |
| A second release during settlement | Publish is not blocked (no prepared state; priority turn). The values writer marks the older release's progress `superseded` at its next frame and starts the newer one from subject 0; notice entries of the older release are still recorded in order (debt is never retired). Reads switch to the newer record at once | from code (`Archive.turn`, `Settlement.run`) |
| A restart during settlement | Progress is durable (`values:<seq>` with `through`, the notice cursor). On wake the worker reads the journal and resumes at the last committed frame; a frame's commit id is derived from its content, so a repeated frame is recognized, not doubled | from code; restart gates passed in earlier parts (`PART7.md`, crash gate) for the small release |

## 4. Limits and risks

1. **Hard cap, background writing.** Fixed subjects per frame (16 values, 4 notices) times a per-subject answer that
   grows with owed forms. **Measured at toy size:** one new owed form for every subject fits (7.3 ms of 8.0); two
   already make value frames refused (8.07 ms, R2 → R3 + 2); three make notice frames refused too (8.09 ms). So any
   release that gives every subject two or more new forms with notices cannot be settled today. The writer refuses
   rather than splitting: correct, but settlement stops. Even the W0 baseline frame uses 92% of the 8 ms (7.4 ms), so
   deeper subjects may reach the bound with no new forms at all.
2. **Each value page stores the full answer JSON beside the changes.** That is 15 KB of 19 KB per owing subject. The
   answer is derivable from the record and the source; storing changes only would cut the page about five times.
3. **One-second path grows with the document, not with subjects.** Three copies per Publish (about 2.4 bytes of
   operations per byte of new document, measured); the 4 MiB request limit allows roughly 1.3 MiB of definitions in
   force. At that size the single writer is held for roughly 280 ms by the `bulkUs` byte price (derived), and Publish
   fences every account's saves during its turn. A delta document (only the
   changed definitions, the rest by hash) would remove this growth. **Correction (DX-ACT6, 2026-11-24):** the binding limits are lower: the
   transact body carries each new value twice (a row and an escaped row text), so the 4 MiB request is reached by a
   first set between 0.50 and 0.70 MiB (measured on the toy), and the store takes one fact value of at most 1 MiB, which
   the marker (new plus old document) reaches at about 0.5 MiB for a release following a set of its own size.
   `TX2_RELEASE_DOCS=ref` stores the definitions by reference (RELEASE-LIMITS.md).
4. **Per-read cost grows linearly with policies:** about 4 µs per policy on the Mac plus the answer's size. Small at
   40 definitions; it matters only at thousands.
5. **Notice index.** For accounts that select subjects through the notice index (not the held campaign), a change in
   forms or policies now selects the whole census (`strategy` returns `all`), because the index does not know the new
   policies' inputs. Correct and conservative; slower for large accounts. **Correction (DX-ACT4, 2026-11-24):** at
   `f5f8c09ff` it selected no subject (`strategy` compared only the eleven rules), so such a release's notices were
   never recorded outside the held campaign; fixed on `exp/DX-ACT4-settlement-frames` (SETTLEMENT-FRAMES.md section 7).
6. **Oracle independence.** The forms and policies were added to both the TypeScript kernel and the Python oracle in
   the same change, by the same author, from the same rule text. The two agree on every answer, changed value and
   notice tested, but for these rules they are not independent implementations.

## 5. Making it measurable

**The setting.** `DX_ACT3_RELEASE=forms=N,policies=N,permille=N[,fields=N]` (`join/large-release.ts`). Unset, the
held runner is unchanged. Set, its R3 turns carry N synthetic forms (each with `fields` field names, due 1 to 10
business days after start) and N policies (policy k makes a subject owe form k when the subject's bucket, the first 8
hex digits of SHA-256 of the subject id mod 1000, is below `permille`, and sends one notice). Buckets depend on the
subject only, so `permille` is the share of subjects affected and each affected subject owes all N forms:
`permille=1000` is "every subject owes all 20", `permille=100` is "one subject in ten does". Every burst
Publish then adds or removes the 20 forms. The first release's full settlement is skipped unless `DX_ACT3_SETTLE=1`
(it would stop on the frame bound once a large release is settled; R1's own frames fit). The kernel
(`packages/w0/src/kernel.ts`, `release.ts`) and the oracle (`lab/oracles/domain/w0.py`) evaluate the forms and policies
identically; R1, R2 and R3 and their hashes are unchanged (174 kernel tests pass; the oracle's test results are the
same before and after, with five failures that exist on INT1). Each Publish now records its record's bytes and change
count (`recordBytesMax`, `recordChangesMax` per window).

**Checks without a database** (`join/large-release-check.ts PEOPLE OUT.json [SHAPE ...]`): for every release pair, the
kernel's answer JSON, changed values and notices equal the oracle's for every subject; each frame is passed through
`Archive.write`'s own admission with a stub queue.

## 6. Toy runs on the Mac (correctness; times diagnostic)

The held runner, unchanged apart from the setting, ran three times on the toy stack (`engine.mjs ha1 --experiment
load-fair --diagnostic --holder DX-ACT3` with `DX_ACT3_HELD=1`: ten accounts, 8 subjects in the Publish account,
eight 8-second windows, `barrier6` and `rolling6`, 3.5 and 23.5 saves/s, two Publishes per Publish window), at
`18d2d7a1d`, each with exit 0, no containers or networks left behind:

| Run | Release in the R3 turns | First-release settlement | Deadline Publishes checked against the oracle | Record per Publish (bytes of operations / changes) | Saves acknowledged / offered (diagnostic) |
| --- | --- | --- | --- | --- | --- |
| Default (setting unset) | W0 R3 | run: 86 changed values and 8 notices matched the oracle (as PART9) | 8 of 8, plus 2 reopened pins | 4,834 to 5,273 / 4 | all windows 28 / 28 at 3.5; 1,740 to 1,879 / 1,880 at 23.5 |
| `forms=20,policies=20,permille=1000` | R3 + 20 forms + 20 policies, all 8 subjects owe | skipped (by design) | 8 of 8, plus 2 reopened pins | 17,658 to 17,663 (adding), 11,196 to 11,201 (removing) / 4 | 28 / 28; 1,878 to 1,879 / 1,880 |
| `forms=20,policies=20,permille=100` | same, 1 subject in 10 | skipped | 8 of 8, plus 2 reopened pins | 17,618 to 17,623 / 4 | 28 / 28; 1,755 to 1,879 / 1,880 |

Every deadline answer and both reopened pins were compared byte for byte with the oracle's answer for the active
release (the runner stops on any difference). In the one-in-ten run none of the 8 toy subjects falls under the share
(their buckets are 219 to 992), so that run exercised only the "does not owe" path; the owing path at that share is
covered by `large-release-check.ts` (28 owing of 256). Two earlier attempts are kept and are not results: the first
stopped before any Publish because the toy harness did not set the store endpoints (fixed in `90ff3863f`), the second
completed the campaign but its harness rejected it because I changed a source file during the run.

Database-free checks (`large-release-check.ts`, 256 deep subjects, at `18d2d7a1d`): kernel and oracle equal for every
answer, changed value and notice in all eleven release pairs; frame results as in sections 3 and 4.

Evidence (private): `evidence/DX-ACT3/load1/load-fair-*.tar.gz` (sha256 `a7d1c308…` default, `5594c10a…` all owe,
`2fa6d4f3…` one in ten) and `evidence/DX-ACT3/check-256-subject.json` (`fcbe7d3c…`). `check-256.json` and
`check-64.json` are from the first bucket rule (per policy) and superseded.

## 7. Full-size runs at 100,000 subjects (server commands and predictions)

The commit for both runs is the one carrying this section on `exp/DX-ACT3-large-release` (it also holds the repair
for the bench 4 stop, [PUBLISH-STOP.md](PUBLISH-STOP.md)). Build it as for `PART9.md`; the w0 package must be rebuilt
from it. Each run needs its own fresh prepared copy (about 4.4 minutes).

**Run 1, small release, the windows bench 4 left unjudged** (about 28 minutes: boot and checks about 4, enrolment and
first Publish about 2, eleven windows about 21, reopen 1). The first settlement is skipped (measured tonight: 14.5 and
19.2 minutes). The two 3.5/s controls rerun so every ratio has its control in the same process:

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_SETTLE=0" \
  "DX_HELD_WINDOWS=barrier6/3.5/0,rolling6/3.5/0,rolling6/3.5/1,rolling6/23.5/0,rolling6/23.5/1,barrier6/23.5/0,barrier6/23.5/1,barrier6/39.4/0,barrier6/39.4/1,rolling6/39.4/0,rolling6/39.4/1" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
```

Without the two controls (nine windows, about 24 minutes), drop the first two entries; ratios against quiet are
then null and are taken from bench 4's controls.

**Run 2, large release, all twelve windows** (about 30 minutes; no first-release settlement by default for a large
release):

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  "DX_ACT3_RELEASE=forms=20,policies=20,permille=1000" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
```

The runner's own limit stays 87 minutes plus 90 seconds.

**Predictions, small release** (kept from `PART9.md`):

| Window | First correct p50 / p99 | Within one second | Read / save p99 vs quiet |
| --- | --- | --- | --- |
| Rolling 6, 3.5/s | 25–70 / 60–180 ms | 20/20 | 0.9–1.3× / 0.9–1.5× |
| Barrier 6, 23.5/s | 45–140 / 130–450 ms | 19–20/20 | 1.2–1.8× / 2–6× |
| Rolling 6, 23.5/s | 40–120 / 100–400 ms | 19–20/20 | 1.2–1.8× / 1.5–4× |
| Barrier 6, 39.4/s | 60–220 / 200–900 ms | 18–20/20 | 1.4–2.2× / >6× |
| Rolling 6, 39.4/s | 55–180 / 160–800 ms | 18–20/20 | 1.4–2.2× / 2–6× |

**Prediction for the stop (both runs):** visibility failures (a probe answering before the acknowledged Publish) in
0 to 3 of each rolling 6 window's 20 Publishes and in 0 of 20 at barrier 6, 3.5/s (bench 4: at least 1 at rolling 6
3.5/s, 0 of 20 at barrier 6 3.5/s); possibly more at 23.5 and 39.4 in both modes as the read gateway gets busier.
Each one fails the run's verdict at the end, by design, after every window has run and recorded itself; the
owner decides whether such a read is acceptable (PUBLISH-STOP.md section 2). The +1 s deadline reads are all at or
past their Publish.

**Predictions, large release** (on top of run 1 at the same rate and mode):

| Quantity | Prediction | Shows the analysis wrong |
| --- | --- | --- |
| Record per Publish | 4 fact changes; 17.6 to 17.8 KB of operations when R3 + forms follows R2 (toy: 17,658 to 17,663 B), about 11 KB the other way; the same as the toy within 2% | more than 2% above the toy, or more than 4 changes: the record depends on subjects |
| First correct answer, large minus small release, same rate and mode | p50 +1 to +6 ms, p99 +0 to +15 ms | p50 more than 10 ms above the small release |
| First correct answer, absolute | inside the small-release ranges above, +6 ms | outside them while run 1 is inside |
| Within one second | as run 1 at the same rate and mode | fewer than run 1 |
| Live read and save p99 against the matched control | run 1's ratios within 10% | a ratio more than 10% worse |
| Exactness | every probe, deadline and reopened answer equals the oracle's for the release in force at its basis | any exactness failure |

## 8. Not established

- Any time at 100,000 subjects for the large release (tonight's run would give the one-second path only).
- Background writing of a large release at any size: it does not run past the first frame until frames are sized by
  bytes.
- The real product's definition sizes. The synthetic form has 12 field names and the document is 5.7 KB for 40
  definitions; real definitions are larger, and the record grows three bytes per document byte.
- Policies that read attributes other than the start date (larger pulls), and policies that share a form.
