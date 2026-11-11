import { gunzipSync } from "node:zlib";
import type { DatomicClient } from "../DatomicClient.js";
import { decodeEntity, type ReachWire } from "../reach.js";
import { decodeRowText } from "../rowText.js";
import type { ReplicaSource } from "./Replica.js";

// [DX-R2] Why: opt in without changing existing journal callers or the legacy replica source.
// Rejected: silently using per-journal reads when the server lacks exact inline replacements.
export function inlineSource(
  client: DatomicClient,
  db: string,
  head: () => Promise<number>,
  validAt: number,
): ReplicaSource {
  return {
    head,
    async capability(basis) {
      const result = await client.request<{ supported?: boolean; declined?: string }>(
        "POST",
        `/v2/db/${db}/reach-many`,
        { replicaCapability: true, basis },
      );
      return result.supported === true ? undefined : (result.declined ?? "missing-capability");
    },
    async page(roots, basis, need) {
      const response = await client.request<ReachWire | { gzipRows: string }>(
        "POST",
        `/v2/db/${db}/reach-many`,
        {
          roots,
          basis,
          rowPage: true,
          full: true,
          gzipRows: true,
          ...(need ? { need: roots } : {}),
        },
      );
      return "gzipRows" in response
        ? (JSON.parse(
            gunzipSync(Buffer.from(response.gzipRows, "base64"), {
              maxOutputLength: 64 * 1024 ** 2,
            }).toString("utf8"),
          ) as ReachWire)
        : response;
    },
    async feed(after, limit, waitMs) {
      const page = await client.request<{
        declined?: string;
        head: number;
        transactions: [string, number, string[], ReachWire][];
      }>(
        "POST",
        `/v2/db/${db}/transactions`,
        // [DX-R2] Why: activation can leave hundreds of 64-subject publication journals queued; bound response/packing bursts.
        // Rejected: returning 1,000 complete replacement payloads in one response (can exceed the 64 MiB client cap).
        { after, limit: Math.min(limit, 16), waitMs, replicaRows: true, validAt },
        Math.max(30000, waitMs + 5000),
      );
      if (page.declined !== undefined || !Array.isArray(page.transactions))
        throw new Error("Replica journal declined: " + page.declined);
      return {
        head: page.head,
        transactions: page.transactions.map(([txId, position, wire, replacement]) => {
          const rows = decodeEntity(
            txId,
            position,
            wire.filter((row) => decodeRowText(row).entity_type === "_Transaction"),
          ).rows;
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
          for (const row of rows.filter((r) => r.attribute === ":_tx/change")) {
            const c =
              row.value.type === "json" ? (row.value.value as Record<string, unknown>) : null;
            if (
              !c ||
              !["assert", "retract"].includes(String(c["op"])) ||
              typeof c["entityId"] !== "string" ||
              !entities.includes(c["entityId"])
            )
              throw new Error("Journal change coverage mismatch");
          }
          if (!replacement) throw new Error("Missing inline replacement");
          return { position, entities, replacement };
        }),
      };
    },
  };
}
