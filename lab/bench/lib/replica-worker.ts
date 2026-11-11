import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { openComposition } from "./composition.ts";
import { ReplicaReadHost, ReplicaReader, replicaReply } from "./replica-reads.ts";
const comp = await openComposition(cfg.composition, "datomic", cfg.scope);
try {
  const host = await ReplicaReadHost.open(cfg.scope, cfg.roots, comp, cfg.initial, cfg.feed, cfg.historyBytes, cfg.peer, cfg.sourceEndpoint);
  // [DX-R3] Why: subscribe and publish the initial cut in one turn; no journal can fall between image and deltas.
  // Rejected: requesting a snapshot and subscribing in separate parent messages.
  const local = new ReplicaReader(cfg.historyBytes, host.index);
  const indexStats = () => ({ floor: host.index.floor, position: host.index.position, historyBytes: host.index.historyBytes, positions: host.index.positions, maxBytes: host.index.maxBytes });
  const readers = new Set<import("node:worker_threads").MessagePort>();
  let bytes = host.replica.bytes;
  host.subscribe(delta => {
    bytes = delta.reset ? host.replica.bytes : bytes + delta.changes.reduce((sum, [, previous, entity]) => sum + (entity.byteLength ?? entity.buffer.byteLength) - (previous ? previous.byteLength ?? previous.buffer.byteLength : 0), 0);
    const at = performance.timeOrigin + performance.now();
    local.notify();
    port!.postMessage({ type: "progress", index: indexStats(), valid: delta.valid, bytes, at });
    for (const reader of readers) reader.postMessage({ type: "replica-delta", delta, sentAt: at });
  });
  port!.postMessage({ type: "ready", index: indexStats(), bytes: host.replica.bytes });
  port!.on("message", async m => {
    if (m.type === "pull") {
      try {
        const result = await local.pullAt(m.root, m.basis, () => comp.pull(m.root, m.basis));
        // [DX-R3] Why: return the real immutable world across the worker boundary for low-volume RYOW calls.
        // Rejected: fabricating an empty triples array beside a nonempty cached digest.
        port!.postMessage({ type: "reply", id: m.id, value: replicaReply(result) });
      } catch (error) { port!.postMessage({ type: "reply", id: m.id, error: String(error) }); }
    }
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
