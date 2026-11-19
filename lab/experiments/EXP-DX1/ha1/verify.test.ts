import assert from "node:assert/strict";
import test from "node:test";
import { Account } from "../../../../packages/datomic/test/ha1-account.ts";
import { Satellite } from "./satellite.ts";
import { projection } from "./projection.ts";
import { backupCut, vendorResult } from "./move.ts";
import { AccountEndpoint, AccountMove, readAtOrigin, readReceipt } from "./placement.ts";
import { hash, loopback } from "./common.ts";
test("recovery rejects a changed receipt, wrong tenant and corrupt feed interval", () => {
  const ac = new Account("test-run-scope", "http://" + loopback, "http://" + loopback);
  try {
    const i = ac.intent("alpha"),
      p = {
        operationId: i.operationId,
        position: { t: "long", v: "7" },
        t: { t: "long", v: "1081" },
        recordedAt: { t: "double", v: i.claims[0]!.timestamp },
      };
    ac.remember(i, p);
    assert.throws(() => ac.remember(i, { ...p, t: { t: "long", v: "1082" } }));
    assert.throws(() => ac.remember(i, { ...p, operationId: "another-scope" }));
    const row = {
      t: "1081",
      transaction: {
        positions: ["7"],
        txIds: [i.claims[0]!.txId],
        commandIds: [i.claims[0]!.commandId],
        operationId: i.operationId,
        stamp: String(i.claims[0]!.timestamp),
        stampStatus: "decided",
        changes: [
          {
            op: "assert",
            entity: i.rows[0]!.entity_id,
            attribute: i.rows[0]!.attribute,
            assertionId: i.rows[0]!.id,
            validFrom: 10,
            validTo: null,
            position: "7",
          },
        ],
      },
    };
    ac.checkEntry(row);
    row.transaction.changes[0]!.validFrom = 11;
    assert.throws(() => ac.checkEntry(row));
  } finally {
    ac.close();
  }
});
test("selects a listed backup which covers the acknowledged cut", () => {
  assert.equal(backupCut("(1118 1111)", "1113"), "1118");
  assert.throws(() => backupCut("nothing listed, duration 1119", "1113"));
  assert.throws(() => backupCut("(1111)", "1113"));
});
test("size model withholds an extrapolation when the third rung disagrees", () => {
  const points = [2, 4, 10].map((n) => ({
    seedFacts: 160 * n,
    finalBytes: 100 + n * 100,
    pauseMs: n === 10 ? 250 : 9 * n,
    setupThroughCutoverMs: 1000 + n * 100,
  }));
  const out = projection(points);
  assert("slopes" in out && out.slopes);
  const p = out.slopes as Record<string, { conditionalRange: number[] | null }>;
  assert(p["finalBytes"]!.conditionalRange);
  assert.equal(p["pauseMs"]!.conditionalRange, null);
});

test("vendor verification binds the cut and rejects unreadable segments even on a zero exit", () => {
  const line =
    "{:t 1818, :total-segments 36, :missing-segments #{}, :unreadable-segments (), :event :verify-backup/complete}";
  const args = ["file:/tmp/test", "true", "1818"];
  vendorResult("verify-backup", line, args, "s2-test");
  assert.throws(() => vendorResult("verify-backup", line.replace("1818", "1820"), args, "s2-test"));
  assert.throws(() => vendorResult("verify-backup", line.replace("()", "(bad)"), args, "s2-test"));
  assert.throws(() =>
    vendorResult(
      "restore-db",
      ":succeeded\n{:event :restore, :db s2-other, :basis-t 1818}",
      args,
      "s2-test",
    ),
  );
});

test("second host only mutates the container created for this attempt", async () => {
  const nonce = "new-attempt",
    prefix = "tx2-ha1-test",
    image = "sha256:" + "a".repeat(64),
    id = "b".repeat(64),
    net = "c".repeat(64);
  const sat = new Satellite(nonce, prefix, "/trial", [image]);
  await sat.call(["network", "create", "--label", "ha1.attempt=" + nonce, prefix], async () => net);
  await sat.call(
    [
      "create",
      "--pull",
      "never",
      "--name",
      prefix + "-target",
      "--network",
      net,
      "--label",
      "ha1.attempt=" + nonce,
      "--entrypoint",
      "sh",
      image,
      "-c",
      "true",
    ],
    async () => id,
  );
  await sat.call(["kill", "--signal", "KILL", id], async () => "done");
  await assert.rejects(
    sat.call(["rm", "-fv", "foreign", id], async () => {
      throw Error("dispatched");
    }),
    { name: "AssertionError" },
  );
  await assert.rejects(
    sat.call(["start", "foreign"], async () => {
      throw Error("dispatched");
    }),
    { name: "AssertionError" },
  );
});

