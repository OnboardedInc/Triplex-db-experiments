import type { DatomicClient } from "../../../packages/datomic/dist/index.js";

// [DX-T1-14] Why: opening the populated 100k database took 5.4s before any judged offer, exceeding the default 5s request budget.
// Rejected: increase every read deadline, drop exact receipt fallback, retry with background requests, or count setup as a judged phase.
export function initializeReplicaClient(
  client: Pick<DatomicClient, "create">,
  scope: string,
  layout: string,
) {
  if (layout !== "lean" && layout !== "legacy") throw Error("Invalid replica layout");
  return client.create(scope, layout, false, 35_000);
}
