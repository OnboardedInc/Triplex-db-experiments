// [CX-VW02-R2] Why: exercise spec and basis guards through the actual driver, beyond aggregate red counts.
// Rejected: calling every missing-claim failure a detected corruption or relying on copied builder results.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { runCase } from '../../scenarios/v2/case-driver.ts';
import { Probe, PROBES, rows, baseFacts } from '../../scenarios/v2/probe.ts';
import { specs } from '../../scenarios/v2/expect.ts';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { V_W0 } from '../../bench/lib/w0-world.ts';
const raw = process.env.CX_VW02_R2_RAW!;
if (!raw || !fs.existsSync(raw)) throw Error('controller-owned evidence directory required');
const out: any = { basisGuards: [], specGuards: [], evidenceGuards: [], spoofedContent: null };
const state = Probe.prototype.state;
try {
  for (let n = 1; n <= 20; n++) {
    const id = `GS-${String(n).padStart(2, '0')}`;
    const change = ['absent', 'wrong-position', 'wrong-valid-time'][(n - 1) % 3];
    let hits = 0;
    Probe.prototype.state = async function (...args: Parameters<typeof state>) {
      const page = this.comp.sweepPage;
      this.comp.sweepPage = async (...args: Parameters<typeof page>) => {
        const r = await page(...args); hits++;
        return { ...r, reportedBasis: change === 'absent' ? undefined : { ...r.reportedBasis!, ...(change === 'wrong-position' ? { position: r.reportedBasis!.position + 1 } : { validAt: r.reportedBasis!.validAt + 1 }) } };
      };
      try { return await state.apply(this, args); } finally { this.comp.sweepPage = page; }
    };
    const r = await runCase(id, 'xtdb', raw);
    assert(hits > 0); assert.equal(r.status, 'FAIL'); assert.match(r.reason!, /read-basis mismatch/);
    assert(r.reads.length > 0); assert.notDeepEqual(r.reads.at(-1).reportedBasis, r.reads.at(-1).requestedBasis);
    out.basisGuards.push({ id, change, hits, status: r.status, reason: r.reason!.split('\n')[0], reads: r.reads });
  }
} finally { Probe.prototype.state = state; }
const read = fs.readFileSync;
try {
  const choices = [...[1, 2, 4, 5, 6, 9, 17, 18].map(n => ({ id: `GS-${String(n).padStart(2, '0')}`, n })), { id: 'GS-01-WITNESS-POS', n: 1 }, { id: 'GS-06B-SHARED-REFERENCE', n: 6 }];
  for (const { id, n } of choices) {
    let hits = 0;
    (fs as any).readFileSync = function (file: any, ...rest: any[]) {
      const bytes = (read as any)(file, ...rest);
      if (String(file).includes(`/lab/scenarios/${String(n).padStart(2, '0')}-`) && String(file).endsWith('/scenario.json') && new Error().stack?.includes('cases.mjs')) {
        const d = JSON.parse(String(bytes)); d.domain = [...(d.domain ?? []), 'CX-VW02-R2 new unmapped obligation']; hits++;
        return Buffer.from(JSON.stringify(d));
      }
      return bytes;
    };
    const r = await runCase(id, 'xtdb', raw);
    assert(hits > 0); assert.equal(r.status, 'FAIL'); assert.match(r.reason!, /unmapped spec domain claim/);
    out.specGuards.push({ id, hits, status: r.status, reason: r.reason!.split('\n')[0], claims: r.domainClaims });
  }
} finally { fs.readFileSync = read; }
try {
  for (const change of ['removed', 'stale-attempt', 'foreign-source']) {
    let hits = 0;
    Probe.prototype.state = async function (...args: Parameters<typeof state>) {
      const r = await state.apply(this, args);
      if (this.claims.length && args[0] === 'pl:n') {
        if (change === 'removed') { this.claims.forEach(c => { c.evidence = []; }); hits++; }
        else for (const c of this.checks) if (c.id.startsWith('domain:')) { c[change === 'stale-attempt' ? 'attempt' : 'sourceSha256'] = 'foreign'; hits++; }
      }
      return r;
    };
    const r = await runCase('GS-01', 'xtdb', raw);
    assert(hits > 0); assert.equal(r.status, 'FAIL'); assert.match(r.reason!, /required-domain-claim:1:0/);
    out.evidenceGuards.push({ change, hits, status: r.status, reason: r.reason!.split('\n')[0] });
  }
} finally { Probe.prototype.state = state; }
// A matching metadata echo must still lose to independent old-cut contents.
const p = new Probe(memoryComposition('xtdb', randomUUID()), path.join(raw, 'spoofed-content'));
await p.commit(rows(baseFacts('pl:p'))); const old = await p.comp.currentPosition();
await p.set('pl:p', 'payRateCents', 1000); const head = await p.comp.currentPosition();
const page = p.comp.sweepPage;
p.comp.sweepPage = async (subjects, basis) => ({ ...await page(subjects, { ...basis, position: head }), reportedBasis: { ...basis } });
await assert.rejects(p.state('pl:p', old), /state:pl:p: observed content differs/);
assert.deepEqual(p.reads.at(-1).requestedBasis, { position: old, validAt: V_W0 });
assert.deepEqual(p.reads.at(-1).reportedBasis, { position: old, validAt: V_W0 });
out.spoofedContent = { rejected: true, old, head, reads: p.reads, lastCheck: p.checks.at(-1) };
out.specText = specs().map(s => ({ scenario: s.id, domain: s.domain ?? [] }));
PROBES.forEach(p => p.finish());
fs.writeFileSync(path.join(raw, 'extra-round2.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ complete: true, basisGuards: out.basisGuards.length, specGuards: out.specGuards.length, evidenceGuards: out.evidenceGuards.length, spoofedContentRejected: true }));
