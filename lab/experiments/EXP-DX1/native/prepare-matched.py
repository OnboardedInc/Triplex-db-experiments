#!/usr/bin/env python3
"""[DX-N1] Why: reuse B6/B7 algorithms identically in both arms within a short lease.
Rejected: four full five-minute writer traces plus startup (cannot fit a 20-minute hold).
Only durations/output paths and the platform CPU reader change; original inputs remain intact.
"""
import pathlib,re,json,hashlib
repo=pathlib.Path(__file__).resolve().parents[4]; out=pathlib.Path(__file__).resolve().parent/'generated';out.mkdir(exist_ok=True)
manifest={}
for name,rel in [('lone-commit','b6/lone-commit.mjs'),('pull-load','b7/pull-load.mjs')]:
 src=repo/'lab/experiments/EXP-DX1'/rel;s=src.read_text();original=hashlib.sha256(src.read_bytes()).hexdigest()
 def absolute(m):return m[1]+(src.parent/m[2]).resolve().as_uri()+m[3]
 s=re.sub(r"(from\s*['\"])(\.[^'\"]+)(['\"])",absolute,s)
 s="import {totals,delta} from "+repr((pathlib.Path(__file__).resolve().parent/'cpu-totals.mjs').as_uri())+";\n"+s
 s="import { execFileSync as nativeExec } from 'node:child_process';\nconst outputRoot=process.env.DX_N1_OUTPUT||'/driver';\n"+s
 s=s.replace("'/driver/", "outputRoot+'/").replace('"/driver/', 'outputRoot+"/')
 if name=='lone-commit':
  s=s.replace('const start=performance.now(),jobs=[];', 'const cpuBefore=totals(); const start=performance.now(),jobs=[];')
  s=s.replace('phases[name]={openLoop,', 'phases[name]={engineCpu:delta(cpuBefore,totals(),performance.now()-start),openLoop,')
  s=s.replace('start+60000','start+10000').replace("await phase('coldSparse',120,()=>1000);",'').replace("await phase('backToBack',2000);","await phase('backToBack',200);").replace("await phase('sparse',120,()=>1000);","await phase('sparse',10,()=>1000);")
  s=s.replace("if(process.env.B6_WRITES_ONLY!=='1')await import('./pull-load.mjs');",'')
 else:
  old='''    const cg = process.env.TX2_ENGINE_CGROUPS.split(",")
      .find((v) => v.startsWith(process.env.DATOMIC_READ_URLS.split("//")[1].split(":")[0] + "="))
      ?.split("=")[1];
    assert.ok(cg, "read gateway cgroup");
    const cpu = () => Number(/usage_usec (\\d+)/.exec(fs.readFileSync(cg + "/cpu.stat", "utf8"))[1]);'''
  new='''    const nativePid=JSON.parse(process.env.TX2_NATIVE_PIDS||'{}')['gw-r'];
    const cg=(process.env.TX2_ENGINE_CGROUPS||'').split(',').find(v=>v.startsWith(process.env.DATOMIC_READ_URLS.split('//')[1].split(':')[0]+'='))?.split('=')[1];
    assert.ok(nativePid||cg,'read gateway CPU source');
    const cpu=()=>{if(!nativePid)return Number(/usage_usec (\\d+)/.exec(fs.readFileSync(cg+'/cpu.stat','utf8'))[1]);
      const text=nativeExec('ps',['-p',String(nativePid),'-o','time='],{encoding:'utf8'}).trim();
      return text.split(':').map(Number).reduce((s,n)=>s*60+n,0)*1e6;};'''
  assert old in s;s=s.replace(old,new)
  s=s.replace('const driverCpuBefore = process.cpuUsage(),','const engineCpuBefore=totals();\n      const driverCpuBefore = process.cpuUsage(),')
  s=s.replace('gatewayCacheBefore,\n        gatewayCacheAfter,','engineCpu:delta(engineCpuBefore,totals(),wallMs),\n        gatewayCacheBefore,\n        gatewayCacheAfter,')
 (out/(name+'.mjs')).write_text(s)
 manifest[name]={'source':str(src.relative_to(repo)),'sourceSha256':original,'derivedSha256':hashlib.sha256(s.encode()).hexdigest(),'changes':'writer: 200 dense, 10 sparse at 1/s, 10 s open-loop Poisson15; readers: output directory + native CPU reader only'}
(out/'provenance.json').write_text(json.dumps(manifest,indent=2))
