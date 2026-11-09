// [EXP-OBS01] Why: preserve and verify owned slot bytes before authorized volume removal.
// Rejected: deleting canary volumes after copying only their query results (not lossless).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, admission, atomicJson, containersOnVolume, defaultHolder, docker, fail, inspect, listTx2Containers, readJson, POOL_FILE, reconcile, vmDisk, withPool } from './lib.mjs';
export async function archiveVolume(config, info, opts) {
  const destination = path.resolve(opts.destination ?? '');
  const allowed = '/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/';
  if (!destination.startsWith(allowed) || fs.existsSync(destination)) fail('REFUSED', 'use a new directory below the OBS01 evidence archive');
  if (!/@sha256:[a-f0-9]{64}$/.test(opts.image ?? '')) fail('REFUSED', 'archive image must be digest-pinned');
  const retained = readJson(POOL_FILE()).retainedVolumes.find(r => r.volume === info.volume);
  if (retained?.holder !== defaultHolder(opts)) fail('REFUSED', 'only the retained volume holder may archive it');
  if (inspect(info.container) || containersOnVolume(info.volume).length) fail('REFUSED', 'volume is not quiescent/unmounted');
  const name = `tx2-archive-${info.lane}-${info.slot}`;
  await withPool(async ledger => {
    const running = listTx2Containers({ all: true }); reconcile(ledger, running);
    const request = { container:name, memBytes:128*1024*1024, diskForecastBytes:retained.bytes*2+16*1024*1024 };
    const verdict = admission({ config, reservations:ledger.reservations, running, request, diskUsedBytes:vmDisk(config).usedBytes });
    if (!verdict.ok) fail('REFUSED', verdict.reasons.join('; '));
    ledger.reservations.push({ ...request, holder:defaultHolder(opts), state:'starting', pid:process.pid, role:'archive', cpus:.25 });
  });
  fs.mkdirSync(destination, { recursive:true, mode:0o700 });
  try {
    docker(['run','--rm','--name',name,'--label','tx2.managed-by=lab/bin/engine.mjs','--network','none','--memory',String(128*1024*1024),'--memory-swap',String(128*1024*1024),'--cpus','.25','--read-only','--cap-drop','ALL','--cap-add','DAC_READ_SEARCH',
      '-v',`${info.volume}:/source:ro`,'-v',`${destination}:/archive`,'-v',`${path.join(REPO,'lab/observer/archive_volume.py')}:/archive_volume.py:ro`, '--entrypoint','python3',opts.image,'-I','-B','/archive_volume.py']);
    const manifest = readJson(path.join(destination,'manifest.json'));
    if (!manifest.readbackVerified || !manifest.sourceUnchanged) fail('REFUSED','archive did not verify');
    atomicJson(path.join(destination,'ownership.json'), { volume:info.volume,holder:defaultHolder(opts), archive:manifest.archiveSha256 });
    console.log(JSON.stringify({ archived:info.volume,destination,sha256:manifest.archiveSha256 }));
  } finally {
    if (!inspect(name)) await withPool(async ledger => { ledger.reservations=ledger.reservations.filter(r=>r.container!==name); });
  }
}
