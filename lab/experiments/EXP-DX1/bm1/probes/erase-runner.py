"""Provide the disposable native PostgreSQL 17 and Datomic stack for ERASE1."""

import errno
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from producer_readings import digest, get

SOURCE = "856c4c9ae41750af4565e93216d1ba92e2c6c5c5"
FAST_SOURCE = "4054f548469e57b6aa82b06e93711c39b6867f7c"
EXP = Path("lab/experiments/EXP-DX1")
PGPORT = 56141
TXPORT = 4334
WEBPORT = 8080
LOOPBACK = socket.inet_ntoa(socket.INADDR_LOOPBACK.to_bytes(4,"big"))


def require_ports(ports, timeout=90):
    deadline = time.monotonic()+timeout
    for port in ports:
        while True:
            with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as probe:
                try:
                    probe.bind((LOOPBACK,port))
                except OSError as error:
                    if error.errno != errno.EADDRINUSE or time.monotonic() >= deadline:
                        raise RuntimeError(f"Erasure port {port} did not become bindable") from error
                else:
                    break
            # [DX-BM1] Why: the verified small stack can leave TCP sockets in TIME_WAIT.
            # Rejected: sharing an active port or sending traffic to keep the stack warm.
            time.sleep(1)


def managed(request, cleanup=False):
    root = Path(request["root"])
    source = request["source"]
    tag = request["tag"]
    fast = source == FAST_SOURCE and tag in ("erasen20fast","erasen20small","erasen20retry","erasen20image")
    small = fast and tag == "erasen20small"
    people = 128 if small else 100_000
    assert request["item"] == 34 and (fast or (source == SOURCE and tag in ("erasen20","erasen20b")))
    binroot = Path("/var/tmp/triplex-bm1/night-n20-erasure")
    expected = (binroot.with_name(binroot.name+"-small") if small else binroot) if fast else Path("/var/tmp/triplex-bm1/night-n19")/tag
    if tag in ("erasen20retry", "erasen20image"):
        expected = binroot.with_name(binroot.name+("-retry" if tag=="erasen20retry" else "-image"))
    assert root == expected
    resume = tag == "erasen20b"
    old = root.with_name("erasen20")
    build = (binroot if fast else root)/"build"
    repo = build/"repository"
    node = build/"tools/bin/node"
    experiment = repo / EXP / "erase1"
    owner_file = root / "erase-owner.json"
    request_file = Path(request["directory"]) / "request.json"
    env = dict(os.environ, DOCKER_HOST="unix:///var/run/docker.sock")

    def output(*args, timeout=45):
        return subprocess.check_output(args, cwd=repo, env=env, text=True, timeout=timeout).strip()

    def run(*args, timeout, **kwargs):
        subprocess.run(args, cwd=repo, env=env, check=True, timeout=timeout, **kwargs)

    def save(path, value):
        with path.open("x") as stream:
            stream.write(json.dumps(value, indent=2) + "\n")

    if cleanup and not owner_file.is_file():
        return
    assert output("git", "rev-parse", "HEAD") == source
    if cleanup:
        owner = get(owner_file)
        nonce = owner["nonce"]
        assert re.fullmatch(r"[a-f0-9-]{36}", nonce)
        prefix = "tx2-dxbm1-" + tag + "-" + nonce.replace("-", "")[:12]
        assert owner == {"source": source, "nonce": nonce, "prefix": prefix, "requestSha256": digest(request_file)}
        for name in (prefix+"-java", prefix+"-pg"):
            ids = output("docker","ps","-aq","--no-trunc","--filter","name=^/"+name+"$").splitlines()
            if not ids:
                continue
            ident, = ids
            assert output("docker","inspect","--format",'{{index .Config.Labels "tx2.erase1.holder"}}',ident) == nonce
            if name.endswith("-pg"):
                with (root/"postgres.log").open("a") as log:
                    try:
                        subprocess.run(["docker","logs","--tail","2000",ident],cwd=repo,env=env,stdout=log,
                                       stderr=subprocess.STDOUT,timeout=25)
                    except (OSError,subprocess.SubprocessError) as error:
                        print(f"PostgreSQL log capture failed: {error!r}",file=log)
            try:
                if name.endswith("-pg"):
                    run("docker","stop","--time","25",ident,timeout=45)
            finally:
                run("docker","rm","-f",ident,timeout=60)
            assert not output("docker","ps","-aq","--filter","id="+ident)
        assert not output("docker","ps","-q")
        save(root/"erase-clean.json",{**owner,"remaining":[]})
        owner_file.unlink()
        return

    assert shutil.disk_usage(root).free >= 80*2**30 and not output("docker","ps","-q")
    assert not output("git","status","--porcelain","--untracked-files=no")
    require_ports((PGPORT, TXPORT, WEBPORT))
    first = None
    if resume:
        old_request = request_file.parents[1]/"1/request.json"
        recorded = get(old_request)
        archived = get(old/"erase-clean.json")
        first = get(old/"stage-witness.json")
        assert archived == {key:first[key] for key in archived if key!="remaining"} | {"remaining":[]}
        assert first["requestSha256"] == digest(old_request) and recorded["source"] == source
        assert first["stagedSha256"] == digest(old/"stage/staged.json")
        assert get(old/"stage/driver-exit.json") == {"code":0,"signal":None}
        assert get(old/"measured/driver-exit.json") == {"code":1,"signal":None}
        assert not (old/"measured/seed.json").exists()
        assert "Terminating process - Heartbeat failed" in (old/"transactor.log").read_text()
        nonce = first["nonce"]
    else:
        nonce = str(uuid.uuid4())
    prefix = "tx2-dxbm1-" + tag + "-" + nonce.replace("-", "")[:12]
    owner = {"source": source, "nonce": nonce, "prefix": prefix, "requestSha256": digest(request_file)}
    save(owner_file,owner)
    label = "tx2.erase1.holder="+nonce
    images = get(build/"results/images.json")
    image = next(i for i in images if "tx2-datomic:1.0.7745-da00" in i["RepoTags"])
    pg_image = next(i for i in images if "postgres:17-alpine" in i["RepoTags"])
    # [DX-BM1] Why: bind to the same immutable image used by this build and its small gate.
    # Rejected: using the mutable tag last used by a different benchmark checkout.
    for registered in image, pg_image:
        ident = registered["Id"]
        assert re.fullmatch(r"sha256:[a-f0-9]{64}",ident)
        assert output("docker","image","inspect","--format","{{.Id}}",ident) == ident
    java_home, = [row.split("=",1)[1] for row in image["Config"]["Env"] if row.startswith("JAVA_HOME=")]
    assert java_home == "/opt/java/openjdk"
    # [DX-BM1] Why: the official Linux erasure wrapper launches a fresh native peer on the bench host.
    # Rejected: borrowing a Java process, changing a global Java install, or using a different Datomic distribution.
    jre = root/"jdk"
    if resume:
        jre.symlink_to(old/"jdk",target_is_directory=True)
    else:
        jre.mkdir()
        helper = output("docker","create","--pull","never","--network","none","--label",label,
                        "--name",prefix+"-java",image["Id"])
        run("docker","cp",helper+":"+java_home+"/.",jre,timeout=180)
        run("docker","rm",helper,timeout=30)
    datomic = build/"image/datomic"
    codec = repo/"packages/datomic/src/codec-spec.json"
    files = repo/"packages/datomic/gateway"
    peer_pin, = [row.split()[0] for row in (repo/"lab/config/datomic/SHA256SUMS").read_text().splitlines()
                 if row.endswith("  peer-1.0.7745.jar")]
    assert digest(datomic/"peer-1.0.7745.jar") == peer_pin
    tree = "import{verifiedTree}from'./lab/bin/datomic-context.mjs';process.stdout.write(JSON.stringify(verifiedTree(process.argv[1])))"
    gateway_hash = hashlib.sha256(
        output(node,"--input-type=module","-e",tree,files).encode()).hexdigest()
    db = "erase1_" + nonce.replace("-", "")
    pgdata = root/"pgdata"
    password = secrets.token_hex(24)
    if resume:
        # [DX-BM1] Why: compare the copied indexed fixture before starting its separate recovery.
        # Rejected: mutating the retained first attempt or rebuilding sixteen million already verified facts.
        def files_at(directory):
            members=sorted(directory.rglob("*"))
            assert not any(f.is_symlink() for f in members)
            return {f.relative_to(directory).as_posix():digest(f) for f in members if f.is_file()}
        before=max(time.time(), request["start"])
        manifest=files_at(old/"pgdata")
        assert manifest and files_at(pgdata)==manifest and (pgdata/"PG_VERSION").read_text().strip()=="17"
        shutil.copytree(old/"stage",root/"stage")
        assert digest(root/"stage/staged.json")==first["stagedSha256"]
        proof=root/"before-recovery-sha256.json"
        save(proof,manifest)
        save(root/"restore-witness.json",{**owner,"priorRequestSha256":first["requestSha256"],
             "stagedSha256":first["stagedSha256"],"physicalFilesSha256":digest(proof),"startedAt":before})
        (pgdata/"postmaster.pid").unlink(missing_ok=True)
        password, = [row.split("=",1)[1] for row in (old/"transactor.properties").read_text().splitlines()
                     if row.startswith("sql-password=")]
        assert re.fullmatch(r"[0-9a-f]{48}",password)
    else:
        pgdata.mkdir(mode=0o700)
    env.update(DX_ERASE_NONCE=nonce, DX_ERASE_TOKEN=secrets.token_hex(24), DX_ERASE_BIND_HOST=LOOPBACK,
               DATOMIC_URL=f"http://{LOOPBACK}:{WEBPORT}", PGHOST=LOOPBACK, PGPORT=str(PGPORT),
               PGDATABASE=db, PGUSER="postgres", PGPASSWORD=password,
               DX_ERASE_DATOMIC_HOME=str(datomic), DX_ERASE_SQL_DATA=str(pgdata),
               DX_ERASE_TX_LOG=str(root/"transactor.log"), JAVA_HOME=str(jre), GATEWAY_SOURCE_SHA256=gateway_hash,
               DATOMIC_EXT_CLASSPATH=str(files/"src")+":"+str(experiment),
               PATH=f"{node.parent}:{jre / 'bin'}:"+env["PATH"])
    sql = f"jdbc:postgresql://{LOOPBACK}:{PGPORT}/{db}"
    env["DATOMIC_URI_TEMPLATE"] = "datomic:sql://{db}?" + sql + "?user=postgres&password=" + env["PGPASSWORD"]
    erasures = root/"erasures"
    if fast:
        erasures.mkdir(mode=0o700)
        env.update(TRIPLEX_ERASURE_DIRECTORY=str(erasures),TRIPLEX_ERASURE_SHRED_GRACE_MS="0")
        if small:
            env["BM1_ERASE_SMALL"] = "1"
    pg = output("docker","run","-d","--pull","never","--name",prefix+"-pg","--label",label,"--network","host",
                "--cpuset-cpus","1","--memory","6g","--memory-swap","6g","--mount",f"type=bind,src={pgdata},dst={pgdata}",
                "-e","POSTGRES_DB="+db,"-e","POSTGRES_PASSWORD="+env["PGPASSWORD"],"-e","PGDATA="+str(pgdata),
                pg_image["Id"],"postgres","-c","listen_addresses="+LOOPBACK,"-p",str(PGPORT),
                "-c","shared_buffers=1GB","-c","max_wal_size=4GB")

    def wait_until(check, description):
        end = time.monotonic()+100
        while time.monotonic()<end:
            try:
                if check():
                    return
            except (OSError,subprocess.CalledProcessError,subprocess.TimeoutExpired):
                pass
            time.sleep(1)
        raise RuntimeError(description+" readiness timed out")

    def tcp(port):
        with socket.create_connection((LOOPBACK,port),timeout=2):
            return True

    wait_until(lambda: output("pg_isready","-q",timeout=3) == "", "PostgreSQL")
    if resume:
        assert output("psql","-XAtq","-c","SELECT nonce FROM dx_erase1_scratch")==nonce
    else:
        with (datomic/"bin/sql/postgres-table.sql").open("rb") as ddl:
            run("psql","-Xq","-v","ON_ERROR_STOP=1",stdin=ddl,timeout=45)
    assert Path(output("psql","-XAtq","-c","SHOW data_directory")).resolve() == pgdata.resolve()
    props = root/"transactor.properties"
    with os.fdopen(os.open(props,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"w") as stream:
        stream.write("\n".join(["protocol=sql","host="+LOOPBACK,f"port={TXPORT}", "sql-url="+sql,
              "sql-driver-class=org.postgresql.Driver","sql-user=postgres", "sql-password="+env["PGPASSWORD"],
              "memory-index-threshold=48m","memory-index-max=160m","object-cache-max=96m"])+"\n")
    def java_start(phase):
        log_config = lambda role: f"-Xlog:gc*=info:file={root}/{phase}-{role}-gc.log:time,uptimemillis,level,tags:filecount=0"
        opts = {**env, "DATOMIC_JAVA_OPTS":"-Xms256m -Xmx4g -XX:+UseG1GC -Ddatomic.objectCacheMax=96m -Dtriplex.codec.spec="+str(codec)}
        if fast:
            opts["DATOMIC_JAVA_OPTS"] += " "+log_config("gateway")
        with (root/"transactor.log").open("a" if fast else "x") as log:
            tx = subprocess.Popen(["taskset","-c","0",datomic/"bin/transactor","-Xms256m","-Xmx5g","-XX:+UseG1GC",
                *([log_config("transactor")] if fast else []),
                "-Dlogback.configurationFile="+str(experiment/"logback.xml"),props],cwd=datomic,env=env,
                stdout=log,stderr=subprocess.STDOUT,start_new_session=fast)
        wait_until(lambda: tx.poll() is None and tcp(TXPORT), "Datomic transactor")
        with (root/"gateway.log").open("a" if fast else "x") as log:
            gateway = subprocess.Popen(["taskset","-c","2",datomic/"bin/run","-m","erase1","gateway"],cwd=datomic,
                env=opts,stdout=log,stderr=subprocess.STDOUT,start_new_session=fast)

        def health():
            if gateway.poll() is not None:
                raise RuntimeError("The ERASE1 gateway exited")
            with urlopen(env["DATOMIC_URL"]+"/health",timeout=2) as response:
                return json.load(response) == {"datomicVersion":"1.0.7745","gatewaySourceHash":gateway_hash}

        wait_until(health,"ERASE1 gateway")
        return (gateway,tx)

    processes = java_start("stage")
    save(root/"stack.json",{**owner,"pgContainer":pg,"images":{"postgres":pg_image["Id"],"tool":image["Id"]},
                          "gateway":gateway_hash,"peer":peer_pin})
    heavy = (node,"lab/bin/heavy.mjs","--label","DX-BM1","--","taskset","-c","3",node)
    if fast:
        def native(*values, seconds):
            run(*heavy,experiment/".bm1-n20-server.mjs",*values,timeout=seconds)

        def cold():
            for child in processes:
                if child.poll() is None:
                    os.killpg(child.pid,signal.SIGTERM)
                    child.wait(timeout=55)
            for port in (TXPORT,WEBPORT):
                with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as retired:
                    retired.settimeout(2)
                    assert retired.connect_ex((LOOPBACK,port)) != 0
            run("docker","stop","--time","45",pg,timeout=65)
            assert not (pgdata/"postmaster.pid").exists()
            assert output("docker","inspect","--format","{{.State.ExitCode}}",pg) == "0"

        def file_hashes(directory):
            all_files = sorted(directory.rglob("*"))
            assert not any(entry.is_symlink() for entry in all_files)
            return {entry.relative_to(directory).as_posix():digest(entry) for entry in all_files if entry.is_file()}

        stage, control = root/"stage/staged.json", root/"control-stage/staged.json"
        native("stage-fast",stage.parent,seconds=9600)
        native("stage-control",control.parent,seconds=9600)
        for file in stage,control:
            saved = get(file)
            assert saved["mode"] == "fast" and saved["source"] == source and saved["nonce"] == nonce
            assert saved["people"] == people and file.stat().st_mtime >= request["start"]
        env["DX_ERASE_SEALED_SHA256"] = digest(stage)
        assert get(stage)["data"]["facts"] == get(control)["data"]["facts"]
        cold()
        # [DX-BM1] Why: restart both measurements from the same sealed native keys, cut and table bytes.
        # Rejected: letting the first erasure mutate the paired comparison's inputs or copying live PostgreSQL data.
        frozen = root/"checkpoint"
        frozen.mkdir(mode=0o700)
        checkpoint = {d.name:file_hashes(d) for d in (pgdata,erasures)}
        for directory in pgdata,erasures:
            run("cp","-a","--reflink=auto",directory,frozen/directory.name,timeout=480)
            assert file_hashes(frozen/directory.name) == checkpoint[directory.name]
        save(root/"checkpoint.json",{**owner,"files":checkpoint,"stageSha256":digest(stage),"controlSha256":digest(control)})

        def restart(phase):
            run("docker","start",pg,timeout=65)
            wait_until(lambda: output("pg_isready","-q",timeout=3) == "", "PostgreSQL reopen")
            assert output("psql","-XAtq","-c","SELECT nonce FROM dx_erase1_scratch")==nonce
            return java_start(phase)

        failures = []
        processes = restart("fast")
        try:
            native("check-fast",root/"measured",stage,seconds=3300)
        except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as error:
            failures.append(str(error))
        cold()
        for directory in pgdata,erasures:
            directory.rename(root/(directory.name+"-after-fast"))
            run("cp","-a","--reflink=auto",frozen/directory.name,directory,timeout=480)
            assert file_hashes(directory) == checkpoint[directory.name]
        processes = restart("guarded")
        try:
            native("check-guarded",root/"guarded",stage,control,seconds=3300)
        except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as error:
            failures.append(str(error))
        cold()
        if failures:
            save(root/"measurement-failures.json",failures)
        with (root/"collector.json").open("xb") as log:
            run(sys.executable,Path(__file__).with_name("erase-fast-reading.py"),root,source,stdout=log,timeout=150)
        return
    if not resume:
        run(*heavy,experiment/"server.mjs","stage",root/"stage",timeout=9000)
    stage = root/"stage/staged.json"
    staged = get(stage)
    assert staged["source"] == source and staged["nonce"] == nonce and staged["people"] == 100_000
    assert stage.stat().st_mtime >= (recorded if resume else request)["start"]
    save(root/"stage-witness.json",{**owner,"stagedSha256":digest(stage)})
    remaining = int(request["deadline"]-time.time()-90)
    assert remaining >= 1800, "Less than 30 minutes left for the native erasure check"
    run(*heavy,experiment/"server.mjs","check",root/"measured",stage,timeout=min(3300,remaining))
    with (root/"producer.json").open("xb") as log:
        run(sys.executable,experiment/"summarize.py",root/"measured",stdout=log,timeout=120)
    with (root/"collector.json").open("xb") as log:
        run(sys.executable,Path(__file__).with_name("erase-reading.py"),root/"measured",root/"producer.json",
            stage,source,stdout=log,timeout=120)


if __name__ == "__main__":
    assert sys.platform == "linux" and os.getuid() == 0 and sys.argv[1] in ("run","cleanup")
    managed(get(Path(sys.argv[2])),cleanup=sys.argv[1]=="cleanup")
