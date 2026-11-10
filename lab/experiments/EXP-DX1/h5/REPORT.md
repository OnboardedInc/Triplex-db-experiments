# DX-H5: W0 activation on lean Datomic in the VM

**Diagnostic, not P5 acceptance.** The 1,000-subject matrix completed with exact coverage and real work-item publication: 1 worker **58.593 s**, 4 workers **30.659 s**, 8 workers **31.792 s**. Four workers was fastest, but its writer p99 ratio **1.810** missed the 1.5 bound. All receipts remain `PARTIAL`, `acceptance:false`, with existing incomplete gates visible. **The 10,000-subject seed failed its bounded attempt; no 10k sweep ran.** No 100k result is claimed.

Goals come from lab/SCOPE.md, NORTH-STAR.md and TARGETS.md §1.1; execution follows PROTOCOL.md §0b. No package or acceptance files were edited. Results require the separate reviewer's independent source-bound verification.

## Seed and reusable volume

Qualified 1k seed: **`tx2-dxh5-seed-1000-pg-data`**, scope `dxh5-w0-1000-v1`, attempt `tx2-dxh5-seed1000b`, original receipt `driver/receipt.json`. Stopped Postgres data: **638,560 KiB / 653,885,440 bytes**. Every sweep cloned it and reran fresh independent population fingerprint, G0 preview and full history counts. Copying the seed never grants PASS.

42,775 commands, 442,410 assertions, 214 retractions; L=20, K=4. Command wall **204.994 s**, **208.665 commands/s**. First full-history count **39.965 s**; seed function including that count **244.959 s**. Complete G0 controller including independent population, repeated full counts and preview **373.338 s**, excluding stack startup/sealing. Facts 444,368; world fingerprint `sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad`; R2 `sha256:9d8aae5098072e22487d8da160037384332ba1f03d42287ee98782a9cae4833c`.

Concurrency probes used separate fresh 1k scopes, preserving order within each subject. Full commands/ACKs and actual positions are retained in `tx2-dxh5-probe2`; those diagnostic volumes were removed.

| Requested / peak in flight | Commands | Command wall s | Commands/s | Reference-position mismatches |
| -------------------------- | -------: | -------------: | ---------: | ----------------------------: |
| 1 / 1                      |   42,775 |        194.154 |    220.315 |                             0 |
| 8 / 8                      |   42,775 |        110.343 |    387.655 |                        42,618 |
| 16 / 16                    |   42,775 |        112.066 |    381.696 |                        42,658 |
| 32 / 32                    |   42,775 |        114.038 |    375.094 |                        42,685 |

Eight was fastest in this single ordered series, without randomized/JIT-controlled repetition. **Faster concurrent scopes are not valid reference seeds.** The immutable O-DOMAIN fingerprint includes each fact's actual logical command position; interleaved subjects reorder it. I preserved the gate and seeded qualified scopes in exact reference order. A position-preserving batching/ordered import design would be needed to exploit concurrent preparation; no package change was implemented or assumed necessary without investigating existing transaction APIs.

The reference generator gives 434,768 commands at 10k and 4,338,757 at 100k (`reference-command-counts.json`, metadata only). At 208.665 commands/s, 100k implies about **20,793 s / 5.78 hours in commands alone**, before count/fingerprint/sealing, if this rate held. The faster diagnostic rate implies about 3.11 hours but fails exact reference positions. Neither is a measured 100k seed time.

## Reader equality and the observed memory failure

Fresh `equivalence1` and `equivalence2` each used 200 subjects at two positions, with a mutation between cuts. All four pages including the partial page matched the portable reader's **complete sorted row bytes and actual recorded positions**: **8/8 comparisons, one actual Agent HTTP request per page**. The test selects `publicSweep('datomic')` / `getReachRowsMany`; H2's old portable alias would not exercise this path. Each variant's source hashes are checked before/after, including the cache policy for equivalence2.

Original uncapped `w1a`, `w4a`, `w8a` all failed in the 64-reader no-sweep baseline before activation. Driver cgroups reached the fixed 8 GiB limit and recorded OOM/OOM-kill. Their receipts remain `RUNNING` because the OS killed the child; outer exits are nonzero. No sweep time or ratios are assigned. JavaScript could not capture a nested HTTP cause for an OS kill; raw cgroups/gateway logs are retained.

