import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { metricEndpoint, type Stack } from "./native-metrics.ts";
export async function sampleObjectCache(stack: Stack) {
  const p = stack.managed?.peers.find((p) => p.role === "write");
  assert(p);
  const { secret } = JSON.parse(fs.readFileSync(process.env.DX_THIN_CREDENTIAL!, "utf8"));
  const witness = randomUUID();
  const response = await fetch(metricEndpoint(p.metrics, "/sample-object-cache"), {
    method: "POST",
    redirect: "error",
    headers: { authorization: "Bearer " + secret, "x-thin-observation": witness },
    signal: AbortSignal.timeout(140_000),
  });
  if (!response.ok)
    throw Error("Object-cache measurement failed: " + (await response.text()).slice(0, 2400));
  const data = (await response.json()) as {
    nonce: string;
    witness: string;
    containerId: string;
    source: string;
    role: string;
    chargedBytes: number;
    hprofBytes: number;
    hprofSha256: string;
    caches: { units: number; bytesPerUnit: number; weigher: string[] }[];
  };
  assert.equal(data.witness, witness);
  assert.equal(data.nonce, stack.managed!.nonce);
  assert.equal(data.role, p.role);
  assert.equal(data.containerId, p.id);
  assert.equal(data.source, stack.gatewaySourceSha256);
  assert(/^[a-f0-9]{64}$/.test(data.hprofSha256));
  assert(data.hprofBytes > 0 && Number.isSafeInteger(data.chargedBytes) && data.chargedBytes >= 0);
  assert(
    data.caches.length > 0 &&
      data.caches.every((c) => c.bytesPerUnit === 1000 && c.weigher.length === 3),
  );
  assert.equal(
    data.chargedBytes,
    data.caches.reduce((s, c) => s + c.units * c.bytesPerUnit, 0),
  );
  return data;
}
