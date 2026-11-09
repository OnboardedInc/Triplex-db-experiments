import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { VmAgent,hostSample,hostSpin,startHiccupMeter,summarizeRound } from "../../../bench/lib/noise.ts";
import {config} from "./rule.mjs";

export async function noiseSession(engine,out) {
  assert.equal(process.env.DOCKER_HOST,"unix:///Users/sam/.colima/triplex2/docker.sock");
  const vm=new VmAgent("triplex2",config.hiccup.sleepMs);
  await vm.start();
  const regime=engine.HostConfig.NanoCpus===0 && engine.HostConfig.CpusetCpus ? "cpuset" : "quota";
  return {regime, async round(id,work) {
    const host=[],guest=[];
    const sample=async () => { host.push(await hostSample(true)); const v=await vm.sample(); if(v)guest.push(v); };
    const calibration=async () => ({host:hostSpin(config.calibration.units,config.calibration.hostUnitIterations),
      vm:await vm.calib(config.calibration.units,config.calibration.vmUnitIterations)});
    const pre=await calibration();
    await sample();
    const meter=startHiccupMeter(config.hiccup.sleepMs),elu=performance.eventLoopUtilization();
    const fromMs=Date.now(); let pending=Promise.resolve();
    // [EXP-RT01] Why: serialize recorder probes and retain boundary samples/calibration on the same engine round. Rejected: manufacturing GREEN from latency ratios without active host/VM/cgroup signals.
    const interval=setInterval(() => { pending=pending.then(sample); },config.sampling.cadenceS*1000);
    let value,error,toMs,client;
    try { value=await work(); } catch(e) { error=e; }
    finally {
      toMs=Date.now();client=performance.eventLoopUtilization(elu);
      clearInterval(interval);await pending;await sample();await meter.stop();
    }
    const post=await calibration();
    const noise=summarizeRound({id,window:{fromMs,toMs},host,vm:guest,arms:[{arm:"A",containerId:engine.Id,cpuset:engine.HostConfig.CpusetCpus}],
      armsRequired:true,calib:{pre,post},clients:[{eluMean:client.utilization,eluMax:client.utilization,hiccupMaxMs:Math.max(0,...meter.seconds.map((s)=>s.maxMs))}]});
    fs.writeFileSync(path.join(out,`noise-${id}.json`),JSON.stringify({id,engineId:engine.Id,regime,host,vm:guest,pre,post,client,hiccup:meter.seconds,noise,vmErrors:vm.errors},null,2)+"\n",{flag:"wx"});
    if(error)throw error;
    return {value,noise};
  }, async close() {await vm.stop();}};
}
