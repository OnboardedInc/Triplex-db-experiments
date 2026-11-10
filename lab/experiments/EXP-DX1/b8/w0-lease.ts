import fs from "node:fs";
// [DX-B8] Why: the inherited H5 lease helper hard-codes DX-H5; B8 must prove its own lock ownership.
// Rejected: impersonating H5 in owner.json, editing lab/bench, or rotating a lease while engines exist.
export async function measurementLease() {
  const prefix = process.env.TX2_W0_EXTERNAL_LEASE!;
  const pid = Number(process.env.TX2_W0_OWNER_PID);
  if (!/^tx2-dxb8-[a-z0-9-]+$/.test(prefix) || !Number.isSafeInteger(pid) || pid <= 0)
    throw Error("Invalid B8 external lease identity");
  if (process.env.DATOMIC_URL !== `http://${prefix}-gw-w:8080`)
    throw Error("B8 external lease endpoint mismatch");
  const check = () => {
    const owner = JSON.parse(fs.readFileSync("/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json", "utf8"));
    if (owner.id !== "DX-B8" || owner.pid !== pid) throw Error("B8 external lease binding mismatch");
  };
  check();
  return { holds: [{ external: prefix, owner: "DX-B8", pid }], checkpoint: async () => check(), release: () => {} };
}
