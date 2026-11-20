import assert from "node:assert/strict";
import { DatomicClient, sweepRows } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { epoch, millis, ORIGIN, RELEASE, value, type Store } from "./store.ts";

// [DX-ACT1] Why: a new reader gets the authority's head before it asks a read gateway for that exact prefix. Rejected: accepting a peer's older local head as the requested current cut.
export function demandRoute(source: Store, endpoint: string, ceiling = () => Infinity) {
  const client = new DatomicClient(endpoint, 35000, 64 << 20),
    db =
      "s2-" +
      Buffer.from(String(runtimeApi.DatabaseScope.test(source.scope))).toString("base64url");
  const counts = { peer: 0, fallback: 0, held: 0 };
  const page: typeof source.comp.sweepPage = async (roots, b) => {
    if (b.position > ceiling()) {
      counts.held++;
      counts.fallback++;
      return source.comp.sweepPage(roots, b);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const watermark = await Promise.race([
        client.basis(db).then((x) => Number(x.position.v)),
        new Promise<number>((r) => {
          timer = setTimeout(() => r(-1), 10);
        }),
      ]);
      if (watermark >= b.position && b.position > 0 && roots.length <= 62) {
        const rows = await sweepRows(client, db, [...roots, ORIGIN, RELEASE], {
          recordedPosition: b.position,
          validAt: b.validAt,
        });
        const birth = rows?.find(
          (r) => r.position === 1 && (r.entityId === ORIGIN || r.entityId === RELEASE),
        );
        if (
          rows &&
          birth &&
          value(birth).profile === source.profile &&
          birth.id === (await source.controls(b.position, true)).generation
        ) {
          counts.peer++;
          return {
            rows: rows.filter((r) => r.entityId !== ORIGIN && r.entityId !== RELEASE),
            position: b.position,
            reportedBasis: { ...b },
            epoch: source.scope,
            roundTrips: 2,
          };
        }
      }
    } catch {
    } finally {
      if (timer) clearTimeout(timer);
    }
    counts.fallback++;
    return source.comp.sweepPage(roots, b);
  };
  const store: Store = {
    ...source,
    comp: { ...source.comp, sweepPage: page },
    rows: async (ids, p, v = epoch) => {
      const b = { position: p, validAt: millis(v) },
        r = await page(ids, b);
      assert.deepEqual(r.reportedBasis, b);
      return r.rows;
    },
  };
  return { store, counts, close: () => client.close() };
}
