import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { replay, type Receipt } from "../chk1/replay.ts";

type SavedRow = { id: string; db: string; status?: string; receipt?: { p: number; t: string; clock: number; tx: string } };

function operationsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return operationsFiles(file);
    return entry.name === "operations.json" ? [file] : [];
  });
}

// [DX-THIN1] Why: rerun DX-CHK1's fresh-reader replay on the card's own toy databases while their stack is still up.
// Rejected: trusting the card's running feed consumer, which shares the cursor that produced its journal check.
export async function crossCheck(out: string, writeUrl: string, readUrl: string) {
  const byDb = new Map<string, Map<number, Receipt>>();
  const sources: string[] = [];
  for (const file of operationsFiles(out)) {
    const { writes } = JSON.parse(fs.readFileSync(file, "utf8")) as { writes: SavedRow[] };
    assert(Array.isArray(writes), file);
    sources.push(path.relative(out, file));
    for (const row of writes) {
      if (!row.receipt) continue;
      const receipts = byDb.get(row.db) ?? new Map<number, Receipt>();
      byDb.set(row.db, receipts);
      assert(!receipts.has(row.receipt.p), "Two captured saves claim one logical position");
      receipts.set(row.receipt.p, { id: row.id, p: row.receipt.p, t: row.receipt.t, clock: row.receipt.clock, tx: row.receipt.tx });
    }
  }
  assert(byDb.size > 0, "No captured save receipts to check");
  const databases = [];
  for (const [db, receipts] of byDb) {
    const writer = new DatomicClient(writeUrl, 35_000);
    let terminal: number;
    try { terminal = Number((await writer.basis(db)).position.v); } finally { writer.close(); }
    const commits = await replay(readUrl, db, terminal, [...receipts.values()]);
    const positions = commits.flatMap((row) => row.transaction.positions.map((p) => ({
      p: Number(p), t: row.t, operationId: row.transaction.operationId, commandIds: row.transaction.commandIds,
      save: receipts.has(Number(p)),
    })));
    assert.equal(positions.length, terminal);
    const record = { db, terminal, receipts: receipts.size, positions };
    const name = "crosscheck-" + createHash("sha256").update(db).digest("hex").slice(0, 12) + ".json";
    fs.writeFileSync(path.join(out, name), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
    databases.push({ db, terminal, receipts: receipts.size, file: name });
  }
  fs.writeFileSync(path.join(out, "crosscheck.json"), JSON.stringify({ sources, databases }, null, 2) + "\n", { flag: "wx" });
  console.log("[DX-THIN1] fresh-reader replay matched " + databases.map((d) => d.receipts + " receipts through " + d.terminal).join("; "));
}
