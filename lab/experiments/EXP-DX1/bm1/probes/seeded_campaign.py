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


def setup(directory,mode,checkpoint_file=None):
    # [DX-BM1] Why: the storage checkpoint and the measured program have distinct source identities.
    # Rejected: opening the old writable database or claiming the restored data was seeded by the new code.
    assert re.fullmatch(r"/var/tmp/triplex-w1/(?:ceil|size|predecessor|growth|pulse)n(?:19|20)b?",str(directory))
    stack.BASE=directory/"checkpoint-arms"
    stack.REPO=directory/"build/repository"
    stack.NODE=directory/"build/tools/bin/node"
    stack.BASE_ENV["PATH"]=str(stack.NODE.parent)+":"+stack.BASE_ENV["PATH"]
    selected=checkpoint_file or stack.verified_checkpoint(allow_single_account=(mode=="size"))
    if not selected:raise RuntimeError("No independently verified checkpoint at the requested population")
    stack.INPUT=selected
    checkpoint=stack.get(stack.INPUT)
    if checkpoint_file:
        from scale_seed import ORIGIN, SOURCE, POPULATION
        assert checkpoint["kind"]=="scale1-single" and checkpoint["source"]==SOURCE
        assert checkpoint["seed"]["population"]==POPULATION and Path(checkpoint["dump"])==ORIGIN/"seed.pgdump"
        assert checkpoint["sourceImageSha256"]==stack.sha(ORIGIN/"image.json")
    return checkpoint


