import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { perfCountersDelivered } from "./probe-metrics.ts";
import { collectGatewayPauses } from "./gateway-pauses.ts";
import { finishTransactor, joinTransactor, type GatewayExchange } from "./probe-transactor.ts";

test("transactor event must match the gateway cut and fall inside its aligned request", async () => {
  const id = { run: "probe", source: "source", slot: "slot" };
  const clock = { domain: "linux-monotonic", bootId: "boot", offsetMs: 1_000 };
  const hash = "a".repeat(64);
  const gateway: GatewayExchange = {
    ...id,
    process: "gw-w",
    traceId: "trace",
    clock,
    start: 1_000,
    end: 1_050,
    attributes: { databaseHash: hash, datomicT: "1002" },
    spans: [],
  };
  const event = {
    ...id,
    process: "tx",
    type: "event",
    nativeType: "triplex.NativeTransaction",
    clock: { ...clock, offsetMs: 900, crossProcessQualified: true },
    databaseHash: hash,
    datomicT: "1002",
    start: 931,
    end: 931,
    nativeStats: { msec: 12, "apply-msec": 6 },
  };
  const unrelated = { ...event, databaseHash: "b".repeat(64) };
  const matched = await joinTransactor([unrelated, event], [gateway], id, "boot");
  assert.deepEqual(matched.get("trace"), {
    traceId: "trace",
    t: "1002",
    databaseHash: hash,
    processMs: 12,
    applyMs: 6,
    end: 1_031,
  });
  assert.equal((await joinTransactor([unrelated], [gateway], id, "boot")).size, 0);
  await assert.rejects(joinTransactor([event, event], [gateway], id, "boot"), /duplicate/);
  await assert.rejects(
    joinTransactor([{ ...event, source: "older" }], [gateway], id, "boot"),
    /identity/,
  );
  await assert.rejects(joinTransactor([{ ...event, start: 952 }], [gateway], id, "boot"), /stale/);
  await assert.rejects(
    joinTransactor(
      [{ ...event, clock: { ...event.clock, crossProcessQualified: false } }],
      [gateway],
      id,
      "boot",
    ),
    /clock/,
  );
});

test("perf completion requires actual hardware count fields", () => {
  const rows =
    "1.001,123,,cycles,111,100\n1.001,176,,instructions,111,100\n1.001,0,,cache-misses,111,100\n";
  assert(perfCountersDelivered(rows));
  assert(!perfCountersDelivered(rows.replace("0,,cache-misses", ",,cache-misses")));
  assert(!perfCountersDelivered(rows.replace("176,,instructions", "<not counted>,,instructions")));
});

test("native export completion binds its file checksum and exported row count", async () => {
  const id = { run: "probe", source: "source", slot: "slot" };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rd1-native-"));
  try {
    const file = path.join(dir, "tx.jfr");
    const bytes = "recorded native bytes";
    const marker = {
      ...id,
      type: "jfr-complete",
      process: "tx",
      role: "tx",
      clock: { bootId: "boot" },
      clockSamples: 2,
      events: 1,
      fileSha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const artifacts = [file, `${file}.jsonl`, `${file}-complete.jsonl`, path.join(dir, ".finish")];
    const exportAfterRequest = (events: number) => {
      assert(fs.existsSync(artifacts[3]!));
      fs.writeFileSync(file, bytes);
      fs.writeFileSync(
        `${file}.jsonl`,
        JSON.stringify({ ...id, process: "tx", type: "event" }) + "\n",
      );
      fs.writeFileSync(`${file}-complete.jsonl`, JSON.stringify({ ...marker, events }) + "\n");
    };
    const resultPromise = finishTransactor(dir, [], id, "boot", performance.now() + 3_000);
    exportAfterRequest(1);
    const result = await resultPromise;
    assert.equal(result.sha256, marker.fileSha256);
    assert.equal(result.events, 1);
    await assert.rejects(
      finishTransactor(dir, [], id, "boot", performance.now() + 3_000),
      /already exists/,
    );
    for (const artifact of artifacts) fs.unlinkSync(artifact);
    const incomplete = finishTransactor(dir, [], id, "boot", performance.now() + 3_000);
    exportAfterRequest(2);
    await assert.rejects(incomplete, /event count/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("write gateway pauses are joined to the ON window on the bound clock", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rd1-gateway-"));
  const id = { run: "probe", source: "source", slot: "slot" };
  const clock = { domain: "linux-monotonic", bootId: "boot", offsetMs: 900, crossProcessQualified: true };
  const jfr = path.join(dir, "gw-w.jfr"), content = "actual recording fixture";
  const base = { ...id, process: "gw-w", clock };
  try {
    fs.writeFileSync(jfr, content);
    fs.writeFileSync(`${jfr}.jsonl`, JSON.stringify({ ...base, type: "event", name: "jdk.GCPhasePause", start: 990, end: 1_010, jfrDurationMs: 20 }) + "\n");
    fs.writeFileSync(`${jfr}-complete.jsonl`, JSON.stringify({ ...base, role: "gw-w", type: "jfr-complete", clockSamples: 8, events: 1,
      fileSha256: createHash("sha256").update(content).digest("hex") }) + "\n");
    const result = await collectGatewayPauses(dir, id, { bootId: "boot", offsetMs: 1_000 }, [{ at: 1_000, until: 1_020 }, { at: 1_100, until: 1_130 }], performance.now() + 3_000);
    assert.deepEqual(result.blocks.map(b => [b.count, b.totalMs]), [[0, 0], [1, 10]]);
    fs.writeFileSync(jfr, "different bytes");
    await assert.rejects(collectGatewayPauses(dir, id, { bootId: "boot", offsetMs: 1_000 }, [], performance.now() + 3_000), /checksum/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
