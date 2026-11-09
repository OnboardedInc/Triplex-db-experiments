# DX-H1 — Datomic NS measurement harness and SQL stack

North star: measure P1–P5 from lab/NORTH-STAR.md with the definitions in lab/TARGETS.md section 1.
This is a PROTOCOL 0b development spike. Numbers are diagnostic; no acceptance contract or scorecard changed.
No independent review or promotion was performed.

## Delivery

1. Gateway URI template is isolated in commit 3f2a6d58, message "DX-H1 step 1: gateway URI template".
   The unset-variable URI is identical to the previous dev URI; SQL substitutions also cover health, listing, deletion and feed.
2. The SQL stack started successfully as tx2-dxh1-a4. Both gateways returned health.
   Postgres reported fsync=on, synchronous_commit=on, full_page_writes=on, wal_sync_method=fdatasync.
   Containers use CPUs 6/7 only: Postgres/transactor/write peer on 6, read peer on 7.
   Caps are 512m/1500m/1500m/1500m, with transactor Xmx768m and peers Xmx1g.
3. NS admission accepts datomic; public and reach compositions use the Datomic runtime.
   Reader and sweep workers distribute across DATOMIC_READ_URLS; the writer/feed use DATOMIC_URL.
   Engine samples sum the four containers and retain per-container CPU, including in phase summaries.
   Reach calls Triples.reach once; split reads first capture the root and reject any root-content change at the same basis.
   The built Datomic public runtime declaration currently DOES NOT expose admissionQueue; it is omitted.
   The adapter itself has the option. Adding it to the public runtime signature and rebuilding enables the bench detection.
4. Both final compositions completed every phase and wrote ns-report.json; model read violations/errors are zero.
5. Seed estimates for 10k and 100k are below. Both 10k estimates are below 20 minutes.

## Reproduction

The original offline installation used:

~~~sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
~~~

Build the dist exports before running. The actual build commands were:

~~~sh
node lab/bin/heavy.mjs --label DX-H1-build2 -- node_modules/.bin/turbo run build   --filter=@triplex-build/triplex-datomic...   --filter=@triplex-build/triplex-qualification...   --filter=@triplex-build/w0...
node lab/bin/heavy.mjs --label DX-H1-build3 -- node_modules/.bin/turbo run build   --filter=@triplex-build/triplex-host...   --filter=@triplex-build/triplex-xtdb...   --filter=@triplex-build/triplex-qlever...
~~~

The host build is required by bench/lib/feed.ts in addition to the packages loaded by bench/lib/triplex.ts.
The XTDB/QLever builds supply public dist declarations used by the broader bench typecheck.

Bring up a fresh SQL stack with one command, using a new prefix for each fresh stack:

~~~sh
node lab/bin/heavy.mjs --label DX-H1-stack --   bash lab/experiments/EXP-DX1/stack/up.sh tx2-dxh1-example
~~~

Only local images and dependencies were used; no external downloads or network installations were performed.
up.sh supports --gateway-src DIR (src/ and codec-spec.json), --cpus-tx, --cpus-pg,
--cpus-gw-write, --cpus-gw-read, --port-write and --port-read.
Defaults are CPU 6 for writer/storage/transactor, CPU 7 for reader, ports 8491/8492.
The scripts deliberately restrict names to this agent's authorized tx2-dxh1-* namespace.

The actual successful pair used one shared measurement hold (public first, then reach):

~~~sh
TX2_ENGINE_CONTAINER=tx2-dxh1-a4-pg,tx2-dxh1-a4-tx,tx2-dxh1-a4-gw-w,tx2-dxh1-a4-gw-r \
TX2_ENGINE_CPUS=2 bash lab/experiments/EXP-DX1/h1/run.sh both \
  --subjects 400 --level-s 5 --max-readers 4 --sweep-max 40 --history-sample 4 \
  --seed-budget-s 120 --rate-scale 1
~~~

