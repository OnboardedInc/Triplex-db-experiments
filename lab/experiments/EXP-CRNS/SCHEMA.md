# Proposed normalized CR-NS events (`ns-events/1`)

This is an offline evaluator interface, pending contract review. It is not an OBS01 bundle wire format or an admission receipt.
`recomputeNS(bundle, trusted)` does no filesystem, process, network, engine or box I/O. Oracle/grade/normalization capabilities
are supplied by evaluator code as synchronous functions. They are never taken from JSON. A failed capability throws/refuses.

## Envelope and trust

`bundle = {payload, hmac, chunks}`. `payload` is canonical sorted-key JSON (arrays retain order), UTF-8, no whitespace or newline.
A parsed-and-recanonicalized payload must be byte-equal, excluding duplicate JSON keys and noncanonical numeric spellings.
`hmac` is HMAC-SHA256(key, payload). Each chunk is `{previousSha256, payload, sha256, hmac}`; its authenticated bytes are canonical
JSON of `{previousSha256, payload}`. `sha256` hashes those bytes; `hmac` authenticates those bytes. First previous hash is 64 zeros;
each following previous hash is the preceding chunk's hash. Concatenated chunk payloads equal the envelope payload. The last hash
must equal the head separately witnessed by the evaluator, not a head copied from the bundle.

The parsed payload has `{format:"ns-events/1", binding, driver, events}`:

- `binding`: `{attemptId, sourceSha256, slot, inputsSha256}`, exactly equal to the evaluator's expected object. Additional expected
  binding fields (composition, build, normalizers, oracle pins, schedule) may be carried and must also match exactly. The adapter
  must include the full input identity in inputsSha256 and exact source identity in sourceSha256.
- `driver`: `{imageId, bundleSha256, generatorSha256}`, exactly equal to evaluator pins.
- `trusted`: `{key, headSha256, binding, driver, encodingSha256, clockDomain, readerLevel, priorities, domainAffected, gradeWindow,
  verifySource?, commandValid?, ryow?, replayRead?, steadyRate?, subjectListSha256?, domainSweep?, control?}`. Functions execute
  independently pinned evaluator/oracle code. `domainAffected` receives `{position, transaction, entry, prefix}` for every source
  position; returns the unique expected subject list. `replayRead` receives the read and source prefix; returns expected answer
  SHA256. `domainSweep` receives subject, activation basis and prefix; returns `{output: rows[], outbox: rows[]}`.

## Scalar types

All monotonic timestamps, offsets and byte counters are **unsigned decimal strings**, never floating point or coerced integers.
Comparisons and differences use BigInt. A position is either a decimal string (one stream) or
`{stream:string, epoch:decimal-string, offset:decimal-string, ordinal:decimal-string}`. Coordinate comparison is lexicographic,
with numeric coordinates compared exactly. The adapter must normalize opaque engine epochs into the pinned coordinate mapping.
No arbitrary string epoch ordering is inferred. Identifiers are nonempty strings, digests lowercase SHA256 hex.

## E1–E11 normalized fields

| R44 | Field | Shape and interpretation |
| --- | --- | --- |
| E1 | `offers[]` | `commandId, subject, sizeBand (5-10/11-25/26-50), scheduledAtNs, sentAtNs, ackAtNs or censoredAtNs, receipt or typedError or typedConflict`. Receipt: `position, txId, commandIds[], stamp`. Original/retry receipt equality is per commandId. Adapter preserves all attempts and maps retries to the same id. |
| E2 | `reads[]` | `loop, subject, shape, requestedBasis, echoedBasis, sentAtNs, receivedAtNs, answerSha256`; pull-current also has `bucket, facts, hops`. Expected hash is from evaluator replay at the requested basis, never echoed basis. |
| E3 | `source` | `origin:"observer-source-store", firstOffset, finalOffset, entries[]`. Every offset resolved as commit/aborted/epoch/seal. Broker adds `storage:"broker-frame/2", frames:[{offset,hex}], initialCrc, finalCrc`; non-broker source requires evaluator verifySource. Payload-to-entry mapping remains a pinned normalizer's job. |
| E4 | `sourceBrackets[]` | `{position,L,U}` from observer source polls, `U >= L`, source U before drain. Adapter derives brackets from authenticated raw polls and their sequences; this interface takes normalized brackets, not candidate publication instants. |
| E5 | `consumerBrackets[]` | `{position,L,U}` from consumer durable-record polls. Consumer U must be at least source L and at most drain end. |
| E6 | `consumer` | `initialFrontier, walComplete, tailedWalHex, finalWalHex, transactions[], effects[], affected[], deliveries[]`. Transactions are in WAL commit order; all have `committed:true, frontierBefore, frontierAfter, effects[], affected[], deliveries[], deleted:{effects[],affected[],deliveries[]}`. Final WAL must retain all tailed bytes. |
| E7 | `faults[]` | `format:"fault-witness/1", binding, faultPointId, events[], eventsSha256, replay[]`. Events include observer `cgroup-gone` with t; events digest recomputed, unique over injections; replay delivery bytes compared with source encoding. At least three per crash point. Full DR/cgroup proof verification belongs to O-OBS adapter. |
| E8 | `readers[]` | `{second, loops:[integer ids], relayConcurrent}`. second is a unique zero-based measured-window second. At least 99% of all window seconds (missing seconds included in denominator) meet required distinct loops; relay agrees within 10%. |
| E9 | `window` | `{startNs,endNs,drainEndNs,bursts:[{startNs,endNs}]}`. Nonempty half-open measured interval, drain at least end. Burst membership derives from source L. |
| E10 | `noise` | `{grade,...raw grade inputs}`; `trusted.gradeWindow(noise,window)` must independently return GREEN. This module does not calibrate or implement R22 signals. |
| E11 | `crossChecks[]` | `{role:"source" or "consumer", position, atNs}`. Instants within bracket minus 1ms / plus 5ms, else CR-INCONSISTENT. Not used as lag starts. |

