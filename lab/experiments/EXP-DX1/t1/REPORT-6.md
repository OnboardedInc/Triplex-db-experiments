P2 does not pass in the reference pair; the closing pair could not start below the disk floor.
The reference also misses P1 scaling and writer-tail ratios; exact reads, queue bounds and P3 pass.
Whole-machine weighted pulls and history latency flatness pass; engine bytes-read flatness is unmeasured.
The peer/transactor remains the largest observed wait, with cold reads inside apply and unsplit storage/messaging work.
A larger transactor object cache is kept for its repeatable loaded small-commit improvement.
Two transactor cores lower the zero-reader floor and mixed-load peer wait, but not steady-reader peer wait beyond drift.
That placement costs reader goodput, so it stays a candidate rather than the default; revision AEVT also stays off.
Writer profiles name garbage collection, receipt decoding/persistence and a separate worker postMessage stall.
An exact incremental receipt broadcast is implemented and smoke-tested, but remains opt-in because its timing trial was disk-refused.
Reports now include every commit by phase; a fixed tail and a closing verdict remain unproved.

Implementation head e3614cce; measured sources remain identified in their own tables.
All latencies are ms. S = Mac swap GiB; C = Mac non-VM CPU %. Every comparison uses its own session; no cross-session speedup is claimed.
Y1: [every bar](VERDICT-6.md), [full reference/context](REFERENCE-6.md). Source c9b9fc3f, 10,000 subjects, unchanged 900-s profiles, exact local reads, strict server clock, split-read rule **pending**.

| arm / level | primary p50 / p99 | S median | C median / p99 | same-session off control p50 / p99 |
| --- | --- | ---: | --- | --- |
| off-before / off | 13.724 / 104.423 | 11.649 | 45.6 / 197.0 | mean bookends 13.366 / 77.784 |
| zero / summary | 13.551 / 208.668 | 11.649 | 55.5 / 247.1 | same bookends |
| loaded / summary | 15.742 / 203.881 | 10.701 | 65.3 / 308.4 | same bookends |
| off-after / off | 13.008 / 51.145 | 12.053 | 54.8 / 190.4 | mean bookends 13.366 / 77.784 |

Both off controls miss 12 ms. All reference latency rows below use the loaded summary S/C and controls above; loaded S range 10.677–12.108 GiB.

| priority | reference result | bar / outcome |
| --- | --- | --- |
| P1 | G256/G64 0.9704; G1024/G256 0.8704; writer-tail ratios 2.2447 / 6.9455 | >=1 / >=0.9; <=1.25 / <=2: miss |
| P1 | exact violations 0; read p99 L256 8.383; recovery 40 s | 0; <=100; <=60 s: met |
| P2 | all-primary p99 203.881; burst small/medium p50 14.015 / 16.895 | <=50; <=10: miss |
| P2 | L256 small/medium p50 15.999 / 16.383, p99 52.613 / 134.323 | <=10 / <=50: miss |
| P2 | queue max 2; burst drains 0.127 / 0.602 s; 7408/7408 accounted; RYOW/duplicates/lost ACK exact | queue <=2.190, drains <=60 s: met |
| P3 | lag p99 L256 221.096; gaps/order/duplicate effects 0; 3 crash points, exact replay | <=250 and exact: met |
| P4 | weighted 14720.201 correct pulls/s; pull p50/p99 0.034 / 0.293 | >=4400 whole machine; <=5 / <=25: met |
| P4 | depth1/3/10 p99 0.182 / 0.191 / 0.195; ratio 1.0714 | <=1.1: met; physical bytes unmeasured |

Fresh reference oracle PASS: 810 commands, 53 reads, 2626 entity queries, zero mismatches. These are diagnostic observations, not acceptance promotion.
Y2: [cache](CACHE-6.md), [revision](REVISION-6.md), [cores](CORES-6.md), [complete phase/native/CPU rows](PHASES-6.md). A is the mean bookend quantile; B is the mean candidate quantile (not pooled percentiles). Context ranges below are the corresponding arm-median S/C values. Controls are the first/last baseline in each linked session.