test("logical copy refuses a changed value digest and never advances its checkpoint", async () => {
  const place = { endpoint: "http://" + loopback, db: "old", generation: 1 };
  const source = new AccountEndpoint("red", place),
    dest = new AccountEndpoint("red", { ...place, db: "new", generation: 2 });
  const body = '{"operationId":"red~one"}',
    digest = hash(":1:" + hash(body));
  const receipt = {
    operationId: "red~one",
    position: { t: "long", v: "1" },
    t: { t: "long", v: "1008" },
    recordedAt: { t: "double", v: 1000 },
  } as const;
  const entry = {
    account: "red",
    sequence: 1,
    prev: "",
    digest,
    body,
    receipt,
    feed: { changes: [] },
    valueHash: "expected",
    observedFacts: 1,
  };
  const directory = {
    current: async () => place,
    publish: async () => {
      throw Error("unexpected publication");
    },
  };
  let verifies = 0;
  try {
    source.page = async () => ({ account: "red", after: 0, next: 1, entries: [entry] });
    dest.state = async () => ({
      account: "red",
      mode: "importing",
      source: "old",
      target: null,
      generation: 2,
      sequence: 0,
      digest: "",
      verified: 0,
      sealT: null,
      sealP: null,
    });
    dest.page = async () => ({
      account: "red",
      after: 0,
      next: 1,
      entries: [{ ...entry, valueHash: "corrupt" }],
    });
    dest.post = async <T>(op: string) => {
      if (op === "verify") verifies++;
      return receipt as T;
    };
    await assert.rejects(new AccountMove(source, dest, directory).copy(1), {
      name: "AssertionError",
    });
    assert.equal(verifies, 0);
    source.page = async () => ({
      account: "red",
      after: 0,
      next: 1,
      entries: [{ ...entry, body: body + " " }],
    });
    await assert.rejects(new AccountMove(source, dest, directory).copy(1), {
      name: "AssertionError",
    });
    assert.equal(verifies, 0);
  } finally {
    source.close();
    dest.close();
  }
});
test("logical migration refuses another physical database, stale generation or forged old pin", async () => {
  const p = { db: "original", generation: 1, endpoint: "http://" + loopback };
  const src = new AccountEndpoint("red", p),
    dst = new AccountEndpoint("red", { ...p, db: "new", generation: 2 });
  const receipt = {
    operationId: "red~a",
    position: { t: "long", v: "2" },
    t: { t: "long", v: "1000" },
    recordedAt: { t: "double", v: 5 },
  } as const;
  let writes = 0;
  try {
    const dir = {
      current: async () => p,
      publish: async () => {
        writes++;
      },
    };
    const seal = {
      mode: "fenced",
      account: "red",
      source: "original",
      target: "foreign",
      generation: 1,
      verified: 0,
      sequence: 1,
      digest: "bound",
      sealT: 1005,
      sealP: 3,
    } as const;
    src.state = async () => seal;
    await assert.rejects(new AccountMove(src, dst, dir).switch(seal), { name: "AssertionError" });
    assert.equal(writes, 0);
    await assert.rejects(new AccountMove(src, dst, dir).switch({ ...seal, generation: 2 }), {
      name: "AssertionError",
    });
    assert.equal(writes, 0);
    dst.lookup = async () => ({ found: true, sequence: 1, receipt });
    await assert.rejects(readReceipt(dst, { ...receipt, t: { t: "long", v: "1001" } }, "red~a"), {
      name: "AssertionError",
    });
  } finally {
    src.close();
    dst.close();
  }
});

test("an original read basis uses both cuts and resolves an empty account prefix", async () => {
  const endpoint = new AccountEndpoint("red", {
    db: "db",
    generation: 2,
    endpoint: "http://" + loopback,
  });
  const receipt = {
    operationId: "red~a",
    position: { t: "long", v: "4" },
    t: { t: "long", v: "1050" },
    recordedAt: { t: "double", v: 2 },
  } as const;
  let pageCalls = 0;
  try {
    endpoint.translate = async (origin, kind, n) => ({
      account: origin === "other" ? "blue" : "red",
      sequence: n === 0 ? 0 : kind === "t" ? 5 : 3,
    });
    endpoint.page = async (cursor) => {
      assert.equal(cursor.after, 2);
      pageCalls++;
      return {
        account: "red",
        after: 2,
        next: 3,
        entries: [
          {
            account: "red",
            sequence: 3,
            prev: "p",
            digest: "d",
            receipt,
            feed: {},
            valueHash: "h",
            observedFacts: 1,
          },
        ],
      };
    };
    endpoint.read = async (pin, subject, valid) => {
      assert.deepEqual(pin, { sequence: 3, receipt });
      assert.equal(subject, "red~entity");
      assert.equal(valid, 20);
      return [];
    };
    await readAtOrigin(
      endpoint,
      { origin: "old", basisT: "1060", recordedPosition: 4, validAt: 20 },
      "red~entity",
    );
    await readAtOrigin(endpoint, { origin: "old", recordedPosition: 0, validAt: 20 }, "red~entity");
    assert.equal(pageCalls, 1);
    await assert.rejects(
      readAtOrigin(endpoint, { origin: "other", basisT: "1050", validAt: 20 }, "red~entity"),
      { name: "AssertionError" },
    );
  } finally {
    endpoint.close();
  }
});
