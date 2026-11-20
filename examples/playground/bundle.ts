import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { createGunzip, createGzip } from "node:zlib";
import { attrs, currentAt, earlyAt, personAt, type Person } from "./fixture.ts";
import {
  catalogs,
  draw,
  personId,
  profiles,
  seed,
  token,
  type Profile,
  type Subject,
} from "./model.ts";
import { hash } from "./stack.ts";

export type VerifiedObject = { file: string; bytes: number; sha256: string };
type ObjectEntry = VerifiedObject & { records: number };
export type Frame =
  | { kind: "catalog"; subject: Subject }
  | { kind: "person"; person: Person }
  | { kind: "save"; id: string; target: string; validAt: number; changes: Record<string, string> }
  | { kind: "release"; account: string; validAt: number; label: string; reviewStatus: string };
export type Manifest = {
  version: 2;
  tier: "full" | "sample";
  seed: number;
  earlyAt: number;
  currentAt: number;
  accounts: Profile[];
  objects: ObjectEntry[];
};

const shard = 50_000;
const dayMs = 86_400_000;
const cap = 5_000_000_000;
const filename = /^(catalog|people|events)-\d{2}-\d{3}\.ndjson\.gz$/;
const keyOf = (kind: string, account: number, page: number) =>
  `${kind}-${String(account).padStart(2, "0")}-${String(page).padStart(3, "0")}.ndjson.gz`;

export function minuteSaves(rank: number) {
  // [DX-PLAY1] Why: tie the generated burst shape to the observed per-minute quantiles, with a target of 440k/day.
  // Rejected: assuming the mean is a flat offered rate across working and quiet minutes.
  if (rank < 720) return Math.round(40 + (168 * rank) / 720);
  if (rank < 1425) return Math.round(208 + (505 * (rank - 720)) / 705);
  if (rank < 1438) return Math.round(1408 + (652 * (rank - 1425)) / 13);
  return rank === 1438 ? 2060 : 2364;
}

export function* saves(
  day: number,
  accounts: Profile[],
  sample: boolean,
  include = (_account: Profile, _index: number) => true,
): Generator<Frame> {
  const max = sample ? 180 : 1440;
  for (let min = 0; min < max; min++) {
    const rankedMinute = (min * 137 + day * 103) % 1440;
    const count = minuteSaves(rankedMinute);
    for (let save = 0; save < count; save += sample ? 237 : 1) {
      for (const [idx, account] of accounts.slice(0, 2).entries()) {
        const active = Math.min(account.count, 1900);
        const base = (day * 2 * 1440 + min * 2 + idx) * 2400 + save;
        const n = ((draw(base) % active) * 7919 + day * 1901) % account.count;
        if (!include(account, n)) continue;
        const root = personId(account, n);
        const rootEdit = idx === 1 || save % 6 === 0;
        const target = rootEdit ? root : root + "/placement:1/task:1/subtask:1/field:1";
        const text = Array.from({ length: 16 }, (_, i) => token(Math.imul(base, 17) + i)).join("-");
        const changes = rootEdit
          ? {
              [attrs.note]: "Note-" + text,
              ...(save % 6 === 0
                ? { [attrs.status]: draw(base + 1) % 3 ? "Active" : "Review" }
                : {}),
            }
          : { ":field/value": "Answer-" + text };
        yield {
          kind: "save",
          id: `event-${base}`,
          target,
          changes,
          validAt: earlyAt + day * dayMs + min * 60_000 + Math.floor((save * 60_000) / count),
        };
      }
    }
  }
  if (day === 14 || day === 28) {
    yield {
      kind: "release",
      account: accounts[0]!.id,
      validAt: earlyAt + (day + 1) * dayMs - 1,
      label: day === 14 ? "Circuit 1" : "Circuit 2",
      reviewStatus: day === 14 ? "Review" : "Active",
    };
  }
}

export async function sha256(file: string) {
  const digest = createHash("sha256");
  for await (const bytes of createReadStream(file)) digest.update(bytes);
  return digest.digest("hex");
}