def start_roles(slot, directory, env, witness=None):
    def endpoints():
        rows=stack.command("docker","inspect","--format","{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
                           slot+"-gw-w",slot+"-gw-r",env=env).splitlines()
        if len(rows)!=2 or len(set(rows))!=2 or not all(re.fullmatch(r"(?:\d{1,3}\.){3}\d{1,3}",ip) for ip in rows):
            return None
        return tuple(f"http://{ip}:8080" for ip in rows)

    deadline=time.time()+165
    while time.time()<deadline:
        actual=endpoints()
        if actual and all(subprocess.run(["curl","-fSs","--max-time","3",url+"/health"],stdout=subprocess.DEVNULL,
                                        stderr=subprocess.DEVNULL).returncode==0 for url in actual):
            if witness:
                # [DX-BM1] Why: the Docker IP can change while restarted peers join the network.
                # Rejected: accepting the read peer's health response as the configured writer.
                db,nonce=witness
                assert re.fullmatch(r"s2-[A-Za-z0-9_-]+",db)
                probe=subprocess.run(["curl","-fSs","--max-time","3",actual[0]+"/v1/db/"+db+"/write-options"],
                                     capture_output=True,text=True)
                if probe.returncode or json.loads(probe.stdout).get("attempt")!=nonce:
                    time.sleep(1)
                    continue
            if actual==endpoints():break
        time.sleep(1)
    else:
        raise TimeoutError("Restored gateway IPs and writer identity did not stabilize")
    env["DATOMIC_URL"],env["PROBE_READ_URL"]=actual
    stack.put(directory/"ready-endpoints.json",{"slot":slot,"source":env["TRIPLEX_TRACE_SOURCE"],
        "writer":actual[0],"reader":actual[1],"optionsAttempt":witness[1] if witness else None})
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
    fair=(mode=="ceil" and setting=="candidate") or (mode=="pulse" and setting!="individual")
    range_lookup=mode in ("pred","growth") and setting=="candidate"
    history_range=mode=="growth" and range_lookup
    small_rows=mode=="pulse" and setting in ("compact","prepared","bounded")
    prepared=mode=="pulse" and setting in ("prepared","bounded")
    budget=8000 if mode=="pulse" and setting=="bounded" else None
    settings={
        "DX_GROUP_COMMIT":str(int(fair)),"DX_GROUP_QUEUE_CLOCK":"1","DX_LIVE_PRIORITY":str(int(fair)),
        "DX_W1_EXTRA":"1","DX_GROUP_MAX_MEMBERS":"32" if prepared else "8",
        "DX_SMALL_ROWS":str(int(small_rows)),"DX_GROUP_REUSE_PREPARED":str(int(prepared)),
        "DX_WRITE_BUDGET_US":str(budget) if budget is not None else "",
        "DX_PREDECESSOR_LOOKUP":str(int(range_lookup)),
        "DX_W1_PREDECESSOR":str(int(range_lookup)),
        "TRIPLEX_DATOMIC_FAST_PATHS":"history-range" if history_range else "",
    }
    if mode=="growth":
        for peer in ("READ","WRITE"):
            key="DX_GW_"+peer+"_JAVA_OPTS"
            settings[key]=stack.BASE_ENV[key]+" -Dbm1.read.attribution=1"
    directory,slot,env,owner=stack.stack(ordinal,mode,tag,staged,settings=settings)
    chosen=owner["nonce"]
    try:
        stack.reopen(slot,env,frozen,expected,directory)
        start_roles(slot,directory,env,(stack.get(stack.INPUT)["db"],chosen))
        gateway=directory/"engines"/slot/"gateway-files.json"
        staged_source=staged or stack.REPO/"packages/datomic/gateway"
        files=stack.files(staged_source)
        if not staged:
            files["codec-spec.json"]=stack.sha(stack.REPO/"packages/datomic/src/codec-spec.json")
        assert files==stack.get(gateway)
        gateway_hash=stack.sha(gateway)
        assert stack.get(gateway.with_name("health-w.json"))["gatewaySourceHash"]==gateway_hash
        desire={"source":owner["source"],"slot":slot,"attempt":chosen,"gatewaySourceHash":gateway_hash,
                "options":dict(predecessorLookup=range_lookup,groupCommit=fair,livePriority=fair,
                    fieldCoalesce=False,queueClock=True,stageClock=True,smallRows=small_rows,
                    reusePrepared=prepared,maxMembers=32 if prepared else 8,budgetMicros=budget,
                    bulkRows=96,bulkBytes=65536)}
        if "packedJournal: boolean" in (stack.REPO/"lab/experiments/EXP-DX1/w1/write-options.ts").read_text():
            desire["historyRange"]=history_range
            desire["options"].update(ledger=False,packedJournal=False,fastReply=False)
        stack.put(directory/"writer-expectation.json",desire)
        env["DX_W1_WRITER_EXPECTATION"]=json.dumps(desire,separators=(",",":"))
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
    action,mode,root,source,*seed_path=args
    assert sys.platform=="linux" and os.getuid()==0 and mode in ("ceil","size","pred","growth","pulse")
    directory=Path(root)
    if action=="cleanup":
        stack.BASE=directory/"checkpoint-arms"
        stack.REPO=directory/"build/repository"
        stack.NODE=directory/"build/tools/bin/node"
        stack.cleanup()
        return
    assert action=="run" and not (directory/"results").exists()
    assert len(seed_path) in (0,1,3)
    checkpoint=setup(directory,mode,Path(seed_path[0]) if seed_path else None)
    assert stack.command("git","rev-parse","HEAD")==source and not stack.command("git","diff","--name-only","HEAD")
    assert shutil.disk_usage(directory).free>32*1024**3
    stack.BASE.mkdir(mode=0o700)
    tag=uuid.uuid4().hex[:8]
    frozen,expected=stack.create_template(tag,checkpoint)
    staged=None
    if mode=="growth":
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
    smoke_settings={"size":("control",),"pulse":("individual","bounded")}.get(mode,("control","candidate"))
    small=[]
    for idx,setting in enumerate(smoke_settings,1):
        smoke=arm(mode,setting,idx,uuid.uuid4().hex[:8],staged,frozen,expected,"smoke")
        sample=summarize(smoke,mode,source,stack.INPUT,small=True)
        assert sample["dispositions"]=={"ack":50} and sample["completed"] is True
        small.append(sample)
    stack.put(results/"small-reading.json",small[0])
    stack.put(results/"small-comparison.json",small)
    rows=[]
    full_settings={"size":("control",),"pulse":("individual","all","compact","prepared","bounded")}.get(
        mode,("control","candidate","candidate","control"))
    retained=None
    if len(seed_path)==3:
        assert mode=="growth"
        # [DX-BM1] Why: preserve the first completed measured block and its original source when resuming B/B/A.
        # Rejected: spending the probe budget on a second copy of a valid first control.
        original=Path("/var/tmp/triplex-w1/growthn20/checkpoint-arms")
        options=[]
        for file in original.glob("*/result.json"):
            plan=stack.get(file)["plan"]
            if not plan["smoke"] and plan["setting"]=="control":options.append(file.parent)
        saved,=options
        assert (saved.name,stack.sha(saved/"result.json"))==tuple(seed_path[1:])
        retained=summarize(saved,mode,source,stack.INPUT)
        assert retained["dispositions"]=={"ack":2250} and retained["completed"]
        rows.append(retained)
    for n,setting in enumerate(full_settings[len(rows):],len(rows)+1):
        case=arm(mode,setting,n,tag,staged,frozen,expected,"full")
        rows.append(summarize(case,mode,source,stack.INPUT))
    stack.put(results/"comparison.json",{"source":source,"mode":mode,"checkpointSha256":stack.sha(stack.INPUT),
        "smallSha256":stack.sha(results/"small-reading.json"),"smallComparisonSha256":stack.sha(results/"small-comparison.json"),
        **({"retainedControl":retained["resultSha256"]} if retained else {}),"arms":rows})


if __name__=="__main__":main(sys.argv[1:])
