import { pathToFileURL } from "node:url";
import { Effect, runtimeApi, REPO } from "./triplex.ts";
import { reachPull, type Basis } from "./composition.ts";
const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);
// [DX-R3-P9] Why: a receipt fallback must retain its exact position on a read peer, without constructing a writer runtime.
// Rejected: time-only RYOW on a lagging peer, or runtime initialization after the replica's bootstrap cut.
export async function openPositionGateway(scope: string, endpoint: string, client = new api.DatomicClient(endpoint)) {
  const key = runtimeApi.DatabaseScope.test(scope);
  await client.create(key, process.env.TRIPLEX_DATOMIC_LAYOUT === "legacy" ? "legacy" : "lean");
  const storage = api.makeDatomicStorageAdapter(client, key);
  const handle = { storage, triples: {}, backend: { name: "datomic", url: endpoint, queryPath: "readonly-position" }, run: <A>(effect: any): Promise<A> => Effect.runPromise(effect) as Promise<A> };
  return {
    async pull(root: string, basis: Basis) {
      if (!Number.isSafeInteger(basis.recordedPosition) || basis.recordedPosition! < 0)
        throw Error("Receipt gateway capture requires an exact position");
      return reachPull(handle, root, basis, undefined, "datomic-position");
    },
    close() { client.close(); },
  };
}
