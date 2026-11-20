"""Take matched native readings from the already verified pooled data."""
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

import native as stack


def setup(directory,mode):
    # [DX-BM1] Why: the storage checkpoint and the measured program have distinct source identities.
    # Rejected: opening the old writable database or claiming the restored data was seeded by the new code.
    assert re.fullmatch(r"/var/tmp/triplex-w1/(?:ceil|size|predecessor)n19b?",str(directory))
    stack.BASE=directory/"checkpoint-arms"
    stack.REPO=directory/"build/repository"
    stack.NODE=directory/"build/tools/bin/node"
    stack.BASE_ENV["PATH"]=str(stack.NODE.parent)+":"+stack.BASE_ENV["PATH"]
    selected=stack.verified_checkpoint(allow_single_account=(mode=="size"))
    if not selected:raise RuntimeError("No independently verified checkpoint at the requested population")
    stack.INPUT=selected
    return stack.get(stack.INPUT)


def start_roles(slot, directory, env):
    for role,key in (("gw-w","DATOMIC_URL"),("gw-r","PROBE_READ_URL")):
        ip=stack.command("docker","inspect","--format","{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",slot+"-"+role,env=env)
        assert re.fullmatch(r"[0-9.]+",ip)
        url=f"http://{ip}:8080"
        deadline=time.time()+165
        while subprocess.run(["curl","-fSs","--max-time","3",url+"/health"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
            if time.time()>=deadline:raise TimeoutError("Restored gateway did not become ready")
            time.sleep(1)
        env[key]=url
    env["TRIPLEX_TRACE_DIR"]=str(directory/"engines"/slot/"trace/raw")


def sql_size(directory,slot,phase):
    query=("SELECT jsonb_build_object('databaseBytes',pg_database_size('datomic'),'relationBytes',"
           "pg_total_relation_size('public.datomic_kvs'),'heapBytes',pg_relation_size('public.datomic_kvs'),"
           "'indexBytes',pg_indexes_size('public.datomic_kvs'),'toastBytes',pg_total_relation_size(c.reltoastrelid),"
           "'walInsert',pg_current_wal_insert_lsn()::text,'liveKeysEstimate',s.n_live_tup,'deadKeysEstimate',s.n_dead_tup) "
           "FROM pg_class c JOIN pg_stat_user_tables s ON c.oid=s.relid WHERE c.oid='public.datomic_kvs'::regclass")
    obj=json.loads(stack.pg(slot+"-pg","psql","-U","postgres","-d","datomic","-Atc",query))
    assert min(obj["databaseBytes"],obj["relationBytes"],obj["heapBytes"],obj["indexBytes"])>0
    stack.put(directory/(phase+"-size.json"),obj)


def until(file, proc, seconds):
    deadline=time.time()+seconds
    while not file.is_file():
        if proc.poll() is not None or time.time()>=deadline:
            raise RuntimeError("Worker stopped before "+file.name)
        time.sleep(.2)


def arm(mode,setting,ordinal,tag,staged,frozen,expected,profile):
    fair=mode=="ceil" and setting=="candidate"
    settings={
        "DX_GROUP_COMMIT":str(int(fair)),"DX_GROUP_QUEUE_CLOCK":"1","DX_LIVE_PRIORITY":str(int(fair)),
        "DX_W1_EXTRA":"1","DX_GROUP_MAX_MEMBERS":"8","DX_SMALL_ROWS":"0","DX_GROUP_REUSE_PREPARED":"0",
    }
    if mode=="pred":
        for peer in ("READ","WRITE"):
            key="DX_GW_"+peer+"_JAVA_OPTS"
            settings[key]=stack.BASE_ENV[key]+" -Dbm1.read.attribution=1"
    directory,slot,env,owner=stack.stack(ordinal,mode,tag,staged,settings=settings)
    chosen=owner["nonce"]
    try:
        stack.reopen(slot,env,frozen,expected,directory)
        start_roles(slot,directory,env)
        writer=Path(__file__).with_name("seeded.mjs")
        with (directory/"worker.log").open("x") as log:
            args=[stack.NODE,"lab/bin/heavy.mjs","--label","DX-BM1-"+mode,"--","taskset","-c","3",stack.NODE,
                  "--import","tsx",writer,directory,mode,setting,stack.INPUT,chosen,profile]
            proc=subprocess.Popen(list(map(str,args)),cwd=stack.REPO,env=env,stdout=log,stderr=subprocess.STDOUT)
            try:
                until(directory/"foreground-ready.json",proc,180)
                stack.counters(directory,slot,"before")
                if mode=="size":sql_size(directory,slot,"before")
                stack.put(directory/"timing-gate.json",{"nonce":chosen,"open":time.time()})
                if mode=="size" and profile=="full":
                    until(directory/"baseline-done.json",proc,75)
                    stack.counters(directory,slot,"baseline")
                    sql_size(directory,slot,"baseline")
                    stack.put(directory/"baseline-gate.json",{"nonce":chosen,"open":time.time()})
                until(directory/"foreground-done.json",proc,280)
                stack.counters(directory,slot,"after")
                if mode=="size":sql_size(directory,slot,"after")
                stack.put(directory/"verification-gate.json",{"nonce":chosen,"open":time.time()})
                if proc.wait(timeout=240)!=0:raise RuntimeError("Durable readback failed")
                if mode=="size" and (directory/"index.json").is_file():
                    sql_size(directory,slot,"indexed")
                    stack.counters(directory,slot,"indexed")
                raw=Path(env["TRIPLEX_TRACE_DIR"])
                (raw/".finish").touch(exist_ok=False)
                deadline=time.time()+90
                while not (raw/"tx.jfr-complete.jsonl").is_file():
                    if time.time()>=deadline or (raw/"tx-jfr-error.txt").exists():raise RuntimeError("Native trace incomplete")
                    time.sleep(1)
            finally:
                if proc.poll() is None:
                    proc.terminate()
                    try:proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:proc.kill();proc.wait()
    finally:
        stack.cleanup()
    return directory


def main(args):
    action,mode,root,source=args
    assert sys.platform=="linux" and os.getuid()==0 and mode in ("ceil","size","pred")
    directory=Path(root)
    if action=="cleanup":
        stack.BASE=directory/"checkpoint-arms"
        stack.REPO=directory/"build/repository"
        stack.NODE=directory/"build/tools/bin/node"
        stack.cleanup()
        return
    assert action=="run" and not (directory/"results").exists()
    checkpoint=setup(directory,mode)
    assert stack.command("git","rev-parse","HEAD")==source and not stack.command("git","diff","--name-only","HEAD")
    assert shutil.disk_usage(directory).free>32*1024**3
    stack.BASE.mkdir(mode=0o700)
    tag=uuid.uuid4().hex[:8]
    frozen,expected=stack.create_template(tag,checkpoint)
    staged=None
    if mode=="pred":
        staged=directory/"staged-gateway"
        shutil.copytree(stack.REPO/"packages/datomic/gateway",staged)
        shutil.copyfile(stack.REPO/"packages/datomic/src/codec-spec.json",staged/"codec-spec.json")
        p=staged/"src/triplex/gateway/predecessor.clj"
        old=p.read_text()
        key='(System/getenv "TX2_READ_ATTRIBUTION")'
        assert old.count(key)==1
        p.write_text(old.replace(key,'(System/getProperty "bm1.read.attribution")'))
        stack.put(directory/"staged.json",{"source":source,"original":hashlib.sha256(old.encode()).hexdigest(),"staged":stack.sha(p)})
    results=directory/"results"
    results.mkdir()
    from seeded_reading import summarize
    smoke=arm(mode,"control",1,uuid.uuid4().hex[:8],staged,frozen,expected,"smoke")
    small=summarize(smoke,mode,source,stack.INPUT,small=True)
    stack.put(results/"small-reading.json",small)
    assert small["dispositions"]=={"ack":50}
    rows=[]
    for n,setting in enumerate(("control",) if mode=="size" else ("control","candidate","candidate","control"),1):
        case=arm(mode,setting,n,tag,staged,frozen,expected,"full")
        rows.append(summarize(case,mode,source,stack.INPUT))
    stack.put(results/"comparison.json",{"source":source,"mode":mode,"checkpointSha256":stack.sha(stack.INPUT),
        "smallSha256":stack.sha(results/"small-reading.json"),"arms":rows})


if __name__=="__main__":main(sys.argv[1:])
