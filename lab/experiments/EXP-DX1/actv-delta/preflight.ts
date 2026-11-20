import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { openComposition } from "../../../bench/lib/composition.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";
import { checkWindows } from "../act2/preflight.ts";
import { validatePreflight } from "../act2/preflight-runner.ts";
import { headSha, stamp } from "./binding.ts";
import { hash } from "./store.ts";
import type { Identity } from "./server.ts";
import { solo, openFreshSource } from "./solo.ts";
import { measured } from "./measure-lock.ts";
import { soloPopulation, soloScope } from "./solo-population.ts";
import { checkSolo } from "./solo-proof.ts";
import { auditSolo, checkAuditSolo, checkCollector } from "./audit-solo.ts";
const auditPhases = ["reference", "record", "stored"] as const;
function status(dir: string, binding: Identity, stage: string, reason?: string) {
  const file = path.join(dir, "STATUS.json");
  fs.writeFileSync(file + ".tmp", JSON.stringify({ binding, stage, reason }) + "\n");
  fs.renameSync(file + ".tmp", file);
}
async function check(dir: string, binding: Identity) {
  assert.equal(headSha(), binding.source);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8")), binding);
  const started = Date.now(),
    progress = (s: string) => status(dir, binding, s),
    code = stamp();
  let stage = "validating both single-account inventories";
  try {
    progress(stage);
    const populations = [soloPopulation(1000, true), soloPopulation(100000, true)];
    stage = "checking two live windows";
    progress(stage);
    const c = await openComposition("reach", "datomic", "act2-preflight-" + binding.nonce);
    let windows;
    try {
      windows = await checkWindows(c, binding, (s) => {
        stage = s;
        progress(stage);
      });
    } finally {
      await c.close();
    }
    const checked = { ...windows, sourceInputs: code, elapsedMs: Date.now() - started };
    validatePreflight(checked, binding);
    stage = "checking full fallback before acknowledgement";
    progress(stage);
    const fallback = execFileSync(
      process.execPath,
      ["--import", "tsx", "--test", path.join(import.meta.dirname, "full.test.ts")],
      { env: { ...process.env, DX_ACT1_NATIVE: "1" }, encoding: "utf8", timeout: 45000 },
    );
    const tap = path.join(dir, "full-fallback.tap");
    fs.writeFileSync(tap, fallback, { flag: "wx" });
    assert(
      fallback.includes("ok 1 - an unavailable protected index") &&
        fallback.split("\n").includes("# pass 1") &&
        fallback.split("\n").includes("# fail 0"),
    );
    if (process.env.DELTA_AUDITED === "1") {
      stage = "checking two independently seeded activation timing modes";
      progress(stage);
      const folder = path.join(dir, "campaign");
      fs.mkdirSync(folder);
      fs.writeFileSync(path.join(folder, "request.json"), JSON.stringify(binding) + "\n", {
        flag: "wx",
      });
      const audited = await auditSolo(folder, binding, 1000, 4, (s) => progress((stage = s)));
      stage = "running the BM1 collector on the actual small campaign";
      progress(stage);
      checkCollector(folder, binding, 1000, 8);
      const empty = [];
      stage = "opening the three large destinations on the same stack";
      progress(stage);
      for (const arm of auditPhases) {
        const large = await openFreshSource(binding, 100000, arm);
        try {
          empty.push({ scope: large.scopeName, position: await large.currentPosition() });
        } finally {
          await large.close();
        }
      }
      const proof = {
        format: "activation-clock/2",
        binding,
        windows: checked,
        populations,
        empty,
        fullFallback: hash(fallback),
        // [DX-ACT2] Why: bind the actual offer and arm bytes, including fractional milliseconds. Rejected: hashing timing objects with W0's integer-only value codec.
        campaign: sha256(fs.readFileSync(path.join(folder, "result.json"))),
        reports: audited.reports,
        people: 1000,
        code,
        elapsedMs: Date.now() - started,
      };
      fs.writeFileSync(path.join(dir, "proof.json"), JSON.stringify(proof) + "\n", { flag: "wx" });
      stage = "validating zero misses and zero stale reads";
      progress(stage);
      checkAuditSolo(folder, binding, 1000, 4, "preflight", true);
      assert.equal(code, stamp());
      status(dir, binding, "verified");
      return;
    }
    const deep = await solo(dir, binding, 1000, 6, (s) => {
      stage = s;
      progress(stage);
    });
    const checkedSolo = checkSolo(dir, binding, 1000, 6, "preflight");
    assert.deepEqual(checkedSolo, deep);
    stage = "opening the large destination on the same stack";
    progress(stage);
    // [DX-ACT2] Why: both stages use the same attempt and server. Exercise the actual large-source opener and require an empty, distinct physical scope after the populated preflight. Rejected: proving only that the small database worked.
    const destination = await openFreshSource(binding, 100000);
    let emptyLarge;
    try {
      emptyLarge = { scope: destination.scopeName, position: await destination.currentPosition() };
      assert(emptyLarge.scope !== deep.scope && emptyLarge.position === 0);
    } finally {
      await destination.close();
    }
    const proof = {
      emptyLarge,
      binding,
      windows: checked,
      populations,
      fullFallback: hash(fallback),
      scope: deep.scope,
      people: deep.subjects,
      offers: deep.proofs.map((o) => hash(o)),
      loaded: deep.loaded,
      code,
      elapsedMs: Date.now() - started,
    };
    assert.equal(code, stamp());
    fs.writeFileSync(path.join(dir, "proof.json"), JSON.stringify(proof) + "\n", { flag: "wx" });
    status(dir, binding, "verified");
  } catch (e) {
    status(dir, binding, stage, String(e));
    throw e;
  }
}
export function guardDelta(dir: string, binding: Identity, env: NodeJS.ProcessEnv) {
  fs.mkdirSync(dir);
  assert.equal(binding.source, headSha());
  fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(binding) + "\n", { flag: "wx" });
  const start = performance.now();
  try {
    execFileSync(process.execPath, ["--import", "tsx", import.meta.filename, "check", dir], {
      env: { ...env, DELTA_GATE: "preflight" },
      timeout: 600000,
      killSignal: "SIGKILL",
      stdio: "inherit",
    });
    const get = (name: string) =>
        JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8")),
      proof = get("proof");
    assert.deepEqual(get("STATUS"), { binding, stage: "verified" });
    assert.deepEqual(proof.binding, binding);
    assert.equal(
      proof.fullFallback,
      hash(fs.readFileSync(path.join(dir, "full-fallback.tap"), "utf8")),
    );
    validatePreflight(proof.windows, binding);
    assert.deepEqual(proof.populations, [soloPopulation(1000), soloPopulation(100000)]);
    assert.equal(proof.code, stampForPreflight());
    if (env.DELTA_AUDITED === "1") {
      assert(
        proof.format === "activation-clock/2" &&
          proof.elapsedMs > 0 &&
          performance.now() - start < 600000 &&
          proof.people === 1000,
      );
      const folder = path.join(dir, "campaign"),
        fresh = checkAuditSolo(folder, binding, 1000, 4, "preflight", true);
      assert.equal(proof.campaign, sha256(fs.readFileSync(path.join(folder, "result.json"))));
      assert.deepEqual(proof.reports, fresh.reports);
      assert.deepEqual(
        proof.empty,
        auditPhases.map((arm) => ({ scope: soloScope(binding.nonce, 100000, arm), position: 0 })),
      );
      checkCollector(folder, binding, 1000, 8);
      return proof;
    }
    const observed = get("result");
    assert.deepEqual(observed.binding, binding);
    assert(
      proof.elapsedMs > 0 &&
        performance.now() - start < 600000 &&
        proof.people === 1000 &&
        proof.scope === soloScope(binding.nonce, 1000),
    );
    assert.deepEqual(proof.emptyLarge, { scope: soloScope(binding.nonce, 100000), position: 0 });
    assert.notEqual(proof.scope, proof.emptyLarge.scope);
    const fresh = checkSolo(dir, binding, 1000, 6, "preflight");
    assert.deepEqual(observed, fresh);
    assert.equal(proof.code, stampForPreflight());
    assert.deepEqual(proof.loaded, fresh.loaded);
    assert.deepEqual(
      proof.offers,
      fresh.proofs.map((o: unknown) => hash(o)),
    );
    return proof;
  } catch (e) {
    const file = path.join(dir, "STATUS.json"),
      s = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : { stage: "starting native preflight" };
    const reason =
      s.reason ??
      s.stage +
        " / " +
        ((e as NodeJS.ErrnoException).code === "ETIMEDOUT"
          ? "600 second deadline"
          : String(e).split("\n")[0]);
    status(dir, binding, "stopped", reason);
    throw Error(reason);
  }
}
function stampForPreflight() {
  const v = process.env.DELTA_GATE;
  try {
    process.env.DELTA_GATE = "preflight";
    return stamp();
  } finally {
    if (v === undefined) delete process.env.DELTA_GATE;
    else process.env.DELTA_GATE = v;
  }
}
export async function run(dir: string, attempt: any) {
  const native = JSON.parse(fs.readFileSync(path.join(dir, "native.json"), "utf8"));
  return measured(async () =>
    guardDelta(
      path.join(dir, "preflight"),
      { source: headSha(), slot: native.prefix, nonce: attempt.nonce },
      process.env,
    ),
  );
}
if (process.argv[1] === import.meta.filename) {
  const [mode, dir] = process.argv.slice(2),
    binding = JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8"));
  assert.equal(mode, "check");
  await check(dir, binding);
}
