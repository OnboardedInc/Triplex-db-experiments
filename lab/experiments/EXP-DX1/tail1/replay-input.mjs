import assert from "node:assert/strict";

const archiveHash = "095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb";
const ledgerHash = "e86d069642e297f4099814b2307570bff1f5d9db753f7929a3c4e4514ea3cdfa";
const keys = /** @type {const} */ ([
  "seq",
  "resend",
  "subject",
  "kind",
  "facts",
  "burst",
  "active",
  "correction",
  "ackLoss",
]);

/** @typedef {import("../../../bench/lib/deep-trace.ts").DeepEvent} DeepOffer */
/** @typedef {Pick<DeepOffer, (typeof keys)[number]> & {offsetMs: number}} ArchiveOffer */
/**
 * @param {{archive: string, ledger: string, trace: string, seed: {sha256: string, facts: number, people: number}, start: number, seconds: number, offers: ArchiveOffer[]}} archive
 * @param {ReturnType<typeof import("../../../bench/lib/deep-profile.ts").frozenDeep>} plan
 * @param {number} seconds
 */
export function matchOffers(archive, plan, seconds) {
  assert.equal(archive.archive, archiveHash);
  assert.equal(archive.ledger, ledgerHash);
  assert.equal(archive.trace, plan.sha256);
  assert.equal(archive.seed.sha256, plan.populationSha256);
  assert.equal(archive.seed.facts, 1604464);
  assert.equal(archive.seed.people, 10000);
  assert.equal(archive.seconds, 5910);
  assert(Number.isSafeInteger(archive.start) && archive.start > 0);
  assert(seconds === 5910 || (Number.isSafeInteger(seconds) && seconds >= 180 && seconds <= 900));
  /** @param {DeepOffer} a @param {DeepOffer} b */
  const order = (a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend);
  const events = plan.events
    .filter((e) => e.stream === "background" && e.atMs < seconds * 1000)
    .sort(order);
  const rows = archive.offers.filter((e) => e.offsetMs < seconds * 1000);
  assert.equal(events.length, rows.length, "Archived offer count differs from generator");
  let primary = 0;
  for (const [i, e] of events.entries()) {
    const row = rows[i];
    assert(row, "Missing archived offer");
    for (const key of keys) assert.equal(e[key], row[key], `Archived offer ${i}, ${key}`);
    assert(Math.abs(e.atMs - row.offsetMs) < 0.001, `Archived offer ${i} changed spacing`);
    if (!e.resend) primary++;
  }
  assert(primary >= 5000, "At least 5,000 primary offers are required");
  return {
    seconds,
    start: archive.start,
    primary,
    offerCount: events.length,
    archive: archive.archive,
    ledger: archive.ledger,
  };
}
