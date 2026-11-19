import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  activateDeepRelease,
  businessTime,
  deepGroups,
  readDeepWorlds,
} from "../../../bench/lib/deep-activation.ts";
import { deepEvaluations } from "../../../bench/lib/deep-evaluations.ts";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { DomainOraclePool, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { pageNamespace } from "../../../bench/lib/w0-page-outbox.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import {
  canonical,
  sha256,
  W0,
  type PositionBasis,
  type WorldRow,
} from "../../../bench/lib/w0-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { observe, oracleRecord } from "../act1/check.ts";
import { tenantQueries } from "../scale1/tenants.ts";
import { inputs } from "./preflight.ts";
import { accountsAt } from "./rung.ts";

async function liveSave(comp: CompositionHandle, person: number, key: string) {
  const root = ids.placement(person),
    at = Date.now(),
    position = await comp.currentPosition();
  async function read(p: number) {
    const basis = { position: p, validAt: at };
    const page = await comp.sweepPage([root], basis);
    assert.deepEqual(page.reportedBasis, basis);
    return page.rows;
  }
  const old = await read(position);
  const stamps = old.filter((r) => r.entityId === root && r.attribute === ":placement/stamp");
  assert.equal(stamps.length, 1);
  const stamp = stamps[0]!,
    value = { type: "integer", value: String(Number(stamp.value.value) + 1) };
  const ops = [
    { op: "retract", id: stamp.id },
    { op: "assert", entityId: root, attribute: stamp.attribute, value, validFrom: 0 },
  ];
  const save = await comp.transact(ops, {
    commandId: key,
    actor: "act2-live",
    preconditions: [{ _tag: "TripleLive", id: stamp.id }],
  });
  if (!save.ok) throw Error("Native live save: " + save.tag);
  const r = save.value;
  assert(r.position > position && r.triples.length === 1 && r.triples[0]!.id !== stamp.id);
  const t = r.triples[0]!;
  assert.deepEqual(
    [t.entityId, t.attribute, t.value, t.validFrom],
    [root, stamp.attribute, value, 0],
  );
  const [byId, pinned, current] = await Promise.all([
    comp.transactionByCommand(key),
    read(position),
    read(r.position),
  ]);
  assert(
    byId.ok &&
      byId.value?.commandId === key &&
      byId.value.txId === r.txId &&
      byId.value.position === r.position,
  );
  const rowBytes = (rows: readonly WorldRow[]) =>
    rows
      .map((x) =>
        canonical([
          x.id,
          x.entityId,
          x.attribute,
          x.value,
          x.position,
          x.validFrom,
          x.validTo ?? null,
        ]),
      )
      .sort();
  assert.deepEqual(rowBytes(pinned), rowBytes(old));
  const predicted = [
    ...old.filter((x) => x.id !== stamp.id),
    {
      id: t.id,
      entityId: root,
      attribute: stamp.attribute,
      value,
      position: r.position,
      validFrom: 0,
    },
  ];
  assert.deepEqual(rowBytes(current), rowBytes(predicted));
  return {
    person,
    position,
    save: r.position,
    txId: r.txId,
    readHash: sha256(canonical(rowBytes(current))),
  };
}
const [seedDir, out, source] = process.argv.slice(2);
assert.match(source!, /^[0-9a-f]{40}$/);
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), source);
const seedBytes = fs.readFileSync(path.join(seedDir!, "seed.json"));
const seed = JSON.parse(seedBytes.toString());
const ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER!,
  owner = fs.readFileSync(ownerFile);
assert.equal(sha256(owner), seed.ownerSha256);
const slot = JSON.parse(owner.toString());
assert(
  slot.holder === "DX-ACT2" &&
    slot.endpoint === process.env.DATOMIC_URL &&
    slot.container === seed.slot,
);
const n = seed.accounts[1].people,
  accounts = accountsAt(n),
  target = accounts[1]!;
assert.deepEqual(seed.accounts, accounts);
const groups = deepGroups(target.first, n),
  roster = groups.flat().map(W0.placementId);
const nonce = randomUUID(),
  run = "act2-" + nonce;
fs.mkdirSync(out!);
const emit = (file: string, data: unknown) =>
  fs.writeFileSync(path.join(out!, file), canonical(data) + "\n", { flag: "wx" });
