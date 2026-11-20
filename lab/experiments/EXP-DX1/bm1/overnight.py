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
    6: (ACT, "actv-delta", "d8a921352", 4, "solon19"),
    2: ("exp/DX-ACT1-activation", "import1", "eb154ca8", 5, "import-bm1n19"),
    3: (W1, "w1", "502c8897", 3, "w1trial01"),
    4: (ACT, "act2", "a9eb03b0", 4, "n19guard"),
    5: ("exp/DX-INT1", "int1", None, 5, "bm1n19int"),
}
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


def public_source(item, directory):
    branch, component, minimum, _, _ = ITEMS[item]
    head = command("git","-c","credential.helper=","ls-remote","--exit-code",URL,"refs/heads/"+branch).split()[0]
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
    report = repo / EXP / component / "REPORT.md"
    if not report.is_file():
        raise ValueError("The builder has no published report")
    shutil.copyfile(report,directory/"builder-report.md")
    for name in ("HANDOFF.md","README.md"):
        f=report.with_name(name)
        if f.is_file(): shutil.copyfile(f,directory/("builder-"+name.lower()))
    return head,repo


def coordinates(item,attempt):
    assert item in ITEMS and attempt in (1,2)
    tag=ITEMS[item][4]
    if item == 1: tag += "ab"[attempt-1]
    elif attempt==2: tag += "b"
    if item in (1,3): root=Path("/var/tmp/triplex-w1")/tag; unit="triplex-w1-"+tag
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
    token="| Item 0 repeat," if item==6 else f"| {item} ·"
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
    if r["item"] in (1,3):
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
    stop=stamp(r["deadline"]-25)
    runner=repo/EXP/"bm1/queue-day.sh"
    atom(logs/"after-guarded.txt","collect\n")
    atom(logs/"source.txt",r["source"]+"\n")
    for stage in ("setup","smoke","seed","guarded"):
        remaining=int(r["deadline"]-time.time()-25)
        if remaining<30:raise TimeoutError("guarded item ceiling")
        cap=min(remaining,{"setup":1800,"smoke":1800,"seed":14400,"guarded":10800}[stage])
        unit="triplex-bm1-"+tag+"-"+stage
        atom(root/"active-item",stage+"\n")
        status(4,stage,time.time(),5)
        subprocess.run(["systemd-run","--wait","--unit="+unit,"-p","KillMode=control-group",
            "-p",f"RuntimeMaxSec={cap}s","-p","TimeoutStopSec=120s",
            "-p",f"ExecStopPost=/bin/bash {runner} --cleanup {tag} {stop} {stage}",
            "/bin/bash",str(runner),"--item",tag,stop,stage,stamp(time.time()+cap)],env=env,check=True)
        assert (logs/(stage+"-cleanup/result")).read_text().strip()=="clean"
        (root/"active-item").unlink()
        if stage=="seed": assert (root/"pristine/seed.json").is_file()
        if stage=="guarded": assert (root/"guarded/comparison.json").is_file()


def worker(r):
    root,tag,source=Path(r["root"]),r["tag"],r["source"]
    env=dict(ENV)
    if r["item"]==4:
        stage_guard(r,env);return
    repo,node=setup(r,env)
    heavy=[node,"lab/bin/heavy.mjs","--label","DX-BM1-night-"+str(r["item"]),"--",node]
    if r["item"]==6:
        run("bash",HERE/"delta-preflight.sh","run",root,source,cwd=repo,env=env)
    elif r["item"] in (1,3):
        args=[EXP/"w1/group/server.ts","run",root,source,tag] if r["item"]==1 else [EXP/"w1/bench.ts",root,source,tag]
        run(*heavy,"--experimental-strip-types",*args,cwd=repo,env=env)
    elif r["item"]==2:run(*heavy,"--experimental-strip-types",EXP/"import1/server.ts","--execute",root,source,cwd=repo,env=env)
    else:
        run(node,"--no-warnings","--experimental-transform-types",repo/EXP/"thin1/queue-bench.ts","--launch",tag,
            stamp(r["deadline"]-10),root/"build","--int1","--row-wire=gzip",cwd=repo,env=env)


def cleanup(r):
    root,tag,src=Path(r["root"]),r["tag"],r["source"]
    if r["item"] in (1,3) and (root/"active-slot").exists():
        run("bash",Path(r["repo"])/EXP/"w1/release.sh",root,timeout=180)
    elif r["item"]==6 and (root/"ownership").is_file():
        run("bash",HERE/"delta-preflight.sh","clean",root,src,timeout=180)
    elif r["item"]==2 and (root/"active.json").exists():
        run(root/"build/tools/bin/node","--experimental-strip-types",root/"build/repository"/EXP/"import1/server.ts",
            "--cleanup",root,src,timeout=180)
    elif r["item"]==4 and (root/"active-item").exists():
        stage=(root/"active-item").read_text().strip()
        assert stage in {"setup","smoke","seed","guarded"}
        unit="triplex-bm1-"+tag+"-"+stage
        if active(unit):run("systemctl","stop",unit,timeout=190)
        runner=Path(r["repo"])/EXP/"bm1/queue-day.sh"
        if not (root/"logs"/(stage+"-cleanup/result")).exists():
            run("bash",runner,"--cleanup",tag,stamp(r["deadline"]-25),stage,"retry",timeout=180)
        assert (root/"logs"/(stage+"-cleanup/result")).read_text().strip()=="clean"
        (root/"active-item").unlink(missing_ok=True)
    elif r["item"]==5:
        unit="triplex-int1-"+tag
        if active(unit):run("systemctl","stop",unit,timeout=200)
    assert not command("docker","ps","-q"),"A running stack remains on the dedicated machine"


