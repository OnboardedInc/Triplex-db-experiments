# DX-H5 — real W0 activation on lean Datomic inside the VM

North star: P5, `lab/NORTH-STAR.md` priority 5 and `lab/TARGETS.md` §1/§1.1. Scope is `lab/SCOPE.md`; execution follows `lab/PROTOCOL.md` §0b and the DX-H5 brief. All results are diagnostic pending independent review. This report is in progress; unrun cells are not performance results.

## Implementation and constraints

The actual W0 driver remains the activation path: independent O-DOMAIN population fingerprint, G0 preview, release activation at one captured basis, positive retroactive post-capture mutations, per-subject independent reconciliation, atomic outbox publication and independent delivery fold, exact coverage, epoch/basis checks, complete stored journal/count fold and completed-cursor resume. Existing G4 abrupt-stop/G6/G8 omissions remain visible. No acceptance files or packages were edited.

H5 adds eight-worker support; request-observer byte/gateway/datom instrumentation; per-thread read/world-decode/kernel CPU; per-page dispatch queue age, publication queue wait and cgroup interval observations; reusable receipt-selected seed scopes with fresh G0/count checks on every clone; a strict external measurement lease; local Python plus the local Node executable in the VM, with no downloads or published gateway ports. The Python oracle runs inside the driver cgroup, not over a host bridge.

`h5/equivalence.ts` selects `publicSweep('datomic')`, exercising the actual `getReachRowsMany` page reader, compares every 200-subject page at two cuts against portable rows, and requires one actual HTTP request per page. H2's old test selected `datomicW0Sweep`, which still names the portable fallback; testing only that alias would not verify the fast page reader.

Reference W0 population fingerprints include each fact's exact command position (`worldOf` maps stored row position to fact `tx`; O-DOMAIN `population.py:world_facts` constructs fixed reference positions). Concurrent subject pipelines can interleave these positions. H5 never rewrites expected fingerprints or fabricates row positions. `h5/probe.ts` measures separate diagnostic scopes at 1/8/16/32 subject pipelines and retains actual versus reference positions. Such a reordered probe cannot become a sealed reference seed. Exact reference seeding currently remains ordered; a production exact-position import/ordered admission facility is a needed package capability if concurrent reference seeding is required.

## Exact commands and resources

All engine-backed commands run through `node lab/bin/heavy.mjs --label DX-H5-... -- bash lab/experiments/EXP-DX1/h5/attempt.sh ...`.

