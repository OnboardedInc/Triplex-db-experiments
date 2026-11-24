// [DX-INT4] lab/bin/gate-image.sh against a stand-in docker: fixed shared tags are refused before any Docker call,
// an image ID or a private per-build tag is resolved to its ID and recorded, and a container that ran another image fails.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const helper = path.resolve(import.meta.dirname, "../../../bin/gate-image.sh");
const A = "sha256:" + "a".repeat(64), B = "sha256:" + "b".repeat(64);
const inputs = "98f93dce098bcbcc" + "0".repeat(48);

function run(script: string, ranImage = A) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-image-"));
  const calls = path.join(dir, "calls");
  fs.writeFileSync(path.join(dir, "docker"), `#!/usr/bin/env bash
echo "$*" >> ${JSON.stringify(calls)}
case "$1 $2" in
  "image inspect") case "\${!#}" in ${A}|tx2-dxthin-jre21:98f93dce098bcbcc|tx2-dxthin-native:efa5693de92cfa6) echo "${A}|2026-11-24T19:33:00Z|${inputs}" ;;
    tx2-dxthin-jre21:1111111111111111) echo "${B}|2026-11-24T19:33:00Z|${inputs}" ;; *) exit 1 ;; esac ;;
  "container inspect") echo "${ranImage}" ;;
esac
`, { mode: 0o755 });
  const r = spawnSync("bash", ["-c", `. ${JSON.stringify(helper)}; ${script}`],
    { env: { ...process.env, PATH: `${dir}:${process.env["PATH"]}` }, encoding: "utf8" });
  const out = { status: r.status, stdout: r.stdout, stderr: r.stderr, calls: fs.existsSync(calls) ? fs.readFileSync(calls, "utf8") : "",
    evidence: fs.existsSync(path.join(dir, "image.json")) ? fs.readFileSync(path.join(dir, "image.json"), "utf8") : "" };
  fs.rmSync(dir, { recursive: true, force: true });
  return { ...out, dir };
}

for (const tag of ["tx2-datomic:dx-real2-production", "tx2-datomic:1.0.7745-da00", "tx2-datomic:dx-prep1-subject-query",
  "tx2-datomic:dx-jvm1-startup-read", "tx2-dxthin-native:latest", "postgres:17-alpine"]) {
  test(`refuses the fixed shared tag ${tag} before any Docker call`, () => {
    const r = run(`gate_image ${tag} "$PWD/image.json"`);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /refusing/);
    assert.equal(r.calls, "");
  });
}

test("an image ID is admitted, resolved and recorded", () => {
  const r = run(`d=$(dirname "$(command -v docker)"); id=$(gate_image ${A} "$d/image.json") && echo "$id" && cat "$d/image.json"`);
  assert.equal(r.status, 0);
  assert.match(r.stdout, new RegExp(`^${A}\\n\\{"ref":"${A}","imageId":"${A}"`));
});

test("a private per-build tag is resolved to its ID", () => {
  for (const tag of ["tx2-dxthin-jre21:98f93dce098bcbcc", "tx2-dxthin-native:efa5693de92cfa6"]) {
    const r = run(`d=$(dirname "$(command -v docker)"); gate_image ${tag} "$d/image.json"`);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, A);
  }
});

test("a JRE tag whose label names other build inputs is refused", () => {
  const r = run(`d=$(dirname "$(command -v docker)"); gate_image tx2-dxthin-jre21:1111111111111111 "$d/image.json"`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not the ones its tag names/);
});

test("an absent image is refused", () => {
  const r = run(`d=$(dirname "$(command -v docker)"); gate_image sha256:${"c".repeat(64)} "$d/image.json"`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not present/);
});

test("a container that ran another image fails the gate", () => {
  const ok = run(`d=$(dirname "$(command -v docker)"); gate_image_ran gw ${A} "$d/image.json"`, A);
  assert.equal(ok.status, 0);
  const bad = run(`d=$(dirname "$(command -v docker)"); gate_image_ran gw ${A} "$d/image.json"`, B);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /runs sha256:b+, not sha256:a+/);
});
