import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, readFileSync, readdirSync, statfsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bytes, sha } from "./source.ts";
const dir = process.env.DX_IMPORT_EVIDENCE!,
  p = "lab/experiments/EXP-DX1/import1/",
  mode = process.argv[2];
assert(dir && ["--proof", "--curve", "--reverse"].includes(mode!));
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD"),
  ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER!,
  owner = readFileSync(ownerFile),
  o = JSON.parse(owner.toString());
const cfg = join(process.env.TX2_CONFIG_DIR!, "lab/config/slots.json"),
  config = readFileSync(cfg);
assert(
  o.holder === "DX-ACT1" &&
    o.mode === "exclusive" &&
    o.lane === "datomic" &&
    o.endpoint === process.env.DATOMIC_URL,
);
const paths = git(
  "ls-files",
  "lab/experiments/EXP-DX1/import1",
  "lab/bench/lib",
  "packages/datomic/src",
  "packages/datomic/gateway",
  "lab/oracles/replay",
  "pnpm-lock.yaml",
  "lab/bin/engine.mjs",
)
  .split("\n")
  .filter((f) => !f.endsWith(".md") && !f.endsWith("SHA256SUMS"));
const pins: Record<string, string> = {};
for (const file of paths) {
  const content = readFileSync(file);
  assert.equal(
    sha(content),
    sha(execFileSync("git", ["show", head + ":" + file], { maxBuffer: 16 << 20 })),
  );
  pins[file] = sha(content);
}
for (const pkg of ["core", "host", "qualification", "datomic", "w0"]) {
  const root = "packages/" + pkg + "/dist";
  for (const f of readdirSync(root, { recursive: true, encoding: "utf8" }))
    if (f.endsWith(".js")) pins[join(root, f)] = sha(readFileSync(join(root, f)));
}
const attempt = {
  nonce: randomUUID(),
  head,
  owner: sha(owner),
  slot: o.container,
  config: sha(config),
  image: JSON.parse(config.toString()).lanes.datomic.imageId,
  source: sha(bytes(pins)),
  mode,
};
const put = (f: string, data: unknown) =>
  writeFileSync(join(dir, f), bytes(data) + "\n", { flag: "wx" });
put("input-files.json", pins);
put("attempt.json", attempt);
const run = (file: string, args: string[]) => {
  const disk = statfsSync(dir);
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, "Host free below 5 GiB");
  execFileSync(process.execPath, ["--experimental-strip-types", p + file, ...args], {
    stdio: "inherit",
  });
};
if (mode === "--proof") {
  run("proof.ts", ["--native-proof", join(dir, "oracle")]);
  run("edges.ts", [join(dir, "edges")]);
  run("price.ts", [join(dir, "price"), "48"]);
  run("behind.ts", [join(dir, "behind.json")]);
  run("fair.ts", [join(dir, "fair")]);
} else
  run("campaign.ts", [
    "local",
    join(dir, "curve"),
    "1",
    "3600",
    ...(mode === "--reverse" ? ["--control-first"] : []),
  ]);
assert.equal(git("rev-parse", "HEAD"), head);
assert.equal(sha(readFileSync(ownerFile)), attempt.owner);
assert.equal(sha(readFileSync(cfg)), attempt.config);
for (const [f, d] of Object.entries(pins)) assert.equal(sha(readFileSync(f)), d, f);
const outputs: Record<string, string> = {};
for (const f of readdirSync(dir, { recursive: true, withFileTypes: true })) {
  if (!f.isFile()) continue;
  const path = join(f.parentPath, f.name),
    h = createHash("sha256");
  for await (const b of createReadStream(path)) h.update(b);
  if (f.name !== "output.log") outputs[path.slice(dir.length + 1)] = h.digest("hex");
}
put("verified.json", { ...attempt, outputs });
