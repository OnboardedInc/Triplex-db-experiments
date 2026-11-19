import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { driverArgs, matrix } from "./bench.ts";
import { readNative, nativeReadout, type Arm } from "./measure.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { frozenDeep } from "../../../bench/lib/deep-profile.ts";

// [DX-W1] Why: check both real generators and native-counter join failures before a bench builds either population.
// Rejected: treating a printed launch command or a plausible counter at a neighboring transaction as evidence.
test("old and new use the same 100k schedules and their own zero controls", () => {
  const list = matrix(),
    zeros = new Set<string>();
  assert.equal(list.length, 8);
  assert.equal(new Set(list.map((r) => JSON.stringify(r))).size, 8);
  for (const r of list) {
    const id = r.population + "/" + r.lookup,
      arm: Arm = {
        ...r,
        source: "a".repeat(40),
        slot: "tx2-dxscale1-w1-test",
        nonce: crypto.randomUUID(),
      };
    const args = driverArgs(
      arm,
      "output",
      "oracle",
      "barrier",
      r.readers ? "zero/" + id : undefined,
    );
    const get = (k: string) => args[args.indexOf(k) + 1];
    if (r.readers) {
      assert(zeros.has(id));
      assert.equal(get("--baseline-writes"), "zero/" + id);
    } else {
      assert(args.includes("--zero-readers"));
      zeros.add(id);
    }
    assert.equal(get("--rung"), r.population === "thin" ? "100k" : "deep-100k");
    assert.equal(get("--profile"), r.population === "thin" ? "smoke" : "deep");
    if (r.population === "thin") assert.equal(get("--match-duration-s"), "900");
    else assert.equal(get("--deep-nonce"), arm.nonce);
  }
  const events = generateTrace({ subjects: 100000, seed: "ns-v2", durationS: 7200 });
  assert.equal(events.filter((e) => !e.resend && e.atMs < 900000).length, 7408);
  assert.notEqual(
    traceDigest(events),
    traceDigest(generateTrace({ subjects: 10000, seed: "ns-v2", durationS: 7200 })),
  );
  const deep = frozenDeep(0, 100000);
  assert(deep.events.length > 500 && deep.populationSha256.length === 64);
});
test("missing read maps and invalid nonzero counters cannot become cache hits", () => {
  const read = (reads: unknown) =>
    nativeReadout({ nativeStats: { "apply-msec": 1, "io-stats": { reads } } });
  assert.deepEqual(read({}), { sql: 0, sqlMs: 0, deserializeMs: 0, applyMs: 1 });
  for (const reads of [
    undefined,
    null,
    [],
    { sql: null },
    { sql: -1 },
    { sql: 0.5 },
    { "sql-ms": null },
    { "deserialize-ms": -1 },
  ])
    assert.throws(() => read(reads));
});
test("native metrics belong to this transaction, source, slot and recorder", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w1-metric-"));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  const arm = { slot: "tx2-dxscale1-w1-test", source: "b".repeat(40) },
    scope = "fixture",
    w = {
      traceId: "r",
      scheduledAt: 0,
      startedAt: 1,
      finishedAt: 11,
      ackPublishedAt: 10,
      latencyMs: 11,
      position: 2,
      publicationOperationId: "op",
      commandId: "cmd",
    };
  const writes = new Map([[w.traceId, w]]),
    context = {
      run: arm.slot,
      slot: arm.slot,
      source: arm.source,
      clock: { domain: "linux-monotonic", bootId: "boot", offsetMs: 100, uncertaintyMs: 0.01 },
    };
  const databaseHash = h(
    "s2-" +
      Buffer.from(JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0])).toString(
        "base64url",
      ),
  );
  const root = {
    ...context,
    process: "node-1",
    thread: 0,
    type: "request",
    name: "driver.commit",
    traceId: "r",
    start: 0,
    end: 11,
    attributes: { ackPublishedAt: 10 },
    spans: [
      {
        id: "encode",
        name: "client.transact-encode",
        start: 1,
        end: 2,
        attributes: {
          appliedPosition: 2,
          operationHash: h("op"),
          commandHash: h(JSON.stringify(["cmd"])),
        },
      },
      { id: "http", name: "client.http", start: 2, end: 10 },
    ],
  };
  const gw = {
    ...context,
    process: "gw-w",
    kind: "commit",
    type: "request",
    traceId: "r",
    parent: "http",
    root: "gw",
    start: 3,
    end: 9,
    attributes: { databaseHash, datomicT: "3", status: 200 },
    spans: [{ id: "peer", name: "peer.transact-await", layer: "peer-wait", start: 4, end: 8 }],
  };
  const fn = {
    ...context,
    process: "tx",
    traceId: "r",
    nativeType: "triplex.TransactionFunction",
    parent: "peer",
    start: 5,
    end: 6,
    historyRange: "empty",
  };
  const tx = {
    ...context,
    process: "tx",
    databaseHash,
    datomicT: "3",
    start: 7,
    end: 7,
    nativeType: "triplex.NativeTransaction",
    nativeStats: { msec: 3, "apply-msec": 2, "io-stats": { reads: { sql: 2, "sql-ms": 1 } } },
  };
  const files = ["node", "gateway", "native"].map((n) => path.join(dir, n)) as [
    string,
    string,
    string,
  ];
  const put = (file: string, rows: unknown[]) =>
    fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  put(files[0], [root]);
  put(files[1], [gw]);
  const run = () => readNative(writes, scope, arm, "range", ...files);
  put(files[2], [fn, tx]);
  const result = await run();
  assert.equal(result.sqlReads, 2);
  assert.equal(result.applyMs.p99, 2);
  assert.equal(result.ackMs.p50, 10);
  assert.equal(result.decisions.empty, 1);
  for (const rows of [
    [fn, { ...tx, source: "other" }],
    [fn, { ...tx, slot: "other" }],
    [fn, { ...tx, datomicT: "4" }],
    [fn, { ...tx, databaseHash: h("other") }],
    [fn, { ...tx, start: 75 }],
    [fn, tx, tx],
    [{ ...fn, historyRange: undefined }, tx],
    [{ ...fn, parent: "other" }, tx],
    [{ ...fn, clock: { ...context.clock, bootId: "other" } }, tx],
  ]) {
    put(files[2], rows);
    await assert.rejects(run);
  }
  put(files[2], [fn, tx]);
  put(files[1], [{ ...gw, parent: "elsewhere" }]);
  await assert.rejects(run);
});
