// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: bind each observation to the live slot, owner, config and exact harness bytes.
// Rejected: endpoint alone (the next holder could answer it).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { bindingMatches } from "./analysis.mjs";
import { docker, dockerStats, inspect, loadSlots, readOwner, slotInfo } from "../../bin/lib.mjs";
export const ROOT = path.resolve(import.meta.dirname, "../../..");
export const EVIDENCE = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2";
export const RECEIPTS = path.join(ROOT, "lab/experiments/EXP-P2X2/receipts");
export const hash = (b) => createHash("sha256").update(b).digest("hex");
export const sha = (f) => hash(fs.readFileSync(f));
export function bind() {
  const info = slotInfo(loadSlots(), "xtdb", "s1"),
    owner = readOwner(info),
    c = inspect(info.container);
  if (
    owner?.holder !== "CX-P2X2" ||
    !c?.State.Running ||
    c.Config.Labels["tx2.holder"] !== "CX-P2X2"
  )
    throw new Error("slot ownership mismatch");
  const ports = c.NetworkSettings.Ports["5432/tcp"];
  if (
    owner.endpoint !== info.endpoint ||
    ports?.length !== 1 ||
    ports[0].HostIp !== "127.0.0.1" ||
    ports[0].HostPort !== "5471"
  )
    throw new Error("slot endpoint mismatch");
  const frozen = JSON.parse(
    fs.readFileSync(path.join(import.meta.dirname, "config-root/lab/config/slots.json")),
  );
  if (c.Image !== frozen.lanes.xtdb.imageId) throw new Error("engine image mismatch");
  const configMount = c.Mounts.find((m) => m.Destination === "/etc/xtdb/config.yaml");
  const expected = path.join(import.meta.dirname, "config-root/xtdb-config.yaml");
  if (!configMount || sha(configMount.Source) !== sha(expected))
    throw new Error("mounted config bytes mismatch");
  if (!c.Config.Env.includes("JDK_JAVA_OPTIONS=-Xmx2g -XX:MaxDirectMemorySize=1g"))
    throw new Error("JVM caps mismatch");
  if (c.HostConfig.CpusetCpus !== "4,5" || c.HostConfig.Memory !== 3758096384)
    throw new Error("slot caps mismatch");
  const files = fs.readdirSync(import.meta.dirname).filter((f) => f.endsWith(".mjs"));
  return {
    at: new Date().toISOString(),
    head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    container: c.Id,
    startedAt: c.State.StartedAt,
    image: c.Image,
    labels: c.Config.Labels,
    configSha256: sha(configMount.Source),
    caps: {
      memory: c.HostConfig.Memory,
      cpus: c.HostConfig.NanoCpus,
      cpuset: c.HostConfig.CpusetCpus,
    },
    owner,
    files: Object.fromEntries(files.map((f) => [f, sha(path.join(import.meta.dirname, f))])),
  };
}
export function observe() {
  const binding = bind();
  const metrics = docker(["exec", "tx2-xtdb-s1", "wget", "-qO-", "http://127.0.0.1:8080/metrics"]);
  const cpus = docker(["exec", "tx2-xtdb-s1", "cat", "/proc/stat"]);
  const stats = dockerStats();
  return {
    binding,
    host: {
      loadavg: os.loadavg(),
      freeDiskBytes: Number(fs.statfsSync(ROOT).bavail) * Number(fs.statfsSync(ROOT).bsize),
    },
    vmCpuRaw: cpus,
    stats,
    metrics,
  };
}
export function quiet(o) {
  const rows = o.metrics.split("\n").filter((l) => /^compactor_jobs_available(?:\{|\s)/.test(l));
  return {
    observed: rows,
    zero: rows.length > 0 && rows.every((l) => Number(l.trim().split(/\s+/).at(-1)) === 0),
  };
}
export function attempt(name) {
  const id = `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 6)}`;
  const dir = path.join(EVIDENCE, id);
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir, startedAt: new Date().toISOString() };
}
export function save(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", { flag: "wx" });
}
export function finish(a, body) {
  const manifest = fs
    .readdirSync(a.dir)
    .filter((f) => fs.statSync(path.join(a.dir, f)).isFile())
    .sort()
    .map((f) => ({
      file: f,
      sha256: sha(path.join(a.dir, f)),
      bytes: fs.statSync(path.join(a.dir, f)).size,
    }));
  save(path.join(a.dir, "manifest.json"), manifest);
  if (body.binding && body.afterBinding) {
    const same = bindingMatches(body.binding, body.afterBinding, {
      startedAt: a.startedAt,
      endedAt: new Date().toISOString(),
    });
    body.gates = { ...body.gates, "G-BIND": same };
    if (!same) {
      body.qualification = "FAIL_BINDING";
      body.qualified = false;
      if (body.account === true) body.account = false;
      for (const key of Object.keys(body.gates))
        if (body.gates[key] === true) body.gates[key] = false;
    }
  }
  save(path.join(RECEIPTS, `${a.id}.json`), {
    format: "p2x2-diagnostic/1",
    id: a.id,
    evidenceDir: a.dir,
    ...body,
    manifestSha256: sha(path.join(a.dir, "manifest.json")),
  });
}
