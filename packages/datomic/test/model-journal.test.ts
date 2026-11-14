import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Option } from "effect";
import { ModelJournal } from "../../../lab/bench/lib/model-journal.ts";
import { Model } from "../../../lab/bench/lib/model.ts";
import { ids } from "../../../lab/bench/lib/world.ts";
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
function setup() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-dxt1-model-")); dirs.push(d);
  const file = path.join(d, "model.bin");
  return { file, journal: new ModelJournal(file, { run: "run", source: "head", slot: "slot", subjects: 1 }) };
}
function populate(target: Pick<Model, "bindReceipt" | "addCommit">, mutate = false) {
  const ops = [{ op: "assert", entityId: ids.placement(0), attribute: ":placement/stamp", value: { type: "number", value: 1 }, validFrom: 0, validTo: 250, createdBy: "source" }];
  const triple = { ...ops[0], id: "a1", validTo: Option.some(250), createdBy: Option.some("source") };
  target.bindReceipt(ops, { position: 1, instant: 100, txId: "t1", triples: [triple] } as any, "actor");
  target.addCommit(0, { position: 1, instant: 100, txId: "t1", stamp: 1, stampValidFrom: 0, parts: [], ackAtMs: 110, stream: "background" });
  target.bindReceipt([{ op: "retract", id: "a1" }], { position: 2, instant: 200, txId: "t2", triples: [] } as any, "actor");
  // [DX-T1-7] Why: receipt capture is immutable even if the caller later reuses its command object.
  // Rejected: retaining the same object graph until drain and assuming nobody mutates it.
  if (mutate) ops[0]!.value.value = 99;
}
describe("off-heap expected-model journal", () => {
  it("preserves receipt-bound worlds, expiry, retraction and commit arrival history", () => {
    const { journal } = setup(), expected = new Model(1);
    populate(expected); populate(journal, true);
    const result = journal.restore();
    expect(result.receipt.frames).toBe(3);
    for (const r of [0, 100, 199, 200, 300]) for (const v of [0, 249, 250, 300])
      expect(result.model.expected(0, r, v)).toEqual(expected.expected(0, r, v));
    expect(result.model.commits).toEqual(expected.commits);
    expect(() => populate(journal)).toThrow(/sealed/);
  });
  it("refuses to overwrite an earlier attempt", () => {
    const { journal, file } = setup(); journal.seal();
    expect(() => new ModelJournal(file, { run: "new", source: "head", slot: "slot", subjects: 1 })).toThrow();
  });
  it.each(["truncate", "append", "mutate"])("rejects %s before returning a model", mode => {
    const { journal, file } = setup(); populate(journal); journal.seal();
    const data = fs.readFileSync(file);
    if (mode === "truncate") fs.writeFileSync(file, data.subarray(0, data.length-1));
    if (mode === "append") fs.appendFileSync(file, "extra");
    if (mode === "mutate") { data[25] ^= 1; fs.writeFileSync(file, data); }
    expect(() => journal.restore()).toThrow();
  });
});

it("replays full referenced worlds across record and valid cuts without coercing values", () => {
  const { journal } = setup(), expected = new Model(1);
  const root = ids.placement(0);
  const values = [{ type: "number", value: -0 }, { type: "string", value: "a\u0000b" }, { type: "json", value: { n: 1, nested: [true, null, "x"] } }];
  const ops: any[] = [{ op: "assert", entityId: root, attribute: ":placement/ref", value: { type: "ref", value: "child" }, validFrom: 0 }];
  for (let i = 0; i < values.length; i++) ops.push({ op: "assert", entityId: "child", attribute: `:child/v${i}`, value: values[i], validFrom: i*10, validTo: 400+i*10, createdBy: "origin", entityType: "Child" });
  const receipt: any = { position: 1, instant: 100, txId: "t1", triples: ops.map((op,i) => ({ ...op, id: `r${i}`, validTo: op.validTo === undefined ? Option.none() : Option.some(op.validTo), createdBy: Option.some("origin") })) };
  for (const target of [journal, expected]) target.bindReceipt(ops, receipt, "actor");
  const restored = journal.restore().model;
  for (const r of [0,99,100,500]) for (const v of [0,10,20,399,400,410,420,500])
    expect(restored.expected(0,r,v)).toEqual(expected.expected(0,r,v));
});
