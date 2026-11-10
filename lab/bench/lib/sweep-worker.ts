import { measureW0Http } from "./w0-http.ts";
import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { canonical, reachableRows, worldOf } from "./w0-world.ts";
import { evaluateW0, loadW0Pins } from "./evaluate.ts";
import { openComposition } from "./composition.ts";
const comp =
  workerData.composition === "memory"
    ? null
    : await openComposition(workerData.composition, workerData.lane, workerData.scope);
const port = parentPort!;
const pins = await loadW0Pins();
const pending = new Map<number, (v: any) => void>();
port.on("message", async (msg) => {
  if (msg.type === "rows") {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.type !== "page") return;
  try {
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
    const byEntity = new Map<string, any[]>();
    for (const row of page.rows) {
      const a = byEntity.get(row.entityId) ?? [];
      a.push(row);
      byEntity.set(row.entityId, a);
    }
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
      result.push({ subject, world, output: r.output, record: r.record });
    }
    const bytes = new TextEncoder().encode(canonical(result));
    port.postMessage(
      {
        type: "result",
        id: msg.id,
        bytes: bytes.buffer,
        position: page.position,
        epoch: page.epoch,
        timing: {
          readWallMs,
          readRequests: measured?.requests ?? page.timing?.readRequests ?? null,
          responseBytes: measured?.responseBytes ?? null,
          gatewayMicros: measured?.gatewayHeaders ? measured.gatewayMicros : null,
          rows: page.rows.length,
          decodeWallMs,
          evaluateWallMs,
        },
        cpu: { read: readCpu, decode: decodeCpu, kernel: kernelCpu },
        cpuScope: (process as any).threadCpuUsage ? "thread" : "process-overlapping",
        elu: performance.eventLoopUtilization(start),
      },
      [bytes.buffer],
    );
  } catch (error: any) {
    port.postMessage({ type: "error", id: msg.id, error: String(error?.stack ?? error) });
  }
});
