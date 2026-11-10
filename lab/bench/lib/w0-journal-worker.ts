import fs from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { openComposition } from "./composition.ts";
import { canonical } from "./w0-world.ts";
const port = parentPort!;
const native =
  workerData.composition === "memory"
    ? null
    : await openComposition(workerData.composition, workerData.lane, workerData.scope);
const pending = new Map<number, (v: any) => void>();
let next = 0;
const bridge = async (type: string, args: any = {}) => {
  const id = next++;
  const m: any = await new Promise((resolve) => {
    pending.set(id, resolve);
    port.postMessage({ type, id, ...args });
  });
  if (m.error) throw Error(m.error);
  return m.value;
};
const comp = native ?? {
  feedPage: (after: number, limit: number) => bridge("feed", { after, limit }),
  currentPosition: () => bridge("head"),
};
let tail = Promise.resolve();
port.on("message", (m) => {
  if (m.type === "feed-result" || m.type === "head-result") {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
    return;
  }
  if (m.type !== "scan") return;
  tail = tail.then(async () => {
    const start = performance.now(),
      cpuStart = process.threadCpuUsage();
    try {
      if (!Number.isSafeInteger(m.position) || m.position < 0) throw Error("invalid journal cut");
      const waitStart = performance.now();
      while ((await comp.currentPosition()) < m.position) {
        if (performance.now() - waitStart > 30000) throw Error("journal cut unavailable");
        await new Promise((r) => setTimeout(r, 5));
      }
      const entities = m.entities ? new Set<string>() : undefined;
      let position = 0,
        assertions = 0,
        retired = 0,
        requests = 0;
      // [DX-H8] Why: dense Triplex positions permit disjoint indexed reads at one explicit, quiescent cut.
      // Rejected: sampling, accepting a gap, counting ACKs, or returning later-than-cut journal entries.
      for (let offset = 0; offset < m.position; offset += 4000) {
        const pages = [];
        for (let after = offset; after < Math.min(m.position, offset + 4000); after += 1000) {
          requests++;
          pages.push(comp.feedPage(after, 1000).then((page) => ({ after, page })));
        }
        for (const { after, page } of await Promise.all(pages)) {
          const transactions = page.transactions.filter((tx: any) => tx.position <= m.position);
          if (transactions.length !== Math.min(1000, m.position - after))
            throw Error("journal gap/coverage");
          for (const tx of transactions) {
            if (
              tx.position !== position + 1 ||
              typeof tx.txId !== "string" ||
              !Array.isArray(tx.changes)
            )
              throw Error("journal order/identity");
            position = tx.position;
            if (m.file && tx.position > (m.retainAfter ?? 0))
              fs.appendFileSync(m.file, canonical(tx) + "\n");
            for (const c of tx.changes) {
              if (typeof c.entityId !== "string") throw Error("journal missing entity identity");
              entities?.add(c.entityId);
              if (c.op === "assert") assertions++;
              else if (c.op === "retract") retired++;
              else throw Error("journal unknown operation");
            }
          }
        }
      }
      if ((await comp.currentPosition()) !== m.position)
        throw Error("source changed during journal scan");
      const cpu = process.threadCpuUsage(cpuStart);
      port.postMessage({
        type: "result",
        id: m.id,
        result: {
          position,
          assertions,
          retired,
          ...(entities ? { entities: [...entities] } : {}),
          requests,
          wallMs: performance.now() - start,
          cpuMs: (cpu.user + cpu.system) / 1000,
        },
      });
    } catch (error: any) {
      port.postMessage({ type: "error", id: m.id, error: String(error.stack ?? error) });
    }
  });
});
port.postMessage({ type: "ready" });
