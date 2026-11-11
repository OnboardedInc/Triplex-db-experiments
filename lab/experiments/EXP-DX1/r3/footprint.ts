import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { packEntity } from "../../../../packages/datomic/dist/index.js";
import { prepareEntity } from "../../../bench/lib/replica-reads.ts";
// [DX-R3] Why: compare both actual packers on identical recorded gateway rows, without retaining source captures.
// Rejected: comparing different populations or calling packed bytes a measured process RSS.
const oldSource = execFileSync("git", ["show", "abbac16b:packages/datomic/src/replica/packed.ts"], {
  encoding: "utf8",
});
const legacy = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(oldSource)).toString("base64")
);
const directory = process.argv[2];
if (!directory) throw Error("Usage: footprint.ts <recorded-pages>");
const requests = fs
  .readdirSync(directory)
  .filter((name) => /^request-\d+\.json$/.test(name))
  .map((name) => ({
    n: Number(name.match(/\d+/)![0]),
    body: JSON.parse(fs.readFileSync(`${directory}/${name}`, "utf8")),
  }))
  .sort((a, b) => a.n - b.n);
const first = requests.find((x) => x.body.rowPage && !x.body.need)!.body.basis.recordedPosition;
const entities = new Map<
  string,
  { revision: number; rows: ReturnType<typeof decodeReplicaRows> }
>();
const subjects = new Set<string>();
for (const { n, body } of requests)
  if (body.rowPage && !body.need && body.basis.recordedPosition === first) {
    for (const root of body.roots) subjects.add(root);
    const wire = JSON.parse(
      gunzipSync(fs.readFileSync(`${directory}/response-${n}.json.gz`)).toString(),
    );
    for (const [id, revision, rows] of wire.entities)
      entities.set(id, { revision, rows: decodeReplicaRows(id, revision, rows, first) });
  }
let before = 0,
  after = 0,
  sidecars = 0,
  facts = 0;
for (const [id, { revision, rows }] of entities) {
  const packed = packEntity(revision, rows);
  before += legacy.packEntity(revision, rows).buffer.byteLength;
  after += packed.buffer.byteLength;
  sidecars += prepareEntity(id, packed).additionalBytes;
  facts += rows.length;
}
console.log(
  JSON.stringify({
    kind: "matched-recorded-bootstrap-footprint",
    position: first,
    subjects: subjects.size,
    entities: entities.size,
    facts,
    beforePackedBytes: before,
    afterPackedBytes: after,
    beforePackedBytesPerSubject: before / subjects.size,
    afterPackedBytesPerSubject: after / subjects.size,
    preparedSidecarBytes: sidecars,
    packedIncreaseRatio: after / before,
    note: "1000-subject recorded W0 bootstrap; packed payload and accounted sidecars, not 10000-subject NS process RSS",
  }),
);
