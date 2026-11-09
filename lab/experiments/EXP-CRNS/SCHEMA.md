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

## Round 2: mandatory evidence floors (supersedes conflicting round 1 text above)

The normalized format remains experimental; these are deliberately incompatible strengthening changes. The evaluator still
never grants acceptance. A primary lag arithmetic run needs a separately authenticated crash companion before `bars.P3.met` can
be true. Missing data is a refusal, not an adapter promise or a null quantile compared numerically with a threshold.

Required evaluator context now includes:

- `sourceStorage`, `sourceStream`, `initialFrontier`, `consumerId`, and `epochs` (canonical position JSON -> pinned epoch).
  Every observed row uses this consumer and the mapped source epoch; identities cannot be pooled. Every checkpoint names a
  resolved source position and the final checkpoint equals the source's exact terminal frontier. Noncommit markers use
  `resolveFrontier(entry)` from evaluator code; sparse/ordinal coordinates remain coordinates, not a numeric offset shortcut.
- `normalizeSource(source,binding) -> {entries,commandDigests}` and `verifySource(source) -> true`, **for all storage kinds,
  including broker-frame/2**. The decoder reconstructs entries and full command digests from retained source command bytes;
  a source-written digest column alone is insufficient. CRC verification is an additional check, not a decoder or an identity pin.
- `normalizeWal(consumer,binding) -> {transactions,effects,affected,deliveries}` reconstructs rows from the retained bytes for
  this exact attempt. Its result is compared with every supplied normalized row. A boolean walComplete or hex-prefix match is
  insufficient. The production SQLite/OBS01 decoders remain integration work; fixture JSON codecs are explicitly synthetic.
- `commands[commandId] = {commandSha256,changesSha256,...}` from the frozen trace. Full command digest is separate from the
  identity-only projected change digest; feed entries still carry no value. `source.commandDigests` contains the decoder's full
  command digests. Each offer carries its frozen `commandSha256`. Each source transaction's canonical identity change content
  (excluding the source-assigned position) hashes to `changesSha256`; its full retained command hashes to `commandSha256`.
- `roles[]`; `events.clockDomains` is now `[{role,domain}]` with exactly one record per pinned participating role.
- `minimumSamples = {lag, bands:{"5-10", "11-25", "26-50"}}` with positive integer minima derived from the frozen schedule,
  and `maxBracketWidthNs`. These are evaluator inputs, not measured or claimant-selected fields. Missing minima refuse; any
  undecided receipt ACK (`L <= ack < U`) refuses ACK-order qualification and reports its share.
- `p4LargestBucketP99Ms` is a positive evaluator-pinned bar. It has no implicit default or authority to set a new target; until
  the applicable provisional bar is confirmed/pinned, requested P4 recompute refuses `P4-BUCKET-BAR-UNBOUND`.

Offers now require unique `eventId` and `kind` (`normal`, `duplicate`, `lost-ACK`, `lost-ACK retry`, `correction`, `invalid`). A
command may commit only once. A typed error/conflict on a published command is refused. A retry of a published command must
return the original receipt. An original `lost-ACK` attempt may remain without a receipt: a later attempt for the same command,
with a receipt and later send/ACK timestamps, resolves it. The original sample ends at that retry's ACK (queueing is retained),
not its earlier censor time; its missing original ACK is not UNACCOUNTED. No receipt is copied backward into E1. A lost ACK
without a resolving receipt remains unaccounted. Accounting, valid-command progress and publication/ACK checks run for P3-only too.

Every read has a unique `readId`. Main measured reads must complete inside the measured interval; an out-of-window or
boundary-spanning read refuses the run rather than disappearing from its denominator. E8 loops are independently re-derived from
E2 completion timestamps for each measured second and compared exactly to declared loop sets, plus relay agreement. Ladder windows
have unique `id`, their own `readers[]` and full E2 sample, and explicit recoveryOf. The main P1 segment is selected by
`events.mainSegmentId` and has identical times and read events. At least half of P1 reads must target a subject written in the
preceding 60 seconds; at least 10% belong to same-subject/same-basis split groups straddling an E1 command ACK. The zero-reader
writer baseline must meet the absolute 50 ms p99 floor before a ratio can pass. Request memoization includes all query parameters
(including hops); timing, answer, observation ids and scheduling metadata are excluded. Oracles receive prefixes clipped to the
current position/requested basis, and command validity receives the pre-offer visible prefix.

P4's single loop is also sequential: overlapping intervals or duplicate ids refuse. History pulls require requested/echoed basis,
shape, unique readId and answerSha256, checked by replayRead. `historyResources[]` has one observer phase per depth with
`depth,startNs,endNs,ioReadStartBytes,ioReadEndBytes`; IO comparisons use those deltas, not pull-reported bytes. Depth-1 absolute
p50/p99 must meet P4 before flatness ratios count.

P5 additionally needs `activationCommandId`, `releaseSha256`, the matching release pin on that frozen command, and
`verifySweepDurability`. Its activation receipt basis must equal the committed activation position. `sweep.durableBracket.U` is
exactly sweep.endNs; the evaluator verifies durable outputs at that observer bracket. Live segments need measured 64-loop
completions and answer verification. Baseline lies outside the sweep; during-sweep lies inside. Baseline read p99 <=100ms and
writer p99 <=50ms are required before the 1.5x ratios.

