// [DX-ACT8, sixth round] The compiler stamp across an upgrade on one toy stack, with the re-stamp route (the fifth review's
// Y2, its section 3 item 7; after the reviewer's act10/stack-stamp.ts). Run by the held runner under DX_ACT10_STACK=1
// DX_ACT8_STAMP_STACK=1 with OLD_ROOT naming `lab/experiments/EXP-DX1` of the enrolling build (its packages those of the
// running checkout). Namespaced account 5 of the held database: the old build enrols, publishes R1 and settles it, then
// publishes R2 and leaves it owed; this build then publishes and settles (typed refusals, nothing written), reads the
// stamp status, tries the re-stamp (refused: R2 owed); the old build settles R2; this build re-stamps; the old build
// publishes (refused); this build publishes R3 and settles; every notice event (both builds') is read back by this build.
// Every step's outcome goes to <out>/act8-stamp.json; `pass` says whether exactly the expected refusals happened.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { keyFor } from "../scale1/decision/plan.ts";
import { fact, openStore, type HeldSource, type Store } from "../actv-lazy/store.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { Settlement } from "../actv-lazy/join/settlement.ts";

const validTime = W0.POPULATION_VALID_TIME;
type Ctx = { out: string; s: Store; descriptor: Pick<HeldSource, "cut" | "seal" | "people">; attempt: string };

