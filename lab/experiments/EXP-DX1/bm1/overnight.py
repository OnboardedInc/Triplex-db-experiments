"""Supervise the published native workloads on the assigned Linux host."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import traceback
import subprocess
import sys
import time
import uuid
from producer_readings import capacity_rung, group_arm
from import_reading import tail_attempt

ROOT = Path("/var/tmp/triplex-bm1")
NIGHT = ROOT / "night-n19"
HERE = Path(__file__).resolve().parent
URL = "https://github.com/OnboardedInc/Triplex-db-experiments.git"
W1 = "exp/DX-W1-commit-tail-reads"
ACT = "exp/DX-ACT2-activation-100k"
# [DX-BM1] Why: the timeout belongs to the entire item, including its retry and data preparation.
# Rejected: inheriting the 24–72 hour limits of standalone research controllers.
ITEMS = {
    1: (W1, "w1", "502c8897", 4, "grpw1"),
    8: (W1, "w1", "7a6a7e9ef", 4, "pulsew4a"),
    9: (W1, "w1", "9ce599309", 1, "matchedn19"),
    11: (W1, "w1", "7a6a7e9ef", 1, "ceiln19"),
    12: (W1, "w1", "7a6a7e9ef", 1, "sizen19"),
    13: ("exp/DX-HA1-failover-move", "load1", "bd2ce3bf9", 2, "loadtailn19"),
    2: ("exp/DX-ACT1-activation", "import1", "eb154ca8", 5, "import-bm1n19"),
    10: (W1, "w1", "9ce599309", 1, "predecessorn19"),
    5: ("exp/DX-INT1", "int1", None, 5, "bm1n19int"),
    4: (ACT, "act2", "a9eb03b0", 4, "n19guard"),
    6: (ACT, "actv-delta", "eaee4e10", 4, "solon19"),
    3: (W1, "w1", "502c8897", 3, "w1trial01"),
}
ORDER = (1, 8, 11, 9, 12, 7, 10, 13, 5)
NEXT = {1:"enhanced-pulse", 8:"ceil-live10", 11:"thin-deep", 9:"size-ledger", 12:"readers", 7:"predecessor",
        10:"same-database-import", 13:"int1", 5:"collect", 6:"resume", 4:"collect", 3:"collect"}
EXP = Path("lab/experiments/EXP-DX1")
ENV = dict(os.environ, GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL="/dev/null",
           GIT_TERMINAL_PROMPT="0", DOCKER_HOST="unix:///var/run/docker.sock",
           DX_NATIVE_BOOTSTRAP_CACHE=str(ROOT / "day-p3r/checkout"), TURBO_TELEMETRY_DISABLED="1")


def stamp(t=None):
    return dt.datetime.fromtimestamp(time.time() if t is None else t, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def atom(file, text, mode=0o644):
    file = Path(file)
    tmp = file.with_name("." + file.name + "-" + uuid.uuid4().hex)
    with tmp.open("x") as stream:
        stream.write(text)
    tmp.chmod(mode)
    tmp.replace(file)


def put(file, data):
    atom(file, json.dumps(data, indent=2) + "\n")


def get(file):
    return json.loads(Path(file).read_bytes())


def command(*args, cwd=None, timeout=60, env=ENV):
    return subprocess.check_output(list(map(str,args)), cwd=cwd, env=env, text=True, timeout=timeout).strip()


def run(*args, cwd=None, timeout=None, env=ENV):
    subprocess.run(list(map(str,args)), check=True, cwd=cwd, env=env, timeout=timeout)


def active(unit):
    return command("systemctl", "show", unit, "-p", "ActiveState", "--value") in {"active","activating","deactivating","reloading"}


def status(item, state, start, following):
    line = f"item={item} state={state} since={stamp(start)} next={following}\n"
    atom(ROOT / "STATUS", line)
    print(stamp(), line.strip(), flush=True)


def digest(p):
    with Path(p).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def collector_cases():
    repo=HERE.parents[3]
    rel=EXP/"bm1/COLLECTOR-CASES.json"
    # [DX-BM1] Why: a new source-bound smoke can admit the next item without restarting an active queue.
    # Rejected: reading an arbitrary file or changing the running supervisor's checkout.
    run("git","-c","credential.helper=","fetch","--quiet","--no-tags","--depth=1",URL,"refs/heads/exp/DX-BM1-bare-metal",
        cwd=repo,timeout=45)
    return json.loads(command("git","show","FETCH_HEAD:"+str(rel),cwd=repo))


def registered_sample(item, source):
    # [DX-BM1] Why: require an identified real sample and the two acceptance records for this executable revision.
    # Rejected: authorizing an expensive campaign from a matching Git SHA and a boolean alone.
    record=collector_cases().get(str(item))
    if not record or record.get("source")!=source or record.get("state")!="verified":
        raise RuntimeError("No small real producer output has passed this collector for the pinned source")
    assert record["file"]=={5:"result.json",6:"result.json",13:"tail-128.offers.json"}[item]
    for key,n in (("source",40),("sampleSource",40),("sha256",64),("producerReceiptSha256",64),("collectorReceiptSha256",64)):
        assert re.fullmatch(r"[a-f0-9]{"+str(n)+r"}",record[key])
    assert uuid.UUID(record["sampleAttempt"]).hex==record["sampleAttempt"].replace("-","")
    assert re.fullmatch(r"[a-z0-9-]{2,80}",record["sampleSlot"])
    verified=dt.datetime.fromisoformat(record["verifiedAt"]).timestamp()
    recorded=dt.datetime.fromisoformat(record["sampleRecordedAt"]).timestamp()
    assert recorded<=verified<=time.time()+2
    sample=record["evidence"]
    assert re.fullmatch(r"overnight/collector-tests/(?:int1|ha1|delta)-[a-f0-9]{8,40}",sample)
    repo=HERE.parents[3]
    checksums=command("git","show","FETCH_HEAD:"+str(EXP/"bm1/SHA256SUMS"),cwd=repo).splitlines()
    for name,key in (("producer","producerReceiptSha256"),("collector","collectorReceiptSha256")):
        assert checksums.count(record[key]+"  "+sample+"/"+name+".json")==1
    return record


def delta_output(folder, binding, subjects, offers, releases):
    # [DX-BM1] Why: agree with checkSolo on the R1 setup reference followed by R2 and R3.
    # Rejected: counting only the two measured sweep arms and rejecting the full producer receipt.
    result=get(folder/"result.json")
    request=get(folder/"request.json")
    assert request==binding==result["binding"]
    assert re.fullmatch("[a-f0-9]{40}",binding["source"]) and re.fullmatch("[a-f0-9-]{36}",binding["nonce"])
    assert result["subjects"]==result["target"]["people"]==subjects
    assert len(result["accounts"])==1 and result["loaded"]["count"]==offers
    reference=result["reference"]
    assert [row["release"] for row in reference]==[releases[key] for key in ("R1","R2","R3")]
    assert all(row["people"]==subjects and row["receipts"]>0 and row["position"]>0 and row["end"]>=row["position"] for row in reference)
    assert all(a["position"]<b["position"] for a,b in zip(reference,reference[1:]))
    loaded=folder/"loaded.json"
    assert result["loaded"]["sha"]==digest(loaded)
    tape=get(loaded)["offers"]
    with (folder/"offers.ndjson").open() as stream:
        rows=[json.loads(line) for line in stream]
    assert len(tape)==offers and rows==[{"nonce":binding["nonce"],**row} for row in tape]
    return result


def complete_output(r):
    root=Path(r["root"])
    item=r["item"]
    if item in (1,8,9,10,11,12):
        if (root/"results/comparison.json").is_file():return True
        if item in (10,11,12):return any((root/"checkpoint-arms").glob("*/outcomes.jsonl")) or any((root/"checkpoint-arms").glob("*/result.json"))
        if item==9:return any((root/"results").glob("arm-*/writer.jsonl"))
        return any((root/"results").glob("arm-*/raw.json")) or any((root/"results").glob("arm-*/summary.json"))
    if item==2:return (root/"terminal.json").is_file()
    if item==3:return (root/"results/arm-4/measurements.json").is_file()
    if item==4:return (root/"guard-output.json").is_file()
    if item==5:return any((root/"build/state/evidence/DX-INT1"/r["tag"]).glob("rung-thin-*/result.json"))
    if item==6:return (Path("/var/tmp/triplex-scale1")/r["tag"]/"delta-measurement.json").is_file()
    if item==13:return any((root/"run").glob("load-tail-*/arm-*.json")) or any((root/"run").glob("load-tail-*/*.offers.json"))
    return False


def pulse_output(root, source, tag, prediction, start, *, small=False):
    # [DX-BM1] Why: bind each quiet and neighbor cohort to the producer rows and registered treatment.
    # Rejected: trusting a throughput scalar whose originating arm or schedule is unknown.
    directory=root/"results"
    result=get(directory/"comparison.json")
    prediction_sha=digest(prediction)
    assert result["study"]=="pulse" and result["enhanced"] is True and result["source"]==source
    assert result["predictionSha256"]==prediction_sha==digest(directory/"predictions.json")
    assert [a["mode"] for a in result["arms"]]==get(prediction)["pulse"]["arms"]
    for i,arm in enumerate(result["arms"],1):
        arm_dir=directory/f"arm-{i}"
        group_arm(arm_dir,arm,source,f"tx2-dxscale1-w1-{tag}-{i}",start,pulse=True,small=small)
        assert arm["predictionSha256"]==prediction_sha and arm["policy"]==get(arm_dir/"field-options.json")
    return result


def matched_output(root, source, tag, start, *, small=False):
    directory=root/"results"
    result=get(directory/"comparison.json")
    assert result["source"]==source and result["small"] is small and result["study"]=="thin-deep"
    arms=result["arms"]
    assert [a["population"] for a in arms]==(["thin","deep"] if small else ["thin","deep","deep","thin"])
    n=39 if small else 1773
    for i,sample in enumerate(arms,1):
        arm=directory/f"arm-{i}"
        identity=get(arm/"identity.json")
        assert sample==get(arm/"field-output.json")==get(arm/"summary.json")
        assert identity==sample["arm"] and identity["source"]==source and identity["slot"]==f"tx2-dxscale1-w1-{tag}-{i}"
        assert uuid.UUID(identity["nonce"]).hex==identity["nonce"].replace("-","")
        assert all((arm/f).stat().st_mtime>=start-2 for f in ("identity.json","offers.json","writer.jsonl","field-output.json"))
        assert get(arm/"cleanup.json")==dict(containers=[],volumes=[],networks=[])
        assert sample["people"]==(64 if small else 10000) and sample["offers"]==sample["seedRootsChecked"]==n
        assert sample["rowsPerOffer"]==[5,5] and sample["rate"]==39.4
        offers=(arm/"offers.json").read_bytes()
        assert hashlib.sha256(offers.removesuffix(b"\n")).hexdigest()==sample["tapeSha256"]
        tape=json.loads(offers)
        assert len(tape)==n and all(o["i"]==i and o["subject"]==(i*7919)%sample["people"]
                                   and abs(o["due"]-i*1000/39.4)<.000001 for i,o in enumerate(tape))
        assert sample["writerSha256"]==digest(arm/"writer.jsonl")
        with (arm/"writer.jsonl").open() as stream:rows=sorted((json.loads(line) for line in stream),key=lambda row:row["ordinal"])
        assert len(rows)==n and [row["ordinal"] for row in rows]==list(range(n)) and all(row["disposition"]=="ack" for row in rows)
        assert all(row["due"]==o["due"] and row["id"]==f"bm1-matched-{o['i']:06d}" for row,o in zip(rows,tape))
        assert len({row["traceId"] for row in rows})==len({row["pos"] for row in rows})==n
        assert all(len(row["fresh"])==len(row["old"])==5 and row["pos"]>sample["seedCut"] for row in rows)
        ordered=sorted(row["ackMs"] for row in rows)
        assert ordered[0]>=0 and sample["ms"]["p99"]==ordered[(99*n+99)//100-1]
    assert len({(a["tapeSha256"],a["intentSha256"]) for a in arms})==1
    return result


def preflight(r):
    # [DX-BM1] Why: a full seed starts only after the producer's own files reach the matching collector.
    # Rejected: treating a local synthetic schema test or an exit status as a full-branch admission.
    item=r["item"]
    if item==1 and r["attempt"]==1:return
    directory=Path(r["directory"])
    ready=directory/"admission-ready.json"
    if ready.is_file():
        proof=get(ready)
        assert proof["source"]==r["source"] and proof["item"]==item
        if item in (8,9):assert proof["sha256"]==digest(Path(proof["location"])/"results/comparison.json")
        return
    if item in (8,9):
        tag={8:"pulsesmk",9:"matchedsmk"}[item]+str(r["attempt"])
        smoke=Path("/var/tmp/triplex-w1")/tag
        proof=get(smoke/"results/comparison.json") if (smoke/"results/comparison.json").is_file() else None
        if proof is None:
            unit="bm1n19-collector-"+tag
            if not active(unit):
                assert not smoke.exists(),"Native smoke did not produce its comparison file"
                log=directory/"collector-preflight.log"
                entry=[sys.executable,str(Path(__file__).resolve()),"preflight-worker",str(item),str(r["attempt"])]
                run("systemd-run","--no-block","--unit="+unit,"-p","KillMode=control-group","-p","RuntimeMaxSec=720s",
                    "-p","TimeoutStopSec=90s","-p","StandardOutput=append:"+str(log),"-p","StandardError=append:"+str(log),
                    "-p",f"ExecStopPost={sys.executable} {Path(__file__).resolve()} preflight-clean {item} {r['attempt']}",*entry)
            deadline=min(r["deadline"]-90,time.time()+720)
            while active(unit) and time.time()<deadline:time.sleep(3)
            if active(unit):run("systemctl","stop",unit,timeout=115)
        assert not (smoke/"active-slot").exists() and not command("docker","ps","-q")
        if item==8:
            pulse_output(smoke,r["source"],tag,Path(r["repo"])/EXP/"w1/small/predictions.json",r["start"],small=True)
        else:matched_output(smoke,r["source"],tag,r["start"],small=True)
        proof={"source":r["source"],"item":item,"tag":tag,"file":"comparison.json","sha256":digest(smoke/"results/comparison.json"),
               "at":stamp(),"location":str(smoke)}
        put(directory/"collector-agreement.json",proof)
        if item==8:
            group=Path("/var/tmp/triplex-w1/grpw1a/results/arm-1")
            identity=group/"identity.json"
            raw=group/"raw.json"
            if identity.is_file():
                observed=(raw.stat().st_mtime if raw.is_file() else time.time())-identity.stat().st_mtime
                # The external controller creates five fresh verified databases. An optimistic lower bound uses half the observed seed/offer time.
                # [DX-BM1] Why: accelerate the entire run before spending hours on a known-truncated baseline.
                # Rejected: letting the first two fresh seeds consume the full ceiling with no enhanced treatment.
                seconds_five=max(0,observed-600)*2.5
                if seconds_five>r["deadline"]-time.time():
                    raise RuntimeError(f"Enhanced pulse needs five fresh seeds. Half the observed pace still takes {seconds_five/3600:.2f} h before readback, beyond the remaining ceiling.")
        put(ready,proof)
        return
    if item in (10,11,12):
        sys.path.insert(0,str(HERE/"probes"))
        from native import verified_checkpoint
        assert verified_checkpoint(allow_single_account=(item==12)), "No verified seed at the requested population is available"
        put(ready,{"source":r["source"],"item":item,"at":stamp(),"state":"owned-small-run-first"})
        return
    documented=registered_sample(item,r["source"])
    if item==6:
        assert documented["reviewedFindings"]==[1,2] and documented["reportSha256"]==digest(directory/"builder-report.md")
    put(ready,{**documented,"item":item})


def eligible_delta():
    if (NIGHT/"i6/outcome.json").exists():return False
    proof=collector_cases().get("6")
    if not proof or proof.get("state")!="verified" or proof.get("reviewedFindings")!=[1,2]:return False
    head=command("git","-c","credential.helper=","ls-remote","--exit-code",URL,"refs/heads/"+ACT).split()[0]
    if proof.get("source")!=head:return False
    registered_sample(6,head)
    return True


def preflight_worker(r, clean=False):
    item=r["item"]
    assert item in (8,9)
    tag={8:"pulsesmk",9:"matchedsmk"}[item]+str(r["attempt"])
    smoke=Path("/var/tmp/triplex-w1")/tag
    smoke_r={**r,"root":str(smoke),"tag":tag}
    if clean:
        cleanup(smoke_r)
        assert not any(remaining(smoke_r).values())
        return
    env=dict(ENV)
    repo,node=setup(smoke_r,env)
    mode="pulse-small" if item==8 else "matched-small"
    run(node,"lab/bin/heavy.mjs","--label","DX-BM1-collector-"+mode,"--",node,"--import","tsx",HERE/"probes/campaign.mjs",
        smoke,r["source"],tag,mode,cwd=repo,env=env)


def public_source(item, directory):
    branch, component, minimum, _, _ = ITEMS[item]
    advertised = command("git","-c","credential.helper=","ls-remote","--exit-code",URL,"refs/heads/"+branch).split()[0]
    document = collector_cases().get(str(item),{}) if item in (5,13) else {}
    head = document.get("source",advertised)
    if not re.fullmatch("[a-f0-9]{40}",head):
        raise ValueError("No published head for " + branch)
    repo = NIGHT / ("source-" + head)
    if not repo.exists():
        staging = NIGHT / ("clone-" + uuid.uuid4().hex)
        run("git","-c","credential.helper=","clone","-q","--no-checkout",URL,staging,timeout=300)
        run("git","checkout","-q","--detach",head,cwd=staging)
        staging.rename(repo)
    assert command("git","rev-parse","HEAD",cwd=repo)==head and not command("git","status","--porcelain",cwd=repo)
    if minimum:
        run("git","merge-base","--is-ancestor",minimum,head,cwd=repo)
    if head!=advertised:
        run("git","-c","credential.helper=","fetch","--quiet","--no-tags","origin","refs/heads/"+branch,cwd=repo,timeout=60)
        run("git","merge-base","--is-ancestor",head,"FETCH_HEAD",cwd=repo)
    report = repo / EXP / component / "REPORT.md"
    if not report.is_file():
        raise ValueError("The builder has no published report")
    shutil.copyfile(report,directory/"builder-report.md")
    for name in ("HANDOFF.md","README.md","PREDICTIONS.md","ISOLATION-BENCH.md"):
        f=report.with_name(name)
        if f.is_file(): shutil.copyfile(f,directory/("builder-"+name.lower()))
    return head,repo


def coordinates(item,attempt):
    assert item in ITEMS and attempt in (1,2)
    tag=ITEMS[item][4]
    if item == 1: tag += "ab"[attempt-1]
    elif attempt==2: tag += "b"
    if item in (1,3,8,9,10,11,12): root=Path("/var/tmp/triplex-w1")/tag; unit="triplex-w1-"+tag
    elif item==13: root=Path("/var/tmp/triplex-ha1")/tag;unit="bm1n19-"+tag
    elif item==2: root=Path("/var/tmp/triplex-import1")/tag;unit="triplex-bm1-"+tag
    elif item==4: root=ROOT/("day-"+tag);unit="bm1n19-"+tag
    elif item==6: root=NIGHT/tag; unit="bm1n19-"+tag
    else: root=Path("/var/tmp/triplex-int1")/tag;unit="triplex-int1-prepare-"+tag
    return tag,root,unit


def bind(r):
    item,attempt=r["item"],r["attempt"]
    tag,root,unit=coordinates(item,attempt)
    directory=NIGHT/f"i{item}"/str(attempt)
    assert r["tag"]==tag and Path(r["root"])==root and r["unit"]==unit
    assert Path(r["directory"])==directory and re.fullmatch(r"[a-f0-9]{40}",r["source"])
    assert 0<r["deadline"]-r["start"]<=3600*ITEMS[item][3]
    valid_repos={NIGHT/("source-"+r["source"])}
    if item==1 and attempt==1:valid_repos.add(root/"bootstrap")
    assert Path(r["repo"]) in valid_repos
    return r


def make(item, attempt, start, deadline):
    tag,root,unit=coordinates(item,attempt)
    directory=NIGHT / f"i{item}" / str(attempt)
    directory.mkdir(parents=True,exist_ok=True)
    request=directory/"request.json"
    if request.exists(): return bind(get(request))
    prior=Path("/var/tmp/triplex-w1/grpw1a/source")
    if item==1 and attempt==1 and prior.is_file():
        head=prior.read_text().strip()
        assert re.fullmatch("[a-f0-9]{40}",head)
        repo=prior.parent/"bootstrap"
        assert command("git","rev-parse","HEAD",cwd=repo)==head and not command("git","diff","--name-only","HEAD",cwd=repo)
        shutil.copyfile(repo/EXP/"w1/REPORT.md",directory/"builder-report.md")
    else:
        head,repo=public_source(item,directory)
    token="| Item 0 repeat," if item==6 else {8:"| Enhanced pulse,",9:"| Thin/deep matched,",10:"| Predecessor lookup,",
            11:"| CEIL-SERVER-LIVE10,",12:"| W2-SIZE-LEDGER,",13:"| HA1 one-host import,"}.get(item,f"| {item} ·")
    forecast=next(line for line in (HERE/"PREDICTIONS.md").read_text().splitlines() if line.startswith(token))
    r=dict(item=item,attempt=attempt,tag=tag,source=head,repo=str(repo),unit=unit,root=str(root),
           directory=str(directory),start=start,deadline=deadline,prediction=forecast,requested=stamp())
    put(request,bind(r))
    return r


def args_request(r):
    return [sys.executable,str(Path(__file__).resolve()),"worker",str(r["item"]),str(r["attempt"])]


def setup(r,env):
    root,source,repo=Path(r["root"]),r["source"],Path(r["repo"])
    root.mkdir(parents=True,exist_ok=True)
    if r["item"] in (1,3,8,9,10,11,12):
        for name,value in (("source",source),("machine",digest("/etc/machine-id"))):
            f=root/name
            if f.exists(): assert f.read_text().strip()==value
            else: atom(f,value+"\n")
    build=root/"build"
    run("bash",repo/EXP/"t1/bare-metal.sh","--prepare",source,build,env=env)
    assert (build/"results/bootstrap.exit").read_text().strip()=="0"
    checkout=build/"repository"
    assert command("git","rev-parse","HEAD",cwd=checkout)==source and not command("git","diff","--name-only","HEAD",cwd=checkout)
    env["PATH"]=str(build/"tools/bin")+":"+env["PATH"]
    return checkout, build/"tools/bin/node"


def stage_guard(r,env):
    root,tag,repo=Path(r["root"]),r["tag"],Path(r["repo"])
    logs=root/"logs";logs.mkdir(parents=True,exist_ok=True)
    stop=stamp(r["deadline"]-30)
    runner=repo/EXP/"bm1/queue-day.sh"
    atom(logs/"source.txt",r["source"]+"\n")
    inherited=ROOT/"day-p3/pristine/seed.json"
    seed_batch="p3" if inherited.is_file() and get(inherited)["source"]==r["source"] else tag
    stages=("setup","smoke") if seed_batch=="p3" else ("setup","smoke","seed")
    for stage in stages:
        remaining=int(r["deadline"]-time.time()-25)
        if remaining<30:raise TimeoutError("guarded item ceiling")
        cap=min(remaining,{"setup":1800,"smoke":1800,"seed":14400}[stage])
        unit="triplex-bm1-"+tag+"-"+stage
        atom(root/"active-item",stage+"\n")
        status(4,stage,time.time(),5)
        subprocess.run(["systemd-run","--wait","--unit="+unit,"-p","KillMode=control-group",
            "-p",f"RuntimeMaxSec={cap}s","-p","TimeoutStopSec=120s",
            "-p",f"ExecStopPost=/bin/bash {runner} --cleanup {tag} {stop} {stage}",
            "/bin/bash",str(runner),"--item",tag,stop,stage,stamp(time.time()+cap)],env=env,check=True)
        assert (logs/(stage+"-cleanup/result")).read_text().strip()=="clean"
        (root/"active-item").unlink()
    checkout=root/"checkout/repository"
    assert command("git","rev-parse","HEAD",cwd=checkout)==r["source"]
    seed=ROOT/("day-"+seed_batch)/"pristine/seed.json"
    assert seed.is_file(),"The 100k pristine PostgreSQL seed is missing"
    hours=min(3,(r["deadline"]-time.time()-120)/3600)
    if hours<.5:raise TimeoutError("No time remains for the published guarded command")
    put(root/"guard-plan.json",{"source":r["source"],"seedBatch":seed_batch,"seedSha256":digest(seed),"stop":stop})
    env=dict(env,DX_BM1_PRISTINE_BATCH=seed_batch,DX_BARE_METAL="1",PATH=str(root/"checkout/tools/bin")+":"+env["PATH"])
    # [DX-BM1] Why: the published standalone runner owns all four corrected arms and the historical control.
    # Rejected: the old three-arm wrapper, which rejects the fourth arm's request after it is written.
    atom(root/"active-item","standalone\n")
    status(4,"guarded",time.time(),5)
    node=root/"checkout/tools/bin/node"
    run(node,"lab/bin/heavy.mjs","--label","DX-BM1-guarded-100k","--",node,"--experimental-strip-types",
        EXP/"act1/bench.ts","--execute","--hours",str(hours),cwd=checkout,env=env)


def guarded_children(r):
    root=Path(r["root"])
    plan=root/"guard-plan.json"
    if not plan.is_file():return {}
    conditions=get(plan)
    assert conditions["source"]==r["source"] and re.fullmatch(r"[0-9a-f]{64}",conditions["seedSha256"])
    children={}
    for f in (root/"checkout/repository/runs/act1-requests").glob("tx2-dxt1-bm1-act*-activation-a.json"):
        a=get(f)
        slot=a["slot"]
        assert a["source"]==r["source"] and a["seedSha256"]==conditions["seedSha256"] and f.stem==slot
        assert a["arm"] in {"narrow-full","narrow-selector","standard-full","standard-pages","standard-historical"}
        assert re.fullmatch(r"tx2-dxt1-bm1-act[0-9a-f]{9}-activation-a",slot)
        assert f.stat().st_mtime>=r["start"]-1
        children[slot]=f
    return children


def guard_output(r):
    input_bytes={f.read_bytes() for f in guarded_children(r).values()}
    matches=[]
    for directory in ROOT.glob("act1-*"):
        if not directory.is_dir() or not re.fullmatch(r"act1-[0-9a-f]{12}",directory.name):continue
        files=list(directory.glob("*-request.json"))
        if files and all(f.read_bytes() in input_bytes for f in files):
            matches.append(directory)
    assert len(matches)<=1
    return matches[0] if matches else None


def worker(r):
    root,tag,source=Path(r["root"]),r["tag"],r["source"]
    env=dict(ENV)
    if r["item"]==4:
        stage_guard(r,env);return
    repo,node=setup(r,env)
    heavy=[node,"lab/bin/heavy.mjs","--label","DX-BM1-night-"+str(r["item"]),"--",node]
    if r["item"]==6:
        run(node,"--import","tsx",EXP/"scale1/bench.ts","launch","2",tag,
            "activation","--activation-mode","delta",cwd=repo,env=env)
    elif r["item"] in (1,3,8):
        args=[EXP/"w1/group/server.ts","run",root,source,tag] if r["item"]==1 else [EXP/"w1/bench.ts",root,source,tag]
        if r["item"]==8:args=[EXP/"w1/field/server.ts","run",root,source,tag,"pulse","--enhanced"]
        run(*heavy,"--experimental-strip-types",*args,cwd=repo,env=env)
    elif r["item"]==9:
        run(*heavy,"--import","tsx",HERE/"probes/campaign.mjs",root,source,tag,"matched",cwd=repo,env=env)
    elif r["item"] in (10,11,12):
        mode={10:"pred",11:"ceil",12:"size"}[r["item"]]
        run(sys.executable,HERE/"probes/seeded_campaign.py","run",mode,root,source,cwd=repo,env=env)
    elif r["item"]==2:run(*heavy,"--experimental-strip-types",EXP/"import1/server.ts","--execute",root,source,cwd=repo,env=env)
    elif r["item"]==13:
        # [DX-BM1] Why: the supervised one-host command uses the existing machine allocation and survives SSH loss.
        # Rejected: joining a second host, or letting the SSH controller pull an uncapped raw archive.
        run(*heavy,"--import","tsx",EXP/"ha1/bench.ts","load-tail",tag,source,"-","-","-",root/"run",
            str(uuid.uuid4()),"50","deep","one-host",cwd=repo,env=env)
    elif r["item"]==5:
        run(node,"--no-warnings","--experimental-transform-types",repo/EXP/"thin1/queue-bench.ts","--launch",tag,
            stamp(r["deadline"]-10),root/"build","--int1","--row-wire=plain",cwd=repo,env=env)
    else:raise ValueError("This item has no admitted native worker yet")


def import_inventory(r):
    inventory={"containers":[],"networks":[],"volumes":[]}
    for f in (Path(r["root"])/"run").glob("load-tail-*/attempt.json"):
        a=get(f)
        nonce=a["nonce"]
        assert re.fullmatch(r"[a-f0-9-]{36}",nonce) and f.parent.name=="load-tail-"+nonce
        assert a["slot"]==r["tag"] and a["source"]["git"]==r["source"] and a["mode"]=="load-tail"
        prefix="tx2-ha1-"+nonce[:8]
        selector="label=ha1.attempt="+nonce
        for name in command("docker","ps","-a","--filter",selector,"--format","{{.Names}}").splitlines():
            assert name in {prefix+"-"+role for role in ("pg","active","write","tool")}
            inventory["containers"].append(name)
        for name in command("docker","network","ls","--filter",selector,"--format","{{.Name}}").splitlines():
            assert name==prefix
            inventory["networks"].append(name)
        event=f.parent/"events.jsonl"
        if event.is_file():
            for line in event.read_text().splitlines():
                try: row=json.loads(line)
                except json.JSONDecodeError:continue
                assert row["nonce"]==nonce
                if row["type"]=="role":
                    for name in row["data"]["volumes"]:
                        assert re.fullmatch(r"[a-f0-9]{64}",name)
                        if command("docker","volume","ls","-q","--filter","name=^"+name+"$")==name:
                            inventory["volumes"].append(name)
    return inventory


def cleanup(r):
    root,tag,src=Path(r["root"]),r["tag"],r["source"]
    if r["item"] in (10,11,12) and (root/"checkpoint-arms/active.json").is_file():
        run(sys.executable,HERE/"probes/seeded_campaign.py","cleanup",{10:"pred",11:"ceil",12:"size"}[r["item"]],root,src,timeout=150)
    if r["item"] in (1,3,8,9,10) and (root/"active-slot").exists():
        run("bash",Path(r["repo"])/EXP/"w1/release.sh",root,timeout=180)
    elif r["item"]==6:
        unit="triplex-scale1-"+tag
        if active(unit):run("systemctl","stop",unit,timeout=620)
    elif r["item"]==2 and (root/"active.json").exists():
        run(root/"build/tools/bin/node","--experimental-strip-types",root/"build/repository"/EXP/"import1/server.ts",
            "--cleanup",root,src,timeout=180)
    elif r["item"]==4 and (root/"active-item").exists():
        stage=(root/"active-item").read_text().strip()
        runner=Path(r["repo"])/EXP/"bm1/queue-day.sh"
        if stage=="standalone":
            for slot in guarded_children(r):
                child=slot.removeprefix("tx2-dxt1-bm1-").removesuffix("-activation-a")
                unit="triplex-bm1-"+child+"-activation-a"
                if active(unit):run("systemctl","stop",unit,timeout=190)
                logs=ROOT/("day-"+child)/"logs"
                if not (logs/"activation-a-cleanup/result").is_file():
                    run("bash",runner,"--cleanup",child,stamp(r["deadline"]-25),"activation-a","retry",timeout=180)
                assert (logs/"activation-a-cleanup/result").read_text().strip()=="clean"
            if output:=guard_output(r):put(root/"guard-output.json",{"directory":str(output),"source":r["source"]})
        else:
            assert stage in {"setup","smoke","seed"}
            unit="triplex-bm1-"+tag+"-"+stage
            if active(unit):run("systemctl","stop",unit,timeout=190)
            if not (root/"logs"/(stage+"-cleanup/result")).exists():
                run("bash",runner,"--cleanup",tag,stamp(r["deadline"]-25),stage,"retry",timeout=180)
            assert (root/"logs"/(stage+"-cleanup/result")).read_text().strip()=="clean"
        (root/"active-item").unlink(missing_ok=True)
    elif r["item"]==5:
        unit="triplex-int1-"+tag
        if active(unit):run("systemctl","stop",unit,timeout=200)
    elif r["item"]==13:
        # [DX-BM1] Why: systemd invokes this after the group is dead even when the producer's finally block could not run.
        # Rejected: label-wide removal, which could delete another run after handoff.
        inventory=import_inventory(r)
        for name in inventory["containers"]:run("docker","rm","-fv",name,timeout=30)
        inventory=import_inventory(r)
        for name in inventory["networks"]:run("docker","network","rm",name,timeout=30)
        for name in inventory["volumes"]:run("docker","volume","rm",name,timeout=30)
    assert not command("docker","ps","-q"),"A running stack remains on the dedicated machine"


def remaining(r):
    item, tag = r["item"],r["tag"]
    if item==13:return import_inventory(r)
    root=Path(r["root"])
    if item in (10,11,12):
        prefixes=[]
        for f in (root/"checkpoint-arms").glob("*/attempt.json"):
            a=get(f)
            assert a["source"]==r["source"] and re.fullmatch(r"tx2-dxt1-bm1-n19probe-[a-f0-9]{8}-(base|(?:ceil|size|pred)[1-4])",a["slot"])
            prefixes.append(a["slot"]+"-")
    elif item in (1,3,8,9): prefixes=["tx2-dxscale1-w1-"+tag+"-"]
    elif item==5: prefixes=["tx2-dxint1-"+tag+"-"]
    elif item==6: prefixes=["tx2-dxscale1-"+tag+"-"]
    else:
        prefixes=["tx2-dxt1-bm1-"+tag+"-"] if item==4 else []
        if item==4:prefixes.extend(s+"-" for s in guarded_children(r))
        files=() if item==4 else root.glob("*/attempt.json")
        for f in files:
            a=get(f)
            assert a.get("source")==r["source"]
            if item==2:
                assert a["tag"]==tag and re.fullmatch("tx2-dximport-[a-f0-9]{20}",a["prefix"])
                prefixes.append(a["prefix"]+"-")
    names={
        "containers":command("docker","ps","-a","--format","{{.Names}}").splitlines(),
        "networks":command("docker","network","ls","--format","{{.Name}}").splitlines(),
        "volumes":command("docker","volume","ls","--format","{{.Name}}").splitlines(),
    }
    return {kind:[n for n in rows if any(n.startswith(p) for p in prefixes)] for kind,rows in names.items()}


def check_released(r):
    assert not running(r), "An owned service remains active"
    inv=remaining(r)
    put(Path(r["directory"])/"final-inventory.json",inv)
    assert not any(inv.values()),"Owned resources remain: "+str(inv)
    for f in (ROOT/"dx-bm1-day.lock",Path("/var/tmp/triplex-w1/exclusive.lock")):
        if f.exists():
            with f.open("r") as stream:
                fcntl.flock(stream,fcntl.LOCK_EX|fcntl.LOCK_NB)
                fcntl.flock(stream,fcntl.LOCK_UN)


def installed(r):
    return active(r["unit"]) or Path(r["root"]).exists()


def launch(r):
    if not installed(r):
        seconds=max(1,int(r["deadline"]-time.time()))
        log=Path(r["directory"])/"worker.log"
        cmd=["systemd-run","--no-block","--unit="+r["unit"],"-p","KillMode=control-group","-p",f"RuntimeMaxSec={seconds}s",
             "-p","TimeoutStopSec=150s","-p","StandardOutput=append:"+str(log),"-p","StandardError=append:"+str(log),
             "-p","ExecStopPost="+sys.executable+" "+str(Path(__file__).resolve())+f" cleanup {r['item']} {r['attempt']}"]
        run(*cmd,*args_request(r),timeout=30)


def running(r):
    if active(r["unit"]):return True
    child = native_unit(r)
    return bool(child and active(child))


def native_unit(request):
    item, tag = request["item"],request["tag"]
    if item == 5: return "triplex-int1-"+tag
    if item == 6: return "triplex-scale1-"+tag
    return None


def matched_probes():
    # [DX-BM1] Why: keep the native comparison tied to the verified W1 seed after the primary activation retry.
    # Rejected: rebuilding the large population for a six-minute contrast or claiming a mismatched seed comparison.
    work=NIGHT/"i7"
    work.mkdir(exist_ok=True)
    end=work/"outcome.json"
    if end.is_file():return
    directory=work/"1"
    directory.mkdir(exist_ok=True)
    root=NIGHT/"native-probes"
    request=directory/"request.json"
    unit="bm1n19-native-probes"
    sys.path.insert(0,str(HERE/"probes"))
    from native import verified_checkpoint
    marker=verified_checkpoint(allow_single_account=True)
    start=time.time()
    if request.is_file():
        row=get(request)
        start=row["start"]
    else:
        source=get(marker)["source"] if marker else (Path("/var/tmp/triplex-w1/grpw1a")/"source").read_text().strip()
        assert re.fullmatch("[0-9a-f]{40}",source)
        row=dict(item=7,attempt=1,source=source,tag="matched-probes",start=start,deadline=start+2400,directory=str(directory),root=str(root),
                 checkpoint=str(marker) if marker else None,
                 prediction=next(line for line in (HERE/"PREDICTIONS.md").read_text().splitlines() if line.startswith("| READERS off/on/on/off,")))
        put(request,row)
    assert row["checkpoint"]==(str(marker) if marker else None)
    if marker:assert row["source"]==get(marker)["source"]
    status("readers","running",start,"predecessor")
    terminal=directory/"terminal.json"
    if terminal.is_file():
        entry=get(terminal)
    else:
        if marker and not root.exists() and not active(unit):
            left=max(1,int(row["deadline"]-time.time()))
            command_str=str(HERE/"probes/native.py")
            try:
                run("systemd-run","--no-block","--unit="+unit,"-p","KillMode=control-group","-p",f"RuntimeMaxSec={left}s",
                    "-p","TimeoutStopSec=60s","-p","StandardOutput=append:"+str(directory/"worker.log"),
                    "-p","StandardError=append:"+str(directory/"worker.log"),
                    "-p",f"ExecStopPost={sys.executable} {command_str} cleanup {marker}",sys.executable,command_str,"run",marker,timeout=30)
            except (OSError,subprocess.SubprocessError) as error:
                atom(directory/"admission-error.txt",repr(error)+"\n")
        while active(unit):
            if time.time()>row["deadline"]:
                run("systemctl","stop",unit,timeout=115)
                break
            time.sleep(5)
        if (root/"active.json").is_file():
            assert marker
            run(sys.executable,HERE/"probes/native.py","cleanup",marker,timeout=125)
        assert not command("docker","ps","-q")
        assert not (root/"active.json").exists()
        result=root/"probe-results.json"
        state="incomplete"
        detail="Neither W1 nor the matched deep arm produced a source-bound checkpoint"
        if marker:
            detail="A matched probe failed before it sealed a reading"
            if result.is_file():
                evidence=get(result)
                assert evidence["source"]==row["source"] and evidence["checkpoint"]==digest(marker)
                assert start<=evidence["started"]<=time.time() and set(evidence["results"])=={"readers"}
                detail={name:r["outcome"] for name,r in evidence["results"].items()}
                readers=evidence["results"]["readers"]
                state="observed" if len(readers["readings"])==4 and len({x["binding"]["nonce"] for x in readers["readings"]})==4 else "partial"
        entry=dict(item=7,attempt=1,tag=row["tag"],source=row["source"],state=state,detail=detail,ended=stamp(),clean=True)
        put(terminal,entry)
    try:
        run(sys.executable,HERE/"night-archive.py",request,timeout=360)
    except (OSError,subprocess.SubprocessError) as error:
        atom(directory/"collection-error.txt",repr(error)+"\n")
    put(end,entry)
    print(stamp(),entry,flush=True)


def restrict_scope(r):
    root=Path(r["root"])
    if r["item"]==5:
        day=root/"build/state/evidence/DX-INT1"/r["tag"]
        if (day/"batch.json").is_file():
            batch=get(day/"batch.json")
            assert batch["source"]==r["source"] and batch["unit"]=="triplex-int1-"+r["tag"]
            # [DX-BM1] Why: the native controller opens this log exclusively before the third timed rung.
            # Rejected: editing the pinned producer or timing the unrequested pooled placements.
            boundary=day/"pooled-100.log"
            if not boundary.exists():
                try:
                    with boundary.open("x") as file:file.write("BM1 completes after the two thin rungs.\n")
                except FileExistsError:pass
    if r["item"]==3:
        target=root/"results/arm-5"
        if target.parent.is_dir() and not target.exists():
            # [DX-BM1] Why: the published matrix creates each arm directory before starting its stack. A named file reserves the out-of-scope fifth slot.
            # Rejected: running a second population or modifying the measured builder checkout to filter its matrix.
            with target.open("x") as file:file.write("BM1 thin-only boundary "+r["tag"]+"\n")
    if r["item"]==2:
        stage=root/"deep";target=root/"thin"
        if (stage/"capacity.json").is_file() and not target.exists() and time.time()-(stage/"capacity.json").stat().st_mtime>10800:
            with target.open("x") as file:file.write("BM1 three-hour deep-import boundary "+r["tag"]+"\n")


def result(r):
    root=Path(r["root"]);item=r["item"]
    if item==1:
        f=root/"results/comparison.json"
        if f.is_file():
            obj=get(f)
            assert obj["source"]==r["source"] and [a["grouped"] for a in obj["arms"]]==[False,True]
            for index,a in enumerate(obj["arms"],1):
                path=root/"results"/("arm-"+str(index))
                raw=group_arm(path,a,r["source"],f"tx2-dxscale1-w1-{r['tag']}-{index}",r["start"])
                assert raw["grouped"] is a["grouped"]
            return "recorded",str(f)
        first=root/"results/arm-1/summary.json"
        if first.is_file():
            a=get(first)
            group_arm(first.parent,a,r["source"],f"tx2-dxscale1-w1-{r['tag']}-1",r["start"])
            return "partial","The individual arm completed and verified. The grouped comparison is missing."
    elif item==8 and (root/"results/comparison.json").is_file():
        pulse_output(root,r["source"],r["tag"],Path(r["repo"])/EXP/"w1/small/predictions.json",r["start"])
        return "recorded",str(root/"results/comparison.json")
    elif item==9 and (root/"results/comparison.json").is_file():
        matched_output(root,r["source"],r["tag"],r["start"])
        return "recorded",str(root/"results/comparison.json")
    elif item in (10,11,12) and (root/"results/comparison.json").is_file():
        file=root/"results/comparison.json"
        value=get(file)
        assert value["source"]==r["source"] and value["mode"]=={10:"pred",11:"ceil",12:"size"}[item]
        assert value["smallSha256"]==digest(root/"results/small-reading.json")
        small=get(root/"results/small-reading.json")
        assert small["source"]==r["source"] and small["dispositions"]=={"ack":50} and small["completed"] is True
        assert [a["setting"] for a in value["arms"]]==(["control"] if item==12 else ["control","candidate","candidate","control"])
        assert len({a["nonce"] for a in value["arms"]})==len(value["arms"])
        for a in value["arms"]:
            assert a["source"]==r["source"] and re.fullmatch(r"tx2-dxt1-bm1-n19probe-[a-f0-9]{8}-(?:ceil|size|pred)[1-4]",a["directory"])
            arm=root/"checkpoint-arms"/a["directory"]
            assert a["resultSha256"]==digest(arm/"result.json") and a["checkpointSha256"]==small["checkpointSha256"]==value["checkpointSha256"]
            assert get(arm/"cleanup.json")=={"slot":a["slot"],"source":r["source"],"remaining":[]}
        return ("recorded" if all(a["completed"] for a in value["arms"]) else "partial"),str(file)
    elif item==13 and any((root/"run").glob("load-tail-*/observations.json")):
        path,rows=tail_attempt(root/"run",r)
        good=all(value["offered"]==value["ok"] for row in rows for intervals in row["neighbors"].values() for value in intervals.values())
        return ("recorded" if good else "partial"),str(path)
    elif item==2:
        if (root/"terminal.json").is_file():
            doc=get(root/"terminal.json")
            assert doc["source"]==r["source"] and doc["tag"]==r["tag"] and doc["cleanup"] is True
            assert len(doc["stages"])==7
            for stage in doc["stages"]:
                if stage.get("status")=="capacity-refused":continue
                manifest=root/stage["stage"]/"files.json"
                assert stage["source"]==r["source"] and stage["cleanup"] is True and stage["manifest"]==digest(manifest)
            return "recorded",str(root/"terminal.json")
        if (root/"thin").is_file() and (root/"deep/traffic/comparison.json").is_file():
            f=root/"deep/traffic/comparison.json"
            obs=get(f); bound=get(root/"deep/attempt.json");row=obs["rows"][0]
            assert bound["source"]==r["source"] and bound["tag"]==r["tag"] and bound["stage"]=="deep"
            assert obs["binding"]==digest(root/"deep/attempt.json") and row["complete"] and row["groups"]==100000 and len(row["scopes"])==10
            return "deep-recorded-thin-cut",str(f)
    elif item==3:
        arms=[root/"results"/("arm-"+str(i))/"measurements.json" for i in range(1,5)]
        if all(f.is_file() for f in arms):
            actual=[get(f) for f in arms]
            assert [(a["arm"]["lookup"],a["arm"]["readers"]) for a in actual]==[("individual",False),("range",False),("range",True),("individual",True)]
            for i,(a,f) in enumerate(zip(actual,arms),1):
                assert a["arm"]==get(f.parent/"identity.json") and a["arm"]["slot"]=="tx2-dxscale1-w1-"+r["tag"]+"-"+str(i)
                assert a["arm"]["population"]=="thin" and a["arm"]["source"]==r["source"] and a["denominator"]>0
                assert get(f.parent/"cleanup.json")==dict(containers=[],volumes=[],networks=[])
            assert len({(a["trace"],a["seedFacts"],a["denominator"]) for a in actual})==1
            put(Path(r["directory"])/"thin-observations.json",{"source":r["source"],"inputs":[digest(f) for f in arms],"arms":actual})
            return "recorded","four measured thin arms"
    elif item==6:
        campaign=Path("/var/tmp/triplex-scale1")/r["tag"]
        measurement=campaign/"delta-measurement.json"
        if measurement.is_file():
            trial=get(campaign/"attempt.json");result=get(measurement)
            outcome=get(campaign/"terminal.json")
            proof=get(campaign/"preflight.json")
            request=get(campaign/"delta/request.json")
            assert request==result["binding"]==proof["binding"]
            assert request["source"]==trial["source"]==outcome["source"]==r["source"]
            assert request["slot"]==trial["slot"]=="tx2-dxscale1-"+r["tag"]
            assert request["nonce"]==trial["nonce"]==outcome["nonce"] and outcome["cleanup"] is True
            assert trial["item"]==2 and trial["activationMode"]=="delta" and outcome["tag"]==r["tag"]
            releases=get(Path(r["repo"])/"lab/world/W0/releases/index.json")
            assert result==delta_output(campaign/"delta",request,100000,90,releases)
            return "recorded",str(measurement)
    elif item==4:
        directory=guard_output(r)
        if directory:
            children=guarded_children(r)
            results=[]
            for slot,request in children.items():
                batch=slot.split("-")[3]
                out=ROOT/("day-"+batch)/"checkout/state/evidence/DX-T1"/slot
                if not (out/"act1-verified.json").is_file():continue
                raw=get(out/"act1-sweep.json");verified=get(out/"act1-verified.json");arm=get(request)
                assert verified["rawSha256"]==digest(out/"act1-sweep.json")
                assert raw["source"]==r["source"] and raw["slot"]==slot and raw["checked"]==raw["statesCompared"]==100000
                assert verified==get(directory/(arm["arm"]+"-w"+str(arm["workers"])+".json"))
                assert raw["act1"]["arm"]==verified["arm"]==arm["arm"]
                results.append(verified)
            comparison=directory/"comparison.json"
            if comparison.is_file():
                report=get(comparison)
                assert len(results)==5 and {row["slot"] for row in results}=={row["slot"] for row in report["results"]}
                return "recorded",str(comparison)
            if results:return "incomplete","Verified guarded arms: "+", ".join(row["arm"] for row in results)
    elif item==5:
        directory=root/"build/state/evidence/DX-INT1"/r["tag"]
        if (directory/"batch.json").is_file():
            b=get(directory/"batch.json");assert b["source"]==r["source"] and b["unit"]=="triplex-int1-"+r["tag"] and b["rowWire"]=="plain"
            completed={}
            for key,size in (("thin-1m",1_000_000),("thin-4m",4_000_000)):
                case=directory/("rung-"+key)
                seal=case/"SHA256SUMS"
                if not seal.is_file():continue
                assert seal.stat().st_mtime>=r["start"]-2
                lines=seal.read_text().splitlines()
                sums=dict((line[66:],line[:64]) for line in lines)
                assert len(sums)==len(lines) and {"inputs.json","result.json","latency-samples.json"}.issubset(sums)
                for name,expected in sums.items():
                    file=(case/name).resolve()
                    assert file.is_relative_to(case.resolve()) and file.is_file() and digest(file)==expected
                observed=capacity_rung(case,r["source"],size)
                assert re.fullmatch(rf"tx2-dxint1-{r['tag']}-{key}-[a-f0-9]{{12}}",observed["slot"])
                completed[key]=observed["latency"]
            if len(completed)==2:
                return "recorded",str(directory)
            return ("partial" if completed else "incomplete"),"Verified thin populations: "+", ".join(completed)
    return "incomplete","No complete builder comparison"


def fallback(r):
    # [DX-BM1] Why: Mac controllers use authenticated SSH for launch. Their published native commands can still progress on this host during a link or laptop outage.
    # Rejected: copying a private SSH key to the server or losing the remaining queue when a client exits.
    attempt=Path(r["directory"])
    if r["item"] in (1,2,3,8):
        limit=time.time()+45
        while not installed(r) and time.time()<limit:time.sleep(2)
    if not installed(r):launch(r)
    limit=time.time()+20
    while not running(r) and time.time()<limit and not (Path(r["root"])/"terminal").exists():time.sleep(1)
    atom(attempt/"admitted",stamp()+"\n")
    timer=f"bm1n19-hard-{r['item']}-{r['attempt']}"
    if not active(timer+".timer"):
        targets=[r["unit"]+".service"]
        if child:=native_unit(r):targets.append(child+".service")
        seconds=max(1,int(r["deadline"]-time.time()))
        run("systemd-run","--no-block","--unit="+timer,"--on-active="+str(seconds)+"s",
            "--timer-property=AccuracySec=1s","/usr/bin/systemctl","stop",*targets)


def one(item):
    folder=NIGHT/f"i{item}";folder.mkdir(exist_ok=True)
    end=folder/"outcome.json"
    if end.exists():return
    timing=folder/"timing.json"
    if timing.exists():start=get(timing)["start"]
    else:
        start=dt.datetime.fromisoformat("2026-11-20T00:12:21+00:00").timestamp() if item==1 else time.time()
        put(timing,{"start":start})
    limit=start+ITEMS[item][3]*3600
    entry=dict(item=item,state="incomplete",detail="Item deadline elapsed before an admission",ended=stamp())
    for attempt in (1,2):
        if time.time()>=limit-90:break
        r=make(item,attempt,start,limit);sub=Path(r["directory"]);terminal=sub/"terminal.json"
        if not terminal.is_file() and not installed(r):
            status(item,"collector-preflight",start,NEXT[item])
            try:
                preflight(r)
            except (RuntimeError,AssertionError,ValueError,KeyError,OSError,subprocess.SubprocessError) as error:
                atom(sub/"collector-preflight-error.txt",repr(error)+"\n")
                check_released(r)
                entry=dict(item=item,attempt=attempt,tag=r["tag"],source=r["source"],state="preflight-refused",detail=str(error),
                           timedOut=False,ended=stamp(),clean=True)
                put(terminal,entry)
        if terminal.exists():
            entry=get(terminal)
        else:
            status("0-repeat" if item==6 else item,"running",start,NEXT[item])
            missing=not (sub/"admitted").exists()
            if missing:fallback(r)
            timed_out=False
            while running(r):
                if time.time()>=limit:
                    timed_out=True
                    if active(r["unit"]):run("systemctl","stop",r["unit"],timeout=210)
                    if (child:=native_unit(r)) and active(child):run("systemctl","stop",child,timeout=620 if item==6 else 210)
                    break
                restrict_scope(r)
                time.sleep(5)
            cleanup(r)
            check_released(r)
            try:
                state,why=result(r)
            except (TypeError, ValueError, KeyError, AssertionError, OSError) as err:
                state="uncollected" if complete_output(r) else "incomplete"
                why="Producer output kept in its original directory. Collector rejected: "+repr(err)
            entry=dict(item=item,attempt=attempt,tag=r["tag"],source=r["source"],state=state,detail=why,
                       timedOut=timed_out,ended=stamp(),clean=True,serviceResult=command("systemctl","show",r["unit"],"-p","Result","--value"))
            put(terminal,entry)
        bundle=NIGHT/"bundles"/f"i{item}-{attempt}"/"TRANSFER.json"
        if not bundle.is_file():
            status("0-repeat" if item==6 else item,"collecting",start,NEXT[item])
            try:
                run(sys.executable,HERE/"night-archive.py",sub/"request.json",timeout=1200)
            except (OSError,subprocess.SubprocessError) as err:
                atom(sub/"collection-error.txt",repr(err)+"\n")
                if complete_output(r):
                    entry={**entry,"state":"uncollected","detail":"Producer output retained. Transfer archive did not seal."}
        timer=f"bm1n19-hard-{item}-{attempt}.timer"
        if active(timer):run("systemctl","stop",timer)
        if entry["state"]!="incomplete" or entry["timedOut"] or complete_output(r):break
        # A rejected builder preflight consumes one attempt. Failures after admission may use the remaining item budget.
        root=Path(r["root"])
        preflights=[p for p in (root/"preflight-stop.json",root/"preflight/STATUS.json",root/"source-preflight.json") if p.is_file() and ("stop" in p.name or "stopped" in p.read_text()[:8192])]
        if item==5:
            preflights.extend(p for p in (root/"build/state/evidence/DX-INT1"/r["tag"]).glob("*-preflight/STATUS.json") if "stopped" in p.read_text()[:8192])
        if item==6:
            failure=Path("/var/tmp/triplex-scale1")/r["tag"]/"preflight-stop.json"
            if failure.is_file(): preflights.append(failure)
        if item==4:
            smoke=root/"logs/smoke-cleanup/result"
            seed=root/"checkout/state/evidence/DX-T1"/("tx2-dxt1-bm1-"+r["tag"]+"-seed")
            if (root/"logs/smoke.log").is_file() and not smoke.is_file():preflights.append(root/"logs/smoke.log")
            if (seed/"STATUS.json").is_file() and "large seed stopped" in (seed/"STATUS.json").read_text():preflights.append(seed/"STATUS.json")
        if preflights or (item in (1,3) and not (root/"results/arm-1/identity.json").exists()):break
    put(end,entry)
    print(stamp(),entry,flush=True)


def main():
    assert sys.platform=="linux" and os.getuid()==0 and NIGHT.is_dir()
    assert subprocess.run(["systemd-detect-virt","--quiet"]).returncode==1
    mode=sys.argv[1]
    if mode in {"worker","cleanup","preflight-worker","preflight-clean"}:
        item,attempt=map(int,sys.argv[2:4]);r=bind(get(NIGHT/f"i{item}"/str(attempt)/"request.json"))
        if mode.startswith("preflight-"):
            preflight_worker(r,mode=="preflight-clean")
            return
        if mode=="cleanup" and (child:=native_unit(r)) and os.environ.get("SERVICE_RESULT")=="success" and active(child):return
        (worker if mode=="worker" else cleanup)(r);return
    assert mode=="run"
    lock=(NIGHT/"campaign.lock").open("a");fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    assert (NIGHT/"i0/terminal").is_file()
    for item in ORDER:
        if item!=1:
            try:
                if eligible_delta():one(6)
            except (OSError,ValueError,AssertionError,subprocess.SubprocessError):print(traceback.format_exc(),flush=True)
        if item==7:
            try:
                matched_probes()
            except Exception:
                print(traceback.format_exc(),flush=True)
                assert not active("bm1n19-native-probes") and not command("docker","ps","-q")
            continue
        try:
            one(item)
        except Exception as error:
            print(traceback.format_exc(),flush=True)
            directory=NIGHT/f"i{item}"
            directory.mkdir(exist_ok=True)
            requests=sorted(directory.glob("*/request.json"))
            if requests:
                request=bind(get(requests[-1]))
                if running(request):
                    raise RuntimeError("Holding the item until its owned service terminates") from error
                cleanup(request)
                check_released(request)
            put(directory/"outcome.json",dict(item=item,state="incomplete",detail=str(error),ended=stamp()))
        assert not command("docker","ps","-q"),"Cannot transfer an occupied bench"
    assert not command("docker","ps","-q")
    atom(ROOT/"STATUS","FREE "+stamp()+"\n")
    atom(NIGHT/"finished",stamp()+"\n")
    print("FREE",stamp(),flush=True)


if __name__=="__main__":
    main()
