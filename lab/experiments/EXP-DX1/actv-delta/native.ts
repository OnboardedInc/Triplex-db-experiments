import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { headSha, sources, stamp } from "./binding.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";
import { checkSchedules } from "../act1/bench-proof.ts";
const [mode, dir] = process.argv.slice(2);
const owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!),
  slot = JSON.parse(owner.toString()),
  identity = JSON.parse(fs.readFileSync(path.join(dir, "native.json"), "utf8"));
assert(
  slot.holder === "DX-ACT2" &&
    slot.mode === "exclusive" &&
    slot.endpoint === process.env.DATOMIC_URL &&
    sha256(owner) === identity.ownerHash,
);
process.env.DELTA_GATE = mode;
const start = stamp(),
  attempt = {
    nonce: identity.nonce,
    scope: "delta-" + identity.nonce,
    identity: sha256(JSON.stringify(identity)),
    source: headSha(),
    sources: sources(),
  };
fs.writeFileSync(path.join(dir, "attempt.json"), JSON.stringify(attempt) + "\n", { flag: "wx" });
process.env.DELTA_ATTEMPT = dir;
if (mode === "schedules") {
  for (const [name, files] of [
    ["original", ["../act1/guard.test.ts", "../act1/page.test.ts"]],
    ["delta", ["schedules.test.ts"]],
  ] as const) {
    const out = path.join(dir, name + ".tap"),
      fd = fs.openSync(out, "wx");
    try {
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--test",
          "--test-concurrency=1",
          ...files.map((f) => path.join(import.meta.dirname, f)),
        ],
        { stdio: ["ignore", fd, fd], timeout: 600000 },
      );
    } finally {
      fs.closeSync(fd);
    }
    const tap = fs.readFileSync(out, "utf8");
    if (name === "original") checkSchedules(tap);
    else {
      const names = [
        ...fs
          .readFileSync(path.join(import.meta.dirname, "schedules.test.ts"), "utf8")
          .matchAll(/^test\("([^"]+)"/gm),
      ].map((m) => m[1]);
      assert(names.length >= 4);
      assert.deepEqual(
        [...tap.matchAll(/^ok \d+ - (.+)$/gm)].map((m) => m[1]),
        names,
      );
      for (const line of ["# pass " + names.length, "# fail 0", "# skipped 0", "# cancelled 0"])
        assert(tap.split("\n").includes(line));
    }
  }
} else {
  const worker = await import("./" + mode + ".ts");
  await worker.run(dir, attempt);
}
assert.equal(start, stamp(), "gate sources changed during execution");
assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(owner));
