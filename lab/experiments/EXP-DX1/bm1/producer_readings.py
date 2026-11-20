"""Check small and full native result files against the producer's actual input records."""
import hashlib
import json
import math
from pathlib import Path
import re


def get(file):
    return json.loads(Path(file).read_bytes())


def digest(file):
    with Path(file).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


POOL_DIGEST="2720380f5b5e6f31fd632380e6ef6d16acc4d646735962d2cb908e0ab40e1146"


def nearest(values, percent):
    n=len(values)
    assert n and all(math.isfinite(x) and x>=0 for x in values)
    return sorted(values)[(percent*n+99)//100-1]


def group_phase(phase, raw, baseline, quiet_count):
    # [DX-BM1] Why: derive actual quiet and account p99 from the bound native offer rows.
    # Rejected: accepting a changed p99 with an unchanged raw-file checksum.
    assert all(phase.get(key)==value for key,value in raw.items() if key!="records")
    rows=raw["records"]
    assert {r["pos"] for r in rows}==set(range(raw["firstPosition"],raw["lastPosition"]+1))
    assert len(rows)==raw["count"]==len({r["id"] for r in rows})==len({r["pos"] for r in rows})
    assert raw["physical"]==len({r["t"] for r in rows})
    assert raw["wall"]>0 and raw["throughput"]==1000*len(rows)/raw["wall"]
    quiet=[r for r in rows if r["probe"]]
    assert len(quiet)==quiet_count
    assert all(r["account"]==9 and r["id"]==f"{raw['name']}-q-9-{int(r['id'].rsplit('-',1)[1])}" for r in quiet)
    assert {int(r["id"].rsplit("-",1)[1]) for r in quiet}==set(range(quiet_count))
    assert all(abs(r["started"]+r["elapsed"]-r["scheduled"]-int(r["id"].rsplit("-",1)[1])*100)<.001 for r in quiet)
    observed=nearest([r["scheduled"] for r in quiet],99)
    assert raw["quietMs"]["p99"]==observed and phase["quietP99Ratio"]==observed/baseline
    if "byAccount" in raw:
        assert {int(a) for a in raw["byAccount"]}=={r["account"] for r in rows}
        for account,stats in raw["byAccount"].items():
            latencies=[r["scheduled"] for r in rows if r["account"]==int(account)]
            assert stats["count"]==len(latencies)
            assert stats["commitMs"]["p50"]==nearest(latencies,50)
            assert stats["commitMs"]["p99"]==nearest(latencies,99)
    return observed


def group_arm(directory, arm, source, slot, start, *, pulse=False, small=False):
    identity=get(directory/"identity.json")
    assert arm==get(directory/"summary.json") and arm["arm"]==identity
    assert identity["source"]==source and identity["slot"]==slot and re.fullmatch(r"[a-f0-9-]{36}",identity["nonce"])
    assert get(directory/"cleanup.json")==dict(containers=[],volumes=[],networks=[])
    for file,hash_key in (("raw.json","rawSha256"),("seed-readback.json","seedReadbackSha256")):
        assert (directory/file).stat().st_mtime>=start-2
        assert arm[hash_key]==digest(directory/file)
    raw=get(directory/"raw.json")
    seed=get(directory/"seed-readback.json")
    assert identity["nonce"]==raw["nonce"] and arm["scope"]==raw["scope"] and arm["db"]==raw["db"]
    assert json.loads(raw["scope"])[3]==identity["nonce"]+"-load"
    assert seed["seedCut"]+1==raw["phases"][0]["firstPosition"] and seed["digest"]==arm["seed"]
    if small:
        assert seed["facts"]==10 and pulse
    else:
        assert seed["facts"]==16_245_050 and seed["digest"]==POOL_DIGEST
        assert [(s["account"],s["subjects"],s["facts"]) for s in raw["seeds"]]==[(i,10000,1624505) for i in range(10)]
    names=["alone","nine"] if pulse else ["alone","one","nine","all"]
    assert [p["name"] for p in raw["phases"]]==names==[p["name"] for p in arm["phases"]]
    baseline=raw["phases"][0]["quietMs"]["p99"]
    for phase, observations in zip(arm["phases"],raw["phases"]):
        group_phase(phase,observations,baseline,3 if small else 600)
    return raw


def capacity_rung(directory, source, size):
    # [DX-BM1] Why: validate the same result and sample files in the small native run and both large thin rungs.
    # Rejected: counting the producer's seed population from batch.json or trusting precomputed quantiles alone.
    inputs=get(directory/"inputs.json")
    result=get(directory/"result.json")
    for key in ("attempt","binding","mode","size","slot","source"):
        assert result[key]==inputs[key]
    assert result["source"]==source and result["size"]==size and result["mode"]=="int1-thin"
    assert re.fullmatch("[a-f0-9]{64}",result["binding"])
    receipt=result["latencyReceipt"]
    assert receipt["file"]=="latency-samples.json"
    file=directory/receipt["file"]
    assert digest(file)==receipt["sha256"]
    read=get(file)
    assert read["binding"]==result["binding"] and read["attempt"]==result["attempt"]
    assert [a["people"] for a in result["accounts"]]==[size]
    assert len(read["firstReads"])==size//100
    for name in ("commit","cold","resident","ryow"):
        values=sorted(read["samples"][name])
        assert values and all(math.isfinite(n) and n>=0 for n in values)
        n=len(values)
        assert result["latency"][name]==dict(n=n,p50=values[(n+1)//2-1],p99=values[(99*n+99)//100-1])
    return result
