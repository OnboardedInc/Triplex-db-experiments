import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {hostSample} from "../round7/m01/noise.ts";
const out="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/counter-check1";
assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
assert.equal(process.env.DOCKER_HOST,"unix:///Users/sam/.colima/triplex2/docker.sock");
const started=new Date().toISOString();
const host=await hostSample(true);
assert.ok(Number.isFinite(host.pressureLevel) && Number.isFinite(host.pageouts));
const disk=execFileSync("df",["-k",process.cwd()],{encoding:"utf8"});
const status=execFileSync(process.execPath,["lab/bin/engine.mjs","status"],{encoding:"utf8"});
const pool=fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/pool.json");
for(const [p,b] of [["disk.txt",disk],["status.txt",status],["pool.json",pool]])fs.writeFileSync(path.join(out,p),b);
const freeBytes=Number(disk.trim().split("\n").at(-1).trim().split(/\s+/)[3])*1024;
const requiredBytesExclusive=13*1024**3;
const configuredContext=JSON.parse(fs.readFileSync("/Users/sam/.docker/config.json")).currentContext;
assert.equal(configuredContext,"colima");
assert.ok(!fs.existsSync("/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json"));
// [EXP-RT01] Why: distinguish a proven host-counter permission requirement from a judged timing failure, and recheck capacity before proposing recovery. Rejected: relabeling EPERM as a performance regression or retrying against stale disk evidence.
const result={started,ended:new Date().toISOString(),host,freeBytes,requiredBytesExclusive,
  recoveryAdmission:freeBytes>requiredBytesExclusive ? "CAPACITY_PRESENT" : "NOT_RERUN_DISK_FORECAST",
  executionPermission:"exec_command require_escalated, read-only aggregate host counters; no engine acquisition or gate retry",
  configuredContext,ownerAbsent:true,sourceSha256:createHash("sha256").update(fs.readFileSync(import.meta.filename)).digest("hex")};
fs.writeFileSync(path.join(out,"RESULT.json"),JSON.stringify(result,null,2)+"\n");
fs.copyFileSync(import.meta.filename,path.join(out,"counter-check.mjs"));
console.log(JSON.stringify(result));
