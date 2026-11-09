# EXP-O05 / CX-O05 builder report

Result: implemented O-OBS for all 14 section 6.3 protocols; builder gates PASS. **Pending independent adversarial review and
contract pinning.** This is not an obligation closure or engine qualification.

Branch: `exp/O05-observation-oracle`. Starting head: `d040aa81223db92925d1d10305d36009618a1aab`. The delivered commit is the
branch head returned in the builder final message. No merge or push was performed.

North star: correctness floor under P1, P2, P3 and P5, using `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` as authority.
Implementation was derived from ACCEPTANCE 0.3.10 section 6.3, CR-OBSERVE, the O-OBS obligation/threshold/entrypoint catalog,
Q31c-f, Q55b and Q67c, and the round-8 label-without-substance/reset counterexamples. No packages or lane adapters were read.

## Delivery

- `lab/acceptance/oracle/observe.py`: isolated CLI, strict JSON input, canonical JSON verdict and exit 0/1/2; stdlib only.
- `README.md`: complete schemas, accepted source kinds, proposed readings and limitations.
- `fixtures.json`, `test_observe.py`: 96 frozen hand-built fixtures (19 PASS, 77 FAIL); no engine capture or oracle-computed expected verdicts.
- `test_cli.py`: 8 CLI tests covering canonical output, threshold authority and malformed input.
- `selfcheck.py`: 14 executable protocol-omission mutants; semantic false-PASS required for a kill; crashes do not count.
- `gates.py`: source-bound gate receipt, command arrays, disk free and retained stdout/stderr.

All implementation paths below are relative to `lab/acceptance/oracle/observe.py`.

| Protocol | Rule location | Rule as implemented | PASS fixtures | FAIL fixtures |
| --- | --- | --- | --- | --- |
| OBS-ACK-ORDER | observe.py:423 | Source owns ACK; publication precedes ACK; pull at returned commit independently passes routing. | 1 | 4 |
| OBS-AVAILABILITY | observe.py:281 | Read and write recover after failure within contract window; no manual restart. | 1 | 5 |
| OBS-CANCEL | observe.py:172 | Pinned caller error, bounded drain, continuous engine samples, transport ACK, same-connection reuse; timeout grace. | 2 | 7 |
| OBS-CONNECTIONS | observe.py:217 | Every pool sample bounded; all pools return to baseline within contract release window. | 1 | 5 |
| OBS-ERASURE-SCAN | observe.py:342 | Complete contract inventory, scans after publication, zero protected hits; destroyed-key exclusivity where supplied. | 2 | 6 |
| OBS-FAULT-TRANSITIONS | observe.py:433 | Contract variant transition IDs, content hashes and post-crash readback; select last witnessed transition. | 1 | 6 |
| OBS-MAINTENANCE | observe.py:329 | Real start/end records, bounded-gap lag samples and recomputed nearest-rank p99. | 1 | 4 |
| OBS-NO-MUTATION | observe.py:251 | Retained engine committed/update counters unchanged. | 2 | 5 |
| OBS-PREABORT | observe.py:200 | Complete statement-log coverage and no request-tagged statement. | 1 | 4 |
| OBS-RESOURCE | observe.py:255 | Sum all declared owners per timestamp; observed totals <= forecast <= envelope; named planner cap. | 1 | 6 |
| OBS-SCALE-COUNT | observe.py:294 | Independent isolated O-REPLAY analytic process; both supplied count objects must match. | 1 | 4 |
| OBS-SCRATCH | observe.py:238 | Counts unchanged; exact inventory of unknown working IDs resolved uniquely. | 1 | 4 |
| OBS-WATERMARK | observe.py:365 | Prefix resolution, scope/mapping/cut, every queried attribute, erasure frontier, incarnation and routing timing. | 3 | 12 |
| OBS-WORK | observe.py:315 | Every nonzero baseline work channel ratio meets the selected contract witness threshold. | 1 | 5 |

The common retained-source check is `observe.py:140`; index eligibility is `observe.py:378`. Each protocol has at least its own
boundary failure, required-field omission and forged client source. Supplementary failures cover unmatched counter hashes,
coverage holes, wrong scope/mapping, unresolved prefix positions, reconstruction intervals, epoch mismatch, erasure lag, replica
incarnation reset, excluded route latency, wrong ACK owner, wrong transition variant and forged analytic counts. Positive extensions
cover timeout, fallback, coordinate positions, update counters and crypto key exclusivity.

## Accepted source kinds

These are **proposed normalized kinds**, because the contract defines the semantic origins but does not enumerate serialized kind
strings. Every kind requires retained record contents and SHA-256 binding; a label, filename or digest alone fails.