def remaining(r):
    item, tag = r["item"],r["tag"]
    root=Path(r["root"])
    if item in (1,3): prefixes=["tx2-dxscale1-w1-"+tag+"-"]
    elif item==5: prefixes=["tx2-dxint1-"+tag+"-"]
    elif item==6: prefixes=["tx2-dxscale1-bm1"+tag+"-"]
    else:
        prefixes=["tx2-dxt1-bm1-"+tag+"-"] if item==4 else []
        files=(root/"guarded").glob("*-request.json") if item==4 else root.glob("*/attempt.json")
        for f in files:
            a=get(f)
            assert a.get("source")==r["source"]
            if item==2:
                assert a["tag"]==tag and re.fullmatch("tx2-dximport-[a-f0-9]{20}",a["prefix"])
                prefixes.append(a["prefix"]+"-")
            else:
                assert re.fullmatch(r"tx2-dxt1-bm1-act[0-9a-f]{9}-activation-a",a["slot"])
                prefixes.append(a["slot"]+"-")
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
    return r["item"]==5 and active("triplex-int1-"+r["tag"])


def restrict_scope(r):
    root=Path(r["root"])
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
                assert a["arm"]==get(path/"identity.json") and a["arm"]["source"]==r["source"]
                assert a["arm"]["slot"]=="tx2-dxscale1-w1-"+r["tag"]+"-"+str(index) and a["arm"]["nonce"]+"-load"==json.loads(a["scope"])[3]
                assert a["seed"]=="2720380f5b5e6f31fd632380e6ef6d16acc4d646735962d2cb908e0ab40e1146" and len(a["seeds"])==10
                assert a["rawSha256"]==digest(path/"raw.json") and a["seedReadbackSha256"]==digest(path/"seed-readback.json")
                assert get(path/"cleanup.json")==dict(containers=[],volumes=[],networks=[])
                assert [p["name"] for p in a["phases"]]==["alone","one","nine","all"]
                for p in a["phases"]:
                    assert p["count"]==sum(v["count"] for v in p["byAccount"].values()) and p["wall"]>0
                    assert p["quietP99Ratio"]==p["quietMs"]["p99"]/a["phases"][0]["quietMs"]["p99"]
            return "recorded",str(f)
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
        check=root/"solo-100000/independent-check.json"
        if check.is_file():
            request=get(root/"solo-100000/request.json"); doc=get(check); original=get(root/"solo-100000/result.json")
            assert original["binding"]==doc["binding"]==request and request["source"]==r["source"]
            assert request["slot"]=="tx2-dxscale1-bm1"+r["tag"] and original["subjects"]==doc["subjects"]==100000
            assert doc["offers"]==original["loaded"]["count"]==90 and len(original["accounts"])==1
            assert original["loaded"]["sha"]==digest(root/"solo-100000/loaded.json")
            assert original["loaded"]["p99"]==doc["p99"] and len(original["reference"])==2
            return "recorded",str(check)
    elif item==4 and (root/"guarded/comparison.json").is_file():
        comparison=get(root/"guarded/comparison.json")
        rows=comparison["results"];assert len(rows)>=4
        for row in rows:
            assert re.fullmatch(r"tx2-dxt1-bm1-act[a-f0-9]{9}-activation-a",row["slot"])
            batch=row["slot"].split("-")[3]
            out=ROOT/("day-"+batch)/"checkout/state/evidence/DX-T1"/row["slot"]
            raw=get(out/"act1-sweep.json");verified=get(out/"act1-verified.json")
            assert verified["rawSha256"]==digest(out/"act1-sweep.json")
            assert raw["source"]==r["source"] and raw["slot"]==row["slot"] and raw["checked"]==100000 and raw["statesCompared"]==100000
            assert row["comparedSha256"]==verified["comparedSha256"]
        return "recorded",str(root/"guarded/comparison.json")
    elif item==5:
        directory=root/"build/state/evidence/DX-INT1"/r["tag"]
        if (directory/"batch.json").is_file():
            b=get(directory/"batch.json");assert b["source"]==r["source"] and b["unit"]=="triplex-int1-"+r["tag"]
            completed=[]
            for f in directory.glob("*/SHA256SUMS"):
                if f.stat().st_size:
                    sums=dict((line[66:],line[:64]) for line in f.read_text().splitlines())
                    for name in ("inputs.json","result.json"):
                        if name not in sums:break
                        assert sums[name]==digest(f.parent/name)
                    else:
                        inputs=get(f.parent/"inputs.json");result=get(f.parent/"result.json")
                        assert inputs["source"]==r["source"] and result["source"]==r["source"] and result["slot"]==inputs["slot"]
                        completed.append(result.get("size"))
            if {1000000,4000000}.issubset(completed):
                return "recorded",str(directory)
            return "incomplete","Completed thin populations: "+str(completed)
    return "incomplete","No complete builder comparison"


