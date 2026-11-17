import { it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { Worker } from "node:worker_threads";
import { finishW0Worker } from "../../../lab/bench/lib/w0-parallel.ts";

it("drains an evaluation isolate's actual recorder before its thread exits", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dxt1-worker-drain-"));
  const api = new URL("../dist/index.js", import.meta.url).href;
  const worker = new Worker(
    `
    const { parentPort } = require("node:worker_threads");
    (async () => {
      const api = await import(${JSON.stringify(api)});
      const trace = api.beginTrace("commit", "fixture.worker");
      api.finishTrace(trace);
      parentPort.on("message", async message => {
        if (message.type === "close") {
          await api.flushTracing();
          parentPort.close();
        }
      });
      parentPort.postMessage("ready");
    })();
  `,
    {
      eval: true,
      env: {
        ...process.env,
        TRIPLEX_TRACE_LEVEL: "summary",
        TRIPLEX_TRACE_DIR: directory,
        TRIPLEX_TRACE_RUN: "tx2-dxt1-unit",
        TRIPLEX_TRACE_SLOT: "tx2-dxt1-unit",
        TRIPLEX_TRACE_SOURCE: "f".repeat(40),
      },
    },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      worker.once("error", reject);
      worker.once("message", () => resolve());
    });
    await finishW0Worker(worker, { type: "close" });
    const files = fs.readdirSync(directory).filter((name) => name.endsWith(".gz"));
    expect(files).toHaveLength(1);
    const rows = gunzipSync(fs.readFileSync(path.join(directory, files[0]!)))
      .toString()
      .trim()
      .split("\n")
      .map(JSON.parse);
    expect(rows.some((row) => row.type === "histograms")).toBe(true);
    expect(rows.some((row) => row.type === "request" && row.name === "fixture.worker")).toBe(true);
    await finishW0Worker(worker);
  } finally {
    await worker.terminate();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 20_000);
