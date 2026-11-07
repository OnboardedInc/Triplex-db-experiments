/**
 * EXP-P2X: the `subject-stamp` commit path and its change feed.
 * The four falsifiers RULINGS Q31c requires before any comparative claim are marked [F1] to [F4]:
 * nested cuts inside one engine transaction, an abort gap, a crash between log append and
 * resolution, and resume from a checkpoint that sits at an abort gap.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { EntityId, Triples, string, number } from "@triplex-build/triplex";
import {
  Capabilities,
  CommandAlreadyCommittedError,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  TransactionOutcomeUnknown,
  WriteError,
  type StorageAdapterService,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, metadataLiteral, type XtdbClient } from "../src/XtdbClient.js";
import {
  makeXtdbStorageAdapter,
  stampedPosition,
  POSITION_ORDINALS,
  XtdbSerializationConflict,
} from "../src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import { resolveXtdbOperation } from "../src/Operations.js";
import {
  feedEffects,
  makeXtdbCommitFeed,
  readFeedCheckpoint,
  recordFeedProgress,
  type XtdbFeedCursor,
} from "../src/CommitFeed.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const fact = (entity: string, value: string) => ({
  entityId: entity as never,
  attribute: ":p2x/value",
  value: { type: "string" as const, value },
});
const stage = (adapter: StorageAdapterService, entity: string, value: string) =>
  Effect.gen(function* () {
    const position = yield* adapter.nextCommitPosition();
    return yield* adapter.insert(fact(entity, value), `tx:${randomUUID()}`, 100, randomUUID(), position);
  });

describe("subject-stamp METADATA literal", () => {
  it("doubles single quotes only and rejects values it cannot carry exactly", () => {
    expect(metadataLiteral({ a: "x'y\\z", n: 3, l: ["p", 1], skip: undefined })).toBe(
      "{a: 'x''y\\z', n: 3, l: ['p', 1]}",
    );
    expect(() => metadataLiteral({ n: 1.5 })).toThrow(TypeError);
    expect(() => metadataLiteral({ "bad-key": 1 })).toThrow(TypeError);
    expect(() => metadataLiteral({ s: "\ud800" })).toThrow(TypeError);
  });
  it("packs (offset, ordinal) order-preservingly", () => {
    const stamp = 1_794_082_329_542_086;
    expect(stampedPosition(stamp, 1)).toBe(stampedPosition(stamp, 0) + 1);
    expect(stampedPosition(stamp + 1, 0)).toBeGreaterThan(
      stampedPosition(stamp, POSITION_ORDINALS - 1),
    );
    expect(Number.isSafeInteger(stampedPosition(stamp, POSITION_ORDINALS - 1))).toBe(true);
  });
});

/** A scripted log: source-log records plus the xt.txs rows that exist so far. */
const scriptedClient = (
  records: { msgId: number; type?: string }[],
  txs: Map<number, { committed: boolean; stamp: number; meta: Record<string, unknown> }>,
): XtdbClient => ({
  query: async (sql: string, params: readonly unknown[] = []) => {
    if (sql.includes("xt.source_log_msgs")) {
      const [lower, upper, limit] = params.map(Number);
      return records
        .filter((record) => record.msgId >= lower! && record.msgId <= upper!)
        .slice(0, limit)
        .map((record) => ({ msg_id: record.msgId, msg_type: record.type ?? "tx" })) as never;
    }
    if (sql.includes("xt.txs"))
      return params
        .map(Number)
        .flatMap((id) =>
          txs.has(id)
            ? [{ _id: id, committed: txs.get(id)!.committed, stamp: txs.get(id)!.stamp, user_metadata: txs.get(id)!.meta }]
            : [],
        ) as never;
    throw new Error(`unexpected query ${sql}`);
  },
  submit: async () => {
    throw new Error("read-only script");
  },
  close: async () => {},
});

