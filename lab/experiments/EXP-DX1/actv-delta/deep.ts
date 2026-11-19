import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { BuiltCommand } from "../../../bench/lib/commands.ts";
import { receiptOfRecord } from "../../../bench/lib/seed.ts";
import { Account } from "./account.ts";
import { Objects, Conflict, hash, type Cell } from "./store.ts";
import { evaluate, resolve, seedFacts, worldOf, type Body, type Edit } from "./model.ts";
import { save } from "./save.ts";
import { iso } from "./v3.ts";
type Debt = {
  command: string;
  intent: string;
  index: number;
  sourceBefore: number;
  validAt: number;
  from: string;
  nativeOps: number;
};
export class DeepAccount {
  readonly comp: CompositionHandle;
  readonly db: Objects;
  readonly control: Account;
  readonly binding: string;
  constructor(comp: CompositionHandle, name: string, binding: string) {
    this.comp = comp;
    this.binding = binding;
    this.db = new Objects(comp, name);
    this.control = this.guarded();
  }
  private guarded(debt?: Cell<Debt>) {
    const entityId = this.db.entity("deep-debt"),
      prefix = this.db.entity("cmd:event:"),
      comp = this.comp;
    // [DX-ACT2] Why: a real deep source commit obtains its assertion positions only from Datomic. The durable debt fences every release until those exact positions have been indexed and published. Rejected: guessing the next scope offset while neighboring accounts save.
    const bound: CompositionHandle = {
      ...comp,
      transact: async (ops, meta) => {
        if (!String(meta.commandId).startsWith(prefix)) return comp.transact(ops, meta);
        return comp.transact(debt ? [{ op: "retract", id: debt.id }, ...ops] : ops, {
          ...meta,
          preconditions: [
            ...((meta.preconditions as unknown[]) ?? []),
            { _tag: "EntityState", entityId, tripleIds: debt ? [debt.id] : [] },
          ],
        });
      },
    };
    return new Account(
      new Objects(bound, this.db.account),
      this.binding,
      undefined,
      debt ? undefined : () => this.repair(),
      !!debt,
    );
  }
  async debt(p: number) {
    return (await this.db.many<Debt>(["deep-debt"], p)).get("deep-debt");
  }
  async repair() {
    const p = await this.comp.currentPosition(),
      debt = await this.debt(p);
    if (!debt) return;
    const d = debt.value,
      subject = W0.placementId(d.index),
      h = (await this.control.head(d.sourceBefore)).value;
    const [raw] = await readDeepWorlds(
      this.comp,
      [d.index],
      { position: debt.position, validAt: d.validAt },
      this.db.account,
    );
    const before = (await this.db.get<Body>("point:" + subject, d.sourceBefore)).value;
    const facts = seedFacts(raw!, { tx: debt.position, validTime: iso(d.validAt) }),
      old = worldOf(before, h.basis);
    const values = (fs: readonly W0.Fact[]) => {
      const m = new Map<string, W0.Fact[]>();
      for (const f of fs) {
        const k = canonical([f.e, f.a]),
          v = m.get(k) ?? [];
        v.push(f);
        m.set(k, v);
      }
      return m;
    };
    const a = values(old.facts),
      b = values(facts),
      edits: Edit[] = [];
    for (const k of new Set([...a.keys(), ...b.keys()])) {
      const earlier = a.get(k) ?? [],
        later = b.get(k) ?? [];
      if (canonical(earlier) === canonical(later)) continue;
      const [e, attr] = JSON.parse(k);
      assert(
        later.every((f) => f.tx === debt.position),
        "deep source requires full rematerialization of an older assertion",
      );
      edits.push({ e, a: attr, from: d.from, values: later.map((f) => f.v) });
    }
    const tag = "repair-" + d.command,
      writer = this.guarded(debt),
      result = await save(writer, tag, edits, { touch: subject, originTx: debt.position });
    const v = await this.control.readAt(subject, result.position),
      expected = evaluate(raw!, resolve(v.head.activations, v.head.basis.validTime), v.head.basis);
    assert.equal(
      W0.outputJson(v.output),
      W0.outputJson(expected),
      "deep policy diverges from raw native source",
    );
    return {
      seq: result.seq,
      basis: v.head.basis,
      doc: resolve(v.head.activations, v.head.basis.validTime).doc,
      subject,
      edits,
    };
  }
  async commit(index: number, cmd: BuiltCommand, validAt: number, from: number) {
    const id = cmd.commandId,
      token = hash([index, id, cmd.operations, cmd.preconditions, from, validAt]),
      k = "deep-claim:" + hash(id);
    for (let tries = 0; tries < 32; tries++) {
      const p = await this.comp.currentPosition(),
        old = (await this.db.many<{ token: string }>([k], p)).get(k);
      if (old) {
        assert.equal(old.value.token, token, "deep command identity reused");
        const receipt = await this.comp.transactionByCommand(this.db.entity("cmd:source:" + id));
        assert(receipt.ok && receipt.value?.position === old.position);
        const repaired = await this.repair();
        return { receipt: receiptOfRecord(receipt.value), repaired, duplicate: true };
      }
      if (await this.control.settleFence(p)) continue;
      const pending = await this.debt(p);
      if (pending) {
        await this.repair();
        continue;
      }
      const head = await this.control.head(p);
      const value: Debt = {
        command: id,
        intent: token,
        index,
        sourceBefore: p,
        validAt,
        from: iso(from),
        nativeOps: cmd.operations.length,
      };
      try {
        await this.db.commit(
          "source:" + id,
          [
            { key: k, value: { token } },
            { key: "deep-debt", value },
          ],
          [
            { key: "head", cell: head },
            { key: "fence", cell: undefined },
            { key: "deep-debt", cell: undefined },
            { key: k, cell: undefined },
          ],
          cmd.operations,
          cmd.preconditions,
        );
      } catch (e) {
        if (e instanceof Conflict) continue;
        throw e;
      }
      const claim = await this.comp.transactionByCommand(this.db.entity("cmd:source:" + id));
      assert(claim.ok && claim.value);
      const receipt = receiptOfRecord(claim.value),
        repaired = await this.repair();
      return { receipt, repaired, duplicate: false };
    }
    throw Error("deep command contention limit");
  }
  async readAt(subject: string, p: number) {
    const debt = await this.debt(p);
    if (!debt) return this.control.readAt(subject, p);
    const d = debt.value,
      at = d.validAt,
      prior = await this.control.readAt(subject, d.sourceBefore),
      basis = { tx: debt.position, validTime: iso(at) };
    const id = Number(subject.slice(4));
    assert(W0.placementId(id) === subject);
    const [w] = await readDeepWorlds(
      this.comp,
      [id],
      { position: p, validAt: at },
      this.db.account,
    );
    const output = evaluate(w!, resolve(prior.head.activations, basis.validTime), basis);
    return {
      ...prior,
      output,
      state: d.index === id ? W0.publish(prior.state, [W0.recordOf(output)]).state : prior.state,
    };
  }
}
