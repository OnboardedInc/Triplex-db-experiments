// [EXP-CRNS-R2] Why: positive fixtures must supply the same independent input floors as production adapters.
// Rejected: auto-repairing candidate mutations at seal time (would erase the reviewers' planted defects).
import { createHmac } from 'node:crypto';
import { canonText, nsCommandSha256 } from '../claim.mjs';
import { sha256 as h } from '../lib.mjs';
export function readsFor(window, level, answer = h('correct')) {
  const start = BigInt(window.startNs), end = BigInt(window.endNs), reads = [];
  const n = Number((end - start + 999999999n) / 1000000000n);
  for (let second = 0; second < n; second++) for (let loop = 0; loop < Math.max(1, level); loop++) {
    const at = start + BigInt(second) * 1000000000n + 20000000n + BigInt(loop) * 1000n;
    if (at + 100000n >= end) continue;
    reads.push({ readId: `${window.id ?? 'main'}-${second}-${loop}`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: String(at), receivedAtNs: String(at + 100000n), answerSha256: answer, hot: true });
  }
  return reads;
}
export function readerRows(reads, window) {
  const map = new Map();
  for (const r of reads) {
    const s = Number((BigInt(r.receivedAtNs) - BigInt(window.startNs)) / 1000000000n);
    if (!map.has(s)) map.set(s, new Set()); map.get(s).add(r.loop);
  }
  return [...map].map(([second, ids]) => ({ second, loops: [...ids], relayConcurrent: ids.size }));
}
export function completeSegment(s, answer = h('correct')) {
  s.reads = readsFor(s, s.level, answer); s.readers = readerRows(s.reads, s);
  s.offers.forEach((o,i) => { o.eventId = `${s.id}-offer-${i}`; o.sizeBand ??= '5-10'; }); return s;
}
export function historyFixture(pulls) {
  pulls.forEach((p,i) => Object.assign(p, { readId: `history-${i}`, shape: 'pull-current', requestedBasis: '1', echoedBasis: '1', answerSha256: h('correct') }));
  return [1,3,10].map(depth => ({ depth, startNs: '0', endNs: '2000000', ioReadStartBytes: '0', ioReadEndBytes: String(pulls.filter(p => p.depth === depth).reduce((sum,p) => sum + Number(p.bytesRead ?? 100),0)) }));
}
export function reseal(raw, trusted) {
  const payload = canonText(raw), previousSha256 = '0'.repeat(64), bytes = canonText({previousSha256,payload});
  const chunk = { payload, previousSha256, sha256: h(bytes), hmac: createHmac('sha256', trusted.key).update(bytes).digest('hex') };
  return { bundle: { payload, chunks:[chunk], hmac: createHmac('sha256', trusted.key).update(payload).digest('hex') }, trusted: {...trusted,headSha256:chunk.sha256} };
}
export function completeFixture(f) {
  const {raw, trusted: tr} = f, e = raw.events;
  tr.roles = ['driver','observer']; e.clockDomains = tr.roles.map(role => ({role,domain:structuredClone(e.clockDomain)}));
  tr.sourceStream=e.source.entries[0].stream;
  tr.sourceStorage = e.source.storage = 'fixture-json/1';
  // Synthetic normalizer bytes are retained and decoded, never captured from mutable expected rows.
  e.source.commandDigests=Object.fromEntries(e.source.entries.flatMap(e=>(e.transactions??[]).flatMap(tx=>tx.commandIds.map(id=>[id,nsCommandSha256(tx.changes)]))));
  e.source.rawHex = Buffer.from(canonText({entries:e.source.entries,commandDigests:e.source.commandDigests})).toString('hex');
  tr.normalizeSource = source => JSON.parse(Buffer.from(source.rawHex,'hex').toString());
  const c = e.consumer;
  c.finalWalHex = Buffer.from(canonText({transactions:c.transactions,effects:c.effects,affected:c.affected,deliveries:c.deliveries})).toString('hex'); c.tailedWalHex = c.finalWalHex;
  tr.normalizeWal = consumer => JSON.parse(Buffer.from(consumer.finalWalHex,'hex').toString());
  tr.initialFrontier=c.initialFrontier; tr.maxBracketWidthNs='10000000';
  tr.consumerId = c.effects[0]?.consumer ?? 'c'; tr.epochs = Object.fromEntries(c.effects.map(r => [canonText(r.position),r.epoch]));
  tr.commands = {};
  for (const entry of e.source.entries) for (const tx of entry.transactions ?? []) for (const id of tx.commandIds) tr.commands[id] = { commandSha256: nsCommandSha256(tx.changes), changesSha256: nsCommandSha256(tx.changes), valid:true };
  e.offers.forEach((o,i) => { o.eventId = `offer-${i}`; o.kind ??= 'normal'; o.commandSha256 = tr.commands[o.commandId]?.commandSha256; });
  tr.commandValid ??= () => true; tr.ryow ??= () => true; tr.replayRead ??= () => h('correct'); tr.steadyRate ??= 100;
  tr.minimumSamples = { lag: Math.max(1,e.source.entries.filter(x => x.kind === 'commit').length), bands:{'5-10':1,'11-25':1,'26-50':1} };
  tr.p4LargestBucketP99Ms = 50;
  e.crossChecks = e.sourceBrackets.flatMap(s => [{role:'source',position:s.position,atNs:s.L}, ...e.consumerBrackets.filter(c => canonText(c.position) === canonText(s.position)).map(c => ({role:'consumer',position:c.position,atNs:c.U}))]);
  e.reads = readsFor(e.window,tr.readerLevel); e.readers = readerRows(e.reads,e.window);
  // A separately sealed crash attempt provides resume; its different attempt id cannot be a supplied verdict.
  const cr = structuredClone(raw); cr.binding.attemptId += '-crash'; cr.events.faults = [];
  const first = BigInt(e.source.firstOffset), last = e.source.finalOffset;
  for (const [p,point] of ['before-effect','after-effect','after-checkpoint'].entries()) for (let rep=0;rep<3;rep++) {
    const events = [{transition:'cgroup-gone',t:String(BigInt(e.window.endNs)+BigInt(p*3+rep))}];
    cr.events.faults.push({format:'fault-witness/1',binding:cr.binding,faultPointId:point,events,eventsSha256:h(canonText(events)),beforeTransaction:-1,recoveryTransaction:c.transactions.length-1,checkpointOffset:first===0n?null:String(first-1n),recoveryOffset:last,replay:structuredClone(c.deliveries)});
  }
  const ct = {...tr,binding:cr.binding}; delete ct.crashRun;
  tr.crashRun = reseal(cr,ct);
  return f;
}
