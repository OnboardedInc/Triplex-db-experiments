"""Run the two matched short probes from the verified W1 seed on the native bench."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import uuid

NIGHT = Path("/var/tmp/triplex-bm1/night-n19")
GROUP = Path("/var/tmp/triplex-w1/grpw1a")
BASE = NIGHT / "native-probes"
SCRIPT = Path(__file__).resolve().parent
REPO = GROUP / "build/repository"
NODE = GROUP / "build/tools/bin/node"
STACK = Path("lab/experiments/EXP-DX1/stack")
ROLES = ("pg", "tx", "gw-w", "gw-r")
INPUT = NIGHT / "checkpoints/grpw1a-1-before-probes/checkpoint.json"
BASE_ENV = dict(os.environ, PATH=str(NODE.parent) + ":" + os.environ["PATH"], DOCKER_HOST="unix:///var/run/docker.sock",
                DX_BARE_METAL="1", TURBO_TELEMETRY_DISABLED="1", DX_STACK_WAIT_FOR_TRANSACTOR="1",
                TRIPLEX_TRACE_LEVEL="full", TRIPLEX_TRACE_COMPONENTS="node,gateway,tx-jfr",
                TRIPLEX_TRACE_GATEWAY="1", TRIPLEX_TRACE_NODE="1", TRIPLEX_TRACE_TX_JFR="1", DX_TX_NATIVE_JFR="1",
                DX_QUIET_LOGS="1", DX_GW_WRITE_MEMORY="4g", DX_GW_READ_MEMORY="4g",
                DX_GW_WRITE_JAVA_OPTS="-Xms256m -Xmx3g", DX_GW_READ_JAVA_OPTS="-Xms256m -Xmx3g", DX_GROUP_COMMIT="0")


def command(*argv, timeout=120, env=BASE_ENV):
    return subprocess.check_output(list(map(str,argv)), cwd=REPO, env=env, timeout=timeout, text=True).strip()


def run(*argv, timeout=180, env=BASE_ENV, **args):
    subprocess.run(list(map(str,argv)), cwd=REPO, env=env, timeout=timeout, check=True, **args)


def sha(file):
    with Path(file).open("rb") as f: return hashlib.file_digest(f,"sha256").hexdigest()


def get(file):
    return json.loads(Path(file).read_bytes())


def put(file, value):
    with Path(file).open("x") as out:
        json.dump(value,out,indent=2)
        out.write("\n")


def bound_slot(slot):
    return bool(re.fullmatch(r"tx2-dxt1-bm1-n19probe-[a-f0-9]{8}-(base|growth[1-4]|readers[1-4])",slot))


def env_for(slot, directory):
    assert bound_slot(slot) and directory.parent == BASE
    return dict(BASE_ENV, DX_BARE_METAL_ROOT=str(directory), DX_STACK_EVIDENCE=str(directory/"engines"),
                TRIPLEX_TRACE_RUN=slot, TRIPLEX_TRACE_SLOT=slot, TRIPLEX_TRACE_SOURCE=command("git","rev-parse","HEAD"))


def cleanup():
    marker=BASE/"active.json"
    if not marker.is_file():return
    state=get(marker);slot=state["slot"];directory=Path(state["directory"])
    env=env_for(slot,directory)
    assert state["source"]==env["TRIPLEX_TRACE_SOURCE"] and (directory/"attempt.json").is_file()
    assert state==get(directory/"attempt.json")
    for role in ROLES:
        with (directory/(role+".log")).open("wb") as log:
            subprocess.run(["docker","logs",slot+"-"+role],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=30)
    run("bash",STACK/"down.sh",slot,"--volumes",env=env)
    remaining=command("bash",STACK/"up.sh",slot,"--inventory",env=env)
    assert not remaining
    if not (directory/"cleanup.json").exists():put(directory/"cleanup.json",{"slot":slot,"source":state["source"],"remaining":[]})
    marker.unlink()


def stack(ordinal,mode,experiment,staged=None):
    tag=mode+str(ordinal) if mode!="base" else "base"
    slot=f"tx2-dxt1-bm1-n19probe-{experiment}-{tag}"
    if mode not in ("base","growth","readers"):raise ValueError(mode)
    directory=BASE/slot
    directory.mkdir(mode=0o700)
    env=env_for(slot,directory)
    ownership={"slot":slot,"source":env["TRIPLEX_TRACE_SOURCE"],"directory":str(directory),"nonce":str(uuid.uuid4())}
    assert not command("docker","ps","-q")
    assert not command("bash",STACK/"up.sh",slot,"--inventory",env=env)
    put(directory/"attempt.json",ownership)
    put(BASE/"active.json",ownership)
    if mode=="base":
        env.update(TRIPLEX_TRACE_LEVEL="off",TRIPLEX_TRACE_COMPONENTS="",TRIPLEX_TRACE_GATEWAY="0",
                   TRIPLEX_TRACE_TX_JFR="0",DX_TX_NATIVE_JFR="0")
    args=["bash",STACK/"up.sh",slot,"--no-publish","--cpus-tx","0","--cpus-pg","1","--cpus-gw-write","2",
          "--cpus-gw-read","4","--pg-memory","6g","--tx-memory","6g","--object-cache-max","1280m",
          "--tx-java-opts","-Xms256m -Xmx5g -XX:+UseG1GC",
          "--pg-settings","-c shared_buffers=1GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on -c track_io_timing=on -c track_wal_io_timing=on"]
    if staged:args+=["--gateway-src",staged]
    try:
        run(*args,timeout=240,env=env)
        # The named W1 source accepts CPUs up to 7 in stack/up.sh, then gives the read peer its second core.
        run("docker","update","--cpuset-cpus","4,8",slot+"-gw-r",env=env)
    except (OSError, subprocess.SubprocessError):
        cleanup()
        raise
    return directory,slot,env,ownership


def volume(slot):
    v=get_json_command("docker","volume","inspect",slot+"-pg-data")[0]
    target=Path(v["Mountpoint"])
    root=Path(command("docker","info","--format","{{.DockerRootDir}}"))
    assert target==root/"volumes"/(slot+"-pg-data")/"_data" and v["Name"]==slot+"-pg-data"
    assert target.is_dir() and not target.is_symlink()
    return target


def get_json_command(*argv):
    return json.loads(command(*argv))


def pg(id,*argv,**kwargs):
    return command("docker","exec",id,*argv,**kwargs)


def files(root):
    return {p.relative_to(root).as_posix():sha(p) for p in sorted(root.rglob("*")) if p.is_file() and not p.is_symlink()}


def create_template(experiment,checkpoint):
    directory,slot,env,_=stack(0,"base",experiment)
    dump=INPUT.with_name("host.pgdump")
    assert dump.stat().st_size==checkpoint["bytes"] and sha(dump)==checkpoint["dumpSha256"]
    try:
        run("docker","stop","--time","20",slot+"-gw-r",slot+"-gw-w",slot+"-tx",env=env)
        with dump.open("rb") as stream:
            run("docker","exec","-i",slot+"-pg","pg_restore","-U","postgres","--exit-on-error","--clean","--if-exists",
                "-d","datomic",stdin=stream,timeout=420,env=env)
        run("docker","stop","--time","30",slot+"-pg",env=env)
        pgdata=volume(slot)
        assert not (pgdata/"postmaster.pid").exists()
        target=BASE/"frozen-pgdata";target.mkdir(mode=0o700)
        run("cp","-a","--reflink=auto",str(pgdata)+"/.",target,timeout=120)
        expected=files(target)
        assert expected==files(pgdata) and (target/"PG_VERSION").read_text().strip()=="17"
        put(BASE/"frozen-files.json",expected)
        put(BASE/"snapshot.json",{"checkpointSha256":sha(INPUT),"dumpSha256":checkpoint["dumpSha256"],"filesSha256":sha(BASE/"frozen-files.json")})
        return target, expected
    finally:
        cleanup()


def reopen(slot,env,source_files,expected,dir):
    # [DX-BM1] Why: each independently initialized stack receives the same stopped PGDATA bytes.
    # Rejected: starting a new block at the previous block’s later Datomic head.
    run("docker","stop","--time","25",slot+"-gw-r",slot+"-gw-w",slot+"-tx",slot+"-pg",env=env)
    raw=dir/"engines"/slot/"trace/raw"
    if raw.exists():
        started=dir/"initial-trace";started.mkdir()
        for file in raw.iterdir():file.rename(started/file.name)
    data=volume(slot)
    for entry in data.iterdir():
        if entry.is_dir() and not entry.is_symlink():shutil.rmtree(entry)
        else:entry.unlink()
    run("cp","-a","--reflink=auto",str(source_files)+"/.",data,timeout=150,env=env)
    assert expected==files(data)
    put(dir/"restored-proof.json",{"snapshot":sha(BASE/"snapshot.json"),"sealedFiles":len(expected),"slot":slot,"source":env["TRIPLEX_TRACE_SOURCE"]})
    run("docker","start",slot+"-pg",env=env)
    deadline=time.time()+60
    while subprocess.run(["docker","exec",slot+"-pg","pg_isready","-h","127.0.0.1","-U","postgres"],
                         env=env,stdout=subprocess.DEVNULL,timeout=10).returncode:
        if time.time()>deadline:raise TimeoutError("Restored PostgreSQL failed health")
        time.sleep(1)
    settings=pg(slot+"-pg","psql","-U","postgres","-Atc","SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')")
    assert settings=="on|on|on"
    run("docker","start",slot+"-tx",slot+"-gw-w",slot+"-gw-r",env=env)


def counters(directory, slot, phase):
    sql=("SELECT jsonb_build_object('wal',(SELECT to_jsonb(w) FROM pg_stat_wal w),"
         "'io',(SELECT jsonb_agg(i) FROM pg_stat_io i),"
         "'db',(SELECT to_jsonb(d) FROM pg_stat_database d WHERE datname='datomic'),"
         "'walSyncMethod',current_setting('wal_sync_method'))")
    snapshot={"at":time.time(),"postgres":json.loads(pg(slot+"-pg","psql","-U","postgres","-Atc",sql))}
    snapshot["pressure"]={key:(Path("/proc/pressure")/key).read_text() for key in ("cpu","io","memory")}
    snapshot["cpus"]={k:str((Path(f"/sys/devices/system/cpu/cpu{k}/topology/thread_siblings_list")).read_text().strip())
                       for k in range(12)}
    snapshot["processes"]={}
    for role in ROLES:
        name=slot+"-"+role
        pid=command("docker","inspect","--format","{{.State.Pid}}",name)
        cpus=command("docker","inspect","--format","{{.HostConfig.CpusetCpus}}",name)
        threads={}
        for f in (Path("/proc")/pid/"task").glob("*/schedstat"):
            try:threads[f.parent.name]={"name":f.with_name("comm").read_text().strip(),"stats":f.read_text().split()}
            except FileNotFoundError:continue
        snapshot["processes"][role]={"pid":pid,"cpus":cpus,"threads":threads}
    assert len(set(snapshot["cpus"].values()))==12
    put(directory/(phase+"-counters.json"),snapshot)


def case(run_id,mode,ordinal,setting,files_root,expected,staged):
    dir,slot,env,identity=stack(ordinal,mode,run_id,staged if mode=="growth" else None)
    try:
        reopen(slot,env,files_root,expected,dir)
        for role,key in (("gw-w","DATOMIC_URL"),("gw-r","PROBE_READ_URL")):
            ip=command("docker","inspect","--format","{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",slot+"-"+role,env=env)
            assert re.fullmatch(r"[0-9.]+",ip)
            url=f"http://{ip}:8080"
            end=time.time()+175
            while subprocess.run(["curl","-fsS","--max-time","2",url+"/health"],stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL,env=env,timeout=4).returncode:
                if time.time()>end: raise TimeoutError("Restored gateway failed health")
                time.sleep(1)
            env[key]=url
        raw=dir/"engines"/slot/"trace/raw"
        env.update(TRIPLEX_TRACE_DIR=str(raw),TRIPLEX_DATOMIC_LAYOUT="lean",TRIPLEX_DATOMIC_FAST_PATHS="history-range" if mode=="growth" and setting=="on" else "")
        with (dir/"foreground.log").open("x") as log:
            args=[NODE,"lab/bin/heavy.mjs","--label","DX-BM1-native-"+mode,"--","taskset","-c","3",NODE,
                  "--import","tsx",SCRIPT/"foreground.mjs",dir,mode,setting,INPUT,identity["nonce"]]
            proc=subprocess.Popen(list(map(str,args)),cwd=REPO,env=env,stdout=log,stderr=subprocess.STDOUT)
            try:
                deadline=time.time()+60
                while not (dir/"foreground-ready.json").is_file():
                    if proc.poll() is not None or time.time()>=deadline:raise RuntimeError("Foreground initialization failed")
                    time.sleep(.2)
                counters(dir,slot,"before")
                put(dir/"timing-gate.json",{"open":time.time(),"nonce":identity["nonce"]})
                deadline=time.time()+145
                while not (dir/"foreground-done.json").is_file():
                    if proc.poll() is not None or time.time()>=deadline:raise RuntimeError("Foreground interval failed")
                    time.sleep(.2)
                counters(dir,slot,"after")
                put(dir/"verification-gate.json",{"open":time.time(),"nonce":identity["nonce"]})
                if proc.wait(timeout=120):raise RuntimeError("Foreground receipt or row verification failed")
            finally:
                if proc.poll() is None:
                    proc.terminate()
                    try:proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:proc.kill();proc.wait()
        (raw/".finish").touch(exist_ok=False)
        deadline=time.time()+75
        while not (raw/"tx.jfr-complete.jsonl").exists():
            if time.time()>=deadline or (raw/"tx-jfr-error.txt").is_file():raise RuntimeError("Native transaction trace incomplete")
            time.sleep(1)
    finally:
        cleanup()
    return str(dir)


def main():
    if sys.argv[1:]==["cleanup"]:
        cleanup();return
    assert sys.argv[1:]==["run"] and sys.platform=="linux" and os.getuid()==0
    checkpoint=get(INPUT)
    expected_source=(GROUP/"source").read_text().strip()
    assert checkpoint["source"]==expected_source==command("git","rev-parse","HEAD")
    assert checkpoint["slot"]=="tx2-dxscale1-w1-grpw1a-1" and checkpoint["seed"]["facts"]==16245050
    assert Path(checkpoint["original"])==GROUP/"results/arm-1"
    assert checkpoint["bindingSha256"]==sha(NIGHT/"probes/grpw1a-1/bound-seed.json")
    assert shutil.disk_usage(NIGHT).free>45*1024**3
    BASE.mkdir(mode=0o700,exist_ok=False)
    experiment=uuid.uuid4().hex[:8]
    put(BASE/"plan.json",{"source":expected_source,"experiment":experiment,"checkpoint":sha(INPUT),
        "sequence":["off","on","on","off"],"growthOff":"individual","growthOn":"range","started":time.time()})
    root, expected=create_template(experiment,checkpoint)
    staged=BASE/"gateway-growth"
    with (BASE/"staged-sources.json").open("x") as out:
        run(sys.executable,SCRIPT/"stage-gateway.py",REPO,staged,expected_source,stdout=out)
    records=[]
    for mode in ("readers","growth"):
        try:
            for ordinal,setting in enumerate(("off","on","on","off"),1):
                records.append({"mode":mode,"setting":setting,"directory":case(experiment,mode,ordinal,setting,root,expected,staged)})
        except (OSError,subprocess.SubprocessError,AssertionError,RuntimeError) as error:
            records.append({"mode":mode,"error":repr(error)})
    put(BASE/"recorded.json",records)
    run(NODE,SCRIPT/"read-probe.mjs",BASE,timeout=180)


if __name__=="__main__":main()