export async function act8StampStack(c: Ctx) {
  const root = process.env.OLD_ROOT;
  if (!root) throw new Error("DX_ACT8_STAMP_STACK needs OLD_ROOT");
  const old = {
    store: await import(root + "/actv-lazy/store.ts"),
    account: await import(root + "/actv-lazy/join/account.ts"),
    settlement: await import(root + "/actv-lazy/join/settlement.ts"),
    bulk: await import(root + "/actv-lazy/join/bulk.ts"),
    selector: (await import(root + "/actv-lazy/join/index.ts")).selector as string,
  };
  const selector = (await import("../actv-lazy/join/index.ts")).selector as string;
  const results: Record<string, any> = { started: new Date().toISOString(), oldSelector: old.selector, selector, selectorsDiffer: old.selector !== selector };
  const save = () => writeFileSync(path.join(c.out, "act8-stamp.json"), JSON.stringify(results, null, 1));
  const run = c.attempt.slice(0, 8);
  const account = keyFor(5);
  const held: HeldSource = {
    account, prefix: "acct/" + account + "/", people: c.descriptor.people, cut: c.descriptor.cut,
    seal: sha256(canonical([c.descriptor.seal, "act8-stamp6", account])), namespace: true,
    verifyThrough: async () => {}, committed: () => {},
  };
  const step = async (name: string, f: () => Promise<unknown>) => {
    const t0 = performance.now();
    try {
      results[name] = { ok: true, ms: Math.round(performance.now() - t0), value: await f() };
    } catch (e) {
      const err = e as Error & { stored?: string; running?: string; owes?: unknown };
      results[name] = { ok: false, ms: Math.round(performance.now() - t0), error: err?.constructor?.name, stored: err?.stored, running: err?.running,
        owes: err?.owes, message: String(err?.message).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 2).join(" | ").slice(0, 300) };
    }
    console.log("[act8-stamp] " + name + " " + JSON.stringify(results[name]).slice(0, 400));
    save();
  };
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  process.env.TX2_PUBLISH_BESIDE = "1";
  const settleAll = async (a: { notices: { observe: () => Promise<{ value: { sequence: number } }> } }, open: () => Promise<{ settle: (n: number) => Promise<unknown>; close: () => Promise<void> }>) => {
    const w = await open();
    try {
      const t = (await a.notices.observe()).value.sequence;
      for (let seq = 1; seq <= t; seq++) await w.settle(seq);
      return { releases: t };
    } finally {
      await w.close();
    }
  };
  const oldStore = await old.store.openStore(c.s.scope, "act2-deep", "write", held);
  const oa = new old.account.JoinedAccount(oldStore);
  const store = await openStore(c.s.scope, "act2-deep", "write", held);
  const a = new JoinedAccount(store);
  const oldSettle = () => settleAll(oa, () => old.settlement.Settlement.open(oa, new old.bulk.BulkQueue(1), false, "bytes", "progress"));
  const newSettle = () => settleAll(a, () => Settlement.open(a, new BulkQueue(1), false, "bytes", "progress"));
  // 1. The old build: enrol, publish R1, settle; publish R2 and leave it owed.
  await step("oldEnrol", async () => { await oa.installHeld(validTime); return "enrolled"; });
  await step("oldPublishR1", async () => (await oa.publish("act8stamp-" + run + "-r1", W0.R1.doc, validTime, "owed")).position);
  await step("oldSettle1", oldSettle);
  await step("oldPublishR2", async () => (await oa.publish("act8stamp-" + run + "-r2", W0.R2.doc, validTime, "owed")).position);
  // 2. This build before the re-stamp.
  const headBefore = await store.head();
  await step("newPublishEarly", async () => (await a.publish("act8stamp-" + run + "-early", W0.R1.doc, validTime, "owed")).position);
  await step("newSettleEarly", newSettle);
  await step("newTailEarly", async () => (await a.notices.observe()).value.sequence);
  await step("newSave", async () => {
    const at = await store.head();
    return { position: (await store.commit("act8stamp-" + run + "-save", "save", [fact(held.prefix + "act8-stamp-probe", ":act8/stamp-probe", "after-upgrade")], at)).position };
  });
  await step("newRead", async () => {
    const [w] = await worldsAt(store, store.profile, [W0.placementId(0)], { tx: await store.head(), validTime });
    return { subject: w?.subject, facts: w?.facts.length };
  });
  await step("statusOwed", () => a.stampStatus());
  await step("restampOwed", () => a.restamp());
  // 3. The old build finishes R2; this build re-stamps.
  await step("oldSettle2", oldSettle);
  await step("statusReady", () => a.stampStatus());
  await step("restamp", () => a.restamp());
  await step("oldPublishAfter", async () => (await oa.publish("act8stamp-" + run + "-r3-old", W0.R2.doc, validTime, "owed")).position);
  // 4. This build publishes R3 and settles; every event read back.
  await step("newPublishR3", async () => (await a.publish("act8stamp-" + run + "-r3", W0.R1.doc, validTime, "owed")).position);
  await step("newSettle3", newSettle);
  await step("newEvents", async () => {
    const head = await store.head(), t = (await a.notices.observe()).value.sequence, out: unknown[] = [];
    for (let n = 1; n <= t; n++) { const e = await a.notices.event(n, head); out.push([n, e.at, e.value.inputs === selector ? "this build" : e.value.inputs === old.selector ? "old build" : "other"]); }
    return out;
  });
  await step("statusAfter", () => a.stampStatus());
  const r = results;
  const typed = (x: any) => x?.ok === false && x.error === "CompilerChanged" && x.stored === old.selector && x.running === selector;
  r.checks = {
    oldSteps: ["oldEnrol", "oldPublishR1", "oldSettle1", "oldPublishR2", "oldSettle2"].every((k) => r[k]?.ok),
    newPublishEarlyTyped: typed(r.newPublishEarly),
    newSettleEarlyTyped: r.newSettleEarly?.ok === false && r.newSettleEarly.error === "CompilerChanged",
    tailUnchanged: r.newTailEarly?.ok && r.newTailEarly.value === 2,
    saveAndRead: r.newSave?.ok && r.newRead?.ok && r.newRead.value.facts > 0,
    statusOwes: r.statusOwed?.ok && canonical(r.statusOwed.value.owes.values) === canonical([2]) && !r.statusOwed.value.ready,
    restampRefusedWhileOwed: r.restampOwed?.ok === false && r.restampOwed.error === "RestampRefused",
    ready: r.statusReady?.ok && r.statusReady.value.ready,
    restamped: r.restamp?.ok && r.restamp.value.restamped === true,
    oldRefusedAfter: r.oldPublishAfter?.ok === false,
    newPublishes: r.newPublishR3?.ok && r.newSettle3?.ok,
    eventsReadable: r.newEvents?.ok && r.newEvents.value.length === 3,
    current: r.statusAfter?.ok && r.statusAfter.value.current,
  };
  r.headBefore = headBefore;
  r.pass = r.selectorsDiffer && Object.values(r.checks).every(Boolean);
  r.finished = new Date().toISOString();
  console.log("[act8-stamp] checks " + JSON.stringify(r.checks) + " pass " + r.pass);
  save();
  for (const x of [oldStore, store]) await (x as { close?: () => Promise<void> }).close?.();
}