| change / scope | A p50/p99 → B p50/p99 | p50 benefit / drift | level; A S/C → B S/C | decision |
| --- | --- | --- | --- | --- |
| cache0-b / zero readers | 11.477/43.245 → 11.377/46.612 | 0.100 / 0.022 | full; 4.835–4.851/10.6–11.4 → 4.835–4.851/11.1–12.6 | no repeatable zero gain |
| cache256-b / L256 small | 11.423/72.418 → 10.847/36.919 | 0.576 / 0.320 | full; 4.804–4.827/10.2–10.8 → 4.812/11.0–12.0 | keep 1280-MiB cache |
| cores0-a / zero readers | 11.362/44.867 → 10.654/36.958 | 0.708 / 0.207 | full; 4.733/10.6–11.4 → 4.733/11.0 | floor gain; candidate only |
| cores256-a / L256 small | 11.263/91.406 → 11.903/44.939 | -0.640 / 0.640 | full; 4.726–4.733/10.1–11.4 → 4.726/12.2 | no gain; candidate only |

Cache cold SQL counts, loaded A/B/B/A: 436/385/342/435 of 3530; zero 340/278/273/359 of 3420. The small-band median gain exceeds drift; its peer median gain does not. Two-core mixed-load peer p50 falls 0.934 beyond 0.163 drift (full, S 4.726–4.733, C 10.6–11.1; cores256 A1/A3 controls), while steady L256 peer stays within drift and read goodput falls ~6.5%. No steady-reader engine gain is claimed. Native apply-wide EAVT/AEVT medians stay 20/10 under revision AEVT; per-helper counts remain unsplit, so that flag stays off.
Y3: [profile IDs, exhaustive >50-ms groups and code](TAIL-6.md). Profiled full pair source cc625642: loaded S 11.819 (4.960–12.063), C 64.9/302.9; off p50/p99 13.208/56.667 and 10.789/43.306. Writer lateness 247.464 at cc795c670fc4390c000000000000421c has 142/205 GC samples; 191.380 at cc795c670fc4390c000000000000421d has 101/162; 174.418 at cc795c670fc4390c0000000000004200 has 125/145. cc795c670fc4390c0000000000004201 has 122/143 GC samples; cc795c670fc4390c00000000000023a4 has 67/68 postMessage samples over 90.108 ms. Samples are points; gaps remain unknown. Full IDs are in the linked report. Same-subject chains follow these independent writer stalls with free slots.
The delta wire preserves the same receipt window, order and pins; golden tests and the 1000-subject oracle cover it. The separate product differential covers 200000 worlds/4590 writes/zero differences; native gateway 18 tests/53860 assertions and layout 300 scenarios/95028 comparisons pass. Final normal package suite: 235 passed/51 external skips; typecheck and targeted lint pass ([checks](CHECKS-6.md)). Delta timing/tail reduction is unmeasured, so snapshot remains default.
Y4: closing-a, closing-b and basis256-a were refused before containers at <20 GiB; about 19.52 GiB remains, with no eligible uncited/smoke raw files left to compress. No other files were removed. The measurement lease and all owned containers/volumes are gone. Closing bar comparison and oracle are **not run**, not a PASS. [Evidence](EVIDENCE-6.md), [receipt/PASS audit](AUDIT-6.md), [pin audit: no matches](PINS-6.md).
Receipt sites audited: report/anatomy/finalize, study, ablation/native readbacks, native/JFR and CPU-profile binders, basis-window counters, scheduler recovery and final cleanup. Content, fresh attempt and exact source/slot/inputs gate each claim; missing evidence stays missing ([audit](AUDIT-6.md)).
Left: index-adoption boundaries, per-helper reads, messaging-thread run-queue waits and native storage/queue sublegs are unsplit. No index/heap/warming or transaction-layout change is retained. Writer GC/persistence contention also remains; the delta option needs a controlled loaded trial and closing pair after disk admission recovers.

Commands (scripts own lease/cleanup; heavy.mjs wraps runs; keep >=20 GiB free; no other work during holds):
```sh
DX_NATIVE_GATES=0 DX_GATEWAY_SELFTEST=0 DX_TRANSACTION_CENSUS=1 bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-NEW
DX_NATIVE_REPEATS=1 bash lab/experiments/EXP-DX1/t1/session.sh basis-256 tx2-dxt1-NEW-BASIS
DX_STUDY_LEVEL=full DX_NODE_PROFILE=1 DX_JFR_PROFILE=1 bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-NEW-PROFILE
node lab/trace/report.mjs "$RUN" --anatomy-to "$NEW_DERIVED_DIR"
```
Outputs: evidence/DX-T1/<tag>/{TRACE-REPORT.md,COMMIT-ANATOMY.md,trace.html,trace.chrome.json,trace/raw}; global TRACE-INDEX.md. Repository small receipts: t1/runs; derived hashes: PHASES-6-SHA256SUMS. No push.
