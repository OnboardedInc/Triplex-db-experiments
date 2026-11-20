"""Dispatch original Mac-side controllers and collect the overnight server's sealed evidence."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import threading
import time

ROOT = Path.home()/"Claude/Projects/triplex-db-2/evidence/DX-BM1/overnight"
REMOTE = "/var/tmp/triplex-bm1/night-n19"
BRANCHES={1:("w1","exp/DX-W1-commit-tail-reads"),2:("act1","exp/DX-ACT1-activation"),
          3:("w1","exp/DX-W1-commit-tail-reads"),5:("int1","exp/DX-INT1"),8:("w1","exp/DX-W1-commit-tail-reads")}
DEST=os.environ.get("BENCH_SERVER","")
KEY=os.environ.get("DX_BENCH_KEY",str(Path.home()/".ssh/triplex_bench_ed25519"))
SSH=["ssh","-n","-F","/dev/null","-i",KEY,"-o","IdentitiesOnly=yes","-o","ForwardAgent=no",
     "-o","StrictHostKeyChecking=yes","-o","BatchMode=yes","-o","ConnectTimeout=8",DEST]


def remote(cmd,timeout=45):
    return subprocess.check_output(SSH+["sudo -n sh -c "+shlex.quote(cmd)],timeout=timeout)


def hashfile(file):
    with file.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()


def download(src,dest,expected):
    if dest.exists() and hashfile(dest)==expected:return
    tmp=dest.with_suffix(dest.suffix+".partial")
    with tmp.open("wb") as stream:
        subprocess.run(SSH+["sudo -n cat -- "+shlex.quote(src)],stdout=stream,check=True,timeout=900)
    assert hashfile(tmp)==expected,"Changed transfer "+str(dest)
    tmp.replace(dest)


def unpack(archive,stage,seal):
    child=subprocess.Popen(["zstd","-qdc",archive],stdout=subprocess.PIPE)
    try:
        seen=set()
        with tarfile.open(fileobj=child.stdout,mode="r|") as members:
            for member in members:
                name=Path(member.name)
                if member.isdir():continue
                assert member.isfile() and not name.is_absolute() and ".." not in name.parts and member.name not in seen
                dest=stage/name;dest.parent.mkdir(parents=True,exist_ok=True)
                assert not dest.is_symlink() and dest.resolve().is_relative_to(stage.resolve())
                with dest.open("wb") as f:shutil.copyfileobj(members.extractfile(member),f)
                seen.add(member.name)
        assert child.wait()==0
    finally:
        child.stdout.close()
        if child.poll() is None:child.kill();child.wait()
    index=stage/"summary-members.json"
    assert hashfile(index)==seal["summaryMembersSha256"]
    rows=json.loads(index.read_bytes())
    assert seen==set(rows)|{"summary-members.json"}
    for name,entry in rows.items():
        assert hashfile(stage/name)==entry["sha256"] and (stage/name).stat().st_size==entry["bytes"]
    request=json.loads((stage/"control/request.json").read_bytes())
    terminal=json.loads((stage/"control/terminal.json").read_bytes())
    assert seal["requestSha256"]==hashfile(stage/"control/request.json") and seal["terminalSha256"]==hashfile(stage/"control/terminal.json")
    assert request["source"]==terminal["source"]==seal["source"] and request["tag"]==terminal["tag"]==seal["slot"]
    assert terminal["clean"] is True and terminal["ended"]==seal["ended"]
    assert request["start"]<=dt.datetime.fromisoformat(terminal["ended"].replace("Z","+00:00")).timestamp()+1<=seal["sealedAt"]+2


def collect(name):
    assert re.fullmatch(r"i(?:[1-9]|10)-[12]",name)
    directory=ROOT/name
    src=REMOTE+"/bundles/"+name
    original=remote("cat "+src+"/TRANSFER.json")
    seal=json.loads(original)
    assert name==f"i{seal['item']}-{seal['attempt']}" and re.fullmatch(r"[0-9a-f]{40}",seal["source"])
    directory.mkdir(exist_ok=True)
    done=directory/"collected.json"
    if done.is_file():
        assert json.loads(done.read_bytes())["transfer"]==hashlib.sha256(original).hexdigest()
        index_bundle(directory)
        return
    for part in ("summary","raw"):
        if not seal[part]:continue
        entry=seal[part];assert entry["name"]==part+".tar.zst" and re.fullmatch("[a-f0-9]{64}",entry["sha256"])
        if part=="raw":assert 0<entry["bytes"]<2**30
        assert shutil.disk_usage(directory).free-entry["bytes"]>5*2**30,"Mac evidence-volume floor"
        download(src+"/"+entry["name"],directory/entry["name"],entry["sha256"])
    archive=directory/"summary.tar.zst"
    unpack(archive,directory,seal)
    assert remote("cat "+src+"/TRANSFER.json")==original
    (directory/"TRANSFER.json").write_bytes(original)
    done.write_text(json.dumps({"transfer":hashlib.sha256(original).hexdigest(),"at":time.time(),"slot":seal["slot"]})+"\n")
    index_bundle(directory)
    print("Collected",name,seal["slot"],flush=True)


def index_bundle(directory):
    index=os.environ.get("BM1_TRACE_INDEX")
    receipt=directory/"indexed.json"
    if index and not receipt.exists():
        proof=subprocess.check_output(["node",index,"register-night-bundle",str(directory)],timeout=120)
        receipt.write_bytes(proof)


def submit(item,attempt):
    base=REMOTE+f"/i{item}/{attempt}"
    path=base+"/request.json"
    waiting="while ! test -f "+base+"/admission-ready.json; do if test -f "+base+"/terminal.json || test -f "+REMOTE+f"/i{item}/outcome.json || test -f "+REMOTE+"/finished; then exit 86; fi; sleep 4; done; cat "+path
    while True:
        try: data=remote(waiting,timeout=3600);break
        except subprocess.TimeoutExpired:continue
        except subprocess.CalledProcessError as e:
            if e.returncode==86:return
            time.sleep(30)
    r=json.loads(data)
    assert r["item"]==item and r["attempt"]==attempt and re.fullmatch(r"[a-z][a-z0-9-]{1,35}",r["tag"])
    branchdir,branch=BRANCHES[item]
    repo=ROOT/"operators"/f"{branchdir}-{item}-{attempt}"
    if not repo.exists():
        subprocess.run(["git","-c","credential.helper=","clone","-q","--depth","1","--single-branch","--branch",branch,
                        "https://github.com/OnboardedInc/Triplex-db-experiments.git",str(repo)],check=True,timeout=90)
    assert not subprocess.check_output(["git","status","--porcelain"],cwd=repo).strip()
    assert subprocess.check_output(["git","branch","--show-current"],cwd=repo,text=True).strip()==branch
    head=subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip()
    assert head==r["source"],"Builder published another revision after native admission"
    exp="lab/experiments/EXP-DX1/"
    if item in (1,3,8):
        args=["--experimental-strip-types",exp+"w1/control.ts"]+({1:["--group"],8:["--pulse"]}.get(item,[]))+[r["tag"]]
    elif item==2:args=["--experimental-strip-types",exp+"import1/control.ts","--campaign",r["tag"]]
    else:
        stop=dt.datetime.fromtimestamp(r["deadline"]-10,dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        args=["--experimental-transform-types",exp+"int1/control.ts","launch",r["tag"],stop]
    log=ROOT/("control-"+str(item)+"-"+str(attempt)+".log")
    if log.exists():return
    env=dict(os.environ,DX_BENCH_KEY=KEY,TRIPLEX_TRACE_EVIDENCE=str(ROOT/"collections"),DX_IMPORT_COLLECTION=str(ROOT/"imports"))
    with log.open("x") as out:
        result=subprocess.run(["node",*args],cwd=repo,env=env,stdout=out,stderr=subprocess.STDOUT)
    print("Published controller exit",item,attempt,result.returncode,flush=True)


def main():
    assert sys.platform=="darwin" and re.fullmatch(r"[a-z0-9_-]+@[A-Za-z0-9.-]+",DEST)
    if len(sys.argv)==3 and sys.argv[1]=="collect":
        collect(sys.argv[2]);return
    assert sys.argv[1:]==["watch"]
    for item in BRANCHES:
        for attempt in (1,2):
            if item==1 and attempt==1:continue
            threading.Thread(target=submit,args=(item,attempt),daemon=True).start()
    while True:
        try:
            lines=remote(f'for f in {REMOTE}/bundles/i*/TRANSFER.json; do test -f "$f" && basename "$(dirname "$f")"; done; test ! -f {REMOTE}/finished || echo FINISHED; true').decode().splitlines()
            for name in lines:
                if name!="FINISHED":collect(name)
            if "FINISHED" in lines:break
        except (OSError,AssertionError,subprocess.SubprocessError) as error:
            print("Collection pending:",repr(error),flush=True)
        time.sleep(660)


if __name__=="__main__":main()
