// [EXP-OBS01] Why: execute a separately frozen NS driver without inventing flags or substituting a microtrace.
// Rejected: calling the round-2 single-row trace an NS qualification.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(manifest.format!=='OBS01-frozen-ns-driver/1'||!Array.isArray(manifest.argv)||!manifest.argv.length||manifest.scale.entities!==10000000||manifest.scale.activeFacts!==100000000||![64,256,1024].includes(manifest.scale.readers))throw new Error('reviewed year-one NS driver manifest required');
if(!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('driver/trace/generator pins required');
for(const f of manifest.files){const actual=createHash('sha256').update(fs.readFileSync(f.path)).digest('hex');if(actual!==f.sha256)throw new Error('frozen input changed: '+f.path);}
if(!path.isAbsolute(manifest.cwd)||!manifest.writerTraceSha256||!manifest.fixtureSha256)throw new Error('absolute cwd and fixed writer/fixture identities required');
const privateHost='unix:///Users/sam/.colima/triplex2/docker.sock';
if(manifest.env?.DOCKER_HOST&&manifest.env.DOCKER_HOST!==privateHost)throw new Error('frozen driver must use the triplex2 daemon');
const result=spawnSync(manifest.argv[0],manifest.argv.slice(1),{cwd:manifest.cwd,env:{...process.env,...manifest.env,DOCKER_HOST:privateHost,TX2_DOCKER_HOST:privateHost},stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
