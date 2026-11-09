// [EXP-DA00] Why: measure actual JVM RSS, creation costs and volume persistence. Rejected: R29 RSS estimates as acceptance evidence.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { docker, inspect, loadSlots, slotInfo, sha256File } from '../../bin/lib.mjs';
import { effectiveConfig } from '../../bin/engine.mjs';
const dir = path.join(import.meta.dirname, 'receipts', process.argv[2] ?? '.');
fs.mkdirSync(dir, { recursive: true });
const receipt = { startedAt: new Date().toISOString(), createdScopes: [], createLatencyMs: [] };
const save = () => fs.writeFileSync(path.join(dir, 'measurements-1.json'), JSON.stringify(receipt, null, 2) + '\n');
const engine = command => {
  const result = spawnSync(process.execPath, ['lab/bin/engine.mjs', command, '--lane', 'datomic', '--slot', 'dev', '--holder', 'EXP-DA00', '--exp', 'EXP-DA00'], { encoding: 'utf8' });
  fs.appendFileSync(path.join(dir, 'lifecycle-1.log'), `$ engine ${command}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  if (result.status !== 0) throw new Error(`engine ${command} failed: ${result.stderr}`);
};
const config = loadSlots(); const info = slotInfo(config, 'datomic', 'dev');
const call = async (route, body) => {
  const response = await fetch(`${info.endpoint}${route}`, { method: body ? 'POST' : 'GET', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  fs.appendFileSync(path.join(dir, 'gateway-1.jsonl'), JSON.stringify({ route, status: response.status, raw: text }) + '\n');
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
  return JSON.parse(text);
};
const rss = () => {
  const script = `for p in /proc/[0-9]*; do
    cmd=$(tr '\\0' ' ' < "$p/cmdline" 2>/dev/null) || continue
    case "$cmd" in *java*datomic.launcher*|*java*clojure.main*triplex.gateway.main*)
      case "$cmd" in *bash*) continue;; esac
      printf '%s\\n' "$p $cmd"
      grep -E '^(Name|Pid|VmRSS|VmHWM|Threads):' "$p/status"
      grep '^Cpus_allowed_list:' "$p/status";;
    esac
  done`;
  return { at: new Date().toISOString(), processes: docker(['exec', info.container, 'bash', '-c', script]), stats: docker(['stats', '--no-stream', '--format', '{{json .}}', info.container]) };
};
try {
  if (inspect(info.container)) throw new Error('Measurement requires an absent Datomic container for an honest cold start; ask orchestrator');
  receipt.storageVolumeExistedAtStart = Boolean(docker(['volume', 'inspect', info.volume], { allowFail: true }));
  const started = performance.now(); engine('up'); receipt.coldStartToReadyMs = performance.now() - started;
  receipt.health = await call('/health');
  const live = inspect(info.container);
  receipt.runtime = { cpusetCpus: live.HostConfig.CpusetCpus, mounts: live.Mounts };
  if (receipt.runtime.cpusetCpus !== '0,1') throw new Error('Missing container CPU pin');
  for (const destination of ['/config/transactor.properties', '/config/entrypoint.sh'])
    if (!live.Mounts.some(m => m.Destination === destination && m.RW === false)) throw new Error(`Missing read-only mount ${destination}`);
  receipt.idle = rss(); save();
  const generation = String(Date.now());
  for (let i = 0; i < 100; i++) {
    const scope = JSON.stringify(['triplex-scope-v1', 'test', 'da00', `measure-${i}`, generation]);
    const t = performance.now(); const created = await call('/v1/db/create', { scope });
    receipt.createLatencyMs.push(performance.now() - t);
    receipt.createdScopes.push({ scope, ...created }); save();
  }
  receipt.after100 = rss();
  const first = receipt.createdScopes[0];
  receipt.basisBeforePark = await call(`/v1/db/${first.db}/basis`);
  engine('down');
  receipt.volumeRetained = Boolean(docker(['volume', 'inspect', info.volume], { allowFail: true })); save();
  const restarted = performance.now(); engine('up'); receipt.restartToReadyMs = performance.now() - restarted;
  receipt.basisAfterPark = await call(`/v1/db/${first.db}/basis`);
  if (JSON.stringify(receipt.basisBeforePark) !== JSON.stringify(receipt.basisAfterPark)) throw new Error('Basis changed across park');
  receipt.duplicateCreate = await call('/v1/db/create', { scope: first.scope });
  if (receipt.duplicateCreate.created !== false) throw new Error('Database did not survive park');
  // Retain the first test database as inspectable persistence proof; delete the other owned test scopes.
  for (const entry of receipt.createdScopes.slice(1)) await call('/v1/db/delete', { scope: entry.scope });
  receipt.retention = { kept: first, deleted: 99, resident: 'left running for orchestrator' };
  receipt.effectiveConfigSha256 = effectiveConfig(config, info).sha256;
  receipt.image = JSON.parse(docker(['image', 'inspect', info.laneConf.image]))[0];
  receipt.measureSourceSha256 = sha256File(new URL(import.meta.url));
  receipt.passed = true;
} catch (error) { receipt.error = error.stack; receipt.passed = false; process.exitCode = 1; }
finally { receipt.finishedAt = new Date().toISOString(); save(); }