Substitute the fresh stack prefix from your up command for tx2-dxh1-a4; the measured a4 containers are now removed.
Use public or reach instead of both to run one composition. Omit the development flags for 400-subject, 20-second defaults.
The wrapper acquires a heavy token, retries the measurement lock every 5 seconds, and caps the entire hold
(including both compositions) at 14m30s plus at most 3s of termination time.
The successful pair ran from 21:08:44 to 21:11:51 UTC, well within the hold limit. It prints the durable run directory containing ns-report.json.
It links that directory beneath worktree runs/ so the driver's output-path restriction still holds.
The both mode runs the drivers sequentially.

For a plain direct driver invocation, set DATOMIC_URL=http://127.0.0.1:8491 and
DATOMIC_READ_URLS=http://127.0.0.1:8492, then use node lab/bench/driver.ts --lane datomic
--composition public|reach --output runs/UNIQUE/ns-report.json with the same flags;
the caller must take the measurement lock and heavy token itself.
TX2_ENGINE_CPUS=2 is the union of assigned VM CPUs, not four overlapping cpuset widths.

Reproduce the metrics from saved output:

~~~sh
node lab/experiments/EXP-DX1/h1/summarize.mjs /absolute/run/directory
~~~

Cleanup:

~~~sh
bash lab/experiments/EXP-DX1/stack/down.sh tx2-dxh1-example
# Add --volumes only to delete the stack's Postgres data volume.
~~~

down.sh retains volumes by default. up.sh refuses to overwrite a previous stack.json or existing containers;
use fresh prefixes for fresh attempts.

## Step 4 results

Both runs reached DONE, through all 17 phases: warmup, baseline, L1, L4, L16, L64, L256,
L1024, recovery, p4mix, p4h1, grow3, p4h3, grow10, p4h10, presweep and sweep.
The nominal L16/L64/L256/L1024 levels were capped at 4 actual readers; these are not 256-reader results.
Both used 400 subjects, 22,865 logical seed assertions, 71 seed commands, two reader threads, 5-second levels,
four matched history subjects, 40 sweep subjects and rate-scale=1. The sweep is a fetch-only diagnostic.

| Metric | public | reach |
| --- | ---: | ---: |
| Status | DONE | DONE |
| Seed logical facts/s | 1825.94 | 2386.93 |
| Seed wall seconds | 12.522 | 9.579 |
| Seed failures | 0 | 0 |
| Background commit p50 / p99 ms | 69.119 / 2155.409 | 51.199 / 962.804 |
| Background committed commands | 73 | 73 |
| P4 weighted-mix pull p50 / p99 ms | 14.719 / 54.783 | 15.103 / 63.231 |
| Public service calls per successful pull, mean | 4.8913 | 1.0194 |
| Observed HTTP requests / transact | 9.4596 | 8.8898 |
| Observed HTTP requests / ordinary pull | 4.8956 | 5.9110 |
| Observed HTTP requests / sweep pull | 4.5000 | 5.5000 |
| Feed commit-publication lag p50 / p99 ms, all | 3686.399 / 10354.687 | 3571.711 / 7667.711 |
| Feed lag sample count | 160 | 161 |
| Sweep fetches/s | 52.435 | 50.726 |
| Sweep wall seconds | 0.763 | 0.789 |
| Correct reads / observed reads | 3662 / 3662 | 3446 / 3446 |
| Read violations / errors | 0 / 0 | 0 / 0 |
| Sweep correct at basis / fetched | 40 / 40 | 40 / 40 |
| Post-capture mutation witnesses correct | 10 | 10 |

Commit quantiles combine committed, non-resend background commands across the actual trace window; they exclude
seed, history, probe10 and sweep-mutation commands. Pull quantiles are the P4 weighted-mix phase. The JSON reports
also retain per-phase and per-size-band histograms, including the nominal L256 phase with its actual 4 readers.
HTTP transact counts include seed/trace/history/probe/mutation attempts: 2,223/235 and 2,098/236 requests/calls.
Ordinary pull counts are 17,732/3,622 and 20,133/3,406; sweep counts are 180/40 and 220/40.
One Triples.reach call is currently still a multi-request adapter fallback. It is not an HTTP fast path yet.