| Protocol | Accepted kinds |
| --- | --- |
| CANCEL | engine-active-query-log |
| PREABORT | engine-statement-log |
| CONNECTIONS | engine-connection-samples |
| SCRATCH | engine-relation-scan |
| NO-MUTATION | engine-committed-transaction-counter, engine-update-counter |
| RESOURCE | resource-owner-samples |
| AVAILABILITY | engine-probe-log |
| SCALE-COUNT | engine-count-query |
| WORK | engine-work-counters |
| MAINTENANCE | engine-maintenance-log |
| ERASURE-SCAN | protected-copy-scan |
| WATERMARK | engine-read-snapshot |
| ACK-ORDER | source-publication-log |
| FAULT-TRANSITIONS | post-crash-durable-readback |

## Verification evidence

Final command:

```sh
node lab/bin/heavy.mjs --label CX-O05-final -- python3 -I -B lab/acceptance/oracle/gates.py
```

`evidence/gates.final.json`: PASS, all three child exit codes 0, source hashes before/after identical and checked again against
the delivered bytes. Started with 35,665,244,160 host disk bytes free (above 5 GiB). Final receipt time:
`2026-11-08T21:23:10.406193+00:00`.

| Evidence | Result |
| --- | --- |
| evidence/test_observe.final.txt | 96/96 fixture verdicts and exit codes match |
| evidence/test_cli.final.txt | 8/8 CLI tests pass |
| evidence/selfcheck.final.txt | 14/14 mutants semantically detected, positive controls pass, no crash kills |
| evidence/gates.final.json | Exact commands, interpreter, contract and oracle source hashes, source stability, disk observation |

Earlier `fixtures-first`, `fixtures-current`, `fixtures-gate`, `selfcheck-first`, `selfcheck-gate` and `cli-gate` evidence remains
retained as earlier synthetic builder runs. Only the `.final` artifacts bind the final delivery. No first failure was suppressed.
The root pnpm check, package checks, engine gates and benchmarks were not run: this change is limited to the independent Python
oracle and its experiment report, and the brief prohibits engines/adapters. No Docker lifecycle or engine slot was used.

## CONTRACT-AMBIGUITY and open questions

The full proposed schemas and reasoning are in `lab/acceptance/oracle/README.md`, CA01-CA12. None is an approved contract amendment.

1. CA01: serialized source kinds and authenticated collector format are absent. Proposed normalized records plus hashes bind content;
   they do not attest engine origin.
2. CA02: case/run binding for pinned errors, times, obligations, populations, source ownership and read inputs must be supplied by the
   independent acceptance evaluator. Internal consistency alone is not case authenticity.
3. CA03: cancellation ACK kinds, expected error, deadline and successful connection reuse need explicit normalized records.
4. CA04: complete statement-log segments proposed for PREABORT; maintenance sampling cadence conservatively borrows CANCEL's 1000 ms.
   Event capture completeness and pool sampling cadence remain collector responsibilities.
5. CA05: scratch checks are per relation; the case must require every relation. Unknown working IDs and resource owners need complete
   independently bound inventories; resource totals are summed at each timestamp.
6. CA06: witness work units have no shared scalar conversion. Proposed rule checks all nonzero channels and rejects zero-work witnesses.
7. CA07: maintenance threshold/percentile unspecified. Proposed nearest-rank p99 against NS-P3-LAG-P99-MS; other metrics remain unsupported.
8. CA08: supported O-REPLAY analytic model is configured-entities-v1 only. Representative-domain/year-one and arbitrary strata are refused,
   not inferred from configured-entity counts.
9. CA09: protected-copy categories do not specify per-lane physical paths. Require a comprehensive scan per category for now; production
   collection needs a pinned complete physical inventory. Crypto evidence checks surviving-copy key exclusivity but cannot attest key deletion.
10. CA10: index evidence omits C1/reconstruction/erasure/fencing schemas. Conservative proposed schema checks a projection-eligible subset;
    some eligible exact/history routes can be rejected. It does not replace O-PLAN or answer correctness from O-REPLAY.
11. CA11: durable transition bytes/readback schemas and witness-specific adapters absent. Current program chooses the last content-bound
    witness; it does not independently prove an engine fsync, source durability configuration, recovery or QT5 access-path verification.
12. CA12: malformed/unsupported input uses REFUSED/2; missing required evidence uses FAIL/1. Unsupported generators or missing contract
    thresholds refuse. A disallowed protocol-specific threshold fails. Reviewers should approve these proposed format choices before pinning.

The major remaining integration question is the trusted collector/acceptance binding. Whole fabricated internally consistent logs
cannot be authenticated by SHA-256. No engine evidence was collected or verified, no obligation status was changed, and no contract,
ACCEPTANCE, RULINGS or build_contract file was edited. Independent review must judge these boundaries and the proposed schemas.

## Checksums

`SHA256SUMS` contains SHA-256 of every delivered file under the two authorized directories, including this report, the unchanged
brief and all evidence. It excludes only itself to avoid a self-referential digest. Validate from this worktree with
`shasum -a 256 -c lab/experiments/EXP-O05-observation-oracle/SHA256SUMS`.
