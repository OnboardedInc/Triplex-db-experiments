# VM wake latency: result and instruction (orchestrator, 2026-11-10 12:22 UTC)

**Instruction for anyone measuring in the triplex2 VM (revised 2026-11-10 17:10 UTC): do NOT run `keep-awake.sh`. Measure
with no helper and write `"keepAwake": false`. The wake penalty below is real and inflates latencies of sparse work (anything
that waits tens of milliseconds between steps); say so next to any sparse-traffic number. See "Why keep-awake was withdrawn".**

## What was measured

`probe.py` runs a fixed pure-CPU unit of work (2.1 ms) pinned to CPU 5, back-to-back and after a sleep. No containers, no
database. Two rounds each, the orchestrator holding the lock. Evidence: `~/Claude/Projects/triplex-db-2/evidence/ORCH-vm-wake/`.

| Arm | Unit of work p50 / p99 ms | Sleep overshoot p50 / p99 ms |
| --- | --- | --- |
| Back-to-back, VM as is | 2.12 / 2.70 | |
| After a 50 ms sleep, VM as is | 12.1 to 12.8 / 19.0 to 19.3 | 7.9 to 9.0 / 11.0 |
| After a 1 s sleep, VM as is | 10.2 to 11.8 / 15.1 to 20.5 | 8.4 to 9.4 / 11.2 to 12.9 |
| Back-to-back, one SCHED_IDLE busy loop per CPU | 2.27 / 6.1 | |
| After a 50 ms sleep, busy loops | 2.41 / 6.4 to 8.0 | 0.07 / 0.16 to 0.17 |
| After a 1 s sleep, busy loops | 2.40 to 2.60 / 7.7 to 21.2 | 0.08 to 0.09 / 0.12 to 1.5 |

## Reading

1. On this VM a thread that wakes from any wait starts **8 to 9 ms late** and then runs **about 5 times slower** for roughly the
   next 10 ms. This is the macOS hypervisor parking an idle vCPU; it is not Datomic, Postgres, Node or the JVM.
2. A commit crosses the load generator, the write gateway, the transactor and Postgres, each of which waits and wakes. That
   explains what DX-B6 measured: back-to-back commits p50 4.7 ms, one commit per second p50 25 to 34 ms, with every component about
   10 times slower, including command construction that never touches the database. It also explains commit p50 falling from
   36 ms with 1 reader to 13.6 ms with 16 readers in the north-star ladder.
3. With every vCPU kept awake the effect is gone (overshoot 0.07 ms, same unit cost as back-to-back). The busy loops run at
   SCHED_IDLE in the root cgroup: they give way to any real task and do not appear in a container's CPU accounting. The dense
   p99 rises from 2.7 to about 6 ms on the probe, so they are not free; report both where it matters.
4. A Linux server, bare metal or a cloud instance, wakes a thread in tens of microseconds. Keep-awake makes the test bed behave
   like the deployment target. Every number taken before 2026-11-10 12:22 UTC was taken without it.

Also removed on 2026-11-10: the paused lane's `tx2-qlever-dev` container (volume retained). Its health check ran a query every
5 s that took about 370 ms of one unpinned CPU, on whatever CPU the kernel chose, including the measurement CPUs.

## Correction, 2026-11-10 13:30 UTC: the first `keep-awake.sh` never started anything

The first version's `start` matched its own SSH command line, printed `already-running` and started no busy loops. DX-B7 found
this and wrote the fixed version now in this directory (the marker is built indirectly; `status` checks the real scheduler
policy and affinity and must print `running 8` and `"onePerCpu": true`). **After `start`, always run `status` and refuse to
measure unless it shows 8 workers, one per CPU.** Runs before this correction that recorded `keepAwake: true` had none, except
DX-B7's `step4-pull-c`, which used the fixed copy. The probe table above is unaffected: `run.sh --spin` starts its own loops.

## Why keep-awake was withdrawn (2026-11-10 17:10 UTC)

