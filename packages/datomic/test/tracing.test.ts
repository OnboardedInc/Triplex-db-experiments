import { describe, it, expect, vi, afterEach } from "vitest";
import http from "node:http";
import { mkdtempSync, rmSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
const directories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});
async function recorder() {
  const dir = mkdtempSync(path.join(tmpdir(), "triplex-trace-test-"));
  directories.push(dir);
  vi.stubEnv("TRIPLEX_TRACE_LEVEL", "full");
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
    expect(readFileSync(path.join(dir, "trace.html"), "utf8")).toContain(root.traceId);
    expect(
      JSON.parse(readFileSync(path.join(dir, "trace.chrome.json"), "utf8")).traceEvents.length,
    ).toBeGreaterThan(2);
    writeFileSync(
      path.join(dir, "trace-run.json"),
      JSON.stringify({ tag: "wrong-attempt", source: "source", slot: "slot", level: "full" }),
    );
    expect((await buildReport(dir)).complete).toBe(false);
  });
});
