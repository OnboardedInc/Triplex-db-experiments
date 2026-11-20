import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { intent, person, seedHead, seedPosition } from "./population.ts";

// [DX-THIN1] Why: compare published subject records with O-DOMAIN on the complete original command world.
// Rejected: the projected world as oracle input, or checking just the number of publication frames.
export async function domainCheck(
  root: string,
  dir: string,
  size: number,
  basis: W0.Basis,
  digest: string,
) {
  const proc = spawn("python3", ["-I", "-B", path.join(root, "lab/bench/lib/w0-oracle.py")], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const exit = once(proc, "close");
  const replies = createInterface({ input: proc.stdout })[Symbol.asyncIterator]();
  const hash = createHash("sha256");
  let count = 0,
    checked = 0;
  try {
    for await (const record of createInterface({
      input: fs.createReadStream(path.join(dir, "activation-records.jsonl")),
      crlfDelay: Infinity,
    })) {
      hash.update(record + "\n");
      const i = count++;
      const member = JSON.parse(record);
      assert.equal(member.subject, person(i));
      // [DX-THIN1] Why: the guest checks every person. Larger scripted runs sample both active and import-only neighbors.
      // Rejected: sampling a multiple of 50 alone (would test exclusively active people).
      if (size > 100_000 && i % (size / 100) > 1 && i < size - 51) continue;
      const facts = intent(i).map((op) => ({
        e: op.entityId,
        a: op.attribute,
        v: op.value.value,
        tx: seedPosition(i),
      }));
      const write = seedHead(size) + 1 + i / 50;
      if (i % 50 === 0 && write <= basis.tx)
        for (const op of intent(i, true))
          facts.push({ e: op.entityId, a: op.attribute, v: op.value.value, tx: write });
      const input = { world: { subject: person(i), facts }, release: "R2", basis };
      proc.stdin.write(JSON.stringify({ op: "evaluate", input }) + "\n");
      const line = await replies.next();
      assert(!line.done, "O-DOMAIN ended before the corresponding subject");
      const out = JSON.parse(line.value);
      // [DX-THIN1] Why: the outbox stores a canonical JSON payload string; O-DOMAIN returns the JSON value.
      // Rejected: dropping the payload field from the comparison or comparing an object to its encoded string.
      const workItems = out.workItems.map((w: { payload: unknown }) => ({
        ...w,
        payload: W0.canonicalPlain(w.payload),
      }));
      assert.equal(
        W0.canonicalPlain({
          basis: out.basis,
          subject: out.subject,
          release: out.release,
          workItems,
        }),
        record,
      );
      checked++;
    }
    proc.stdin.end();
    assert((await replies.next()).done, "Unexpected O-DOMAIN results");
    assert.equal((await exit)[0], 0);
    assert.equal(count, size);
    assert.equal(hash.digest("hex"), digest);
    return { checked, records: count, recordsSha256: digest };
  } finally {
    proc.stdin.destroy();
    proc.kill();
  }
}
