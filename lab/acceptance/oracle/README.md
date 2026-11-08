# O-OBS observation oracle (EXP-O05)

Independent Python standard-library evaluator of retained observation records. No adapters, packages, engines, Docker or client
implementation are imported. Synthetic fixtures are hand-derived from ACCEPTANCE 0.3.10 section 6.3; they are not engine receipts.
Goals and correctness authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This implements a correctness floor for P1,
P2, P3 and P5. It does not close any obligation or pin itself in the contract.

```sh
python3 -I lab/acceptance/oracle/observe.py check OBS-CANCEL evidence.json --contract lab/acceptance/obligations.json
node lab/bin/heavy.mjs --label CX-O05-tests -- python3 -I lab/acceptance/oracle/test_observe.py
node lab/bin/heavy.mjs --label CX-O05-cli -- python3 -I lab/acceptance/oracle/test_cli.py
node lab/bin/heavy.mjs --label CX-O05-mutants -- python3 -I lab/acceptance/oracle/selfcheck.py
```

Each invocation emits one ASCII JSON object with sorted keys, compact separators and a final LF:
`{protocol, verdict, reasons, thresholds}`. `thresholds` contains the complete contract definitions actually consulted.
Exit 0 = PASS; 1 = FAIL (missing evidence or violated rule); 2 = REFUSED (malformed input, unsupported population or contract gap).
Duplicate keys, nonfinite values, negative resource/timing quantities and booleans used as numbers are rejected. Times are milliseconds
on one monotonic clock. Position counters are nonnegative integers or `{stream,epoch,offset,ordinal}` with a nonempty string stream;
watermarks never cross streams or epochs. Unknown evidence fields remain in the parsed input and are ignored by the verdict rules.
Missing required nested fields fail. Wrong JSON types refuse. This is a verdict over supplied evidence, not collection of evidence.

## Retained source records

Every protocol requires a `source` object, except NO-MUTATION, which uses its normative `counterSource` field:

```json
{"kind":"engine-update-counter","records":{"engineMutationCounterBefore":12,"engineMutationCounterAfter":12},"sha256":"..."}
```

`records` must contain every required input field other than the source itself, byte-equivalent under the canonical JSON writer;
`sha256` is SHA-256 of that canonical object (ASCII JSON, recursively sorted object keys, compact separators, no newline).
The records are interpreted, not their purported PASS flags. A source label, filename, hash alone or client counter cannot pass.
Unknown fields can be retained in the records too. The frozen fixtures show complete examples for every protocol.

This envelope supplies content integrity and links the verdict to retained normalized engine/observer records. It is **not an
attestation of origin**. A trusted, independent collector and the acceptance evaluator must bind those records to the original
engine bytes, exact run, case inputs, composition, inventory and coverage. A malicious party can fabricate an entire internally
consistent log; hashing does not authenticate it. No such authentication mechanism is specified in section 6.3. Do not use a
standalone PASS as executable qualification or proof that the records came from an engine.

## Schemas and implemented rules

All fields named by section 6.3 remain required, including nullable `fallbackIndex` and `keyDestroyedEvidence`. Additional required
fields below fill explicit contract gaps conservatively. `FIELDS` in observe.py is the machine-readable list; fixtures.json is the
complete example catalog. One record per invocation; invoke once per scratch relation, read, commit, or fault attempt. Erasure scans,
pool samples and resource owners are checked together to prevent partial-inventory PASS.

