# [XN-S2-LIVE] Why: freeze stage order and cohorts before admission. Rejected: selecting only fast windows after seeing results.
if STAGE=='control-off':
    keeper(False)
    if docker('exec',driver,'test','-f','/driver/seed.json',check=False).returncode!=0:
        execute('read.mjs','seed',timeout=120)
    if docker('exec',driver,'test','-f','/driver/history.json',check=False).returncode!=0:
        execute('write.mjs','history','one','fresh',timeout=240)
    for shape in ['one','two']:
        execute('write.mjs','correct',shape,PHASE,timeout=30)
        execute('write.mjs','closed',shape,PHASE+'-fresh','1000',timeout=60)
        execute('write.mjs','closed',shape,PHASE+'-aged','1000',timeout=60)
    for rate,readers in [(15,0),(55,0),(55,16)]:execute('write.mjs','open','one',PHASE,rate,readers,timeout=100)
elif STAGE=='control-on':
    keeper(True)
    for shape in ['one','two']:
        execute('write.mjs','correct',shape,PHASE,timeout=30)
        execute('write.mjs','closed',shape,PHASE+'-fresh','1000',timeout=60)
        execute('write.mjs','closed',shape,PHASE+'-aged','1000',timeout=60)
    for rate,readers in [(15,0),(55,0),(55,16)]:execute('write.mjs','open','one',PHASE,rate,readers,timeout=100)
elif STAGE=='control-reads':
    keeper(True)
    for kind in ['a','b','c','d','e']:
        for readers in [1,4,16]:execute('read.mjs','read',PHASE,kind,readers,timeout=180)
elif STAGE=='topology':
    keeper(True)
    if docker('exec',driver,'test','-f','/driver/seed.json',check=False).returncode!=0:execute('read.mjs','seed',timeout=180)
    execute('proof.mjs','await-seed',timeout=45)
    execute('proof.mjs','before',timeout=100)
    docker('stop','tx2-xns2-read',timeout=20)
    (out/'read-stopped-inspect.json').write_text(docker('inspect','tx2-xns2-read').stdout)
    execute('proof.mjs','stopped',timeout=30)
    docker('start','tx2-xns2-read');ready('tx2-xns2-read')
    execute('proof.mjs','restarted',timeout=45);bind()
    execute('write.mjs','correct','one',PHASE,timeout=30)
    if docker('exec',driver,'test','-f','/driver/history.json',check=False).returncode!=0:execute('write.mjs','history','one','fresh',timeout=540)
elif STAGE=='two-off':
    keeper(False)
    if docker('exec',driver,'test','-f','/driver/topology-restarted.json',check=False).returncode!=0:raise RuntimeError('topology proof missing')
    execute('write.mjs','correct','one',PHASE,timeout=30)
    for rate in [15,55]:
        for readers in [0,16,64,256]:execute('write.mjs','open','one',PHASE,rate,readers,timeout=110)
elif STAGE=='two-on':
    keeper(True)
    execute('write.mjs','correct','one',PHASE,timeout=30)
    for rate in [15,55]:
        for readers in [0,16,64,256]:execute('write.mjs','open','one',PHASE,rate,readers,timeout=110)
elif STAGE=='lag':
    for on in [False,True]:
        keeper(on)
        for rate in [15,55]:
            for readers in [0,256]:execute('write.mjs','open','one',PHASE+('-on' if on else '-off'),rate,readers,extra={'LAG':'1'},timeout=110)
elif STAGE=='reads':
    keeper(True)
    for kind in ['a','c','e','f']:
        for readers in [16,64,256]:execute('read.mjs','read',PHASE,kind,readers,extra={'READ_N':'20000','READ_WRITER_RATE':'55'},timeout=180)
    execute('wait.mjs',timeout=100)
else:raise RuntimeError('unknown stage '+STAGE)
