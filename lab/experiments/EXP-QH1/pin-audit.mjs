// [EXP-QH1] Why: report every changed source hash for contract-owner re-pinning; never edit the contract.
// Rejected: silently refreshing lab/acceptance after a product change.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const paths = execFileSync(
  "git",
  ["diff", "--name-only", "2f7b42d6", "--", "packages", "lab/bench"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const contractFiles = fs
  .readdirSync("lab/acceptance", { recursive: true })
  .map((p) => "lab/acceptance/" + p)
  .filter((p) => fs.statSync(p).isFile());
const changed = paths.map((p) => ({
  path: p,
  oldSha256: sha(execFileSync("git", ["show", "2f7b42d6:" + p])),
  newSha256: sha(fs.readFileSync(p)),
  referencedBy: contractFiles.filter((f) => fs.readFileSync(f, "utf8").includes(p)),
}));
if (execFileSync("git", ["diff", "2f7b42d6", "--", "lab/acceptance"], { encoding: "utf8" }).trim())
  throw Error("Contract changed");
fs.writeFileSync(
  "lab/experiments/EXP-QH1/pin-changes.json",
  JSON.stringify({ contractUnchanged: true, base: "2f7b42d6", changed }, null, 2) + "\n",
);
