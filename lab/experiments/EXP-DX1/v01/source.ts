import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 ** 2 }).trim();
export const pgImage = "postgres:17-alpine@sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32";
export const nodeImage = "node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9";
export const datomicImage = "tx2-datomic:1.0.7745-da00";
export const packages = ["core", "datomic", "host", "qualification", "w0"];

export function cleanSource(expected: string, fresh = false) {
  assert.match(expected, /^[a-f0-9]{40}$/);
  assert.equal(git("rev-parse", "HEAD"), expected, "Checkout does not match requested commit");
  assert.equal(git("status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"), "", "Checkout has uncommitted inputs");
  const flags = git("ls-files", "-vz").split("\0").filter(Boolean);
  assert(flags.every((line) => line.startsWith("H ")), "Checkout has hidden index entries");
  for (const root of ["lab/config/datomic", "packages/datomic/gateway"]) {
    assert.equal(git("ls-files", "--others", "--", root), "", "Unpinned image input under " + root);
  }
  if (fresh) {
    assert(!fs.existsSync("node_modules"), "Build from a fresh clone");
    for (const pkg of packages) assert(!fs.existsSync(`packages/${pkg}/dist`), "Existing package output " + pkg);
    assert.equal(git("ls-files", "--others", "--directory"), "", "Fresh clone has unpinned files");
  }
  return expected;
}

export function packageBytes() {
  const files: Record<string, string> = {};
  for (const pkg of packages) {
    const dir = `packages/${pkg}/dist`;
    const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
    assert(entries.some((e) => e.isFile()), "Missing package build " + pkg);
    for (const entry of entries) {
      assert(entry.isFile() || entry.isDirectory(), "Unexpected package build entry");
      if (entry.isFile()) {
        const file = path.join(entry.parentPath, entry.name);
        files[file] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      }
    }
  }
  return files;
}

export function imageId(reference: string) {
  return execFileSync("docker", ["--host", "unix:///var/run/docker.sock", "image", "inspect", "--format", "{{.Id}}", reference], { encoding: "utf8" }).trim();
}

export function serverImages() {
  for (const reference of [pgImage, nodeImage]) {
    assert.equal(imageId(reference), imageId(reference.split("@")[0]!), "Mutable tag does not match pinned image");
  }
  return Object.fromEntries([pgImage, nodeImage, datomicImage].map((ref) => [ref, imageId(ref)]));
}

export function verifyBuild(source: string, file?: string) {
  assert(file && path.isAbsolute(file), "Set DX_V01_BUILD_RECEIPT to the clean-build receipt");
  const build = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(build.source, source);
  assert.deepEqual(packageBytes(), build.packages);
  assert.deepEqual(serverImages(), build.images);
}
