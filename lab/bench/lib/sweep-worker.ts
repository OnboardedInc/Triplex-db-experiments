import { measureW0Http } from "./w0-http.ts";
import fs from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { canonical, worldSha256, reachableRows, worldOf } from "./w0-world.ts";
import { evaluateW0, loadW0Pins } from "./evaluate.ts";
import { openComposition } from "./composition.ts";
const comp =
  workerData.composition === "memory"
    ? null
    : await openComposition(workerData.composition, workerData.lane, workerData.scope);
const port = parentPort!;
const pins = await loadW0Pins();
// [DX-H5] Why: cgroup interval deltas include concurrent pages/live traffic; preserve rather than invent attribution.
// Rejected: calling overlapping page CPU deltas exclusive service CPU.
const cgroups = () =>
  Object.fromEntries(
    (process.env.TX2_ENGINE_CGROUPS ?? "")
      .split(",")
      .filter(Boolean)
      .map((entry) => {
        const [name, path] = entry.split("=");
        const text = fs.readFileSync(path + "/cpu.stat", "utf8");
        return [name, Number(text.match(/^usage_usec (\d+)$/m)?.[1])];
      }),
  );
const pending = new Map<number, (v: any) => void>();
port.on("message", async (msg) => {
  if (msg.type === "rows") {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.type !== "page") return;
  try {
    const workerReceivedEpochMs = performance.timeOrigin + performance.now();
    const pageCpuStarted = process.threadCpuUsage();
    const pageStartCpu = cgroups();
    const start = performance.eventLoopUtilization();
    const cpu = () => (process as any).threadCpuUsage?.() ?? process.cpuUsage();
    const diff = (a: any, b: any) => (b.user - a.user + b.system - a.system) / 1e6;
    let c = cpu();
    const readStart = performance.now();
    const measured = comp
      ? await measureW0Http(() => comp.sweepPage(msg.subjects, msg.basis))
      : null;
    const page = measured
      ? measured.value
      : await new Promise<any>((resolve) => {
          pending.set(msg.id, resolve);
          port.postMessage({ type: "read", id: msg.id, subjects: msg.subjects, basis: msg.basis });
        });
    if (page.error) throw new Error(page.error);
    const readWallMs = performance.now() - readStart;
    const readCpu = diff(c, cpu());
    let decodeWallMs = 0,
      evaluateWallMs = 0;
    let decodeCpu = 0,
      kernelCpu = 0;
    const result: any[] = [];
    const indexStart = performance.now(),
      indexCpuStart = cpu();
    const byEntity = new Map<string, any[]>();
    for (const row of page.rows) {
      const a = byEntity.get(row.entityId) ?? [];
      a.push(row);
      byEntity.set(row.entityId, a);
    }
    const indexWallMs = performance.now() - indexStart,
      indexCpu = diff(indexCpuStart, cpu());
    for (const subject of msg.subjects) {
      c = cpu();
      let wall = performance.now();
      const world = worldOf(subject, reachableRows([subject], page.rows, byEntity));
      decodeCpu += diff(c, cpu());
      decodeWallMs += performance.now() - wall;
      c = cpu();
      wall = performance.now();
      const r = await evaluateW0(world, msg.release, msg.basis, pins, msg.activations);
      kernelCpu += diff(c, cpu());
      evaluateWallMs += performance.now() - wall;
      if ("error" in r) throw new Error(subject + ": " + r.error);
      // [DX-H6] Why: only outputs and a binding digest cross threads; preview worlds remain durable for full post-ACK verification.
      // Rejected: canonicalizing and transferring every fact a second time.
      result.push({ subject, worldSha256: worldSha256(world), output: r.output, record: r.record });
    }
    const encodeStarted = performance.now(),
      encodeCpuStarted = cpu();
    const bytes = new TextEncoder().encode(canonical(result));
    const resultEncodeWallMs = performance.now() - encodeStarted,
      resultEncodeCpu = diff(encodeCpuStarted, cpu());
    port.postMessage(
      {
        type: "result",
        id: msg.id,
        bytes: bytes.buffer,
        position: page.position,
        epoch: page.epoch,
        timing: {
          readWallMs,
          workerDispatchWaitMs: workerReceivedEpochMs - msg.dispatchedAtEpochMs,
          workerReceivedEpochMs,
          indexWallMs,
          resultEncodeWallMs,
          readRequests: measured?.requests ?? page.timing?.readRequests ?? null,
          responseBytes: measured?.responseBytes ?? null,
          gatewayMicros: measured?.gatewayHeaders ? measured.gatewayMicros : null,
          rows: page.rows.length,
          decodeWallMs,
          evaluateWallMs,
        },
        cpu: {
          read: readCpu,
          decode: decodeCpu,
          kernel: kernelCpu,
          index: indexCpu,
          resultEncode: resultEncodeCpu,
          total: diff(pageCpuStarted, cpu()),
        },
        cgroupIntervalMicros: Object.fromEntries(
          Object.entries(cgroups()).map(([name, value]) => [name, value - pageStartCpu[name]]),
        ),
        cpuScope: (process as any).threadCpuUsage ? "thread" : "process-overlapping",
        elu: performance.eventLoopUtilization(start),
      },
      [bytes.buffer],
    );
  } catch (error: any) {
    port.postMessage({ type: "error", id: msg.id, error: String(error?.stack ?? error) });
  }
});

// [DX-H6] Why: establish runtime and pins before the activation timer starts. Rejected: charging worker startup as steady-state service.
port.postMessage({ type: "ready" });
