// [EXP-NSR-R3] Why: every executable driver gets the same narrow file grants and mandatory runtime hook. Rejected: exporting a bundle that callers routinely run unrestricted.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import os from "node:os";
import { pathToFileURL } from "node:url";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function launchArtifact(bundle, configFile, { timeoutMs = 60000 } = {}) {
  bundle = fs.realpathSync(bundle);
  configFile = fs.realpathSync(configFile);
  const manifestFile = path.join(bundle, "manifest.json"),
    m = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (m.schema !== "ns-driver-bundle/2" || m.entry !== "driver.mjs")
    throw Error("Invalid driver artifact manifest");
  if (
    Object.keys(m.support ?? {})
      .sort()
      .join(",") !== "launch-artifact.mjs,runtime-guard.mjs"
  )
    throw Error("Missing mandatory artifact guard support");
  const metaBytes = fs.readFileSync(path.join(bundle, "metafile.json"));
  if (sha(metaBytes) !== m.metafileSha256) throw Error("Driver metafile binding mismatch");
  const meta = JSON.parse(metaBytes);
  if (
    Object.keys(meta.inputs).some(
      (p) => p.split(/[\\/]/).includes("packages") || p.startsWith(".."),
    )
  )
    throw Error("Driver metafile contains candidate/outside input");
  const outputs = Object.values(meta.outputs);
  if (
    outputs.length !== 1 ||
    outputs[0].imports.some((i) => !i.external || !i.path.startsWith("node:")) ||
    [...new Set(outputs[0].imports.map((i) => i.path))].sort().join() !==
      [...m.externals].sort().join()
  )
    throw Error("Driver runtime graph differs from bundler metafile");
  for (const [file, expected] of Object.entries({ [m.entry]: m.bundleSha256, ...m.support })) {
    if (path.basename(file) !== file || sha(fs.readFileSync(path.join(bundle, file))) !== expected)
      throw Error("Driver artifact/support binding mismatch");
  }
  const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  const output = path.resolve(config.output);
  fs.mkdirSync(output, { recursive: true });
  if (fs.realpathSync(output) !== output) throw Error("Driver output symlink refused");
  const readable = [
    manifestFile,
    path.join(bundle, m.entry),
    path.join(bundle, "runtime-guard.mjs"),
    configFile,
    fs.realpathSync(config.keyFile),
    output,
    output + "/*",
  ];
  // [EXP-NSR-R3] Why: Node 24 file grants lexically overlapping a directory grant can shadow it (UUID.key versus UUID/). Rejected: broadening the grant to their shared parent.
  for (const input of readable.slice(0, -2))
    if (input.startsWith(output) || output.startsWith(input))
      throw Error("Overlapping input/output permission paths refused");
  if (os.platform() === "linux")
    readable.push("/proc/sys/kernel/random/boot_id", "/proc/self/ns/time");
  const args = [
    "--permission",
    ...readable.map((p) => "--allow-fs-read=" + p),
    "--allow-fs-write=" + output + "/*",
    "--import",
    pathToFileURL(path.join(bundle, "runtime-guard.mjs")).href,
    path.join(bundle, m.entry),
    configFile,
  ];
  const boot =
    os.platform() === "darwin"
      ? execFileSync("/usr/sbin/sysctl", ["-n", "kern.bootsessionuuid"], {
          encoding: "utf8",
        }).trim()
      : "";
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: { PATH: process.env.PATH, NSR_BUNDLE_MANIFEST: manifestFile, NSR_DARWIN_BOOT_ID: boot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (b) => {
      stdout += b;
      if (stdout.length > 32 * 1024 * 1024) child.kill("SIGTERM");
    });
    child.stderr.on("data", (b) => {
      stderr += b;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, bundleSha256: m.bundleSha256 });
    });
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename)
  launchArtifact(process.argv[2], process.argv[3])
    .then((r) => {
      process.stdout.write(r.stdout);
      process.stderr.write(r.stderr);
      process.exitCode = r.code ?? 1;
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
