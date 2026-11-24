# Owner head pair on the fresh template, bench 4, November 23

**Not judged: the reference arm ran both windows, but its summary step failed, so the arm was not sealed and the owner head arm could not start.** W1 `db616801b` (`w1/SERVER-OWNER-HEAD.md` line 1), with `DX_W1_RETIREMENT_PAIR=1`, `DX_W1_PAIR_OPTION=owner-head` and `PREP1_LOOKUP_EVERY=64`. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

**How it ran.**

1. The first-offer pass of the reference arm was ADMITTED. It stopped before its first offer at `v01/study-server.ts:130`.
2. The first real launch at 22:36 UTC was refused at `v01/pgdata.ts:83`, "Keep PGDATA separate from scorecard evidence". This was the driver's layout: the output's parent held the copy. The launcher was fixed to put the output under `run/`.
3. The relaunch at 22:39:44 UTC ran the reference arm's 394 and 620 windows of 300 s each, from 22:42:40 to 22:54:52 UTC.

**Where it stopped.** `lab/experiments/EXP-DX1/w1/serial/summarize.py` line 149 asserts that every event in `prep1-lookups.ndjson` is `PREP1_LOOKUPS` with `sampleEvery` 64. The reference arm's file held 4,754 such events, plus one `PREP1_NATIVE_PREFETCH` event and one event without a kind. `study-server.ts` line 167 then failed in `sealedArm` (`rd1/prepared.ts:122`), so no seal was written and the append (owner head) arm did not start. **The W1 builder must make the summarizer skip, or count, the prefetch and end events.**

**Sampler.** The migrated-person read sampler made 1,490 loaded attempts per window, with 3 errors at 394 (`assert(held.length > 0 && held.some((r) => Number(r.recorded_position) === saved))`), 32–35 people not yet saved, and 150 settled attempts with 0 errors. Under the document's own rule, any sampler error makes the window UNJUDGED.

**Raw data kept.** Each window's `arm.json` and `operations.json`, the stack logs and the traces are in `evidence/DX-BM1/bench4/bench4-owner-head/` on the Mac, as is the `pg-sampler.log` (the fresh copy's first autovacuum ran here too). No owner-head figures exist.

## Owner head pair on fresh, fixed (W1 `85fc3a4bd`), bench 4, 24 November 01:55 to 02:28 UTC

**Both arms ran both windows, with 0 sampler errors and 0 wrong pinned reads. The owner head arm kept up at 394/s, but at 620/s it stored less than the reference and refused or expired 8,801 saves.** The reference arm sealed. As the orchestrator expected, the owner head arm's summary on the server was refused at `w1/serial/summarize.py:125` (the check wanted the reference function, but the arm correctly ran `:triplex.owner/v-a7727c64f233b9754411784c`). On the Mac I summarized it with `summarize.py` at W1 `6cae9ba1b` (`DX_W1_PAIR_OPTION=owner-head`) and compared the two arms with `w1/serial/compare.ts`. The run was not rerun. Slots: reference `tx2-dxscale1-v01-88b6cf72-142` (attempt `88b6cf72-1426-4b15-9110-101a582efca4`), owner head `tx2-dxscale1-v01-1529cdeb-613` (attempt `1529cdeb-6130-4b20-b441-eb0f49aa3acf`). Both used the same tapes (`d357f9e3…` at 394, `a5491cc8…` at 620) on a new copy of the fresh template (cut 87,002) each.

| Measure (first half / second half) | Reference 394 | Owner head 394 | Reference 620 | Owner head 620 |
| --- | --- | --- | --- | --- |
| Stored per second (forecast) | 394.0 / 394.0 (390–394) | 394.0 / 394.0 (392–394) | 620.0 / 605.0 (435–470) | **574.3 / 506.4** (480–580) |
| Refused or expired | 0 | 0 | 0 | **8,801** |
| SQL reads per save (late forecast) | 0.294 / 0.151 (0.9–1.2) | 0.241 / 0.116 (0.30–0.60) | 0.242 / 0.243 (1.0–1.3) | 0.080 / 0.196 (0.35–0.65) |
| Late AEVT / EAVT loads per save | 0.156 / 0.119 | **0.029** / 0.108 | 0.194 / 0.168 | **0.056** / 0.182 |
| Apply mean (ms) | 0.99 / 0.68 | 0.83 / 0.85 | 1.02 / 1.16 | 1.19 / 1.52 |
| Apply p99 (ms) | 7.4 / 3.5 | 4.8 / 4.0 | 5.0 / 5.0 | 5.7 / 6.9 |
| Quiet acknowledgement p99 (ms) | 51.9 / 34.6 | 44.2 / 27.8 | 39.9 / 34.3 | 37.2 / 44.9 |
| Pinned read p99 (ms), errors, wrong | 39.7, 0, 0 | 46.8, 0, 0 | 41.2, 0, 0 | 39.9, 0, 0 |
| Migrated current read p50 loaded / settled (ms) | 4.13 / 0.93 | 4.74 / 0.97 | 5.18 / 0.90 | 5.98 / 0.90 |
| Migrated read samples loaded / settled, errors | 1,456 / 150, 0 | 1,478 / 150, 0 | 1,432 / 150, 0 | 1,408 / 150, 0 |

**Owner head over reference, migrated people (from `retirement-comparison.json`).**
- **394:** current p50 1.147× loaded and 1.043× settled; pinned p50 1.199× and 1.057×.
- **620:** current p50 1.154× and 1.009×; pinned p50 1.131× and 1.011×.

**Late SQL reads per save by owner group, reference → owner head.**
- **394:** seed 0.151 → 0.116.
- **620:** earlier-window 0.210 → 0.177, seed 1.332 → 0.973.

**Falsifiers.**
- **Late reads ≥ 0.8:** no. The owner head's late reads were 0.116 and 0.196.
- **AEVT loads above 0.3 per save:** no. They were 0.029 and 0.056.
- **Under 470/s at 620 while reads fall below 0.6:** no. The window averaged 540/s, with a 506/s second half.
- **Migrated settled current p50 ratio above 1.10, or pinned above 1.15:** no (1.043 and 1.009; 1.057 and 1.011).
- **Quiet current read p50 above 1.15×:** not judged. The summary has no quiet current read figure for this pair, and the loaded-phase migrated current p50 ratio (1.15×) is a different measure.
- **UNJUDGED conditions:** not met. Every window has at least 1,408 loaded and 150 settled samples, and there were 0 sampler errors.

**Against the forecast.**
- **Late reads are far below the forecast in both arms.** That includes the reference, which was forecast at 0.9 to 1.3. On this fresh template, the forecast's read cost does not appear.
- **At 620 the result runs against the forecast's direction.** The reference was forecast at 435–470/s and stored 612/s on average with nothing refused. The owner head stored 540/s and refused or expired 8,801 saves.
- **The owner head's fall-off at 620 is the result that needs explaining before the option is chosen.** It is not explained by reads: its late SQL reads and AEVT loads are lower than the reference's. Its apply mean is higher (1.52 against 1.16 ms late), which is where to look.

Evidence: `evidence/DX-BM1/bench4/bench4-owner-head2/`. `files/` holds the orchestrator's list (input, attempts, window `arm.json` and `operations.json`, lookup traces, both `retirement-diagnostic.json`) and the Mac-made `retirement-comparison.json`. `oh2-files.tar.zst` (SHA-256 `0b1f08b1…`, checked on both sides) is the same set as shipped. `TRANSFER.json` and the bundles are the full campaign. Running cost of bench 4 at publication: about 11.3 h, about USD 12.3.
