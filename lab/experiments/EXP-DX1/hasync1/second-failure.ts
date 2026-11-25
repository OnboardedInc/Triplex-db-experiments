import assert from "node:assert/strict";
import { populate, type Account, type Receipt } from "../ha1/one-db.ts";
import { DatomicClient, errorCode } from "../../../../packages/datomic/test/ha1-account.ts";
import type { Role } from "../ha1/common.ts";
import type { SyncPair } from "./pair.ts";
import { readReceipts } from "./sunday-traffic.ts";
import { recoveryPolicy, type Durability } from "./supervisor.ts";

// [DX-HA2] Mac correctness drill for the second failure, at toy size, with the repaired read of the first machine's disk
// (`SyncPair.inspectFirstDisk`). Two small stacks in the lab VM stand for the two machines.
//
//   Policy A: lose A, reopen saves on B with one copy, take saves, then lose B as well. Read A's old disk.
//   Policy B: lose A, B holds new saves while the replacement is copied, then lose B before the copy is complete. Read A's
//             old disk.
//
// Expected: under both policies every save acknowledged before the first loss is on A's disk. Under A every save
// acknowledged on one copy after the first loss is absent from it. Under B no save was acknowledged after the first loss,
// and the save offered during the hold was refused and is absent. Usage (diagnostic slot, one ordinary heavy token):
//   HA1_RECOVERY_POLICY=A|B node lab/bin/heavy.mjs --label DX-HA2 -- node --import tsx lab/bin/engine.mjs ha1 \
//     --holder DX-HA2 --slot auto --experiment hasync-second --people 4 --diagnostic

const witness = "second-failure-witness";
const before = 24;
const oneCopy = 12;

class SecondFailureRecorded extends Error {
  constructor(readonly result: SecondFailure) {
    super("second failure recorded during the hold");
  }
}
type SecondFailure = Awaited<ReturnType<typeof readFirstDisk>>;

async function stopIfRunning(pair: SyncPair, role: Role) {
  const v = await pair.s.view(role);
  if (!v.State.Running) return { role, id: v.Id, alreadyStopped: true, exit: v.State.ExitCode };
  return { alreadyStopped: false, ...(await pair.s.kill(role)) };
}

async function readFirstDisk(pair: SyncPair, ac: Account, protectedBefore: Receipt[], oneCopyAfter: Receipt[], held: string[]) {
  const stopped = [await stopIfRunning(pair, "target"), await stopIfRunning(pair, "standby")];
  const disk = await pair.inspectFirstDisk();
  const client = new DatomicClient(disk.url, 20000);
  try {
    const rows = await readReceipts(client, ac.db, [...protectedBefore, ...oneCopyAfter]);
    const heldStatus = held.length
      ? (
          await client.request<{ database: string; operations: { status: string }[] }>(
            "POST",
            "/ha1/" + ac.db + "/operations",
            { ids: held },
            20000,
          )
        ).operations.map((o) => o.status)
      : [];
    const { url: _url, ...identity } = disk;
    return {
      stopped,
      disk: identity,
      protectedBefore: protectedBefore.length,
      protectedBeforeAbsent: rows.slice(0, protectedBefore.length).filter((r) => !r.observed).length,
      oneCopyAcknowledged: oneCopyAfter.length,
      oneCopyAbsent: rows.slice(protectedBefore.length).filter((r) => !r.observed).length,
      heldOffers: held.length,
      heldPresent: heldStatus.filter((x) => x !== "absent").length,
    };
  } finally {
    client.close();
  }
}

export async function secondFailureDrill(pair: SyncPair, people: number, policy: Durability = recoveryPolicy()) {
  const s = pair.s;
  const e = s.e;
  const { ac } = await pair.open({ init: (client) => populate(s, client, people) });
  await pair.clone();
  await pair.service();
  e.log("recovery-policy", { policy });
  const protectedBefore: Receipt[] = [];
  for (let i = 0; i < before; i++) protectedBefore.push(await ac.send(ac.intent("before-" + i, 10, witness)));
  const killed = await Promise.all([s.kill("pg"), s.kill("active")]);
  const faultAt = Math.min(...killed.map((k) => k.from));
  const held: string[] = [];
  const heldCodes: (string | undefined)[] = [];
  let survivorBefore = 0;
  if (policy === "two-copy") {
    pair.beforeReplacement = async () => {
      // Reads continue on B during the hold: every protected receipt is there.
      const onSurvivor = await readReceipts(ac.r, ac.db, protectedBefore);
      survivorBefore = onSurvivor.filter((r) => r.observed).length;
      // A save offered during the hold is refused at the sealed route; it is never acknowledged.
      const offer = ac.intent("held", 10, witness);
      held.push(offer.operationId);
      heldCodes.push(
        await ac.w.transact(ac.db, offer).then(
          () => "acknowledged",
          (error: unknown) => errorCode(error) ?? String(error),
        ),
      );
      throw new SecondFailureRecorded(await readFirstDisk(pair, ac, protectedBefore, [], held));
    };
  }
  let second: SecondFailure;
  try {
    await pair.supervisor().run("fault", policy);
    assert.equal(policy, "single-copy-after-fence", "Policy B must not route before the replacement");
    const after: Receipt[] = [];
    for (let i = 0; i < oneCopy; i++) after.push(await ac.send(ac.intent("one-copy-" + i, 10, witness)));
    const onSurvivor = await readReceipts(ac.r, ac.db, [...protectedBefore, ...after]);
    survivorBefore = onSurvivor.slice(0, protectedBefore.length).filter((r) => r.observed).length;
    assert(onSurvivor.every((r) => r.observed), "An acknowledged save is missing on the survivor");
    pair.route!.seal();
    second = await readFirstDisk(pair, ac, protectedBefore, after, []);
  } catch (error) {
    if (!(error instanceof SecondFailureRecorded)) throw error;
    second = error.result;
  }
  const result = {
    timing: "diagnostic",
    policy,
    faultAt,
    survivorBeforeObserved: survivorBefore,
    heldCodes,
    ...second,
    steps: pair.transitions.map((x) => ({ stage: x.stage, ms: Math.round(x.at - faultAt) })),
  };
  e.write("second-failure", result);
  assert.equal(result.survivorBeforeObserved, before, "First failure lost an acknowledged save");
  assert.equal(result.protectedBeforeAbsent, 0, "A save acknowledged before the first loss is absent from A's disk");
  if (policy === "single-copy-after-fence") {
    assert.equal(result.oneCopyAcknowledged, oneCopy);
    assert.equal(result.oneCopyAbsent, oneCopy, "One-copy saves after the first loss cannot be on A's disk");
  } else {
    assert.equal(result.oneCopyAcknowledged, 0);
    assert.deepEqual(heldCodes, ["SyncTimeout"], "The held offer must be refused at the sealed route");
    assert.equal(result.heldPresent, 0);
  }
  return result;
}
