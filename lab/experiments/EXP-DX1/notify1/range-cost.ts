import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, reachableRows, sha256, triplexValue, worldOf } from "../../../bench/lib/w0-world.ts";
import { Notices, type Cut, type Request } from "./journal.ts";
import { CommittedRanges } from "./ranges.ts";
import { Relay } from "./relay.ts";
import { Documents, hash, parse, type Op } from "./store.ts";
import { wireDelivery } from "./verify.ts";
import { recipient } from "./worker.ts";

type Value = { e: string; a: string; v: number | string; from: number; to?: number; tx: number };
const at = Date.parse(W0.POPULATION_VALID_TIME),
  instant = (ms: number) => new Date(ms).toISOString().replace(/Z$/, "000Z");
const put = ({ e, a, v, from, to }: Value): Op => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: triplexValue(a, v),
  validFrom: from,
  ...(to === undefined ? {} : { validTo: to }),
});
const p99 = (xs: number[]) => xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * 0.99) - 1];

async function arm(n: number, mode: string, scope: string, dir: string, native: boolean) {
  const src: CompositionHandle = native
    ? await openComposition("reach", "datomic", scope)
    : memoryComposition("datomic", scope);
  const rx = await recipient("rx-" + scope, dir);
  const oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  try {
    const ids = Array.from({ length: n }, (_, i) => W0.placementId(i)),
      ordinal = new Map(ids.map((s, i) => [s, i])),
      location = (i: number) => "loc:" + (i % 10),
      state = (i: number) => "jur:" + (i % 3),
      versions = new Map<string, Value[]>(),
      active = new Map<string, string>();
    const key = (e: string, a: string) => e + "/" + a;
    const value = (e: string, a: string, v: Value["v"], from = 0): Value => ({
      e,
      a,
      v,
      from,
      tx: 0,
    });
    const facts = [
      ...Array.from({ length: 3 }, (_, i) => value(state(i), "stateMinWageCents", 1650)),
      ...Array.from({ length: 10 }, (_, i) => [
        value(location(i), "jurisdiction", state(i)),
        value(location(i), "localMinWageCents", 1700),
      ]).flat(),
      ...ids.flatMap((e, i) => [
        value(e, "location", location(i)),
        value(e, "payRateCents", 1700 + (i % 19) * 25),
        value(e, "bgcStatus", "clear"),
      ]),
      value(ids[0]!, "payRateCents", 1725, at + 1000),
    ];
    // A later, known valid-time endpoint is present before the first save.
    const firstPay = facts.find((f) => f.e === ids[0] && f.a === "payRateCents")!;
    firstPay.to = at + 1000;
    for (let j = 0; j < facts.length; j += 384) {
      const group = facts.slice(j, j + 384);
      const reply = await src.transact(group.map(put), { commandId: "seed-" + j });
      assert(reply.ok && reply.value.triples.length === group.length);
      for (const [i, f] of group.entries()) {
        const k = key(f.e, f.a);
        if (f.from <= at) active.set(k, reply.value.triples[i]!.id);
        versions.set(k, [...(versions.get(k) ?? []), { ...f, tx: reply.value.position }]);
      }
    }
    const a = new Notices(src, "account", {
      identity: "shared-wage-traffic-v1",
      roster: async () => ids,
      ...(mode === "ordered" ? { ranges: new CommittedRanges(ids, true) } : {}),
      worlds: async (people, cut) => {
        const basis = { position: cut.position, validAt: Date.parse(cut.validTime) };
        const page = await src.sweepPage(people, basis);
        assert.deepEqual(page.reportedBasis, basis);
        return people.map((s) => worldOf(s, reachableRows([s], page.rows)));
      },
    });
    const sink = new Documents(rx, "effects"),
      relay = new Relay(a, sink, 16);
    const request = (id: string, kind: Request["kind"], validTime: string): Request => ({
      id,
      kind,
      release: "R2",
      from: W0.POPULATION_VALID_TIME,
      validTime,
      selection: { kind: "census" },
    });
    await relay.create(scope, instant(at));
    const base = await a.append(await a.observe(), request("baseline", "activation", instant(at)));
    await relay.drain();
    assert.deepEqual(await relay.effects(), []);
    async function save(id: string, e: string, attr: string, v: Value["v"], valid = at, from = 0) {
      const k = key(e, attr),
        previous = active.get(k)!;
      const tail = await a.observe();
      const old = versions.get(k)!.findLast((f) => f.from <= at)!;
      const change = value(e, attr, v, from);
      const ops: Op[] = [{ op: "retract", id: previous }];
      if (from > old.from) ops.push(put({ ...old, to: from }));
      ops.push(put(change));
      const started = performance.now();
      const saved = await a.append(tail, request(id, "reconcile", instant(valid)), ops, [
        { _tag: "TripleLive", id: previous },
      ]);
      const admissionMs = performance.now() - started;
      const receipt = await src.transactionByCommand(a.db.command("event-command:" + id));
      assert(
        receipt.ok &&
          receipt.value.txId === saved.txId &&
          receipt.value.position === saved.position,
      );
      const asserted = receipt.value.changes.find(
        (c) =>
          c.op === "assert" && c.entityId === e && c.attribute === attr && c.validFrom === from,
      );
      assert(asserted);
      active.set(k, asserted.tripleId);
      versions.set(k, [...versions.get(k)!, { ...change, tx: saved.position }]);
      return { ...saved, admissionMs, writes: receipt.value.changes.length };
    }
    const source = await save("floor", location(1), "localMinWageCents", 1875);
    const r0 = await rx.currentPosition(),
      w0 = await src.currentPosition(),
      sample = new Relay(a, sink, 16),
      start = performance.now();
    const actual =
      mode === "control"
        ? undefined
        : sample.drain({ through: 2 }).then(() => performance.now() - start);
    const saveAcks: number[] = [];
    for (let j = 0; j < 16; j++) {
      const offer = start + 10 + j * 65;
      await sleep(Math.max(0, offer - performance.now()));
      await save("live-" + j, ids[2 + j]!, "payRateCents", 1790);
      saveAcks.push(performance.now() - offer);
    }
    const drainMs = await actual;
    if (mode === "control") await sample.drain({ through: 2 });
    const r1 = await rx.currentPosition(),
      w1 = await src.currentPosition(),
      ledger = sample.ledgerStore(scope);
    const metrics = { ...sample.metrics };
    const expected: ReturnType<typeof wireDelivery>[] = [];
    const changed: string[] = [],
      complement: string[] = [];
    const witness = (people: string[], cut: Cut) =>
      people.map((subject) => {
        const i = ordinal.get(subject)!,
          l = location(i),
          j = state(i % 10);
        const visible = [
          key(subject, "location"),
          key(subject, "payRateCents"),
          key(subject, "bgcStatus"),
          key(l, "jurisdiction"),
          key(l, "localMinWageCents"),
          key(j, "stateMinWageCents"),
        ].flatMap(
          (k) =>
            versions
              .get(k)!
              .findLast(
                (f) => f.tx <= cut.position && f.from <= at && (f.to === undefined || f.to > at),
              ) ?? [],
        );
        return { subject, facts: visible.map(({ e, a, v, tx }) => ({ e, a, v, tx })) };
      });
    for (const position of [base.position, source.position]) {
      for (let i = 0; i < n; i += 64) {
        const group = ids.slice(i, i + 64),
          validTime = instant(at);
        const proof = parse<{ affected: string[]; deliveries: typeof expected }>(
          await oracle.call("coverage", {
            basis: { tx: position, validTime },
            release: "R2",
            worlds: witness(group, { position, validTime }),
          }),
        );
        expected.push(...proof.deliveries);
        if (position === source.position) {
          changed.push(...proof.affected);
          complement.push(...group.filter((id) => !proof.affected.includes(id)));
        }
      }
    }
    const observed = (await sample.effects()).map(wireDelivery);
    assert.deepEqual(observed, expected);
    const floorCoverage = await a.coverage(await a.event(2, source.position), ledger, r1);
    if (mode === "ordered") assert.deepEqual(floorCoverage?.ids, changed);
    else assert.equal(floorCoverage, undefined);
    const kinds = [{ kind: "local shared floor", certified: !!floorCoverage }];
    if (mode === "ordered") {
      await sample.drain({ through: 18 });
      const recipientAt = await rx.currentPosition();
      for (let i = 3; i <= 18; i++) {
        const event = await a.event(i, w1);
        kinds.push({
          kind: "direct pay edit",
          certified: !!(await a.coverage(event, ledger, recipientAt)),
        });
      }
      // [DX-STG1] Why: price a declared mixture with a backdated two-hop edit and a calendar crossing. Rejected: inferring production fallback frequency from the synthetic denominator.
      const tape = [
        {
          kind: "backdated two-hop state floor",
          e: state(1),
          a: "stateMinWageCents",
          v: 1840,
          valid: at,
          from: at - 86400000,
        },
        {
          kind: "two-hop location move",
          e: location(2),
          a: "jurisdiction",
          v: state(1),
          valid: at,
          from: 0,
        },
        {
          kind: "save crossing a scheduled validity boundary",
          e: ids[30]!,
          a: "payRateCents",
          v: 1800,
          valid: at + 2000,
          from: 0,
        },
      ];
      let sequence = 18;
      for (const { kind, e, a: attr, v, valid, from } of tape) {
        const saved = await save("shape-" + sequence, e, attr, v, valid, from);
        const event = await a.event(++sequence, saved.position);
        await sample.drain({ through: sequence });
        const range = await a.coverage(event, ledger, await rx.currentPosition());
        kinds.push({ kind, certified: !!range });
      }
    }
    let receiverAssertions = 0,
      receiverChanges = 0;
    for (let pos = r0; pos < r1; ) {
      const page = await rx.feedPage(pos, Math.min(32, r1 - pos));
      assert(page.transactions.length);
      for (const tx of page.transactions) {
        assert.equal(tx.position, ++pos);
        receiverChanges += tx.changes.length;
        receiverAssertions += tx.changes.filter((op) => op.op === "assert").length;
      }
    }
    assert.equal(w1 - w0, saveAcks.length);
    return {
      mode,
      source,
      drainMs,
      offers: saveAcks.length,
      saveAcks,
      saveP99: p99(saveAcks),
      recipientTransactions: r1 - r0,
      receiverChanges,
      receiverAssertions,
      effects: observed.length,
      affected: hash(changed),
      complement: hash(complement),
      metrics,
      kinds,
    };
  } finally {
    await oracle.close();
    await rx.close();
    await src.close();
  }
}

