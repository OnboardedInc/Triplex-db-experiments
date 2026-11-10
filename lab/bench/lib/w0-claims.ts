import type { TriplesHandle } from "./triplex.ts";
// [DX-H2] Why: core transactionByCommand scans all facts before filtering command rows on D.
// Rejected: an ACK cache (would bypass actual lost-ACK claim resolution) or changing package code.
export async function w0Claims(handle: TriplesHandle) {
  const { DatomicClient } = await import("../../../packages/datomic/dist/index.js");
  const client = new DatomicClient(handle.backend.url, 35000);
  try {
    const created = await client.create(String(handle.scope));
    const expected = "s2-" + Buffer.from(String(handle.scope), "utf8").toString("base64url");
    if (created.db !== expected) throw Error("W0 claim database identity mismatch");
    return {
      lookup: async (commandId: string) => {
        const position = Number(await handle.run(handle.triples.currentPosition()));
        if (!Number.isSafeInteger(position) || position < 0) throw Error("W0 invalid claim basis");
        const txId = await client.claim(created.db, commandId, position);
        if (txId === null) return { ok: true as const, value: null };
        if (typeof txId !== "string" || !txId) throw Error("W0 invalid stored claim identity");
        const record: any = await handle.run(handle.triples.transaction(txId));
        if (
          !record ||
          record.txId !== txId ||
          record.commandId !== commandId ||
          !Number.isSafeInteger(record.position) ||
          record.position < 1 ||
          record.position > position
        )
          throw Error("W0 stored claim/journal binding mismatch");
        return { ok: true as const, value: record };
      },
      close: () => client.close(),
    };
  } catch (e) {
    client.close();
    throw e;
  }
}
