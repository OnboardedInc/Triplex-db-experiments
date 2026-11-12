import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
// [DX-R3-P8] Why: execute the actual trap under its failing function's redirection without any engine.
// Rejected: testing a copied cleanup implementation (would miss future changes to the shipped trap).
test("failed redirected stage restores cleanup output before reading its own log", () => {
  const source = readFileSync("lab/experiments/EXP-DX1/h3/attempt.sh", "utf8");
  const directory = mkdtempSync(join(tmpdir(), "dxr3-cleanup-"));
  try {
    writeFileSync(join(directory, "driver.log"), "original driver bytes\n");
    const setup = source.slice(source.indexOf("exec 8>&1"), source.indexOf("kind=${1"));
    const cleanup = source.slice(source.indexOf("cleanup() {", source.indexOf("held=false")), source.indexOf("# [DX-H3] Why: a queued attempt"));
    const script = `set -euo pipefail\n${setup}\nout=$1; prefix=tx2-dxr3-test; watchdog=; child=; operational=; held=false\ndocker() { if [[ $1 == container ]]; then return 1; fi; }\nbash() { :; }\n${cleanup}\ntrap cleanup EXIT\nrun_stage() { "$@" & child=$!; wait "$child"; child=; }\nrun_stage bash -c 'exit 7' > "$out/driver.log" 2>&1\n`;
    // The stubbed bash is reserved for stack cleanup; use a failing shell function for the stage.
    const result = spawnSync("bash", ["-c", script.replace("run_stage bash -c 'exit 7'", "fail() { echo stage-failed; return 7; }; run_stage fail"), "test", directory], { encoding: "utf8", timeout: 3000, maxBuffer: 1024 * 1024 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 7);
    assert.equal(readFileSync(join(directory, "driver.log"), "utf8"), "stage-failed\n");
    assert.match(result.stdout, /DX-R3 raw-output tx2-dxr3-test\/driver.log\nstage-failed/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