1. **It halves dense throughput.** DX-B8 measured the same gateway with and without the helper: 256 frozen-basis readers
   7,973 against 3,858 pulls/s; back-to-back commit p50 3.1 against 5.6 ms. The orchestrator's A/B on a CPU-bound container
   pinned to one CPU (`helper-ab.sh`, `helper-ab2.sh`, evidence `~/Claude/Projects/triplex-db-2/evidence/ORCH-vm-wake2/`):

   | Busy loops | Dense units in 4 s | Unit after a 1 s sleep, p50 ms | Sleep overshoot p50 ms |
   | --- | --- | --- | --- |
   | none | 2,512 and 2,433 | 10.6 and 10.4 | 10.6 and 11.3 |
   | 8, SCHED_IDLE in the login session's cgroup | 1,408 | 4.5 | 0.12 |
   | 8, in a cgroup with `cpu.idle=1` | 1,143 | 3.9 | 0.11 |
   | 6 (CPUs 0 to 5) | 1,843 | 3.1 | 0.12 |
   | 4 (CPUs 0 to 3) | 1,625 | 2.6 | 0.12 |
   | 1 (the measured CPU only) | 1,279 | 2.5 | 2.5 |

   One busy loop on the measured CPU alone costs about half: a SCHED_IDLE task is only "idle" against tasks in its own
   cgroup; against a container's cgroup the two groups share the CPU. The `cpu.idle=1` variant did no better in this sample
   (host load was high; not pursued).
2. **The host cannot keep 8 vCPUs fast anyway.** The Mac is an M3 Pro with 6 performance and 6 efficiency cores
   (`sysctl hw.perflevel0.physicalcpu` = 6). Eight always-busy vCPUs cannot all sit on performance cores. The same limit applies
   to any run that keeps more than 6 vCPUs busy (256 readers do).
3. A kernel idle-polling boot parameter would avoid the scheduling competition but needs a VM restart, keeps 8 host cores at
   100% whenever the VM is up, and still hits point 2. Not done.

Consequence: sparse-traffic latencies on this test bed carry a wake penalty of roughly 8 to 10 ms per hop that a Linux server
does not have; dense and loaded numbers do not. Host memory matters too: on 2026-11-10 the Mac had 18 to 28 GB of swap in use
(36 GB RAM, this VM has 20 GiB), which adds noise to every timing.

## In-container idle loops: fine on the probe, harmful in the real stack (2026-11-10 22:45 UTC). Keep-awake is closed.

`helper-ab3.sh` (one container alone on its CPU, loop inside it): dense 3,085 units without, 2,830 to 2,870 with (about 8% cost);
sleep overshoot 5.1 ms without, 0.08 ms with. `quiet/wake-ab.sh w1` (the writer trace at 10,000 subjects, zero readers, loops in
every container; evidence `~/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-w1-{plain,loops}`; host busy in both arms):

| Arm | Steady (about 2 commits/s) p50 / p90 / p99 ms | Burst (55 commits/s) p50 / p90 / p99 / max ms | Burst commits over 400 ms |
| --- | --- | --- | --- |
| No loops | 31.2 / 54.2 / 98.8 | 11.4 / 29.6 / 94.2 / 241.7 | 0 of 3,280 |
| Loops in every container | 55.5 / 150.6 / 426.2 | 123.9 / 529.6 / 1,576 / 2,960 | 483 of 3,280 |

Why: the idle policy is only honoured inside one cgroup. The engine's containers share CPUs (Postgres and the transactor on
CPU 0, the transactor and the write gateway on CPU 1), so a container whose only runnable thread is its idle loop still takes
its group's share of that CPU from its neighbour. (Postgres's image also has no `chrt -i`, so it got no loop and lost CPU 0 to
the transactor's.) All 8 vCPUs busy also exceeds the 6 performance cores. **No keep-awake variant is used. The wake penalty is
a property of this test bed: it inflates commit latency whenever commits are more than a few milliseconds apart.**
The no-loops arm is also the current baseline for commits at 10,000 subjects with zero readers; this burst had no stall.
