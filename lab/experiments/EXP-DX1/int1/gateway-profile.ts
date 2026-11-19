import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { metricEndpoint, type Stack } from "../thin1/native-metrics.ts";

export function parseHistogram(raw: string) {
  const total = raw.match(/^Total\s+(\d+)\s+(\d+)\s*$/m);
  assert(total, "Incomplete live class histogram");
  const rows = [...raw.matchAll(/^\s*(\d+):\s+(\d+)\s+(\d+)\s+(\S+)/gm)].map((m, i) => {
    assert.equal(Number(m[1]), i + 1);
    return { name: m[4]!, count: Number(m[2]), bytes: Number(m[3]) };
  });
  const count = rows.reduce((s, row) => s + row.count, 0);
  const bytes = rows.reduce((s, row) => s + row.bytes, 0);
  assert(count > 0 && bytes > 0);
  assert.deepEqual([count, bytes], total.slice(1).map(Number));
  return { count, bytes, top: rows.slice(0, 18) };
}

export async function gatewayProfiles(stack: Stack, dir: string, phase: string, binding: string) {
  const managed = stack.managed;
  assert(managed?.compact);
  const { secret } = JSON.parse(fs.readFileSync(process.env.DX_THIN_CREDENTIAL!, "utf8"));
  const samples = [];
  for (const peer of managed.peers) {
    const owner = JSON.parse(fs.readFileSync(peer.owner, "utf8")),
      witness = randomUUID();
    assert.equal(owner.holder, "DX-THIN1");
    assert.equal(owner.experiment, "DX-THIN1-" + managed.nonce);
    assert.equal(owner.createdAt, peer.createdAt);
    assert(stack.containers.some((c) => c.name === owner.container && c.id === peer.id));
    const res = await fetch(metricEndpoint(peer.metrics, "/gateway-profile"), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(210000),
      headers: {
        authorization: "Bearer " + secret,
        "x-thin-observation": witness,
        "x-thin-role": peer.role,
      },
    });
    if (!res.ok) throw Error("Gateway profile unavailable: " + (await res.text()).slice(0, 2100));
    const { histogram, ...data } = (await res.json()) as any;
    assert.deepEqual(
      [data.witness, data.role, data.nonce, data.source, data.containerId],
      [witness, peer.role, managed.nonce, stack.gatewaySourceSha256, peer.id],
    );
    assert(Number.isSafeInteger(data.pid) && data.pid > 1 && Number(data.startTicks) > 0);
    assert(histogram.startsWith(data.pid + ":") && data.before.heap.startsWith(data.pid + ":"));
    assert.match(data.hprofSha256, /^[0-9a-f]{64}$/);
    if (!data.caches.length) {
      assert.equal(data.domainWeighers, 0);
      assert(!histogram.includes("datomic.domain$create_object_cache$fn"));
    }
    assert(
      data.hprofBytes > 0 &&
        data.caches.every(
          (c: any) =>
            c.weigher.length === 3 &&
            c.bytesPerUnit === 1000 &&
            c.units >= 0 &&
            c.maxUnits <= Math.ceil((data.limitMiB * 2 ** 20) / 1000),
        ),
    );
    assert.equal(
      data.chargedBytes,
      data.caches.reduce((s: number, c: any) => s + c.units * c.bytesPerUnit, 0),
    );
    const summary = parseHistogram(histogram);
    const filename = phase + "-" + peer.role + ".histogram.gz",
      bytes = gzipSync(histogram);
    fs.writeFileSync(path.join(dir, filename), bytes, { flag: "wx" });
    samples.push({
      ...data,
      summary,
      filename,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  assert.equal(new Set(samples.map((s) => s.pid)).size, 2);
  fs.writeFileSync(
    path.join(dir, phase + "-profile.json"),
    JSON.stringify({ binding, phase, samples }),
    { flag: "wx" },
  );
}
