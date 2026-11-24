import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openComposition } from "../../../bench/lib/composition.ts";
import { windowed } from "../../../bench/lib/load-window.ts";
import { frames } from "./source.ts";
import { Snapshot } from "./snapshot.ts";
import { installSnapshotImportClass } from "./import-class.ts";

export const sharedMono = () => Number(process.hrtime.bigint() / 1000n) / 1000;

async function run() {
  // [DX-IMP2] With the whole-subject import bound on, this importer's frames are import-class commits.
  installSnapshotImportClass();
  const [scope, dir, arm, subjectsArg, widthArg] = process.argv.slice(2);
  assert(scope && dir && arm && process.send);
  const subjects = Number(subjectsArg),
    width = Number(widthArg);
  const {
    TRIPLEX_TRACE_RUN: nonce,
    TRIPLEX_TRACE_SOURCE: source,
    TRIPLEX_TRACE_SLOT: slot,
  } = process.env;
  assert(nonce && source && slot);
  const comp = await openComposition("reach", "datomic", scope);
  try {
    assert.equal(await comp.currentPosition(), 0);
    const loader = await Snapshot.open(
      comp,
      "thin",
      subjects,
      width,
      path.join(dir, arm + "-split.sqlite"),
    );
    try {
      const disconnect = new AbortController();
      process.once("disconnect", () => disconnect.abort());
      const release = new Promise<{ start: number; duration: number }>((ok, fail) => {
        process.once("message", (message) => {
          const timing = message as { start: number; duration: number; nonce: string };
          try {
            assert.equal(timing.nonce, nonce);
            assert(Number.isFinite(timing.start) && timing.duration === 108000);
            assert(sharedMono() >= timing.start && sharedMono() < timing.start + timing.duration);
            ok(timing);
          } catch (error) {
            fail(error);
          }
        });
        process.once("disconnect", () => fail(Error("Live client disconnected before release")));
      });
      process.send({ type: "ready", nonce, source, slot, scope });
      const { start, duration } = await release;
      const end = start + duration;
      const issued = [];
      let inFlight = 0,
        peak = 0,
        facts = 0,
        failure: unknown;
      // [DX-LOAD2] Why: the isolated importer has its own event loop and two bounded receipt promises.
      // Rejected: charging the live client for the importer's synchronous row encoding or SQLite sync.
      try {
        function* window() {
          for (const f of frames("thin", subjects, width)) {
            if (disconnect.signal.aborted || sharedMono() >= end) break;
            yield f;
          }
        }
        await windowed(window(), 2, async (f) => {
          const offered = sharedMono();
          if (offered >= end) return;
          peak = Math.max(peak, ++inFlight);
          try {
            const entry = await loader.write(f);
            const settled = sharedMono();
            if (settled <= end) facts += entry.facts;
            issued.push({
              first: f.first,
              end: f.end,
              position: entry.position,
              command: entry.command,
              digest: entry.digest,
              facts: entry.facts,
              offered: offered - start,
              settled: settled - start,
            });
          } finally {
            inFlight--;
          }
        });
      } catch (error) {
        failure = error;
      }
      assert.equal(inFlight, 0);
      const timings = {
        nonce,
        source,
        slot,
        scope,
        arm,
        start,
        duration,
        width,
        peak,
        facts,
        issued,
      };
      fs.writeFileSync(path.join(dir, arm + "-split.offers.json"), JSON.stringify(timings), {
        flag: "wx",
      });
      if (failure) throw failure;
      assert(!disconnect.signal.aborted);
      assert(facts > 0 && peak === 2);
      const proof = await loader.verify(false, undefined, {
        pageSize: width <= 128 ? 16 : 2,
        readDepth: 4,
      });
      assert.equal(
        proof.facts,
        issued.reduce((n, r) => n + r.facts, 0),
      );
      assert.equal(proof.observed, issued.length);
      assert.equal(proof.cut, proof.observed + 1);
      process.send({
        type: "done",
        nonce,
        source,
        slot,
        scope,
        start,
        duration,
        width,
        peak,
        facts,
        proof,
        sourceSeal: loader.source,
      });
    } finally {
      loader.close();
    }
  } finally {
    await comp.close();
  }
  process.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
