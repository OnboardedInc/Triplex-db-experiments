# Size forecast and prepared-server check

**North star** P1, P2 and P6. Bound fresh absence and price interference at account size and after retained history. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

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
