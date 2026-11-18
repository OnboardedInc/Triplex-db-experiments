# DX-BM1 bare-metal bench

The 1,000-subject smoke passed its independent replay check after a clean-build fix.
The 10,000-subject v3 pair is running. The hardware effect on the latency bars is still unknown.
The root drive took 0.026 ms at the median and 0.088 ms at p99 for an 8 KiB write followed by `fdatasync`.
The Mac VM's sync floor was about 0.4–0.7 ms. Commit timing will show how much of that difference reaches the caller.
The first test keeps SMT on and puts the transactor, Postgres, each gateway, and the driver main and worker CPUs on distinct physical cores.
All CPU policies read back `performance`. The delivered kernel exposes no cpuidle driver or per-core idle controls.
The first attempt stopped at a missing W0 build before measuring. The retry seeded 45,485 facts, matched all 53 independent reads and 2,997 entity queries, and checked 10,943,179 reads against the model.
The pair uses summary tracing and the ACK clock. Its 128 GiB observation limit accommodates faster reads without changing the trace or the bars.

**North star.** P1–P4 via the full v3 pair and P5 via live 100k activation. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| Metric | Mac | Bare metal |
| --- | --- | --- |
| 8 KiB sync floor (ms) | ~0.4–0.7, VM | p50 0.0265, p99 0.0876, n=898,163; no CI |
| 10k all-primary p99 (ms) | H loaded 48.242, n=7,408, CI [44.342, 51.171]; v3 zero 109.129, n=38,826, CI [98.766, 120.832] | Pending |
| 5–10 / 11–25 fact p50 (ms) | v3 zero 9.343 / 11.071, n=1,261 / 682, CI [9.215, 9.471] / [10.879, 11.263] | Pending |
| P4 weighted pulls/s | H loaded 18,345.834, n=788,897, CI unavailable; bar 4,400 | Pending |

Mac H is an older loaded profile. The v3 Mac arm ran with zero readers. [Mac estimators and intervals](../t1/NIGHT-2026-11-17.md)
Both drives identify as Micron 7500 PRO with no volatile write cache reported by NVMe Identify. Micron specifies enterprise power-loss protection for this series. [Exact part](https://sg.micron.com/products/storage/ssd/data-center-ssd/7500-ssd/part-catalog/part-detail/mtfdkcc960tgp-1bk1jabyy) · [Specification](https://in.micron.com/content/dam/micron/global/public/products/data-sheet/ssd/7500-ssd-tech-prod-spec.pdf)
The first run uses pushed `97fa9123`, based on the verified upstream `1e869067`. First failure and delivered machine facts are in the durable `DX-BM1` evidence directory.
Admission audit. `smoke-check.py` checks the sealed trace files and exact read counts, verifies the independent output's case digest and query identities, and binds its random case ID, clock, source and slot to this smoke.
Transfer audit. `bundle.sh` archives terminal item directories and publishes their hashes with a fresh tag. `collect.sh` verifies those hashes and the tag before adding the evidence to the Mac index. Neither assigns a benchmark verdict.
The acceptance contract and its pinned files are unchanged. The bench has not run the fixed-gap comparison, 100k arms, activation, repeat or WAL A/B.
