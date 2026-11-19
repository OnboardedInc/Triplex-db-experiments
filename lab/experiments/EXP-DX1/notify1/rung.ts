import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { Fixture, originalWorld } from "./fixture.ts";
import { runWindow, type Offer, type Profile } from "./workload.ts";
import type { Cut } from "./journal.ts";
import { hash } from "./store.ts";

export function inputPins() {
  const base = new URL("./", import.meta.url);
  return Object.fromEntries(
    [
      "census.ts",
      "deep.ts",
      "dispatcher.ts",
      "fixture.ts",
      "journal.ts",
      "oracle.py",
      "receiver.ts",
      "rung.ts",
      "store.ts",
      "verify.ts",
      "workload.ts",
    ]
      .sort()
      .map((n) => [n, sha256(fs.readFileSync(new URL(n, base)))]),
  );
}
export async function fixtureProfile(store: CompositionHandle, n: number): Promise<Profile> {
  const inputs = new Fixture(store),
    seed = await inputs.seed(n),
    ids = Array.from({ length: n }, (_, i) => W0.placementId(i));
  const changes = new Map<number, { position: number; pay: number }[]>(),
    pay = (e: Offer) => (e.seq % 2 ? 1620 : 1510);
  const offers: Offer[] = Array.from({ length: 36000 }, (_, i) => ({
    seq: i,
    atMs: 20 + i * 100,
    subject: (i * 31) % Math.max(1, Math.ceil(n * 0.02)),
  }));
  return {
    inputs,
    ids,
    validTime: W0.POPULATION_VALID_TIME,
    offers,
    write: (e, cut) => inputs.edit(W0.placementId(e.subject), { payRateCents: pay(e) }, cut),
    committed(e, entry) {
      const edits = changes.get(e.subject) ?? [];
      edits.push({ position: entry.receipt.position, pay: pay(e) });
      changes.set(e.subject, edits);
    },
    async witness(list: string[], cut: Cut) {
      return list.map((s) => {
        const i = Number(s.slice(4)),
          w = originalWorld(i),
          pos = seed[Math.floor(i / 128)]!;
        const pay = changes.get(i)?.findLast((x) => x.position <= cut.position);
        const facts = w.facts
          .map((f) => ({ ...f, tx: pos }))
          .filter((f) => !(pay && f.e === s && f.a === "payRateCents"));
        if (pay) facts.push({ e: s, a: "payRateCents", v: pay.pay, tx: pay.position });
        return { subject: s, facts };
      });
    },
  };
}
export async function measuredPair(
  n: number,
  dir: string,
  source: string,
  slot: string,
  nonce: string,
  deep = false,
  gapMs = 0,
  readers = 4,
  priority = false,
) {
  const pins = inputPins();
  const native = process.env.NOTIFY_NATIVE === "1" || deep;
  const open = (name: string) =>
    native
      ? openComposition("reach", "datomic", name)
      : Promise.resolve(memoryComposition("datomic", name));
  const runs = [];
  const commonTime = new Date().toISOString().replace(/Z$/, "000Z");
  let duration: number | undefined;
  for (const name of ["dispatch", "baseline"]) {
    const epoch = nonce + "-" + name,
      src = await open("notice-" + epoch),
      receiver = await open("effects-" + epoch);
    let readPeer: CompositionHandle | undefined;
    try {
      if (deep && process.env.DATOMIC_READ_URLS) {
        const writerUrl = process.env.DATOMIC_URL!;
        try {
          process.env.DATOMIC_URL = process.env.DATOMIC_READ_URLS.split(",")[0]!;
          readPeer = await open("notice-" + epoch);
        } finally {
          process.env.DATOMIC_URL = writerUrl;
        }
      }
      const profile = deep
        ? await (await import("./deep.ts")).deepProfile(src, n, commonTime, readPeer)
        : await fixtureProfile(src, n);
      const run = await runWindow({
        profile,
        source: src,
        receiver,
        epoch,
        gapMs,
        readers,
        duration,
        priority,
        pace: deep ? 0 : 60,
        phase: (s) =>
          console.log(JSON.stringify({ n, arm: name, phase: s, time: new Date().toISOString() })),
      });
      duration = run.duration;
      const { reads, saves, history, ...summary } = run;
      fs.writeFileSync(
        path.join(dir, name + "-raw.json"),
        JSON.stringify({ reads, saves, history }),
        { flag: "wx" },
      );
      runs.push(summary);
      fs.writeFileSync(path.join(dir, name + ".json"), JSON.stringify(summary), { flag: "wx" });
    } finally {
      await readPeer?.close();
      await src.close();
      await receiver.close();
    }
  }
  const [a, b] = runs;
  assert(
    a &&
      b &&
      a.offerDigest === b.offerDigest &&
      a.saveCount === b.saveCount &&
      a.proof?.subjects === n &&
      a.proof.eventCounts[1] === a.dispatch.deliveries,
  );
  assert(a.readP99 && b.readP99 && a.saveP99 && b.saveP99);
  const result = {
    diagnostic: true,
    n,
    source,
    slot,
    nonce,
    inputs: pins,
    profile: a.profile,
    dispatch: a,
    baseline: b,
    ratios: { read: a.readP99 / b.readP99, commit: a.saveP99 / b.saveP99 },
  };
  assert.equal(hash(inputPins()), hash(pins));
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}
if (process.argv[1] === import.meta.filename) {
  const dir = process.env.NOTIFY_DIR!,
    n = Number(process.argv[2]),
    gap = Number(process.argv[3] ?? 0);
  assert([1000, 10000].includes(n) && Number.isFinite(gap) && gap >= 0);
  const binding = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8")),
    owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  assert.equal(sha256(owner), binding.owner);
  const identity = JSON.parse(owner.toString());
  assert(
    identity.holder === "DX-STG1" &&
      identity.mode === "exclusive" &&
      identity.endpoint === process.env.DATOMIC_URL &&
      binding.slot === identity.container,
  );
  assert.equal(
    binding.source,
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  );
  const r = await measuredPair(
    n,
    dir,
    binding.source,
    binding.slot,
    binding.nonce,
    false,
    gap,
    4,
    process.argv[4] === "priority",
  );
  assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(owner));
  console.log(
    JSON.stringify({
      subjects: n,
      rate: r.dispatch.deliveriesPerSecond,
      ratios: r.ratios,
      proof: r.dispatch.proof,
    }),
  );
}
