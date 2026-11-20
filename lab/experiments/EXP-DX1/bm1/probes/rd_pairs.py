"""Operate the published short RD1 pairs with explicit slot and report checks."""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

EXP = Path("lab/experiments/EXP-DX1")
PLANS = (
    ("global", "off"),
    ("closure", "off"),
    ("closure", "install"),
)


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def get(file):
    return json.loads(file.read_bytes())


def put(file, value):
    with file.open("x") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")


def prefix(r, name):
    assert r["item"]==28 and r["tag"] in ("rdpairn20","rdpairn20b")
    assert name in {"small","global","closure","install"}
    return f"tx2-dxt1-rd1p3-{r['tag']}-{name}"


def summarize(root, r, name, population, coverage, strategy, start):
    # [DX-BM1] Why: require actual matched writes, terminal arms and the same oracle format as the published producer.
    # Rejected: scoring from a wrapper exit code or borrowing the earlier pair's zero ledger.
    base=prefix(r,name)
    arms=[]
    for mode in ("zero","ladder"):
        slot=base+"-"+mode
        arm=root/"evidence"/slot
        report=arm/"driver/ns-report.json"
        writer=arm/"driver/ns-writes.jsonl"
        doc=get(report)
        config=doc["config"]
        trace=get(arm/"trace-run.json")
        assert doc.get("endedAt"), doc.get("error","Native report has no terminal clock")
        assert (arm/"head.txt").read_text().strip()==r["source"]
        assert trace["source"]==r["source"] and trace["slot"]==slot
        driver,=get(arm/"driver-container.json")
        assert driver["Name"]=="/"+slot+"-driver"
        assert any(m["Type"]=="bind" and m["Source"]==m["Destination"]==str(root/"evidence") for m in driver["Mounts"])
        assert r["start"]<=start<=dt.datetime.fromisoformat(doc["startedAt"]).timestamp()<=dt.datetime.fromisoformat(doc["endedAt"]).timestamp()
        assert doc["format"]=="tx2-ns-report/2" and doc["verdictPlanId"]=="rd1-reader-diagnostic/1"
        assert (config["profile"],config["rungSubjects"],config["zeroReaders"],config["levelS"])==("smoke",population,mode=="zero",20)
        assert config["replicaHistoryCoverage"]==coverage and config["replicaHistoryMiB"]==192
        assert config["historicalFallback"]==strategy
        assert config["expectedStateRetention"]=="worker-journal" and config["receiptCapture"]=="replica-worker"
        seed=doc["seed"]
        assert seed["complete"] and seed["seededSubjects"]==seed["plannedSubjects"]==population
        assert seed["assertionsMatchClosedForm"] and seed["failureCount"]==0
        assert writer.stat().st_size>0
        assert all(not (arm/f"remaining-{kind}.txt").read_text().strip() for kind in ("containers","networks","volumes"))
        complete=doc["status"]=="DONE" and not doc.get("finalizationErrors")
        if mode=="ladder":
            assert sha(arm/"input/ns-writes.jsonl")==arms[0]["writerSha256"]==doc["matchedBaseline"]["sha256"]
            assert sha(arm/"input/ns-report.json")==arms[0]["reportSha256"]
            observed={p["name"]:p for p in doc["phases"]}
            assert {"baseline","L256","L1024","recovery","p4mix"}<=set(observed)
            assert observed["L256"]["readers"]==256 and observed["L1024"]["readers"]==1024
            oracle=doc["oracle"]
            exact=doc["correctness"]
            complete=complete and bool(oracle and oracle["status"]=="PASS" and oracle["mismatchCount"]==0 and oracle["reads"]>0)
            complete=complete and exact["reads"]>0 and exact["violations"]==exact["errors"]==0
        arms.append({"slot":slot,"scope":doc["scope"],"source":r["source"],"status":doc["status"],"complete":complete,
                     "reportSha256":sha(report),"writerSha256":sha(writer),"seeded":seed["seededSubjects"],
                     "correctness":doc["correctness"],"oracle":doc["oracle"],"stressHeadroom":doc["client"].get("stressHeadroom"),
                     "phases":doc["pooledPhases"]})
    assert arms[0]["scope"]!=arms[1]["scope"]
    return {"name":name,"source":r["source"],"start":start,"people":population,"coverage":coverage,"fallback":strategy,"arms":arms}


