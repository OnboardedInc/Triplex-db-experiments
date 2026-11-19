import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { W0, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { activation, openStore, fact } from "./store.ts";
import { LazyReader, rosterRoot, rosterSeal } from "./read.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { pendingRoot } from "./decision.ts";
const [dir, arg, point, gen] = process.argv.slice(2),
  name = arg ?? "lazy-kill-" + randomUUID(),
  s = await openStore(name),
  at = W0.POPULATION_VALID_TIME,
  subject = "pl:unopened";
const stop = () => process.kill(process.pid, "SIGKILL");
try {
  if (point) {
    if (point === "before-release") stop();
    if (point === "lost-release") {
      await activation(s, "r1", W0.R1, at);
      stop();
    }
    if (point === "after-pull" || point === "after-cache") {
      const reader = new LazyReader(s, "w0", 2 << 20, () => at);
      await reader.readAt(subject, {}, async () => {
        if (point === "after-pull") stop();
      });
      stop();
    }
    if (point === "before-commit" || point === "after-commit") {
      const d = new Dispatcher(s);
      try {
        await d.step(async (z) => {
          if (z === point) stop();
        });
      } finally {
        d.close();
      }
    } else if (["before-receive", "after-receive", "after-ack"].includes(point)) {
      const r = new Receiver(join(dir!, "crash-receiver.sqlite"), name, gen!);
      try {
        await r.send(s, subject, undefined, (z) => {
          if (z === point) stop();
        });
      } finally {
        r.close();
      }
    }
  } else {
    const first = await s.input("people", { kind: "baseline", at }, [
      fact(rosterRoot(0), "lazy/members", [subject]),
      fact("members/seal", "lazy/roster-seal", rosterSeal([subject])),
      {
        op: "assert",
        entityId: subject,
        attribute: "weeklyMinutes",
        value: triplexValue("weeklyMinutes", 2400),
        validFrom: 0,
      },
    ]);
    const kills: string[] = [];
    const kill = (p: string) => {
      const r = spawnSync(
        process.execPath,
        ["--experimental-strip-types", import.meta.filename, dir!, name, p, first.txId],
        { encoding: "utf8", timeout: 60000 },
      );
      assert.equal(r.signal, "SIGKILL", p + " " + r.stderr);
      kills.push(p);
    };
    const bootstrap = new Dispatcher(s);
    try {
      await bootstrap.drain();
    } finally {
      bootstrap.close();
    }
    kill("before-release");
    assert.equal(await s.lookup("r1"), null);
    kill("lost-release");
    const original = await s.lookup("r1");
    assert.deepEqual(await activation(s, "r1", W0.R1, at), original);
    for (const p of ["after-pull", "after-cache", "before-commit", "after-commit"]) kill(p);
    const debtsAfterKill = await s.rows([pendingRoot(subject)], await s.head());
    assert.equal(debtsAfterKill.length, 1);
    const d = new Dispatcher(s);
    try {
      await d.drain();
    } finally {
      d.close();
    }
    const debts = await s.rows([pendingRoot(subject)], await s.head());
    assert.equal(debts.length, 1);
    for (const p of ["before-receive", "after-receive", "after-ack"]) kill(p);
    const rx = new Receiver(join(dir!, "crash-receiver.sqlite"), name, first.txId);
    try {
      assert.equal(await rx.drain(s), 0);
      assert.equal(rx.effects().length, 1);
      assert.equal(rx.effects()[0]!.kind, "bgc.order");
    } finally {
      rx.close();
    }
    assert.equal((await s.rows([pendingRoot(subject)], await s.head())).length, 0);
    writeFileSync(
      join(dir!, "crash.json"),
      canonical({
        name,
        original: original.txId,
        first: first.txId,
        kills,
        final: await s.head(),
      }) + "\n",
      { flag: "wx" },
    );
  }
} finally {
  await s.close();
}
