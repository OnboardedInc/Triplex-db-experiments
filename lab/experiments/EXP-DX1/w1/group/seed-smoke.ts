import assert from "node:assert/strict";
import { DatomicClient, DatomicHttpError } from "../../../../../packages/datomic/dist/index.js";
import { ids } from "../../../../bench/lib/world.ts";
import { deepPopulation } from "../../../../bench/lib/deep-world.ts";
import { accounts, tenantRows } from "./population.ts";
import { verifyPopulation } from "./seed-readback.ts";
import { command } from "./workload.ts";
const [url, nonce] = process.argv.slice(2);
assert(url && nonce);
const c = new DatomicClient(url, 30_000);
const spec = {
  accounts: accounts.slice(0, 2).map((a, i) => ({ ...a, first: i * 4, people: 4 })),
  total: 2 * (deepPopulation(4).facts + 10),
  sha256: "887a76d7a3481b8df45b01302106bfad50e858fd3c86908eae5d7628db8e9825",
};
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", "seed-" + nonce, 0]);
try {
  const { created, db } = await c.create(scope, "lean", true);
  assert(created);
  for (const a of spec.accounts) {
    const rows = Array.from({ length: 4 }, (_, i) => tenantRows(a, i)).flat();
    await c.transact(db, command("seed-" + a.index + "-0", rows, [], false));
  }
  const workload = Array.from({ length: 16 }, (_, i) => {
    const a = spec.accounts[i % 2]!;
    const input = command("activity" + i, [
      { e: ids.placement(a.first), a: ":save/field", v: { type: "string", value: "value" + i } },
    ]);
    input.groupAccount = a.key;
    return input;
  });
  const saved = (await Promise.all(workload.map((s) => c.transact(db, s)))) as {
    groupSize: number;
    position: { v: string };
  }[];
  assert(saved.some((r) => r.groupSize > 1));
  assert.deepEqual(
    saved.map((r) => Number(r.position.v)).sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, i) => i + 3),
  );
  const bad = command("mislabel", [
    { e: ids.placement(0), a: ":save/field", v: { type: "string", value: "mislabel" } },
  ]);
  bad.groupAccount = spec.accounts[1]!.key;
  await assert.rejects(
    c.transact(db, bad),
    (e: unknown) => e instanceof DatomicHttpError && e.code === "InvalidValue",
  );
  assert.equal((await c.operation(db, "mislabel")).status, "absent");
  const readback = await verifyPopulation(url, { scope, db, phases: [{ firstPosition: 3 }] }, spec);
  console.log(
    "W1_SEED_SMOKE " +
      JSON.stringify({ nonce, db, readback, grouped: saved.filter((r) => r.groupSize > 1).length }),
  );
} finally {
  c.close();
}
