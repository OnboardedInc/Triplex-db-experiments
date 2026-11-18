"""Check the terminal 1k smoke and its independently generated replay witness."""

import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys


def read_driver(run, name):
    plain = run / "driver" / name
    return plain.read_bytes() if plain.is_file() else gzip.decompress(
        plain.with_suffix(".json.gz").read_bytes()
    )


def verify(run, source):
    # [DX-BM1] Why: exact case bytes, sampled rows and run clocks govern admission.
    # Rejected: treating a controller exit or an oracle verdict string alone as exactness.
    subprocess.run(["sha256sum", "--check", "--status", "SHA256SUMS"], cwd=run, check=True)
    manifest = json.loads((run / "trace-run.json").read_bytes())
    trace = json.loads((run / "trace-summary.json").read_bytes())
    report = json.loads(read_driver(run, "ns-report.json"))
    case_bytes = read_driver(run, "oracle-case.json")
    case = json.loads(case_bytes)
    expected = json.loads(read_driver(run, "oracle-expected.json"))
    oracle = report["oracle"]
    correctness = report["correctness"]
    seed = report["seed"]
    assert manifest["tag"] == manifest["slot"] == trace["tag"] == run.name
    assert manifest["source"] == trace["source"] == (run / "head.txt").read_text().strip() == source
    assert manifest["hostPlatform"] == "linux-bare-metal"
    assert datetime.datetime.fromisoformat(report["startedAt"]).timestamp() * 1000 >= manifest["startedAt"]
    assert report["scope"].endswith(report["runTag"])
    assert trace["complete"] and not trace["errors"]
    assert report["status"] == "DONE" and report["config"]["profile"] == "smoke"
    assert seed["complete"] and seed["seededSubjects"] == 1000 and seed["assertionsMatchClosedForm"]
    assert not report["finalizationErrors"]
    assert correctness["reads"] == correctness["correct"] > 0 and correctness["violations"] == correctness["errors"] == 0
    assert oracle["status"] == oracle["oracleVerdict"] == oracle["receiptConsistency"] == "PASS"
    assert oracle["exitCode"] == oracle["mismatchCount"] == 0
    assert oracle["reads"] == oracle["modelCorrectOnSameReads"] > 0
    assert expected["caseSha256"] == hashlib.sha256(case_bytes).hexdigest()
    assert case["caseId"] == expected["caseId"] == "NS/" + report["runTag"]
    assert expected["verdict"] == expected["receiptConsistency"]["status"] == "PASS"
    wanted = {query["id"]: query["kind"] for query in case["queries"]}
    observed = {query["id"]: query["kind"] for query in expected["queries"]}
    assert len(wanted) == len(case["queries"]) == len(expected["queries"]) == oracle["entityQueries"] > 0
    assert wanted == observed
    print(f"{run.name} at {source}: {oracle['reads']} exact oracle reads, {correctness['reads']} exact model reads")


if __name__ == "__main__":
    verify(Path(sys.argv[1]), sys.argv[2])
