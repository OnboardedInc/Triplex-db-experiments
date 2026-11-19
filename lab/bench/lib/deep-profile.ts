import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { deepSeed, makeDeepTrace } from "./deep-trace.ts";
import { memberOf, type Fact } from "./world.ts";
import type { Receipt } from "./composition.ts";

export const pinsFile = new URL("../../experiments/EXP-DX1/scale1/profile.json", import.meta.url);
export const deepSources = () =>
  Object.fromEntries(
    [
      "deep-world.ts",
      "deep-trace.ts",
      "deep-command.ts",
      "world.ts",
      "rng.ts",
      "trace.ts",
      "commands.ts",
    ].map((file) => [
      file,
      createHash("sha256")
        .update(fs.readFileSync(new URL(file, import.meta.url)))
        .digest("hex"),
    ]),
  );
export function frozenDeep(scope: number, people: number) {
  const sourcePins = JSON.parse(fs.readFileSync(new URL("./sources.json", pinsFile), "utf8"));
  assert.deepEqual(
    deepSources(),
    sourcePins,
    "Deep generator source differs from its frozen revision",
  );
  assert(Number.isInteger(scope) && scope >= 0 && scope < 10, "Deep account must be 0 through 9");
  const pins: { people: number; population: string; traces: string[] }[] = JSON.parse(
    fs.readFileSync(pinsFile, "utf8"),
  );
  const pin = pins.find((p) => p.people === people);
  assert(pin, "Unfrozen deep population");
  const plan = makeDeepTrace(deepSeed(scope), people, 7200);
  assert.equal(
    plan.sha256,
    pin.traces[scope],
    "Deep logical commands differ from the frozen profile",
  );
  return { ...plan, populationSha256: pin.population };
}

export class DeepSeedWitness {
  private readonly digest = createHash("sha256");
  private previous = 0;
  subjects = 0;
  facts = 0;
  // [DX-SCALE1] Why: count only content-matched, gap-free ACKs from a newly empty scope. Rejected: dividing a planned fact count into the eventual database size.
  observe(
    batch: readonly { subject: number; rows: readonly Fact[] }[],
    receipt: Receipt,
    validFrom: number,
  ) {
    assert.equal(receipt.position, this.previous + 1, "Deep seed journal gap");
    const facts = batch.flatMap((b) => b.rows);
    assert.equal(receipt.triples.length, facts.length, "Wrong deep seed receipt size");
    const actual = new Set<string>(),
      identities = new Set<string>();
    for (const t of receipt.triples) {
      assert(
        t.id && !identities.has(t.id) && t.validFrom === validFrom,
        "Wrong deep seed receipt ID or validity",
      );
      identities.add(t.id);
      actual.add(memberOf(t.entityId, t.attribute, t.value));
    }
    for (const f of facts)
      assert(actual.delete(memberOf(f.e, f.a, f.v)), "Wrong deep seed receipt value");
    assert.equal(actual.size, 0);
    for (const b of batch) {
      assert.equal(b.subject, this.subjects++);
      this.digest.update(JSON.stringify(b.rows) + "\n");
    }
    this.previous = receipt.position;
    this.facts += facts.length;
  }
  finish(people: number, facts: number, pin: string) {
    assert.equal(this.subjects, people);
    assert.equal(this.facts, facts);
    const sha256 = this.digest.digest("hex");
    assert.equal(sha256, pin, "Deep seed differs from its frozen content");
    return { people, facts, position: this.previous, sha256 };
  }
}
import { tenantAccounts, type TenantSpec } from "../../experiments/EXP-DX1/scale1/tenants.ts";
export interface DeepIdentity {
  tenant?: TenantSpec;
  nonce: string;
  source: string;
  slot: string;
  account: number;
  people: number;
  arm: "zero" | "reader" | "activation" | "seed" | "interference" | "small";
}
export function requireIdentity(id: DeepIdentity) {
  assert.match(id.nonce, /^[a-f0-9-]{36}$/);
  assert.match(id.source, /^[a-f0-9]{40}$/);
  assert.match(id.slot, /^tx2-dxscale1-[a-z0-9-]+$/);
  assert(["zero", "reader", "activation", "seed", "interference", "small"].includes(id.arm));
  if (id.tenant) {
    const a = tenantAccounts(id.tenant);
    assert(id.tenant.physical === id.account && a.reduce((n, x) => n + x.people, 0) === id.people);
    return;
  }
  if (id.arm === "small") {
    assert(
      Number.isInteger(id.account) &&
        id.account >= 0 &&
        id.account < 100 &&
        id.people === (id.account === 0 || id.account >= 91 ? 2000 : 100),
    );
    return;
  }
  assert(
    ([10000, 100000].includes(id.people) ||
      (id.people === 40 && id.slot.startsWith("tx2-dxscale1-smoke-"))) &&
      Number.isInteger(id.account) &&
      id.account >= 0 &&
      id.account < 10,
  );
}
export async function deepBarrier(
  dir: string,
  identity: DeepIdentity,
  ready: {
    scope: string;
    seed: { facts: number; sha256: string; position: number };
    trace: string;
  },
) {
  requireIdentity(identity);
  const prefix = `s${identity.account}`;
  const checkpoint = path.join(dir, `${prefix}.ready.json`);
  fs.writeFileSync(checkpoint + ".tmp", JSON.stringify({ identity, ...ready }), { flag: "wx" });
  fs.renameSync(checkpoint + ".tmp", checkpoint);
  const deadline = Date.now() + 24 * 3600_000;
  while (Date.now() < deadline) {
    const go = path.join(dir, "go.json");
    if (!fs.existsSync(go)) {
      await sleep(100);
      continue;
    }
    const plan = JSON.parse(fs.readFileSync(go, "utf8"));
    assert.equal(plan.nonce, identity.nonce);
    assert.equal(plan.source, identity.source);
    assert.equal(plan.slot, identity.slot);
    assert.deepEqual(plan.scopes[prefix], ready);
    assert(
      Number.isFinite(plan.start) && plan.start > Date.now(),
      "Deep barrier start already elapsed",
    );
    return Number(plan.start);
  }
  throw Error("Deep start barrier timed out");
}

