import { mkdir, open, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { attrs, currentAt, earlyAt, expected, loadFixture, personAt } from "./fixture.ts";
import { catalogs, personId, profiles, token, type Profile } from "./model.ts";
import {
  manifestReader,
  maxManifestBytes,
  saves,
  type Frame,
  type VerifiedObject,
} from "./bundle.ts";
import { datomicVersion, hash } from "./stack.ts";

export type Shape = { deep: number; daily: number | "real" };
export const maxDailySaves = 450_000;
export type SeedPlan = Shape | "small";
export type SeedFrame = Frame | { kind: "middle" };
export type Checkpoint = {
  head: number;
  early: number;
  middle: number;
};
export type SnapshotManifest = {
  version: 3;
  format: "postgres17-custom";
  datomic: string;
  codec: string;
  tier: string;
  plan: SeedPlan;
  run: string;
  checkpoint: Checkpoint;
  objects: VerifiedObject[];
};
export type Restore = {
  manifest: SnapshotManifest;
  checksum: string;
  inputs: string[];
};
const dayMs = 86_400_000;
export const middleAt = earlyAt + 18 * dayMs - 1;
const chunkSize = 64 * 2 ** 20;
export const tierName = /^[a-z][a-z0-9-]{0,38}$/;
const digest = /^[a-f0-9]{64}$/;
const chunkName = (index: number, width = 5) =>
  "postgres-" + String(index).padStart(width, "0") + ".dump-part";

function natural(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
}

export function checkPlan(plan: SeedPlan) {
  if (
    plan !== "small" &&
    (!plan ||
      !natural(plan.deep, 1, 100_000) ||
      (plan.daily === "real" ? plan.deep !== 100_000 : !natural(plan.daily, 1, maxDailySaves)))
  )
    throw new Error("Invalid snapshot population or daily save quota");
}

export function snapshotProfiles(plan: SeedPlan): Profile[] {
  if (plan === "small") return profiles();
  const full = profiles(true);
  if (plan.deep === 100_000) return full;
  return full.map((account, i) => {
    const count = i === 0 ? plan.deep : i === 1 ? plan.deep * 40 : [4, 5, 7][i - 2]!;
    return {
      ...account,
      count,
      clients: Math.max(
        2,
        Math.min(Math.ceil((account.clients * count) / account.count), account.clients),
      ),
      jobTypes: Math.max(
        2,
        Math.min(Math.ceil((account.jobTypes * count) / account.count), account.jobTypes),
      ),
    };
  });
}

function* events(
  plan: Shape,
  accounts: Profile[],
  include?: (account: Profile, index: number) => boolean,
): Generator<SeedFrame> {
  for (let day = 1; day <= 35; day++) {
    if (plan.daily === "real") yield* saves(day, accounts, false, include);
    else {
      const time = earlyAt + day * dayMs;
      for (let i = 0; i < plan.daily; i++) {
        for (let accountIndex = 0; accountIndex < 2; accountIndex++) {
          const account = accounts[accountIndex]!;
          // [DX-PLAY1] Why: the sampled days retain same-day ordering and a rotating active roster.
          // Rejected: using the small fixture's grouped edits to forecast individual save costs.
          const active = Math.min(plan.daily, 1900, account.count);
          const n =
            i === 0
              ? 0
              : (1 +
                  ((((i - 1) % Math.max(1, active - 1)) + day * active * 7) %
                    (account.count - 1 || 1))) %
                account.count;
          if (include && !include(account, n)) continue;
          const root = personId(account, n);
          const child = account.shape === "deep" && i % 6 !== 0;
          const key = (day * maxDailySaves + i) * 32 + accountIndex * 16;
          const text = Array.from({ length: 16 }, (_, j) => token(key + j)).join("-");
          const changes: Record<string, string> = child
            ? { ":field/value": "Answer-" + text }
            : {
                [attrs.note]: "Note-" + text,
                ...(i % 6 === 0 ? { [attrs.status]: key % 3 ? "Active" : "Review" } : {}),
              };
          yield {
            kind: "save",
            id: account.id + "-" + day + "-" + i,
            target: child ? root + "/placement:1/task:1/subtask:1/field:1" : root,
            validAt: time + Math.floor((i * (dayMs - 1)) / plan.daily),
            changes,
          };
        }
      }
      if (day === 14 || day === 28)
        yield {
          kind: "release",
          account: accounts[0]!.id,
          validAt: time + dayMs - 1,
          label: "Circuit " + (day === 14 ? 1 : 2),
          reviewStatus: day === 14 ? "Review" : "Active",
        };
    }
    if (day === 17) yield { kind: "middle" };
  }
}

export function snapshotSeed(plan: SeedPlan) {
  checkPlan(plan);
  if (plan === "small") return loadFixture();
  const accounts = snapshotProfiles(plan);
  return {
    fixtureInfo: { accounts, earlyAt, currentAt },
    checksum: hash(JSON.stringify(plan)),
    async *frames(): AsyncGenerator<SeedFrame> {
      for (const account of accounts) {
        for (const subject of catalogs(account)) yield { kind: "catalog", subject };
        for (let n = 0; n < account.count; n++)
          yield { kind: "person", person: personAt(account, n) };
      }
      yield* events(plan, accounts);
    },
  };
}

type ExpectedRows = Map<string, Map<string, string | number>>;
export function snapshotSamples(plan: SeedPlan) {
  const accounts = snapshotProfiles(plan);
  const sample = new Map(
    accounts.map((a) => [a.id, new Set([0, Math.floor(a.count / 2), a.count - 1])]),
  );
  const cuts = [earlyAt, middleAt, currentAt].map((at) => {
    const byPerson = new Map<string, ExpectedRows>();
    for (const a of accounts)
      for (const n of sample.get(a.id)!) {
        const p = personAt(a, n, plan === "small");
        const fields: ExpectedRows = new Map([[p.id, new Map(Object.entries(expected(p, at)))]]);
        for (const subject of p.owned)
          fields.set(
            subject.id,
            new Map(
              subject.facts.map(([k, v, type]) => [
                k,
                type === "boolean" ? Number(v === "true") : v,
              ]),
            ),
          );
        byPerson.set(p.id, fields);
      }
    return { at, byPerson };
  });
  if (plan !== "small")
    for (const event of events(plan, accounts, (a, n) => sample.get(a.id)!.has(n)))
      if (event.kind === "save")
        for (const cut of cuts) {
          if (event.validAt > cut.at) continue;
          const person = event.target.split("/")[0]!;
          const expected = cut.byPerson.get(person)?.get(event.target);
          if (!expected) throw new Error("Sample save target was not generated");
          for (const [key, value] of Object.entries(event.changes)) expected.set(key, value);
        }
  return cuts;
}

export function parseSnapshot(bytes: Buffer, tier: string): SnapshotManifest {
  if (bytes.length > maxManifestBytes) throw new Error("Snapshot manifest is too large");
  const manifest = JSON.parse(bytes.toString("utf8")) as SnapshotManifest;
  if (
    !manifest ||
    manifest.version !== 3 ||
    manifest.format !== "postgres17-custom" ||
    manifest.datomic !== datomicVersion ||
    !digest.test(manifest.codec) ||
    !tierName.test(tier) ||
    manifest.tier !== tier ||
    !/^tx2-dxplay1-[a-f0-9]{12}$/.test(manifest.run) ||
    !Array.isArray(manifest.objects) ||
    manifest.objects.length === 0 ||
    manifest.objects.length > 32768 ||
    (manifest.objects[0]?.file === chunkName(0, 4) && manifest.objects.length > 10_000) ||
    manifest.objects.some(
      (entry, index) =>
        entry.file !== chunkName(index, manifest.objects[0]?.file === chunkName(0, 4) ? 4 : 5) ||
        !digest.test(entry.sha256) ||
        !natural(entry.bytes, 1, chunkSize) ||
        (index < manifest.objects.length - 1 && entry.bytes !== chunkSize),
    )
  )
    throw new Error("Invalid or incompatible playground snapshot manifest");
  checkPlan(manifest.plan);
  if (!manifest.checkpoint) throw new Error("Snapshot has no cut positions");
  const { early, middle, head } = manifest.checkpoint;
  if (
    !natural(early, 1, Number.MAX_SAFE_INTEGER) ||
    !natural(middle, early + 1, Number.MAX_SAFE_INTEGER) ||
    !natural(head, middle + 1, Number.MAX_SAFE_INTEGER)
  )
    throw new Error("Invalid snapshot cut positions");
  return manifest;
}

export async function openSnapshot(
  source: string,
  cache: string,
  tier: string,
  signal?: AbortSignal,
) {
  const reader = await manifestReader(source, cache, signal);
  return readSnapshot(reader, tier);
}

export async function readSnapshot(
  reader: Awaited<ReturnType<typeof manifestReader>>,
  tier: string,
) {
  const manifest = parseSnapshot(reader.initial, tier);
  const inputs = await reader.objects(manifest.objects);
  return { manifest, checksum: reader.checksum, inputs } satisfies Restore;
}

export async function writeSnapshot(
  from: string,
  destination: string,
  metadata: Omit<SnapshotManifest, "objects" | "version" | "format" | "datomic">,
) {
  if (!tierName.test(metadata.tier)) throw new Error("Invalid snapshot tier name");
  await mkdir(destination);
  const objects: VerifiedObject[] = [];
  const source = await open(from, "r");
  try {
    const buffer = Buffer.allocUnsafe(chunkSize);
    for (;;) {
      let length = 0;
      while (length < chunkSize) {
        const result = await source.read(buffer, length, chunkSize - length);
        if (result.bytesRead === 0) break;
        length += result.bytesRead;
      }
      if (!length) break;
      const chunk = buffer.subarray(0, length);
      const file = chunkName(objects.length);
      await writeFile(join(destination, file), chunk, { flag: "wx" });
      objects.push({ file, bytes: length, sha256: hash(chunk) });
    }
  } finally {
    await source.close();
  }
  const manifest = {
    version: 3,
    format: "postgres17-custom",
    datomic: datomicVersion,
    ...metadata,
    objects,
  };
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  parseSnapshot(bytes, metadata.tier);
  await writeFile(join(destination, "manifest.json"), bytes, { flag: "wx" });
  return { manifest, checksum: hash(bytes), manifestBytes: bytes.length };
}
