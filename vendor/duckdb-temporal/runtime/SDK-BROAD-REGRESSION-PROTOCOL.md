# Broad eight-type SDK regression protocol

Status: source-only, predeclared, **unrun**. This compares the existing B0 SDK
with selected production SDK `8240cebc…`, using the same native B artifact and
the existing scale driver. It adds no application strategy, outer FIFO, thread
sweep, new query, fixture generation, or native rebuild. Root schedules each
exclusive execution window separately from the current anti-join comparison.

## Reused workload and frozen inputs

The owning driver is `adapter/benchmark-scale.mjs` at integration source
`041264f2` (unchanged by later receipt commits). It imports
`mixed-scale-fixture.mjs`, `scale-fixture.mjs`, and the existing mandatory CoW
clone helpers. `SCALE-BENCHMARK.md` sections “Binary scan predicate comparison
budgets”, “Integrated 0.31 confirmation”, and “Thread budget experiment on
verified 0.32” supply the established workload and numerical bounds.

Use the closed source below, never a previous timed arm's writable database:

- Database: `__HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb`.
  Expected SHA256 `3712516b8de8e371f71ae89aaab04f1d456da7a0fc6caa178ec0042926b0e6b3`;
  no WAL; initial K39087, size10000000,22 prior acknowledged additions,
  groupSize256. Active fact count is10000019; retained rows include history.
- Recipe: `__HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/combined-028-20261105/mixed-10m-pilot.json`.
  Expected SHA256 `5321690cd6e5cf26ca28332af19b6c59716ddaa785f4c8460657d1a6f95873e7`.

The exact existing programs are:

```text
answer(count()) :- triple(?e,?a,?v).
answer(?a,count()) :- triple(?e,?a,?v).
answer(?a,?v) :- triple('typed-e-00000000',?a,?v).
```

Their widths are1,8 and256 rows respectively. The projection contains all
eight canonical value tags; count/grouped count scan the broad typed relation.
The fixture includes a reference anchor, JSON through4KiB, blob metadata,
datetime/float values and native patch history. The independent arithmetic and
typed projection oracles already live in `mixed-scale-fixture.mjs`.

## Artifact binding

| Item | Required identity |
| --- | --- |
| B0 runtime | `__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-write-cohort-20261105/runtime/build/native-write-frozen-032-20261105/runtime` |
| Selected SDK runtime | `__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-thread-budget-20261105/runtime/build/sdk-admission-frozen-032-20261105/runtime` |
| B0 store module | `75479398072e725d1c5871699b49b4940f03f1af79f71b95efac730bddf2b57d` |
| Selected store module | `8240cebcb75251ac06b5c1790c8abdf95bc394d926ee93057f89959df3a82607` |
| Shared core | `f44d116c266cbe27ef4217fef6a07550230e87b22843627e9c63ed1997139b82` |
| Shared companion | `55e588fe07eeed3116721b5b2b0511be5a5cdd5566879d3b5dc2773b260e3390` |
| Shared control bridge | `af47c28bdac5b430501feb5fc7be1f2a13474d8f0042017af4c4ed63c3a2ae88` |
| Shared actual SDK-selected engine | `72b50268165284d321ec0263b39fafa9551379e72558e443d4b4f1eeb4f4042c` |
| Shared schema module | `a2fa6e6433b2f52df6f5c1adf9e303c32ffbdc3bb4d1a58ac78e7bcf7a594ea6` |
| Shared port module | `bc5b36c61342927a2bf3e93c7a9ccd28d35f89528446bc9ef0dc2e55a0a420af` |
| B0/selected445-file inventory SHA256 | `b17f748f92f8fa94bd5b9218602993e8b0e5f4b9ab863b38d7941fb11769580b` / `8f1bfbcb69409f308a74a32a62f787693739798cc0c72df3710d92dba3798d71` |

Native source is `c3ff1d73398b46cc7019465f78fc44f7e598670a`; B0 SDK source
`fe9ca9aa00b454f7555fe6f1392ef8ad2a3f5840`; selected SDK source
`d024e9b8e0c2eee16d4e992c7514048115e6f80b`, qualified at `2bb4ca2a…`.
All other resolved SDK package bytes, core/companion manifests, catalog header
and native build options must match. Four winning read flags remain true,
identity-count false. These references preserve v1/v2 SDK timeout-contract
labels; they are benchmark roles, not selectable application modes.