The same generated trace digest, 3a625b908cb236f8, is recorded in both runs. Different wall durations produce different
numbers of probe overlays; those counts remain separate. No clean speed comparison is claimed.

Every INVALID reason from the direct-run equivalent of the gate's invalid list:

- public: development overrides: subjects, max-readers, level-s, rate-scale; no matched zero-reader baseline.

- reach: development overrides: subjects, max-readers, level-s, rate-scale; no matched zero-reader baseline.

Neither run was client-saturated, and both fully seeded their requested rung. Other qualification gaps are the
smoke profile, 5-second levels, capped readers, 400-subject rung, history sample 4, sweep limit 40, shared CPUs,
no indexing witness, and no O-REPLAY run (no --oracle-root). There is no gate acceptance verdict for these direct runs.

### Correctness and accounting counters

All full values remain in ns-report.json and the derived public-summary.json / reach-summary.json.
The snapshots below include every aggregate correctness counter; the phase tables retain each phase's read counters.
An empty duplicate/lost-ACK/burst denominator is never treated as an unexercised guarantee passing.

#### public

~~~json
{
  "seed": {
    "complete": true,
    "assertions": 22865,
    "expectedAssertions": 22865,
    "assertionsMatchClosedForm": true,
    "failureCount": 0
  },
  "correctness": {
    "reads": 3662,
    "correct": 3662,
    "violations": 0,
    "errors": 0,
    "violationKinds": {},
    "violationSample": [],
    "rule": "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput"
  },
  "writer": {
    "offered": 154,
    "completed": 154,
    "expired": 0,
    "notOffered": 48057,
    "maxInFlightSeen": 12,
    "pendingAtEnd": 0,
    "offeredUntilTraceS": 72.91608251953124,
    "overlays": {
      "probe10": 70,
      "p5-mutation": 10
    }
  },
  "P2accounting": {
    "byStreamAndOutcome": {
      "probe10:committed": 70,
      "background:committed": 73,
      "p5-mutation:committed": 10
    },
    "resendsByResult": {
      "resolved-by-command": 1
    },
    "unaccounted": 0,
    "pendingAtEnd": 0,
    "errorTags": {}
  },
  "readYourOwnWrite": {
    "pulls": 73,
    "correct": 73,
    "failures": []
  },
  "duplicates": {
    "resends": 1,
    "considered": 1,
    "returnedOriginal": 1
  },
  "lostAck": {
    "simulated": 1,
    "returnedOriginal": 1,
    "retryTags": {
      "Unknown": 1
    }
  },
  "progress": {
    "validOffered": 73,
    "validPublished": 73,
    "typedRejections": 0,
    "typedConflicts": 0,
    "invalidCommandsInTrace": 0,
    "queue": {
      "steadyRateCommandsPerS": 1.094890510948905,
      "steadyBound": 2.18978102189781,
      "steadySamples": 71,
      "steadyMax": 2,
      "drains": []
    }
  },
  "P3counts": {
    "pages": 36,
    "entries": 162,
    "deliveries": 172,
    "redeliveries": 10,
    "redeliveryMismatches": 0,
    "replayAttempts": 10,
    "effectsWritten": 199,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 3,
    "correctionRangeReported": 3,
    "durableWrites": 30,
    "seenBeforeAck": 0
  },
  "gaps": 0,
  "notReached": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 233,
      "checkpointAtStop": 233,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794258546528.0786,
      "fired": true,
      "checkpoint": 80,
      "catchUpMs": 5881.493408203125
    },
    {
      "point": "after-effect",
      "plannedAt": 1794258551528.0786,
      "fired": true,
      "checkpoint": 80,
      "catchUpMs": 2018.78271484375
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794258556528.0786,
      "fired": true,
      "checkpoint": 100,
      "catchUpMs": 2071.322265625
    }
  ],
  "replay": {
    "from": 80,
    "to": 233,
    "replayed": 153,
    "firstDeliveries": 153,
    "mismatches": 0,
    "exact": true
  },
  "historyGrowth": [
    {
      "targetDepth": 3,
      "reachedDepth": 3,
      "subjects": 4,
      "commands": 2,
      "assertions": 16,
      "failures": 0,
      "wallS": 0.20711474609375
    },
    {
      "targetDepth": 10,
      "reachedDepth": 10,
      "subjects": 4,
      "commands": 7,
      "assertions": 56,
      "failures": 0,
      "wallS": 1.122088134765625
    }
  ],
  "P5": {
    "completed": true,
    "pulled": 40,
    "distinctSubjects": 40,
    "exactCoverage": true,
    "correctAtBasis": 40,
    "violations": 0,
    "errors": 0,
    "mutatedSubjectsAtBasis": 10
  },
  "oracle": {
    "status": "NOT-RUN",
    "reason": "no --oracle-root (the gate extracts O-REPLAY from exp/O01-replay-oracle)"
  }
}
~~~

