import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import { join } from "node:path";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { command } from "../group/workload.ts";

// [DX-W1] Why: capture actual SDK request bytes while keeping transport out of the storage measurement.
// Rejected: comparing different field saves or inferring bytes from datom counts.
const nonce = randomUUID();
const output = process.argv[2];
if (output) mkdirSync(output);
const host = Object.values(os.networkInterfaces())
  .flat()
  .find((a) => a?.internal && a.family === "IPv4")!.address;
const requests: Buffer[] = [];
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (part: Buffer) => chunks.push(part));
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/db/create") {
      res.end(JSON.stringify({ db: nonce, layout: "lean", orderedRowTexts: true }));
    } else if (req.url === `/v1/db/${nonce}/transact`) {
      requests.push(Buffer.concat(chunks));
      res.end("{}");
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, host, resolve);
});
const address = server.address();
assert(address && typeof address === "object" && address.port !== 15442 && address.port !== 17019);
try {
  for (const width of [1, 3]) {
    const facts = Array.from({ length: width }, (_, i) => ({
      e: `acct/probe/person${width}`,
      a: `:field/value${i}`,
      v: { type: "string" as const, value: `before${i}` },
    }));
    const prior = command(`${nonce}-${width}-seed`, facts, [], false).rows;
    const current = command(
      `${nonce}-${width}-write`,
      facts.map((f, i) => ({ ...f, v: { ...f.v, value: `after${i}` } })),
      prior,
    );
    for (const saveWire of [false, true]) {
      const client = new DatomicClient(`http://${host}:${address.port}`, 5000, undefined, {
        saveWire,
      });
      try {
        const db = await client.create(nonce, "lean", true, 5000);
        await client.transact(db.db, current);
      } finally {
        client.close();
      }
    }
    const [classic, slim] = requests.splice(0);
    assert(classic && slim);
    const original = JSON.parse(classic.toString("utf8"));
    const decoded = JSON.parse(slim.toString("utf8"));
    const newIds = decoded.rowTexts.map((text: string) => decodeRowText(text).id);
    assert.equal(decoded.operationId, current.operationId);
    assert.equal(decoded.rowOrder, "assertions-first-v1");
    assert.equal(decoded.newIds, undefined);
    assert.deepEqual(newIds, current.newIds);
    assert.deepEqual(original, {
      ...decoded,
      newIds,
      rowOrder: current.rows.map((row) => row.id),
      rowTexts: Object.fromEntries(
        newIds.map((id: string, i: number) => [id, decoded.rowTexts[i]]),
      ),
    });
    assert(slim.byteLength < classic.byteLength);
    if (output) {
      writeFileSync(join(output, `${width}-classic.json`), classic, { flag: "wx" });
      writeFileSync(join(output, `${width}-ordered.json`), slim, { flag: "wx" });
    }
    const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");
    console.log(
      JSON.stringify({
        nonce,
        width,
        original: classic.byteLength,
        ordered: slim.byteLength,
        originalSha256: hash(classic),
        orderedSha256: hash(slim),
      }),
    );
  }
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
