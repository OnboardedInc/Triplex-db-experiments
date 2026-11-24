# Owner head pair at 1 billion records: reading (server run of 85fc3a4bd, summarized on the Mac)

North star P2 and P4. [Predictions](SERVER-OWNER-HEAD.md#predictions-for-the-1-billion-pair-written-before-the-run) · [Bench 4 faults](SERVER-OWNER-HEAD.md#bench-4-faults-and-fixes-2026-11-23)

**Both arms ran both windows with every save acknowledged and no sampler errors. The owner head's summary was refused by a wrong check in the summary step, not by the run.** The step required every acknowledged save to report the reference subject function `:triplex.subject/v-6c4a0dafbec36b7178d56392`. In the owner head arm the write gateway declares that function (it reinstalls it) and also `subjectOwnerHeadFunction` `:triplex.owner/v-a7727c64f233b9754411784c`. All 34,200 of that arm's saves (6,000 at 50/s, 28,200 at 235/s) ran the owner function and carried owner-head bytes, which is what the option is meant to do. All 34,200 reference saves ran the reference function. `summarize.py` now requires the owner function in the owner-head arm and the reference function in the reference arm (and no owner function declared there). Rerun on the Mac, the reference summary is identical to the sealed one except for the new `referenceFunction` field. The comparison step is now `w1/serial/compare.ts`, shared by the server runner and the Mac. Both summaries and `retirement-comparison.json` were produced on the Mac from the server's files.

**Seal.** The append arm was not sealed on the server (`rd1/prepared.ts` seals only after the summary). Its files are complete and pass every summary check. The reference arm's seal stands.

## Numbers against the predictions

Late means the second 60 s of each 120 s window. "Ref" is today's writer; "OH" is the owner head. Ranges are the predictions written before the run.

| Measure | 50 offered: predicted | 50: measured | 235 offered: predicted | 235: measured |
| --- | --- | --- | --- | --- |
| Stored/s, ref | 49.5–50, no expiries | 50.00 (both halves), 0 refused or expired | 220–235 | 235.03 / 234.95, 0 refused or expired |
| Stored/s, OH | 49.5–50, no expiries | 50.00, 0 | 230–235 | 235.00, 0 |
| Late SQL reads per save, ref → OH | 1.0–2.0 → 0.30–0.80 | **0.704** → 0.587 | 1.2–2.5 → 0.40–1.0 | **0.478** → 0.408 |
| Late AEVT loads per save, OH (ref) | under 0.20 | **0.240** (0.818) | under 0.25 | 0.087 (0.453) |
| Late EAVT loads per save, ref → OH | not predicted | 0.573 → 0.573 | not predicted | 0.366 → 0.386 |
| Late mean apply, ref → OH | 1.2–2.5 → 0.9–1.6 ms | 1.700 → 1.072 ms | 1.4–3.0 → 1.0–1.8 ms | **1.104 → 0.876** ms |
| First-half SQL reads per save, ref → OH | not predicted | 1.364 → 1.075 | not predicted | 0.314 → 0.262 |
| First-half mean apply, ref → OH | not predicted | 3.187 → 2.166 ms | not predicted | 1.172 → 0.970 ms |
| Loader-edited saves, whole window | 80–130 | 102 | 400–650 | **384** |
| Late reads per save, loader ÷ seed, ref | 0.8–1.5 | 0.89 (0.627 / 0.705) | 0.8–1.5 | **0.61** (0.841 / 1.388) |
| OH cut (OH ÷ ref), loader minus seed | within ±0.20 | −0.15 (0.688 − 0.837) | within ±0.15 | −0.01 (0.799 − 0.813) |
| OH saves without owner-head bytes | 0 | 0 | 0 | 0 |

Bold marks a value outside its range. Late saves per group: at 50, loader 51 and seed 2,949; at 235, loader 189, seed 4,114 (ref) or 4,115 (OH), and subjects saved in the 50/s window 9,794 or 9,796 (0.09 and 0.10 reads per save).

**Migrated-subject reads** (owner head ÷ today's writer; ranges are the fresh table's, which the 1 billion section adopts). Samples: 590 loaded and 150 settled of each read in every window and arm, so every window is judged. **Errors: 0 in all eight phases (two arms, two windows, loaded and settled); `errorSamples` are empty.**

| Read | 50: predicted | 50: measured | 235: predicted | 235: measured |
| --- | --- | --- | --- | --- |
| Current p50, loaded | 0.95–1.15× | 1.079× (4.159 / 3.855 ms) | 0.95–1.20× | 1.075× (2.767 / 2.575 ms) |
| Pinned p50, loaded | 1.00–1.20× | 1.085× (1.127 / 1.039 ms) | 1.00–1.25× | 1.107× (1.031 / 0.931 ms) |
| Current p50, settled | 0.95–1.10× | 1.006× (1.247 / 1.239 ms) | 0.95–1.10× | 1.000× (1.207 / 1.207 ms) |
| Pinned p50, settled | 1.00–1.15× | 1.047× (1.063 / 1.015 ms) | 1.00–1.15× | **0.988×** (1.011 / 1.023 ms) |
| Current p99, loaded | 0.7–1.5× | 0.741× | 0.6–1.6× | **0.445×** |
| Pinned p99, loaded | 0.7–1.5× | **1.631×** (8.191 / 5.023 ms) | 0.6–1.6× | 1.028× |

The bar for migrated-subject reads (settled current p50 at most 1.10×, settled pinned p50 at most 1.15×) holds in both windows.

## Against the falsifiers

1. **The owner head does not cut reads at 1 billion** if late OH reads per save at 235 are above 0.8 × the reference's: **0.408 ÷ 0.478 = 0.854. This falsifier is met.** The cut is 15%, not the 20% or more predicted. The AEVT part fell from 0.453 to 0.087 per save as designed. EAVT owner lookups did not fall (0.366 → 0.386), and they are now most of what is left. At 50/s the cut is 17% (0.587 ÷ 0.704). The reference's reads per save were below the predicted range in both windows (0.70 and 0.48, against at least 1.0 and 1.2), so the 16 GiB cache covered more of this tape's reads than the prediction assumed.
2. Loader-edited subjects behave like the others under the owner head: the difference is −0.01 at 235 with 189 late loader saves. Not met.
3. Headroom: OH stored 235.00/s at 235. Not met.
4. Cache covers the set: the reference read 0.704 per save late at 50, above 0.3. Not met.
5. Launch path: neither arm was refused before its first save. Not met.

**Apply time fell with the owner head in every half.** Late, it went from 1.700 to 1.072 ms at 50/s and from 1.104 to 0.876 ms at 235/s; first half, from 3.187 to 2.166 ms and from 1.172 to 0.970 ms. At 235/s the late reference apply (1.104 ms) was already below the predicted 1.4–3.0 ms.

## What this does not show

- Records and bytes per save are not in the summary; the 23 → 25–26 prediction is not checked here.
- The append arm is not sealed on the server. These numbers come from its unsealed files run through the summary step on the Mac at the commit that publishes this note.
- One run per arm. The late loader group holds 51 saves at 50/s and 189 at 235/s: enough for a mean, not a tail.
- The 120 s windows start cold on a fresh copy of the held cluster.
