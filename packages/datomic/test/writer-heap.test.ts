import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { validateWriterHeap } from "../../../lab/trace/native-settings.mjs";

describe("writer-only heap constraints", () => {
  it("keeps startup limits on the writer and restores defaults for new workers", () => {
    const module = pathToFileURL(path.resolve("../../lab/bench/lib/writer-heap.ts")).href;
    const r = spawnSync(
      process.execPath,
      [
        "--max-old-space-size=128",
        "--max-semi-space-size=4",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `const {configureWriterHeap}=await import(${JSON.stringify(module)});console.log(JSON.stringify(await configureWriterHeap()));`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_OPTIONS: "",
          DX_WRITER_HEAP_TUNING: "1",
          DX_WRITER_OLD_MIB: "128",
          DX_WRITER_YOUNG_MIB: "4",
          DX_WORKER_OLD_MIB: "256",
          DX_WORKER_YOUNG_MIB: "16",
        },
      },
    );
    expect(r.status, r.stderr).toBe(0);
    const h = JSON.parse(r.stdout.trim());
    expect(h.writer.heapLimit).toBeLessThan(145 * 1048576);
    expect(h.workers.heapLimit).toBeGreaterThan(256 * 1048576);
  });
  const fixture = () => ({
    manifest: { tag: "r", source: "s", slot: "r", startedAt: 1000 },
    bench: {
      host: { node: "v22" },
      traceStartAbsMs: 1200,
      endedAt: 2000,
      writerHeap: {
        at: 1100,
        node: "v22",
        v8: "v",
        writer: { oldMiB: 6144, youngMiB: 4, heapLimit: 6156 * 1048576 },
        workers: { oldMiB: 6144, youngMiB: 16, heapLimit: 6192 * 1048576 },
      },
    },
    events: Array.from({ length: 5 }, (_, thread) => ({
      type: "resource",
      memory: { heapUsed: 100 },
      run: "r",
      source: "s",
      slot: "r",
      at: 1500,
      thread,
      heapLimit: (thread ? 6192 : 6156) * 1048576,
    })),
    oldMiB: 6144,
    youngMiB: 4,
    expectedThreads: [0, 1, 2, 3, 4],
    window: { start: 1200, end: 1800 },
  });
  it("requires the actual measured limits of the writer and all worker roles", () => {
    const f = fixture();
    expect(validateWriterHeap(f)).toBe(true);
    f.events[1]!.heapLimit = f.events[0]!.heapLimit;
    expect(() => validateWriterHeap(f)).toThrow("limit mismatch");
  });
  it.each(["source", "time", "settings", "missing"])("rejects %s heap evidence", (mode) => {
    const f = fixture();
    if (mode === "source") f.events[1]!.source = "other";
    if (mode === "time") f.bench.writerHeap.at = 900;
    if (mode === "settings") f.bench.writerHeap.writer.youngMiB = 16;
    if (mode === "missing") f.events.pop();
    expect(() => validateWriterHeap(f)).toThrow();
  });
});
