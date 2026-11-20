"""Replay the current prepared erasure and matched guard result envelopes."""

import hashlib
import json
import math
from pathlib import Path
import sys


def get(path):
    return json.loads(path.read_bytes())


def sha(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file,"sha256").hexdigest()


def stats(rows):
    values = sorted(r["ms"] for r in rows)
    assert values and math.isfinite(values[-1]) and values[0] >= 0
    return {"n":len(values), "p50":values[math.ceil(len(values)*.5)-1], "p99":values[math.ceil(len(values)*.99)-1]}


def matching(directory, native, name):
    file = directory/(name+".json")
    result = get(file)
    assert {k:v for k,v in result.items() if k != "data"} == native
    assert file.stat().st_mtime >= (directory/"native.json").stat().st_mtime or not native.get("source")
    return result["data"]


def check_fast(directory, expected_saves, expected_publications):
    native = get(directory/"native.json")
    assert get(directory/"driver-exit.json") == {"code":0,"signal":None}
    final = matching(directory,native,"fast-result")
    release = matching(directory,native,"fast-publication")
    entries = release["outputs"]
    assert len(entries) == len(release["wire"]) == 2*expected_publications+1
    assert len({r["seq"] for r in entries}) == len({r["t"] for r in entries}) == len(entries)
    assert all(r["start"] <= r["end"] and 0 <= r["ms"] and r["count"] <= r["identities"] for r in entries)
    for key,prefix in (("single","fresh-1-"),("hundred","fresh-100-")):
        subset = [r for r in entries if r["scenario"].startswith(prefix)]
        assert stats(subset) == {k:final[key][k] for k in ("n","p50","p99")}
        assert len(subset) == expected_publications
    assert final["aged"] == entries[0]
    summaries = {}
    for name,key in (("control-before","a"),("cleanup","b"),("control-after","a2"),("protected-save","protectedSave")):
        arm = matching(directory,native,"fast-traffic-"+name)
        assert len(arm["writes"]) == expected_saves
        for kind in ("writes","reads","feed"):
            assert stats(arm[kind]) == {k:final[key][kind][k] for k in ("n","p50","p99")}
        summaries[name] = {k:v for k,v in arm["summary"].items() if k in ("writes","reads","feed")}
    return {"facts":final["facts"],"publicationCount":len(entries),"savedPerBlock":expected_saves,
            "resultSha256":sha(directory/"fast-result.json"),"observed":final,"summaries":summaries}


def check_guarded(directory):
    native = get(directory/"native.json")
    assert get(directory/"driver-exit.json") == {"code":0,"signal":None}
    body = matching(directory,native,"guarded-comparison")
    labels = ("control-before","guarded-before","control-middle","guarded-after","control-after")
    observations = body["observations"]
    assert [x["label"] for x in observations] == list(labels)
    for observation in observations:
        arm = matching(directory,native,"traffic-"+observation["label"])
        assert len(arm["saved"]) == 500 and arm["summary"]["checkedReadback"]
        for raw,key in (("saved","writes"),("reads","reads")):
            assert stats(arm[raw]) == observation[key]
        assert arm["summary"] == {k:observation[k] for k in arm["summary"]}
    assert body["erased"]["seq"] == 1 and len(body["erased"]["identities"]) == 1
    for key,index in (("beforeErasure",1),("afterErasure",3)):
        for offset,pair in zip((-1,1),body[key],strict=True):
            control=observations[index+offset]
            assert pair["against"] == control["label"]
            for name,kind in (("saves","writes"),("reads","reads")):
                assert pair[name] == {k:observations[index][kind][k]/control[kind][k] for k in ("p50","p99")}
    return {"facts":body["facts"],"savedPerBlock":500,"resultSha256":sha(directory/"guarded-comparison.json"),"observed":body}


def bench(root, source):
    stage, control = root/"stage/staged.json", root/"control-stage/staged.json"
    frozen = get(root/"checkpoint.json")
    assert frozen["source"] == source and frozen["stageSha256"] == sha(stage) and frozen["controlSha256"] == sha(control)
    people = 128 if root.name.endswith("-small") else 100000
    roles = {"transactor": {"collector":"G1","cores":1},"gateway":{"collector":"G1","cores":1}}
    for context in ("fast","guarded"):
        native = get(root/("measured" if context=="fast" else context)/"native.json")
        assert (native["source"],native["nonce"],native["people"],native["stageSha256"]) == (source,frozen["nonce"],people,sha(stage))
        if context=="guarded": assert native["controlSha256"] == sha(control)
        for role in roles:
            log=root/(context+"-"+role+"-gc.log")
            with log.open("rb") as stream:
                assert stream.read(3) == b"[20" and b"Using G1" in stream.read(4096)
            roles[role][context+"LogSha256"] = sha(log)
    return {"source":source,"people":people,"checkpointSha256":sha(root/"checkpoint.json"),"jvms":roles,
            "detached":check_fast(root/"measured",8 if people==128 else 500,2 if people==128 else 100),
            "guarded":check_guarded(root/"guarded")}


if __name__ == "__main__":
    work, source = sys.argv[1:]
    print(json.dumps(bench(Path(work),source),indent=2))
