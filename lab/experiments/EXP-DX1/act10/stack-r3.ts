// [DX-ACT8, third review] Stack checks of the third review's fixes (diagnostic toy only), run by the held runner under
// DX_ACT10_STACK=1 DX_ACT8_R3_STACK=1 on the held toy stack. Every call goes through the real gateways and transactor;
// no save tape runs during these cases. It enrols namespaced accounts 5 to 7 of the held database. Each modelled process
// has its own store with its own permissions (`permits`), so "one process allowed, the others not" is staged inside
// one Node process against one stack:
//   RO  the rollout: this build everywhere with no permission (Publishes and settlement, no settings stored), then one
//       process allowed every setting (its first Publish turns them on while a settler's values frame is in flight;
//       that frame, planned before, must not land after the transition), then processes allowed none (they follow the
//       stored settings: scoped keys, frame IDs with a random part, ledgers in parts with the archive).
//   TP  a transition between a Publish's read and its commit: the Publish is refused once and planned again under the
//       scoped key; one record.
//   TF  a transition and a later release between a values frame's read and its commit: the frame is refused, the
//       release ends superseded, and no value page of it lands after the later release.
//   TN  a transition between a notice frame's read and its commit: the frame is refused and recorded again.
//   KG  (DX_ACT8_R3_KILL=1, with DX_ACT10_GROUP=1 and DX_ACT8_FIXED_PORTS=1) one Publish in each of the three accounts
//       offered at once into the write gateway's group lane, the gateway killed (SIGKILL) while they are in flight and
//       started again; each command offered again until acknowledged: one record per command, its receipt the record.
//   RS  the account's origin written back without its settings (what a restore to before the transition leaves): the
//       processes allowed none publish under the plain key and settle with the archive the notice cursor keeps; a
//       process allowed the settings turns them on again at its next Publish.
// After the cases, for each account: every notice in order and every ledger with its archive against the kernel's fold
// over every event, and every stored release's values against the world at q - 1. A failing check stops the run.
// Results: <out>/act8-r3-stack.json.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { keyFor } from "../scale1/decision/plan.ts";
import { fact, namesOf, openStore, value, type HeldSource, type Store } from "../actv-lazy/store.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount, joinedCommandIdAt } from "../actv-lazy/join/account.ts";
import { ensureSettings, type Permits } from "../actv-lazy/join/account-settings.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { readFullLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { evaluateRows } from "../actv-lazy/join/material.ts";
import { Settlement } from "../actv-lazy/join/settlement.ts";
import { Documents } from "../notify1/store.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
const ALL: Permits = { accountKeys: true, frameGuards: true, ledgerCap: true };
const large = (n: number, permille = 1000) => largeRelease(W0.R1.doc, parseShape("forms=" + n + ",policies=" + n + ",permille=" + permille));
type Ctx = { out: string; s: Store; descriptor: Pick<HeldSource, "cut" | "seal" | "people">; attempt: string;
  /** For the in-process dry run (stack-r3.test.ts): the account descriptor and a process's store over memstore. */
  heldOf?: (index: number) => HeldSource; open?: (held: HeldSource, permits: Permits) => Promise<Store>;
  settlement?: (a: JoinedAccount) => Promise<Settlement> };
type Proc = { store: Store; a: JoinedAccount };