The explicit retry uses `TX2_W0_CACHE_MAX_ENTITIES=10000`: a benchmark-only wrapper resets the session/clears the cache using the client's existing mechanism, then calls its original decoder and missing-reference full-response repair. It never substitutes an empty result for an evicted reference. A focused real-client protocol test proves session reset and a missing-reference retry. CPU, memory, 64 readers, temporal/position checks and all gates remain unchanged. This is a workaround, not a supported package cache-budget API. Driver peak bytes during completed sweeps: 1 worker **6,086,045,696**; 4 **6,841,458,688**; 8 **7,117,733,888**.

Restored scopes use live clock/fresh IDs for new writes: reopening with the deterministic seed runtime resets counters and collides with stored IDs. Stored seed bytes, explicit valid times and pinned positions are unchanged; every restored clone reruns G0 and activation gates. The seed's Nov 4 valid time precedes this Nov 10 run.

## Sweep and gates

All completed 1k configurations use page size 64, 64 uniform current-position live readers, identical frozen writer offers, a 60-second baseline, and a fresh clone of the sealed seed. Each is one trial. Eight workers was selected for 10k: it was fastest among the observed configurations whose read and writer ratios both met 1.5. The earlier four-worker waiting launcher was canceled before admission; its source and cancellation observation remain retained. No measurement result was discarded.

| Subjects |    Workers |           Sweep wall s | Subjects/s | ACKed pages | Exact coverage | Read p99 ratio | Writer p99 ratio |
| -------: | ---------: | ---------------------: | ---------: | ----------: | -------------: | -------------: | ---------------: |
|    1,000 |          1 |                 58.593 |     17.067 |          16 |          1,000 |          1.056 |            1.425 |
|    1,000 |          4 |                 30.659 |     32.617 |          16 |          1,000 |          1.105 |        **1.810** |
|    1,000 |          8 |                 31.792 |     31.455 |          16 |          1,000 |          1.125 |            1.448 |
|   10,000 | 8 selected | NOT-RUN: seed deadline |          — |           — |              — |              — |                — |

For **each** completed 1k configuration: G0 PASS (fresh independent population and complete counts); G1 PASS (fresh O-DOMAIN fingerprint, no pre-capture trace); G2 PASS (independent reconciliation for all 1,000 subjects); G3 PASS (ten positive post-capture retroactive mutations and ten negative controls); G5 PASS (807 deliveries, independent per-frame publication fold); G7 PASS (all pages at activation position 42,776 / valid time 2026-11-04T12:00Z and exact epoch); G9 PASS (full actual stored-journal/count fold). G4 **PARTIAL**: exact coverage and completed-cursor resume pass, ten abrupt process-stop cycles absent. G6 **NOT-RUN**: separate reviewer integration needed. G8 has **no maintenance-overlap run**. No omission was promoted to PASS.

G9 ending position/assertions/retired: 1 worker `42939/446160/338`; 4 `42909/445824/300`; 8 `42912/445858/302`. Different totals reflect real writer progress in different-length windows. Positive mutations are visible at latest state while G2/G7 remain pinned to the earlier activation basis.

## Where each second goes

Cells below are **summed stage seconds / sweep wall seconds**, showing demand, not an exclusive partition. Concurrent pages overlap. Queue ages are observations rather than extra work. [PAGES.md](PAGES.md) gives every page's rows, bytes, waits, gateway header, stages, CPU and datoms; [MEASUREMENTS.md](MEASUREMENTS.md) gives full stage/CPU tables for every attempt. Raw `activation-pages.ndjson` remains authoritative.

| Stage demand per sweep second | 1 worker | 4 workers | 8 workers |
| ----------------------------- | -------: | --------: | --------: |
| Read/protocol/row decode      |     .358 |      .751 |      .970 |
| World build/canonical sort    |     .204 |      .547 |      .650 |
| Kernel evaluation             |     .010 |      .032 |      .047 |
| Row indexing                  |     .002 |      .007 |      .009 |
| Worker result encode          |     .017 |      .049 |      .054 |
| Controller result decode      |     .006 |      .011 |      .011 |
| Independent verification      |     .246 |      .565 |      .520 |
| Build outbox                  |     .087 |      .173 |      .169 |
| Publish commit                |     .033 |      .075 |      .065 |

