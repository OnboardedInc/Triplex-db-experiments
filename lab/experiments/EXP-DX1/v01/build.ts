import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cleanSource, packageBytes, serverImages } from "./source.ts";

const [commit, location] = process.argv.slice(2);
assert(commit && location && process.argv.length === 4, "build.ts COMMIT NEW_BUILD_DIR");
assert(path.isAbsolute(location) && !fs.existsSync(location));
const source = cleanSource(commit, true);
assert(process.platform === "linux", "Use the Mac engine manager for the toy gate");
const disk = fs.statfsSync(".");
assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME,
  DX_V01_PIN_IMAGES: "1",
};
execFileSync("bash", ["lab/experiments/EXP-DX1/t1/bare-metal.sh", "--prepare", source, location],
  { env, stdio: "inherit" });
process.chdir(path.join(location, "repository"));
cleanSource(source);
const receipt = { source, packages: packageBytes(), images: serverImages() };
fs.writeFileSync(path.join(location, "BUILD-v0.1.json"), JSON.stringify(receipt, null, 2) + "\n",
  { flag: "wx", mode: 0o600 });
console.log(path.join(location, "BUILD-v0.1.json"));
