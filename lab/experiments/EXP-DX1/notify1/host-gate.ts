import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openComposition } from "../../../bench/lib/composition.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";
import { deltaFeed, drainHost, eraseLazy, lazyFeed, lazyRecipient } from "./hosts.ts";
import { Documents, hash, parse, unpack } from "./store.ts";
import { wireDelivery } from "./verify.ts";

const mode = process.argv[2],
  root = path.resolve(process.argv[3]!),
  dir = process.env.NOTIFY_DIR!;
assert(mode === "lazy" || mode === "delta");
const atomic = process.env.NOTIFY_HOST_BATCH === "1";
const protectedProbe = mode === "lazy" && process.argv[4] === "protected";
const revision = fs.readFileSync(path.join(root, "version"), "utf8").trim();
const load = (name: string) =>
  import(pathToFileURL(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode, name + ".ts")).href);
const v = W0.POPULATION_VALID_TIME,
  s = "pl:a",
  other = "pl:b",
  ids = [
    s,
    other,
    ...Array.from(
      { length: atomic && !protectedProbe ? 128 : 0 },
      (_, i) => "pl:c" + String(i).padStart(3, "0"),
    ),
  ],
  run = randomUUID();
const facts = (who: string, tx: number): W0.Fact[] => [
  { e: who, a: "location", v: "loc:a", tx },
  { e: who, a: "payRateCents", v: who === s ? 1600 : 1675, tx },
  { e: who, a: "bgcStatus", v: "clear", tx },
  { e: "loc:a", a: "jurisdiction", v: "jur:a", tx },
  { e: "jur:a", a: "stateMinWageCents", v: 1650, tx },
  { e: "loc:a", a: "localMinWageCents", v: 1700, tx },
  ...(who === s ? [{ e: who, a: "ssn", v: "000000000", tx }] : []),
  ...(mode === "lazy" && !protectedProbe ? [{ e: who, a: "everifyStatus", v: "pending", tx }] : []),
];
const sinkStore = await openComposition("reach", "datomic", "notice-sink-" + run),
  sink = new Documents(sinkStore, "recipient"),
  oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
const expected: any[] = [],
  originals: any[] = [];
