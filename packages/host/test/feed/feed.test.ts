import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  feedBytes,
  type FeedEntry,
  type FeedPage,
  type AffectedSubject,
} from "@triplex-build/triplex/feed";
import {
  SqliteConsumerStore,
  brokerChangeFeed,
  xtdbChangeFeed,
  journalChangeFeed,
  datomicChangeFeed,
  openBrokerFeedReader,
} from "@triplex-build/triplex-host/feed";
import {
  auditFeed,
  auditResume,
  requireGapMutationCaught,
  runFeedCrashConformance,
  auditFeedLag,
  auditConsumerAtomicity,
} from "@triplex-build/triplex-testkit/feed";

const dirs: string[] = [];
const temp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "CX-FD01-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
const entry: FeedEntry = {
  kind: "commit",
  stream: "s",
  epoch: "1",
  offset: "1",
  transactions: [
    {
      positions: ["1"],
      txIds: ["tx1"],
      operationId: "op1",
      commandIds: ["cmd1"],
      stamp: null,
      stampStatus: "pending-RT01",
      changes: [
        {
          op: "assert",
          entity: "subject",
          attribute: ":a",
          assertionId: "a1",
          position: "1",
          validFrom: 0,
          validTo: null,
        },
        {
          op: "erase",
          entity: "other",
          attribute: ":b",
          assertionId: "b1",
          position: "1",
          validFrom: 0,
          validTo: 10,
          erasureSeq: "1",
        },
      ],
    },
  ],
};
const page: FeedPage = {
  entries: [entry],
  cursor: { source: "tenant/db/generation/source", token: "1" },
};
const affected: AffectedSubject[] = [
  { epoch: "1", position: "1", subject: "subject" },
  { epoch: "1", position: "1", subject: "other" },
];

