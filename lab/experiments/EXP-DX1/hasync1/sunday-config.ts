import assert from "node:assert/strict";
import { isIPv4 } from "node:net";

const digest = /^[0-9a-f]{64}$/;
export const absolute = (v: unknown): v is string =>
  typeof v === "string" && /^\/[A-Za-z0-9_./-]+$/.test(v) && !v.split("/").includes("..");

export type SiteConfig = { address: string; seedDirectory: string };
export type SundayConfig = {
  tag: string;
  commit: string;
  root: string;
  buildReceipt: string;
  scope: string;
  seedSha256: string;
  cluster: string;
  facts: 162456470;
  seedOriginTag: string;
  seedOriginSha256: string;
  seedOriginTransferSha256: string;
  tunnel: number;
  a: SiteConfig;
  b: SiteConfig;
  ssh: { user: string; target: string; identityFile: string; knownHosts: string };
  // [DX-HASYNC2] Optional: the launch commit when only lab TypeScript changed after the staged build `commit`.
  lab?: string;
  // [DX-HASYNC2] Optional: each server's own routable address for direct WAL streaming on TCP 25432 (and the bulk probe).
  direct?: { a: string; b: string };
};

// [DX-HASYNC1] Why: require the same private manifest on both roles and validate every shell and mount input before startup. Rejected: interpolating driver environment into remote commands.
export function readConfig(raw: string): SundayConfig {
  const c: SundayConfig = JSON.parse(raw);
  assert.match(c.tag, /^[a-z0-9][a-z0-9-]{5,35}$/);
  assert.match(c.commit, /^[0-9a-f]{40}$/);
  assert(absolute(c.root) && absolute(c.buildReceipt));
  assert.match(c.scope, /^dx-scale-decision-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-0$/);
  assert.match(c.seedSha256, digest);
  assert.match(c.seedOriginTag, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/);
  assert.match(c.seedOriginSha256, digest);
  assert.match(c.seedOriginTransferSha256, digest);
  assert.match(c.cluster, /^[1-9][0-9]{16,19}$/);
  assert.equal(c.facts, 162456470);
  assert(Number.isInteger(c.tunnel) && c.tunnel >= 20 && c.tunnel <= 99);
  for (const site of [c.a, c.b]) {
    assert(
      isIPv4(site.address) && /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(site.address),
    );
    assert(absolute(site.seedDirectory));
  }
  assert.notEqual(c.a.address, c.b.address);
  assert.match(c.ssh.user, /^[a-z_][a-z0-9_-]{0,30}$/);
  assert.match(c.ssh.target, /^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/);
  assert(absolute(c.ssh.identityFile) && absolute(c.ssh.knownHosts));
  if (c.lab !== undefined) assert(/^[0-9a-f]{40}$/.test(c.lab) && c.lab !== c.commit);
  if (c.direct !== undefined) {
    assert(isIPv4(c.direct.a) && isIPv4(c.direct.b) && c.direct.a !== c.direct.b);
    for (const v of [c.direct.a, c.direct.b]) assert(![c.a.address, c.b.address].includes(v));
  }
  return c;
}
