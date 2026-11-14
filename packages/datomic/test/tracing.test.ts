import { describe, it, expect, vi, afterEach } from "vitest";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { Worker } from "node:worker_threads";
import { mkdtempSync, rmSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { unpackHtml } from "../../../lab/trace/viewer.mjs";
const directories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});
async function recorder(level = "full") {
  const dir = mkdtempSync(path.join(tmpdir(), "triplex-trace-test-"));
  directories.push(dir);
  vi.stubEnv("TRIPLEX_TRACE_LEVEL", level);
  vi.stubEnv("TRIPLEX_TRACE_DIR", dir);
  vi.stubEnv("TRIPLEX_TRACE_RUN", "fixture");
  vi.stubEnv("TRIPLEX_TRACE_SOURCE", "source");
  vi.stubEnv("TRIPLEX_TRACE_SLOT", "slot");
  vi.resetModules();
  return { api: await import("../src/tracing.js"), dir };
}
function rows(dir: string) {
  return readdirSync(dir).flatMap((f) =>
    gunzipSync(readFileSync(path.join(dir, f)))
      .toString()
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s)),
  );
}

describe("permanent request tracing", () => {
  it("closes a trace at the measured completion, excluding later recorder work", async () => {
    const { api, dir } = await recorder("summary");
    const trace = api.beginTrace("commit", "measured")!;
    api.withTrace(trace, () => api.traceSync("work", () => 42));
    const completed = api.traceNow();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(() => api.finishTrace(trace, {}, trace.start - 1)).toThrow("completion");
    expect(() => api.finishTrace(trace, {}, api.traceNow() + 1000)).toThrow("completion");
    api.finishTrace(trace, {}, completed);
    await api.flushTracing();
    expect(rows(dir).find((row) => row.name === "measured").end).toBe(completed);
  });
  it("keeps command identity through concurrent managed Effect runs, yields, HTTP and foreign dispatcher flushes", async () => {
    const { api, dir } = await recorder("summary");
    const { Effect, ManagedRuntime, Layer, Scheduler } = await import("effect");
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const seen = new Map<number, string>();
    const server = http.createServer((req, res) => {
      let text = "";
      req.on("data", (chunk) => {
        text += chunk;
      });
      req.on("end", () => {
        const id = JSON.parse(text).id;
        seen.set(id, String(req.headers.traceparent).split("-")[1]!);
        setTimeout(() => res.end("{}"), id % 3);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const client = new DatomicClient(
      `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
    );
    const runtime = ManagedRuntime.make(Layer.empty);
    const traces = Array.from(
      { length: 40 },
      (_, id) => api.beginTrace("commit", "effect.command", { id })!,
    );
    try {
      await Promise.all(
        traces.map((trace, id) =>
          api
            .withTrace(trace, () =>
              runtime.runPromise(
                Effect.gen(function* () {
                  for (let i = 0; i < 5; i++) yield* Effect.yieldNow;
                  yield* Effect.promise(() => client.request("POST", "/command", { id }));
                  yield* Effect.yieldNow;
                  expect(api.currentTrace()?.traceId).toBe(trace.traceId);
                }),
                { scheduler: api.traceScheduler(new Scheduler.MixedScheduler()) },
              ),
            )
            .finally(() => api.finishTrace(trace)),
        ),
      );
      traces.forEach((trace, id) => expect(seen.get(id)).toBe(trace.traceId));
      let resumed: string | undefined;
      const dispatcher = api.withTrace(traces[0], () =>
        api.traceScheduler(new Scheduler.MixedScheduler()).makeDispatcher(),
      );
      api.withTrace(traces[1], () =>
        dispatcher.scheduleTask(() => {
          resumed = api.currentTrace()?.traceId;
        }, 0),
      );
      dispatcher.flush();
      expect(resumed).toBe(traces[0]!.traceId);
    } finally {
      client.close();
      await runtime.dispose();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await api.flushTracing();
    }
    expect(rows(dir).filter((row) => row.name === "effect.command")).toHaveLength(40);
  });
  it("retains deferred work as a linked overlay after its request is finished", async () => {
    const { api, dir } = await recorder("summary");
    const t = api.beginTrace("commit", "completed")!;
    let done!: () => void;
    const pending = new Promise<void>((resolve) => {
      done = resolve;
    });
    api.withTrace(t, () =>
      api.withoutTrace(() =>
        setImmediate(() => {
          expect(api.currentTrace()).toBeUndefined();
          api.traceWork("deferred.witness", () => 1, { commitTraceId: t.traceId }, true);
          done();
        }),
      ),
    );
    api.finishTrace(t);
    await pending;
    await api.flushTracing();
    const recorded = rows(dir),
      event = recorded.find((r) => r.type === "event" && r.name === "deferred.witness");
    expect(event.attributes.commitTraceId).toBe(t.traceId);
    expect(event.start).toBeGreaterThanOrEqual(t.end);
    expect(recorded.find((r) => r.traceId === t.traceId && r.type === "request").spans).toEqual([]);
  });

  it("drains every commit across full output batches and the final partial batch", async () => {
    const { api, dir } = await recorder("summary");
    const ids: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const trace = api.beginTrace("commit", "batched.commit", { phase: "batch" })!;
      ids.push(trace.traceId);
      api.withTrace(trace, () => api.traceSync("batched.step", () => i));
      api.finishTrace(trace);
    }
    await api.flushTracing();
    const recorded = rows(dir);
    const commits = recorded.filter((r) => r.type === "request" && r.kind === "commit");
    expect(commits.map((r) => r.traceId)).toEqual(ids);
    expect(commits.every((r) => r.spans.length === 1 && r.spans[0].parent === r.root)).toBe(true);
    expect(recorded.at(-1).type).toBe("histograms");
    expect(recorded.at(-1).histograms["commit:batch"].count).toBe(1000);
    expect(recorded.at(-1).failure).toBeNull();
  });
  it("propagates W3C ids through concurrent client requests and records the response identity", async () => {
    const { api, dir } = await recorder();
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const seen: string[] = [];
    const server = http.createServer((req, res) => {
      const parent = String(req.headers.traceparent);
      seen.push(parent);
      res.setHeader("traceparent", `00-${parent.split("-")[1]}-1234567890abcdef-01`);
      setTimeout(() => res.end('{"ok":true}'), seen.length === 1 ? 15 : 1);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const client = new DatomicClient(
      `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
    );
    const traces = [api.beginTrace("commit", "first")!, api.beginTrace("read", "second")!];
    try {
      await Promise.all(
        traces.map((t) =>
          api.withTrace(t, async () => {
            await api.traceAsync("outer", async () => {
              expect(await client.request("POST", "/test", { n: 1 })).toEqual({ ok: true });
            });
            api.finishTrace(t);
          }),
        ),
      );
      expect(seen.map((v) => api.parseTraceparent(v)!.traceId).sort()).toEqual(
        traces.map((t) => t.traceId).sort(),
      );
      for (const trace of traces) {
        const outer = trace.spans.find((s) => s.name === "outer")!;
        const exchange = trace.spans.find((s) => s.name === "client.http")!;
        expect(exchange.parent).not.toBe(trace.root);
        expect(trace.spans.some((s) => s.id === exchange.parent)).toBe(true);
        expect(outer.start).toBeLessThanOrEqual(exchange.start);
        expect(outer.end).toBeGreaterThanOrEqual(exchange.end);
        expect(exchange.attributes!.responseTraceparent).toContain(trace.traceId);
        expect(trace.spans.every((s) => s.end >= s.start)).toBe(true);
      }
    } finally {
      client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await api.flushTracing();
    }
    expect(rows(dir).some((r) => r.type === "histograms")).toBe(true);
    expect(rows(dir).filter((r) => r.type === "request" && r.kind === "commit")).toHaveLength(1);
  });
  it("keeps a deferred ordered HTTP send in its own trace when another commit releases it", async () => {
    const { api } = await recorder();
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const { registerCommit, sendCommit, endCommit } = await import("../src/CommitOrder.js");
    const seen: string[] = [];
    const server = http.createServer((req, res) => {
      seen.push(String(req.headers.traceparent));
      res.end('{"ok":true}');
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const client = new DatomicClient(
      `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
    );
    const first = api.beginTrace("commit", "first")!,
      second = api.beginTrace("commit", "second")!;
    const blocker = api.withTrace(first, () => registerCommit(1)),
      ticket = api.withTrace(second, () => registerCommit(2));
    try {
      const pending = api.withTrace(second, () =>
        sendCommit(ticket, (_n, sent) => client.request("POST", "/test", {}, undefined, sent)),
      );
      expect(seen).toHaveLength(0);
      api.withTrace(first, () => endCommit(blocker));
      await pending;
      expect(api.parseTraceparent(seen[0])!.traceId).toBe(second.traceId);
      expect(second.spans.some((s) => s.name === "client.commit-send-queue")).toBe(true);
      expect(first.spans.some((s) => s.name === "client.http")).toBe(false);
    } finally {
      endCommit(blocker);
      endCommit(ticket);
      client.close();
      await new Promise<void>((r) => server.close(() => r()));
      api.finishTrace(first);
      api.finishTrace(second);
      await api.flushTracing();
    }
  });
  it("continues the exact sending span across a real worker and rejects foreign attempt context", async () => {
    const { api, dir } = await recorder();
    const worker = new Worker(
      `
      const {parentPort}=require("node:worker_threads");
      import(${JSON.stringify(new URL("../src/tracing.ts", import.meta.url).href)}).then(api=>{
        parentPort.once("message",async wire=>{
          await api.continueTrace(wire,"worker.test",async()=>api.traceSync("worker.own",()=>42));
          await api.flushTracing(); parentPort.postMessage("drained"); parentPort.close();
        });
      });`,
      { eval: true, execArgv: [] },
    );
    const trace = api.beginTrace("commit", "driver.commit")!;
    try {
      await api.withTrace(trace, () =>
        api.traceAsync(
          "rpc.test",
          () =>
            new Promise<void>((resolve, reject) => {
              worker.once("error", reject);
              worker.once("message", () => resolve());
              worker.postMessage(api.captureTraceContext());
            }),
          "event-loop",
        ),
      );
    } finally {
      await worker.terminate();
    }
    api.finishTrace(trace);
    const foreign = api.captureTraceContext();
    expect(foreign).toBeUndefined();
    await api.continueTrace(
      { traceId: trace.traceId, parent: trace.root, run: "other", source: "source", slot: "slot" },
      "foreign",
      async () => {},
    );
    await api.flushTracing();
    const recorded = rows(dir),
      receiver = recorded.find((r) => r.name === "worker.test");
    expect(receiver.traceId).toBe(trace.traceId);
    expect(receiver.parent).toBe(trace.spans.find((s) => s.name === "rpc.test")!.id);
    expect(receiver.root).not.toBe(trace.root);
    expect(receiver.thread).not.toBe(trace.thread);
    expect(receiver.spans[0].parent).toBe(receiver.root);
    expect(recorded.find((r) => r.name === "foreign").attributes.invalidParent).toBe(true);
    expect(recorded.find((r) => r.name === "foreign").traceId).not.toBe(trace.traceId);
  });
  it("keeps all commit steps and flags commit-owned begin routes in summary, including continued contexts", async () => {
    const { api, dir } = await recorder("summary");
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const seen: unknown[] = [];
    const server = http.createServer((req, res) => {
      seen.push(req.headers["x-triplex-trace-kind"]);
      res.end("{}");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const client = new DatomicClient(
        `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
      ),
      trace = api.beginTrace("commit", "driver.commit")!;
    try {
      await api.withTrace(trace, async () => {
        for (let i = 0; i < 5; i++) api.traceSync(`tiny.${i}`, () => i);
        await client.request("POST", "/begin", {});
        await api.continueTrace(api.captureTraceContext(), "worker.commit", async () => {
          api.traceSync("worker.tiny", () => 0);
          await client.request("POST", "/begin", {});
        });
      });
      api.finishTrace(trace);
    } finally {
      client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await api.flushTracing();
    }
    expect(seen).toEqual(["commit", "commit"]);
    expect(trace.spans.filter((s) => s.name.startsWith("tiny."))).toHaveLength(5);
    expect(
      rows(dir)
        .find((r) => r.name === "worker.commit")
        .spans.some((s: any) => s.name === "worker.tiny"),
    ).toBe(true);
  });
  it("preserves each trace across concurrent yielding Effect fibers", async () => {
    const { api } = await recorder();
    const { Effect } = await import("effect");
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const expected = new Map<number, string>(),
      mismatches: string[] = [];
    const server = http.createServer((req, res) => {
      let text = "";
      req.on("data", (c) => (text += c));
      req.on("end", () => {
        const { n } = JSON.parse(text),
          actual = api.parseTraceparent(req.headers.traceparent)?.traceId;
        if (actual !== expected.get(n)) mismatches.push(String(n));
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const client = new DatomicClient(
      `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
    );
    try {
      await Promise.all(
        Array.from({ length: 32 }, async (_, n) => {
          const trace = api.beginTrace("commit", "effect-fiber")!;
          expected.set(n, trace.traceId);
          await api.withTrace(trace, () =>
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.sleep(`${n % 4} millis`);
                yield* Effect.tryPromise(() => client.request("POST", "/effect", { n }));
                yield* Effect.sleep("1 millis");
                yield* Effect.tryPromise(() => client.request("POST", "/effect", { n }));
              }),
            ),
          );
          api.finishTrace(trace);
        }),
      );
      expect(mismatches).toEqual([]);
    } finally {
      client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await api.flushTracing();
    }
  });
  it("keeps every commit and slow read plus a fixed sample and rejects malformed parent ids", async () => {
    const { api } = await recorder();
    expect(api.keepTrace("commit", "f".repeat(32), 0)).toBe(true);
    expect(api.keepTrace("read", "f".repeat(32), 50)).toBe(true);
    let samples = 0;
    for (let n = 0; n < 100_000; n++)
      if (api.keepTrace("read", n.toString(16).padStart(32, "0"), 1)) samples++;
    expect(samples).toBeGreaterThan(50);
    expect(samples).toBeLessThan(160);
    expect(api.parseTraceparent(`00-${"0".repeat(32)}-${"1".repeat(16)}-01`)).toBeUndefined();
    expect(api.parseTraceparent(`00-${"1".repeat(32)}-${"0".repeat(16)}-01`)).toBeUndefined();
    expect(api.parseTraceparent("junk")).toBeUndefined();
    await api.flushTracing();
  });
  it("retains the actual top 20 of every phase even below the slow threshold", async () => {
    const { api, dir } = await recorder();
    const phases = new Map<number, any[]>();
    for (const phase of [7, 8]) {
      const traces = [];
      for (let i = 0; i < 40; i++) {
        const trace = api.beginTrace("read", "top-read", { phase }, api.traceNow() - i)!;
        api.finishTrace(trace);
        traces.push(trace);
      }
      phases.set(phase, traces);
    }
    await api.flushTracing();
    const retained = rows(dir).filter((r) => r.type === "request" && r.name === "top-read");
    expect(new Set(retained.map((r) => r.traceId)).size).toBe(retained.length);
    for (const [phase, traces] of phases)
      for (const expected of traces
        .sort((a, b) => b.end - b.start - (a.end - a.start))
        .slice(0, 20))
        expect(
          retained.some((r) => r.traceId === expected.traceId && r.attributes.phase === phase),
        ).toBe(true);
  });
  it("records failure spans and isolates parent contexts across asynchronous tasks", async () => {
    const { api } = await recorder();
    const t = api.beginTrace("commit", "failure")!;
    await expect(
      api.withTrace(t, () =>
        api.traceAsync("failed", async () => {
          throw Error("marker");
        }),
      ),
    ).rejects.toThrow("marker");
    expect(t.spans.map((s) => s.name)).toContain("failed");
    expect(api.currentTrace()).toBeUndefined();
    api.finishTrace(t);
    await api.flushTracing();
  });
  it("builds a bound report from recorded fixture bytes without double-counting nested spans", async () => {
    const { buildReport, attribute } = await import("../../../lab/trace/report.mjs");
    const root = {
      schema: "triplex.trace.v1",
      type: "request",
      run: "fixture",
      source: "source",
      slot: "slot",
      process: "node",
      thread: 0,
      traceId: "1".repeat(32),
      root: "1".repeat(16),
      kind: "commit",
      name: "driver.commit",
      start: 1000,
      end: 1020,
      attributes: {},
      truncated: 0,
      spans: [
        {
          id: "2",
          parent: "1".repeat(16),
          name: "driver.execute",
          layer: "typescript",
          start: 1000,
          end: 1020,
        },
        {
          id: "3",
          parent: "2",
          name: "client.http",
          layer: "gateway-wait",
          start: 1005,
          end: 1015,
        },
      ],
    };
    const gateway = {
      ...root,
      root: "4",
      parent: "3",
      name: "gateway /transact",
      process: "gw-w",
      start: 1006,
      end: 1014,
      spans: [
        { id: "5", parent: "4", name: "peer.await", layer: "peer-wait", start: 1008, end: 1012 },
      ],
    };
    const a = attribute(root, [gateway], []);
    expect(Object.values(a.layers).reduce((x, y) => x + y, 0)).toBe(20);
    expect(a.layers.typescript).toBe(10);
    expect(a.layers.gateway).toBe(4);
    expect(a.layers["peer-wait"]).toBe(4);
    expect(a.layers.network).toBe(2);
    expect(a.unexplainedMs).toBe(0);
    // [DX-T1] Why: a pause while waiting on another process is overlap, not extra own-process latency.
    // Rejected: charging every overlapping GC to the request's TypeScript share.
    const remoteGc = attribute(
      root,
      [gateway],
      [{ name: "gc", layer: "typescript-gc", process: "node", thread: 0, start: 1008, end: 1010 }],
    );
    expect(remoteGc.layers["typescript-gc"]).toBe(0);
    expect(remoteGc.typescriptMs).toBe(10);
    const localGc = attribute(
      root,
      [gateway],
      [{ name: "gc", layer: "typescript-gc", process: "node", thread: 0, start: 1001, end: 1003 }],
    );
    expect(localGc.layers["typescript-gc"]).toBe(2);
    expect(localGc.typescriptMs).toBe(10);
    const peerGc = attribute(
      root,
      [gateway],
      [{ name: "gc", layer: "gateway-gc", process: "gw-w", thread: 1, start: 1008, end: 1010 }],
    );
    expect(peerGc.layers["gateway-gc"]).toBe(0);
    expect(peerGc.layers["peer-wait"]).toBe(4);
    // [DX-T1] Why: child worker/socket/server intervals replace the parent's RPC wait, rather than being hidden by it.
    // Rejected: ranking an event-loop wait above deeper remote work or accepting an unobserved worker receiver.
    const { traceChildren } = await import("../../../lab/trace/report.mjs");
    const workerRoot = {
      ...root,
      root: "worker-root",
      parent: "rpc",
      name: "worker.probe",
      kind: "internal",
      thread: 1,
      start: 1002,
      end: 1018,
      spans: [
        {
          id: "worker-own",
          parent: "worker-root",
          name: "worker.own",
          layer: "typescript",
          start: 1002,
          end: 1018,
        },
        {
          id: "worker-http",
          parent: "worker-own",
          name: "client.http",
          layer: "gateway-wait",
          start: 1005,
          end: 1015,
        },
      ],
    };
    const sender = {
      ...root,
      spans: [
        root.spans[0],
        { id: "rpc", parent: "2", name: "rpc.test", layer: "event-loop", start: 1001, end: 1019 },
      ],
    };
    const remoteGateway = { ...gateway, parent: "worker-http" };
    const children = traceChildren(sender, [remoteGateway, workerRoot]);
    expect(children).toHaveLength(2);
    expect(
      traceChildren(sender, [{ ...workerRoot, source: "foreign" }, remoteGateway]),
    ).toHaveLength(0);
    const remote = attribute(sender, [remoteGateway], [], [workerRoot]);
    expect(remote.layers["event-loop"]).toBe(2);
    expect(remote.layers.typescript).toBe(8);
    expect(remote.layers.gateway).toBe(4);
    expect(remote.layers["peer-wait"]).toBe(4);
    expect(remote.layers.network).toBe(2);
    const dir = mkdtempSync(path.join(tmpdir(), "triplex-report-test-"));
    directories.push(dir);
    mkdirSync(path.join(dir, "trace/raw"), { recursive: true });
    mkdirSync(path.join(dir, "driver"));
    writeFileSync(
      path.join(dir, "trace-run.json"),
      JSON.stringify({ tag: "fixture", source: "source", slot: "slot", level: "full" }),
    );
    writeFileSync(
      path.join(dir, "driver/ns-report.json"),
      JSON.stringify({
        seed: { seededSubjects: 1000 },
        phases: [{ idx: 0, name: "L256", start: 999, end: 1030, readers: 256 }],
      }),
    );
    writeFileSync(
      path.join(dir, "driver/ns-writes.jsonl"),
      JSON.stringify({ traceId: root.traceId }) + "\n",
    );
    writeFileSync(
      path.join(dir, "trace/raw/fixture.jsonl"),
      [
        root,
        gateway,
        {
          type: "histograms",
          run: "fixture",
          source: "source",
          slot: "slot",
          histograms: {},
          failure: null,
        },
      ]
        .map((r) => JSON.stringify(r))
        .join("\n") + "\n",
    );
    const report = await buildReport(dir);
    expect(report.complete).toBe(true);
    expect(report.coverage.denominator).toBe(1);
    expect(report.coverage.atLeast95Percent).toBe(1);
    const originalReport = readFileSync(path.join(dir, "TRACE-REPORT.md"));
    const derived = path.join(dir, "derived-anatomy");
    const derivedReport = await buildReport(dir, { anatomyTo: derived });
    expect(derivedReport.complete).toBe(true);
    expect(readFileSync(path.join(dir, "TRACE-REPORT.md"))).toEqual(originalReport);
    expect(readdirSync(derived).sort()).toEqual(["COMMIT-ANATOMY.md", "commit-anatomy.json"]);
    expect(
      JSON.parse(readFileSync(path.join(derived, "commit-anatomy.json"), "utf8")),
    ).toMatchObject({ source: "source", reporterSha256: derivedReport.reporterSha256 });
    await expect(buildReport(dir, { anatomyTo: dir })).rejects.toThrow("separate output");
    const badCli = spawnSync(
      process.execPath,
      [new URL("../../../lab/trace/report.mjs", import.meta.url).pathname, dir, "--anatomy-to"],
      { encoding: "utf8" },
    );
    expect(badCli.status).not.toBe(0);
    expect(badCli.stderr).toContain("Missing anatomy output directory");
    expect(readFileSync(path.join(dir, "TRACE-REPORT.md"))).toEqual(originalReport);
    const rawFixture = path.join(dir, "trace/raw/fixture.jsonl"),
      originalBytes = readFileSync(rawFixture, "utf8");
    writeFileSync(rawFixture, originalBytes.replace(JSON.stringify(root), JSON.stringify(sender)));
    const absentWorker = await buildReport(dir);
    expect(absentWorker.complete).toBe(false);
    expect(absentWorker.errors).toContain("1 worker RPC spans have no bound receiver trace");
    writeFileSync(rawFixture, originalBytes);
    await buildReport(dir);
    expect(unpackHtml(readFileSync(path.join(dir, "trace.html"), "utf8"))).toContain(root.traceId);
    expect(
      JSON.parse(readFileSync(path.join(dir, "trace.chrome.json"), "utf8")).traceEvents.length,
    ).toBeGreaterThan(2);
    writeFileSync(
      path.join(dir, "trace-run.json"),
      JSON.stringify({
        tag: "fixture",
        source: "source",
        slot: "slot",
        level: "full",
        requiredJfr: ["gw-w"],
      }),
    );
    const absentJfr = await buildReport(dir);
    expect(absentJfr.complete).toBe(false);
    expect(absentJfr.errors.some((e) => e.includes("JFR export for gw-w"))).toBe(true);
    writeFileSync(
      path.join(dir, "trace-run.json"),
      JSON.stringify({ tag: "wrong-attempt", source: "source", slot: "slot", level: "full" }),
    );
    expect((await buildReport(dir)).complete).toBe(false);
  });
  it("renders the retained real smoke trace fixture with exact source/run/HTTP-parent binding", async () => {
    const { buildReport } = await import("../../../lab/trace/report.mjs");
    const fixture = JSON.parse(
      readFileSync(new URL("./fixtures/tracing-smoke.json", import.meta.url), "utf8"),
    );
    const dir = mkdtempSync(path.join(tmpdir(), "triplex-recorded-trace-"));
    directories.push(dir);
    mkdirSync(path.join(dir, "trace/raw"), { recursive: true });
    mkdirSync(path.join(dir, "driver"));
    const root = fixture.requests[0];
    writeFileSync(path.join(dir, "trace-run.json"), JSON.stringify(fixture.manifest));
    writeFileSync(
      path.join(dir, "driver/ns-report.json"),
      JSON.stringify({
        seed: { seededSubjects: 1000 },
        phases: [{ idx: 0, name: "recorded", start: root.start - 1, end: root.end + 1 }],
      }),
    );
    writeFileSync(
      path.join(dir, "driver/ns-writes.jsonl"),
      JSON.stringify({ traceId: root.traceId }) + "\n",
    );
    writeFileSync(
      path.join(dir, "trace/raw/fixture.jsonl"),
      [
        ...fixture.requests,
        { type: "histograms", run: root.run, source: root.source, slot: root.slot, histograms: {} },
      ]
        .map((r) => JSON.stringify(r))
        .join("\n") + "\n",
    );
    const report = await buildReport(dir);
    expect(report.complete).toBe(true);
    expect(report.coverage.atLeast95Percent).toBe(1);
    expect(report.commits).toBe(1);
    expect(readFileSync(path.join(dir, "TRACE-REPORT.md"), "utf8")).toContain(root.traceId);
  });
});

describe("Linux per-thread scheduler counters", () => {
  it("parses nanosecond counters and rejects malformed or imprecise values", async () => {
    const { parseSchedulerStats } = await import("../src/tracing.js");
    expect(parseSchedulerStats("1500000 250000 8\n")).toEqual({
      runtimeNs: 1500000,
      runqueueNs: 250000,
      switches: 8,
    });
    for (const invalid of ["", "1 2", "1 -2 3", "1.5 2 3", "9007199254740992 2 3"])
      expect(parseSchedulerStats(invalid)).toBeUndefined();
  });
});

describe("exclusive synchronous CPU counters", () => {
  it("unions nested synchronous boundaries and leaves disabled wait accounting unknown", async () => {
    const { synchronousCpu } = await import("../../../lab/trace/report.mjs");
    const point = (at: number, runtimeNs: number) => ({
      at,
      runtimeNs,
      runqueueNs: runtimeNs,
      switches: 1,
      waitEnabled: true,
    });
    const spans = [
      { synchronous: true, schedulerStart: point(0, 0), schedulerEnd: point(3, 1500000) },
      { synchronous: true, schedulerStart: point(1, 500000), schedulerEnd: point(2, 1000000) },
    ];
    expect(synchronousCpu({ spans })).toEqual({
      cpuRuntimeMs: 1.5,
      cpuRunqueueMs: 1.5,
      cpuScopeWallMs: 3,
    });
    for (const s of spans) {
      s.schedulerStart.waitEnabled = false;
      s.schedulerEnd.waitEnabled = false;
    }
    expect(synchronousCpu({ spans }).cpuRunqueueMs).toBeNull();
    expect(
      synchronousCpu({ spans: spans.map((s) => ({ ...s, synchronous: false })) }).cpuRuntimeMs,
    ).toBeNull();
  });
});

describe("shared Linux clock alignment", () => {
  it("aligns gateway and worker boundaries through the exact boot clock and rejects foreign boots", async () => {
    const { alignClockRecord } = await import("../../../lab/trace/report.mjs");
    const reference = {
      domain: "linux-monotonic",
      bootId: "boot-a",
      offsetMs: 1000,
      uncertaintyMs: 0.001,
    };
    const row = {
      clock: { ...reference, offsetMs: 1100 },
      start: 120,
      end: 130,
      attributes: { submittedAt: 125, position: 7 },
      spans: [{ start: 121, end: 129, schedulerStart: { at: 121 }, schedulerEnd: { at: 129 } }],
    };
    const aligned = alignClockRecord(row, reference);
    expect(aligned.start).toBe(20);
    expect(aligned.end).toBe(30);
    expect(aligned.attributes).toEqual({ submittedAt: 25, position: 7 });
    expect(aligned.spans[0].schedulerStart.at).toBe(21);
    expect(row.start).toBe(120);
    expect(() =>
      alignClockRecord({ ...row, clock: { ...row.clock, bootId: "other" } }, reference),
    ).toThrow(/clock binding/);
  });
});

describe("explicit CPU placement", () => {
  it("validates CPU sets before applying an optional Linux-only placement", async () => {
    const { parseTraceCpuSet } = await import("../src/tracing.js");
    expect(parseTraceCpuSet("3")).toEqual([3]);
    expect(parseTraceCpuSet("4,5,6,7")).toEqual([4, 5, 6, 7]);
    for (const invalid of ["", "-1", "3,3", "1 2", "1,", "65536", "1;echo"])
      expect(() => parseTraceCpuSet(invalid)).toThrow();
  });
});

describe("lossless completed-oracle archives", () => {
  async function attempt() {
    const dir = mkdtempSync(path.join(tmpdir(), "tx2-dxt1-pack-test-"));
    directories.push(dir);
    mkdirSync(path.join(dir, "driver"));
    const source = "1".repeat(40),
      tag = path.basename(dir);
    writeFileSync(path.join(dir, "head.txt"), source);
    writeFileSync(path.join(dir, "trace-run.json"), JSON.stringify({ source, tag, slot: tag }));
    writeFileSync(path.join(dir, "driver/ns-report.json"), JSON.stringify({ status: "DONE" }));
    writeFileSync(path.join(dir, "driver/oracle-expected.json"), "exact payload".repeat(100));
    return dir;
  }
  it("rereads decoded bytes and retains source-bound SHA256 before removing the original", async () => {
    const { packOracle } = await import("../../../lab/trace/pack-oracle.mjs");
    const dir = await attempt();
    const file = path.join(dir, "driver/oracle-expected.json"),
      before = readFileSync(file);
    expect((await packOracle(dir, { minBytes: 1 })).files).toBe(1);
    expect(gunzipSync(readFileSync(file + ".gz"))).toEqual(before);
    const manifest = readFileSync(path.join(dir, "ORACLE-ARCHIVE.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(manifest[1].originalSha256).toBe(manifest[1].decodedSha256);
    expect(manifest.at(-1).type).toBe("complete");
    expect(readdirSync(path.join(dir, "driver"))).not.toContain("oracle-expected.json");
  });
  it("refuses a foreign source and an existing destination while retaining the original", async () => {
    const { packOracle } = await import("../../../lab/trace/pack-oracle.mjs");
    const dir = await attempt(),
      file = path.join(dir, "driver/oracle-expected.json");
    writeFileSync(path.join(dir, "head.txt"), "2".repeat(40));
    await expect(packOracle(dir, { minBytes: 1 })).rejects.toThrow(/binding/);
    writeFileSync(path.join(dir, "head.txt"), "1".repeat(40));
    writeFileSync(file + ".gz", "corrupt existing file");
    await expect(packOracle(dir, { minBytes: 1 })).rejects.toThrow();
    expect(readFileSync(file, "utf8")).toBe("exact payload".repeat(100));
  });
});
