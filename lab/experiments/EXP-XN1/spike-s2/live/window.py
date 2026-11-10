#!/usr/bin/env python3
# [XN-S2-LIVE] Why: one bounded holder owns all task containers, driver bytes and per-arm keeper proofs. Rejected: leaving idle engines between measured holds or forwarding ports through macOS.
import datetime,hashlib,json,os,pathlib,shutil,subprocess,sys,time
BASE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live')
LOCK=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/locks/measure')
KEEP=BASE.parent/'keep-awake-fixed.sh'
STAGE=sys.argv[1]; attempt=sys.argv[2] if len(sys.argv)>2 else '1'; out=ROOT/f'{STAGE}-{attempt}'
out.mkdir(exist_ok=False)
os.environ['DOCKER_HOST']='unix:///Users/sam/.colima/triplex2/docker.sock'
last=[p for p in [ROOT/'extract-ended.txt',ROOT/'last-release.txt'] if p.exists()]
if last:
    earliest=max(datetime.datetime.fromisoformat(p.read_text().strip().replace('Z','+00:00')).timestamp() for p in last)+120
    while time.time()<earliest: time.sleep(min(5,max(0,earliest-time.time())))
while True:
    try: LOCK.mkdir();break
    except FileExistsError: time.sleep(5)
(LOCK/'owner.json').write_text(json.dumps({'id':'XN-S2','pid':os.getpid(),'stage':STAGE})+'\n')
started=time.time(); limit=840 if not STAGE.startswith('control') else 540
cleaning=False
awake_owned=False; armed=False; names=[]; commands=[]; engine=[]
profile='control' if STAGE.startswith('control') else 'two'; driver='tx2-xns2-'+profile+'-driver'
creds=json.loads((BASE/'credentials.json').read_text())
images=json.loads((ROOT/'images.json').read_text()); ids={tag:i['Id'] for i in images for tag in i['RepoTags'] or []}
# All subprocesses have a bound shorter than the remaining hold, including cleanup's Docker calls.
def run(args,timeout=60,check=True):
    commands.append(args)
    remaining=timeout if cleaning else max(1,limit-(time.time()-started))
    p=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=min(timeout,remaining))
    if p.returncode and check: raise RuntimeError(str(args)+'\n'+p.stdout)
    return p

def docker(*args,**kw): return run(['docker',*map(str,args)],**kw)
def save(name,data): (out/name).write_text(json.dumps(data,indent=2)+'\n')
def create(name,image,args,command):
    docker('create','--pull','never','--name',name,'--network','tx2-xns2-net',*args,image,*command)
    names.append(name)
def start(name): docker('start',name)
def envargs(extra=None):
    env={'OUT':'/driver','WRITE_URL':'postgres://xtdb:xtdb@tx2-xns2-write:5432/xtdb','READ_URL':('postgres://xtdb:xtdb@tx2-xns2-read:5432/xtdb' if profile=='two' else 'postgres://xtdb:xtdb@tx2-xns2-write:5432/xtdb'),'KEEP_AWAKE':'1' if armed else '0','CGROUPS':json.dumps(cgroups)}
    env.update(extra or {});return [x for k,v in env.items() for x in ['-e',k+'='+str(v)]]
def execute(script,*args,extra=None,timeout=180):
    p=docker('exec',*envargs(extra),driver,'node','/src/'+script,*map(str,args),timeout=timeout,check=False)
    with (out/'driver.log').open('a') as f:f.write('$ '+str([script,*args,extra])+'\n'+p.stdout+'\n')
    print(script,*args,'exit',p.returncode,flush=True)
    if p.returncode: raise RuntimeError('driver failed: '+str([script,*args])+'\n'+p.stdout[-3000:])
def keeper(on):
    global awake_owned,armed
    before=run([str(KEEP),'status']).stdout
    stamp=str(len(list(out.glob('keeper-*.txt'))))
    if on:
        response=run([str(KEEP),'start']).stdout
        if response.startswith('started '): awake_owned=True
        after=run([str(KEEP),'status']).stdout
        (out/f'keeper-{stamp}.txt').write_text('before\n'+before+'start\n'+response+'after\n'+after)
        if 'running 8' not in after or '"onePerCpu": true' not in after: raise RuntimeError('keeper not real')
    else:
        if awake_owned:
            run([str(KEEP),'stop']);awake_owned=False
        after=run([str(KEEP),'status']).stdout
        (out/f'keeper-{stamp}.txt').write_text('before\n'+before+'after\n'+after)
        if 'running 0' not in after: raise RuntimeError('off arm unavailable: keeper belongs to another holder')
    armed=on

