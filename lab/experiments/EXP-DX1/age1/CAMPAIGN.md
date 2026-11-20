# DX-AGE1 server campaign

The campaign ages one Datomic database containing every account to 1 billion records. [Server command and budget](SERVER-RUNG.md) · [Seed adoption](SEED-ADOPTION.md) · [Index growth model](GROWTH-MODEL.md)

## Predictions to freeze before execution

These engineering priors assume PostgreSQL on local NVMe, 3.5/50 offered saves/s, one ordered writer and indexing at 32 MiB threshold, 512 MiB maximum and one indexing thread. Initial transactor/peer object caches are 512/768 MiB with room in the heap for indexes, buffers and GC. Mac ratios are comparable only for matched mechanisms. Use the first server rung to test the absolute values.

| Metric | 1B |
| --- | ---: |
| Low save p50/p99, ms | 8/24 |
| Busy save p50/p99, ms | 9/36 |
| Save p50/p99 during fixed-debt index job, ms | 10/48 |
| Current warm recent p50/p99, ms | 3/10 |
| Current warm year-idle p50/p99, ms | 3/12 |
| Current first peer recent / year-idle, ms | 25/35 |
| Near pin warm recent p50/p99, ms | 4/14 |
| Near pin warm year-idle p50/p99, ms | 4/15 |
| Near pin first peer recent / year-idle, ms | 35/45 |
| Old cut warm p50/p99 and first peer, ms | 6/20; 50 |
| Seven-entry feed page p50/p99, ms | 3/12 |
| Fixed-debt index request to adoption, s | 12 |
| Transactor / live read peer PSS, GiB | 1.8/1.3 |
| Settled SQL organization estimate, GB | 178 |
| Indexed allocated SQL sensitivity, GB | 203 |
| Native backup bytes, GB | 125 |
| Full backup / full verify / native restore, h | 0.69/0.35/0.50 |


These are preflight engineering estimates. The native count from the held seed, measured aging rate and fresh backup measurements take precedence. [Part-one observations](OBSERVATIONS.md)

The release scorecard also requires the fresh and aged bare-metal runs from merged INT1. The current scorecard verifier expects INT1's original seed head and command identities. It needs an explicit starting-state and oracle replay extension to read the SCALE1 decision image at either age. [Scorecard server handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/exp/DX-V01-scorecard/lab/experiments/EXP-DX1/v01/SERVER.md)