| Phase | Actual readers | Reads | Correct | Violations | Errors | Split straddles / correct |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| warmup | 4 | — | — | — | — | — |
| baseline | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| L1 | 1 | 70 | 70 | 0 | 0 | 3 / 3 |
| L4 | 4 | 167 | 167 | 0 | 0 | 2 / 2 |
| L16 | 4 | 169 | 169 | 0 | 0 | 6 / 6 |
| L64 | 4 | 163 | 163 | 0 | 0 | 10 / 10 |
| L256 | 4 | 179 | 179 | 0 | 0 | 4 / 4 |
| L1024 | 4 | 168 | 168 | 0 | 0 | 5 / 5 |
| recovery | 4 | 191 | 191 | 0 | 0 | 4 / 4 |
| p4mix | 1 | 149 | 149 | 0 | 0 | 0 / 0 |
| p4h1 | 1 | 141 | 141 | 0 | 0 | 0 / 0 |
| grow3 | 0 | — | — | — | — | — |
| p4h3 | 1 | 144 | 144 | 0 | 0 | 0 / 0 |
| grow10 | 0 | — | — | — | — | — |
| p4h10 | 1 | 138 | 138 | 0 | 0 | 0 / 0 |
| presweep | 4 | 239 | 239 | 0 | 0 | 2 / 2 |
| sweep | 4 | 0 | 0 | 0 | 0 | 0 / 0 |

#### reach

~~~json
{
  "seed": {
    "complete": true,
    "assertions": 22865,
    "expectedAssertions": 22865,
    "assertionsMatchClosedForm": true,
    "failureCount": 0
  },
  "correctness": {
    "reads": 3446,
    "correct": 3446,
    "violations": 0,
    "errors": 0,
    "violationKinds": {},
    "violationSample": [],
    "rule": "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput"
  },
  "writer": {
    "offered": 155,
    "completed": 155,
    "expired": 0,
    "notOffered": 48057,
    "maxInFlightSeen": 10,
    "pendingAtEnd": 0,
    "offeredUntilTraceS": 73.67474243164062,
    "overlays": {
      "probe10": 71,
      "p5-mutation": 10
    }
  },
  "P2accounting": {
    "byStreamAndOutcome": {
      "background:committed": 73,
      "probe10:committed": 71,
      "p5-mutation:committed": 10
    },
    "resendsByResult": {
      "resolved-by-command": 1
    },
    "unaccounted": 0,
    "pendingAtEnd": 0,
    "errorTags": {}
  },
  "readYourOwnWrite": {
    "pulls": 73,
    "correct": 73,
    "failures": []
  },
  "duplicates": {
    "resends": 1,
    "considered": 1,
    "returnedOriginal": 1
  },
  "lostAck": {
    "simulated": 1,
    "returnedOriginal": 1,
    "retryTags": {
      "Unknown": 1
    }
  },
  "progress": {
    "validOffered": 73,
    "validPublished": 73,
    "typedRejections": 0,
    "typedConflicts": 0,
    "invalidCommandsInTrace": 0,
    "queue": {
      "steadyRateCommandsPerS": 1.094890510948905,
      "steadyBound": 2.18978102189781,
      "steadySamples": 72,
      "steadyMax": 2,
      "drains": []
    }
  },
  "P3counts": {
    "pages": 37,
    "entries": 163,
    "deliveries": 166,
    "redeliveries": 3,
    "redeliveryMismatches": 0,
    "replayAttempts": 3,
    "effectsWritten": 193,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 3,
    "correctionRangeReported": 3,
    "durableWrites": 32,
    "seenBeforeAck": 0
  },
  "gaps": 0,
  "notReached": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 234,
      "checkpointAtStop": 234,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794258638504.422,
      "fired": true,
      "checkpoint": 76,
      "catchUpMs": 1827.349365234375
    },
    {
      "point": "after-effect",
      "plannedAt": 1794258643504.422,
      "fired": true,
      "checkpoint": 87,
      "catchUpMs": 1807.711669921875
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794258648504.422,
      "fired": true,
      "checkpoint": 101,
      "catchUpMs": 1819.0986328125
    }
  ],
  "replay": {
    "from": 76,
    "to": 234,
    "replayed": 158,
    "firstDeliveries": 158,
    "mismatches": 0,
    "exact": true
  },
  "historyGrowth": [
    {
      "targetDepth": 3,
      "reachedDepth": 3,
      "subjects": 4,
      "commands": 2,
      "assertions": 16,
      "failures": 0,
      "wallS": 0.185231201171875
    },
    {
      "targetDepth": 10,
      "reachedDepth": 10,
      "subjects": 4,
      "commands": 7,
      "assertions": 56,
      "failures": 0,
      "wallS": 0.879495849609375
    }
  ],
  "P5": {
    "completed": true,
    "pulled": 40,
    "distinctSubjects": 40,
    "exactCoverage": true,
    "correctAtBasis": 40,
    "violations": 0,
    "errors": 0,
    "mutatedSubjectsAtBasis": 10
  },
  "oracle": {
    "status": "NOT-RUN",
    "reason": "no --oracle-root (the gate extracts O-REPLAY from exp/O01-replay-oracle)"
  }
}
~~~

