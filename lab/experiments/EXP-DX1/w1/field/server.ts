import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { withStack } from "../bench.ts";
import { sourceInventory } from "../../scale1/source.ts";
import { fileHash } from "../../scale1/measurements.ts";
import { runArm, seedPooled } from "../group/workload.ts";
import { pooledDigest } from "../group/population.ts";
import { verifyPopulation } from "../group/seed-readback.ts";
import { fieldPhase, scopeKey } from "./traffic.ts";
import {
  modes,
  fieldPolicy,
  fieldPlan,
  validateArm,
  validateComparison,
  type Study,
  type Mode,
} from "./bench-check.ts";
const repo = path.resolve(import.meta.dirname, "../../../../..");
const [, , action, dir, source, batch, requested, profile] = process.argv;
const predictionPath = (enhanced: boolean) =>
  path.join(import.meta.dirname, enhanced ? "../small/predictions.json" : "predictions.json");
const write = (name: string, data: unknown) =>
  fs.writeFileSync(name, JSON.stringify(data) + "\n", { flag: "wx" });
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
async function fieldArm(
  url: string,
  seedUrl: string,
  nonce: string,
  directory: string,
  enhanced: boolean,
) {
  const seed = new DatomicClient(seedUrl, 35000),
    c = new DatomicClient(url, 35000),
    scope = scopeKey(nonce + "-load");
  try {
    const init = await seed.create(scope, "lean", true, 35000);
    assert(init.created && init.strictRecordClocks);
    const { head: seedHead, seeds } = await seedPooled(seed, init.db);
    const open = await c.create(scope, "lean", true, 35000);
    assert(!open.created && open.db === init.db);
    const phases = [],
      senders = new Map<string, number>();
    let head = seedHead;
    for (const window of fieldPlan(enhanced)) {
      const p = await fieldPhase(
        c,
        init.db,
        head,
        nonce,
        window.label,
        window.schedule,
        true,
        senders,
      );
      write(path.join(directory, window.label + ".json"), p);
      assert.deepEqual(p.failures, []);
      head += p.offered;
      phases.push(p);
    }
    return { nonce, scope, db: init.db, seeds, phases };
  } finally {
    c.close();
    seed.close();
  }
}
if (action === "worker") {
  assert(dir);
  const req = read(path.join(dir, "request.json")),
    url = process.env.DATOMIC_URL!,
    bootstrapUrl = process.env.DATOMIC_READ_URLS!;
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, req.arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, req.arm.slot);
  assert.equal(await fileHash(predictionPath(req.enhanced)), req.predictionSha256);
  assert(req.study === "pulse" || req.study === "rates");
  assert(typeof req.enhanced === "boolean" && modes(req.study, req.enhanced).includes(req.mode));
  const policy = fieldPolicy(req.mode, req.enhanced);
  if (req.enhanced) assert.deepEqual(read(path.join(dir, "field-options.json")), policy);
  assert(url && bootstrapUrl && url !== bootstrapUrl);
  const r =
    req.study === "pulse"
      ? await runArm(url, req.arm.nonce, policy.grouping, true, {
          pulse: true,
          smallPulse: req.enhanced,
          bootstrapUrl,
        })
      : await fieldArm(url, bootstrapUrl, req.arm.nonce, dir, req.enhanced);
  write(path.join(dir, "raw.json"), r);
  const seedHead =
    "headBefore" in r.phases[0]! ? r.phases[0]!.headBefore : r.phases[0]!.firstPosition - 1;
  write(
    path.join(dir, "seed-readback.json"),
    await verifyPopulation(url, {
      scope: r.scope,
      db: r.db,
      phases: [{ firstPosition: seedHead + 1 }],
    }),
  );
} else if (action === "run") {
  assert(
    dir &&
      source &&
      batch &&
      /^[a-z][a-z0-9]{2,14}$/.test(batch) &&
      (requested === "pulse" || requested === "rates") &&
      (profile === undefined || profile === "--enhanced"),
  );
  const study: Study = requested,
    enhanced = profile === "--enhanced",
    pred = predictionPath(enhanced);
  assert.equal(git("rev-parse", "HEAD"), source);
  assert.equal(git("diff", "--name-only", "HEAD"), "");
  const out = path.join(dir, "results");
  fs.mkdirSync(out);
  const predictionSha256 = await fileHash(pred);
  const prediction = read(pred);
  assert.equal(
    prediction.schema,
    enhanced ? "dx-w1/write4-predictions/1" : "dx-w1/field-predictions/1",
  );
  assert.equal(prediction.beforeServerRun, true);
  fs.copyFileSync(pred, path.join(out, "predictions.json"), fs.constants.COPYFILE_EXCL);
  assert.equal(await fileHash(path.join(out, "predictions.json")), predictionSha256);
  const inventory = sourceInventory(repo);
  for (const f of git("ls-files", "lab/experiments/EXP-DX1/w1", "packages/datomic/src").split("\n"))
    inventory.files[f] = await fileHash(f);
  write(path.join(out, "source.json"), inventory);
  const arms = [];
  for (const [index, mode] of modes(study, enhanced).entries()) {
    const attempt = path.join(out, "arm-" + (index + 1));
    fs.mkdirSync(attempt);
    const arm = {
      source,
      slot: `tx2-dxscale1-w1-${batch}-${index + 1}`,
      nonce: randomUUID(),
      population: "deep" as const,
      lookup: "individual" as const,
      readers: false,
    };
    const policy = fieldPolicy(mode, enhanced);
    write(path.join(attempt, "request.json"), { arm, mode, study, enhanced, predictionSha256 });
    const r = await withStack(
      attempt,
      arm,
      async (env) => {
        execFileSync(
          "taskset",
          [
            "-c",
            "3,5,6,7",
            process.execPath,
            "--import",
            "tsx",
            path.join(import.meta.dirname, "server.ts"),
            "worker",
            attempt,
          ],
          { cwd: repo, env, stdio: "inherit", timeout: 24 * 3600_000 },
        );
        const rawFile = path.join(attempt, "raw.json"),
          seedFile = path.join(attempt, "seed-readback.json"),
          raw = read(rawFile),
          check = read(seedFile);
        const phases = validateArm(raw, mode, study, arm.nonce, enhanced);
        assert.equal(check.facts, 16_245_050);
        assert.equal(check.digest, pooledDigest);
        const first = raw.phases[0];
        assert.equal(check.seedCut, first.headBefore ?? first.firstPosition - 1);
        return {
          arm,
          mode,
          ...(enhanced ? { policy } : {}),
          db: raw.db,
          scope: raw.scope,
          seed: pooledDigest,
          seedFacts: check.facts,
          phases,
          predictionSha256,
          rawSha256: await fileHash(rawFile),
          seedReadbackSha256: await fileHash(seedFile),
        };
      },
      policy.grouping,
      mode,
      enhanced,
    );
    write(path.join(attempt, "summary.json"), r);
    arms.push(r);
  }
  const comparison = { study, source, enhanced, arms, predictionSha256 };
  validateComparison(comparison, study, source, batch, enhanced);
  write(path.join(out, "comparison.json"), comparison);
} else throw Error("Use the published W1 campaign controller");
