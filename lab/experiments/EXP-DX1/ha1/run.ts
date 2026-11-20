import assert from "node:assert/strict";
import { Evidence, inputs } from "./common.ts";
import { Stack, type Site } from "./stack.ts";
import { replication } from "./replication.ts";
import { move } from "./move.ts";
import { oneBackup } from "./one-backup.ts";
import { oneAccount } from "./one-account.ts";
import { oneWhole } from "./one-whole.ts";
import { oneFailover } from "./one-failover.ts";
import { failures } from "./failures.ts";
import type { Checkpoint } from "../hasync1/seed.ts";
export async function drill(
  e: Evidence,
  a: Site,
  b: Site,
  profile: { people: number; scopes: number; capacity: string },
  release: () => void,
  sync?: {
    path: string;
    checkpoint?: Checkpoint;
    deadline: number;
    credentials: { secret: string; admin: string };
    ownerUid?: number;
    ownerGid?: number;
  },
) {
  const s = new Stack(e, a, b, sync?.credentials);
  let cleanupShared: (() => Promise<void>) | undefined;
  let result: unknown;
  try {
    assert(
      Number.isSafeInteger(profile.people) &&
        profile.people > 0 &&
        profile.people <= (e.mode.startsWith("one-") || e.mode === "load-quiet" ? 1500000 : 100000),
    );
    await s.open();
    if (e.mode.startsWith("hasync-")) {
      const { SyncPair } = await import("../hasync1/pair.ts");
      const pair = new SyncPair(s, sync);
      cleanupShared = () => pair.cleanup();
      if (e.mode.startsWith("hasync-seed-")) {
        assert(sync);
        const { buildCheckpoint } = await import("../hasync1/seed.ts");
        result = await buildCheckpoint(
          pair,
          e.mode === "hasync-seed-lean" ? "lean" : "legacy",
          profile.people,
          sync.deadline,
          e.mode === "hasync-seed-edited",
        );
      } else if (e.mode === "hasync-smoke") {
        const { smoke } = await import("../hasync1/smoke.ts");
        result = await smoke(pair, profile.people);
      } else if (e.mode === "hasync-cost-plain" || e.mode === "hasync-cost-group") {
        const { costDrill } = await import("../hasync1/cost.ts");
        result = await costDrill(
          pair,
          profile.people,
          e.mode === "hasync-cost-group",
          sync ? { blockSize: 512 } : {},
        );
      } else if (e.mode === "hasync-move") {
        const { moveDrill } = await import("../hasync1/move.ts");
        result = await moveDrill(pair, profile.people, sync ? { auditSeed: false } : {});
      } else {
        const { faultDrill } = await import("../hasync1/faults.ts");
        result = await faultDrill(pair, profile.people, e.mode, sync ? { auditSeed: false } : {});
      }
    } else if (e.mode.startsWith("load-"))
      result = await (await import("../load1/run.ts")).load(s, profile.people);
    else if (e.mode === "failures")
      result = await failures(
        s,
        profile.scopes,
        profile.capacity === "two-host" ? profile.people : 0,
      );
    else if (e.mode === "move") result = await move(s, profile.people);
    else if (e.mode === "replication") result = await replication(s);
    else if (e.mode === "one-failover") result = await oneFailover(s, profile.people);
    else if (e.mode === "one-backup") result = await oneBackup(s, profile.people);
    else if (e.mode === "one-whole" || e.mode === "one-sync")
      result = await oneWhole(s, profile.people, e.mode === "one-sync");
    else if (e.mode === "one-account") result = await oneAccount(s, profile.people);
    else throw Error("One-database experiment not installed");
  } catch (err: any) {
    e.write("failure", {
      name: err.name,
      message: s.redact(String(err.message)),
      stack: s.redact(String(err.stack)),
    });
    throw Error(s.redact(String(err.message)));
  } finally {
    try {
      await s.capture();
    } finally {
      await s.cleanup();
      await cleanupShared?.();
      release();
      e.write("cleanup", { nonce: e.nonce, containers: 0, networks: 0 });
    }
  }
  assert.deepEqual(inputs(e.mode), e.source, "Executed inputs changed during drill");
  e.write("observations", {
    nonce: e.nonce,
    source: e.source,
    slot: e.slot,
    profile: e.mode.startsWith("one-")
      ? {
          people: profile.people,
          capacity: profile.capacity,
          seedShape: e.shape,
          sourceDatabases: 1,
        }
      : profile,
    result,
  });
  return result;
}
