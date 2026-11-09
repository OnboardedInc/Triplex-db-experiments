// [EXP-P3M] Why: independently authored source records include a lost ACK and an abort resolution.
// Rejected: enumerating expected positions by re-reading the adapter's own delivered pages.
import fs from "node:fs";
import path from "node:path";
import { host, sleep } from "../../lib/p3.mjs";
const sourceFile = (c) => path.join(c.attemptDir, "fake-source.json");
const read = (c) => JSON.parse(fs.readFileSync(sourceFile(c), "utf8"));
const write = (c, value) => {
  fs.writeFileSync(sourceFile(c) + ".tmp", JSON.stringify(value));
  fs.renameSync(sourceFile(c) + ".tmp", sourceFile(c));
};
export async function prepare(c) {
  const clock = host.openHostFeedClock();
  const writer = host.openPublicationWriter(c.publicationFile, c.source, c.stream, clock);
  const state = { resolutions: [], entries: [], publications: [], cursor: { after: 0 } };
  write(c, state);
  const acks = [];
  async function offer(n) {
    const subject = c.trace?.[n - 1]?.command.subject ?? `subject-${n}`;
    const key = { source: c.source, stream: c.stream, epoch: "0", position: String(n) };
    const record = c.missingInstant && n === 2 ? { atNs: "0" } : writer.publish(key, `tx-${n}`);
    state.publications.push({
      key,
      publicationId: `tx-${n}`,
      kind: "watermarkAt",
      watermarkAt: record.atNs,
      burst: n >= 3,
    });
    state.resolutions.push({
      kind: "commit",
      epoch: 0,
      lsn: n,
      transacts: [
        {
          positions: [n],
          operationId: `tx-${n}`,
          txIds: [`tx-${n}`],
          commandIds: [`cmd-${n}`],
          changes: [
            {
              op: "assert",
              entity: subject,
              attribute: ":test/identity",
              validFrom: 0,
              validTo: null,
              position: n,
              assertionId: `assertion-${n}`,
            },
          ],
        },
      ],
    });
    // Expected identities are authored separately from the broker adapter input above.
    state.entries.push({
      kind: "commit",
      stream: c.stream,
      epoch: "0",
      offset: String(n),
      transactions: [
        {
          positions: [String(n)],
          operationId: `tx-${n}`,
          txIds: [`tx-${n}`],
          commandIds: [`cmd-${n}`],
          stamp: null,
          stampStatus: "pending-RT01",
          changes: [
            {
              op: "assert",
              entity: subject,
              attribute: ":test/identity",
              validFrom: 0,
              validTo: null,
              position: String(n),
              assertionId: `assertion-${n}`,
            },
          ],
        },
      ],
    });
    state.cursor = { after: n };
    if (!c.batch) write(c, state);
    if (n !== 2)
      acks.push({ commandId: `cmd-${n}`, epoch: "0", position: String(n), txId: `tx-${n}` });
    if (!c.batch) await sleep(15);
  }
  function finish() {
    state.resolutions.push({ kind: "aborted", epoch: 0, lsn: 5 });
    state.entries.push({ kind: "aborted", stream: c.stream, epoch: "0", offset: "5" });
    state.cursor = { after: 5 };
    write(c, state);
  }
  return {
    offer,
    finish,
    async runWriter() {
      const start = process.hrtime.bigint();
      for (let n = 1; n <= 4; n++) {
        const atMs = c.trace?.[n - 1]?.atMs;
        if (atMs !== undefined) {
          const wait = atMs - Number(process.hrtime.bigint() - start) / 1e6;
          if (wait > 0) await sleep(wait);
        }
        await offer(n);
      }
      finish();
      return acks;
    },
    async finalPrefix() {
      return {
        runId: c.runId,
        source: c.source,
        stream: c.stream,
        entries: state.entries,
        publications: state.publications,
        cursor: { source: c.source, token: JSON.stringify(state.cursor) },
      };
    },
    async close() {
      writer.close();
    },
  };
}
export async function openFeed(c) {
  return {
    broker: {
      transport: "reader-worker",
      async request(r) {
        const state = read(c);
        return {
          cursor: state.cursor,
          resolutions: state.resolutions.filter((x) => x.lsn > r.cursor.after),
        };
      },
    },
    async affected(page) {
      return page.entries.flatMap((e) =>
        e.kind === "commit"
          ? e.transactions.flatMap((t) =>
              t.changes.map((x) => ({ epoch: e.epoch, position: x.position, subject: x.entity })),
            )
          : [],
      );
    },
    async isBurst(key) {
      if (c.metadataDelayMs) await sleep(c.metadataDelayMs);
      return read(c).publications.find((p) => p.key.position === key.position).burst;
    },
    async close() {
      if (c.failConsumerClose) {
        await sleep(20);
        throw Error("planted consumer close failure");
      }
    },
  };
}
export async function openReader(c) {
  if (c.readerComposition !== "fake-source-file-pinned")
    throw Error("Fixture composition mismatch");
  return {
    async pull() {
      const snapshot = read(c);
      if (!Array.isArray(snapshot.entries)) throw Error("Bad snapshot");
      await sleep(1);
      return snapshot;
    },
    async close() {},
  };
}