`events.clockDomain` and every member of `events.clockDomains[]` must exactly equal the evaluator's expected
`{bootId,timeNamespace,clock:"CLOCK_MONOTONIC"}`. The adapter must enumerate every participating clock; a JSON list alone cannot
prove the collector did not omit a role. `events.lagStart` must be `observer-bracket`.

Effect/affected rows are `{consumer,epoch,position,subject}`. Delivery rows are `{offset,digest}`. Deletion rows carry those same
keys. Replay of normalized transactions starts empty at the declared frontier: a nonempty seed must be represented by committed
initialization events before the measured window, not omitted from final-state reconciliation. Final duplicate effect rows count
in addition to committed insertions beyond the first.

## Identity-only feed-entry/1 proposal

Entry keys are exactly `stream,epoch,offset,kind` and (only for commit) `transactions`. Commit transactions have exactly
`stamp,positions,txIds,operationId,commandIds,changes`. A change has exactly
`op,entity,attribute,validFrom,validTo,position,assertionId` and `erasureSeq` only for erase. No value, envelope, key id or extra
field is accepted. Stamp is non-null. Positions/txIds/commandIds/changes arrays are nonempty. A change's position must occur in
its transaction positions. The digest hashes canonical JSON bytes of the entire entry, without a format prefix/newline.
`NS_ENCODING_SHA256` hashes the exported encoding-description string; the implementation must be pinned alongside it.

## Additional P1/P4/P5 inputs

`ladder[]` holds raw segments `{id,level,phase,traceSegment,offerScheduleSha256,startNs,endNs,reads[],offers[],recoveryOf?}`.
Levels 0/1/4/16/64/256/1024 are required. Matching uses phase, trace segment and schedule digest. The adapter must bind every
segment to the frozen workload and its actual reader E8 observations. Recovery is a 256 segment within 60 seconds of stress end.
`maintenance[]` has observer event atNs inside the window.

`pullResources` has `cpuset[], cpuUsageStartUs,cpuUsageEndUs,ioReadStartBytes,ioReadEndBytes,historyScansStart,historyScansEnd`.
`historyPulls[]` has `depth (1/3/10), subject, sentAtNs,receivedAtNs,bytesRead` for the same 1,000 subjects per depth. A single
measured pull loop uses the frozen 50/35/15 fact mix and 40/35/25 hop mix; integer denominators must represent the exact mix.

`sweep` has `activationReceipt:{basis}, subjects[], outputs[],outbox[],startNs,endNs`. Exactly 100k unique subject ids and one output
row per subject; subject-list canonical hash equals evaluator pin. Outputs/outbox are grouped per subject and compared to oracle
results at that activation basis. `sweepTraffic:{baseline,sweep}` holds matched raw segments using the ladder segment shape.

## Results

Status is REFUSED with codes, or RECOMPUTED with measurements; neither is acceptance PASS. Missing timing grade, crashes or empty
lag sample yield TIMING-UNJUDGED with nullable lag bar and retained count results. A missing consumer sample contributes infinite
lag and a gap; consumers must not serialize JavaScript infinity as a finite value (plain JSON.stringify renders it null).
Quantile export is exact nearest rank; timestamp differences remain BigInt until final milliseconds conversion. No histogram or
candidate summary is consulted. P3M's historical helper explicitly returns DIAGNOSTIC and LAG-START-CR.