| Protocol | Accepted source.kind | Additional structure and rule |
| --- | --- | --- |
| OBS-CANCEL | engine-active-query-log | `expectedError` pins E-CANCELLED or E-TIMEOUT; `reuseConnectionId`, `reuseResult {queryId,connectionId,outcome,t}` prove successful same-connection reuse. Ack.kind = cancel-ack or close-ack. Samples cover both endpoints and all intervening gaps, at most 1000 ms. Request is absent at and after drain. Drain <= T-DRAIN-MS. Timeout also requires source-bound `tDeadline`; caller settles within T-DEADLINE-GRACE-MS. |
| OBS-PREABORT | engine-statement-log | `coverage {from,to,maxGapMs,segments:[{from,to}]}` describes complete statement-log coverage (maxGapMs=0). Segments must join without holes and reach both window endpoints. An empty complete log can pass. No matching tag is allowed. |
| OBS-CONNECTIONS | engine-connection-samples | `baseline` maps every declared pool label to its count. No duplicate pool declarations. Every pool has ordered samples, all <= max, a post-close baseline sample by T-CONN-RELEASE-MS, and no later leak. |
| OBS-SCRATCH | engine-relation-scan | `unknownOutcomes:[workingId]`; `resolutionReceipts:[{workingId,outcome,receiptId}]`. Counts equal and exactly every unknown has a unique committed/aborted resolution. |
| OBS-NO-MUTATION | engine-committed-transaction-counter, engine-update-counter | Before and after nonnegative integer committed/update counters are identical. |
| OBS-RESOURCE | resource-owner-samples | `obligation` selects a real contract obligation. `envelope {memory,disk,owners:[owner]}`; forecast has memory,disk. Every sampled timestamp includes every owner exactly once. SUM of owners' rss/disk <= forecast <= envelope; planner memory cap applies when the obligation names it. |
| OBS-AVAILABILITY | engine-probe-log | `events:[{kind,t}]` includes restart observations. Read and write probes each succeed at/after failure and by T-AVAIL-WINDOW-MS; no manual-restart after failure. Probe outcome is success or failure. |
| OBS-SCALE-COUNT | engine-count-query | `population {generator:"configured-entities-v1",n,width}`. Both count objects equal the entire O-REPLAY analyticCounts result. A separate isolated Python process computes it; supplied analyticCount is never authoritative. Unknown generators refuse. |
| OBS-WORK | engine-work-counters | `comparison {operation,engineWorkUnits}`, `threshold`. All four nonnegative integer counters required on both operations. Every nonzero baseline channel's ratio meets T-REUSE-AVOIDED or T-INCR-WORK; increasing a zero channel fails; all-zero baseline fails. |
| OBS-MAINTENANCE | engine-maintenance-log | `events:[{kind:start\|end,t}]`, `threshold`. Kind compaction/index-rebuild/delta-merge/index-catch-up; nonempty interval and matching start/end events. `lagSamples:[{t,lagMs}]` cover interval at <=1000 ms gaps; recomputed nearest-rank p99 meets NS-P3-LAG-P99-MS. |
| OBS-ERASURE-SCAN | protected-copy-scan | `scans:[{inventoryEntry,location,scanMethod,plaintextHits,derivedChannelHits,keyDestroyedEvidence,tScan}]`, `tErasurePublished`. All contract protected-copy categories scanned strictly after publication, zero plaintext AND zero derived hits. Primary scan matches one full scan. Optional crypto record: `{subjectKey,destroyedKey,tDestroyed,survivingCopies:[{id,encryptionKeys}]}`; each copy exclusively under the destroyed subject key. |
| OBS-WATERMARK | engine-read-snapshot | Additional `eligibility`, `surfaceLanguage`, `tReadStart,tReadEnd,tRouteStart,tRouteEnd`. Wait <= T-WATERMARK-WAIT-MS; route and wait wholly within read timing. route index/fallback; fallback identifies actual serving index. Eligibility is recomputed as below. |
| OBS-ACK-ORDER | source-publication-log | `sourceOfTruth` matches ackSender, ACK at/after source publication. `ryowPullRoute` is a complete independently source-bound OBS-WATERMARK record at commitPosition, starting at/after ACK. |
| OBS-FAULT-TRANSITIONS | post-crash-durable-readback | `variant` log-source/engine-source, `transitions:[{transition,t,durableEvidenceObject}]`, `tCrash`. Transition names from selected contract commitOutcomes table. Objects null for unwitnessed transitions, otherwise `{record:{transition,t,...},sha256,tReadBack}`. Digest, identity/time and readback strictly after crash checked; claimed transition must equal last retained durable witness. |

### Index eligibility

`eligibility` requires `index`, `publishedPositions`, `resolutions:[{position,outcome:applied|aborted}]`, `scopeOwner`, `queryScope`,
`mappingGeneration`, `queryMappingGeneration`, `validInstant`, `validFrom`, `validTo`, `exactCut`, `queryCut`, `reconstructFrom`,
`reconstructTo`, `erasurePublished`, `erasureApplied`, `recordedTimeBound`, `markerState`, `partialOrConflictedReferenced`,
`queriedAttributes`, `attributes:[{name,from,to}]`, and `snapshot`.

The actual serving index must match. Watermark reaches basis in its stream and epoch; every published position at/below the watermark
has an applied/aborted resolution, and the requested basis is applied. Scope and mapping agree; validFrom <= validInstant < validTo;
exactCut=queryCut=basis; basis lies within the inclusive reconstructability interval of the index AND every queried attribute, with
no omitted or repeated attribute. ErasureApplied reaches ErasurePublished independently of basis. The supported C1 projection subset
requires recordedTimeBound=null, markerState=complete, partialOrConflictedReferenced=false; other inputs fail closed.

`snapshot {mode:single-request|incarnation-fenced,before,answer,after}` contains three `{incarnation,marker}` records, equal throughout,
whose marker equals watermarkAtRead. This rejects the reset-and-replay-to-same-marker interleaving in plan-v2 round 8. For a single
request the collector retains the one snapshot in all three slots. The collector must bind the answer to that snapshot. This oracle
checks observation eligibility; O-REPLAY/O-PLAN still judge query answers and the complete C1 route semantics.

