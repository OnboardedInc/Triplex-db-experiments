#!/usr/bin/env python3
"""Prepare a new owned local run folder. Start only via an explicit --start call."""
import argparse, hashlib, json, os, shutil, socket, stat, subprocess, sys, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as inp:
        for b in iter(lambda:inp.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

def ensure_path(p):
    for q in [p,*p.parents]:
        if q.is_symlink():raise ValueError('Symlink path refused')

def start(destination):
    d=destination.absolute();ensure_path(d)
    if shutil.disk_usage(d).free<12*1024**3+512*1024**2:raise ValueError('Preserve12GiB reserve plus starter admission; runtime growth needs separate monitoring')
    ensure_path(d/'run.json')
    cfg=json.loads((d/'run.json').read_text());data=d/'data';ensure_path(data)
    backend=cfg.get('backend')
    if cfg.get('format')!='fresh-local-handoff-run/1' or backend not in ['xtdb','qlever']:raise ValueError('Invalid run format/backend')
    expected=next(x for x in json.loads((ROOT/'offline/container-images/manifest.json').read_text())['images'] if x['file'].startswith(backend+'-'))
    if cfg.get('imageId')!=expected['imageId'] or cfg.get('publicReference')!=expected['publicReference']:raise ValueError('Run image differs from bundled pinned backend image')
    if cfg.get('memory')!=('8g' if backend=='xtdb' else '4g') or cfg.get('internalPort')!=(5432 if backend=='xtdb' else 7019):raise ValueError('Run resource/port profile differs')
    if not isinstance(cfg.get('port'),int) or not 1024<=cfg['port']<=65535:raise ValueError('Invalid published port')
    runid=cfg.get('runId','')
    if len(runid)!=12 or any(c not in '0123456789abcdef' for c in runid) or cfg.get('containerName')!='temporal-'+backend+'-'+runid:raise ValueError('Invalid unique owner identity')
    if ',' in str(d):raise ValueError('Comma in bind path is unsupported')
    expected_data={}
    if backend=='qlever':
        expected_data={r['path']:r['sha256'] for r in json.loads((ROOT/'offline/qlever-bootstrap/MANIFEST.json').read_text())['files']}
    else:
        config=d/'xtdb-config.yaml';ensure_path(config)
        if not config.is_file() or sha(config)!=sha(ROOT/'triplex-backends/xtdb-config.yaml'):raise ValueError('XTDB config differs from bundled config')
    if cfg.get('initialDataSha256')!=expected_data:raise ValueError('Bootstrap map differs from bundled pristine baseline')
    if data.stat().st_uid!=os.getuid():raise ValueError('New data directory owner differs; no ownership change attempted')
    entries=list(data.iterdir())
    if any(not stat.S_ISREG(p.lstat().st_mode) for p in entries):raise ValueError('Fresh baseline must contain only expected flat regular files; symlinks, directories and special files refused')
    actual={p.name:sha(p) for p in entries}
    if actual!=expected_data:raise ValueError('Fresh-data contents changed; inspect manually, never overwrite')
    host=os.environ.get('DOCKER_HOST','')
    if host and not host.startswith('unix://'):raise ValueError('Nonlocal DOCKER_HOST refused')
    context=json.loads(subprocess.check_output(['docker','context','inspect'],text=True))[0]
    if not context['Endpoints']['docker']['Host'].startswith('unix://'):raise ValueError('Nonlocal Docker endpoint refused')
    engine=json.loads(subprocess.check_output(['docker','info','--format','{{json .}}'],text=True))
    if engine.get('OSType')!='linux' or engine.get('Architecture') not in ['aarch64','arm64']:raise ValueError('Bundled runtime image is Linux ARM64; this engine needs its own qualified image/profile')
    image=json.loads(subprocess.check_output(['docker','image','inspect',cfg['imageId']],text=True))[0]
    if image['Id']!=cfg['imageId'] or image['Architecture']!='arm64' or image['Os']!='linux':raise ValueError('Pinned image identity/platform differs')
    existing=subprocess.run(['docker','container','inspect',cfg['containerName']],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if existing.returncode==0:raise ValueError('Container name already exists; nothing replaced')
    with socket.socket() as sock:sock.bind(('127.0.0.1',cfg['port']))
    uid=str(os.getuid())+':'+str(os.getgid())
    command=['docker','run','--detach','--name',cfg['containerName'],'--label','temporal.handoff.owner='+cfg['runId'],'--platform','linux/arm64','--cpus','4','--memory',cfg['memory'],'--memory-swap',cfg['memory'],'--restart','no','--user',uid,'--env','HOME=/tmp','--log-driver','json-file','--log-opt','max-size=8m','--log-opt','max-file=2','--publish','127.0.0.1:'+str(cfg['port'])+':'+str(cfg['internalPort'])]
    if cfg['backend']=='xtdb':
        command+=['--mount','type=bind,src='+str(data)+',dst=/var/lib/xtdb','--mount','type=bind,src='+str(d/'xtdb-config.yaml')+',dst=/etc/xtdb/config.yaml,readonly','--env','JDK_JAVA_OPTIONS=-Xmx3g -XX:MaxDirectMemorySize=2g',cfg['imageId'],'-f','/etc/xtdb/config.yaml']
    else:
        command+=['--mount','type=bind,src='+str(data)+',dst=/data','--workdir','/data','--entrypoint','qlever-server',cfg['imageId'],'-i','triplex','-p','7019','-j','4','-m','512M','-c','64M','-e','32M','--persist-updates','--no-patterns','--no-access-check']
    print(json.dumps({'starting':cfg['containerName'],'profile':'fresh-portable-development-unqualified','operation':'create-only; no prior owner removal or recreation'}),flush=True)
    subprocess.run(command,check=True)

def prepare(backend,destination,port):
    d=destination.absolute();ensure_path(d)
    if d.exists():raise ValueError('Destination must not exist')
    if ',' in str(d):raise ValueError('Comma in bind path is unsupported')
    if not d.parent.is_dir():raise ValueError('Parent directory must already exist')
    if shutil.disk_usage(d.parent).free<12*1024**3+512*1024**2:raise ValueError('Preserve at least12GiB reserve plus starter admission')
    with socket.socket() as sock:sock.bind(('127.0.0.1',port))
    images=json.loads((ROOT/'offline/container-images/manifest.json').read_text())['images']
    image=next(x for x in images if x['file'].startswith(backend+'-'))
    initial={}
    if backend=='qlever':
        source=ROOT/'offline/qlever-bootstrap'
        manifest=json.loads((source/'MANIFEST.json').read_text())
        for row in manifest['files']:
            p=source/row['path']
            if p.is_symlink() or sha(p)!=row['sha256']:raise ValueError('Bootstrap digest differs')
            initial[row['path']]=row['sha256']
    d.mkdir(mode=0o700);data=d/'data';data.mkdir(mode=0o700)
    if backend=='qlever':
        for name in initial:shutil.copyfile(ROOT/'offline/qlever-bootstrap'/name,data/name)
    else:shutil.copyfile(ROOT/'triplex-backends/xtdb-config.yaml',d/'xtdb-config.yaml')
    runid=uuid.uuid4().hex[:12]
    cfg={'format':'fresh-local-handoff-run/1','runId':runid,'backend':backend,'containerName':'temporal-'+backend+'-'+runid,'imageId':image['imageId'],'publicReference':image['publicReference'],'port':port,'internalPort':5432 if backend=='xtdb' else 7019,'memory':'8g' if backend=='xtdb' else '4g','initialDataSha256':initial,'status':'PREPARED_NOT_STARTED','qualification':'New development profile, unqualified. QLever planner limit100 still requires explicit local configuration. No native startup executed during handoff packaging.'}
    (d/'run.json').write_text(json.dumps(cfg,indent=2)+'\n')
    launch='import runpy,sys\nsys.argv=['+repr(str(ROOT/'tools/prepare_local_run.py'))+',"--start",'+repr(str(d))+']\nrunpy.run_path('+repr(str(ROOT/'tools/prepare_local_run.py'))+',run_name="__main__")\n'
    (d/'start.py').write_text(launch)
    print(json.dumps({'result':'PREPARED_NOT_STARTED','backend':backend,'containerName':cfg['containerName'],'port':port,'next':'Review run.json, then explicitly invoke python3 start.py in this new folder. No service started.'},indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--backend',choices=['xtdb','qlever']);ap.add_argument('--destination',type=Path);ap.add_argument('--port',type=int);ap.add_argument('--start',type=Path);a=ap.parse_args()
    if a.start:start(a.start)
    elif not a.backend or not a.destination:ap.error('--backend and --destination required')
    else:
        port=a.port or (5442 if a.backend=='xtdb' else 7019)
        if not 1024<=port<=65535:ap.error('Use an unprivileged port')
        prepare(a.backend,a.destination,port)
