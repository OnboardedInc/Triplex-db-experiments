// [DX-ACT10] Second review instrumentation (diagnostic toy only), run by the held runner under DX_ACT10_CAUSES=1 before
// the builder's gate parts. It wraps the held account's store commit (nothing in the code under review changes):
//   - every commit that throws gets one line in <out>/act10-causes.jsonl with the whole cause chain (each error's
//     class, tag, HTTP status, gateway code, route and message), the read position it was planned at, the head when it
//     failed, the commits between the two (position, command ID), and the entities its operations retract and guard;
//   - every Joined record (a Publish) that lands gets one line with its position and Datomic t and the positions around
//     it that share that t: a shared t is one physical Datomic transaction, a group commit (TX2_GROUP_COMMIT=1).
// Unset: nothing is wrapped.
import { appendFileSync } from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import type { Store } from "../actv-lazy/store.ts";

type Link = { class?: string; tag?: string; status?: number; code?: string; route?: string; message?: string };
const chain = (e: unknown) => {
  const out: Link[] = [];
  for (let x = e as any, k = 0; x && k < 8; x = x.cause, k++)
    out.push({ class: x?.constructor?.name, tag: x?._tag, status: x?.status, code: x?.code, route: x?.route,
      message: String(x?.message ?? x).slice(0, 400) });
  return out;
};

export function recordCauses(s: Store, out: string) {
  const file = path.join(out, "act10-causes.jsonl");
  const line = (x: unknown) => appendFileSync(file, JSON.stringify(x) + "\n");
  const client = new DatomicClient(process.env.DATOMIC_URL!);
  const db = "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
  const tOf = async (commandId: string) => {
    try {
      const r = await client.request<{ txId: string | null; receipt?: { t?: { v: string }; position?: { v: string } } }>(
        "POST", `/v1/db/${db}/claim`, { commandId, receipt: true }, 5000);
      return r.receipt?.t?.v ?? null;
    } catch (e) {
      return "error: " + String((e as Error)?.message).slice(0, 80);
    }
  };
  const between = async (from: number, to: number) => {
    if (!(to > from)) return [];
    const page = await s.comp.feedPage(from, Math.min(64, to - from));
    return (page.transactions as { position: number; commandId?: string }[])
      .filter((t) => t.position > from && t.position <= to)
      .map((t) => [t.position, String(t.commandId ?? "")]);
  };
  const commit = s.commit;
  (s as { commit: Store["commit"] }).commit = async (...args: Parameters<Store["commit"]>) => {
    const [id, , ops, expected, , , , guards] = args;
    try {
      const r = await commit(...args);
      if (String(id).startsWith("joined:")) {
        const t = await tOf(String(id));
        const near = await between(Math.max(0, r.position - 7), r.position + 6);
        const shared: [number, string][] = [];
        for (const [p, c] of near as [number, string][]) if (p !== r.position && c && (await tOf(c)) === t) shared.push([p, c]);
        line({ kind: "landed", id, position: r.position, expected, t, sharedT: shared, at: new Date().toISOString() });
      }
      return r;
    } catch (e) {
      const head = await s.head().catch(() => -1);
      line({
        kind: "refused", id, expected, head, at: new Date().toISOString(), chain: chain(e),
        between: await between(expected, head).catch((x) => "error: " + String(x?.message)),
        retracts: (ops as { op: string; id?: string }[]).filter((o) => o.op === "retract").map((o) => o.id),
        asserts: [...new Set((ops as { op: string; entityId?: string }[]).filter((o) => o.op === "assert").map((o) => o.entityId))],
        guards: (guards ?? []).map((g) => [g.entityId, g.tripleIds.length]),
      });
      throw e;
    }
  };
}
