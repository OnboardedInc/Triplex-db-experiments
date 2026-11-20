import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import { seed, valid } from "../fixture.ts";
import { openStore } from "../store.ts";
import { JoinedAccount, type PublishOptions, type Storage } from "./account.ts";
import { Reference } from "./check.ts";

const [out, nValue, mode] = process.argv.slice(2);
const n = Number(nValue),
  format = mode === "deep" ? "act2-deep" : "w0";
assert([1000, 10000].includes(n));
const store = await openStore("lazy-part6-optimized-" + randomUUID(), format),
  ref = new Reference();
const write = (name: string, v: unknown) =>
  writeFileSync(join(out!, name + ".json"), JSON.stringify(v, null, 2) + "\n", { flag: "wx" });
try {
  const f = await seed(store, n),
    a = new JoinedAccount(store),
    reader = a.reader();
  const setup = performance.now();
  await a.install(f.roster, valid, true);
  const installMs = performance.now() - setup;
  const ot = structuredClone(W0.R1.doc);
  Object.assign(ot.rules.find((x) => x.id === "OT")!, { params: { thresholdMinutes: 2351 } });
  const options: [string, Storage, PublishOptions, W0.ReleaseDoc][] = [
    ["census", "stored", { sources: "census" }, ot],
    ["ranges", "stored", { sources: "native" }, ot],
    ["threaded", "stored", { sources: "native", workers: 4 }, ot],
    ["indexed-rows", "stored", { sources: "indexed", workers: 4 }, ot],
    ["staged-legacy", "staged", { sources: "indexed", workers: 4, codec: "legacy" }, ot],
    ["staged-compact", "staged", { sources: "indexed", workers: 4 }, ot],
    ["three-rules", "staged", { sources: "indexed", workers: 4 }, W0.R2.doc],
  ];
  const timed = [];
  for (const [i, [name, storage, o, doc]] of options.entries()) {
    await a.publish("baseline-" + i, W0.R1.doc, valid, "owed");
    const before = { ...a.stats },
      offered = performance.now();
    const m = await measureW0Http(() => a.publish(name, doc, valid, storage, undefined, o));
    const durable = store.counters.ackObserved;
    const r = m.value,
      seen = await reader.readAt(f.roster[30 + i]!, { validTime: valid }),
      first = performance.now();
    assert(seen.basis.tx === r.position && durable >= offered && first >= durable);
    const seq = (await a.notices.observe()).value.sequence;
    const [expected] = JSON.parse(
      await ref.oracle.call("check", {
        document: doc,
        old: null,
        basis: seen.basis,
        worlds: [f.world(30 + i)],
        fold: false,
      }),
    );
    assert.equal(seen.json, expected.json);
    const native = m.samples.filter((s) => String(s.path).endsWith("/transact"));
    assert(native.length === a.lastMaterial.stages + 1);
    const requestBytes = native.map((x) => Number(x.requestBytes));
    assert(requestBytes.every((b) => Number.isSafeInteger(b) && b > 0 && b <= 4 * 1024 * 1024));
    const row = {
      name,
      storage,
      opted: o,
      position: r.position,
      tx: r.txId,
      seq,
      observedFirst: sha256(seen.json),
      durableMs: durable - offered,
      firstMs: first - offered,
      nativeMs: native.map((x) => x.wallMs),
      requestBytes,
      http: m.requests,
      ...a.lastMaterial,
      worldPulls: a.stats.worlds - before.worlds,
      pages: a.stats.indexPages - before.indexPages,
      encodedBytes: a.stats.outputBytes - before.outputBytes,
    };
    timed.push(row);
    write(name + "-offer", row);
  }
  const checked = [];
  for (const [i, row] of timed.entries()) {
    const proof = await ref.check(
      a,
      f.roster,
      f.world,
      options[i]![3],
      { tx: row.position, validTime: valid },
      W0.R1.doc,
      row.seq,
      false,
      false,
    );
    checked.push({ ...row, proof });
  }
  write("optimized", {
    n,
    format,
    scope: store.scope,
    installMs,
    indexBytes: a.stats.noticeIndexBytes,
    addressBytes: a.stats.addressBytes,
    facts: f.facts,
    roster: f.rosterHash,
    source: f.sourceHash,
    arms: checked,
  });
} finally {
  ref.oracle.close();
  await store.close();
}
