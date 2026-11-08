#!/usr/bin/env node
// V-P2Q check 7: the report's "A0 writes about 750 triples per 10-fact command" from raw samples.
// A0 service runs: consecutive differences of QLever's delta-triples total after each command (records[].delta).
// Candidate runs: per published update, (inserted + deleted) / members and deltaTotal step / members.
// Usage: node amplification.mjs <receiptsDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [receiptsDir, outDir] = process.argv.slice(2);
const med = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const out = {};
for (const f of fs.readdirSync(receiptsDir).filter((x) => x.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(receiptsDir, f), 'utf8'));
  if (!r.rawPath || r.mode !== 'service') continue;
  const raw = JSON.parse(fs.readFileSync(r.rawPath, 'utf8'));
  if (r.arm === 'A0') {
    const d = raw.records.slice(1).map((x, i) => x.delta - raw.records[i].delta);
    out[r.id] = { arm: 'A0', facts: r.facts, label: r.label, perCommandDeltaStep: { n: d.length, min: Math.min(...d), median: med(d), max: Math.max(...d), mean: Math.round((d.reduce((a, b) => a + b, 0) / d.length) * 10) / 10 } };
  } else {
    const pub = raw.events.filter((e) => e.type === 'published');
    const perMember = pub.map((e) => (e.inserted + e.deleted) / e.members);
    const steps = pub.slice(1).map((e, i) => (e.deltaTotal - pub[i].deltaTotal) / e.members);
    // Triples the delta gained beyond this run's own inserts (other writers on the shared resident), updates 2..n.
    const foreign = pub.slice(1).reduce((a, e, i) => a + (e.deltaTotal - pub[i].deltaTotal) - e.inserted, 0);
    const spanS = pub.length > 1 ? (pub.at(-1).at - pub[0].at) / 1000 : null;
    out[r.id] = { arm: 'C', facts: r.facts, label: r.label, updates: pub.length, foreignTriplesEstimate: foreign, foreignSpanS: spanS && Math.round(spanS * 10) / 10, insertedPlusDeletedPerMember: { min: Math.min(...perMember), median: med(perMember), max: Math.max(...perMember) }, deltaStepPerMember: steps.length ? { min: Math.min(...steps), median: med(steps), max: Math.max(...steps) } : null, firstUpdate: pub[0] && { members: pub[0].members, inserted: pub[0].inserted, deleted: pub[0].deleted } };
  }
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'amplification.json'), JSON.stringify(out, null, 2) + '\n');
for (const [id, x] of Object.entries(out)) console.log(id, JSON.stringify(x));