| Phase | Actual readers | Reads | Correct | Violations | Errors | Split straddles / correct |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| warmup | 4 | — | — | — | — | — |
| baseline | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| L1 | 1 | 67 | 67 | 0 | 0 | 1 / 1 |
| L4 | 4 | 165 | 165 | 0 | 0 | 4 / 4 |
| L16 | 4 | 177 | 177 | 0 | 0 | 5 / 5 |
| L64 | 4 | 172 | 172 | 0 | 0 | 8 / 8 |
| L256 | 4 | 155 | 155 | 0 | 0 | 6 / 6 |
| L1024 | 4 | 173 | 173 | 0 | 0 | 4 / 4 |
| recovery | 4 | 191 | 191 | 0 | 0 | 3 / 3 |
| p4mix | 1 | 142 | 142 | 0 | 0 | 0 / 0 |
| p4h1 | 1 | 123 | 123 | 0 | 0 | 0 / 0 |
| grow3 | 0 | — | — | — | — | — |
| p4h3 | 1 | 146 | 146 | 0 | 0 | 0 / 0 |
| grow10 | 0 | — | — | — | — | — |
| p4h10 | 1 | 147 | 147 | 0 | 0 | 0 / 0 |
| presweep | 4 | 202 | 202 | 0 | 0 | 3 / 3 |
| sweep | 4 | 0 | 0 | 0 | 0 | 0 / 0 |

### Remaining blockers (file / line, observed message, smallest next change)

