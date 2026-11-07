"""Three concurrent offline command-size cases; no QLever/native operations."""
from concurrent.futures import ThreadPoolExecutor
import dataclasses
import hashlib
import json
from pathlib import Path
import tempfile
import time

from broker import ManagedWriter, canonical
from test_broker import ModelWorker, request


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    fixture_root = root / ".qlever" / "managed-model"
    fixture_root.mkdir(parents=True, exist_ok=True)
    def case(count: int) -> dict:
        directory = Path(tempfile.mkdtemp(prefix=f"journal-cost-{count}-", dir=fixture_root))
        facts = tuple(f"private-command-value-{index}:" + "x" * 512 for index in range(count))
        prepared = request(f"size-{count}", facts=facts)
        full_request_bytes = len(canonical(dataclasses.asdict(prepared)))
        old_intent_bytes = len(canonical({"request": dataclasses.asdict(prepared), "request_digest": prepared.digest}))
        broker = ManagedWriter(directory / "broker", ModelWorker(directory / "worker"))
        started = time.monotonic()
        outcome = broker.commit(prepared)
        elapsed = time.monotonic() - started
        raw = broker.journal.read_bytes()
        records, _ = broker.load()
        intent_bytes = len(canonical(records[0])) + 1
        if outcome.status != "committed" or b"private-command-value" in raw or b"native_modify" in raw:
            raise AssertionError("Coordinator journal leaked payload or failed model commit")
        return {"assertionsPerCommand": count, "expectedProofRows": prepared.expected_count, "fullPreparedRequestBytes": full_request_bytes, "previousFullIntentEstimatedBytes": old_intent_bytes, "compactIntentRecordBytes": intent_bytes, "completeCoordinatorJournalBytes": len(raw), "nativeModelSnapshotBytes": broker.worker.snapshot.stat().st_size, "modelCommitSecondsIncludingFsync": elapsed, "payloadAbsentFromJournal": True, "fixture": str(directory.relative_to(root))}
    with ThreadPoolExecutor(max_workers=3) as pool:
        cases = list(pool.map(case, (10,100,500)))
    artifact = {"format":"qlever-managed-writer-offline-cost/1","at_ns":time.time_ns(),"status":"PASS_OFFLINE_METADATA_COST_ONLY","cases":cases,"concurrentCandidates":3,"nativeRequests":0,"sourceSha256":{name:hashlib.sha256((Path(__file__).parent/name).read_bytes()).hexdigest() for name in ("broker.py","test_broker.py","journal_cost.py")},"limitations":["Synthetic file-backed worker only; not native QLever latency or storage qualification","One observation per size; no percentiles","Previous full-intent size is serialization estimate, compact journal bytes are actual retained files","16MiB journal cap still requires a qualified retained segmentation/recovery strategy for command scale","All generated fixtures retained; no cleanup"]}
    path=root/"qualification"/"evidence"/f"qlever-managed-writer-cost-{artifact['at_ns']}.json"
    path.write_text(json.dumps(artifact,indent=2)+"\n")
    print(json.dumps({"artifact":str(path.relative_to(root)),"cases":cases,"status":artifact["status"]}))


if __name__ == "__main__":
    main()
