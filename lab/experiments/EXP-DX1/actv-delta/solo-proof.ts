import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { keyFor } from "../scale1/tenants.ts";
import { hash } from "./store.ts";
import { soloPopulation } from "./solo-population.ts";
import { sources } from "./binding.ts";
import type { Identity } from "./server.ts";
export function checkSolo(dir: string, b: Identity, n: number, count: number, mode: string) {
  const file = (s: string) => fs.readFileSync(path.join(dir, s)),
    r = JSON.parse(file("result.json").toString()),
    bytes = file("loaded.json"),
    x = JSON.parse(bytes.toString()),
    scope = (n === 10000 ? "delta-deep-loaded-" : "delta-solo-") + b.nonce,
    key = keyFor(0);
  assert.deepEqual(r.binding, b);
  assert.equal(r.source, hash(sources(mode)));
  assert.equal(r.scope, scope);
  assert.deepEqual(r.target, { index: 0, first: 0, key, people: n });
  assert.equal(r.subjects, n);
  assert(
    r.timings.length === 6 &&
      r.timings.at(-1).stage === "complete" &&
      r.timings.every(
        (x: { startMs: number }, i: number) =>
          Number.isFinite(x.startMs) && x.startMs >= (r.timings[i - 1]?.startMs ?? 0),
      ),
  );
  const neighbors =
    n === 10000
      ? [1, 2].map((i) => ({ index: i, first: n + (i - 1) * 96, key: keyFor(i), people: 96 }))
      : [];
  assert.deepEqual(r.accounts, [r.target, ...neighbors]);
  assert.deepEqual(
    r.seed.membership,
    Object.fromEntries(r.accounts.map((a: { key: string; people: number }) => [a.key, a.people])),
  );
  assert.equal(r.seed.people, n + neighbors.length * 96);
  if (n === 1000 || n === 100000) {
    const pinned = soloPopulation(n);
    assert(r.seed.sha256 === pinned.sha256 && r.seed.facts === pinned.facts);
  }
  assert.equal(r.loaded.sha, createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(x.binding, {
    nonce: b.nonce,
    scope,
    account: key,
    source: hash([b, r.source, r.target]),
    identity: hash(b),
  });
  assert(
    x.people === n &&
      x.workers.length === 64 &&
      x.workers.every((v: number) => Number.isSafeInteger(v) && v > 0),
  );
  assert(
    x.afterAckStale === 0 &&
      Number.isSafeInteger(x.afterOneSecondStale) &&
      x.afterOneSecondStale >= 0,
  );
  assert.equal(
    x.checked,
    x.workers.reduce((sum: number, y: number) => sum + y, 0),
  );
  assert(x.distinctReads > 0 && x.distinctReads <= x.checked);
  const offers = x.offers;
  assert(offers.length === count && x.all.count === count && r.loaded.count === count);
  assert.equal(
    x.all.p99,
    percentile(
      offers.map((v: any) => v.A),
      0.99,
    ),
  );
  assert.equal(r.loaded.p99, x.all.p99);
  const lines = file("offers.ndjson")
    .toString()
    .trimEnd()
    .split("\n")
    .map((s) => JSON.parse(s));
  assert.deepEqual(
    lines,
    offers.map((v: any) => ({ nonce: b.nonce, ...v })),
  );
  for (const [i, o] of offers.entries()) {
    assert(
      i === o.order && o.label === ["broad", "narrow", "rollback"][i % 3] && /^pl:/.test(o.id),
    );
    assert(
      o.position > (offers[i - 1]?.position ?? 0) &&
        o.seq > (offers[i - 1]?.seq ?? 0) &&
        o.p >= o.position,
    );
    assert(
      Number.isFinite(o.A) &&
        o.A >= o.ack &&
        o.ack >= o.queue &&
        o.queue >= 0 &&
        /^[a-f0-9]{64}$/.test(o.digest),
    );
  }
  assert(
    x.saves.length === r.accounts.length &&
      x.saves.every(
        (a: { offered: number; done: number; burst: number; during: number }) =>
          a.offered === a.done && a.burst >= 55 && a.during > 0,
      ),
  );
  assert.deepEqual(
    r.reference.map((v: any) => v.release),
    [W0.R1.hash, W0.R2.hash, W0.R3.hash],
  );
  for (const [i, v] of r.reference.entries()) {
    assert(
      v.people === n &&
        v.receipts > 0 &&
        v.end >= v.position &&
        v.elapsed > 0 &&
        /^[a-f0-9]{64}$/.test(v.digest),
    );
    if (i)
      assert(
        v.livePosition > v.position &&
          v.livePosition <= v.end &&
          v.liveReads >= 64 &&
          v.burst === 55 &&
          v.liveSaves === v.steady + v.burst,
      );
  }
  assert.equal(r.proofs.length, 2);
  for (const [i, v] of r.proofs.entries()) {
    assert(
      v.seq === offers[i].seq &&
        v.position === offers[i].position &&
        v.release === offers[i].label &&
        v.rows >= v.people &&
        v.notices >= 0,
    );
    for (const k of ["all", "event", "parts"]) assert.match(v[k], /^[a-f0-9]{64}$/);
  }
  return r;
}
