import fs from "node:fs";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import {
  Replica,
  DatomicClient,
  datomicReplicaSource,
  decodeSweepRows,
} from "../../../../packages/datomic/dist/index.js";
import { worldOf, worldCanonical, reachableRows } from "../../../bench/lib/w0-world.ts";

// [DX-R1] Why: exercise the production journal decoder and exact need reads against recorded real command bytes.
// Rejected: replacing real journals with synthetic entity lists, or treating recording replay as another live measurement.
const directory = process.argv[2];
if (!directory) throw new Error("Usage: replay.ts <recorded-pages>");
const requests = fs
  .readdirSync(directory)
  .filter((name) => /^request-\d+\.json$/.test(name))
  .map((name) => ({
    n: Number(name.match(/\d+/)![0]),
    body: JSON.parse(fs.readFileSync(`${directory}/${name}`, "utf8")),
  }))
  .sort((a, b) => a.n - b.n);
const key = (body: any) =>
  body.after !== undefined
    ? JSON.stringify(["feed", body.after, body.limit])
    : JSON.stringify(["page", body.roots, body.basis, !!body.need]);
const recorded = new Map<string, number>();
for (const { n, body } of requests) if (!recorded.has(key(body))) recorded.set(key(body), n);
const traffic = {
  page: { requests: 0, bytes: 0 },
  need: { requests: 0, bytes: 0 },
  feed: { requests: 0, bytes: 0 },
};
const response = (n: number, kind?: keyof typeof traffic) => {
  const bytes = gunzipSync(fs.readFileSync(`${directory}/response-${n}.json.gz`));
  if (kind) {
    traffic[kind].requests++;
    traffic[kind].bytes += bytes.length;
  }
  return JSON.parse(bytes.toString());
};
const boot = requests.filter(({ body }) => body.rowPage && !body.need).slice(0, 16);
assert.equal(boot.length, 16);
const basis = boot[0]!.body.basis;
assert(boot.every(({ body }) => body.basis.recordedPosition === basis.recordedPosition));
const subjects: string[] = boot.flatMap(({ body }) => body.roots);
assert.equal(new Set(subjects).size, 1000);
const client = {
  async request(_method: string, _path: string, body: any) {
    const n = recorded.get(key(body));
    assert.notEqual(n, undefined, "Unrecorded request " + key(body));
    return response(n!, body.after !== undefined ? "feed" : body.need ? "need" : "page");
  },
} as unknown as DatomicClient;
const replica = new Replica(
  datomicReplicaSource(client, "recorded", async () => basis.recordedPosition),
  basis.validAt,
);
await replica.bootstrap(subjects, basis.recordedPosition);
const compare = (position: number) => {
  let compared = 0;
  for (const { body, n } of requests) {
    if (!body.rowPage || body.need || body.basis?.recordedPosition !== position || compared >= 1000)
      continue;
    const rows = decodeSweepRows(response(n), body.roots, body.basis);
    assert(rows, "Recorded full page declined");
    for (const subject of body.roots) {
      assert.equal(
        worldCanonical(worldOf(subject, replica.world(subject))),
        worldCanonical(worldOf(subject, reachableRows([subject], rows))),
      );
      compared++;
    }
  }
  assert.equal(compared, 1000);
  console.log(JSON.stringify({ kind: "recorded-world-equality", position, subjects: compared }));
};
compare(replica.position);
const end = basis.recordedPosition + 2000;
while (replica.position < end) await replica.followOnce(0, end);
assert.equal(replica.position, end);
compare(end);
console.log(
  JSON.stringify({ kind: "recorded-follow", commands: 2000, packedBytes: replica.bytes, traffic }),
);
await replica.stop();