Four workers: **442,567 page rows, 97,626,560 response bytes, 16 actual read requests**. Summed read wall **23.030 s**, versus gateway header service **1.729 s**; world build **16.756 s**, kernel **.981 s**, controller decode **.352 s**. Independent verification **17.315 s**, outbox build **5.301 s**, commit **2.313 s**. Serialized verify/build/commit occupied **24.929 s / 81.3%** of sweep wall. Publication queue summed **34.446 s**, assignment-to-worker dispatch/startup **11.609 s**. First dispatch costs about 2.9 s per worker; page age also includes earlier occupied workers. These overlapping waits must not be added to wall or callback work.

Publication: **16 actual commits, 7,336 native datoms, 1.647 s gateway service**. Command-id deduplication, atomic outbox preconditions and independent fold are preserved. Build currently includes command lookup and sequential per-subject state pulls; these requests sit outside the separately measured commit request count. Main-thread CPU intervals during asynchronous verification/build/commit overlap live work and are labeled accordingly.

Direct differences of inner 1-second cgroup samples, including live traffic and Python oracle: average driver/read-gateway/transactor CPUs were **3.929/1.794/.076** over 57.974 s (1 worker), **3.988/1.537/.119** over 29.958 s (4), **3.963/1.706/.116** over 31.062 s (8). Boundary intervals are excluded; overlapping per-page cgroup deltas are never summed. The four-driver-CPU allocation is saturated. The transactor is not the observed CPU wall. Read gateway counters include live reads and cannot be attributed solely to sweep rows.

## Live paired windows

Matched-prefix **baseline p50/p99 → sweep p50/p99**, milliseconds. All matched prefixes cover their full sweep. Primary writer latency is scheduled offer-to-ACK, including queueing. Counts are observed baseline/sweep samples.

| Workers | Read baseline → sweep           | Read count    | Writer baseline → sweep         | Writer count | Read / writer p99 ratio |
| ------: | ------------------------------- | ------------- | ------------------------------- | ------------ | ----------------------- |
|       1 | 69.117/280.783 → 71.480/296.394 | 27,633/25,740 | 83.960/191.483 → 79.002/272.846 | 69/69        | 1.056 / 1.425           |
|       4 | 62.667/308.347 → 80.952/340.863 | 15,016/11,641 | 87.208/182.842 → 88.933/330.871 | 38/38        | 1.105 / **1.810**       |
|       8 | 71.150/314.653 → 82.897/353.946 | 14,417/12,077 | 83.649/227.183 → 86.754/328.922 | 41/41        | 1.125 / 1.448           |

Commit service p50/p99: 1 worker 42.601/148.141 → 36.072/132.834 (ratio .897); 4 workers 48.183/107.995 → 36.584/314.851 (2.915); 8 workers 45.111/193.439 → 34.509/80.176 (.414). Service p99 is not substituted for scheduled writer p99. Samples are few; no tail-confidence claim is made.

Existing sequential arms share evolving state, same frozen generator/offset, distinct command namespaces. There is no clone/A-A calibration. Readers are uniform current-position, not full TARGETS §2.2 hot/basis mix or a full live semantic oracle. These limitations remain in receipts. No H2-style reader exception recurred in bounded-cache completions. New failure context records exact subject/cut/endpoint and nested cause when observable by JavaScript.

## What 100,000 in 100 seconds requires

Target: 1,000 subjects/s, about **440,000 rows/s**, including evaluation and ACKed publication. Constant-rate scaling of the best 1k trial gives **3,065.9 s / 51.1 minutes**, **30.66×** too slow; not a measured 100k result. This payload was **220.59 bytes/page-row**, implying about **97 MB/s** at 440k rows/s or 9.76 GB/100k subjects if unchanged; the brief's broader 13 GB estimate implies 130 MB/s. Neither is a measured VM bandwidth ceiling.