| Blocker or missing evidence | File / line | Observed message / behavior | Smallest change |
| --- | --- | --- | --- |
| P1 indexing witness | lab/bench/driver.ts:918; packages/datomic/gateway/src/triplex/gateway/main.clj:79 | not observed: Datomic indexing job hook is unavailable | DX-B1 supplies an indexing-job control/status hook. It must bind database, fresh job id, requested native basis t, actual start/completion and completed indexed basis. A proposed unimplemented shape is POST /v1/db/{db}/index plus GET /v1/db/{db}/index/{job}; an echo or generic log line is insufficient. No such route was added here. |
| Public runtime queue option | packages/datomic/src/index.ts:17 | built makeDatomicRuntime declaration has no admissionQueue | Add readonly admissionQueue?: boolean to the public runtime options and rebuild; options already reach the adapter. Bench detects the built declaration. |
| Reach still uses multiple HTTP requests | packages/core/src/store/TriplesLive.ts:575; packages/datomic/src/DatomicStorageAdapter.ts:394 | core falls back to reachBy; reach averages 5.911 HTTP requests per ordinary pull | DX-B1 adds adapter getReachTriples backed by the native one-cut reach route, with exact fallback/equivalence. No core or adapter edit was made here. |
| Every read synchronizes the transactor in today's gateway | packages/datomic/gateway/src/triplex/gateway/main.clj:12 and :85 | sync-db uses d/sync with no named basis; poor timings are expected | DX-B1 separates local peer reads from explicit named-position catch-up. This is performance work, not a blocker to DONE. |
| P5 evaluate / publish | lab/bench/lib/evaluate.ts:33–40; lab/bench/driver.ts:1185 | FAIL-CLOSED (evaluate and publish seams) | Wire the legacy world/release to the existing W0 evaluator and atomic publication path with independent expected outputs. Returning successful stubs would be wrong. |
| P5 throttled maintenance overlap | lab/bench/driver.ts:769 and :1195 | needs evaluate and an observable compaction or rebuild to overlap | Complete evaluation/publication and the indexing witness, then run the throttled variant. |
| P4 engine bytes read | lab/bench/driver.ts:1159 | engineBytesRead is not measured | Expose per-query byte observations from the engine/gateway; client bytes alone do not close this bar. |
| Independent sample oracle | lab/bench/driver.ts:1285 | NOT-RUN: no --oracle-root | Supply the local O-REPLAY root (the NS gate normally extracts it). Model correctness here is not independent oracle evidence. |

The duplicate/lost-ACK receipt checks each returned the original receipt 1/1 in both runs; the retained lost-ACK
retry tag is "Unknown" in both. The existing failure normalization at bench/lib/composition.ts failureOf was
not independently audited for tag accuracy. Receipt equality and read correctness, rather than that tag, support
the limited counters reported here.

No remaining harness exception prevented either final run from reaching DONE. The concrete runtime failures we fixed were
private StorageAdapter lookup and missing bound publication measurement. Initial failures are retained, not overwritten:
public-1794256399504 ended ERROR before seed; public-1794257229613 terminated on the unhandled feed error after a complete
40-subject seed (its last saved status is RUNNING, not DONE). The latter seeded 9,293 assertions in 10.386 s at 894.80 facts/s.
Waiting wrappers were stopped/replaced only before measurement, to apply lock cleanup and then batch the two final runs;
they did not produce adopted measurements.

### Step 5: real-rung seeding cost

The frozen population function requires 384,785 seed assertions at 10,000 subjects and 3,848,930 at 100,000 subjects.
This includes shared worlds once, not once per subject. Divide those counts by the measured logical assertion rate:

| Composition | 10,000 subjects | 100,000 subjects |
| --- | ---: | ---: |
| public | 210.7 s (3.51 min) | 2107.9 s (35.13 min) |
| reach | 161.2 s (2.69 min) | 1612.5 s (26.88 min) |

These are throughput extrapolations from 400 subjects through Triples.transact, not executions at those rungs.
They omit scale-dependent changes in cache/index/storage cost. The conditional 20-minute threshold for 10,000 subjects
does not trigger on either observed rate, so no faster seed route was built.

## Existing seams and limits

- Datomic P1 maintenance is explicitly "not observed". An indexing-job hook is needed; no gateway route was invented.
- P3 initially had no source-publication observer and terminated the second attempt. It is now wired for
  Datomic: the exported DatomicClient.transact is observed at its resolved result, before the Triples receipt
  and driver ACK. Position tag/text and equality to the submitted position are checked. A bound host-clock
  SQLite sidecar records publication by position/operationId; the consumer uses the existing bound reader.
  Other lanes still lack this observer. The sidecar adds synchronous instrumentation cost to commits.
  Missing native results are never recovered by stamping at feed polling or lost-ACK lookup time.
