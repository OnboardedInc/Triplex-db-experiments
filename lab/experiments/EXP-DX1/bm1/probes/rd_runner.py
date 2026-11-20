"""Run the published RD1 writer probe in an owned, restored native stack."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import uuid

import native as stack
from rd_reading import summarize
from seeded_campaign import start_roles


def restore_scheduler(root):
    marker = root / "scheduler-before.json"
    if marker.is_file():
        before = stack.get(marker)["sched_schedstats"]
        assert before in {"0", "1"}
        Path("/proc/sys/kernel/sched_schedstats").write_text(before + "\n")
        assert Path("/proc/sys/kernel/sched_schedstats").read_text().strip() == before
        marker.unlink()


def main(argv):
    action, folder, source, seed_file = argv
    assert sys.platform == "linux" and os.getuid() == 0
    assert re.fullmatch(r"/var/tmp/triplex-w1/readersn20b?",folder)
    root = Path(folder)
    stack.BASE,stack.INPUT = root/"checkpoint-arms",Path(seed_file)
    stack.REPO,stack.NODE = root/"build/repository",root/"build/tools/bin/node"
    stack.BASE_ENV["PATH"]=str(stack.NODE.parent)+":"+stack.BASE_ENV["PATH"]
    if action == "cleanup":
        try:
            stack.cleanup()
        finally:
            restore_scheduler(root)
        return
    assert action == "run" and stack.command("git","rev-parse","HEAD") == source
    assert not stack.command("git","status","--porcelain")
    assert not stack.command("docker","ps","-q")
    if not shutil.which("perf"):
        release = os.uname().release
        assert re.fullmatch(r"[a-z0-9.\-]+",release)
        # [DX-BM1] Why: supply the release-matched PMU tool before any timed stack opens.
        # Rejected: hardware counter discovery in the first measurement block.
        stack.run("apt-get","install","-y","--no-install-recommends","linux-tools-"+release,
                  env=dict(stack.BASE_ENV,DEBIAN_FRONTEND="noninteractive"),timeout=180)
    seed = stack.get(stack.INPUT)
    assert seed["kind"] == "scale1-single" and seed["seed"]["people"] == 100000
    program = Path("lab/experiments/EXP-DX1/rd1/writer-probe.ts")
    base = (stack.NODE,"--import","tsx",program)
    start = time.time()
    smoke = root/"preflight"
    stack.run(*base,smoke,"2","self-test","2",timeout=40)
    stack.put(root/"preflight-reading.json",summarize(smoke,source,"offline-fixture",stack.REPO/program,start,offline=True))
    # [DX-BM1] Why: the published RD1 writer diagnostic owns its four fresh scopes in the restored storage context.
    # Rejected: patching it to accept a missing group-format ledger or claiming its writer scopes contain the full seed.
    stack.BASE.mkdir()
    key = uuid.uuid4().hex[:8]
    frozen,expected = stack.create_template(key,seed)
    settings = {
        "TRIPLEX_TRACE_COMPONENTS":"node,gateway,tx-jfr,gw-jfr",
        "DX_GW_WRITE_JAVA_OPTS":"-Xms256m -Xmx3g -Xlog:gc*,safepoint:stdout:time,uptimemillis,level,tags",
        "TRIPLEX_NODE_MAIN_CPUS":"3","TRIPLEX_NODE_WORKER_CPUS":"5,6,7,9,10,11",
    }
    directory,slot,env,_owner = stack.stack(1,"readers",key,settings=settings)
    try:
        stack.reopen(slot,env,frozen,expected,directory)
        start_roles(slot,directory,env)
        env["DATOMIC_READ_URLS"]=env["PROBE_READ_URL"]
        stack.run(stack.NODE,Path(__file__).with_name("seed-witness.mjs"),stack.INPUT,directory/"reopened-seed.json",
                  env=env,timeout=60)
        def java(role):
            output=stack.command("docker","top",slot+"-"+role,"-eo","pid,comm",env=env)
            pid,=[a.split()[0] for a in output.splitlines()[1:] if a.split()[-1]=="java"]
            assert pid.isdigit()
            return pid
        ip=stack.command("docker","inspect","--format","{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",slot+"-pg",env=env)
        assert re.fullmatch(r"(?:\d{1,3}\.){3}\d{1,3}",ip)
        config=directory/"pg-service.conf"
        config.write_text("[probe]\nhost="+ip+"\nport=5432\ndbname=datomic\nuser=postgres\n")
        password=stack.command("docker","exec",slot+"-pg","printenv","POSTGRES_PASSWORD",env=env)
        assert password and "\n" not in password
        env.update(PGSERVICE="probe",PGSERVICEFILE=str(config),PGPASSWORD=password,
                   DX_RD1_TX_PID=java("tx"),DX_RD1_WRITE_PEER_PID=java("gw-w"),
                   DX_RD1_WRITE_TRACE=str(Path(env["TRIPLEX_TRACE_DIR"])/"gw-w.jsonl"))
        assert stack.command("psql","-Atc","SELECT current_setting('track_wal_io_timing')",env=env)=="on"
        # [DX-BM1] Why: the producer needs runnable time and real hardware counter delivery.
        # Rejected: marking the transactor attribution complete from wall clocks alone.
        sysctl = Path("/proc/sys/kernel/sched_schedstats")
        value = sysctl.read_text().strip()
        assert value in {"0", "1"}
        stack.put(root/"scheduler-before.json", {"sched_schedstats": value})
        sysctl.write_text("1\n")
        perf = subprocess.run(["perf", "stat", "-e", "cycles,instructions", "--", "sleep", ".1"],
                              capture_output=True, text=True, check=True, timeout=10)
        (root/"perf-preflight.txt").write_text(perf.stderr)
        assert "<not " not in perf.stderr
        output=root/"measurement"
        stack.run(stack.NODE,"lab/bin/heavy.mjs","--label","DX-BM1","--","taskset","-c","3,5,6,7,9,10,11",
                  *base,output,env=env,timeout=610)
        stack.put(root/"reading.json",summarize(output,source,slot,stack.REPO/program,start))
    finally:
        try:
            stack.cleanup()
        finally:
            restore_scheduler(root)


if __name__=="__main__":
    main(sys.argv[1:])