def ready(name):
    for _ in range(35):
        state=json.loads(docker('inspect',name).stdout)[0]
        if not state['State']['Running']:
            (out/(name+'-startup.log')).write_text(docker('logs',name,check=False).stdout)
            raise RuntimeError('node exited '+name)
        p=docker('exec',driver,'node','--input-type=module','-e',f"import {{Wire}} from '/src/wire.mjs';const t=setTimeout(()=>process.exit(2),6000);try{{const c=await Wire.connect('postgres://xtdb:xtdb@{name}:5432/xtdb',{{idleTimeoutMs:5000}});await c.query('SELECT 1 AS n');c.close();clearTimeout(t)}}catch(e){{console.error(e.message);process.exit(1)}}",timeout=9,check=False)
        if p.returncode==0:return
        time.sleep(2)
    raise RuntimeError('node not ready '+name)

def node(name,cpus,volume,config):
    create(name,ids['ghcr.io/xtdb/xtdb-aws:2.2.0'],['--cpuset-cpus',cpus,'--memory','3584m','--memory-swap','3584m','-v',volume+':/var/lib/xtdb','-e','JDK_JAVA_OPTIONS=-Xmx2g -XX:MaxDirectMemorySize=1g','-e','AWS_ACCESS_KEY_ID='+creds['accessKey'],'-e','AWS_SECRET_ACCESS_KEY='+creds['secretKey'],'-e','AWS_REGION=us-east-1','-e','AWS_EC2_METADATA_DISABLED=true'],['-f','/tmp/config.yaml'])
    docker('cp',BASE/config,name+':/tmp/config.yaml');start(name);engine.append(name)

def bind():
    states=json.loads(docker('inspect',*engine,driver).stdout)
    save('containers.json',states)
    b={'stage':STAGE,'attempt':attempt,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'containers':states,'source':source}
    save('binding.json',b);docker('cp',out/'binding.json',driver+':/driver/binding.json')

def cpugroups():
    pairs={c['Name'].lstrip('/'):c['Id'] for c in json.loads(docker('inspect',*engine).stdout)}
    code="""const fs=require('fs');const pairs=JSON.parse(process.argv[1]);function find(p,id,d=0){if(d>5)return;for(const x of fs.readdirSync(p,{withFileTypes:true})){if(!x.isDirectory())continue;const q=p+'/'+x.name;if(x.name.includes(id)&&fs.existsSync(q+'/cpu.stat'))return q;const r=find(q,id,d+1);if(r)return r}}console.log(JSON.stringify(Object.fromEntries(Object.entries(pairs).map(([k,id])=>{const p=find('/sys/fs/cgroup',id);if(!p)throw Error('missing cgroup '+k);return[k,p]}))));"""
    return json.loads(docker('exec',driver,'node','-e',code,json.dumps(pairs)).stdout)

