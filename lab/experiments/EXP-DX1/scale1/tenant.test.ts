import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  tenantAccounts,
  tenantRows,
  tenantSeedPin,
  tenantPopulationHash,
  tenantFacts,
  tenantQueries,
  campaignItem,
  type TenantSpec,
} from "./tenants.ts";
import { tenantPlan, tenantWindows, tenantReaders } from "./tenant-traffic.ts";
import { MembershipProof } from "./tenant-proof.ts";
import { installTenantViews, tenantFeedAt } from "./tenant-feed.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedOps } from "../../../bench/lib/commands.ts";
import { ids } from "../../../bench/lib/world.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { DeepActivation } from "../../../bench/lib/deep-activation.ts";
import { stageReplay } from "./source.ts";
import { buildCase, checkWithOracle, type OracleSampleRead } from "../../../bench/lib/oracle.ts";
import { alignIds, type RecordedCommand } from "../../../bench/lib/seed.ts";
const pooled: TenantSpec = { study: "smoke", topology: "pooled", physical: 0 };
test("the native-scope layouts have identical account-local offered bytes and stable sentinel rates", () => {
  const together = tenantPlan(pooled, "interference");
  assert.equal(tenantPopulationHash(pooled), tenantSeedPin(pooled));
  for (const a of together.accounts) {
    const separate = tenantPlan(
      { ...pooled, topology: "separate", physical: a.index },
      "interference",
    );
    assert.equal(together.logical[a.key], separate.logical[a.key]);
    assert.deepEqual(
      together.events
        .filter((e) => e.tenant === a.index)
        .map((e) => [e.localSubject, e.localSeq, e.atMs, e.deep]),
      separate.events.map((e) => [e.localSubject, e.localSeq, e.atMs, e.deep]),
    );
  }
  const spec = { ...pooled, study: "interference" as const, topology: "separate" as const };
  const windows = tenantWindows(spec, "interference"),
    events = tenantPlan(spec, "interference").events.filter((e) => !e.resend);
  const arrivals = (i: number) =>
    events
      .filter(
        (e) =>
          e.atMs >= windows[i]!.from * 1000 &&
          e.atMs < (windows[i]!.from + windows[i]!.seconds) * 1000,
      )
      .map((e) => Math.round((e.atMs - 1000 * windows[i]!.from) * 1000));
  for (const i of [1, 2, 3]) assert.deepEqual(arrivals(0), arrivals(i));
  assert.equal(tenantReaders(windows[3]!, 0), 64);
  assert.deepEqual(campaignItem(5, "pooled"), {
    people: 1000000,
    scopes: 1,
    accounts: 10,
    study: "million",
    layout: "pooled",
    facts: 162456470,
  });
});
test("one pinned multi-root read and count survive a later transaction and agree with O-REPLAY and immutable seed receipts", async () => {
  const run = randomUUID(),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "scale-tenant-")),
    comp = await openComposition("memory", "datomic", "tenants-" + run);
  const accounts = tenantAccounts(pooled),
    expected = new MembershipProof(),
    records: RecordedCommand[] = [];
  try {
    const commit = async (operations: any[], commandId: string) => {
      const actor = "tenant-functional",
        r = await comp.transact(operations, { commandId, actor });
      assert(r.ok);
      expected.bind(r.value);
      records.push({
        commandId,
        actor,
        operations,
        preconditions: [],
        receipt: {
          txId: r.value.txId,
          instant: r.value.instant,
          position: r.value.position,
          assertionIds: alignIds(operations, r.value),
        },
      });
      return r.value;
    };
    for (const a of accounts)
      for (let i = 0; i < a.people; i++) await commit(seedOps(tenantRows(a, i)), run + a.key + i);
    const seed = records.at(-1)!.receipt,
      at = { position: seed.position, validAt: Date.now() };
    const b = accounts[1]!,
      later = await commit(
        seedOps([
          { e: ids.placement(b.first), a: ":check/tenant", v: { type: "string", value: b.key } },
        ]),
        run + ":post-cut",
      );
    const before = await tenantQueries(comp, accounts, at);
    const after = await tenantQueries(comp, accounts, { ...at, position: later.position });
    assert.equal(before.total, 8);
    assert(before.crossAccountSingleRequest);
    assert.deepEqual(before.receiptProjection, expected.value());
    assert.equal(after.worlds[0]!.rows.length, before.worlds[0]!.rows.length);
    assert.equal(after.worlds[1]!.rows.length, before.worlds[1]!.rows.length + 1);
    const reads: OracleSampleRead[] = [before, after].flatMap((p, i) =>
      p.worlds.map((w) => ({
        subject: w.subject,
        basis: { recordedAt: i === 0 ? seed.instant : later.instant, validAt: at.validAt },
        rows: w.rows.map((r) => [
          r.entityId,
          r.attribute,
          r.value,
          r.validFrom,
          r.validTo ?? null,
          r.id,
        ]),
      })),
    );
    const oracleRoot = path.join(temp, "oracle");
    stageReplay(process.cwd(), oracleRoot);
    const o = checkWithOracle({
      oracleRoot,
      dir: temp,
      reads,
      caseDoc: buildCase({
        caseId: "tenant/" + run,
        commands: records,
        lastPosition: later.position,
        reads,
      }),
    });
    assert.deepEqual([o.status, o.reads, o.mismatches], ["PASS", 4, []]);
    const actor = new DeepActivation(temp, b.people, run + ":" + b.key, b.first);
    const r1 = await actor.execute(comp, "R1", () => {}),
      r2 = await actor.execute(comp, "R2", () => {});
    const checked = await actor.verify(comp, r1, r2);
    assert.equal(checked.checked, 4);
    assert.equal(checked.guardComparisons, 8);
    assert.equal(r2.coverage.size, 4);
    const idsSeen = fs
      .readFileSync(path.join(temp, "deep-R2-evaluations.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l)[0]);
    assert.deepEqual(idsSeen, [4, 5, 6, 7]);
    assert.equal(r2.release, W0.R2.hash);
  } finally {
    await comp.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("tenant feed cursors select only durably affected members and reject another source or a future cut", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "scale-feed-")),
    file = path.join(temp, "c.db");
  const db = new DatabaseSync(file),
    accounts = tenantAccounts(pooled);
  try {
    db.exec(
      "CREATE TABLE checkpoints(consumer,source,token); CREATE TABLE affected(consumer,epoch,position,subject); INSERT INTO checkpoints VALUES('dependency-index','source-test','5');",
    );
    installTenantViews(file, accounts);
    db.exec(
      "INSERT INTO affected VALUES('dependency-index','0','3','0'),('dependency-index','0','4','5'),('other','0','5','3');",
    );
    db.exec("BEGIN; INSERT INTO affected VALUES('dependency-index','0','5','2'); ROLLBACK;");
    assert.throws(() =>
      db.exec("INSERT INTO affected VALUES('dependency-index','0','5','not-a-subject')"),
    );
    const view = tenantFeedAt(file, accounts, "source-test", 5, 3);
    assert.deepEqual(view.cursors, { "account-001": 3, "account-002": 4 });
    assert.deepEqual([...view.matched], [[4, new Map([[5, "account-002"]])]]);
    assert.throws(() => tenantFeedAt(file, accounts, "other", 5, 3));
    assert.throws(() => tenantFeedAt(file, accounts, "source-test", 6, 3));
    assert.equal(
      tenantFacts(accounts),
      tenantRows(accounts[0]!, 0).length +
        accounts
          .flatMap((a) =>
            Array.from({ length: a.people }, (_, i) =>
              i === 0 && a.index === 0 ? 0 : tenantRows(a, i).length,
            ),
          )
          .reduce((n, v) => n + v, 0),
    );
  } finally {
    db.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("interference uses actual acknowledged throughput and keeps a missing quiet metric unjudged", async () => {
  const { compareTenants } = await import("./tenant-metrics.ts");
  const { Histogram } = await import("../../../bench/lib/hist.ts");
  const hist = (n: number, x: number) => {
    const h = new Histogram();
    for (let i = 0; i < n; i++) h.recordMs(x);
    return h.toJSON();
  };
  const group = (n: number, x: number) => ({
    read: hist(n, x),
    feed: hist(n, 2),
    commit: hist(n, x),
    acked: n,
    expired: 0,
    failed: 0,
    incorrectReads: 0,
    missingFeed: 0,
  });
  const accounts = tenantAccounts(pooled),
    one = group(560, 1),
    busy = group(550, 2),
    empty = group(0, 0);
  const feed = {
    cursors: {},
    matched: 0,
    missing: 0,
    sha256: "a".repeat(64),
    after: 0,
    high: 1,
    checkpoint: 1,
  };
  const phases = [
    { name: "one", from: 0, to: 350000, accounts: { "account-001": one, "account-002": empty } },
    {
      name: "two",
      from: 360000,
      to: 710000,
      accounts: { "account-001": busy, "account-002": group(500, 1) },
    },
  ];
  const r = compareTenants([{ feed, windows: phases }], accounts, null);
  assert.equal(r.firstSteadyMiss?.commitsPerS, 1050 / 350);
  assert.equal(r.windows[0]!.ratios[0]!.pass, true);
  assert.equal(
    compareTenants([{ feed, windows: phases }], accounts, "wrong reads").firstSteadyMiss,
    null,
  );
  const missing = structuredClone(phases);
  missing[1]!.accounts["account-001"].commit = hist(0, 0);
  missing[1]!.accounts["account-001"].read = hist(0, 0);
  const l = compareTenants([{ feed, windows: missing }], accounts, null);
  assert.equal(l.firstSteadyMiss, null);
  assert.equal(l.windows[1]!.ratios[0]!.pass, null);
});