describe("FD01 identity-only feed", () => {
  it("canonicalizes key order and rejects value/envelope/key fields", () => {
    expect(feedBytes(entry)).toBe(feedBytes(JSON.parse(JSON.stringify(entry))));
    const numeric = structuredClone(entry) as any;
    numeric.epoch = 1;
    expect(() => feedBytes(numeric)).toThrow("Noncanonical feed coordinate");
    const poisoned = structuredClone(entry) as any;
    poisoned.transactions[0].changes[0].value = "private";
    expect(() => feedBytes(poisoned)).toThrow("Unexpected feed field");
    const missing = structuredClone(entry) as any;
    delete missing.transactions[0].changes[0].assertionId;
    expect(() => feedBytes(missing)).toThrow("Missing feed identity");
  });
  it("audits non-dense positions with abort, seal and epoch accounting and catches dropped entries", () => {
    const entries: FeedEntry[] = [
      entry,
      { stream: "s", epoch: "1", offset: "2", kind: "aborted" },
      { stream: "s", epoch: "1", offset: "3", kind: "seal", stamp: "2000" },
      { stream: "s", epoch: "2", offset: "0", kind: "epoch", previousEpoch: "1" },
    ];
    const pages = [{ ...page, entries }];
    const expected = {
      entries: structuredClone(entries),
      source: page.cursor.source,
      finalToken: "1",
    };
    expect(auditFeed(pages, expected)).toEqual({ positions: 1, resolutions: 4 });
    requireGapMutationCaught(pages, expected);
    auditResume(entries, structuredClone(entries));
    const changed = structuredClone(entries) as any;
    changed[0].transactions[0].changes[0].assertionId = "different";
    expect(() => auditResume(entries, changed)).toThrow();
  });
  it("stores affected set, keyed effects and checkpoint atomically, rejects stale writers and changed replay", () => {
    const store = new SqliteConsumerStore(path.join(temp(), "consumer.db"));
    expect(store.pragmas()).toEqual({
      journal_mode: "wal",
      synchronous: 2,
      fullfsync: 1,
      checkpoint_fullfsync: 1,
      wal_autocheckpoint: 0,
      journal_size_limit: 16777216,
      locking_mode: "normal",
    });
    expect(() =>
      store.apply("c", null, page, affected, (p) => {
        if (p === "after-effect") throw Error("stop");
      }),
    ).toThrow();
    expect(store.effects("c")).toEqual([]);
    expect(store.checkpoint("c")).toBeNull();
    store.apply("c", null, page, affected);
    store.apply("c", page.cursor, page, affected);
    expect(store.effects("c")).toHaveLength(2);
    expect(store.affected("c")).toHaveLength(2);
    expect(() => store.apply("c", null, page, affected)).toThrow("Stale");
    const changed = structuredClone(page) as any;
    changed.entries[0].transactions[0].operationId = "changed";
    expect(() => store.apply("c", page.cursor, changed, affected)).toThrow("resume bytes changed");
    expect(() =>
      store.apply("c", page.cursor, { ...page, cursor: { source: "other", token: "2" } }, affected),
    ).toThrow("source");
    store.close();
  });
  it("uses asynchronous feed ReadRequests and refuses legacy broker tuples missing identities", async () => {
    const request = async (r: any) => {
      expect(r.kind).toBe("feed");
      return {
        cursor: { lsn: 1 },
        resolutions: [
          {
            kind: "commit" as const,
            epoch: 1,
            lsn: 1,
            transacts: [
              {
                positions: [1],
                txIds: ["tx1"],
                commandIds: ["cmd1"],
                operationId: "op1",
                changes: [
                  {
                    op: "assert" as const,
                    entity: "subject",
                    attribute: ":a",
                    validFrom: 0,
                    validTo: null,
                    position: 1,
                    assertionId: "a1",
                  },
                ],
              },
            ],
          },
        ],
      };
    };
    const adapter = brokerChangeFeed(page.cursor.source, "s", {
      transport: "reader-worker",
      request,
    });
    const result = await adapter.poll({ source: page.cursor.source, token: "{}" });
    expect(result.entries[0]).toMatchObject({
      kind: "commit",
      transactions: [{ stamp: null, stampStatus: "pending-RT01" }],
    });
    const legacy = brokerChangeFeed(page.cursor.source, "s", {
      transport: "reader-worker",
      request: async (r) => {
        const p = await request(r);
        delete (p.resolutions[0]!.transacts[0]!.changes[0] as any).assertionId;
        return p;
      },
    });
    await expect(legacy.poll({ source: page.cursor.source, token: "{}" })).rejects.toThrow(
      "pending assertionId",
    );
  });
  it("runs synchronous broker IO on a reader worker", async () => {
    const file = path.join(temp(), "broker.mjs");
    fs.writeFileSync(
      file,
      `import {isMainThread} from 'node:worker_threads'; export class LogFeed { poll(cursor) {if(isMainThread)throw Error('main-thread IO');return {cursor,resolutions:[]}} }`,
    );
    const reader = openBrokerFeedReader(new URL(`file://${file}`).href, path.dirname(file));
    try {
      expect(await reader.request({ kind: "feed", cursor: { lsn: 0 }, maxBytes: 1024 })).toEqual({
        cursor: { lsn: 0 },
        resolutions: [],
      });
    } finally {
      await reader.close();
    }
    await expect(reader.request({ kind: "feed", cursor: {}, maxBytes: 1 })).rejects.toThrow(
      "closed",
    );
  });
  it("forces P2X exact tuples and requires source assertion and transaction identities", async () => {
    const adapter = xtdbChangeFeed(
      page.cursor.source,
      "s",
      {
        poll: async (_c, opts) => {
          expect(opts.exact).toBe(true);
          return {
            watermark: { msgId: 1, processed: true },
            resolutions: [
              {
                epoch: 1,
                offset: 1,
                status: "committed",
                stamp: 1000,
                operationId: "op1",
                commandIds: [],
                transacts: [{ position: 1, ordinal: 0 }],
                changes: [
                  {
                    op: "assert",
                    entity: "subject",
                    attribute: ":a",
                    validFrom: 0,
                    validTo: null,
                    ordinal: 0,
                  },
                ],
              },
            ],
          };
        },
      },
      async (_op, _ordinal, index) => (index === null ? "tx1" : "a1"),
    );
    const result = await adapter.poll({
      source: page.cursor.source,
      token: '{"msgId":0,"processed":false}',
    });
    expect(result.entries[0]).toMatchObject({
      transactions: [
        { txIds: ["tx1"], stampStatus: "pending-RT01", changes: [{ assertionId: "a1" }] },
      ],
    });
  });
  it("preserves nested P2X positions without multiplying operation-wide command claims", async () => {
    const adapter = xtdbChangeFeed(
      "x",
      "s",
      {
        poll: async () => ({
          watermark: { msgId: 42, processed: true },
          resolutions: [
            {
              epoch: 0,
              offset: 42,
              status: "committed",
              stamp: 1000,
              operationId: "group",
              commandIds: ["c1", "c2"],
              transacts: [
                { position: 10, ordinal: 0 },
                { position: 11, ordinal: 1 },
              ],
              changes: [0, 1].map((ordinal) => ({
                op: "assert" as const,
                entity: "subject",
                attribute: ":a",
                validFrom: ordinal,
                validTo: null,
                ordinal,
              })),
            },
          ],
        }),
      },
      async (_op, ordinal, i) => (i === null ? "tx" + ordinal : "a" + i),
    );
    const result = await adapter.poll({ source: "x", token: '{"msgId":0,"processed":false}' });
    expect(result.entries[0]).toMatchObject({
      transactions: [
        {
          positions: ["10", "11"],
          txIds: ["tx0", "tx1"],
          commandIds: ["c1", "c2"],
          changes: [{ position: "10" }, { position: "11" }],
        },
      ],
    });
    expect(
      auditFeed([result], {
        entries: structuredClone(result.entries),
        source: "x",
        finalToken: result.cursor.token,
      }).positions,
    ).toBe(2);
  });
  it("marks journal adapters A0 and requires a Datomic native reader", async () => {
    for (const lane of ["xtdb", "qlever", "datomic"]) {
      const adapter = journalChangeFeed(lane, lane, "0", async () => ({ transactions: [] }));
      expect(adapter.arm).toBe("A0-control");
      expect((await adapter.poll({ source: lane, token: "0" })).entries).toEqual([]);
    }
    await expect(datomicChangeFeed("d").poll({ source: "d", token: "0" })).rejects.toThrow(
      "FeedUnavailable: Datomic log reader required",
    );
  });
  it("compares broker and A0 fixture delivery with fresh independent O-REPLAY identities", async () => {
    const caseFile = fileURLToPath(
      new URL("../../../../lab/experiments/EXP-FD01/oracle.case.json", import.meta.url),
    );
    const cli = fileURLToPath(new URL("../../../../lab/oracles/replay/cli.py", import.meta.url));
    const process = spawnSync("python3", ["-I", "-B", cli, caseFile], { encoding: "utf8" });
    expect(process.status, process.stderr).toBe(0);
    const oracle = JSON.parse(process.stdout);
    expect(oracle.verdict).toBe("PASS");
    expect(oracle.commandOutcomes[2].expected.errorTag).toBe("CommandAlreadyCommittedError");
    const transactions = [
      {
        txId: "tx1",
        position: 1,
        instant: 1000,
        commandId: "c1",
        changes: [
          {
            op: "assert",
            tripleId: "a1",
            entityId: "subject",
            attribute: ":a",
            validFrom: 0,
            validTo: 100,
          },
        ],
      },
      {
        txId: "tx2",
        position: 2,
        instant: 2000,
        commandId: "c2",
        changes: [
          {
            op: "retract",
            tripleId: "a1",
            entityId: "subject",
            attribute: ":a",
            validFrom: 0,
            validTo: 100,
          },
          { op: "assert", tripleId: "a2", entityId: "subject", attribute: ":a", validFrom: 10 },
        ],
      },
    ];
    const expected: FeedEntry[] = oracle.state[0].transactions.map((tx: any) => ({
      kind: "commit",
      stream: "s",
      epoch: "0",
      offset: String(tx.position),
      transactions: [
        {
          positions: [String(tx.position)],
          txIds: [tx.txId],
          operationId: tx.txId,
          commandIds: [tx.commandId],
          stamp: null,
          stampStatus: "pending-RT01",
          changes: tx.changes.map((c: any) => ({
            op: c.op,
            entity: c.entityId,
            attribute: c.attribute,
            assertionId: c.tripleId,
            validFrom: c.validFrom,
            validTo: c.validTo ?? null,
            position: String(tx.position),
          })),
        },
      ],
    }));
    for (const lane of ["xtdb", "qlever", "datomic"]) {
      const adapter = journalChangeFeed(lane, "s", "0", async (after) => ({
        transactions: transactions.filter((t) => t.position > after) as any,
        next: 2,
      }));
      const first = await adapter.poll({ source: lane, token: "0" });
      const expectation = { entries: expected, source: lane, finalToken: "2" };
      auditFeed([first], expectation);
      requireGapMutationCaught([first], expectation);
      auditResume(first.entries, (await adapter.poll({ source: lane, token: "0" })).entries);
      expect((await adapter.poll(first.cursor)).entries).toHaveLength(0);
    }
    const broker = brokerChangeFeed("broker", "s", {
      transport: "reader-worker",
      request: async () => ({
        cursor: 2,
        resolutions: transactions.map((tx) => ({
          kind: "commit",
          epoch: 0,
          lsn: tx.position,
          transacts: [
            {
              positions: [tx.position],
              txIds: [tx.txId],
              operationId: tx.txId,
              commandIds: [tx.commandId],
              changes: tx.changes.map((c) => ({
                op: c.op,
                entity: c.entityId,
                attribute: c.attribute,
                assertionId: c.tripleId,
                validFrom: c.validFrom,
                validTo: c.validTo ?? null,
                position: tx.position,
              })),
            },
          ],
        })) as any,
      }),
    });
    const delivered = await broker.poll({ source: "broker", token: "0" });
    auditFeed([delivered], { entries: expected, source: "broker", finalToken: "2" });
    requireGapMutationCaught([delivered], { entries: expected, source: "broker", finalToken: "2" });
  });
  it("measures offline consumer writes separately from source publication lag", () => {
    const store = new SqliteConsumerStore(path.join(temp(), "timing.db"));
    const times: number[] = [];
    let checkpoint = null as FeedPage["cursor"] | null;
    for (let i = 1; i <= 100; i++) {
      const e = structuredClone(entry) as any;
      e.offset = String(i);
      e.transactions[0].positions = [String(i)];
      e.transactions[0].commandIds = ["cmd" + i];
      e.transactions[0].changes.forEach((c: any) => {
        c.position = String(i);
      });
      const p = { entries: [e], cursor: { source: page.cursor.source, token: String(i) } };
      const a = affected.map((x) => ({ ...x, position: String(i) }));
      const start = performance.now();
      store.apply("timing", checkpoint, p, a);
      times.push(performance.now() - start);
      checkpoint = p.cursor;
    }
    store.close();
    times.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        kind: "FD01-consumer-write-diagnostic",
        samples: times.length,
        p99Ms: times[98],
        readers: 0,
        brokerLagMeasured: false,
      }),
    );
  });
  it("rejects keyed split durable state before replay, including the reviewer's otherwise recoverable state", () => {
    const before = { effects: [], affected: [], checkpoint: null };
    const after = { effects: affected, affected, checkpoint: page.cursor };
    expect(() =>
      auditConsumerAtomicity({ ...after, checkpoint: null }, { before, after }, "after-commit"),
    ).toThrow("Nonatomic consumer state before replay");
    expect(() => auditConsumerAtomicity(before, { before, after }, "before-commit")).not.toThrow();
    expect(() => auditConsumerAtomicity(after, { before, after }, "after-commit")).not.toThrow();
  });
  it("requires per-position publication clocks and rejects the reviewer's 1ms claim for a 300ms interval", () => {
    const position = {
      source: page.cursor.source,
      stream: "s",
      epoch: "1",
      position: "1",
    };
    const domain = {
      primitive: "node-hrtime-v1",
      host: "a".repeat(64),
      boot: "b".repeat(64),
      origin: "host-boot",
    } as const;
    const published = {
      ...position,
      domain,
      atNs: "100000000",
      publicationId: "source-log-1",
      recordId: "fixture-1",
    };
    const known = { ...position, domain, atNs: "400000000", lagMs: 300 };
    const audit = (pub = published, observation = known) =>
      auditFeedLag([page], [pub], [observation], [published]);
    expect(audit()).toEqual([300]);
    expect(() => audit(published, { ...known, lagMs: 1 })).toThrow("Lag differs");
    expect(() => auditFeedLag([page], [], [known], [published])).toThrow(
      "Missing source publication",
    );
    expect(() => audit({ ...published, source: "other" })).toThrow("foreign");
    expect(() =>
      audit(published, { ...known, domain: { ...domain, boot: "c".repeat(64) } }),
    ).toThrow("clock origin");
    expect(() => audit({ ...published, atNs: "200000000" }, { ...known, lagMs: 200 })).toThrow(
      "producer record",
    );
  });
  it("recovers 100 actual process stops at each hook for keyed atomic and unkeyed split arms", async () => {
    const dir = temp();
    const input = path.join(dir, "input.json");
    fs.writeFileSync(input, JSON.stringify({ page, affected }));
    const child = fileURLToPath(new URL("./crash-child.mjs", import.meta.url));
    const before = { effects: [], affected: [], checkpoint: null };
    const after = { effects: affected, affected, checkpoint: page.cursor };
    const observations: unknown[] = [];
    const result = await runFeedCrashConformance(
      async (point, attempt, arm) => {
        const file = path.join(dir, `${arm}-${point}-${attempt}.db`);
        const crashed = spawnSync(process.execPath, [child, file, input, arm, point], {
          encoding: "utf8",
        });
        if (crashed.status !== 77) throw Error(`Child failed ${crashed.status}: ${crashed.stderr}`);
        let beforeReplay;
        if (arm !== "unkeyed-split") {
          const store = new SqliteConsumerStore(file);
          beforeReplay = {
            effects: store.effects("c"),
            affected: store.affected("c"),
            checkpoint: store.checkpoint("c"),
          };
          store.close();
        } else {
          const db = new DatabaseSync(file);
          const effects = db
            .prepare("SELECT epoch,position,subject FROM effects")
            .all() as unknown as AffectedSubject[];
          const checkpoint = db.prepare("SELECT token FROM checkpoint").get();
          beforeReplay = {
            effects,
            affected: effects,
            checkpoint: checkpoint
              ? { source: page.cursor.source, token: String(checkpoint["token"]) }
              : null,
          };
          db.close();
        }
        observations.push({
          point,
          attempt,
          arm,
          exit: crashed.status,
          beforeReplay,
          trace: JSON.parse(fs.readFileSync(`${file}.${point}.trace.json`, "utf8")),
        });
        if (process.env["FD01_CRASH_EVIDENCE"])
          fs.writeFileSync(process.env["FD01_CRASH_EVIDENCE"]!, JSON.stringify(observations));
        if (arm === "keyed-atomic") auditConsumerAtomicity(beforeReplay, { before, after }, point);
        const resumed = spawnSync(process.execPath, [child, file, input, arm, "resume"], {
          encoding: "utf8",
        });
        if (resumed.status !== 0) throw Error(`Resume failed ${resumed.status}: ${resumed.stderr}`);
        let effects: readonly AffectedSubject[];
        let checkpointMatches: boolean;
        let affectedMatches: boolean;
        if (arm !== "unkeyed-split") {
          const store = new SqliteConsumerStore(file);
          effects = store.effects("c");
          checkpointMatches = JSON.stringify(store.checkpoint("c")) === JSON.stringify(page.cursor);
          affectedMatches = store.affected("c").length === affected.length;
          store.close();
        } else {
          const db = new DatabaseSync(file);
          effects = db
            .prepare("SELECT epoch,position,subject FROM effects")
            .all() as unknown as AffectedSubject[];
          checkpointMatches =
            db.prepare("SELECT token FROM checkpoint").get()!["token"] === page.cursor.token;
          affectedMatches = affected.every((a) =>
            effects.some((e) => JSON.stringify(e) === JSON.stringify(a)),
          );
          db.close();
        }
        const unique = new Set(effects.map((a) => JSON.stringify(a)));
        const gaps = affected.filter((a) => !unique.has(JSON.stringify(a))).length;
        return {
          crashed: true,
          beforeReplay,
          gaps,
          duplicateEffects: effects.length - unique.size,
          affectedMatches,
          checkpointMatches,
          resumeBytesMatch:
            feedBytes(JSON.parse(fs.readFileSync(input, "utf8")).page.entries[0]) ===
            feedBytes(entry),
        };
      },
      { before, after },
    );
    expect(result).toEqual({
      keyedCrashes: 500,
      controlCrashes: 300,
      splitCrashes: 100,
      splitAtomicityRejections: 100,
      controlDuplicates: 200,
    });
  }, 300_000);
});
