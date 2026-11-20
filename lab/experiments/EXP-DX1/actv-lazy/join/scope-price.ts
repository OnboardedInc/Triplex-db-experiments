import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { openStore } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";
import { measure } from "./measure.ts";

const [out, size, formatValue] = process.argv.slice(2),
  n = Number(size);
assert(
  out && Number.isSafeInteger(n) && n >= 64 && (formatValue === "thin" || formatValue === "deep"),
);
const profile = formatValue === "deep" ? "act2-deep" : "w0";
const roles = ["transactor", "write-gateway"] as const;
function memory() {
  if (process.env.DX_ACT1_W1_GATE !== "1") return null;
  const owner = JSON.parse(readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!, "utf8"));
  assert(owner.holder === "DX-ACT1" && owner.mode === "exclusive");
  const processes = roles.map((role) => {
    const started = Date.now();
    const data = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "lab/bin/engine.mjs",
          "memory-process",
          "--lane",
          "datomic",
          "--slot",
          owner.slot,
          "--holder",
          owner.holder,
          "--role",
          role,
        ],
        { encoding: "utf8", timeout: 15000 },
      ),
    );
    assert(data.slot === owner.container && data.volume === owner.volume && data.role === role);
    assert(data.at >= started && data.at <= Date.now());
    assert(Number.isSafeInteger(data.pssKiB) && data.pssKiB > 0 && data.rssKiB >= data.pssKiB);
    return data;
  });
  assert.equal(processes[0].containerId, processes[1].containerId);
  return { processes, pssBytes: 1024 * processes.reduce((sum, p) => sum + p.pssKiB, 0) };
}
const empty = memory();
const s = await openStore("lazy-joined-size-" + randomUUID(), profile);
const f = await seed(s, n, formatValue === "thin" ? "thin" : "default");
const a = new JoinedAccount(s),
  ref = new Reference();
try {
  const seeded = memory();
  await a.install(f.roster, valid);
  const enrolled = memory();
  const before = await a.publish("before", W0.R1.doc, valid, "owed");
  const { receipt, offer, visible, chosen, observed } = await measure(async () => {
    const offer = performance.now(),
      doc = structuredClone(W0.R2.doc);
    Object.assign(doc.rules.find((x) => x.id === "I9S2")!, { params: { businessDays: 5 } });
    const receipt = await a.publish("after", doc, valid, "owed"),
      visible = performance.now();
    assert(
      s.counters.lastReceipt?.txId === receipt.txId && receipt.position === before.position + 1,
    );
    assert(a.stats.worlds === 0 && a.stats.indexPages === 0 && receipt.changes.length === 4);
    const people = Array.from({ length: 64 }, (_, i) => Math.floor((i * n) / 64));
    const scope = s.scope,
      nonce = randomUUID();
    const observed = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          new URL("./read-witness.ts", import.meta.url).pathname,
          scope,
          profile,
          nonce,
          valid,
          "current",
          ...people.map((i) => f.roster[i]!),
        ],
        { encoding: "utf8", timeout: 180000 },
      ),
    );
    assert(
      observed.nonce === nonce &&
        observed.scope === scope &&
        observed.pid !== process.pid &&
        observed.untouched.memoBytes === 0,
    );
    return { receipt, offer, visible, chosen: { doc, people }, observed };
  });
  const after = memory();
  for (const x of [seeded, enrolled, after])
    if (empty && x)
      assert.deepEqual(
        x.processes.map((p) => [p.containerId, p.role, p.pid]),
        empty.processes.map((p) => [p.containerId, p.role, p.pid]),
      );
  const p = { tx: receipt.position, validTime: valid },
    checks = [];
  for (let i = 0; i < chosen.people.length; i += 32) {
    const people = chosen.people.slice(i, i + 32),
      reads = observed.current.slice(i, i + 32);
    const expected = JSON.parse(
      await ref.oracle.call("check", {
        document: chosen.doc,
        old: W0.R1.doc,
        basis: p,
        worlds: people.map(f.world),
        fold: false,
      }),
    );
    for (const [j, r] of reads.entries()) {
      assert.deepEqual([r.subject, r.basis, r.json], [f.roster[people[j]!], p, expected[j].json]);
      assert.equal(r.route, "authoritative-source");
      checks.push({ subject: r.subject, ms: r.ms, answer: sha256(r.json) });
    }
  }
  const physical = await a.physical(2);
  assert(
    physical.marker.cut === before.position &&
      physical.marker.census === f.rosterHash &&
      !physical.values.length,
  );
  const sorted = checks.map((x) => Number(x.ms)).sort((a, b) => a - b),
    ack = s.counters.lastReceipt!;
  writeFileSync(
    join(out, "scope-price.json"),
    JSON.stringify({
      n,
      profile,
      facts: f.facts,
      scope: s.scope,
      source: f.sourceHash,
      roster: f.rosterHash,
      position: receipt.position,
      tx: receipt.txId,
      publishMs: ack.time - offer,
      returnMs: visible - offer,
      changes: receipt.changes.length,
      worlds: a.stats.worlds,
      leafBytes: a.stats.noticeIndexBytes / n,
      addressBytes: a.stats.addressBytes / n,
      coldP99: sorted[Math.ceil(sorted.length * 0.99) - 1],
      untouched: observed.untouched,
      memory: {
        empty,
        seeded,
        enrolled,
        after,
        enrolledDeltaPerPerson:
          seeded && enrolled ? (enrolled.pssBytes - seeded.pssBytes) / n : null,
      },
      samples: checks,
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  ref.oracle.close();
  await s.close();
}
