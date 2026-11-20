import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { open } from "../act1/check.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { expand } from "./dispatch.ts";
import { save } from "./save.ts";
import { epoch, encodeBig } from "./model.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";

test("the pinned NOTIFY1 host consumes seed, fenced releases and an intervening save", async () => {
  const revision = "93ee743df61ca5fcdf470a2cd7247930fa4a87bb",
    dir = mkdtempSync(path.join(import.meta.dirname, "../.delta-notify-")),
    names = ["hosts", "store", "receiver"],
    files: string[] = [],
    c = await open("act1-" + randomUUID()),
    oracle = emptyAudit();
  try {
    // [DX-ACT2] Why: execute the dispatcher's actual integration boundary at a reproducible revision. Rejected: copying the interface into a mock which could silently drift.
    for (const n of names) {
      const addr = revision + ":lab/experiments/EXP-DX1/notify1/" + n + ".ts",
        bytes = execFileSync("git", ["show", addr]),
        f = path.join(dir, n + ".ts");
      writeFileSync(f, bytes, { flag: "wx" });
      files.push(f);
    }
    const { deltaFeed } = await import(path.join(dir, "hosts.ts"));
    const a = new Account(new Objects(c, "notices"), hash([revision, dir])),
      s = "pl:a",
      world = {
        subject: s,
        facts: [
          { e: s, a: "location", v: "loc:x", tx: 1 },
          { e: "loc:x", a: "jurisdiction", v: "jur:j", tx: 1 },
          { e: "jur:j", a: "stateMinWageCents", v: 1000, tx: 1 },
          { e: "loc:x", a: "localMinWageCents", v: 1500, tx: 1 },
          { e: s, a: "payRateCents", v: 1200, tx: 1 },
        ],
      },
      b = { tx: 1, validTime: W0.POPULATION_VALID_TIME },
      edits = [{ e: s, a: "payRateCents", values: [900], from: epoch }];
    await a.bootstrap([s], [world], b);
    await query(oracle, "source", [world]);
    await event(oracle, { seq: 0, basis: b, doc: W0.R1.doc });
    await a.seal("first", W0.R2);
    await save(a, "amend", edits);
    await a.seal("second", W0.R3);
    const feed = await deltaFeed(a, 3, (seq: number) => expand(a, seq)),
      got: any[] = [];
    let next = feed.first;
    while (true) {
      const frame = await feed.at(next);
      if (!frame) break;
      assert(
        frame.position > 0 && frame.next.event >= next.event && hash(frame.next) !== hash(next),
      );
      got.push(
        ...frame.deliveries.map((d: W0.Delivery) => ({ ...d, payload: JSON.parse(d.payload) })),
      );
      next = frame.next;
    }
    assert.equal(next.event, 4);
    const wanted: any[] = [];
    for (let seq = 0; seq <= 3; seq++) {
      if (seq)
        await event(oracle, {
          seq,
          basis: { ...b, tx: seq + 1 },
          doc: (seq === 3 ? W0.R3 : W0.R2).doc,
          ...(seq === 2 ? { subject: s, edits } : {}),
        });
      wanted.push(...(await query(oracle, "read", { seq, subjects: [s] }))[0].deliveries);
    }
    assert.deepEqual(got, wanted);
    assert(wanted.length > 0);
  } finally {
    oracle.close();
    await c.close();
    for (const f of files) unlinkSync(f);
    rmdirSync(dir);
  }
});
