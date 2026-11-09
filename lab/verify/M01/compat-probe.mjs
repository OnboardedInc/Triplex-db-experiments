// [CX-VM01R] Why: compare actual public harness outputs on the same offline inputs. Rejected: hard-coded historical expected hashes alone.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=path.resolve(process.argv[2]);
process.env.TX2_CONFIG_DIR=root;
process.env.TX2_ENGINE_DIR=path.join(import.meta.dirname,'runtime/config-output',process.argv[3]);
const lib=await import(pathToFileURL(path.join(root,'lab/bin/lib.mjs')));
const engine=await import(pathToFileURL(path.join(root,process.argv[3]==='main'?'lab/bin/engine-probe.mjs':'lab/bin/engine.mjs')));
const receipt=await import(pathToFileURL(path.join(root,'lab/bin/receipt.mjs')));
const config=lib.loadSlots(),results={slots:{},followers:{},verdicts:{},languages:{},admission:[]};
for(const lane of ['xtdb','qlever','datomic'])for(const slot of Object.keys(config.slots[lane])){
 const info=lib.slotInfo(config,lane,slot),eff=engine.effectiveConfig(config,info);
 results.slots[`${lane}/${slot}`]={effective:eff.effective,sha256:eff.sha256,args:engine.runArgs(info,eff,'fixture-holder')};
 if(lane==='xtdb')for(const profile of [null,'small'])for(const pin of [null,'4-5']){
  const fol=engine.followerInfo(config,info,{...(profile?{'follower-profile':profile}:{}),...(pin?{'cpuset-cpus':pin}:{})});
  const fe=engine.effectiveConfig(config,fol);
  results.followers[`${slot}/${profile}/${pin}`]={effective:fe.effective,sha256:fe.sha256,args:engine.runArgs(fol,fe,'fixture-holder')};
 }
}
for(const executed of [0,1,8])for(const skip of [0,1])for(const gate of ['G0','G1','G2','G4','NS','GS']){
 const fixture={gate,reasons:[],scope:'full',contractVersion:'test',runKind:'diagnostic',counts:{executed,skip},lockfileSha256:'l',gateScripts:{},git:{head:'h',headTree:'t',branch:'main',sourceTreeId:'s',diffSha256:'d'},toolchain:{node:'22',pnpm:'10'},build:{manifestSha256:'m'},engine:{imageId:'i',configSha256:'c',endpoint:'e'},contactedEndpoint:'e'};
 results.verdicts[`${gate}/${executed}/${skip}`]=receipt.verdictOf(fixture);
}
for(const language of ['xtql','xtdb-sql','sparql','none'])results.languages[language]=receipt.classifyLanguages([{operation:'public-native-query',language,steps:[]}]);
for(const mem of [0,2,4,8,12])results.admission.push(lib.admission({config,reservations:[],running:[],request:{container:'fixture',memBytes:mem*1024**3,diskForecastBytes:0},diskUsedBytes:0}));
console.log(JSON.stringify(results,null,2).replaceAll(process.env.TX2_ENGINE_DIR,'<ENGINE_DIR>'));
