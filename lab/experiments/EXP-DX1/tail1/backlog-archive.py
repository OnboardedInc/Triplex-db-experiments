#!/usr/bin/env python3
"""Compare native tx-with reads and callback rollups in the matched BM1 archive."""

from collections import defaultdict
from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
from statistics import mean
import sys

source = Path(__file__).with_name("matched-tail.py")
spec = spec_from_file_location("matched_tail", source)
matched = module_from_spec(spec)
spec.loader.exec_module(matched)


def stats(rows):
    fields = ("ackMs", "nativeEvaluationMs", "ownSqlMs", "ownSqlReads", "evaluationOtherMs",
              "peerWaitUnassignedMs", "olderNativeWritesStillAwaiting")
    return {key: {"mean": mean(series), "nonzero": sum(x > 0 for x in series), **matched.quantiles(series)}
            for key in fields for series in ([r[key] for r in rows],)}


def analyze(root):
    proof, request, stop, comparison, read, traces, inventory = matched.bundle(root)
    by_population = defaultdict(list)
    results = []
    keys = ("TransactionMsec", "TransactionApplyMsec", "StorageGetMsec", "StoragePutMsec", "LogWriteMsec",
            "ObjectCache", "MemoryIndexMB", "GcPauseMsec")
    for i, arm in enumerate(comparison["arms"], 1):
        rows, meta = matched.joined_arm(i, arm, read, traces[i], request, stop)
        steady = [r for r in rows if r["dueMs"] >= 2000]
        assert len(steady) == 1694
        by_population[arm["population"]].extend(steady)
        tx, _ = matched.records(traces[i]["tx.jsonl"][0])
        # [DX-TAIL1] Why: callback buckets overlap startup and seed or have absent neighbors.
        # Rejected: dividing time-slice metric totals by the exact number of scored saves.
        metrics = [{"sampleOffsetMs": r["at"] - meta["startAtMs"],
                    "metrics": {k: r["metrics"][k] for k in keys if k in r["metrics"]}}
                   for r in tx if r.get("type") == "metrics"]
        results.append({"identity": meta["identity"], "population": arm["population"],
                        "sha256": meta["members"], "n": len(steady),
                        "steady": stats(steady), "callbackRollups": metrics})
    timing_logs = [p for p in inventory if p.startswith("results/arm-") and any(
        p.endswith(s) for s in ("/tx.log", "/pg.log", "/tx-datomic.log", "/tx.jfr", "/tx.jfr.gz", "/tx.jfr.jsonl.gz"))]
    return {"source": proof["source"], "rawArchiveSha256": proof["raw"]["sha256"],
            "joinAnalyzerSha256": matched.sha(source.read_bytes()),
            "analyzerSha256": matched.sha(Path(__file__).read_bytes()), "nativeEventFiles": timing_logs,
            "arms": results, "pooled": {name: {"n": len(rows), **stats(rows)} for name, rows in by_population.items()}}


if __name__ == "__main__":
    result = analyze(Path(sys.argv[1]))
    matched.write_json(Path(sys.argv[2]), result)
