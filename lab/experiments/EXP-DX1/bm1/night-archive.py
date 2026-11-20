"""Seal the public bench outputs of one terminal attempt without copying its build or database."""
import hashlib
import io
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import tarfile
import time

LIMIT = 1024**3
ROOT = Path("/var/tmp/triplex-bm1")
NIGHT = ROOT / "night-n19"
EXCLUDE = {".git","node_modules",".pnpm-store","pnpm-store","tools","docker-config","corepack","downloads",
           "image","repository","build-cache",".turbo","dist","pgdata","postgres","pristine","frozen-pgdata","gateway-growth","staged-gateway"}
METADATA = {"SHA256SUMS","STATUS","source","machine","terminal","active-slot","native.json",
            "identity.json","inputs.json","result.json","comparison.json","measurements.json","resources.json",
            "act1-sweep.json","act1-verified.json","summary.json","ns-report.json","commit-anatomy.json",
            "trace-summary.json","TRANSFER.sha256","seed-readback.json","trace.html","trace-run.json"}


def digest(p):
    with p.open("rb") as stream:
        return hashlib.file_digest(stream,"sha256").hexdigest()


def walk(root):
    if not root.exists() or root.is_symlink():return
    if root.is_file():
        yield root
        return
    for base, dirs, files in os.walk(root,followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDE and not (Path(base)/d).is_symlink())
        for name in sorted(files):
            file=Path(base)/name
            if not file.is_symlink() and file.is_file():yield file


def sources(r):
    root=Path(r["root"])
    parts={"control":Path(r["directory"])}
    if r["item"] in (1,3,8,9,10,11,12):
        parts["results"]=root/"results"
        parts["campaign.log"]=root/"campaign.log"
        parts["probes"]=NIGHT/"probes"/(r["tag"]+"-1")
        parts["second-probes"]=NIGHT/"probes"/(r["tag"]+"-2")
        if r["item"] in (8,9):
            smoke={8:"pulsesmk",9:"matchedsmk"}[r["item"]]+str(r["attempt"])
            parts["preflight"]=Path("/var/tmp/triplex-w1")/smoke/"results"
            if r["item"]==9:
                parts["deep-checkpoint"]=NIGHT/"probes"/(r["tag"]+"-3")
                parts["preflight-checkpoint"]=NIGHT/"probes"/(smoke+"-2")
        if r["item"] in (10,11,12):
            parts["checkpoint-arms"]=root/"checkpoint-arms"
    elif r["item"]==2:
        for stage in ("proof","screen0","screen1","screen2","screen3","deep","thin","stacks"):
            parts[stage]=root/stage
    elif r["item"]==4:
        for name in ("logs","guard-plan.json","guard-output.json"):
            parts[name]=root/name
        parts["seed-and-smoke"]=root/"checkout/state/evidence/DX-T1"
        if (root/"guard-plan.json").is_file():
            from overnight import guarded_children, guard_output
            if output:=guard_output(r):parts["guarded"]=output
            for slot in guarded_children(r):
                batch=slot.split("-")[3]
                parts[slot]=ROOT/("day-"+batch)/"checkout/state/evidence/DX-T1"/slot
    elif r["item"]==5:parts["rungs"]=root/"build/state/evidence/DX-INT1"/r["tag"]
    elif r["item"]==13:parts["import"]=root/"run"
    elif r["item"]==14:
        parts["joined-smoke"]=root/"smoke"
        for name in ("run-owner.json","collector.json","point-check.json","native-clean.json","startup-and-engine.log","engines"):
            parts["joined-setup/"+name]=root/name
    elif r["item"]==6:
        platform=Path("/var/tmp/triplex-scale1")
        trial=platform/r["tag"]
        for file in trial.iterdir() if trial.is_dir() else []:
            if file.name not in {"compact","summaries.tar.zst","raw.tar.zst"}:
                parts["delta-campaign/"+file.name]=file
        for name in ("dedicated.json","delivered.txt"):
            parts["platform/"+name]=platform/"platform"/name
    elif r["item"]==7:
        parts["probes"]=root
    for name in ("source","machine","terminal","terminal.json","sources.json","remaining.txt","cleanup.txt","ownership","bootstrap.log"):
        parts["campaign/"+name]=root/name
    parts["bootstrap"]=root/"build/results"
    return parts


