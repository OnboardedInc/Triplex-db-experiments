import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { loadFixture } from "./fixture.ts";
import type { Reply } from "./actions.ts";
import { dockerClient, loopback, port, repo, Stack } from "./stack.ts";

const usage = `pnpm playground start [--port 4186] [--write-port 8486] [--read-port 8487] [--larger | --tier NAME --data SOURCE [--replay]]
pnpm playground stop
node examples/playground/cli.ts mcp [--port 4186]`;
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "4186" },
    "write-port": { type: "string", default: "8486" },
    "read-port": { type: "string", default: "8487" },
    larger: { type: "boolean" },
    tier: { type: "string", default: "small" },
    data: { type: "string" },
    replay: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});
const [cmd] = positionals;
const state = join(repo, ".runtime/playground");
const file = join(state, "owner.json");
const directory = join(state, "stack");
type Owner = {
  prefix: string;
  token: string;
  port: number;
  pid: number;
  dockerHost: string;
  context?: string;
};
const pnpm = (argv: string[], signal: AbortSignal) =>
  new Promise<void>((done, reject) => {
    signal.throwIfAborted();
    const store = process.env["PLAYGROUND_PNPM_STORE"];
    const child = spawn(
      "pnpm",
      [...(store ? ["--config.store-dir=" + resolve(store)] : []), ...argv],
      {
        cwd: repo,
        stdio: "inherit",
        signal,
      },
    );
    child.once("error", reject);
    child.once("exit", (status, killedBy) =>
      status === 0
        ? done()
        : reject(new Error("Playground workspace setup failed: " + (killedBy ?? status))),
    );
  });

function pidExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
async function readOwner(): Promise<Owner | undefined> {
  try {
    const found = JSON.parse(await readFile(file, "utf8")) as Owner;
    if (
      !/^tx2-dxplay1-[a-f0-9]{12}$/.test(found.prefix) ||
      !/^[a-f0-9]{48}$/.test(found.token) ||
      !Number.isSafeInteger(found.pid) ||
      found.pid < 1 ||
      typeof found.dockerHost !== "string"
    )
      throw new Error("Invalid playground state");
    port(String(found.port));
    return found;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
}

function checkPortableDocker(dockerHost: string) {
  // Lab execution is admitted by the engine adapter, which calls openInstance directly.
  if (dockerHost.includes("/.colima/triplex2/"))
    throw new Error("The private lab daemon requires the engine.mjs play1 gate");
  if (!/^(?:unix:\/\/|npipe:\/\/|tcp:\/\/(?:127\.0\.0\.1|localhost):)/.test(dockerHost))
    throw new Error("Choose a Docker daemon on this machine");
}

function dockerSettings() {
  const explicitHost = process.env["DOCKER_HOST"];
  const context = process.env["DOCKER_CONTEXT"];
  if (explicitHost && !context) return { dockerHost: explicitHost };
  const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8" }).trim();
  const selected = context ?? docker(["context", "show"]);
  const dockerHost = docker([
    "context",
    "inspect",
    selected,
    "--format",
    "{{.Endpoints.docker.Host}}",
  ]);
  return { dockerHost, context: selected };
}

async function start() {
  if (existsSync(state))
    throw new Error("The playground already has a run. Use pnpm playground stop first.");
  const { readSnapshot, tierName } = await import("./snapshot.ts");
  if (
    !tierName.test(values.tier) ||
    (values.larger && values.tier !== "small") ||
    (values.data && values.tier === "small") ||
    (values.replay && values.tier !== "full")
  )
    throw new Error(usage);
  const settings = dockerSettings();
  checkPortableDocker(settings.dockerHost);
  const ports = {
    api: port(values.port),
    write: port(values["write-port"]),
    read: port(values["read-port"]),
  };
  const explicit = Object.values(ports).filter(Boolean);
  if (new Set(explicit).size !== explicit.length)
    throw new Error("Use a different port for each listener");
  const { openInstance } = await import("./instance.ts");
  const prefix = "tx2-dxplay1-" + randomBytes(6).toString("hex");
  const owner: Owner = {
    prefix,
    token: randomBytes(24).toString("hex"),
    port: ports.api,
    pid: process.pid,
    ...settings,
  };
  const abort = new AbortController();
  const stop = () => abort.abort();
  let instance: Awaited<ReturnType<typeof openInstance>> | undefined;
  await mkdir(join(repo, ".runtime"), { recursive: true });
  await mkdir(state, { mode: 0o700 });
  try {
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await writeFile(file, JSON.stringify(owner), { mode: 0o600, flag: "wx" });
    const source = values.data ?? process.env["PLAYGROUND_DATA_URL"];
    if (values.tier !== "small" && !source)
      throw new Error("Set PLAYGROUND_DATA_URL or pass --data for the chosen tier");
    const fixture = async (signal: AbortSignal) => {
      // [DX-PLAY1] Why: the clean-clone path installs and builds only its committed workspace inputs.
      // Rejected: needing generated dist files, a global tsx install or an unpublished package.
      await pnpm(
        [
          "--filter",
          "triplex-monorepo",
          "--filter",
          "triplex-playground...",
          "install",
          "--frozen-lockfile",
        ],
        signal,
      );
      await pnpm(
        [
          "exec",
          "turbo",
          "run",
          "build",
          "--cache-dir",
          join(repo, ".turbo/playground"),
          "--filter=@triplex-build/triplex-datomic...",
          "--filter=@triplex-build/triplex-http...",
        ],
        signal,
      );
      if (values.tier === "small") return loadFixture(values.larger);
      const { manifestReader, readBundle } = await import("./bundle.ts");
      const reader = await manifestReader(source!, join(repo, ".cache/playground-data"), signal);
      const format = (JSON.parse(reader.initial.toString("utf8")) as { version: number }).version;
      if (!values.replay && format !== 2) return readSnapshot(reader, values.tier);
      if (values.tier !== "full") throw new Error("A replay bundle requires --tier full");
      const bundle = await readBundle(reader, signal);
      if (bundle.manifest.tier !== "full") throw new Error("Full tier requires a full manifest");
      return bundle;
    };
    instance = await openInstance({
      prefix,
      token: owner.token,
      docker: dockerClient(owner.dockerHost, owner.context),
      directory,
      ports,
      apiPort: ports.api,
      signal: abort.signal,
      fixture,
    });
    owner.port = instance.server.port;
    await writeFile(file, JSON.stringify(owner), { mode: 0o600 });
    console.log("Starting the Datomic stack and loading synthetic data…");
    await instance.ready;
    console.log(`Triplex playground: ${instance.server.url}`);
    console.log(`OpenAPI: ${instance.server.url}/openapi.json\nMCP: ${instance.server.url}/mcp`);
    if (!instance.signal.aborted)
      await new Promise<void>((resolve) =>
        instance!.signal.addEventListener("abort", () => resolve(), { once: true }),
      );
  } catch (error) {
    if (!abort.signal.aborted && !instance?.signal.aborted) throw error;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    await instance?.close();
    await rm(state, { recursive: true, force: true });
  }
}

async function stop() {
  const owner = await readOwner();
  if (!owner) {
    if (existsSync(state)) throw new Error("Run directory is being initialized or has no owner");
    console.log("The playground is stopped.");
    return;
  }
  checkPortableDocker(owner.dockerHost);
  if (pidExists(owner.pid)) {
    const response = await fetch(`http://${loopback}:${owner.port}/internal/stop`, {
      method: "POST",
      headers: { authorization: "Bearer " + owner.token },
      signal: AbortSignal.timeout(3000),
    });
    if (response.status !== 202) throw new Error("The process refused the stop request");
    const until = Date.now() + 150_000;
    while (existsSync(file) && pidExists(owner.pid)) {
      if (Date.now() > until) throw new Error("Shutdown is still waiting for its Docker resources");
      await delay(400);
    }
  }
  if (existsSync(file)) {
    const again = await readOwner();
    if (again?.prefix !== owner.prefix || pidExists(owner.pid))
      throw new Error("The playground owner changed");
    await new Stack({
      prefix: owner.prefix,
      directory,
      ports: { write: 0, read: 0 },
      docker: dockerClient(owner.dockerHost, owner.context),
    }).stop();
    await rm(state, { recursive: true, force: true });
  }
  console.log("Stopped the playground and removed its database.");
}

async function mcp() {
  const { stdio } = await import("./mcp.ts");
  const owner = await readOwner();
  const target = `http://${loopback}:${owner?.port ?? port(values.port)}`;
  await stdio(async (action, body) => {
    const response = await fetch(`${target}/api/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(40_000),
    });
    return { status: response.status, reply: (await response.json()) as Reply };
  });
}

if (values.help || cmd === undefined) console.log(usage);
else {
  if (positionals.length !== 1) throw new Error(usage);
  if (cmd === "start") await start();
  else if (cmd === "stop") await stop();
  else if (cmd === "mcp") await mcp();
  else throw new Error(usage);
}
