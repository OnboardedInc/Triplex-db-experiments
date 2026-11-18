// @ts-nocheck -- [DX-T1-12] Why: one checked population table supplies shell limits and driver cache flags. Rejected: divergent 10k/100k wrappers.
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
export const GiB=1024**3;
// [DX-T1-12] Why: admission must name the actual driver population; an explicit subjects override wins regardless of flag order.
// Rejected: label an explicit 1k diagnostic as 10k, invent a new rung, or let a later rung overwrite explicit subjects.
export function populationFromArguments(args) {
  const at=key=>{const i=args.lastIndexOf(key);return i<0?undefined:args[i+1];};
  const explicit=at("--subjects"),rung=at("--rung")??"10k";
  if(args.includes("--subjects")&&explicit===undefined || args.includes("--rung")&&at("--rung")===undefined)throw Error("Missing population argument");
  const subjects=explicit===undefined?({"10k":10000,"100k":100000})[rung]:Number(explicit);
  if(!Number.isSafeInteger(subjects)||subjects<1||subjects>100000)throw Error("Invalid driver population");
  return {subjects,zeroReaders:args.includes("--zero-readers")};
}
export function populationSettings(subjects, guestBytes, zeroReaders=false, boundedTrial=false) {
  if(!Number.isSafeInteger(subjects) || subjects<1 || subjects>100000 || !Number.isSafeInteger(guestBytes) || guestBytes<GiB) throw Error("Invalid readiness population/memory");
  const large=subjects>10000, roomy=guestBytes>=23*GiB;
  const env={DX_PUBLICATION_WAIT_MS:large?"30000":"5000",DX_TX_MEMORY:"4g",DX_TX_HEAP:"3g",DX_TX_JAVA_OPTS:"-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200",
    DX_TX_OBJECT_CACHE:"1280m",DX_PG_MEMORY:"2g",DX_GW_WRITE_MEMORY:"3g",DX_GW_READ_MEMORY:"3g",DX_DRIVER_MEMORY:"8g",DX_DRIVER_HEAP_MB:"6144",
    DX_GW_WRITE_JAVA_OPTS:"-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g",
    DX_GW_READ_JAVA_OPTS:"-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g",
    DX_GW_WRITE_ENTITY_CACHE_BYTES:String(256*1024**2),DX_GW_READ_ENTITY_CACHE_BYTES:String(256*1024**2),
    DX_ID_CACHE_ENTRIES:"2097152",DX_ID_CACHE_BYTES:"536870912",DX_INDEX_THRESHOLD:"256m",DX_INDEX_MAX:"1g"};
  const driverArgs=["--replica-history-mib",large?"384":"192","--replica-world-cache-mib",large&&roomy?"128":"32"];
  env.DX_REPLICA_HISTORY_MIB=driverArgs[1];env.DX_REPLICA_WORLD_CACHE_MIB=driverArgs[3];
  let residentGiB=zeroReaders?9.9:13.7;
  if(large) {
    // [DX-T1-14] Why: the 4-GiB/8-GiB zero-reader 100k trial was OOM-killed with only 79 MiB guest headroom, below its local cap.
    // Rejected: keep admitting the disproven 14.5-GiB estimate; 18 GiB is a conservative new resident allowance, not a measured fit.
    residentGiB=zeroReaders&&!roomy?18:22.5;
    env.DX_GW_WRITE_ENTITY_CACHE_BYTES=String(512*1024**2);
    env.DX_GW_READ_MEMORY="1792m";
    env.DX_GW_READ_JAVA_OPTS="-Xms256m -Xmx1280m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=512m";
    // [DX-T1-14] Why: the 100k writer retains 2.5 GiB after seed and needs headroom for queued commands, beside the packed follower.
    // Rejected: 6-GiB isolates inside a 7.5-GiB cgroup (bootstrap died), or 3-GiB heaps (8s mark-compact then V8 OOM at 250s).
    env.DX_DRIVER_MEMORY=roomy?"12g":"8g";env.DX_DRIVER_HEAP_MB=roomy?"8192":"4096";
    if(roomy) {
      Object.assign(env,{DX_TX_MEMORY:"6g",DX_TX_HEAP:"5g",DX_TX_OBJECT_CACHE:"2560m",DX_TX_JAVA_OPTS:"-Xms256m -Xmx5g -XX:+UseG1GC -XX:MaxGCPauseMillis=200",DX_PG_MEMORY:"3g",DX_GW_WRITE_MEMORY:"3584m",DX_GW_READ_MEMORY:"2560m",
        DX_GW_WRITE_JAVA_OPTS:"-Xms1g -Xmx2560m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1536m"});
      env.DX_PG_SETTINGS="-c shared_buffers=1GB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c wal_sync_method=open_datasync";
    }
  }
  if (large || boundedTrial)
    Object.assign(env, {DX_MODEL_COMPACT:"1", DX_EXPECTED_STATE_RETENTION:"journal"});
  if (boundedTrial) {
    // [DX-T1-15] Why: bound the whole 16-GiB stack and move the complete expectation model out of the live writer.
    // Rejected: the part 14 RSS estimate that permitted a guest-wide OOM, or reducing correctness coverage to fit.
    if ((subjects !== 1000 && subjects !== 100000) || guestBytes >= 17*GiB)
      throw Error("Bounded memory trial requires 1,000 or 100,000 subjects in the 16-GiB guest");
    const limitsMiB = {
      DX_TX_MEMORY:4096, DX_PG_MEMORY:1792, DX_GW_WRITE_MEMORY:2304,
      DX_GW_READ_MEMORY:1792, DX_DRIVER_MEMORY:5376,
    };
    residentGiB = Object.values(limitsMiB).reduce((sum, mib) => sum + mib, 0) / 1024;
    for (const [key, mib] of Object.entries(limitsMiB)) env[key] = String(mib) + "m";
    Object.assign(env, {
      DX_BOUNDED_MEMORY_TRIAL:"1", DX_DRIVER_HEAP_MB:"4096", DX_WRITER_HEAP_TUNING:"0",
      DX_GW_WRITE_JAVA_OPTS:"-Xms256m -Xmx1792m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=768m",
      DX_GW_READ_JAVA_OPTS:"-Xms256m -Xmx1280m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=512m",
      DX_GW_WRITE_ENTITY_CACHE_BYTES:String(64*1024**2), DX_GW_READ_ENTITY_CACHE_BYTES:String(64*1024**2),
      DX_REPLICA_HISTORY_MIB:"192", DX_REPLICA_WORLD_CACHE_MIB:"8",
      DX_PG_SETTINGS:"-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c wal_sync_method=open_datasync",
      DX_PUBLICATION_WAIT_MS:"30000", DX_HARNESS_STORAGE:"volume",
    });
    driverArgs[1] = env.DX_REPLICA_HISTORY_MIB;
    driverArgs[3] = env.DX_REPLICA_WORLD_CACHE_MIB;
  }
  env.DX_EXPECTED_RESIDENT_GIB=String(residentGiB);
  const admitted=(boundedTrial || !large || zeroReaders || roomy) && guestBytes>=(residentGiB+.5)*GiB;
  return {schema:"triplex.population-settings/1",subjects,guestBytes,zeroReaders,boundedTrial,admitted,residentGiB,env,driverArgs,
    estimate:boundedTrial?"hard aggregate container limits plus 0.5 GiB guest reserve; completion still requires a native fit proof":
      large?"100k 16-GiB trial failed by kernel OOM; larger resident allowance is inferred and still needs a complete native fit proof":"observed 10k resident prior, not a hard fit proof",
    reason:admitted?null:(!boundedTrial&&large?"100k 16-GiB zero-reader trial OOM-killed; population/readers need a larger qualified budget; never resize automatically":"population/readers do not fit this guest; never resize the VM automatically")};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),marker=args.indexOf("--driver-args"),own=marker<0?args:args.slice(0,marker),at=k=>own[own.indexOf(k)+1];
  const population=marker<0?{subjects:Number(at("--subjects")),zeroReaders:own.includes("--zero-readers")}:populationFromArguments(args.slice(marker+1));
  const settings=populationSettings(population.subjects,Number(at("--guest-bytes")),population.zeroReaders,own.includes("--bounded-trial"));
  if(own.includes("--shell")) {
    if(!settings.admitted) throw Error(settings.reason);
    if (settings.boundedTrial) for (const [key, value] of Object.entries(settings.env))
      if (process.env[key] !== undefined && process.env[key] !== value)
        throw Error("Conflicting trial override: " + key);
    for(const [k,v] of Object.entries(settings.env)) if(process.env[k]===undefined) console.log(`export ${k}='${String(v).replaceAll("'","'\\''")}'`);
  } else if(own.includes("--output")) fs.writeFileSync(at("--output"),JSON.stringify(settings,null,2)+"\n",{flag:"wx"});
  else console.log(JSON.stringify(settings,null,2));
}
