import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { open, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { liveGate } from "../../../../examples/playground/live-gate.ts";
import { publicPlayground } from "../../../../examples/playground/r2.ts";
import { manifestReader } from "../../../../examples/playground/bundle.ts";
import { parseSnapshot } from "../../../../examples/playground/snapshot.ts";
import { repo, Stack } from "../../../../examples/playground/stack.ts";

const run = promisify(execFile);
type Inputs = {
  out: string;
  stack: Stack;
  prefix: string;
  ownerFile: string;
  head: string;
  slot: string;
  host: string;
  tier: string;
  source: string;
  sha256: string;
  store: string;
  signal: AbortSignal;
  chromium: (url: string, cwd: string) => Promise<void>;
};
const get = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

export async function roundTrip(input: Inputs) {
  const { out, tier, source } = input;
  assert(/^[a-f0-9]{64}$/.test(input.sha256));
  const url = new URL(source);
  assert.equal(url.origin, publicPlayground);
  assert.equal(
    url.href,
    publicPlayground + "/v0.1/" + tier + "/" + input.sha256.slice(0, 16) + "/",
  );
  const checkout = join(out, "clone");
  try {
    return await fromClone(input, checkout);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}

async function fromClone(input: Inputs, checkout: string) {
  const { out, stack, prefix, head, ownerFile, tier, source, store, signal } = input;
  const manifest = await manifestReader(source, join(out, "manifest-probe"), signal);
  assert.equal(manifest.checksum, input.sha256);
  const named = parseSnapshot(manifest.initial, tier);
  // [DX-PLAY1] Why: the gate clones the exact published tree without copying the lab's large Git object store.
  // Rejected: inheriting workspace node_modules, a build output or data cache from the builder.
  await run("git", ["clone", "--quiet", "--shared", "--no-checkout", repo, checkout], { signal });
  await run("git", ["checkout", "--quiet", "--detach", head], { cwd: checkout, signal });
  assert.equal(get(checkout, "rev-parse", "HEAD"), head);
  assert.equal(get(checkout, "status", "--porcelain"), "");
  for (const path of ["node_modules", ".runtime", ".cache", "packages/datomic/dist"])
    assert(!existsSync(join(checkout, path)), "Clone inherited " + path);
  assert.deepEqual(await stack.inventory(), { ps: [], volume: [], network: [], image: [] });
  const grant = join(out, "permit.json");
  await writeFile(
    grant,
    JSON.stringify({
      prefix,
      checkout: await realpath(checkout),
      head,
      ownerFile,
      pid: process.pid,
      expires: Date.now() + 30 * 60_000,
    }),
    { mode: 0o600, flag: "wx" },
  );
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DOCKER_HOST: input.host,
    PLAYGROUND_LAB_GRANT: grant,
    PLAYGROUND_PNPM_STORE: store,
    CI: "true",
  };
  delete env.DOCKER_CONTEXT;
  delete env.PLAYGROUND_DATA_URL;
  const args = [
    "--config.store-dir=" + store,
    "playground",
    "start",
    "--tier",
    tier,
    "--data",
    source,
    "--port",
    "0",
    "--write-port",
    "0",
    "--read-port",
    "0",
  ];
  const owner = join(checkout, ".runtime/playground/owner.json");
  const output = await open(join(out, "start.txt"), "wx");
  const starting = performance.now();
  const child = spawn("pnpm", args, {
    cwd: checkout,
    env,
    stdio: ["ignore", output.fd, output.fd],
  });
  const exit = new Promise<number>((done) => {
    child.once("error", () => done(1));
    child.once("exit", (code) => done(code ?? 1));
  });
  let status: number | undefined;
  void exit.then((code) => {
    status = code;
  });
  await output.close();
  let api = "";
  let readyMs: number | undefined;
  try {
    while (performance.now() - starting < 360_000) {
      signal.throwIfAborted();
      assert.equal(status, undefined, "The cloned playground exited before readiness");
      if (existsSync(owner)) {
        const current = await readFile(owner, "utf8")
          .then((text) => JSON.parse(text) as { prefix: string; port: number })
          .catch(() => undefined);
        if (current?.port && current.prefix === prefix) {
          api = "http://127.0.0.1:" + current.port;
          const response = await fetch(api + "/health", {
            signal: AbortSignal.timeout(2000),
          }).catch(() => undefined);
          if (response?.ok) {
            await response.body?.cancel();
            break;
          }
        }
      }
      api = "";
      await delay(500, undefined, { signal });
    }
    assert(api, "The cloned playground did not become ready");
    readyMs = performance.now() - starting;
    const actions = await liveGate(api, manifest.checksum, { plan: named.plan, cwd: checkout });
    await writeFile(join(out, "actions.json"), JSON.stringify(actions, null, 2) + "\n", {
      flag: "wx",
    });
    await input.chromium(api, checkout);
  } finally {
    try {
      const stopped = await run("pnpm", ["--config.store-dir=" + store, "playground", "stop"], {
        cwd: checkout,
        env,
        timeout: 170_000,
      });
      await writeFile(join(out, "stop.txt"), stopped.stdout + stopped.stderr, { flag: "wx" });
      const deadline = AbortSignal.timeout(15_000);
      for (;;) {
        deadline.throwIfAborted();
        if (status !== undefined) break;
        await delay(150, undefined, { signal: deadline });
      }
      assert.equal(status, 0);
      assert(!existsSync(join(checkout, ".runtime/playground")));
    } finally {
      if (status === undefined && existsSync(owner)) {
        const current = JSON.parse(await readFile(owner, "utf8")) as {
          prefix: string;
          pid: number;
        };
        if (current.prefix === prefix && Number.isSafeInteger(current.pid) && current.pid > 1) {
          try {
            process.kill(current.pid, "SIGTERM");
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
        }
      }
      if (status === undefined) {
        await Promise.race([exit, delay(5000)]);
        if (status === undefined) child.kill("SIGTERM");
      }
      await stack.stop();
      await rm(grant, { force: true });
    }
  }
  assert.deepEqual(await stack.inventory(), { ps: [], volume: [], network: [], image: [] });
  await assert.rejects(fetch(api + "/health", { signal: AbortSignal.timeout(2000) }));
  assert.equal(get(repo, "rev-parse", "HEAD"), head);
  assert.equal(get(repo, "status", "--porcelain"), "");
  await writeFile(
    join(out, "roundtrip.json"),
    JSON.stringify(
      {
        tier,
        source,
        sha256: manifest.checksum,
        head,
        slot: input.slot,
        prefix,
        readyMs,
        timingClass: "Mac diagnostic",
        checkpoint: named.checkpoint,
        objects: named.objects,
        cleanup: { ps: [], volume: [], network: [], image: [] },
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}