Reuse the actual artifact inspectors in the unchanged
`temporal-read-scheduling-20261105` runtime, with the existing control binding
SHA256 `5db1d86dcbbb791926631cbf4f018683fd3a3cc2b29b5237dcfe9afa35a9e6aa`
and selected binding SHA256
`bc6394cee5a6f7e6caa57635fe1377cd94105c58ce5565257d8ef9f2add63596`.
Their native binding is `0eaf2187d65289cbbb2902ae58867ab64127d4c973d6fe59341065e50356f963`.
They attest source commits, actual native/SDK/dependency bytes and approved
source/recipe; **their anti-join query/configuration budgets are not the broad
workload budget**. The broad driver has no binding CLI. Keep separate fresh
artifact-attestation outputs alongside each broad raw result, and verify both
445-file inventories before/after outside measured time. Do not relabel the
anti-join numerical gates as this experiment's gates.

The measured harness files are fixed at:

| File under the integration runtime | SHA256 |
| --- | --- |
| `adapter/benchmark-scale.mjs` | `b3b5d27b0576397b8839506a73bbb52614e94e20f625aea04433b3d884a1af0c` |
| `adapter/scale-fixture.mjs` | `1a5fc8d5eb6e7387ab5b5957c677ef7bbc9588eaabcabd40c426af047a61e1a2` |
| `adapter/mixed-scale-fixture.mjs` | `7a02c2a834aa46be232f14a1681e1ad59c39501b295cda36f87447966454de09` |
| `adapter/clone-benchmark-fixture.mjs` | `4a30f6deb087600432794d2ac07305cb7e3a4d2e8bedc9f041d0dea75144a5b6` |
| `adapter/clone-benchmark-fixture.py` | `ae8a9d1028c8174d46bcea345c98d038e3e97884e82332801f8cf51a3fc383ad` |

## Commands and ordering

The following are execution instructions for a later lease, not commands run
while preparing this document. Use a fresh output directory
`build/sdk-broad-regression-20261105/forward-01` under the integration runtime;
fail if it already exists. Run B0 first, then the selected SDK, each in a fresh
Node process and its own mandatory fresh CoW clone. No automatic retry/matrix.

From `__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-sdk-integration-20261105/runtime`:

```sh
UV_THREADPOOL_SIZE=4 node adapter/benchmark-scale.mjs \
  --runtime __HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-write-cohort-20261105/runtime/build/native-write-frozen-032-20261105/runtime \
  --sizes 10000000 --readers 1,4,16 --samples 5 --warmup 1 --writes 8 \
  --group-size 256 --fixture-mode mixed --threads 4 --memory-limit 2GB \
  --max-temp-directory-size 4GB --max-intermediate-bytes 4294967296 \
  --duration-seconds 60 --read-duration-seconds 0 --max-writes 12000 \
  --clone-database __HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb \
  --clone-evidence __HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/combined-028-20261105/mixed-10m-pilot.json \
  --output build/sdk-broad-regression-20261105/forward-01/b0.json
```

The selected command is identical except `--runtime` is the selected SDK path
from the table and `--output` is `forward-01/sdk.json`. Capture complete stdout,
stderr and terminal exit separately for each. Hash the source database/recipe,
selected native/SDK/dependency closure and harness files before and after the
pair; do not hash the large source during measured phases. Require no source
WAL before/after. Each helper/driver output path must be new, never overwritten.

For exact reusable artifact-attestation commands, run the existing helper from
`__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-read-scheduling-20261105/runtime` before and after each arm:

```sh
UV_THREADPOOL_SIZE=4 node adapter/antijoin-sdk-binding.mjs \
  --artifact-role B0_CONTROL --readers 16 \
  --budget evidence/antijoin-cost-10m-budget-20261105.json \
  --native-binding evidence/antijoin-native-write-candidate-binding-v2-20261105.json \
  --evidence __HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/combined-028-20261105/mixed-10m-pilot.json \
  --output /ABSOLUTE_FRESH_FORWARD_DIRECTORY/b0-artifact-before.json
```

Use `C2_SDK_CANDIDATE` and `sdk-artifact-before.json` for selected, and fresh
`*-artifact-after.json` paths afterward. Replace only the explicit output
placeholder with the fresh integration output directory; do not edit binding
files or measured helpers. Before/after binding content must equal its matching
reference binding above. Check both archive inventories independently too.

