// [DX-BM1] Why: recompute the two actual reader responses at each recorded cut from independent inputs.
// Rejected: letting a new file digest certify altered answer bytes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [folder] = process.argv.slice(2);
const repo = process.cwd();
const experiment = "lab/experiments/EXP-DX1/actv-lazy/join/";
const load = (file) => import(pathToFileURL(join(repo, file)));
const { W0, canonical, sha256 } = await load("lab/bench/lib/w0-world.ts");
const { DomainOracle } = await load("lab/bench/lib/w0-gates.ts");
const { deepOwnFacts, integer, string } = await load("lab/bench/lib/deep-world.ts");
const { ids } = await load("lab/bench/lib/world.ts");
const { makeDeepTrace } = await load("lab/bench/lib/deep-trace.ts");
const { liveEdits } = await load("lab/experiments/EXP-DX1/scale1/deep-live.ts");
const { authoredSeed, authoredWrite, expectedPolicy } = await load(experiment + "deep-reference.ts");
const get = (name) => JSON.parse(readFileSync(join(folder, name + ".json")));
const input = get("server-inputs"),
  published = get("server-observations"),
  people = input.n;
assert(people === 64 && input.smoke);
const roster = Array.from({ length: people }, (_, i) => W0.placementId(i));
assert.equal(sha256(canonical(roster)), published.roster);

const seedCuts = [];
let cut = 2,
  rowsInFrame = 0;
for (let person = 0; person < people; person++) {
  const facts = deepOwnFacts(person).length;
  if (rowsInFrame + facts > 1500) {
    cut++;
    rowsInFrame = 0;
  }
  seedCuts.push(cut);
  rowsInFrame += facts;
}

const cells = published.windows.map(({ index }) => ({
  offer: get("offer-" + index),
  window: get("window-" + index),
}));
const commands = makeDeepTrace("joined-scale-source/1", people, 500).events.filter((x) => !x.resend);
const changed = new Map();
const valid = W0.POPULATION_VALID_TIME;
const atCut = (person, p) =>
  changed.get(person)?.findLast((row) => row.position <= p)?.rows ?? authoredSeed(person, seedCuts[person]);
let cursor = 0;
for (const { window } of cells) {
  for (const saved of window.writes) {
    const command = commands[cursor++];
    assert.deepEqual([saved.seq, saved.subject], [command.seq, command.subject]);
    const root = ids.placement(saved.subject);
    const old = atCut(saved.subject, saved.p - 1);
    const stamp = old.find((x) => x.entityId === root && x.attribute === ":placement/stamp");
    const fields = [
      { e: root, a: ":placement/stamp", v: integer(Number(stamp.value.value) + 1) },
      ...liveEdits(command.subject, command.seq, command.kind, command.deep),
    ];
    if (command.correction)
      fields.push({ e: ids.worker(command.subject), a: ":worker/address", v: string("correction-" + command.seq) });
    assert.equal(sha256(canonical(fields)), saved.intent);
    const tape = changed.get(saved.subject) ?? [];
    tape.push({ position: saved.p, rows: authoredWrite(old, fields, saved.p, Date.parse(valid)) });
    changed.set(saved.subject, tape);
  }
}

const oracle = new DomainOracle(join(repo, experiment + "oracle.py"));
const responses = [];
try {
  for (const { offer, window } of cells) {
    const person = people - window.index - 1;
    assert.equal(W0.compileRelease(offer.document).hash, window.release);
    for (const [route, observed] of [["first", window.first], ["deadline", window.deadline]]) {
      assert.equal(observed.subject, roster[person]);
      assert.equal(observed.basis.validTime, valid);
      const document = observed.basis.tx >= window.nativeCut ? offer.document : W0.R1.doc;
      const actual = JSON.parse(await oracle.call("check", {
        document, old: null, basis: observed.basis,
        worlds: [expectedPolicy(person, atCut(person, observed.basis.tx))], fold: false,
      }));
      assert.equal(actual.length, 1);
      assert.equal(observed.json, actual[0].json, `Oracle mismatch in cell ${window.index} ${route}`);
      responses.push({ index: window.index, route, cut: observed.basis.tx, answerSha256: sha256(observed.json) });
    }
  }
} finally {
  oracle.close();
}
console.log(JSON.stringify({ source: input.source, nonce: input.nonce, slot: input.slot, saves: cursor, responses }));