def fallback(r):
    # [DX-BM1] Why: Mac controllers use authenticated SSH for launch. Their published native commands can still progress on this host during a link or laptop outage.
    # Rejected: copying a private SSH key to the server or losing the remaining queue when a client exits.
    attempt=Path(r["directory"])
    if r["item"] not in (4,6):
        limit=time.time()+45
        while not installed(r) and time.time()<limit:time.sleep(2)
    if not installed(r):launch(r)
    limit=time.time()+20
    while not running(r) and time.time()<limit and not (Path(r["root"])/"terminal").exists():time.sleep(1)
    atom(attempt/"admitted",stamp()+"\n")
    timer=f"bm1n19-hard-{r['item']}-{r['attempt']}"
    if not active(timer+".timer"):
        targets=[r["unit"]+".service"]
        if r["item"]==5:targets.append("triplex-int1-"+r["tag"]+".service")
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
        if terminal.exists():
            entry=get(terminal)
        else:
            status("0-repeat" if item==6 else item,"running",start,{1:"0-repeat",6:2,2:3,3:4,4:5,5:"collect"}[item])
            missing=not (sub/"admitted").exists()
            if missing:fallback(r)
            timed_out=False
            while running(r):
                if time.time()>=limit:
                    timed_out=True
                    if active(r["unit"]):run("systemctl","stop",r["unit"],timeout=210)
                    if item==5 and active("triplex-int1-"+r["tag"]):run("systemctl","stop","triplex-int1-"+r["tag"],timeout=210)
                    break
                restrict_scope(r)
                time.sleep(5)
            cleanup(r)
            check_released(r)
            try:
                state,why=result(r)
            except (TypeError, ValueError, KeyError, AssertionError, OSError) as err:
                state,why="incomplete","Archived inputs failed comparison: "+repr(err)
            entry=dict(item=item,attempt=attempt,tag=r["tag"],source=r["source"],state=state,detail=why,
                       timedOut=timed_out,ended=stamp(),clean=True,serviceResult=command("systemctl","show",r["unit"],"-p","Result","--value"))
            put(terminal,entry)
        bundle=NIGHT/"bundles"/f"i{item}-{attempt}"/"TRANSFER.json"
        if not bundle.is_file():
            status("0-repeat" if item==6 else item,"collecting",start,{1:"0-repeat",6:2,2:3,3:4,4:5,5:"collect"}[item])
            try:
                run(sys.executable,HERE/"night-archive.py",sub/"request.json",timeout=1200)
            except (OSError,subprocess.SubprocessError) as err:
                atom(sub/"collection-error.txt",repr(err)+"\n")
        timer=f"bm1n19-hard-{item}-{attempt}.timer"
        if active(timer):run("systemctl","stop",timer)
        if entry["state"]!="incomplete" or entry["timedOut"]:break
        # A rejected builder preflight consumes one attempt. Failures after admission may use the remaining item budget.
        root=Path(r["root"])
        preflights=[p for p in (root/"preflight-stop.json",root/"preflight/STATUS.json",root/"source-preflight.json") if p.is_file() and ("stop" in p.name or "stopped" in p.read_text()[:8192])]
        if item==5:
            preflights.extend(p for p in (root/"build/state/evidence/DX-INT1"/r["tag"]).glob("*-preflight/STATUS.json") if "stopped" in p.read_text()[:8192])
        if item==4 and (root/"logs/smoke.log").is_file() and not (root/"logs/seed.log").is_file():preflights.append(root/"logs/smoke.log")
        if preflights or (item in (1,3) and not (root/"results/arm-1/identity.json").exists()):break
    put(end,entry)
    print(stamp(),entry,flush=True)


def main():
    assert sys.platform=="linux" and os.getuid()==0 and NIGHT.is_dir()
    assert subprocess.run(["systemd-detect-virt","--quiet"]).returncode==1
    mode=sys.argv[1]
    if mode in {"worker","cleanup"}:
        item,attempt=map(int,sys.argv[2:4]);r=bind(get(NIGHT/f"i{item}"/str(attempt)/"request.json"))
        if mode=="cleanup" and item==5 and os.environ.get("SERVICE_RESULT")=="success" and active("triplex-int1-"+r["tag"]):return
        (worker if mode=="worker" else cleanup)(r);return
    assert mode=="run"
    lock=(NIGHT/"campaign.lock").open("a");fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    assert (NIGHT/"i0/terminal").is_file()
    for item in ITEMS:
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