- Feed phase membership now uses durableAt in the same wall-time domain as phases; lag subtraction still uses
  bound monotonic instants. Previously a host-boot timestamp was compared with epoch-time phase windows.
- P5 runs the fetch-only sweep; evaluate and publish are existing fail-closed seams.
- There is no clean performance comparison: CPUs 6 and 7 are shared with DX-B1, the profile is smoke,
  readers are capped, levels shortened, and there is no matched zero-reader baseline.
- Service-call roundTrips and actual HTTP requests are different metrics: today's adapter can implement a
  single Triples.reach with many requests. The report retains both.
- HTTP counts use AsyncLocalStorage around individual operations and an http.Agent.addRequest hook.
  Counts include attempted requests, including errors; they are not a server access-log proof.
  "failed" in those counters means a thrown exception; typed transact failures are in P2 accounting.
- Global request counters are fresh per process/thread and aggregate across seed, trace and history writes.
  Pull/sweep/feed categories are separate; per-worker counters retain reader endpoint assignment.
- The existing TypeScript bench-wide check is not clean: errors occur in unchanged audit-traffic.ts,
  hs01-seed.ts and round2.ts. Changed files had no errors in typecheck-final.log. Earlier diagnostics are also retained.
- No root pnpm check, pack check, production-rung execution, clean CPU isolation, durability crash test,
  accepted P1/P2/P3/P4/P5 result or independent verification is claimed.

## Validation and initial failures

- Offline install completed with downloaded=0. build2/build3 completed.
- The final focused bench/request/reach/publication suite passed 14/14 (unit-final.log).
- A separate reach test also passed 1/1: single closure call, exact split basis, property-order-independent
  root equality, and rejection of a changed root (reach-test.log).
- NS --lane datomic --slot dev --dry-run admitted the lane without starting or touching that resident.
- The first two unit attempts are retained: missing host dist, then sandbox refusal of kern.bootsessionuuid.
  Rebuilding host dist and running the host-clock tests outside the sandbox resolved those setup issues.
- Stack attempts a1–a3 and fixes are described in durable startup-failures.md. Vendor SQL/config bytes
  and initialization output are retained in their attempt directories; a3 has the raw gateway failure log.
  a1/a2 transactor errors are transcribed from live tool output, not original saved raw logs.

## Observation / verdict / receipt audit (preamble 9a)

This work makes no acceptance PASS or promotion. Places that turn observations into diagnostics/checks:

1. stack/up.sh health and stack.json: current Docker-created prefix/ports, current HTTP health bodies,
   expected staged gateway SHA, read-back image IDs/cpusets/memory and live Postgres SHOW values.
   The three durability settings must all equal "on". Health and inspect bind to this startup's containers.
   The gateway SHA is computed from staged file bytes before launch and supplied in the environment;
   it is a diagnostic source binding, not an independent runtime attestation.
2. bench/lib/composition.ts reachPull: exact multiset of root triples, including ids/attributes/values,
   is compared before/after the callback at the identical requested basis. Property order is normalized.
   It throws on mismatch; it never substitutes a newer cut.
3. Existing driver analysis and correctness bars: unchanged model/oracle checks compare observations to
   command intent at driver-recorded bases. Each attempt has a new scope/runTag; benchSources binds the
   executed harness source hashes. DONE means completed analysis, not acceptance.
4. bench/lib/http-counts.ts: a fresh process/thread-local counter is tied by AsyncLocalStorage to each
   observed operation and increments on actual Agent requests. The test sends real concurrent HTTP
   requests and checks 2/1/1 requests for two successes and one thrown failure.
5. reader-worker stopped messages and driver aggregation: counters come from the workers of this
   attempt; per-container CPU comes from complete current samples of the requested container list.
   A missing/partial sample is discarded, not adopted as zero CPU.
6. Datomic maintenance: no job hook means an empty event set and "not observed"; no successful
   maintenance witness is inferred from arbitrary log words.
7. summarize.mjs: reads saved report/write-event bytes, includes only committed non-resend background
   events in the commit histogram, leaves unavailable metrics absent/null, and labels extrapolation.
   It does not assign a PASS.
