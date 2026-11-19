import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

export interface Stack {
  prefix: string;
  readUrl: string;
  writeUrl: string;
  gatewaySourceSha256: string;
  containers: { id: string; name: string; imageId: string }[];
  managed?: {
    nonce: string;
    peers: {
      role: "write" | "read";
      metrics: string;
      owner: string;
      createdAt: string;
      id: string;
    }[];
  };
}
async function managedMetrics(stack: Stack) {
  const managed = stack.managed!;
  const { secret } = JSON.parse(fs.readFileSync(process.env.DX_THIN_CREDENTIAL!, "utf8"));
  const roles: Record<string, { rssBytes: number }> = {},
    gateways: Record<string, unknown> = {};
  let disk, limit;
  for (const peer of managed.peers) {
    const owner = JSON.parse(fs.readFileSync(peer.owner, "utf8"));
    assert.equal(owner.holder, "DX-THIN1");
    assert.equal(owner.mode, "exclusive");
    assert.equal(owner.createdAt, peer.createdAt);
    assert.equal(owner.container, stack.containers.find((c) => c.id === peer.id)?.name);
    const response = await fetch(peer.metrics, {
      headers: { authorization: "Bearer " + secret },
      signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok);
    const data = (await response.json()) as any;
    assert.equal(data.nonce, managed.nonce);
    assert.equal(data.containerId, peer.id);
    assert.equal(data.role, peer.role);
    assert.equal(data.source, stack.gatewaySourceSha256);
    for (const [name, bytes] of Object.entries(data.rssBytes)) {
      assert(Number(bytes) > 0);
      roles[name] = { rssBytes: Number(bytes) };
    }
    if (peer.role === "write") {
      disk = data.disk;
      limit = data.objectCacheLimitBytes;
    }
    const scan = await fetch(new URL("/v2/admin/scan-stats", owner.endpoint), {
      signal: AbortSignal.timeout(30_000),
    });
    assert(scan.ok);
    const stats = (await scan.json()) as any;
    assert(
      Number.isFinite(stats.idMemo.estimatedBytes) && Number.isFinite(stats.entityCache.bytes),
    );
    gateways[peer.role] = { idMemo: stats.idMemo, entityCache: stats.entityCache };
  }
  assert.deepEqual(Object.keys(roles).sort(), [
    "postgres",
    "readGateway",
    "transactor",
    "writeGateway",
  ]);
  assert(
    disk.kvsIncludingIndexes > 0 &&
      disk.fsync === "on" &&
      disk.synchronousCommit === "on" &&
      disk.fullPageWrites === "on",
  );
  return {
    roles,
    readGateway: gateways.read,
    writeGateway: gateways.write,
    disk,
    transactor: { objectCacheLimitBytes: limit, attributableObjectCacheBytes: null },
  };
}
export async function nativeMetrics(stack: Stack) {
  assert.equal(process.platform, "linux");
  if (stack.managed) return managedMetrics(stack);
  assert.equal(process.env.DX_BARE_METAL, "1");
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
  const docker = (args: string[]) =>
    execFileSync("docker", args, { encoding: "utf8", timeout: 30_000 }).trim();
  const roles: Record<string, unknown> = {};
  for (const c of stack.containers) {
    const info = JSON.parse(docker(["inspect", c.id]))[0];
    assert.equal(info.Name, "/" + c.name);
    assert.equal(info.Image, c.imageId);
    assert(info.State.Running && !info.State.OOMKilled);
    const role = c.name.slice(stack.prefix.length + 1);
    if (role.startsWith("gw-"))
      assert(info.Config.Env.includes("GATEWAY_SOURCE_SHA256=" + stack.gatewaySourceSha256));
    const rss = docker(["top", c.id, "-eo", "rss"]).split("\n").slice(1).map(Number);
    assert(rss.length && rss.every((x) => Number.isFinite(x) && x > 0));
    const bytes = (file: string) => Number(docker(["exec", c.id, "cat", "/sys/fs/cgroup/" + file]));
    const cgroupBytes = bytes("memory.current"),
      peakBytes = bytes("memory.peak");
    assert(cgroupBytes > 0 && peakBytes >= cgroupBytes);
    roles[role] = {
      container: c.id,
      rssBytes: rss.reduce((sum, value) => sum + value, 0) * 1024,
      cgroupBytes,
      peakBytes,
    };
  }
  const gateway = async (endpoint: string) => {
    const response = await fetch(new URL("/v2/admin/scan-stats", endpoint), {
      signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok);
    const { idMemo, entityCache } = (await response.json()) as {
      idMemo: { estimatedBytes: number };
      entityCache: { bytes: number };
    };
    assert(Number.isFinite(idMemo.estimatedBytes) && Number.isFinite(entityCache.bytes));
    return { idMemo, entityCache };
  };
  const pg = stack.containers.find((c) => c.name === stack.prefix + "-pg")!;
  const sql =
    "SELECT json_build_object('database',pg_database_size(current_database()),'kvsIncludingIndexes',pg_total_relation_size('datomic_kvs'),'walDirectory',(SELECT sum(size) FROM pg_ls_waldir()))";
  const disk = JSON.parse(
    docker([
      "exec",
      pg.id,
      "psql",
      "-XAtq",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "datomic",
      "-c",
      sql,
    ]),
  );
  const tx = stack.containers.find((c) => c.name === stack.prefix + "-tx")!;
  const cacheProperty = docker(["exec", tx.id, "cat", "/dxh1/sql.properties"])
    .split("\n")
    .find((line) => line.startsWith("object-cache-max="));
  assert(cacheProperty);
  return {
    roles,
    readGateway: await gateway(stack.readUrl),
    writeGateway: await gateway(stack.writeUrl),
    disk,
    transactor: {
      objectCacheLimit: cacheProperty.split("=")[1],
      attributableObjectCacheBytes: null,
    },
    rssAccounting: "Per-process RSS sum; shared Postgres pages can appear in multiple processes.",
  };
}
