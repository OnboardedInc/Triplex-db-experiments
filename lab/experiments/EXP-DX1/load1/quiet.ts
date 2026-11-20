import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { Snapshot } from "./snapshot.ts";
import { frames, identity, sourceId } from "./source.ts";
import { lookup } from "./oracle.ts";
export async function quiet(
  comp: CompositionHandle,
  scope: string,
  subjects: number,
  dir: string,
  arm: string,
) {
  const [, , widthText, depthText] = arm.split("-");
  const width = Number(widthText),
    depth = Number(depthText);
  const file = path.join(dir, arm + ".sqlite"),
    start = performance.now();
  let run = await Snapshot.open(comp, "deep", subjects, width, file);
  try {
    const ready = performance.now();
    const cpu = process.cpuUsage();
    if (arm.startsWith("proof-")) {
      const list = frames("deep", subjects, width),
        f = list.next().value,
        g = list.next().value;
      assert(f && g && f.first === 0);
      await run.write(g);
      assert.equal(run.cursor(), 0);
      let withheld = false;
      await assert.rejects(
        run.write(f, {
          beforeCheckpoint() {
            withheld = true;
            throw Error("Withheld durable checkpoint");
          },
        }),
        /Withheld durable checkpoint/,
      );
      assert(withheld);
      assert.equal(run.cursor(), 0);
      const meta = identity(scope, run.source, width, f),
        original = await lookup(comp, f, meta);
      assert(original);
      run.close();
      run = await Snapshot.open(comp, "deep", subjects, width, file);
      assert.equal(run.cursor(), 0);
      const resumed = await run.write(f);
      assert.deepEqual(
        [resumed.txId, resumed.position, resumed.instant, resumed.ids],
        [original.txId, original.position, original.instant, original.ids],
      );
      assert.equal(run.cursor(), g.end);
      await assert.rejects(Snapshot.open(comp, "deep", subjects + 1, width, file));
    }
    await run.drain(depth);
    const end = performance.now(),
      used = process.cpuUsage(cpu),
      totals = run.totals();
    const proof = await run.verify(),
      verified = performance.now();
    assert.equal(await comp.currentPosition(), totals.commands + 1);
    return {
      scope,
      sourceSeal: sourceId("deep", subjects),
      subjects,
      width,
      depth,
      ...totals,
      elapsedMs: end - start,
      ingestMs: end - ready,
      verifyMs: verified - end,
      cpu: used,
      proof,
      bytes: fs.statSync(file).size,
    };
  } finally {
    run.close();
  }
}
