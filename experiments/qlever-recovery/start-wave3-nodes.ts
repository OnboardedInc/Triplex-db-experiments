import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../../packages/qlever/src/QleverClient.js";
const run = promisify(execFile),
  stamp = Date.now();
const inspect = async (name: string) =>
  JSON.parse((await run("docker", ["inspect", name])).stdout)[0];
const original = await inspect("triplex-qlever-local");
if (original.HostConfig.Memory !== 4 * 1024 ** 3 || original.HostConfig.NanoCpus !== 4e9)
  throw new Error("Original profile changed");
if (original.State.Running) {
  const active = await makeQleverClient("http://127.0.0.1:7019").command("dump-active-queries", {
    timeoutMs: 3000,
  });
  if (Object.keys(active as object).length)
    throw new Error("Original node has active work; no switch");
  await run("docker", ["stop", "-t", "5", "triplex-qlever-local"], { timeout: 15000 });
}
const stopped = await inspect("triplex-qlever-local");
if (stopped.State.Running || stopped.State.Pid !== 0)
  throw new Error("Original node must be fully stopped");
const names = ["triplex-qlever-candidate-a", "triplex-qlever-candidate-b"];
for (const name of names) {
  const node = await inspect(name);
  if (
    node.HostConfig.Memory !== 2 * 1024 ** 3 ||
    node.HostConfig.MemorySwap !== 2 * 1024 ** 3 ||
    node.HostConfig.NanoCpus !== 2e9
  )
    throw new Error("Candidate profile changed");
}
await Promise.all(names.map((name) => run("docker", ["start", name], { timeout: 10000 })));
const nodes = [];
for (const [index, name] of names.entries()) {
  const client = makeQleverClient(`http://127.0.0.1:${7021 + index}`);
  let stats: unknown;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      stats = await client.command("stats", { timeoutMs: 500 });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!stats) throw new Error("Candidate did not become ready");
  const item = await inspect(name);
  nodes.push({
    name,
    state: item.State,
    profile: {
      memory: item.HostConfig.Memory,
      memorySwap: item.HostConfig.MemorySwap,
      cpu: item.HostConfig.NanoCpus,
      arguments: item.Config.Cmd,
    },
    stats,
    restartedDefaultSettings: await client.command("get-settings", { timeoutMs: 3000 }),
  });
}
const artifact = {
  at: new Date().toISOString(),
  originalStoppedState: stopped.State,
  nodes,
  retainedExistingDatasets: true,
  noResets: true,
  noResizing: true,
  aggregateQleverMemoryBytes: nodes.reduce((sum, node) => sum + node.profile.memory, 0),
  claim:
    "Lifecycle switch only; restarted default planner values are recorded, Wave3 must set/read back its predeclared planner100 separately",
};
const path = `qualification/evidence/qlever-wave3-node-switch-${stamp}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify({
    path,
    ready: true,
    originalPid: stopped.State.Pid,
    aggregateMemory: artifact.aggregateQleverMemoryBytes,
  }),
);
