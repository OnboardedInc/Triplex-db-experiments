// EXP-J01 commit service time, A0 against compact, interleaved in one window on one shared resident.
// One writer per arm, closed loop, 10-fact commands with a commandId, each arm on its own fresh scope.
// Blocks alternate the arm that goes first (A0 C, C A0, ...) so host-load drift falls on both arms.
// Service time = Triples.transact wall time (claim read, staging, guarded submit, receipt read).
//
// Usage: node service.mjs --lane xtdb|qlever --blocks B --per-block N [--label TEXT]
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { commandOps, laneRuntime, now, round, summary, writeReceipt } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const lane = opt('--lane');
const blocks = Number(opt('--blocks', 6));
const perBlock = Number(opt('--per-block', 10));
const label = opt('--label', 'interleaved');

const arms = {};
for (const encoding of ['a0', 'compact'])
  arms[encoding] = await laneRuntime(lane, { scope: `j01-svc-${encoding}-${randomUUID()}`, commitEncoding: encoding });
const samples = { a0: [], compact: [] };
const updateMs = { a0: [], compact: [] };
const loads = [];
let seq = 0;
for (let b = 0; b < blocks; b++) {
  const order = b % 2 === 0 ? ['a0', 'compact'] : ['compact', 'a0'];
  for (const encoding of order) {
    const rt = arms[encoding];
    const before = lane === 'qlever' ? rt.measuring.updates.length : 0;
    for (let i = 0; i < perBlock; i++) {
      seq++;
      const t0 = now();
      await rt.run(rt.triples.transact(commandOps(seq % 50, 10, seq), { commandId: `j01:svc:${randomUUID()}` }));
      samples[encoding].push({ block: b, ms: now() - t0 });
    }
    if (lane === 'qlever') updateMs[encoding].push(...rt.measuring.updates.slice(before).map((u) => u.ms));
  }
  loads.push(os.loadavg()[0]);
}
for (const rt of Object.values(arms)) await rt.close();

const firstBlock = (encoding) => samples[encoding].filter((s) => s.block === 0).map((s) => s.ms);
const lastHalf = (encoding) => samples[encoding].filter((s) => s.block >= Math.floor(blocks / 2)).map((s) => s.ms);
const all = (encoding) => samples[encoding].map((s) => s.ms);
const out = {
  lane, label, blocks, perBlock, commandFacts: 10,
  hostLoad1m: { min: round(Math.min(...loads), 2), max: round(Math.max(...loads), 2) },
  serviceMs: Object.fromEntries(['a0', 'compact'].map((e) => [e, { all: summary(all(e)), firstBlock: summary(firstBlock(e)), secondHalf: summary(lastHalf(e)) }])),
  ...(lane === 'qlever' ? { updateMs: Object.fromEntries(['a0', 'compact'].map((e) => [e, summary(updateMs[e])])) } : {}),
  ratioP50: round(summary(all('a0')).p50 / summary(all('compact')).p50, 2),
  perBlockP50: Array.from({ length: blocks }, (_v, b) => Object.fromEntries(['a0', 'compact'].map((e) => [e, summary(samples[e].filter((s) => s.block === b).map((s) => s.ms)).p50]))),
};
const receipt = writeReceipt(`service-${lane}-${label}`, { ...out, raw: samples });
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
