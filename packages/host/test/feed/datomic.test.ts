import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  datomicChangeFeed,
  SqliteConsumerStore,
  type DatomicLogPage,
} from "@triplex-build/triplex-host/feed";
import {
  auditFeed,
  auditResume,
  requireGapMutationCaught,
} from "@triplex-build/triplex-testkit/feed";
import type { FeedEntry } from "@triplex-build/triplex/feed";

// [EXP-DF01] Why: the hand-derived expected identities are independent of gateway JSON output.
// Rejected: using the adapter delivery as the expected prefix (a gap would disappear twice).
const expected: FeedEntry[] = [
  {
    stream: "datomic/db/g1",
    epoch: "0",
    offset: "100",
    kind: "commit",
    transactions: [
      {
        positions: ["3", "7"],
        txIds: ["tx3", "tx7"],
        operationId: "op7",
        commandIds: ["cmd7"],
        stamp: "7000",
        stampStatus: "decided",
        changes: [
          {
            op: "assert",
            entity: "subject",
            attribute: "status",
            assertionId: "fact-1",
            position: "3",
            validFrom: 0,
            validTo: 20,
          },
        ],
      },
    ],
  },
  {
    stream: "datomic/db/g1",
    epoch: "0",
    offset: "105",
    kind: "commit",
    transactions: [
      {
        positions: ["9"],
        txIds: ["tx9"],
        operationId: "op9",
        commandIds: [],
        stamp: "9000",
        stampStatus: "decided",
        changes: [
          {
            op: "retract",
            entity: "subject",
            attribute: "status",
            assertionId: "fact-1",
            position: "9",
            validFrom: 0,
            validTo: 20,
          },
        ],
      },
    ],
  },
];
const fixture = () =>
  JSON.parse(
    fs.readFileSync(
      new URL("../../../../lab/experiments/EXP-DF01/recorded-page.json", import.meta.url),
      "utf8",
    ),
  ) as DatomicLogPage;
const make = (transform: (p: DatomicLogPage) => DatomicLogPage = (p) => p) =>
  datomicChangeFeed("d/db/g1", {
    database: "s2-Zg",
    stream: "datomic/db/g1",
    epoch: "0",
    read: async (fromT, limit) => {
      const rows = fixture()
        .rows.filter((r) => BigInt(r.t) >= BigInt(fromT))
        .slice(0, limit);
      return transform({
        database: "s2-Zg",
        fromT,
        rows,
        nextT: rows.length ? String(BigInt(rows.at(-1)!.t) + 1n) : fromT,
      });
    },
  });
describe("DF01 Datomic native adapter", () => {
  it("runs unchanged FD01 content, order, gap, resume and mutation audits", async () => {
    const feed = make();
    const first = await feed.poll({ source: feed.source, token: "100" }, 2);
    const second = await feed.poll(first.cursor, 2);
    const expectation = { entries: expected, source: feed.source, finalToken: "106" };
    expect(auditFeed([first, second], expectation)).toEqual({ positions: 3, resolutions: 2 });
    requireGapMutationCaught([first, second], expectation);
    auditResume(
      first.entries,
      (await make().poll({ source: feed.source, token: "100" }, 2)).entries,
    );
    auditResume(second.entries, (await make().poll(first.cursor, 2)).entries);
    expect((await feed.poll(second.cursor)).entries).toEqual([]);
    expect(fixture().rows[1]).toEqual({ t: "101", kind: "skipped", reason: "non-triplex" });
    expect(() => auditFeed([first, first, second], expectation)).toThrow();
    const changed = structuredClone(second);
    (changed.entries[0] as any).transactions[0].changes[0].attribute = "wrong";
    expect(() => auditFeed([first, changed], expectation)).toThrow();
  });
  it("uses the unchanged host SQLite store and idempotent replay", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "DF01-"));
    const file = path.join(dir, "consumer.sqlite");
    let store = new SqliteConsumerStore(file);
    try {
      const feed = make();
      const cursor = { source: feed.source, token: "100" };
      const page = await feed.poll(cursor);
      const affected = [
        { epoch: "0", position: "3", subject: "subject" },
        { epoch: "0", position: "9", subject: "subject" },
      ];
      store.apply("c", null, page, affected);
      store.close();
      store = new SqliteConsumerStore(file);
      expect(store.checkpoint("c")).toEqual(page.cursor);
      store.apply("c", page.cursor, page, affected);
      expect(store.effects("c")).toEqual(affected);
      expect(store.affected("c")).toEqual(affected);
    } finally {
      store.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects foreign sources, databases, cursors, reordered rows, payloads and checkpoint jumps", async () => {
    await expect(make().poll({ source: "other", token: "100" })).rejects.toThrow();
    await expect(make().poll({ source: "d/db/g1", token: "01" })).rejects.toThrow();
    for (const mutate of [
      (p: DatomicLogPage) => ({ ...p, database: "other" }),
      (p: DatomicLogPage) => ({ ...p, nextT: "999" }),
      (p: DatomicLogPage) => ({ ...p, fromT: "99" }),
      (p: DatomicLogPage) => ({ ...p, rows: [...p.rows].reverse() }),
      (p: DatomicLogPage) => {
        (p.rows[0] as any).transaction.changes[0].value = "private";
        return p;
      },
    ])
      await expect(make(mutate).poll({ source: "d/db/g1", token: "100" })).rejects.toThrow();
  });
});