let payChangedAt: number | undefined;
async function expect(release: string, tx: number, seed: number, mask?: number) {
  const worlds = ids.map((subject) => ({
    subject,
    facts: facts(subject, seed).map((f) => {
      if (payChangedAt && f.e === s && f.a === "payRateCents")
        return { ...f, v: 1500, tx: payChangedAt };
      if (mask && f.a === "ssn") return { ...f, v: { erasedAt: v }, tx: seed };
      return f;
    }),
  }));
  expected.push(
    ...parse<any[]>(await oracle.call("fold", { worlds, release, basis: { tx, validTime: v } })),
  );
}
async function checkEffects(src: Documents, epoch: string) {
  const origin = hash([src.prefix, epoch]),
    at = await sink.head(),
    head = await sink.get<{ batch: number; digest: string }>("received:" + origin, at);
  const observed = [];
  for (let n = 1; n <= head.value.batch; n++)
    observed.push(
      ...unpack<W0.Delivery[]>(
        (await sink.get<string>("effects:" + origin + ":" + n, at)).value,
      ).map(wireDelivery),
    );
  assert.equal(canonical(observed), canonical(expected));
  const pay = observed
    .filter((d) => d.subject === s && d.rule === "MINWAGE")
    .map((d) => Number(d.seq));
  assert.deepEqual(pay, [1, 2, 3, 4]);
  if (atomic) assert(observed.length > 128);
  return {
    count: observed.length,
    orderedSha256: hash(observed),
    packets: head.value.batch,
    paySequences: pay,
  };
}
let proof;
try {
  if (mode === "lazy") {
    const lib = await load("store"),
      dispatch = await load("dispatch"),
      readApi = await load("read");
    let host = await lib.openStore("lazy-notice-" + run);
    let projection = new dispatch.Dispatcher(host);
    try {
      const distinct = new Map(
        ids.flatMap((subject) => facts(subject, 1)).map((f) => [canonical([f.e, f.a]), f]),
      );
      const seed = await host.input("seed", { kind: "baseline", at: v }, [
        ...[...distinct.values()].map((f) => ({
          op: "assert",
          entityId: f.e,
          attribute: f.a,
          value: triplexValue(f.a, f.v),
          validFrom: 0,
        })),
        lib.fact(readApi.rosterRoot(0), "lazy/members", ids),
        lib.fact("members/seal", "lazy/roster-seal", readApi.rosterSeal(ids)),
      ]);
      for (const name of ["R1", "R2"] as const) {
        const ack = await lib.activation(host, "deploy-" + name, W0[name], v);
        assert.equal(ack.changes.length, 1);
        originals.push([name, ack.position, ack.txId]);
        await expect(name, ack.position, seed.position);
      }
      if (protectedProbe) {
        await assert.rejects(
          eraseLazy(host, () => projection.drain(), "erase", s, v),
          /ProtectedSubscriberNeedsRuling/,
        );
        assert.equal(await host.lookup("erase"), null);
        const controls = await host.controls(await host.head());
        assert.equal(controls.masks.length, 0);
        proof = {
          outcome: "protected subscriber refused",
          originalRelease: originals.at(-1),
          erasureCommitted: false,
        };
      } else {
        const loss = await eraseLazy(host, () => projection.drain(), "erase", s, v);
        await expect("R2", loss.position, seed.position, loss.position);
        const rollback = await lib.activation(host, "rollback", W0.R1, v);
        await expect("R1", rollback.position, seed.position, loss.position);
        originals.push(["rollback", rollback.position, rollback.txId]);
        await projection.drain();
        const src = new Documents(host.comp, "lazy-sender"),
          feed = await lazyFeed(host, await host.head(), atomic ? 1024 : 64);
        await assert.rejects(
          drainHost(
            src,
            sink,
            feed,
            async () => {
              const oldRate = seed.changes.find(
                (row: any) => row.entityId === s && row.attribute === "payRateCents",
              );
              assert(oldRate?.assertionTxId === seed.txId);
              const change = await host.input("save-during-delivery", { kind: "source", at: v }, [
                { op: "retract", id: oldRate.tripleId },
                {
                  op: "assert",
                  entityId: s,
                  attribute: "payRateCents",
                  value: triplexValue("payRateCents", 1500),
                  validFrom: 0,
                },
              ]);
              payChangedAt = change.position;
              const decision = await load("decision");
              const q = await decision.propose(host, "w0", s);
              const ordinary = await decision.admitLive(host, "w0", q, undefined, projection);
              if (ordinary.status === "deferred") await projection.drain();
              else
                assert(ordinary.status === "accepted" && ordinary.receipt.actor === "lazy/event");
              originals.push([
                "save-during-delivery",
                change.position,
                change.txId,
                ordinary.status,
              ]);
              await expect("R1", change.position, seed.position, loss.position);
              throw Error("drop ACK");
            },
            atomic,
          ),
          /drop ACK/,
        );
        projection.close();
        await host.close();
        host = await lib.openStore("lazy-notice-" + run);
        projection = new dispatch.Dispatcher(host);
        const reopened = new Documents(host.comp, "lazy-sender"),
          latest = await lazyFeed(host, await host.head(), atomic ? 1024 : 64);
        await drainHost(reopened, sink, latest, undefined, atomic);
        assert.equal(
          (
            await host.rows(
              ids.map((i) => "lazy/pending/" + i),
              await host.head(),
            )
          ).length,
          0,
        );
        proof = await checkEffects(reopened, feed.epoch);
        const serviceFile = path.join(root, "lab/experiments/EXP-DX1/actv-lazy/service.ts");
        if (fs.existsSync(serviceFile)) {
          const service = new (await load("service")).NoticeService(
            host,
            lazyRecipient(host, sink, atomic),
            "w0",
            () => v,
          );
          try {
            const same = await service.activate("wake-control", W0.R1, v);
            await service.settled();
            await expect("R1", same.position, seed.position, loss.position);
            assert.deepEqual(await checkEffects(reopened, feed.epoch), proof);
            originals.push(["service-wake", same.position, same.txId]);
          } finally {
            await service.close();
          }
        }
      }
    } finally {
      projection.close();
      await host.close();
    }
  } else {
    const lib = await load("account"),
      objects = await load("store"),
      dispatch = await load("dispatch"),
      save = await load("save");
    const comp = await openComposition("reach", "datomic", "delta-notice-" + run);
    try {
      const keys = path.join(dir, "test-keys"),
        binding = hash([revision, run]);
      const host = new lib.Account(new objects.Objects(comp, "target"), binding, keys);
      const initial = await host.bootstrap(
        ids,
        ids.map((subject) => ({ subject, facts: facts(subject, 1) })),
        { tx: 10, validTime: v },
      );
      await expect("R1", 10, 1);
      originals.push(["R1", initial.position]);
      const broad = await host.seal("broad", W0.R2, { from: v, valid: v });
      const head = await host.head(broad.position);
      await expect("R2", head.value.basis.tx, 1);
      originals.push(["R2", broad.position, head.value.seq]);
      const erased = await save.save(host, "erase", [], { erase: s });
      const after = await host.head(erased.position);
      await expect("R2", after.value.basis.tx, 1, after.value.basis.tx);
      const rollback = await host.seal("rollback", W0.R1, { from: v, valid: v });
      const last = await host.head(rollback.position);
      await expect("R1", last.value.basis.tx, 1, after.value.basis.tx);
      originals.push(["rollback", rollback.position, last.value.seq]);
      const source = new Documents(comp, "delta-sender");
      const feed = await deltaFeed(
        host,
        last.value.seq,
        (n) => dispatch.expand(host, n),
        atomic ? 16 : 1,
      );
      await assert.rejects(
        drainHost(
          source,
          sink,
          feed,
          async () => {
            // [DX-STG1] Why: a live save can commit after receipt application while the sender still waits for its ACK. Rejected: deriving the original packet again from the newest pay rate.
            const change = await save.save(host, "save-during-delivery", [
              { e: s, a: "payRateCents", from: v, values: [1500] },
            ]);
            const current = await host.head(change.position);
            payChangedAt = current.value.basis.tx;
            originals.push(["save-during-delivery", change.position, current.value.seq]);
            await expect("R1", current.value.basis.tx, 1, after.value.basis.tx);
            throw Error("drop ACK");
          },
          atomic,
        ),
        /drop ACK/,
      );
      const reopened = new lib.Account(new objects.Objects(comp, "target"), binding, keys);
      const newest = await reopened.head(await comp.currentPosition());
      await drainHost(
        source,
        sink,
        await deltaFeed(
          reopened,
          newest.value.seq,
          (n) => dispatch.expand(reopened, n),
          atomic ? 16 : 1,
        ),
        undefined,
        atomic,
      );
      proof = await checkEffects(source, feed.epoch);
    } finally {
      await comp.close();
    }
  }
  const owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  const files = Object.fromEntries(
    fs
      .readdirSync(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode))
      .filter((n) => n.endsWith(".ts"))
      .map((n) => [
        n,
        sha256(fs.readFileSync(path.join(root, "lab/experiments/EXP-DX1/actv-" + mode, n))),
      ]),
  );
  for (const [name, checksum] of Object.entries(files)) {
    assert.equal(
      sha256(
        execFileSync("git", [
          "show",
          revision + ":lab/experiments/EXP-DX1/actv-" + mode + "/" + name,
        ]),
      ),
      checksum,
    );
  }
  fs.writeFileSync(
    path.join(dir, "host.json"),
    JSON.stringify({
      run,
      mode,
      atomic,
      subjects: ids.length,
      revision,
      files,
      owner: sha256(owner),
      originals,
      proof,
    }) + "\n",
    { flag: "wx" },
  );
  console.log(proof);
} finally {
  oracle.close();
  await sinkStore.close();
}
