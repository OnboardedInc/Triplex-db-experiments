import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { joinDocument, splitDocument } from "./definitions.ts";
import { frameEstimate } from "./frames.ts";
import { largeRelease, parseShape, shapeName } from "./large-release.ts";

// [DX-ACT6] Why: before any stack runs, prove that a release stored by reference (TX2_RELEASE_DOCS=ref) gives back
// exactly the full document (same canonical bytes, same release hash, so every reader evaluates the same compiled
// release) for every release of the large-release check and along a chain of 50 releases near the 1.3 MiB ceiling,
// and price what each release writes: nodes and bytes not stored before, staging writes within the writer's bound,
// the Publish record by reference against full documents (3.0 KB + 1.2 x (2 x new + old), measured on the toy).
// Usage: node --experimental-transform-types definitions-check.ts OUT.json
const out = process.argv[2]!;
assert(out);
const stored = new Map<string, unknown>();
const fullRecord = (next: number, old: number) => Math.round(3000 + 1.2 * (2 * next + old));
function publish(doc: W0.ReleaseDoc, old: W0.ReleaseDoc | null) {
  const { ref, nodes } = splitDocument(doc);
  const fresh = [...nodes].filter(([k]) => !stored.has(k));
  // The staging writes as stageDocument batches them: nodes within the bound per write, the root alone, last.
  let writes = 0,
    batch: unknown[] = [];
  const op = (k: string, v: unknown) => ({ op: "assert", entityId: "lazy/account/releases/definitions/" + k, attribute: "lazy/definition", value: { type: "string", value: canonical(v) }, validFrom: 0 });
  const rest = fresh.filter(([k]) => k !== ref.root);
  for (const [k, v] of rest) {
    if (batch.length && !frameEstimate([...batch, op(k, v)]).fits) {
      writes++;
      batch = [];
    }
    batch.push(op(k, v));
  }
  if (batch.length) writes++;
  if (fresh.some(([k]) => k === ref.root)) writes++;
  const estimates = fresh.map(([k, v]) => frameEstimate([op(k, v)]).us);
  for (const [k, v] of fresh) stored.set(k, v);
  const joined = joinDocument(ref, async (keys) => new Map(keys.filter((k) => stored.has(k)).map((k) => [k, stored.get(k) as never])));
  return joined.then((c) => {
    assert.equal(canonical(c.doc), canonical(doc), "joined document differs");
    assert.equal(c.hash, W0.compileRelease(doc).hash);
    const docBytes = Buffer.byteLength(canonical(doc)),
      oldBytes = old ? Buffer.byteLength(canonical(old)) : 0;
    return {
      docBytes,
      nodes: nodes.size,
      freshNodes: fresh.length,
      freshBytes: fresh.reduce((n, [, v]) => n + Buffer.byteLength(canonical(v)), 0),
      stagingWrites: writes,
      largestNodeUs: Math.max(0, ...estimates),
      rootBytes: Buffer.byteLength(canonical(nodes.get(ref.root))),
      refBytes: Buffer.byteLength(canonical(ref)),
      fullRecordBytes: fullRecord(docBytes, oldBytes),
      fullRecordFits: fullRecord(docBytes, oldBytes) * 1.0 < 4 * 1024 * 1024,
    };
  });
}

const rows: unknown[] = [];
// 1. Every release pair of the large-release check (its default shapes) plus the toy gates' shapes.
const shapes = ["forms=1,policies=1,permille=1000", "forms=20,policies=20,permille=1000", "forms=20,policies=20,permille=100", "forms=150,policies=150,permille=1000", "forms=1000,policies=1000,permille=1000"].map(parseShape);
const pairs: [string, W0.ReleaseDoc | null, W0.ReleaseDoc][] = [
  ["R1 (no predecessor)", null, W0.R1.doc],
  ["R1 -> R2", W0.R1.doc, W0.R2.doc],
  ["R2 -> R3", W0.R2.doc, W0.R3.doc],
  ...shapes.flatMap((s): [string, W0.ReleaseDoc | null, W0.ReleaseDoc][] => [
    ["R1 -> R1+" + shapeName(s), W0.R1.doc, largeRelease(W0.R1.doc, s)],
    ["R2 -> R3+" + shapeName(s), W0.R2.doc, largeRelease(W0.R3.doc, s)],
    ["R3+" + shapeName(s) + " -> R2", largeRelease(W0.R3.doc, s), W0.R2.doc],
  ]),
];
for (const [label, old, next] of pairs) {
  const r = await publish(next, old);
  rows.push({ label, ...r });
  console.log(JSON.stringify({ label, ...r }));
}
// 2. The cost table by definition-set size: a first release of the set, then a follow-on that adds 20 forms.
const table: unknown[] = [];
for (const forms of [1000, 2000, 4000, 5000]) {
  stored.clear();
  const base = largeRelease(W0.R2.doc, parseShape(`forms=${forms},policies=${forms},permille=100`));
  const more = largeRelease(W0.R2.doc, parseShape(`forms=${forms + 20},policies=${forms + 20},permille=100`));
  const first = await publish(base, W0.R2.doc),
    follow = await publish(more, base);
  const row = { forms, mib: +(first.docBytes / 1048576).toFixed(3), first, follow };
  table.push(row);
  console.log(JSON.stringify(row));
}
// 3. A chain of 50 releases from 5,000 forms (1.25 MiB): each edits 20 forms (due date moved) and adds 4, deterministic.
stored.clear();
let cur = largeRelease(W0.R2.doc, parseShape("forms=5000,policies=5000,permille=100"));
const chain: unknown[] = [];
let prev: W0.ReleaseDoc | null = W0.R2.doc;
for (let n = 0; n < 50; n++) {
  const r = await publish(cur, prev);
  chain.push({ n, docBytes: r.docBytes, freshNodes: r.freshNodes, freshBytes: r.freshBytes, stagingWrites: r.stagingWrites, fullRecordBytes: r.fullRecordBytes, fullRecordFits: r.fullRecordFits });
  prev = cur;
  const forms = cur.forms!.map((f, k) => ((k * 7 + n * 13) % 250 === 0 ? { ...f, dueBusinessDays: (f.dueBusinessDays % 30) + 1 } : f));
  const add = Array.from({ length: 4 }, (_, j) => ({ dueBusinessDays: 1 + j, fields: ["field-001", "field-002"], id: "form:x" + String(n * 4 + j).padStart(4, "0") }));
  const addPol = add.map((f, j) => ({ form: f.id, id: "pol:x" + String(n * 4 + j).padStart(4, "0"), notice: true, permille: 100 }));
  cur = { ...cur, forms: [...forms, ...add].sort((a, b) => (a.id < b.id ? -1 : 1)), policies: [...cur.policies!, ...addPol].sort((a, b) => (a.id < b.id ? -1 : 1)) };
  W0.compileRelease(cur);
}
console.log(JSON.stringify({ chain: chain.length, firstFresh: (chain[0] as any).freshBytes, laterFreshMax: Math.max(...chain.slice(1).map((c: any) => c.freshBytes)) }));
fs.writeFileSync(out, JSON.stringify({ pairs: rows, table, chain }, null, 2) + "\n");
