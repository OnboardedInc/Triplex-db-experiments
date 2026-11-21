import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { existingSequence, sequenceProgress } from "./sequential.ts";
import { cleanSource } from "./source.ts";
import { sweepSize, thinLimit } from "./realistic-plan.ts";
import type { adoptedArm } from "./adopted.ts";

type Arm = Awaited<ReturnType<typeof adoptedArm>>;

function point(root: string, source: string, profile: "first" | "full") {
  const campaign = path.join(root, "campaign");
  const seal = existingSequence(campaign);
  assert(seal?.input.realistic && seal.input.age === "realistic" && seal.input.source === source);
  sequenceProgress(campaign, seal);
  const raw = (file: string) => fs.readFileSync(path.join(campaign, file));
  const arm: Arm = JSON.parse(raw("loaded/arm.json").toString()), live = JSON.parse(raw("loaded/realistic-live.json").toString());
  const observed = arm.thin;
  const expected = seal.input.realistic;
  assert(observed && expected.profile === profile && arm.seed.realistic?.profile === profile);
  assert.deepEqual([arm.source, arm.slot, arm.attempt, arm.firstCut, arm.seed.realistic],
    [source, live.slot, live.attempt, expected.cut, expected]);
  assert.match(live.host, /^[a-f0-9]{64}$/);
  const bytes = raw("loaded/operations.json");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), arm.observationsSha256);
  assert.deepEqual(observed, JSON.parse(bytes.toString()).thin);
  assert.equal(observed.thin, profile === "first" ? 1_000_000 : 4_500_000);
  assert.equal(observed.start, thinLimit({ id: 10, kind: "thin", people: observed.thin }, profile));
  assert.equal(observed.read.count, sweepSize(profile));
  assert.equal(observed.n, observed.read.count);
  assert(observed.cut === expected.cut && observed.before.at >= arm.startedAt &&
    observed.after.at >= observed.before.at && observed.after.at <= arm.start);
  return { seal: expected, arm, settings: { launch: seal.input.stages[1].policy, diagnostics: seal.input.diagnostics,
    writer: seal.input.writer, wal: seal.input.wal }, host: live.host, point: observed };
}

const [commit, firstDir, fullDir, out] = process.argv.slice(2);
assert(commit && firstDir && fullDir && out,
  "Usage: node --experimental-transform-types realistic-p7.ts COMMIT FIRST_CARD FULL_CARD NEW_RESULT.json");
const source = cleanSource(commit);
const first = point(firstDir, source, "first"), full = point(fullDir, source, "full");
assert.deepEqual([first.seal.parent, first.settings, first.host], [full.seal.parent, full.settings, full.host]);
assert.notEqual(first.arm.attempt, full.arm.attempt);
assert.notEqual(first.arm.slot, full.arm.slot);
assert.deepEqual([first.point.start, first.point.n], [full.point.start, full.point.n]);

// [DX-V01] Why: price people who have received no reads from the measured gateway in two matched seals.
// Rejected: calling the post-sweep change within one fixed population an untouched-person slope.
const people = full.point.thin - first.point.thin;
const roles = ["tx", "gw-w", "gw-r"];
const rss = (p: typeof first, role: string) => {
  const n = p.point.before.roles[role]?.rssBytes;
  assert(n && Number.isSafeInteger(n) && n > 0);
  return n;
};
const byRole = Object.fromEntries(roles.map(role => {
  const before = rss(first, role), after = rss(full, role);
  return [role, { firstBytes: before, fullBytes: after, bytesPerUntouchedThinPerson: (after - before) / people }];
}));
fs.writeFileSync(out, JSON.stringify({ source, first: first.seal, full: full.seal, host: first.host,
  attempts: [first.arm.attempt, full.arm.attempt], sweep: [first.point.start, first.point.n], settings: first.settings,
  firstReadP99Ms: [first.point.read.p99Ms, full.point.read.p99Ms], byRole,
  totalOutsidePostgres: Object.values(byRole).reduce((sum, role) => sum + role.bytesPerUntouchedThinPerson, 0) }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
