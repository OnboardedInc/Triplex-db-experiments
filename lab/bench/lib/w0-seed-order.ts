import { DatomicClient } from "../../../packages/datomic/dist/index.js";
import { DatabaseScope } from "../../../packages/core/dist/runtime/index.js";
import type { CompositionHandle } from "./composition.ts";
// [DX-H6] Why: JS invocation order precedes Effect preparation; command 3 reached position 18 at window 16.
// Rejected: assuming clock-ticket order equals the reference caller order, or waiting for every ACK.
const waiting = new Map<string, () => void>();
const original = DatomicClient.prototype.transact;
DatomicClient.prototype.transact = function (...args: any[]) {
  if (!waiting.size) return (original as any).apply(this, args);
  const [db, input, onSent] = args;
  const command = input.claims?.find((claim: any) => waiting.has(db + "\0" + claim.commandId));
  if (!command) return (original as any).apply(this, args);
  const notify = waiting.get(db + "\0" + command.commandId)!;
  const prior = onSent ?? input.onSent;
  const sent = () => {
    prior?.();
    notify();
  };
  return (original as any).call(this, db, { ...input, onSent: sent }, sent);
};
export async function submitReferenceCommand(
  comp: CompositionHandle,
  operations: readonly any[],
  meta: Record<string, unknown>,
) {
  if (comp.backend?.name !== "datomic") return { ack: comp.transact(operations, meta) };
  if (!comp.scopeName || typeof meta.commandId !== "string")
    throw Error("ordered Datomic seed requires scope and command id");
  const db = "s2-" + Buffer.from(String(DatabaseScope.test(comp.scopeName))).toString("base64url");
  const key = db + "\0" + meta.commandId;
  if (waiting.has(key)) throw Error("duplicate pending seed submission");
  let notify!: () => void;
  const sent = new Promise<void>((resolve) => {
    notify = resolve;
  });
  waiting.set(key, notify);
  const ack = comp.transact(operations, meta);
  void ack.catch(() => {});
  try {
    await Promise.race([
      sent,
      ack.then((result) => {
        throw Error(
          result.ok
            ? "seed ACK without its send boundary"
            : "seed preparation failed: " + result.tag,
        );
      }),
    ]);
    return { ack };
  } finally {
    waiting.delete(key);
  }
}
