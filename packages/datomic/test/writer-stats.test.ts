import { expect, it } from "vitest";
import { writerStats } from "../../../lab/trace/writer-stats.mjs";
const make = () => ({
  m: { tag: "run", source: "1".repeat(40), slot: "run", level: "summary", startedAt: 0 },
  b: {
    status: "DONE",
    writer: { pendingAtEnd: 0 },
    correctness: { errors: 0, violations: 0 },
    priorities: { P2: { accounting: { byStreamAndOutcome: { "background:committed": 1 } } } },
    endedAt: new Date(1000).toISOString(),
  },
  w: [
    {
      traceId: "a".repeat(32),
      seq: 1,
      outcome: "committed",
      startedAt: 100,
      stream: "background",
      resend: false,
      scheduledAt: 100,
      finishedAt: 200,
      latencyMs: 100,
    },
  ],
  e: [
    {
      type: "request",
      kind: "commit",
      attributes: { seq: 1, stream: "background" },
      run: "run",
      source: "1".repeat(40),
      slot: "run",
      thread: 0,
      traceId: "a".repeat(32),
      start: 100,
      end: 200,
      spans: [{ name: "driver.queue.scheduler-late", start: 100, end: 170 }],
    },
    {
      type: "event",
      name: "node.gc",
      kind: 4,
      run: "run",
      source: "1".repeat(40),
      slot: "run",
      thread: 0,
      start: 120,
      end: 130,
    },
    {
      type: "resource",
      run: "run",
      source: "1".repeat(40),
      slot: "run",
      thread: 0,
      at: 150,
      memory: { heapUsed: 1024 },
    },
  ],
});
it("keeps the complete primary denominator, timed GC and writer-isolate heap", () => {
  const v = make(),
    s = writerStats(v.m, v.b, v.w, v.e);
  expect(s.commands).toBe(1);
  expect(s.over50).toEqual({ count: 1, totalMs: 100 });
  expect(s.schedulerLate50.unionMs).toBe(70);
  expect(s.gc.totalMs).toBe(10);
  expect(s.gc.kinds).toEqual({ "4": 1 });
  expect(s.heapUsed.p50).toBe(1024);
});
it.each(["foreign", "stale", "missing", "boundary", "denominator", "outcome", "sequence"])(
  "refuses %s telemetry",
  (mode) => {
    const v = make();
    if (mode === "foreign") v.e[1].source = "other";
    if (mode === "stale") v.e[1].start = -100;
    if (mode === "missing") v.e.shift();
    if (mode === "boundary") v.w[0].finishedAt = 201;
    if (mode === "denominator")
      v.b.priorities.P2.accounting.byStreamAndOutcome["background:committed"] = 2;
    if (mode === "outcome") v.w[0].outcome = "failed";
    if (mode === "sequence") v.w[0].seq = 2;
    expect(() => writerStats(v.m, v.b, v.w, v.e)).toThrow();
  },
);

it("builds the automatic writer table from compressed recorded inputs", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const { gzipSync } = await import("node:zlib");
  const { buildWriterStats, writerStatsMarkdown } =
    await import("../../../lab/trace/writer-stats.mjs");
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-dxt1-writer-stats-"));
  try {
    const dir = path.join(parent, "run"),
      v = make();
    fs.mkdirSync(path.join(dir, "driver"), { recursive: true });
    fs.mkdirSync(path.join(dir, "trace/raw"), { recursive: true });
    fs.writeFileSync(path.join(dir, "head.txt"), v.m.source);
    fs.writeFileSync(path.join(dir, "trace-run.json"), JSON.stringify(v.m));
    fs.writeFileSync(path.join(dir, "driver/ns-report.json"), JSON.stringify(v.b));
    fs.writeFileSync(
      path.join(dir, "driver/ns-writes.jsonl"),
      v.w.map((w) => JSON.stringify(w)).join("\n") + "\n",
    );
    fs.writeFileSync(
      path.join(dir, "trace/raw/node-9-0.jsonl.gz"),
      gzipSync(v.e.map((e) => JSON.stringify(e)).join("\n") + "\n"),
    );
    const observed = await buildWriterStats(dir);
    expect(observed.commands).toBe(1);
    expect(writerStatsMarkdown(observed)).toContain("10.000");
    expect(observed.reporterSha256).toMatch(/^[a-f0-9]{64}$/);
    fs.writeFileSync(path.join(dir, "head.txt"), "2".repeat(40));
    await expect(buildWriterStats(dir)).rejects.toThrow(/source/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