Crash witnesses require `checkpointOffset,recoveryOffset,beforeTransaction,recoveryTransaction`. The checkpoint and recovered
frontier match those committed WAL transaction anchors (beforeTransaction=-1 is the pinned initial frontier). `checkpointOffset`
may be null only for the sentinel before the first source offset. Replay equals the complete ordered interval of both source
entries and actual recovered WAL deliveries: no missing/extra/repeated entries. All crash-run count checks apply. At least three
unique witnesses per point remain required. Crash runs can return RECOMPUTED for counts/resume with `lag:null`; this is not a
whole-P3 grant. `trusted.crashRun={bundle,trusted}` is re-evaluated, never a supplied result; it has a different attempt id, matching
source/slot/input identities, and no recursive companion. A primary result's `bars.P3.resume` requires that companion to recompute
cleanly. `bars.P3.met` additionally needs the primary GREEN lag bar and all source/content/evidence checks. Bare faults:[] with
no independently recomputed companion cannot grant P3.

## Round 3: trace, load, crash and baseline binding (supersedes conflicting prior text)

`binding` now pins `traceSha256` and `crashAttemptId`. `trusted.frozenTrace` is an independently authored immutable trace preimage;
its canonical hash must equal traceSha256. It contains `commands` and `attempts[attemptId]` with the exact offered event/command ids,
scheduled times, content hashes, measured/drain window and (for crash attempts) planned `injections[]`. It must come from frozen
inputs before candidate observations, never be reconstructed from observed source entries. The expected command validity/hash
pins must agree with this trace. The main and companion are separate planned attempts of that same preimage.

Lag population consists of **unique oracle-valid command ids scheduled inside the window**, not positions whose observed L happens
to lie inside it. Every such published position contributes a sample; publication outside the window contributes infinity and
LAG-SAMPLES-SHORT. A lower caller-provided minimum cannot remove the sample. `minimumSamples.lag` is an attempt-id map equal to
these frozen populations; mismatch refuses LAG-POPULATION-UNBOUND. Commands with no committed position are still refused by the
unconditional source progress check. All reader answers and echoed bases are checked in every priority set whenever readerLevel
is positive; instant garbage answers cannot count as P2/P3 load.

A committed oracle-invalid command refuses INVALID-COMMAND-PUBLISHED. Publication L earlier than the first attempt's sentAtNs
refuses PUBLISHED-BEFORE-OFFER. Legitimate later retries use response completion in queue accounting, never the earlier original
publication. Every duplicate/lost-ACK retry has an earlier attempt with the same commandId; a new logical id is not a retry.
Different basis/position representations refuse BASIS-FORM-MISMATCH before invoking the oracle, rather than silently emptying
its prefix. Pending an amended ruling for concurrent per-subject offers, a reversal of first-offer order refuses
SUBJECT-OFFER-ORDER-MISMATCH; it cannot close an ordered-subject case by assuming commutativity.

Every crash witness requires a planned unique `injectionId` also present on its single cgroup-gone event. The crash time is unique
and inside the measured traffic window. Its before-checkpoint consumer bracket U is <= crash, and recovery bracket L is > crash.
Replay remains exactly the anchored source and WAL range. `pageFrontier` agrees with the planned injection. The required
`normalizeFault(witness,binding)` decodes the retained `snapshotHex`/production snapshot and returns
`{injectionId, checkpoint, pageFrontier, effectState}`. Before-effect has absent effects; after-effect has **uncommitted** effects
and the old checkpoint; after-checkpoint has committed effects at the already checkpointed page. This preserves FD01's atomic
single-transaction model: committed effects with an uncommitted checkpoint would contradict it. For after-checkpoint the page
frontier is the before-crash committed frontier; recovery resumes with its successor. The R44 residual remains: a production
observer unable to distinguish absent from uncommitted in-memory effects must refuse the named point or provide additional
independently reviewed evidence. A candidate hook label alone is insufficient.

A clean crash-only result has status **CRASH-RECOMPUTED**, lag:null and met:false. A primary run accepts resume only from that
separately recomputed status. The exact companion attempt is pinned in binding. All companion context fields must match the
primary, including functions by reference, except key/head, binding.attemptId and the primary-only crashRun wrapper; every other
binding field is equal. The fixture companion has its own ten-commit traffic/source/WAL trace and nine distinct injections and
ranges. It is not a copy of the primary. Production trust functions and captured state still require evaluator code pinning,
immutable inputs and independent adapter verification.

Baseline ratios now require independently pinned **ns-calibration/1** authority records. The context fields are calibrationP1,
calibrationP4 and calibrationP5. Each carries an exact `pinSha256`, expectedBinding (attempt/source/slot/inputs), and a canonical
payload matching that pin and binding, with a GREEN grade and named priority. The future contract/A0/calibration registry owns
these pins; a candidate-supplied record or a pin derived from the baseline being judged is never an authority. P1/P5 records
contain raw matched prior segments; P4 records contain the exact 1,000-subject history baseline and observer IO counters.
Recomputed current baselines cannot exceed that independently recorded writer/history budget even when both would lie below the
absolute bar. Absolute guards and ratios remain alongside this check; no numeric target is loosened.

P5 during-sweep start/end equal the complete evaluator-verified sweep start/end. Its calibration record pins samplingPeriodNs;
the supported E8 representation is one-second periods. Every period of the whole sweep must contain measured 64-loop correct
completions **and** writer offers. Missing even one period refuses; a self-selected one-second segment cannot stand for a
100-second sweep. Baseline remains outside the sweep and must match the independently pinned calibration/workload.
