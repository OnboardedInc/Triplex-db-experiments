// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-FD01-R3] Why: rerun QA's unequal-process-origin counterexample with producer-owned durable bytes.
// Rejected: substituting deterministic labels or treating a failed import as rejection.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "../../../..");
const host = createRequire(path.join(root, "packages/host/package.json"))(
  "@triplex-build/triplex-host/feed",
);
const { publicationLagMs } = createRequire(path.join(root, "packages/core/package.json"))(
  "@triplex-build/triplex/feed",
);
const key = { source: "generic/source", stream: "s", epoch: "1", position: "1" };
if (process.argv[2] === "child") {
  const clock = host.openHostFeedClock();
  const writer =
    process.argv[3] === "source"
      ? host.openPublicationWriter(process.argv[4], key.source, key.stream, clock)
      : null;
  const lines = createInterface({ input: process.stdin });
  process.stdout.write("ready\n");
  for await (const line of lines) {
    if (line !== "sample") throw new Error("Unexpected request");
    const observation = writer
      ? writer.publish(key, "source-log-position-1")
      : host.captureFeedInstant(clock, key);
    process.stdout.write(
      JSON.stringify({
        observation,
        relativeMs: performance.now(),
        originMs: performance.timeOrigin,
      }) + "\n",
    );
  }
  writer?.close();
} else {
  const disk = spawnSync("df", ["-k", root], { encoding: "utf8" });
  assert.equal(disk.status, 0);
  assert.ok(
    Number(disk.stdout.trim().split("\n").at(-1).trim().split(/\s+/)[3]) * 1024 >= 5 * 1024 ** 3,
    "Disk below 5 GiB",
  );
  const base = path.join(
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01",
    "round3-cross-" + randomUUID(),
  );
  fs.mkdirSync(base, { recursive: true });
  const tracked = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(tracked.status, 0);
  const files = tracked.stdout
    .trim()
    .split("\n")
    .filter((f) =>
      /^(packages\/(core|host|testkit)\/|lab\/bench\/|lab\/experiments\/EXP-FD01\/round3\/)/.test(
        f,
      ),
    );
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  files.push(
    ...["core", "host"].flatMap((p) =>
      walk(path.join(root, "packages", p, "dist")).map((f) => path.relative(root, f)),
    ),
  );
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  const hashes = Object.fromEntries(
    files.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]),
  );
  fs.writeFileSync(
    path.join(base, "source.json"),
    JSON.stringify({ slot: null, engines: false, source: hashes }, null, 2),
  );
  const children = [];
  const start = async (role) => {
    const p = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), "child", role, path.join(base, "publication.db")],
      { stdio: ["pipe", "pipe", "inherit"] },
    );
    children.push(p);
    const lines = createInterface({ input: p.stdout });
    assert.deepEqual(await once(lines, "line"), ["ready"]);
    return { p, lines };
  };
  const sample = async ({ p, lines }) => {
    const next = once(lines, "line");
    p.stdin.write("sample\n");
    return JSON.parse((await next)[0]);
  };
  try {
    const source = await start("source");
    await new Promise((r) => setTimeout(r, 250));
    const consumer = await start("consumer");
    const published = await sample(source);
    await new Promise((r) => setTimeout(r, 400));
    const known = await sample(consumer);
    const reader = host.openPublicationReader(path.join(base, "publication.db"));
    const producerRecord = host.readProducerPublication(reader, key);
    const reported = publicationLagMs(published.observation, known.observation, producerRecord);
    const legacy = known.relativeMs - published.relativeMs;
    assert.deepEqual(producerRecord, published.observation);
    assert.deepEqual(published.observation.domain, known.observation.domain);
    assert.equal(
      reported,
      Number(BigInt(known.observation.atNs) - BigInt(published.observation.atNs)) / 1e6,
    );
    assert.ok(reported > 350);
    assert.ok(legacy >= 0 && legacy < 250, `QA counterexample not reproduced: ${legacy}`);
    assert.throws(
      () =>
        publicationLagMs(
          {
            ...published.observation,
            atNs: String(BigInt(published.observation.atNs) + 100000000n),
          },
          known.observation,
          producerRecord,
        ),
      /producer record/,
    );
    assert.throws(
      () =>
        publicationLagMs(
          published.observation,
          { ...known.observation, domain: { ...known.observation.domain, boot: "c".repeat(64) } },
          producerRecord,
        ),
      /clock origin/,
    );
    assert.throws(
      () => host.captureFeedInstant({ domain: known.observation.domain }, key),
      /Unbound feed clock/,
    );
    assert.throws(
      () => host.readProducerPublication({ get: () => producerRecord, close: () => {} }, key),
      /Unbound producer/,
    );
    reader.close();
    const sourceUnchanged = files.every(
      (f) => sha(fs.readFileSync(path.join(root, f))) === hashes[f],
    );
    assert.ok(sourceUnchanged);
    const result = {
      base,
      published,
      known,
      producerRecord,
      legacyRelativeLagMs: legacy,
      boundHostLagMs: reported,
      legacyUnderBar: legacy <= 250,
      boundUnderBar: reported <= 250,
      lateMapRejected: true,
      foreignBootRejected: true,
      callbackClockRejected: true,
      unboundReaderRejected: true,
      sourceUnchanged,
    };
    fs.writeFileSync(path.join(base, "result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally {
    for (const p of children) p.stdin.end();
    await Promise.all(children.map((p) => once(p, "exit").then(([code]) => assert.equal(code, 0))));
  }
}