describe("subject-stamp feed watermark (deterministic log script)", () => {
  const scope = "script-scope";
  const meta = (op: string, subj: string[]) => ({ triplex: "p2x-1", scope, op, n: 1, subj, attrs: [":a"], cmd: [] });
  const base = 1_794_000_000_000_000;

  it("[F3] stops at a transaction appended but not yet resolved, then resumes exactly", async () => {
    const txs = new Map([[100, { committed: true, stamp: base + 1, meta: meta("a", ["s1"]) }]]);
    const records = [{ msgId: 100 }, { msgId: 200 }, { msgId: 300 }];
    // 300 is already resolved, but 200 is not: a reader must not pass 200.
    txs.set(300, { committed: true, stamp: base + 3, meta: meta("c", ["s3"]) });
    const feed = makeXtdbCommitFeed(scriptedClient(records, txs), scope);
    const first = await feed.poll({ msgId: 100, processed: false });
    expect(first.blocked).toBe(true);
    expect(first.resolutions.map((r) => r.msgId)).toEqual([100]);
    expect(first.watermark).toEqual({ msgId: 100, processed: true });
    txs.set(200, { committed: true, stamp: base + 2, meta: meta("b", ["s2"]) });
    const second = await feed.poll(first.watermark);
    expect(second.resolutions.map((r) => r.msgId)).toEqual([200, 300]);
    expect(second.blocked).toBe(false);
  });

  it("[F2][F4] lists an aborted offset and resumes from a checkpoint sitting at it", async () => {
    const txs = new Map([
      [100, { committed: true, stamp: base + 1, meta: meta("a", ["s1"]) }],
      [200, { committed: false, stamp: base + 2, meta: meta("b", ["s1"]) }],
      [300, { committed: true, stamp: base + 3, meta: meta("c", ["s1"]) }],
    ]);
    const records = [{ msgId: 100 }, { msgId: 150, type: "flush-block" }, { msgId: 200 }, { msgId: 300 }];
    const feed = makeXtdbCommitFeed(scriptedClient(records, txs), scope);
    const all = await feed.poll({ msgId: 100, processed: false });
    expect(all.resolutions.map((r) => [r.msgId, r.status])).toEqual([
      [100, "committed"],
      [200, "aborted"],
      [300, "committed"],
    ]);
    expect(all.resolutions[1]!.transacts).toEqual([]);
    const atGap: XtdbFeedCursor = { msgId: 200, processed: true };
    const resumed = await feed.poll(atGap);
    expect(resumed.resolutions.map((r) => r.msgId)).toEqual([300]);
    expect(feedEffects(resumed)).toEqual([{ position: stampedPosition(base + 3, 0), subject: "s1", msgId: 300 }]);
  });
});

