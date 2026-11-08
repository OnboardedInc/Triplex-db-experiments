/**
 * Continue from a pre-seeded scope: a QLever bulk index (lab/bench/qlever-bulk-seed.ts) or an XTDB seed manifest
 * (lab/bench/xtdb-seed.ts, EXP-K01), on the slot the seed filled or on a clone of its golden. Rebuild the driver's
 * SeedResult from the manifest and check the live engine holds that seed (its position is the manifest's last position).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cloneCertificateHash } from "./clone.ts";
import type { CompositionHandle } from "./composition.ts";
import type { SeedResult } from "./seed.ts";
import { SEED_VALID_FROM, seedAddress } from "./world.ts";

export async function seedFromManifest(m: any, comp: CompositionHandle, log: (l: string) => void): Promise<SeedResult> {
  const position = await comp.currentPosition();
  if (position !== m.result.lastPosition)
    throw new Error(`seed manifest: engine position ${position} differs from the manifest's ${m.result.lastPosition}; the slot must hold exactly that seed (QLever: index its seed.nq into a fresh slot; XTDB: the slot xtdb-seed.ts filled, or a clone of its golden)`);
  const state = new Map(m.result.state.map(([i, stampId, addressId]: [number, string, string]) => [i, { stamp: 0, stampId, stampValidFrom: SEED_VALID_FROM, address: seedAddress(i), addressId, addressValidFrom: SEED_VALID_FROM }]));
  log(`seed: ${m.lane === "xtdb" ? "pre-seeded" : "bulk-indexed"} scope ${m.scope}, ${m.result.seededSubjects} subjects, position ${position}`);
  return {
    seededSubjects: m.result.seededSubjects, complete: m.result.complete, commands: m.result.commands, assertions: m.result.assertions, retractions: 0,
    wallMs: m.capture.wallS * 1000, factsPerS: m.result.assertions / Math.max(m.capture.wallS, 1e-9), commitMs: { p50: 0, max: 0 }, failures: [],
    firstPosition: m.result.firstPosition, lastPosition: m.result.lastPosition, lastInstant: m.result.lastInstant,
    positions: [], state: state as any, versionIds: new Map(m.result.versionIds), recorded: m.recorded ?? [],
  };
}

/**
 * [EXP-K01] Where a run's start state came from (R26 6.6 items 2 and 4; RULINGS Q74a, Q74d), for report.seedPath:
 *   transact     the driver seeded through its own commits (seededBy "driver")
 *   bulk-index   a QLever index built from the manifest's seed.nq (the old driver.ts:250 shape, unchanged)
 *   seed-manifest an XTDB seed manifest, seededBy "seed-writer" (the slot xtdb-seed.ts filled) or "clone" (the slot owner
 *                record that engine.mjs clone writes names a golden of this manifest and a PASS readiness verdict),
 *                or "unverified" when no slot owner record is bound (TRIPLEX_LAB_SLOT_OWNER unset)
 * A clone of another manifest's golden, or one whose readiness is not PASS, throws: such a run must not start.
 */
export function seedPathOf(m: any, manifestFile: string | null, ownerFile: string | undefined): any {
  if (!m) return { kind: "transact", seededBy: "driver" };
  const manifestSha256 = createHash("sha256").update(fs.readFileSync(manifestFile!)).digest("hex");
  if (m.lane === "qlever") return { kind: "bulk-index", seededBy: "bulk-index", manifest: manifestFile, manifestSha256, nqSha256: m.nq?.sha256 ?? null, quads: m.nq?.quads ?? null };
  if (m.format !== "tx2-xtdb-seed/1") throw new Error(`--seed-manifest ${manifestFile}: format ${m.format} is not an XTDB seed manifest (lab/bench/xtdb-seed.ts)`);
  const base = { kind: "seed-manifest", manifest: manifestFile, manifestSha256, scope: m.scope, seedWallS: m.capture?.wallS ?? null, seedStartedAt: m.capture?.startedAt ?? null };
  const owner = ownerFile && fs.existsSync(ownerFile) ? JSON.parse(fs.readFileSync(ownerFile, "utf8")) : null;
  if (!owner) return { ...base, seededBy: "unverified", note: "no slot owner record (TRIPLEX_LAB_SLOT_OWNER): what the slot volume holds is not bound" };
  const c = owner.volumeContent;
  if (c?.kind !== "clone") return { ...base, seededBy: "seed-writer" };
  if (c.manifestSha256 !== manifestSha256)
    throw new Error(`the slot holds a clone of ${c.goldenVolume} made from manifest ${String(c.manifestSha256).slice(0, 12)}, not this manifest ${manifestSha256.slice(0, 12)}`);
  if (c.readiness?.verdict !== "PASS" || c.copy?.c1?.pass !== true || c.readiness.certificateSha256 !== cloneCertificateHash(c) || c.readiness.verifiedContainerId !== c.containerId || c.readiness.verifiedStartedAt !== c.startedAt)
    throw new Error(`RULINGS Q74d: the clone of ${c.goldenVolume} on this slot has readiness/copy certificate ${c.readiness?.verdict ?? "none"}; run lab/bin/engine.mjs verify`);
  return {
    ...base, seededBy: "clone",
    golden: { key: c.key, volume: c.goldenVolume, record: c.goldenRecord, recordSha256: c.goldenRecordSha256, freezeSha256: c.freezeSha256, clonedAt: c.clonedAt, containerId: c.containerId, startedAt: c.startedAt, copy: { copyS: c.copy?.copyS, treeSha256: c.copy?.treeSha256, c1: c.copy?.c1?.pass ?? null }, timings: c.timings, readiness: c.readiness },
  };
}

/** [EXP-K01] Why: a recorded key names old bytes until compared with the executing build. Rejected: trusting the manifest hash alone (a stale golden still hashes correctly). */
export function assertSeedInputsCurrent(m: any, root: string): void {
  const inputs = m.seedInputs;
  if (!inputs?.generator || !inputs?.adapter?.dist) throw new Error("Q74a: XTDB seed inputs are missing");
  const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
  for (const [rel, expected] of Object.entries(inputs.generator)) {
    const file = path.resolve(root, rel);
    if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file) || sha(fs.readFileSync(file)) !== expected)
      throw new Error(`Q74a: stale seed generator ${rel}`);
  }
  if (!Object.keys(inputs.generator).length) throw new Error("Q74a: seed generator hashes are missing");
  for (const pkg of ["core", "xtdb", "qualification"]) {
    const dir = path.join(root, "packages", pkg, "dist");
    const files: string[] = [];
    const visit = (p: string) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const f = path.join(p, e.name); if (e.isDirectory()) visit(f); else if (e.isFile()) files.push(path.relative(root, f)); } };
    if (!fs.existsSync(dir)) throw new Error(`Q74a: packages/${pkg}/dist is missing`);
    visit(dir);
    const lines = files.sort((a, b) => a.localeCompare(b)).map((rel) => `${sha(fs.readFileSync(path.join(root, rel)))}  ${rel}\n`);
    const expected = inputs.adapter.dist[pkg];
    if (!expected || expected.files !== files.length || expected.sha256 !== sha(lines.join("")))
      throw new Error(`Q74a: stale seed adapter build ${pkg}`);
  }
}
