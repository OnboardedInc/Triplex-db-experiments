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
import { attribute, records } from "./report.mjs";
import { TraceReportIndex } from "./report-index.mjs";

test("root tiers retain their original order, suppress owned followers and admit HTTP fallback", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-root-order-"));
  const index = new TraceReportIndex(dir, 0, ["wallMs"]);
  try {
    const add = (name, traceId) => index.addRequest({ name, traceId });
    add("http GET /other", "http");
    index.finishInputs();
    assert.deepEqual(
      [...index.roots()].map((r) => r.traceId),
      ["http"],
    );
    add("replica.follow", "owned");
    add("http GET /journal", "journal");
    add("reader.pull", "read");
    add("driver.commit", "owned");
    add("replica.follow", "follow");
    index.finishInputs();
    assert.deepEqual(
      [...index.roots()].map((r) => r.traceId),
      ["read", "owned", "journal", "follow"],
    );
  } finally {
    index.close();
    fs.rmdirSync(dir);
  }
});

test("long and short windows keep the original exclusive pause and five-work rankings", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-observer-windows-"));
  const index = new TraceReportIndex(tmp, 100, ["wallMs"]);
  try {
    const root = {
      traceId: "root",
      run: "r",
      source: "s",
      slot: "t",
      name: "driver.ryow",
      root: "root-span",
      process: "node",
      thread: 3,
      start: 100,
      end: 10000,
      spans: [
        {
          name: "capture",
          layer: "typescript",
          id: "outer",
          parent: "root-span",
          start: 100,
          end: 10000,
        },
        { name: "wait", layer: "event-loop", id: "rpc", parent: "outer", start: 101, end: 9980 },
      ],
    };
    const row = (layer, name, start, end, extra = {}) => ({
      layer,
      name,
      start,
      end,
      process: "node",
      thread: 3,
      ...extra,
    });
    for (const params of [
      [0, 101],
      [20, 10300],
      [100, 10000],
      [100, 10000],
      [9000, 12000],
      [101, 200],
      [102, 201],
      [600, 600],
      [200, 220],
      [10000, 11000],
      [10, 100],
    ])
      index.addEvent(row("typescript", "work" + params.join("-"), ...params));
    index.addEvent(row("typescript", "own", 1, 15000, { traceId: "root" }));
    index.addEvent(row("typescript", "other thread", 1, 15000, { thread: 2 }));
    for (const [a, b] of [
      [100, 100.5],
      [301, 600],
      [9982, 9988],
      [9985, 9987],
    ])
      index.addEvent(row("typescript-gc", "gc", a, b));
    index.addEvent(row("typescript-gc", "other gc", 9981, 9985, { thread: 8 }));
    for (const t of [
      { start: 100, end: 10000 },
      { start: 100, end: 201 },
      { start: 200, end: 200 },
    ]) {
      const r = { ...root, ...t };
      const raw = [
        ...index.overlap(
          r.start,
          r.end,
          "work",
          "e.process IS ? AND e.thread IS ?",
          r.process,
          r.thread,
        ),
      ]
        .filter((e) => !e.traceId || e.traceId !== r.traceId)
        .map((e) => ({ name: e.name, wall: Math.min(r.end, e.end) - Math.max(r.start, e.start) }))
        .sort((a, b) => b.wall - a.wall)
        .slice(0, 5);
      assert.deepEqual(
        index.topWork(r).map(({ name, wall }) => ({ name, wall })),
        raw,
      );
      assert.deepEqual(
        attribute(r, [], index),
        attribute(r, [], [...index.overlap(r.start, r.end, "pause", "1")]),
      );
    }
  } finally {
    index.close();
    fs.rmdirSync(tmp);
  }
});

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
    fs.writeFileSync(
      path.join(root, "trace-run.json"),
      JSON.stringify({
        ...binding,
        tag,
        nodeEnabled: false,
        level: "summary",
        startedAt: 1000,
      }),
    );
    const retained = 20,
      eventName = "recorded-context-" + "x".repeat(16 * 1024);
    const events = Math.ceil(constants.MAX_STRING_LENGTH / (eventName.length * retained)) + 1;
    const file = fs.openSync(path.join(raw, "synthetic.jsonl"), "wx");
    try {
      for (let i = 0; i < retained; i++)
        fs.writeSync(
          file,
          JSON.stringify({
            ...binding,
            schema: "triplex.trace.v1",
            type: "request",
            kind: "read",
            name: "reader.pull",
            traceId: i.toString(16).padStart(32, "0"),
            root: "0".repeat(16),
            start: 1000,
            end: 2000,
            spans: [],
            process: "reader",
            thread: 1,
          }) + "\n",
        );
      for (let i = 0; i < events; i++)
        fs.writeSync(
          file,
          JSON.stringify({
            ...binding,
            type: "event",
            name: eventName,
            layer: "synthetic",
            start: 1500 + i / events,
            end: 1600,
            process: "source",
            thread: 1,
            seq: i,
          }) + "\n",
        );
    } finally {
      fs.closeSync(file);
    }
    const out = path.join(root, "rendered");
    const reporter = fileURLToPath(new URL("./report.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["--max-old-space-size=128", reporter, root, "--output-to", out],
      { timeout: 240_000 },
    );
    const summary = JSON.parse(stdout);
    assert.equal(summary.requests, retained);
    assert.deepEqual(summary.errors, []);
    const chrome = path.join(out, "trace.chrome.json");
    assert.ok(fs.statSync(chrome).size > constants.MAX_STRING_LENGTH);
    const token = '"cat":"synthetic"';
    let count = 0,
      tail = "";
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
    const [first, second] = [
      ...viewer.matchAll(/data-card="0" data-sha256="([a-f0-9]{64})">([^<]+)/g),
    ];
    assert.ok(first && second);
    /** @param {RegExpExecArray} match */
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