describe.skipIf(!enabled)("subject-stamp commit path (live XTDB)", () => {
  let client: XtdbClient;
  beforeAll(async () => {
    client = makeXtdbClient(url);
    await Effect.runPromise(makeXtdbStorageAdapter(client, "init", { commitPath: "subject-stamp" }).initialize());
  });
  afterAll(async () => {
    await client?.close();
  });
  const adapterFor = (scope: string, c: XtdbClient = client, extra: object = {}) =>
    makeXtdbStorageAdapter(c, scope, { commitPath: "subject-stamp", ...extra });
  const runtimeFor = (scope: string, adapter: StorageAdapterService, c: XtdbClient = client) =>
    Runtime.define({
      name: "p2x",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(c, scope)),
    }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none });
  const op = (entity: string, value: string) => ({
    op: "assert" as const,
    entityId: EntityId.make(entity),
    attribute: ":p2x/value",
    value: string(value),
  });

  it("stamps receipts, journal and scope head with the same log-ordered position", async () => {
    const scope = `p2x-stamp:${randomUUID()}`;
    const adapter = adapterFor(scope);
    const feed = makeXtdbCommitFeed(client, scope);
    const start = await feed.tip();
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        const a = yield* t.transact([op("s1", "a")], { commandId: "c1" });
        const b = yield* t.transact([op("s2", "b")], { commandId: "c2" });
        expect(a.position).toBeGreaterThan(0);
        expect(b.position).toBeGreaterThan(a.position);
        expect((yield* t.transaction(a.txId))?.position).toBe(a.position);
        expect(yield* t.currentPosition()).toBe(b.position);
        const page = yield* t.transactions({ after: a.position - 1, limit: 1 });
        expect(page.transactions[0]?.txId).toBe(a.txId);
        // Read-your-own-write at the returned position (TARGETS 4.1 item 6: routed to this node).
        const storage = adapter;
        const pinned = yield* storage.getByEntity(EntityId.make("s1"), {
          validAt: Date.now(),
          recordedPosition: a.position,
        });
        expect(pinned).toHaveLength(1);
        const before = yield* storage.getByEntity(EntityId.make("s2"), {
          validAt: Date.now(),
          recordedPosition: a.position,
        });
        expect(before).toHaveLength(0);
        const duplicate = yield* t.transact([op("s1", "again")], { commandId: "c1" }).pipe(Effect.flip);
        expect(duplicate).toBeInstanceOf(CommandAlreadyCommittedError);
        expect((duplicate as CommandAlreadyCommittedError).transactionId).toBe(a.txId);
        const polled = yield* Effect.promise(() => feed.poll(start));
        expect(polled.resolutions.filter((r) => r.status === "committed").map((r) => r.transacts[0]!.position)).toEqual([
          a.position,
          b.position,
        ]);
        expect(polled.resolutions[0]!.transacts[0]!.subjects).toEqual(["s1"]);
        expect(polled.resolutions[0]!.attributes).toEqual([":p2x/value"]);
      }).pipe(Effect.provide(runtimeFor(scope, adapter)), Effect.scoped),
    );
  });

  it("does not conflict across subjects, does conflict on the same subject", async () => {
    for (const same of [false, true]) {
      const scope = `p2x-cas:${randomUUID()}`;
      const adapter = adapterFor(scope);
      const competitor = adapterFor(scope);
      let evaluations = 0;
      const result = await Effect.runPromise(
        adapter
          .withTransaction(
            Effect.gen(function* () {
              evaluations++;
              yield* stage(adapter, "s1", "mine");
              if (evaluations === 1)
                yield* competitor.withTransaction(stage(competitor, same ? "s1" : "s2", "theirs"));
              return "ok";
            }),
          )
          .pipe(Effect.result),
      );
      if (same) expect(result).toMatchObject({ _tag: "Failure", failure: expect.any(XtdbSerializationConflict) });
      else expect(result).toMatchObject({ _tag: "Success", success: "ok" });
      expect(evaluations).toBe(1);
    }
  });

  it("escalates a scope-wide read to a scope-wide guard and blocks write skew", async () => {
    const scope = `p2x-wide:${randomUUID()}`;
    const adapter = adapterFor(scope);
    const competitor = adapterFor(scope);
    const scan = await Effect.runPromise(
      adapter
        .withTransaction(
          Effect.gen(function* () {
            yield* adapter.query({ attribute: ":p2x/value" });
            yield* stage(adapter, "s1", "mine");
            yield* competitor.withTransaction(stage(competitor, "s9", "unrelated"));
          }),
        )
        .pipe(Effect.result),
    );
    expect(scan).toMatchObject({ _tag: "Failure", failure: expect.any(XtdbSerializationConflict) });
    // Write skew: each reads the subject the other writes.
    await Effect.runPromise(
      Effect.all([adapter.withTransaction(stage(adapter, "a", "0")), adapter.withTransaction(stage(adapter, "b", "0"))]),
    );
    const skew = await Effect.runPromise(
      adapter
        .withTransaction(
          Effect.gen(function* () {
            yield* adapter.getByEntity("a" as never);
            yield* stage(adapter, "b", "from-a");
            yield* competitor.withTransaction(
              Effect.gen(function* () {
                yield* competitor.getByEntity("b" as never);
                yield* stage(competitor, "a", "from-b");
              }),
            );
          }),
        )
        .pipe(Effect.result),
    );
    expect(skew).toMatchObject({ _tag: "Failure", failure: expect.any(XtdbSerializationConflict) });
  });

  it("rejects a placeholder position that escapes into a fact value", async () => {
    const adapter = adapterFor(`p2x-escape:${randomUUID()}`);
    const error = await Effect.runPromise(
      adapter
        .withTransaction(
          Effect.gen(function* () {
            const position = yield* adapter.nextCommitPosition();
            yield* adapter.insert(
              { entityId: "e" as never, attribute: ":leak", value: number(position) },
              "tx:leak",
              1,
              randomUUID(),
              position,
            );
          }),
        )
        .pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(WriteError);
    expect(String((error as WriteError).message)).toMatch(/escaped/);
  });

  it("[F1] gives nested transacts consecutive ordinals at one offset with exact cuts", async () => {
    const scope = `p2x-nested:${randomUUID()}`;
    const adapter = adapterFor(scope);
    const feed = makeXtdbCommitFeed(client, scope);
    const start = await feed.tip();
    await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        const results = yield* adapter.withTransaction(
          Effect.gen(function* () {
            const first = yield* t.transact([op("n1", "first")]);
            // A rolled-back nested transact frees its ordinal.
            yield* adapter
              .withTransaction(
                Effect.andThen(t.transact([op("n9", "rolled-back")]), Effect.fail("rollback")),
              )
              .pipe(Effect.catch(() => Effect.void));
            const second = yield* t.transact([op("n2", "second")]);
            const third = yield* t.transact([op("n1", "third")]);
            return [first, second, third];
          }),
        );
        const positions = results.map((r) => r.position);
        expect(positions[1]).toBe(positions[0]! + 1);
        expect(positions[2]).toBe(positions[0]! + 2);
        const s = adapter;
        const at = (entity: string, position: number) =>
          s.getByEntity(EntityId.make(entity), { validAt: Date.now(), recordedPosition: position });
        expect((yield* at("n1", positions[0]!)).map((r) => r.value_string)).toEqual(["first"]);
        expect(yield* at("n2", positions[0]!)).toHaveLength(0);
        expect((yield* at("n2", positions[1]!)).map((r) => r.value_string)).toEqual(["second"]);
        expect((yield* at("n1", positions[1]!)).map((r) => r.value_string)).toEqual(["first"]);
        expect((yield* at("n1", positions[2]!)).map((r) => r.value_string).sort()).toEqual(["first", "third"]);
        expect(yield* at("n9", positions[2]!)).toHaveLength(0);
        const journal = yield* t.transactions({ after: positions[0]! - 1, limit: 10 });
        expect(journal.transactions.map((r) => r.position)).toEqual(positions);
        expect(yield* t.currentPosition()).toBe(positions[2]);
        const page = yield* Effect.promise(() => feed.poll(start));
        const mine = page.resolutions.filter((r) => r.status === "committed");
        expect(mine).toHaveLength(1);
        expect(mine[0]!.transacts.map((x) => [x.position, x.subjects])).toEqual([
          [positions[0], ["n1"]],
          [positions[1], ["n2"]],
          [positions[2], ["n1"]],
        ]);
      }).pipe(Effect.provide(runtimeFor(scope, adapter)), Effect.scoped),
    );
  });

  it("[F2][F4] lists an aborted offset in the live feed and resumes from a checkpoint at it", async () => {
    const scope = `p2x-abort:${randomUUID()}`;
    const adapter = adapterFor(scope);
    const competitor = adapterFor(scope);
    const feed = makeXtdbCommitFeed(client, scope);
    const start = await feed.tip();
    await Effect.runPromise(adapter.withTransaction(stage(adapter, "s1", "before")));
    // A same-subject race: the loser's transaction is appended, then aborted by its ASSERT.
    const lost = await Effect.runPromise(
      adapter
        .withTransaction(
          Effect.gen(function* () {
            yield* stage(adapter, "s1", "loser");
            yield* competitor.withTransaction(stage(competitor, "s1", "winner"));
          }),
        )
        .pipe(Effect.result),
    );
    expect(lost._tag).toBe("Failure");
    const page = await feed.poll(start);
    const statuses = page.resolutions.map((r) => r.status);
    expect(statuses).toEqual(["committed", "committed", "aborted"]);
    const aborted = page.resolutions[2]!;
    // Consume up to and including the abort gap, then crash and resume from that checkpoint.
    const consumer = `c-${randomUUID()}`;
    const upToGap = { ...page, watermark: { msgId: aborted.msgId, processed: true } };
    await recordFeedProgress(client, scope, consumer, upToGap, null);
    expect(await readFeedCheckpoint(client, scope, consumer)).toEqual({ msgId: aborted.msgId, processed: true });
    await Effect.runPromise(adapter.withTransaction(stage(adapter, "s1", "after")));
    const resumed = await feed.poll((await readFeedCheckpoint(client, scope, consumer))!);
    const after = resumed.resolutions.filter((r) => r.status === "committed");
    expect(resumed.resolutions.map((r) => r.msgId).every((id) => id > aborted.msgId)).toBe(true);
    expect(after).toHaveLength(1);
    expect(after[0]!.transacts[0]!.position).toBeGreaterThan(page.resolutions[1]!.transacts[0]!.position);
  });

  it("[F3] resolves a commit whose writer died between log append and resolution", async () => {
    const scope = `p2x-crash:${randomUUID()}`;
    const feed = makeXtdbCommitFeed(client, scope);
    const start = await feed.tip();
    let dead = false;
    let inFlight: Promise<unknown> = Promise.resolve();
    // The writer dies once its commit is handed to the engine: it never sees COMMIT return and its
    // receipt lookups fail, so it reports an unknown outcome while the engine is still resolving.
    const dying: XtdbClient = {
      ...client,
      submit: async (statements, options) => {
        if (!statements.some(({ sql }) => sql.includes("INSERT INTO tx_attempts")))
          return client.submit(statements, options);
        inFlight = client.submit(statements, options).catch(() => undefined);
        dead = true;
        throw new Error("writer crashed after append");
      },
      query: (sql, params, basis, options) =>
        dead && /tx_attempts/.test(sql)
          ? Promise.reject(new Error("writer gone"))
          : client.query(sql, params, basis, options),
    };
    const adapter = adapterFor(scope, dying, { resolutionTimeoutMs: 50 });
    const error = await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        return yield* t.transact([op("s1", "survives")], { commandId: "crash-cmd" }).pipe(Effect.flip);
      }).pipe(Effect.provide(runtimeFor(scope, adapter, dying)), Effect.scoped),
    );
    expect(error).toBeInstanceOf(TransactionOutcomeUnknown);
    // While the engine has not resolved it, the feed must not pass it; once it has, it appears once.
    let page = await feed.poll(start);
    expect(page.resolutions.filter((r) => r.status === "committed")).toHaveLength(page.blocked ? 0 : page.resolutions.length);
    await inFlight;
    const resolution = await Effect.runPromise(
      resolveXtdbOperation(client, scope, (error as TransactionOutcomeUnknown).operationId),
    );
    expect(resolution.status).toBe("committed");
    page = await feed.poll(start);
    const committed = page.resolutions.filter((r) => r.status === "committed");
    expect(committed).toHaveLength(1);
    expect(committed[0]!.transacts[0]!.position).toBe((resolution as { position: number }).position);
    // The retried command returns the original receipt instead of committing twice.
    const healthy = adapterFor(scope);
    const retry = await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* Triples;
        return yield* t.transact([op("s1", "survives")], { commandId: "crash-cmd" }).pipe(Effect.flip);
      }).pipe(Effect.provide(runtimeFor(scope, healthy)), Effect.scoped),
    );
    expect(retry).toBeInstanceOf(CommandAlreadyCommittedError);
  });

  it("[F3] never lists a resolution past one that is appended but unresolved (live)", async () => {
    const scope = `p2x-pending:${randomUUID()}`;
    const adapter = adapterFor(scope);
    const feed = makeXtdbCommitFeed(client, scope);
    let cursor = await feed.tip();
    let blockedPages = 0;
    const seen: number[] = [];
    // A heavy transaction keeps the indexer busy so the small ones behind it are appended but
    // unresolved for a while; the tailer polls through that window.
    const heavy = Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const position = yield* adapter.nextCommitPosition();
          for (let i = 0; i < 6_000; i++)
            yield* adapter.insert(fact(`h${i % 50}`, `v${i}`), "tx:heavy", 1, randomUUID(), position);
        }),
      ),
    );
    const small = Promise.all(
      Array.from({ length: 8 }, (_unused, i) => Effect.runPromise(adapter.withTransaction(stage(adapter, `q${i}`, "x")))),
    );
    let done = false;
    void Promise.all([heavy, small]).then(() => (done = true));
    const deadline = Date.now() + 90_000;
    while ((!done || seen.length < 9) && Date.now() < deadline) {
      const page = await feed.poll(cursor);
      if (page.blocked) blockedPages++;
      for (const resolution of page.resolutions) seen.push(resolution.msgId);
      cursor = page.watermark;
      if (done && page.resolutions.length === 0 && !page.blocked && seen.length >= 9) break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(9);
    console.log(`[F3 live] blocked pages observed: ${blockedPages}`);
  });
});
