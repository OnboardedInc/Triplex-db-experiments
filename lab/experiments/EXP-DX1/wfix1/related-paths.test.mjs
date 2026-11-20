import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const stage = process.env.WFIX1_RELATED_STAGE;
assert(stage, "Stage each related branch at its audited revision first");
const from = (branch, file) => import(pathToFileURL(path.join(stage, branch, "lab", file)).href);
const instant = "2024-01-01T00:00:00.000000Z";
const later = "2024-02-01T00:00:00.000000Z";

test("an ambiguous adaptive import returns its receipt after the destination advances", async () => {
  const { Snapshot } = await from("load", "experiments/EXP-DX1/load1/snapshot.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "write-audit-"));
  const receipts = new Map();
  let head = 0;
  let commits = 0;
  const store = {
    backend: { name: "datomic" },
    scopeName: "import-recovery",
    async transactionByCommand(id) {
      return { ok: true, value: receipts.get(id) };
    },
    async transact(operations, meta) {
      if (receipts.has(meta.commandId)) return { ok: false, tag: "TransactionConflictError" };
      commits++;
      const position = ++head;
      const instant = 1000 + position;
      const txId = "transaction-" + position;
      const changes = operations.map((op, i) => ({
        ...op,
        tripleId: txId + "-" + i,
        recordedAt: instant,
        assertionTxId: txId,
      }));
      receipts.set(meta.commandId, { ...meta, position, instant, txId, changes });
      return {
        ok: true,
        value: {
          position,
          instant,
          txId,
          triples: changes.map((c) => ({
            ...c,
            id: c.tripleId,
            validTo: { _tag: "None" },
            txId: { value: txId },
          })),
        },
      };
    },
  };
  const open = () =>
    Snapshot.open(store, "thin", 4, 32, path.join(dir, "checkpoint.db"), { budgetMs: 8 });
  let run = await open();
  try {
    const frame = run.nextFrame(32);
    assert(frame);
    await assert.rejects(
      run.write(frame, {
        beforeCheckpoint: () => {
          throw Error("reply lost");
        },
      }),
      /reply lost/,
    );
    assert.equal(run.cursor(), 0);
    run.close();
    run = undefined;
    await store.transact([], { commandId: "independent" });
    assert.equal(head, 3);
    run = await open();
    assert.deepEqual(run.nextFrame(1), frame);
    const old = await run.write(frame);
    const receipt = receipts.get(old.command);
    const ids = createHash("sha256")
      .update(JSON.stringify(receipt.changes.map((c) => c.tripleId)))
      .digest("hex");
    assert.deepEqual(
      [old.position, old.txId, old.instant, old.ids],
      [2, receipt.txId, receipt.instant, ids],
    );
    assert.equal(run.cursor(), frame.end);
    assert.equal(head, 3);
    assert.equal(commits, 3);
  } finally {
    run?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("joined Publish resolves the original across a changed valid-time precondition", async () => {
  const { JoinedAccount } = await from("join", "experiments/EXP-DX1/actv-lazy/join/account.ts");
  const { W0, canonical, sha256 } = await from("join", "bench/lib/w0-world.ts");
  const { bytes } = await from("join", "experiments/EXP-DX1/import1/source.ts");
  const id = "publish",
    commandId = "joined:" + id,
    scope = "joined-recovery";
  const doc = W0.R1.doc;
  const args = ["publish", doc, instant, "owed", "native", 1, false];
  const receipt = {
    commandId,
    actor: "lazy/join",
    position: 3,
    txId: "_tx/published",
    changes: [],
    correlationId: canonical({
      context: { intent: sha256(canonical([scope, id, args])) },
      hash: sha256(bytes([scope, commandId, "lazy/join", []])),
    }),
  };
  for (const race of [false, true]) {
    let looks = 0,
      reads = 0;
    const account = new JoinedAccount({
      scope,
      comp: { scopeName: scope },
      async lookup(key) {
        assert.equal(key, commandId);
        return race && ++looks === 1 ? null : receipt;
      },
      async head() {
        reads++;
        return 4;
      },
      async commit() {
        assert.fail("Resend attempted a second Publish");
      },
    });
    account.db.get = async () => ({ value: [] });
    account.state = async () => ({ c: { at: later } });
    assert.deepEqual(await account.publish(id, doc, instant, "owed"), receipt);
    assert.equal(reads, Number(race));
    if (race) assert.equal(looks, 2);
  }
});

test("notice append and its serial conflict return the original after the tail moves", async () => {
  const { Notices, interpreter } = await from("notice", "experiments/EXP-DX1/notify1/journal.ts");
  const { transportHash } = await from("notice", "experiments/EXP-DX1/notify1/store.ts");
  const req = {
    kind: "reconcile",
    id: "send",
    release: "R1",
    from: instant,
    validTime: instant,
    selection: { kind: "census" },
  };
  const id = "event-command:" + req.id,
    intent = [req, [], []];
  let submissions = 0;
  const store = {
    scopeName: "notice-recovery",
    async transactionByCommand(commandId) {
      assert.equal(commandId, notices.db.command(id));
      return { ok: true, value: record };
    },
    async transact() {
      submissions++;
      return { ok: false, tag: "TransactionConflictError" };
    },
  };
  const notices = new Notices(store, "account", { identity: "fixture" });
  const record = {
    commandId: notices.db.command(id),
    txId: "_tx/send",
    position: 2,
    changes: [notices.db.put(recordKey(), transportHash([notices.db.prefix, id, intent]))],
  };
  function recordKey() {
    return notices.db.command(id).slice(notices.db.prefix.length);
  }
  const advanced = {
    key: "tail",
    value: {
      inputs: "fixture",
      evaluator: interpreter,
      validTime: later,
      from: later,
      release: "R2",
    },
  };
  assert.throws(() => notices.plan(advanced, req));
  assert.deepEqual(await notices.append(advanced, req), {
    txId: record.txId,
    position: record.position,
  });
  assert.equal(submissions, 0);
  assert.deepEqual(await notices.db.commit(id, intent, [], []), {
    txId: record.txId,
    position: record.position,
  });
  assert.equal(submissions, 1);
});
