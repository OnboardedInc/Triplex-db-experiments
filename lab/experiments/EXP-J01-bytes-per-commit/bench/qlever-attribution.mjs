// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01 QLever attribution: triples per Triplex command, by source and by channel.
//
// Commits real commands (1, 10, 10, 10, 50 facts, each with a commandId) through the Triplex runtime on one
// fresh scope. For every guarded update it classifies each VALUES row (one row = one triple the update
// writes) by subject (data assertion, journal change, journal envelope, claim, operation, meta) and by
// channel, and compares the classified sum with QLever's own per-operation delta (inserted, deleted).
//
// Usage: node qlever-attribution.mjs [--encoding a0|compact] [--label TEXT]
import { randomUUID } from 'node:crypto';
import { commandOps, laneRuntime, writeReceipt } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const encoding = opt('--encoding', undefined);
const label = opt('--label', encoding ?? 'A0');

const rt = await laneRuntime('qlever', { scope: `j01-qa-${randomUUID()}`, commitEncoding: encoding });
await rt.run(rt.triples.transact(commandOps(0, 1, 0), { commandId: `j01:${randomUUID()}` }));
const skip = rt.measuring.updates.length;
const sizes = [1, 10, 10, 10, 50];
for (const [i, facts] of sizes.entries())
  await rt.run(rt.triples.transact(commandOps(i + 1, facts, i + 1), { commandId: `j01:${randomUUID()}` }));
const updates = rt.measuring.updates.slice(skip);
await rt.close();

const { valuesRows } = await import('./lib.mjs');
const classify = (rows) => {
  // Assertion subjects are classified by their attribute channel.
  const attributeOf = new Map(rows.filter((r) => r.p === '<urn:triplex:field:attribute>').map((r) => [r.s, JSON.parse(r.o)]));
  const sourceOf = (r) => {
    if (r.s.startsWith('<urn:triplex:claim:')) return 'claim';
    if (r.s.startsWith('<urn:triplex:operation:')) return 'operation';
    if (r.s === '<urn:triplex:meta>') return 'meta';
    const attribute = attributeOf.get(r.s) ?? '';
    return attribute === ':_tx/change' ? 'journal-change' : attribute.startsWith(':_tx/') ? `journal-envelope ${attribute}` : 'data';
  };
  const bySource = {}, byChannel = {}, bytesBySource = {};
  for (const r of rows) {
    const source = sourceOf(r);
    bySource[source] = (bySource[source] ?? 0) + 1;
    bytesBySource[source] = (bytesBySource[source] ?? 0) + Buffer.byteLength(r.o);
    const channel = r.p.replace('<urn:triplex:field:', '').replace('>', '');
    const key = `${source.startsWith('journal-envelope') ? 'journal-envelope' : source} ${channel}`;
    byChannel[key] = (byChannel[key] ?? 0) + 1;
  }
  return { bySource, byChannel, objectBytesBySource: bytesBySource };
};
const perCommand = updates.map((u, i) => {
  const rows = valuesRows(u.sparql);
  return { facts: sizes[i], valuesRows: rows.length, qleverOperation: u.operation, updateTextBytes: Buffer.byteLength(u.sparql), deltaAfter: u.after, ...classify(rows) };
});
const out = {
  lane: 'qlever', label, commitEncoding: encoding ?? 'a0 (default)',
  perCommand: perCommand.map(({ byChannel, ...rest }) => rest),
  tenFactChannels: perCommand[1].byChannel,
  closure: perCommand.map((c) => ({ facts: c.facts, classified: Object.values(c.bySource).reduce((a, b) => a + b, 0), qleverInserted: c.qleverOperation?.inserted, qleverDeleted: c.qleverOperation?.deleted })),
};
const receipt = writeReceipt(`qlever-attribution-${label}`, { ...out, raw: { updates: updates.map((u) => u.sparql) } });
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
