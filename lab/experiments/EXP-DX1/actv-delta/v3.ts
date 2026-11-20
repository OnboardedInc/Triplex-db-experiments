import assert from "node:assert/strict";
import { W0, V_W0 } from "../../../bench/lib/w0-world.ts";
import { mapW0Trace } from "../../../bench/lib/w0-trace.ts";
import { openW0Window } from "../../../bench/lib/w0-traffic.ts";
import type { TraceEvent } from "../../../bench/lib/trace.ts";
import { Account } from "./account.ts";
import { save } from "./save.ts";
import type { Edit } from "./model.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { hash } from "./store.ts";
export const iso = (ms: number) => new Date(ms).toISOString().replace(/(\.\d{3})Z$/, "$1000Z");
export class Window {
  readonly comp: CompositionHandle;
  readonly account: Account;
  readonly position: number;
  constructor(comp: CompositionHandle, account: Account, position: number) {
    this.comp = comp;
    this.account = account;
    this.position = position;
  }
  static async open(comp: CompositionHandle, account: Account, name: string) {
    return new Window(comp, account, await openW0Window(comp, account.db.account + ":" + name));
  }
  async apply(event: TraceEvent) {
    const m = mapW0Trace(event, this.position),
      subject = W0.placementId(event.subject),
      id = m.commandId;
    const token = hash([m.rows, event.correction, id]),
      key = "trace:" + hash(id),
      before = await this.comp.currentPosition();
    const checked = (p: number) => this.account.db.get<{ token: string }>(key, p);
    const prior = (
      await this.account.db.many<{ token: string; validFrom: number }>([key], before)
    ).get(key);
    if (prior) {
      assert.equal(prior.value.token, token, "trace identity reused");
      if (!event.resend)
        assert.equal(prior.value.validFrom, m.validFrom, "original valid time changed");
      return {
        position: prior.position,
        retry: true,
        bytes: 0,
        operations: 0,
        edits: [] as Edit[],
      };
    }
    assert(!event.resend, "resend before original commit");
    const scalar = m.rows
      .filter(([e, a]) => e === subject && a !== "answers" && a !== "decisions")
      .map((r) => r[1]);
    const actual = scalar.length
      ? await this.comp.w0Attributes!(subject, scalar, {
          position: before,
          validAt: V_W0 + Math.floor(event.atMs),
        })
      : [];
    const edits: Edit[] = m.rows
      .filter(([e, a]) => a !== "answers" && !e.includes("/ans:"))
      .map(([e, a, v]) => ({
        e,
        a,
        values: [v],
        from: iso(m.validFrom),
        ...(a === "decisions" ? { append: true } : {}),
      }));
    const traceObj = { token, validFrom: m.validFrom };
    // [DX-ACT2] Why: the normal source assertions and the index update must share one atomic ACK. Rejected: following the source feed after a successful save (leaves an uncertified gap).
    const nativeOps = [...actual.map((f) => ({ op: "retract", id: f.id })), ...m.operations],
      nativePreconditions = actual.map((f) => ({ _tag: "TripleLive", id: f.id }));
    const result = await save(this.account, id, edits, {
      nativeOps,
      nativePreconditions,
      trace: { key, value: traceObj },
    });
    const witness = await checked(result.position);
    assert.equal(witness.value.token, token);
    assert.equal(witness.position, result.position);
    if (event.ackLoss) {
      const recovered = await this.comp.transactionByCommand(
        this.account.db.entity("cmd:event:" + id),
      );
      assert(recovered.ok && recovered.value.position === result.position);
    }
    return { ...result, edits };
  }
}