## CONTRACT-AMBIGUITY items (proposed readings, not approved amendments)

1. **CA01 provenance.** The contract gives semantic engine sources, not source-kind strings, raw parser formats or authenticated
   collectors. Proposed mapping is the allowlist above. Require retained normalized records plus hashes; trusted collection remains
   external. The additional source envelope is intentionally mandatory even for protocols without a named source field.
2. **CA02 case authority.** expectedError, close/cancel times, selected obligation, population, query attributes, source owner, index
   metadata and read basis need independent case/run binding. Section 6.3 does not specify that envelope. This program checks their
   internal consistency; acceptance must bind them to its independently selected case, not accept a candidate's convenient values.
3. **CA03 cancellation.** Same-connection reuse, ack kinds, expected error, timeout deadline and success need explicit record forms.
   Proposed fields above; samples include drain instant, settle/reuse chronological. No caller-settle latency bar beyond timeout grace
   is invented.
4. **CA04 log and sample completeness.** PREABORT requires retained continuous log segments; other event logs require the trusted
   collector's complete capture. CANCEL's normative 1000 ms gap is also a conservative proposed MAINTENANCE sampling bound.
   CONNECTIONS has no cadence in the contract: require a return sample by deadline and reject later nonbaseline samples.
5. **CA05 scratch and owners.** Scratch relations checked per call; external case inventory must require all relations. Unknown working
   IDs need an explicit inventory. RESOURCE totals owners together at each timestamp, requiring the complete declared owner set.
6. **CA06 work ratio.** No universal units-to-scalar conversion is specified. Proposed conservative rule checks every nonzero channel;
   never add rows, triples and bytes together. Zero-work baselines cannot establish a positive witness.
7. **CA07 maintenance.** No named lag threshold, percentile convention or cadence is fixed. Proposed NS-P3-LAG-P99-MS, nearest-rank p99,
   and <=1000 ms sample gap; other maintenance metrics refuse until a contract mapping exists. Not a general P1/P5 performance gate.
8. **CA08 populations.** O-REPLAY currently supplies configured-entities-v1 analytic counts only. The year-one representative-domain
   population and arbitrary strata must refuse until independent analytic models exist. No extrapolation from this supported fixture.
9. **CA09 erasure inventory.** Contract inventories categories, not physical per-lane paths or exclusion rules. Current proposed schema
   requires exactly one comprehensive scan per category (including broker categories on every lane), whose location denotes the whole
   category. A production collector needs a pinned physical inventory and must scan every copy beneath each category. Crypto evidence
   shows encrypted-copy key exclusivity; plaintext or plaintext-derived hits always fail, even with a destroyed key. Ciphertext is not a
   plaintext hit. No key management API or cryptographic key-destruction attestation is defined here.
10. **CA10 eligibility.** Section 6.3 omits raw C1, reconstruction, erasure and fencing inputs. Proposed conservative schema above checks
    a projection-eligible subset only. It can reject eligible exact/history routes outside this subset; no unsupported route gets a
    speculative PASS. Prefix completeness and all queried attribute intervals require trusted complete source logs. The retained snapshot
    model follows Q67c; authenticity and atomic snapshot collection are outside this offline evaluator.
11. **CA11 faults.** Transition objects lack encoding and witness-specific readback adapters. Proposed normalized records retain
    content plus digest and post-crash readback time. Names come from commitOutcomes. This computes last durable witness only; it does
    not prove that QT5 ran every access path, infer durability from a claimed fsync, or implement fault injection/recovery acceptance.
12. **CA12 verdict codes.** REFUSED uses exit 2 for malformed/unsupported input. Missing required fields use FAIL/1; unsupported named
    contract metrics/populations refuse. Unknown extra fields remain ignored. All ambiguities need independent review before oracle pinning.

## Tests and self-check

`fixtures.json` is the frozen hand-authored catalog. `test_observe.py --write-fixtures` regenerates it from the explicit fixture
builders; it never computes expected verdicts from observe.py. Every protocol has a positive and at least boundary, missing-field and
forged-source failures. Additional fixtures cover the observed attacks and timeout/fallback positives. `test_cli.py` exercises canonical
output, contract threshold replacement, ignored extra fields and malformed inputs. `selfcheck.py` creates 14 temporary executable
mutants, each omitting one protocol evaluator; a kill requires its boundary fixture to produce a wrong PASS, all baseline positives to
remain passing, and no crash. Temporary files are removed. The self-check is a builder gate, not the separate adversarial review.
