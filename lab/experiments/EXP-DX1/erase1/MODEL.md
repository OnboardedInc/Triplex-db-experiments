# Size forecast and prepared-server check

**North star** P1, P2 and P6. Bound fresh absence and price interference at account size and after retained history. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Prepared guarded read and save comparison

Run the commit named at the top of [REPORT.md](REPORT.md). Use the existing sealed 100,000-person deep scratch fixture and its independently recorded `staged.json` SHA-256. Set `DX_ERASE_SEALED_SHA256` to that hash. The launcher checks the live gateway source, sealed manifest and scratch database nonce. It accepts a sealed manifest from an ancestor of the runner commit and verifies the original head and bystander assertion IDs against the restored database.

Prepare the unguarded control outside the timed window using the same scratch store, nonce and fixture size. The control has its own Datomic scope and no protection declaration. Each arm reads and writes one Datomic database. The public guard stays enabled throughout the sealed arm. Prepare the control once with `node lab/experiments/EXP-DX1/erase1/server.mjs stage-control erase1-control-stage`. Use unchanged copies of both seeds for a rerun.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-guarded erase1-guarded-check erase1-fast-stage/staged.json erase1-control-stage/staged.json
```

For the shared-authority candidate, stage both arms with the same PostgreSQL authority configuration used for the protected-save check, and keep a copy of each stage. The comparison runs unguarded, guarded, unguarded, guarded, unguarded. Each block offers the same 500 saves under four pinned readers. The driver verifies the receipt for every save and the returned rows for every read. It erases a separate sealed assertion between the two guarded blocks, and checks the marker at its original pin and the retained detached body. Report each guarded ratio against both surrounding controls. The targets apply to both phases and both operations.

| Guarded / unguarded | Predicted p50 | Predicted p99 | Required p50 / p99 |
| --- | ---: | ---: | ---: |
| Ordinary save | 1.00–1.08× | 1.00–1.18× | ≤1.05× / ≤1.10× |
| Pinned read | 1.00–1.07× | 1.00–1.15× | ≤1.05× / ≤1.10× |

Budget 2–8 minutes after both seeds are ready. These planning ranges apply before removal and to bystanders afterwards. They use the measured direct guard stages and the matched Reach bytes. Both tail ranges cross their targets because the Mac controls drifted. This compares the price of checking an account's removal sequence on ordinary saves. The protected-field sealing cost has its own check. [Stage attribution](PREDICTIONS-PART3.md) · [Local byte parity and diagnostic ratios](GUARD-PART3.md)

The small Mac smoke rehydrated both seeds, verified 2,500 save receipts and the pinned reader loops, and checked the sealed marker and detached body. Both seed scopes used the same owned stack, which was removed afterwards. The launcher passed argument checks and focused typing. The sealed 100,000-person run remains unmeasured. [Smoke and SDK evidence hashes](P3-PREPARED-SHA256SUMS)

`server.mjs` binds the fresh result to the current source, compiled JS, gateway source, scratch nonce, stage hashes and attempt ID. `loadStage` reopens the original head and bystander IDs. `comparePreparedGuard` uses the checked rows and receipts from `traffic` and verifies the new marker against its original identity, sealed body and receipt. It emits the observed ratios and planned bounds.

## Prepared quiet-account comparison

Restore an unchanged copy of the sealed fixture and use the same manifest hash and scratch ownership setup. The synthetic gateway uses zero key grace for this test only. The active and quiet accounts share one Datomic database and one gateway. The driver verifies 500 quiet saves per block through the actual feed and checks four held reads continuously. It measures a 100-person removal and a paced cleanup job in separate blocks, each against both surrounding controls. The comparison uses the full latency of any request that waits for the current removal record. Each quiet save, read and feed p99 ratio has a 1.25× bar.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-neighbours erase1-neighbours-check erase1-fast-stage/staged.json
```

The Mac smoke runs the correctness checks with eight saves per block and emits counts. For planning, allow 1.00–1.30× quiet p99 during removal while the current sequence is briefly unavailable and 1.15–1.70× for saves inside forced cleanup. Read and feed tails could remain within 1.25× if the shared transactor avoids an I/O burst. These ranges span the target and need a dedicated run. [Writer checks](WRITER-PART3.md)

## Prepared protected-save comparison

