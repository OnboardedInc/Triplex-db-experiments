import json, subprocess, time, urllib.request, urllib.parse, os, sys, signal
PORT=7019
def start_index(name, nt, settings=None):
    d=f"/tmp/w/{name}"; os.makedirs(d,exist_ok=True)
    cmd=["qlever-index","-i",f"{d}/triplex","-f",nt,"-F","nt","--stxxl-memory","256M","--no-patterns"]
    if settings:
        sp=f"{d}/settings.json"; open(sp,"w").write(json.dumps(settings)); cmd+=["-s",sp]
    r=subprocess.run(cmd,capture_output=True,text=True,cwd=d)
    return r
def start_server(name):
    d=f"/tmp/w/{name}"
    p=subprocess.Popen(["qlever-server","-i",f"{d}/triplex","-p",str(PORT),"-j","4","-m","1G","-c","128M","-e","32M","--persist-updates","--no-patterns","--no-access-check"],stdout=open(f"{d}/server.log","w"),stderr=subprocess.STDOUT,cwd=d)
    for _ in range(120):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/?cmd=stats",timeout=2).read(); break
        except Exception: time.sleep(0.5)
    return p
def stop(p):
    p.send_signal(signal.SIGTERM)
    try: p.wait(15)
    except Exception: p.kill()
def sel(query):
    req=urllib.request.Request(f"http://127.0.0.1:{PORT}/",data=urllib.parse.urlencode({"query":query}).encode(),headers={"Accept":"application/sparql-results+json"})
    try:
        j=json.loads(urllib.request.urlopen(req,timeout=120).read())
    except urllib.error.HTTPError as e:
        return {"error":e.read().decode()[:400]}
    vars_=j["head"]["vars"]
    return [tuple(b[v]["value"] if v in b else None for v in vars_) for b in j["results"]["bindings"]]
def upd(query):
    req=urllib.request.Request(f"http://127.0.0.1:{PORT}/",data=query.encode(),headers={"Content-Type":"application/sparql-update"})
    try: return urllib.request.urlopen(req,timeout=120).read().decode()[:300]
    except urllib.error.HTTPError as e: return "ERR "+e.read().decode()[:300]
def show(s): return s.encode("unicode_escape").decode("ascii")