// [DX-PLAY1] Why: publish the manifest after all ordered, independently reproducible objects are finished.
// Rejected: an in-memory JSON array or a partial manifest that appears loadable.
export async function generateBundle(directory: string, sample = false): Promise<Manifest> {
  await mkdir(directory);
  const accounts = profiles(!sample);
  const manifest: Manifest = {
    version: 2,
    tier: sample ? "sample" : "full",
    seed,
    earlyAt,
    currentAt,
    accounts,
    objects: [],
  };
  const emit = async (file: string, frames: Iterable<Frame>) => {
    let records = 0;
    function* lines() {
      for (const frame of frames) {
        records++;
        yield JSON.stringify(frame) + "\n";
      }
    }
    const path = join(directory, file);
    await pipeline(
      Readable.from(lines()),
      createGzip({ level: 6 }),
      createWriteStream(path, { flags: "wx" }),
    );
    manifest.objects.push({
      file,
      bytes: (await stat(path)).size,
      sha256: await sha256(path),
      records,
    });
    console.log(file, records);
  };
  for (const [i, account] of accounts.entries()) {
    function* category() {
      for (const subject of catalogs(account)) yield { kind: "catalog", subject } as const;
    }
    await emit(keyOf("catalog", i, 0), category());
    const group = account.shape === "deep" ? 4000 : shard;
    for (let first = 0; first < account.count; first += group) {
      function* people() {
        for (let n = first; n < Math.min(first + group, account.count); n++)
          yield { kind: "person", person: personAt(account, n) } as const;
      }
      await emit(keyOf("people", i, first / group), people());
    }
  }
  for (let d = 1; d <= 35; d++) {
    await emit(keyOf("events", 0, d), saves(d, accounts, sample));
    if (!sample && manifest.objects.reduce((total, e) => total + e.bytes, 0) > cap)
      throw new Error(
        "Full bundle exceeded 5 GB. Generated objects remain for sizing and no manifest was published.",
      );
  }
  if (!sample && manifest.objects.reduce((total, e) => total + e.bytes, 0) < 2_000_000_000)
    throw new Error(
      "Full bundle was below 2 GB. Generated objects remain for sizing and no manifest was published.",
    );
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
  });
  return manifest;
}

function parseManifest(content: Buffer) {
  if (content.length > 128_000) throw new Error("Bundle manifest is too large");
  const m = JSON.parse(content.toString("utf8")) as Manifest;
  if (
    m.version !== 2 ||
    !["full", "sample"].includes(m.tier) ||
    m.seed !== seed ||
    m.earlyAt !== earlyAt ||
    m.currentAt !== currentAt ||
    JSON.stringify(m.accounts) !== JSON.stringify(profiles(m.tier === "full")) ||
    !Array.isArray(m.objects) ||
    !m.objects.length ||
    m.objects.length > 160 ||
    m.objects.some(
      ({ file, bytes, sha256, records }) =>
        !filename.test(file) ||
        !/^[a-f0-9]{64}$/.test(sha256) ||
        !Number.isSafeInteger(bytes) ||
        bytes < 1 ||
        !Number.isSafeInteger(records) ||
        records < 1,
    ) ||
    new Set(m.objects.map(({ file }) => file)).size !== m.objects.length ||
    m.objects.reduce((sum, e) => sum + e.bytes, 0) > cap ||
    (m.tier === "full" && m.objects.reduce((sum, e) => sum + e.bytes, 0) < 2_000_000_000)
  )
    throw new Error("Invalid playground bundle manifest");
  const expected = [];
  for (const [i, a] of m.accounts.entries()) {
    expected.push(keyOf("catalog", i, 0));
    const group = a.shape === "deep" ? 4000 : shard;
    for (let n = 0; n < Math.ceil(a.count / group); n++) expected.push(keyOf("people", i, n));
  }
  for (let d = 1; d <= 35; d++) expected.push(keyOf("events", 0, d));
  if (JSON.stringify(m.objects.map((e) => e.file)) !== JSON.stringify(expected))
    throw new Error("Bundle object inventory or order differs from the generator");
  return m;
}

async function verified(path: string, entry: VerifiedObject) {
  const metadata = await stat(path).catch(() => null);
  return Boolean(
    metadata?.isFile() && metadata.size === entry.bytes && (await sha256(path)) === entry.sha256,
  );
}

