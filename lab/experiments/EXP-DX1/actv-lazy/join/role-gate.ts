import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { openStore } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";

const owner = JSON.parse(readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!, "utf8"));
assert(
  owner.holder === "DX-ACT1" && owner.mode === "exclusive" && process.env.TX2_EXCLUSIVE_VOLUME_ID,
);
type Role = "transactor" | "write-gateway";
type Phase = "pause" | "resume";
const faults = [];
function signal(role: Role, action: Phase) {
  const row = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "lab/bin/engine.mjs",
        "fault-process",
        "--lane",
        "datomic",
        "--slot",
        owner.slot,
        "--holder",
        "DX-ACT1",
        "--role",
        role,
        "--action",
        action,
      ],
      { encoding: "utf8", timeout: 30000 },
    ),
  );
  assert(
    row.role === role &&
      row.action === action &&
      row.volume === owner.volume &&
      row.slot === owner.container,
  );
  assert(/^\d+ [TRSDI]$/.test(row.observed));
  return row;
}
async function hold(role: Role, go: () => Promise<unknown>, requireBlocked: boolean) {
  const from = signal(role, "pause");
  let complete = false;
  const request = Promise.resolve()
    .then(go)
    .finally(() => {
      complete = true;
    });
  void request.catch(() => {});
  let to;
  try {
    await sleep(220);
    if (requireBlocked)
      assert.equal(complete, false, "Write completed while its native role was stopped");
  } finally {
    to = signal(role, "resume");
  }
  return { from, to, reply: await request };
}
const s = await openStore("lazy-role-matrix-" + randomUUID());
const f = await seed(s, 64),
  a = new JoinedAccount(s),
  ref = new Reference();
try {
  await a.install(f.roster, valid);
  const baseline = await a.publish("origin", W0.R1.doc, valid, "owed");
  let position = baseline.position,
    previous = W0.R1.doc,
    sequence = 1;
  for (const role of ["transactor", "write-gateway"] as const) {
    const first = await hold(
      role,
      () => a.publish("before-" + role, W0.R2.doc, valid, "owed"),
      true,
    );
    const r = first.reply as typeof baseline;
    assert(r.position > position);
    const one = await ref.check(
      a,
      f.roster,
      f.world,
      W0.R2.doc,
      { tx: r.position, validTime: valid },
      previous,
      ++sequence,
      false,
    );
    let during: { from: unknown; to: unknown } | undefined;
    let resuming: Promise<unknown> | undefined;
    const staged = await a
      .publish("staged-" + role, W0.R1.doc, valid, "staged", undefined, {
        afterChunk: async () => {
          if (resuming) return;
          const from = signal(role, "pause");
          resuming = sleep(220).then(() => {
            during = { from, to: signal(role, "resume") };
          });
        },
      })
      .finally(() => resuming);
    assert(during && staged.position > r.position);
    const two = await ref.check(
      a,
      f.roster,
      f.world,
      W0.R1.doc,
      { tx: staged.position, validTime: valid },
      W0.R2.doc,
      ++sequence,
      false,
    );
    const after = await hold(
      role,
      async () => {
        const reopened = await openStore(s.scope);
        try {
          return await new JoinedAccount(reopened).publish(
            "staged-" + role,
            W0.R1.doc,
            valid,
            "staged",
          );
        } finally {
          await reopened.close();
        }
      },
      role === "write-gateway",
    );
    assert.deepEqual(after.reply, staged);
    faults.push({
      role,
      before: [first.from, first.to, one],
      between: [during, two],
      after: [after.from, after.to, staged.txId],
      cut: staged.position,
    });
    previous = W0.R1.doc;
    position = staged.position;
  }
  writeFileSync(
    join(process.argv[2]!, "role-gate.json"),
    canonical({
      source: f.sourceHash,
      scope: s.scope,
      roster: f.rosterHash,
      baseline: baseline.position,
      faults,
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  ref.oracle.close();
  await s.close();
}
