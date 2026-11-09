import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {hostSample} from "../lib/noise.ts";
import {collectHostCounters,memoryFreePercent,parseVmCounters} from "../lib/host-counters.ts";
test("actual shared recorder runs in the sandbox with no setuid command",async()=>{
  const a=await collectHostCounters(),b=await collectHostCounters();
  for(const s of [a,b]) {
    assert.ok(s.loadAvg1!==null && s.hostFreeBytes>=0);
    assert.ok(s.pageouts!==null && s.decompressions!==null);
    assert.ok(s.memoryFreePct!==null);
    assert.equal(s.pressureLevel,null);assert.equal(s.swapUsedBytes,null);
    for(const p of s.probes){assert.equal(fs.statSync(p.command).mode&0o4000,0);assert.equal(p.error,null);assert.ok(p.stdout);assert.ok(!/top|sysctl/.test(p.command));}
  }
  if(b.cpuIdlePct!==null)assert.ok(b.cpuIdlePct>=0&&b.cpuIdlePct<=100);
  const actual=await hostSample(true);assert.ok(actual.pageouts!==null);assert.equal(actual.pressureLevel,null);
});
test("free percentage cannot manufacture a pressure grade",()=>{
  assert.equal(memoryFreePercent("System-wide memory free percentage: 50%"),50);
  assert.equal(memoryFreePercent("junk"),null);assert.equal(memoryFreePercent("System-wide memory free percentage: 101%"),null);
  assert.deepEqual(parseVmCounters(null),{pageouts:null,decompressions:null,compressorPages:null});
  assert.deepEqual(parseVmCounters("Pageouts: 42.\nDecompressions: 99.\nPages occupied by compressor: 7."),{pageouts:42,decompressions:99,compressorPages:7});
});
