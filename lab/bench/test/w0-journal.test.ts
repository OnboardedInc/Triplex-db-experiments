import assert from "node:assert/strict";
import { test } from "node:test";
import { w0Journal } from "../lib/w0-journal.ts";
test("point journal reads stored content, rejects unknown commits, gaps and identity mismatches", async () => {
  let head = 2,
    corrupt = false;
  const stored = new Map([
    ["a", { txId: "a", position: 1, changes: [{ op: "assert", value: "actual stored bytes" }] }],
    ["b", { txId: "b", position: 2, changes: [] }],
  ]);
  const h: any = {
    run: async (x: unknown) => x,
    triples: {
      currentPosition: () => head,
      transaction: (id: string) => (corrupt ? { ...stored.get(id), position: 99 } : stored.get(id)),
    },
  };
  const journal = w0Journal(h);
  journal.record({ txId: "a", position: 1 });
  await assert.rejects(journal.page(0, 100), /gap/);
  journal.record({ txId: "b", position: 2 });
  assert.deepEqual((await journal.page(0, 100)).transactions, [...stored.values()]);
  assert.deepEqual((await journal.page(1, 1)).transactions, [stored.get("b")]);
  assert.throws(() => journal.record({ txId: "different", position: 1 }), /identity mismatch/);
  head = 3;
  await assert.rejects(journal.page(0, 100), /unobserved/);
  head = 2;
  corrupt = true;
  await assert.rejects(journal.page(0, 100), /identity\/content/);
});
