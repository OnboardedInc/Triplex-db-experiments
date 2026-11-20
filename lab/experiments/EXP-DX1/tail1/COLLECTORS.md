# Where the JVM collector comes from

The peer launcher uses `DATOMIC_JAVA_OPTS`. OpenJDK 21 selects G1 ergonomically only if no collector is specified and the startup JVM sees a server-class machine. HotSpot considers at least two processors, physical CPU topology and at least 1,792 MiB of visible memory. Linux uses the process's CPU affinity and container CPU accounting. The Java `-server` flag does not force G1. [GC selection](https://github.com/openjdk/jdk21u/blob/master/src/hotspot/share/gc/shared/gcConfig.cpp) · [Server-class check](https://github.com/openjdk/jdk21u/blob/master/src/hotspot/share/runtime/os.cpp) · [Linux CPU count](https://github.com/openjdk/jdk21u/blob/master/src/hotspot/os/linux/os_linux.cpp)

| Run | Write gateway | Read gateway | Transactor |
| --- | --- | --- | --- |
| Mac TAIL1 Serial F | Explicit Serial, 1 CPU, 1,408 MiB limit | Explicit G1, 1 CPU, 768 MiB | Explicit G1 at 50 ms, 1 CPU, 1,056 MiB |
| Bare metal BM1 matched i9-1 | Inferred ergonomic Serial, 1 CPU, 4,096 MiB at launch | Inferred ergonomic Serial, 1 CPU at launch, 4,096 MiB. The runner expanded affinity to two after startup. | Explicit G1, 1 CPU, 6,144 MiB. The launcher set no pause target. |
| Bare metal SCALE1 archived replay source | Observed ergonomic Serial, 1 CPU | Observed G1, two CPUs at launch | Observed explicit G1 |
| Current TAIL1 | Explicit arm at launch | Explicit G1 | Explicit G1 at 50 ms |

Mac startup GC logs and Java argv corroborate the settings. All four BM1 i9-1 arm directories retained the launch `engines/*/containers.json`, transactor `tx-startup-wait.log` and post-start `placements.json`. The two peers passed heap flags without a collector or CPU override. Startup GC readback for those peers is absent. The later two-CPU placement cannot reselect a running JVM's collector. The older SCALE1 archive has individual GC logs for all three JVMs. [Matched-run source](https://github.com/OnboardedInc/triplex-db-2/blob/d36602361057e8c71485ead3fb97d759eb38d209/lab/experiments/EXP-DX1/w1/bench.ts) · [Archive method](OVERNIGHT.md) · [Mac evidence](SHA256SUMS)

At the Mac writer's cap, adding one CPU alone leaves the heap host below HotSpot's memory threshold. On bare metal the writer was above that threshold, so two physical cores at JVM startup could make G1 the ergonomic choice. The split-stack launcher now supplies a collector even when the caller supplies only heap options. It keeps explicit overrides and rejects conflicting selectors. The transactor stays on G1 for this trial with unchanged SQL durability. Datomic's default is G1 at a 50 ms target. [Transactor reference](https://docs.datomic.com/operation/transactor.html)

`g1-2core` retains the single-core G1 JVM flags and the heap, memory cap, archive, SQL and neighboring placements. The second writer core is distinct from the other roles. Linux pins the sender to the same separate CPU in every arm. Compare the startup log's available CPU count, CPU consumption and effective pauses as well as client latency. In the timed replay, collector and CPU readback must come from the freshly started container that provides the receipts.