def archive(target, pairs, capped):
    # [DX-BM1] Why: the threshold applies to the actual compressed archive and includes every selected raw member.
    # Rejected: deciding from expanded sizes or allowing a partial compressed stream onto the Mac.
    temp=target.with_suffix(".tmp")
    def limit():
        resource.setrlimit(resource.RLIMIT_FSIZE,(LIMIT-1,LIMIT-1))
    try:
        with temp.open("wb") as out:
            proc=subprocess.Popen(["zstd","-q","-3","-c"],stdin=subprocess.PIPE,stdout=out,
                                  preexec_fn=limit if capped else None)
            try:
                with tarfile.open(fileobj=proc.stdin,mode="w|") as tar:
                    for name,p in pairs:
                        tar.add(p,arcname=name,recursive=False)
            except BrokenPipeError:
                if not capped:raise
            finally:
                try:proc.stdin.close()
                except BrokenPipeError:pass
                rc=proc.wait()
        if rc and capped and temp.stat().st_size>=LIMIT-1:
            temp.unlink();return None
        if rc:raise RuntimeError("zstd failed: "+str(rc))
        subprocess.run(["zstd","-tq",str(temp)],check=True)
        temp.replace(target)
        return {"name":target.name,"bytes":target.stat().st_size,"sha256":digest(target)}
    except BaseException:
        temp.unlink(missing_ok=True)
        raise


def seal(r,terminal):
    assert terminal["tag"]==r["tag"] and terminal["source"]==r["source"] and terminal["clean"] is True
    folder=NIGHT/"bundles"/f"i{r['item']}-{r['attempt']}"
    folder.mkdir(parents=True,exist_ok=True)
    if (folder/"TRANSFER.json").is_file():return
    summaries=[];raw=[]
    for prefix,root in sources(r).items():
        for p in walk(root):
            name=prefix if p==root else prefix+"/"+p.relative_to(root).as_posix()
            if name.endswith(".sqlite-wal") or name.endswith(".sqlite-shm"):
                raw.append((name,p));continue
            size=p.stat().st_size
            if p.name in METADATA or p.suffix in (".md",".tap",".exit",".txt",".log",".sha256") and size<16*1024**2 or p.suffix==".json" and size<3*1024**2:
                summaries.append((name,p))
            else:raw.append((name,p))
    assert len({n for n,_ in summaries+raw})==len(summaries)+len(raw)
    index={n:{"bytes":p.stat().st_size,"sha256":digest(p)} for n,p in summaries}
    (folder/"summary-members.json").write_text(json.dumps(index,indent=2)+"\n")
    summaries.append(("summary-members.json",folder/"summary-members.json"))
    archive_summary=archive(folder/"summary.tar.zst",summaries,False)
    assert archive_summary["bytes"]<LIMIT, "Summary archive exceeds the transfer limit"
    packed=None
    disposition="no raw members"
    if raw:
        try:
            packed=archive(folder/"raw.tar.zst",raw,True)
            disposition="transferred" if packed else "over limit; retained in original files"
            if packed and archive_summary["bytes"]+packed["bytes"]>=LIMIT:
                packed=None
                disposition="combined transfer over limit; raw archive retained on server"
        except (OSError,RuntimeError,subprocess.SubprocessError) as error:
            disposition="raw compression failed; original files retained"
            (folder/"raw-compression-error.txt").write_text(repr(error)+"\n")
    transfer={"schema":"bm1-night-transfer/1","item":r["item"],"attempt":r["attempt"],
              "source":r["source"],"slot":r["tag"],"ended":terminal["ended"],"sealedAt":time.time(),
              "measurementState":terminal.get("state"),
              "requestSha256":digest(Path(r["directory"])/"request.json"),
              "terminalSha256":digest(Path(r["directory"])/"terminal.json"),
              "summary":archive_summary,"summaryMembersSha256":digest(folder/"summary-members.json"),
              "raw":packed,"rawFiles":len(raw),"rawLocation":str(r["root"]),
              "rawDisposition":disposition}
    temporary=folder/".TRANSFER.new"
    temporary.write_text(json.dumps(transfer,indent=2)+"\n");temporary.replace(folder/"TRANSFER.json")


if __name__=="__main__":
    r=json.loads(Path(sys.argv[1]).read_bytes())
    seal(r,json.loads((Path(r["directory"])/"terminal.json").read_bytes()))