try:
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('host disk floor')
    source={'commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':{}}
    (out/'sources').mkdir()
    for p in sorted(BASE.iterdir()):
        if p.is_file():shutil.copyfile(p,out/'sources'/p.name);source['files'][p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
    shutil.copyfile(KEEP,out/'sources'/'keep-awake-fixed.sh');source['files']['keep-awake-fixed.sh']=hashlib.sha256(KEEP.read_bytes()).hexdigest()
    save('source.json',source)
    if STAGE=='two-off' and all(list(ROOT.glob(stage+'-*/completed.json')) for stage in ['control-off','control-on','control-reads']):
        retired=[]
        for volume in ['tx2-xns2-live-control','tx2-xns2-control-driver']:
            proof=docker('volume','inspect',volume,check=False)
            result=docker('volume','rm',volume,check=False)
            retired.append({'volume':volume,'inspect':proof.stdout,'removeExit':result.returncode,'removeOutput':result.stdout})
        save('retired-control-volumes.json',retired)
    docker('network','create','--internal','tx2-xns2-net')
    create(driver,ids['node:22.23.2-bookworm-slim'],['--cpuset-cpus','4-7','--memory','2g','--memory-swap','2g','--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro','-v',driver+':/driver','-w','/src'],['sleep','infinity'])
    docker('cp',str(BASE)+'/.',driver+':/src/');start(driver)
    if profile=='two':
        kafka=['--hostname','tx2-xns2-kafka','--cpuset-cpus','0','--memory','1g','--memory-swap','1g']
        for part,path in [('data','/var/lib/kafka/data'),('secrets','/etc/kafka/secrets'),('config','/mnt/shared/config')]: kafka+=['-v','tx2-xns2-live-kafka-'+part+':'+path]
        vals={'KAFKA_NODE_ID':'1','KAFKA_PROCESS_ROLES':'broker,controller','KAFKA_LISTENERS':'PLAINTEXT://:9092,CONTROLLER://:9093','KAFKA_ADVERTISED_LISTENERS':'PLAINTEXT://tx2-xns2-kafka:9092','KAFKA_LISTENER_SECURITY_PROTOCOL_MAP':'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT','KAFKA_CONTROLLER_LISTENER_NAMES':'CONTROLLER','KAFKA_CONTROLLER_QUORUM_VOTERS':'1@tx2-xns2-kafka:9093','KAFKA_INTER_BROKER_LISTENER_NAME':'PLAINTEXT','KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR':'1','KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR':'1','KAFKA_TRANSACTION_STATE_LOG_MIN_ISR':'1','KAFKA_LOG_DIRS':'/var/lib/kafka/data','KAFKA_HEAP_OPTS':'-Xms256m -Xmx512m','CLUSTER_ID':'MkU3OEVBNTcwNTJENDM2Qk','KAFKA_MESSAGE_MAX_BYTES':'8388608','KAFKA_REPLICA_FETCH_MAX_BYTES':'8388608'}
        for k,v in vals.items(): kafka+=['-e',k+'='+v]
        create('tx2-xns2-kafka',ids['apache/kafka:4.1.1'],kafka,[]);start('tx2-xns2-kafka');engine.append('tx2-xns2-kafka')
        create('tx2-xns2-s3',ids['cgr.dev/chainguard/minio:latest'],['--user','0','--cpuset-cpus','0','--memory','1g','--memory-swap','1g','-v','tx2-xns2-live-s3:/data','-e','MINIO_ROOT_USER='+creds['accessKey'],'-e','MINIO_ROOT_PASSWORD='+creds['secretKey']],['server','/data','--address',':9000','--console-address',':9001']);start('tx2-xns2-s3');engine.append('tx2-xns2-s3')
        for _ in range(30):
            p=docker('exec',driver,'node','-e',"fetch('http://tx2-xns2-s3:9000/minio/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",check=False)
            if p.returncode==0:break
            time.sleep(1)
        cgroups={};execute('s3.mjs','bucket',timeout=30)
        node('tx2-xns2-write','0,1','tx2-xns2-live-write','two-write.yaml');ready('tx2-xns2-write')
        node('tx2-xns2-read','2,3','tx2-xns2-live-read','two-read.yaml');ready('tx2-xns2-read')
    else:
        node('tx2-xns2-write','0,1','tx2-xns2-live-control','local.yaml');ready('tx2-xns2-write')
    cgroups=cpugroups();bind()
    # Stage-specific commands are prepared before admission and copied into the source manifest.
    import runpy
    stage_scope={'execute':execute,'keeper':keeper,'docker':docker,'ready':ready,'driver':driver,'profile':profile,'bind':bind,'out':out,'STAGE':STAGE,'PHASE':STAGE+'-'+attempt}
    exec((BASE/'stages.py').read_text(),stage_scope)
    save('completed.json',{'stage':STAGE,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.time()-started})
except BaseException as e:
    save('failure.json',{'type':type(e).__name__,'message':str(e),'at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    raise
finally:
    cleaning=True
    # [XN-S2-LIVE] Why: retain every first failure and actual container/resource observation before removing only owned processes.
    try:
        volumes=docker('volume','ls','--filter','name=tx2-xns2','--format','{{.Name}}').stdout.splitlines()
        if volumes:
            mounts=[arg for v in volumes for arg in ['-v',v+':/owned/'+v+':ro']]
            observer='tx2-xns2-volume-observer';names.append(observer)
            observed=docker('run','--rm','--pull','never','--name',observer,'--cpuset-cpus','4-7','--memory','128m',*mounts,ids['node:22.23.2-bookworm-slim'],'sh','-c','du -sb /owned/*',timeout=20)
            (out/'volume-bytes.txt').write_text(observed.stdout)
            total=sum(int(line.split()[0]) for line in observed.stdout.splitlines())
            save('volume-total.json',{'bytes':total,'limitBytes':5000000000})
            if total>5000000000:(out/'volume-cap-exceeded.txt').write_text(str(total))
    except Exception as e:(out/'volume-observe-error.txt').write_text(str(e))

    for name in reversed(names):
        try:
            p=docker('inspect',name,check=False);(out/(name+'-final.json')).write_text(p.stdout)
            p=docker('logs',name,check=False);(out/(name+'.log')).write_text(p.stdout)
        except Exception as e: (out/(name+'-cleanup-observe-error.txt')).write_text(str(e))
    try: docker('cp',driver+':/driver/.',out/'driver',timeout=30,check=False)
    except Exception as e:(out/'driver-copy-error.txt').write_text(str(e))
    for name in reversed(names):
        try: docker('rm','-fv',name,timeout=15,check=False)
        except Exception as e:(out/(name+'-remove-error.txt')).write_text(str(e))
    try: docker('network','rm','tx2-xns2-net',check=False)
    except Exception: pass
    if awake_owned:
        try:run([str(KEEP),'stop'])
        except Exception as e:(out/'keeper-stop-error.txt').write_text(str(e))
    save('commands.json',commands)
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    (out/'released.txt').write_text(stamp+'\n');(ROOT/'last-release.txt').write_text(stamp+'\n')
    remaining_owned=docker('ps','-a','--filter','name=tx2-xns2','--format','{{.Names}}').stdout.strip()
    (out/'cleanup-containers.txt').write_text(remaining_owned+'\n' if remaining_owned else '')
    if remaining_owned:raise RuntimeError('owned containers survived cleanup; measurement lock retained')
    (LOCK/'owner.json').unlink();LOCK.rmdir()
    print('released',STAGE,'elapsed',time.time()-started,flush=True)
