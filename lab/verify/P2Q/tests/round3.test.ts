// [CX-VP2Q-3] Why: vary the old review's schedules independently of builder assertions.
// Rejected: accepting the builder receipts alone (cannot independently certify the delta).
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { EntityId } from "@triplex-build/triplex";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { LogFeed } from "../../../../packages/qlever/src/broker/feed.js";
import { FeedConsumerStore, readConsumerEffects } from "../../../../packages/qlever/src/broker/feed.js";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, REPO, freshDir, openRt, ops, sleep, writeJson } from "./harness.js";

const contract = { name: "round3-native", parameters: TypeExpr.any, row: TypeExpr.any };
const select = (native: any, options = {}) => Effect.runPromise(Effect.match(
  native.select(contract, {}, () => "SELECT ?s WHERE { ?s ?p ?o }", options),
  { onFailure: (error: any) => ({ ok: false, error }), onSuccess: (value: any) => ({ ok: true, value }) },
));

describe("round3 probe, native and error variations", () => {
  it("N5: mixed surfaces recover from a rejected coalesced probe without overlapping startup", async () => {
    const scope = `round3-probe:${randomUUID()}`;
    const replica = new ModelReplica(graphIri(scope));
    const rt = await openRt(freshDir("mixed-probes"), scope, replica, { autoApply: false });
    let active = 0, maxActive = 0, count = 0, reject = true;
    const query = replica.query.bind(replica);
    replica.query = async (sparql) => {
      if (!sparql.startsWith("SELECT ?brokerPosition ?brokerEpoch")) return query(sparql);
      active++; maxActive = Math.max(active, maxActive); count++;
      try {
        await sleep(35);
        if (reject) throw new Error("ECONNRESET variation");
        return await query(sparql);
      } finally { active--; }
    };
    try {
      const first = await Promise.allSettled(Array.from({ length: 40 }, (_, i) => rt.broker.probeReplica(i % 2 ? "datalog" : "dependency-state")));
      expect(first.every((r) => r.status === "rejected" && r.reason.reason === "replica-unreachable")).toBe(true);
      expect(count).toBe(1);
      reject = false;
      const paced = rt.broker.probeReplica("datalog", performance.now(), true);
      const immediate = rt.broker.probeReplica("dependency-state", performance.now());
      rt.broker.startApplier();
      await Promise.all([paced, immediate, ...Array.from({ length: 40 }, () => rt.broker.probeReplica("native", performance.now()))]);
      expect(maxActive).toBe(1);
      writeJson("round3-probe-rejection.json", { firstRejected: first.length, count, maxActive });
    } finally { await rt.dispose(); await rt.broker.close(); }
  });

  it("N7: separately constructed env native facade waits the default 2s for an unattained basis", async () => {
    const saved = process.env.QLEVER_COMMIT_PATH;
    process.env.QLEVER_COMMIT_PATH = "broker";
    let answers = 0;
    const client: any = { query: async (sparql: string) => {
      if (sparql.startsWith("SELECT ?position")) return [{ position: { value: "2048" }, incarnation: { value: "r3" } }];
      answers++; return [];
    } };
    try {
      const native = makeQleverNativeQueries(client, DatabaseScope.test(`round3-native:${randomUUID()}`));
      const start = performance.now();
      const result = await select(native, { basis: { recordedPosition: 4096 } });
      const elapsed = performance.now() - start;
      writeJson("round3-native-default-deadline.json", { ok: result.ok, reason: result.error?.reason, elapsed, answers });
      expect(result.error?.reason).toBe("basis-not-reached");
      expect(elapsed).toBeGreaterThanOrEqual(1950);
      expect(answers).toBe(0);
    } finally { if (saved === undefined) delete process.env.QLEVER_COMMIT_PATH; else process.env.QLEVER_COMMIT_PATH = saved; }
  });

  it("reason variation: native socket reset in the answer request is replica-unreachable", async () => {
    const client: any = { query: async (sparql: string) => {
      if (sparql.startsWith("SELECT ?position")) return [{ position: { value: "2048" }, incarnation: { value: "r3" } }];
      throw new Error("ECONNRESET after initial basis probe");
    } };
    const native = makeQleverNativeQueries(client, DatabaseScope.test(`round3-error:${randomUUID()}`), { awaitBasisMs: 2000 });
    const result = await select(native);
    writeJson("round3-native-mid-answer-outage.json", { ok: result.ok, tag: result.error?._tag, reason: result.error?.reason ?? null, message: result.error?.message });
    expect(result.ok).toBe(false);
    expect(result.error?.reason).toBe("replica-unreachable");
  });

  it.each(["datalog", "dependency-state"])("reason variation: %s reset after successful marker probe", async (surface) => {
    const scope = `round3-error:${randomUUID()}`;
    const replica = new ModelReplica(graphIri(scope));
    const rt = await openRt(freshDir("answer-outage"), scope, replica);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:outage", 1, "o")));
      expect(await rt.broker.drain(10_000)).toBe(true);
      const query = replica.query.bind(replica);
      replica.query = async (sparql) => {
        if (sparql.startsWith("SELECT ?brokerPosition ?brokerEpoch")) return query(sparql);
        throw new Error("ECONNRESET after successful basis probe");
      };
      const effect = surface === "datalog"
        ? rt.triples.queryAll({ find: ["?v"], where: [[EntityId.make("s:outage"), ":v/f0", "?v"]] } as any, { includeBasis: true })
        : rt.adapter.dependencyState([":v/f0"], { validAt: Date.now() + 1000000, recordedPosition: a.position });
      const result: any = await rt.run(Effect.match(effect as any, { onFailure: (error) => ({ ok: false, error }), onSuccess: (value) => ({ ok: true, value }) }));
      writeJson(`round3-${surface}-mid-answer-outage.json`, { ok: result.ok, tag: result.error?._tag, reason: result.error?.reason ?? null, message: result.error?.message });
      expect(result.ok).toBe(false);
      expect(result.error?.reason).toBe("replica-unreachable");
    } finally { await rt.dispose(); await rt.broker.close(); }
  });

  it("N8: subprocess holders import source and use tsx; no generated bundle import", () => {
    const files = ["packages/qlever/test/fixtures/lock-holder.ts", "lab/verify/P2Q/scripts/lock-holder.ts"];
    const records = files.map((file) => ({ file, source: fs.readFileSync(path.join(REPO, file), "utf8") }));
    for (const r of records) {
      expect(r.source).toMatch(/import \{ HostLog \} from "[^"]*src\/broker\/log.js"/);
      expect(r.source).not.toMatch(/from ["'][^"']*dist\//);
    }
    const runner = fs.readFileSync(path.join(REPO, "packages/qlever/test/broker-fixes.test.ts"), "utf8");
    expect(runner).toMatch(/tsx/);
    writeJson("round3-subprocess-source.json", records.map((r) => ({ file: r.file, sha256: createHash("sha256").update(r.source).digest("hex") })));
  });
});

it("Q67d: execute the exact timing-harness prefix/consumer/audit code with a commit absent from ACKs", async () => {
  const source = fs.readFileSync(path.join(REPO, "lab/experiments/EXP-P2Q-qlever-log-broker/bench/run.mjs"), "utf8");
  const functions = source.slice(source.indexOf("const startConsumer ="), source.indexOf("const trace ="));
  const tally = (xs: string[]) => Object.fromEntries([...new Set(xs)].map((k) => [k, xs.filter((v) => v === k).length]));
  const harness = new Function("qlever", "path", "wall", "sleep", "tally", `${functions}; return {startConsumer, sourcePrefix, auditEffects};`)(
    { LogFeed, FeedConsumerStore, readConsumerEffects }, path, () => performance.timeOrigin + performance.now(), sleep, tally,
  );
  const scope = `round3-feed:${randomUUID()}`;
  const rt = await openRt(freshDir("feed-source"), scope);
  try {
    const a = await rt.run(rt.triples.transact(ops("s:acked", 1, "a")));
    const b = await rt.run(rt.triples.transact(ops("s:lost-ack", 1, "b")));
    const consumerDir = freshDir("feed-consumer");
    const consumer = harness.startConsumer(rt, "C", consumerDir);
    const consumed = await consumer.stop();
    const prefix = await harness.sourcePrefix(rt, "C", consumed.startAfter);
    expect(prefix.positions).toEqual([a.position, b.position]);
    const journalReads: number[] = [];
    const engine = { run: async (page: any) => page, triples: { transactions: ({ after }: any) => {
      journalReads.push(after);
      return { transactions: after === 111 ? [{ position: 222, changes: [{ entityId: "a" }] }] : after === 222 ? [{ position: 333, changes: [{ entityId: "b" }] }] : [] };
    } } };
    const enginePrefix = await harness.sourcePrefix(engine, "A0", 111);
    expect(enginePrefix).toEqual({ positions: [222, 333], effects: [[222, "a"], [333, "b"]] });
    expect(journalReads).toEqual([111, 222, 333]);
    const audit = harness.auditEffects(consumerDir, "consumer-C", prefix.effects, consumed.processed);
    expect(audit.gaps).toBe(0); expect(audit.extras).toBe(0);
    const perPosition = prefix.positions.map((position: number) => ({ position, sourceAt: 1, consumerAt: consumed.consumerAt.get(position) ?? null, ackAt: position === a.position ? 2 : null }));
    const reconciliation = source.slice(source.indexOf("  const inPrefix ="), source.indexOf("  const originalsOnly ="));
    const reconcile = new Function("prefix", "perPosition", "acks", `${reconciliation}; return {lateOrLostAcks, ackedNotPublished, harnessFailures};`);
    const normal = reconcile(prefix.positions, perPosition, new Map([[a.position, 2]]));
    expect(normal.lateOrLostAcks).toEqual([b.position]);
    expect(normal.harnessFailures).toEqual([]);
    const phantom = reconcile(prefix.positions, perPosition, new Map([[a.position, 2], [b.position + 9999, 3]]));
    expect(phantom.ackedNotPublished).toHaveLength(1);
    expect(phantom.harnessFailures).toHaveLength(1);
    const missing = reconcile(prefix.positions, perPosition.map((p: any) => p.position === b.position ? { ...p, consumerAt: null } : p), new Map([[a.position, 2]]));
    expect(missing.harnessFailures).toHaveLength(1);
    writeJson("round3-source-prefix.json", { harnessSha256: createHash("sha256").update(source).digest("hex"), prefix, enginePrefix, journalReads, audit, normal, phantom, missing });
  } finally { await rt.dispose(); await rt.broker.close(); }
});
