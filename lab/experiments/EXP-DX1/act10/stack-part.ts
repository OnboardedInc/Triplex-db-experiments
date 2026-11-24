// [DX-ACT10] The review's stack checks (diagnostic toy only), run by the held runner under DX_ACT10_STACK=1 on the held
// toy stack (engine.mjs ha1 --experiment load-fair --diagnostic --holder DX-ACT10, DX_DATOMIC_IMAGE_RECEIPT set). Every
// call goes through the real gateways and transactor. It enrols namespaced accounts 1 to 4 of the held database and:
//   X1  two accounts publish with the same command ID and document: is the second acknowledged with the first's receipt?
//   X2  the same command ID, another document: refused?
//   X3  an account's first Publish by reference of a document another account published by reference: refused?
//   X4  by reference, two accounts that share their predecessor document: is the second refused whatever it publishes?
//   P1  a pause that lands between a values frame's read and its commit, under head and under progress
//   S2  a Publish of the same account that lands between its release's last values frame's read and its commit
// Results go to <out>/act10-stack.json; nothing here asserts, so every case records its outcome.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { keyFor } from "../v01/adopt.ts";
import { openStore, type HeldSource, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { Settlement } from "../actv-lazy/join/settlement.ts";
import { setSettlementControl } from "../actv-lazy/join/settlement-control.ts";

const validTime = W0.POPULATION_VALID_TIME;
const large = (permille: number) => largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=" + permille));
type Ctx = { out: string; s: Store; descriptor: Pick<HeldSource, "cut" | "seal" | "people">; attempt: string };

export async function act10Stack(c: Ctx) {
  const results: Record<string, unknown> = { started: new Date().toISOString(), head: await c.s.head() };
  const save = () => writeFileSync(path.join(c.out, "act10-stack.json"), JSON.stringify(results, null, 1));
  const stores: Store[] = [];
  const run = c.attempt.slice(0, 8);
  const enrol = async (index: number) => {
    const account = keyFor(index);
    const store = await openStore(c.s.scope, "act2-deep", "write", {
      account, prefix: "acct/" + account + "/", people: c.descriptor.people, cut: c.descriptor.cut,
      seal: sha256(canonical([c.descriptor.seal, "act10-account", account])), namespace: true,
      verifyThrough: async () => {}, committed: () => {},
    });
    stores.push(store);
    const a = new JoinedAccount(store);
    await a.installHeld(validTime);
    return { account, store, a };
  };
  const outcome = async (f: () => Promise<{ position: number; txId: string }>) =>
    f().then((r) => ({ ok: true, position: r.position, txId: r.txId }), (e) => ({ ok: false, error: String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 200) }));
  const releases = async (x: { store: Store }) => (await x.store.controls(await x.store.head())).releases.length;
  const tail = async (x: { a: JoinedAccount }) => (await x.a.notices.observe()).value.sequence;
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  process.env.TX2_PUBLISH_BESIDE = "1";
  try {
    const [A1, A2, A3, A4] = [await enrol(1), await enrol(2), await enrol(3), await enrol(4)];
    results.enrolled = [A1!.account, A2!.account, A3!.account, A4!.account];
    // X1: the same command ID and document in two accounts.
    const id = "act10-" + run + "-release-1";
    const x1a = await outcome(() => A1!.a.publish(id, W0.R1.doc, validTime, "owed", undefined, { docs: "inline" }));
    const x1b = await outcome(() => A2!.a.publish(id, W0.R1.doc, validTime, "owed", undefined, { docs: "inline" }));
    results.X1 = { first: x1a, second: x1b, secondHasFirstsReceipt: x1a.ok && x1b.ok && (x1a as any).txId === (x1b as any).txId,
      firstReleases: await releases(A1!), secondReleases: await releases(A2!), firstTail: await tail(A1!), secondTail: await tail(A2!) };
    save();
    // X2: the same command ID, another document.
    results.X2 = { second: await outcome(() => A2!.a.publish(id, W0.R2.doc, validTime, "owed", undefined, { docs: "inline" })),
      secondReleases: await releases(A2!) };
    save();
    // X4: A2's first release is R1 with full documents; A1 (whose R1 came from X1) publishes by reference (it stores
    // R1 by reference too); then A2 publishes a different document by reference.
    const a2r1 = await outcome(() => A2!.a.publish("act10-" + run + "-a2-R1", W0.R1.doc, validTime, "owed", undefined, { docs: "inline" }));
    const a1ref = await outcome(() => A1!.a.publish("act10-" + run + "-a1-large", large(1000), validTime, "owed", undefined, { docs: "ref" }));
    const a2ref = await outcome(() => A2!.a.publish("act10-" + run + "-a2-large", large(500), validTime, "owed", undefined, { docs: "ref" }));
    const a2inline = await outcome(() => A2!.a.publish("act10-" + run + "-a2-large-inline", large(500), validTime, "owed", undefined, { docs: "inline" }));
    results.X4 = { a2R1: a2r1, a1ByReference: a1ref, a2ByReference: a2ref, a2WithFullDocuments: a2inline, a2Releases: await releases(A2!) };
    save();
    // X3: A3's first Publish, by reference, of the document A1 published by reference.
    results.X3 = { a3ByReference: await outcome(() => A3!.a.publish("act10-" + run + "-a3-large", large(1000), validTime, "owed", undefined, { docs: "ref" })),
      a3Releases: await releases(A3!) };
    save();
    // P1 and S2 on account 4, under each precondition, with full documents.
    process.env.TX2_SETTLE_FRAMES = "bytes";
    let k = 0;
    const r1 = await A4!.a.publish("act10-" + run + "-a4-R1", W0.R1.doc, validTime, "owed", undefined, { docs: "inline" });
    void r1;
    for (const precondition of ["head", "progress"] as const) {
      // P1: settle a large release; the pause lands inside the first values frame's commit, after its read.
      process.env.TX2_SETTLE_CONTROL = "1";
      const doc = large(1000 - 100 * k++);
      const pr = await A4!.a.publish("act10-" + run + "-a4-p1-" + precondition, doc, validTime, "owed", undefined, { docs: "inline" });
      const seq = (await A4!.a.notices.observe()).value.sequence;
      const w = await Settlement.open(A4!.a, new BulkQueue(1), false, "bytes", precondition);
      let pause: number | undefined;
      const commit = w.archive.store.commit;
      (w.archive.store as any).commit = async (...args: Parameters<Store["commit"]>) => {
        if (pause === undefined && String(args[0]).startsWith("settled-values:"))
          {
          pause = (await setSettlementControl(A4!.store, { paused: true, by: "act10" })).position;
          // Every later gate reads the control afresh: only the frame already past the gate is in question here.
          (w.archive.control as any).seen = undefined;
          (w.recorder.archive.control as any).seen = undefined;
        }
        return commit(...args);
      };
      const values = w.archive.runValues(seq).then(() => "done", (e) => "failed: " + String(e?.message).slice(0, 120));
      await new Promise((x) => setTimeout(x, 3000));
      const feed = await A4!.store.comp.feedPage(pause!, 200);
      const after = feed.transactions.filter((t: any) => String(t.commandId).startsWith("settled-values:"));
      (w.archive.store as any).commit = commit;
      await setSettlementControl(A4!.store, { paused: false, by: "act10" });
      const valuesOutcome = await values;
      await w.close();
      results["P1-" + precondition] = { release: pr.position, pause, valueFramesAfterPause: after.length, positions: after.map((t: any) => t.position), valuesOutcome };
      save();
      // S2: settle a release; a Publish of the same account lands between its last values frame's read and commit.
      delete process.env.TX2_SETTLE_CONTROL;
      const d1 = large(1000 - 100 * k++);
      const s1 = await A4!.a.publish("act10-" + run + "-a4-s2-" + precondition, d1, validTime, "owed", undefined, { docs: "inline" });
      const seq1 = (await A4!.a.notices.observe()).value.sequence;
      const w2 = await Settlement.open(A4!.a, new BulkQueue(1), false, "bytes", precondition);
      let later: number | undefined;
      const commit2 = w2.archive.store.commit;
      (w2.archive.store as any).commit = async (...args: Parameters<Store["commit"]>) => {
        const next = args[4] as { status?: string } | null;
        if (later === undefined && String(args[0]).startsWith("settled-values:") && next?.status === "stored")
          later = (await A4!.a.publish("act10-" + run + "-a4-s2-later-" + precondition, W0.R2.doc, validTime, "owed", undefined, { docs: "inline" })).position;
        return commit2(...args);
      };
      const st = await w2.archive.runValues(seq1).then((p) => p, (e) => ({ failed: String(e?.message).slice(0, 120) }));
      (w2.archive.store as any).commit = commit2;
      const row = await w2.archive.values(seq1);
      await w2.close();
      results["S2-" + precondition] = { release: s1.position, laterRelease: later, finalStatus: (st as any).status ?? st, progressRowAt: row?.at,
        storedAfterLater: (st as any).status === "stored" && later !== undefined && (row?.at ?? 0) > later };
      save();
    }
  } catch (e: any) {
    results.error = String(e?.stack ?? e).slice(0, 1500);
  } finally {
    results.finished = new Date().toISOString();
    save();
    for (const s of stores) await s.close().catch(() => {});
  }
  console.log("[act10-stack] " + JSON.stringify(results).slice(0, 3000));
}
