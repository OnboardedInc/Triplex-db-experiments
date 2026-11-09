// [EXP-NSR] Why: identical P3M source/trace is exercised over RPC with isolated candidate roles. Rejected: a second hand-written ledger whose equality only checks itself.
import { prepare, openReader, openFeed } from "./p3-source.mjs";
import { adapter, host, core, positions, lagSample } from "../../lib/p3.mjs";
import { rpc } from "../../ns-driver/rpc.mjs";
export async function openNsRole(role, c) {
  if (role === "broker") {
    const producer = await prepare(c),
      native = await openFeed(c),
      feed = adapter(c, native);
    let expected = 1;
    return {
      async commit({ command }) {
        if (command.index !== expected++) throw Error("fixture trace order");
        await producer.offer(command.index);
        if (command.index === 4) producer.finish();
        return {
          commandId: `cmd-${command.index}`,
          status: command.index === 2 ? "lost-ack" : "committed",
          ...(command.index === 2
            ? {}
            : {
                receipt: {
                  position: String(command.index),
                  epoch: "0",
                  txId: `tx-${command.index}`,
                },
              }),
        };
      },
      async feedPage({ cursor }) {
        return feed.poll(cursor);
      },
      async close() {
        await native.close();
        await producer.close();
      },
    };
  }
  if (role === "readers") {
    const reader = await openReader(c);
    return { read: () => reader.pull(), pull: () => reader.pull(), close: () => reader.close() };
  }
  const native = await openFeed(c),
    store = new host.SqliteConsumerStore(c.storeFile),
    records = host.openPublicationReader(c.publicationFile);
  const pages = [],
    samples = [],
    clock = host.openHostFeedClock();
  let cursor = c.startCursor;
  const snapshot = () => ({
    runId: c.runId,
    pages,
    samples,
    checkpoint: store.checkpoint(c.runId),
    pragmas: store.pragmas(),
  });
  return {
    async consumerControl({ action }) {
      if (action === "start") return { started: true };
      if (action === "step") {
        const page = await rpc(c.broker, c.runId, "feedPage", { cursor });
        store.apply(c.runId, store.checkpoint(c.runId), page, await native.affected(page));
        const keys = positions(c.source, page.entries),
          durable = keys.length ? host.captureFeedInstant(clock, keys[0]) : null;
        for (const key of keys) {
          const pub = records.get(key);
          samples.push(lagSample(pub, { ...durable, ...key }, pub, await native.isBurst(key)));
        }
        pages.push(page);
        cursor = page.cursor;
      }
      return snapshot();
    },
    async close() {
      records.close();
      store.close();
      await native.close();
    },
  };
}
