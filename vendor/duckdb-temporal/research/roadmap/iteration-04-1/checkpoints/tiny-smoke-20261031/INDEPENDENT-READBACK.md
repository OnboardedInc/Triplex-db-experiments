# Initial graph smoke — independent read-only result check

Project checkpoint: **2026-10-31 23:07:41 UTC**. Current phase: result readback complete. Exact pending calls after final record write: **none**. Pending approval requests raised here: **none**.

## Disposition

**No mismatch found. The supplied once-only tiny-unit receipt consistently records PASS, complete=true, exit code 0, eight public attempts, eight checks and zero failures.** This reviewer did not rerun/import any product or suite. The result establishes only the recorded four n<=1 initial scenarios at the identified source/oracle revision, not broader graph correctness, native/Datalog integration or item4 acceptance.

## Exact inputs and readback method

Read literally only these candidate001 project records under `.agent-logs/goal4_1-integration/candidate-001/`:

1. `SMOKE-STARTED.json`.
2. `SMOKE-RETURNED.json`.
3. `FRESH-PROJECT-CONTENT-CHECK.json`.
4. `PREPARED-SOURCE-INVENTORY.json`.

Prior peer004 launcher reasoning was retained as context; no product source, source suite, CLI test or earlier action was imported/reexecuted/reopened. The expressly allowed non-product content utility was used only to SHA-256 the exact `SMOKE-RETURNED.json` bytes. Its result is:

`c290ed41841b658b84e26dffd72841123fe34df651bae87e5e1d869fe6918cb6`

This matches the coordinator-supplied receipt SHA exactly. It is a project-content identity check, not a machine observation, execution or signature/authentication claim. No source-byte hashes were recalculated in this readback lane.

## Eight reached scenario records

All eight distinct IDs occur exactly once and in the launcher's expected sequence. For **every row**, expected equals actual, `call_outcome=RETURNED`, `public_calls=1`, `checks=1`, and `failures=0`.

| Scenario ID | Matching expected/actual classification |
|---|---|
| `SMOKE_EMPTY_ANALYZE` | `CANONICAL_STRATIFIABLE` |
| `SMOKE_EMPTY_CHECK` | `VALID_STRATIFIABLE` |
| `SMOKE_POSITIVE_SELF_ANALYZE` | `CANONICAL_STRATIFIABLE` |
| `SMOKE_POSITIVE_SELF_CHECK` | `VALID_STRATIFIABLE` |
| `SMOKE_NEGATIVE_SELF_ANALYZE` | `CANONICAL_UNSTRATIFIABLE` |
| `SMOKE_NEGATIVE_SELF_CHECK` | `VALID_UNSTRATIFIABLE` |
| `SMOKE_AGGREGATE_SELF_ANALYZE` | `CANONICAL_UNSTRATIFIABLE` |
| `SMOKE_AGGREGATE_SELF_CHECK` | `VALID_UNSTRATIFIABLE` |

Manual summation is eight calls, eight checks, zero failures, agreeing with the report aggregates. There is no missing/skipped/duplicate scenario, source-error marker, in-flight/unassessed entry or abort record. The exact sequence/counts/RETURNED outcomes and zero failures satisfy the previously reviewed launcher complete/PASS predicate. Outer receipt `status=PASS`, report `status=PASS`, `complete=true` and `exit_code=0` agree. The parent separately identifies actual tool completion `cellg3:831` as exit 0; this readback does not substitute a new run or infer exit status solely from the PASS word.

## Once-only markers, event order and source lineage

- STARTED and RETURNED contain the same operation, command, planned case count 4, maximum public callbacks 8, source commit, oracle revision and launcher hash. They share the exact start marker `2026-10-31T23:05:22.302Z`; the returned marker is `2026-10-31T23:05:22.991Z`, and `retry_allowed=false`. These form one matching supplied event pair, consistent with the parent's once-only action report. No second action is requested, inferred or performed. This is not a survey of process/global execution history.
- The prepared record is dated `2026-10-31T22:50:25.541765+00:00`; the fresh content check is dated `2026-10-31T23:03:56.563002+00:00`, preceding the matched start/return markers. Timestamps are checked only for project-event order; no elapsed-time, throughput, performance or capacity value is computed/inferred.
- All four records identify source commit `49786aa027bd8161a6bb7ca359a3c0fa1d6ca1c7` and oracle revision `002`. Report `source_revision=49786aa0-with-oracle002` agrees with that commit prefix/revision.
- All eight project-file names, byte counts and SHA-256 strings in the fresh check match the prepared inventory, with no extra/missing/duplicate member and every fresh `exact` flag true. The files are API initializer, producer, checker, oracle initializer, oracle source, test initializer, corrected source suite and launcher. The launcher SHA `3a6132816e0f458ba6f92a04bc3c0abaad12cd836b89c33e68370cdebc3c73d9` also matches both run markers. This confirms **recorded lineage consistency**; this lane did not independently reread/rehash the eight source files or make a stronger runtime-byte attestation.
- The prepared/fresh status records remain historical preparation/checkpoint records, not competing later result claims. Their earlier closed-gate status is not a contradiction of the separately authorized subsequent action. The fresh check has `pending_call=null` at its own checkpoint.

## Exact coverage and remaining boundary

Observed evidence is limited to empty n=0, positive self-loop n=1, negative self-loop n=1 and aggregate self-loop n=1, with analyze and checker reached for each. Canonical-core and valid-certificate classifications are the reviewed harness's fixed results; the receipt does not contain raw certificates/graphs or independently prove arbitrary auxiliary relations beyond that harness/checker path.

No additional semantic fixture, malformed graph/certificate, non-BFS control, metamorphic relation, raw-cap case, optional 4105-graph domain, nontrivial SCC/path case, performance test or broad suite is established by these four cases. Those broader empirical scopes remain unrun/not accepted by this receipt. Item4 remains incomplete; item4.1 has only this tiny observed unit, not broad/end-to-end acceptance. No Datalog dependency extraction/evaluation, aggregate-language theorem, native syntax, SQL/host integration or held action is released.

The records contain fixed project IDs/statuses/logical counts, content identity and event markers, not environment/platform/version/process/resource inventories or exception/traceback data. No computer inspection, source replay, parse/compile/probe, Codex/subagent, external publication or Git action occurred in this readback lane. Frozen originals and prior peer records are unchanged; all writes are confined to peer revision005. Exact pending calls/approvals after final write: none. No further unit permission is inferred; all old stopped saves/dependent native syntax remain **HOLD unchanged**.
