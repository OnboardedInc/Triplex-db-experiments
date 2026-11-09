import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { canonical, reachableRows, sha256, worldOf } from "./w0-world.ts";
import { decodeHostRow } from "./host-row.ts";
import { evaluateW0, loadW0Pins } from "./evaluate.ts";
import { openComposition } from "./composition.ts";
// [EXP-P5N] Why: D3. With `direct`, this thread owns its readonly SQLite connection (same gate as the owner, so the checkpointer still counts it),
// does the BFS, the native-to-reference mapping, the world build and the kernel in one thread: no per-page row transfer through the owner's main thread
// (two structured clones of about 28.5k row objects, plus the main-thread row mapping). Rejected: a separate sweep process (the gate counter cannot be shared across processes).
const direct = workerData.direct as
  | { file: string; gate: SharedArrayBuffer; natives: SharedArrayBuffer }
  | undefined;
const reader = direct ? (await import("../../../packages/qlever/dist/index.js")).openSweepReader(direct.file, direct.gate) : null;
const natives = direct ? new Float64Array(direct.natives) : null;
/** Exact native-to-reference, as PositionMap.reference: natives are strictly increasing and reference r has native natives[r-1]. */
const reference = (native: number): number => {
  if (native === 0) return 0;
  let lo = 0,
    hi = natives!.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1,
      v = natives![mid]!;
    if (v === native) return mid + 1;
    if (v < native) lo = mid + 1;
    else hi = mid - 1;
  }
  throw new Error("unmapped native receipt position");
};
/** Largest reference whose native position is at most `native` (PositionMap.referenceCut). */
const referenceCut = (native: number): number => {
  let lo = 0,
    hi = natives!.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (natives![mid - 1]! <= native) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};
async function directPage(subjects: readonly string[], basis: { position: number; validAt: number }) {
  if (!Number.isSafeInteger(basis.position) || basis.position < 1 || basis.position > natives!.length)
    throw new Error("unmapped reference position");
  const nativeBasis = natives![basis.position - 1]!;
  const page: any = await reader!.sweep({ basis: nativeBasis, entities: subjects, validAt: basis.validAt });
  const rows = page.rows.map((r: any) => ({
    ...decodeHostRow(r),
    ...(r.attribute === ":_tx/position" && r.value_type === "number"
      ? { value: { type: "number", value: reference(r.value_number!) } }
      : {}),
    position: reference(r.recorded_position),
  }));
  return {
    rows,
    position: referenceCut(Math.min(page.snapshot.position, natives![natives!.length - 1]!)),
    epoch: String(page.snapshot.epoch),
    store: { snapshot: page.snapshot, positionEncoding: "native", nativeBasis, transactionMs: page.transactionMs, cpuMicros: page.cpuMicros, cpuScope: page.cpuScope },
  };
}
const comp =
  direct || workerData.rpcReads || workerData.composition === "memory"
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
  if (msg.type === "close") {
    // [EXP-P5N] Why: close the nested SQLite reader on its own thread before the sweep thread is terminated, so no reader is cut off mid-request.
    try {
      await reader?.close();
    } finally {
      port.postMessage({ type: "closed" });
    }
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
    const page = direct
      ? await directPage(msg.subjects, msg.basis)
      : comp
        ? await comp.sweepPage(msg.subjects, msg.basis)
        : await new Promise<any>((resolve) => {
            pending.set(msg.id, resolve);
            port.postMessage({ type: "read", id: msg.id, subjects: msg.subjects, basis: msg.basis });
          });
    if (page.error) throw new Error(page.error);
    // In direct mode the SQLite work runs on the reader's own thread: this thread's CPU here is the row mapping and clone receive.
    const readCpu = diff(c, cpu());
    tl.readEnd = abs();
    let decodeCpu = 0,
      kernelCpu = 0,
      hashCpu = 0;
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
      c = cpu();
      // [EXP-P5N] Why: parsing every subject's full world on the main thread cost 0.5 to 1.0 ms per subject; every subject returns the sha256 of its canonical world, and the world itself only for the sampled ones (the G2 oracle sample).
      // Rejected: dropping the world from every record (G2 needs the exact world bytes the kernel saw).
      const worldSha256 = sha256(canonical(world));
      hashCpu += diff(c, cpu());
      result.push({
        subject,
        worldSha256,
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
        cpu: { read: readCpu, decode: decodeCpu, kernel: kernelCpu, hash: hashCpu },
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
