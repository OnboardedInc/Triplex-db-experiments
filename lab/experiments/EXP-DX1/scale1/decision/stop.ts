import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { read, write } from "./seed.ts";

const dir = process.argv[2]!;
assert(process.platform === "linux" && process.getuid?.() === 0);
assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
assert(path.dirname(dir) === "/var/tmp/triplex-scale1/decision/attempts");
const a = read(path.join(dir, "attempt.json"));
assert(a.tag === path.basename(dir) && /^arm-d7-[a-z0-9-]{2,24}$/.test(a.tag));
assert(a.slot === "tx2-dxscale1-" + a.tag);
const marker = path.resolve(dir, "../../active-slot");
const cleanup = path.join(dir, "cleanup.json");
const docker = (...args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 120000 }).trim();
const inventory = () =>
  Object.fromEntries(
    [
      ["containers", docker("ps", "-a", "--format", "{{.Names}}")],
      ["volumes", docker("volume", "ls", "--format", "{{.Name}}")],
      ["networks", docker("network", "ls", "--format", "{{.Name}}")],
    ].map(([key, value]) => [key, value!.split("\n").filter((s) => s.startsWith(a.slot + "-"))]),
  );
const before = inventory();
if (Object.values(before).some((v) => v.length) || fs.existsSync(marker)) {
  assert.equal(fs.readFileSync(marker, "utf8").trim(), a.slot);
  execFileSync("bash", ["lab/experiments/EXP-DX1/stack/down.sh", a.slot, "--volumes"], {
    stdio: "inherit",
    timeout: 120000,
  });
  fs.unlinkSync(marker);
}
const gone = inventory();
assert(Object.values(gone).every((v) => v.length === 0));
if (fs.existsSync(cleanup)) assert.deepEqual(read(cleanup), gone);
else write(cleanup, gone);
const result = process.env.SERVICE_RESULT;
assert(result);
write(path.join(dir, "unit.json"), {
  source: a.source,
  slot: a.slot,
  nonce: a.nonce,
  result,
  endedAt: new Date().toISOString(),
  before,
  exitCode: process.env.EXIT_CODE,
  exitStatus: process.env.EXIT_STATUS,
});
