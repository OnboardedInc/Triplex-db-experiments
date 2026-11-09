import { runW0Sweep } from "./sweep.ts";
let seq = 0;
const pending = new Map<number, { resolve: (r: any) => void; reject: (e: any) => void }>();
function rpc(method: string, args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    process.send!({ type: "rpc", id, method, args });
  });
}
process.on("message", async (m: any) => {
  if (m.type === "reply") {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p?.reject(new Error(m.error));
    else p?.resolve(m.value);
    return;
  }
  if (m.type !== "start") return;
  const comp: any = {
    sweepPage: (...args: any[]) => rpc("sweepPage", args),
    ...(m.options.positionBinding ? { positionBinding: () => m.options.positionBinding } : {}),
  };
  try {
    const result = await runW0Sweep({
      ...m.options,
      comp,
      composition: "memory",
      // [EXP-P5N] Why: the recovery gate exercises the pipelined publisher, so the child may run more than one worker. Rejected: forcing 1 (a single worker never has a page queued behind another's publication).
      workers: m.options.workers ?? 1,
      onPage: async (records, page) => {
        await rpc("publish", [records, page]);
      },
      afterCheckpoint: (page) => rpc("checkpoint", [page]),
    });
    process.send!({ type: "done", result });
    process.disconnect?.();
  } catch (e: any) {
    process.send!({ type: "failure", error: String(e.stack ?? e) });
    process.disconnect?.();
    process.exitCode = 1;
  }
});