Setup:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0...
```

The wrapper uses only `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`, only its `tx2-dxh5-*` containers/networks/volumes, and local images. It retries `mkdir .../locks/measure` every five seconds and writes owner id/prefix/kind/pid. All H5 containers exist only while it owns that directory. A continuous stack/seed/sweep lease is capped at 45 minutes, including cleanup; leases are released between invocations. The wrapper stops peers, transactor and Postgres before copying a seed with `postgres:17-alpine` and `cp -a`. Every measurement starts with a fresh data-volume clone and reruns independent G0.

Placement for the prescribed profile: Postgres CPU 0, memory 2 GiB, shared_buffers 512MB, max_wal_size 8GB, checkpoint_timeout 30min; transactor CPUs 0,1, heap 3 GiB/container 4 GiB, object-cache 1g, index threshold/max 256m/1g; write gateway CPU 1; read gateway CPUs 2,3; both gateway heaps 1–2 GiB/container 3 GiB with G1GC, MaxGCPauseMillis 25 and objectCacheMax 1g passed through `--gw-java-opts`; driver CPUs 4,5,6,7, memory 8 GiB. `TRIPLEX_DATOMIC_LAYOUT=lean`. Exact per-attempt stack/image/cpuset/memory manifests and raw cgroup samples are durable evidence. Count enumeration concurrency is 64, retaining all entities, all stored histories and the unchanged stable-head checks.

## Seed and sweep results

Pending engine admission. No 1,000/10,000-subject seed or sweep number is claimed at this stage.

| Subjects | Workers | Seed/fingerprint | Sweep wall | Subjects/s | Gates | Live ratios |
| ---: | ---: | --- | --- | --- | --- | --- |
| 1,000 | 1 | NOT-RUN | — | — | — | — |
| 1,000 | 4 | NOT-RUN | — | — | — | — |
| 1,000 | 8 | NOT-RUN | — | — | — | — |
| 10,000 | best measured | NOT-RUN | — | — | — | — |

## Accounting and interpretation

Sweep wall includes worker startup, read/wire decode, world construction, kernel evaluation, independent gate verification and ACKed outbox publication. It excludes seed/G0 and final end-count enumeration. Worker stages overlap; their summed demand divided by wall is not an exclusive wall partition. `workerWaitMs` is page age from sweep start to assignment; it includes earlier occupied workers and startup. Publication queue is distinct. `callbackWallMs` contains verification and publication; `publicationWallMs` contains outbox build and commit; do not add these inclusive fields again. Cgroup per-page deltas include other concurrent pages/live traffic, so window-level CPU from raw samples is the correct throughput denominator. Thread CPU remains attributable per worker. `read` CPU includes adapter/wire JSON decoding; `decode` is conversion and canonical sorting into W0 worlds. Header time is gateway service wall, not CPU. Missing header/datoms stay null.

The existing sequential live arms use the same frozen generator and offset with distinct command namespaces on one evolving store. Their summary exposes matched-prefix coverage; no A/A or cloned-pair acceptance is implied. Reader errors retain exact subject/cut/endpoint and nested transport causes. Primary writer latency includes scheduled offer-to-ACK queueing; service latency is separate.

## Checks, audit, pins and evidence

Offline install: complete, zero downloads. Required package builds: complete (five build tasks). Focused existing W0/HTTP/journal tests: 13 pass, zero fail; added concurrent request-observer and restored-journal refusal tests: two pass, zero fail. Broad bench typecheck was attempted and failed on missing optional lane builds and existing bench errors; it is not reported as passing. Exact logs are in durable evidence.

Every verdict/receipt producer is listed in [AUDIT.md](AUDIT.md), including content, freshness and binding conditions. [PIN-CHANGES.json](PIN-CHANGES.json) records changed acceptance-pinned file hashes (currently empty); the contract remains unchanged. No full root check, package qualification, 100k run, maintenance-overlap run, ten live abrupt-stop cycles or independent acceptance review is claimed.

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/`. Bulky seed/journal/world/gate files stay outside git; the final index and SHA256SUMS will bind retained evidence.

## 100,000 in 100 seconds

The required flow is roughly 44 million rows/100 seconds = 440,000 rows/s and roughly 13 GB/100 seconds = 130 MB/s before repeated protocol fields. Per-stage CPU requirements and the three ranked changes must be derived from fresh H5 measurements; they are pending rather than substituted from H2's old layout/tunnel numbers.

### Retained setup failures

- `tx2-dxh5-smoke1`: queued shell script was edited while waiting; parsing failed just after successful lock mkdir and before its held flag/owner write. Its misleading exit-zero cleanup artifact is not adopted as success. Empty lock inode 185511787, timestamp 06:21:18 UTC, matched this attempt's 06:21:19 exit; after repeated empty observations only `rmdir` removed it. `empty-lock-recovery.json` records the evidence. All owned container/network/volume inventories were empty.
- `tx2-dxh5-smoke2`: local Node image is ARM64; hardcoded x86 library-copy paths failed before stack startup. Cleanup inventories are empty and exit is one. Replacement copies libraries from the local architecture's `*-linux-gnu` directory and checks both runtimes before creating the Datomic stack.

`tx2-dxh5-smoke3` was explicitly canceled while unadmitted (exit 124, empty cleanup inventories) after repeated competing leases. The next attempt prioritizes N=1000 and includes the same runtime preflight. Updated runtime watchdog starts cleanup at 42 minutes, reserving three minutes within the 45-minute cap. Before sealing, aggregate existing sealed bytes plus the new volume must be at most 30,000,000,000. Mandatory preview now records CPU/bytes/gateway service separately before live traffic; this calibration uses the main/write gateway on CPU 1, explicitly distinguished from sweep readers on CPUs 2,3.
