import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { openComposition } from "../../../bench/lib/composition.ts";
import { checkWindows } from "../act2/preflight.ts";
import { validatePreflight } from "../act2/preflight-runner.ts";
import { headSha, stamp } from "./binding.ts";
import { hash } from "./store.ts";
import { nativeDeep, type Identity } from "./server.ts";
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
  let stage = "checking two live windows";
  try {
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
    const deep = await nativeDeep(dir, binding, true, (s) => {
      stage = s;
      progress(stage);
    });
    const proof = {
      binding,
      windows: checked,
      fullFallback: hash(fallback),
      scope: deep.scope,
      people: deep.subjects,
      offers: deep.offers.map((o) => hash(JSON.stringify(o))),
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
      proof = get("proof"),
      observed = get("result");
    assert.deepEqual(get("STATUS"), { binding, stage: "verified" });
    assert.deepEqual(proof.binding, binding);
    assert.equal(
      proof.fullFallback,
      hash(fs.readFileSync(path.join(dir, "full-fallback.tap"), "utf8")),
    );
    assert.deepEqual(observed.binding, binding);
    validatePreflight(proof.windows, binding);
    assert(
      proof.elapsedMs > 0 &&
        performance.now() - start < 600000 &&
        proof.people === 1000 &&
        proof.scope === "delta-deep-" + binding.nonce + "-check",
    );
    assert.equal(proof.scope, observed.scope);
    assert.equal(observed.subjects, 1000);
    assert.equal(observed.target.people, 1000);
    for (const [i, o] of observed.offers.entries()) {
      assert.equal(o.nonce, binding.nonce);
      assert.equal(o.account, observed.target.key);
      assert.equal(o.seq, 2 * (i + 1));
      assert.equal(o.applied, o.notices);
      assert(
        o.position > 0 &&
          o.writes === 6 &&
          o.activationWorldPulls === 0 &&
          o.firstPoint &&
          o.rows >= o.people,
      );
      for (const digest of [o.root, o.census, o.domainSha, o.effectsSha, o.allSubjectsSha])
        assert.match(digest, /^[a-f0-9]{64}$/);
    }
    assert.equal(proof.code, observed.source);
    assert.equal(proof.code, stampForPreflight());
    assert.deepEqual(
      observed.offers.map((o: any) => o.label),
      ["broad", "narrow"],
    );
    assert.deepEqual(
      proof.offers,
      [1, 2].map((i) => hash(JSON.stringify(get("offer-" + i)))),
    );
    assert.deepEqual(
      proof.offers,
      observed.offers.map((o: unknown) => hash(JSON.stringify(o))),
    );
    assert(
      observed.reads > 0 &&
        observed.saves === 3 &&
        observed.events === 5 &&
        observed.sourceBoundReadAudits > 0,
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
  return guardDelta(
    path.join(dir, "preflight"),
    { source: headSha(), slot: native.prefix, nonce: attempt.nonce },
    process.env,
  );
}
if (process.argv[1] === import.meta.filename) {
  const [mode, dir] = process.argv.slice(2),
    binding = JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8"));
  assert.equal(mode, "check");
  await check(dir, binding);
}
