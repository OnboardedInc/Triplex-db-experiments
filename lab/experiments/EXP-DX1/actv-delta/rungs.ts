import { screen } from "./screen.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { Receiver, drain } from "./dispatch.ts";
import { seedFacts, epoch, type Edit } from "./model.ts";
import { save } from "./save.ts";
import { emptyAudit, query, event, measure } from "./bench-rung.ts";
export async function run(parent: string, attempt: any) {
  for (const n of [1000, 10000]) {
    const dir = path.join(parent, "rung-" + n);
    fs.mkdirSync(dir);
    const scope = attempt.scope + "-rung" + n,
      comp = await openComposition("reach", "datomic", scope),
      rc = await openComposition("reach", "datomic", scope),
      sc = await openComposition("reach", "datomic", scope + "-sink"),
      bind = hash([attempt.nonce, n, attempt.sources]),
      keys = path.join(dir, "fixture-keys"),
      a = new Account(new Objects(comp, "target"), bind, keys),
      reader = new Account(new Objects(rc, "target"), bind, keys),
      sink = new Receiver(new Objects(sc, "target")),
      oracle = emptyAudit();
    try {
      const rung = W0.rung(n),
        worlds: W0.World[] = [],
        census = Array.from({ length: n }, (_, i) => W0.placementId(i)),
        h = createHash("sha256").update("[");
      let facts = 0,
        tx = rung.L + rung.K;
      const expected = query(oracle, "population", { n });
      for (const p of W0.population(rung)) {
        if (worlds.length) h.update(",");
        h.update(p.json);
        tx += p.commands;
        facts += p.world.facts.length;
        worlds.push({
          subject: p.world.subject,
          facts: seedFacts(p.world, { tx, validTime: W0.POPULATION_VALID_TIME }),
        });
      }
      const basis = { tx, validTime: W0.POPULATION_VALID_TIME },
        fingerprint = {
          people: n,
          facts,
          worlds: "sha256:" + h.update("]").digest("hex"),
          tx,
          census: hash(census),
        };
      assert.deepEqual(await expected, fingerprint);
      const seed = await a.bootstrap(census, worlds, basis);
      await event(oracle, { seq: 0, basis, doc: W0.R1.doc });
      const boot = await drain(a, sink, 0);
      fs.writeFileSync(
        path.join(dir, "seed.json"),
        JSON.stringify({ bind, fingerprint, seed, initialDeliveries: boot.applied }) + "\n",
        { flag: "wx" },
      );
      const ctx = { account: a, reader, sink, census, oracle, dir, nonce: attempt.nonce, basis },
        offers: Awaited<ReturnType<typeof measure>>[] = [];
      let seq = 0,
        i = 0;
      const record = async (rel: W0.CompiledRelease, label: string, live = false) => {
        const report = await measure(ctx, rel, i++, seq, {
          label,
          ...(live
            ? {
                live: async () => {
                  const s = census[n - 1]!,
                    edits: Edit[] = [{ e: s, a: "weeklyMinutes", values: [2500], from: epoch }],
                    res = await save(a, "overlap" + i, edits);
                  const e = (await a.db.get<any>("event:" + res.seq, res.position)).value;
                  assert.equal(res.seq, seq + 1);
                  await event(oracle, {
                    seq: res.seq,
                    basis: e.basis,
                    doc: e.next,
                    subject: s,
                    edits,
                  });
                },
              }
            : {}),
        });
        seq = report.seq;
        offers.push(report);
        return report;
      };
      await record(W0.R2, "broad");
      await record(W0.R3, "narrow");
      const translated = W0.compileRelease({
        ...W0.R2.doc,
        rules: W0.R2.doc.rules.map((e) =>
          e.id === "OT"
            ? { ...e, scope: { jurisdictions: ["jur:j002"], params: { thresholdMinutes: 2700 } } }
            : e,
        ),
      } as W0.ReleaseDoc);
      await record(translated, "translated-scope", true);
      await screen(comp, reader, sink, a, oracle, dir, census, seq);
      fs.writeFileSync(
        path.join(dir, "result.json"),
        JSON.stringify({ nonce: attempt.nonce, n, offers }) + "\n",
        { flag: "wx" },
      );
    } finally {
      oracle.close();
      await Promise.all([comp.close(), rc.close(), sc.close()]);
    }
  }
}
