"""Offline ambiguity control only: no native transport is imported or called."""
import gzip
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/qlever-native-fault-preflight-v2"))
from continuity import capture
from read_bounds import ReadOnlyRefusal, safe_error


class CountFixture:
    def __init__(self, counts):
        self.counts, self.calls = counts, []

    def select(self, query, **_options):
        self.calls.append({"kind": query.kind, "channel": query.channel})
        if query.kind == "namespace-absent":
            return []
        if query.kind == "count":
            return [{"count": {"type": "literal", "value": str(self.counts[query.channel])}}]
        raise AssertionError("Payload page must not be reached by this control")


parent = ROOT / ".runtime/reviews/qlever-preflight-count-ambiguity-v1"
parent.mkdir(parents=True, exist_ok=False)
results = []
for name, counts in [
    ("named-over-budget", {"named": 200001, "default": 0}),
    ("named-zero-default-over-budget", {"named": 0, "default": 200001}),
]:
    fixture = CountFixture(counts)
    output = parent / (name + ".gz")
    try:
        capture(fixture, output, packet_prefix="urn:triplex:fault-v2:00000000-0000-0000-0000-000000000001:")
        raise AssertionError("Expected the frozen count budget refusal")
    except ReadOnlyRefusal as error:
        raw = output.read_bytes()
        results.append({"case": name, "error": safe_error(error), "bytes": len(raw),
                        "decompressedBytes": len(gzip.decompress(raw)),
                        "gzipSha256": hashlib.sha256(raw).hexdigest(), "calls": fixture.calls})
assert results[0]["error"] == results[1]["error"]
assert results[0]["gzipSha256"] == results[1]["gzipSha256"]
assert all(entry["bytes"] == 20 and entry["decompressedBytes"] == 0 for entry in results)
assert results[0]["error"]["messageSha256"] == "f343d6a1e01cf6c01a83fb38d0f34e2e9bfae26abeacbc016ab33b49d7f0a2a2"
receipt = {"format": "triplex-preflight-count-channel-ambiguity-component/1",
           "scope": "OFFLINE_FIXED_COUNT_FIXTURES_NOT_NATIVE_OBSERVATION", "results": results,
           "decision": "The retained refusal and empty gzip do not uniquely identify named versus default channel",
           "sourceSha256": hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
target = ROOT / "qualification/reviews/qlever-native-preflight-v2-count-counterexample.json"
with target.open("x") as stream:
    json.dump(receipt, stream, indent=2)
    stream.write("\n")
print(json.dumps({"receipt": str(target.relative_to(ROOT)), "cases": 2, "nativeCalls": 0}))
