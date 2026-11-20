import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync, rmdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { integer } from "../../../../bench/lib/deep-world.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import { Documents } from "../../notify1/store.ts";
import { openStore, millis } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { rawDeep, replaceDeep } from "./deep.ts";
import { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";

const [out, size] = process.argv.slice(2);
const n = Number(size);
assert([1000, 10000].includes(n));
const s = await openStore("lazy-join-deep-" + randomUUID(), "act2-deep");
const sink = await openStore("lazy-join-deep-sink-" + randomUUID());
const ref = new Reference();
const store = (name: string, value: unknown) =>
  writeFileSync(join(out!, name + ".json"), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const native = (samples: Record<string, unknown>[]) => {
  const requests = samples.filter((q) => String(q.path).endsWith("/transact"));
  assert(
    requests.length > 0 &&
      requests.every(
        (q) => Number.isSafeInteger(q.requestBytes) && Number(q.requestBytes) <= 4194304,
      ),
  );
  return {
    nativeBytes: requests.reduce((b, q) => b + Number(q.requestBytes), 0),
    nativeMs: requests.reduce((b, q) => b + Number(q.wallMs), 0),
  };
};
// [DX-ACT1] Why: 1.6M baseline facts can take longer than the timing window. Rejected: holding the shared clock reservation throughout release-independent fixture loading.
let releaseTiming = () => {};
const timingPath = process.env.DX_JOIN_TIMING_DIR;
async function timePrices() {
  if (!timingPath) return;
  const started = performance.now();
  const token = join(timingPath, "lazy-price-" + randomUUID());
  for (;;) {
    try {
      mkdirSync(timingPath);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    assert(
      performance.now() - started < 15 * 60 * 1000,
      "Timed deep window did not open after loading",
    );
    await sleep(5000);
  }
  let held = true;
  const signal = () => {
    releaseTiming();
    process.exit(143);
  };
  const watchdog = setTimeout(
    () => {
      releaseTiming();
      process.exit(124);
    },
    13 * 60 * 1000,
  );
  releaseTiming = () => {
    if (!held) return;
    held = false;
    clearTimeout(watchdog);
    process.off("SIGTERM", signal);
    unlinkSync(token);
    rmdirSync(timingPath);
  };
  writeFileSync(token, "", { flag: "wx" });
  process.once("SIGTERM", signal);
  store("deep-timing-window", {
    startedAt: new Date().toISOString(),
    loadedPosition: await s.head(),
    waitMs: performance.now() - started,
  });
}
try {
  const f = await seed(s, n),
    a = new JoinedAccount(s),
    reader = a.reader();
  const shadow = new Map<number, W0.World>();
  const expected = (i: number) => shadow.get(i) ?? f.world(i);
  let current: W0.ReleaseDoc | null = null;
  async function saves(joined: boolean) {
    const result = [];
    for (let j = 0; j < 18; j++) {
      const i = (joined ? 110 : 10) + j,
        arm = j % 3,
        field = arm === 0 ? "weeklyMinutes" : "payRateCents";
      const key = arm === 0 ? ":person/custom-weekly-minutes" : ":person/custom-pay-cents";
      const w = expected(i),
        previous = w.facts.find((x) => x.e === w.subject && x.a === field)!;
      const next = Number(previous.v) + (arm === 2 ? 1 : 0);
      const raw = await rawDeep(s, i, { tx: await s.head(), validTime: valid });
      const ops = replaceDeep(raw, [{ e: ids.worker(i), a: key, v: integer(next) }], millis(valid));
      const start = performance.now(),
        cpu = process.cpuUsage();
      const m = await measureW0Http(() =>
        joined
          ? a.saveDeep("edit-" + i, i, ops, valid)
          : s.input("control-" + i, { kind: "source", at: valid }, ops),
      );
      const returned = performance.now(),
        used = process.cpuUsage(cpu),
        r = m.value;
      const edited = {
        subject: w.subject,
        facts: w.facts.map(
          (x): W0.Fact => (x === previous ? { ...x, v: next, tx: r.position } : x),
        ),
      };
      shadow.set(i, edited);
      const extra = r.changes.filter((x: any) => x.entityId.startsWith(a.db.prefix)),
        index = extra.filter((x: any) => x.entityId.includes("join-index:"));
      assert.equal(index.filter((c: any) => c.op === "assert").length, Number(joined && arm === 2));
      assert.equal(
        extra.filter((c: any) => c.entityId.includes("event:")).length,
        Number(joined && arm !== 0),
      );
      if (joined)
        await ref.check(
          a,
          [w.subject],
          () => edited,
          current!,
          { tx: r.position, validTime: valid },
          current,
          undefined,
          true,
        );
      result.push({
        arm: ["reader-only", "same-posting", "changed-posting"][arm],
        p: r.position,
        tx: r.txId,
        wallMs: returned - start,
        cpuUs: used.user + used.system,
        http: m.requests,
        ...native(m.samples),
        changes: r.changes.length,
        noticeChanges: extra.length - index.length,
        indexChanges: index.length,
      });
    }
    return result;
  }
  await timePrices();
  const control = await saves(false);
  const started = performance.now();
  await a.install(f.roster, valid);
  const enrollMs = performance.now() - started;
  const offers = [];
  const arms = [
    ["initial", W0.R1.doc, "owed"],
    ["receipt-only", W0.R2.doc, "owed"],
    ["back", W0.R1.doc, "owed"],
    ["stored", W0.R2.doc, "staged"],
  ] as const;
  for (const [id, doc, mode] of arms) {
    const before = { ...a.stats },
      started = performance.now();
    const m = await measureW0Http(() => a.publish(id, doc, valid, mode));
    const durable = s.counters.ackObserved;
    assert(durable >= started && durable <= performance.now());
    const person = 17 + offers.length,
      read = await reader.readAt(f.roster[person]!, { validTime: valid }),
      first = performance.now();
    assert.equal(read.basis.tx, m.value.position);
    const [proof] = JSON.parse(
      await ref.oracle.call("check", {
        document: doc,
        old: null,
        basis: read.basis,
        worlds: [expected(person)],
        fold: false,
      }),
    );
    assert.equal(read.json, proof.json);
    const seq = (await a.notices.observe()).value.sequence;
    assert.equal(
      m.value.changes.filter((c: any) => !c.entityId.includes("join-output:")).length,
      4,
    );
    offers.push({
      id,
      mode,
      seq,
      p: m.value.position,
      tx: m.value.txId,
      durableMs: durable - started,
      firstMs: first - started,
      read: { subject: read.subject, sha: sha256(read.json) },
      ...native(m.samples),
      worlds: a.stats.worlds - before.worlds,
      indexPages: a.stats.indexPages - before.indexPages,
      outputBytes: a.stats.outputBytes - before.outputBytes,
    });
  }
  store("deep-offers", offers);
  for (const [i, r] of offers.entries()) {
    const doc = arms[i]![1];
    const proof = await ref.check(
      a,
      f.roster,
      expected,
      doc,
      { tx: r.p, validTime: valid },
      current,
      r.seq,
    );
    store(r.id, { ...r, proof });
    current = doc;
  }
  const joined = await saves(true);
  releaseTiming();
  const dispatch = a.dispatcher(new Documents(sink.comp, "sink"));
  await dispatch.drain();
  const receiver = await ref.receiver(a, dispatch);
  store("deep-price", {
    scope: s.scope,
    sink: sink.scope,
    n,
    facts: f.facts,
    roster: f.rosterHash,
    source: f.sourceHash,
    enrollMs,
    noticeIndexBytes: a.stats.noticeIndexBytes,
    addressBytes: a.stats.addressBytes,
    offers,
    control,
    joined,
    receiver,
  });
} finally {
  releaseTiming();
  ref.oracle.close();
  await sink.close();
  await s.close();
}
