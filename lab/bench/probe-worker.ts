import { flushTracing } from "./lib/tracing.ts";
import { parentPort as port, workerData as cfg } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { openComposition } from "./lib/composition.ts";
import { observeDatomicPublication } from "./lib/datomic-publication.ts";
import { openHostFeedClock, openPublicationWriter } from "./lib/feed.ts";
const now = () => performance.timeOrigin + performance.now();
const source = JSON.stringify({ route: "A0-control", dir: cfg.dir, epoch: cfg.epoch });
const writer = openPublicationWriter(
  path.join(cfg.dir, "publication.db"),
  source,
  source,
  openHostFeedClock(),
);
const publications = new Map<number, any>();
// [DX-H4] Why: probe commits retain the same native publication witness on their committing thread.
// Rejected: publishing a replacement witness when the main thread receives the worker response.
observeDatomicPublication((position, operationId, diagnostics) => {
  const publicationStartedAt = now();
  writer.publish({ source, stream: source, epoch: "0", position: String(position) }, operationId);
  publications.set(position, {
    publicationStartedAt,
    publicationDurableAt: now(),
    ...(diagnostics === undefined ? {} : { diagnostics }),
  });
});
const comp = await openComposition(cfg.composition, cfg.lane, cfg.scope);
port!.on("message", async (m) => {
  try {
    if (m.type === "close") {
      await comp.close();
      writer.close();
      await flushTracing();
      port!.postMessage({ id: m.id });
      port!.close();
      return;
    }
    const transactCalledAt = now();
    const result = await comp.transact(m.operations, m.meta);
    const transactReturnedAt = now();
    const publication = result.ok ? publications.get(result.value.position) : undefined;
    if (result.ok) publications.delete(result.value.position);
    const value = result.ok
      ? result
      : {
          ok: false,
          tag: result.tag,
          error: {
            message: String(result.error?.message ?? ""),
            transactionId: result.error?.transactionId,
          },
        };
    port!.postMessage({
      id: m.id,
      value: { result: value, timing: { transactCalledAt, transactReturnedAt, ...publication } },
    });
  } catch (error) {
    port!.postMessage({ id: m.id, error: String(error) });
  }
});
port!.postMessage({ ready: true });
