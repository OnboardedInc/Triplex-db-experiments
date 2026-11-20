# DX-JVM1 JVM inventory

North star P1, P2, P6 and P8. Track pinned-reader progress, scheduled offer to durable ACK, quiet-account p99 ratio and index interference during imports. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Chosen** means explicitly set in the launch. **Inherited** means a vendor or HotSpot default. **Accidental** means a placement- or launcher-dependent outcome that contradicted the intended policy. A launcher declaration, retained argv, final VM flags, and Datomic's resolved property map provide different evidence.

| Stack | JVM | Start affinity → later affinity | Xms / Xmx / container, MiB | Collector and direct-memory evidence |
| --- | --- | --- | --- | --- |
| Mac TAIL1 Serial C | Transactor | 0 | 256 / 704 / 1,056 | G1 50 ms chosen; direct unset |
| Mac TAIL1 Serial C | Writer | 1 | 256 / 896 / 1,280 | Serial chosen; direct unset |
| Mac TAIL1 Serial C | Reader | 2 | 256 / 416 / 768 | G1 chosen, 200 ms HotSpot default inferred; direct unset |
| Bare-metal SCALE1 archive | Transactor | 0 | 256 / 5,120 / 6,144 | G1 observed; explicit G1 alone implies inherited 200 ms; direct unset |
| Bare-metal SCALE1 archive | Writer | 2 | 256 / 3,962 measured effective / 6,144 | Serial observed; inferred ergonomic, accidental; direct unset |
| Bare-metal SCALE1 archive | Reader | 4,8 | 256 / 4,096 / 6,144 | G1 observed, ergonomic; direct unset |
| Bare-metal BM1 i9-1 | Transactor | 0 | 256 / 5,120 / 6,144 | G1 chosen; direct unset |
| Bare-metal BM1 i9-1 | Writer | 2 | 256 / 3,072 / 4,096 | Serial inferred from startup placement, accidental; direct unset |
| Bare-metal BM1 i9-1 | Reader | 4 → 4,8 | 256 / 3,072 / 4,096 | Serial inferred from startup placement, accidental; direct unset |

The builds pin Temurin 21.0.13+9 and Datomic 1.0.7745. For the historical bare-metal runs the archive has GC selection and measured heap on SCALE1, launch and later container readback on BM1 and no complete HotSpot final table. A fresh server startup capture requires the prepared bench host. The probe in this branch captures final flag values and origins from the actual JVM's startup output and binds them to its live PID, start ticks, cgroup and immutable image ID. It records the reported VM version and CPU count before releasing the slot. The Java 21 NIO default direct-buffer limit follows Runtime.maxMemory when MaxDirectMemorySize is zero. This limit does not cover all native allocations. [JDK VM implementation](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/jdk/internal/misc/VM.java) · [Image](../../../config/datomic/Dockerfile) · [Archived collector evidence](https://github.com/OnboardedInc/Triplex-db-experiments/blob/4ebff4dbc9d225f6a56abd23152185041eaae865/lab/experiments/EXP-DX1/tail1/COLLECTORS.md)

The probe repeats the small Mac split SQL layout with a 1,408 MiB writer cgroup from the later TAIL1 runner. A different Mac launcher, engine.mjs dev, colocates the transactor and gateway on CPUs 0 and 1 inside 2,816 MiB, with 640 and 1,024 MiB heaps and 128 MiB direct caps each. Its exclusive profiles use 1,024 and 1,792 MiB heaps, 128 MiB direct each, and a 3,584 MiB combined cap. A dedicated reader is optional and takes caller-supplied resources. Engine dev's transactor flags bypass the vendor's 50 ms launcher bundle because the wrapper passes non-heap options. The vendor peer shell consumes DATOMIC_JAVA_OPTS. The unused JAVA_OPTS value in split gateway containers cannot set their heaps. [Engine](../../../bin/engine.mjs) · [Slot values](../../../config/slots.json) · [Split launcher](../stack/up.sh)

## Datomic and gateway settings

| Setting | Mac split TAIL1 | Bare metal | Origin |
| --- | --- | --- | --- |
| Transactor memory-index threshold / max / object cache, MiB | 48 / 128 / 160 | SCALE1 plan 128 / 512 / 2,560; older BM1 T1 startup 256 / 1,024 / 2,560; W1 plan 128 / 512 / 1,280 | Chosen per launcher |
| Transactor storage write/read soft limits | 4 / 8 | 4 / 8 in retained T1 startup | Inherited |
| Index parallelism / index I/O parallelism / parallel merge / dynamic parallelism | 1 / 100 / true / false | Same in retained T1 startup | Inherited |
| Heartbeat / Datomic transaction timeout / peer TTL | 5,000 / 10,000 / 10,000 ms | Same in retained T1 startup | Inherited |
| Query / read-ahead / external-sort worker pools | 32 / 3 / 1 | Same in retained T1 startup | Inherited in transactor configuration; peer pool sizes need live readback |
| Transactor prefetch concurrency / probes | 1 / false | 1 / false in retained one-core T1 startup | Inherited; CPU-dependent |
| Peer object cache | 32 / 32 MiB | SCALE1 1,536 / 1,536 MiB; W1 launcher defers to peer default | Chosen on Mac and SCALE1; inherited in W1 |
| SQL pool min/max, idle reap, borrow and driver timeouts | No explicit override found | No explicit override found | Inherited; exact live values unverified |
| Gateway Jetty pool | min 8 / max 512, both | same split source | Chosen; separate from Datomic pools. The dedicated engine reader uses max 128 |
| Gateway synchronous wait limits | ordinary sync 2,000 ms; submit-to-peer deref 5,000 ms; basis wait per request | same split source | Chosen; separate from Datomic timeout |

No Memcached or Valcache is configured in the inspected split stack. Pg JDBC 42.7.11 and Commons Pool 2.13.0 are in the pinned distribution; the jar list alone establishes no runtime pool limits. The engine dev transactor uses embedded storage with index/cache settings 32/192/96 MiB resident, 32/256/192 MiB exclusive. Pool defaults documented for different storage providers should not be transferred to SQL. [Datomic properties](https://docs.datomic.com/operation/system-properties.html) · [SQL storage](https://docs.datomic.com/operation/storage.html)

Historical inputs: TAIL1 Serial C and BM1 T1 startup configuration hashes are `0f7cc0ba434e3bdc267d16e195acffac58d25602ba9209c67992a570c0666c01` and `2db8139607def277924233f061812db9e53d1c734a7e1c2edf923b88ef41e282`. The held-scale source archive is `095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb`. Runtime dumps can contain private paths and endpoints. Preserve those in the durable evidence folder.