| Four-worker stage          | CPU s / 1k | Rows / CPU second | CPUs at 440k rows/s |
| -------------------------- | ---------: | ----------------: | ------------------: |
| Read/protocol/row decode   |      6.694 |            66,117 |               6.655 |
| World build/canonical sort |      5.533 |            79,986 |               5.501 |
| Kernel                     |       .328 |         1,350,900 |                .326 |
| Index                      |       .083 |         5,302,744 |                .083 |
| Worker result encode       |       .461 |           960,230 |                .458 |
| Independent Python oracle  |      4.355 |     about 101,624 |         about 4.330 |

Read plus world conversion alone needs **12.16 CPUs** at the target under the measured live profile, exceeding all eight VM CPUs before oracle, gateway, kernel or publication. Five worker stages plus Python need about **17.35 driver CPUs**, before controller/live work, versus four allocated. Even the no-live mandatory preview cost **4.658 s read CPU + 4.263 s world CPU + .140 s kernel CPU** for 442,567 rows: **4.63 + 4.24 + .14 CPUs** at target. Removing live contention does not close the gap.

No-live preview gateway request intervals consumed **2.078 CPU s** (~213k rows/CPU-second, ~2.07 CPUs at target). This uses the write gateway on CPU 1, includes cold JIT/GC and background work within intervals, and excludes gaps; it is a calibration, not exclusive read-gateway marginal cost. No exclusive transactor/build CPU-per-row estimate is claimed because live operations overlap. Driver saturation and serial callbacks hit a wall before transactor CPU.

Ranked next changes, **not built**:

1. **Pipeline independent verification/preparation and batch outbox state reads; serialize only the authoritative publication fold and atomic commit.** Verify/build/commit occupies 24.93/30.66 s; 4 versus 8 workers gives little improvement. Python verification itself costs 4.35 CPU s/1k and stays mandatory. Hypothetically halving the serialized interval saves at most 12.46 s/1k (30.66 → at least 18.20 s with everything else fixed; ≤1.69×). Parallelism also consumes the saturated driver CPUs. Eliminating verification is forbidden; batching only the 2.31-second commit component has limited upside.
2. **Supported raw-row sweep path with bounded/lazy SDK decoding.** Read CPU costs 6.69 s/1k; read wall greatly exceeds gateway header time, payload is 97.6 MB and uncapped readers OOM. A hypothetical 50% read-CPU cut saves 3.35 CPU s/1k or 3.33 CPUs at target. This is sensitivity arithmetic, not proof half is removable. Preserve actual positions, temporal/revision/ref checks and complete rows. The benchmark cache hook needs a supported package API for production.
3. **Precompute canonical fact sort keys once per fact.** `w0-world.ts:worldOf` currently canonicalizes both operands and allocates Buffers on every comparison. World build/sort costs 5.53 CPU s/1k; halving it hypothetically saves 2.77 CPU s/1k or 2.75 CPUs at target, with identical canonical byte order. Kernel optimization is lower priority at .328 CPU s/1k.

These hypothetical isolated savings cannot be added as guaranteed wall improvement. Bigger pages could amortize startup/per-page oracle and commit work, but outbox frames currently cap at 64 and larger pages increase memory; fresh equality and resource validation are required.

## Resources and exact execution

Every reported number used the requested placement: PG CPU 0 / 2 GiB, shared_buffers512MB, max_wal_size8GB, checkpoint_timeout30min; transactor CPUs0,1 / heap3GiB, container4GiB, cache1g, threshold256m/max1g; write gateway CPU1; read gateway CPUs2,3; each gateway container3GiB with `-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g` through `--gw-java-opts`; driver CPUs4–7 / 8GiB. Lean layout. No placement variant. Python oracle executes inside the driver cgroup.

Docker used only the fixed triplex2 socket, own `tx2-dxh5-*` names, local images, no downloads, no published gateway ports or colima commands. No shared residents/forbidden ports were touched. Offline frozen pnpm used the specified store. Local Node22.23.2 and Python3.13 ran in the VM. Missing host outputs were restored from local Turbo cache. Exact images, source/build hashes and stack manifests are retained per attempt.

