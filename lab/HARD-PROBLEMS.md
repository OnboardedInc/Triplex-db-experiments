# Hard problems: the ones that need a creative technical answer

Kept by the orchestrator at Sam's request (2026-11-13): "keep track of some of the hardest problems ... creative technical
solutions potentially". Updated whenever an agent report changes the picture. Each entry says what is hard, the evidence, what
has been tried, and directions not yet tried. Numbers are at 10,000 subjects on the Datomic lane unless stated. The bars are in
`lab/TARGETS.md`; Sam's five priorities are in `lab/NORTH-STAR.md`.

Constraints every answer must respect: exactness and durability are the floor; the Triplex layer stays in TypeScript (Sam,
2026-11-12); lanes are Datomic on Postgres storage and native XTDB (QLever paused); the only machine is Sam's Mac (36 GiB,
12 cores) with the colima VM `triplex2`.

## H1. The commit median sits on the engine call, and the call alone is over the 10 ms bar

1. **What is hard.** P2 asks for commit p50 at most 10 ms. With zero readers and tracing off, a commit is 13.0 ms and the
   client's transact call (client, gateway, transactor, Postgres sync, and back) is 11.4 ms of it (DX-T1 part 3,
   `t1/REPORT-3.md` on `exp/DX-T1-tracing`). The best total ever measured on this Mac was 9.1 ms (2026-11-10, quiet host).
2. **Evidence.** TypeScript outside the call is about 1.2 ms. The inside of the call is not split yet (DX-T1 part 4 is doing
   that, including a raw fsync test of the VM disk).
3. **Tried.** Transactor GC settings (no gain), hints (slower), strict clocks (cost nothing).
4. **Directions not tried.**
   a. Fewer storage syncs per commit: several subjects' commits in one Datomic transaction when they arrive together, with
      per-command outcomes kept (group commit above the engine).
   b. A durable intake log in front of the engine: acknowledge when the command is durable in an append-only log that syncs
      in groups, apply to Datomic behind it, and serve read-your-own-write from the log plus the replica. Changes what
      "committed" means, so it needs Sam.
   c. A faster sync path: where the VM disk really syncs, WAL sync method, a separate WAL device, group-commit settings.
   d. Fewer hops: the gateway and peer in one process with the transactor's storage connection tuned, a unix socket or
      HTTP/2 between client and gateway, no per-request connection work.
   e. Other Datomic storage back ends (dev/H2 local storage) as a measurement of what Postgres storage costs.

## H2. With 256 readers the commit median doubles, and the writer waits for a CPU more than it runs

1. **What is hard.** P2's median bar applies with 256 readers running. Part 2 measured 22.4 ms there: wait on the transactor
   11.7 ms, TypeScript scopes 5.8 ms, network and callback 2.1 ms, driver queue 1.4 ms, gateway 1.0 ms.
2. **Evidence.** In a 45 s phase at 256 readers the writer thread ran 2.7 s and waited for a CPU 5.7 s. A dedicated writer
   core cut the wait to 0.16 s but the median moved only from 23.4 to 19.3 ms (swapping host, noisy).
3. **Directions not tried.** Reader work and commit work in separate processes with separate cores; the transactor,
   Postgres and write gateway on cores reader work never touches; an admission rule that slows readers when the commit
   path's run-queue wait rises (P1 says readers must not block writers, not that readers must never yield).

## H3. Exact local reads (P1) and fast commits (P2) have not passed in the same build

1. **What is hard.** q8 met every P1 bar with exact local reads (read p99 9.15 ms at 256 readers) and missed P2. q6 met most
   of P2 with gateway reads and missed P1. Part 2's traced pair lost P1 again (read p99 272 ms).
2. **Evidence.** The local replica, its feed follower, the oracle bookkeeping and the readers share the Node process, its
   memory and its cores with the commit path.
3. **Directions not tried.** The replica in its own process with a shared-memory or memory-mapped read path; replica apply
   batched between commits; a read path that never touches the commit thread's event loop.

## H4. The commit tail: one late commit delays every later commit of the same subject

1. **What is hard.** P2 asks for all-commit p99 at most 50 ms. Part 2 measured 988 ms. The slowest commits waited 1.7 to
   2.0 s behind an earlier commit of the same subject while in-flight slots were free.
2. **Evidence.** The chains start at one commit whose scheduler ran 267 ms late; the cause of that first delay is unknown.
   The 4.5 s stalls of q8 have not been reproduced under tracing. A 120 ms write-gateway GC pause and a 490 ms wait on the
   transactor were also seen in single traces.
3. **Directions not tried.** Sending a subject's next commit before the previous acknowledgement and letting the gateway
   order them (pipelining per subject); merging a subject's queued commits into one transaction; a low-pause collector on
   the write gateway; finding the 267 ms delay with a `full` trace of the writer thread.

## H5. One hundred thousand subjects: commits slow down and bursts fall seconds behind

1. **What is hard.** P5 is about 100,000 subjects. At that size (k100, gateway reads) quiet-window commit p50 was 18 to 45 ms
   with zero readers, bursts fell seconds behind, and 116 of 7,547 commands expired at 30 s.
2. **Evidence.** `lab/experiments/EXP-DX1/h4/K100-READ-2026-11-12.md`. Gateway caches are sized for 10,000 subjects (read
   gateway entity cache: 5.40 million evictions). Activation without traffic takes 63 to 83 s (bar 100); with live traffic
   there is no valid result. P1, P3 and P4 are unmeasured at this size.
3. **Directions not tried.** Cache budgets sized to the population; a commit path whose cost does not grow with the number
   of subjects (find what grows: index depth, cache misses, segment fetches); activation that yields to commits.

## H6. The transactor is closed source

1. **What is hard.** The largest part of a commit is a wait on a process we cannot instrument from inside.
2. **Evidence.** Its native logs and metrics callback cost 3.1 ms per commit when on; Flight Recorder costs nothing
   measurable but shows only JVM events.
3. **Directions not tried.** Flight Recorder socket and file events on the transactor matched to Postgres statement times;
   the peer's io-stats; the XTDB lane as the open-source comparison for the same commit.

## H7. The test bench moves results more than the code does

1. **What is hard.** The same code read 9.1 ms on one night and 16 ms on another. A 24 GiB VM on a 36 GiB Mac put 12 to
   17 GB into swap; the VM is now 16 GiB and the control reads 13 ms with the Mac in use.
2. **Directions not tried.** A verdict protocol that is robust to the host (many short paired arms and a statistical
   verdict, not one long pair); a fixed quiet window agreed with Sam; a second machine is out of scope unless Sam changes
   that.

## H8. XTDB has no current reading

1. **What is hard.** The goal is all priorities met on Datomic or on XTDB. All evidence since 2026-11-10 is Datomic; the
   XTDB experiment data was removed in the pause. Whether XTDB's commit path has a lower floor on this Mac is unknown.
2. **Directions not tried.** The same traced commit anatomy on native XTDB as a one-day comparison.

## H9. Open design decisions that change what is possible (Sam's to make)

1. Backdated record times against strict clocks.
2. Server-assigned record time (needs a `packages/core` contract change).
3. The split-read rule (`pending` against `mixed`).
4. How engine and runtime CPUs are split in the bars.
5. Whether an acknowledgement may come from a durable intake log before the engine has applied it (H1 b).
