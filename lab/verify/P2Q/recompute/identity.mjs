#!/usr/bin/env node
// V-P2Q check 7: identity, timing and sha256 of every EXP-P2Q receipt. Read-only over the receipts and raw files.
// Usage: node identity.mjs <receiptsDir> <outDir>
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [receiptsDir, outDir] = process.argv.slice(2);
const rows = [];
for (const file of fs.readdirSync(receiptsDir).filter((f) => f.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(receiptsDir, file), 'utf8'));
  let shaCheck = 'no raw';
  if (r.rawPath) {
    if (!fs.existsSync(r.rawPath)) shaCheck = 'RAW MISSING';
    else {
      const got = createHash('sha256').update(fs.readFileSync(r.rawPath)).digest('hex');
      shaCheck = got === r.rawSha256 ? 'OK' : `MISMATCH got ${got}`;
    }
  }
  const id = r.identity ?? {};
  rows.push({
    file, id: r.id, idMatchesFile: `${r.id}.json` === file, kind: r.kind, mode: r.mode, arm: r.arm, label: r.label ?? null, slot: r.slot,
    n: r.n ?? null, facts: r.facts ?? null, windowS: r.windowS ?? null, seed: r.seed ?? null, scope: r.scope ?? null,
    startedAt: r.startedAt, writtenAt: r.writtenAt,
    durationS: r.startedAt && r.writtenAt ? (Date.parse(r.writtenAt) - Date.parse(r.startedAt)) / 1000 : null,
    head: id.gitHead, dirty: id.dirty, diffSha256: id.diffSha256, distSha256: id.distSha256,
    endpoint: id.endpoint, engineArm: id.engineConfig?.arm, startScriptSha256: id.engineConfig?.startScriptSha256,
    persistUpdates: id.engineConfig?.persistUpdates, engineImage: id.engineImage, node: id.node,
    loadBefore: id.host?.loadavg, loadAfter: r.hostLoadAfter, cpus: id.host?.cpus, freeBytes: id.host?.freeBytes,
    generatorSha256: r.generatorSha256 ?? null, traceSha256: r.traceSha256 ?? null,
    rawPath: r.rawPath, rawSha256: r.rawSha256, shaCheck,
  });
}
// Overlapping run windows (startedAt..writtenAt).
const overlaps = [];
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const a = rows[i], b = rows[j];
  const a0 = Date.parse(a.startedAt), a1 = Date.parse(a.writtenAt), b0 = Date.parse(b.startedAt), b1 = Date.parse(b.writtenAt);
  if (a0 < b1 && b0 < a1) overlaps.push({ a: a.id, b: b.id, overlapS: (Math.min(a1, b1) - Math.max(a0, b0)) / 1000 });
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'identity.json'), JSON.stringify({ rows, overlaps }, null, 2) + '\n');
const byStart = [...rows].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
const lines = ['id | arm | label | slot | startedAt | writtenAt | durS | head | dirty | diffSha256(12) | distSha256(12) | engine | load before -> after | sha'];
for (const r of byStart)
  lines.push([r.id, r.arm, r.label, r.slot, r.startedAt, r.writtenAt, r.durationS, r.head?.slice(0, 7), r.dirty, r.diffSha256?.slice(0, 12), r.distSha256?.slice(0, 12), r.engineArm?.slice(0, 7), `${JSON.stringify(r.loadBefore)} -> ${JSON.stringify(r.loadAfter)}`, r.shaCheck].join(' | '));
lines.push('', 'overlapping windows:');
for (const o of overlaps) lines.push(`${o.a} x ${o.b}: ${o.overlapS} s`);
fs.writeFileSync(path.join(outDir, 'identity.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
