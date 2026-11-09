// [EXP-P4N] Why: report every changed source hash for contract-owner re-pinning; never edit the contract.
// Rejected: silently refreshing lab/acceptance after a product change.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const paths = execFileSync(
  "git",
  ["diff", "--name-only", "365fe188", "--", "packages", "lab/bench"],
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
  // [EXP-QH1-R3] Why: a file added after the base has no old hash; the audit must still list it. Rejected: failing on new files.
  oldSha256: (() => {
    try {
      return sha(
        execFileSync("git", ["show", "365fe188:" + p], { stdio: ["ignore", "pipe", "ignore"] }),
      );
    } catch {
      return null;
    }
  })(),
  newSha256: sha(fs.readFileSync(p)),
  referencedBy: contractFiles.filter((f) => fs.readFileSync(f, "utf8").includes(p)),
}));
if (execFileSync("git", ["diff", "365fe188", "--", "lab/acceptance"], { encoding: "utf8" }).trim())
  throw Error("Contract changed");
fs.writeFileSync(
  "lab/experiments/EXP-P4N/pin-changes.json",
  JSON.stringify({ contractUnchanged: true, base: "365fe188", changed }, null, 2) + "\n",
);