Each wrapper acquires mkdir measurement lock, retries5s, writes owner, and holds it throughout startup/seed/sweep/seal/cleanup. It releases between runs; only sealed volumes may remain without a lease. Retention is bounded30GB. Original retries schedule cleanup at42minutes; counts wrapper schedules it at43m30s and signals Java inside owned container PID namespaces before stopping them. During the active long seed I identified that Bash can defer its TERM trap while waiting on foreground Docker. An independent `deadline.mjs` guard was therefore started while this attempt owned the lease; it stops this exact driver at43minutes, reserves two minutes for cleanup and has a fixed-role owned-container fallback before45. Future long runs must use this guard; parent-shell TERM alone is not hard enforcement. Only cleanly stopped Postgres can be sealed. Overall elapsed time exceeded the approximate four-hour timebox to finish bounded retries and attempt10k; no individual engine lease is authorized beyond45minutes.

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0...
node_modules/.bin/turbo run build --filter=@triplex-build/triplex-host...
node lab/bin/heavy.mjs --label DX-H5-seed1000b -- bash lab/experiments/EXP-DX1/h5/attempt-v2.sh seed tx2-dxh5-seed1000b --rung 1000 --scope dxh5-w0-1000-v1 --g0-only
node lab/bin/heavy.mjs --label DX-H5-probe2 -- bash lab/experiments/EXP-DX1/h5/attempt-v2.sh probe tx2-dxh5-probe2
node lab/bin/heavy.mjs --label DX-H5-equivalence2 -- bash lab/experiments/EXP-DX1/h5/attempt-cache.sh equivalence tx2-dxh5-equivalence2
bash lab/experiments/EXP-DX1/h5/sweep-after-cache-gate.sh 1 tx2-dxh5-w1b
bash lab/experiments/EXP-DX1/h5/sweep-after-cache-gate.sh 4 tx2-dxh5-w4b
bash lab/experiments/EXP-DX1/h5/sweep-after-cache-gate.sh 8 tx2-dxh5-w8b
node lab/bin/heavy.mjs --label DX-H5-history1 -- bash lab/experiments/EXP-DX1/h5/attempt-counts.sh history tx2-dxh5-history1
node lab/bin/heavy.mjs --label DX-H5-seed10000a -- bash lab/experiments/EXP-DX1/h5/attempt-counts.sh seed tx2-dxh5-seed10000a --rung 10000 --scope dxh5-w0-10000-v1 --g0-only
bash lab/experiments/EXP-DX1/h5/sweep10000-bounded.sh
# Started separately only after this seed owned its measurement lease:
node lab/experiments/EXP-DX1/h5/deadline.mjs tx2-dxh5-seed10000a
node lab/experiments/EXP-DX1/h5/analyze.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5
node lab/experiments/EXP-DX1/h5/pages.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5
```

The launch scripts validate source-matched transport gates, set sealed volume/receipt, invoke `heavy.mjs` and immutable wrappers, and pass `--live --baseline-s 60`. Every actual argv is preserved in attempt `arguments.json`. Copies queued/running were not edited.

Ordinary per-entity history counts projected beyond the45-minute10k lease. The h5-only counts wrapper uses existing public `DatomicClient.rows(history:true,entityIds,basis)` batches256, complete stored-journal entity enumeration, every historical row and stable-head checks. It does not infer storage counts from journal operation sums. Fresh50-subject `history1` compared **all complete row bytes** against old StorageAdapter.history at two heads:8,022entities,24,407 then24,408rows, exact position/assertion/retired counts including retired/future assertions; source-matched MATCH. The original W0 controller, all expected counts/fingerprint/basis/coverage/O-DOMAIN gates remain unchanged. Source-bound sidecar and final receipt identify the count transport. No package change was needed for batching.

## Verification, audit and remaining gaps

Focused W0/HTTP/journal/telemetry suite: **17 pass,0fail** (including the independent fingerprint telemetry test); bounded-cache reference-repair test **1pass**; deadline ownership-refusal tests **2pass**. These are20 distinct focused tests; no gate completion is inferred from unit tests. Targeted controller/h5 TypeScript checks passed; logs are durable. Broad bench typecheck hit pre-existing unrelated bench/optional-build errors; no full root check, pack check, package qualification,100k execution or independent acceptance review is claimed.

Every verdict/receipt producer's content/freshness/binding check is listed in [AUDIT.md](AUDIT.md), [CACHE-AUDIT.md](CACHE-AUDIT.md), [BULK-COUNTS-AUDIT.md](BULK-COUNTS-AUDIT.md), [PROBE-AUDIT.md](PROBE-AUDIT.md), [SWEEP-LAUNCH-AUDIT.md](SWEEP-LAUNCH-AUDIT.md), [FINGERPRINT-TEST-AUDIT.md](FINGERPRINT-TEST-AUDIT.md), [HTTP-COUNT-AUDIT.md](HTTP-COUNT-AUDIT.md) and [ANALYSIS-AUDIT.md](ANALYSIS-AUDIT.md). Analysis grants no new verdict. Acceptance-pinned paths changed: **none** ([PIN-CHANGES.json](PIN-CHANGES.json)); contract untouched. First setup failures are retained in [FAILURES.md](FAILURES.md), and OOM attempts remain separate. Source captures preserve actual preimages and timestamps without retroactively anchoring earlier diagnostics.

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/`. Raw journals/world/oracle/cgroup/source files stay outside git. [PACKAGE-REQUESTS.md](PACKAGE-REQUESTS.md) separates the measured seed slowdown, transaction-function head-lookup hypothesis and needed supported cache API from unimplemented proposals. Final evidence index and split SHA256SUMS bind the retained bytes; see [EVIDENCE.md](EVIDENCE.md). **Keep only `tx2-dxh5-seed-1000-pg-data`** (653,885,440 bytes at sealing). No10k volume was sealed. Final own-container/network inventories are empty; no H5 measurement lease remains.

