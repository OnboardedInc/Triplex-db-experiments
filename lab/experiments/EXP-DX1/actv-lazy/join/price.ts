import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import { bytes } from "../../import1/source.ts";
import { Documents } from "../../notify1/store.ts";
import { openStore } from "../store.ts";
import { valid, seed } from "../fixture.ts";
import { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";
const dir = process.argv[2]!,
  n = Number(process.argv[3]);
assert([1000, 10000].includes(n));
const scope = "lazy-join-price-" + randomUUID(),
  s = await openStore(scope),
  sink = await openStore("lazy-join-price-sink-" + randomUUID()),
  a = new JoinedAccount(s),
  ref = new Reference();
function nativeCost(samples: Record<string, unknown>[]) {
  const [tx, ...others] = samples.filter((x) => String(x.path).endsWith("/transact"));
  assert(
    tx && !others.length && Number.isSafeInteger(tx.requestBytes) && Number(tx.requestBytes) > 0,
  );
  return { nativeRequestBytes: Number(tx.requestBytes), nativeRequestMs: Number(tx.wallMs) };
}
const save = (label: string, x: unknown) =>
  writeFileSync(join(dir, label + ".json"), JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
try {
  const f = await seed(s, n),
    open = performance.now();
  await a.install(f.roster, valid);
  const installMs = performance.now() - open;
  const wage = structuredClone(W0.R1.doc),
    ot = structuredClone(W0.R1.doc);
  Object.assign(wage.rules.find((r) => r.id === "MINWAGE")!, {
    params: structuredClone(W0.R2.doc.rules.find((r) => r.id === "MINWAGE")!.params),
  });
  Object.assign(ot.rules.find((r) => r.id === "OT")!, { params: { thresholdMinutes: 2351 } });
  assert(!W0.RELEASES_BY_HASH.has(W0.compileRelease(wage).hash));
  const arms = [
    ["baseline", W0.R1.doc, "owed"],
    ["wage-debt", wage, "owed"],
    ["restore", W0.R1.doc, "owed"],
    ["wage-stored", wage, "stored"],
    ["restore-again", W0.R1.doc, "owed"],
    ["overtime-stored", ot, "stored"],
  ] as const;
  const reader = a.reader();
  let old: W0.ReleaseDoc | null = null;
  const stages = [],
    saves = [];
  for (const [arm, [id, doc, mode]] of arms.entries()) {
    const before = { ...a.stats },
      cpu = process.cpuUsage(),
      t = performance.now();
    const m = await measureW0Http(() => a.publish(id, doc, valid, mode)),
      end = performance.now(),
      used = process.cpuUsage(cpu),
      r = m.value;
    const acknowledged = s.counters.ackObserved;
    assert(acknowledged >= t && acknowledged <= end);
    const ordinal = 17 + arm,
      selected = f.roster[ordinal]!;
    const first = await reader.readAt(selected, { validTime: valid });
    const returned = performance.now();
    assert.equal(first.basis.tx, r.position);
    const [answer] = JSON.parse(
      await ref.oracle.call("check", {
        document: doc,
        old,
        basis: first.basis,
        worlds: [f.world(ordinal)],
        fold: false,
      }),
    );
    assert.equal(first.json, answer.json);
    const semantic = r.changes.filter((c: any) => !c.entityId.includes("join-output:"));
    assert.equal(semantic.length, 4);
    assert(
      semantic.every(
        (c: any) => c.entityId === "lazy/account/releases" || c.entityId.startsWith(a.db.prefix),
      ),
    );
    const seq = Number((await a.notices.observe()).value.sequence),
      proof = await ref.check(
        a,
        f.roster,
        f.world,
        doc,
        { tx: r.position, validTime: valid },
        old,
        seq,
        true,
        true,
      );
    const stats = {
      pages: a.stats.indexPages - before.indexPages,
      worlds: a.stats.worlds - before.worlds,
      outputBytes: a.stats.outputBytes - before.outputBytes,
    };
    if (mode === "owed") assert.deepEqual(stats, { pages: 0, worlds: 0, outputBytes: 0 });
    const row = {
      id,
      mode,
      document: W0.compileRelease(doc).hash,
      seq,
      tx: r.txId,
      p: r.position,
      ms: end - t,
      durableMs: acknowledged - t,
      firstCorrectMs: returned - t,
      first: {
        subject: selected,
        position: first.basis.tx,
        route: first.route,
        digest: sha256(first.json),
      },
      cpu: used,
      http: m.requests,
      ...nativeCost(m.samples),
      ...stats,
      physicalChanges: r.changes.length,
      noticeAndRelease: semantic.length,
      receiptBytes: Buffer.byteLength(bytes(r)),
      proof,
    };
    stages.push(row);
    save(id, row);
    old = doc;
  }
  // [DX-ACT1] Why: price real source commands after the measured publications so neither sender progress nor Python can supply release answers. Rejected: charging the post-run full-census oracle to the customer's offer.
  const sender = a.dispatcher(new Documents(sink.comp, "sink"));
  const dispatchStart = performance.now();
  await sender.drain();
  const dispatchMs = performance.now() - dispatchStart;
  const confirmed = await ref.receiver(a, sender);
  for (let i = 0; i < 18; i++) {
    const ordinal = 10 + i,
      sub = f.roster[ordinal]!,
      kind = i % 3,
      field = kind === 0 ? "weeklyMinutes" : "payRateCents",
      prior = f.world(ordinal).facts.find((x) => x.e === sub && x.a === field)!;
    const value = Number(prior.v) + (kind === 1 ? 1 : kind === 2 ? 0 : 5),
      t = performance.now(),
      cpu = process.cpuUsage();
    const q = await measureW0Http(() =>
        a.save("edit-" + i, { e: sub, a: field, values: [value] }, valid),
      ),
      elapsed = performance.now() - t,
      used = process.cpuUsage(cpu),
      r = q.value;
    const extra = r.changes.filter((x: any) => x.entityId.startsWith(a.db.prefix)),
      index = extra.filter((x: any) => x.entityId.includes("join-index:"));
    assert.equal(
      extra.filter((x: any) => x.entityId.includes("event:")).length,
      Number(kind !== 0),
    );
    assert.equal(index.filter((x: any) => x.op === "assert").length, Number(kind === 1));
    const actual = await a.reader().readAt(sub, { position: r.position, validTime: valid });
    const changedWorld = {
      subject: sub,
      facts: f
        .world(ordinal)
        .facts.map((x) => (x.e === sub && x.a === field ? { ...x, v: value, tx: r.position } : x)),
    };
    const [reference] = JSON.parse(
      await ref.oracle.call("check", {
        document: old,
        old,
        basis: actual.basis,
        worlds: [changedWorld],
        fold: false,
      }),
    );
    assert.equal(actual.json, reference.json);
    saves.push({
      kind: ["read-only", "posting", "same-posting"][kind],
      tx: r.txId,
      ms: elapsed,
      http: q.requests,
      ...nativeCost(q.samples),
      cpu: used,
      changes: r.changes.length,
      indexChanges: index.length,
      noticeChanges: extra.length - index.length,
      indexBytes: index.length ? Buffer.byteLength(bytes(index)) : 0,
      receiptBytes: Buffer.byteLength(bytes(r)),
    });
  }
  save("join-price", {
    scope,
    n,
    facts: f.facts,
    source: f.sourceHash,
    roster: f.rosterHash,
    installMs,
    stages,
    saves,
    confirmed,
    dispatchMs,
    dispatcher: sender.metrics,
    index: sha256(canonical(f.roster)),
  });
} finally {
  ref.oracle.close();
  await sink.close();
  await s.close();
}
