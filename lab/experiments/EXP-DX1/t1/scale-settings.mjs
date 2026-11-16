// @ts-nocheck -- [DX-T1-12] Why: one checked population table supplies shell limits and driver cache flags. Rejected: divergent 10k/100k wrappers.
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
export const GiB=1024**3;
export function populationSettings(subjects, guestBytes, zeroReaders=false) {
  if(!Number.isSafeInteger(subjects) || subjects<1 || subjects>100000 || !Number.isSafeInteger(guestBytes) || guestBytes<GiB) throw Error("Invalid readiness population/memory");
  const large=subjects>10000, roomy=guestBytes>=23*GiB;
  const env={DX_TX_MEMORY:"4g",DX_TX_HEAP:"3g",DX_TX_JAVA_OPTS:"-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200",
    DX_TX_OBJECT_CACHE:"1280m",DX_PG_MEMORY:"2g",DX_GW_WRITE_MEMORY:"3g",DX_GW_READ_MEMORY:"3g",DX_DRIVER_MEMORY:"8g",DX_DRIVER_HEAP_MB:"6144",
    DX_GW_WRITE_JAVA_OPTS:"-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g",
    DX_GW_READ_JAVA_OPTS:"-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g",
    DX_GW_WRITE_ENTITY_CACHE_BYTES:String(256*1024**2),DX_GW_READ_ENTITY_CACHE_BYTES:String(256*1024**2),
    DX_ID_CACHE_ENTRIES:"2097152",DX_ID_CACHE_BYTES:"536870912",DX_INDEX_THRESHOLD:"256m",DX_INDEX_MAX:"1g"};
  const driverArgs=["--replica-history-mib",large?"384":"192","--replica-world-cache-mib",large&&roomy?"128":"32"];
  env.DX_REPLICA_HISTORY_MIB=driverArgs[1];env.DX_REPLICA_WORLD_CACHE_MIB=driverArgs[3];
  let residentGiB=zeroReaders?9.9:13.7;
  if(large) {
    residentGiB=zeroReaders&&!roomy?14.5:22.5;
    env.DX_GW_WRITE_ENTITY_CACHE_BYTES=String(512*1024**2);
    env.DX_GW_READ_MEMORY="1792m";
    env.DX_GW_READ_JAVA_OPTS="-Xms256m -Xmx1280m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=512m";
    env.DX_DRIVER_MEMORY=roomy?"12g":"7680m";env.DX_DRIVER_HEAP_MB=roomy?"8192":"6144";
    if(roomy) {
      Object.assign(env,{DX_TX_MEMORY:"6g",DX_TX_HEAP:"5g",DX_TX_OBJECT_CACHE:"2560m",DX_TX_JAVA_OPTS:"-Xms256m -Xmx5g -XX:+UseG1GC -XX:MaxGCPauseMillis=200",DX_PG_MEMORY:"3g",DX_GW_WRITE_MEMORY:"3584m",DX_GW_READ_MEMORY:"2560m",
        DX_GW_WRITE_JAVA_OPTS:"-Xms1g -Xmx2560m -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1536m"});
      env.DX_PG_SETTINGS="-c shared_buffers=1GB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c wal_sync_method=open_datasync";
    }
  }
  env.DX_EXPECTED_RESIDENT_GIB=String(residentGiB);
  const admitted=(!large || zeroReaders || roomy) && guestBytes>=(residentGiB+.5)*GiB;
  return {schema:"triplex.population-settings/1",subjects,guestBytes,zeroReaders,admitted,residentGiB,env,driverArgs,
    estimate:large?"inferred 100k resident prior; requires native 1k/10k proof before a 100k reading":"observed 10k resident prior, not a hard fit proof",
    reason:admitted?null:"population/readers do not fit this guest; never resize the VM automatically"};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),at=k=>args[args.indexOf(k)+1];
  const settings=populationSettings(Number(at("--subjects")),Number(at("--guest-bytes")),args.includes("--zero-readers"));
  if(args.includes("--shell")) {
    if(!settings.admitted) throw Error(settings.reason);
    for(const [k,v] of Object.entries(settings.env)) if(process.env[k]===undefined) console.log(`export ${k}='${String(v).replaceAll("'","'\\''")}'`);
  } else if(args.includes("--output")) fs.writeFileSync(at("--output"),JSON.stringify(settings,null,2)+"\n",{flag:"wx"});
  else console.log(JSON.stringify(settings,null,2));
}
