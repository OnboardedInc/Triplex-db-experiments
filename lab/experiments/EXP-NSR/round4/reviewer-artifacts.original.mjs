// [CX-VNSR-R3] Why: execute the requested loader routes under the exact generated launcher, including code read through its data grants. Rejected: accepting only build-time graph checks or a missing marker after an unrelated syntax error.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { buildDriver } from "../../../bench/ns-driver/build.mjs";
import { launchArtifact } from "../../../bench/ns-driver/launch-artifact.mjs";
const output = path.resolve(".cache/verify-nsr-r3", "artifacts-" + randomUUID());
fs.mkdirSync(output, { recursive: true });
const cases = [
  "static-import",
  "constructor",
  "constructor-readable-file",
  "createRequire-alias",
  "destructured-worker",
  "computed-data-import",
  "vm-module-availability",
  "vm-file-text-denied",
  "vm-file-text-readable",
  "process-dlopen",
  "child-node",
  "replace-hook-file-module",
  "replace-hook-data-module",
];
const results = [];
for (const kind of cases) {
  const root = path.join(output, kind);
  fs.mkdirSync(path.join(root, "packages"), { recursive: true });
  const out = path.join(root, "run-output");
  fs.mkdirSync(out);
  const marker = path.join(out, "candidate-ran");
  const candidate = path.join(root, "packages", "candidate.mjs");
  const candidateBody = `process.getBuiltinModule('fs').writeFileSync(${JSON.stringify(marker)},'candidate executed');\n`;
  fs.writeFileSync(candidate, candidateBody);
  const url = pathToFileURL(candidate).href;
  const dataURL = "data:text/javascript," + encodeURIComponent(candidateBody);
  let keyFile = path.join(root, "key");
  fs.writeFileSync(keyFile, randomBytes(32));
  if (
    [
      "constructor-readable-file",
      "vm-file-text-readable",
      "replace-hook-file-module",
      "replace-hook-data-module",
    ].includes(kind)
  )
    keyFile = candidate;
  const header = `import fs from 'node:fs'; const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); `;
  const hookPrelude = `const mod=process.getBuiltinModule('module'); const fs=process.getBuiltinModule('fs'); const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); `;
  const target = kind === "replace-hook-data-module" ? dataURL : url;
  const source = {
    "static-import": `import './packages/candidate.mjs';`,
    constructor: `const {constructor:Compile}=function(){}; await Compile(${JSON.stringify("return import(" + JSON.stringify(url) + ")")})();`,
    "constructor-readable-file": `const {constructor:Compile}=function(){}; await Compile(${JSON.stringify("return import(" + JSON.stringify(url) + ")")})();`,
    "createRequire-alias": `import {createRequire as cr} from 'node:module'; const load=cr(import.meta.url); load(${JSON.stringify(candidate)});`,
    "destructured-worker": `const {Worker:Launch}=await import('node:worker_threads'); new Launch(${JSON.stringify(candidate)});`,
    "computed-data-import": `const target=${JSON.stringify(dataURL)}; await import(target);`,
    "vm-module-availability": `import vm from 'node:vm'; console.log(JSON.stringify({Module:typeof vm.Module,SourceTextModule:typeof vm.SourceTextModule,permission:!!process.permission}));`,
    "vm-file-text-denied": `${header} import vm from 'node:vm'; vm.runInThisContext(fs.readFileSync(${JSON.stringify(candidate)},'utf8'),{filename:${JSON.stringify(candidate)}});`,
    "vm-file-text-readable": `${header} import vm from 'node:vm'; vm.runInThisContext(fs.readFileSync(config.keyFile,'utf8'),{filename:config.keyFile});`,
    "process-dlopen": `process.dlopen({exports:{}},${JSON.stringify(path.join(root, "packages/fake.node"))});`,
    "child-node": `import {spawnSync as launch} from 'node:child_process'; const result=launch(process.execPath,[${JSON.stringify(candidate)}]); if(result.error) throw result.error; if(result.status!==0) throw Error('child failed');`,
    "replace-hook-file-module": `${hookPrelude} const target=${JSON.stringify(target)}; mod.registerHooks({ resolve(s,c,next){if(s===target)return {url:target,shortCircuit:true}; return next(s,c);}, load(u,c,next){if(u===target)return {format:'module',source:fs.readFileSync(config.keyFile,'utf8'),shortCircuit:true}; return next(u,c);} }); await import(target);`,
    "replace-hook-data-module": `${hookPrelude} const target=${JSON.stringify(target)}; mod.registerHooks({ resolve(s,c,next){if(s===target)return {url:target,shortCircuit:true}; return next(s,c);}, load(u,c,next){if(u===target)return {format:'module',source:fs.readFileSync(config.keyFile,'utf8'),shortCircuit:true}; return next(u,c);} }); await import(target);`,
  }[kind];
  const entry = path.join(root, "entry.mjs");
  fs.writeFileSync(entry, source);
  fs.writeFileSync(
    path.join(root, "packages/fake.node"),
    "non-native fixture; permission must reject before native loading",
  );
  const configFile = path.join(root, "config.json");
  fs.writeFileSync(configFile, JSON.stringify({ keyFile, output: out }));
  let manifest;
  try {
    manifest = buildDriver(path.join(root, "artifact"), root, entry);
  } catch (error) {
    assert.equal(kind, "static-import", error.stack);
    assert.match(error.message, /candidate\/outside/);
    results.push({ kind, refusedAt: "resolved-bundler-input", error: error.message });
    continue;
  }
  assert.ok(Object.keys(manifest.files).every((p) => !p.split(path.sep).includes("packages")));
  const actual = fs.readFileSync(path.join(root, "artifact/driver.mjs"));
  assert.equal(createHash("sha256").update(actual).digest("hex"), manifest.bundleSha256);
  const result = await launchArtifact(path.join(root, "artifact"), configFile);
  const executed = fs.existsSync(marker);
  if (kind === "vm-module-availability") {
    assert.equal(result.code, 0, result.stderr);
    assert.equal(executed, false);
  } else if (
    ["vm-file-text-readable", "replace-hook-file-module", "replace-hook-data-module"].includes(kind)
  ) {
    assert.equal(result.code, 0, result.stderr);
    assert.equal(fs.readFileSync(marker, "utf8"), "candidate executed");
  } else {
    assert.notEqual(result.code, 0, kind + " unexpectedly ran");
    assert.equal(executed, false);
    assert.match(
      result.stderr,
      /outside graph|ERR_ACCESS_DENIED|ERR_DLOPEN_DISABLED/,
      kind + ": " + result.stderr,
    );
  }
  const row = {
    kind,
    candidateExecuted: executed,
    manifestInputs: Object.keys(manifest.files),
    externals: manifest.externals,
    bundleSha256: manifest.bundleSha256,
    ...result,
  };
  results.push(row);
  console.log(JSON.stringify(row));
}
fs.writeFileSync(
  path.join(output, "results.json"),
  JSON.stringify({ target: "46b3f361", results }, null, 2),
);
console.log("Evidence: " + output);