export async function rangeCost(
  n: number,
  dir: string,
  source: string,
  slot: string,
  nonce: string,
  native: boolean,
) {
  assert([1000, 10000, 100000].includes(n));
  assert.match(nonce, /^[a-z0-9-]+$/);
  const pins = [
    "range-cost.ts",
    "ranges.ts",
    "journal.ts",
    "relay.ts",
    "oracle.py",
    "verify.ts",
  ].map((file) => {
    const bytes = fs.readFileSync(new URL(file, import.meta.url));
    const pinned = execFileSync("git", [
      "show",
      source + ":lab/experiments/EXP-DX1/notify1/" + file,
    ]);
    assert(bytes.equals(pinned), `Measurement source changed: ${file}`);
    return [file, sha256(bytes)];
  });
  const arms = [];
  for (const mode of ["control", "census", "ordered"]) {
    console.log(JSON.stringify({ n, mode, scope: nonce }));
    arms.push(await arm(n, mode, `range-${nonce}-${mode}`, dir, native));
  }
  // [DX-STG1] Why: retain fresh measurements only after the distinct recipient's bytes match Python. Rejected: timing a fake recipient or counting visits as notices.
  const result = { n, native, source, slot, nonce, pins, arms };
  fs.writeFileSync(path.join(dir, "range-cost.json"), JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}

if (process.argv[1] === import.meta.filename) {
  const dir = process.env.NOTIFY_DIR!;
  const binding = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8"));
  const owner = process.env.TRIPLEX_LAB_SLOT_OWNER;
  if (owner) {
    const bytes = fs.readFileSync(owner),
      observed = JSON.parse(bytes.toString());
    assert.equal(sha256(bytes), binding.owner);
    assert.equal(observed.container, binding.slot);
    assert.equal(observed.holder, "DX-STG1");
    assert.equal(observed.endpoint, process.env.DATOMIC_URL);
  } else assert.equal(binding.slot, "memory");
  const result = await rangeCost(
    Number(process.argv[2]),
    dir,
    binding.source,
    binding.slot,
    binding.nonce,
    !!owner,
  );
  if (owner) assert.equal(sha256(fs.readFileSync(owner)), binding.owner);
  console.log(
    JSON.stringify(
      result.arms.map(({ mode, effects, drainMs, saveP99, kinds }) => ({
        mode,
        effects,
        drainMs,
        saveP99,
        kinds,
      })),
    ),
  );
}
