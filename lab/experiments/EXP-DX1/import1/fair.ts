import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openComposition, type Basis } from "../../../bench/lib/composition.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { openNative } from "./native.ts";
import { ImportLane, ImportRun, pace } from "./lane.ts";
import { snapshot, bytes } from "./source.ts";
import { verifySnapshot } from "./verify.ts";
const root = process.argv[2]!,
  id = randomUUID();
mkdirSync(root);
const lane = new ImportLane(0.75),
  p = pace(32, 0.75),
  traces: any[] = [];
const sessions = await Promise.all(
  ["left", "right"].map(async (label) => {
    const name = "import-live-" + id + "-" + label,
      t = await openNative(name, "snapshot"),
      reader = await openComposition("reach-touched", "datomic", name);
    const source = snapshot("thin", 48, "joint/", id + label),
      r = await ImportRun.open(t, source, p, join(root, label + ".sqlite"), lane);
    const before = await t.currentPosition(),
      entity = "joint/" + ids.placement(0);
    const pull = (cut: number) =>
      reader.pull(entity, { recordedPosition: cut, validAt: SEED_VALID_FROM } as Basis);
    assert.equal((await pull(before)).triples.length, 0);
    return { name, t, reader, r, source, before, pull, entity, label };
  }),
);
try {
  await Promise.all(
    sessions.map(async (s) => {
      while (true) {
        const start = performance.now(),
          e = await s.r.step();
        if (!e) break;
        traces.push({
          label: s.label,
          first: e.first,
          end: e.end,
          at: performance.now(),
          ms: performance.now() - start,
          txId: e.txId,
        });
        if (!e.first) {
          const a = await s.pull(e.position);
          assert.deepEqual(
            a.triples.map((v) => [v.attribute, v.value.value]).sort(),
            Array.from({ length: 6 }, (_, i) => [":thin/f" + i, String(i)]),
          );
          assert.equal((await s.pull(s.before)).triples.length, 0);
        }
      }
      await verifySnapshot(s.r);
    }),
  );
  for (const s of sessions) {
    const ack = await lane.live(() =>
      s.t.write(
        [
          {
            op: "assert",
            entityId: s.entity,
            attribute: ":live",
            value: { type: "string", value: s.label },
            validFrom: 0,
          },
        ],
        { commandId: id + s.label },
      ),
    );
    const a = await s.pull(ack.position);
    assert.equal(a.triples.filter((r) => r.attribute === ":live")[0]!.value.value, s.label);
    assert.equal(a.triples.length, 7);
  }
  assert(sessions.every((s) => traces.filter((v) => v.label === s.label).at(-1).end === 48));
  writeFileSync(
    join(root, "fair.json"),
    bytes({ id, scopes: sessions.map((s) => s.name), traces }),
    { flag: "wx" },
  );
} finally {
  for (const s of sessions) {
    s.r.close();
    await s.reader.close();
    await s.t.close();
  }
}