Use a fresh copy of the sealed 100,000-person deep seed staged with the PostgreSQL removal authority enabled. Keep the authority separate from the Datomic data backup. Enable the per-person writer on the gateway with `TX2_SUBJECT_SAVE=1` and `TX2_INT1_WRITE_READBACK=1`. Set the independent stage hash as for the guarded comparison. An older file-key seed needs a fresh staging run for this arm. The diagnostic checks the gateway's authority before offering any saves.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-authority-cost erase1-authority-check erase1-sql-authority-stage/staged.json
```

The comparison offers 500 verified one-field replacements in each of three blocks. The protected block uses preissued keys and sits between two plain controls on the same scope. The probe checks every receipt's owner, attribute, assertion identity and value against a native readback. Budget 2–8 minutes. Plan for roughly 0.1–0.8 ms median addition from sealing and the detached native updates, against a 0.3 ms bar. That range is a forecast. The small Mac controls drifted. [Shared authority and recovery](AUTHORITY-PART3.md)

## Prepared detached-erasure check

The fixture has 100,000 deep subjects and 16,045,255 current facts. For one subject the check makes 415 actual protected replacements and verifies the original held pin. The repeated one- and 100-person arms erase one new protected assertion per target per request. The forecast uses all three matched Mac rungs. [Mac measurements](FAST.md#matched-scale-measurements)

| Bare-metal planning range | Forecast |
| --- | --- |
| One new protected assertion, request to durable ACK p99 | 20–120 ms |
| One aged owner with 416 protected assertions, single ACK | 100–650 ms |
| 100 people with one new protected assertion each, ACK p99 | 100–350 ms |
| Native index jobs called by the request | 0 |
| First 128-body cleanup native index job | 4–20 s and roughly 500–1,300 leaf writes |
| Cleanup save / read / feed p99 divided by quiet p99 | 1.1–3.0× / 0.5–1.8× / 0.5–2.0× |
| Protected save median overhead | 1–4 ms, five datoms and a 32-byte key |
| Full check after staging | 3–12 min |

One-person p99 ranged from 38 to 80 ms without a monotone size trend. The 100-person p99 values were 114, 124 and 211 ms. A log fit with exponent 0.15 gives about 230 ms at 16M. The three first cleanup builds fit an exponent of 0.49 and about 11 s at 16M, with about 780 leaf writes on a separate fit. The aged ACK samples were 55, 52 and 257 ms. All three give a fitted 282 ms at 16M. Extending only the jump between the largest two sizes gives about 1.3 s on the Mac. The planning ranges for dedicated NVMe allow 0.5–1× Mac timing and additional variation. The single aged sample per size leaves its p99 and the real cost of a batch of 100 aged people open. The measured 4M request-to-final-cleanup window lasted 113 s after seeding.

Start with the dedicated Linux scratch database and gateway configured below. Set `TRIPLEX_ERASURE_DIRECTORY` to an independent durable directory for this test and `TRIPLEX_ERASURE_SHRED_GRACE_MS=0` on the synthetic gateway. This enables the file probe within the check. Use a fresh nonce and the same clean commit, build hashes and still-running authority for staging and checking. Stage outside the measurement clock with `node lab/experiments/EXP-DX1/erase1/server.mjs stage-fast erase1-fast-stage`. The 4M Mac seed took about 29 minutes. A proportional 16M seed implies about 55–120 minutes on dedicated hardware before final maintenance, so the check uses a prepared fixture.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-fast erase1-fast-check erase1-fast-stage/staged.json
```

The check measures 100 requests in each publication arm, verifies the aged marker and key-file probe, and compares three 500-save blocks plus a 500-save protected-write block. It leaves the raw native log and measured rows for review. The wrapper prints results after verifying the same source and builds, staged bytes, nonce and child evidence binding. The 55-minute cap applies to the prepared check. The launcher passed syntax, lint, focused typing and local argument-preflight checks. Bare-metal runtime, approved key-store rotation and physical media scans remain open.

## Original native-excision forecast

