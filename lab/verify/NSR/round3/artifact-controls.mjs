// @ts-nocheck -- [CX-A01-040] Why: this review control is imported by current NSR regressions and uses runtime-created fixtures. Binding errors remain checked. Rejected: excluding an executed dependency.
// [EXP-NSR-R3] Why: execute the review's constructor and aliased-loader variations under actual artifact enforcement. Rejected: another static spelling test without runtime observations.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { buildDriver } from "../../../bench/ns-driver/build.mjs";
import { launchArtifact } from "../../../bench/ns-driver/launch-artifact.mjs";
export async function runArtifactControls(output) {
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  for (const kind of [
    "static-import",
    "constructor",
    "constructor-alias",
    "worker",
    "destructured-worker",
    "require-alias",
    "computed-import",
    "read-and-evaluate",
    "data-import",
  ]) {
    const root = path.join(output, kind + "-" + randomUUID());
    fs.mkdirSync(path.join(root, "packages"), { recursive: true });
    const runOutput = path.join(root, "run-output");
    const marker = path.join(runOutput, "candidate-ran"),
      candidate = path.join(root, "packages/candidate.mjs");
    fs.writeFileSync(
      candidate,
      `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'candidate executed');`,
    );
    const code = {
      "static-import": `import './packages/candidate.mjs';`,
      constructor: `const {constructor:Compile}=function(){}; await Compile(${JSON.stringify("return import(" + JSON.stringify(pathToFileURL(candidate).href) + ")")})();`,
      "constructor-alias": `const f=()=>{}; const {constructor:Build}=f; const alias=Build; await alias(${JSON.stringify("return import(" + JSON.stringify(pathToFileURL(candidate).href) + ")")})();`,
      worker: `import {Worker as Launch} from 'node:worker_threads'; new Launch(${JSON.stringify(candidate)});`,
      "destructured-worker": `const {Worker:Launch}=await import('node:worker_threads'); new Launch(${JSON.stringify(candidate)});`,
      "require-alias": `import {createRequire as cr} from 'node:module'; const load=cr(import.meta.url);load(${JSON.stringify(candidate)});`,
      "computed-import": `const target=${JSON.stringify(pathToFileURL(candidate).href)}; await import(target);`,
      "read-and-evaluate": `import fs from 'node:fs'; const {constructor:Compile}=function(){}; Compile(fs.readFileSync(${JSON.stringify(candidate)},'utf8'))();`,
      "data-import": `const target='data:text/javascript,export default 1'; await import(target);`,
    }[kind];
    const entry = path.join(root, "entry.mjs");
    fs.writeFileSync(entry, code);
    const keyFile = path.join(root, "key");
    fs.writeFileSync(keyFile, randomBytes(32));
    const configFile = path.join(root, "config.json");
    fs.writeFileSync(configFile, JSON.stringify({ output: runOutput, keyFile }));
    let manifest;
    try {
      manifest = buildDriver(path.join(root, "artifact"), root, entry);
    } catch (error) {
      assert.equal(kind, "static-import", error.message);
      assert.match(error.message, /candidate\/outside/);
      results.push({ kind, refusedAt: "bundler-graph", error: error.message });
      continue;
    }
    assert.ok(!Object.keys(manifest.files).some((f) => f.split("/").includes("packages")));
    const result = await launchArtifact(path.join(root, "artifact"), configFile);
    assert.notEqual(result.code, 0, kind + " unexpectedly executed");
    assert.match(result.stderr, /outside graph|ERR_ACCESS_DENIED/, kind + ": " + result.stderr);
    assert.equal(fs.existsSync(marker), false);
    results.push({
      kind,
      refusedAt: "runtime",
      code: result.code,
      stderr: result.stderr,
      bundleSha256: manifest.bundleSha256,
    });
  }
  const tamperRoot = path.join(output, "artifact-binding-" + randomUUID());
  fs.mkdirSync(tamperRoot);
  const entry = path.join(tamperRoot, "entry.mjs");
  fs.writeFileSync(entry, 'console.log("guarded artifact loads");');
  const artifact = path.join(tamperRoot, "artifact");
  buildDriver(artifact, tamperRoot, entry);
  const keyFile = path.join(tamperRoot, "key");
  fs.writeFileSync(keyFile, randomBytes(32));
  const configFile = path.join(tamperRoot, "config.json");
  fs.writeFileSync(
    configFile,
    JSON.stringify({ keyFile, output: path.join(tamperRoot, "output") }),
  );
  const baseline = await launchArtifact(artifact, configFile);
  assert.equal(baseline.code, 0, baseline.stderr);
  fs.appendFileSync(path.join(artifact, "driver.mjs"), "\n");
  assert.throws(() => launchArtifact(artifact, configFile), /binding mismatch/);
  results.push({
    kind: "artifact-binding",
    baselineCode: baseline.code,
    changedArtifactRefused: true,
  });
  fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
  return results;
}
