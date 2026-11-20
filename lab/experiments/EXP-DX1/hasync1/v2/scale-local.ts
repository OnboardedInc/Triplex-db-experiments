import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { root } from "../../ha1/common.ts";

const folder = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2");
const evidence = path.join(folder, "evidence", "DX-HASYNC1");
const scratchRoot = path.join(folder, "scratch", "DX-HASYNC1");
const read = (dir: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
const rungs = process.argv.slice(2).map(Number);
assert(rungs.length && rungs.every((n) => Number.isSafeInteger(n) && n >= 5 && n <= 100000));
assert.equal(process.platform, "darwin");

async function run(arm: string, people: number, checkpoint?: string) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "lab/bin/engine.mjs",
      "ha1",
      "--holder",
      "DX-HASYNC1",
      "--slot",
      "auto",
      "--experiment",
      "hasync-" + arm,
      "--people",
      String(people),
      ...(checkpoint ? ["--checkpoint", checkpoint] : []),
    ],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  let stdout = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const dirs = stdout.split("\n").filter((line) => path.dirname(line) === evidence);
  assert(dirs.length <= 1);
  if (dirs[0])
    assert.match(path.basename(dirs[0]), new RegExp("^hasync-" + arm + "-[a-f0-9-]{36}$"));
  process.stdout.write(
    JSON.stringify({ arm, people, status, dir: dirs[0] && path.basename(dirs[0]) }) + "\n",
  );
  return { status, dir: dirs[0] };
}

let error = false;
for (const people of rungs) {
  const seed = await run("seed-edited", people);
  if (!seed.dir) {
    error = true;
    break;
  }
  const { nonce } = read(seed.dir, "attempt.json");
  assert.equal(path.basename(seed.dir), "hasync-seed-edited-" + nonce);
  assert.match(nonce, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  const scratch = path.join(scratchRoot, nonce);
  try {
    if (seed.status !== 0) {
      error = true;
      break;
    }
    for (const arm of ["ack", "index", "move"]) {
      const cell = await run(arm, people, nonce);
      error ||= cell.status !== 0;
      assert(
        cell.dir && read(cell.dir, "cleanup.json").containers === 0,
        "Checkpoint consumer cleanup unproven",
      );
    }
  } finally {
    if (fs.existsSync(scratch) && fs.existsSync(path.join(seed.dir, "cleanup.json"))) {
      const owner = path.join(scratch, "owner.json");
      // [DX-HASYNC1] Why: dispose of the private checkpoint whose owner and physical cleanup match this attempt. Rejected: deleting other seeds or evidence on a retry.
      assert.equal(fs.realpathSync(scratch), path.join(fs.realpathSync(scratchRoot), nonce));
      assert(fs.lstatSync(owner).isFile() && fs.lstatSync(owner).uid === process.getuid!());
      assert.equal(read(scratch, "owner.json").from, nonce);
      assert.equal(read(seed.dir, "cleanup.json").nonce, nonce);
      fs.rmSync(scratch, { recursive: true });
      process.stdout.write("Removed checkpoint " + nonce + "\n");
    }
  }
}
if (error) process.exitCode = 1;
