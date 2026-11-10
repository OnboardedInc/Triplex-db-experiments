import { DatomicClient } from "../DatomicClient.js";
import { decodeEntity, type ReachWire } from "../reach.js";
import { decodeRowText } from "../rowText.js";
import type { ReplicaSource } from "./Replica.js";

// [DX-R1] Why: use the indexed getTransactionsAfter transport, with exact changed-entity reads at each journal cut.
// Rejected: current-head entity reads (can mix commits) or assuming journals contain physical revision stamps.
export function datomicReplicaSource(
  client: DatomicClient,
  db: string,
  head: () => Promise<number>,
): ReplicaSource {
  return {
    head,
    page: (roots, basis, need) =>
      client.request<ReachWire>("POST", `/v2/db/${db}/reach-many`, {
        roots,
        basis,
        rowPage: true,
        full: true,
        ...(need ? { need: roots } : {}),
      }),
    feed: async (after, limit, waitMs) => {
      const page = await client.request<{
        declined?: string;
        head: number;
        transactions: [string, number, string[]][];
      }>(
        "POST",
        `/v2/db/${db}/transactions`,
        { after, limit, waitMs },
        Math.max(30000, waitMs + 5000),
      );
      if (page.declined !== undefined || !Array.isArray(page.transactions))
        throw new Error("Replica journal declined");
      return {
        head: page.head,
        transactions: page.transactions.map(([txId, position, wire]) => {
          const typed = wire.filter((row) => decodeRowText(row).entity_type === "_Transaction");
          const rows = decodeEntity(txId, position, typed).rows;
          const positions = rows.filter((r) => r.attribute === ":_tx/position");
          if (
            positions.length !== 1 ||
            positions[0]!.value.type !== "number" ||
            positions[0]!.value.value !== position
          )
            throw new Error("Journal position mismatch");
          const changed = rows.filter((r) => r.attribute === ":_tx/changed-entity");
          if (changed.some((r) => r.value.type !== "ref"))
            throw new Error("Invalid changed entity");
          const entities = changed.map((r) => r.value.value as string);
          for (const r of rows.filter((r) => r.attribute === ":_tx/change")) {
            const c = r.value.type === "json" ? (r.value.value as Record<string, unknown>) : null;
            if (
              !c ||
              !["assert", "retract"].includes(String(c["op"])) ||
              typeof c["entityId"] !== "string" ||
              !entities.includes(c["entityId"])
            )
              throw new Error("Journal change coverage mismatch");
          }
          return { position, entities };
        }),
      };
    },
  };
}
