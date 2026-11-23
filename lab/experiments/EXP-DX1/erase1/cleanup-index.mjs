import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const [separate, folded, ...extra] = process.argv.slice(2);
assert(separate && folded && !extra.length);
const json = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8"));
function read(dir, mode) {
  const native = json(dir, "native");
  const study = json(dir, "cleanup-study");
  assert.deepEqual(json(dir, "driver-exit"), { code: 0, signal: null });
  assert.equal(study.binding, native.binding);
  assert.equal(study.data.mode, mode);
  const { scheduled, ordinary, barrier } = study.data;
  assert.deepEqual(scheduled.ids, barrier.ids);
  assert.equal(scheduled.t, barrier.t);
  assert.equal(scheduled.matched, scheduled.ids.length);
  assert(BigInt(ordinary.basis) >= BigInt(ordinary.t));
  const log = fs.readFileSync(path.join(dir, "tx.log"), "utf8");
  const jobs = [];
  for (const line of log.split("\n")) {
    if (!line.includes(":event :index/create-index,")) continue;
    const wall = Date.parse(line.split(" ")[0]);
    const at = Number(line.match(/:as-of-t (\d+)/)?.[1]);
    if (wall < scheduled.startedAt || wall > barrier.finishedAt + 5) continue;
    if (!Number.isSafeInteger(at) || at < Number(scheduled.t) || at > Number(ordinary.basis))
      continue;
    const leaves = Number(line.match(/:written (\d+)/)?.[1]);
    const directories = Number(line.match(/:dirs-written (\d+)/)?.[1]);
    const ms = Number(line.match(/:msec ([\d.]+)/)?.[1]);
    const datoms = Number(line.match(/:datoms (\d+)/)?.[1]);
    assert([leaves, directories, ms, datoms].every(Number.isFinite));
    jobs.push({ at, leaves, directories, ms, datoms });
  }
  assert(jobs.length > 0, "No native index entry covers the confirmed excision");
  const total = (field) => jobs.reduce((sum, job) => sum + job[field], 0);
  return {
    native,
    jobs,
    matched: scheduled.matched,
    leaves: total("leaves"),
    directories: total("directories"),
    indexMs: total("ms"),
    datoms: total("datoms"),
  };
}
const a = read(separate, "separate"),
  b = read(folded, "folded");
assert.notEqual(a.native.binding, b.native.binding);
assert.equal(a.native.people, b.native.people);
assert.equal(a.matched, b.matched);
if (a.native.source) {
  assert.equal(a.native.source, b.native.source);
  assert.equal(a.native.stageSha256, b.native.stageSha256);
} else assert.equal(a.native.sourceHash, b.native.sourceHash);
const { native: left, ...separateWork } = a;
const { native: right, ...foldedWork } = b;
console.log(
  JSON.stringify(
    {
      separatelyScheduled: separateWork,
      folded: foldedWork,
      bindings: [left.binding, right.binding],
      timings:
        left.timings === "diagnostic" || right.timings === "diagnostic" ? "diagnostic" : "prepared",
    },
    null,
    2,
  ),
);
