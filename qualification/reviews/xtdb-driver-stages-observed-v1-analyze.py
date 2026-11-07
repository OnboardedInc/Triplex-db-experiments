"""Derive driver-callback attribution from retained, already verified bytes.

This is an analyst's read-only calculation, not another engine experiment.
The real pinned lazy Query callbacks and the public runner share performance.now;
their clocks do not independently locate wire, engine, CPU or indexing phases.
"""
import collections
import hashlib
import json
import math
import pathlib
import statistics

ROOT = pathlib.Path(__file__).resolve().parents[2]
RUN = "xtdb-driver-stages-observed-v1/0001"
DIRECTORY = ROOT / ".devloop/jobs/xtdb-driver-stages-observed-v1/attempts/0001"
ARTIFACTS = DIRECTORY / "artifacts"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_bytes())


def lines(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def stats(values):
    ordered = sorted(values)
    assert ordered
    return {
        "count": len(ordered),
        "sumMs": sum(ordered),
        "meanMs": statistics.mean(ordered),
        "p50Ms": ordered[math.ceil(len(ordered) * 0.5) - 1],
        "p99Ms": ordered[math.ceil(len(ordered) * 0.99) - 1],
        "maxMs": ordered[-1],
    }


terminal = read(DIRECTORY / "terminal.json")
assert terminal["status"] == "completed_verified_bytes"
assert terminal["cleanup"]["groupGone"] is True
outputs = {entry["path"]: entry for entry in terminal["outputs"]}
for name in ["events.jsonl", "report.json", "xtdb-driver-trace.jsonl"]:
    assert sha(ARTIFACTS / name) == outputs["artifacts/" + name]["sha256"]
report = read(ARTIFACTS / "report.json")
events = lines(ARTIFACTS / "events.jsonl")
trace = lines(ARTIFACTS / "xtdb-driver-trace.jsonl")
origin = report["clock"]["monotonicOrigin"]
assert trace[0]["type"] == "trace-header"
assert trace[-1]["type"] == "trace-footer"
assert trace[-1]["status"] == "COMPLETE"
issues = {event["queryId"]: event for event in trace if event["type"] == "query-issued"}
settlements = {
    event["queryId"]: event
    for event in trace
    if event["type"] == "query-driver-settlement"
}
assert len(issues) == len(settlements) == 2370


def when(event):
    return event["atProcessMonotonicMs"] - origin


def kinds(queries):
    return dict(collections.Counter(query["kind"] for query in queries))


def driver_spans(queries):
    grouped = collections.defaultdict(list)
    for query in queries:
        settled = settlements[query["queryId"]]
        assert settled["status"] == "fulfilled"
        grouped[query["kind"]].append(settled["afterHandlerDispatchMs"])
    return {kind: stats(values) for kind, values in grouped.items()}


writes = [event for event in events if event["type"] == "write"]
reads = [event for event in events if event["type"] == "read"]
assert len(writes) == 6 and len(reads) == 480
assert all(write["reconciled"] for write in writes)
assert all(event["ok"] for event in reads)
writer_pools = {
    query["poolId"]
    for query in issues.values()
    if query["kind"] == "begin" and when(query) >= 0
}
assert len(writer_pools) == 1
writer_pool = next(iter(writer_pools))
all_pools = {event["poolId"] for event in trace if event["type"] == "pool-created"}
assert len(all_pools) == 2
reader_pool = next(iter(all_pools - writer_pools))
writer_stages = []
for ordinal, write in enumerate(writes, 1):
    queries = [
        query
        for query in issues.values()
        if query["poolId"] == writer_pool
        and write["writeStartedMs"] <= when(query) < write["ackMs"]
    ]
    begins = [query for query in queries if query["kind"] == "begin"]
    assert len(begins) == 1
    begin = begins[0]
    before = [query for query in queries if when(query) < when(begin)]
    assert kinds(before) == {
        "await-token-setting": 22,
        "basis-select": 1,
        "claim-select": 1,
        "identity-lookup-select": 20,
    }
    lookups = [query for query in before if query["kind"] == "identity-lookup-select"]
    for left, right in zip(lookups[::2], lookups[1::2], strict=True):
        assert left["sqlSha256"] == right["sqlSha256"]
        assert left["parameters"] == right["parameters"]
        assert settlements[left["queryId"]]["resultRowCount"] == 1
        assert settlements[right["queryId"]]["resultRowCount"] == 1
    commits = [query for query in queries if query["kind"] == "commit-sync-composite"]
    shows = [query for query in queries if query["kind"] == "await-token-result"]
    receipts = [query for query in queries if query["kind"] == "operation-receipt-select"]
    assert len(commits) == len(shows) == len(receipts) == 1
    commit, show, receipt = commits[0], shows[0], receipts[0]
    assert begin["leaseId"] == commit["leaseId"] == show["leaseId"]
    submit = [query for query in queries if query["leaseId"] == begin["leaseId"]]
    assert kinds(submit) == {
        "begin": 1,
        "assert": 4,
        "assertion-insert": 1,
        "metadata-insert": 3,
        "commit-sync-composite": 1,
        "await-token-result": 1,
    }
    visibility = [
        query
        for query in issues.values()
        if query["poolId"] == writer_pool
        and write["visibilityProbeStartedMs"] <= when(query) < write["visibleMs"]
    ]
    assert kinds(visibility) == {
        "await-token-setting": 3,
        "basis-select": 1,
        "integer-presence-select": 1,
        "answer-or-other-select": 1,
    }
    writer_stages.append({
        "ordinal": ordinal,
        "commandId": write["commandId"],
        "offeredMs": write["offeredMs"],
        "writeStartedMs": write["writeStartedMs"],
        "ackMs": write["ackMs"],
        "visibleMs": write["visibleMs"],
        "scheduledOfferToStartMs": write["writeStartedMs"] - write["offeredMs"],
        "publicStartToAckMs": write["ackMs"] - write["writeStartedMs"],
        "publicStartToBeginIssueMs": when(begin) - write["writeStartedMs"],
        "beforeBeginKinds": kinds(before),
        "beforeBeginDriverSpans": driver_spans(before),
        "duplicateLookupPairs": 10,
        "duplicateProof": "Consecutive query SQL digests and typed parameter descriptors match; each returned one row at the same transaction source cut",
        "submitKinds": kinds(submit),
        "beginIssueToShowSettlementMs": when(settlements[show["queryId"]]) - when(begin),
        "submitDriverSpans": driver_spans(submit),
        "showSettlementToPublicAckMs": write["ackMs"] - when(settlements[show["queryId"]]),
        "receiptDriverSpanMs": settlements[receipt["queryId"]]["afterHandlerDispatchMs"],
        "ackToVisibleMs": write["visibleMs"] - write["ackMs"],
        "visibilityKinds": kinds(visibility),
        "visibilityDriverSpans": driver_spans(visibility),
    })

pool_summaries = []
for pool in sorted(all_pools):
    queries = [query for query in issues.values() if query["poolId"] == pool]
    reserves = [
        event["waitMs"]
        for event in trace
        if event["type"] == "reserve-fulfilled" and event["poolId"] == pool
    ]
    pool_summaries.append({
        "poolId": pool,
        "role": "writer-root-and-visibility" if pool == writer_pool else "reader-root",
        "meaning": "Separate pools observed; role corroborated by existing runner source and actual BEGIN/claim/identity calls",
        "queryKindsWholeProcess": kinds(queries),
        "queryKindsIssuedInsideTimedWindow": kinds([
            query for query in queries if 0 <= when(query) < 30000
        ]),
        "driverSpansWholeProcess": driver_spans(queries),
        "reserveWaitWholeProcess": stats(reserves),
    })

manifest = read(ROOT / "qualification/load-jobs/xtdb-driver-stages-observed-v1/manifest.json")
pins = {entry["path"]: entry for entry in manifest["inputs"]}
source_witnesses = []
for relative, mechanism in [
    ("packages/qualification/load/runner.ts", "Separate writer/read roots; single monotonic origin; public ACK and visibility events"),
    ("packages/core/src/store/TriplesLive.ts", "Reserved-write validation calls getById before adapter.retract for each target"),
    ("packages/xtdb/src/XtdbStorageAdapter.ts", "retract independently invokes queryRows by id at sourceK; committed source plus pending overlay; native document key already persisted"),
    ("packages/xtdb/src/TransactionContext.ts", "Per-transaction sourceK/rows/claims with no committed identity read cache"),
    ("packages/xtdb/src/XtdbClient.ts", "Reserved client query prepends await token; native submit has BEGIN, COMMIT SYNC, SHOW, and later receipt resolution"),
]:
    assert sha(ROOT / relative) == pins[relative]["sha256"]
    source_witnesses.append({"path": relative, "sha256": pins[relative]["sha256"], "mechanism": mechanism})

ack_sum = sum(stage["publicStartToAckMs"] for stage in writer_stages)
before_sum = sum(stage["publicStartToBeginIssueMs"] for stage in writer_stages)
lookup_sum = sum(stage["beforeBeginDriverSpans"]["identity-lookup-select"]["sumMs"] for stage in writer_stages)
strong = read(ROOT / "qualification/evidence/xtdb-driver-stages-observed-v1-strong-bytes.json")
cohort = read(ROOT / "qualification/evidence/xtdb-driver-stages-observed-v1-cohort.json")
assert cohort["decision"] == "NO_OTHER_HEAVY_CLIENT_ATTEMPT_OVERLAP"
result = {
    "format": "triplex-xtdb-driver-stage-attribution/1",
    "reference": RUN,
    "authority": "Derived calculation over anchored raw public events and driver callbacks; no new engine queries",
    "terminalSha256": sha(DIRECTORY / "terminal.json"),
    "rawEventsSha256": sha(ARTIFACTS / "events.jsonl"),
    "driverTraceSha256": sha(ARTIFACTS / "xtdb-driver-trace.jsonl"),
    "reportSha256": sha(ARTIFACTS / "report.json"),
    "analysisSourceSha256": sha(pathlib.Path(__file__)),
    "clockJoin": {"processTimeOrigin": trace[0]["processTimeOrigin"], "publicMonotonicOrigin": origin},
    "sourceWitnesses": source_witnesses,
    "actualCohort": {"completeOtherHeavyAttempts": len(cohort["completeHeavyAttemptIntervals"]), "overlaps": cohort["overlaps"], "foundationsCharged": ["foundation-xtdb:3GiB/2CPU", "foundation-qlever:2GiB/1.5CPU"]},
    "readAndWriterDiagnostic": {"classes": strong["classes"], "writer": strong["writer"], "clientsWithProgress": strong["clientsWithProgress"], "rejectedReads": strong["rejectedReads"], "actualDispatch": report["observations"]},
    "writerStages": writer_stages,
    "aggregateWriterAttribution": {"publicAckWallSumMs": ack_sum, "beforeBeginWallSumMs": before_sum, "beforeBeginFractionOfAckWall": before_sum / ack_sum, "identityDriverSpanSumMs": lookup_sum, "identityDriverFractionOfAckWall": lookup_sum / ack_sum, "identityLookupSelectCount": 120, "duplicateLookupPairs": 60},
    "pools": pool_summaries,
    "observer": {"traceBytes": (ARTIFACTS / "xtdb-driver-trace.jsonl").stat().st_size, "recordedWriteOverheadMs": trace[-1]["observerWriteMilliseconds"], "meaning": "Only synchronous trace-write calls are measured; wrapper/serialization/callback overhead is not fully isolated"},
    "interpretation": [
        "The observed source-identity staging path dominates ACK in this small diagnostic; duplicate lookups are observed, not only source-counted.",
        "Callback wall spans include transport/queue/driver/server contributions; they are not independent wire execution, engine CPU or exact indexing measurements. COMMIT SYNC remains composite.",
        "No other heavy canonical client overlapped; native engine background work, host activity and controller publication tails are not proved idle.",
        "No causal comparison to the earlier co-run failed Datalog/native controls, no capacity/SLA/promotion or complete configured-entity scale claim.",
        "A follow-up can separately test per-transaction duplicate-read reuse or an existing native-document-key predicate with unchanged writes/cuts; neither change is implemented or selected here.",
    ],
}
out = ROOT / "qualification/reviews/xtdb-driver-stages-observed-v1-attribution.json"
with out.open("x") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps({"output": str(out.relative_to(ROOT)), "writerAckWallSumMs": ack_sum, "beforeBeginFraction": before_sum / ack_sum, "identityDriverFraction": lookup_sum / ack_sum, "writers": len(writer_stages), "readRows": len(reads)}))
