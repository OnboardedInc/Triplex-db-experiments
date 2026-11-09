import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { canonical, reachableRows, sha256, worldOf } from "./w0-world.ts";
import { evaluateW0, loadW0Pins } from "./evaluate.ts";
import { openComposition } from "./composition.ts";
const comp =
  workerData.rpcReads || workerData.composition === "memory"
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
    const abs = () => performance.timeOrigin + performance.now();
    const tl: any = { start: abs() };
    let c = cpu();
    const page = comp
      ? await comp.sweepPage(msg.subjects, msg.basis)
      : await new Promise<any>((resolve) => {
          pending.set(msg.id, resolve);
          port.postMessage({ type: "read", id: msg.id, subjects: msg.subjects, basis: msg.basis });
        });
    if (page.error) throw new Error(page.error);
    const readCpu = diff(c, cpu());
    tl.readEnd = abs();
    let decodeCpu = 0,
      kernelCpu = 0;
    const result: any[] = [];
    const byEntity = new Map<string, any[]>();
    for (const row of page.rows) {
      const a = byEntity.get(row.entityId) ?? [];
      a.push(row);
      byEntity.set(row.entityId, a);
    }
    for (const [si, subject] of (msg.subjects as string[]).entries()) {
      c = cpu();
      const world = worldOf(subject, reachableRows([subject], page.rows, byEntity));
      decodeCpu += diff(c, cpu());
      c = cpu();
      const r = await evaluateW0(world, msg.release, msg.basis, pins, msg.activations);
      kernelCpu += diff(c, cpu());
      if ("error" in r) throw new Error(subject + ": " + r.error);
      // [EXP-P5N] Why: parsing every subject's full world on the main thread cost 0.5 to 1.0 ms per subject; every subject returns the sha256 of its canonical world, and the world itself only for the sampled ones (the G2 oracle sample).
      // Rejected: dropping the world from every record (G2 needs the exact world bytes the kernel saw).
      result.push({
        subject,
        worldSha256: sha256(canonical(world)),
        ...(msg.sample === undefined || msg.sample[si] ? { world } : {}),
        output: r.output,
        record: r.record,
      });
    }
    tl.kernelEnd = abs();
    const bytes = new TextEncoder().encode(canonical(result));
    tl.encodeEnd = abs();
    port.postMessage(
      {
        type: "result",
        id: msg.id,
        bytes: bytes.buffer,
        position: page.position,
        epoch: page.epoch,
        cpu: { read: readCpu, decode: decodeCpu, kernel: kernelCpu },
        store: page.store,
        cpuScope: (process as any).threadCpuUsage ? "thread" : "process-overlapping",
        elu: performance.eventLoopUtilization(start),
        tl,
      },
      [bytes.buffer],
    );
  } catch (error: any) {
    port.postMessage({ type: "error", id: msg.id, error: String(error?.stack ?? error) });
  }
});
