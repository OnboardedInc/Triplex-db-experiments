import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { verifyPriority9 } from "./verify.ts";

export const measurements = [
  "lost-writes",
  "write-recovery",
  "read-continuity",
  "planned-move",
] as const;
export type Measurement = (typeof measurements)[number];
export type Layout = "one-host" | "two-host";
export type Age = "fresh" | "1B";
export type Status = "PASS" | "FAIL";
export const people = 1_000_000;
export const accounts = 10;

const bars = {
  "lost-writes": "0 acknowledged saves lost",
  "write-recovery": "First correct new save within 60 seconds",
  "read-continuity": "Exact pinned reads continue throughout the fault",
  "planned-move": "First protected save within 30 seconds of sealing writes",
} satisfies Record<Measurement, string>;

export type Metrics = {
  lost: number | null;
  acknowledged: number;
  resumeMs: number | null;
  unavailableReadOffers: number | null;
  readOffers: number;
  longestReadGapMs: number | null;
  readCoverage: boolean;
  moveMs: number | null;
};

export type Identity = {
  tag: string;
  sha: string;
  seedSha256: string;
  age: Age;
  layout: Layout;
  policy: "A" | "B";
};

export function score(id: Measurement, value: Metrics, identity: Identity) {
  assert(measurements.includes(id));
  const {
    lost,
    acknowledged,
    resumeMs,
    unavailableReadOffers,
    readOffers,
    longestReadGapMs,
    readCoverage,
    moveMs,
  } = value;
  const quantities = [
    lost,
    acknowledged,
    resumeMs,
    unavailableReadOffers,
    readOffers,
    longestReadGapMs,
    moveMs,
  ];
  assert(quantities.every((n) => n === null || (Number.isFinite(n) && n >= 0)));
  assert(lost === null || lost <= acknowledged);
  assert(unavailableReadOffers === null || unavailableReadOffers <= readOffers);
  const observed = {
    "lost-writes": { value: lost, unit: "saves", acknowledged },
    "write-recovery": { value: resumeMs, unit: "ms" },
    "read-continuity": {
      value: unavailableReadOffers,
      unit: "missed 1s read deadlines",
      readOffers,
      longestReadGapMs,
      readCoverage,
    },
    "planned-move": { value: moveMs, unit: "ms" },
  }[id];
  const withinBar = {
    "lost-writes": lost === 0 && acknowledged > 0,
    "write-recovery": resumeMs !== null && resumeMs <= 60000,
    "read-continuity": unavailableReadOffers === 0 && readOffers > 0 && readCoverage,
    "planned-move": moveMs !== null && moveMs <= 30000,
  }[id];
  return {
    priority: 9,
    measurement: id,
    bar: bars[id],
    measured: observed,
    verdict: (withinBar ? "PASS" : "FAIL") as Status,
    qualifiesMachineLoss: identity.layout === "two-host",
    topology: identity.layout === "two-host" ? "two servers" : "one server, two copies, rehearsal",
    ...identity,
  };
}

export type CampaignSeal = Identity & {
  campaign: string;
  attempts: { fault: string; move: string };
  seal: string;
  metrics: Metrics;
};

export async function readScore(directory: string, expected: Identity): Promise<CampaignSeal> {
  // [DX-HASYNC1] Why: a score must name its own declared run, source, seed, age and recovery setting. Rejected: accepting an old PASS from a reused output path.
  const transfer = JSON.parse(fs.readFileSync(path.join(directory, "transfer.json"), "utf8"));
  assert.deepEqual(
    [transfer.tag, transfer.sha, transfer.layout],
    [expected.tag, expected.sha, expected.layout],
  );
  assert.match(transfer.campaign, /^[0-9a-f-]{36}$/);
  assert.match(transfer.sha256, /^[0-9a-f]{64}$/);
  assert.equal(transfer.hosts.length, expected.layout === "one-host" ? 1 : 2);
  assert.equal(new Set(transfer.hosts).size, transfer.hosts.length);
  assert(transfer.hosts.every((id: string) => /^[0-9a-f]{64}$/.test(id)));
  const archive = path.join(directory, "raw.tar.gz");
  const h = createHash("sha256");
  for await (const chunk of fs.createReadStream(archive)) h.update(chunk);
  assert.equal(h.digest("hex"), transfer.sha256);
  const auditBytes = fs.readFileSync(path.join(directory, "p9-verified.json"), "utf8");
  const seal = JSON.parse(auditBytes) as CampaignSeal;
  assert.deepEqual(
    [
      seal.tag,
      seal.sha,
      seal.seedSha256,
      seal.age,
      seal.layout,
      seal.policy,
      seal.campaign,
      seal.seal,
    ],
    [
      expected.tag,
      expected.sha,
      expected.seedSha256,
      expected.age,
      expected.layout,
      expected.policy,
      transfer.campaign,
      transfer.sha256,
    ],
  );
  assert(seal.attempts.fault !== seal.attempts.move);
  assert(
    Object.values(seal.attempts).every(
      (nonce) => /^[0-9a-f-]{36}$/.test(nonce) && transfer.nonces.includes(nonce),
    ),
  );
  const prefix = expected.tag + "/";
  const members = new Set(
    execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n"),
  );
  assert(members.has(prefix + "campaign.json"));
  const source = {
    has: (name: string) => members.has(prefix + name),
    raw: (name: string) =>
      execFileSync("tar", ["-xOzf", archive, prefix + name], {
        encoding: "utf8",
        maxBuffer: 64 * 2 ** 20,
      }),
  };
  const independent = verifyPriority9(
    source,
    expected,
    seal.campaign,
    transfer.sha256,
    seal.attempts,
  );
  assert.deepEqual(seal, independent);
  return independent;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, dir, tag, sha, seedSha256, age, layout, policy = "B"] = process.argv.slice(2);
  assert(
    measurements.includes(id as Measurement) && dir && tag && /^[a-z][a-z0-9-]{2,40}$/.test(tag),
  );
  assert(sha && /^[0-9a-f]{40}$/.test(sha) && seedSha256 && /^[0-9a-f]{64}$/.test(seedSha256));
  assert(age === "fresh" || age === "1B");
  assert(layout === "one-host" || layout === "two-host");
  assert(policy === "A" || policy === "B");
  const identity = { tag, sha, seedSha256, age, layout, policy } satisfies Identity;
  const seal = await readScore(dir, identity);
  const row = score(id as Measurement, seal.metrics, identity);
  console.log(JSON.stringify(row));
  if (row.verdict !== "PASS") process.exitCode = 1;
}
