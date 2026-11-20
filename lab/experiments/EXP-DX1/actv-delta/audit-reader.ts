import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { openComposition } from "../../../bench/lib/composition.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
import type { DurabilityMode } from "./model.ts";
import type { Decision } from "./service.ts";
import { hash } from "./store.ts";
import { iso } from "./v3.ts";

type Connect = { scope: string; account: string; binding: string; seed: number };
type Input =
  | { kind: "read"; subject: string }
  | { kind: "proof"; seq: number; cut: number; mode: DurabilityMode };
type Wire = { id: number; input: Input };
export function readerProcess(connect: Connect) {
  const child = fork(import.meta.filename, [JSON.stringify(connect)], {
    execArgv: ["--import", "tsx"],
    stdio: ["ignore", "ignore", "inherit", "ipc"],
    env: { ...process.env, DATOMIC_URL: process.env.DELTA_READER_URL ?? process.env.DATOMIC_URL },
  });
  let next = 0,
    error: Error | undefined;
  const pending = new Map<number, { ok: (v: any) => void; fail: (e: Error) => void }>();
  function dead(e: Error) {
    error ??= e;
    for (const p of pending.values()) p.fail(e);
    pending.clear();
  }
  const ready = new Promise<void>((ok, fail) => pending.set(0, { ok, fail }));
  child.on("error", dead);
  const ended = new Promise<void>((ok) =>
    child.once("exit", (code, signal) => {
      dead(Error("cold reader stopped " + code + "/" + signal));
      ok();
    }),
  );
  child.on("message", (m: any) => {
    const p = pending.get(m.id);
    assert(p);
    pending.delete(m.id);
    if (m.id === 0 && m.value !== hash(connect))
      p.fail(Error("cold reader opened the wrong request"));
    else if (m.error) p.fail(Error(m.error));
    else p.ok(m.value);
  });
  async function exchange<T>(input: Input): Promise<T> {
    await ready;
    if (error) throw error;
    return new Promise<T>((ok, fail) => {
      const id = ++next;
      pending.set(id, { ok, fail });
      child.send({ id, input }, (e) => {
        if (e) dead(e);
      });
    });
  }
  return {
    name: "fresh-process",
    read: (subject: string) => exchange<Decision>({ kind: "read", subject }),
    proof: (mode: DurabilityMode, seq: number, cut: number) =>
      exchange<{ digest: string; chunks: any[] }>({ kind: "proof", mode, seq, cut }),
    async close() {
      if (child.connected) child.disconnect();
      await ended;
    },
  };
}

if (process.argv[1] === import.meta.filename) {
  const setup: Connect = JSON.parse(process.argv[2]!),
    { reopenDeepPolicy } = await import("./solo-policy.ts"),
    { DeepAccount } = await import("./deep.ts"),
    { CurrentDecisions } = await import("./service.ts"),
    { decodeOwed, openStored } = await import("./dispatch.ts");
  const c = await openComposition("reach", "datomic", setup.scope);
  try {
    const { read } = await reopenDeepPolicy(c, setup.seed),
      service = new DeepAccount(c, setup.account, setup.binding, read),
      route = new CurrentDecisions(service, () => iso(V_W0));
    process.on("message", async ({ id, input }: Wire) => {
      try {
        let value;
        if (input.kind === "read") value = await route.read(input.subject);
        else if (input.mode === "stored")
          value = await openStored(service.control, input.seq, input.cut);
        else {
          const record = await decodeOwed(service.control, input.seq, input.cut),
            chunks = [];
          const absent = await service.db.many(
            ["chunk:" + input.seq + ":0", "stored:" + input.seq],
            input.cut,
          );
          assert.equal(absent.size, 0, "a concrete row existed before the record endpoint");
          for await (const { chunk } of record.chunks) chunks.push(chunk);
          value = { digest: record.owed, chunks };
        }
        process.send?.({ id, value });
      } catch (e) {
        process.send?.({ id, error: String(e) });
      }
    });
    process.send?.({ id: 0, value: hash(setup) });
    await new Promise<void>((ok) => process.once("disconnect", ok));
  } finally {
    await c.close();
  }
}
