import assert from "node:assert/strict";
import { constants } from "node:buffer";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync, gunzipSync } from "node:zlib";
import { records } from "./report.mjs";

test("a truncated gzip rejects on the iterator after yielding its complete rows", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-truncated-trace-"));
  try {
    const file = path.join(root, "incomplete.jsonl.gz");
    fs.writeFileSync(file, gzipSync('{"seq":1}\n').subarray(0, -4));
    const iterator = records(file);
    assert.deepEqual(await iterator.next(), { done: false, value: { seq: 1 } });
    await assert.rejects(iterator.next(), { code: "Z_BUF_ERROR" });
    for await (const row of records(file)) {
      assert.equal(row.seq, 1);
      break;
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a full trace report streams past V8's single-string limit with a 128 MiB heap", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-streamed-report-"));
  try {
    const raw = path.join(root, "trace/raw");
    fs.mkdirSync(raw, { recursive: true });
    fs.mkdirSync(path.join(root, "driver"));
    fs.writeFileSync(path.join(root, "driver/ns-writes.jsonl"), "");
    const tag = path.basename(root);
    const binding = { run: tag, slot: tag, source: "0".repeat(40) };
    fs.writeFileSync(path.join(root, "trace-run.json"), JSON.stringify({
      ...binding, tag, nodeEnabled: false, level: "summary", startedAt: 1000,
    }));
    const retained = 20, eventName = "recorded-context-" + "x".repeat(16 * 1024);
    const events = Math.ceil(constants.MAX_STRING_LENGTH / (eventName.length * retained)) + 1;
    const file = fs.openSync(path.join(raw, "synthetic.jsonl"), "wx");
    try {
      for (let i = 0; i < retained; i++)
        fs.writeSync(file, JSON.stringify({
          ...binding, schema: "triplex.trace.v1", type: "request", kind: "read",
          name: "reader.pull", traceId: i.toString(16).padStart(32, "0"),
          root: "0".repeat(16), start: 1000, end: 2000, spans: [], process: "reader", thread: 1,
        }) + "\n");
      for (let i = 0; i < events; i++)
        fs.writeSync(file, JSON.stringify({
          ...binding, type: "event", name: eventName, layer: "synthetic",
          start: 1500 + i / events, end: 1600, process: "source", thread: 1,
          seq: i,
        }) + "\n");
    } finally {
      fs.closeSync(file);
    }
    const out = path.join(root, "rendered");
    const reporter = fileURLToPath(new URL("./report.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(
      process.execPath, ["--max-old-space-size=128", reporter, root, "--output-to", out],
      { timeout: 240_000 },
    );
    const summary = JSON.parse(stdout);
    assert.equal(summary.requests, retained);
    assert.deepEqual(summary.errors, []);
    const chrome = path.join(out, "trace.chrome.json");
    assert.ok(fs.statSync(chrome).size > constants.MAX_STRING_LENGTH);
    const token = '"cat":"synthetic"';
    let count = 0, tail = "";
    for await (const chunk of fs.createReadStream(chrome, { encoding: "utf8" })) {
      const text = tail + chunk;
      let offset = 0;
      while ((offset = text.indexOf(token, offset)) >= 0) {
        count++;
        offset += token.length;
      }
      tail = text.slice(-(token.length - 1));
    }
    assert.equal(count, retained * events);
    const viewer = fs.readFileSync(path.join(out, "trace.html"), "utf8");
    const [first, second] = [...viewer.matchAll(/data-card="0" data-sha256="([a-f0-9]{64})">([^<]+)/g)];
    const unpack = ([, digest, base64]) => {
      const bytes = gunzipSync(Buffer.from(base64, "base64"));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), digest);
      return JSON.parse(bytes.toString("utf8").split("\n", 1)[0]);
    };
    assert.equal(unpack(first).row.traceId, "0".repeat(32));
    assert.equal(unpack(second).event.seq, events - 1);
    assert.ok(!fs.existsSync(path.join(root, "TRACE-REPORT.md")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