const sourceInputs = inputs(),
  binding = {
    source,
    sourceInputs,
    nonce,
    scope: seed.scope,
    slot: seed.slot,
    seed: sha256(seedBytes),
    owner: sha256(owner),
  };
emit("attempt.json", binding);
assert.equal(seed.source, source);
assert.equal(seed.sourceInputs, sourceInputs);
process.env.TX2_W0_POINT_JOURNAL = "1";
const comp = await openComposition("reach", "datomic", seed.scope);
const reader = await openComposition("reach", "datomic", seed.scope);
const oracle = new DomainOraclePool(undefined, 2);
const previous = new Map<number, any>(),
  historic = new Map<number, any>();
let prior: Awaited<ReturnType<typeof activateDeepRelease>> | undefined;
const profiles = [];
const closures = [];
try {
  for (const name of ["R1", "R2"] as const) {
    const prefix = run + "-" + name;
    const before = await liveSave(comp, target.first, prefix + "-before");
    const cut = await activateDeepRelease(comp, run, name, Date.now(), prior);
    prior = cut;
    const basis = { position: cut.position, validAt: cut.validAt };
    const membership = await tenantQueries(reader, accounts, basis);
    assert.deepEqual(membership.counts, seed.seed.membership);
    const release = await reader.sweepPage(["deep-release:" + run], basis);
    assert.deepEqual(release.reportedBasis, basis);
    assert.deepEqual(
      release.rows.map((r) => [r.id, r.position, r.attribute, r.value.value]),
      [[cut.assertion, cut.position, ":release/hash", W0[name].hash]],
    );
    const worlds = new Map<number, W0.World>(),
      oracleHashes = new Map<number, string>(),
      worldHashes = new Map<number, string>();
    const stateHashes: string[] = [];
    const domainBasis = { tx: cut.position, validTime: businessTime(cut.validAt) };
    const firstMutation = await liveSave(comp, target.first, prefix + "-post-capture");
    assert(firstMutation.save > cut.position);
    for (const group of groups) {
      const input = await readDeepWorlds(reader, group, basis, target.key);
      await Promise.all(
        input.map(async (w, j) => {
          const i = group[j]!;
          assert(!worlds.has(i));
          worlds.set(i, w);
          worldHashes.set(i, sha256(canonical(w)));
          const bytes = await oracle.call("evaluate", {
            world: w,
            release: name,
            basis: domainBasis,
          });
          const evaluated = JSON.parse(bytes);
          assert.equal(evaluated.subject, w.subject);
          assert.deepEqual(evaluated.basis, domainBasis);
          assert.equal(evaluated.release, W0[name].hash);
          oracleHashes.set(i, sha256(bytes));
          const old = previous.get(i) ?? emptyWireState();
          const next = JSON.parse(
            await oracle.call("publish", { state: old, evaluations: [oracleRecord(evaluated)] }),
          );
          assert.equal(next.state.subjects.length, 1);
          if (next.deliveries.length || canonical(old.items) !== canonical(next.state.items))
            historic.set(i, next.state);
          previous.set(i, next.state);
          stateHashes[i - target.first] = sha256(canonical(next.state));
        }),
      );
    }
    const r2Witness = await readDeepWorlds(
      reader,
      [target.first],
      { position: firstMutation.save, validAt: cut.validAt },
      target.key,
    );
    assert.notEqual(sha256(canonical(r2Witness[0])), worldHashes.get(target.first));
    emit(name + "-oracle.json", {
      binding,
      cut,
      firstMutation,
      before,
      roster: sha256(canonical(roster)),
      comparisons: groups
        .flat()
        .map((i) => [i, worldHashes.get(i), oracleHashes.get(i), stateHashes[i - target.first]]),
    });
    for (const count of [1, 2, 3, 4, 5]) {
      const records: W0.EvaluationRecord[] = [];
      for await (const evaluated of deepEvaluations(
        groups,
        name,
        domainBasis,
        count,
        async (group) => group.map((i) => worlds.get(i)!),
      )) {
        for (const [j, r] of evaluated.records.entries()) {
          const i = evaluated.group[j]!;
          assert.equal(r.worldSha256, worldHashes.get(i));
          assert.equal(r.outputSha256, oracleHashes.get(i));
          records.push(r.record);
        }
      }
      assert.deepEqual(
        records.map((r) => r.subject),
        roster,
      );
      for (const variant of ["historical", "guard-fact", "page-cut"] as const) {
        const arm = run + "-w" + count + "-" + variant;
        process.env.TX2_W0_OUTBOX_NAMESPACE = variant === "page-cut" ? pageNamespace(arm) : arm;
        const pre = await liveSave(comp, target.first, prefix + arm + "-before");
        let during: ReturnType<typeof liveSave> | undefined;
        // [DX-ACT2] Why: force a live write after the sweep enters publication and before its final ACK, even on the shortest local rung. Rejected: inferring overlap from two nearly equal wall-clock timestamps.
        const withTraffic = {
          ...comp,
          transact: async (...args: Parameters<typeof comp.transact>) => {
            if (!during) during = liveSave(reader, target.first, prefix + arm + "-during");
            await during;
            return comp.transact(...args);
          },
        };
        const pub = await publishChanged(withTraffic, records, {
          layout: variant === "historical" ? undefined : variant,
          frameSize: variant === "page-cut" ? 256 : 32,
          inflight: 1,
          roster: { subjects: roster, release: W0[name].hash, basis: records[0]!.basis },
        });
        assert(during, "No live publication overlap");
        const mid = await during;
        const head = await comp.currentPosition();
        assert(pre.save < mid.save && mid.save < head);
        const post = await liveSave(reader, accounts[0]!.first, prefix + arm + "-after");
        assert(post.save > head);
        if (variant === "page-cut") {
          assert.equal(pub.coverage?.roster, sha256(canonical(roster)));
          assert.equal(pub.coverage?.size, roster.length);
        }
        let missed = 0,
          checked = 0;
        for (const group of groups) {
          const states = await observe(reader, group.map(W0.placementId), head, variant);
          for (const [j, i] of group.entries()) {
            const expected = previous.get(i),
              actual = canonical(states[j]);
            const wanted =
              variant === "historical" ? (historic.get(i) ?? emptyWireState()) : expected;
            assert.equal(
              sha256(actual),
              sha256(canonical(wanted)),
              name + " " + variant + " state for " + i,
            );
            if (actual !== canonical(expected)) {
              assert.equal(variant, "historical");
              assert.equal(
                canonical([states[j].pending, states[j].items]),
                canonical([expected.pending, expected.items]),
              );
              missed++;
            }
            checked++;
          }
        }
        assert.equal(checked, n);
        if (variant === "historical" && name === "R2") assert(missed > 0 && missed < n);
        const neighbors = Array.from({ length: accounts[0]!.people }, (_, i) => W0.placementId(i));
        const other = await observe(reader, neighbors, head, variant);
        assert(other.every((state) => canonical(state) === canonical(emptyWireState())));
        const result = {
          binding,
          release: name,
          variant,
          evaluators: count,
          cut,
          publicationPosition: head,
          checked,
          missingGuards: missed,
          roster: sha256(canonical(roster)),
          coverage: pub.coverage ?? null,
          pre,
          mid,
          post,
          outcome: variant === "historical" ? "historical-control" : "exact",
        };
        emit(name + "-" + variant + "-w" + count + ".json", result);
        profiles.push(result);
        console.log(JSON.stringify({ name, count, variant, checked, missed }));
      }
    }
    // [DX-ACT2] Why: every evaluator used this immutable native cut; reopen it after all intervening writes. Rejected: certifying world hashes only from the original materialization.
    for (const group of groups) {
      const reopened = await readDeepWorlds(reader, group, basis, target.key);
      for (const [j, w] of reopened.entries())
        assert.equal(sha256(canonical(w)), worldHashes.get(group[j]!));
    }
    closures.push({ name, cut, worlds: worlds.size });
  }
  assert.equal(profiles.length, 30);
  assert(fs.readFileSync(ownerFile).equals(owner));
  assert.equal(inputs(), sourceInputs);
  emit("complete.json", {
    binding,
    closures,
    profiles: profiles.map((p) => [p.release, p.variant, p.evaluators, p.checked, p.missingGuards]),
  });
} finally {
  oracle.close();
  await Promise.all([comp.close(), reader.close()]);
}
