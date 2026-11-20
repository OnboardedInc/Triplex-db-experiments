"""Launch exactly one INT1 capacity rung with the producer's real readiness gate."""

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from producer_readings import capacity_memory, capacity_rung, digest, get

EXP = Path("lab/experiments/EXP-DX1")


def process(r, clean=False):
    root = Path(r["root"])
    source, tag = r["source"], r["tag"]
    assert r["item"] == 26 and re.fullmatch(r"bm1n20intb?", tag)
    assert root == Path("/var/tmp/triplex-int1") / tag
    repo, node = root / "build/repository", root / "build/tools/bin/node"
    owner = root / "int1-owner.json"
    env = dict(os.environ, DOCKER_HOST="unix:///var/run/docker.sock", DX_BARE_METAL="1",
               DX_BARE_METAL_ROOT=str(root), DX_STACK_EVIDENCE=str(root/"engines"),
               DX_STACK_WAIT_FOR_TRANSACTOR="1", DX_QUIET_LOGS="1", DX_NATIVE_GATES="0",
               TRIPLEX_DATOMIC_LAYOUT="lean", DX_INT1_COHORT="spread", DX_INT1_CENSUS="held",
               DX_INT1_GATEWAYS="demand", DX_TOUCHED_READ_MODE="validated", DX_INT1_PEER_GC="g1",
               DX_INT1_SEED_FEED="immediate", DX_INT1_ROW_WIRE="plain",
               TRIPLEX_DATOMIC_FAST_PATHS="", DX_INT1_READER_CPUS="5,6,7,9,10,11",
               DX_GW_READ_MEMORY="3g", DX_GW_WRITE_MEMORY="3g", DX_GW_READ_HEAP="2g",
               DX_GW_WRITE_HEAP="2g", TX2_SWEEP_STRICT="1")
    env["PATH"] = str(node.parent) + ":" + env["PATH"]

    def command(*args, timeout=45):
        return subprocess.check_output(list(map(str,args)), cwd=repo, env=env, text=True, timeout=timeout).strip()

    def run(*args, timeout, stdout=None):
        subprocess.run(list(map(str,args)), cwd=repo, env=env, timeout=timeout, check=True, stdout=stdout)

    def save(file, obj):
        with file.open("x") as stream:
            json.dump(obj,stream,indent=2)
            stream.write("\n")

    assert command("git","rev-parse","HEAD")==source
    if clean:
        if not owner.is_file():return
        binding=get(owner)
        assert binding["source"]==source and binding["tag"]==tag and binding["request"]==r["requested"]
        prefix=binding["prefix"]
        assert re.fullmatch("tx2-dxint1-"+tag+"-thin-1m-[a-f0-9]{12}",prefix)
        with (root/"engine-logs.txt").open("w") as log:
            subprocess.run(["bash",str(EXP/"stack/up.sh"),prefix,"--logs"],cwd=repo,env=env,
                           stdout=log,stderr=subprocess.STDOUT,timeout=40)
        run("bash",EXP/"stack/down.sh",prefix,"--volumes",timeout=120)
        assert not command("bash",EXP/"stack/up.sh",prefix,"--inventory")
        save(root/"int1-clean.json",{**binding,"remaining":[]})
        owner.unlink()
        return
    assert not command("git","status","--porcelain") and not command("docker","ps","-q")
    nonce=uuid.uuid4().hex[:12]
    prefix="tx2-dxint1-"+tag+"-thin-1m-"+nonce
    binding=dict(source=source,prefix=prefix,nonce=nonce,tag=tag,request=r["requested"])
    save(owner,binding)
    env.update(TRIPLEX_TRACE_SOURCE=source,TRIPLEX_TRACE_SLOT=prefix,TRIPLEX_TRACE_RUN=prefix)
    run("bash",EXP/"stack/up.sh",prefix,"--no-publish","--cpus-tx","0","--cpus-pg","1",
        "--cpus-gw-write","2","--cpus-gw-read","4,8","--tx-memory","5g","--pg-memory","2g",
        "--tx-java-opts","-Xms256m -Xmx3g -XX:+UseG1GC","--object-cache-max","1280m",timeout=600)
    engine=root/"engines"/prefix/"stack.json"
    stack=get(engine)
    assert stack["prefix"]==prefix and len(stack["containers"])==4
    for role in ("w","r"):
        ip=command("docker","inspect","--format","{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",prefix+"-gw-"+role)
        assert re.fullmatch(r"(?:[0-9]{1,3}\.){3}[0-9]{1,3}",ip)
        stack[{"w":"writeUrl","r":"readUrl"}[role]]="http://"+ip+":8080"
    attached=root/"stack-access.json"
    save(attached,{**stack,"engineSha256":digest(engine)})
    env.update(DX_THIN_STACK=str(attached),DATOMIC_URL=stack["writeUrl"],DATOMIC_READ_URLS=stack["readUrl"])
    # [DX-BM1] Why: the native ACT2 guard fingerprints paths relative to the checkout.
    # Rejected: the default systemd working directory, which fails before opening the guarded database.
    heavy=(node,"lab/bin/heavy.mjs","--label","DX-BM1","--","taskset","-c","3",node,
           "--no-warnings","--experimental-transform-types","--expose-gc")
    run(*heavy,EXP/"act2/preflight-runner.ts",root/"activation-preflight",source,prefix,nonce,timeout=620)
    for size in (1000,1000000):
        folder=root/("small" if size==1000 else "rung-thin-1m")
        left=max(1,int(r["deadline"]-time.time()-150))
        run(*heavy,EXP/"int1/trial.ts","live","int1-thin",size,folder,timeout=min(left,900) if size==1000 else left)
        with (folder/"producer-check.json").open("x") as stream:
            run(node,"--import","tsx",Path(__file__).with_name("int1-verify.mjs"),folder,attached,source,size,
                timeout=min(left,600),stdout=stream)
        row=capacity_rung(folder,source,size)
        assert row["slot"]==prefix and (folder/"inputs.json").stat().st_mtime>=r["start"]
        save(folder/"bm1-reading.json",{"source":source,"prefix":prefix,"attempt":row["attempt"],
             "resultSha256":digest(folder/"result.json"),"producerSha256":digest(folder/"producer-check.json"),
             "latency":row["latency"],"memory":capacity_memory(folder,row,full=True)})


if __name__=="__main__":
    assert sys.platform=="linux" and os.getuid()==0
    process(get(Path(sys.argv[2])),clean=sys.argv[1]=="cleanup")
