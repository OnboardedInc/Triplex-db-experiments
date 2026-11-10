# VM wake latency: result and instruction (orchestrator, 2026-11-10 12:22 UTC)

**Instruction for anyone measuring in the triplex2 VM: while you hold the measurement lock, run
`lab/experiments/EXP-DX1/vm-wake/keep-awake.sh start` before the measurement and `keep-awake.sh stop` before you release the lock
(put the stop in your exit trap). Write `"keepAwake": true` into the run's receipt or report. If you compare with an earlier run,
say that the earlier run had no keep-awake.**

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
