import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { prepareJournalReader } from "../../../bench/lib/w0-journal-pool.ts";
// [DX-H8] Why: compare every dense stored position across concurrent page boundaries and reject missing content.
// Rejected: verifying just a total count (would miss duplicate or omitted pages).
test("parallel stored journal reads preserve order, complete coverage and entity enumeration", async () => {
  const transactions = Array.from({ length: 4050 }, (_, i) => ({
    position: i + 1,
    txId: "tx" + i,
    changes: [
      { op: "assert", entityId: "e" + i },
      ...(i % 7 === 0 ? [{ op: "retract", entityId: "e" + i }] : []),
    ],
  }));
  let empty = false,
    active = 0,
    peak = 0;
  const comp: any = {
    currentPosition: async () => transactions.length,
    feedPage: async (after: number, limit: number) => {
      active++;
      peak = Math.max(active, peak);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return { transactions: empty ? [] : transactions.slice(after, after + limit) };
    },
  };
  const reader = await prepareJournalReader({
    comp,
    composition: "memory",
    lane: "xtdb",
    scope: "journal-unit",
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh8-journal-"));
  try {
    const file = path.join(dir, "journal.ndjson");
    const r = await reader.scan({ position: transactions.length, entities: true, file });
    assert.deepEqual(
      fs
        .readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
      transactions,
    );
    assert.equal(r.position, 4050);
    assert.equal(r.assertions, 4050);
    assert.equal(r.retired, 579);
    assert.equal(r.entities.length, 4050);
    assert.equal(r.requests, 8);
    assert.equal(r.decodingWorkers, 4);
    assert.ok(peak >= 1 && peak <= 4);
    empty = true;
    await assert.rejects(reader.scan({ position: 4050 }), /gap\/coverage/);
  } finally {
    await reader.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
