import assert from "node:assert/strict";
import { DatomicClient, withDatomicImportClock } from "../../../../packages/datomic/dist/index.js";
import { openComposition } from "../../../bench/lib/composition.ts";
import { openTriples, runtimeApi } from "../../../bench/lib/triplex.ts";
export async function openNative(scope: string, mode: "history" | "snapshot") {
  const key = String(runtimeApi.DatabaseScope.test(scope)),
    client = new DatomicClient(process.env.DATOMIC_URL!, 35000);
  try {
    const p = await client.create(key, "lean", mode === "snapshot", 35000);
    assert.equal(p.db, "s2-" + Buffer.from(key).toString("base64url"));
    assert.equal(p.strictRecordClocks, mode === "snapshot");
    if (mode === "history") assert(scope.startsWith("import-history-"));
  } finally {
    client.close();
  }
  const base = await openComposition("reach", "datomic", scope),
    historical = mode === "history" ? await openTriples("datomic", scope) : undefined;
  return {
    ...base,
    scopeName: scope,
    mode,
    write: async (ops: any[], meta: Record<string, unknown>, instant?: number) => {
      if (instant === undefined) {
        const r = await base.transact(ops, meta);
        if (!r.ok) throw Error("Import transaction: " + r.tag);
        return r.value;
      }
      assert(historical);
      return (await historical.run(
        withDatomicImportClock(key, instant, historical.triples.transact(ops, meta)),
      )) as { txId: string; position: number; instant: number };
    },
    close: async () => {
      try {
        await historical?.close();
      } finally {
        await base.close();
      }
    },
  };
}
export type Target = Awaited<ReturnType<typeof openNative>>;