Only if the first pair clears the candidate gates, schedule a separate reverse
pair `reverse-01/sdk.json` then `reverse-01/b0.json`, same commands/settings and
fresh clones/attestations. Both orders must qualify before promotion. Preserve a
B0 numerical miss with its actual metrics; identity, typed-oracle or lifecycle
failure disqualifies the comparison. Stop subsequent arms on such failure.
The unchanged driver records failed cells and can finish the remaining bounded
cells within its current arm; it is not an immediate fail-fast supervisor.

## Fixed gates, declared before either pair

Apply these in each order against that order's fresh B0, not an older run:

| Measurement | Selected SDK gate |
| --- | --- |
| Fixed count, grouped count and projection p50,1/4/16 readers | ≤115% of matched B0 in every cell |
| Fixed sampled p99, all three kinds at4/16 readers | ≤120% of matched B0 in every cell |
| Projection absolute p50 at1/16 readers | ≤19ms / ≤115ms |
| Projection absolute sampled p99 at16 readers | ≤185ms |
| Mixed complete public reads/s | ≥90% of B0 and ≥4.8/s |
| Mixed p50 / sampled p99 | ≤115% of B0 and ≤3200ms / ≤6500ms |
| Acknowledged native writes/s | ≥90% of B0; report rate over first write start through final ACK |
| Acknowledged writes | ≥40, no early12000-write limit reached |
| Sampled mixed RSS | ≤3.5GB decimal; also report relative and maximum across fixed cells |

The15%/20% broad controls and absolute limits reuse the established binary/
integrated gate. Applying those relative controls to the additional four-reader
and projection cells is an explicit predeclared extension. No80%-of-control
projection speedup is required: SDK admission is not the earlier binary-scan
optimization. The separate CPU-thread experiment's15% throughput gain/RSS
ratio is not silently imported. No thresholds change after a first outcome.

This historical budget is appropriate because the source, programs, fixed
sample layout and mixed rotation are the same as the earlier broad comparison;
only the matched B0/selected SDK module differs now. It is not inferred from
the anti-join win. FIFO3 does not reduce count/grouped-count logical input or
change their physical SQL plans. It may reduce concurrent engine pressure but
also limits parallel service, adds queue time, and can delay a cheap projection
behind broad aggregates in the mixed FIFO. The all-cell latency controls and
mixed throughput/write gates must catch those distinct regressions. Do not
assume a cheaper anti-join tail predicts broad-query improvement.

Require exact typed rows and returned K for first reads, all measured queries,
final reads and reopen; zero query/ACK/close errors; consecutive unique receipts
with no uncertain/reconciled ACKs; an ACK in every complete10-second mixed
window; all three mixed query kinds and explicit old-K reads; all accepted jobs
drained and pool active/waiting zero afterward; source/recipe/artifact equality.
The generic driver's `passed`/exit0 certifies its exact-answer conditions, not
these numerical gates. Recompute and retain the numerical comparison separately
for each order; an exit0 alone cannot qualify this candidate.

## What this gate establishes and leaves open

The fixed sweep has5/20/80 observations per query at1/4/16 clients. It runs
before ingestion at captured latest K39087, rather than claiming every fixed
call binds historical `knownAt`. During the mixed phase every fifth read binds
old K39087; other reads validate their returned K against the writer sequence.
Native ingestion rotates the same eight types, one fact/ACK, and final/reopen
checks include both old and final cuts. Only sixteen-client mixed ingestion is
measured; one-/four-client mixed performance remains open.

Public latency includes SDK FIFO/writer/lease waits and complete typed decoding;
oracle comparison is outside each latency sample. Throughput/CPU wall spans
include oracle checks, sampling and drain. CPU user/system microseconds and
average process cores cover all process threads, not pure DuckDB execution.
Open/audit cost is outside the measured query phase and should be reported
separately if available, without comparing it to query latency.

Sixteen logical clients and configured independent reader capacity do not mean
sixteen simultaneous native queries. Selected admission is min(3,readers);
B0 has no added heavy gate. This unchanged driver records pool totals every25ms,
not per-port/control IDs. It cannot independently certify that every physical
port was used or prove instantaneous admission maxima; retain the separate
actual-SDK anti-join/lifecycle port evidence instead of inventing that claim.

P99 at16 is the maximum of80 fixed observations, not a latency SLO. Sampled RSS
and before/after DuckDB spill counters do not bound peaks/shared allocation.
This is scalable SQL over eight stored types and append ingestion, not native
recursive/eager-expression throughput, interval/cut/lookup timing, anti-join
correction cost, or a general workload-scale claim. Those remain independent
gates despite the completed422-check and20-family functional qualification.
