# Owner head pair on the fresh template, bench 4, November 23

**Not judged: the reference arm ran both windows, but its summary step failed, so the arm was not sealed and the owner head arm could not start.** W1 `db616801b` (`w1/SERVER-OWNER-HEAD.md` line 1), with `DX_W1_RETIREMENT_PAIR=1`, `DX_W1_PAIR_OPTION=owner-head` and `PREP1_LOOKUP_EVERY=64`. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

**How it ran.**

1. The first-offer pass of the reference arm was ADMITTED. It stopped before its first offer at `v01/study-server.ts:130`.
2. The first real launch at 22:36 UTC was refused at `v01/pgdata.ts:83`, "Keep PGDATA separate from scorecard evidence". This was the driver's layout: the output's parent held the copy. The launcher was fixed to put the output under `run/`.
3. The relaunch at 22:39:44 UTC ran the reference arm's 394 and 620 windows of 300 s each, from 22:42:40 to 22:54:52 UTC.

**Where it stopped.** `lab/experiments/EXP-DX1/w1/serial/summarize.py` line 149 asserts that every event in `prep1-lookups.ndjson` is `PREP1_LOOKUPS` with `sampleEvery` 64. The reference arm's file held 4,754 such events, plus one `PREP1_NATIVE_PREFETCH` event and one event without a kind. `study-server.ts` line 167 then failed in `sealedArm` (`rd1/prepared.ts:122`), so no seal was written and the append (owner head) arm did not start. **The W1 builder must make the summarizer skip, or count, the prefetch and end events.**

**Sampler.** The migrated-person read sampler made 1,490 loaded attempts per window, with 3 errors at 394 (`assert(held.length > 0 && held.some((r) => Number(r.recorded_position) === saved))`), 32–35 people not yet saved, and 150 settled attempts with 0 errors. Under the document's own rule, any sampler error makes the window UNJUDGED.

**Raw data kept.** Each window's `arm.json` and `operations.json`, the stack logs and the traces are in `evidence/DX-BM1/bench4/bench4-owner-head/` on the Mac, as is the `pg-sampler.log` (the fresh copy's first autovacuum ran here too). No owner-head figures exist.
