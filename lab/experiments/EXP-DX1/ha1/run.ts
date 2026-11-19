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
export async function drill(
  e: Evidence,
  a: Site,
  b: Site,
  profile: { people: number; scopes: number; capacity: string },
  release: () => void,
) {
  const s = new Stack(e, a, b);
  let result: unknown;
  try {
    assert(
      Number.isSafeInteger(profile.people) &&
        profile.people > 0 &&
        profile.people <= (e.mode.startsWith("one-") ? 1500000 : 100000),
    );
    await s.open();
    if (e.mode === "failures")
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
      release();
      e.write("cleanup", { nonce: e.nonce, containers: 0, networks: 0 });
    }
  }
  assert.deepEqual(inputs(), e.source, "Executed inputs changed during drill");
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
}
