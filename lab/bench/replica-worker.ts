import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { openComposition } from "./lib/composition.ts";
import { ReplicaReadHost } from "./lib/replica-reads.ts";
const comp = await openComposition(cfg.composition, "datomic", cfg.scope);
try {
  const host = await ReplicaReadHost.open(cfg.scope, cfg.roots, comp, cfg.initial, cfg.feed, cfg.historyBytes, cfg.peer);
  // [DX-R3] Why: subscribe and publish the initial cut in one turn; no journal can fall between image and deltas.
  // Rejected: requesting a snapshot and subscribing in separate parent messages.
  const readers = new Set<import("node:worker_threads").MessagePort>();
  let bytes = host.replica.bytes;
  host.subscribe(delta => {
    bytes = delta.reset ? host.replica.bytes : bytes + delta.changes.reduce((sum, [, previous, entity]) => sum + (entity.byteLength ?? entity.buffer.byteLength) - (previous ? previous.byteLength ?? previous.buffer.byteLength : 0), 0);
    const at = performance.timeOrigin + performance.now();
    port!.postMessage({ type: "delta", delta, bytes, at });
    for (const reader of readers) reader.postMessage({ type: "replica-delta", delta, sentAt: at });
  });
  port!.postMessage({ type: "ready", image: host.index.image(), bytes: host.replica.bytes });
  port!.on("message", async m => {
    if (m.type === "connect") {
      // [DX-R3] Why: publish image then ordered deltas on the same port without writer-thread cloning.
      // Rejected: routing every reader's slab metadata through the commit issuer.
      m.port.postMessage({ type: "replica-image", image: host.index.image() });
      readers.add(m.port);
      m.port.on("close", () => readers.delete(m.port));
    }
    if (m.type === "close") { await host.close(); await comp.close(); for (const reader of readers) reader.close(); port!.postMessage({ type: "closed" }); port!.close(); }
  });
} catch (error) { port!.postMessage({ type: "error", message: String(error) }); await comp.close(); }