## Final 10k disposition and handoff

`tx2-dxh5-seed10000a` failed without reaching full population, counts or G0. Its driver began2026-11-10T09:56:26.122Z. The independent guard stopped it at10:39:03.757Z (43m00.787s after the observed lease-file mtime). Outer exit1 and empty cleanup inventories were recorded at10:39:12Z; the guard observed lease release at10:39:13.024Z, about43m10s into the lease, below45minutes. The queued eight-worker launcher then exited1 on its seed-success assertion without creating any measurement containers. Its original four-worker predecessor had already been canceled before admission (exit143).

The retained1,556,481,358-byte seed command log contains **293,761 complete captured commands/ACKs of434,768 required (67.6%)**, with dense captured positions/command IDs,3,019,998 captured assert operations and1,347 retract operations, no parse errors. These are client-log observations, **not an independently verified final store head or qualified partial population**. An in-flight command outcome after driver termination is unknown. The final rounded progress line was293,000commands at115.6commands/s; early20k-command intervals were about200–217/s and the tail was markedly slower. No complete10k seed time/rate, fingerprint, preview, sweep, per-page timings, exact10k coverage or live ratios can be reported. All10k activation gates are NOT-RUN. The1k-based100k arithmetic is consequently optimistic conditional scaling, not cross-scale validation.

Two SIGQUIT JVM snapshots were collected inside the owned transactor's PID namespace; this diagnostic intervention is included in seed time and happened after all1k activation runs. Guest memory/I/O snapshots and the two-sample CPU attribution are in [PACKAGE-REQUESTS.md](PACKAGE-REQUESTS.md). The processor stack inside the stored function's scope-position EAVT lookup is a concrete investigation lead, not a verified cause or proposed accepted replacement. No package code was changed and no second10k seed was started beyond the approximately four-hour task budget.

Step status: **1 partial** (1k qualified/sealed, concurrency probes complete,10k incomplete); **2 complete at1k** (fresh200-subject/two-cut equality and1/4/8 matrix); **3 complete at1k** (page/CPU/bytes/gateway/datom breakdown, no10k pages); **4 complete diagnostic1k windows** (ratios and pinned-mutation gates, existing traffic limitations retained); **5 NOT-RUN** because10k seed failed; **6 complete as1k-based conditional arithmetic/ranking**, with no100k execution. Full release acceptance remains unverified.
