// [DX-ACT10, fifth review] The compiler stamp across an upgrade, on one toy stack (diagnostic only), run by the held
// runner under DX_ACT10_STACK=1 DX_ACT10_STAMP=1 with OLD_ROOT naming `lab/experiments/EXP-DX1` of the build that
// enrols (the one branch's lab tree, its packages those of the running checkout). Namespaced account 4 of the held
// database is enrolled, published and settled by that build; then this checkout's build publishes and settles the same
// account, and a save and a read of one of its subjects go through this build's store. Every step's outcome, as the
// caller sees it, goes to <out>/act10-stamp.json. Nothing here asserts on the outcome.
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

export async function act10Stamp(c: Ctx) {
  const root = process.env.OLD_ROOT;
  if (!root) throw new Error("DX_ACT10_STAMP needs OLD_ROOT");
  const old = {
    store: await import(root + "/actv-lazy/store.ts"),
    account: await import(root + "/actv-lazy/join/account.ts"),
    settlement: await import(root + "/actv-lazy/join/settlement.ts"),
    bulk: await import(root + "/actv-lazy/join/bulk.ts"),
    selector: (await import(root + "/actv-lazy/join/index.ts")).selector as string,
  };
  const selector = (await import("../actv-lazy/join/index.ts")).selector as string;
  const results: Record<string, unknown> = { started: new Date().toISOString(), oldSelector: old.selector, selector,
    selectorsDiffer: old.selector !== selector };
  const save = () => writeFileSync(path.join(c.out, "act10-stamp.json"), JSON.stringify(results, null, 1));
  const run = c.attempt.slice(0, 8);
  const account = keyFor(4);
  const held: HeldSource = {
    account, prefix: "acct/" + account + "/", people: c.descriptor.people, cut: c.descriptor.cut,
    seal: sha256(canonical([c.descriptor.seal, "act10-stamp", account])), namespace: true,
    verifyThrough: async () => {}, committed: () => {},
  };
  const step = async (name: string, f: () => Promise<unknown>) => {
    const t0 = performance.now();
    try {
      results[name] = { ok: true, ms: Math.round(performance.now() - t0), value: await f() };
    } catch (e) {
      const err = e as Error;
      results[name] = { ok: false, ms: Math.round(performance.now() - t0), error: err?.constructor?.name,
        message: String(err?.message).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 3).join(" | ").slice(0, 300) };
    }
    console.log("[act10-stamp] " + name + " " + JSON.stringify(results[name]).slice(0, 400));
    save();
  };
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  process.env.TX2_PUBLISH_BESIDE = "1";
  const settleAll = async (a: { notices: { observe: () => Promise<{ value: { sequence: number } }> } }, open: () => Promise<{ settle: (n: number) => Promise<unknown>; close: () => Promise<void> }>) => {
    const w = await open();
    try {
      const t = (await a.notices.observe()).value.sequence;
      const out: unknown[] = [];
      for (let seq = 1; seq <= t; seq++) out.push(await w.settle(seq));
      return { releases: t };
    } finally {
      await w.close();
    }
  };
  // 1. The enrolling build (the one branch's lab code): enrol, publish R1, settle.
  const oldStore = await old.store.openStore(c.s.scope, "act2-deep", "write", held);
  const oa = new old.account.JoinedAccount(oldStore);
  await step("oldEnrol", async () => { await oa.installHeld(validTime); return "enrolled"; });
  await step("oldPublishR1", async () => (await oa.publish("act10stamp-" + run + "-r1", W0.R1.doc, validTime, "owed")).position);
  await step("oldSettle", () => settleAll(oa, () => old.settlement.Settlement.open(oa, new old.bulk.BulkQueue(1), false, "bytes", "progress")));
  // 2. This build on the same account: Publish, settle, the notice tail, a save of a subject's fact, a read of it.
  const store = await openStore(c.s.scope, "act2-deep", "write", held);
  const a = new JoinedAccount(store);
  await step("newPublishR2", async () => (await a.publish("act10stamp-" + run + "-r2", W0.R2.doc, validTime, "owed")).position);
  await step("newSettle", () => settleAll(a, () => Settlement.open(a, new BulkQueue(1), false, "bytes", "progress")));
  await step("newNoticeTail", async () => (await a.notices.observe()).value.sequence);
  const subject = W0.placementId(0);
  await step("newSave", async () => {
    const at = await store.head();
    const r = await store.commit("act10stamp-" + run + "-save", "save", [fact(held.prefix + "act10-stamp-probe", ":act10/stamp-probe", "after-upgrade")], at);
    return { position: r.position };
  });
  await step("newRead", async () => {
    const p = await store.head();
    const [w] = await worldsAt(store, store.profile, [subject], { tx: p, validTime });
    return { subject: w?.subject, facts: w?.facts.length };
  });
  await step("newReadOfTheSave", async () => {
    const rows = await store.rows([held.prefix + "act10-stamp-probe"], await store.head());
    return { rows: rows.length, probe: rows.some((r: any) => JSON.stringify(r).includes("after-upgrade")) };
  });
  results.finished = new Date().toISOString();
  save();
  for (const s of [oldStore, store]) await (s as { close?: () => Promise<void> }).close?.();
}