async function fetchObject(base: URL, dir: string, entry: VerifiedObject, signal?: AbortSignal) {
  const path = join(dir, entry.file);
  if (await verified(path, entry)) return path;
  const part = path + ".part";
  let size = (await stat(part).catch(() => null))?.size ?? 0;
  if (size >= entry.bytes) {
    if (await verified(part, entry)) {
      await rename(part, path);
      return path;
    }
    await rm(part, { force: true });
    size = 0;
  }
  const request = (offset: number) =>
    fetch(new URL(entry.file, base), {
      redirect: "error",
      ...(signal ? { signal } : {}),
      headers: offset
        ? { Range: `bytes=${offset}-`, "Accept-Encoding": "identity" }
        : { "Accept-Encoding": "identity" },
    });
  const res = await request(size);
  if (!res.body || !res.ok || ![200, 206].includes(res.status))
    throw new Error("Bundle download failed: " + entry.file);
  const resume = size > 0 && res.status === 206;
  if (
    res.status === 206 &&
    res.headers.get("content-range") !== `bytes ${size}-${entry.bytes - 1}/${entry.bytes}`
  ) {
    await res.body.cancel();
    throw new Error("Unexpected range response for " + entry.file);
  }
  let count = resume ? size : 0;
  const limit = async function* (source: AsyncIterable<Buffer>) {
    for await (const bytes of source) {
      count += bytes.length;
      if (count > entry.bytes) throw new Error("Bundle object exceeded manifest size");
      yield bytes;
    }
  };
  await pipeline(
    Readable.fromWeb(res.body as never),
    limit,
    createWriteStream(part, { flags: resume ? "a" : "w" }),
  );
  if (!(await verified(part, entry))) {
    if (count >= entry.bytes) await rm(part, { force: true });
    throw new Error("Bundle object failed verification: " + entry.file);
  }
  await rename(part, path);
  return path;
}

export async function manifestReader(source: string, cache: string, signal?: AbortSignal) {
  const remote = /^https?:\/\//.test(source) ? new URL(source) : undefined;
  if (
    remote &&
    (remote.username ||
      remote.password ||
      remote.search ||
      remote.hash ||
      (remote.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(remote.hostname)))
  )
    throw new Error("Use an HTTPS bundle base URL or an absolute local directory");
  if (remote && !remote.pathname.endsWith("/")) remote.pathname += "/";
  const initial = remote
    ? await (async () => {
        const res = await fetch(new URL("manifest.json", remote), {
          redirect: "error",
          ...(signal ? { signal } : {}),
        });
        if (!res.ok || !res.body) throw new Error("Cannot fetch the playground bundle manifest");
        const buffers = [];
        let length = 0;
        for await (const bytes of Readable.fromWeb(res.body as never)) {
          length += bytes.length;
          if (length > 128_000) throw new Error("Bundle manifest is too large");
          buffers.push(bytes);
        }
        return Buffer.concat(buffers);
      })()
    : await readFile(join(resolve(source), "manifest.json"));
  const checksum = hash(initial);
  const directory = remote ? join(cache, checksum) : resolve(source);
  if (remote) await mkdir(directory, { recursive: true, mode: 0o700 });
  return {
    initial,
    checksum,
    async objects(entries: VerifiedObject[]) {
      const inputs: string[] = [];
      for (const entry of entries) {
        signal?.throwIfAborted();
        if (remote) inputs.push(await fetchObject(remote, directory, entry, signal));
        else {
          const file = join(directory, entry.file);
          if (!(await verified(file, entry)))
            throw new Error("Invalid bundle object: " + entry.file);
          inputs.push(file);
        }
      }
      return inputs;
    },
  };
}

export async function openBundle(source: string, cache: string, signal?: AbortSignal) {
  const reader = await manifestReader(source, cache, signal);
  return readBundle(reader, signal);
}

export async function readBundle(
  reader: Awaited<ReturnType<typeof manifestReader>>,
  signal?: AbortSignal,
) {
  const manifest = parseManifest(reader.initial);
  const inputs = await reader.objects(manifest.objects);
  const { checksum } = reader;
  // [DX-PLAY1] Why: every object is verified before the first import write, with record counts checked at consumption.
  // Rejected: trusting downloaded bytes based on a complete HTTP response or importing an unverified partial shard.
  return {
    manifest,
    checksum,
    async *frames(): AsyncGenerator<Frame> {
      for (const [i, file] of inputs.entries()) {
        let count = 0;
        const stream = createReadStream(file);
        const unzip = createGunzip();
        stream.on("error", (error) => unzip.destroy(error));
        const reader = createInterface({ input: stream.pipe(unzip), crlfDelay: Infinity });
        try {
          for await (const line of reader) {
            signal?.throwIfAborted();
            count++;
            yield JSON.parse(line) as Frame;
          }
          if (count !== manifest.objects[i]!.records)
            throw new Error("Bundle object record count mismatch");
        } finally {
          reader.close();
          stream.destroy();
          unzip.destroy();
        }
      }
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { sample: { type: "boolean" } },
  });
  if (positionals.length !== 1)
    throw new Error("Usage: node examples/playground/bundle.ts [--sample] OUTPUT_DIRECTORY");
  const start = performance.now();
  const manifest = await generateBundle(resolve(positionals[0]!), values.sample);
  const bytes = manifest.objects.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(
    JSON.stringify({
      objects: manifest.objects.length,
      bytes,
      elapsedMs: performance.now() - start,
    }),
  );
}
