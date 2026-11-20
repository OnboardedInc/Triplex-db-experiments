import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { W0, V_W0 } from "../../../bench/lib/w0-world.ts";
import { accountsAt, seedAccounts } from "../act2/rung.ts";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { DeepAccount } from "./deep.ts";
import { hash } from "./store.ts";
import { iso } from "./v3.ts";
import type { BuiltCommand } from "../../../bench/lib/commands.ts";
test("native-source debt survives a missing ACK and fences both the old publisher and a newer seal", async () => {
  const comp = memoryComposition("datomic", "delta-deep-" + randomUUID()),
    accounts = accountsAt(8),
    t = accounts[1]!,
    s = W0.placementId(t.first),
    seed = await seedAccounts(comp, accounts),
    basis = { position: seed.position, validAt: V_W0 };
  const worlds = await readDeepWorlds(comp, [t.first], basis, t.key),
    binding = hash([seed, t.key]),
    a = new DeepAccount(comp, t.key, binding);
  await a.control.bootstrap([s], worlds, { tx: seed.position, validTime: iso(V_W0) });
  const held = await a.control.readAt(s, await comp.currentPosition()),
    raw = await comp.sweepPage([taskId(t.first, 0)], basis),
    old = raw.rows.find((f) => f.attribute === ":task/progress")!,
    replacement = {
      entityId: old.entityId,
      attribute: old.attribute,
      value: { type: "integer", value: "1" },
      validFrom: V_W0 - 100,
    };
  const cmd = {
    commandId: "one-deep-save",
    operations: [
      { op: "retract", id: old.id },
      { op: "assert", ...replacement },
    ],
    preconditions: [{ _tag: "TripleLive", id: old.id }],
  } as unknown as BuiltCommand;
  const lost = new DeepAccount(
    {
      ...comp,
      transact: async (ops, meta) => {
        const r = await comp.transact(ops, meta);
        if (r.ok && String(meta.commandId).includes("cmd:source:")) throw Error("lost raw ACK");
        return r;
      },
    },
    t.key,
    binding,
  );
  await assert.rejects(lost.commit(t.first, cmd, V_W0, V_W0 - 100), /lost raw ACK/);
  const dirtyPos = await comp.currentPosition();
  assert(await a.debt(dirtyPos));
  const exact = await a.readAt(s, dirtyPos),
    [real] = await readDeepWorlds(comp, [t.first], { ...basis, position: dirtyPos }, t.key);
  assert.equal(
    W0.outputJson(exact.output),
    W0.outputJson(W0.evaluateWorld(real!, W0.R1, exact.output.basis) as W0.Output),
  );
  await assert.rejects(a.control.admit("held-before-repair", held), /retry limit/);
  const restored = new DeepAccount(comp, t.key, binding),
    r = await restored.commit(t.first, cmd, V_W0, V_W0 - 100);
  assert(r.duplicate && r.repaired && r.receipt.position === dirtyPos);
  assert(!(await restored.debt(await comp.currentPosition())));
  const v = await restored.readAt(s, await comp.currentPosition());
  assert.equal(W0.outputJson(v.output), W0.outputJson(exact.output));
  await assert.rejects(restored.control.admit("held-after-repair", held), /stale/);
  const seal = await restored.control.seal("release", W0.R2);
  assert.equal((await restored.readAt(s, seal.position)).output.release, W0.R2.hash);
  const rows = await comp.sweepPage([taskId(t.first, 0)], {
      position: seal.position,
      validAt: V_W0,
    }),
    prior = rows.rows.find((f) => f.attribute === ":task/progress")!;
  const another = {
    ...cmd,
    commandId: "second-lost-source",
    operations: [
      { op: "retract", id: prior.id },
      { op: "assert", ...replacement, value: { type: "integer", value: "2" } },
    ],
    preconditions: [{ _tag: "TripleLive", id: prior.id }],
  } as BuiltCommand;
  await assert.rejects(lost.commit(t.first, another, V_W0, V_W0 - 100), /lost raw ACK/);
  const rawCut = await comp.currentPosition(),
    dirty = await new DeepAccount(comp, t.key, binding).decisionsAt([s], rawCut);
  assert.equal(dirty.out.get(s)!.release, W0.R2.hash);
  const next = await restored.control.seal("release-while-save-is-durable", W0.R3);
  assert(
    next.seq === seal.seq + 2 && next.sourceDebtMs > 0 && !(await restored.debt(next.position)),
  );
  const repair = await comp.transactionByCommand(
      restored.db.entity("cmd:event:repair-" + another.commandId),
    ),
    record = await restored.db.get<{ parent: number; sourceCut: number }>(
      "event:" + next.seq,
      next.position,
    );
  assert(
    repair.ok &&
      repair.value?.position === record.value.sourceCut &&
      record.value.parent === next.seq - 1,
  );
  assert.equal((await restored.readAt(s, next.position)).output.release, W0.R3.hash);
  const replay = await restored.commit(t.first, another, V_W0, V_W0 - 100);
  assert(replay.duplicate && replay.receipt.position === rawCut);
});
