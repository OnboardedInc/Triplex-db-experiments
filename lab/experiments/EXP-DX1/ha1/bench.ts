import assert from "node:assert/strict";
import fs from "node:fs";
import { createInterface } from "node:readline";
import { isIPv4 } from "node:net";
import { Evidence, head, modeOf, root, runFile, supportsSingleHost } from "./common.ts";
import { projection, type MovePoint } from "./projection.ts";
import path from "node:path";
import { drill } from "./run.ts";
import type { Site } from "./stack.ts";

const [
  mode,
  tag,
  sha,
  addrA,
  addrB,
  remoteImage,
  store,
  campaign,
  people,
  shape = "deep",
  layout = "two-host",
] = process.argv.slice(2);
const single = layout === "one-host";
assert(layout === "two-host" || (single && mode && supportsSingleHost(modeOf(mode))));
assert(process.platform === "linux" && head() === sha && sha?.match(/^[a-f0-9]{40}$/));
assert(
  tag &&
    /^[a-z][a-z0-9-]{2,40}$/.test(tag) &&
    mode &&
    (single ? addrA === "-" && addrB === "-" : addrA !== addrB),
);
export function privateAddress(s: string) {
  assert(isIPv4(s));
  const [a, b] = s.split(".").map(Number);
  assert(
    a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168),
    "A dedicated private link is required",
  );
  return s;
}
assert(remoteImage && (single ? remoteImage === "-" : /^sha256:[a-f0-9]{64}$/.test(remoteImage)));
assert(store && campaign && /^[a-f0-9-]{36}$/.test(campaign));
const waiters = new Map<number, { ok: (s: string) => void; fail: (err: Error) => void }>();
let seq = 0;
const stream = createInterface({ input: process.stdin });
stream.on("line", (line) => {
  const v = JSON.parse(line),
    p = waiters.get(v.id);
  assert(p, "Unknown management response");
  waiters.delete(v.id);
  if (v.error) p.fail(Object.assign(Error(v.error), { stderr: v.error }));
  else p.ok(v.out);
});
stream.on("close", () => {
  for (const p of waiters.values()) p.fail(Error("Second host management channel closed"));
});
const local: Site["docker"] = async (args, opts = {}) => {
  const v = await runFile("docker", ["-H", "unix:///var/run/docker.sock", ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 2 ** 20,
    timeout: 120000,
    ...opts,
  });
  return (v.stdout + (args[0] === "logs" ? v.stderr : "")).trim();
};
const a: Site = {
  key: "a",
  repo: root,
  ...(single ? {} : { privateAddress: privateAddress(addrA!) }),
  docker: local,
  datomicId: await local(["image", "inspect", "tx2-datomic:1.0.7745-da00", "--format", "{{.Id}}"]),
};
const b: Site = single
  ? a
  : {
      key: "b",
      repo: root,
      privateAddress: privateAddress(addrB!),
      datomicId: remoteImage,
      docker: async (args, opts = {}) => {
        const id = ++seq;
        const reply = new Promise<string>((ok, fail) => waiters.set(id, { ok, fail }));
        process.stdout.write("@ha1 " + JSON.stringify({ id, args, timeout: opts.timeout }) + "\n");
        return reply;
      },
    };
fs.mkdirSync(store, { recursive: false });
try {
  const defaults: Record<string, string> = {
    "load-profile": "260",
    "load-proof": "60",
    "load-quiet": "100000,1000000",
    "load-live": "50,235,390",
    "load-tail": "50",
    "load-micro": "50",
    "load-volume": "50",
    "load-frontier-low": "50,100",
    "load-frontier-high": "50,100",
    "load-frontier-allowance": "50,100",
    "load-split-sql": "50,100",
    "load-split-pg": "50,100",
    failures: "2000",
    move: "500,2000,5000",
    replication: "1",
    "one-failover": "1000,10000,100000,1000000",
    "one-backup": "1000,10000,100000,1000000",
    "one-whole": "1000,10000,100000,1000000",
    "one-account": "100,1000,10000,100000",
    "one-sync": "1000",
  };
  assert(shape === "deep" || shape === "mixed");
  const sizes = (people || defaults[mode]!).split(",").map(Number);
  assert(
    sizes.length &&
      sizes.every(
        (n) =>
          Number.isSafeInteger(n) &&
          n > 0 &&
          n <= (mode.startsWith("one-") || mode === "load-quiet" ? 1500000 : 100000),
      ),
  );
  fs.writeFileSync(
    path.join(store, "campaign.json"),
    JSON.stringify({ tag, sha, mode, campaign, sizes, shape, layout }) + "\n",
    { flag: "wx" },
  );
  const points: MovePoint[] = [];
  for (const n of sizes) {
    const e = new Evidence(store, modeOf(mode), tag, shape);
    process.stdout.write("@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix }) + "\n");
    await drill(
      e,
      a,
      b,
      { people: n, scopes: mode.startsWith("load-") ? 1 : 5, capacity: layout },
      () => {},
    );
    if (mode === "move") {
      const { seedFacts, finalBytes, pauseMs, setupThroughCutoverMs } = JSON.parse(
        fs.readFileSync(path.join(e.dir, "move.json"), "utf8"),
      );
      points.push({ seedFacts, finalBytes, pauseMs, setupThroughCutoverMs });
    }
  }
  if (points.length)
    fs.writeFileSync(
      path.join(store, "projection.json"),
      JSON.stringify(projection(points), null, 2) + "\n",
      { flag: "wx" },
    );
} finally {
  stream.close();
}
