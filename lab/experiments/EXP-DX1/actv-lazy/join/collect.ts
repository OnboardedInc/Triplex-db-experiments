import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DomainOracle } from "../../../../bench/lib/w0-gates.ts";
import { canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { verifyTimings } from "./observations.ts";

export const format = "joined-components/2";
export const cells = [
  ["owed", 0],
  ["staged", 0],
  ["owed", 3.5],
  ["staged", 3.5],
  ["owed", 23.5],
  ["staged", 23.5],
] as const;

export async function collect(
  root: string,
  expected: { source: string; owner: string; n: number },
) {
  const get = (file: string) => JSON.parse(readFileSync(join(root, file + ".json"), "utf8"));
  const digest = (file: string) => sha256(readFileSync(join(root, file + ".json")));
  const inputs = get("server-inputs"),
    seal = get("server-observations");
  assert(inputs.format === format && seal.format === format);
  assert.equal(seal.inputs, digest("server-inputs"));
  for (const [key, value] of Object.entries(expected))
    assert(inputs[key] === value && seal[key] === value);
  assert.equal(inputs.nonce, seal.nonce);
  assert.equal(seal.scope, "lazy-join-server-" + inputs.nonce);
  const files = readdirSync(root),
    names = Object.keys(seal.outputs);
  const outputTypes = ["offer", "terminal", "window", "proof", "deadline", "point-inputs"];
  const expectedNames = [
    "server-effects",
    "server-effect-bytes",
    "server-seed",
    ...cells.flatMap((_, i) => outputTypes.map((name) => name + "-" + i)),
  ];
  if (!inputs.smoke) expectedNames.push("preflight/stage-gate", "preflight/idle-deadline");
  assert.deepEqual(names.toSorted(), expectedNames.toSorted());
  for (const name of names) assert.equal(digest(name), seal.outputs[name], name);
  assert.deepEqual(
    files.filter((f) => /^(offer|terminal)-\d+\.json$/.test(f)).sort(),
    cells.flatMap((_, i) => ["offer-" + i + ".json", "terminal-" + i + ".json"]).sort(),
  );
  const effects = get("server-effects"),
    payloads = get("server-effect-bytes");
  assert.equal(payloads.length, effects.effects);
  assert.equal(sha256(canonical(payloads)), effects.hash);
  const seed = get("server-seed");
  assert(
    seed.roster === seal.roster &&
      seed.nonce === inputs.nonce &&
      seed.n === expected.n &&
      seed.facts > seed.n,
  );
  const oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  try {
    const windows = [];
    for (const [i, [mode, rate]] of cells.entries()) {
      const o = get("offer-" + i),
        t = get("terminal-" + i),
        w = get("window-" + i),
        p = get("proof-" + i);
      const points = get("point-inputs-" + i),
        d = get("deadline-" + i);
      assert.deepEqual([o.index, o.mode, o.rate, o.nonce], [i, mode, rate, inputs.nonce]);
      assert.deepEqual(
        [w.index, w.mode, w.rate, w.offered, w.ingress, w.doc],
        [i, mode, rate, o.offered, o.ingress, o.document],
      );
      assert.deepEqual(
        [t.index, t.nonce, t.offerSha, t.status, t.nativeTx, t.cut, t.deadlineMiss],
        [
          i,
          inputs.nonce,
          digest("offer-" + i),
          "observed",
          w.nativeTx,
          w.deadline.basis.tx,
          w.deadlineMiss,
        ],
      );
      assert(d.nonce === inputs.nonce && d.offerSha === t.offerSha);
      const { onRelease, scheduleLagMs, ...deadline } = w.deadline;
      assert.deepEqual(d.observed, deadline);
      assert(
        onRelease === w.deadline.basis.tx >= w.nativeCut &&
          scheduleLagMs === w.deadline.started - o.cutoff,
      );
      verifyTimings(o, w);
      assert.deepEqual(
        [p.release, p.tx, p.cut, p.count, p.nonce],
        [w.release, w.nativeTx, w.nativeCut, expected.n, inputs.nonce],
      );
      assert(
        w.roster === seal.roster &&
          p.changedOwners === expected.n &&
          p.changedRoster === seal.roster &&
          p.changes > 0,
      );
      assert(p.stored === (mode === "staged" ? expected.n : 0));
      const samples = [w.first, w.deadline, ...w.coldDeadline.reads];
      assert(points.nonce === inputs.nonce && points.samples.length === samples.length);
      for (const [j, sample] of samples.entries()) {
        const world = points.samples[j];
        assert(world.subject === sample.subject);
        const [result] = JSON.parse(
          await oracle.call("check", {
            document: sample.basis.tx >= w.nativeCut ? o.document : points.baseline,
            old: null,
            basis: sample.basis,
            worlds: [world],
            fold: false,
          }),
        );
        assert.equal(sample.json, result.json, "Incorrect independently replayed response");
      }
      windows.push({ index: i, mode, rate, deadlineMiss: w.deadlineMiss });
    }
    assert.deepEqual(seal.windows, windows);
    return {
      source: expected.source,
      owner: expected.owner,
      n: expected.n,
      nonce: seal.nonce,
      windows,
    };
  } finally {
    oracle.close();
  }
}
