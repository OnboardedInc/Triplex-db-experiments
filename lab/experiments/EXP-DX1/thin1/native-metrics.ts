import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { isIPv4 } from "node:net";

export interface Stack {
  prefix: string;
  readUrl: string;
  writeUrl: string;
  gatewaySourceSha256: string;
  containers: { id: string; name: string; imageId: string }[];
  managed?: {
    nonce: string;
    compact?: boolean;
    peers: {
      role: "write" | "read";
      endpoint: string;
      metrics: string;
      owner: string;
      createdAt: string;
      id: string;
    }[];
  };
}
export function metricEndpoint(address: string, endpoint: "/metrics" | "/sample-object-cache" | "/gateway-profile") {
  const url = new URL(address);
  const [net, subnet] = url.hostname.split(".").map(Number);
  assert(url.protocol === "http:" && url.port === "8989" && isIPv4(url.hostname));
  assert(
    net === 10 ||
      (net === 172 && subnet! >= 16 && subnet! <= 31) ||
      (net === 192 && subnet === 168),
  );
  assert(!url.username && !url.password && url.pathname === "/metrics" && !url.search && !url.hash);
  return new URL(endpoint, url);
}
async function managedMetrics(stack: Stack) {
  const managed = stack.managed!;
  const { secret } = JSON.parse(fs.readFileSync(process.env.DX_THIN_CREDENTIAL!, "utf8"));
  const roles: Record<string, { rssBytes: number; threads?: number }> = {},
    gateways: Record<string, unknown> = {};
  const gatewayPids = new Set<number>();
  let disk, limit;
  for (const peer of managed.peers) {
    const owner = JSON.parse(fs.readFileSync(peer.owner, "utf8"));
    assert.equal(owner.holder, "DX-THIN1");
    assert.equal(owner.mode, "exclusive");
    assert.equal(owner.createdAt, peer.createdAt);
    assert.equal(owner.container, stack.containers.find((c) => c.id === peer.id)?.name);
    // [DX-INT1] Why: Postgres children and WAL files can disappear during a census. Retry an entire fresh observation while the workload is stopped at the phase boundary.
    // Rejected: keeping old RSS or disk bytes to fill a missing observation.
    let response: Response | undefined;
    const errors: string[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      response = await fetch(metricEndpoint(peer.metrics, "/metrics"), {
        headers: { authorization: "Bearer " + secret, "x-thin-role": peer.role },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) break;
      const detail = (await response.text()).replaceAll(secret, "[redacted]").slice(0, 500);
      errors.push(peer.role + " " + response.status + " " + detail);
      if (response.status < 500) throw Error("Metrics request refused: " + errors.join(" | "));
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert(response?.ok, "Fresh metrics unavailable: " + errors.join(" | "));
    const data = (await response.json()) as any;
    assert.equal(data.nonce, managed.nonce);
    assert.equal(data.containerId, peer.id);
    assert.equal(data.role, peer.role);
    assert.equal(data.source, stack.gatewaySourceSha256);
    assert.deepEqual(
      Object.keys(data.rssBytes).sort(),
      peer.role === "write" ? ["postgres", "transactor", "writeGateway"] : ["readGateway"],
    );
    if (managed.compact) {
      assert(Number.isSafeInteger(data.gatewayPid) && data.gatewayPid > 1);
      gatewayPids.add(data.gatewayPid);
    }
    for (const [name, bytes] of Object.entries(data.rssBytes)) {
      assert(Number(bytes) > 0);
      roles[name] = { rssBytes: Number(bytes), threads: data.threads?.[name] };
      if (data.threads) assert(Number.isSafeInteger(data.threads[name]) && data.threads[name] > 0);
    }
    if (peer.role === "write") {
      disk = data.disk;
      limit = data.objectCacheLimitBytes;
    }
    const endpoint = peer.role === "read" ? stack.readUrl : stack.writeUrl;
    assert.equal(peer.endpoint, endpoint);
    if (!managed.compact || peer.role === "write") assert.equal(peer.endpoint, owner.endpoint);
    else {
      const secondary = new URL(peer.metrics);
      secondary.pathname = "/";
      secondary.port = "8081";
      assert.equal(secondary.href, new URL(endpoint).href);
    }
    const scan = await fetch(new URL("/v2/admin/scan-stats", endpoint), {
      signal: AbortSignal.timeout(30_000),
    });
    assert(scan.ok);
    const stats = (await scan.json()) as any;
    assert(
      Number.isFinite(stats.idMemo.estimatedBytes) && Number.isFinite(stats.entityCache.bytes),
    );
    gateways[peer.role] = { idMemo: stats.idMemo, entityCache: stats.entityCache };
  }
  if (managed.compact) assert.equal(gatewayPids.size, 2);
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
      threads: docker(["top", c.id, "-eo", "nlwp"])
        .split("\n")
        .slice(1)
        .map(Number)
        .reduce((a, b) => a + b, 0),
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
    "SELECT json_build_object('database',pg_database_size(current_database()),'kvsIncludingIndexes',pg_total_relation_size('datomic_kvs'),'walDirectory',(SELECT sum(size) FROM pg_ls_waldir()),'fsync',current_setting('fsync'),'synchronousCommit',current_setting('synchronous_commit'),'fullPageWrites',current_setting('full_page_writes'))";
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
