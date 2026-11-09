// [EXP-NSR-R5] Why: inspect the real child environment and write results, including the review's literal-star path. Rejected: checking only the launcher's requested options.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { buildDriver } from "../../../bench/ns-driver/build.mjs";
import { launchArtifact } from "../../../bench/ns-driver/launch-artifact.mjs";
export async function runEnvelopeControls(root) {
  fs.mkdirSync(root, { recursive: true });
  const outside = path.join(root, "outside");
  fs.mkdirSync(outside);
  const marker = path.join(outside, "marker");
  const entry = path.join(root, "entry.mjs");
  fs.writeFileSync(
    entry,
    `import fs from 'node:fs'; import path from 'node:path';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let denied;
try { fs.writeFileSync(${JSON.stringify(marker)},'outside output marker'); }
catch(error) { denied={code:error.code,permission:error.permission,resource:error.resource}; }
fs.writeFileSync(path.join(config.output,'inside'),'expected output',{flag:'wx'});
console.log(JSON.stringify({env:process.env,execArgv:process.execArgv,denied,cwd:process.cwd()}));`,
  );
  const artifact = path.join(root, "artifact");
  buildDriver(artifact, root, entry);
  const keyFile = path.join(root, "key");
  fs.writeFileSync(keyFile, randomBytes(32));
  const configFile = path.join(root, "config.json");
  const output = path.join(root, "output");
  const configure = (output) => fs.writeFileSync(configFile, JSON.stringify({ keyFile, output }));
  configure(output);
  const oldPATH = process.env.PATH,
    oldSentinel = process.env.NSR_PARENT_SENTINEL;
  let baseline;
  try {
    process.env.PATH = (oldPATH ?? "") + ":/host-path-must-not-propagate";
    process.env.NSR_PARENT_SENTINEL = "must-not-propagate";
    baseline = await launchArtifact(artifact, configFile);
  } finally {
    if (oldPATH === undefined) delete process.env.PATH;
    else process.env.PATH = oldPATH;
    if (oldSentinel === undefined) delete process.env.NSR_PARENT_SENTINEL;
    else process.env.NSR_PARENT_SENTINEL = oldSentinel;
  }
  assert.equal(baseline.code, 0, baseline.stderr);
  const observed = JSON.parse(baseline.stdout),
    receipt = baseline.layoutReceipt;
  assert.deepEqual(observed.env, receipt.environment);
  assert.equal(observed.env.PATH, "");
  assert.equal(observed.env.NSR_PARENT_SENTINEL, undefined);
  assert.deepEqual(observed.denied, {
    code: "ERR_ACCESS_DENIED",
    permission: "FileSystemWrite",
    resource: marker,
  });
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.readFileSync(path.join(output, "inside"), "utf8"), "expected output");
  assert.equal(observed.cwd, receipt.layout);
  assert.deepEqual(
    observed.execArgv.filter((arg) => arg.startsWith("--allow-")),
    receipt.permissions.map((p) => p.flag),
  );
  assert.equal(receipt.permissions[1].flag, "--allow-fs-write=" + output);
  const results = [{ kind: "actual-child-envelope-and-writes", ...baseline, observed }];
  assert.throws(() => launchArtifact(artifact, configFile), /EEXIST/);
  results.push({ kind: "output-reuse-refused" });
  for (const [kind, target] of [
    ["literal-output-star", path.join(root, "out*")],
    ["parent-output-star", path.join(root, "parent*", "out")],
  ]) {
    configure(target);
    assert.throws(() => launchArtifact(artifact, configFile), /wildcard permission path refused/);
    assert.equal(fs.existsSync(marker), false);
    results.push({ kind });
  }
  const patternArtifact = path.join(root, "artifact*");
  fs.mkdirSync(patternArtifact);
  for (const name of fs.readdirSync(artifact))
    fs.copyFileSync(path.join(artifact, name), path.join(patternArtifact, name));
  const nestedArtifact = path.join(patternArtifact, "bundle");
  fs.mkdirSync(nestedArtifact);
  for (const name of fs.readdirSync(artifact))
    fs.copyFileSync(path.join(artifact, name), path.join(nestedArtifact, name));
  configure(path.join(root, "unused-output"));
  assert.throws(
    () => launchArtifact(nestedArtifact, configFile),
    /wildcard permission path refused/,
  );
  results.push({ kind: "parent-layout-star" });
  for (const kind of ["audit-wildcard-write", "audit-extra-env", "audit-host-path"]) {
    const env = { ...receipt.environment };
    if (kind === "audit-extra-env") env.UNDECLARED = "untrusted";
    if (kind === "audit-host-path") env.PATH = "/host/bin";
    const flags = receipt.permissions.map((p) => p.flag);
    if (kind === "audit-wildcard-write") flags[1] += "/*";
    const result = spawnSync(
      process.execPath,
      ["--permission", ...flags, path.join(receipt.layout, "layout-audit.mjs")],
      { env, cwd: receipt.layout, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      kind === "audit-wildcard-write"
        ? /excess filesystem write grant/
        : /excess runtime environment/,
    );
    results.push({ kind, code: result.status, stderr: result.stderr });
  }
  fs.writeFileSync(path.join(root, "results.json"), JSON.stringify(results, null, 2) + "\n");
  return results;
}
