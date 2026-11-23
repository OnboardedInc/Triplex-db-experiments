# DX-RD1 full-size pinned reads

At 256 readers the server finished 893 reads a second, down from 1,561 at 64 readers.
The read gateway had one place to do the work. Readers lined up as the work slowed.
The JVM stopped for collection often, including one pause just under half a second. Collection does not explain the full drop.
The archive cannot say how much time was spent waiting for storage, and it gives no per-read timing inside the gateway.
The new comparison shows where a sampled request waits, and tries three read cores plus small batches of reads at the same cut.
The forecast at 256 is 80–155 ms at 50 saves a second and 95–205 ms at 235. The 100 ms bar still needs a server run.

## Archived read time

| Readers | Exact completed/s | Mean / p99 end to end (ms) | JVM GC pauses in 60s (count / s / max ms) | JVM safepoints (s / max ms) |
|---:|---:|---:|---:|---:|
| 1 | 606.4 | 1.648 / 5.951 | 156 / 5.924 / 78.039 | 6.246 / 83.367 |
| 16 | 618.9 | 25.835 / 93.695 | 242 / 10.711 / 77.880 | 11.238 / 81.948 |
| 64 | 1,560.8 | 40.933 / 146.431 | 192 / 8.239 / 112.465 | 8.643 / 113.430 |
| 256 | 893.2 | 285.483 / 860.159 | 240 / 11.775 / 496.964 | 12.319 / 543.898 |

GC and safepoint columns overlap and apply to the process, without per-read attribution. The 544 ms stop reached its safepoint in 0.036 ms and spent 538.174 ms at it. Even pricing every logged safepoint out of the denominator gives 677, 761, 1,823 and 1,124 reads/s. Client encode/transport, the admission queue, basis resolve, peer index/storage/object cache and segments, decode and response are individually unavailable in this archive. `operations.json` has saves, the feed and the tape, with 1,260 save offers over six minutes. The transactor ran Java 25 ZGC on three cores with separate WAL, while the reader and writer were Java 21 G1. P4 uses the `/v2/reach` closure path with p50 4.543 ms and p99 50.175 ms. The ladder uses a single `/read` field.

The closed loop issues one call per seat and replenishes it after checking the answer. Goodput × mean agrees with the seat count through 256. The driver's 512 sockets and Jetty's 512 threads can bind at 1,024. The lean route has a separate FIFO semaphore with one admitted request on this placement, and the effective Datomic peer I/O concurrency setting was eight. Each request picks a pinned snapshot, seeks an entity, decodes live row strings before the field filter and serializes its answer. Queueing follows from the one-permit path, but the archive has no CPU, I/O or per-seat evidence to divide the service cost. Reading at 64 repeats more subjects than at 1–16 because of the seat stride and phase order. An equal-reads-per-seat reconstruction gives roughly 36k, 23k, 15k and 4.6k distinct account-subject pairs. That is a locality hypothesis for 64 and cannot alone explain 256. The new run counts the actual union, Node ELU and sockets, gateway CPU and pressure, sampled admission, immutable basis resolution, peer I/O, row decode and response bytes. Peer I/O counters show native retrieval categories. Physical SQL/device waits that they cannot attribute still require server correlation.

## Options ranked by gain per risk at 256

| Change from the control | p99 / reads/s forecast at 50 offers/s | Reason |
|---|---:|---|
| Three read cores and three FIFO permits, G1 | 290–450 ms / 1,900–2,700 | Parallelizes admitted work. One writer core moves and the 235/s receipt rate needs checking. |
| Batch up to eight already queued, exact same basis and attribute | 310–600 ms / 1,200–2,300 on one core | Amortizes fixed work and traverses duplicate entities once. Flushes on the next microtask without fill waits. Every seat checks its own row. |
| Field filter before public row materialization | 590–850 ms / 950–1,350 on one core | Checks the parsed exact attribute before making unrelated row maps. Grouped interior and historical fall-through preserve the existing decoder. |
| Heap 3→6 GiB and effective object cache 1.5→3 GiB | 540–810 ms / 950–1,350 on one core | More residency and headroom. Archive proves the effective default cache size but has no hit or miss counts. |
| Java 25 ZGC on three reader cores, same memory | 240–420 ms / 1,700–2,650 with cores alone | May cut pause tails and lose throughput to concurrent GC. Exposed as the alternative read JVM. |
| More request permits on the same core, or a changed Node/Jetty pool | 750–1,150 ms / 700–1,100 | Raises contention until CPU or storage measurements justify it. |
| Cache just resolved physical `t`, or send `t` with the position | 670–825 ms / 900–1,200 | Candidate only after measuring resolution. A bounded key must bind database identity and logical cut. Grouped interior positions, record-time bounds, restore generations and current erasure checks still apply. |

The [server command and per-level predictions](lab/experiments/EXP-DX1/rd1/FULLSIZE-SERVER.md) compare G1 control with the combined three-core, larger-cache, batched and selective-decoder arm. A single user-visible pin still names both recorded position and valid time. These estimates are forecasts. Bare-metal validation is pending.

Mac correctness at `638864206`. The compact subject and grouped writers each ran single and batched pinned reads. Their four arms checked 24,106, 31,080, 24,350 and 36,262 reads with zero errors. Each arm checked all 29 saves against the journal and all ten current pulls. The native gateway suite ran 28 tests and 54,110 assertions with zero failures. The scoped package build and strict runner typecheck succeeded. Mac counts are correctness denominators.

Both final owned volumes and slot reservations were removed. The engine refused removal of the final compact image because a container still references it. Its private pinned configuration remains available for a later managed removal. The first two startup attempts exposed a private-image entrypoint mismatch. Their logs and the successful retry are retained.

Evidence is under `evidence/DX-RD1/fullsize/`. The original SCALE1 archive SHA-256 is `5c31f5a9512634d92144baff84edd2c3aad8300a06bd281ca9cba8231c00b4ad` and its source is `92f8e6c30db1084b3c00a93d57fed0e8f612e67e`. This change is based on `f8057d113`. The selective archive extraction was deleted. [Evidence manifest](lab/experiments/EXP-DX1/rd1/FULLSIZE-SHA256SUMS)

Audit. The archive reader verifies member bytes, custody source, serving slot and the saved tape digest and produces a retrospective diagnostic. The join checks source, slot, attempt, fresh request ID, echoed ID, status and byte count and keeps missing samples explicit. It cannot prove unobserved response content. The native gate uses a fresh Datomic database, verifies expected rows at distinct cuts and exercises sampled I/O. The compact gate uses the owned image and volume, unique attempts and loader nonce, verifies pinned and current results and checks each toy write receipt against the journal. The server command produces diagnostics. No pinned acceptance inputs changed.