export async function act8R3Stack(c: Ctx) {
  const results: Record<string, unknown> = { started: new Date().toISOString(), head: await c.s.head() };
  const save = () => writeFileSync(path.join(c.out, "act8-r3-stack.json"), JSON.stringify(results, null, 1));
  const stores: Store[] = [];
  const run = c.attempt.slice(0, 8);
  const heldOf = c.heldOf ?? ((index: number): HeldSource => {
    const account = keyFor(index);
    return {
      account, prefix: "acct/" + account + "/", people: c.descriptor.people, cut: c.descriptor.cut,
      seal: sha256(canonical([c.descriptor.seal, "act8-r3-account", account])), namespace: true,
      verifyThrough: async () => {}, committed: () => {},
    };
  });
  /** One modelled process of an account: its own store, with its own permissions. */
  const proc = async (held: HeldSource, permits: Permits): Promise<Proc> => {
    const store = c.open ? await c.open(held, permits) : await openStore(c.s.scope, "act2-deep", "write", held);
    (store as { permits?: Permits }).permits = permits;
    stores.push(store);
    return { store, a: new JoinedAccount(store) };
  };
  const docs = new Map<string, Map<number, W0.ReleaseDoc>>();
  const publish = async (x: Proc, held: HeldSource, label: string, doc: W0.ReleaseDoc) => {
    const r = await x.a.publish("act8r3-" + run + "-" + label, doc, validTime, "owed", undefined, { docs: "inline" });
    docs.get(held.account)!.set(r.position, doc);
    return r;
  };
  const worker = (a: JoinedAccount) => (c.settlement ? c.settlement(a) : Settlement.open(a, new BulkQueue(1), false, "bytes", "progress"));
  const tail = async (x: Proc) => (await x.a.notices.observe()).value.sequence;
  const settingsAt = async (x: Proc) => (await x.store.controls(await x.store.head())).settings;
  const journal = async (from: number) => {
    const out: any[] = [];
    for (let at = from; ; ) {
      const page = await c.s.comp.feedPage(at, 256);
      if (!page.transactions.length) break;
      out.push(...page.transactions);
      at = page.transactions.at(-1).position;
    }
    return out;
  };
  /** Wraps a settlement store's commit: `hook` runs once, before the first commit whose command ID starts with `prefix`. */
  const before = (store: Store, prefix: string, hook: (id: string) => Promise<void>) => {
    const commit = store.commit;
    let fired = false;
    (store as any).commit = async (...args: Parameters<Store["commit"]>) => {
      if (!fired && String(args[0]).startsWith(prefix)) {
        fired = true;
        await hook(String(args[0]));
      }
      return commit.apply(store, args);
    };
    return () => ((store as any).commit = commit);
  };
  const settle = async (x: Proc, through?: number) => {
    const w = await worker(x.a);
    try {
      const t = through ?? (await tail(x));
      for (let seq = 1; seq <= t; seq++) await w.settle(seq);
    } finally {
      await w.close();
    }
  };
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  process.env.TX2_PUBLISH_BESIDE = "1";
  process.env.TX2_SETTLE_FRAMES = "bytes";
  for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_SETTLE_CONTROL"])
    assert.equal(process.env[k], undefined, k + " is unset: every permission is given per process here");
  try {
    const held = [5, 6, 7].map(heldOf);
    for (const h of held) docs.set(h.account, new Map());
    for (const h of held) await (await proc(h, NONE)).a.installHeld(validTime);
    results.enrolled = held.map((h) => h.account);
    save();

    // ---------------------------------------------------------------------------------------------------------- RO
    {
      const h = held[0]!;
      const none1 = await proc(h, NONE), none2 = await proc(h, NONE), allowed = await proc(h, ALL);
      // 1. This build everywhere, no permission.
      await publish(none1, h, "ro-r1", W0.R1.doc);
      await publish(none1, h, "ro-large", large(20));
      await settle(none2);
      const phase1 = { settings: (await settingsAt(none1)) ?? null, releases: (await none1.store.controls(await none1.store.head())).releases.length };
      assert.equal(phase1.settings, null, "no setting is stored while no process is allowed one");
      // 2. One process allowed every setting; a settler allowed none has a values frame in flight when it publishes.
      const big = await publish(none1, h, "ro-large-2", large(20, 500));
      const seq = await tail(none1);
      const w = await worker(none2.a);
      let transitionAt = 0, plannedId = "";
      const restore = before(w.archive.store, "settled-values:", async (id) => {
        plannedId = id;
        const r = await publish(allowed, h, "ro-r2-allowed", W0.R2.doc);
        transitionAt = (await journal(big.position)).find((t) => t.actor === "lazy/settings")?.position ?? 0;
        results.RO_allowedPublish = { position: r.position, commandId: (await journal(r.position - 1)).find((t) => t.position === r.position)?.commandId };
      });
      try {
        await w.settle(seq);
        await w.settle(seq + 1);
      } finally {
        restore();
        await w.close();
      }
      const after = (await journal(transitionAt)).filter((t) => t.position > transitionAt);
      const plannedBefore = after.filter((t) => /^settled-(values|notice):[0-9a-f]+$/.test(String(t.commandId)));
      // 3. Processes allowed none follow the stored settings.
      const r3 = await publish(none1, h, "ro-r3", large(20));
      await settle(none2);
      const later = (await journal(transitionAt)).filter((t) => t.position > transitionAt);
      results.RO = {
        phase1, transitionAt, settings: await settingsAt(none1), frameInFlight: plannedId.slice(0, 40),
        deterministicFramesAfterTransition: plannedBefore.length,
        frameInFlightLanded: after.some((t) => t.commandId === plannedId),
        r3: { position: r3.position, commandId: later.find((t) => t.position === r3.position)?.commandId },
        framesAfterTransition: later.filter((t) => /^settled-/.test(String(t.commandId))).length,
        framesWithRandomPart: later.filter((t) => /^settled-(values|notice):[0-9a-f]+:[0-9a-f-]{36}$/.test(String(t.commandId))).length,
      };
      save();
      const s = (await settingsAt(none1))!;
      assert(transitionAt > 0 && s.accountKeys && s.frameGuards && s.ledgerCap && s.ledger === "parts" && s.archive);
      assert.equal(plannedBefore.length, 0, "a frame planned before the transition landed after it");
      assert.equal((results.RO as any).frameInFlightLanded, false, "the frame in flight at the transition landed");
      assert.match(String((results.RO as any).r3.commandId), /^joined:v2\//);
      assert.equal((results.RO as any).framesWithRandomPart, (results.RO as any).framesAfterTransition);
    }

    // ---------------------------------------------------------------------------------------------- TP, TF, TN
    {
      const h = held[1]!;
      const none1 = await proc(h, NONE), none2 = await proc(h, NONE);
      await publish(none1, h, "t-r1", W0.R1.doc);
      // TP: a transition (accountKeys) between a Publish's read and its commit.
      const keys = await proc(h, { ...NONE, accountKeys: true });
      const refusedBefore = none1.a.beside.refused;
      const restoreP = before(none1.store, "joined:", async () => {
        await ensureSettings(keys.store);
      });
      let tp;
      try {
        tp = await publish(none1, h, "tp-large", large(20));
      } finally {
        restoreP();
      }
      const tpRecord = (await journal(tp.position - 1)).find((t) => t.position === tp.position);
      results.TP = { position: tp.position, commandId: tpRecord?.commandId, refusedTries: none1.a.beside.refused - refusedBefore,
        expected: await joinedCommandIdAt(none1.store, "act8r3-" + run + "-tp-large", tp.position) };
      save();
      assert.match(String(tpRecord?.commandId), /^joined:v2\//, "planned again under the scoped key");
      // TF: a transition (frameGuards) and a later release between a values frame's read and its commit.
      const guards = await proc(h, { ...NONE, frameGuards: true });
      const seq = await tail(none1);
      const w = await worker(none2.a);
      let laterAt = 0;
      const restoreF = before(w.archive.store, "settled-values:", async () => {
        await ensureSettings(guards.store);
        laterAt = (await publish(none1, h, "tf-later", W0.R2.doc)).position;
      });
      let status;
      try {
        status = (await w.archive.runValues(seq)).status;
      } finally {
        restoreF();
        await w.close();
      }
      const key = new Documents(c.s.comp as never, "settlement-values" + namesOf(none1.store).documents).prefix + "answer:" + seq + ":";
      const pagesAfter = (await journal(laterAt)).filter((t) => t.position > laterAt &&
        t.changes.some((x: any) => String(x.entityId).startsWith(key) && x.op === "assert")).length;
      results.TF = { laterAt, status, valuePagesAfterLater: pagesAfter, settings: await settingsAt(none1) };
      save();
      assert.equal(status, "superseded");
      assert.equal(pagesAfter, 0, "a value page of the superseded release landed after the later release");
      // TN: a transition (ledgerCap) between a notice frame's read and its commit (its settings are already on: the
      // transition adds the cap, and the frame planned before it is refused by the origin guard and the fence).
      const cap = await proc(h, { ...NONE, ledgerCap: true });
      const n = await worker(none2.a);
      let noticeTransitionAt = 0, noticePlanned = "";
      const restoreN = before(n.recorder.archive.store, "settled-notice:", async (id) => {
        noticePlanned = id;
        await ensureSettings(cap.store);
        noticeTransitionAt = await c.s.head();
      });
      try {
        await n.recorder.record(await tail(none1));
      } finally {
        restoreN();
        await n.close();
      }
      const lateNotice = (await journal(noticeTransitionAt)).filter((t) => t.position > noticeTransitionAt &&
        /^settled-notice:[0-9a-f]+(:[0-9a-f-]{36})?$/.test(String(t.commandId)));
      results.TN = { transitionAt: noticeTransitionAt, noticeFramesAfter: lateNotice.length, plannedFrame: noticePlanned.slice(0, 40),
        plannedFrameLanded: lateNotice.some((t) => t.commandId === noticePlanned), settings: await settingsAt(none1) };
      save();
      assert(noticePlanned && !(results.TN as any).plannedFrameLanded, "the notice frame planned before the transition landed");
      assert((results.TN as any).settings?.ledgerCap);
      await settle(none2);
    }

    // ---------------------------------------------------------------------------------------------------------- RS
    {
      const h = held[2]!;
      const none1 = await proc(h, NONE), none2 = await proc(h, NONE), allowed = await proc(h, ALL);
      await publish(none1, h, "rs-r1", W0.R1.doc);
      await publish(allowed, h, "rs-large", large(20)); // turns the settings on
      await settle(none2);
      // What a restore to before the transition leaves of the origin: the fact without its settings.
      const p = await none1.store.head(), origin = (await none1.store.controls(p)).origin;
      assert(origin, "the account's origin row");
      const { settings, ...rest } = value(origin);
      const written = await none1.store.commit("act8r3-" + run + "-restore-origin", "act8/restore", [{ op: "retract", id: origin.id },
        fact(namesOf(none1.store).ORIGIN, "lazy/generation", rest)], p);
      const off = (await settingsAt(none1)) ?? null;
      const plain = await publish(none1, h, "rs-after-restore", large(20, 500));
      await settle(none2);
      const plainId = (await journal(plain.position - 1)).find((t) => t.position === plain.position)?.commandId;
      const again = await publish(allowed, h, "rs-again", W0.R2.doc);
      await settle(none2);
      const cursor = (await new Documents(c.s.comp as never, "settlement-notices" + namesOf(none1.store).documents)
        .row<{ archive?: boolean }>("notice-progress", await c.s.head()))?.value;
      results.RS = { storedBefore: settings, restoredAt: written.position, settingsAfterRestore: off, publishAfterRestore: plainId,
        cursorKeepsArchive: cursor?.archive === true, againAt: again.position, settingsAgain: await settingsAt(none1) };
      save();
      assert.equal(off, null);
      assert.match(String(plainId), /^joined:act8r3-/, "with no settings stored the plain key");
      assert.equal(cursor?.archive, true);
      assert((await settingsAt(none1))?.archive);
    }

    // ---------------------------------------------------------------------------------------------------------- KG
    if (process.env.DX_ACT8_R3_KILL === "1") {
      assert(process.env.DOCKER_HOST?.includes("triplex2") && process.env.DX_ACT10_GROUP === "1" && process.env.DX_ACT8_FIXED_PORTS === "1",
        "KG runs only against the lab VM, with the write gateway's group lane on and fixed host ports");
      const docker = (args: string[]) => new Promise<string>((resolve, reject) =>
        execFile("docker", args, { timeout: 180_000 }, (e, out, err) => (e ? reject(new Error(String(err || e))) : resolve(String(out)))));
      const name = "tx2-ha1-" + c.attempt.slice(0, 8) + "-write";
      const xs = await Promise.all(held.map((h) => proc(h, NONE)));
      const ids = held.map((h) => "act8r3-" + run + "-kg-" + h.account), docsK = held.map((_, i) => large(20, 1000 - 100 * i));
      const releasesBefore = await Promise.all(xs.map(async (x) => (await x.store.controls(await x.store.head())).releases.length));
      const headBefore = await c.s.head();
      const first = xs.map((x, i) => x.a.publish(ids[i]!, docsK[i]!, validTime, "owed", undefined, { docs: "inline" })
        .then((r) => ({ ok: true as const, position: r.position }), (e) => ({ ok: false as const, error: String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 160) })));
      await sleep(20);
      const killedAt = Date.now();
      await docker(["kill", name]);
      await docker(["start", name]);
      for (let k = 0; ; k++) {
        try { await c.s.head(); await c.s.lookup("act8-r3-probe"); break; } catch (e) { if (k > 120) throw e; await sleep(1000); }
      }
      const backMs = Date.now() - killedAt;
      const outcomes = await Promise.all(first);
      // Each command offered again until it is acknowledged (a lost reply, a refused try or a gateway still coming back).
      const receipts: number[] = [], failures: string[][] = [];
      for (const [i, x] of xs.entries()) {
        const f: string[] = [];
        for (let k = 0; ; k++) {
          try {
            const r = await x.a.publish(ids[i]!, docsK[i]!, validTime, "owed", undefined, { docs: "inline" });
            receipts.push(r.position);
            docs.get(held[i]!.account)!.set(r.position, docsK[i]!);
            break;
          } catch (e: any) {
            f.push(String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 120));
            if (k >= 60) throw new Error("never acknowledged after the kill: " + f.join(" | "));
            await sleep(2000);
          }
        }
        failures.push(f);
      }
      const after = (await journal(headBefore)).filter((t) => t.position > headBefore && t.actor === "lazy/join");
      const records = ids.map((id) => after.filter((t) => String(t.commandId) === "joined:" + id || String(t.commandId).endsWith("/" + id)));
      const releasesAfter = await Promise.all(xs.map(async (x) => (await x.store.controls(await x.store.head())).releases.length));
      results.KG = { killedAfterMs: 20, gatewayBackMs: backMs, firstOutcomes: outcomes, failures, receipts,
        records: records.map((r) => r.map((t) => [t.position, String(t.commandId).slice(0, 60)])), releasesBefore, releasesAfter };
      save();
      for (const [i, r] of records.entries()) {
        assert.equal(r.length, 1, "one record for " + ids[i]);
        assert.equal(r[0].position, receipts[i], "the receipt is the record for " + ids[i]);
        assert.equal(releasesAfter[i], releasesBefore[i]! + 1);
      }
      for (const x of xs) await settle(x);
    }

    // ------------------------------------------------------------------------------------------- the oracle check
    const checks: Record<string, unknown> = {};
    for (const h of held) {
      const x = await proc(h, NONE);
      const head = await x.store.head();
      const roster = Array.from({ length: h.people }, (_, i) => W0.placementId(i));
      const byAt = docs.get(h.account)!;
      const t = await tail(x);
      const state = new Map<string, W0.ItemState[]>();
      const want: unknown[] = [];
      for (let k = 1; k <= t; k++) {
        const e = await x.a.notices.event(k, head);
        const doc = byAt.get(e.at);
        assert(doc, "the document of the release at " + e.at);
        const policy = W0.compileRelease(doc);
        for (const world of await worldsAt(x.store, "act2-deep", roster, { tx: e.at, validTime: e.value.validTime })) {
          const out = W0.evaluateWorld(world, policy, { tx: e.at, validTime: e.value.validTime });
          assert(!("error" in out));
          const res = W0.publish({ items: state.get(world.subject) ?? [], subjects: [], pending: [] }, [
            { subject: world.subject, release: e.value.nextHash, basis: { tx: BigInt(e.at), validTime: e.value.validTime }, workItems: (out as any).workItems },
          ]);
          state.set(world.subject, res.state.items as W0.ItemState[]);
          want.push(...res.deliveries.map(toWire));
        }
      }
      const w = await worker(x.a);
      try {
        const got = (await w.recorder.packets(head)).flatMap((p) => p.deliveries.map(toWire));
        assert.equal(canonical(got), canonical(want), h.account + ": notices differ from the fold");
        const full = await readFullLedgers(w.recorder.archive.db, roster, head, (s) => (state.get(s) ?? []).map((i) => i.id));
        for (const s of roster) assert.equal(canonical(full.get(s)!.items), canonical(state.get(s) ?? []), h.account + ": ledger of " + s);
        // Values: every owed release after the first, stored or superseded, against the world at q - 1.
        const rels = ((await x.store.controls(head)).releases as any[]).filter((r) => r.storage === "owed").sort((l, r) => l.tx - r.tx);
        let stored = 0, superseded = 0;
        for (const [k, rel] of rels.entries()) {
          if (k === 0) continue;
          const doc = byAt.get(rel.tx)!, old = byAt.get(rels[k - 1].tx)!;
          const worlds = await worldsAt(x.store, "act2-deep", roster, { tx: rel.tx - 1, validTime });
          const expect = evaluateRows({ worlds, basis: { tx: rel.tx, validTime } }, W0.compileRelease(old), W0.compileRelease(doc), false)
            .rows.filter((r) => r.rows.length).map((r) => ({ subject: r.subject, changes: r.rows.map(([key, , v]) => [key, v]) }));
          const st = await w.archive.stored(rel.seq);
          const gotValues = st.output.map((o: any) => ({ subject: o.subject, changes: o.changes }));
          if (st.frontier.status === "stored") {
            stored++;
            assert.equal(canonical(gotValues), canonical(expect), h.account + ": values of release " + rel.seq);
          } else {
            assert.equal(st.frontier.status, "superseded", h.account + ": release " + rel.seq + " " + st.frontier.status);
            superseded++;
          }
        }
        checks[h.account] = { notices: got.length, subjects: roster.length, archived: [...full.values()].reduce((n, l) => n + l.archived, 0),
          valuesStored: stored, valuesSuperseded: superseded, releases: rels.length };
      } finally {
        await w.close();
      }
    }
    results.oracle = checks;
    results.pass = true;
  } catch (e: any) {
    results.error = String(e?.stack ?? e).slice(0, 2000);
    throw e;
  } finally {
    results.finished = new Date().toISOString();
    save();
    for (const s of stores) await s.close().catch(() => {});
    console.log("[act8-r3-stack] " + JSON.stringify(results).slice(0, 3000));
  }
}