8. Tests: the focused tests check expected content on fresh local executions. No test success is used
   as proof of full workload coverage, acceptance timing, or storage crash durability.

9. bench/lib/datomic-publication.ts and driver feed setup: only successful native transact results with
   a tagged positive safe integer position equal to the exact request position and a nonempty operationId
   are recorded. Observation precedes driver ACK; each attempt uses a new publication.db and source key.
   Retries cannot overwrite the original sidecar instant. A unit test proves ordering and rejects mismatches
   and failed transports. Phase classification uses epoch time; measured lag stays on the bound host clock.

## Source hashes / pins

The acceptance contract was not edited. No changed path appears as a literal file pin in obligations.json; contract inputs were not repinned. The workload world/trace generators are unchanged.
SOURCE-SHA256.json records all changed source paths against base f1074dd78d60ccd1c5de4cfd01e4c15c751a4a9a, including new files.
For the contract builder, every pre-existing changed source path and its old/new SHA256 is listed here (these are source changes, not a claim that each was a literal acceptance pin):

| Path | Old sha256 | New sha256 |
| --- | --- | --- |
| lab/bench/README.md | a655bca7bcea2b0d89dd7d6dd6a95a2111e62b5776ec08e41745d0d0b6c9b206 | 54523df23ec7731b5729927fcc98c84e18a95bf0fd0a66d67794934fdbdba45d |
| lab/bench/driver.ts | c62cc99e874f5ba24495e44e4e36dee2d5117ddc4a514ebb4264ee97498a96e1 | 3da9bf3a1994179a079c41fbcfa5518260481d67f746285bc6ece3c0d506bc41 |
| lab/bench/lib/composition.ts | 40562b8e7a2b2563744fb984c278d3cec8c4ffb3dfc3a71a879f13ef91ad38cb | 4275b693334c3ca031ef41d46accf5685d7839ebe1f010cf4fad256a45dfe35f |
| lab/bench/lib/feed.ts | d6e859c29efed478b24d69b154b1dc631b5b52054d6d4719187bbdc112a3c433 | ffa65e86f922d01bc3f1683fc7654743af1083ff56e47d8d704edba7bc8bef1e |
| lab/bench/lib/triplex.ts | 564e8f869b6b0a802557e95fea075680e7aed001dd4c3372ef7746e6332757fb | b5b1788b9f469250badf16d2d040956d4ce7196ad413b65ccec696a97ab70249 |
| lab/bench/reader-worker.ts | 97b3b5439f47301ea9fd758a6edfb7923e1811fafabfcd38c499e0c9f7df057d | e09128ae68fd2935ab66792f97695277b11105f8dc7fc77d548103225fb743bc |
| lab/bin/gate.mjs | 1d3368558035b424e014f296371964e0301d4d2cb52a659559aa7fcaf954032a | ceb0dfb2893363e242c4398e85310e500f0f880d196a5fac50e51d446f3c0f38 |
| packages/datomic/gateway/src/triplex/gateway/main.clj | 5d070016255c2a38afce92f1dd55deb0b8da51925db46fbf73e2e630d699f4c3 | 75b054c18564a1aaa80dc9f06db7ecda50c83f856d4085b9e5525f7c2809888e |


## Evidence and retention

Durable root: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1/
Stack: tx2-dxh1-a4/stack.json, containers.json, durability.txt, gateway-files.json, health-w.json, health-r.json.
All raw runs and logs stay outside git. SHA256SUMS and EVIDENCE.md index the retained bytes.
Successful reports: runs/public-1794258523990/ns-report.json and runs/reach-1794258619271/ns-report.json.
Derived summaries: public-summary.json and reach-summary.json.
The final gateway/transactor logs were captured before cleanup. down.sh returned zero; subsequent Docker inspect
returned 1 for all four a4 containers and its network. cleanup.json also records successful inspection of the retained
tx2-dxh1-a4-pg-data volume. The failed a1/a2/a3 initialization-only volumes were explicitly removed during their setup fixes.
No unrelated container, network, volume, source tree or resident was stopped, recreated or deleted.
