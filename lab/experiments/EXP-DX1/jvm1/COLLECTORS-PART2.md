# Launch settings for the Java 25 experiment

DX-JVM1 owns `lab/experiments/EXP-DX1/jvm1/launch.mjs`. DX-TAIL1 can import `measuredWriterG1` for its existing G1 arm and point at this file for the exact measured flags. Its Java 21 ZGC arm keeps the legacy generational selector for historical comparison. Java 25 ZGC uses the version-specific profile. The integration campaign imports the same writer settings while retaining its own heap limits and workflow.

| Flags | Reason |
| --- | --- |
| `-XX:+UseG1GC`, `-XX:MaxGCPauseMillis=50` for transactor and reader | Choose G1 before the JVM sees placement. The transactor uses Datomic's documented pause goal. The read peer uses the same soft goal for the trial. |
| `-XX:+UseG1GC -XX:MaxGCPauseMillis=25 -XX:G1HeapRegionSize=2m -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=5 -XX:G1MaxNewSizePercent=25 -XX:ConcGCThreads=1` for writer | Reuse TAIL1's observed two-core setting. The region size changes when arrays are humongous. Unlock the young-generation bounds, retain adaptive sizing within them, and leave one concurrent worker on two writer cores. |
| `-XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=5 -XX:G1MaxNewSizePercent=60 -XX:ConcGCThreads=1` for G1 transactor and reader | Make the documented adaptive young bounds explicit. Leave CPU for serial apply or pinned queries when marking runs. |
| G1 `-XX:G1ReservePercent=10 -XX:InitiatingHeapOccupancyPercent=45 -XX:+G1UseAdaptiveIHOP` | Keep evacuation reserve and the initial marking threshold explicit. Let G1 adapt the threshold once it observes the allocation rate. |
| `-XX:+UseZGC -XX:ConcGCThreads=2` on transactor and reader, `-XX:ConcGCThreads=1` on writer | Select generational ZGC on Java 25. Reserve concurrent capacity while bounding CPU competition against the serial apply thread and peer work. |
| `-XX:ParallelGCThreads=3/2/3`, `-XX:+UseDynamicNumberOfGCThreads` | Bound worker capacity to the transactor/writer/reader cores. Permit idle workers to retire and record the configured cap. |
| ZGC `-XX:+ZUncommit -XX:ZUncommitDelay=300`, `-XX:ZAllocationSpikeTolerance=2` | Return long-idle heap pages and keep ZGC's normal pacing sensitivity explicit across JDK upgrades. |
| `-Xms256m`, role-specific `-Xmx`, ZGC `-XX:SoftMaxHeapSize` | Bound cold start commitment and price hard capacity with archived input. ZGC can exceed its soft target as needed. [Budget](PREDICTIONS-PART2.md) |
| `-XX:ActiveProcessorCount=3/2/3`, separate task affinity | Size JVM and peer pools explicitly, with two writer CPUs in every arm. PostgreSQL has CPU 1 and the client has CPUs 3,6,7. |
| `-XX:MaxDirectMemorySize=256m -XX:+ExitOnOutOfMemoryError` | Keep a direct NIO buffer cap independent of heap size and surface an exhausted process as a failed arm. |
| `-XX:-AlwaysPreTouch -XX:-UseLargePages -XX:-UseTransparentHugePages -Xshare:auto` | Keep cold startup comparable, avoid large pages requiring a separate host reservation, and use the bundled CDS archive where the VM can map it. |
| `-XX:+TieredCompilation -XX:CICompilerCount=2 -XX:CompileThresholdScaling=1` | Hold compilation policy constant with no synthetic warm-up. |
| Datomic soft read/write 8/4, index 128/512 MiB and parallelism 1, transactor/peer cache 2,560/1,536 MiB, heartbeat 5,000 ms and transaction timeout 10,000 ms | Keep database settings fixed while pricing the collector. Both peers keep read concurrency 8 and prefetch 1/on. Transactor prefetch stays 1/off. SQL durability stays on. |

Startup prints complete HotSpot flags and origins. A fixed launcher profile controls the tuning knobs listed here. HotSpot still adapts during the run within the explicit policy. [Exact flags](launch.mjs) · [Datomic G1 control](https://docs.datomic.com/operation/transactor.html#running-the-transactor) · [Oracle G1 tuning](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-garbage-collector-tuning.html)