// [DX-SCALE1] Why: seeding a scope does not prove its feed, gateway handle and readers are ready. Rejected: starting the fast scopes while a ninth or tenth consumer is still opening.
export async function confirmDeepStart(
  dir: string,
  id: DeepIdentity,
  database: string,
  start: number,
) {
  const name = `s${id.account}`,
    file = path.join(dir, `${name}.armed.json`),
    body = { identity: id, database, start };
  fs.writeFileSync(file + ".tmp", JSON.stringify(body), { flag: "wx" });
  fs.renameSync(file + ".tmp", file);
  while (Date.now() < start - 100) {
    const release = path.join(dir, "release.json");
    if (fs.existsSync(release)) {
      const m = JSON.parse(fs.readFileSync(release, "utf8"));
      assert(
        m.nonce === id.nonce && m.slot === id.slot && m.source === id.source && m.start === start,
      );
      assert.deepEqual(m.armed[name], body);
      return;
    }
    await sleep(50);
  }
  throw Error("Common start reached before the whole deep cohort armed");
}
export function releaseDeepStart(dir: string, identities: readonly DeepIdentity[], start: number) {
  const go = JSON.parse(fs.readFileSync(path.join(dir, "go.json"), "utf8"));
  assert.equal(go.start, start);
  const armed = Object.fromEntries(
    identities.map((id, i) => {
      const name = `s${i}`;
      requireIdentity(id);
      assert(
        id.account === i && id.nonce === go.nonce && id.slot === go.slot && id.source === go.source,
      );
      const row = JSON.parse(fs.readFileSync(path.join(dir, `${name}.armed.json`), "utf8"));
      assert.deepEqual(row.identity, id);
      assert.equal(row.start, start);
      const actual = JSON.parse(Buffer.from(String(row.database).slice(3), "base64url").toString());
      assert.deepEqual(actual, ["triplex-scope-v1", "test", "test", go.scopes[name].scope, 0]);
      return [name, row];
    }),
  );
  assert.equal(Object.keys(go.scopes).length, identities.length);
  assert.equal(new Set(Object.values(armed).map((r) => r.database)).size, identities.length);
  assert(Date.now() + 200 < start, "Cohort armed too late");
  const release = path.join(dir, "release.json");
  fs.writeFileSync(
    release + ".tmp",
    JSON.stringify({ nonce: go.nonce, slot: go.slot, source: go.source, start, armed }),
    { flag: "wx" },
  );
  fs.renameSync(release + ".tmp", release);
}

export async function finishDeepActivations(
  dir: string,
  id: DeepIdentity,
  endedAt: number,
  cut: number,
) {
  const release = JSON.parse(fs.readFileSync(path.join(dir, "release.json"), "utf8"));
  requireIdentity(id);
  assert(
    id.arm === "activation" &&
      release.nonce === id.nonce &&
      release.source === id.source &&
      release.slot === id.slot,
  );
  const file = path.join(dir, `s${id.account}.activation.json`);
  assert(Number.isSafeInteger(cut) && cut > 0 && endedAt >= release.start);
  fs.writeFileSync(file + ".tmp", JSON.stringify({ identity: id, endedAt, cut }), { flag: "wx" });
  fs.renameSync(file + ".tmp", file);
  const names = Object.keys(release.armed),
    deadline = release.start + 7_200_000;
  assert.deepEqual(release.armed[`s${id.account}`].identity, id);
  // [DX-SCALE1] Why: the last account's sweep must still see nine actual writers, feed consumers and reader sets. Rejected: stopping each account's traffic when its own faster sweep finishes.
  while (Date.now() < deadline) {
    if (names.every((n) => fs.existsSync(path.join(dir, `${n}.activation.json`)))) {
      const ends = names.map((n) => {
        const row = JSON.parse(fs.readFileSync(path.join(dir, `${n}.activation.json`), "utf8"));
        assert.deepEqual(row.identity, release.armed[n].identity);
        assert(
          Number.isSafeInteger(row.endedAt) &&
            row.endedAt >= release.start &&
            row.endedAt <= Date.now() &&
            Number.isSafeInteger(row.cut) &&
            row.cut > 0,
        );
        return row.endedAt as number;
      });
      return {
        accounts: names.length,
        lastSweepEndedAt: Math.max(...ends),
        trafficHeldThrough: Date.now(),
      };
    }
    await sleep(100);
  }
  throw Error("The frozen live trace expired before every activation completed");
}
