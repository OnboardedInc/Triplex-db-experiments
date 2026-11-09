#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-X05 live evidence for the second-writer guard, run once the writer and follower are up on a slot.
// Non-destructive: it calls the same check engine.mjs runs before every XTDB docker run/start, with the bytes
// a second read-write container would mount, and asks engine.mjs to take the writer down while the follower
// exists (refused before anything is stopped). Writes runs/X05/guard-live-<slot>-<stamp>.json.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertSingleWriter, effectiveConfig, followerInfo } from '../../bin/engine.mjs';
import { REPO, containersOnVolume, inspect, loadSlots, parseArgs, slotInfo } from '../../bin/lib.mjs';

const { options } = parseArgs(process.argv.slice(2));
const config = loadSlots();
const writer = slotInfo(config, 'xtdb', options.slot ?? 's2');
const writerC = inspect(writer.container);
const folC = inspect(`${writer.container}-ro`);
if (!writerC?.State.Running || !folC?.State.Running) { console.error('writer and follower must both be running'); process.exit(2); }
const profile = folC.Config.Labels?.['tx2.follower-profile'];
const fol = followerInfo(config, writer, profile && profile !== 'default' ? { 'follower-profile': profile } : {});
const attempt = (label, info, eff) => {
  try { const v = assertSingleWriter(info, eff); return { label, container: info.container, refused: false, others: v.others, readOnly: v.readOnly }; }
  catch (error) { return { label, container: info.container, refused: error.code === 'REFUSED', message: error.message }; }
};
const writerEff = effectiveConfig(config, { ...writer, cpusetCpus: writerC.HostConfig.CpusetCpus || null });
const followerEff = effectiveConfig(config, { ...fol, cpusetCpus: folC.HostConfig.CpusetCpus || null });
const down = spawnSync(process.execPath, [path.join(REPO, 'lab/bin/engine.mjs'), 'down', '--lane', 'xtdb', '--slot', writer.slot], { encoding: 'utf8', env: process.env });
const evidence = {
  at: new Date().toISOString(), volume: writer.volume, mountedBy: containersOnVolume(writer.volume),
  followerMount: folC.Mounts.find(m => m.Destination === '/var/lib/xtdb'),
  checks: [
    attempt('a second container with the writer config (read-write) must be refused', { ...writer, container: `${writer.container}-second` }, writerEff),
    attempt('a second container with the follower config (read-only) passes', { ...fol, container: `${writer.container}-ro2` }, followerEff),
    attempt('the running follower itself passes (restart is not a second writer)', fol, followerEff),
  ],
  writerDownWhileFollowerExists: { exitCode: down.status, stderr: down.stderr.trim(), writerStillRunning: !!inspect(writer.container)?.State.Running },
};
evidence.ok = evidence.checks[0].refused && !evidence.checks[1].refused && !evidence.checks[2].refused && evidence.writerDownWhileFollowerExists.exitCode === 3 && evidence.writerDownWhileFollowerExists.writerStillRunning;
const file = path.join(REPO, 'runs/X05', `guard-live-${writer.slot}-${evidence.at.replace(/[-:.]/g, '')}.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.ok ? 0 : 1);
