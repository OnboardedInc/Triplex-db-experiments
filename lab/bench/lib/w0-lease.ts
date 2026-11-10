import fs from "node:fs";
import path from "node:path";
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
// [DX-H2] Why: the W0 seed can take several leases; release only between acknowledged commands.
// Rejected: holding the global measurement lock across an unbounded seed or pausing an in-flight transaction.
export async function measurementLease(onAbort?: () => Promise<void>) {
  // [DX-H5] Why: the VM wrapper owns a continuous lease until every container is gone.
  // Rejected: rotating the inner lease while the stack is alive.
  if (process.env.TX2_W0_EXTERNAL_LEASE) {
    const expected = process.env.TX2_W0_EXTERNAL_LEASE;
    const check = () => {
      const owner = JSON.parse(fs.readFileSync(lock + "/owner.json", "utf8"));
      if (!["DX-H5", "DX-H6", "DX-H8"].includes(owner.id) || owner.prefix !== expected)
        throw Error("external lease binding mismatch");
    };
    check();
    return { holds: [{ external: expected }], checkpoint: async () => check(), release: () => {} };
  }
  let held = false,
    since = 0,
    timer: ReturnType<typeof setTimeout>;
  const holds: { startedAt: string; elapsedMs: number; reason: string }[] = [];
  const release = (reason: string) => {
    if (!held) return;
    holds.push({ startedAt: new Date(since).toISOString(), elapsedMs: Date.now() - since, reason });
    clearTimeout(timer);
    held = false;
    fs.rmdirSync(lock);
  };
  const onExit = () => release("exit");
  const onSignal = async () => {
    await onAbort?.();
    release("signal");
    process.exit(128);
  };
  process.on("exit", onExit);
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  const acquire = async () => {
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    while (true) {
      try {
        fs.mkdirSync(lock);
        break;
      } catch (e: any) {
        if (e.code !== "EEXIST") throw e;
      }
      console.error("[DX-H2] waiting for measurement lock");
      await new Promise((r) => setTimeout(r, 5000));
    }
    held = true;
    since = Date.now();
    timer = setTimeout(async () => {
      await onAbort?.();
      console.error("measurement lease expired");
      process.exit(124);
    }, 870000);
  };
  await acquire();
  return {
    holds,
    checkpoint: async (force = false) => {
      if (!force && Date.now() - since < 120000) return;
      release("seed checkpoint");
      await new Promise((r) => setTimeout(r, 5000));
      await acquire();
    },
    release: () => {
      release("complete");
      process.off("exit", onExit);
      process.off("SIGTERM", onSignal);
      process.off("SIGINT", onSignal);
    },
  };
}
