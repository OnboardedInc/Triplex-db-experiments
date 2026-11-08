# O-OBS observation oracle (EXP-O05 round 2)

North star: correctness floor for P1/P2/P3/P5, governed by `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
Q80a-c and Q82a-e supersede the original self-hashed-record envelope. This is an independent Python stdlib evaluator;
it imports no adapter or engine code. PASS is **screening only**. Q82c additionally requires a separate verifier to repeat
collection before acceptance. No production observer, vendor parser or engine qualification is supplied here.

```sh
python3 -I -B lab/acceptance/oracle/observe.py check OBS-CANCEL evidence.json \
  --contract lab/acceptance/obligations.json --context evaluator-context.json \
  --bundle retained-obs-directory --key-file evaluator-run.key
node lab/bin/heavy.mjs --label CX-O05-R2 -- python3 -I -B lab/acceptance/oracle/test_round2.py
node lab/bin/heavy.mjs --label CX-O05-fixtures -- python3 -I -B lab/acceptance/oracle/test_observe.py
node lab/bin/heavy.mjs --label CX-O05-cli -- python3 -I -B lab/acceptance/oracle/test_cli.py
node lab/bin/heavy.mjs --label CX-O05-mutants -- python3 -I -B lab/acceptance/oracle/selfcheck.py
```

Exit 0 = PASS, 1 = FAIL, 2 = REFUSED. Output is canonical ASCII JSON plus LF. A legacy evidence object, even perfectly
self-hashed, is REFUSED without evaluator context, retained bundle and external key. Unknown protocols and malformed JSON refuse.
Missing required facts and violated inequalities fail. No existing observation is promoted or contract pin changed by this work.

The existing protocol field schemas remain in `FIELDS` in observe.py. All required fields must be reproduced by authenticated
normalizers. `source` (`counterSource` for NO-MUTATION) and optional `corroboration` entries contain
`{kind, streamRefs:[streamId], records:{...}}`. Each entry refers to exactly one independently retained stream; duplicate refs
are rejected. Every supplied record must equal recomputed output and the corresponding evidence field. Disagreements fail.

The source cells from R27 section 3 are encoded in `SOURCE_CELLS`. Kinds have three parts, for example
`EI-metric/xtdb/X1.node.tx.latestCompletedTxId`, `TO/xtdb/T1`, `HO/any/H4`, `DR/any/H6`, `HR/any/HR`.
EI subtypes share one independence kind. CR refuses; HR is limited to caller fields in `CALLER_FIELDS`. DR is limited to
scratch, fault, erasure and publication readback. Every engine field in the four safety protocols needs agreement from two
non-HR kinds. Datomic CANCEL/PREABORT additionally require HO + TO. Indirect-only verdicts say `sourceStrength: indirect`.
XTDB X1 mutation evidence must name the completed-transaction gauge, never the source-log position.

## Evaluator context and retention

`obs-context/1` is a local interface added here because R27 specifies the bundle but no machine-readable case-context encoding.
It is supplied **only by the evaluator**, never accepted from a candidate or obtained from the bundle. The evaluator must retain
it with its contract, objects, key and witness log independently of candidate writes. Hashes in a candidate-authored context
provide no authenticity. Changing this trusted context changes the question being evaluated.

Required fields:

- `format`, `runId`, `receiptId`, `keyId`, `protocol`, `engine` (`xtdb|qlever|datomic`), `obligation`, `case`, `witnessKind`.
- `contractSha256`: canonical contract digest; `bundleSha256`: exact retained envelope bytes; `bridgeSha256`: exact bridge bytes.
- `thresholdIds`: evaluator-selected thresholds; all thresholds required by the obligation must be included. Every threshold
  consultation checks this set. WORK additionally uses `witnessKind: reuse|incremental` and corresponding `selectedThreshold`
  T-REUSE-AVOIDED or T-INCR-WORK. Other witness kinds equal the protocol suffix. MAINTENANCE pins `selectedThreshold` too.
- `bindings`: expected case inputs. `CASE_FIELDS` lists the mandatory fields per protocol, including expected caller error,
  obligation, resource envelope/forecast, requested basis and population. Timeout additionally binds its deadline. Extra bindings
  can pin any other case inputs. Case selection and run identity are never read from evidence.
- `clockMaxUncertaintyMs`: maximum permitted uncertainty. Bridge entries `{send,receive,observerMono}` must meet the declared
  round-trip uncertainty. Normalizers map times into the observer clock. ACK ordering and wait bounds include uncertainty margins.
- `streams`: evaluator-retained stream policies, each containing the envelope stream metadata, absolute evaluator-owned
  `normalizerPath`, and `chunks:[{raw,header,headerSha256}]` in dense sequence order. Paths to bundle objects must remain inside
  the bundle. Normalizers must be outside it; the evaluator pins their exact script bytes in `{id,version,sha256}`. These scripts
  are trusted evaluator code, **not sandboxed candidate code**. O-OBS runs each isolated with Python, concatenated raw bytes on
  stdin, and requires a JSON record object on stdout; nonzero exit and timeout reject the evidence. The evaluator must pin any
  parser dependencies too; stdlib-only standalone scripts are the intended interface.
- `witnessHeads:[{runId,streamId,seq,headSha256,tMono}]`: independently retained periodic and final chain heads. Every witness
  must match an actual header; every stream must have its final head witnessed. Heads are SHA256 of the exact header-file bytes.
  Context witnesses are copied from the orchestrator log, never the bundle's own seal.

Bundle envelope and chunk headers follow R27 section 2, `format: obs-bundle/1`. Header HMAC is SHA256-HMAC over canonical JSON
without `hmac`, using the external 32-byte per-run key. The first previous-header hash is null; subsequent hashes cover exact
header-file bytes. Raw byte lengths, hashes, dense sequences and monotonic interval ordering are checked. `seal.json` is
`{runId,heads:{streamId:finalHeaderSha256},hmac}` authenticated the same way. The envelope itself is pinned by the retained context.
The external key is never read from the bundle. Key access and context ownership remain evaluator responsibilities; this cannot
protect against another process with the same user's filesystem privileges. That is why verifier recollection is mandatory.

## Revised semantic witnesses

WORK compares every nonzero integer counter pair with the decimal rational threshold by integer cross multiplication.
Increasing a zero baseline fails; an all-zero baseline fails. No binary64 division or rounded ratio is used.

WATERMARK requires `waitEvents:{start:{kind:"read-start",readId,t},end:{kind:"engine-request",readId,t}}` in authenticated
records. They must match read start and route start, and their complete interval equals waitMs and meets the wait threshold.
A convenient duration label cannot omit time before routing. Existing cut, scope, mapping, eligibility and incarnation checks remain.
ACK-ORDER separately authenticates its nested WATERMARK stream(s).

FAULT-TRANSITIONS binds the evaluator's `variant` and `transitionExpectations` map. Each expected entry contains operationId,
position and concrete `facts`. Every declared transition requires a post-crash witness; null witnesses fail. Existing digest,
time ordering and last-durable-transition checks remain. Records now contain `{transition,t,operationId,position,facts}`;
readback objects also bind `readbackOperationId` and `readbackPosition`. `transition_witness` lists the schemas: COMMIT readback
with actual effects, source readback effects/absences, marker, transaction, request/update/begin payload, receipt, and QT5 results
through exactly eav/ave/vea. Payload identities and positions must match the case, and all facts must equal evaluator expectations.
A label, hash, booleans alone, or a declaration of verification does not prove a transition.

ERASURE-SCAN uses evaluator `scanInventory:[{id,category,location,scanMethod,canary}]`, covering contract categories plus observer
outputs, old index generations and freed blocks. Every physical location must appear exactly once. Each scan contains
`positiveControl:{canary,tWritten,tFound,hits,scanMethod,location}`: the same method must find that canary at that location before
erasure publication. Blind scans refuse. Authenticated raw records bind both controls and post-erasure hits; zero plaintext and
zero derived hits remain mandatory. Inventories must enumerate physical copies, not merely name broad categories.

## Fixtures and limits

`fixtures.json`, `test_observe.py` and `bundle_fixtures.py` hand-build examples from the contract; expected values do not come
from the oracle. `fixture_normalizer.py` decodes the synthetic observer field-event JSONL used by these tests. **It is not a
Prometheus, pgwire, FSST or vendor-log parser and must not be selected for production collection.** Production contexts must pin
reviewed source-specific normalizers and collector configuration; absent those inputs O-OBS refuses. The builder never starts
an observer. `test_round2.py` exercises authenticated-byte, HMAC, chain, head, parser, case, ratio, wait, fault and canary boundaries,
and replays all 177 reviewer legacy inputs from commit 74d1152 through the mandatory context boundary.
`selfcheck.py` still requires semantic wrong-PASS kills, with positive controls, for all 14 protocol omissions.