For a person with 415 two-field saves, the Mac data fit `index seconds ≈ 1.54 × N^0.48` and `leaf writes ≈ 209 × N^0.47`, with `N` in millions of current facts. Affine fits give `1.01 + 0.390N` seconds and `104 + 70.5N` leaf writes. Use both shapes as sensitivity. The first is a description of three local points. The second lets the dominant work grow with the database. [Measured fit](SCALE.md) · [Datomic background indexing](https://docs.datomic.com/indexes/background-indexing.html)

The one-account case is the indexed 100,000-person fixture, with 16,045,255 current facts and one aged target. For ten accounts with 160.45M current facts, assume 500–750M new assertions over the year, two additions per save and 27 native datoms per save. Initial storage adds about 480M native datoms at three per initial fact. That gives 7.2–10.6B native datoms, equivalent to roughly 2.4–3.5B seed facts by count. The count equivalence holds write amplification constant and omits the locality of a year of edits. The upper case crosses the vendor's roughly 10B-datom performance guidance. The W2-SIZE estimate for one active person and the annual input assumptions come from its `SUMMARY` and `ANALYSIS` §4. [Datomic size guidance](https://www.datomic.com/faq.html#how-big-can-a-database-be)

| Bare-metal sensitivity, one aged target | One prepared deep account | Ten deep accounts after a year |
| --- | ---: | ---: |
| Native index build | 3–8 s | 0.5–23 min |
| Fresh root through `sync-excise` | 4–12 s | 0.7–33 min |
| Leaf segments written | 760–1,250 | 7,800–250,000 |
| All readers unable to obtain the value | Publication boundary is absent | Publication boundary is absent |
| Immediately freed relation bytes after ordinary GC | Near zero, page reuse is expected | Near zero, page reuse is expected |

The bare-metal translation assumes the same indexed shape with dedicated NVMe and operation time 0.5–1× the matched Mac range. The sync range allows up to roughly 1.45× the build for submission and adoption. The year-one range spans the power and linear fits far past the measured range. At an estimated 0.50–1.35 TB settled, a full storage pass at 100–250 MB/s would take 33–225 min before decode and merge. A yearly log scan can therefore exceed the fitted range. W2-SIZE's 60–120 B per retained datom would price ~5,700 removed datoms at 0.34–0.69 MB of eventual settled value footprint, with no attributable PostgreSQL file shrink demonstrated for one request. [Datomic capacity](https://docs.datomic.com/operation/capacity.html) · [Local cleanup](SCALE.md#storage-after-both-requests)

Under the same four-reader and one-writer mix, the 1M and 4M aged blocks give a planning sensitivity of **1.1–1.4× save p50, 1.9–4.0× save p99, 1.1–1.3× read p50 and 1.4–1.9× read p99**. At provisional quiet save p50/p99 of 10–20/20–50 ms and read p50/p99 of 2–5/8–20 ms, that is roughly **11–28/38–200 ms for saves** and **2–7/11–38 ms for reads** while the block includes the job. The measured 1.38 s save shows why the narrower in-job window matters. Year-one p99 needs a separate load test. Index back pressure can span the job once the memory index is exhausted. [Datomic back pressure](https://docs.datomic.com/operation/capacity.html#indexing)

## Check the first account

On a dedicated Linux host with an indexed fixture, run this from the experiment branch. Predicted elapsed check time is **3–12 min** including both 500-save pairs, two fresh JVM readbacks and the scratch PostgreSQL rewrite. The deadline is 55 minutes.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check erase1-check erase1-stage/staged.json
```

Stage outside that clock. At the observed largest Mac seed rate, a fourfold seed would take about 80 min before maintenance.

- Use a dedicated PostgreSQL 17 cluster and a database named `erase1_` followed by the run UUID without dashes. Install the Datomic SQL storage table and build the four public packages used in the local run. Give the fixture owner permission to inspect allocated WAL and the data directory setting. [Method](METHOD.md)
- Run a dedicated Datomic transactor with `logback.xml` streaming to the file named by `DX_ERASE_TX_LOG`. From the Datomic installation, launch `bin/run -m erase1 gateway` with `DX_ERASE_BIND_HOST` on IPv4 loopback, the gateway source and experiment directories on `DATOMIC_EXT_CLASSPATH`, and `-Dtriplex.codec.spec` pointing to the checked codec JSON. Set `GATEWAY_SOURCE_SHA256` from the gateway tree manifest as in `local.mjs`.
- Give the gateway and driver the same `DX_ERASE_NONCE` UUID and fresh `DX_ERASE_TOKEN` of 48 random hex digits. Point `DATOMIC_URL` and SQL `DATOMIC_URI_TEMPLATE` to their IPv4 loopback endpoints. Set `DX_ERASE_DATOMIC_HOME`, matching local libpq access, and `DX_ERASE_SQL_DATA` to the PostgreSQL data directory with at least 24 GiB free.
- Stage once with `node lab/experiments/EXP-DX1/erase1/server.mjs stage erase1-stage`. The probe checks scratch ownership, clean source, package builds and the previously acknowledged logical position before starting the measured work.

The check writes the raw blocks, native barrier timings, transactor index records, held and fresh readbacks and SQL space measurements. Preserve the source and staging evidence before a rerun.

The local `stage-replay` smoke round-tripped the seed receipt and assertion IDs through JSON, re-read them from Datomic, then continued with two excisions and separate fresh JVM checks. The [manifest](STAGE-SHA256SUMS) lists those files relative to `evidence/DX-ERASE1/`. The Linux wrapper has syntax and type checks. Both bare-metal profiles are forecasts.
