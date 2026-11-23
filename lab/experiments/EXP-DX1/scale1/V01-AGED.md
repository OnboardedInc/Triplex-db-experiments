# Aged v0.1 runs on the one-billion-record database

Server 2 runs three things on AGE1's 1B cut, in this order: the AGE1 seal (`measure-loaded`, which the scorecard's aged bundle requires), the 32 GiB cache arm, then the four scorecard arms at `8cc32d380` and `--assemble`. Each result is published as it lands. [Fresh card](V01-FRESH.md) · [Load](AGE1-LOAD.md) · [Handoff](HANDOFF.md)

The order puts the cache arm before the scorecard arms. The owner allowed it to run "whenever you can", and the orchestrator allowed it earlier when the machine is free. It also avoids a known hazard: each build retags the shared image names, and the sequential scorecard pins its build receipt in arm 1, so a PREP1 build between scorecard arms would make the later arms refuse.

## Predictions, written before the runs

### Seal (`measure-loaded`), written 2026-11-23 15:31 UTC

Safety copy 20–30 min with an identical inventory. `measure-loaded` 2.0–3.5 h: native backup 100–150 GB, backup 0.5–1.0 h, full verify 0.3–0.6 h, restore 0.5–1.0 h; seal cut above 1,000,002,769 records and t 62,876,498 with matching restore readback. Wrong if the backup exceeds 200 GB, verify reports missing or unreadable segments, the readback differs, or the run passes 4 h.

### 32 GiB cache arm, copied from the builder's document before launch

Pin `cdc72d4d5bd6cc1adecaaf9267a351173763d134`, document `prep1/AGED-CACHE.md` at `d6e62fbe7`. Expected duration about 33 min, cap 45 min. [Builder's document](https://github.com/OnboardedInc/Triplex-db-experiments/blob/d6e62fbe7/lab/experiments/EXP-DX1/prep1/AGED-CACHE.md)

At 430 million records the 32 GiB cache covered this tape: 0.04 late SQL reads per save outside index jobs and under 0.001 inside. DX-W1's model puts the covering cache at 74 GiB at one billion. 32 GiB is 43% of that. If the model holds, misses come back, but fewer than with 16 GiB at 430 million. The copy also starts PostgreSQL and the page cache cold on a database 1.5 times larger, so the first minute will be worse than Saturday's.

| At 1B, three cores, 32 GiB | 394 offered | 620 offered |
| --- | ---: | ---: |
| Late SQL reads/save outside index jobs (Saturday 430M: 0.043) | 0.45 (0.20–0.90) | 0.55 (0.25–1.0) |
| Late SQL reads/save inside index jobs (Saturday: 0.0006) | 0.80 (0.40–1.40) | 0.95 (0.45–1.6) |
| Late mean apply ms outside → inside (Saturday: 0.30 → 0.48) | 0.9 → 1.5 | 1.0 → 1.7 |
| First 60 s SQL reads/save (Saturday: 1.48 then 0.94) | 2.0 then 1.4 | warm after 394 |
| Stored/s whole / second half (Saturday: 394.00 / 393.95; 620.00 / 620.01) | 393 / 394, no expiries | 540 / 550 (460–620), expiries likely |
| Second-half busy ACK p99 (Saturday: 521 ms; 709 ms) | 1,500 ms (300–6,000) | 8,000 ms (700–30,025) |
| Quiet loaded p99 (Saturday: 61.81 ms; 44.68 ms) | 75 ms (50–150) | 85 ms (50–200) |
| Quiet solo p99 (Saturday: 29.63 ms) | 35 ms | 35 ms |
| Peak transactor cgroup memory (Saturday: 51.2 GiB of 60) | 52–58 GiB | same |

**What would show the working-set model wrong:**

- **Too pessimistic.** Late reads stay at or below 0.10 per save outside jobs, 620 is stored in full, and second-half p99 at 394 stays under 1 s. Then 32 GiB still covers this tape at one billion. The writer's footprint tracks the people it touches, not total records, and the 74 GiB estimate is too high.
- **Too optimistic.** Late reads reach 1.0 per save or more outside jobs, Saturday's 16 GiB level at 430 million, while the heap has room. Then the misses do not scale like the model, or they do not come from the object cache: PostgreSQL buffers, the page cache or index-job rewrites. More cache would not be the fix.
- **Consistent with the model.** Anything between 0.2 and 0.9 outside jobs.

### Scorecard arms, copied from `v01/SERVER.md` at `8cc32d380`

Predicted duration per arm: a 176 GB scratch copy of about 3 min (the safety copy ran at about 1.2 GB/s), then about 20–35 min of arm time (the fresh card's four arms took 87 min in all). All four arms with copies: 1.5–2.5 h.

| Row | 1B prediction |
| --- | --- |
| P1 pinned reads | Same exactness. Higher tail latency and earlier goodput flattening if the larger persisted index displaces hot pages. |
| P2 commits | Low rates should be close to fresh. At 394 and 620 predict flat to 15% lower delivery for the same configuration and wider tails if larger indexes add SQL reads per save. That bound is an estimate, with no aged calibration behind it. |
| P3 ordered feed | Same exactness. The larger journal can make a cold open slower. Resuming near the same logical head should limit steady-state change after the peer is warm. |
| P4 current pulls | Warm current fields should stay closer to fresh than first pulls. More persisted pages can increase the first index fetch. |
| P5 Publish | NOT MEASURED. The held 1B cluster receives no Publish window here. [Publish campaign](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000) |
| P6 quiet account | Expect higher solo and loaded p99 with a colder index. A higher solo denominator may lower the ratio without improving the loaded p99. The 1.25× bar remains unlikely at the busy rates. |
| P7 idle cost | Expect slower cold first pulls and more occupied pages at the same cap. The two snapshots leave the activity-matched memory slope open. |
| P8 paced import | Expect less spare capacity and a higher live tail from larger indexes and cache competition. Exact receipts and replay should agree. |
| P9 loss and move | NOT MEASURED. The scheduled two-server procedure will provide this evidence. [Failover procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md) |
| Journal, receipts and mixed IDs | Expect the same results after the AGE1 identity confirms the restored cut. This row is independent of the latency estimate. |
| Erasure and acknowledged-write loss | Both remain unmeasured by this campaign. |
