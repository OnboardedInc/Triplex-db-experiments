import type { DatomicClient } from "../DatomicClient.js";
import { decodeEntity } from "../reach.js";
import { decodeRowText } from "../rowText.js";
import { datomicReplicaSource } from "./source.js";
import type { ReplicaSource } from "./Replica.js";

// [DX-R3] Why: reuse the validated journal transport and extract record clocks from those same bytes.
// Rejected: writer ACK clocks alone (other writers' receipts would be absent).
export function timedReplicaSource(
  client: DatomicClient,
  db: string,
  head: () => Promise<number>,
): {
  source: ReplicaSource;
  times: Map<number, number>;
} {
  const times = new Map<number, number>();
  const transport = {
    async request(method: any, route: string, body: any, timeout?: number) {
      const response = await client.request<any>(method, route, body, timeout);
      if (route.endsWith("/transactions") && Array.isArray(response.transactions)) {
        for (const [id, position, wire] of response.transactions) {
          const typed = wire.filter(
            (text: string) => decodeRowText(text).entity_type === "_Transaction",
          );
          const rows = decodeEntity(id, position, typed).rows;
          const instant = rows.filter((row) => row.attribute === ":_tx/instant");
          const time =
            instant.length === 1 && instant[0]!.value.type === "datetime"
              ? instant[0]!.value.value
              : NaN;
          const changes = rows.filter((row) => row.attribute === ":_tx/change");
          const regular = changes.every((row) => {
            if (row.value.type !== "json") return false;
            const change = row.value.value as Record<string, unknown>;
            return (
              (change["op"] === "retract" ? change["retractedAt"] : change["recordedAt"]) === time
            );
          });
          times.set(position, regular ? time : NaN);
        }
      }
      return response;
    },
  } as DatomicClient;
  return { source: datomicReplicaSource(transport, db, head), times };
}
