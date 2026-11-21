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
  assert((action === "pause" ? /^\d+ T$/ : /^\d+ [RSDI]$/).test(row.observed));
  return row;
}
function unavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || ("_tag" in error && error._tag === "DatomicTransportError"))
    return true;
  if ("status" in error && (error.status === 502 || error.status === 503 || error.status === 504))
    return true;
  return unavailable(error.cause);
}

async function hold<T>(role: Role, go: () => Promise<T>, requireBlocked: boolean) {
  const from = signal(role, "pause");
  type Outcome = { reply: T } | { error: unknown };
  let outcome: Outcome | undefined;
  // [DX-ACT1] Why: a suspended dependency may fail fast before a commit is sent. Rejected: counting a transient rejection as an acknowledgement (or ignoring an arbitrary application error).
  const request = Promise.resolve()
    .then(go)
    .then(
      (reply) => (outcome = { reply }),
      (error: unknown) => (outcome = { error }),
    );
  let to;
  try {
    await sleep(220);
  } finally {
    to = signal(role, "resume");
  }
  assert.equal(from.observed.split(" ")[0], to.observed.split(" ")[0]);
  const whilePaused = outcome;
  if (requireBlocked && whilePaused && "reply" in whilePaused)
    assert.fail("Write was acknowledged while its native role was stopped");
  const result = await request;
  if ("reply" in result)
    return { from, to, reply: result.reply, earlyReply: whilePaused !== undefined, failure: null };
  if (!unavailable(result.error)) throw result.error;
  return { from, to, reply: await go(), earlyReply: false, failure: String(result.error) };
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
    const r = first.reply;
    assert.equal(r.position, position + 1);
    assert.deepEqual(await a.publish("before-" + role, W0.R2.doc, valid, "owed"), r);
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
      before: [first.from, first.to, first.failure, one],
      between: [during, two],
      after: [after.from, after.to, after.earlyReply, after.failure, staged.txId],
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
