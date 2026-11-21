import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { openSnapshot } from "./snapshot.ts";

export const publicPlayground = "https://pub-ce341b872a624227b638159be9f32a71.r2.dev";
const bucket = "triplex-playground-data";
type ObjectInfo = { key: string; bytes: number; sha256: string };

export async function publicObject(base: string, item: ObjectInfo) {
  const url = new URL(item.key, base + "/");
  assert.equal(url.origin, publicPlayground);
  const response = await fetch(url, {
    headers: { "accept-encoding": "identity" },
    redirect: "error",
    signal: AbortSignal.timeout(180_000),
  });
  if (response.status === 404) {
    await response.body?.cancel();
    return false;
  }
  if (!response.ok || !response.body)
    throw new Error("Public R2 read failed with status " + response.status);
  const digest = createHash("sha256");
  let bytes = 0;
  for await (const chunk of Readable.fromWeb(response.body as never)) {
    bytes += chunk.length;
    if (bytes > item.bytes) throw new Error("Public object is larger than expected: " + item.key);
    digest.update(chunk);
  }
  if (bytes !== item.bytes || digest.digest("hex") !== item.sha256)
    throw new Error("Public object differs from the prepared bytes: " + item.key);
  return true;
}

async function put(item: ObjectInfo, path: string, temporary: string, upfront: boolean) {
  const args = [
    "r2",
    "object",
    "put",
    bucket + "/" + item.key,
    "--file",
    path,
    "--remote",
    "--force",
    "--content-type",
    item.key.endsWith(".json") ? "application/json" : "application/octet-stream",
    "--cache-control",
    "public, max-age=31536000, immutable",
  ];
  if (upfront) {
    console.log(JSON.stringify(["wrangler", ...args]));
    return;
  }
  // [DX-PLAY1] Why: preserve the logged-in identity while excluding its account banner and debug logs.
  // Rejected: recording Wrangler output or including credentials in a generated upload command.
  await new Promise<void>((done, reject) => {
    const child = spawn("wrangler", args, {
      cwd: temporary,
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: "false",
        WRANGLER_LOG_PATH: join(temporary, "debug"),
      },
      stdio: "ignore",
    });
    child.once("error", () => reject(new Error("Could not launch Wrangler")));
    child.once("exit", (code) =>
      code === 0
        ? done()
        : reject(new Error("Wrangler put failed for " + item.key + " (status " + code + ")")),
    );
  });
}

async function publish(dir: string, tier: string, commands: boolean) {
  const temporary = await mkdtemp(join(tmpdir(), "triplex-r2-"));
  try {
    await mkdir(join(temporary, "debug"));
    const bundle = await openSnapshot(dir, temporary, tier);
    const evidence = JSON.parse(await readFile(join(dirname(dir), "snapshot.json"), "utf8"));
    // [DX-PLAY1] Why: publish only the exact bundle that an isolated build restored and tore down.
    // Rejected: accepting hash-valid input from an arbitrary directory without a checked restore.
    assert.equal(evidence.manifestSha256, bundle.checksum);
    assert.equal(evidence.tier, tier);
    assert.equal(evidence.prefix, bundle.manifest.run);
    assert.deepEqual(evidence.plan, bundle.manifest.plan);
    assert.deepEqual(evidence.checkpoint, bundle.manifest.checkpoint);
    assert.deepEqual(evidence.cleanup, { ps: [], volume: [], network: [], image: [] });
    assert(evidence.collection.after.rows < evidence.collection.before.rows);
    assert(evidence.collection.after.bytes < evidence.collection.before.bytes);
    const manifestPath = join(dir, "manifest.json");
    const manifest = await readFile(manifestPath);
    assert.equal(createHash("sha256").update(manifest).digest("hex"), bundle.checksum);
    const prefix = "v0.1/" + tier + "/" + bundle.checksum.slice(0, 16);
    const objects = bundle.manifest.objects.map(({ file, bytes, sha256 }, i) => ({
      item: { key: prefix + "/" + file, bytes, sha256 },
      path: bundle.inputs[i]!,
    }));
    objects.push({
      item: { key: prefix + "/manifest.json", bytes: manifest.length, sha256: bundle.checksum },
      path: manifestPath,
    });
    // [DX-PLAY1] Why: the manifest is the publication pointer, visible only after every chunk is read back.
    // Rejected: a mutable tier root that can offer mixed versions during upload.
    for (const { item, path } of objects) {
      if (commands) await put(item, path, temporary, true);
      else {
        if (!(await publicObject(publicPlayground, item))) await put(item, path, temporary, false);
        assert(
          await publicObject(publicPlayground, item),
          "Uploaded object is unavailable: " + item.key,
        );
      }
    }
    if (!commands)
      console.log(
        JSON.stringify(
          {
            base: publicPlayground + "/" + prefix + "/",
            sha256: bundle.checksum,
            objects: objects.map(({ item }) => item),
          },
          null,
          2,
        ),
      );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [dir, tier, flag, ...extra] = process.argv.slice(2);
  if (!dir || !tier || (flag && flag !== "--commands") || extra.length)
    throw new Error("Usage: node examples/playground/r2.ts BUNDLE TIER [--commands]");
  await publish(resolve(dir), tier, flag === "--commands");
}