def operate(r, action):
    root=Path(r["root"])
    assert re.fullmatch(r"/var/tmp/triplex-w1/rdpairn20b?",str(root))
    repo,node=root/"build/repository",root/"build/tools/bin/node"
    # [DX-BM1] Why: the native driver mounts the platform evidence root, which must contain the baseline and oracle inputs.
    # Rejected: a separate stack evidence directory that is visible only to the host launcher.
    env=dict(os.environ,DX_BARE_METAL="1",DOCKER_HOST="unix:///var/run/docker.sock",
             DX_BARE_METAL_ROOT=str(root),DX_STACK_EVIDENCE=str(root/"evidence"),
             DX_NS_PROFILE="smoke",DX_MATCH_DURATION_S="115",DX_R3_TRY_LOCK="1",
             TRIPLEX_TRACE_LEVEL="summary",DX_CPUS_GW_READ="4,8",DX_CPUS_DRIVER="3,5,6,7,9,10,11",
             DX_MAIN_CPU="3",DX_WORKER_CPUS="5,6,7,9,10,11",DX_DRIVER_MEMORY="48g")
    env["PATH"]=str(node.parent)+":"+env["PATH"]

    def command(*args, timeout=30):
        return subprocess.check_output(list(map(str,args)),cwd=repo,env=env,text=True,timeout=timeout).strip()

    marker=root/"pair-active.json"

    def clean():
        if not marker.is_file():return
        binding=get(marker)
        base=prefix(r,binding["name"])
        assert binding["request"]==r["requested"] and binding["source"]==r["source"]
        for mode in ("zero","ladder"):
            slot=base+"-"+mode
            if command("bash",EXP/"stack/up.sh",slot,"--inventory"):
                assert (root/"evidence"/slot/"head.txt").read_text().strip()==r["source"]
                command("bash",EXP/"stack/down.sh",slot,"--volumes",timeout=120)
                assert not command("bash",EXP/"stack/up.sh",slot,"--inventory")
        lock=root/"locks/measure"
        if lock.is_dir():
            owner=get(lock/"owner.json")
            assert owner["kind"]=="full-pair" and owner["id"]=="DX-T1"
            assert not Path(f"/proc/{owner['pid']}").exists()
            (lock/"owner.json").rename(root/(binding["name"]+"-reclaimed-owner.json"))
            lock.rmdir()
        receipt=root/(binding["name"]+"-cleanup.json")
        value={**binding,"remaining":[]}
        if receipt.is_file():assert get(receipt)==value
        else:put(receipt,value)
        marker.unlink()

    if action=="cleanup":
        clean()
        return
    assert action=="run" and not command("git","status","--porcelain")
    for d in (root/"evidence",root/"locks"):
        d.mkdir(parents=True)
    plan=[("small",1000,*PLANS[0]),("global",10000,*PLANS[0]),("closure",10000,*PLANS[1]),("install",10000,*PLANS[2])]
    for name,people,coverage,strategy in plan:
        assert not command("docker","ps","-q")
        start=time.time()
        put(marker,{"name":name,"request":r["requested"],"source":r["source"],"start":start})
        cmd=["bash",EXP/"t1/run.sh","pair",prefix(r,name),"--rung","10k",
             "--seed-budget-s","360","--reader-ladder-only","--rolling-read-smoke","--rd1-read-diagnostic",
             "--level-s","20","--reader-threads","6","--reader-trace-every","64","--receipt-capture","replica-worker",
             "--expected-state-retention","worker-journal","--replica-history-coverage",coverage,"--replica-history-mib","192",
             "--replica-historical-fallback",strategy]
        if people==1000:cmd += ["--subjects","1000"]
        if strategy=="install":cmd += ["--replica-installed-history-mib","32"]
        try:
            with (root/(name+".log")).open("x") as log:
                result=subprocess.run(["timeout","--signal=TERM","--kill-after=30s","28m",*map(str,cmd)],cwd=repo,env=env,
                                      stdout=log,stderr=subprocess.STDOUT,timeout=1750)
            put(root/(name+"-exit.json"),{"source":r["source"],"name":name,"returncode":result.returncode,"start":start})
        finally:
            clean()
        try:
            row=summarize(root,r,name,people,coverage,strategy,start)
            put(root/(name+"-reading.json"),row)
            if name=="small" and not all(arm["complete"] for arm in row["arms"]):
                raise RuntimeError("Native RD1 small pair lacks complete matching observations")
        except (AssertionError, KeyError, ValueError, OSError, RuntimeError) as error:
            put(root/(name+"-collector-error.json"),{"source":r["source"],"name":name,"error":repr(error)})
            if name=="small":raise


if __name__=="__main__":
    assert sys.platform=="linux" and os.getuid()==0
    operate(get(Path(sys.argv[2])),sys.argv[1])
