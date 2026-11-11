import fs from "node:fs";
import { Worker, parentPort, workerData } from "node:worker_threads";
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
      const from = m.from ?? 0,
        sourcePosition = m.sourcePosition ?? m.position;
      if (
        !Number.isSafeInteger(from) ||
        from < 0 ||
        from > m.position ||
        !Number.isSafeInteger(sourcePosition) ||
        sourcePosition < m.position
      )
        throw Error("invalid journal range");
      if (!Number.isSafeInteger(m.position) || m.position < 0) throw Error("invalid journal cut");
      const waitStart = performance.now();
      while ((await comp.currentPosition()) < sourcePosition) {
        if (performance.now() - waitStart > 30000) throw Error("journal cut unavailable");
        await new Promise((r) => setTimeout(r, 5));
      }
      // [DX-H8] Why: the preflight still spent 43 s/1k at ~107% client CPU while the read peer used ~12%.
      // Rejected: concurrent HTTP promises on one isolate (the SDK envelope decoder remained serial).
      if (!workerData.shard && m.position - from > 1000) {
        const children: Worker[] = [];
        const width = Math.ceil((m.position - from) / 4);
        try {
          const jobs = [];
          for (let start = from, shard = 0; start < m.position; start += width, shard++) {
            const end = Math.min(m.position, start + width),
              part = m.file ? m.file + ".part-" + shard : undefined;
            const child = new Worker(new URL("./w0-journal-worker.ts", import.meta.url), {
              workerData: { ...workerData, shard: true },
            });
            children.push(child);
            jobs.push(
              new Promise<any>((resolve, reject) => {
                let received = false;
                child.on("error", reject);
                child.on("exit", (code) => {
                  if (!received) reject(Error("journal shard exited " + code));
                });
                child.on("message", async (message) => {
                  if (message.type === "ready")
                    child.postMessage({
                      ...m,
                      from: start,
                      position: end,
                      sourcePosition,
                      file: part,
                    });
                  else if (message.type === "result") {
                    received = true;
                    resolve({ ...message.result, part });
                  } else if (message.type === "error") {
                    received = true;
                    reject(Error(message.error));
                  } else if (message.type === "feed" || message.type === "head") {
                    try {
                      const value =
                        message.type === "feed"
                          ? await comp.feedPage(message.after, message.limit)
                          : await comp.currentPosition();
                      child.postMessage({ type: message.type + "-result", id: message.id, value });
                    } catch (error) {
                      child.postMessage({
                        type: message.type + "-result",
                        id: message.id,
                        error: String(error),
                      });
                    }
                  }
                });
              }),
            );
          }
          const parts = await Promise.all(jobs),
            entities = m.entities ? new Set<string>() : undefined;
          let position = from,
            assertions = 0,
            retired = 0,
            requests = 0,
            childCpuMs = 0;
          for (const part of parts) {
            if (part.from !== position || part.position !== Math.min(m.position, position + width))
              throw Error("journal shard boundary mismatch");
            position = part.position;
            assertions += part.assertions;
            retired += part.retired;
            requests += part.requests;
            childCpuMs += part.cpuMs;
            for (const entity of part.entities ?? []) entities?.add(entity);
            if (part.part && fs.existsSync(part.part)) {
              fs.appendFileSync(m.file, fs.readFileSync(part.part));
              fs.unlinkSync(part.part);
            }
          }
          if (position !== m.position || (await comp.currentPosition()) !== sourcePosition)
            throw Error("source changed during sharded journal scan");
          const cpu = process.threadCpuUsage(cpuStart);
          port.postMessage({
            type: "result",
            id: m.id,
            result: {
              from,
              position,
              assertions,
              retired,
              requests,
              ...(entities ? { entities: [...entities] } : {}),
              wallMs: performance.now() - start,
              cpuMs: (cpu.user + cpu.system) / 1000 + childCpuMs,
              decodingWorkers: children.length,
            },
          });
        } finally {
          await Promise.all(children.map((child) => child.terminate()));
        }
        return;
      }
      const entities = m.entities ? new Set<string>() : undefined;
      let position = from,
        assertions = 0,
        retired = 0,
        requests = 0;
      // [DX-H8] Why: dense Triplex positions permit disjoint indexed reads at one explicit, quiescent cut.
      // Rejected: sampling, accepting a gap, counting ACKs, or returning later-than-cut journal entries.
      for (let offset = from; offset < m.position; offset += workerData.shard ? 1000 : 4000) {
        const pages = [];
        for (
          let after = offset;
          after < Math.min(m.position, offset + (workerData.shard ? 1000 : 4000));
          after += 1000
        ) {
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
      if ((await comp.currentPosition()) !== sourcePosition)
        throw Error("source changed during journal scan");
      const cpu = process.threadCpuUsage(cpuStart);
      port.postMessage({
        type: "result",
        id: m.id,
        result: {
          from,
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
