import assert from "node:assert/strict";
import fs from "node:fs";
import { openComposition } from "../../../bench/lib/composition.ts";
import { canonical } from "../../../bench/lib/w0-world.ts";
import { width } from "./census.ts";
import { Notices, type Tail } from "./journal.ts";
import { type Ack, type Store, hash, unpack } from "./store.ts";

export interface PublicationBytes {
  changed: readonly unknown[];
  retired: readonly unknown[];
  guards: readonly unknown[];
  owed: readonly unknown[];
}
const sections = ["changed", "retired", "guards", "owed"] as const;

// Proposed shared verification format for a physical publication. The host may
// commit a lossless compressed representation along with its native marker.
interface Manifest {
  format: "notice-publication/1";
  epoch: string;
  assertion: string;
  recipe: string;
  position: number;
  txId: string;
  chunks: string[];
}

export const publicationManifest = (event: number) => "publication:" + event;
export const publicationChunk = (event: number, chunk: number) =>
  publicationManifest(event) + ":" + chunk;

export async function captureDeadlineCut(
  reader: Notices,
  offlineRecipient: Store,
  ingress: number,
  recipientPositionBefore: number,
) {
  assert(reader.db.store.scopeName !== offlineRecipient.scopeName);
  const position = await reader.db.head();
  const elapsedMs = performance.now() - ingress;
  assert(elapsedMs >= 0 && elapsedMs < 1000, "Publication deadline elapsed before the native cut");
  assert.equal(await offlineRecipient.currentPosition(), recipientPositionBefore, "Receiver moved");
  return { scope: reader.db.store.scopeName, position, elapsedMs };
}

export async function assertDeadlinePublication(
  reader: Notices,
  cut: Awaited<ReturnType<typeof captureDeadlineCut>>,
  offer: {
    event: number;
    request: string;
    command: string;
    receipt: Ack;
    validTime: string;
    release: string;
    census: string;
    expected: PublicationBytes;
  },
) {
  const db = reader.db;
  assert(
    db.store.scopeName === cut.scope &&
      cut.elapsedMs >= 0 &&
      cut.elapsedMs < 1000 &&
      offer.receipt.position <= cut.position,
  );
  const [published, head, original, stored] = await Promise.all([
    reader.event(offer.event, cut.position),
    db.get<Tail>("tail", cut.position),
    db.store.transactionByCommand(offer.command),
    db.row<Manifest>(publicationManifest(offer.event), cut.position),
  ]);
  assert(original.ok && original.value);
  assert(
    published.value.kind === "activation" &&
      published.value.request === offer.request &&
      published.value.nextHash === offer.release &&
      published.value.validTime === offer.validTime &&
      published.value.census.members === offer.census &&
      head.value.epoch === published.value.epoch &&
      head.value.from === published.value.from &&
      (head.value.custom?.hash ?? head.value.release) ===
        (published.value.definition ? offer.release : published.value.next) &&
      head.value.sequence >= published.value.sequence &&
      published.at === offer.receipt.position &&
      original.value.position === published.at &&
      original.value.commandId === offer.command &&
      original.value.txId === offer.receipt.txId &&
      original.value.changes.some(
        (c: any) =>
          c.op === "assert" &&
          c.tripleId === published.id &&
          c.entityId === db.prefix + "event:" + offer.event &&
          c.value.value === canonical(published.value),
      ),
    "Publication identity or live release disagrees at the deadline cut",
  );
  // [DX-STG1] Why: the publication must be recoverable from actual persisted
  // changes and notice bytes at this cut. Rejected: deriving a fresh outbox
  // from a release recipe during or after verification.
  assert(stored, "Missing physical publication at the deadline cut");
  const m = stored.value;
  assert(
    m.format === "notice-publication/1" &&
      m.epoch === published.value.epoch &&
      m.assertion === published.id &&
      m.recipe === hash(published.value) &&
      m.position === published.at &&
      m.txId === offer.receipt.txId &&
      published.at <= stored.at &&
      Array.isArray(m.chunks),
    "Physical publication is bound to a different event",
  );
  const observed: Record<(typeof sections)[number], unknown[]> = {
    changed: [],
    retired: [],
    guards: [],
    owed: [],
  };
  for (let offset = 0; offset < m.chunks.length; offset += width) {
    const keys = m.chunks
      .slice(offset, offset + width)
      .map((_, i) => publicationChunk(offer.event, offset + i));
    const rows = await db.rows<string>(keys, cut.position);
    for (const [i, key] of keys.entries()) {
      const piece = rows.get(key);
      assert(
        piece && published.at <= piece.at && piece.at <= stored.at,
        "Missing or late physical publication row",
      );
      const bytes = unpack<PublicationBytes>(piece.value);
      assert.equal(hash(bytes), m.chunks[offset + i], "Physical publication checksum mismatch");
      for (const field of sections) {
        assert(Array.isArray(bytes[field]));
        observed[field].push(...bytes[field]);
      }
    }
  }
  for (const field of sections)
    assert.equal(
      canonical(observed[field]),
      canonical(offer.expected[field]),
      "Physical publication " + field + " differs from the independent oracle",
    );
}

if (process.argv[1] === import.meta.filename) {
  const {
    cut,
    offer,
    account,
    inputs,
  }: {
    cut: Parameters<typeof assertDeadlinePublication>[1];
    offer: Parameters<typeof assertDeadlinePublication>[2];
    account: string;
    inputs: string;
  } = JSON.parse(fs.readFileSync(0, "utf8"));
  assert(cut.scope && process.env.NOTIFY_NATIVE === "1");
  const store = await openComposition("reach", "datomic", cut.scope);
  try {
    const unavailable = async (): Promise<never> => {
      throw Error("Evaluation is unavailable in the snapshot reader");
    };
    await assertDeadlinePublication(
      new Notices(store, account, { identity: inputs, roster: unavailable, worlds: unavailable }),
      cut,
      offer,
    );
  } finally {
    await store.close();
  }
}
