#!/usr/bin/env python3
# [DX-S3] Why: fresh isolated stacks and retained native evidence per variant. Rejected: mutating a shared resident.
import subprocess as sp, pathlib, os, sys, json, time, shutil
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3')
D=['docker','--host','unix:///Users/sam/.colima/triplex2/docker.sock']
def docker(*args,check=True): return sp.run(D+list(args),text=True,stdout=sp.PIPE,stderr=sp.STDOUT,check=check).stdout
def cleanup(prefix,dest):
    assert prefix.startswith('tx2-dxs3-') and dest==ROOT/prefix
    for role in ['pg','tx','gw-w','gw-r']:
        name=prefix+'-'+role
        if docker('container','inspect',name,check=False).startswith('['):
            (dest/(role+'-stdout.log')).write_text(docker('logs','--timestamps',name,check=False))
            (dest/(role+'-final-inspect.json')).write_text(docker('inspect',name,check=False))
            if role!='pg':
                (dest/(role+'-files.txt')).write_text(docker('exec',name,'sh','-c','find /opt/datomic/log /tmp -maxdepth 2 -type f',check=False))
                (dest/(role+'-logs')).mkdir(exist_ok=True)
                docker('cp',name+':/opt/datomic/log/.',str(dest/(role+'-logs')),check=False)
                (dest/(role+'-gc')).mkdir(exist_ok=True)
                files=['/tmp/dxs3-gc.log']+['/tmp/dxs3-gc.log.'+str(i) for i in range(20)]
                for f in files:
                    if f.startswith('/tmp/dxs3-gc.log'): docker('cp',name+':'+f,str(dest/(role+'-gc')/pathlib.Path(f).name),check=False)
            docker('rm','-f',name,check=False)
    docker('network','rm',prefix+'-net',check=False)
    docker('volume','rm',prefix+'-pg-data',check=False)
    (dest/'cleanup.json').write_text(json.dumps({k:docker(*args,check=False).strip() for k,args in {'containers':['ps','-a','--filter','name='+prefix,'--format','{{.Names}}'],'networks':['network','ls','--filter','name='+prefix,'--format','{{.Name}}'],'volumes':['volume','ls','--filter','name='+prefix,'--format','{{.Name}}']}.items()},indent=2))

def run(v):
    assert v in ['v0','v1','v2','v3','v4']
    prefix='tx2-dxs3-'+v+'-'+str(int(time.time()))
    dest=ROOT/prefix
    dest.mkdir(parents=True)
    gc='-Xlog:gc*,safepoint:file=/tmp/dxs3-gc.log:time,uptime,level,tags:filecount=20,filesize=20m'
    tx_java='-Xms256m -Xmx2g '+gc
    gw_java=gc
    args=['bash','lab/experiments/EXP-DX1/stack/up.sh',prefix,'--cpus-pg','0','--cpus-tx','0,1' if v=='v0' else '1,2','--cpus-gw-write','2' if v=='v0' else '3','--cpus-gw-read','3,4' if v=='v0' else '4','--port-write','8503','--port-read','8504']
    pg='-c log_checkpoints=on -c log_min_duration_statement=20 -c fsync=on -c synchronous_commit=on -c full_page_writes=on'
    if v!='v0':
        args+=['--pg-memory','2g']
        pg+=' -c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
    if v in ['v2','v3','v4']:
        args+=['--tx-memory','5g','--gw-memory','3g','--memory-index-threshold','768m','--memory-index-max','1536m','--object-cache-max','256m']
        tx_java='-Xms256m -Xmx4g '+gc
        gw_java='-Xms256m -Xmx2500m -Ddatomic.objectCacheMax=268435456 '+gc
    if v=='v3' or (v=='v4' and os.environ.get('DXS3_V4_BASE','v3')=='v3'):
        tx_java+=' -XX:+UseZGC -XX:+ZGenerational'
        gw_java+=' -XX:+UseZGC -XX:+ZGenerational'
    args+=['--tx-java-opts',tx_java,'--gw-java-opts',gw_java,'--pg-settings',pg]
    (dest/'command.json').write_text(json.dumps(args,indent=2))
    env={**os.environ,'DX_STACK_EVIDENCE':str(ROOT),'DXS3_PREFIX':prefix,'DXS3_INDEX':'1' if v in ['v2','v3','v4'] else '0','DXS3_LEAN':'1' if v=='v4' else '0'}
    (ROOT/'active.json').write_text(json.dumps({'prefix':prefix,'variant':v}))
    try:
        with (dest/'up.log').open('w') as log: sp.run(args,env=env,stdout=log,stderr=sp.STDOUT,check=True)
        for role in ['tx','gw-w','gw-r']:
            cmd='jcmd -l; ps -eo pid,args; for p in $(jcmd -l | awk \'!/sun.tools.jcmd.JCmd/ {print $1}\'); do jcmd "$p" VM.flags; jcmd "$p" VM.command_line; jcmd "$p" GC.heap_info; done'
            (dest/(role+'-effective-jvm.txt')).write_text(docker('exec',prefix+'-'+role,'sh','-c',cmd,check=False))
        (dest/'pg-settings.txt').write_text(docker('exec',prefix+'-pg','psql','-U','postgres','-d','datomic','-c',"SELECT name,setting,unit FROM pg_settings WHERE name IN ('fsync','synchronous_commit','full_page_writes','shared_buffers','max_wal_size','checkpoint_timeout','wal_buffers','log_checkpoints','log_min_duration_statement','log_timezone');"))
        (dest/'clock.txt').write_text(str(time.time())+'\n'+docker('exec',prefix+'-tx','date','-u','+%s.%N')+str(time.time()))
        with (dest/'bench.log').open('w') as log:
            sp.run(['node','--import','tsx','lab/experiments/EXP-DX1/s3/bench.mjs'],env=env,stdout=log,stderr=sp.STDOUT,check=True)
    finally:
        cleanup(prefix,dest)
if __name__=='__main__':
    for variant in sys.argv[1:]: run(variant)
