// [EXP-NSR-R3] Why: every executable driver gets the same narrow file grants and mandatory runtime hook. Rejected: exporting a bundle that callers routinely run unrestricted.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
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
      .join(",") !== "launch-artifact.mjs,layout-audit.mjs,runtime-guard.mjs"
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
  if (fs.readdirSync(output).length) throw Error("Driver output not fresh");
  // [EXP-NSR-R4] Why: candidate text must be unreadable even to vm or a replacement hook. Rejected: an in-process module policy as the isolation boundary.
  const layout = path.join(path.dirname(bundle), "runtime-" + randomUUID());
  fs.mkdirSync(layout);
  for (const name of [
    "driver.mjs",
    "runtime-guard.mjs",
    "layout-audit.mjs",
    "manifest.json",
    "metafile.json",
  ])
    fs.copyFileSync(path.join(bundle, name), path.join(layout, name), fs.constants.COPYFILE_EXCL);
  const staged = { ...config, output };
  const keyPath = fs.realpathSync(config.keyFile);
  // [EXP-NSR-R4] Why: only the fixed-size evaluator run key is declared input data. Rejected: copying arbitrary candidate source supplied through a config path.
  if (
    !keyPath.split(path.sep).some((p) => p === "packages" || p === "node_modules") &&
    fs.statSync(keyPath).size === 32
  ) {
    fs.copyFileSync(keyPath, path.join(layout, "run-key"));
    staged.keyFile = path.join(layout, "run-key");
  }
  fs.writeFileSync(path.join(layout, "config.json"), JSON.stringify(staged));
  const files = Object.fromEntries(
    fs
      .readdirSync(layout)
      .sort()
      .map((name) => [name, sha(fs.readFileSync(path.join(layout, name)))]),
  );
  const inventory = JSON.stringify({
    schema: "ns-driver-layout/1",
    bundleSha256: m.bundleSha256,
    files,
    forbiddenPaths: [configFile, keyPath, path.join(bundle, m.entry), output],
  });
  fs.writeFileSync(path.join(layout, "inventory.json"), inventory, { flag: "wx" });
  const inventorySha256 = sha(inventory);
  const receipt = {
    schema: "ns-driver-layout-receipt/1",
    nodeVersion: process.version,
    isolation:
      "Node filesystem permissions; closed layout; write-only output; module hook secondary",
    layout,
    output,
    inventorySha256,
    files: { ...files, "inventory.json": inventorySha256 },
    sourceConfigSha256: sha(fs.readFileSync(configFile)),
    bundleSha256: m.bundleSha256,
  };
  fs.writeFileSync(layout + ".receipt.json", JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
  });
  const args = [
    "--permission",
    "--allow-fs-read=" + layout,
    "--allow-fs-write=" + output + "/*",
    "--import",
    pathToFileURL(path.join(layout, "layout-audit.mjs")).href,
    "--import",
    pathToFileURL(path.join(layout, "runtime-guard.mjs")).href,
    path.join(layout, m.entry),
    path.join(layout, "config.json"),
  ];
  const boot =
    os.platform() === "darwin"
      ? execFileSync("/usr/sbin/sysctl", ["-n", "kern.bootsessionuuid"], {
          encoding: "utf8",
        }).trim()
      : "";
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: layout,
      env: {
        PATH: process.env.PATH,
        NSR_BUNDLE_MANIFEST: path.join(layout, "manifest.json"),
        NSR_LAYOUT_SHA256: inventorySha256,
        NSR_LAYOUT_ROOT: layout,
        NSR_FRESH_OUTPUT: output,
        NSR_LINUX_CLOCK:
          os.platform() === "linux"
            ? JSON.stringify({
                bootId: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
                timeNs: String(fs.statSync("/proc/self/ns/time", { bigint: true }).ino),
                primitive: "CLOCK_MONOTONIC",
              })
            : "",
        NSR_DARWIN_BOOT_ID: boot,
      },
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
      resolve({
        code,
        signal,
        stdout,
        stderr,
        bundleSha256: m.bundleSha256,
        layoutReceipt: receipt,
      });
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
