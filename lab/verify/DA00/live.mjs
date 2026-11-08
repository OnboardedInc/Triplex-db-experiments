import fs from 'node:fs';

// [CX-VDA00] Why: touch only a verifier-owned scratch scope if the resident is available. Rejected: bringing a parked shared resident up.
const record = { startedAt: new Date().toISOString(), requests: [] };
const generation = process.argv[2] ?? String(Date.now());
const scope = JSON.stringify(['triplex-scope-v1', 'test', 'verifier', 'cx-vda00', process.argv.includes('--numeric') ? Number(generation) : generation]);
record.scope = scope;
const call = async (method, route, body) => {
  try {
    const r = await fetch('http://127.0.0.1:8470' + route, { method, signal: AbortSignal.timeout(5000),
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const bytes = await r.text();
    record.requests.push({ method, route, status: r.status, bytes });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return JSON.parse(bytes);
  } catch (e) {
    record.requests.push({ method, route, error: e.message, cause: e.cause?.code });
    throw e;
  }
};
let created = false;
let attempted = false;
try {
  record.health = await call('GET', '/health');
  attempted = true;
  if (process.argv[3] === '--cleanup') {
    record.deleted = await call('POST', '/v1/db/delete', { scope });
    attempted = false;
  } else {
  const db = await call('POST', '/v1/db/create', { scope });
  created = true;
  record.created = db;
  record.duplicate = await call('POST', '/v1/db/create', { scope });
  record.basis = await call('GET', `/v1/db/${db.db}/basis`);
  }
} catch (e) { record.unavailableOrFailed = e.message; }
finally {
  if (attempted) {
    try { record.deleted = await call('POST', '/v1/db/delete', { scope }); }
    catch (e) { record.cleanupFailed = e.message; }
  }
  record.finishedAt = new Date().toISOString();
  fs.writeFileSync(new URL('evidence/live.json', import.meta.url), JSON.stringify(record, null, 2) + '\n');
}
